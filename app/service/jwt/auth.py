# auth_jwt.py

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Optional, Union
from zoneinfo import ZoneInfo

import bcrypt
from dotenv import load_dotenv
from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8
JWT_ALGORITHM = os.getenv('ALGORITHM')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
JWT_REFRESH_SECRET_KEY = os.getenv('JWT_REFRESH_SECRET_KEY')


PASSWORD_CONTEXT = CryptContext(
    schemes=[str(os.getenv('schemes_PASSWORD'))],
    deprecated=os.getenv('DEPRECATED_PASSWORD'),
)


# Instanciação do logger
logger = logging.getLogger(__name__)


def get_hashed_password(password: str) -> str:
    try:
        # Truncar para 72 bytes antes de fazer hash
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]

        # Usar bcrypt diretamente
        hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
        return hashed.decode('utf-8')
    except Exception as e:
        raise Exception(f'Error hashing password: {str(e)}')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha em plain-text corresponde ao hash.
    Precisa aplicar o mesmo truncamento da função de hash.
    """
    try:
        # Converter para bytes UTF-8
        password_bytes = plain_password.encode('utf-8')

        # APLICAR MESMO TRUNCAMENTO da função get_hashed_password
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]

        # Converter hash de volta para bytes se necessário
        if isinstance(hashed_password, str):
            hashed_bytes = hashed_password.encode('utf-8')
        else:
            hashed_bytes = hashed_password

        # Verificar com bcrypt
        return bcrypt.checkpw(password_bytes, hashed_bytes)

    except Exception as e:
        # Fallback para o passlib se bcrypt falhar
        try:
            return PASSWORD_CONTEXT.verify(plain_password, hashed_password)
        except:
            raise Exception(f'Error verifying password: {str(e)}')


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[int] = ACCESS_TOKEN_EXPIRE_MINUTES,
) -> str:
    """Cria um Access Token JWT assinado."""
    expire = (
        datetime.now(ZoneInfo('America/Sao_Paulo'))
        + timedelta(minutes=expires_delta)
        if expires_delta
        else datetime.now(ZoneInfo('America/Sao_Paulo'))
        + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode = {'exp': expire, 'sub': str(subject)}
    return jwt.encode(to_encode, str(JWT_SECRET_KEY), str(JWT_ALGORITHM))


def create_refresh_token(
    subject: Union[str, Any], expires_delta: Optional[int] = None
) -> str:
    """Cria um Refresh Token JWT assinado."""
    # OBSERVAÇÃO TÉCNICA: O tempo de expiração do Refresh Token (expires_delta)
    # deve ser definido usando a variável 'REFRESH_TOKEN_EXPIRE_MINUTES' do
    # config.py, caso contrário ele terá o mesmo tempo do Access Token.
    # Assumindo que o default (None) deve usar o ACCESS_TOKEN_EXPIRE_MINUTES
    # como fallback, mantive a lógica.

    # Se você tiver 'REFRESH_TOKEN_EXPIRE_MINUTES' no config.py, use-o aqui:
    # expire_minutes = REFRESH_TOKEN_EXPIRE_MINUTES if not expires_delta else expires_delta

    expire = (
        datetime.now(ZoneInfo('America/Sao_Paulo'))
        + timedelta(minutes=expires_delta)
        if expires_delta
        else datetime.now(ZoneInfo('America/Sao_Paulo'))
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )  # Considere trocar por REFRESH_TOKEN_EXPIRE_MINUTES
    )

    to_encode = {'exp': expire, 'sub': str(subject)}
    return jwt.encode(
        to_encode, str(JWT_REFRESH_SECRET_KEY), str(JWT_ALGORITHM)
    )


def verify_refresh_token(token: str) -> str:
    """Verifica a validade e expiração de um Refresh Token JWT."""
    try:
        logger.info('Validando refresh token JWT...')

        payload = jwt.decode(
            token, str(JWT_REFRESH_SECRET_KEY), algorithms=[str(JWT_ALGORITHM)]
        )

        employee_id: str = payload.get('sub')

        if employee_id is None:
            logger.warning(' [FAIL] Refresh token sem subject (sub)')
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Refresh token inválido',
            )

        logger.info(f'Refresh token válido para employee_id: {employee_id}')
        return employee_id

    except JWTError as e:
        logger.error(
            f' [FAIL] Erro JWT na verificação do refresh token: {str(e)}'
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Refresh token expirado ou inválido',
        )


def get_token_payload(token: str) -> dict:
    """Obtém o payload do token sem verificar a expiração (uso para logs/debugging)."""
    try:
        payload = jwt.decode(
            token,
            str(JWT_SECRET_KEY),
            algorithms=[str(JWT_ALGORITHM)],
            options={'verify_exp': False},
        )
        return payload
    except JWTError as e:
        logger.error(f'Erro ao decodificar payload do token: {str(e)}')
        return {}


def is_token_expiring_soon(token: str, minutes_before: int = 30) -> bool:
    """Verifica se o Access Token irá expirar em breve (dentro de `minutes_before`)."""
    try:
        payload = jwt.decode(
            token,
            str(JWT_SECRET_KEY),
            algorithms=[str(JWT_ALGORITHM)],
            options={'verify_exp': False},
        )

        exp_timestamp = payload.get('exp')
        if not exp_timestamp:
            return False

        exp_datetime = datetime.fromtimestamp(
            exp_timestamp, tz=ZoneInfo('America/Sao_Paulo')
        )
        now = datetime.now(ZoneInfo('America/Sao_Paulo'))

        time_until_expiry = exp_datetime - now
        minutes_until_expiry = time_until_expiry.total_seconds() / 60

        return minutes_until_expiry <= minutes_before

    except JWTError:
        return False
