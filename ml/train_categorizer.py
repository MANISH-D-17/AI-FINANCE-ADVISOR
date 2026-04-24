"""
Train the v3 Ensemble Categorizer for AI Finance Advisor.
Uses: dual TF-IDF (word + char) + VotingClassifier (LR + LinearSVC + RF)
Gated: Model is only saved if 5-fold CV accuracy >= 90%.

Usage:
    cd ai-finance-advisor/ml
    python train_categorizer.py

Output: backend/ml/models/categorizer_v3.pkl
        backend/ml/models/categorizer_v3_metrics.json
"""
import sys
import pickle
import json
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import scipy.sparse as sp
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.svm import LinearSVC

# ─── Path setup ───────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from ml.preprocessing import clean_transaction

TRAINING_DATA_V2 = Path(__file__).parent / "training_data" / "indian_transactions_v2.csv"
TRAINING_DATA_SHAPER = Path(__file__).parent / "data" / "final_shaper_dataset.csv"
TRAINING_DATA_SAMPLE = Path(__file__).parent / "data" / "sample_transactions.csv"
MODEL_OUTPUT = ROOT / "backend" / "ml" / "models" / "categorizer_v3.pkl"
METRICS_OUTPUT = ROOT / "backend" / "ml" / "models" / "categorizer_v3_metrics.json"

MIN_ACCURACY_THRESHOLD = 0.90

VALID_CATEGORIES = {
    "Food", "Travel", "Shopping", "Bills", "Health",
    "Entertainment", "Other", "Investments", "Transfers", "Income"
}


def load_training_data() -> pd.DataFrame:
    """Load and merge all available training data sources."""
    dfs = []

    # Priority order: v2 synthetic > shaper > sample
    for path in [TRAINING_DATA_V2, TRAINING_DATA_SHAPER, TRAINING_DATA_SAMPLE]:
        if path.exists():
            try:
                df = pd.read_csv(path)
                if "description" in df.columns and "category" in df.columns:
                    original_len = len(df)
                    df = df[df["category"].isin(VALID_CATEGORIES)]
                    df = df.dropna(subset=["description", "category"])
                    dfs.append(df[["description", "category"]])
                    print(f"  Loaded {len(df)}/{original_len} valid rows from {path.name}")
            except Exception as e:
                print(f"  ⚠️  Skipping {path.name}: {e}")

    if not dfs:
        raise FileNotFoundError(
            "No training data found. Run: python ml/training_data/build_dataset.py first."
        )

    merged = pd.concat(dfs, ignore_index=True)
    merged = merged.drop_duplicates(subset=["description"])
    merged = merged.reset_index(drop=True)
    return merged


def build_features(X_text: list, fit: bool, word_vec, char_vec):
    """Transform text to combined feature matrix."""
    if fit:
        X_word = word_vec.fit_transform(X_text)
        X_char = char_vec.fit_transform(X_text)
    else:
        X_word = word_vec.transform(X_text)
        X_char = char_vec.transform(X_text)
    return sp.hstack([X_word, X_char])


def build_ensemble():
    """Build the 3-model soft-voting ensemble."""
    lr = LogisticRegression(C=5.0, max_iter=1000, class_weight="balanced", solver="lbfgs", multi_class="auto")
    svc = CalibratedClassifierCV(
        LinearSVC(C=1.0, max_iter=3000, class_weight="balanced"), cv=3
    )
    rf = RandomForestClassifier(n_estimators=200, class_weight="balanced", n_jobs=-1, random_state=42)

    ensemble = VotingClassifier(
        estimators=[("lr", lr), ("svc", svc), ("rf", rf)],
        voting="soft",
        weights=[2, 2, 1],  # LR + SVC weighted higher — better for text
    )
    return ensemble


