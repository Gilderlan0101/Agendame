import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates

from app.schemas.auth.schemas_login import LoginResponse
from app.service.auth.auth_login import (
    checking_account,
    checking_account_trial,
)
from app.service.auth.auth_register import SignupFreeTrial
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Autenticação'])
router_login = APIRouter(tags=['Autenticação'], prefix='/auth')

# Configurar templates
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
template_dir = BASE_DIR / 'app' / 'templates'
templates = Jinja2Templates(directory=str(template_dir))

@router_login.get('/me')
async def get_current_user_info(
    current_user: SystemUser = Depends(get_current_user),
):
    """Retorna as informações do usuário atual."""
    return current_user


@router.get('/login', response_class=HTMLResponse, name="login_page")
async def get_login_page(
    request: Request,
    error: Optional[str] = None,
    success: Optional[str] = None,
    next_url: Optional[str] = None,
):
    """Exibe a página HTML de login."""
    print(f"DEBUG LOGIN PAGE: error={error}, success={success}, next={next_url}")

    return templates.TemplateResponse(
        'login.html',
        {
            'request': request,
            'error': error,
            'success': success,
            'next_url': next_url or "/agendame/dashboard"
        }
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

        # OAuth2PasswordRequestForm sempre envia 'username' e 'password'
        # if not isinstance(form_data, OAuth2PasswordRequestForm):
        #     raise HTTPException(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         detail='Dados de formulário inválidos.',
        #     )

        verify_auth = await checking_account(
            request=None,  # Você precisa ajustar esta função para não depender de Request
            target={
                'username': form_data.username,
                'email': form_data.username,
                'password': form_data.password,
            }
        )

        # Verificar em tabelas de usuarios trial 7 dias
        if not verify_auth:
            verify_auth = await checking_account_trial(
                request=None,
                target={
                    'username': form_data.username,
                    'email': form_data.username,
                    'password': form_data.password,
                }
            )

        if verify_auth is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Credenciais inválidas. Verifique seu e-mail e senha.',
            )

        # IMPORTANTE: Aqui você deve criar a resposta com cookie
        # Ajuste conforme sua implementação de token
        response = JSONResponse(
            content={
                "access_token": verify_auth.get("access_token"),
                "token_type": "bearer"
            }
        )

        # Define o cookie de autenticação
        response.set_cookie(
            key="access_token",
            value=verify_auth.get("access_token"),
            httponly=True,
            max_age=3600,  # 1 hora
            secure=False,  # True em produção com HTTPS
            samesite="lax"
        )

        return response

    except HTTPException as e:
        # Redireciona para página de login com erro
        return RedirectResponse(
            url=f'/login?error={e.detail}',
            status_code=status.HTTP_303_SEE_OTHER,
        )


@router_login.get('/logout')
async def logout_user():
    """Rota para logout do usuário."""

    response = RedirectResponse(
        url="/login?success=logout",
        status_code=status.HTTP_303_SEE_OTHER
    )

    # Remove o cookie de autenticação
    response.delete_cookie(key="access_token")

    return response
