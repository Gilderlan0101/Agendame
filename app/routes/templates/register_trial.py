import os
from pathlib import Path

from fastapi import APIRouter, Request, status
from fastapi.responses import HTMLResponse, JSONResponse

#from app.core.config import templates
from app.schemas.auth.schemas_register import CrateUser
from app.service.auth.auth_register import SignupFreeTrial, create_account

from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

router = APIRouter(tags=['Templates'], prefix='')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
template_dir = os.path.join(BASE_DIR, 'templates')
templates = Jinja2Templates(directory=template_dir)

@router.get(
    '/agendame/trial', response_class=HTMLResponse, name='create_trial_account'
)
async def get_login_page(request: Request):
    """Exibe a página HTML da landpage."""
    return templates.TemplateResponse(
        'register-trial.html', {'request': request}
    )


##################
# Rota responsável por criar conta de sete dias grátis
##################
@router.post('/auth/signup/free-trial', status_code=status.HTTP_201_CREATED)
async def signup_trial(target: CrateUser):

    # Podemos remover isso depois
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

    create = SignupFreeTrial(data=data)
    result = await create.create()

    return result
