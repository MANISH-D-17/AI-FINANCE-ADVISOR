import pandas as pd
import numpy as np
import json
from pathlib import Path
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
from sqlalchemy.orm import Session
from models.ml_metrics import ModelMetrics
from services.categorizer_service import load_categorizer

ML_DATA_PATH = Path(__file__).parent.parent / "ml" / "data" / "sample_transactions.csv"

def evaluate_and_store_metrics(db: Session):
    """Evaluate current model and store metrics in DB."""
    try:
        model = load_categorizer()
        if model is None:
            return None

        # Load evaluation data
        df = pd.read_csv(ML_DATA_PATH)
        X = df['description']
        y_true = df['category']

        # Predict
        y_pred = model.predict(X)

        # Calculate metrics
        acc = accuracy_score(y_true, y_pred)
        
        # Per-category F1
        categories = sorted(list(set(y_true)))
        f1_vals = f1_score(y_true, y_pred, average=None, labels=categories)
        f1_map = {cat: round(f1, 2) for cat, f1 in zip(categories, f1_vals)}
        
        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred, labels=categories)
        cm_list = cm.tolist()
        
        # Store in DB
        metrics = ModelMetrics(
            model_name="Naive Bayes Categorizer",
            accuracy=float(acc),
            f1_scores_json=f1_map,
            confusion_matrix_json={"labels": categories, "matrix": cm_list}
        )
        
        db.query(ModelMetrics).delete() # Keep only latest for now or just add new
        db.add(metrics)
        db.commit()
        db.refresh(metrics)
        
        return metrics
    except Exception as e:
        print(f"Error evaluating model: {e}")
        return None

def get_latest_metrics(db: Session):
    return db.query(ModelMetrics).order_by(ModelMetrics.evaluated_at.desc()).first()
