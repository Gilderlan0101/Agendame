from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.controllers.agendame.services import Services
from app.schemas.agendame.response_service_agendame import ServiceItem
from app.schemas.agendame.upgrade_service import UpdateServices
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Agendame-company'])


@router.get('/agendame/services', response_model=List[ServiceItem])
async def get_my_services(
    current_user: SystemUser = Depends(get_current_user),
):
    service_domain = Services(target_company_id=current_user.id)
    return await service_domain.get_services()


@router.delete('/agendame/remove/service/{service_id}', status_code=200)
async def remove_service(
    service_id: int, current_user: SystemUser = Depends(get_current_user)
):
    target_service = Services(target_company_id=current_user.id)
    return await target_service.remove_one_service(
        target_service_id=service_id
    )


@router.put('/agendame/update/service/{service_id}', status_code=200)
async def upgrade_service(
    service_id: int,
    schemas_update: UpdateServices,
    current_user: SystemUser = Depends(get_current_user),
):
    target_service = Services(target_company_id=current_user.id)
    return await target_service.upgrade_service(
        target_service_id=service_id, schemas=schemas_update
    )


@router.get('/clients')
async def get_clients(
    current_user: SystemUser = Depends(get_current_user),
    search_query: Optional[str] = Query(
        None, description='Busca por nome do cliente'
    ),
    limit: int = Query(50, ge=1, le=100, description='Limite de resultados'),
    offset: int = Query(0, ge=0, description='Offset para paginação'),
):
    """
    Busca todos os clientes da empresa do usuário logado.
    """
    try:
        services_domain = Services(target_company_id=current_user.id)
        return await services_domain.get_clients(
            search_query=search_query, limit=limit, offset=offset
        )

    except Exception as e:
        print(f'Erro ao buscar clientes: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao buscar clientes: {str(e)}',
        )


@router.get('/dashboard/stats')
async def get_dashboard_stats(
    current_user: SystemUser = Depends(get_current_user),
):
    """
    Retorna estatísticas para o dashboard.
    """
    try:
        services_domain = Services(target_company_id=current_user.id)
        return await services_domain.get_dashboard_stats()

    except Exception as e:
        print(f'Erro ao buscar estatísticas: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao buscar estatísticas: {str(e)}',
        )
