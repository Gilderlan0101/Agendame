from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.controllers.agendame.services import Services
from app.models.user import Service, User
from app.schemas.agendame.register_service import (ServiceCreate,
                                                   ServiceResponse)
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
    """
    try:
        # Criar instância do controlador
        services_controller = Services()

        # Determinar se é TrialAccount (pode vir do token ou verificar no banco)
        is_trial = current_user.is_trial

        # Usar a primeira versão (mais flexível)
        if current_user.id:
            result = await services_controller.create_service_for_current_user(
                service_data=service_data.model_dump(),
                current_user_id=current_user.id,
                user_is_trial=is_trial,
            )
            return result

    except HTTPException:
        raise
    except Exception as e:
        print(f'Erro ao criar serviço: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao criar serviço: {str(e)}',
        )
