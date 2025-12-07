# /home/admin-lan/saas/Agendame/app/schemas/agendame_custormers.py
from pydantic import BaseModel, Field, validator
from typing import Optional
import re

class AgendameService(BaseModel):
    """Schema para dados do cliente via link de agendamento"""

    full_name: str = Field(..., min_length=3, max_length=200,
                          description="Nome completo do cliente")

    phone: str = Field(..., min_length=10, max_length=20,
                      description="Telefone do cliente (com DDD)")

    service_id: Optional[int] = Field(None,
                                     description="ID do serviço desejado (opcional)")

    preferred_time: Optional[str] = Field(None,
                                         description="Horário preferido no formato HH:MM (opcional)")

    total_appointments: Optional[int] = Field(0,
                                            description="Total de agendamentos anteriores (opcional)")

    notes: Optional[str] = Field(None,
                                max_length=500,
                                description="Observações adicionais (opcional)")

    @validator('phone')
    def validate_phone(cls, v):
        """Valida e formata o número de telefone"""
        # Remove todos os caracteres não numéricos
        digits = re.sub(r'\D', '', v)

        if len(digits) < 10 or len(digits) > 11:
            raise ValueError('Telefone inválido. Deve ter 10 ou 11 dígitos (com DDD)')

        return digits

    @validator('preferred_time')
    def validate_time_format(cls, v):
        """Valida o formato do horário"""
        if v is None:
            return v

        import re
        time_pattern = re.compile(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')

        if not time_pattern.match(v):
            raise ValueError('Horário inválido. Use o formato HH:MM (24h)')

        return v

    class Config:
        schema_extra = {
            "example": {
                "full_name": "João da Silva",
                "phone": "11999999999",
                "service_id": 1,
                "preferred_time": "14:00",
                "total_appointments": 0,
                "notes": "Corte social"
            }
        }
