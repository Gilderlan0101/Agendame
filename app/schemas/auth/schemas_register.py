from typing import Optional

from pydantic import BaseModel, EmailStr


class CrateUser(BaseModel):
    username: str
    email: EmailStr
    password: str
    status: bool = True
    business_name: str
    business_type: str
    phone: str
    whatsapp: str
    business_slug: str
