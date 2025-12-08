from pydantic import BaseModel


class LoginResponse(BaseModel):
    """Resposta ao concluir login"""

    access_token: str
    token_type: str
    user_id: int
    username: str
    email: str
    business_name: str
