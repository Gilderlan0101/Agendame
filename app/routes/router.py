from fastapi import FastAPI, Request

from app.core.config import templates


def register_routes(app: FastAPI) -> None:
    """
    Centraliza o registro de todas as rotas da aplicação.
    """
    # TEMPLATES

    #####################################################################
    from app.routes.templates.home import router as home_router

    app.include_router(home_router)
    #####################################################################

    # AUTH
    from app.routes.auth.login import router as login_api_router
    from app.routes.auth.login import router_login as login_html_router
    from app.routes.auth.register import router as register_router

    app.include_router(login_api_router)
    app.include_router(login_html_router)
    app.include_router(register_router)

    # LANDPAGE
    from app.routes.landpage import router as landpage_router

    app.include_router(landpage_router)

    # AGENDAME COMPANY
    from app.routes.agendame_company.agendame_service import (
        router as adm_services_router,
    )

    # from app.routes.agendame_company.remove_or_upgrad_service import (
    #     router as remove_service_router,
    from app.routes.agendame_company.appointments import (
        router as appointments_router,
    )
    from app.routes.agendame_company.info_company import router as info_company
    from app.routes.agendame_company.register_services import (
        router as create_services_router,
    )

    # DADOS QUE SÂO FORNECIDO PARA O USUARIO CLIENTE
    from app.routes.customers.public_services import router as public_routes

    app.include_router(create_services_router)
    app.include_router(adm_services_router)
    # Agendamento no salão
    app.include_router(appointments_router)
    app.include_router(info_company)

    # PARA CLIENTES
    app.include_router(public_routes)

    # Pagina de registro trial
    from app.routes.templates.register_trial import router as trial

    app.include_router(trial)

    # CHAT
    from app.routes.agendame import router as agendame_chat_router

    app.include_router(
        agendame_chat_router, prefix='', tags=['agendame_chat']
    )  # Adicionado aqui

    # Page trial
    from app.routes.templates.register_trial import router as trial_router

    app.include_router(trial_router)
