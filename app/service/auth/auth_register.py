from datetime import datetime, timedelta, timezone
from re import search
from typing import Any, Dict

from fastapi import HTTPException, status

from app.models.trial import TrialAccount
from app.models.user import User
from app.service.jwt.auth import get_hashed_password, verify_password
from app.utils.hashed_email import (create_email_search_hash, get_hashed_email,
                                    verify_email)


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
                'is_trial': True,
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Error  {}'.format(str(e)),
        )
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from typing import Dict, Any

class SignupFreeTrial:
    """
    Classe responsável por criar conta de sete dias grátis
    """

    def __init__(self, data: Dict[str, Any] | None) -> None:
        self.data = data
        self.test_mode = False  # Flag para ativar modo de teste
        self.test_days_remaining = 4  # Dias para simular no teste

    async def count_days_remaining(self, account_target_id) -> int:
        """
        count_days_remaining: Responsável por contar os dias restantes da conta de sete dias grátis

        Em modo de teste: retorna sempre 4 dias
        Em modo normal: faz o cálculo real
        """

        # MODO DE TESTE: Sempre retorna 4 dias
        if self.test_mode:
            return self.test_days_remaining

        # MODO NORMAL: Cálculo real
        search_account = await TrialAccount.filter(
            id=account_target_id
        ).first()

        if not search_account:
            return 0

        date_now = datetime.now(timezone.utc)
        subscription_end = search_account.subscription_end

        if date_now >= subscription_end:
            return 0

        delta = subscription_end - date_now
        return delta.days

    async def remove_account_after_trial(self, target_by_email: str) -> bool:
        """
        remove_account_after_trial: Responsável por remover conta após o período de sete dias grátis

        Em modo de teste: nunca remove (porque faltam 4 dias)
        Em modo normal: verifica data real
        """

        # MODO DE TESTE: Nunca remove porque faltam 4 dias
        if self.test_mode:
            return False

        try:
            account = await TrialAccount.filter(email=target_by_email).first()

            date_now = datetime.now(timezone.utc)

            if account and account.subscription_end:
                # DATA DE TESTE: 4 dias no futuro
                search_date = datetime.now(timezone.utc) + timedelta(days=4)

                if date_now > search_date.replace(tzinfo=timezone.utc):
                    await account.delete()
                    return True
                return False

            return False

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f'Error: {str(e)}',
            )

    # Método para ativar/desativar modo de teste
    def set_test_mode(self, enabled: bool = True, days_remaining: int = 4):
        """
        Ativa ou desativa o modo de teste
        Args:
            enabled: True para ativar modo de teste
            days_remaining: Dias a simular (padrão: 4)
        """
        self.test_mode = enabled
        self.test_days_remaining = days_remaining

    async def create(self):
        """signup_free_trial: Responsável por criar conta de sete dias grátis"""
        try:
            if not self.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail='Fill in all the fields.',
                )

            user = await TrialAccount.filter(
                email=self.data.get('email')
            ).exists()
            if user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail='This email address is already registered.',
                )

            if isinstance(self.data, dict):
                now_utc = datetime.now(timezone.utc)
                subscription_start = now_utc
                subscription_end = now_utc + timedelta(days=8)

                account = await TrialAccount.create(
                    username=self.data.get('username'),
                    email=self.data.get('email'),
                    password=get_hashed_password(
                        str(self.data.get('password'))
                    ),
                    business_name=self.data.get('business_name'),
                    business_type=self.data.get('business_type'),
                    phone=self.data.get('phone'),
                    whatsapp=self.data.get('whatsapp'),
                    business_slug=self.data.get('business_slug'),
                    subscription_start=subscription_start,
                    subscription_end=subscription_end,
                )

                # No modo de teste, retorna 4 dias mesmo para conta nova
                days = self.test_days_remaining if self.test_mode else await self.count_days_remaining(
                    account_target_id=account.id
                )

                return {
                    'username': self.data.get('username'),
                    'email': self.data.get('email'),
                    'days_remaining': days,
                    'status': True,
                    'is_trial': True,
                }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Error  {}'.format(str(e)),
            )
