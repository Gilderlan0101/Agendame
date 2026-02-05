from datetime import datetime
from decimal import Decimal as PyDecimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UpdateServices(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[PyDecimal] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {PyDecimal: str}
