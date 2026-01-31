from datetime import date


from typing import Optional, List
from pydantic import BaseModel, Field, validator
from decimal import Decimal


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






# Schema para filtro de agendamentos
class AppointmentsFilter(BaseModel):
    start_date: Optional[date] = Field(None, description="Data inicial (YYYY-MM-DD)")
    end_date: Optional[date] = Field(None, description="Data final (YYYY-MM-DD)")
    status: Optional[str] = Field(None, description="Status do agendamento")
    client_name: Optional[str] = Field(None, description="Nome do cliente")
    service_id: Optional[int] = Field(None, description="ID do serviço")
    offset: int = Field(0, ge=0, description="Offset para paginação")
    limit: int = Field(100, ge=1, le=200, description="Limite de resultados")


# Schema para resposta de agendamentos
class AppointmentResponse(BaseModel):
    id: int
    date: date
    time: str
    client: dict
    service: dict
    status: str
    notes: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


# Schema para resposta da lista de agendamentos
class AppointmentsListResponse(BaseModel):
    appointments: List[AppointmentResponse]
    total: int
    offset: int
    limit: int


# Schema para criar agendamento interno
class CreateAppointmentInternal(BaseModel):
    client_name: str = Field(..., max_length=200, description="Nome do cliente")
    client_phone: str = Field(..., max_length=20, description="Telefone do cliente")
    service_id: int = Field(..., description="ID do serviço")
    appointment_date: date = Field(..., description="Data do agendamento")
    appointment_time: str = Field(..., description="Horário do agendamento (HH:MM)")
    notes: Optional[str] = Field(None, description="Observações")

    @validator('appointment_time')
    def validate_time_format(cls, v):
        # Validar formato HH:MM
        if not v or ':' not in v:
            raise ValueError('Formato de hora inválido. Use HH:MM')

        try:
            hour, minute = map(int, v.split(':'))
            if not (0 <= hour <= 23) or not (0 <= minute <= 59):
                raise ValueError('Hora inválida')
        except ValueError:
            raise ValueError('Formato de hora inválido. Use HH:MM')

        return v


# Schema para resposta de criação de agendamento
class AppointmentCreatedResponse(BaseModel):
    id: int
    client_name: str
    client_phone: str
    service_name: str
    appointment_date: date
    appointment_time: str
    price: Decimal
    status: str
    confirmation_code: str
    message: str






class UpdateAppointmentSchema(BaseModel):
    """Schema para atualização parcial de agendamentos."""

    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    service_id: Optional[int] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    price: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    @validator('appointment_time')
    def validate_time_format(cls, v):
        if v is not None:
            try:
                from datetime import datetime
                # Validar formato HH:MM
                datetime.strptime(v, '%H:%M')
            except ValueError:
                raise ValueError('Formato de horário inválido. Use HH:MM')
        return v

    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
            if v not in valid_statuses:
                raise ValueError(f'Status inválido. Use: {", ".join(valid_statuses)}')
        return v

    class Config:
        arbitrary_types_allowed = True
