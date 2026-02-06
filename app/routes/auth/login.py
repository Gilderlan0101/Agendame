import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates

from app.core.config import templates
from app.schemas.auth.schemas_login import LoginResponse
from app.service.auth.auth_login import (checking_account,
                                         checking_account_trial)
from app.service.auth.auth_register import SignupFreeTrial
from app.service.jwt.depends import SystemUser, get_current_user

load_dotenv()

router = APIRouter(tags=['Autenticação'])
router_login = APIRouter(tags=['Autenticação'], prefix='/auth')


@router_login.get('/me')
async def get_current_user_info(
    current_user: SystemUser = Depends(get_current_user),
):
    """Retorna as informações do usuário atual."""
    return current_user


@router.get('/login', response_class=HTMLResponse, name='login_page')
async def get_login_page(
    request: Request,
    error: Optional[str] = None,
    success: Optional[str] = None,
    next_url: Optional[str] = None,
):
    """Exibe a página HTML de login."""
    print(
        f'DEBUG LOGIN PAGE: error={error}, success={success}, next={next_url}'
    )

    return templates.TemplateResponse(
        'login.html',
        {
            'request': request,
            'error': error,
            'success': success,
            'next_url': next_url or '/agendame/dashboard',
        },
    )


@router_login.post(
    '/login',
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
)
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    """Rota responsável por autenticar um usuário se o mesmo tiver uma conta."""

    try:
        # Verifica se teste de 7 dias está habilitado ou não
        is_trial = SignupFreeTrial(data=None)
        result = await is_trial.remove_account_after_trial(
            target_by_email=form_data.username
        )

        if result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Sua conta de teste de 7 dias expirou. Por favor, registre-se novamente.',
            )

        # Tenta autenticar como usuário regular primeiro
        verify_auth = await checking_account(
            request=None,
            target={
                'username': form_data.username,
                'email': form_data.username,
                'password': form_data.password,
            },
        )

        # Se não encontrou usuário regular, tenta como trial
        if verify_auth is None:
            verify_auth = await checking_account_trial(
                request=None,
                target={
                    'username': form_data.username,
                    'email': form_data.username,
                    'password': form_data.password,
                },
            )

        # Se ainda for None, credenciais inválidas
        if verify_auth is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Credenciais inválidas. Verifique seu e-mail e senha.',
            )

        # IMPORTANTE: Aqui você deve criar a resposta com cookie
        # Verifica se verify_auth é um dicionário antes de usar .get()
        if not isinstance(verify_auth, dict):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Erro interno no servidor.',
            )

        # Cria a resposta JSON
        response_data = {
            'access_token': verify_auth.get('access_token'),
            'token_type': 'bearer',
            'refresh_token': verify_auth.get('refresh_token'),
            'user_id': verify_auth.get('user_id'),
            'username': verify_auth.get('username'),
            'email': verify_auth.get('email'),
            'business_name': verify_auth.get('business_name'),
            'slug': verify_auth.get('slug'),
            'is_trial': verify_auth.get('is_trial', False),
        }

        # Adiciona days_remaining apenas se for trial
        if verify_auth.get('is_trial', False):
            response_data['days_remaining'] = verify_auth.get('days_remaining', 0)

        response = JSONResponse(content=response_data)

        return response


    except HTTPException as e:
        # Redireciona para página de login com erro
        print(f'Erro no login: {e.detail}')
        return RedirectResponse(
            url=f'/login',
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except Exception as e:
        print(f'Erro inesperado no login: {e}')
        return RedirectResponse(
            url='/login',
            status_code=status.HTTP_303_SEE_OTHER,
        )


# Adicione esta função no mesmo arquivo onde está login_user


@router_login.get('/logout')
async def logout_user(request: Request):
    """Rota para logout do usuário."""

    # Verifica se há um usuário logado
    current_user = await get_current_user(request)

    # Cria resposta de redirecionamento
    response = RedirectResponse(
        url='/login',
        status_code=status.HTTP_303_SEE_OTHER,
    )

    # Remove o cookie de autenticação
    response.delete_cookie(
        key='access_token',
        httponly=True,
        secure=True,  # True em produção
        samesite='none',
    )

    # Remove outros cookies relacionados à autenticação se existirem
    response.delete_cookie('refresh_token')
    response.delete_cookie('user_id')

    # Adiciona headers para evitar cache
    response.headers[
        'Cache-Control'
    ] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'

    print(
        f'👋 Usuário {current_user.email if current_user else "desconhecido"} fez logout'
    )

    return response


# Rota de logout via POST (opcional, para APIs)
@router_login.post('/logout')
async def logout_user_api(request: Request):
    """Rota de logout para APIs (POST)."""

    current_user = await get_current_user(request)

    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            'message': 'Logout realizado com sucesso',
            'user': current_user.email if current_user else None,
        },
    )

    # Remove cookies
    response.delete_cookie(
        key='access_token', httponly=True, secure=True, samesite='lax'
    )

    return response
