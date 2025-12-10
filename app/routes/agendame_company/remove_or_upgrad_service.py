# app.routes.agendame_company.remove_or_upgrad_service.py
from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.controllers.agendame.remove_service import remove_service
from app.controllers.agendame.update_service import update_one_service
from app.schemas.agendame.update_infos_services import UpdateService
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Update or remove serivce'])

# Rota responsavel por remove um serviço.
@router.delete('/agendame/remove/service/{serviceID}')
async def remove_one_service(
    serviceID: int, current_user: SystemUser = Depends(get_current_user)
):
    """Remove um serviço da lista de serviço da empresa"""
    try_remove = await remove_service(
        service_id=serviceID, company_id=current_user.id
    )
    return try_remove


# Rota responsavel por altera dados de um serviço existente
@router.put('/agendame/update/service/{serviceId}')
async def update_service(
    date: UpdateService, current_user: SystemUser = Depends(get_current_user)
):

    # Converte o Pydantic model para dict e remove campos não relevantes
    dates_dict = date.dict(exclude_unset=True, exclude={'service_id'})

    var = await update_one_service(
        service_id=date.service_id,
        company_id=current_user.id,
        is_activate=False,
        dates=dates_dict,
    )

    return var
