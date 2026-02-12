# 📁 **Estrutura Completa do Módulo `app/` - Agendame**

## 🗺️ **Visão Geral da Arquitetura**

```
app/ ── 📦 Núcleo da aplicação
├── controllers/     # 🧠 DOMÍNIO - Regras de negócio PURAS
├── core/           # ⚙️ CONFIGURAÇÕES - Middlewares e templates
├── database/       # 💾 BANCO - Configuração e conexão
├── models/         # 📊 ORM - Modelos do banco de dados
├── routes/         # 🚪 API - Endpoints HTTP
├── schemas/        # 📐 VALIDAÇÃO - Pydantic models
├── service/        # 🔧 SERVIÇOS - Lógica auxiliar
├── static/         # 🎨 FRONTEND - CSS, JS, imagens
├── templates/      # 🖼️ HTML - Jinja2 templates
└── utils/          # 🧰 UTILITÁRIOS - Funções auxiliares
```

---

# 📂 **1. controllers/ - Camada de Domínio (Regras de Negócio)**

## 🎯 **Propósito**
A camada mais importante do sistema. Contém **toda a lógica de negócio** pura, sem dependência de HTTP ou apresentação.

## 📁 **Submódulos**

### **1.1 `controllers/agendame/` - Core do Sistema de Agendamento**
```
agendame/
├── appointments.py     # 📅 Lógica de agendamentos e disponibilidade
├── services.py         # 💇‍♂️ CRUD de serviços, clientes e dashboard
├── remove_service.py   # 🗑️ Remoção de serviços (função auxiliar)
├── update_service.py   # ✏️ Atualização de serviços (função auxiliar)
└── __init__.py         # 🧩 Exportação pública
```

**Responsabilidades:**
- ✅ Cálculo de horários disponíveis
- ✅ Criação e gerenciamento de agendamentos
- ✅ CRUD completo de serviços
- ✅ Gestão de clientes e histórico
- ✅ Estatísticas do dashboard
- ✅ Suporte a **User** e **TrialAccount**

### **1.2 `controllers/company/` - Abstração de Empresa**
```
company/
├── company_data.py    # 🏢 Classe MyCompany (representação em memória)
├── __init__.py        # 🧩 Exportação pública
└── README.md          # 📘 Documentação
```

**Responsabilidades:**
- ✅ Unifica acesso a `User` e `TrialAccount`
- ✅ Factory method `MyCompany.create()`
- ✅ Métodos de acesso a dados (slug, nome, telefone, etc)
- ✅ Geração de URL pública

---

# ⚙️ **2. core/ - Configurações Centrais**

## 🎯 **Propósito**
Configurações globais da aplicação, middlewares e utilitários de infraestrutura.

## 📁 **Estrutura**
```
core/
├── config.py          # ⚙️ TemplatesConfig + AuthMiddleware
├── __init__.py        # 🧩 Exportação (templates, middleware)
└── README.md          # 📘 Documentação
```

**Responsabilidades:**
- ✅ `TemplatesConfig`: Configura Jinja2 e diretórios estáticos
- ✅ `AuthMiddleware`: Intercepta requisições e valida autenticação
- ✅ Controle de rotas públicas vs privadas
- ✅ Validação de hosts em produção
- ✅ Headers de segurança

---

# 💾 **3. database/ - Configuração de Banco de Dados**

## 🎯 **Propósito**
Configuração e inicialização do Tortoise ORM, suporte a múltiplos ambientes.

## 📁 **Estrutura**
```
database/
├── init_database.py   # 🔧 Configuração e inicialização do ORM
├── __init__.py        # 🧩 Exportação pública
└── README.md          # 📘 Documentação
```

**Responsabilidades:**
- ✅ Configuração automática por ambiente (DEVELOPMENT/PRODUCTION)
- ✅ Suporte a SQLite (dev) e PostgreSQL (prod)
- ✅ Integração com Supabase
- ✅ Teste de conexão e criação de schemas
- ✅ Graceful shutdown

---

# 📊 **4. models/ - Modelos ORM (Tortoise)**

## 🎯 **Propósito**
Definição dos modelos de banco de dados usando Tortoise ORM.

## 📁 **Estrutura**
```
models/
├── user.py            # 👤 User, Service, Appointment, Client, BusinessSettings
├── trial.py           # 🆓 TrialAccount (teste gratuito)
├── __init__.py        # 🧩 Exportação pública
└── README.md          # 📘 Documentação
```

**Modelos Principais:**

| Modelo | Tabela | Descrição |
|--------|--------|-----------|
| `User` | `users` | Empresas pagantes |
| `TrialAccount` | `trial` | Contas de teste (7 dias) |
| `Service` | `services` | Serviços oferecidos |
| `Appointment` | `appointments` | Agendamentos realizados |
| `Client` | `clients` | Clientes dos estabelecimentos |
| `BusinessSettings` | `business_settings` | Configurações da empresa |

---

# 🚪 **5. routes/ - Endpoints HTTP (FastAPI)**

## 🎯 **Propósito**
Camada de apresentação. Recebe requisições HTTP, chama os controllers e retorna respostas.

