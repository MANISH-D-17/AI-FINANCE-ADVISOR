import os
import pickle
from pathlib import Path

ML_MODELS_DIR = Path(__file__).parent.parent / "ml" / "models"


def load_categorizer():
    """Load the Naive Bayes categorizer pipeline."""
    model_path = ML_MODELS_DIR / "categorizer_nb.pkl"
    if not model_path.exists():
        return None
    with open(model_path, "rb") as f:
        return pickle.load(f)


_categorizer = None


def predict_category(description: str) -> str:
    """Predict expense category from description text."""
    global _categorizer
    if _categorizer is None:
        _categorizer = load_categorizer()

    if _categorizer is None:
        # Fallback: keyword-based heuristic
        desc_lower = description.lower()
        if any(k in desc_lower for k in ["swiggy", "zomato", "restaurant", "food", "pizza", "burger", "cafe"]):
            return "Food"
        elif any(k in desc_lower for k in ["uber", "ola", "flight", "train", "bus", "travel", "hotel"]):
            return "Travel"
        elif any(k in desc_lower for k in ["amazon", "flipkart", "shopping", "myntra", "mall"]):
            return "Shopping"
        elif any(k in desc_lower for k in ["electricity", "internet", "gas", "bill", "rent", "water"]):
            return "Bills"
        elif any(k in desc_lower for k in ["netflix", "spotify", "movie", "game", "entertainment"]):
            return "Entertainment"
        elif any(k in desc_lower for k in ["doctor", "hospital", "medicine", "pharmacy", "gym", "health"]):
            return "Health"
        return "Other"

    return _categorizer.predict([description])[0]
