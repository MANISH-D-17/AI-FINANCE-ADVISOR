"""
Categorizer Service — v3 Ensemble Architecture

Architecture:
    - Dual TF-IDF vectorizers: word n-gram (1-3) + character n-gram (3-6)
    - Voting ensemble: LogisticRegression + CalibratedLinearSVC + RandomForest
    - Confidence threshold: 0.75 (raised from 0.60 — 0.60 was too permissive)

Backward Compatibility:
    - predict_category(description) -> str   ← same signature as before
    - load_categorizer() still works (handles both old Pipeline and new bundle format)
    - New: predict_category_detailed(description) -> dict  (adds confidence + top3)
    - New: predict_category_async(description) -> dict     (non-blocking for async routes)
"""

import os
import pickle
import asyncio
import numpy as np
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────
ML_MODELS_DIR = Path(__file__).parent.parent / "ml" / "models"
MODEL_V3_PATH = ML_MODELS_DIR / "categorizer_v3.pkl"
MODEL_LEGACY_PATH = ML_MODELS_DIR / "categorizer_nb.pkl"

# ─── Thread pool for blocking ML calls in async endpoints ────────────────────
_executor = ThreadPoolExecutor(max_workers=4)

# ─── Module-level model cache ─────────────────────────────────────────────────
_model_bundle = None   # v3 format: {"ensemble", "word_vectorizer", "char_vectorizer", "label_classes"}
_legacy_model = None   # old sklearn Pipeline (fallback)


# ─── Keyword heuristic fallback ───────────────────────────────────────────────
def _keyword_fallback(description: str) -> str:
    """Used when no model is available at all."""
    desc = description.lower()
    if any(k in desc for k in ["swiggy", "zomato", "restaurant", "food", "pizza", "burger", "cafe", "blinkit", "bigbasket", "zepto", "kirana", "grocery", "dunzo"]):
        return "Food"
    elif any(k in desc for k in ["uber", "ola", "flight", "train", "bus", "travel", "hotel", "irctc", "rapido", "metro", "petrol", "fuel", "fasttag", "redbus", "indigo", "spicejet"]):
        return "Travel"
    elif any(k in desc for k in ["amazon", "flipkart", "shopping", "myntra", "mall", "nykaa", "meesho", "ajio", "reliance digital", "croma", "shoppers"]):
        return "Shopping"
    elif any(k in desc for k in ["electricity", "internet", "gas", "bill", "rent", "water", "recharge", "airtel", "jio", "bsnl", "bescom", "tneb", "dth"]):
        return "Bills"
    elif any(k in desc for k in ["netflix", "spotify", "movie", "game", "entertainment", "bookmyshow", "pvr", "hotstar", "prime video", "zee5", "sony liv"]):
        return "Entertainment"
    elif any(k in desc for k in ["doctor", "hospital", "medicine", "pharmacy", "gym", "health", "apollo", "medplus", "practo", "1mg", "pharmeasy"]):
        return "Health"
    elif any(k in desc for k in ["salary", "payroll", "income", "dividend", "interest credit", "bonus credit", "freelance", "refund credit", "cashback credit"]):
        return "Income"
    elif any(k in desc for k in ["zerodha", "groww", "mutual fund", "sip", "upstox", "angel", "lic premium", "insurance premium", "loan emi"]):
        return "Investments"
    elif any(k in desc for k in ["self transfer", "neft to self", "sweep to", "fd creation", "rd installment", "ppf", "nps", "own account", "family transfer"]):
        return "Transfers"
    return "Other"


# ─── Model loading ────────────────────────────────────────────────────────────
def load_categorizer():
    """
    Load the best available model. Returns the bundle dict (v3) or legacy Pipeline.
    Handles both formats for backward compatibility.
    Prioritizes v3 > v2/legacy.
    """
    global _model_bundle, _legacy_model

    # Try V3 bundle first
    if MODEL_V3_PATH.exists():
        if _model_bundle is None:
            try:
                with open(MODEL_V3_PATH, "rb") as f:
                    bundle = pickle.load(f)
                # Validate it's in bundle format
                if isinstance(bundle, dict) and "ensemble" in bundle:
                    _model_bundle = bundle
                    return _model_bundle
                else:
                    # v3 path contains legacy pipeline — load as legacy
                    _legacy_model = bundle
                    return _legacy_model
            except Exception as e:
                logger.warning(f"Failed to load v3 model: {e}")
        else:
            return _model_bundle

    # Fall back to legacy categorizer_nb.pkl
    if MODEL_LEGACY_PATH.exists():
        if _legacy_model is None:
            try:
                with open(MODEL_LEGACY_PATH, "rb") as f:
                    _legacy_model = pickle.load(f)
            except Exception as e:
                logger.warning(f"Failed to load legacy model: {e}")
        return _legacy_model

    return None


