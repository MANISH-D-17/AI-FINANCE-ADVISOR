import pandas as pd
import pickle
from pathlib import Path
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sqlalchemy.orm import Session
from models.feedback import CategoryFeedback
from services.ml_metrics import evaluate_and_store_metrics

ML_DATA_PATH = Path(__file__).parent.parent / "ml" / "data" / "sample_transactions.csv"
MODEL_OUTPUT = Path(__file__).parent.parent / "ml" / "models" / "categorizer_nb.pkl"

def add_feedback(db: Session, user_id: str, description: str, suggested: str, correct: str):
    feedback = CategoryFeedback(
        user_id=user_id,
        description=description,
        suggested_category=suggested,
        correct_category=correct
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback

def retrain_model(db: Session):
    """Retrain the model using original data + user feedback."""
    try:
        # Load original data
        df_orig = pd.read_csv(ML_DATA_PATH)
        
        # Load feedback data
        feedback = db.query(CategoryFeedback).all()
        if feedback:
            df_fb = pd.DataFrame([{
                'description': f.description, 
                'category': f.correct_category
            } for f in feedback])
            df = pd.concat([df_orig, df_fb], ignore_index=True)
        else:
            df = df_orig

        # Exclude duplicates to keep training set clean
        df = df.drop_duplicates(subset=['description', 'category'])

        X = df['description']
        y = df['category']

        # Train new pipeline
        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, lowercase=True)),
            ("clf", MultinomialNB(alpha=0.5)),
        ])
        
        pipeline.fit(X, y)

        # Save model
        MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_OUTPUT, "wb") as f:
            pickle.dump(pipeline, f)

        # Update metrics after retraining
        evaluate_and_store_metrics(db)
        
        return True
    except Exception as e:
        print(f"Error retraining model: {e}")
        return False
