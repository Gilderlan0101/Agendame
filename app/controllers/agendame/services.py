import json
import urllib.parse
from dataclasses import field
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Union

from fastapi import HTTPException, status

from app.controllers import company
from app.controllers.company.company_data import MyCompany
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

    async def _get_company_by_name(self) -> MyCompany:
        """Busca empresa pelo business_name ou username."""
        user = None

        if self.target_company_name:
            user = await User.filter(
                business_name=self.target_company_name
            ).first()

        if not user and self.target_company_name:
            user = await User.filter(username=self.target_company_name).first()

        if not user and self.target_company_business_slug:
            user = await User.filter(
                business_slug=self.target_company_business_slug
            ).first()

        if not user:
            raise ValueError('Empresa não encontrada')

        return await MyCompany.create(company_id=user.id)

    async def _get_company_by_slug(self) -> MyCompany:
        """Busca empresa especificamente pelo business_slug."""
        user = await User.filter(
            business_slug=self.target_company_business_slug
        ).first()

        if not user:
            raise ValueError('Empresa não encontrada pelo slug')

        return await MyCompany.create(company_id=user.id)

    async def _get_company_by_identifier(
        self, identifier: str, search_type: str = 'auto'
    ) -> MyCompany:
        """
        Método flexível para buscar empresa por diferentes identificadores.

        Args:
            identifier: String para buscar (slug, username ou business_name)
            search_type: Como buscar: 'auto', 'slug', 'username', 'name'
        """
        user = None

        if search_type == 'slug' or search_type == 'auto':
            user = await User.filter(business_slug=identifier).first()
            if user:
                return await MyCompany.create(company_id=user.id)

        if search_type == 'username' or (search_type == 'auto' and not user):
            user = await User.filter(username=identifier).first()
            if user:
                return await MyCompany.create(company_id=user.id)

        if search_type == 'name' or (search_type == 'auto' and not user):
            user = await User.filter(business_name=identifier).first()
            if user:
                return await MyCompany.create(company_id=user.id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'Empresa não encontrada com identificador: {identifier}',
            )

    async def get_company_info(
        self, identifier: str, search_type: str = 'auto'
    ) -> Dict[str, Any]:
        """Retorna informações básicas da empresa para a resposta da API."""
        user = None

        if search_type == 'slug' or search_type == 'auto':
            user = await User.filter(business_slug=identifier).first()

        if search_type == 'username' or (search_type == 'auto' and not user):
            user = await User.filter(username=identifier).first()

        if search_type == 'name' or (search_type == 'auto' and not user):
            user = await User.filter(business_name=identifier).first()

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
        query = Service.filter(user_id=company.company_id())

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
        query = Service.filter(user_id=company.company_id())

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
            id=target_service_id, user_id=company.company_id()
        ).delete()

        if deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado',
            )

    async def upgrade_service(
        self, target_service_id: int, schemas: UpdateServices
    ) -> dict:
        """Atualiza informações de um serviço."""
        company = await self._get_company()
        clean_data = schemas.model_dump(exclude_none=True)

        if not clean_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Nenhum campo válido para atualização',
            )

        if 'price' in clean_data:
            try:
                clean_data['price'] = Decimal(str(clean_data['price']))
            except (InvalidOperation, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Formato inválido para price',
                )

        clean_data['updated_at'] = datetime.utcnow()
        updated_rows = await Service.filter(
            id=target_service_id, user_id=company.company_id()
        ).update(**clean_data)

        if updated_rows == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Serviço não encontrado ou não pertence à empresa',
            )

        return {'status': 'success', 'updated_fields': list(clean_data.keys())}