## 📁 **Estrutura Completa**
```
routes/
├── agendame_company/      # 🏢 Dashboard do estabelecimento
│   ├── agendame_service.py    # Gestão de serviços
│   ├── appointments.py        # Visualização de agendamentos
│   ├── info_company.py        # Dados da empresa
│   ├── register_services.py   # Cadastro de serviços
│   └── remove_or_upgrad_service.py # Remoção/atualização
│
├── auth/                # 🔐 Autenticação
│   ├── login.py         # Login (JWT)
│   └── register.py      # Registro (User e Trial)
│
├── customers/           # 👥 Página pública de agendamento
│   └── public_services.py # Serviços e agendamento público
│
├── templates/           # 🖼️ Rotas de páginas HTML
│   ├── health.py        # Health check
│   ├── home.py          # Landing page
│   └── register_trial.py # Página de trial
│
├── agendame.py          # 🧩 Rotas agrupadas do agendamento
├── landpage.py          # 🏠 Landing page institucional
├── router.py            # 🧭 Registro centralizado de rotas
└── README.md            # 📘 Documentação
```

## 🔄 **Fluxo de Registro de Rotas**
```python
# router.py
def register_routes(app: FastAPI):
    # Auth
    app.include_router(auth_login.router, prefix="/auth", tags=["Autenticação"])
    app.include_router(auth_register.router, prefix="/auth", tags=["Autenticação"])

    # Customers (público)
    app.include_router(public_services.router, prefix="", tags=["Clientes"])

    # Dashboard (protegido)
    app.include_router(agendame_service.router, prefix="/agendame/company", tags=["Dashboard"])
    # ...
```

---

# 📐 **6. schemas/ - Validação Pydantic**

## 🎯 **Propósito**
Modelos de validação e serialização de dados para as APIs.

## 📁 **Estrutura**
```
schemas/
├── agendame/          # 📅 Schemas do sistema de agendamento
│   ├── appointments.py          # Agendamento
│   ├── register_service.py      # Criação de serviço
│   ├── response_service_agendame.py # Respostas
│   └── upgrade_service.py       # Atualização de serviço
│
├── auth/              # 🔐 Schemas de autenticação
│   ├── schemas_agendame_customers.py # Clientes
│   ├── schemas_login.py          # Login
│   └── schemas_register.py       # Registro
│
└── README.md          # 📘 Documentação
```

**Exemplo típico:**
```python
class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    duration_minutes: int
    is_active: bool = True
```

---

# 🔧 **7. service/ - Serviços Auxiliares**

## 🎯 **Propósito**
Lógica reutilizável e desacoplada, principalmente autenticação e JWT.

## 📁 **Estrutura**
```
service/
├── auth/              # 🔐 Serviços de autenticação
│   ├── auth_login.py     # Validação de credenciais
│   └── auth_register.py  # Criação de usuários
│
└── jwt/               # 🎫 JSON Web Tokens
    ├── auth.py            # Criação de tokens
    ├── depends.py         # Dependency injection (get_current_user)
    └── jwt_decode_token.py # Decodificação e validação
```

**Fluxo JWT:**
```
1. auth.py: create_access_token(user_id) → token
2. jwt_decode_token.py: DecodeToken(token) → payload
3. depends.py: get_current_user(token) → user object
4. AuthMiddleware: request.state.user
```

---

# 🎨 **8. static/ - Frontend (CSS/JS)**

## 🎯 **Propósito**
Arquivos estáticos servidos publicamente via `/static/`.

## 📁 **Estrutura**
```
static/
├── css/               # 🎨 Estilos
│   ├── home.css
│   ├── login.css
│   ├── appointments.css
│   ├── clients.css
│   ├── services.css
│   └── register-trial.css
│
├── js/ (arquivos .js) # 🧠 Lógica frontend
│   ├── main.js           # Inicialização global
│   ├── auth.js           # Autenticação
│   ├── dashboard.js      # Dashboard
│   ├── appointments.js   # Agendamentos
│   ├── services.js       # Serviços
│   ├── clients.js        # Clientes
│   ├── company.js        # Dados da empresa
│   ├── utils.js          # Funções utilitárias
│   ├── domElements.js    # Seletores DOM
│   ├── appState.js       # Estado global
│   ├── modals.js         # Modais
│   ├── tabs.js           # Navegação por abas
│   ├── logout.js         # Logout
│   └── whatsapp.js       # Integração WhatsApp
│
├── trial/             # 🆓 Funcionalidades trial
│   └── show_modal_trial.js
│
├── icon/              # 🖼️ Imagens
│   └── agendame.jpeg
│
├── chat_app.js        # 💬 Chat de agendamento
├── chat_styles.css    # Estilos do chat
├── styles.css         # Estilos globais
└── config.js          # Configurações frontend
```

---

# 🖼️ **9. templates/ - HTML (Jinja2)**

## 🎯 **Propósito**
Templates HTML renderizados no servidor.

