import pandas as pd
import io
import re
from datetime import datetime

class CSVParser:
    @staticmethod
    def detect_bank(df: pd.DataFrame) -> str:
        columns = [str(c).lower().strip() for c in df.columns]
        
        # SBI Detection
        if all(k in columns for k in ['date', 'description', 'debit', 'credit', 'balance']):
            return 'SBI'
        
        # HDFC Detection
        if all(k in columns for k in ['date', 'description', 'debit amount', 'credit amount']):
            return 'HDFC'
            
        # ICICI Detection
        if any('withdrawal amount' in c for c in columns) and any('deposit amount' in c for c in columns):
            return 'ICICI'
            
        # Axis Detection
        if all(k in columns for k in ['date', 'particulars', 'withdrawal (dr)', 'deposit (cr)']):
            return 'AXIS'
            
        return 'UNKNOWN'

    @staticmethod
    def parse_csv(file_content: bytes) -> list[dict]:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252']
        df = None
        
        for encoding in encodings:
            try:
                # Read as string first to clean up potential header garbage
                content = file_content.decode(encoding)
                # Find where the actual table starts (assuming date is in the first column of the header)
                # This is a heuristic for banks that put 5-10 rows of metadata before the table
                lines = content.splitlines()
                start_row = 0
                for i, line in enumerate(lines[:20]):
                    if re.search(r'date|particulars|description', line, re.I):
                        start_row = i
                        break
                
                df = pd.read_csv(io.StringIO("\n".join(lines[start_row:])))
                break
            except Exception:
                continue
        
        if df is None:
            raise ValueError("Could not parse CSV file. Please check the encoding and format.")

        bank = CSVParser.detect_bank(df)
        normalized = []
        
        # Map columns based on bank
        col_map = {}
        if bank == 'SBI':
            col_map = {'date': 'Date', 'description': 'Description', 'debit': 'Debit', 'credit': 'Credit'}
        elif bank == 'HDFC':
            col_map = {'date': 'Date', 'description': 'Description', 'debit': 'Debit Amount', 'credit': 'Credit Amount'}
        elif bank == 'ICICI':
            # Handle brackets in ICICI headers
             WithdrawalCol = [c for c in df.columns if 'withdrawal amount' in c.lower()][0]
             DepositCol = [c for c in df.columns if 'deposit amount' in c.lower()][0]
             col_map = {'date': 'Transaction Date', 'description': 'Transaction Remarks', 'debit': WithdrawalCol, 'credit': DepositCol}
        elif bank == 'AXIS':
            col_map = {'date': 'Date', 'description': 'Particulars', 'debit': 'Withdrawal (Dr)', 'credit': 'Deposit (Cr)'}
        else:
            # Generic fallback
            cols = [c.lower() for c in df.columns]
            date_col = next((c for c in df.columns if 'date' in c.lower()), None)
            desc_col = next((c for c in df.columns if any(k in c.lower() for k in ['desc', 'part', 'remark'])), None)
            debit_col = next((c for c in df.columns if any(k in c.lower() for k in ['debit', 'withdraw'])), None)
            credit_col = next((c for c in df.columns if any(k in c.lower() for k in ['credit', 'deposit'])), None)
            
            if not all([date_col, debit_col, credit_col]):
                raise ValueError("Unrecognized CSV format. Could not find required columns.")
            
            col_map = {'date': date_col, 'description': desc_col or date_col, 'debit': debit_col, 'credit': credit_col}

        for _, row in df.iterrows():
            try:
                # Clean amount
                def clean_amt(val):
                    if pd.isna(val) or str(val).strip() in ['', '-']: return 0.0
                    return float(re.sub(r'[^\d.]', '', str(val)))

                debit = clean_amt(row[col_map['debit']])
                credit = clean_amt(row[col_map['credit']])
                
                if debit == 0 and credit == 0:
                    continue
                
                # Internal schema
                normalized.append({
                    "date": str(pd.to_datetime(row[col_map['date']]).date()),
                    "description": str(row[col_map['description']]).strip(),
                    "amount": debit if debit > 0 else credit,
                    "type": "debit" if debit > 0 else "credit"
                })
            except Exception:
                continue

        return normalized
