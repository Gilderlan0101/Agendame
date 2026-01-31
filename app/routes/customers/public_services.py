from datetime import date
from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from app.controllers.agendame.services import Services
from app.service.jwt.depends import get_current_user, SystemUser
from app.controllers.agendame.appointments import Appointments


router = APIRouter(tags=["Cliente - Serviços e Agendamentos"])

# ============================================================================
# ROTAS PÚBLICAS (para clientes)
# ============================================================================

@router.get("/services/{company_identifier}")
async def list_services_for_customers(
    company_identifier: str,
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
        import urllib.parse
        decoded_identifier = urllib.parse.unquote(company_identifier)

        services_domain = Services()

        final_is_active = None if include_inactive else is_active

        order_by_list = None
        if order_by:
            order_by_list = [field.strip() for field in order_by.split(',') if field.strip()]

        services = await services_domain.get_services_by_identifier(
            identifier=decoded_identifier,
            search_type=search_by, # type:ignore
            query_by=filter_by,
            query_value=filter_value,
            is_active=final_is_active,
            order_by=order_by_list
        )

        company_info = await services_domain.get_company_info(decoded_identifier, search_by) # type:ignore

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


@router.get("/services/{company_identifier}/available-times")
async def get_available_times(
    company_identifier: str,
    service_id: int = Query(..., description="ID do serviço"),
    date: date = Query(..., description="Data para consultar disponibilidade (YYYY-MM-DD)"),
    search_by: str = Query("auto", description="Tipo de busca: auto, slug, username, name")
):
    """
    Consulta horários disponíveis para um serviço específico.

    **Exemplo:**
    - `/services/meu-salao/available-times?service_id=1&date=2024-01-15`
    """
    try:
        import urllib.parse
        decoded_identifier = urllib.parse.unquote(company_identifier)

        appointments_domain = Appointments()

        available = await appointments_domain.get_available_times(
            service_id=service_id,
            target_date=date,
            identifier=decoded_identifier,
            search_type=search_by
        )

        return available

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Erro ao consultar horários: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar solicitação"
        )


@router.post("/services/{company_identifier}/book")
async def book_appointment(
    company_identifier: str,
    service_id: int = Body(..., description="ID do serviço"),
    appointment_date: date = Body(..., description="Data do agendamento (YYYY-MM-DD)"),
    appointment_time: str = Body(..., description="Hora do agendamento (HH:MM)"),
    client_name: str = Body(..., description="Nome do cliente", max_length=200),
    client_phone: str = Body(..., description="Telefone do cliente", max_length=20),
    search_by: str = Body("auto", description="Tipo de busca"),
    notes: Optional[str] = Body(None, description="Observações adicionais")
):
    """
    Realiza um novo agendamento.

    **Exemplo de corpo da requisição:**
    ```json
    {
        "service_id": 1,
        "appointment_date": "2024-01-15",
        "appointment_time": "14:00",
        "client_name": "João Silva",
        "client_phone": "11999999999",
        "notes": "Corte simples"
    }
    ```
    """
    try:
        import urllib.parse
        decoded_identifier = urllib.parse.unquote(company_identifier)

        appointments_domain = Appointments()

        result = await appointments_domain.create_appointment(
            service_id=service_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            client_name=client_name,
            client_phone=client_phone,
            identifier=decoded_identifier,
            search_type=search_by,
            notes=notes
        )

        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Erro ao criar agendamento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar solicitação"
        )


# ============================================================================
# ROTAS PRIVADAS (para empresas - requer autenticação)
# ============================================================================

@router.get("/company/appointments", tags=["Empresa - Agendamentos"])
async def list_company_appointments(
    current_user: SystemUser = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Data final (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Status do agendamento")
):
    """
    Lista agendamentos da empresa (uso interno).
    Requer autenticação.

    **Exemplo:**
    - `/company/appointments`
    - `/company/appointments?start_date=2024-01-01&end_date=2024-01-31`
    - `/company/appointments?status=scheduled`
    """
    try:
        appointments_domain = Appointments(target_company_id=current_user.id)

        appointments = await appointments_domain.get_company_appointments(
            start_date=start_date,
            end_date=end_date,
            status=status
        )

        return {
            "appointments": appointments,
            "total": len(appointments)
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Erro ao listar agendamentos: {str(e)}")
        raise HTTPException(
            status_code=500, # TODO: Usar status.HTTP_500_INTERNAL_SERVER_ERROR
            detail="Erro interno ao processar solicitação"
        )


# Rotas adicionais para empresa (se precisar)
@router.get("/company/services", tags=["Empresa - Serviços"])
async def list_company_services(
    current_user: SystemUser = Depends(get_current_user),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo")
):
    """
    Lista serviços da empresa (uso interno).
    Requer autenticação.
    """
    try:
        services_domain = Services(target_company_id=current_user.id)

        services = await services_domain.get_services(
            is_active=is_active
        )

        return {
            "services": services,
            "total": len(services)
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Erro ao listar serviços: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar solicitação"
        )
