from fastapi import APIRouter
import asyncio
from datetime import datetime, timedelta

# Define o tempo de início da aplicação
START_TIME = datetime.utcnow()

#health
router = APIRouter(tags=['Health'])
@router.get('/health', name='health_check')
async def health_check():
    """Endpoint de verificação de saúde da aplicação."""

    return {
        'status': 'ok',
        'message': 'Application is healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'keepalive': True
     }



# Adicione estas rotas ao seu arquivo de rotas

@router.get("/ping")
async def ping():
    """Endpoint simples para ping/keep-alive"""
    return {
        "status": "pong",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "agendame",
        "message": "Server is alive"
    }

@router.get("/keepalive")
async def keep_alive():
    """Endpoint específico para keep-alive"""
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": str(datetime.utcnow() - START_TIME)
    }

