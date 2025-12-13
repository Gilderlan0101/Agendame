from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from app.controllers.agendame.appointments import search_for_appointments
from app.schemas.agendame.schemas_appointments import AppointmentsToday
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

    search = await search_for_appointments(schema=dict(schema), company_id=current_user.id)

    # Se search_for_appointments retornar None ou vazio
    if not search:
        # Retorna uma estrutura vazia mas válida
        return {
            "appointments": [],
            "pagination": {
                "total": 0,
                "limit": schema.limit or 100,
                "offset": schema.offset,
                "has_more": False
            }
        }

    # Certifica-se que search é um dicionário
    if isinstance(search, dict):
        return search
    else:
        # Se for outra coisa, converte para dict
        return dict(search) if hasattr(search, '__dict__') else {"appointments": [], "pagination": {}}
