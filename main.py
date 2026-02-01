import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

    # 🔒 Database shutdown
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
            lifespan=lifespan,
        )

        self.setup_static_files()
        self.setup_middlewares()
        self.setup_routes()

    # --------------------------------------------------

    def setup_static_files(self) -> None:
        """Configuração de arquivos estáticos"""

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

        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=['*'],
            allow_credentials=True,
            allow_methods=['*'],
            allow_headers=['*'],
        )

    # --------------------------------------------------

    def setup_routes(self) -> None:
        """
        Registro central de rotas.
        main.py não conhece rotas diretamente.
        """
        register_routes(self.app)

    # --------------------------------------------------

    def run(self, host: str = '0.0.0.0', port: int = 8000) -> None:
        uvicorn.run(
            'main:app',
            host=host,
            port=port,
            reload=os.getenv("ENVIRONMENT") == "DEVELOPMENT",
            workers=1,
        )



# ======================================================
# BOOTSTRAP
# ======================================================

server_instance = Server()
app = server_instance.app

if __name__ == '__main__':
    server_instance.run()
