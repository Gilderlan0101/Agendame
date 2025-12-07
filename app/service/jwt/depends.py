from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, ValidationError

from app.models.user import User
from app.service.jwt.jwt_decode_token import DecodeToken



OAUTH2_SCHEME = OAuth2PasswordBearer(
    tokenUrl='auth/login',
    scheme_name='JWT Bearer',
)




class SystemUser(BaseModel):
    id: int
    username: str
    email: EmailStr
    photo: Optional[str] = None
    status: bool = True

    model_config = {'from_attributes': True}


async def get_current_user(
    token: str = Depends(OAUTH2_SCHEME),
) -> SystemUser:

    token_data = DecodeToken(str(token))
    user_id:int = token_data.data.sub

    search_target_user = await User.get_or_none(id=user_id)

    if search_target_user:
        system_user_data = SystemUser(
            id=search_target_user.id,
            username=search_target_user.username,
            email=search_target_user.email,
        )

        return system_user_data

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail='Usuário não encontrado após validação do token.',
    )


