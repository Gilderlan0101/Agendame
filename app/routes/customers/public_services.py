from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.controllers.agendame.services import Services

router = APIRouter(tags=["Cliente - Serviços"])

@router.get("/services/{company_identifier}")
async def list_services_for_customers(
    company_identifier: str,  # Path parameter (obrigatório)
    search_by: Optional[str] = Query(
        "auto",
        description="Como buscar a empresa: 'auto' (tenta slug, username, nome), 'slug', 'username', 'name'"
    ),
    filter_by: Optional[str] = Query(
        None,
        description="Campo para filtrar os serviços (ex: name, duration_minutes)"
    ),
    filter_value: Optional[str] = Query(
        None,
        description="Valor para filtrar (usado com filter_by)"
    ),
    is_active: bool = Query(
        True,
        description="Filtrar apenas serviços ativos"
    ),
    order_by: Optional[str] = Query(
        None,
        description="Campos para ordenação separados por vírgula (ex: price, name)"
    ),
    include_inactive: Optional[bool] = Query(
        False,
        description="Incluir serviços inativos (sobrescreve is_active se True)",
        include_in_schema=False
    )
):
    """
    Lista serviços disponíveis de uma empresa para clientes.

    O parâmetro 'company_identifier' pode ser:
    - business_slug (ex: 'meu-salao')
    - username (ex: 'meusalao')
    - business_name (ex: 'Meu Salão de Beleza')

    Use 'search_by' para especificar como buscar:
    - 'auto': tenta slug → username → business_name (padrão)
    - 'slug': busca apenas por business_slug
    - 'username': busca apenas por username
    - 'name': busca apenas por business_name

    **Exemplos:**
    - `/services/beleza-saloon` - Busca automática
    - `/services/beleza-saloon?search_by=slug` - Busca apenas por slug
    - `/services/beleza-saloon?search_by=username&filter_by=duration_minutes&filter_value=30`
    """
    try:
        # Decodifica o identificador (URL pode conter espaços codificados)
        import urllib.parse
        decoded_identifier = urllib.parse.unquote(company_identifier)

        # Instancia a camada de domínio
        services_domain = Services()

        # Determina se deve mostrar serviços inativos
        final_is_active = None if include_inactive else is_active

        # Parse order_by string para lista
        order_by_list = None
        if order_by:
            order_by_list = [field.strip() for field in order_by.split(',') if field.strip()]

        # Obtém serviços com base no identificador e tipo de busca
        services = await services_domain.get_services_by_identifier(
            identifier=decoded_identifier,
            search_type=search_by,
            query_by=filter_by,
            query_value=filter_value,
            is_active=final_is_active,
            order_by=order_by_list
        )

        company_info = await services_domain.get_company_info(decoded_identifier, search_by)

        return {
            "company": company_info.get("business_name", decoded_identifier),
            "company_slug": company_info.get("business_slug"),
            "company_username": company_info.get("username"),
            "services": services,
            "total_services": len(services),
            "filters_applied": {
                "search_by": search_by,
                "filter_by": filter_by,
                "filter_value": filter_value,
                "is_active": final_is_active
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Erro ao listar serviços: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar solicitação"
        )
@router.get("/services/{company_name}/available-times")
async def get_available_times(company_name: str):
    pass
