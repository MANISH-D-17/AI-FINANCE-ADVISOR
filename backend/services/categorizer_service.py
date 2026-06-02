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


def _contains_person_name(desc: str) -> bool:
    """
    Detect if the description contains a person's name (e.g. PRIYA SHARMA, AMIT, etc.)
    and lacks common merchant keywords.
    """
    import re
    desc_lower = desc.lower()
    
    # Common corporate/merchant indicators - if these are present, it's a merchant, not a personal friend
    merchant_indicators = [
        "swiggy", "zomato", "restaurant", "food", "pizza", "burger", "cafe", "blinkit", "bigbasket", "zepto", 
        "kirana", "grocery", "dunzo", "uber", "ola", "flight", "train", "bus", "travel", "hotel", "irctc", 
        "rapido", "metro", "petrol", "fuel", "fasttag", "amazon", "flipkart", "shopping", "myntra", "mall", 
        "nykaa", "meesho", "ajio", "croma", "reliance", "electricity", "internet", "gas", "bill", "rent", 
        "water", "recharge", "airtel", "jio", "netflix", "spotify", "movie", "game", "entertainment", 
        "bookmyshow", "pvr", "hotstar", "doctor", "hospital", "medicine", "pharmacy", "gym", "health", 
        "zerodha", "groww", "mutual fund", "sip", "upstox", "insurance", "loan", "emi", "bata", "starbucks", 
        "mcdonald", "kfc", "dmart", "decathlon", "paytm", "phonepe", "gpay", "billdesk", "razorpay", "instamart"
    ]
    if any(m in desc_lower for m in merchant_indicators):
        return False
        
    # Exclude own-account or bank terms
    bank_terms = ["self transfer", "neft to self", "sweep to", "fd creation", "rd installment", "ppf", "nps", "own account", "interest credit", "dividend"]
    if any(bt in desc_lower for bt in bank_terms):
        return False

    # Common Indian names search
    common_names = [
        "priya", "amit", "rohit", "sanjay", "rahul", "priyanka", "abhishek", "sneha", "pooja", "neha",
        "anil", "sunil", "vijay", "ajay", "rajesh", "suresh", "deepak", "sandeep", "manish", "harish",
        "vikram", "arjun", "karan", "varun", "rishi", "aditya", "ananya", "isha", "riyah", "tanvi",
        "aniket", "vishal", "akash", "mohit", "gaurav", "siddharth", "kunal", "pranav", "nikhil",
        "rohan", "ashok", "ramesh", "mahesh", "dinesh", "naresh", "kamlesh", "umesh", "sanjay"
    ]
    if any(n in desc_lower for n in common_names):
        return True

    # Generic check for UPI/IMPS transfer to a person
    upi_markers = ["upi/", "upi-", "imps-", "neft-", "transfer:"]
    if any(marker in desc_lower for marker in upi_markers):
        # Let's see if we have alphabetic tokens
        clean_text = re.sub(r'[^a-zA-Z\s]', ' ', desc)
        words = [w for w in clean_text.split() if len(w) >= 3 and w.lower() not in ["upi", "imps", "neft", "dr", "cr", "ref", "transfer", "payment"]]
        if len(words) >= 1:
            return True
            
    return False


def _keyword_fallback(description: str) -> str:
    """Used when no model is available at all."""
    desc = description.lower()
    
    # 1. P2P transfers to people (Friends)
    p2p_keywords = [
        "sent to", "transfer to", "paid to", "pay to", "upi to", "payment to",
        "received from", "recieved from", "sent from", "transfer from",
        "to self", "to a/c", "transfer: ", "imps to", "neft to"
    ]
    if any(k in desc for k in p2p_keywords) or _contains_person_name(description):
        # Exclude own account transfers
        if not any(k in desc for k in ["self transfer", "neft to self", "sweep to", "fd creation", "rd installment", "ppf", "nps", "own account"]):
            return "Friend"
            
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
        
    return "Unknown"


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

    # High-Priority Intercept for Friend/P2P transfers containing names or P2P patterns
    desc_lower = description.lower()
    p2p_keywords = [
        "sent to", "transfer to", "paid to", "pay to", "upi to", "payment to",
        "received from", "recieved from", "sent from", "transfer from",
        "imps to", "neft to"
    ]
    if any(k in desc_lower for k in p2p_keywords) or _contains_person_name(description):
        # Exclude own account transfers
        if not any(k in desc_lower for k in ["self transfer", "neft to self", "sweep to", "fd creation", "rd installment", "ppf", "nps", "own account"]):
            return {
                "category": "Friend",
                "confidence": 0.95,
                "top3": [{"category": "Friend", "probability": 0.95}],
                "requires_review": False
            }

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


