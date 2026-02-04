from typing import Any, Optional

from pydantic import BaseModel


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user_id: int
    username: str
    email: str
    business_name: Optional[str] = None
    slog: Optional[str] = None
    response: Optional[Any] = None  # Não tente serializar RedirectResponse

    class Config:
        arbitrary_types_allowed = (
            True  # Pode conter cookies ou outros dados adicionais
        )
