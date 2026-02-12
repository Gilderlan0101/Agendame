# 📁 **app/database/init_database.py - Sistema de Configuração e Conexão com Banco de Dados**

## 🎯 **Visão Geral do Módulo**

Módulo responsável por toda a **configuração, inicialização e gerenciamento de conexões** com o banco de dados do sistema Agendame. Suporta dois ambientes distintos:

| Ambiente | Banco | Uso |
|----------|-------|-----|
| **PRODUCTION** | PostgreSQL (Supabase) | Produção real |
| **DEVELOPMENT** | SQLite | Desenvolvimento local |

---

## 📦 **Estrutura do Arquivo**

```
init_database.py
├── Constantes e Configurações
├── Funções Utilitárias
├── Configuração do Tortoise ORM
├── Inicialização do Banco
└── Gerenciamento de Conexões
```

---

## 🛠️ **Funções e Responsabilidades**

### **1. `normalize_database_url(url: str) -> str`**

**Descrição:**
Normaliza a URL do banco para compatibilidade com Tortoise ORM.

**Problema resolvido:**
O Tortoise ORM **não aceita** `postgresql://` como prefixo, apenas `postgres://`. Esta função faz a substituição automaticamente.

**Exemplo:**
```python
# Entrada
url = "postgresql://user:pass@host:5432/db"

# Saída
"postgres://user:pass@host:5432/db"
```

---

### **2. `get_database_config() -> Dict[str, Any]`**

**Descrição:**
Função central que retorna a configuração completa do Tortoise ORM baseada na variável de ambiente `ENVIRONMENT`.

**Fluxo de decisão:**

```
ENVIRONMENT = 'PRODUCTION'?
        ↓
    ┌───┴───┐
    Sim     Não
    ↓       ↓
PostgreSQL  SQLite
(Supabase)  (Local)
```

**Configuração de PRODUÇÃO:**
```python
{
    'connections': {
        'default': 'postgres://...'  # URL normalizada
    },
    'apps': {
        'models': {
            'models': [
                'app.models.user',
                'app.models.trial',
                # Outros models...
            ]
        }
    }
}
```

**Configuração de DESENVOLVIMENTO:**
```python
{
    'connections': {
        'default': 'sqlite://agendame.db'  # Ou DB_NAME_DEV_LOCAL
    },
    'apps': {
        'models': {
            'models': [
                'app.models.user',
                'app.models.trial',
            ]
        }
    }
}
```

**Variáveis de ambiente utilizadas:**

| Variável | Ambiente | Padrão | Obrigatória |
|----------|----------|--------|-------------|
| `ENVIRONMENT` | Ambos | `DEVELOPMENT` | Não |
| `DATABASE_URL` | PRODUCTION | - | **SIM** |
| `DB_NAME_DEV_LOCAL` | DEVELOPMENT | `agendame.db` | Não |

---

### **3. `init_database() -> bool`**

**Descrição:**
Função **assíncrona** que inicializa completamente o banco de dados.

**Etapas de inicialização:**

```
1. Tortoise.init(config)
   ↓
2. Teste de conexão (SELECT 1)
   ↓
3. Tortoise.generate_schemas()
   ↓
4. print_database_info()
   ↓
5. Retorna True/False
```

**Tratamento de erros:**

| Exceção | Causa | Ação |
|---------|-------|------|
| `DBConnectionError` | Falha de rede, credenciais inválidas | Log + return False |
| `ConfigurationError` | Configuração mal formatada | Log + return False |
| `Exception` | Qualquer outro erro | Log + return False |

**Exemplo de uso:**
```python
from app.database.init_database import init_database, close_database

async def startup():
    success = await init_database()
    if not success:
        print("❌ Falha crítica no banco de dados")
        sys.exit(1)

async def shutdown():
    await close_database()
```

---

### **4. `close_database()`**

**Descrição:**
Fecha todas as conexões ativas do Tortoise ORM de forma segura.

**Comportamento:**
- Tenta fechar todas as conexões
- Log de sucesso ou erro (não lança exceções)
- Deve ser chamado no shutdown da aplicação

---

### **5. `print_database_info()`**

**Descrição:**
Função utilitária de logging que exibe informações detalhadas sobre a conexão atual.

**Saída exemplo (SQLite):**
```
-----------------------------------------
📦 Conectado a SQLite
   - Arquivo: sqlite://agendame.db
   - Timezone: UTC
-----------------------------------------
```

**Saída exemplo (PostgreSQL):**
```
-----------------------------------------
📦 Conectado a PostgreSQL (Supabase)
   - Host: db.xxxxx.supabase.co
   - Timezone: UTC
-----------------------------------------
```

