from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.user import Appointment, Client, Service, User
from app.schemas.agendame.response_service_agendame import ServiceListResponse

from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(tags=['Agendame-company'])


@router.get('/agendame/services', response_model=List[ServiceListResponse])
async def get_my_services(
    current_user: SystemUser = Depends(get_current_user),
    active_only: Optional[bool] = Query(
        False, description='Filtrar apenas serviços ativos'
    ),
):
    """
    Lista todos os serviços da empresa do usuário logado.
    Retorna um array de serviços diretamente (o JS espera array direto).
    """
    try:
        user = await User.get_or_none(id=current_user.id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Usuário não encontrado',
            )

        # Construir query
        query = Service.filter(user=user)

        if active_only:
            query = query.filter(is_active=True)

        # Buscar serviços ordenados
        services = await query.order_by('order', 'name').all()

        # Formatar resposta para o JS
        services_data = []
        for service in services:
            services_data.append(
                {
                    'id': service.id,
                    'name': service.name,
                    'description': service.description,
                    'price': str(service.price)
                    if service.price
                    else '0.00',  # Convert Decimal to string
                    'duration_minutes': service.duration_minutes,
                    'order': service.order,
                    'is_active': service.is_active,
                    'created_at': service.created_at.isoformat()
                    if service.created_at
                    else None,
                    'updated_at': service.updated_at.isoformat()
                    if service.updated_at
                    else None,
                }
            )

        return services_data

    except HTTPException:
        raise
    except Exception as e:
        print(f'Erro ao listar serviços: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao listar serviços: {str(e)}',
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
    Retorna { "clients": [...] } como o JS espera.
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

        # Formatar resposta para o JS
        clients_data = []
        for client in clients:
            # Contar agendamentos deste cliente
            total_appointments = await Appointment.filter(
                user=user, client=client
            ).count()

            # Buscar último serviço agendado usando select_related para carregar o serviço
            last_appointment = (
                await Appointment.filter(user=user, client=client)
                .select_related('service')  # Carrega o serviço relacionado
                .order_by('-appointment_date', '-appointment_time')
                .first()
            )

            last_service = None
            if last_appointment and last_appointment.service:
                # CORREÇÃO: Acessar o objeto service e depois seu atributo name
                last_service = last_appointment.service.name

            clients_data.append(
                {
                    'id': client.id,
                    'full_name': client.full_name,
                    'phone': client.phone,
                    'total_appointments': total_appointments,
                    'last_service': last_service,  # Agora é uma string com o nome do serviço
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


@router.get('/dashboard/stats')
async def get_dashboard_stats(
    current_user: SystemUser = Depends(get_current_user),
):
    """
    Retorna estatísticas para o dashboard.
    """
    try:
        user = await User.get_or_none(id=current_user.id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Usuário não encontrado',
            )

        today = date.today()

        # Estatísticas básicas
        total_services = await Service.filter(
            user=user, is_active=True
        ).count()
        total_clients = await Client.filter(user=user, is_active=True).count()

        # Agendamentos de hoje
        today_appointments = (
            await Appointment.filter(
                user=user,
                appointment_date=today,
                status__in=['scheduled', 'confirmed'],
            )
            .select_related('service', 'client')
            .all()
        )

        today_revenue = sum(
            float(app.price) for app in today_appointments if app.price
        )

        # Próximos agendamentos (hoje e futuro)
        upcoming_appointments = (
            await Appointment.filter(
                user=user,
                appointment_date__gte=today,
                status__in=['scheduled', 'confirmed'],
            )
            .select_related('service', 'client')
            .order_by('appointment_date', 'appointment_time')
            .limit(10)
            .all()
        )

        upcoming_data = []
        for app in upcoming_appointments:
            # CORREÇÃO: Usar select_related para carregar service e client
            service_name = app.service.name if app.service else 'Serviço'
            client_name = (
                app.client.full_name if app.client else app.client_name
            )

            upcoming_data.append(
                {
                    'id': app.id,
                    'client_name': client_name,
                    'service_name': service_name,
                    'appointment_date': app.appointment_date.isoformat(),
                    'appointment_time': app.appointment_time,
                    'price': float(app.price) if app.price else 0.0,
                }
            )

        return {
            'stats': {
                'total_services': total_services,
                'total_clients': total_clients,
                'today_appointments': len(today_appointments),
                'today_revenue': today_revenue,
                'upcoming_appointments': len(upcoming_appointments),
            },
            'upcoming_appointments': upcoming_data,
        }

    except Exception as e:
        print(f'Erro ao buscar estatísticas: {str(e)}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Erro interno ao buscar estatísticas: {str(e)}',
        )
