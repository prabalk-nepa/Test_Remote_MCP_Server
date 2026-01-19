from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class Expense(BaseModel):
    """Expense data model with validation"""

    id: Optional[str] = None
    date: str
    amount: float = Field(gt=0, description="Amount must be greater than 0")
    category: str = Field(min_length=1, description="Category is required")
    subcategory: str = ""
    note: str = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @field_validator('date')
    @classmethod
    def validate_date(cls, v: str) -> str:
        """Validate date format (YYYY-MM-DD)"""
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: float) -> float:
        """Validate amount is positive and has max 2 decimal places"""
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        # Round to 2 decimal places
        return round(v, 2)


class ExpenseSummary(BaseModel):
    """Summary data model for aggregated expenses"""

    category: str
    total_amount: float
    count: int
