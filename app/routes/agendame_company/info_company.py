from fastapi import APIRouter, Depends, HTTPException
from app.service.jwt.depends import SystemUser, get_current_user
from app.controllers.company.company_data import MyCompany

router = APIRouter(tags=["Agendame-info"])


@router.get("/agendame/{company_slug}/info")
async def get_company_info(
    company_slug: str,
    current_user: SystemUser = Depends(get_current_user),
):
    """
    Retorna informações da empresa atual
    """

    # Exemplo: assumindo que o usuário tem company_id vinculado
    company_id = current_user.id

    try:
        company = await MyCompany.create(company_id=company_id)

    except ValueError:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    # Exemplo de retorno usando domínio
    return {
        "id": company.company_id(),
        "name": company.company_name(),
        "slug": company.company_slug(),
        "phone": company.company_phone(),
        "whatsapp": company.company_whatsapp(),
        "type": company.company_business_type(),
        "url_default": company.company_url_unic(),
        "active": company.is_active(),
    }
