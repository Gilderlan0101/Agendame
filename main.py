import os
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from tortoise import Tortoise

from app.database.init_database import TORTOISE_ORM, print_database_info

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

        self.setup_middlewares()
        self.start_routes()

    def setup_middlewares(self):
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

        from app.routes.login import router as login
        self.app.include_router(login)

        from app.routes.register import router as register
        self.app.include_router(register)

        from app.routes.agendame.agendame_customers import router as agendame
        self.app.include_router(agendame)


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