## 📁 **Estrutura**
```
templates/
├── index.html           # 🏠 Landing page
├── landpage.html        # 📢 Página institucional
├── login.html           # 🔐 Página de login
├── register-trial.html  # 🆓 Cadastro trial
├── agendame.html        # 📅 Página de agendamento
└── 404.html            # ❌ Página não encontrada
```

**Uso:**
```python
from app.core.config import templates

@router.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
```

---

# 🧰 **10. utils/ - Utilitários Diversos**

## 🎯 **Propósito**
Funções auxiliares que não se encaixam em outras categorias.

## 📁 **Estrutura**
```
utils/
├── hashed_email.py           # 🔐 Hash de emails (LGPD)
├── i_requests.py            # 📡 Requisições internas
├── normalize_company_datas.py # 🔄 Normalização de dados
└── __init__.py              # 🧩 Exportação pública
```

**Destaques:**
- `hashed_email.py`: Anonimização de dados pessoais
- `i_requests.py`: Função `company_exist()` para validar empresas
- `normalize_company_datas.py`: Padronização de dados de entrada

---

# 🔄 **Fluxo Completo de uma Requisição**

```
1. 🌐 Cliente → HTTP Request
        ↓
2. 🚪 FastAPI (main.py)
        ↓
3. ⚙️ AuthMiddleware (core/config.py)
   ├── Rota pública? → ✅ Segue
   └── Rota privada? → 🔐 Valida JWT
        ↓
4. 🗺️ router.py → Roteamento
        ↓
5. 🚪 routes/ → Endpoint específico
        ↓
6. 🧠 controllers/ → Regras de negócio
        ↓
7. 📊 models/ → Tortoise ORM
        ↓
8. 💾 Database (SQLite/PostgreSQL)
        ↓
9. 🔄 Resposta (JSON/HTML)
        ↓
10. 🌐 Cliente recebe resposta
```

---

# 📊 **Resumo por Camada**

| Camada | Responsabilidade | Tecnologia |
|--------|------------------|------------|
| **controllers/** | Regras de negócio PURAS | Python puro |
| **core/** | Configurações e middleware | FastAPI + Starlette |
| **database/** | Conexão com banco | Tortoise ORM |
| **models/** | Mapeamento ORM | Tortoise ORM |
| **routes/** | Endpoints HTTP | FastAPI |
| **schemas/** | Validação de dados | Pydantic |
| **service/** | Lógica auxiliar | Python puro |
| **static/** | Frontend estático | CSS/JS Vanilla |
| **templates/** | HTML server-side | Jinja2 |
| **utils/** | Funções utilitárias | Python puro |

---

# 🎯 **Princípios Arquiteturais**

## ✅ **Separação de Responsabilidades**
- **routes** → Sabe sobre HTTP
- **controllers** → Sabe sobre negócio
- **models** → Sabe sobre banco
- **schemas** → Sabe sobre validação

## ✅ **Inversão de Dependência**
```
routes → controllers → models
  ↓           ↓
schemas     utils
```

## ✅ **DRY (Don't Repeat Yourself)**
- Lógica de empresa unificada em `MyCompany`
- Autenticação centralizada no `AuthMiddleware`
- Validação reutilizável via schemas

## ✅ **Open/Closed**
- Fácil adicionar novos endpoints
- Fácil adicionar novos serviços
- Fácil adicionar novos modelos

---

# 📈 **Estatísticas do Módulo app/**

| Item | Contagem |
|------|----------|
| **Diretórios** | 24 |
| **Arquivos Python** | ~60 |
| **Arquivos JavaScript** | ~20 |
| **Arquivos CSS** | 8 |
| **Templates HTML** | 6 |
| **Total** | **98 arquivos** |

---

# 🚀 **Roadmap de Evolução da Arquitetura**

## 🔜 **Curto Prazo**
- [ ] Mover `utils/company_exist()` para `controllers/company/`
- [ ] Unificar `remove_service.py` e `update_service.py` em `services.py`
- [ ] Criar `exceptions/` para erros de domínio

## 🔮 **Médio Prazo**
- [ ] Adicionar camada `repositories/` entre models e controllers
- [ ] Implementar `services/` de notificação (WhatsApp, Email)
- [ ] Separar `static/` em `css/`, `js/`, `img/`, `fonts/`

## 🌟 **Longo Prazo**
- [ ] Migrar frontend para framework (Vue/React)
- [ ] API versioning (`/api/v1/`, `/api/v2/`)
- [ ] Microservices (agendamento, pagamento, notificação)

---

# 📌 **Conclusão**

A estrutura do `app/` no Agendame segue **boas práticas de arquitetura de software**:

✅ **Organização intuitiva** - Cada coisa em seu lugar
✅ **Separação clara** - Domínio isolado da infraestrutura
✅ **Escalável** - Fácil adicionar novas funcionalidades
✅ **Testável** - Lógica pura em controllers
✅ **Manutenível** - Baixo acoplamento entre módulos
✅ **Profissional** - Estrutura pronta para produção

**Esta não é apenas uma pasta de código. É a espinha dorsal de um SaaS completo.** 🏆

---

**📘 Documentação gerada a partir da árvore real do projeto em `app/` - 24 diretórios, 98 arquivos, 1 sistema.**
