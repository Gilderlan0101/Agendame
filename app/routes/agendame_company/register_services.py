from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import Service, User
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Agendame-company'])


from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, validator


class ServiceResponse(BaseModel):
    """Schema para resposta de serviço"""

    id: int
    name: str
    description: Optional[str]
    price: Decimal
    duration_minutes: int
    order: int
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# Schemas
class ServiceCreate(BaseModel):
    """Schema para criação de serviço"""

    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    price: Decimal = Field(..., gt=0, le=10000)
    duration_minutes: int = Field(60, ge=5, le=240)
    order: int = Field(0, ge=0)
    is_active: bool = Field(True)

    @validator('price')
    def validate_price(cls, v):
        return round(v, 2)

    class Config:
        schema_extra = {
            'example': {
                'name': 'Corte Masculino',
                'description': 'Corte de cabelo masculino com tesoura e máquina',
                'price': 35.00,
                'duration_minutes': 45,
                'order': 1,
                'is_active': True,
            }
        }


@router.post(
    '/agendame/register/service',
    response_model=ServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_service(
    service_data: ServiceCreate,
    current_user: SystemUser = Depends(get_current_user),
):
    """
    Cadastra um novo serviço para a empresa do usuário logado.

    Requer autenticação. O serviço será vinculado à empresa do usuário.
    """
    try:
        # Buscar o usuário/empresa
        user = await User.get_or_none(id=current_user.id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Usuário não encontrado',
            )

        # Verificar se já existe serviço com mesmo nome para esta empresa
        existing_service = await Service.get_or_none(
            user=user, name=service_data.name
        )

        if existing_service:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Já existe um serviço com este nome',
            )

        # Criar o serviço
        service = await Service.create(
            user=user,
            name=service_data.name,
            description=service_data.description,
            price=service_data.price,
            duration_minutes=service_data.duration_minutes,
            order=service_data.order,
            is_active=service_data.is_active,
        )

        # Retornar o serviço criado
        return ServiceResponse.from_orm(service)

    except HTTPException:
        raise
    except Exception as e:
        print(f'Erro ao criar serviço: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao criar serviço',
        )
