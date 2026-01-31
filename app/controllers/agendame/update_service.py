from fastapi import HTTPException, status

from app.models.user import Service


async def update_one_service(service_id: int, user_id: int, data: dict):
    """
    Atualiza os dados de um serviço pertencente à empresa do usuário.
    """

    service = await Service.get_or_none(id=service_id, user_id=user_id)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Serviço não encontrado',
        )

    # Atualização dinâmica (só campos enviados)
    for field, value in data.items():
        if hasattr(service, field):
            setattr(service, field, value)

    await service.save()

    return {
        'status': 'success',
        'message': 'Serviço atualizado com sucesso',
        'service_id': service.id,
    }
