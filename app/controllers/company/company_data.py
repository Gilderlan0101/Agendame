import os

from dotenv import load_dotenv

from app.models.user import User
from app.utils.i_requests import company_exist

load_dotenv()


class MyCompany:
    """
    MyCompany é responsável por entregar os dados da empresa atual.
    Cada tipo de informação deve ter um método único.
    Atua como camada de domínio sobre o model User.
    """

    def __init__(self, target_company: User):
        self.target_company = target_company

    @classmethod
    async def create(cls, company_id: int) -> 'MyCompany':
        """
        Factory assíncrona para criar a instância corretamente.
        """
        company = await company_exist(companyID=company_id)

        if not company:
            raise ValueError('Empresa não encontrada')

        return cls(target_company=company)

    # ==========================
    # Métodos de domínio
    # ==========================

    def company_slug(self) -> str:
        """
        Retorna o slug da empresa.
        """
        return self.target_company.business_slug

    def company_id(self) -> int:
        return self.target_company.id

    def company_name(self) -> str:
        return self.target_company.business_name

    def company_email(self) -> str:
        return self.target_company.email

    def company_phone(self) -> str:
        return self.target_company.phone

    def company_whatsapp(self) -> str:
        return self.target_company.whatsapp

    def company_business_type(self) -> str:
        return self.target_company.business_type

    def company_url_unic(self) -> str:
        CURRENT_DOMINIO = os.getenv('CURRENT_DOMINIO')
        return f'{CURRENT_DOMINIO + self.company_slug()}'

    def is_active(self) -> bool:
        return bool(getattr(self.target_company, 'subscription_active', True))