# Two-Pass Categorization Flow (ML + LLM correction)
async def categorize_with_llm_correction(
    transactions: list[dict],
    confidence_threshold: float = 0.75,
) -> list[dict]:
    """
    Two-pass categorization:
    Pass 1: ML model (fast, ~1ms per transaction)
    Pass 2: LLM correction for low-confidence predictions (< threshold)

    Args:
        transactions: List of {"description": str, "amount": float, "date": str}
        confidence_threshold: Below this, route to LLM for correction

    Returns:
        List with added fields: category, confidence, requires_review,
        correction_source ("ml" | "llm" | "fallback")
    """
    from services.llm_router import call_llm_json
    import json

    results = []
    llm_correction_batch = []
    llm_indices = []

    # Pass 1: ML categorization
    for i, tx in enumerate(transactions):
        detail = predict_category_detailed(tx.get("description", ""))
        result = {
            **tx,
            "category": detail["category"],
            "confidence": detail["confidence"],
            "top3": detail["top3"],
            "requires_review": detail["requires_review"],
            "correction_source": "ml",
        }
        results.append(result)

        # Queue for LLM correction if confidence is low
        if detail["confidence"] < confidence_threshold:
            llm_correction_batch.append({
                "index": i,
                "description": tx.get("description", ""),
                "amount": float(tx.get("amount", 0)),
                "date": str(tx.get("date", "")),
                "ml_top3": detail["top3"],
            })
            llm_indices.append(i)

    # Pass 2: LLM correction for low-confidence batch
    if llm_correction_batch:
        VALID_CATEGORIES = [
            "Food", "Travel", "Shopping", "Bills", "Entertainment",
            "Health", "Income", "Investments", "Transfers", "Friend", "Unknown", "Other"
        ]

        system_prompt = f"""You are an expert Indian bank transaction categorizer.
You will receive a batch of transactions with their ML model's best guesses.
Correct the category if the ML prediction seems wrong based on the description and amount.

Valid categories: {", ".join(VALID_CATEGORIES)}

Rules:
- UPI transfers to standard merchant accounts or food items → Food
- P2P UPI transfers to individual people/friends (e.g. 'UPI to Amit Kumar', 'Paid to Priya', 'Transfer to Rohit') → Friend
- If description consists mainly of a person's name or standard P2P markers → Friend
- UPI transfers between own personal accounts → Transfers
- Salary/payroll credits → Income
- SIP/mutual fund/stock purchases → Investments  
- Restaurant/food delivery → Food
- OLA/Uber/IRCTC/flight → Travel
- Amazon/Flipkart/Myntra → Shopping
- Electricity/gas/internet bills → Bills
- Netflix/Spotify/BookMyShow → Entertainment
- Pharmacy/hospital/doctor → Health
- Completely unknown or unidentifiable payments that do not fit other categories → Unknown
- Everything else → Other

For each transaction, provide your best category and confidence (0.0-1.0).
Return ONLY a JSON array of objects with: index, category, confidence, reasoning"""

        user_message = (
            f"Categorize these {len(llm_correction_batch)} transactions:\n"
            + json.dumps(llm_correction_batch, indent=2)
        )

        try:
            corrections = await call_llm_json(system_prompt, user_message, max_tokens=2048)

            if isinstance(corrections, list):
                for correction in corrections:
                    idx = correction.get("index")
                    if idx is not None and 0 <= idx < len(results):
                        results[idx]["category"] = correction.get(
                            "category", results[idx]["category"]
                        )
                        results[idx]["confidence"] = correction.get(
                            "confidence", results[idx]["confidence"]
                        )
                        results[idx]["correction_source"] = "llm"
                        results[idx]["llm_reasoning"] = correction.get("reasoning", "")
                        results[idx]["requires_review"] = (
                            results[idx]["confidence"] < 0.70
                        )
        except Exception as e:
            logger.warning(f"LLM correction pass failed, applying keyword fallback as secondary pass: {e}")
            for idx in llm_indices:
                desc = results[idx]["description"]
                kw_category = _keyword_fallback(desc)
                if kw_category != "Other":
                    results[idx]["category"] = kw_category
                    results[idx]["correction_source"] = "fallback"
                    results[idx]["confidence"] = 0.8
                    results[idx]["requires_review"] = False
                else:
                    results[idx]["category"] = "Unknown"
                    results[idx]["correction_source"] = "fallback"
                    results[idx]["confidence"] = 0.5
                    results[idx]["requires_review"] = True

    return results
