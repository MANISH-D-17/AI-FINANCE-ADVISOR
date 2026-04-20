"""
Train the Naive Bayes auto-categorizer on transaction descriptions.
Saves model to: backend/ml/models/categorizer_nb.pkl

Usage:
    cd ml
    python train_categorizer.py
"""
import sys
import os
import pickle
from pathlib import Path
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

DATA_PATH = Path(__file__).parent / "data" / "sample_transactions.csv"
MODEL_OUTPUT = Path(__file__).parent.parent / "backend" / "ml" / "models" / "categorizer_nb.pkl"


def train():
    print("Loading data...")
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} samples across {df['category'].nunique()} categories")
    print(df["category"].value_counts())

    X = df["description"].tolist()
    y = df["category"].tolist()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, lowercase=True)),
        ("clf", MultinomialNB(alpha=0.5)),
    ])

    print("\nTraining Naive Bayes pipeline...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nTest Accuracy: {acc:.2%}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    # Save model
    MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_OUTPUT, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"\n✅ Model saved to: {MODEL_OUTPUT}")

    # Quick sanity checks
    test_cases = [
        "Swiggy order tonight",
        "Netflix monthly subscription",
        "electricity bill payment",
        "Uber to office",
        "gym membership fee",
        "Amazon shoes purchase",
    ]
    print("\nSanity check predictions:")
    for desc in test_cases:
        pred = pipeline.predict([desc])[0]
        print(f"  '{desc}' → {pred}")


if __name__ == "__main__":
    train()
