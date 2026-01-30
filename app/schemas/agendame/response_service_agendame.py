from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ServiceItem(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: str
    duration_minutes: int
    order: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


# TODO: Remove esse Schemas
class ServiceListResponse(BaseModel):
    status: str
    services: List[ServiceItem]
