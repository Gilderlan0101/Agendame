from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.auth.schemas_login import LoginResponse
from app.service.jwt.auth import (create_access_token, create_refresh_token,
                                  verify_password)


async def checking_account(target: Dict[str, Any]):
    try:
        username_or_email = target.get('username') or target.get('email')
        password = target.get('password')

        if not username_or_email or not password:
            return None

        # Buscar usuário por email
        user = await User.filter(email=username_or_email).first()

        # Se não encontrar por email, buscar por username
        if user is None:
            user = await User.filter(username=username_or_email).first()

        # Se o usuário não for encontrado (user é None)
        if user is None:
            # Retorna None para que a função de rota lide com o erro 404/401
            return None

        # Verifica a senha (user agora é o objeto com o atributo .password)
        if not verify_password(str(password), user.password):
            # Retorna None em vez de levantar exceção para manter consistência
            return None

        # Se a verificação for bem-sucedida, gera os tokens
        user_id_str = str(user.id)
        access_token = create_access_token(user_id_str)
        refresh_token = create_refresh_token(user_id_str)

        # Retorna o dicionário de resposta convertido para LoginResponse
        return LoginResponse(
            access_token=access_token,
            token_type='bearer',
            user_id=user.id,
            username=user.username,
            email=user.email,
            business_name=user.business_name,
            slog=user.business_slug
        )

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
