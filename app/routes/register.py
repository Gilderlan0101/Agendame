from fastapi import APIRouter, HTTPException, status
from fastapi.params import Depends

from app.controllers.auth_register import create_account
from app.schemas.auth.schemas_register import CrateUser
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Autenticação'], prefix='/auth')


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
