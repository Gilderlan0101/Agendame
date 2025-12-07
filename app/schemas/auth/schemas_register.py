from pydantic import BaseModel, EmailStr
from typing import Optional

class CrateUser(BaseModel):
    username: str
    email: EmailStr
    password: str
    status: bool = True
    business_name: str
    business_type: str
    phone: str
    whatsapp: str
