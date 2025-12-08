from fastapi import APIRouter, Body, Depends, HTTPException, status
from app.service.jwt.depends import SystemUser, get_current_user
from app.controllers.agendame.remove_service import remove_service


router = APIRouter(tags=['Update or remove serivce'])

@router.put('/agendame/remove/service/{serviceID}')
async def remove_one_service(
	serviceID: int,
	current_user: SystemUser = Depends(get_current_user)
):
	"""Remove um serviço da lista de serviço da empresa"""
	try_remove = await remove_service(service_id=serviceID, company_id=current_user.id)
	return try_remove
