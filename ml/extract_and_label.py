import os
import sys
import pandas as pd
from pathlib import Path
from tqdm import tqdm
import json
import re
import time

# Add backend to path for imports
root_dir = Path(__file__).parent.parent
backend_dir = root_dir / "backend"
sys.path.append(str(backend_dir))

# Explicitly load .env from backend folder
from dotenv import load_dotenv
load_dotenv(dotenv_path=backend_dir / ".env")

from services.pdf_parser import PDFParser
from config import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

# Paths
STATEMENTS_DIR = Path("/Users/manishd/MANISH-PROJECT/STATEMENTS")
DATA_DIR = Path(__file__).parent / "data"
PROGRESS_FILE = DATA_DIR / "labeling_progress.json"
FINAL_TRAIN_CSV = DATA_DIR / "final_shaper_dataset.csv"

# Configuration
HDFC_PWD = "237624294"
CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other", "Income", "Investments", "Transfers"]

def extract_from_all_pdfs():
    print("🚀 Extracting transactions from bank statements...")
    all_txs = []
    
    pdf_files = list(STATEMENTS_DIR.glob("*.pdf"))
    for pdf_path in pdf_files:
        print(f"  Parsing {pdf_path.name}...")
        try:
            with open(pdf_path, "rb") as f:
                content = f.read()
            
            pwd = HDFC_PWD if "Acct Statement" in pdf_path.name or "HDFC" in pdf_path.name.upper() else None
            txs = PDFParser.parse_pdf(content, password=pwd)
            if not txs:
                txs = PDFParser.parse_pdf(content, password=HDFC_PWD)
                
            all_txs.extend(txs)
            print(f"    - Found {len(txs)} transactions")
        except Exception as e:
            print(f"    - ❌ Error parsing {pdf_path.name}: {e}")
            
    return pd.DataFrame(all_txs)

def label_with_gemini(descriptions):
    if not settings.GEMINI_API_KEY:
        print("❌ Error: GEMINI_API_KEY not found in .env")
        return {}

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0
    )
    
    # Prioritize labeling by selecting a subset to respect free tier and targeting variety
    unique_desc = sorted(list(set(descriptions)))
    print(f"🏷️  Total unique descriptions extracted: {len(unique_desc)}")
    
    results = {}
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, "r") as f:
            results = json.load(f)
        print(f"📂 Loaded progress: {len(results)} items already labeled.")

    remaining = [d for d in unique_desc if d not in results]
    
    # If too many, we'll focus on the first 200 to ensure we get a solid variety without hitting daily limits
    target_count = 200
    to_label = remaining[:target_count]
    print(f"🔥 Labeling next {len(to_label)} items (limited for stability)...")

    batch_size = 20
    for i in range(0, len(to_label), batch_size):
        batch = to_label[i:i+batch_size]
        print(f"  Processing batch {i//batch_size + 1}/{(len(to_label) + batch_size - 1)//batch_size}...")
        
        prompt = f"""
        Categorize the following bank transaction descriptions into EXACTLY ONE of these categories:
        {", ".join(CATEGORIES)}
        Return the result as a raw JSON object where keys are the descriptions and values are the categories.
        Descriptions: {json.dumps(batch)}
        """
        
        retries = 3
        while retries > 0:
            try:
                response = llm.invoke([
                    SystemMessage(content="You are an expert financial transaction classifier. Respond ONLY with valid JSON."),
                    HumanMessage(content=prompt)
                ])
                
                raw_text = response.content.strip()
                if "```json" in raw_text:
                    raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_text:
                    raw_text = raw_text.split("```")[1].strip()
                
                batch_labels = json.loads(raw_text)
                results.update(batch_labels)
                
                # Save progress
                DATA_DIR.mkdir(parents=True, exist_ok=True)
                with open(PROGRESS_FILE, "w") as f:
                    json.dump(results, f, indent=2)
                
                # Short sleep between batches to avoid immediate rate limit
                time.sleep(5)
                break
            except Exception as e:
                print(f"    - ⚠️ Attempt failed: {e}. Waiting 60s...")
                retries -= 1
                time.sleep(60)
            
    return results

def generate_shaper_dataset():
    # Enforce minimum 2 samples per class for stratification
    shaper_patterns = [
        ("UPI-SWIGGY-1", "Food"), ("UPI-SWIGGY-2", "Food"), ("ZOMATO ORDER", "Food"), ("RESTAURANT BILL", "Food"),
        ("UBER RIDE 1", "Travel"), ("OLA CAB 2", "Travel"), ("INDIAN RAILWAYS", "Travel"), ("AIR INDIA", "Travel"),
        ("AMAZON ORDER 1", "Shopping"), ("FLIPKART ORDER 2", "Shopping"), ("RELIANCE DIGITAL", "Shopping"),
        ("AIRTEL BILL", "Bills"), ("JIO RECHARGE", "Bills"), ("ELECTRICITY BOARD", "Bills"),
        ("NETFLIX SUBS", "Entertainment"), ("SPOTIFY SUBS", "Entertainment"), ("BOOKMYSHOW", "Entertainment"),
        ("PHARMACY BILL", "Health"), ("HOSPITAL VISIT", "Health"), ("APOLLO PHARMACY", "Health"),
        ("HDFC SALARY MAR", "Income"), ("AXIS SALARY APR", "Income"), ("INTEREST CREDIT", "Income"),
        ("MUTUAL FUND SIP", "Investments"), ("STOCK PURCHASE", "Investments"), ("ZERODHA EQUITY", "Investments"), ("GROWW MF", "Investments"), ("DIVIDEND PAYOUT", "Investments"),
        ("SELF TRANSFER AC", "Transfers"), ("FUNDS TO FAMILY", "Transfers"), ("INTERNAL TRANSFER", "Transfers"), ("PAYTM WALLET", "Transfers"), ("CRED PYMT", "Transfers")
    ]
    return pd.DataFrame(shaper_patterns, columns=["description", "category"])

def main():
    df_raw = extract_from_all_pdfs()
    labels_map = label_with_gemini(df_raw["description"].tolist())
    df_raw["category"] = df_raw["description"].map(labels_map)
    df_labeled = df_raw[["description", "category"]].dropna().drop_duplicates()
    
    shaper_df = generate_shaper_dataset()
    original_sample_path = DATA_DIR / "sample_transactions.csv"
    df_original = pd.read_csv(original_sample_path) if original_sample_path.exists() else pd.DataFrame()
        
    final_df = pd.concat([df_labeled, shaper_df, df_original]).drop_duplicates(subset=["description"])
    
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(FINAL_TRAIN_CSV, index=False)
    print(f"\n✅ Final dataset saved to: {FINAL_TRAIN_CSV}")
    print(f"📊 Final Dataset size: {len(final_df)} samples")

if __name__ == "__main__":
    main()
