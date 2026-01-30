from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class AppointmentsToday(BaseModel):
    """
    Schema de filtro para busca de agendamentos.
    Usado no POST /appointments
    """

    # Data de referência da busca
    day: Optional[date] = Field(
        default=None,
        description='Data dos agendamentos (YYYY-MM-DD). Se None, usa o dia atual.',
    )

    # Paginação
    limit: Optional[int] = Field(
        default=100, ge=1, le=500, description='Quantidade máxima de registros'
    )

    offset: Optional[int] = Field(
        default=0, ge=0, description='Offset para paginação'
    )

    # Filtros opcionais
    service_id: Optional[int] = Field(
        default=None, description='Filtrar por serviço específico'
    )

    customer_name: Optional[str] = Field(
        default=None, description='Filtro por nome do cliente'
    )

    status: Optional[str] = Field(
        default=None,
        description='Status do agendamento (ex: scheduled, canceled, done)',
    )

    class Config:
        json_schema_extra = {
            'example': {
                'day': '2026-01-28',
                'limit': 20,
                'offset': 0,
                'service_id': 3,
                'customer_name': 'joão',
                'status': 'scheduled',
            }
        }
