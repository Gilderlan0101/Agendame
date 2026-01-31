from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.expressions import Q

from app.controllers.agendame.appointments import Appointments
from app.models.user import Appointment, Client, Service, User
from app.schemas.agendame.appointments import (AppointmentCreatedResponse,
                                               AppointmentsFilter,
                                               AppointmentsListResponse,
                                               CreateAppointmentInternal,
                                               UpdateAppointmentSchema)
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Agendame - Agendamentos'])


@router.post('/agendame/appointments', response_model=AppointmentsListResponse)
async def get_company_appointments(
    filter_data: AppointmentsFilter,
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Busca agendamentos da empresa do usuário logado.
    Pode filtrar por data, status, cliente ou serviço.

    Exemplo de body:
    ```json
    {
        "start_date": "2024-01-15",
        "end_date": "2024-01-20",
        "status": "scheduled",
        "offset": 0,
        "limit": 50
    }
    ```
    """
    try:
        # Construir query base
        query = Q(user_id=current_user.id)

        # Aplicar filtros de data
        if filter_data.start_date:
            query &= Q(appointment_date__gte=filter_data.start_date)

        if filter_data.end_date:
            query &= Q(appointment_date__lte=filter_data.end_date)

        # Aplicar filtro de status
        if filter_data.status:
            query &= Q(status=filter_data.status)

        # Aplicar filtro de cliente (busca por nome)
        if filter_data.client_name:
            query &= Q(client_name__icontains=filter_data.client_name)

        # Aplicar filtro de serviço
        if filter_data.service_id:
            query &= Q(service_id=filter_data.service_id)

        # Contar total (sem paginação)
        total = await Appointment.filter(query).count()

        # Buscar agendamentos com paginação e relacionamentos
        appointments = (
            await Appointment.filter(query)
            .select_related('service', 'client')
            .order_by('-appointment_date', '-appointment_time')
            .offset(filter_data.offset)
            .limit(filter_data.limit)
            .all()
        )

        # Formatar resposta
        appointments_list = []
        for apt in appointments:
            appointments_list.append(
                {
                    'id': apt.id,
                    'date': apt.appointment_date.isoformat()
                    if apt.appointment_date
                    else None,
                    'time': apt.appointment_time,
                    'client': {
                        'id': apt.client_id,
                        'name': apt.client_name,
                        'phone': apt.client_phone,
                        'client_id': apt.client_id,
                    },
                    'service': {
                        'id': apt.service_id,
                        'name': apt.service.name
                        if apt.service
                        else 'Serviço não encontrado',
                        'price': str(apt.price) if apt.price else '0.00',
                    },
                    'status': apt.status,
                    'notes': apt.notes,
                    'created_at': apt.created_at.isoformat()
                    if apt.created_at
                    else None,
                }
            )

        return {
            'appointments': appointments_list,
            'total': total,
            'offset': filter_data.offset,
            'limit': filter_data.limit,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao buscar agendamentos: {str(e)}',
        )


@router.get(
    '/agendame/appointments/today', response_model=AppointmentsListResponse
)
async def get_today_appointments(
    current_user: SystemUser = Depends(get_current_user),
    status_filter: Optional[str] = Query(
        None, description='Filtrar por status'
    ),
) -> Dict[str, Any]:
    """
    Busca agendamentos de hoje da empresa.
    """
    try:
        today = date.today()

        query = Q(user_id=current_user.id) & Q(appointment_date=today)

        if status_filter:
            query &= Q(status=status_filter)

        appointments = (
            await Appointment.filter(query)
            .select_related('service', 'client')
            .order_by('appointment_time')
            .all()
        )

        appointments_list = []
        for apt in appointments:
            appointments_list.append(
                {
                    'id': apt.id,
                    'date': apt.appointment_date.isoformat()
                    if apt.appointment_date
                    else None,
                    'time': apt.appointment_time,
                    'client': {
                        'id': apt.client_id,
                        'name': apt.client_name,
                        'phone': apt.client_phone,
                    },
                    'service': {
                        'id': apt.service_id,
                        'name': apt.service.name
                        if apt.service
                        else 'Serviço não encontrado',
                        'price': str(apt.price) if apt.price else '0.00',
                    },
                    'status': apt.status,
                    'notes': apt.notes,
                    'created_at': apt.created_at.isoformat()
                    if apt.created_at
                    else None,
                }
            )

        return {
            'appointments': appointments_list,
            'total': len(appointments_list),
            'offset': 0,
            'limit': len(appointments_list),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao buscar agendamentos de hoje: {str(e)}',
        )


@router.post(
    '/agendame/appointments/create', response_model=AppointmentCreatedResponse
)
async def create_appointment_internal(
    appointment_data: CreateAppointmentInternal,
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Cria um novo agendamento internamente (pelo painel da empresa).
    """
    try:
        # Verificar se o serviço existe e pertence à empresa
        service = await Service.filter(
            id=appointment_data.service_id,
            user_id=current_user.id,
            is_active=True,
        ).first()

        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado ou indisponível',
            )

        # Verificar se já existe cliente com este telefone
        client = await Client.filter(
            user_id=current_user.id, phone=appointment_data.client_phone
        ).first()

        # Se não existir, criar novo cliente
        if not client:
            client = await Client.create(
                user_id=current_user.id,
                full_name=appointment_data.client_name,
                phone=appointment_data.client_phone,
                total_appointments=1,
                is_active=True,
            )
        else:
            # Atualizar nome se necessário
            if client.full_name != appointment_data.client_name:
                client.full_name = appointment_data.client_name
                await client.save()

            # Incrementar contador de agendamentos
            client.total_appointments += 1
            await client.save()

        # Verificar disponibilidade do horário
        existing_appointment = await Appointment.filter(
            user_id=current_user.id,
            appointment_date=appointment_data.appointment_date,
            appointment_time=appointment_data.appointment_time,
            status__in=['scheduled', 'confirmed'],
        ).first()

        if existing_appointment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Horário já ocupado',
            )

        # Criar o agendamento
        appointment = await Appointment.create(
            user_id=current_user.id,
            client_id=client.id,
            service_id=service.id,
            appointment_date=appointment_data.appointment_date,
            appointment_time=appointment_data.appointment_time,
            client_name=appointment_data.client_name,
            client_phone=appointment_data.client_phone,
            price=service.price,
            status='scheduled',
            notes=appointment_data.notes,
            whatsapp_sent=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Buscar dados do usuário para resposta
        user = await User.filter(id=current_user.id).first()

        return {
            'id': appointment.id,
            'client_name': appointment.client_name,
            'client_phone': appointment.client_phone,
            'service_name': service.name,
            'appointment_date': appointment.appointment_date,
            'appointment_time': appointment.appointment_time,
            'price': service.price,
            'status': appointment.status,
            'confirmation_code': f'AGD{appointment.id:06d}',
            'message': (
                f'✅ Agendamento criado com sucesso!\n'
                f'Cliente: {appointment.client_name}\n'
                f'Serviço: {service.name}\n'
                f"Data: {appointment.appointment_date.strftime('%d/%m/%Y')} às {appointment.appointment_time}\n"
                f'Valor: R$ {service.price}'
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao criar agendamento: {str(e)}',
        )


@router.put('/agendame/appointments/{appointment_id}/status')
async def update_appointment_status(
    appointment_id: int,
    status: str = Query(..., description='Novo status do agendamento'),
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Atualiza o status de um agendamento.
    Status válidos: scheduled, confirmed, completed, cancelled, no_show
    """
    try:
        # Validar status
        valid_statuses = [
            'scheduled',
            'confirmed',
            'completed',
            'cancelled',
            'no_show',
        ]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status inválido. Use: {', '.join(valid_statuses)}",
            )

        # Buscar e atualizar agendamento
        updated = await Appointment.filter(
            id=appointment_id, user_id=current_user.id
        ).update(status=status, updated_at=datetime.utcnow())

        if updated == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Agendamento não encontrado',
            )

        return {
            'success': True,
            'message': f"Status do agendamento atualizado para '{status}'",
            'appointment_id': appointment_id,
            'status': status,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao atualizar status: {str(e)}',
        )


@router.delete('/agendame/appointments/{appointment_id}')
async def delete_appointment(
    appointment_id: int,
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Remove um agendamento.
    """
    try:
        deleted = await Appointment.filter(
            id=appointment_id, user_id=current_user.id
        ).delete()

        if deleted == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Agendamento não encontrado',
            )

        return {
            'success': True,
            'message': 'Agendamento removido com sucesso',
            'appointment_id': appointment_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao remover agendamento: {str(e)}',
        )


@router.put('/agendame/appointments/{appointment_id}')
async def update_appointment(
    appointment_id: int,
    update_data: UpdateAppointmentSchema,
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Atualiza um agendamento existente.
    Apenas agendamentos com status 'scheduled' podem ser atualizados.
    """
    try:
        appointments_domain = Appointments(target_company_id=current_user.id)

        result = await appointments_domain.update_one_appointments(
            target_appointment=appointment_id, schema=update_data
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao atualizar agendamento: {str(e)}',
        )
