import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.database.init_database import (
    close_database,
    init_database,
    print_database_info,
)
from app.routes.router import register_routes

# ======================================================
# BASE PATHS
# ======================================================

BASE_DIR = Path(__file__).resolve().parent
static_dir = BASE_DIR / 'app' / 'static'

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
        if request.url.path == '/login' or request.url.path.startswith('/auth/agendame/trial'):
            print(f"Mostrando página pública: {request.url.path}")

            # Para retornar a página de login, você precisa renderizar o template
            from fastapi.templating import Jinja2Templates
            from pathlib import Path

            BASE_DIR = Path(__file__).resolve().parent.parent
            template_dir = BASE_DIR / 'app' / 'templates'
            templates = Jinja2Templates(directory=str(template_dir))

            # Extrai parâmetros da query string
            error = request.query_params.get('error')
            next_url = request.query_params.get('next', '/agendame/dashboard')
            success = request.query_params.get('success')

            # Renderiza o template de login
            from fastapi.responses import HTMLResponse
            from fastapi.requests import Request as FastAPIRequest

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
        if path == '/login' or path.startswith('/auth/agendame/trial'):
            print("Já está em rota pública de login/trial")
            return await call_next(request)

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


# ======================================================
# LIFESPAN (STARTUP / SHUTDOWN)
# ======================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação (startup/shutdown)"""

    load_dotenv()

    # Database startup
    ok = await init_database()
    if not ok:
        raise RuntimeError('Falha ao inicializar o banco de dados')

    print_database_info()

    yield

    # Database shutdown
    await close_database()


# ======================================================
# SERVER CLASS
# ======================================================


class Server:
    """
    Responsável por:
    - criar a instância do FastAPI
    - configurar middlewares
    - configurar arquivos estáticos
    - registrar rotas
    - iniciar o servidor
    """

    def __init__(self) -> None:
        self.app = FastAPI(
            title='Agendame',
            description='Sistema de agendamento para salões e serviços',
            version='1.0.0',
            lifespan=lifespan,
            docs_url='/docs',
            redoc_url='/redoc',
        )

        self.setup_static_files()
        self.setup_middlewares()
        self.setup_routes()
        self.setup_exception_handlers()

    # --------------------------------------------------

    def setup_static_files(self) -> None:
        """Configuração de arquivos estáticos"""

        if not static_dir.exists():
            print(f'Aviso: Diretório static não encontrado: {static_dir}')
            static_dir.mkdir(parents=True, exist_ok=True)
            print(f'Diretório static criado: {static_dir}')

        static_files = StaticFiles(
            directory=str(static_dir),
            html=True,
            check_dir=True,
        )

        self.app.mount('/static', static_files, name='static')

        # Middleware para MIME types
        @self.app.middleware('http')
        async def add_mime_type_header(request: Request, call_next):
            response = await call_next(request)

            path = request.url.path
            if path.endswith('.js'):
                response.headers['Content-Type'] = 'text/javascript'
            elif path.endswith('.css'):
                response.headers['Content-Type'] = 'text/css'
            elif path.endswith('.html'):
                response.headers['Content-Type'] = 'text/html'

            return response

    # --------------------------------------------------

    def setup_middlewares(self) -> None:
        """Configuração global de middlewares"""

        # Middleware de CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=['http://127.0.0.1:8000/'],  # Em produção, especifique os domínios
            allow_credentials=True,
            allow_methods=['*'],
            allow_headers=['*'],
        )

        # Middleware de autenticação
        self.app.add_middleware(AuthMiddleware)

    # --------------------------------------------------

    def setup_routes(self) -> None:
        """
        Registro central de rotas.
        """
        register_routes(self.app)

    # --------------------------------------------------

    def setup_exception_handlers(self) -> None:
        """Configura handlers de exceção global"""

        from fastapi.exceptions import RequestValidationError
        from fastapi.responses import JSONResponse

        @self.app.exception_handler(RequestValidationError)
        async def validation_exception_handler(request: Request, exc: RequestValidationError):
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"detail": exc.errors(), "body": exc.body},
            )

        @self.app.exception_handler(404)
        async def not_found_exception_handler(request: Request, exc):
            if request.url.path.startswith('/api/'):
                return JSONResponse(
                    status_code=404,
                    content={"detail": "Endpoint não encontrado"},
                )
            # Para rotas web, pode redirecionar para uma página 404 personalizada
            from fastapi.templating import Jinja2Templates
            template_dir = BASE_DIR / 'app' / 'templates'
            templates = Jinja2Templates(directory=str(template_dir))
            return templates.TemplateResponse(
                '404.html',
                {'request': request},
                status_code=404
            )

    # --------------------------------------------------

    def run(self, host: str = '0.0.0.0', port: int = 8000) -> None:
        """Inicia o servidor"""

        print(f"\n{'='*50}")
        print("🚀 Iniciando Agendame")
        print(f"📁 Diretório estático: {static_dir}")
        print(f"🌐 URL: http://{host if host != '0.0.0.0' else 'localhost'}:{port}")
        print(f"📚 Documentação: http://localhost:{port}/docs")
        print(f"{'='*50}\n")

        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=os.getenv('ENVIRONMENT', 'DEVELOPMENT') == 'DEVELOPMENT',
            workers=1,
        )


# ======================================================
# BOOTSTRAP
# ======================================================

server_instance = Server()
app = server_instance.app

if __name__ == '__main__':
    server_instance.run()
