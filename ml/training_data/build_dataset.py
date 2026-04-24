"""
Build the Indian Transaction Training Dataset for the AI Finance Advisor.
Generates 2,500+ labeled rows using seed data + 7-variant augmentation.
Merges with existing real-transaction data if available.

Usage:
    cd ai-finance-advisor/ml
    python training_data/build_dataset.py

Output: ml/training_data/indian_transactions_v2.csv
"""
import sys
import random
import hashlib
import pandas as pd
from pathlib import Path

OUTPUT_PATH = Path(__file__).parent / "indian_transactions_v2.csv"
EXISTING_DATA_PATH = Path(__file__).parent.parent / "data" / "final_shaper_dataset.csv"
SAMPLE_DATA_PATH = Path(__file__).parent.parent / "data" / "sample_transactions.csv"

# ---------------------------------------------------------------------------
# SEED DATA — 10 categories, ~25 seeds each
# Category names kept as short names (backward compatible with existing DB data)
# ---------------------------------------------------------------------------
SEED_DATA = {
    "Food": [
        "UPI/DR/SWIGGY INDIA", "UPI-ZOMATO-FOOD", "ZOMATOPAY*ORDER",
        "UPI/DR/BLINKIT", "ZEPTO DELIVERY", "BIGBASKET ORDER",
        "DUNZO DAILY", "INSTAMART SWIGGY", "UPI/GROFERS/PAYMENT",
        "POS/MCDONALDS INDIA", "POS/DOMINOS PIZZA", "POS/KFC INDIA",
        "POS/BURGER KING", "POS/SUBWAY INDIA", "POS/PIZZA HUT",
        "POS/STARBUCKS", "POS/CAFE COFFEE DAY", "CHAI POINT UPI",
        "UPI/KIRANA STORE", "NEFT/GROCERY SHOP", "UPI/VEGETABLE MARKET",
        "MILK DAIRY UPI", "LOCAL BAKERY POS",
        "AMAZON FRESH ORDER", "FLIPKART GROCERY",
        "SWIGGY INSTAMART", "NATURE BASKET", "LICIOUS MEAT",
    ],
    "Travel": [
        "OLA CABS PAYMENT", "UPI/OLA*ELECTRIC", "UBER INDIA TRIP",
        "RAPIDO BIKE TAXI", "NAMMA YATRI UPI", "INDRIVE PAYMENT",
        "NAMMA METRO RECHARGE", "DMRC CARD RECHARGE", "BMTC BUS PASS",
        "APSRTC TICKET", "KSRTC BUS BOOKING",
        "IRCTC TICKET BOOKING", "MAKEMYTRIP FLIGHT", "CLEARTRIP BOOKING",
        "YATRA TICKET", "GOIBIBO FLIGHT", "INDIGO AIRLINES",
        "AIR INDIA BOOKING", "SPICEJET TICKET", "AKASA AIR",
        "PETROL PUMP IOC", "BHARAT PETROLEUM POS", "HP GAS STATION",
        "FASTTAG RECHARGE HDFC", "FASTAG WALLET ICICI", "NHAI TOLL",
        "REDBUS TICKET", "ABHIBUS BOOKING",
    ],
    "Shopping": [
        "AMAZON PAY ORDER", "FLIPKART PAYMENT", "MYNTRA FASHION ORDER",
        "NYKAA BEAUTY", "MEESHO ORDER", "AJIO FASHION",
        "TATACLIQ PURCHASE", "SNAPDEAL ORDER", "SHOPSY PAYMENT",
        "RELIANCE DIGITAL POS", "CROMA ELECTRONICS",
        "VIJAY SALES POS", "APPLE ONLINE STORE",
        "D-MART PURCHASE", "LIFESTYLE STORES", "SHOPPERS STOP POS",
        "PANTALOONS RETAIL", "MAX FASHION", "WESTSIDE STORE",
        "IKEA INDIA ORDER", "PEPPERFRY FURNITURE", "URBAN LADDER",
        "BEWAKOOF ORDER", "LIMEROAD PURCHASE", "FIRSTCRY ORDER",
    ],
    "Bills": [
        "BESCOM ELECTRICITY BILL", "TNEB BILL PAYMENT",
        "MSEB ONLINE PAYMENT", "BSES RAJDHANI", "CESC BILL",
        "UPPCL BILL", "WBSEDCL PAYMENT", "HESCOM BILL",
        "AIRTEL PREPAID RECHARGE", "JIO RECHARGE", "VI POSTPAID BILL",
        "BSNL BROADBAND BILL", "ACT FIBERNET", "HATHWAY CABLE",
        "TATA PLAY DTH", "DISH TV RECHARGE", "VIDEOCON D2H",
        "LPG GAS BOOKING HP", "INDANE GAS BOOKING", "BHARAT GAS",
        "BWSSB WATER BILL", "NMMC WATER PAYMENT",
        "TIKONA BROADBAND", "AIRTEL XSTREAM", "SUN DIRECT RECHARGE",
        "MAHANAGAR GAS", "PIPED NATURAL GAS",
    ],
    "Health": [
        "APOLLO PHARMACY", "MEDPLUS MEDICINE", "NETMEDS ORDER",
        "PHARMEASY DELIVERY", "1MG MEDICINES", "WELLNESS FOREVER",
        "FRANK ROSS PHARMACY",
        "PRACTO CONSULTATION", "DOCTOR FEE PAYMENT", "CLINIC PAYMENT",
        "HOSPITAL OPD PAYMENT", "DIAGNOSTIC LAB PAYMENT",
        "STAR HEALTH INSURANCE", "NIVA BUPA PREMIUM",
        "MAX BUPA HEALTH", "CARE HEALTH INSURANCE",
        "CULT FIT MEMBERSHIP", "GOLD GYM MEMBERSHIP",
        "HEALTHIFY ME PREMIUM", "SRL DIAGNOSTICS", "THYROCARE TEST",
    ],
    "Entertainment": [
        "NETFLIX SUBSCRIPTION", "AMAZON PRIME VIDEO",
        "DISNEY HOTSTAR PLAN", "SONY LIV PREMIUM", "ZEE5 SUBSCRIPTION",
        "APPLE TV PLUS", "MXPLAYER PRO", "VOOT PREMIUM",
        "SPOTIFY PREMIUM INDIA", "JIOSAAVN PRO", "GAANA PLUS",
        "BOOKMYSHOW TICKET", "PVR CINEMAS BOOKING", "INOX MOVIES",
        "CARNIVAL CINEMAS", "PAYTM MOVIES",
        "STEAM GAME PURCHASE", "GOOGLE PLAY GAMES", "MPL PRO GAMES",
        "DREAM11 ENTRY", "MY11CIRCLE PAYMENT",
    ],
    "Other": [
        "UDEMY COURSE PURCHASE", "COURSERA SUBSCRIPTION",
        "UNACADEMY PLUS PLAN", "BYJUS SUBSCRIPTION", "VEDANTU CLASS",
        "AWS CERTIFICATION FEE", "GOOGLE CLOUD EXAM", "MICROSOFT CERTIFY",
        "COLLEGE FEE PAYMENT", "UNIVERSITY EXAM FEE", "HOSTEL FEE",
        "NEET UG FEE", "JEE FORM FEE",
        "AMAZON BOOKS ORDER", "FLIPKART BOOKS", "CROSSWORD STORE",
        "PHYSICS WALLAH", "WHITEBOARD LEARNING",
    ],
    "Investments": [
        "ZERODHA BROKERAGE", "GROWW MUTUAL FUND SIP", "COIN ZERODHA",
        "ANGEL ONE CHARGES", "UPSTOX BROKERAGE", "PAYTM MONEY SIP",
        "ET MONEY SIP",
        "LIC PREMIUM PAYMENT", "HDFC LIFE PREMIUM",
        "ICICI PRUDENTIAL PREMIUM", "SBI LIFE PREMIUM",
        "BAJAJ ALLIANZ POLICY",
        "NSDL PAN SERVICES", "CREDIT CARD BILL PAYMENT",
        "HOME LOAN EMI HDFC", "CAR LOAN EMI ICICI",
        "LOAN EMI PAYMENT", "MIRAE ASSET MF",
    ],
    "Transfers": [
        "NEFT TO SELF ACCOUNT", "IMPS SELF TRANSFER",
        "UPI SELF TRANSFER", "SWEEP TO FD",
        "FD CREATION AMOUNT", "RD INSTALLMENT",
        "PPF CONTRIBUTION", "NPS CONTRIBUTION",
        "IMPS TO FAMILY", "NEFT TO SPOUSE", "UPI FAMILY TRANSFER",
        "PAYTM WALLET TOPUP", "MOBIKWIK WALLET", "PHONEPE SELF",
        "CRED PAYMENT", "FUND TRANSFER OWN",
    ],
    "Income": [
        "SALARY CREDIT", "NEFT SALARY INFOSYS", "NEFT SALARY TCS",
        "PAYROLL CREDIT", "INCENTIVE CREDIT", "BONUS CREDIT",
        "FREELANCE PAYMENT", "INTEREST CREDIT", "DIVIDEND CREDIT",
        "REFUND CREDIT AMAZON", "CASHBACK CREDIT",
        "NEFT SALARY WIPRO", "NEFT SALARY HCL", "SALARY TCS CREDIT",
        "FD INTEREST CREDIT", "SAVINGS INTEREST", "NEFT SALARY ACCENTURE",
    ],
}

