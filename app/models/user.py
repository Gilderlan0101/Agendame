# updated_models.py
"""
Modelos atualizados com suporte a TrialAccount.
Copie e cole no seu arquivo models.py original.
"""

from datetime import datetime

from tortoise import fields, models


class User(models.Model):
    """Modelo para usuários (proprietários de salões)"""

    id = fields.IntField(pk=True)
    username = fields.CharField(max_length=120)
    email = fields.CharField(max_length=120, unique=True)
    password = fields.CharField(max_length=100)

    business_name = fields.CharField(max_length=200)
    business_type = fields.CharField(max_length=100)
    business_slug = fields.CharField(max_length=100, unique=True, null=True)
    phone = fields.CharField(max_length=20)
    whatsapp = fields.CharField(max_length=20, null=True)

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

    class Meta:
        table = 'users'

    def __str__(self):
        return f'User: {self.business_name} ({self.email})'


class Client(models.Model):
    """Modelo para clientes dos salões"""

    id = fields.IntField(pk=True)

    # Duas relações possíveis
    user = fields.ForeignKeyField(
        'models.User', related_name='clients', null=True
    )

    trial_account = fields.ForeignKeyField(
        'models.TrialAccount', related_name='clients', null=True
    )

    full_name = fields.CharField(max_length=200)
    phone = fields.CharField(max_length=20)
    total_appointments = fields.IntField(default=0)
    is_active = fields.BooleanField(default=True)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = 'clients'
        indexes = [('user_id', 'phone'), ('trial_account_id', 'phone')]

    def __str__(self):
        return f'Client: {self.full_name} ({self.phone})'


class Service(models.Model):
    """Modelo para serviços oferecidos pelos salões"""

    id = fields.IntField(pk=True)

    # Duas relações possíveis
    user = fields.ForeignKeyField(
        'models.User', related_name='services', null=True
    )

    trial_account = fields.ForeignKeyField(
        'models.TrialAccount', related_name='services', null=True
    )

    name = fields.CharField(max_length=200)
    description = fields.TextField(null=True)
    price = fields.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = fields.IntField(default=60)

    is_active = fields.BooleanField(default=True)
    order = fields.IntField(default=0)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = 'services'
        indexes = [('user_id', 'is_active'), ('trial_account_id', 'is_active')]

    def __str__(self):
        return f'Service: {self.name} - R${self.price}'


class Appointment(models.Model):
    """Modelo para agendamentos"""

    STATUS_CHOICES = (
        ('scheduled', 'Agendado'),
        ('confirmed', 'Confirmado'),
        ('completed', 'Concluído'),
        ('cancelled', 'Cancelado'),
        ('no_show', 'Não Compareceu'),
    )

    id = fields.IntField(pk=True)

    # Duas relações possíveis para o proprietário
    user = fields.ForeignKeyField(
        'models.User', related_name='appointments', null=True
    )

    trial_account = fields.ForeignKeyField(
        'models.TrialAccount', related_name='appointments', null=True
    )

    # Cliente e serviço (já suportam trial via Client e Service)
    client = fields.ForeignKeyField(
        'models.Client', related_name='appointments', null=True
    )
    service = fields.ForeignKeyField(
        'models.Service', related_name='appointments'
    )

    appointment_date = fields.DateField()
    appointment_time = fields.CharField(max_length=10)
    client_name = fields.CharField(max_length=200)
    client_phone = fields.CharField(max_length=20)

    status = fields.CharField(
        max_length=20, choices=STATUS_CHOICES, default='scheduled'
    )
    price = fields.DecimalField(max_digits=10, decimal_places=2)

    whatsapp_sent = fields.BooleanField(default=False)
    whatsapp_message_id = fields.CharField(max_length=100, null=True)
    notes = fields.TextField(null=True)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = 'appointments'
        indexes = [
            ('user_id', 'appointment_date', 'status'),
            ('trial_account_id', 'appointment_date', 'status'),
            ('user_id', 'client_phone'),
            ('trial_account_id', 'client_phone'),
            ('status', 'appointment_date'),
        ]

    def __str__(self):
        return f'Appointment: {self.client_name} - {self.appointment_date} {self.appointment_time}'


class BusinessSettings(models.Model):
    """Configurações específicas de cada salão"""

    id = fields.IntField(pk=True)

    # Duas relações possíveis (OneToOne para cada)
    user = fields.OneToOneField(
        'models.User', related_name='settings', null=True
    )

    trial_account = fields.OneToOneField(
        'models.TrialAccount', related_name='settings', null=True
    )

    whatsapp_message_template = fields.TextField(
        default='Olá {client_name}! Seu horário no salão está chegando! '
        'Você já pode vir para o seu {service_name}. Estamos te esperando!'
    )

    time_slot_duration = fields.IntField(default=60)
    max_daily_appointments = fields.IntField(default=20)
    min_booking_hours = fields.IntField(default=1)
    max_booking_days = fields.IntField(default=30)

    send_reminder_hours = fields.IntField(default=2)
    send_welcome_message = fields.BooleanField(default=True)
    send_confirmation_message = fields.BooleanField(default=True)

    custom_domain = fields.CharField(max_length=100, null=True)
    custom_logo_url = fields.CharField(max_length=500, null=True)

    accept_online_payment = fields.BooleanField(default=False)
    payment_methods = fields.JSONField(default=['dinheiro', 'cartão', 'pix'])

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = 'business_settings'

    def __str__(self):
        owner = self.user or self.trial_account
        return f'Settings for: {owner.business_name if owner else "Unknown"}'