def _is_bundle(model) -> bool:
    """Check if model is the new dict bundle or old sklearn Pipeline."""
    return isinstance(model, dict) and "ensemble" in model


def _predict_with_bundle(description: str, bundle: dict) -> dict:
    """Predict using the v3 ensemble bundle. Returns full detail dict."""
    import scipy.sparse as sp
    from ml.preprocessing import clean_transaction

    text_clean = clean_transaction(description)
    if not text_clean:
        return {"category": "Other", "confidence": 1.0, "top3": [{"category": "Other", "probability": 1.0}], "requires_review": False}

    X_word = bundle["word_vectorizer"].transform([text_clean])
    X_char = bundle["char_vectorizer"].transform([text_clean])
    X = sp.hstack([X_word, X_char])

    proba = bundle["ensemble"].predict_proba(X)[0]
    classes = bundle["label_classes"]

    top_indices = np.argsort(proba)[::-1][:3]
    top3 = [
        {"category": classes[i], "probability": round(float(proba[i]), 4)}
        for i in top_indices
    ]

    best = top3[0]
    return {
        "category": best["category"],
        "confidence": best["probability"],
        "top3": top3,
        "requires_review": best["probability"] < 0.75,
    }


def _predict_with_legacy(description: str, model) -> dict:
    """Predict using old sklearn Pipeline. Returns simplified detail dict."""
    from services.retraining import clean_description
    cleaned = clean_description(description)
    if not cleaned:
        return {"category": "Other", "confidence": 1.0, "top3": [], "requires_review": False}

    try:
        probs = model.predict_proba([cleaned])[0]
        max_prob = float(np.max(probs))
        predicted_idx = int(np.argmax(probs))
        category = model.classes_[predicted_idx]
        top3 = []
        for i in np.argsort(probs)[::-1][:3]:
            top3.append({"category": model.classes_[i], "probability": round(float(probs[i]), 4)})
        return {
            "category": category if max_prob >= 0.60 else "Other",
            "confidence": max_prob,
            "top3": top3,
            "requires_review": max_prob < 0.75,
        }
    except Exception:
        predicted = model.predict([cleaned])[0]
        return {"category": predicted, "confidence": 0.8, "top3": [], "requires_review": False}


# ─── Public API ───────────────────────────────────────────────────────────────
def predict_category(description: str) -> str:
    """
    Predict expense category from description text.
    
    Returns a category string. Backward compatible with all existing callers.
    Confidence threshold: 0.75 for auto-assign (falls back to keyword heuristic below threshold).
    """
    if not description or not description.strip():
        return "Other"

    model = load_categorizer()

    if model is None:
        return _keyword_fallback(description)

    if _is_bundle(model):
        result = _predict_with_bundle(description, model)
    else:
        result = _predict_with_legacy(description, model)

    # Apply threshold: if low confidence, use keyword heuristic as secondary pass
    if result["requires_review"]:
        keyword_guess = _keyword_fallback(description)
        if keyword_guess != "Other":
            return keyword_guess
        return "Other"

    return result["category"]


def predict_category_detailed(description: str) -> dict:
    """
    Predict expense category with full confidence metadata.
    
    Returns:
        {
            "category": str,
            "confidence": float,          # 0.0–1.0
            "top3": [{"category", "probability"}],
            "requires_review": bool       # True if confidence < 0.75
        }
    """
    if not description or not description.strip():
        return {"category": "Other", "confidence": 1.0, "top3": [{"category": "Other", "probability": 1.0}], "requires_review": False}

    model = load_categorizer()

    if model is None:
        cat = _keyword_fallback(description)
        return {"category": cat, "confidence": 0.6, "top3": [{"category": cat, "probability": 0.6}], "requires_review": True}

    if _is_bundle(model):
        return _predict_with_bundle(description, model)
    else:
        return _predict_with_legacy(description, model)


async def predict_category_async(description: str) -> dict:
    """
    Non-blocking async wrapper for predict_category_detailed.
    
    IMPORTANT: Always use this in async endpoints. RandomForest blocks the
    event loop if called directly in an async context.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        predict_category_detailed,
        description,
    )


def invalidate_model_cache():
    """Call this after retraining to force reload on next prediction."""
    global _model_bundle, _legacy_model
    _model_bundle = None
    _legacy_model = None