# ---------------------------------------------------------------------------
# Augmentation — produces 14 variants per seed item
# ---------------------------------------------------------------------------
BANK_PREFIXES = ["HDFC", "SBI", "ICICI", "AXIS", "CANARA", "KOTAK", "BOI"]
DATE_PREFIXES = ["08JAN25", "15FEB25", "22MAR25", "01APR25", "10MAY25", "20JUN25", "05JUL25"]
TXN_SUFFIXES = [
    "TXN834729834", "REF293847283", "UTR293847100",
    "IMPS29384728", "NEFT2938472", "UPI384729834",
    "CHQ0000123", "ACH293847", "NACH384729"
]
TX_PREFIXES = ["NEFT", "IMPS", "NACH", "ECS", "ACH"]


def augment(description: str) -> list:
    variants = set()
    variants.add(description)

    # 1. UPI prefix variants
    variants.add(f"UPI/DR/429384729/{description}")
    variants.add(f"UPI/CR/839472038/{description}")

    # 2. Append transaction ID (two different TXN IDs)
    variants.add(f"{description}/{TXN_SUFFIXES[0]}")
    variants.add(f"{description}/{TXN_SUFFIXES[3]}")

    # 3. Uppercase
    variants.add(description.upper())

    # 4. Two different bank prefixes
    variants.add(f"HDFC/{description}")
    variants.add(f"SBI/{description}")

    # 5. Date prefix
    date_pfx = random.choice(DATE_PREFIXES)
    variants.add(f"{date_pfx}/{description}")

    # 6. Replace spaces with asterisks
    variants.add(description.replace(" ", "*"))

    # 7. NEFT/IMPS prefix
    tx_pfx = random.choice(TX_PREFIXES)
    variants.add(f"{tx_pfx}/{description}")

    # 8. Bank + date combined
    variants.add(f"ICICI/{date_pfx}/{description}")

    # 9. Lower case variant (real world data is often mixed case)
    variants.add(description.lower())

    return list(variants)


