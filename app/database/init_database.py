# init_database.py - ATUALIZADO
import os
from typing import Any, Dict

from dotenv import load_dotenv
from tortoise import Tortoise
from tortoise.exceptions import ConfigurationError, DBConnectionError

load_dotenv()

DEFAULT_SQLITE_PATH = 'agendame.db'


def normalize_database_url(url: str) -> str:
    """Normaliza a URL do banco para compatibilidade com Tortoise ORM."""
    if url.startswith('postgresql://'):
        return url.replace('postgresql://', 'postgres://', 1)
    return url


def get_database_config() -> Dict[str, Any]:
    """Obtém configuração do banco com TODOS os modelos incluídos."""
    environment = os.getenv('ENVIRONMENT', 'DEVELOPMENT')

    if environment == 'PRODUCTION':
        print(' [OK] Usando configuração de PRODUÇÃO (PostgreSQL - Supabase)')
        raw_database_url = os.getenv('DATABASE_URL')

        if not raw_database_url:
            raise ValueError('[ERRO] DATABASE_URL não definido no .env')

        database_url = normalize_database_url(raw_database_url)
        conn_str = database_url
    else:
        print(' [OK] Usando configuração de DESENVOLVIMENTO (SQLite)')
        db_name = os.getenv('DB_NAME_DEV_LOCAL', DEFAULT_SQLITE_PATH)
        conn_str = f'sqlite://{db_name}'

    # AGORA INCLUA TODOS OS MODELOS
    return {
        'connections': {'default': conn_str},
        'apps': {
            'models': {
                'models': [
                    'app.models.user',
                    'app.models.trial',
                ],
                'default_connection': 'default',
            }
        },
        'use_tz': False,
        'timezone': 'UTC',
    }


TORTOISE_ORM = get_database_config()


async def init_database() -> bool:
    """Inicializa o banco de dados SEM criar schemas automaticamente."""
    print('🔧 Inicializando banco de dados...')

    try:
        await Tortoise.init(config=TORTOISE_ORM)
        print('[OK] Tortoise ORM inicializado')

        # Teste real de conexão
        conn = Tortoise.get_connection('default')
        await conn.execute_query('SELECT 1')
        print('[OK] Conexão verificada')

        # ⚠️ REMOVA ESTA LINHA - NÃO CRIE SCHEMAS AUTOMATICAMENTE
        # await Tortoise.generate_schemas()

        # Em vez disso, verifique se as tabelas existem
        await check_and_migrate_tables()

        print_database_info()
        return True

    except DBConnectionError as e:
        print(f'[ERRO] Falha de conexão com banco: {e}')
        return False
    except ConfigurationError as e:
        print(f'[ERRO] Erro de configuração ORM: {e}')
        return False
    except Exception as e:
        print(f'[ERRO] Erro inesperado: {e}')
        return False


async def check_and_migrate_tables():
    """Verifica e executa migrações necessárias."""
    conn = Tortoise.get_connection('default')

    # Verifica se a tabela clients existe
    try:
        # PostgreSQL
        if 'postgres' in TORTOISE_ORM['connections']['default']:
            result = await conn.execute_query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients')"
            )
            table_exists = result[0][0]
        else:
            # SQLite
            result = await conn.execute_query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='clients'"
            )
            table_exists = len(result) > 0

        if table_exists:
            print('[OK] Tabela clients já existe')
            # Verifica se a coluna trial_account_id existe
            if 'postgres' in TORTOISE_ORM['connections']['default']:
                result = await conn.execute_query(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='clients' AND column_name='trial_account_id'"
                )
                column_exists = len(result) > 0
            else:
                result = await conn.execute_query("PRAGMA table_info(clients)")
                column_exists = any(row[1] == 'trial_account_id' for row in result)

            if not column_exists:
                print('🔨 Adicionando coluna trial_account_id à tabela clients...')
                await add_trial_account_column(conn)
            else:
                print('[OK] Coluna trial_account_id já existe')
        else:
            print('⚠️ Tabela clients não existe. Criando...')
            # Cria a tabela do zero
            await Tortoise.generate_schemas()

    except Exception as e:
        print(f'[AVISO] Erro ao verificar tabelas: {e}')
        # Se der erro, tenta criar schemas
        try:
            await Tortoise.generate_schemas()
            print('[OK] Schemas criados do zero')
        except Exception as e2:
            print(f'[ERRO] Falha ao criar schemas: {e2}')
            raise


async def add_trial_account_column(conn):
    """Adiciona coluna trial_account_id à tabela clients."""
    if 'postgres' in TORTOISE_ORM['connections']['default']:
        # PostgreSQL
        await conn.execute_script("""
            ALTER TABLE clients
            ADD COLUMN trial_account_id INTEGER NULL,
            ADD CONSTRAINT fk_clients_trial
            FOREIGN KEY (trial_account_id) REFERENCES trial(id);

            CREATE INDEX IF NOT EXISTS idx_clients_trial_phone
            ON clients(trial_account_id, phone);
        """)
    else:
        # SQLite (mais complexo pois não suporta ADD COLUMN com FOREIGN KEY)
        await conn.execute_script("""
            PRAGMA foreign_keys=off;

            -- Criar nova tabela com a coluna adicional
            CREATE TABLE clients_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                trial_account_id INTEGER,
                full_name VARCHAR(200) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                total_appointments INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (trial_account_id) REFERENCES trial(id)
            );

            -- Copiar dados
            INSERT INTO clients_new
            (id, user_id, full_name, phone, total_appointments, is_active, created_at, updated_at)
            SELECT id, user_id, full_name, phone, total_appointments, is_active, created_at, updated_at
            FROM clients;

            -- Substituir tabela
            DROP TABLE clients;
            ALTER TABLE clients_new RENAME TO clients;

            -- Recriar índices
            CREATE INDEX idx_clients_user_phone ON clients(user_id, phone);
            CREATE INDEX idx_clients_trial_phone ON clients(trial_account_id, phone);

            PRAGMA foreign_keys=on;
        """)

    print('[OK] Coluna trial_account_id adicionada com sucesso')


async def close_database():
    try:
        await Tortoise.close_connections()
        print('[OK] Conexões fechadas')
    except Exception as e:
        print(f'[AVISO] Erro ao fechar conexões: {e}')


def print_database_info():
    conn = TORTOISE_ORM['connections']['default']

    print('-----------------------------------------')
    if isinstance(conn, str) and 'postgres' in conn:
        print('📦 Conectado a PostgreSQL (Supabase/Postgres)')
        # Extrai informações da URL
        if '@' in conn:
            host_part = conn.split('@')[1].split('/')[0]
            print(f'   - Host: {host_part}')
    else:
        print('📦 Conectado a SQLite')
        print(f'   - Arquivo: {conn}')

    print(f'   - Timezone: {TORTOISE_ORM.get("timezone")}')
    print('-----------------------------------------')
