# app/service/jwt/jwt_decode_token.py

import os
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

load_dotenv()

JWT_ALGORITHM = os.getenv('ALGORITHM')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')


class TokenPayload(BaseModel):
    sub: str  # Agora obrigatório, pois será o user_id
    exp: Optional[int] = None


class DecodeToken:
    def __init__(self, token: str):
        """Agora recebe o token diretamente, não mais via Depends"""

        self.data: Optional[TokenPayload] = None

        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Token não fornecido',
                headers={'WWW-Authenticate': 'Bearer'},
            )

        try:
            payload = jwt.decode(
                token, str(JWT_SECRET_KEY), algorithms=[str(JWT_ALGORITHM)]
            )
            self.data = TokenPayload(**payload)

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f'Token inválido: {str(e)}',
                headers={'WWW-Authenticate': 'Bearer'},
            )

        # Verificar expiração
        if (
            self.data.exp
            and datetime.fromtimestamp(self.data.exp) < datetime.now()
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Token expirado. Faça login novamente',
                headers={'WWW-Authenticate': 'Bearer'},
            )

    @property
    def user_id(self) -> int:
        """Retorna o ID do usuário como inteiro"""
        if self.data is None:
            raise RuntimeError('Dados do token não disponíveis.')
        return int(self.data.sub)

    @property
    def subject(self) -> str:
        """Retorna o subject do token"""
        if self.data is None:
            raise RuntimeError('Dados do token não disponíveis.')
        return self.data.sub
