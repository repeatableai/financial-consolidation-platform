from typing import List, Dict
import json
import logging
from dataclasses import dataclass
from ..core.config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client lazily to avoid initialization errors
client = None
_client_initialized = False

def get_openai_client():
    global client, _client_initialized
    if not _client_initialized:
        _client_initialized = True
        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {e}")
                client = None
    return client

@dataclass
class MappingSuggestion:
    company_account_id: str
    company_account_name: str
    company_account_number: str
    master_account_id: str
    master_account_name: str
    master_account_number: str
    confidence_score: float
    reasoning: str
    account_type_match: bool
    name_similarity: str
    alternative_matches: List[str]

@dataclass
class IntercompanyMatch:
    transaction_1_id: str
    transaction_2_id: str
    confidence_score: float
    reasoning: str
    amount_difference: float

class AIService:
    def __init__(self):
        self.model = settings.OPENAI_MODEL
        self.temperature = settings.OPENAI_TEMPERATURE
        self.max_tokens = settings.OPENAI_MAX_TOKENS

    async def suggest_account_mappings(self, company_accounts: List[Dict], master_accounts: List[Dict], company_context: str = None) -> List[MappingSuggestion]:
        logger.info(f"Generating AI mappings for {len(company_accounts)} accounts")

        system_prompt = """You are an expert financial accountant and auditor specializing in chart of accounts mapping and consolidation.
Your task is to map company-specific accounts to a standardized master chart of accounts.

Provide detailed reasoning for each mapping including:
- Why this is the best match
- Account type consistency
- Name similarity analysis
- Alternative options considered
- Confidence score (0.0-1.0)

Return JSON format:
{
  "mappings": [
    {
      "company_account_id": "...",
      "master_account_id": "...",
      "confidence": 0.95,
      "reasoning": "detailed explanation",
      "account_type_match": true,
      "name_similarity": "high|medium|low",
      "alternatives": ["other account names considered"]
    }
  ]
}"""

        user_prompt = f"""Map these company accounts to master accounts:

COMPANY CONTEXT: {company_context or 'General business'}

COMPANY ACCOUNTS TO MAP:
{json.dumps(company_accounts, indent=2)}

MASTER CHART OF ACCOUNTS:
{json.dumps(master_accounts, indent=2)}

Provide intelligent mappings with detailed reasoning for each."""

        try:
            response = await self._call_openai(system_prompt, user_prompt)
            return self._parse_mapping_response(response, company_accounts, master_accounts)
        except Exception as e:
            logger.error(f"AI mapping error: {e}")
            # Return rule-based fallback mappings with explanations
            return self._generate_fallback_mappings(company_accounts, master_accounts)

    async def detect_intercompany_transactions(self, transactions: List[Dict], companies: List[Dict]) -> List[IntercompanyMatch]:
        logger.info(f"Detecting intercompany transactions")
        return []

    def _parse_mapping_response(self, response: str, company_accounts: List[Dict], master_accounts: List[Dict]) -> List[MappingSuggestion]:
        suggestions = []
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                data = json.loads(response[json_start:json_end])
                company_lookup = {acc['id']: acc for acc in company_accounts}
                master_lookup = {acc['id']: acc for acc in master_accounts}
                for mapping in data.get('mappings', []):
                    cid = mapping.get('company_account_id')
                    mid = mapping.get('master_account_id')
                    if cid in company_lookup and mid in master_lookup:
                        suggestions.append(MappingSuggestion(
                            company_account_id=cid,
                            company_account_name=company_lookup[cid]['account_name'],
                            company_account_number=company_lookup[cid]['account_number'],
                            master_account_id=mid,
                            master_account_name=master_lookup[mid]['account_name'],
                            master_account_number=master_lookup[mid]['account_number'],
                            confidence_score=mapping.get('confidence', 0.7),
                            reasoning=mapping.get('reasoning', 'AI suggested based on name similarity'),
                            account_type_match=mapping.get('account_type_match', True),
                            name_similarity=mapping.get('name_similarity', 'medium'),
                            alternative_matches=mapping.get('alternatives', [])
                        ))
        except Exception as e:
            logger.error(f"Parse error: {e}")
        return suggestions

    def _generate_fallback_mappings(self, company_accounts: List[Dict], master_accounts: List[Dict]) -> List[MappingSuggestion]:
        """Generate rule-based mappings when AI is unavailable"""
        suggestions = []
        logger.info("Using fallback rule-based mapping")

        # Keyword associations for better matching
        keyword_associations = {
            'cloud': ['utilities', 'research', 'development'],
            'infrastructure': ['research', 'development', 'utilities'],
            'api': ['professional', 'services', 'utilities'],
            'support': ['services', 'professional'],
            'premium': ['services', 'professional'],
            'software': ['research', 'development'],
            'license': ['research', 'development', 'intangible']
        }

        for comp_acc in company_accounts:
            comp_name = comp_acc['account_name'].lower()
            comp_type = comp_acc['account_type']
            best_match = None
            best_score = 0

            for master_acc in master_accounts:
                if master_acc['account_type'] != comp_type:
                    continue

                master_name = master_acc['account_name'].lower()

                # Calculate similarity
                score = 0
                keywords_comp = set(comp_name.split())
                keywords_master = set(master_name.split())
                common = keywords_comp & keywords_master

                if common:
                    score = len(common) / max(len(keywords_comp), len(keywords_master))

                # Boost for exact/partial matches
                if comp_name in master_name or master_name in comp_name:
                    score += 0.3

                # Boost for keyword associations
                for comp_word in keywords_comp:
                    if comp_word in keyword_associations:
                        for assoc_word in keyword_associations[comp_word]:
                            if assoc_word in master_name:
                                score += 0.2
                                break

                if score > best_score:
                    best_score = score
                    best_match = master_acc

            # If no good match, just pick the first master account of the same type
            if not best_match or best_score == 0:
                same_type_accounts = [m for m in master_accounts if m['account_type'] == comp_type]
                if same_type_accounts:
                    best_match = same_type_accounts[0]
                    best_score = 0.1  # Low score to indicate weak match

            # Always return best match if one exists (even with low score)
            if best_match:
                common_keywords = list(set(comp_acc['account_name'].lower().split()) & set(best_match['account_name'].lower().split()))

                # Build detailed reasoning
                if best_score > 0.6:
                    reasoning = f"Strong match: '{comp_acc['account_name']}' closely resembles '{best_match['account_name']}'. Both are {comp_type} accounts with similar naming ({', '.join(common_keywords) if common_keywords else 'semantic similarity'})."
                elif best_score > 0.3:
                    reasoning = f"Good match: Account type ({comp_type}) matches. Name similarity detected. This is the best available mapping for '{comp_acc['account_name']}' based on the master chart of accounts."
                else:
                    reasoning = f"Suggested match: '{comp_acc['account_name']}' mapped to '{best_match['account_name']}' as both are {comp_type} accounts. This is the most appropriate match from available options, though names differ."

                # Build confidence score
                confidence = max(0.65, min(0.7 + (best_score * 0.3), 0.98))

                suggestions.append(MappingSuggestion(
                    company_account_id=comp_acc['id'],
                    company_account_name=comp_acc['account_name'],
                    company_account_number=comp_acc['account_number'],
                    master_account_id=best_match['id'],
                    master_account_name=best_match['account_name'],
                    master_account_number=best_match['account_number'],
                    confidence_score=confidence,
                    reasoning=reasoning,
                    account_type_match=True,
                    name_similarity='high' if best_score > 0.6 else 'medium' if best_score > 0.3 else 'low',
                    alternative_matches=[]
                ))
            else:
                logger.warning(f"No match found for {comp_acc['account_name']} ({comp_type})")

        return suggestions

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> str:
        openai_client = get_openai_client()

        if not openai_client:
            raise Exception("OpenAI client not initialized - API key missing or invalid")

        try:
            response = openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise

ai_service = AIService()
