from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.models.trial import TrialAccount
from app.models.user import User
from app.schemas.auth.schemas_login import LoginResponse
from app.service.jwt.auth import (
    create_access_token,
    create_refresh_token,
    verify_password,
)


async def checking_account(
    request: Optional[Request] = None, target: Dict[str, Any] = None
):
    """Versão que funciona com ou sem Request"""
    try:
        if target is None:
            return None

        username_or_email = target.get('username') or target.get('email')
        password = target.get('password')

        if not username_or_email or not password:
            return None

        # Buscar usuário por email
        user = await User.filter(email=username_or_email).first()

        # Se não encontrar por email, buscar por username
        if user is None:
            user = await User.filter(username=username_or_email).first()

        if user is None:
            return None

        # Verifica a senha
        if not verify_password(str(password), user.password):
            return None

        # Gera tokens
        user_id_str = str(user.id)
        access_token = create_access_token(user_id_str)
        refresh_token = create_refresh_token(user_id_str)

        # Se tiver um Request, cria resposta com redirecionamento
        if request:
            next_url = request.query_params.get('next', '/agendame/dashboard')
            response = RedirectResponse(
                url=next_url, status_code=status.HTTP_303_SEE_OTHER
            )

            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                max_age=3600,
                secure=True,
                samesite='lax' if request.url.scheme == 'http' else 'none',
            )
        else:
            # Se não tiver Request, cria uma resposta vazia
            response = None

        # Retorna LoginResponse
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'business_name': user.business_name,
            'slug': user.business_slug,
            'response': response,
            'is_trial': False,
        }

    except HTTPException as e:
        # Se tiver Request, retorna RedirectResponse
        if request:
            return RedirectResponse(
                url=f'/login?error={e.detail}',
                status_code=status.HTTP_303_SEE_OTHER,
            )
        # Se não tiver Request, levanta a exceção
        raise

    except Exception as e:
        print(f'Erro inesperado: {e}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Erro interno no servidor',
        )


async def checking_account_trial(
    request: Optional[Request] = None, target: Dict[str, Any] = None
):
    """Versão que funciona com ou sem Request para trial"""
    try:
        if target is None:
            return None

        username_or_email = target.get('username') or target.get('email')
        password = target.get('password')

        if not username_or_email or not password:
            return None

        # Buscar usuário por email
        user = await TrialAccount.filter(email=username_or_email).first()

        if user is None:
            return None

        # Verifica a senha
        if not verify_password(str(password), user.password):
            return None

        # Gera tokens
        user_id_str = str(user.id)
        access_token = create_access_token(user_id_str)
        refresh_token = create_refresh_token(user_id_str)

        # Se tiver um Request, cria resposta com redirecionamento
        if request:
            next_url = request.query_params.get('next', '/agendame/dashboard')
            response = RedirectResponse(
                url=next_url, status_code=status.HTTP_303_SEE_OTHER
            )

            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                max_age=3600,
                secure=True,
                samesite='lax' if request.url.scheme == 'http' else 'none',
            )
        else:
            response = None

        # Retorna LoginResponse
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'business_name': user.business_name,
            'slug': user.business_slug,
            'response': response,
            'is_trial': True,
        }

    except HTTPException as e:
        if request:
            return RedirectResponse(
                url=f'/login?error={e.detail}',
                status_code=status.HTTP_303_SEE_OTHER,
            )
        raise

    except Exception as e:
        print(f'Erro inesperado: {e}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Erro interno no servidor',
        )
