import os
from typing import Any, Dict
from dotenv import load_dotenv
from tortoise import Tortoise
from tortoise.exceptions import ConfigurationError, DBConnectionError

load_dotenv()

DEFAULT_SQLITE_PATH = "agendame.db"


def get_database_config() -> Dict[str, Any]:
    environment = os.getenv("ENVIRONMENT", "DEVELOPMENT")

    # =========================
    # PRODUÇÃO (Supabase/Postgres)
    # =========================
    if environment == "PRODUCTION":
        print(" [OK] Usando configuração de PRODUÇÃO (PostgreSQL - Supabase)")

        database_url = os.getenv("DATABASE_URL")

        if not database_url:
            raise ValueError("[ERRO] DATABASE_URL não definido no .env")

        return {
            "connections": {
                "default": database_url
            },
            "apps": {
                "models": {
                    "models": [
                        "app.models.user",
                        # futuros:
                        # "app.models.client",
                        # "app.models.service",
                        # "app.models.appointment",
                    ],
                    "default_connection": "default",
                }
            },
            "use_tz": False,
            "timezone": "UTC",
        }

    # =========================
    # DESENVOLVIMENTO (SQLite)
    # =========================
    print(" [OK] Usando configuração de DESENVOLVIMENTO (SQLite)")

    db_name = os.getenv("DB_NAME_DEV_LOCAL", DEFAULT_SQLITE_PATH)

    return {
        "connections": {
            "default": f"sqlite://{db_name}"
        },
        "apps": {
            "models": {
                "models": [
                    "app.models.user",
                ],
                "default_connection": "default",
            }
        },
        "use_tz": False,
        "timezone": "UTC",
    }


TORTOISE_ORM = get_database_config()


async def init_database() -> bool:
    print("🔧 Inicializando banco de dados...")

    try:
        await Tortoise.init(config=TORTOISE_ORM)
        print("[OK] Tortoise ORM inicializado")

        # Teste de conexão real
        conn = Tortoise.get_connection("default")
        await conn.execute_query("SELECT 1")
        print("[OK] Conexão verificada")

        # Criação automática de tabelas
        await Tortoise.generate_schemas()
        print("[OK] Tabelas criadas/verificadas")

        print_database_info()
        return True

    except DBConnectionError as e:
        print(f"[ERRO] Falha de conexão: {e}")
        return False

    except ConfigurationError as e:
        print(f"[ERRO] Erro de configuração: {e}")
        return False

    except Exception as e:
        print(f"[ERRO] Erro inesperado: {e}")
        return False


async def close_database():
    try:
        await Tortoise.close_connections()
        print("[OK] Conexões fechadas")
    except Exception as e:
        print(f"[AVISO] Erro ao fechar conexões: {e}")


def print_database_info():
    conn = TORTOISE_ORM["connections"]["default"]

    print("-----------------------------------------")
    if isinstance(conn, str) and conn.startswith("postgres"):
        print("📦 Conectado a PostgreSQL (Supabase)")
        print(f"   - URL: {conn.split('@')[1].split('/')[0]}")
    else:
        print("📦 Conectado a SQLite")
        print(f"   - Arquivo: {conn}")

    print(f"   - Timezone: {TORTOISE_ORM.get('timezone')}")
    print("-----------------------------------------")
