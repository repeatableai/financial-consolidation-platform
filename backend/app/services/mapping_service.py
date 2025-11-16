from sqlalchemy.orm import Session
from typing import Tuple, Optional, List, Dict
import logging
import json
import os
from openai import OpenAI
from ..models.consolidation import MasterAccount, AccountType

logger = logging.getLogger(__name__)

class MappingService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key) if api_key else None
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.3"))

    def find_master_account_match(
        self,
        account_name: str,
        account_type: AccountType,
        organization_id: str,
        db: Session
    ) -> Tuple[Optional[str], float]:
        """
        Use AI to find the best matching master account for a child account.

        Args:
            account_name: The child account name to match
            account_type: The account type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
            organization_id: The organization ID
            db: Database session

        Returns:
            Tuple of (master_account_id, confidence_score)
            Returns (None, 0.0) if no good match found
        """
        try:
            # Get all master accounts for this organization with matching type
            master_accounts = db.query(MasterAccount).filter(
                MasterAccount.organization_id == organization_id,
                MasterAccount.account_type == account_type,
                MasterAccount.is_active == True
            ).all()

            if not master_accounts:
                logger.info(f"No master accounts found for organization {organization_id} with type {account_type}")
                return (None, 0.0)

            # Build list of master account names with IDs
            master_account_list = [
                {
                    "id": acc.id,
                    "account_number": acc.account_number,
                    "account_name": acc.account_name,
                    "category": acc.category,
                    "subcategory": acc.subcategory
                }
                for acc in master_accounts
            ]

            # Use OpenAI to find best match
            prompt = f"""You are a financial accounting expert helping to map child company accounts to a master chart of accounts.

Child Account to Map:
- Name: "{account_name}"
- Type: {account_type.value}

Available Master Accounts (same type):
{json.dumps(master_account_list, indent=2)}

Your task:
1. Find the BEST matching master account for the child account "{account_name}"
2. Consider semantic similarity, common accounting terminology, and account purpose
3. Return a confidence score from 0.0 to 1.0 indicating match quality

Examples of good matches:
- "R&D Expenses" matches "Research & Development Expense" (0.95)
- "Sales Revenue" matches "Revenue - Product Sales" (0.90)
- "Cash" matches "Cash and Cash Equivalents" (0.85)

Examples of uncertain matches:
- "Consulting Fees" might match "Professional Services" or "External Contractors" (0.60)
- "Office Supplies" could be "General & Administrative" or "Operating Expenses" (0.55)

Examples of no match:
- "Cryptocurrency Holdings" when no crypto-related master account exists (0.0)

Return ONLY a JSON object with this exact structure:
{{
    "master_account_id": "the ID of best matching master account or null if no good match",
    "confidence": 0.85,
    "reasoning": "brief explanation of why this is the best match"
}}

If no master account is a good semantic match (confidence < 0.5), return master_account_id as null."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a financial accounting expert. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=500
            )

            result_text = response.choices[0].message.content.strip()

            # Parse JSON response
            result = json.loads(result_text)

            master_account_id = result.get("master_account_id")
            confidence = float(result.get("confidence", 0.0))
            reasoning = result.get("reasoning", "")

            logger.info(f"AI matching result for '{account_name}': "
                       f"master_id={master_account_id}, confidence={confidence}, "
                       f"reasoning={reasoning}")

            return (master_account_id, confidence)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Response was: {result_text}")
            return (None, 0.0)
        except Exception as e:
            logger.error(f"Error finding master account match: {e}")
            return (None, 0.0)

    def get_suggested_master_account_details(
        self,
        master_account_id: Optional[str],
        db: Session
    ) -> Optional[Dict]:
        """
        Get details of a suggested master account for display to user.

        Returns:
            Dict with master account details or None
        """
        if not master_account_id:
            return None

        try:
            master_account = db.query(MasterAccount).filter(
                MasterAccount.id == master_account_id
            ).first()

            if not master_account:
                return None

            return {
                "id": master_account.id,
                "account_number": master_account.account_number,
                "account_name": master_account.account_name,
                "account_type": master_account.account_type.value,
                "category": master_account.category,
                "subcategory": master_account.subcategory
            }
        except Exception as e:
            logger.error(f"Error getting master account details: {e}")
            return None


# Singleton instance
mapping_service = MappingService()
