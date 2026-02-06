import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import AuthMiddleware
from app.database.init_database import (close_database, init_database,
                                        print_database_info)
from app.routes import router
from app.routes.router import register_routes

# ======================================================
# BASE PATHS
# ======================================================

BASE_DIR = Path(__file__).resolve().parent
static_dir = BASE_DIR / 'app' / 'static'


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
        # No seu main.py, modifique a função add_mime_type_header:
        @self.app.middleware('http')
        async def add_mime_type_header(request: Request, call_next):
            try:
                response = await call_next(request)

                path = request.url.path
                if path.endswith('.js'):
                    response.headers['Content-Type'] = 'text/javascript'
                elif path.endswith('.css'):
                    response.headers['Content-Type'] = 'text/css'
                elif path.endswith('.html'):
                    response.headers['Content-Type'] = 'text/html'

                return response

            except RuntimeError as e:
                if 'No response returned' in str(e):
                    # Isso acontece quando uma rota não retorna nada
                    print(f'⚠️  Rota {request.url.path} não retornou resposta')
                    return JSONResponse(
                        status_code=500,
                        content={
                            'detail': 'Erro interno: rota não retornou resposta'
                        },
                    )
                raise

    # --------------------------------------------------

    def setup_middlewares(self) -> None:
        """Configuração global de middlewares"""

        ORIGINS_DEFAULT = os.getenv('ORIGIN')
        # Middleware de CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                str(ORIGINS_DEFAULT),
            ],  # Em produção, especifique os domínios
            allow_credentials=True,
            allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
        async def validation_exception_handler(
            request: Request, exc: RequestValidationError
        ):
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={'detail': exc.errors(), 'body': exc.body},
            )

        from app.core.config import templates

        @self.app.exception_handler(404)
        async def not_found_exception_handler(
            request: Request, exc: Exception
        ):
            if request.url.path.startswith(
                '/api/'
            ) or request.url.path.startswith('/auth/'):
                print('API 404 Not Found')
                return templates.TemplateResponse(
                    '404.html', {'request': request}, status_code=404
                )

    # --------------------------------------------------

    def run(self, host: str = '0.0.0.0', port: int = 8000) -> None:
        """Inicia o servidor"""

        print(f"\n{'='*50}")
        print('🚀 Iniciando Agendame')
        print(f'📁 Diretório estático: {static_dir}')
        print(
            f"🌐 URL: http://{host if host != '0.0.0.0' else 'localhost'}:{port}"
        )
        print(f'📚 Documentação: http://localhost:{port}/docs')
        print(f"{'='*50}\n")

        uvicorn.run(
            'main:app',
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
