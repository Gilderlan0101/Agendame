import os
from pathlib import Path
from urllib.parse import quote

from fastapi import Request, status
from fastapi.templating import Jinja2Templates


# ======================================================
class TemplatesConfig:
    """Configuração dos templates Jinja2 para FastAPI."""

    def __init__(self):
        # BASE_DIR é o diretório do projeto (Agendame/)
        self.BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        print(f'BASE_DIR: {self.BASE_DIR}')
        # Diretório de templates (dentro de app/)
        self.template_dir = f"{self.BASE_DIR}/templates"
        self.templates = Jinja2Templates(directory=str(self.template_dir))
        # Diretório de arquivos estáticos (dentro de app/)
        self.static_dir = f"{self.BASE_DIR}/static"
        # Verificar se o diretório static existe
        if not os.path.exists(self.static_dir):
            print(f'Aviso: Diretório static não encontrado: {self.static_dir}')
            # Criar o diretório se não existir
            os.mkdir(path=self.static_dir)
            print(f'Diretório static criado: {self.static_dir}')
########################################################################
templates_config = TemplatesConfig()
templates = templates_config.templates




from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware


# ======================================================
# MIDDLEWARE DE AUTENTICAÇÃO
# ======================================================
class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware para verificação de autenticação"""

    def __init__(self, app):
        super().__init__(app)

        # Rotas públicas que NÃO precisam de autenticação
        self.public_routes = {
            '/',  # Landpage
            '/login',  # Página de login HTML
            '/auth/agendame/trial',  # Página de trial
            '404.html',  # Página 404
            '/health',
            '/docs',
            '/redoc',
            '/openapi.json',
            '/favicon.ico',
        }

        # APIs públicas (não redirecionam, retornam JSON)
        self.public_api_routes = {
            '/auth/login',  # API de login (POST)
            '/auth/register',  # API de registro
            '/auth/signup/free-trial',  # API de trial
        }

        # Prefixos de rotas públicas
        self.public_prefixes = [
            '/static/',
            '/docs',
            '/redoc',
            '/openapi',
            '/favicon.ico',
        ]

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        print(f"\n=== MIDDLEWARE: {method} {path} ===")

        # Verifica se é uma rota pública
        if self._is_public_route(path, method):
            print(f"✓ Rota pública: {path}")
            return await call_next(request)

        print(f"✗ Rota protegida: {path}")

        # Verifica autenticação
        auth_result = await self._check_authentication(request)

        if auth_result.get('authenticated'):
            # Usuário autenticado
            print(f"✓ Usuário autenticado: {auth_result.get('user')}")
            request.state.user = auth_result.get('user')
            return await call_next(request)
        else:
            # Usuário não autenticado
            print(f"✗ Não autenticado: {auth_result.get('error')}")
            return await self._handle_unauthenticated(request, auth_result.get('error'))

    def _is_public_route(self, path: str, method: str = "GET") -> bool:
        """Verifica se a rota é pública"""

        # 1. Verifica match exato em rotas públicas
        if path in self.public_routes:
            return True

        # 2. Verifica APIs públicas (para métodos específicos)
        if path in self.public_api_routes:
            # API de login: só é pública para POST
            if path == '/auth/login':
                return method == 'POST'
            # Demais APIs são públicas para todos os métodos
            return True

        # 3. Verifica prefixos públicos
        for prefix in self.public_prefixes:
            if path.startswith(prefix):
                return True

        # 4. Páginas de agendamento público
        if path.startswith('/agendame/') and not path.startswith('/agendame/dashboard'):
            # Verifica se é uma página de empresa ou agendamento público
            parts = path.split('/')
            if len(parts) >= 3:
                # Exemplos públicos: /agendame/nome-empresa
                # Exemplos privados: /agendame/dashboard, /agendame/services
                if parts[2] not in ['dashboard', 'services', 'appointments', 'clients']:
                    return True

        # 5. Rotas curtas de empresas (ex: /nome-empresa)
        if len(path.split('/')) == 2 and path != '/':
            # Exemplo: /corte-supremo
            return True

        return False

    async def _check_authentication(self, request: Request) -> dict:
        """Verifica se o usuário está autenticado"""

        access_token = request.cookies.get('access_token')

        if not access_token:
            # Tentar obter do header Authorization
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                access_token = auth_header.split(' ')[1]

        if not access_token:
            return {'authenticated': False, 'error': 'Acesso negado.'}

        print(f"Token encontrado: {access_token[:20]}...")

        try:
            from app.service.jwt.jwt_decode_token import DecodeToken

            # Tenta decodificar o token
            decoded_data = DecodeToken(access_token)

            if decoded_data:
                return {'authenticated': True, 'user': decoded_data}
            else:
                return {'authenticated': False, 'error': 'Token inválido.'}

        except Exception as e:
            print(f"Erro ao verificar token: {e}")
            return {'authenticated': False, 'error': 'Erro de autenticação'}


    async def call_next(self, request: Request):
        """
        Chama o próximo middleware ou rota.
        Este método é útil quando você precisa continuar o processamento
        após alguma lógica no middleware.
        """
        # Cria uma função call_next que será passada para o próximo handler
        async def inner_call_next(req):
            # Simula a chamada ao próximo handler na cadeia
            # Na prática, você precisaria do call_next original do dispatch
            pass

        # Se estamos lidando com uma rota pública que não requer autenticação,
        # podemos mostrar a página normalmente
        if request.url.path == '/login' or request.url.path.startswith('/agendame/trial'):
            print(f"Mostrando página pública: {request.url.path}")

            # Para retornar a página de login, você precisa renderizar o template
            from pathlib import Path

            from fastapi.templating import Jinja2Templates

            BASE_DIR = Path(__file__).resolve().parent.parent
            template_dir = BASE_DIR / 'app' / 'templates'
            templates = Jinja2Templates(directory=str(template_dir))

            # Extrai parâmetros da query string
            error = request.query_params.get('error')
            next_url = request.query_params.get('next', '/agendame/dashboard')
            success = request.query_params.get('success')

            # Renderiza o template de login
            from fastapi.requests import Request as FastAPIRequest
            from fastapi.responses import HTMLResponse

            # Converte o Request do Starlette para contexto do template
            context = {
                "request": request,
                "error": error,
                "success": success,
                "next_url": next_url
            }

            content = templates.get_template('login.html').render(context)
            return HTMLResponse(content=content)

        # Se não for uma rota de login/trial, não deveríamos chegar aqui
        # pois essas rotas são públicas e são tratadas no dispatch
        print(f"ERRO: call_next chamado para rota não pública: {request.url.path}")

        # Fallback: redireciona para login
        return RedirectResponse(
            url=f'/login?next={quote(request.url.path, safe="")}',
            status_code=status.HTTP_303_SEE_OTHER
        )


    async def _handle_unauthenticated(self, request: Request, error: str = None):
        """Lida com requisições não autenticadas"""

        path = request.url.path

        print(f"Tratando requisição não autenticada para: {path}")

        # Se for uma API (começa com /api/ ou /auth/ e NÃO é login), retorna JSON
        if (path.startswith('/api/') or
            (path.startswith('/auth/') and path != '/auth/login') or
            path.startswith('/agendame/api/')):

            print("Retornando erro JSON para API")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    'detail': 'Não autenticado',
                    'error': error or 'Acesso negado.',
                },
            )

        # Se já estiver na página de login, mostra a página
        if path == '/login' or path.startswith('/agendame/trial'):
            print("Já está em rota pública de login/trial")
            return await self.call_next(request)

        # Para rotas web, redireciona para login
        next_url = quote(path, safe='')
        redirect_url = f'/login?next={next_url}'

        if error:
            redirect_url += f'&error={quote(error)}'

        print(f"Redirecionando para: {redirect_url}")

        return RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_303_SEE_OTHER
        )
