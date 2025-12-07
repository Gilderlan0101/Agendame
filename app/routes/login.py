from fastapi import (APIRouter, Depends, HTTPException, Request, dependencies,
                     status)
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates

from app.controllers.auth_login import checking_account
from app.schemas.auth.schemas_login import LoginResponse

router = APIRouter(tags=['Autenticação'], prefix='/auth')


@router.post(
    '/login', response_model=LoginResponse, status_code=status.HTTP_200_OK
)
async def login(target: OAuth2PasswordRequestForm = Depends()):
    """Rota responsável por autenticar um usuário se o mesmo tiver uma conta."""

    # 1. Chame a função de serviço com os dados de login.
    #    A função checking_account agora retorna um dict (sucesso) ou None (falha).
    verify_auth = await checking_account(
        target={'email': target.username, 'password': target.password}
    )

    # 2. Se a autenticação falhar (retornou None), levante exceção HTTP.
    #    Isto é crucial para tratar o caso de "usuário não encontrado" ou "senha incorreta"
    #    que não são tratadas com HTTPException dentro de checking_account.
    if verify_auth is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,  # Mudamos para 401 (Não Autorizado)
            detail='Credenciais inválidas. Verifique seu e-mail e senha.',
        )

    # 3. Se a autenticação for bem-sucedida, retorne o dicionário/objeto de resposta.
    return verify_auth
