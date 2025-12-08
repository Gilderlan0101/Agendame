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

# Não é necessário mais imports aqui, pois a classe Server gerencia isso internamente.

# Deve apontar para /home/admin-lan/saas/Agendame
BASE_DIR = Path(__file__).resolve().parent
# Diretório de arquivos estáticos
static_dir = BASE_DIR / 'app' / 'static'


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... (código existente do lifespan) ...
    """Gerencia o ciclo de vinda da aplicação"""
    load_dotenv()

    await Tortoise.init(config=TORTOISE_ORM)
    await Tortoise.generate_schemas()
    print_database_info()

    yield

    await Tortoise.close_connections()


class Server:
    # ... (código existente da classe Server __init__ e setup_middlewares) ...
    """Serve: Class Responsavel por comfigura o servidor"""

    def __init__(self) -> None:

        self.app = FastAPI(
            title=f'Agendame',
            lifespan=lifespan,
        )

        self.app.mount(
            '/static', StaticFiles(directory=str(static_dir)), name='static'
        )

        self.setup_middlewares()
        self.start_routes()

    def setup_middlewares(self):
        # ... (código existente do setup_middlewares) ...
        """Configuração dos Middlewares, incluindo o CORS"""

        origins = ['*']

        # 2. Adicionar o Middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,  # True para permitir cookies/cabeçalhos de autorização
            # CORREÇÃO 1: O parâmetro correto é 'allow_methods' (no plural)
            allow_methods=[
                '*'
            ],  # Permite todos os métodos (GET, POST, PUT, DELETE, etc.)
            allow_headers=['*'],  # Permite todos os cabeçalhos
        )

    def start_routes(self):
        """
        start_routes: Responsavel por registra
        todas as rotas. Registre aqui.
        """

        from app.routes.login import router as login_api_router
        from app.routes.login import router_login as login_html_router

        # Inclui o roteador da API (POST /auth/login)
        self.app.include_router(login_api_router)

        # Inclui o roteador da página HTML (GET /)
        self.app.include_router(login_html_router)

        from app.routes.register import router as register

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
        from app.routes.agendame_company.remove_or_upgrad_service import router as remove_service
        self.app.include_router(remove_service)

    def run(self, host='0.0.0.0', port=8000):
        # ... (código existente do run) ...
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
