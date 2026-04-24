"""
Retraining Service — handles nightly/manual model retraining.
Updated for v3 bundle format (ensemble + dual vectorizers).
"""
import pickle
import re
from pathlib import Path

import pandas as pd
import scipy.sparse as sp
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.svm import LinearSVC
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.feedback import CategoryFeedback
from services.ml_metrics import evaluate_and_store_metrics

ML_DATA_PATH_V2 = Path(__file__).parent.parent / "ml" / "training_data" / "indian_transactions_v2.csv"
ML_DATA_PATH_LEGACY = Path(__file__).parent.parent / "ml" / "data" / "final_shaper_dataset.csv"
ML_DATA_PATH_SAMPLE = Path(__file__).parent.parent / "ml" / "data" / "sample_transactions.csv"
MODEL_OUTPUT = Path(__file__).parent.parent / "ml" / "models" / "categorizer_v3.pkl"

MIN_ACCURACY = 0.85  # Lower threshold for nightly retrain (less data than initial training)

VALID_CATEGORIES = {
    "Food", "Travel", "Shopping", "Bills", "Health",
    "Entertainment", "Other", "Investments", "Transfers", "Income"
}


def clean_description(text: str) -> str:
    """
    Normalize transaction description for ML features.
    Delegates to the shared preprocessing module when available,
    otherwise uses inline fallback for backward compatibility.
    """
    try:
        from ml.preprocessing import clean_transaction
        return clean_transaction(text)
    except ImportError:
        # Inline fallback
        if not text:
            return ""
        text = text.upper()
        text = re.sub(r'\d{1,2}[-/]\w{3,}[-/]\d{2,4}', '', text)
        text = re.sub(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}', '', text)
        text = re.sub(r'UPI/|POS/|NEFT-|RTGS-|CHG/', '', text)
        text = re.sub(r'/\d{5,}/', ' ', text)
        text = re.sub(r'\d{8,}', ' ', text)
        text = re.sub(r'[^A-Z* ]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text


def _load_base_data() -> pd.DataFrame:
    """Load the best available base training dataset."""
    for path in [ML_DATA_PATH_V2, ML_DATA_PATH_LEGACY, ML_DATA_PATH_SAMPLE]:
        if path.exists():
            try:
                df = pd.read_csv(path)
                if "description" in df.columns and "category" in df.columns:
                    df = df[df["category"].isin(VALID_CATEGORIES)]
                    df = df.dropna(subset=["description", "category"])
                    print(f"  Loaded base data from {path.name}: {len(df)} rows")
                    return df[["description", "category"]]
            except Exception:
                continue
    return pd.DataFrame(columns=["description", "category"])


async def add_feedback(db: AsyncSession, user_id: str, description: str, suggested: str, correct: str):
    """Store a user category correction for model improvement."""
    feedback = CategoryFeedback(
        user_id=user_id,
        description=description,
        suggested_category=suggested,
        correct_category=correct,
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


async def retrain_model(db: AsyncSession) -> bool:
    """
    Retrain the categorizer using base data + user feedback.
    Saves new model only if accuracy >= MIN_ACCURACY.
    Returns True on success, False on failure.
    """
    try:
        # Load base data
        df_orig = _load_base_data()

        # Load user feedback
        stmt = select(CategoryFeedback)
        result = await db.execute(stmt)
        feedback = result.scalars().all()

        if feedback:
            df_fb = pd.DataFrame([
                {"description": f.description, "category": f.correct_category}
                for f in feedback
                if f.correct_category in VALID_CATEGORIES
            ])
            df = pd.concat([df_orig, df_fb], ignore_index=True)
            print(f"  Feedback rows added: {len(df_fb)}")
        else:
            df = df_orig

        df = df.drop_duplicates(subset=["description", "category"])
        df = df.dropna(subset=["description", "category"])

        if len(df) < 50:
            print(f"  ⚠️  Insufficient data for retraining: {len(df)} rows. Skipping.")
            return False

        print(f"  Total training rows: {len(df)}")

        X_clean = [clean_description(x) for x in df["description"].tolist()]
        y = df["category"].tolist()

        # Vectorizers
        word_vectorizer = TfidfVectorizer(
            analyzer="word", ngram_range=(1, 3), min_df=1, max_features=15000, sublinear_tf=True
        )
        char_vectorizer = TfidfVectorizer(
            analyzer="char_wb", ngram_range=(3, 6), min_df=2, max_features=10000, sublinear_tf=True
        )

        X_word = word_vectorizer.fit_transform(X_clean)
        X_char = char_vectorizer.fit_transform(X_clean)
        X = sp.hstack([X_word, X_char])

        # Ensemble
        lr = LogisticRegression(C=5.0, max_iter=1000, class_weight="balanced")
        svc = CalibratedClassifierCV(LinearSVC(C=1.0, max_iter=2000, class_weight="balanced"), cv=3)
        rf = RandomForestClassifier(n_estimators=100, class_weight="balanced", n_jobs=-1, random_state=42)

        ensemble = VotingClassifier(
            estimators=[("lr", lr), ("svc", svc), ("rf", rf)],
            voting="soft", weights=[2, 2, 1]
        )

        # Quick CV check
        n_splits = min(3, df["category"].value_counts().min())
        if n_splits >= 2:
            cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
            cv_scores = cross_val_score(ensemble, X, y, cv=cv, scoring="accuracy")
            mean_acc = cv_scores.mean()
            print(f"  CV Accuracy: {mean_acc:.2%}")

            if mean_acc < MIN_ACCURACY:
                print(f"  ⚠️  Retrained model accuracy {mean_acc:.2%} < {MIN_ACCURACY:.0%}. NOT saved.")
                return False

        # Final fit
        ensemble.fit(X, y)

        # Save bundle
        bundle = {
            "ensemble": ensemble,
            "word_vectorizer": word_vectorizer,
            "char_vectorizer": char_vectorizer,
            "label_classes": ensemble.classes_.tolist(),
        }

        MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_OUTPUT, "wb") as f:
            pickle.dump(bundle, f)

        print(f"  ✅ Model retrained and saved to {MODEL_OUTPUT.name}")

        # Invalidate in-memory cache so next prediction loads new model
        from services.categorizer_service import invalidate_model_cache
        invalidate_model_cache()

        # Update metrics
        await evaluate_and_store_metrics(db)

        return True

    except Exception as e:
        import traceback
        print(f"  ❌ Retraining failed: {traceback.format_exc()}")
        return False
