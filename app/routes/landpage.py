import os

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
template_dir = os.path.join(BASE_DIR, 'templates')
templates = Jinja2Templates(directory=template_dir)


@router.get('/', response_class=HTMLResponse)
def landpage_agendame(request: Request):
    return templates.TemplateResponse('landpage.html', {'request': request})
