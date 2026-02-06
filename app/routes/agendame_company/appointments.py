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
    """
    try:
        # Usar o controlador de Appointments
        appointments_domain = Appointments(target_company_id=current_user.id)

        # Usar o método da classe Appointments
        appointments_list = await appointments_domain.get_company_appointments(
            start_date=filter_data.start_date,
            end_date=filter_data.end_date,
            status=filter_data.status,
        )

        # Aplicar filtros adicionais que não estão no método da classe
        filtered_appointments = []
        for apt in appointments_list:
            # Filtro de cliente (busca por nome)
            if filter_data.client_name:
                if (
                    filter_data.client_name.lower()
                    not in apt['client']['name'].lower()
                ):
                    continue

            # Filtro de serviço
            if filter_data.service_id:
                if apt['service']['id'] != filter_data.service_id:
                    continue

            filtered_appointments.append(apt)

        # Paginação
        total = len(filtered_appointments)
        paginated_appointments = filtered_appointments[
            filter_data.offset : filter_data.offset + filter_data.limit
        ]

        return {
            'appointments': paginated_appointments,
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
        # Usar o controlador de Appointments
        appointments_domain = Appointments(target_company_id=current_user.id)

        today = date.today()
        appointments_list = await appointments_domain.get_company_appointments(
            start_date=today, end_date=today, status=status_filter
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


@router.get('/agendame/appointments/available-times')
async def get_available_times(
    service_id: int,
    date: date = Query(..., description='Data para verificar disponibilidade'),
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Retorna horários disponíveis para um serviço em uma data específica.
    """
    try:
        appointments_domain = Appointments(target_company_id=current_user.id)

        result = await appointments_domain.get_available_times(
            service_id=service_id, target_date=date
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao buscar horários disponíveis: {str(e)}',
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
        # Usar o controlador de Appointments
        appointments_domain = Appointments(target_company_id=current_user.id)

        # Criar agendamento usando o método da classe
        result = await appointments_domain.create_appointment(
            service_id=appointment_data.service_id,
            appointment_date=appointment_data.appointment_date,
            appointment_time=appointment_data.appointment_time,
            client_name=appointment_data.client_name,
            client_phone=appointment_data.client_phone,
            notes=appointment_data.notes,
        )

        return {
            'id': result['appointment_id'],
            'client_name': appointment_data.client_name,
            'client_phone': appointment_data.client_phone,
            'service_name': result['confirmation']['service']['name'],
            'appointment_date': appointment_data.appointment_date,
            'appointment_time': appointment_data.appointment_time,
            'price': result['confirmation']['service']['price'],
            'status': 'scheduled',
            'confirmation_code': result['confirmation']['appointment'][
                'confirmation_code'
            ],
            'message': result['confirmation']['message'],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao criar agendamento: {str(e)}',
        )


@router.post('/agendame/appointments/public/create')
async def create_public_appointment(
    service_id: int,
    appointment_date: date,
    appointment_time: str,
    client_name: str,
    client_phone: str,
    company_slug: str = Query(..., description='Slug da empresa'),
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Cria um agendamento público (pelo site da empresa).
    Não requer autenticação.
    """
    try:
        # Usar o controlador de Appointments com identificador da empresa
        appointments_domain = Appointments(
            target_company_business_slug=company_slug
        )

        result = await appointments_domain.create_appointment(
            service_id=service_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            client_name=client_name,
            client_phone=client_phone,
            identifier=company_slug,
            search_type='slug',
            notes=notes,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao criar agendamento: {str(e)}',
        )


@router.get('/agendame/appointments/public/available-times')
async def get_public_available_times(
    service_id: int,
    date: date,
    company_slug: str = Query(..., description='Slug da empresa'),
) -> Dict[str, Any]:
    """
    Retorna horários disponíveis para agendamento público.
    Não requer autenticação.
    """
    try:
        appointments_domain = Appointments(
            target_company_business_slug=company_slug
        )

        result = await appointments_domain.get_available_times(
            service_id=service_id,
            target_date=date,
            identifier=company_slug,
            search_type='slug',
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao buscar horários disponíveis: {str(e)}',
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

        # Usar o controlador de Appointments
        appointments_domain = Appointments(target_company_id=current_user.id)

        # Buscar agendamento para verificar se existe
        appointments_list = (
            await appointments_domain.get_company_appointments()
        )
        appointment_exists = any(
            apt['id'] == appointment_id for apt in appointments_list
        )

        if not appointment_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Agendamento não encontrado',
            )

        # Atualizar status
        update_data = UpdateAppointmentSchema(status=status)
        result = await appointments_domain.update_one_appointments(
            target_appointment=appointment_id, schema=update_data
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
        # Buscar agendamento
        appointment = await Appointment.filter(
            Q(user_id=current_user.id) | Q(trial_account_id=current_user.id),
            id=appointment_id,
        ).first()

        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Agendamento não encontrado',
            )

        # Deletar agendamento
        await appointment.delete()

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


@router.get('/agendame/appointments/{appointment_id}')
async def get_appointment_details(
    appointment_id: int,
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Busca detalhes de um agendamento específico.
    """
    try:
        appointments_domain = Appointments(target_company_id=current_user.id)

        appointments_list = (
            await appointments_domain.get_company_appointments()
        )
        appointment = next(
            (apt for apt in appointments_list if apt['id'] == appointment_id),
            None,
        )

        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Agendamento não encontrado',
            )

        return appointment

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao buscar detalhes do agendamento: {str(e)}',
        )


@router.get('/agendame/appointments/upcoming')
async def get_upcoming_appointments(
    days: int = Query(7, description='Número de dias a frente'),
    current_user: SystemUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Busca agendamentos dos próximos dias.
    """
    try:
        appointments_domain = Appointments(target_company_id=current_user.id)

        today = date.today()
        end_date = today + timedelta(days=days)

        appointments_list = await appointments_domain.get_company_appointments(
            start_date=today, end_date=end_date
        )

        # Filtrar apenas agendamentos futuros ou de hoje
        filtered_appointments = []
        for apt in appointments_list:
            apt_date = date.fromisoformat(apt['date'].split('T')[0])
            if apt_date >= today:
                filtered_appointments.append(apt)

        return {
            'appointments': filtered_appointments,
            'total': len(filtered_appointments),
            'start_date': today.isoformat(),
            'end_date': end_date.isoformat(),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro ao buscar agendamentos futuros: {str(e)}',
        )
