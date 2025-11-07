"""
Transaction Import Service
Handles Excel and CSV file imports with validation
"""
import pandas as pd
import io
import logging
import json
import os
from typing import List, Dict, Tuple
from datetime import datetime
from dataclasses import dataclass
from openai import OpenAI

logger = logging.getLogger(__name__)

# Lazy load OpenAI client
_client = None

def get_openai_client():
    global _client
    if _client is None:
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            _client = OpenAI(api_key=api_key)
    return _client

@dataclass
class ImportResult:
    success_count: int
    error_count: int
    errors: List[Dict]
    imported_transactions: List[Dict]

class ImportService:
    # No longer enforcing required columns - AI will figure out what's what
    OPTIONAL_COLUMNS = ['reference', 'account_name']

    def parse_file(self, file_content: bytes, filename: str) -> pd.DataFrame:
        """Parse Excel or CSV file - handles both transaction lists AND financial statements"""
        try:
            # First, detect header row for financial statements
            header_row = None
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                header_row = self._find_header_row(io.BytesIO(file_content), filename)
                logger.info(f"Detected header row: {header_row}")

                # Read with correct header
                if header_row is not None and header_row > 0:
                    df = pd.read_excel(io.BytesIO(file_content), header=header_row)
                else:
                    df = pd.read_excel(io.BytesIO(file_content))
            elif filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file format: {filename}")

            # Log original structure
            logger.info(f"Original shape: {df.shape}")
            logger.info(f"Original columns: {list(df.columns)}")
            logger.info(f"First 5 rows:\n{df.head(5)}")

            # Clean unnamed and empty columns
            df = self._clean_unnamed_columns(df)
            logger.info(f"After cleaning unnamed columns - shape: {df.shape}")
            logger.info(f"Cleaned columns: {list(df.columns)}")

            # Detect if this is a financial statement (pivoted format) or transaction list
            is_financial_statement = self._detect_financial_statement_format(df)

            if is_financial_statement:
                logger.info("Detected FINANCIAL STATEMENT format (accounts in rows, periods in columns)")
                df = self._unpivot_financial_statement(df)
                logger.info(f"After unpivoting: {df.shape}")
                logger.info(f"Unpivoted columns: {list(df.columns)}")
                logger.info(f"Sample unpivoted data:\n{df.head(10)}")
            else:
                logger.info("Detected TRANSACTION LIST format")
                # Normalize column names for transaction lists
                df.columns = [str(col).strip().lower().replace(' ', '_') for col in df.columns]
                # Use AI to map columns
                df = self._ai_map_columns(df)

            return df
        except Exception as e:
            logger.error(f"File parsing error: {e}")
            raise ValueError(f"Failed to parse file: {str(e)}")

    def _find_header_row(self, file_content: io.BytesIO, filename: str) -> int:
        """
        Scan first 10 rows to find which row contains column headers.
        Returns the row index (0-based) of the likely header row.
        """
        try:
            # Read first 10 rows without headers to analyze
            df_preview = pd.read_excel(file_content, header=None, nrows=10)

            logger.info(f"Scanning {len(df_preview)} rows for header detection...")

            best_row = 0
            best_score = 0

            for idx, row in df_preview.iterrows():
                score = 0
                row_values = [str(v).strip() for v in row if pd.notna(v) and str(v).strip() != '']

                if len(row_values) < 2:
                    continue

                logger.info(f"Row {idx}: {row_values[:10]}")

                # Score this row based on header-like characteristics
                for val in row_values:
                    val_lower = val.lower()

                    # Check for date/period indicators
                    date_indicators = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
                                     'q1', 'q2', 'q3', 'q4', 'quarter', 'month', 'year']
                    if any(ind in val_lower for ind in date_indicators):
                        score += 3

                    # Check for year-like values (2020-2030)
                    if val.isdigit() and 2020 <= int(val) <= 2030:
                        score += 2

                    # Check for common financial column names
                    financial_cols = ['account', 'description', 'name', 'code', 'type',
                                    'category', 'balance', 'amount', 'total']
                    if any(col in val_lower for col in financial_cols):
                        score += 2

                    # Penalize if it looks like data (pure numbers, company names)
                    if val.replace(',', '').replace('.', '').replace('-', '').isdigit():
                        score -= 1
                    if any(ind in val_lower for ind in [' inc', ' llc', ' corp', ' ltd']):
                        score -= 2

                logger.info(f"Row {idx} score: {score}")

                if score > best_score:
                    best_score = score
                    best_row = idx

            logger.info(f"Selected header row: {best_row} (score: {best_score})")

            # If score is too low, assume row 0
            if best_score < 3:
                logger.info("Score too low, using default row 0")
                return 0

            return best_row

        except Exception as e:
            logger.warning(f"Error detecting header row: {e}")
            return 0

    def _clean_unnamed_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Remove columns that are unnamed or completely empty.
        """
        try:
            original_cols = len(df.columns)

            # Find columns to keep
            cols_to_keep = []
            cols_removed = []

            for col in df.columns:
                col_str = str(col)

                # Remove if column name starts with "Unnamed:"
                if col_str.startswith('Unnamed:'):
                    # Check if column has any non-null values
                    if df[col].notna().any():
                        # Check if column has any actual data (not just whitespace)
                        has_data = df[col].astype(str).str.strip().replace('', pd.NA).notna().any()
                        if has_data:
                            cols_to_keep.append(col)
                        else:
                            cols_removed.append(col_str)
                    else:
                        cols_removed.append(col_str)
                    continue

                # Remove if column is completely empty
                if df[col].isna().all():
                    cols_removed.append(col_str)
                    continue

                # Remove if column has no actual data (only whitespace)
                if not df[col].astype(str).str.strip().replace('', pd.NA).notna().any():
                    cols_removed.append(col_str)
                    continue

                cols_to_keep.append(col)

            logger.info(f"Removed {len(cols_removed)} unnamed/empty columns: {cols_removed[:10]}")
            logger.info(f"Keeping {len(cols_to_keep)} columns")

            if len(cols_to_keep) == 0:
                logger.error("All columns would be removed! Keeping original dataframe")
                return df

            return df[cols_to_keep]

        except Exception as e:
            logger.warning(f"Error cleaning unnamed columns: {e}")
            return df

    def _detect_financial_statement_format(self, df: pd.DataFrame) -> bool:
        """
        Detect if this is a financial statement format:
        - First column contains account names (text)
        - Remaining columns are periods/dates (headers)
        - Values are numeric amounts
        """
        try:
            if len(df.columns) < 2 or len(df) < 3:
                return False

            # Check if first column looks like account names
            first_col = df.iloc[:, 0]
            # Remove NaN and empty values
            first_col_clean = first_col.dropna()
            first_col_clean = first_col_clean[first_col_clean.astype(str).str.strip() != '']

            if len(first_col_clean) < 3:
                return False

            # Check if most of first column is text (not dates, not purely numeric)
            text_count = 0
            for val in first_col_clean.head(20):
                val_str = str(val).lower()
                # Look for common financial statement terms
                financial_terms = ['cash', 'revenue', 'income', 'expense', 'asset', 'liability',
                                   'equity', 'receivable', 'payable', 'inventory', 'total',
                                   'cogs', 'gross', 'net', 'operating', 'sales', 'cost']
                if any(term in val_str for term in financial_terms):
                    text_count += 1
                # Or just check if it's text (not a number, not a date)
                elif not str(val).replace('.', '').replace(',', '').replace('-', '').isdigit():
                    try:
                        pd.to_datetime(val)
                    except:
                        text_count += 1

            # If more than 30% of first column looks like account names
            if text_count / len(first_col_clean.head(20)) > 0.3:
                logger.info(f"First column has {text_count} financial terms/text values - likely financial statement")

                # Check if other columns are mostly numeric
                numeric_cols = 0
                for col in df.columns[1:6]:  # Check first 5 data columns
                    try:
                        # Try to convert to numeric
                        numeric_vals = pd.to_numeric(df[col], errors='coerce').dropna()
                        if len(numeric_vals) > len(df) * 0.3:  # At least 30% numeric
                            numeric_cols += 1
                    except:
                        pass

                if numeric_cols >= 2:
                    logger.info(f"Found {numeric_cols} numeric columns - confirming financial statement format")
                    return True

            return False

        except Exception as e:
            logger.warning(f"Error detecting financial statement format: {e}")
            return False

    def _unpivot_financial_statement(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Convert financial statement format to transaction list format:
        - First column becomes 'account_number' or 'description'
        - Column headers become 'period' or 'date'
        - Cell values become 'amount' (split into debit/credit based on sign)
        """
        try:
            # Clean up: remove completely empty rows
            df = df.dropna(how='all')

            # Find the first column with account names
            account_col = df.columns[0]

            # Get period columns (all columns except first)
            period_cols = df.columns[1:]

            logger.info(f"Unpivoting: Account column = {account_col}, Period columns = {list(period_cols)}")

            # Melt the dataframe
            df_melted = df.melt(
                id_vars=[account_col],
                value_vars=period_cols,
                var_name='period',
                value_name='amount'
            )

            # Rename account column to 'account_number'
            df_melted = df_melted.rename(columns={account_col: 'account_number'})

            # Clean up: remove rows with no amount
            df_melted = df_melted.dropna(subset=['amount'])
            df_melted = df_melted[df_melted['amount'].astype(str).str.strip() != '']

            # Convert amount to numeric
            df_melted['amount'] = pd.to_numeric(df_melted['amount'], errors='coerce')
            df_melted = df_melted.dropna(subset=['amount'])

            # Infer account type for each account to determine normal balance
            def get_normal_balance_side(account_number):
                """Determine if account has normal debit or credit balance"""
                account_type = self.infer_account_type_from_number(account_number)
                # Revenue, Liability, Equity = credit-normal
                # Asset, Expense = debit-normal
                return 'credit' if account_type in ['revenue', 'liability', 'equity'] else 'debit'

            df_melted['normal_side'] = df_melted['account_number'].apply(get_normal_balance_side)

            # Split amount into debit/credit based on account type and sign
            # For credit-normal accounts (revenue/liability/equity):
            #   - Positive amount → credit
            #   - Negative amount → debit
            # For debit-normal accounts (asset/expense):
            #   - Positive amount → debit
            #   - Negative amount → credit
            def assign_debit(row):
                if row['normal_side'] == 'credit':
                    # Credit-normal account: debit only if negative
                    return abs(row['amount']) if row['amount'] < 0 else 0
                else:
                    # Debit-normal account: debit if positive
                    return row['amount'] if row['amount'] > 0 else 0

            def assign_credit(row):
                if row['normal_side'] == 'credit':
                    # Credit-normal account: credit if positive
                    return row['amount'] if row['amount'] > 0 else 0
                else:
                    # Debit-normal account: credit only if negative
                    return abs(row['amount']) if row['amount'] < 0 else 0

            df_melted['debit'] = df_melted.apply(assign_debit, axis=1)
            df_melted['credit'] = df_melted.apply(assign_credit, axis=1)

            # Drop the helper columns
            df_melted = df_melted.drop(columns=['normal_side'])

            # Enhanced date parsing
            df_melted['date'] = df_melted['period'].apply(self._parse_period_to_date)

            # Count successful parses
            successful_dates = df_melted['date'].notna().sum()
            logger.info(f"Successfully parsed {successful_dates}/{len(df_melted)} periods as dates")

            # Add description (copy of account_number for now)
            df_melted['description'] = df_melted['account_number'].astype(str) + ' - ' + df_melted['period'].astype(str)

            # Keep original period column for reference
            df_melted['reference'] = df_melted['period'].astype(str)

            # Drop the amount column (we have debit/credit now)
            df_melted = df_melted.drop(columns=['amount'])

            logger.info(f"Unpivoted {len(df_melted)} rows from financial statement")

            return df_melted

        except Exception as e:
            logger.error(f"Error unpivoting financial statement: {e}")
            raise ValueError(f"Failed to unpivot financial statement: {str(e)}")

    def _parse_period_to_date(self, period_str):
        """
        Try multiple strategies to parse a period string into a date.
        Handles: dates, month names, quarters, years, etc.
        """
        if pd.isna(period_str):
            return pd.NaT

        period_str = str(period_str).strip()

        # Try standard date parsing first
        try:
            return pd.to_datetime(period_str)
        except:
            pass

        # Try month name formats (January, Jan, January 2024, Jan 2024, etc.)
        month_patterns = [
            r'(jan|january)[\s,]*(\d{4})?',
            r'(feb|february)[\s,]*(\d{4})?',
            r'(mar|march)[\s,]*(\d{4})?',
            r'(apr|april)[\s,]*(\d{4})?',
            r'(may)[\s,]*(\d{4})?',
            r'(jun|june)[\s,]*(\d{4})?',
            r'(jul|july)[\s,]*(\d{4})?',
            r'(aug|august)[\s,]*(\d{4})?',
            r'(sep|sept|september)[\s,]*(\d{4})?',
            r'(oct|october)[\s,]*(\d{4})?',
            r'(nov|november)[\s,]*(\d{4})?',
            r'(dec|december)[\s,]*(\d{4})?'
        ]

        import re
        period_lower = period_str.lower()

        for i, pattern in enumerate(month_patterns, start=1):
            match = re.search(pattern, period_lower)
            if match:
                year = match.group(2) if match.group(2) else '2024'  # Default to 2024
                try:
                    return pd.to_datetime(f'{year}-{i:02d}-01')
                except:
                    pass

        # Try quarter formats (Q1 2024, 2024 Q1, Quarter 1 2024, etc.)
        quarter_match = re.search(r'q(\d)[\s,]*(\d{4})?|(\d{4})[\s,]*q(\d)', period_lower)
        if quarter_match:
            if quarter_match.group(1):
                quarter = int(quarter_match.group(1))
                year = int(quarter_match.group(2)) if quarter_match.group(2) else 2024
            else:
                quarter = int(quarter_match.group(4))
                year = int(quarter_match.group(3))

            month = (quarter - 1) * 3 + 1  # Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct
            try:
                return pd.to_datetime(f'{year}-{month:02d}-01')
            except:
                pass

        # Try year only (2024, 2025, etc.)
        if period_str.isdigit() and 2000 <= int(period_str) <= 2100:
            try:
                return pd.to_datetime(f'{period_str}-01-01')
            except:
                pass

        # Try YYYY/MM format
        if re.match(r'\d{4}[/-]\d{1,2}', period_str):
            try:
                return pd.to_datetime(period_str + '-01')
            except:
                pass

        # If all else fails, try to extract a year and use Jan 1 of that year
        year_match = re.search(r'(\d{4})', period_str)
        if year_match:
            year = year_match.group(1)
            try:
                return pd.to_datetime(f'{year}-01-01')
            except:
                pass

        # Complete failure - return as text
        logger.warning(f"Could not parse period '{period_str}' as date")
        return period_str

    def _detect_data_as_headers(self, columns: List, df: pd.DataFrame) -> bool:
        """Detect if the first row looks like data instead of headers"""
        try:
            # Check if columns contain typical data patterns
            for col in columns:
                col_str = str(col).lower()
                # If column name looks like a company name, it's probably data
                if any(indicator in col_str for indicator in [' inc', ' llc', ' corp', ' ltd', ' gmbh', ' sa', ' ag']):
                    return True
                # If column is unnamed or looks like default pandas naming
                if col_str.startswith('unnamed:'):
                    return True
                # If column name is just a number (e.g., year)
                if col_str.isdigit() and len(col_str) == 4:  # Likely a year
                    return True

            # Check if we have very few columns that match our patterns
            if len(columns) > 0:
                normalized = [str(c).strip().lower() for c in columns]
                # Check if any column matches common patterns
                date_keywords = ['date', 'dt', 'trans', 'posting', 'entry', 'txn']
                amount_keywords = ['amount', 'debit', 'credit', 'dr', 'cr', 'balance', 'value']
                account_keywords = ['account', 'acct', 'code', 'number', 'gl']

                has_date = any(any(kw in col for kw in date_keywords) for col in normalized)
                has_amount = any(any(kw in col for kw in amount_keywords) for col in normalized)
                has_account = any(any(kw in col for kw in account_keywords) for col in normalized)

                # If none of the basic patterns match, it's likely data as headers
                if not (has_date or has_amount or has_account):
                    return True

            return False
        except:
            return False

    def _ai_map_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Use AI and heuristics to intelligently map column headers to expected format"""
        try:
            columns = list(df.columns)

            # First try rule-based mapping
            column_mapping = self._heuristic_column_mapping(df)

            # If we got good mappings, use them
            if len(column_mapping) >= 3:  # At least date, account, and one amount column
                logger.info(f"Using heuristic column mapping: {column_mapping}")
                return df.rename(columns=column_mapping)

            # Fall back to AI mapping if available
            client = get_openai_client()
            if not client:
                logger.warning("OpenAI not available and heuristic mapping insufficient")
                # Still try to use whatever heuristic mapping we have
                if column_mapping:
                    return df.rename(columns=column_mapping)
                return df

            # Get sample data for AI
            sample_data = df.head(5).to_dict('records')

            prompt = f"""You are analyzing a financial transaction file upload. Map the column headers to the standard format.