def train():
    print("=" * 60)
    print("AI Finance Advisor — ML Categorizer v3 Training")
    print("=" * 60)

    # ─── Load data ────────────────────────────────────────────────────────────
    print("\n[1/5] Loading training data...")
    df = load_training_data()
    print(f"\n  Total samples: {len(df)}")
    print(f"  Categories: {df['category'].nunique()}")
    print(f"\n  Category distribution:")
    for cat, count in df["category"].value_counts().items():
        print(f"    {cat:<20} {count:>5} samples")

    # Check minimum samples per class for stratification
    min_samples = df["category"].value_counts().min()
    if min_samples < 5:
        print(f"\n⚠️  Some categories have < 5 samples. Cross-validation may be unreliable.")

    # ─── Preprocess ───────────────────────────────────────────────────────────
    print("\n[2/5] Preprocessing descriptions...")
    X_raw = df["description"].tolist()
    y = df["category"].tolist()
    X_clean = [clean_transaction(x) for x in X_raw]

    # ─── Build vectorizers ────────────────────────────────────────────────────
    print("[3/5] Fitting vectorizers...")
    word_vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 3),
        min_df=1,
        max_features=15000,
        sublinear_tf=True,
        token_pattern=r"(?u)\b\w\w+\b",  # default: any token >= 2 chars
    )
    char_vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 6),
        min_df=2,
        max_features=10000,
        sublinear_tf=True,
    )

    X_combined = build_features(X_clean, fit=True, word_vec=word_vectorizer, char_vec=char_vectorizer)
    print(f"  Feature matrix shape: {X_combined.shape}")

    # ─── Cross-validation ─────────────────────────────────────────────────────
    print("\n[4/5] Running 5-fold cross-validation (this takes a few minutes)...")
    ensemble = build_ensemble()

    n_splits = min(5, min_samples)
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(ensemble, X_combined, y, cv=cv, scoring="accuracy", n_jobs=-1)

    mean_acc = cv_scores.mean()
    std_acc = cv_scores.std()

    print(f"\n  📊 CV Results ({n_splits}-fold):")
    for i, score in enumerate(cv_scores):
        print(f"    Fold {i+1}: {score:.4f}")
    print(f"  ─────────────────────────────")
    print(f"  Mean:  {mean_acc:.4f} ({mean_acc:.1%})")
    print(f"  Std:   {std_acc:.4f}")

    if mean_acc < MIN_ACCURACY_THRESHOLD:
        print(f"\n❌ TRAINING ABORTED: CV accuracy {mean_acc:.1%} is below {MIN_ACCURACY_THRESHOLD:.0%} threshold.")
        print("\n  Weakest categories (by class support):")
        # Quick check on test split to find weak spots
        X_tr, X_te, y_tr, y_te = train_test_split(
            X_combined, y, test_size=0.2, random_state=42, stratify=y
        )
        ensemble.fit(X_tr, y_tr)
        y_pred = ensemble.predict(X_te)
        report = classification_report(y_te, y_pred, output_dict=True)
        weak = [(cat, v["f1-score"]) for cat, v in report.items() if isinstance(v, dict) and v.get("f1-score", 1) < 0.85]
        weak.sort(key=lambda x: x[1])
        for cat, f1 in weak:
            print(f"    {cat:<25} F1: {f1:.2%}")
        print("\n  → Add more training samples for weak categories and retrain.")
        sys.exit(1)

    print(f"\n✅ Accuracy gate passed: {mean_acc:.1%} >= {MIN_ACCURACY_THRESHOLD:.0%}")

    # ─── Final fit on full dataset ─────────────────────────────────────────────
    print("\n[5/5] Fitting final model on full dataset...")
    ensemble.fit(X_combined, y)

    y_pred = ensemble.predict(X_combined)
    train_acc = accuracy_score(y, y_pred)

    print(f"\n  Training accuracy (on full set): {train_acc:.4f}")
    print("\n  Per-category Classification Report:")
    print(classification_report(y, y_pred))

    # ─── Save model bundle ────────────────────────────────────────────────────
    MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    bundle = {
        "ensemble": ensemble,
        "word_vectorizer": word_vectorizer,
        "char_vectorizer": char_vectorizer,
        "label_classes": ensemble.classes_.tolist(),
    }

    with open(MODEL_OUTPUT, "wb") as f:
        pickle.dump(bundle, f)

    # Save metrics JSON
    metrics = {
        "model_version": "v3_ensemble",
        "trained_at": datetime.utcnow().isoformat(),
        "dataset_size": len(df),
        "cv_accuracy_mean": round(float(mean_acc), 4),
        "cv_accuracy_std": round(float(std_acc), 4),
        "cv_scores": [round(float(s), 4) for s in cv_scores],
        "train_accuracy": round(float(train_acc), 4),
        "categories": ensemble.classes_.tolist(),
    }

    with open(METRICS_OUTPUT, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n🚀 Model saved to: {MODEL_OUTPUT}")
    print(f"📊 Metrics saved to: {METRICS_OUTPUT}")

    # ─── Spot checks ──────────────────────────────────────────────────────────
    print("\n─── Sanity Checks ────────────────────────────────────────────")
    spot_checks = [
        ("UPI/DR/SWIGGY INDIA/ORDER983", "Food"),
        ("AMAZON PAY ORDER 8374", "Shopping"),
        ("BESCOM ELECTRICITY BILL", "Bills"),
        ("IRCTC TICKET BOOKING 2938", "Travel"),
        ("NEFT TO SELF ACCOUNT", "Transfers"),
        ("SALARY CREDIT INFOSYS", "Income"),
        ("NETFLIX SUBSCRIPTION 2025", "Entertainment"),
        ("APOLLO PHARMACY BILL", "Health"),
        ("GROWW MUTUAL FUND SIP", "Investments"),
    ]

    all_passed = True
    for desc, expected in spot_checks:
        X_word = word_vectorizer.transform([clean_transaction(desc)])
        X_char = char_vectorizer.transform([clean_transaction(desc)])
        X = sp.hstack([X_word, X_char])
        proba = ensemble.predict_proba(X)[0]
        pred_idx = np.argmax(proba)
        pred = ensemble.classes_[pred_idx]
        conf = proba[pred_idx]
        status = "✓" if pred == expected else "✗"
        if pred != expected:
            all_passed = False
        print(f"  {status} {desc[:45]:<45} → {pred:<15} ({conf:.0%})")

    print("─────────────────────────────────────────────────────────────")
    if all_passed:
        print("✅ All sanity checks passed!")
    else:
        print("⚠️  Some sanity checks failed — review data for those categories.")

    return mean_acc


if __name__ == "__main__":
    train()
