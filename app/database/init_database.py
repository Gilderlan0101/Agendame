import os
from typing import Any, Dict

from dotenv import load_dotenv
from tortoise import Tortoise
from tortoise.exceptions import ConfigurationError, DBConnectionError

load_dotenv()

# Caminho padrão para o arquivo SQLite local
DEFAULT_SQLITE_PATH = 'agendame.db'


def get_database_config() -> Dict[str, Any]:
    """
    Retorna a configuração do banco de dados baseada no ambiente.
    Usa SQLite para desenvolvimento e MySQL para produção.
    """
    environment = os.getenv('ENVIRONMENT', 'DEVELOPMENT')

    if environment == 'PRODUCTION':
        print(' [OK] Usando configuração de PRODUÇÃO (MySQL)')

        # Configuração MySQL
        db_user = os.getenv('DB_USER_PROD', 'root')
        db_pass = os.getenv('DB_PASSWORD_PROD', '')
        db_host = os.getenv('DB_HOST_PROD', 'localhost')
        db_port = os.getenv('DB_PORT_PROD', '3306')
        db_name = os.getenv('DB_NAME_PROD', 'agendame_prod')

        # URL de conexão MySQL
        db_url = f'mysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}'

        engine = 'tortoise.backends.mysql'

        # Verificar credenciais necessárias
        required_vars = [
            'DB_USER_PROD',
            'DB_PASSWORD_PROD',
            'DB_HOST_PROD',
            'DB_NAME_PROD',
        ]
        missing = [var for var in required_vars if not os.getenv(var)]

        if missing:
            print(
                f'[ERRO] Variáveis de ambiente faltando: {", ".join(missing)}'
            )
            raise ValueError(f'Variáveis de ambiente faltando: {missing}')

    else:  # DEVELOPMENT
        print(' [OK] Usando configuração de DESENVOLVIMENTO (SQLite)')

        # Configuração SQLite
        db_name = os.getenv('DB_NAME_DEV_LOCAL', DEFAULT_SQLITE_PATH)
        db_url = f'sqlite://{db_name}'
        engine = 'tortoise.backends.sqlite'

    return {
        'connections': {
            'default': {
                'engine': engine,
                'credentials': {'database': db_name}
                if environment == 'PRODUCTION'
                else {'file_path': db_name},
            }
        },
        'apps': {
            'models': {
                'models': [
                    'app.models.user',  # Especificar cada modelo individualmente
                    # Adicione outros modelos aqui quando criar:
                    # 'app.models.client',
                    # 'app.models.service',
                    # 'app.models.appointment',
                    # 'app.models.business_settings',
                ],
                'default_connection': 'default',
            }
        },
        'use_tz': False,
        'timezone': 'UTC',
    }


TORTOISE_ORM = get_database_config()


async def init_database() -> bool:
    """Inicializa o banco de dados com o Tortoise ORM."""

    engine_name = TORTOISE_ORM['connections']['default']['engine'].split('.')[
        -1
    ]
    db_type = 'MySQL' if engine_name == 'mysql' else 'SQLite'

    print(f'🔧 Inicializando banco de dados: {db_type} ({engine_name})')

    try:
        # Inicializar o Tortoise ORM
        await Tortoise.init(config=TORTOISE_ORM)
        print('[OK] Tortoise ORM inicializado')

        # Testar conexão
        await Tortoise.get_connection('default').execute_query('SELECT 1')
        print(f'[OK] Conexão com {db_type} verificada')

        # Criar tabelas
        await Tortoise.generate_schemas()
        print('[OK] Tabelas criadas/verificadas')

        print_database_info()
        return True

    except DBConnectionError as e:
        print(f'[ERRO] Falha ao conectar ao banco de dados: {e}')
        return False

    except ConfigurationError as e:
        print(f'[ERRO] Erro de configuração do Tortoise: {e}')
        return False

    except Exception as e:
        print(f'[ERRO] Erro inesperado: {e}')
        return False


async def close_database():
    """Fecha as conexões do banco de dados."""
    try:
        await Tortoise.close_connections()
        print('[OK] Conexões do banco fechadas')
    except Exception as e:
        print(f'[AVISO] Erro ao fechar conexões: {e}')


def print_database_info():
    """Exibe informações sobre a conexão do banco de dados."""
    conn_config = TORTOISE_ORM['connections']['default']
    creds = conn_config['credentials']
    engine_name = conn_config['engine'].split('.')[-1]
    db_type = 'MySQL' if engine_name == 'mysql' else 'SQLite'

    print('-----------------------------------------')

    if db_type == 'SQLite':
        print(f'📦 Conectado a SQLite:')
        print(f'   - Arquivo: {creds.get("file_path", "N/A")}')
    else:  # MySQL
        print(f'📦 Conectado a MySQL:')
        print(f'   - Banco: {creds.get("database", "N/A")}')

    print(f'   - Engine: {engine_name}')
    print(f'   - Timezone: {TORTOISE_ORM.get("timezone", "N/A")}')
    print('-----------------------------------------')