def build_synthetic_dataset() -> pd.DataFrame:
    rows = []
    for category, seeds in SEED_DATA.items():
        for seed in seeds:
            for variant in augment(seed):
                rows.append({"description": variant, "category": category})

    df = pd.DataFrame(rows)
    df = df.drop_duplicates(subset=["description"])
    return df


def merge_with_existing(synthetic_df: pd.DataFrame) -> pd.DataFrame:
    dfs = [synthetic_df]
    for path in [EXISTING_DATA_PATH, SAMPLE_DATA_PATH]:
        if path.exists():
            try:
                existing = pd.read_csv(path)
                if "description" in existing.columns and "category" in existing.columns:
                    # Normalize category names from old scheme to new
                    category_map = {
                        "Food": "Food",
                        "Travel": "Travel",
                        "Bills": "Bills",
                        "Health": "Health",
                        "Income": "Income",
                        "Investments": "Investments",
                        "Transfers": "Transfers",
                        "Shopping": "Shopping",
                        "Entertainment": "Entertainment",
                        "Other": "Other",
                    }
                    existing["category"] = existing["category"].map(
                        lambda c: category_map.get(c, c)
                    )
                    # Keep only rows with valid categories
                    valid_cats = set(SEED_DATA.keys())
                    existing = existing[existing["category"].isin(valid_cats)]
                    dfs.append(existing[["description", "category"]])
                    print(f"  Merged {len(existing)} rows from {path.name}")
            except Exception as e:
                print(f"  ⚠️  Could not merge {path.name}: {e}")

    merged = pd.concat(dfs, ignore_index=True)
    merged = merged.dropna(subset=["description", "category"])
    merged = merged.drop_duplicates(subset=["description"])
    merged = merged.reset_index(drop=True)
    return merged


if __name__ == "__main__":
    print("🔨 Building Indian Transaction Training Dataset...")

    synthetic_df = build_synthetic_dataset()
    print(f"  Synthetic rows generated: {len(synthetic_df)}")

    print(f"\n  Category distribution (synthetic):")
    print(synthetic_df["category"].value_counts().to_string())

    final_df = merge_with_existing(synthetic_df)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(OUTPUT_PATH, index=False)

    print(f"\n✅ Dataset saved to: {OUTPUT_PATH}")
    print(f"📊 Total rows: {len(final_df)}")
    print(f"📁 Categories: {final_df['category'].nunique()}")
    print(f"\nFinal category distribution:")
    print(final_df["category"].value_counts().to_string())

    if len(final_df) < 2500:
        print(f"\n⚠️  WARNING: Only {len(final_df)} rows. Target is 2,500+.")
        print("   Consider adding more seed data or running extract_and_label.py first.")
    else:
        print(f"\n✅ Row count target met: {len(final_df)} >= 2,500")
