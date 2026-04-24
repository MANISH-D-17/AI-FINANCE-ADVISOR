"""
Preprocessing module for Indian bank transaction descriptions.
Used by both training scripts and the live categorizer service.
"""
import re

# ---------------------------------------------------------------------------
# Abbreviation expansion map — Indian banking specific
# ---------------------------------------------------------------------------
ABBREV_MAP = {
    "SWGY": "SWIGGY",
    "ZMT": "ZOMATO",
    "AMZN": "AMAZON",
    "FKRT": "FLIPKART",
    "NFLX": "NETFLIX",
    "PVRX": "PVR",
    "BMKSH": "BOOKMYSHOW",
    "IRCT": "IRCTC",
    "SNPDL": "SNAPDEAL",
    "MNTRS": "MYNTRA",
    "LKRT": "LENSKART",
    "PHRMSY": "PHARMEASY",
    "AIRETEL": "AIRTEL",
    "HDFC": "HDFC",
    "ICICI": "ICICI",
}

# Noise prefixes to strip (preserve the merchant name after them)
NOISE_PREFIXES = re.compile(
    r'\b(UPI|NEFT|IMPS|RTGS|POS|ATM|CR|DR|NFS|ACH|CHG|NACH|ECS|NACH|BBPS)\b',
    re.IGNORECASE
)

# Numeric transaction IDs (6+ consecutive digits)
NUMERIC_IDS = re.compile(r'\b\d{6,}\b')

# Date patterns: 08JAN25, 2025-01-08, 08/01/25
DATE_PATTERNS = re.compile(
    r'\b\d{2}[A-Za-z]{3}\d{2,4}\b'        # 08JAN25
    r'|\b\d{4}[-/]\d{2}[-/]\d{2}\b'        # 2025-01-08
    r'|\b\d{2}[-/]\d{2}[-/]\d{2,4}\b'      # 08/01/25
)

# Separators to normalize
SEPARATORS = re.compile(r'[/*\-_|#@]')

# Collapse whitespace
WHITESPACE = re.compile(r'\s+')


def clean_transaction(text: str) -> str:
    """
    Normalize and clean an Indian bank transaction description.

    Steps:
    1. Uppercase
    2. Remove date strings
    3. Remove 6+ digit numeric IDs
    4. Normalize separators (/, *, -, _) → space
    5. Strip UPI/NEFT/POS/etc. prefix noise
    6. Expand known abbreviations
    7. Collapse whitespace

    Returns cleaned string. Returns "" if input is empty/None.
    """
    if not text:
        return ""

    text = str(text).upper().strip()

    # Remove date patterns
    text = DATE_PATTERNS.sub(" ", text)

    # Remove pure numeric transaction IDs
    text = NUMERIC_IDS.sub(" ", text)

    # Normalize separators to space
    text = SEPARATORS.sub(" ", text)

    # Strip noise prefixes (UPI, NEFT, etc.) — keep everything after
    text = NOISE_PREFIXES.sub(" ", text)

    # Expand abbreviations
    words = text.split()
    words = [ABBREV_MAP.get(w, w) for w in words if w]

    text = " ".join(words)

    # Final whitespace collapse
    text = WHITESPACE.sub(" ", text).strip()

    return text


if __name__ == "__main__":
    # Quick smoke test
    test_cases = [
        "UPI/DR/429384729/SWIGGY INDIA",
        "08JAN25/HDFC/AMAZON PAY ORDER/TXN834729834",
        "NEFT-SALARY CREDIT-2025-01-08",
        "POS/MCDONALDS*INDIA",
        "IRCT TICKET 8374923847",
    ]
    print("Preprocessing smoke test:")
    for t in test_cases:
        print(f"  '{t}' → '{clean_transaction(t)}'")
