import io
import pdfplumber
import pandas as pd
from datetime import datetime
import re
import hashlib

class PDFParser:
    @staticmethod
    def extract_transactions_locally(file_content: bytes, password: str = None) -> list[dict]:
        """
        Advanced 'God Mode' Parser: Reconstruction of rows via physical word coordinates.
        This is significantly more robust than table extraction for bank statements.
        """
        transactions = []
        
        try:
            with pdfplumber.open(io.BytesIO(file_content), password=password) as pdf:
                    # 1. Persistent Memory: Keep headers from Page 1 if Page 2+ missing them
                    active_mappings = None
                    
                    for page_num, page in enumerate(pdf.pages, 1):
                        words = page.extract_words()
                        if not words: continue
                        
                        # Group words into lines based on Y coordinate
                        lines = PDFParser._group_words_into_lines(words)
                        
                        # Find Header Line and Detect Columns
                        header_y, new_mappings = PDFParser._detect_column_positions(lines)
                        
                        # Update mappings if found, else use active ones
                        if new_mappings:
                            active_mappings = new_mappings
                        
                        if not active_mappings:
                            # Fallback to smart regex
                            text = page.extract_text() or ""
                            transactions.extend(PDFParser._fallback_regex(text, page_num=page_num))
                            continue
                        
                        # 3. Extract data from lines below headers (or all if headers from previous page)
                        for y_coord, line_words in lines.items():
                            if new_mappings and y_coord <= header_y: continue # Skip headers on current page
                            
                            row_data = PDFParser._map_words_to_columns(line_words, active_mappings, page_num=page_num)
                            if row_data:
                                transactions.append(row_data)

        except Exception as e:
            raise ValueError(f"High-precision parsing failed: {str(e)}")
            
        if not transactions:
            # Last ditch effort: simple regex scan
            # We already tried this in _fallback_regex, but let's be sure.
            pass
            
        return transactions

    @staticmethod
    def _group_words_into_lines(words, tolerance=2):
        """Groups words sharing nearly the same Y coordinate into lines."""
        lines = {}
        for word in words:
            y = round(word['top'])
            # Check if this Y is within tolerance of an existing line
            found_line = False
            for existing_y in lines.keys():
                if abs(y - existing_y) <= tolerance:
                    lines[existing_y].append(word)
                    found_line = True
                    break
            if not found_line:
                lines[y] = [word]
        
        # Sort words in each line by X coordinate
        for y in lines:
            lines[y].sort(key=lambda w: w['x0'])
            
        # Sort lines by Y coordinate
        return dict(sorted(lines.items()))

    @staticmethod
    def _detect_column_positions(lines):
        """Identifies column headers and their X coordinates."""
        for y, words in lines.items():
            line_text = " ".join([w['text'].lower() for w in words])
            
            # Common Bank Headers
            if any(k in line_text for k in ['date', 'narration', 'particulars', 'description']):
                mappings = {'date': None, 'desc': None, 'debit': None, 'credit': None, 'amount': None, 'ref': None}
                
                for w in words:
                    txt = w['text'].lower()
                    if 'date' in txt and not mappings['date']: mappings['date'] = w['x0']
                    
                    # Description Headers
                    if any(k in txt for k in ['narrat', 'partic', 'desc', 'remark', 'particulars', 'transaction details']) and not mappings['desc']: 
                        mappings['desc'] = w['x0']
                    
                    # Withdrawal / Debit Headers
                    if any(k in txt for k in ['withdr', 'debit', 'paym', 'withdraw', 'dr amt']) and not mappings['debit']: 
                        mappings['debit'] = w['x0']
                    
                    # Deposit / Credit Headers
                    if any(k in txt for k in ['depos', 'credit', 'recei', 'deposit', 'cr amt', 'receipt', 'inward']) and not mappings['credit']: 
                        mappings['credit'] = w['x0']
                    
                    # Ref / ID Headers
                    if any(k in txt for k in ['ref', 'chq', 'utr', 'no.', 'reference', 'cheque']) and 'date' not in txt and not mappings['ref']: 
                        mappings['ref'] = w['x0']
                    
                    # Generic Amount fallback
                    if any(k in txt for k in ['amount', 'balance', 'total amt']) and not mappings['amount']:
                         if 'balance' not in txt or mappings['amount'] is None:
                            mappings['amount'] = w['x0']
                
                # We need at least Date and one other field
                if mappings['date'] and any([mappings['debit'], mappings['amount'], mappings['desc']]):
                    return y, mappings
        return 0, None

    @staticmethod
    def _map_words_to_columns(words, mappings, page_num=1):
        """Maps words in a line to specific columns based on X position."""
        res = {'date': '', 'desc': '', 'amt': 0.0, 'type': 'debit'}
        
        # Helper to find words closest to an X coordinate
        def get_text_at_x(target_x, buffer=15): # Surgical precision
            if target_x is None: return ""
            return " ".join([w['text'] for w in words if abs(w['x0'] - target_x) < buffer])

        date_str = get_text_at_x(mappings['date'], buffer=30)
        parsed_date = PDFParser._parse_date(date_str)
        if not parsed_date: return None
        
        res['date'] = parsed_date
        res['desc'] = get_text_at_x(mappings['desc'], buffer=150)
        
        if mappings['debit'] and mappings['credit']:
            d_val = PDFParser._clean_amt(get_text_at_x(mappings['debit'], buffer=40))
            c_val = PDFParser._clean_amt(get_text_at_x(mappings['credit'], buffer=40))
            if d_val > 0:
                res['amt'], res['type'] = d_val, 'debit'
            elif c_val > 0:
                res['amt'], res['type'] = c_val, 'credit'
        elif mappings['amount']:
            res['amt'] = PDFParser._clean_amt(get_text_at_x(mappings['amount'], buffer=50))
            # Infer type from line content
            line_txt = " ".join([w['text'].lower() for w in words])
            if any(k in line_txt for k in ['cr', 'dep', 'credit']):
                res['type'] = 'credit'
        
        if res['amt'] == 0: return None

        # Build unique reference
        ref_no = get_text_at_x(mappings['ref'], buffer=60) if mappings['ref'] else None
        
        # Professional Fingerprinting
        if not ref_no or len(ref_no) < 3:
            # Add Page Num and Y Coord to hash to ensure uniqueness even for identical rows on different pages
            sig = f"p{page_num}y{round(words[0]['top'], 1)}{res['date']}{res['amt']}{res['desc'][:30]}"
            ref_no = f"sig_{hashlib.md5(sig.encode()).hexdigest()[:12]}"

        return {
            "date": res['date'],
            "description": res['desc'].strip(),
            "amount": res['amt'],
            "type": res['type'],
            "reference_number": ref_no.strip()
        }

    @staticmethod
    def _fallback_regex(text, page_num=1):
        """Simple regex extraction as a last resort."""
        txs = []
        pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.*?)\s+([\d,]+\.\d{2})'
        for i, match in enumerate(re.finditer(pattern, text)):
            date_str, desc, amt_str = match.groups()
            parsed_date = PDFParser._parse_date(date_str)
            if parsed_date:
                amt = float(amt_str.replace(',', ''))
                # Unique ID for fallback rows
                sig = f"p{page_num}r{i}{date_str}{amt}{desc[:10]}"
                ref_no = f"fallback_{hashlib.md5(sig.encode()).hexdigest()[:10]}"
                
                txs.append({
                    "date": parsed_date,
                    "description": desc.strip(),
                    "amount": amt,
                    "type": "credit" if any(k in desc.lower() for k in ['cr', 'dep', 'credit']) else "debit",
                    "reference_number": ref_no
                })
        return txs

    @staticmethod
    def _parse_date(date_str):
        if not date_str: return None
        # Clean date string (e.g. '02/03/26 02/03/26' -> '02/03/26')
        date_str = date_str.split()[0]
        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y", "%d %b %Y", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(date_str, fmt)
                if dt.year < 100: dt = dt.replace(year=2000 + dt.year)
                return dt.strftime("%Y-%m-%d")
            except ValueError: continue
        return None

    @staticmethod
    def _clean_amt(val):
        if not val: return 0.0
        s = re.sub(r'[^\d.]', '', str(val).replace(',', ''))
        try: return float(s) if s else 0.0
        except: return 0.0

    @staticmethod
    def parse_pdf(file_content: bytes, password: str = None) -> list[dict]:
        return PDFParser.extract_transactions_locally(file_content, password)
