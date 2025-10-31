from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User

router = APIRouter()

class QueryRequest(BaseModel):
    organization_id: str
    query: str

class QueryResponse(BaseModel):
    query: str
    response: str
    suggestions: list = []

@router.post("/query", response_model=QueryResponse)
async def ask_question(request: QueryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> QueryResponse:
    return QueryResponse(
        query=request.query,
        response=f"AI Assistant response for: {request.query}",
        suggestions=["Show latest consolidation", "List companies", "View mappings"]
    )