Current columns (may be numeric if no headers found): {columns}

Sample data (first 5 rows):
{json.dumps(sample_data, indent=2, default=str)}

Standard column names we need:
- date: transaction date (look for dates like 2024-01-15, 01/15/2024, etc.)
- account_number: account number or code (look for numeric codes like 1000, 4010, GL-1000, etc.)
- description: transaction description (text describing the transaction)
- debit: debit amount (positive numbers, often in a column labeled debit/dr/expense)
- credit: credit amount (positive numbers, often in a column labeled credit/cr/income)
- reference (optional): reference number (invoice numbers, receipt codes, etc.)

IMPORTANT:
- If columns are numeric (0, 1, 2, etc.), analyze the DATA VALUES to determine what each column contains
- Look at the actual data types and values, not just column names
- A column with dates like "2024-01-15" should map to "date"
- A column with account codes like "1000", "4010" should map to "account_number"
- A column with transaction descriptions should map to "description"
- Numeric columns with dollar amounts should map to either "debit" or "credit" based on context
- If there's only one amount column with mixed positive/negative values, map it to "amount"

Return a JSON object mapping current columns to standard columns. Format:
{{
  "current_column_name": "standard_column_name"
}}

If you can't confidently map a column, omit it from the response."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a financial data analysis assistant. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )

            mapping_text = response.choices[0].message.content.strip()

            # Extract JSON from markdown if present
            if "```json" in mapping_text:
                mapping_text = mapping_text.split("```json")[1].split("```")[0].strip()
            elif "```" in mapping_text:
                mapping_text = mapping_text.split("```")[1].split("```")[0].strip()

            ai_mapping = json.loads(mapping_text)

            # Merge heuristic and AI mappings (AI takes precedence)
            final_mapping = {**column_mapping, **ai_mapping}

            logger.info(f"Final column mapping: {final_mapping}")

            return df.rename(columns=final_mapping)

        except Exception as e:
            logger.warning(f"Column mapping failed: {e}")
            # Try heuristic mapping as last resort
            heuristic_mapping = self._heuristic_column_mapping(df)
            if heuristic_mapping:
                logger.info(f"Using fallback heuristic mapping: {heuristic_mapping}")
                return df.rename(columns=heuristic_mapping)
            return df

    def _heuristic_column_mapping(self, df: pd.DataFrame) -> Dict[str, str]:
        """Use pattern matching to map columns"""
        mapping = {}
        columns = list(df.columns)

        # Common patterns for each field
        date_patterns = ['date', 'dt', 'trans_date', 'transaction_date', 'posting_date', 'entry_date', 'txn_date']
        account_patterns = ['account', 'acct', 'account_number', 'account_no', 'acct_no', 'gl_account', 'code', 'account_code']
        description_patterns = ['description', 'desc', 'narrative', 'memo', 'details', 'particulars', 'comments']
        debit_patterns = ['debit', 'dr', 'debit_amount', 'dr_amount', 'debit_amt', 'withdrawals', 'expense', 'expenses']
        credit_patterns = ['credit', 'cr', 'credit_amount', 'cr_amount', 'credit_amt', 'deposits', 'income', 'revenue']
        reference_patterns = ['reference', 'ref', 'ref_no', 'reference_number', 'transaction_id', 'txn_id', 'invoice', 'receipt']

        # If columns are numeric (from header=None), analyze data values
        has_numeric_columns = all(str(col).isdigit() for col in columns)

        if has_numeric_columns:
            logger.info("Columns are numeric - analyzing data values for mapping")
            for col in columns:
                # Get sample non-null values
                sample = df[col].dropna().head(10)
                if len(sample) == 0:
                    continue

                # Check if column contains dates
                try:
                    pd.to_datetime(sample)
                    if 'date' not in mapping.values():
                        mapping[col] = 'date'
                        logger.info(f"Column {col} detected as date from values")
                        continue
                except:
                    pass

                # Check if column contains numeric values (amounts)
                if pd.api.types.is_numeric_dtype(sample):
                    if 'debit' not in mapping.values():
                        mapping[col] = 'debit'
                        logger.info(f"Column {col} detected as debit from numeric values")
                        continue
                    elif 'credit' not in mapping.values():
                        mapping[col] = 'credit'
                        logger.info(f"Column {col} detected as credit from numeric values")
                        continue

                # Check if column looks like account numbers (short numeric strings)
                if all(str(v).replace('-', '').replace('.', '').isdigit() for v in sample):
                    if 'account_number' not in mapping.values():
                        mapping[col] = 'account_number'
                        logger.info(f"Column {col} detected as account_number from numeric strings")
                        continue

                # Otherwise assume it's description
                if 'description' not in mapping.values():
                    mapping[col] = 'description'
                    logger.info(f"Column {col} detected as description (text data)")

            return mapping

        for col in columns:
            col_lower = str(col).lower()

            # Check date patterns
            if not any(v == 'date' for v in mapping.values()):
                if any(pattern in col_lower for pattern in date_patterns):
                    mapping[col] = 'date'
                    continue

            # Check account patterns
            if not any(v == 'account_number' for v in mapping.values()):
                if any(pattern in col_lower for pattern in account_patterns):
                    mapping[col] = 'account_number'
                    continue

            # Check description patterns
            if not any(v == 'description' for v in mapping.values()):
                if any(pattern in col_lower for pattern in description_patterns):
                    mapping[col] = 'description'
                    continue

            # Check debit patterns
            if not any(v == 'debit' for v in mapping.values()):
                if any(pattern in col_lower for pattern in debit_patterns):
                    mapping[col] = 'debit'
                    continue

            # Check credit patterns
            if not any(v == 'credit' for v in mapping.values()):
                if any(pattern in col_lower for pattern in credit_patterns):
                    mapping[col] = 'credit'
                    continue

            # Check reference patterns
            if not any(v == 'reference' for v in mapping.values()):
                if any(pattern in col_lower for pattern in reference_patterns):
                    mapping[col] = 'reference'

        # Smart amount detection: if only one amount column, try to split into debit/credit
        amount_patterns = ['amount', 'amt', 'value', 'total']
        if 'debit' not in mapping.values() and 'credit' not in mapping.values():
            for col in columns:
                col_lower = col.lower()
                if any(pattern in col_lower for pattern in amount_patterns):
                    # Check if amounts are positive/negative
                    if col in df.columns:
                        sample_vals = df[col].head(10).dropna()
                        if len(sample_vals) > 0:
                            has_negative = (sample_vals < 0).any()
                            if has_negative:
                                # Single column with +/- values - we'll handle this in prepare_transactions
                                mapping[col] = 'amount'
                            else:
                                # Assume it's debit
                                mapping[col] = 'debit'
                    break

        return mapping

    def validate_dataframe(self, df: pd.DataFrame) -> List[Dict]:
        """Validate DataFrame structure and data - flexible validation"""
        errors = []

        # Only validate if we have the expected columns after mapping
        # No longer require specific columns - just validate what we have

        if len(df) == 0:
            errors.append({
                'row': 0,
                'field': 'general',
                'error': 'File is empty or contains no valid data rows'
            })
            return errors

        # Validate each row only if we have the mapped columns
        for idx, row in df.iterrows():
            row_num = idx + 2  # +2 for header row and 0-indexing

            # Date validation (only if date column exists)
            if 'date' in row:
                if pd.isna(row['date']):
                    errors.append({'row': row_num, 'field': 'date', 'error': 'Date is required'})
                else:
                    try:
                        pd.to_datetime(row['date'])
                    except:
                        errors.append({'row': row_num, 'field': 'date', 'error': f"Invalid date format: {row['date']}"})

            # Account number validation (only if account_number column exists)
            if 'account_number' in row:
                if pd.isna(row['account_number']) or str(row['account_number']).strip() == '':
                    errors.append({'row': row_num, 'field': 'account_number', 'error': 'Account number is required'})

            # Amount validation (only if debit/credit columns exist)
            if 'debit' in row and 'credit' in row:
                debit = float(row['debit']) if not pd.isna(row['debit']) else 0
                credit = float(row['credit']) if not pd.isna(row['credit']) else 0

                if debit < 0 or credit < 0:
                    errors.append({'row': row_num, 'field': 'amounts', 'error': 'Amounts cannot be negative'})

                if debit == 0 and credit == 0:
                    errors.append({'row': row_num, 'field': 'amounts', 'error': 'Either debit or credit must be greater than 0'})

                # Both debit and credit should not both be > 0
                if debit > 0 and credit > 0:
                    errors.append({'row': row_num, 'field': 'amounts', 'error': 'Transaction cannot have both debit and credit'})

        return errors

    def prepare_transactions(self, df: pd.DataFrame, company_id: str, account_lookup: Dict[str, str]) -> Tuple[List[Dict], List[Dict]]:
        """
        Prepare transactions for database insertion - flexible to work with any data
        account_lookup: dict mapping account_number -> account_id
        """
        transactions = []
        errors = []

        for idx, row in df.iterrows():
            row_num = idx + 2

            try:
                # Parse date (skip row if no date)
                if 'date' not in row or pd.isna(row['date']):
                    errors.append({
                        'row': row_num,
                        'field': 'date',
                        'error': 'No date column found or date is missing - skipping row'
                    })
                    continue

                txn_date = pd.to_datetime(row['date'])

                # Get account ID (skip row if no account_number)
                if 'account_number' not in row or pd.isna(row['account_number']):
                    errors.append({
                        'row': row_num,
                        'field': 'account_number',
                        'error': 'No account_number column found or account number is missing - skipping row'
                    })
                    continue

                account_number = str(row['account_number']).strip()
                if account_number not in account_lookup:
                    errors.append({
                        'row': row_num,
                        'field': 'account_number',
                        'error': f"Account {account_number} not found in company"
                    })
                    continue

                account_id = account_lookup[account_number]

                # Parse amounts - handle different column formats
                debit = 0.0
                credit = 0.0

                # Check if we have separate debit/credit columns
                if 'debit' in row and 'credit' in row:
                    debit = float(row['debit']) if not pd.isna(row['debit']) and row['debit'] != '' else 0.0
                    credit = float(row['credit']) if not pd.isna(row['credit']) and row['credit'] != '' else 0.0
                # Check if we have a single 'amount' column
                elif 'amount' in row:
                    amount = float(row['amount']) if not pd.isna(row['amount']) and row['amount'] != '' else 0.0
                    if amount < 0:
                        credit = abs(amount)
                    else:
                        debit = amount
                # Try to find any numeric column that might be an amount
                else:
                    for col in row.index:
                        if pd.api.types.is_numeric_dtype(type(row[col])) and not pd.isna(row[col]):
                            amount = float(row[col])
                            if amount < 0:
                                credit = abs(amount)
                            else:
                                debit = amount
                            break

                # Get optional fields
                description = str(row['description']) if 'description' in row and not pd.isna(row['description']) else ''
                reference = str(row.get('reference', '')) if 'reference' in row and not pd.isna(row.get('reference')) else None

                transaction = {
                    'company_id': company_id,
                    'account_id': account_id,
                    'transaction_date': txn_date,
                    'description': description,
                    'reference': reference,
                    'debit_amount': debit,
                    'credit_amount': credit,
                    'fiscal_year': txn_date.year,
                    'fiscal_period': txn_date.month
                }

                transactions.append(transaction)

            except Exception as e:
                errors.append({
                    'row': row_num,
                    'field': 'general',
                    'error': f"Error processing row: {str(e)}"
                })

        return transactions, errors

    def infer_account_type_from_number(self, account_number: str) -> str:
        """
        Infer account type from account number using standard chart of accounts conventions:
        1xxx = Assets
        2xxx = Liabilities
        3xxx = Equity
        4xxx = Revenue
        5xxx-9xxx = Expenses
        """
        try:
            # Convert to string and get first character
            account_str = str(account_number).strip()
            if not account_str:
                return "expense"  # Default

            first_char = account_str[0]
            if first_char.isdigit():
                first_digit = int(first_char)

                if first_digit == 1:
                    return "asset"
                elif first_digit == 2:
                    return "liability"
                elif first_digit == 3:
                    return "equity"
                elif first_digit == 4:
                    return "revenue"
                else:  # 5, 6, 7, 8, 9
                    return "expense"
            else:
                # If account number doesn't start with digit, try to infer from name
                account_lower = account_str.lower()
                if any(term in account_lower for term in ['cash', 'receivable', 'inventory', 'asset', 'equipment', 'building']):
                    return "asset"
                elif any(term in account_lower for term in ['payable', 'liability', 'loan', 'debt']):
                    return "liability"
                elif any(term in account_lower for term in ['equity', 'capital', 'retained']):
                    return "equity"
                elif any(term in account_lower for term in ['revenue', 'sales', 'income', 'fees']):
                    return "revenue"
                else:
                    return "expense"
        except Exception as e:
            logger.warning(f"Error inferring account type for '{account_number}': {e}")
            return "expense"  # Default to expense

    def get_account_name_from_df(self, df: pd.DataFrame, account_number: str) -> str:
        """
        Extract account name from dataframe if available.
        For financial statements, the account name IS the account_number column value.
        """
        try:
            # In financial statements, account_number column contains the account name
            # (like "Depreciation", "R&D expenses", etc.)
            # So we can just use the account_number as the name
            return str(account_number).strip()
        except Exception as e:
            logger.warning(f"Error extracting account name for '{account_number}': {e}")
            return f"Account {account_number}"

    @staticmethod
    def generate_csv_template() -> str:
        """Generate CSV template for download"""
        template = """date,account_number,description,debit,credit,reference
2024-01-15,1000,Opening cash balance,50000,0,OB-001
2024-01-20,4000,Product sales,0,25000,INV-001
2024-01-25,6000,Salary payment,15000,0,PAY-001
2024-01-30,1000,Cash payment for expenses,0,5000,EXP-001"""
        return template

import_service = ImportService()
