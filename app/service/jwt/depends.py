# app/service/jwt/depends.py

from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr

from app.models.user import User
from app.service.jwt.jwt_decode_token import DecodeToken, TokenPayload

# Criamos um schema que pode aceitar token de header OU cookie
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl='auth/login',
    scheme_name='JWT',
    auto_error=False  # IMPORTANTE: Não lançar erro automaticamente
)


class SystemUser(BaseModel):
    id: int
    username: str
    email: EmailStr
    photo: Optional[str] = None
    status: bool = True
    phone: str
    name: str
    slug: str

    model_config = {'from_attributes': True}


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[SystemUser]:
    """
    Obtém o usuário atual verificando token em:
    1. Header Authorization (Bearer)
    2. Cookie access_token
    """

    # Se não tem token no header, tenta do cookie
    if not token:
        token = request.cookies.get('access_token')

    if not token:
        print("DEBUG get_current_user: Nenhum token encontrado")
        return None

    print(f"DEBUG get_current_user: Token encontrado ({len(token)} chars)")

    try:
        # Decodifica o token
        token_data = DecodeToken(token)

        # O subject do token deve ser o user_id
        user_id = token_data.user_id
        print(f"DEBUG get_current_user: user_id do token = {user_id}")

        # Busca o usuário no banco
        user = await User.get_or_none(id=user_id)

        if not user:
            print(f"DEBUG get_current_user: Usuário {user_id} não encontrado no banco")
            return None

        print(f"DEBUG get_current_user: Usuário encontrado: {user.email}")

        # Cria o SystemUser
        return SystemUser(
            id=user.id,
            username=user.username,
            email=user.email,
            phone=user.phone or "",
            name=user.business_name or user.username,
            slug=user.business_slug or user.username,
        )

    except HTTPException as e:
        print(f"DEBUG get_current_user: HTTPException: {e.detail}")
        return None
    except Exception as e:
        print(f"DEBUG get_current_user: Exception: {str(e)}")
        return None
