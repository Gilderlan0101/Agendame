from typing import Any, Dict

from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.auth.schemas_login import LoginResponse
from app.service.jwt.auth import (create_access_token, create_refresh_token,
                                  verify_password)
from app.utils.hashed_email import create_email_search_hash


async def checking_account(target: Dict[str, Any]):
    try:
        #    Usamos .get_or_none() para obter o objeto do usuário ou None.
        user = await User.filter(email=target.get('email')).first()

        #  Se o usuário não for encontrado (user é None)
        if user is None:
            # Retorna None para que a função de rota lide com o erro 404/401
            return None

        # 3. Verifica a senha (user agora é o objeto com o atributo .password)
        if not verify_password(str(target.get('password')), user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Credenciais inválidas: senha incorreta',
            )

        #  Se a verificação for bem-sucedida, gera os tokens
        user_id_str = str(user.id)
        access_token = create_access_token(user_id_str)
        refresh_token = create_refresh_token(user_id_str)

        #  Retorna o dicionário de resposta
        return {
            'id': user.id,
            'username': user.username,
            'access_token': access_token,
            'refresh_token': refresh_token,
        }

    except HTTPException:
        # Captura e relança exceções HTTP que você levanta dentro da função
        raise

    except Exception as e:
        # Evita retornar strings de erro internas
        print(f'Erro Inesperado durante o login: {e}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Ocorreu um erro interno inesperado no servidor durante a autenticação.',
        )
