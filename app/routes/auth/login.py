import os
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.schemas.auth.schemas_login import LoginResponse
from app.service.auth.auth_login import checking_account
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Autenticação'], prefix='/auth')
router_login = APIRouter(tags=['Autenticação'])

# BASE_DIR é o diretório do projeto (Agendame/)
BASE_DIR = (
    Path(__file__).resolve().parent.parent.parent.parent
)  # Isso vai para /home/admin-lan/saas/Agendame
print(f'BASE_DIR: {BASE_DIR}')

# Diretório de templates (dentro de app/)
template_dir = BASE_DIR / 'app' / 'templates'
templates = Jinja2Templates(directory=str(template_dir))

# Diretório de arquivos estáticos (dentro de app/)
static_dir = BASE_DIR / 'app' / 'static'

# Verificar se o diretório static existe
if not static_dir.exists():
    print(f'Aviso: Diretório static não encontrado: {static_dir}')
    # Criar o diretório se não existir
    static_dir.mkdir(parents=True, exist_ok=True)
    print(f'Diretório static criado: {static_dir}')


@router.get('/me')
async def get_current_user_info(
    current_user: SystemUser = Depends(get_current_user),
):
    """Retorna as informações do usuário atual."""
    return current_user


@router_login.get('/agendame/login', response_class=HTMLResponse)
async def get_login_page(request: Request):
    """Exibe a página HTML da landpage."""
    return templates.TemplateResponse('index.html', {'request': request})


@router.post(
    '/login',
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Rota responsável por autenticar um usuário se o mesmo tiver uma conta."""

    # OAuth2PasswordRequestForm sempre envia 'username' e 'password'
    verify_auth = await checking_account(
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

    return verify_auth
