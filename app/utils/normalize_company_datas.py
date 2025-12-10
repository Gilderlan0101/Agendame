import re


def normalize_company_slug(slug: str) -> str:
    """
    Normaliza o slug da empresa.

    Args:
        slug: Slug da URL (ex: 'barbeariaDoPaulo')

    Returns:
        str: Slug normalizado (ex: 'barbeariadopaulo')
    """
    # Remove caracteres especiais e espaços
    slug = re.sub(r'[^\w]', '', slug)

    # Converte para minúsculas
    return slug.lower()
