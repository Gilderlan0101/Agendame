from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.controllers.agendame.appointments import search_for_appointments
from app.schemas.agendame.appointments import AppointmentsToday
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Agendame-company'])


@router.post('/appointments')
async def get_appointments(
    schema: AppointmentsToday,
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Busca agendamentos da empresa do usuário logado.
    Retorna { "appointments": [...] } como o JS espera.
    """

    search = await search_for_appointments(
        schema=schema.model_dump(),   # pydantic v2 safe
        company_id=current_user.id
    )

    # Se vier vazio ou None
    if not search:
        return {
            "appointments": [],
            "pagination": {
                "total": 0,
                "limit": schema.limit or 100,
                "offset": schema.offset or 0,
                "has_more": False
            }
        }

    # Garante contrato consistente
    if isinstance(search, dict):
        return search

    # fallback defensivo
    return (
        dict(search)
        if hasattr(search, "__dict__")
        else {"appointments": [], "pagination": {}}
    )
