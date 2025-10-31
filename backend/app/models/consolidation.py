from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base

class AccountType(enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"

class TransactionType(enum.Enum):
    STANDARD = "standard"
    INTERCOMPANY = "intercompany"
    ELIMINATION = "elimination"
    ADJUSTMENT = "adjustment"

class ConsolidationStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    fiscal_year_end_month = Column(Integer, default=12)
    default_currency = Column(String, default="USD")
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    companies = relationship("Company", back_populates="organization", cascade="all, delete-orphan")
    master_accounts = relationship("MasterAccount", back_populates="organization", cascade="all, delete-orphan")

class Company(Base):
    __tablename__ = "companies"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    legal_name = Column(String, nullable=True)
    entity_type = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    currency = Column(String, default="USD")
    fiscal_year_end_month = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    organization = relationship("Organization", back_populates="companies")
    accounts = relationship("CompanyAccount", back_populates="company", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="company", cascade="all, delete-orphan", foreign_keys="[Transaction.company_id]")

class MasterAccount(Base):
    __tablename__ = "master_accounts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    account_number = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    account_type = Column(SQLEnum(AccountType), nullable=False)
    category = Column(String, nullable=True)
    subcategory = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    organization = relationship("Organization", back_populates="master_accounts")
    mappings = relationship("AccountMapping", back_populates="master_account", cascade="all, delete-orphan")

class CompanyAccount(Base):
    __tablename__ = "company_accounts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    account_number = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    account_type = Column(SQLEnum(AccountType), nullable=False)
    category = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    company = relationship("Company", back_populates="accounts")
    mappings = relationship("AccountMapping", back_populates="company_account", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")

class AccountMapping(Base):
    __tablename__ = "account_mappings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_account_id = Column(String, ForeignKey("company_accounts.id"), nullable=False)
    master_account_id = Column(String, ForeignKey("master_accounts.id"), nullable=False)
    confidence_score = Column(Float, nullable=True)
    mapping_source = Column(String, default="manual")
    ai_reasoning = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    company_account = relationship("CompanyAccount", back_populates="mappings")
    master_account = relationship("MasterAccount", back_populates="mappings")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    account_id = Column(String, ForeignKey("company_accounts.id"), nullable=False)
    transaction_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    reference = Column(String, nullable=True)
    debit_amount = Column(Float, default=0.0)
    credit_amount = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    transaction_type = Column(SQLEnum(TransactionType), default=TransactionType.STANDARD)
    is_intercompany = Column(Boolean, default=False)
    counterparty_company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    fiscal_year = Column(Integer, nullable=True)
    fiscal_period = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    company = relationship("Company", back_populates="transactions", foreign_keys=[company_id])
    account = relationship("CompanyAccount", back_populates="transactions")

class ConsolidationRun(Base):
    __tablename__ = "consolidation_runs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    run_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    fiscal_year = Column(Integer, nullable=False)
    fiscal_period = Column(Integer, nullable=False)
    period_end_date = Column(DateTime, nullable=False)
    status = Column(SQLEnum(ConsolidationStatus), default=ConsolidationStatus.PENDING)
    total_assets = Column(Float, nullable=True)
    total_liabilities = Column(Float, nullable=True)
    total_equity = Column(Float, nullable=True)
    total_revenue = Column(Float, nullable=True)
    total_expenses = Column(Float, nullable=True)
    net_income = Column(Float, nullable=True)
    companies_included = Column(JSON, nullable=True)
    elimination_count = Column(Integer, default=0)
    processing_time_seconds = Column(Float, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class IntercompanyElimination(Base):
    __tablename__ = "intercompany_eliminations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    consolidation_run_id = Column(String, ForeignKey("consolidation_runs.id"), nullable=False)
    description = Column(Text, nullable=False)
    transaction_1_id = Column(String, ForeignKey("transactions.id"), nullable=False)
    transaction_2_id = Column(String, ForeignKey("transactions.id"), nullable=True)
    elimination_amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    detection_confidence = Column(Float, nullable=True)
    ai_reasoning = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
