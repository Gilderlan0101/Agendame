import hashlib
import os

from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

EMAIL_CONTEXT = CryptContext(
    schemes=[os.getenv("EMAIL_HASH_SCHEME", "bcrypt")],
    deprecated=os.getenv("EMAIL_HASH_DEPRECATED", "auto"),
)


def get_hashed_email(email: str) -> str:
    """Cria hash seguro do email para armazenamento"""
    return EMAIL_CONTEXT.hash(email)


def verify_email(email: str, hashed_email: str) -> bool:
    """Verifica se o email corresponde ao hash armazenado"""
    return EMAIL_CONTEXT.verify(email, hashed_email)


def create_email_search_hash(email: str) -> str:
    """
    Hash determinístico para busca/indexação (SHA-256).
    Não é para autenticação, apenas lookup.
    """
    return hashlib.sha256(email.lower().encode("utf-8")).hexdigest()
