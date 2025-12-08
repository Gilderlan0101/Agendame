from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.user import Appointment, Client, Service, User
from app.schemas.agendame.response_service_agendame import ServiceResponse
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Agendame-company'])


@router.get('/agendame/services', response_model=List[ServiceResponse])
async def get_my_services(
    current_user: SystemUser = Depends(get_current_user),
    active_only: bool = False,
):
    """
    Lista todos os serviços da empresa do usuário logado.
    """
    try:
        user = await User.get_or_none(id=current_user.id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Usuário não encontrado',
            )

        query = Service.filter(user=user)

        if active_only:
            query = query.filter(is_active=True)

        services = await query.order_by('order', 'name').all()

        if not services:
            return []

        return services

    except HTTPException:
        raise
    except Exception as e:
        print(f'Erro ao listar serviços: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao listar serviços',
        )


@router.get('/clients')
async def get_clients(
    current_user: SystemUser = Depends(get_current_user),
    search_query: Optional[str] = Query(
        None, description='Busca por nome do cliente'
    ),
    limit: int = Query(50, ge=1, le=100, description='Limite de resultados'),
    offset: int = Query(0, ge=0, description='Offset para paginação'),
):
    """
    Busca todos os clientes da empresa do usuário logado.
    """
    try:
        user = await User.get_or_none(id=current_user.id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Usuário não encontrado',
            )

        # Construir query base
        query = Client.filter(user=user)

        # Aplicar filtro de busca se fornecido
        if search_query:
            query = query.filter(full_name__icontains=search_query)

        # Ordenar por nome e calcular total
        query = query.order_by('full_name')
        total_count = await query.count()

        # Aplicar paginação
        clients = await query.offset(offset).limit(limit).all()

        # Buscar dados adicionais para cada cliente
        clients_data = []
        for client in clients:
            # Contar agendamentos deste cliente
            total_appointments = await Appointment.filter(
                user=user, client=client
            ).count()

            # Buscar último serviço agendado
            last_appointment = (
                await Appointment.filter(user=user, client=client)
                .order_by('-appointment_date', '-appointment_time')
                .first()
            )

            last_service = None
            if last_appointment and last_appointment.service:
                last_service = last_appointment.service.name

            clients_data.append(
                {
                    'id': client.id,
                    'full_name': client.full_name,
                    'phone': client.phone,
                    'total_appointments': total_appointments,
                    'last_service': last_service,
                    'created_at': client.created_at.isoformat()
                    if client.created_at
                    else None,
                    'is_active': client.is_active,
                }
            )

        return {
            'clients': clients_data,
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + len(clients)) < total_count,
            },
        }

    except Exception as e:
        print(f'Erro ao buscar clientes: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao buscar clientes: {str(e)}',
        )


@router.get('/appointments')
async def get_appointments(
    current_user: SystemUser = Depends(get_current_user),
    date_filter: Optional[str] = Query(
        None, alias='date', description='Data no formato YYYY-MM-DD'
    ),
    status_filter: Optional[str] = Query(
        None, alias='status', description='Filtrar por status'
    ),
    limit: int = Query(100, ge=1, le=200, description='Limite de resultados'),
    offset: int = Query(0, ge=0, description='Offset para paginação'),
):
    """
    Busca agendamentos da empresa do usuário logado.

    Parâmetros:
    - date: Filtrar por data específica (YYYY-MM-DD)
    - status: Filtrar por status (scheduled, confirmed, completed, cancelled, no_show)
    - limit: Limite de resultados por página
    - offset: Offset para paginação
    """
    try:
        user = await User.get_or_none(id=current_user.id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Usuário não encontrado',
            )

        # Construir query base
        query = Appointment.filter(user=user)

        # Filtrar por data se fornecida
        if date_filter:
            try:
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                query = query.filter(appointment_date=filter_date)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Formato de data inválido. Use YYYY-MM-DD',
                )

        # Filtrar por status se fornecido
        if status_filter:
            if status_filter not in [
                'scheduled',
                'confirmed',
                'completed',
                'cancelled',
                'no_show',
            ]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Status inválido. Use: scheduled, confirmed, completed, cancelled, no_show',
                )
            query = query.filter(status=status_filter)

        # Contar total
        total_count = await query.count()

        # Buscar com paginação e ordenação
        appointments = (
            await query.order_by('appointment_date', 'appointment_time')
            .offset(offset)
            .limit(limit)
            .all()
        )

        # Formatar resposta
        appointments_data = []
        for appointment in appointments:
            # Buscar dados do serviço
            service_name = 'Serviço não encontrado'
            if appointment.service:
                service_name = appointment.service.name

            # Buscar dados do cliente (se existir registro)
            client_name = appointment.client_name
            client_phone = appointment.client_phone
            if appointment.client:
                client_name = appointment.client.full_name
                client_phone = appointment.client.phone

            appointments_data.append(
                {
                    'id': appointment.id,
                    'client_id': appointment.client_id,
                    'client_name': client_name,
                    'client_phone': client_phone,
                    'service_id': appointment.service_id,
                    'service_name': service_name,
                    'appointment_date': appointment.appointment_date.isoformat()
                    if appointment.appointment_date
                    else None,
                    'appointment_time': appointment.appointment_time,
                    'price': float(appointment.price)
                    if appointment.price
                    else 0,
                    'status': appointment.status,
                    'status_display': dict(appointment.STATUS_CHOICES).get(
                        appointment.status, appointment.status
                    ),
                    'notes': appointment.notes,
                    'whatsapp_sent': appointment.whatsapp_sent,
                    'created_at': appointment.created_at.isoformat()
                    if appointment.created_at
                    else None,
                }
            )

        return {
            'appointments': appointments_data,
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + len(appointments)) < total_count,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f'Erro ao buscar agendamentos: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao buscar agendamentos: {str(e)}',
        )
