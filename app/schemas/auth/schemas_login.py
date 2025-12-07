from pydantic import BaseModel


class LoginResponse(BaseModel):
    """Resposta ao concluir login"""

    id: int                                     # Id do usuario
    username: str                         # email
    access_token: str                   # Token gerado
    refresh_token: str                  # Token regeneração
