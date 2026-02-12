# home.py
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(prefix='/agendame', tags=['Page home'])

# Configurar templates
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
template_dir = BASE_DIR / 'app' / 'templates'
templates = Jinja2Templates(directory=str(template_dir))


@router.get('/dashboard', response_class=HTMLResponse)
async def render_agendame_dashboard(
    request: Request,
    current_user: Optional[SystemUser] = Depends(get_current_user),
):
    """
    Rota para renderizar o dashboard.
    """
    print(f'DEBUG DASHBOARD: Usuário atual = {current_user}')

    # Se não houver usuário autenticado, redireciona para login
    if not current_user:
        # Preserva a URL atual para redirecionamento após login
        return RedirectResponse(
            url=f'/login?next={request.url.path}',
            status_code=status.HTTP_303_SEE_OTHER,
        )

    return templates.TemplateResponse(
        'index.html',
        {
            'request': request,
            'user': current_user,  # Passa o usuário para o template
        },
    )
