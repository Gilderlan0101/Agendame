import os
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, Request, status
from fastapi.params import Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.schemas.auth.schemas_register import CrateUser
from app.service.auth.auth_register import SignupFreeTrial, create_account
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Autenticação'], prefix='/auth')

###############################################################
# Template de cadastro trial Premium e Free
##############################################################
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
########################################################################


@router.post('/register', status_code=status.HTTP_201_CREATED)
async def register(target: CrateUser):
    """Rota para registra uma empresa/salão"""
    data = {
        'username': target.username,
        'email': target.email,
        'password': target.password,
        'business_name': target.business_name,
        'business_type': target.business_type,
        'phone': target.phone,
        'whatsapp': target.whatsapp,
        'business_slug': target.business_slug,
    }

    create = await create_account(target=data)

    if create:
        return {'message': 'account created successfully'}

    else:
        return create
