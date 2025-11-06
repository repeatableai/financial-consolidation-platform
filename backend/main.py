from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, organizations, companies, accounts, mappings, transactions, consolidation, reports, ai_assistant, parent_companies

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Constellation Consolidator...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized")
    yield
    logger.info("Shutting down...")

app = FastAPI(
    title="Constellation Consolidator API",
    description="AI-Powered Financial Consolidation Platform",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(organizations.router, prefix="/api/v1/organizations", tags=["Organizations"])
app.include_router(parent_companies.router, prefix="/api/v1/parent-companies", tags=["Parent Companies"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["Companies"])
app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
app.include_router(mappings.router, prefix="/api/v1/mappings", tags=["Mappings"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(consolidation.router, prefix="/api/v1/consolidation", tags=["Consolidation"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(ai_assistant.router, prefix="/api/v1/ai", tags=["AI Assistant"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/")
async def root():
    return {"message": "Constellation Consolidator API", "docs": "/docs"}
