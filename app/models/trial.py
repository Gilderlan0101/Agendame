# trial.py
from datetime import datetime

from tortoise import fields, models


class TrialAccount(models.Model):
    """
    TrialAccount: Responsavel por amazenar
    os clientes que estão no teste de 7 dias
    """

    id = fields.IntField(pk=True)
    username = fields.CharField(max_length=120)
    email = fields.CharField(max_length=120, unique=True)
    password = fields.CharField(max_length=100)

    # Informações do salão
    business_name = fields.CharField(max_length=200)
    business_type = fields.CharField(max_length=100)
    business_slug = fields.CharField(max_length=100, unique=True, null=True)
    phone = fields.CharField(max_length=20)
    whatsapp = fields.CharField(max_length=20, null=True)

    # Configurações do salão
    business_hours = fields.JSONField(
        default={
            'monday': {'open': '09:00', 'close': '18:00'},
            'tuesday': {'open': '09:00', 'close': '18:00'},
            'wednesday': {'open': '09:00', 'close': '18:00'},
            'thursday': {'open': '09:00', 'close': '18:00'},
            'friday': {'open': '09:00', 'close': '18:00'},
            'saturday': {'open': '09:00', 'close': '17:00'},
            'sunday': {'open': None, 'close': None},
        }
    )

    subscription_active = fields.BooleanField(default=True)
    subscription_start = fields.DatetimeField(null=True)
    subscription_end = fields.DatetimeField(null=True)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:   # type: ignore
        table = 'trial'
