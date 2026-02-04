# app/service/jwt/depends.py

from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr

from app.models.trial import TrialAccount
from app.models.user import User
from app.service.jwt.jwt_decode_token import DecodeToken, TokenPayload

# Criamos um schema que pode aceitar token de header OU cookie
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl='auth/login',
    scheme_name='JWT',
    auto_error=False,  # IMPORTANTE: Não lançar erro automaticamente
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
    is_trial: bool

    model_config = {'from_attributes': True}


async def get_current_user(
    request: Request, token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[SystemUser]:
    """
    Obtém o usuário atual verificando token em:
    1. Header Authorization (Bearer)
    2. Cookie access_token
    Aceita tanto usuários regulares quanto trial.
    """

    # Se não tem token no header, tenta do cookie
    if not token:
        token = request.cookies.get('access_token')

    if not token:
        print('DEBUG get_current_user: Nenhum token encontrado')
        return None

    print(f'DEBUG get_current_user: Token encontrado ({len(token)} chars)')

    try:
        # Decodifica o token
        token_data = DecodeToken(token)

        # O subject do token deve ser o user_id
        user_id = token_data.user_id
        print(f'DEBUG get_current_user: user_id do token = {user_id}')

        # Primeiro tenta buscar usuário regular
        user = await User.get_or_none(id=user_id)
        is_trial = False

        # Se não encontrou usuário regular, tenta trial
        if not user:
            user = await TrialAccount.get_or_none(id=user_id)
            is_trial = True if user else False

        if not user:
            print(
                f'DEBUG get_current_user: Usuário {user_id} não encontrado em nenhuma tabela'
            )
            return None

        print(
            f'DEBUG get_current_user: Usuário encontrado: {user.email} (trial: {is_trial})'
        )

        # Para trial, alguns campos podem ser diferentes
        if is_trial:
            phone = getattr(user, 'phone', '') or ''
            business_name = getattr(user, 'business_name', user.username)
            business_slug = getattr(user, 'business_slug', user.username)
            name = getattr(user, 'name', user.username)
            username = getattr(user, 'username', user.email.split('@')[0])
        else:
            phone = user.phone or ''
            business_name = user.business_name or user.username
            business_slug = user.business_slug or user.username
            name = business_name
            username = user.username

        # Cria o SystemUser
        return SystemUser(
            id=user.id,
            username=username,
            email=user.email,
            phone=phone,
            name=name,
            slug=business_slug,
            is_trial=is_trial,
        )

    except HTTPException as e:
        print(f'DEBUG get_current_user: HTTPException: {e.detail}')
        return None
    except Exception as e:
        print(f'DEBUG get_current_user: Exception: {str(e)}')
        return None
