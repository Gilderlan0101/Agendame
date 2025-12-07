import hashlib
import os

from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

EMAIL_CONTEXT = CryptContext(
    schemes=[str(os.getenv('schemes_EMAIL'))],
    deprecated=os.getenv('DEPRECATED_EMAIL'),
)


def get_hashed_email(email: str) -> str:
    """get_hashed_email: Cria uma hash para emails antes de salva no banco"""
    return EMAIL_CONTEXT.hash(email)


def verify_email(email: str, hashed_email: str) -> bool:
    """verify_email: Verifica se o email passando no paramentro (email) comdiz com o email em formato de hash"""
    return EMAIL_CONTEXT.verify(email, hashed_email)


def create_email_search_hash(email: str) -> str:
    """Função para criar o hash SHA-256 determinístico."""
    return hashlib.sha256(email.lower().encode('utf-8')).hexdigest()
