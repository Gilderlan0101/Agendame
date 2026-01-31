import os

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter(prefix='', tags=['agendame_chat'])

# Configurar templates
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
template_dir = os.path.join(BASE_DIR, 'templates')
templates = Jinja2Templates(directory=template_dir)


@router.get('/agendame/{company_slug}', response_class=HTMLResponse)
async def render_agendame_chat(request: Request, company_slug: str):
    """
    Rota para renderizar a página de chat de agendamento.
    Exemplo: /agendame/corte-supremo-barber-spa
    """
    return templates.TemplateResponse(
        'agendame.html', {'request': request, 'company_slug': company_slug}
    )


@router.get('/{company_slug}', response_class=HTMLResponse)
async def render_agendame_chat_short(request: Request, company_slug: str):
    """
    Rota alternativa: /corte-supremo-barber-spa
    """
    return templates.TemplateResponse(
        'agendame.html', {'request': request, 'company_slug': company_slug}
    )
