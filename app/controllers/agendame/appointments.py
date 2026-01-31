import json
import urllib.parse
from dataclasses import field
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Union
from fastapi import HTTPException, status

from app.models.user import (Appointment, BusinessSettings, Client, Service,
                             User)
from app.schemas.agendame.upgrade_service import UpdateServices

from app.controllers.company.company_data import MyCompany
from app.controllers.agendame.services import Services

class Appointments:
    """Camada de domínio para gerenciamento de agendamentos."""

    def __init__(
        self,
        target_company_id: Optional[int] = None,
        target_company_name: Optional[str] = None,
        target_company_business_slug: Optional[str] = None,
    ) -> None:
        self.services_domain = Services(
            target_company_id=target_company_id,
            target_company_name=target_company_name,
            target_company_business_slug=target_company_business_slug,
        )

    async def _get_company(self) -> MyCompany:
        """Reutiliza o método da classe Services."""
        return await self.services_domain._get_company()

    async def _get_business_settings(self, company_id: int) -> Dict:
        """Obtém configurações da empresa."""
        settings = await BusinessSettings.filter(user_id=company_id).first()
        if settings:
            return {
                'time_slot_duration': settings.time_slot_duration or 60,
                'max_daily_appointments': settings.max_daily_appointments
                or 20,
                'min_booking_hours': settings.min_booking_hours or 1,
                'max_booking_days': settings.max_booking_days or 30,
            }
        return {
            'time_slot_duration': 60,
            'max_daily_appointments': 20,
            'min_booking_hours': 1,
            'max_booking_days': 30,
        }

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
            company = await self.services_domain._get_company_by_identifier(
                identifier, search_type
            )
        else:
            company = await self._get_company()

        company_id = company.company_id()
        service = await Service.filter(
            id=service_id, user_id=company_id
        ).first()
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado',
            )

        settings = await self._get_business_settings(company_id)
        user = await User.filter(id=company_id).first()
        business_hours = user.business_hours if user else None

        day_name = target_date.strftime('%A').lower()
        if (
            day_name not in business_hours # type:ignore
            or not business_hours[day_name]['open'] # type:ignore
        ):
            return {
                'date': target_date.isoformat(),
                'service': service.name,
                'available_times': [],
                'message': 'Empresa não funciona neste dia',
            }

        all_time_slots = self._generate_time_slots(
            business_hours[day_name]['open'],# type:ignore
            business_hours[day_name]['close'],# type:ignore
            settings['time_slot_duration'],
        )

        booked_times = await self._get_booked_times(
            company_id, target_date, service_id
        )
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
            'business_hours': business_hours[day_name] if business_hours[day_name] else "N/A" ,# type:ignore
            'total_available': len(available_times),
        }

    def _generate_time_slots(
        self, open_time: str, close_time: str, slot_duration: int
    ) -> List[str]:
        """Gera todos os slots de tempo possíveis."""
        if not open_time or not close_time:
            return []

        slots = []
        current = datetime.strptime(open_time, '%H:%M')
        end = datetime.strptime(close_time, '%H:%M')

        while current + timedelta(minutes=slot_duration) <= end:
            slots.append(current.strftime('%H:%M'))
            current += timedelta(minutes=slot_duration)

        return slots

    async def _get_booked_times(
        self, company_id: int, target_date: date, service_id: int
    ) -> List[str]:
        """Obtém horários já agendados."""
        appointments = await Appointment.filter(
            user_id=company_id,
            appointment_date=target_date,
            service_id=service_id,
            status__in=['scheduled', 'confirmed'],
        ).values('appointment_time')

        return [appt['appointment_time'] for appt in appointments]

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
            slot_time = datetime.strptime(slot, '%H:%M')

            if slot not in booked_slots:
                is_available = True
                for booked in booked_slots:
                    booked_time = datetime.strptime(booked, '%H:%M')
                    time_diff = abs(
                        (slot_time - booked_time).total_seconds() / 60
                    )

                    if time_diff < service_duration:
                        is_available = False
                        break

                if is_available:
                    available.append(slot)

        return available

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
        if identifier:
            company = await self.services_domain._get_company_by_identifier(
                identifier, search_type
            )
        else:
            company = await self._get_company()

        company_id = company.company_id()
        service = await Service.filter(
            id=service_id, user_id=company_id, is_active=True
        ).first()

        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado ou indisponível',
            )

        available_times = await self.get_available_times(
            service_id, appointment_date, identifier, search_type
        )

        if appointment_time not in available_times['available_times']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Horário não disponível',
            )

        client = await self._get_or_create_client(
            company_id, client_name, client_phone
        )

        appointment = await Appointment.create(
            user_id=company_id,
            client_id=client.id if client else None,
            service_id=service_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            client_name=client_name,
            client_phone=client_phone,
            price=service.price,
            status='scheduled',
            notes=notes,
            whatsapp_sent=False,
        )

        if client:
            client.total_appointments += 1
            await client.save()

        company_info = await User.filter(id=company_id).first()

        return {
            'success': True,
            'appointment_id': appointment.id,
            'confirmation': {
                'company': {
                    'name': company_info.business_name
                    if company_info
                    else 'Salão',
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
        self, company_id: int, name: str, phone: str
    ):
        """Busca ou cria um cliente."""
        client = await Client.filter(user_id=company_id, phone=phone).first()

        if client:
            if client.full_name != name:
                client.full_name = name
                await client.save()
            return client

        client = await Client.create(
            user_id=company_id,
            full_name=name,
            phone=phone,
            total_appointments=0,
            is_active=True,
        )

        return client

    async def get_company_appointments(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Lista agendamentos da empresa (uso interno).
        """
        company = await self._get_company()
        company_id = company.company_id()

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
                        'client_id': apt.client_id,# type:ignore
                    },
                    'service': {
                        'id': apt.service_id,# type:ignore
                        'name': apt.service.name
                        if apt.service
                        else 'Serviço não encontrado',
                        'price': str(apt.price),
                    },
                    'status': apt.status,
                    'notes': apt.notes,
                    'created_at': apt.created_at.isoformat()
                    if apt.created_at
                    else None,
                }
            )

        return result


    async def update_one_appointments(self, target_appointment: int, schema):
        """Atualizar informações de um agendamento já cadastrado."""

        company_data = await self._get_company()
        company_id = company_data.company_id()

        # Buscar o agendamento com status 'scheduled' (Agendado)
        search_appointment = await Appointment.filter(
            user_id=company_id,
            id=target_appointment,

        ).first()

        if not search_appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agendamento não encontrado ou status não é 'Agendado'"
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
                    id=schema.service_id,
                    user_id=company_id,
                    is_active=True
                ).first()
                if not service:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Serviço não encontrado ou indisponível"
                    )
                update_data['service_id'] = schema.service_id
                # Atualizar o preço se o serviço for alterado
                update_data['price'] = service.price

            if schema.appointment_date is not None:
                update_data['appointment_date'] = schema.appointment_date

            if schema.appointment_time is not None:
                update_data['appointment_time'] = schema.appointment_time

            if schema.price is not None:
                update_data['price'] = schema.price

            if schema.status is not None:
                update_data['status'] = schema.status

            if schema.notes is not None:
                update_data['notes'] = schema.notes

            # Validar disponibilidade se data/hora for alterada
            if schema.appointment_date or schema.appointment_time:
                appointment_date = schema.appointment_date or search_appointment.appointment_date
                appointment_time = schema.appointment_time or search_appointment.appointment_time
                service_id = schema.service_id or search_appointment.service_id # type: ignore

                # Verificar se o novo horário está disponível (exceto para o próprio agendamento)
                existing = await Appointment.filter(
                    user_id=company_id,
                    appointment_date=appointment_date,
                    appointment_time=appointment_time,
                    service_id=service_id,
                    status__in=['scheduled', 'confirmed']
                ).exclude(id=target_appointment).first()

                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Horário já ocupado por outro agendamento"
                    )

            # Atualizar o agendamento
            await Appointment.filter(id=target_appointment).update(
                **update_data,
                updated_at=datetime.utcnow()
            )

            # Buscar o agendamento atualizado
            updated_appointment = await Appointment.filter(id=target_appointment)\
                .select_related('service', 'client')\
                .first()

            # Atualizar cliente se telefone foi alterado
            if schema.client_phone is not None and updated_appointment.client_id: # type: ignore
                client = await Client.filter(id=updated_appointment.client_id).first() # type: ignore
                if client and client.phone != schema.client_phone:
                    # Criar novo cliente ou atualizar existente
                    new_client = await Client.filter(
                        user_id=company_id,
                        phone=schema.client_phone
                    ).first()

                    if new_client:
                        # Atualizar agendamento com novo cliente
                        await Appointment.filter(id=target_appointment)\
                            .update(client_id=new_client.id)
                        # Atualizar nome se fornecido
                        if schema.client_name:
                            new_client.full_name = schema.client_name
                            await new_client.save()
                    else:
                        # Criar novo cliente
                        new_client = await Client.create(
                            user_id=company_id,
                            full_name=schema.client_name or search_appointment.client_name,
                            phone=schema.client_phone,
                            total_appointments=1,
                            is_active=True
                        )
                        await Appointment.filter(id=target_appointment)\
                            .update(client_id=new_client.id)

            return {
                'success': True,
                'message': 'Agendamento atualizado com sucesso',
                'appointment': {
                    'id': updated_appointment.id,
                    'client_name': updated_appointment.client_name, # type: ignore
                    'client_phone': updated_appointment.client_phone, # type: ignore
                    'service_id': updated_appointment.service_id, # type: ignore
                    'service_name': updated_appointment.service.name if updated_appointment.service else None, # type: ignore
                    'appointment_date': updated_appointment.appointment_date, # type: ignore
                    'appointment_time': updated_appointment.appointment_time, # type: ignore
                    'price': str(updated_appointment.price), # type: ignore
                    'status': updated_appointment.status, # type: ignore
                    'notes': updated_appointment.notes # type: ignore
                }
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao atualizar agendamento: {str(e)}"
            )
