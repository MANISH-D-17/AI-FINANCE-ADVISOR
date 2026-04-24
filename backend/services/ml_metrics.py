"""
ML Metrics Service — evaluate and store model performance metrics.
Updated for v3 bundle format.
"""
import json
import pandas as pd
from pathlib import Path
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
from sqlalchemy import select, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.ml_metrics import ModelMetrics
from services.categorizer_service import load_categorizer, _is_bundle, predict_category

ML_DATA_PATH_V2 = Path(__file__).parent.parent / "ml" / "training_data" / "indian_transactions_v2.csv"
ML_DATA_PATH_LEGACY = Path(__file__).parent.parent / "ml" / "data" / "final_shaper_dataset.csv"
ML_DATA_PATH_SAMPLE = Path(__file__).parent.parent / "ml" / "data" / "sample_transactions.csv"
V3_METRICS_PATH = Path(__file__).parent.parent / "ml" / "models" / "categorizer_v3_metrics.json"


def _load_eval_data() -> pd.DataFrame:
    """Load evaluation data from best available source."""
    for path in [ML_DATA_PATH_V2, ML_DATA_PATH_LEGACY, ML_DATA_PATH_SAMPLE]:
        if path.exists():
            try:
                df = pd.read_csv(path)
                if "description" in df.columns and "category" in df.columns:
                    df = df.dropna(subset=["description", "category"])
                    return df
            except Exception:
                continue
    return pd.DataFrame()


def _predict_all(model, X_descriptions: list) -> list:
    """Batch predict using whatever model format is loaded."""
    import scipy.sparse as sp
    import numpy as np

    if _is_bundle(model):
        from ml.preprocessing import clean_transaction
        X_clean = [clean_transaction(x) for x in X_descriptions]
        X_word = model["word_vectorizer"].transform(X_clean)
        X_char = model["char_vectorizer"].transform(X_clean)
        X = sp.hstack([X_word, X_char])
        return model["ensemble"].predict(X).tolist()
    else:
        # Legacy pipeline
        from services.retraining import clean_description
        X_clean = [clean_description(x) for x in X_descriptions]
        return model.predict(X_clean).tolist()


async def evaluate_and_store_metrics(db: AsyncSession):
    """Evaluate current model and persist metrics to DB."""
    try:
        # If v3 metrics JSON exists from training, use it (most accurate)
        if V3_METRICS_PATH.exists():
            try:
                with open(V3_METRICS_PATH) as f:
                    v3_metrics = json.load(f)

                metrics = ModelMetrics(
                    model_name=f"Ensemble Categorizer {v3_metrics.get('model_version', 'v3')}",
                    accuracy=v3_metrics["cv_accuracy_mean"],
                    f1_scores_json={
                        "cv_mean": v3_metrics["cv_accuracy_mean"],
                        "cv_std": v3_metrics["cv_accuracy_std"],
                        "train_accuracy": v3_metrics.get("train_accuracy"),
                        "dataset_size": v3_metrics.get("dataset_size"),
                    },
                    confusion_matrix_json={"cv_scores": v3_metrics.get("cv_scores", [])},
                )

                await db.execute(delete(ModelMetrics))
                db.add(metrics)
                await db.commit()
                await db.refresh(metrics)
                return metrics
            except Exception as e:
                print(f"  ⚠️  Could not load v3 metrics JSON: {e}")

        # Fallback: evaluate model against eval data
        model = load_categorizer()
        if model is None:
            return None

        df = _load_eval_data()
        if df.empty:
            return None

        X = df["description"].tolist()
        y_true = df["category"].tolist()

        y_pred = _predict_all(model, X)

        # Align to common categories
        categories = sorted(list(set(y_true)))
        acc = accuracy_score(y_true, y_pred)
        f1_vals = f1_score(y_true, y_pred, average=None, labels=categories, zero_division=0)
        f1_map = {cat: round(f1, 3) for cat, f1 in zip(categories, f1_vals)}

        cm = confusion_matrix(y_true, y_pred, labels=categories)

        metrics = ModelMetrics(
            model_name="Ensemble Categorizer v3",
            accuracy=float(acc),
            f1_scores_json=f1_map,
            confusion_matrix_json={"labels": categories, "matrix": cm.tolist()},
        )

        await db.execute(delete(ModelMetrics))
        db.add(metrics)
        await db.commit()
        await db.refresh(metrics)
        return metrics

    except Exception as e:
        print(f"  ❌ Error evaluating model: {e}")
        return None


async def get_latest_metrics(db: AsyncSession):
    """Return the most recent model metrics record."""
    stmt = select(ModelMetrics).order_by(desc(ModelMetrics.evaluated_at))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
