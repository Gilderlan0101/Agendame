import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from tortoise import Tortoise

from app.database.init_database import TORTOISE_ORM, print_database_info

# Deve apontar para /home/admin-lan/saas/Agendame
BASE_DIR = Path(__file__).resolve().parent
# Diretório de arquivos estáticos
static_dir = BASE_DIR / 'app' / 'static'


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vinda da aplicação"""
    load_dotenv()

    await Tortoise.init(config=TORTOISE_ORM)
    await Tortoise.generate_schemas()
    print_database_info()

    yield

    await Tortoise.close_connections()


class Server:
    """Serve: Class Responsavel por comfigura o servidor"""

    def __init__(self) -> None:

        self.app = FastAPI(
            title=f'Agendame',
            lifespan=lifespan,
        )

        # Configurar tipos MIME manualmente
        self.setup_static_files()

        self.setup_middlewares()
        self.start_routes()

    def setup_static_files(self):
        """Configura arquivos estáticos com tipos MIME corretos"""

        # Criar uma instância personalizada de StaticFiles
        static_files = StaticFiles(
            directory=str(static_dir), html=True, check_dir=True
        )

        # Montar os arquivos estáticos
        self.app.mount('/static', static_files, name='static')

        # Adicionar middleware para corrigir tipos MIME
        @self.app.middleware('http')
        async def add_mime_type_header(request: Request, call_next):
            response = await call_next(request)
            if request.url.path.endswith('.js'):
                response.headers['Content-Type'] = 'text/javascript'
            elif request.url.path.endswith('.css'):
                response.headers['Content-Type'] = 'text/css'
            elif request.url.path.endswith('.html'):
                response.headers['Content-Type'] = 'text/html'
            return response

    def setup_middlewares(self):
        """Configuração dos Middlewares, incluindo o CORS"""

        origins = ['*']

        # 2. Adicionar o Middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=['*'],
            allow_headers=['*'],
        )

    def start_routes(self):
        """
        start_routes: Responsavel por registra
        todas as rotas. Registre aqui.
        """

        from app.routes.auth.login import router as login_api_router
        from app.routes.auth.login import router_login as login_html_router

        # Inclui o roteador da API (POST /auth/login)
        self.app.include_router(login_api_router)

        # Inclui o roteador da página HTML (GET /)
        self.app.include_router(login_html_router)

        from app.routes.auth.register import router as register

        self.app.include_router(register)

        from app.routes.agendame.agendame_customers import router as agendame

        self.app.include_router(agendame)

        from app.routes.landpage import router as landpage_agandame

        self.app.include_router(landpage_agandame)

        from app.routes.agendame_company.register_services import \
            router as create_services

        self.app.include_router(create_services)

        # Lista todos os serviços da empresa do usuário logado.
        from app.routes.agendame_company.agendame_service import \
            router as adm_services

        self.app.include_router(adm_services)

        # remove um serviço da lista de serviços
        from app.routes.agendame_company.remove_or_upgrad_service import \
            router as remove_service

        self.app.include_router(remove_service)

        from app.routes.agendame_company.appointments import \
            router as appointments

        self.app.include_router(appointments)

    def run(self, host='0.0.0.0', port=8000):
        """run: Responsavel por inicia o servidor"""
        uvicorn.run(
            'main:app',
            host=host,
            port=port,
            workers=2,
            reload=True,
        )


server_instance = Server()
app = server_instance.app

if __name__ == '__main__':
    # Inicia o servidor usando o método run da classe Server
    server_instance.run()
