from typing import Any, Dict

from fastapi import HTTPException, status

from app.models.user import User
from app.service.jwt.auth import get_hashed_password, verify_password
from app.utils.hashed_email import (
    create_email_search_hash,
    get_hashed_email,
    verify_email,
)


async def create_account(target):
    """create_account: Responsavel por cria cota para um usuario"""
    try:

        if not target:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Fill in all the fields.',
            )

        user = await User.filter(email=target.get('email')).exists()
        if user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='This email address is already registered.',
            )

        if isinstance(target, dict):

            await User.create(
                username=target.get('username'),
                email=target.get('email'),
                password=get_hashed_password(str(target.get('password'))),
                business_name=target.get('business_name'),
                business_type=target.get('business_type'),
                phone=target.get('phone'),
                whatsapp=target.get('whatsapp'),
                business_slug=target.get('business_slug'),
            )

            return {
                'username': target.get('username'),
                'email': target.get('email'),
                'status': True,
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Error  {}'.format(str(e)),
        )
