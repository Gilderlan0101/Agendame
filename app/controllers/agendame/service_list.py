from typing import List, Dict, Any
from fastapi import HTTPException, status

from app.models.user import Service
from app.controllers.company.company_data import MyCompany


class Services:
    """
    Camada de domínio responsável por listar os serviços de uma empresa.
    Atua como intermediária entre model (ORM) e camada de rota (API).
    """

    def __init__(self, target_company_id: int) -> None:
        self.target_company_id = target_company_id

    async def _get_company(self) -> MyCompany:
        """
        Carrega a empresa alvo usando a camada de domínio MyCompany.
        Garante que a empresa existe antes de qualquer operação.
        """
        try:
            company = await MyCompany.create(company_id=self.target_company_id)
            return company
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não encontrada",
            )

    async def get_services(self) -> List[Dict[str, Any]]:
        """
        Retorna todos os serviços ativos da empresa formatados para a API.
        """

        # Validação de domínio
        company = await self._get_company()

        # Query direta no model, filtrando por empresa
        services = await (
            Service
            .filter(user_id=company.company_id())
            .filter(is_active=True)
            .order_by("order", "name")
            .all()
        )

        services_data: List[Dict[str, Any]] = []

        for service_model in services:
            services_data.append({
                "id": service_model.id,
                "name": service_model.name.strip(),
                "description": service_model.description.strip() if service_model.description else None,
                "price": str(service_model.price) if service_model.price else "0.00",
                "duration_minutes": service_model.duration_minutes,
                "order": service_model.order,
                "is_active": service_model.is_active,
                "created_at": service_model.created_at.isoformat() if service_model.created_at else None,
                "updated_at": service_model.updated_at.isoformat() if service_model.updated_at else None,
            })

        return services_data
