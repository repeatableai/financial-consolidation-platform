"""
Transaction Import Service
Handles Excel and CSV file imports with validation
"""
import pandas as pd
import io
import logging
from typing import List, Dict, Tuple
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ImportResult:
    success_count: int
    error_count: int
    errors: List[Dict]
    imported_transactions: List[Dict]

class ImportService:
    REQUIRED_COLUMNS = ['date', 'account_number', 'description', 'debit', 'credit']
    OPTIONAL_COLUMNS = ['reference', 'account_name']

    def parse_file(self, file_content: bytes, filename: str) -> pd.DataFrame:
        """Parse Excel or CSV file into DataFrame"""
        try:
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                df = pd.read_excel(io.BytesIO(file_content))
            elif filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file format: {filename}")

            # Normalize column names (lowercase, strip spaces)
            df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]

            return df
        except Exception as e:
            logger.error(f"File parsing error: {e}")
            raise ValueError(f"Failed to parse file: {str(e)}")

    def validate_dataframe(self, df: pd.DataFrame) -> List[Dict]:
        """Validate DataFrame structure and data"""
        errors = []

        # Check required columns
        missing_cols = [col for col in self.REQUIRED_COLUMNS if col not in df.columns]
        if missing_cols:
            errors.append({
                'row': 0,
                'field': 'columns',
                'error': f"Missing required columns: {', '.join(missing_cols)}"
            })
            return errors

        # Validate each row
        for idx, row in df.iterrows():
            row_num = idx + 2  # +2 for header row and 0-indexing

            # Date validation
            if pd.isna(row['date']):
                errors.append({'row': row_num, 'field': 'date', 'error': 'Date is required'})
            else:
                try:
                    pd.to_datetime(row['date'])
                except:
                    errors.append({'row': row_num, 'field': 'date', 'error': f"Invalid date format: {row['date']}"})

            # Account number validation
            if pd.isna(row['account_number']) or str(row['account_number']).strip() == '':
                errors.append({'row': row_num, 'field': 'account_number', 'error': 'Account number is required'})

            # Amount validation (at least one must be > 0)
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
        Prepare transactions for database insertion
        account_lookup: dict mapping account_number -> account_id
        """
        transactions = []
        errors = []

        for idx, row in df.iterrows():
            row_num = idx + 2

            try:
                # Parse date
                txn_date = pd.to_datetime(row['date'])

                # Get account ID
                account_number = str(row['account_number']).strip()
                if account_number not in account_lookup:
                    errors.append({
                        'row': row_num,
                        'field': 'account_number',
                        'error': f"Account {account_number} not found in company"
                    })
                    continue

                account_id = account_lookup[account_number]

                # Parse amounts
                debit = float(row['debit']) if not pd.isna(row['debit']) and row['debit'] != '' else 0.0
                credit = float(row['credit']) if not pd.isna(row['credit']) and row['credit'] != '' else 0.0

                # Get optional fields
                description = str(row['description']) if not pd.isna(row['description']) else ''
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
