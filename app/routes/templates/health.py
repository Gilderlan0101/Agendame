from fastapi import APIRouter

#health
router = APIRouter(tags=['Health'])
@router.get('/health', name='health_check')
async def health_check():
    """Endpoint de verificação de saúde da aplicação."""
    return {'status': 'ok', 'message': 'Application is healthy'}

