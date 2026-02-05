# app/utils/i_requests.py

"""
I Requests é responsável por verificar se uma empresa existe.

Se existir, a função [company_exist] deve retornar o objeto da empresa.
Caso contrário, retorna None ou levanta uma exceção.
"""

from typing import Optional

from tortoise.exceptions import DoesNotExist

from app.models.trial import TrialAccount
from app.models.user import User


async def company_exist(companyID: int) -> Optional[User]:
    """
    Busca uma empresa pelo ID e retorna o objeto User correspondente.

    Parameters
    ----------
    companyID : int
        ID da empresa a ser buscada.

    Returns
    -------
    Optional[User]
        Objeto User da empresa se encontrada, None caso contrário.

    Raises
    ------
    ValueError
        Se companyID não for um inteiro.
    DoesNotExist
        Se a empresa não for encontrada (opcional, dependendo do comportamento desejado).
    """
    try:
        # Verificando se companyID é um int
        if not isinstance(companyID, int):
            raise ValueError('O ID da empresa deve ser um número inteiro.')

        # Busca a empresa pelo ID
        # get_or_none já retorna None se não encontrar, não precisa fazer filter depois
        company = await User.get_or_none(id=companyID)
        if company:
            return company  # Retorna o objeto User ou None
        else:
            # Buscar por usuario trial de 7 dias
            company = await TrialAccount.get_or_none(id=companyID)
            return company

    except DoesNotExist:
        # Esta exceção só será levantada se usarmos User.get() ao invés de User.get_or_none()
        # Pode ser mantida para compatibilidade ou removida se usar apenas get_or_none()
        raise DoesNotExist(
            'A busca pela empresa não teve um resultado satisfatório.'
        )

    except Exception as e:
        # Log de erro para debugging
        print(f'Erro ao buscar empresa ID {companyID}: {str(e)}')
        return None
