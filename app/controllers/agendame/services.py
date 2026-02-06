import json
import urllib.parse
from dataclasses import field
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Union

from fastapi import HTTPException, status
from tortoise.expressions import Q

from app.controllers import company
from app.controllers.company.company_data import MyCompany
from app.models.trial import TrialAccount
from app.models.user import (Appointment, BusinessSettings, Client, Service,
                             User)
from app.schemas.agendame.upgrade_service import UpdateServices


class Services:
    """Camada de domínio para gerenciamento de serviços da empresa."""

    def __init__(
        self,
        target_company_id: Optional[int] = None,
        target_company_name: Optional[str] = None,
        target_company_business_slug: Optional[str] = None,
    ) -> None:
        self.target_company_id = target_company_id
        self.target_company_name = target_company_name
        self.target_company_business_slug = target_company_business_slug

    async def _get_company(self) -> MyCompany:
        """Carrega a empresa alvo pelo ID ou nome."""
        try:
            if self.target_company_id:
                return await MyCompany.create(
                    company_id=self.target_company_id
                )
            elif self.target_company_name:
                return await self._get_company_by_name()
            elif self.target_company_business_slug:
                return await self._get_company_by_slug()
            raise ValueError('Identificador de empresa não fornecido')
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Empresa não encontrada',
            )

    async def _get_company_by_name(self) -> Optional[MyCompany]:
        """Busca empresa pelo business_name, username ou business_slug."""

        # Se não temos nenhum identificador, retorna None
        if (
            not self.target_company_name
            and not self.target_company_business_slug
        ):
            return None

        user = None

        # 1. Primeiro tenta na tabela User
        if self.target_company_name:
            # Tenta por business_name
            user = await User.filter(
                business_name=self.target_company_name
            ).first()

            # Se não encontrou, tenta por username
            if not user:
                user = await User.filter(
                    username=self.target_company_name
                ).first()

        # 2. Se ainda não encontrou e tem business_slug, tenta por slug
        if not user and self.target_company_business_slug:
            user = await User.filter(
                business_slug=self.target_company_business_slug
            ).first()

        # 3. Se ainda não encontrou na tabela User, tenta na TrialAccount
        if not user and self.target_company_name:
            # Tenta por business_name na TrialAccount
            user = await TrialAccount.filter(
                business_name=self.target_company_name
            ).first()

            # Se não encontrou, tenta por username
            if not user:
                user = await TrialAccount.filter(
                    username=self.target_company_name
                ).first()

            # Se ainda não encontrou e tem slug, tenta por slug
            if not user and self.target_company_business_slug:
                user = await TrialAccount.filter(
                    business_slug=self.target_company_business_slug
                ).first()

        # 4. Se encontrou algum usuário, cria MyCompany
        if user:
            return await MyCompany.create(company_id=user.id)

        # 5. Se não encontrou em nenhuma tabela, retorna None ou levanta exceção
        return None
        # raise ValueError(f"Empresa não encontrada: {self.target_company_name or self.target_company_business_slug}")

    async def _get_company_by_slug(self) -> MyCompany:
        """Busca empresa especificamente pelo business_slug."""
        user = await User.filter(
            business_slug=self.target_company_business_slug
        ).first()

        if not user:
            user = await TrialAccount.filter(
                business_slug=self.target_company_business_slug
            ).first()

        if user:
            return await MyCompany.create(company_id=user.id)
        else:
            return None

    async def _get_company_by_identifier(
        self, identifier: str, search_type: str = 'auto'
    ) -> MyCompany:
        """
        Método flexível para buscar empresa por diferentes identificadores.
        """
        user = None

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
        for field in fields:
            user = await User.filter(**{field: identifier}).first()
            if user:
                break

        # Se não encontrou em User, busca na TrialAccount
        if not user:
            for field in fields:
                user = await TrialAccount.filter(**{field: identifier}).first()
                if user:
                    break

        if user:
            return await MyCompany.create(company_id=user.id)

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Empresa não encontrada: {identifier}',
        )

    async def get_company_info(
        self, identifier: str, search_type: str = 'auto'
    ) -> Dict[str, Any]:
        """Retorna informações básicas da empresa para a resposta da API."""
        user = None

        # Definir a ordem de busca baseada no search_type
        if search_type == 'slug':
            # Busca apenas por slug
            user = await User.filter(business_slug=identifier).first()
            if not user:
                user = await TrialAccount.filter(
                    business_slug=identifier
                ).first()

        elif search_type == 'username':
            # Busca apenas por username
            user = await User.filter(username=identifier).first()
            if not user:
                user = await TrialAccount.filter(username=identifier).first()

        elif search_type == 'name':
            # Busca apenas por business_name
            user = await User.filter(business_name=identifier).first()
            if not user:
                user = await TrialAccount.filter(
                    business_name=identifier
                ).first()

        else:  # 'auto' - busca em todos os campos e tabelas
            # Primeiro busca na tabela User
            user = await User.filter(business_slug=identifier).first()
            if not user:
                user = await User.filter(username=identifier).first()
            if not user:
                user = await User.filter(business_name=identifier).first()

            # Se não encontrou em User, busca na TrialAccount
            if not user:
                user = await TrialAccount.filter(
                    business_slug=identifier
                ).first()
            if not user:
                user = await TrialAccount.filter(username=identifier).first()
            if not user:
                user = await TrialAccount.filter(
                    business_name=identifier
                ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Empresa não encontrada',
            )

        return {
            'id': user.id,
            'username': user.username,
            'business_name': user.business_name,
            'business_slug': user.business_slug,
            'business_type': user.business_type,
            'email': user.email,
            'phone': user.phone,
            'whatsapp': user.whatsapp,
        }

    async def get_services_by_identifier(
        self,
        identifier: str,
        search_type: str = 'auto',
        query_by: Optional[str] = None,
        query_value: Optional[Union[str, int, bool]] = None,
        is_active: Optional[bool] = True,
        order_by: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Busca serviços usando identificador flexível.
        """
        decoded_identifier = urllib.parse.unquote(identifier)
        company = await self._get_company_by_identifier(
            decoded_identifier, search_type
        )

        # Filtro que considera tanto user_id quanto trial_account_id
        query = Service.filter(
            Q(user_id=company.company_id())
            | Q(trial_account_id=company.company_id())
        )

        if is_active is not None:
            query = query.filter(is_active=is_active)

        if query_by and query_value is not None:
            allowed_fields = [
                'name',
                'description',
                'duration_minutes',
                'price',
                'order',
            ]
            if query_by not in allowed_fields:
                raise ValueError(
                    f'Campo de filtro inválido. Permitidos: {allowed_fields}'
                )
            query = query.filter(**{query_by: query_value})

        if order_by is None:
            order_by = ['order', 'name']

        services_models = await query.order_by(*order_by).all()
        services_data = []
        for service in services_models:
            services_data.append(
                {
                    'id': service.id,
                    'name': service.name.strip(),
                    'description': service.description.strip()
                    if service.description
                    else None,
                    'price': str(service.price) if service.price else '0.00',
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

    async def query(
        self,
        query_by: Optional[str] = None,
        query_value: Optional[Union[str, int, bool]] = None,
        is_active: Optional[bool] = True,
        order_by: Optional[List[str]] = None,
    ) -> List[Service]:
        """Consulta flexível de serviços."""
        company = await self._get_company()
        # Filtro que considera tanto user_id quanto trial_account_id
        query = Service.filter(
            Q(user_id=company.company_id())
            | Q(trial_account_id=company.company_id())
        )

        if is_active is not None:
            query = query.filter(is_active=is_active)

        if query_by and query_value is not None:
            filter_kwargs = {query_by: query_value}
            query = query.filter(**filter_kwargs)

        if order_by is None:
            order_by = ['order', 'name']

        return await query.order_by(*order_by).all()

    async def get_services(
        self,
        query_by: Optional[str] = None,
        query_value: Optional[Union[str, int, bool]] = None,
        is_active: Optional[bool] = True,
        order_by: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Retorna serviços formatados para API com filtros opcionais."""
        services_models = await self.query(
            query_by=query_by,
            query_value=query_value,
            is_active=is_active,
            order_by=order_by,
        )

        services_data = []
        for service_model in services_models:
            services_data.append(
                {
                    'id': service_model.id,
                    'name': service_model.name.strip(),
                    'description': service_model.description.strip()
                    if service_model.description
                    else None,
                    'price': str(service_model.price)
                    if service_model.price
                    else '0.00',
                    'duration_minutes': service_model.duration_minutes,
                    'order': service_model.order,
                    'is_active': service_model.is_active,
                    'created_at': service_model.created_at.isoformat()
                    if service_model.created_at
                    else None,
                    'updated_at': service_model.updated_at.isoformat()
                    if service_model.updated_at
                    else None,
                }
            )

        return services_data

    async def remove_one_service(self, target_service_id: int) -> None:
        """Remove definitivamente um serviço da empresa."""
        company = await self._get_company()
        deleted_count = await Service.filter(
            Q(user_id=company.company_id())
            | Q(trial_account_id=company.company_id()),
            id=target_service_id,
        ).delete()

        if deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado',
            )

        return {'status': 200}

    async def upgrade_service(
        self, target_service_id: int, schemas: UpdateServices
    ) -> dict:
        """Atualiza informações de um serviço."""
        company = await self._get_company()

        # Obter apenas os campos que foram realmente fornecidos no request
        clean_data = schemas.model_dump(exclude_unset=True)

        # Remover campos None (caso algum campo opcional tenha sido enviado como null)
        clean_data = {k: v for k, v in clean_data.items() if v is not None}

        # Remover strings vazias
        clean_data = {
            k: v
            for k, v in clean_data.items()
            if not (isinstance(v, str) and v.strip() == '')
        }

        if not clean_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Nenhum campo válido para atualização',
            )

        # Processar preço se for fornecido
        if 'price' in clean_data:
            try:
                clean_data['price'] = Decimal(str(clean_data['price']))
            except (InvalidOperation, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Formato inválido para price',
                )

        # Adicionar data de atualização
        clean_data['updated_at'] = datetime.utcnow()

        # Atualizar o serviço
        updated_rows = await Service.filter(
            Q(user_id=company.company_id())
            | Q(trial_account_id=company.company_id()),
            id=target_service_id,
        ).update(**clean_data)

        if updated_rows == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado ou não pertence à empresa',
            )

        return {'status': 'success', 'updated_fields': list(clean_data.keys())}

    async def create_service_for_current_user(
        self,
        service_data: Dict[str, Any],
        current_user_id: int,
        user_is_trial: bool = False,
    ) -> Dict[str, Any]:
        """
        Cria serviço para o usuário logado (User ou TrialAccount).
        """
        try:
            # Buscar a empresa baseada no tipo de usuário
            if user_is_trial:
                company = await TrialAccount.get_or_none(id=current_user_id)
                model_name = 'TrialAccount'
            else:
                company = await User.get_or_none(id=current_user_id)
                model_name = 'User'

            if not company:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f'{model_name} não encontrado',
                )

            # Verificar se já existe serviço com mesmo nome
            if user_is_trial:
                existing_service = await Service.filter(
                    trial_account=company,  # Usar a relação, não o ID
                    name=service_data['name'],
                ).first()
            else:
                existing_service = await Service.filter(
                    user=company,  # Usar a relação, não o ID
                    name=service_data['name'],
                ).first()

            if existing_service:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Já existe um serviço com este nome',
                )

            # Processar preço
            if 'price' in service_data:
                try:
                    service_data['price'] = Decimal(str(service_data['price']))
                except (InvalidOperation, ValueError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='Formato inválido para preço',
                    )

            # Preparar dados para criação
            create_data = service_data.copy()

            # Configurar a relação correta (USAR AS RELAÇÕES, NÃO OS IDs DIRETOS)
            if user_is_trial:
                create_data[
                    'trial_account'
                ] = company  # Passar o objeto TrialAccount
                # Não definir user, deixar como None (o modelo já tem null=True)
            else:
                create_data['user'] = company  # Passar o objeto User
                # Não definir trial_account, deixar como None

            # Remover campos que podem causar conflito
            create_data.pop('user_id', None)
            create_data.pop('trial_account_id', None)

            # Criar serviço
            service = await Service.create(**create_data)

            return {
                'status': 'success',
                'message': 'Serviço criado com sucesso!',
                'service': {
                    'id': service.id,
                    'name': service.name,
                    'description': service.description,
                    'price': str(service.price) if service.price else '0.00',
                    'duration_minutes': service.duration_minutes,
                    'order': service.order,
                    'is_active': service.is_active,
                    'created_at': service.created_at.isoformat()
                    if service.created_at
                    else None,
                    'updated_at': service.updated_at.isoformat()
                    if service.updated_at
                    else None,
                },
            }

        except Exception as e:
            print(f'Erro detalhado ao criar serviço: {str(e)}')
            import traceback

            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f'Erro ao criar serviço: {str(e)}',
            )

    async def get_clients(
        self,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Busca todos os clientes da empresa."""
        try:
            company = await self._get_company()
            company_id = company.company_id()

            # Construir query base considerando tanto user quanto trial_account
            query = Client.filter(
                Q(user_id=company_id) | Q(trial_account_id=company_id)
            )

            # Aplicar filtro de busca se fornecido
            if search_query:
                query = query.filter(full_name__icontains=search_query)

            # Ordenar por nome e calcular total
            query = query.order_by('full_name')
            total_count = await query.count()

            # Aplicar paginação
            clients = await query.offset(offset).limit(limit).all()

            # Formatar resposta
            clients_data = []
            for client in clients:
                # Contar agendamentos deste cliente
                total_appointments = await Appointment.filter(
                    Q(user_id=company_id) | Q(trial_account_id=company_id),
                    client=client,
                ).count()

                # Buscar último serviço agendado
                last_appointment = (
                    await Appointment.filter(
                        Q(user_id=company_id) | Q(trial_account_id=company_id),
                        client=client,
                    )
                    .select_related('service')
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

    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas para o dashboard."""
        try:
            company = await self._get_company()
            company_id = company.company_id()

            today = date.today()

            # Estatísticas básicas - considerar tanto user quanto trial_account
            total_services = await Service.filter(
                Q(user_id=company_id) | Q(trial_account_id=company_id),
                is_active=True,
            ).count()

            total_clients = await Client.filter(
                Q(user_id=company_id) | Q(trial_account_id=company_id),
                is_active=True,
            ).count()

            # Agendamentos de hoje
            today_appointments = (
                await Appointment.filter(
                    Q(user_id=company_id) | Q(trial_account_id=company_id),
                    appointment_date=today,
                    status__in=['scheduled', 'confirmed'],
                )
                .select_related('service', 'client')
                .all()
            )

            today_revenue = sum(
                float(app.price) for app in today_appointments if app.price
            )

            # Próximos agendamentos
            upcoming_appointments = (
                await Appointment.filter(
                    Q(user_id=company_id) | Q(trial_account_id=company_id),
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
