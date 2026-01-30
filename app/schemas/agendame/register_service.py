from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    duration_minutes: int = Field(..., gt=0)
    order: int = Field(default=0)
    is_active: bool = Field(default=True)


class ServiceData(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: str
    duration_minutes: int
    order: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class ServiceResponse(BaseModel):
    status: str
    message: str
    service: ServiceData
