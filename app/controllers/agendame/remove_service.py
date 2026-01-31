from app.models.user import Service
from fastapi import HTTPException, status


async def remove_service(service_id: int, user_id: int):
    """
    Remove (ou desativa) um serviço pertencente à empresa do usuário.
    """

    service = await Service.get_or_none(id=service_id, user_id=user_id)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Serviço não encontrado',
        )

    # Soft delete (boa prática)
    service.is_active = False
    await service.save()

    return {
        'status': 'success',
        'message': 'Serviço removido com sucesso',
    }
