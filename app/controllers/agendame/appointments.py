import json
import urllib.parse
from dataclasses import field
from datetime import date, datetime, timedelta, time as dt_time
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Union

from fastapi import HTTPException, status
from tortoise.expressions import Q

from app.controllers.agendame.services import Services
from app.controllers.company.company_data import MyCompany
from app.models.trial import TrialAccount
from app.models.user import (
    Appointment,
    BusinessSettings,
    Client,
    Service,
    User,
)
from app.schemas.agendame.upgrade_service import UpdateServices


class Appointments:
    """Camada de domínio para gerenciamento de agendamentos."""

    def __init__(
        self,
        target_company_id: Optional[int] = None,
        target_company_name: Optional[str] = None,
        target_company_business_slug: Optional[str] = None,
    ) -> None:
        self.target_company_id = target_company_id
        self.target_company_name = target_company_name
        self.target_company_business_slug = target_company_business_slug
        self.services_domain = Services(
            target_company_id=target_company_id,
            target_company_name=target_company_name,
            target_company_business_slug=target_company_business_slug,
        )
        self._company_type = None  # 'user' ou 'trial'

    async def _get_company_by_identifier(
        self, identifier: str, search_type: str = 'auto'
    ) -> tuple[MyCompany, bool]:
        """
        Busca empresa por identificador e retorna (company, is_trial)
        """
        user = None
        is_trial = False

        # Define os campos a buscar baseado no search_type
        if search_type == 'slug':
            fields = ['business_slug']
        elif search_type == 'username':
            fields = ['username']
        elif search_type == 'name':
            fields = ['business_name']
        else:  # 'auto'
            fields = ['business_slug', 'username', 'business_name']

        # Busca na tabela User
        for field_name in fields:
            user = await User.filter(**{field_name: identifier}).first()
            if user:
                is_trial = False
                break

        # Se não encontrou em User, busca na TrialAccount
        if not user:
            for field_name in fields:
                user = await TrialAccount.filter(**{field_name: identifier}).first()
                if user:
                    is_trial = True
                    break

        if user:
            company = await MyCompany.create(company_id=user.id)
            self._company_type = 'trial' if is_trial else 'user'
            return company, is_trial

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Empresa não encontrada: {identifier}',
        )

    async def _get_company(self) -> tuple[MyCompany, bool]:
        """Carrega a empresa alvo e determina se é trial."""
        try:
            if self.target_company_id:
                # Determinar se é User ou TrialAccount
                user = await User.filter(id=self.target_company_id).first()
                if user:
                    self._company_type = 'user'
                    return await MyCompany.create(company_id=self.target_company_id), False

                trial = await TrialAccount.filter(id=self.target_company_id).first()
                if trial:
                    self._company_type = 'trial'
                    return await MyCompany.create(company_id=self.target_company_id), True

            raise ValueError('Identificador de empresa não fornecido')
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Empresa não encontrada',
            )

    async def _get_business_hours(self, company_id: int, is_trial: bool) -> Dict:
        """Obtém horários de funcionamento da empresa."""
        if is_trial:
            trial = await TrialAccount.get_or_none(id=company_id)
            if trial:
                return trial.business_hours
        else:
            user = await User.get_or_none(id=company_id)
            if user:
                return user.business_hours

        # Retorna padrão se não encontrar
        return {
            'monday': {'open': '09:00', 'close': '18:00'},
            'tuesday': {'open': '09:00', 'close': '18:00'},
            'wednesday': {'open': '09:00', 'close': '18:00'},
            'thursday': {'open': '09:00', 'close': '18:00'},
            'friday': {'open': '09:00', 'close': '18:00'},
            'saturday': {'open': '09:00', 'close': '17:00'},
            'sunday': {'open': None, 'close': None},
        }

    async def _get_business_settings(self, company_id: int) -> Dict:
        """Obtém configurações da empresa."""
        settings = await BusinessSettings.filter(
            Q(user_id=company_id) | Q(trial_account_id=company_id)
        ).first()

        if settings:
            return {
                'time_slot_duration': settings.time_slot_duration or 60,
                'max_daily_appointments': settings.max_daily_appointments or 20,
                'min_booking_hours': settings.min_booking_hours or 1,
                'max_booking_days': settings.max_booking_days or 30,
            }
        return {
            'time_slot_duration': 60,
            'max_daily_appointments': 20,
            'min_booking_hours': 1,
            'max_booking_days': 30,
        }

    def _generate_time_slots(
        self,
        open_time: str,
        close_time: str,
        slot_duration: int,
        target_date: Optional[date] = None,
        min_booking_hours: int = 1,
    ) -> List[str]:
        """Gera todos os slots de tempo possíveis, filtrando horários passados."""
        if not open_time or not close_time:
            return []

        slots = []
        try:
            current_slot = datetime.strptime(open_time, '%H:%M')
            end = datetime.strptime(close_time, '%H:%M')

            min_time = None
            if target_date and target_date == date.today():
                now = datetime.now()
                min_datetime = now + timedelta(hours=min_booking_hours)
                min_time = min_datetime.time()
                min_datetime_obj = datetime.combine(date.today(), min_time)
                end_datetime_obj = datetime.combine(date.today(), end.time())
                if min_datetime_obj >= end_datetime_obj:
                    return []

            while current_slot + timedelta(minutes=slot_duration) <= end:
                slot_time_str = current_slot.strftime('%H:%M')
                slot_time_obj = current_slot.time()

                if target_date == date.today() and min_time:
                    if slot_time_obj >= min_time:
                        slots.append(slot_time_str)
                else:
                    slots.append(slot_time_str)

                current_slot += timedelta(minutes=slot_duration)

        except ValueError:
            return []

        return slots

    def _filter_available_slots(
        self,
        all_slots: List[str],
        booked_slots: List[str],
        service_duration: int,
        max_daily: int,
    ) -> List[str]:
        """Filtra slots disponíveis considerando duração do serviço."""
        if len(booked_slots) >= max_daily:
            return []

        available = []
        for slot in all_slots:
            if slot not in booked_slots:
                available.append(slot)

        return available

    async def get_available_times(
        self,
        service_id: int,
        target_date: date,
        identifier: Optional[str] = None,
        search_type: str = 'auto',
    ) -> Dict[str, Any]:
        """
        Retorna horários disponíveis para um serviço em uma data específica.
        """
        if identifier:
            company, is_trial = await self._get_company_by_identifier(identifier, search_type)
        else:
            company, is_trial = await self._get_company()

        company_id = company.company_id()

        # Busca serviço considerando tanto user_id quanto trial_account_id
        service = await Service.filter(
            Q(user_id=company_id) | Q(trial_account_id=company_id),
            id=service_id,
            is_active=True,
        ).first()

        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado',
            )

        settings = await self._get_business_settings(company_id)
        business_hours = await self._get_business_hours(company_id, is_trial)

        # Converter nome do dia para inglês (correspondência com o JSON)
        weekday_map = {
            0: 'monday',
            1: 'tuesday',
            2: 'wednesday',
            3: 'thursday',
            4: 'friday',
            5: 'saturday',
            6: 'sunday'
        }
        day_name = weekday_map[target_date.weekday()]

        if (
            day_name not in business_hours
            or not business_hours[day_name]['open']
            or business_hours[day_name]['open'] is None
        ):
            return {
                'date': target_date.isoformat(),
                'service': service.name,
                'available_times': [],
                'message': 'Empresa não funciona neste dia',
            }

        # Obter min_booking_hours das configurações
        min_booking_hours = settings.get('min_booking_hours', 1)

        # Gerar slots de tempo
        all_time_slots = self._generate_time_slots(
            business_hours[day_name]['open'],
            business_hours[day_name]['close'],
            settings['time_slot_duration'],
            target_date,
            min_booking_hours,
        )

        booked_times = await self._get_booked_times(company_id, target_date, service_id)

        available_times = self._filter_available_slots(
            all_time_slots,
            booked_times,
            service.duration_minutes,
            settings['max_daily_appointments'],
        )

        return {
            'date': target_date.isoformat(),
            'service': {
                'id': service.id,
                'name': service.name,
                'duration_minutes': service.duration_minutes,
                'price': str(service.price),
            },
            'available_times': available_times,
            'business_hours': business_hours[day_name],
            'total_available': len(available_times),
            'is_today': target_date == date.today(),
            'min_booking_hours': min_booking_hours,
        }

    async def _get_booked_times(
        self, company_id: int, target_date: date, service_id: int
    ) -> List[str]:
        """Obtém horários já agendados."""
        appointments = await Appointment.filter(
            Q(user_id=company_id) | Q(trial_account_id=company_id),
            appointment_date=target_date,
            service_id=service_id,
            status__in=['scheduled', 'confirmed'],
        ).values('appointment_time')

        return [appt['appointment_time'] for appt in appointments]

    async def create_appointment(
        self,
        service_id: int,
        appointment_date: date,
        appointment_time: str,
        client_name: str,
        client_phone: str,
        identifier: Optional[str] = None,
        search_type: str = 'auto',
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cria um novo agendamento.
        """
        print(f"DEBUG create_appointment: Iniciando criação")
        print(f"  service_id: {service_id}")
        print(f"  date: {appointment_date}")
        print(f"  time: {appointment_time}")
        print(f"  client: {client_name}")
        print(f"  phone: {client_phone}")
        print(f"  identifier: {identifier}")
        print(f"  search_type: {search_type}")

        if identifier:
            company, is_trial = await self._get_company_by_identifier(identifier, search_type)
        else:
            company, is_trial = await self._get_company()

        company_id = company.company_id()
        print(f"DEBUG: Empresa ID: {company_id}, Is Trial: {is_trial}")

        # Busca serviço considerando ambos os tipos
        service = await Service.filter(
            Q(user_id=company_id) | Q(trial_account_id=company_id),
            id=service_id,
            is_active=True,
        ).first()

        if not service:
            print(f"DEBUG: Serviço não encontrado - ID: {service_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado ou indisponível',
            )

        print(f"DEBUG: Serviço encontrado - {service.name}")

        # Buscar ou criar cliente
        client = await self._get_or_create_client(
            company_id, is_trial, client_name, client_phone
        )

        print(f"DEBUG: Cliente processado - ID: {client.id if client else 'Novo'}")

        # Preparar dados do agendamento baseado no tipo
        appointment_data = {
            'service_id': service_id,
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
            'client_name': client_name,
            'client_phone': client_phone,
            'price': service.price,
            'status': 'scheduled',
            'notes': notes,
            'whatsapp_sent': False,
            'client_id': client.id if client else None,
        }

        # Adicionar relação correta
        if is_trial:
            appointment_data['trial_account_id'] = company_id
            appointment_data['user_id'] = None
            print(f"DEBUG: Usando trial_account_id: {company_id}")
        else:
            appointment_data['user_id'] = company_id
            appointment_data['trial_account_id'] = None
            print(f"DEBUG: Usando user_id: {company_id}")

        try:
            appointment = await Appointment.create(**appointment_data)
            print(f"DEBUG: Agendamento criado - ID: {appointment.id}")
        except Exception as e:
            print(f"DEBUG: Erro ao criar agendamento: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f'Erro ao criar agendamento: {str(e)}',
            )

        if client:
            client.total_appointments += 1
            await client.save()

        # Buscar informações da empresa
        company_info = None
        if is_trial:
            company_info = await TrialAccount.get_or_none(id=company_id)
        else:
            company_info = await User.get_or_none(id=company_id)

        return {
            'success': True,
            'appointment_id': appointment.id,
            'confirmation': {
                'company': {
                    'name': company_info.business_name if company_info else 'Salão',
                    'phone': company_info.phone if company_info else '',
                    'whatsapp': company_info.whatsapp if company_info else '',
                },
                'client': {'name': client_name, 'phone': client_phone},
                'service': {
                    'name': service.name,
                    'duration': service.duration_minutes,
                    'price': str(service.price),
                },
                'appointment': {
                    'date': appointment_date.isoformat(),
                    'time': appointment_time,
                    'confirmation_code': f'AGD{appointment.id:06d}',
                },
                'message': f"✅ Agendamento confirmado! Seu horário para {service.name} está marcado para {appointment_date.strftime('%d/%m/%Y')} às {appointment_time}.",
            },
        }

    async def _get_or_create_client(
        self, company_id: int, is_trial: bool, name: str, phone: str
    ) -> Optional[Client]:
        """Busca ou cria um cliente."""
        print(f"DEBUG _get_or_create_client: Buscando cliente")
        print(f"  company_id: {company_id}, is_trial: {is_trial}")
        print(f"  name: {name}, phone: {phone}")

        # Buscar cliente considerando ambos os tipos
        query = Q(phone=phone)
        if is_trial:
            query &= Q(trial_account_id=company_id)
        else:
            query &= Q(user_id=company_id)

        client = await Client.filter(query).first()

        if client:
            print(f"DEBUG: Cliente existente encontrado - ID: {client.id}")
            if client.full_name != name:
                client.full_name = name
                await client.save()
            return client

        print(f"DEBUG: Criando novo cliente")
        # Preparar dados do cliente baseado no tipo
        client_data = {
            'full_name': name.strip(),
            'phone': phone.strip(),
            'total_appointments': 0,
            'is_active': True,
        }

        if is_trial:
            client_data['trial_account_id'] = company_id
            client_data['user_id'] = None
            print(f"DEBUG: Cliente para TrialAccount")
        else:
            client_data['user_id'] = company_id
            client_data['trial_account_id'] = None
            print(f"DEBUG: Cliente para User")

        try:
            client = await Client.create(**client_data)
            print(f"DEBUG: Cliente criado - ID: {client.id}")
            return client
        except Exception as e:
            print(f"DEBUG: Erro ao criar cliente: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    async def get_company_appointments(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Lista agendamentos da empresa (uso interno).
        """
        company, is_trial = await self._get_company()
        company_id = company.company_id()

        # Filtra por user_id OU trial_account_id baseado no tipo
        if is_trial:
            query = Appointment.filter(trial_account_id=company_id)
        else:
            query = Appointment.filter(user_id=company_id)

        if start_date:
            query = query.filter(appointment_date__gte=start_date)

        if end_date:
            query = query.filter(appointment_date__lte=end_date)

        if status:
            query = query.filter(status=status)

        appointments = (
            await query.order_by('appointment_date', 'appointment_time')
            .select_related('service', 'client')
            .all()
        )

        result = []
        for apt in appointments:
            result.append(
                {
                    'id': apt.id,
                    'date': apt.appointment_date.isoformat(),
                    'time': apt.appointment_time,
                    'client': {
                        'name': apt.client_name,
                        'phone': apt.client_phone,
                        'client_id': apt.client_id,
                    },
                    'service': {
                        'id': apt.service_id,
                        'name': apt.service.name if apt.service else 'Serviço não encontrado',
                        'price': str(apt.price),
                    },
                    'status': apt.status,
                    'notes': apt.notes,
                    'created_at': apt.created_at.isoformat() if apt.created_at else None,
                }
            )

        return result

    async def update_one_appointments(self, target_appointment: int, schema):
        """Atualizar informações de um agendamento já cadastrado."""
        company, is_trial = await self._get_company()
        company_id = company.company_id()

        # Buscar o agendamento considerando ambos os tipos
        if is_trial:
            search_appointment = await Appointment.filter(
                trial_account_id=company_id,
                id=target_appointment,
            ).first()
        else:
            search_appointment = await Appointment.filter(
                user_id=company_id,
                id=target_appointment,
            ).first()

        if not search_appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Agendamento não encontrado',
            )

        try:
            update_data = {}

            # Verificar e preparar dados para atualização
            if schema.client_name is not None:
                update_data['client_name'] = schema.client_name

            if schema.client_phone is not None:
                update_data['client_phone'] = schema.client_phone

            if schema.service_id is not None:
                # Verificar se o serviço pertence à empresa
                service = await Service.filter(
                    Q(user_id=company_id) | Q(trial_account_id=company_id),
                    id=schema.service_id,
                    is_active=True,
                ).first()
                if not service:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='Serviço não encontrado ou indisponível',
                    )
                update_data['service_id'] = schema.service_id
                update_data['price'] = service.price

            if schema.appointment_date is not None:
                update_data['appointment_date'] = schema.appointment_date

            if schema.appointment_time is not None:
                update_data['appointment_time'] = schema.appointment_time

            if schema.price is not None:
                try:
                    update_data['price'] = Decimal(str(schema.price))
                except (InvalidOperation, ValueError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='Formato inválido para preço',
                    )

            if schema.status is not None:
                update_data['status'] = schema.status

            if schema.notes is not None:
                update_data['notes'] = schema.notes

            # Validar disponibilidade se data/hora for alterada
            if schema.appointment_date or schema.appointment_time:
                appointment_date = (
                    schema.appointment_date or search_appointment.appointment_date
                )
                appointment_time = (
                    schema.appointment_time or search_appointment.appointment_time
                )
                service_id = schema.service_id or search_appointment.service_id

                # Verificar se o novo horário está disponível
                existing_query = Appointment.filter(
                    Q(user_id=company_id) | Q(trial_account_id=company_id),
                    appointment_date=appointment_date,
                    appointment_time=appointment_time,
                    service_id=service_id,
                    status__in=['scheduled', 'confirmed'],
                ).exclude(id=target_appointment)

                existing = await existing_query.first()

                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='Horário já ocupado por outro agendamento',
                    )

            # Atualizar o agendamento
            update_data['updated_at'] = datetime.utcnow()
            await Appointment.filter(id=target_appointment).update(**update_data)

            # Buscar o agendamento atualizado
            updated_appointment = (
                await Appointment.filter(id=target_appointment)
                .select_related('service', 'client')
                .first()
            )

            # Atualizar cliente se telefone foi alterado
            if schema.client_phone is not None and updated_appointment.client_id:
                client = await Client.filter(id=updated_appointment.client_id).first()
                if client and client.phone != schema.client_phone:
                    # Buscar cliente existente com novo telefone
                    client_query = Q(phone=schema.client_phone)
                    if is_trial:
                        client_query &= Q(trial_account_id=company_id)
                    else:
                        client_query &= Q(user_id=company_id)

                    new_client = await Client.filter(client_query).first()

                    if new_client:
                        await Appointment.filter(id=target_appointment).update(
                            client_id=new_client.id
                        )
                        if schema.client_name:
                            new_client.full_name = schema.client_name
                            await new_client.save()
                    else:
                        # Criar novo cliente
                        new_client_data = {
                            'full_name': schema.client_name or search_appointment.client_name,
                            'phone': schema.client_phone,
                            'total_appointments': 1,
                            'is_active': True,
                        }

                        if is_trial:
                            new_client_data['trial_account_id'] = company_id
                            new_client_data['user_id'] = None
                        else:
                            new_client_data['user_id'] = company_id
                            new_client_data['trial_account_id'] = None

                        new_client = await Client.create(**new_client_data)
                        await Appointment.filter(id=target_appointment).update(
                            client_id=new_client.id
                        )

            return {
                'success': True,
                'message': 'Agendamento atualizado com sucesso',
                'appointment': {
                    'id': updated_appointment.id,
                    'client_name': updated_appointment.client_name,
                    'client_phone': updated_appointment.client_phone,
                    'service_id': updated_appointment.service_id,
                    'service_name': updated_appointment.service.name if updated_appointment.service else None,
                    'appointment_date': updated_appointment.appointment_date.isoformat(),
                    'appointment_time': updated_appointment.appointment_time,
                    'price': str(updated_appointment.price),
                    'status': updated_appointment.status,
                    'notes': updated_appointment.notes,
                },
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f'Erro ao atualizar agendamento: {str(e)}',
            )
