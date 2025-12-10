from fastapi import APIRouter, Depends, HTTPException, status

from app.controllers.agendame.appointments import search_for_appointments
from app.schemas.agendame.schemas_appointments import AppointmentsToday
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Agendame-company'])


@router.post('/appointments')
async def get_appointments(
    schema: AppointmentsToday,
    current_user: SystemUser = Depends(get_current_user),
):
    """
    Busca agendamentos da empresa do usuário logado.
    Retorna { "appointments": [...] } como o JS espera.
    """

    search = await search_for_appointments(schema=dict(schema), company_id=current_user.id)
    if search:
        return search
    else:
        return search


