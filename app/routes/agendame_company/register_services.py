from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import Service, User
from app.schemas.agendame.register_service import (
    ServiceCreate,
    ServiceResponse,
)
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Agendame-company'])

# TODO: Refatora mais tarde


@router.post(
    '/agendame/register/service',
    response_model=ServiceResponse,
    status_code=status.HTTP_200_OK,
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

        # Retornar o serviço criado no formato que o JS espera
        return {
            'status': 'success',
            'message': 'Serviço cadastrado com sucesso!',
            'service': {
                'id': service.id,
                'name': service.name,
                'description': service.description,
                'price': str(service.price),  # Converter Decimal para string
                'duration_minutes': service.duration_minutes,
                'order': service.order,
                'is_active': service.is_active,
                'created_at': service.created_at.isoformat()
                if service.created_at
                else None,
                'updated_at': service.updated_at.isoformat()
                if service.updated_at
                else None,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f'Erro ao criar serviço: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao criar serviço: {str(e)}',
        )