---

## 🔧 **Constante Global: `TORTOISE_ORM`**

```python
TORTOISE_ORM = get_database_config()
```

Esta constante é exportada e pode ser utilizada por outros módulos que precisem acessar a configuração do ORM.

**Uso em migrações Aerich:**
```python
# aerich.ini
[tool:aerich]
tortoise_orm = "app.database.init_database:TORTOISE_ORM"
```

---

## 🔄 **Fluxo Completo de Inicialização**

```
Application Startup
    ↓
load_dotenv()  ← Carrega .env
    ↓
get_database_config()  ← Lê ENVIRONMENT
    ↓
    ├── PRODUCTION? → Usa PostgreSQL
    └── DEVELOPMENT? → Usa SQLite
    ↓
init_database()
    ↓
    ├── Tortoise.init(config)  ← Configura ORM
    ├── Testa conexão (SELECT 1)  ← Valida credenciais
    ├── generate_schemas()  ← Cria tabelas se não existirem
    └── Retorna status
    ↓
Application Ready
```

---

## 🧪 **Exemplos de Uso no Sistema**

### **1. Em main.py (FastAPI)**
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database.init_database import init_database, close_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_database()
    yield
    # Shutdown
    await close_database()

app = FastAPI(lifespan=lifespan)
```

### **2. Em scripts de migração**
```python
from app.database.init_database import TORTOISE_ORM
import json

# Exportar config para Aerich
with open('tortoise_config.json', 'w') as f:
    json.dump(TORTOISE_ORM, f, indent=2)
```

---

## ⚠️ **Validações e Segurança**

### **Produção (PostgreSQL/Supabase):**
✅ Valida se `DATABASE_URL` está definido
✅ Normaliza URL automaticamente
✅ Testa conexão com `SELECT 1`
✅ Timezone configurado como UTC

### **Desenvolvimento (SQLite):**
✅ Fallback para `agendame.db` se `DB_NAME_DEV_LOCAL` não definido
✅ Sem necessidade de autenticação
✅ Ideal para testes locais

---

## 🐛 **Tratamento de Erros Comuns**

| Erro | Causa Provável | Solução |
|------|----------------|---------|
| `ValueError: DATABASE_URL não definido` | .env sem DATABASE_URL em produção | Adicionar variável ao .env |
| `DBConnectionError` | Supabase offline ou rede instável | Verificar status do Supabase |
| `ConfigurationError` | URL mal formatada | Verificar sintaxe da conexão |
| Tabelas não criadas | Models não listados | Adicionar ao array 'models' |

---

## 📌 **Boas Práticas Implementadas**

1. **Separação de ambientes** - Produção ≠ Desenvolvimento
2. **Teste real de conexão** - Não confia apenas no init()
3. **Fallback seguro** - SQLite padrão se não configurado
4. **Logs descritivos** - Mensagens claras para debug
5. **Graceful shutdown** - Fecha conexões corretamente
6. **Compatibilidade** - Normaliza URLs automaticamente

---

## 🚀 **Exemplo de Configuração .env**

```env
# Ambiente: PRODUCTION ou DEVELOPMENT
ENVIRONMENT=PRODUCTION

# Produção - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Desenvolvimento - SQLite (opcional)
DB_NAME_DEV_LOCAL=meu_banco_local.db
```

---

## 📊 **Resumo das Responsabilidades**

| Responsabilidade | Implementada em |
|-----------------|-----------------|
| Configuração ORM | `get_database_config()` |
| Inicialização | `init_database()` |
| Encerramento | `close_database()` |
| Normalização de URL | `normalize_database_url()` |
| Diagnóstico | `print_database_info()` |
| Exportação de config | `TORTOISE_ORM` |

---

## 🔮 **Melhorias Futuras Sugeridas**

```python
# 1. Pool de conexões configurável
'connections': {
    'default': {
        'engine': 'tortoise.backends.asyncpg',
        'credentials': {
            'database': 'postgres',
            'host': '...',
            'password': '...',
            'port': 5432,
            'user': '...',
            'min_size': 5,
            'max_size': 20,
        }
    }
}

# 2. Múltiplos bancos (leitura/escrita)
# 3. Suporte a MySQL/MariaDB
# 4. Retry automático em falha de conexão
# 5. Métricas e monitoramento
```

---

**📌 Nota Final:** Este módulo é **crítico para o funcionamento do sistema**. Qualquer falha aqui impede completamente a aplicação de operar. Mantenha as variáveis de ambiente sempre atualizadas e monitore os logs de inicialização.
