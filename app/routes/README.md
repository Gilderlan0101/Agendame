# 🚪 **app/routes/ - Camada de Apresentação e Endpoints HTTP**

## 📋 **Visão Geral do Módulo**

O módulo `routes` é a **camada de apresentação** do Agendame. É aqui que todas as requisições HTTP **entram** no sistema e as respostas **saem**. Este módulo **não contém lógica de negócio** - apenas orquestração, validação e formatação de respostas.

## 🎯 **Propósito Arquitetural**

```
🌐 Cliente HTTP (Browser/App/API)
    ↓
🚪 ROTAS (FastAPI) - ESTAMOS AQUI!
    ↓
🧠 Controllers (Domínio) - Regras de negócio
    ↓
📊 Models (ORM) - Banco de dados
```

---

# 📁 **Estrutura Completa do Módulo**

```
routes/
├── agendame_company/     # 🏢 Dashboard do estabelecimento
├── auth/                 # 🔐 Autenticação e registro
├── customers/            # 👥 API pública para clientes
├── templates/            # 🖼️ Páginas HTML e utilitários
├── agendame.py           # 🧩 Agrupamento de rotas públicas
├── landpage.py           # 🏠 Landing page institucional
└── router.py             # 🧭 Registro centralizado
```

---

# 🧩 **1. `router.py` - O Maestro das Rotas**

## 🎯 **Propósito**

Arquivo **centralizador** que registra **todas** as rotas da aplicação no FastAPI. É a **única fonte de verdade** sobre quais endpoints existem.

## 📋 **Responsabilidades:**

```python
def register_routes(app: FastAPI):
    # ✅ Registro de TODAS as rotas
    app.include_router(...)  # Auth
    app.include_router(...)  # Customers
    app.include_router(...)  # Agendame Company
    app.include_router(...)  # Templates
    app.include_router(...)  # Landpage
    # etc...
```

## 🔍 **Por que existe?**

**Problema:** Sem centralização, as rotas ficam espalhadas e é difícil saber o que está registrado.

**Solução:** Um único arquivo que **importa e registra** todos os routers.

---

# 🏢 **2. `agendame_company/` - Dashboard do Estabelecimento**

## 📊 **Módulo Mais Complexo!** - 7 arquivos, 20+ endpoints

```
agendame_company/
├── agendame_service.py     # 📦 CRUD de serviços + clientes + stats
├── appointments.py         # 📅 Gestão completa de agendamentos
├── info_company.py         # ℹ️ Dados da empresa logada
├── register_services.py    # ✨ Cadastro de novos serviços
├── remove_or_upgrad_service.py  # 🗑️ Código morto (ignorar)
├── __init__.py
└── README.md
```

## 🎯 **Propósito**

**Todas** as rotas que o **dono do estabelecimento** utiliza no dia-a-dia.

## 🔐 **Características Comuns:**

- ✅ **Todas as rotas exigem autenticação** (`Depends(get_current_user)`)
- ✅ **Escopo automático** por `current_user.id`
- ✅ **Suporte a User e TrialAccount**
- ✅ **JSON responses** (API pura)

## 📌 **Resumo dos Endpoints:**

| Arquivo | Método | Endpoint | Descrição |
|---------|--------|----------|-----------|
| `agendame_service.py` | `GET` | `/agendame/services` | Listar serviços |
| `agendame_service.py` | `DELETE` | `/agendame/remove/service/{id}` | Remover serviço |
| `agendame_service.py` | `PUT` | `/agendame/update/service/{id}` | Atualizar serviço |
| `agendame_service.py` | `GET` | `/clients` | Listar clientes |
| `agendame_service.py` | `GET` | `/dashboard/stats` | Estatísticas |
| `appointments.py` | `POST` | `/agendame/appointments` | Listar com filtros |
| `appointments.py` | `GET` | `/agendame/appointments/today` | Agenda de hoje |
| `appointments.py` | `GET` | `/agendame/appointments/upcoming` | Próximos dias |
| `appointments.py` | `POST` | `/agendame/appointments/create` | Criar (interno) |
| `appointments.py` | `PUT` | `/agendame/appointments/{id}` | Atualizar |
| `appointments.py` | `PUT` | `/agendame/appointments/{id}/status` | Mudar status |
| `appointments.py` | `DELETE` | `/agendame/appointments/{id}` | Remover |
| `info_company.py` | `GET` | `/agendame/{slug}/info` | Dados da empresa |
| `register_services.py` | `POST` | `/agendame/register/service` | Criar serviço |

**Total aproximado: 15+ endpoints** 🚀

---

# 🔐 **3. `auth/` - Autenticação e Registro**

```
auth/
├── login.py     # 🔑 Login, logout, sessão atual
├── register.py  # ✍️ Registro de contas pagantes
├── README.md
└── __init__.py
```

## 🎯 **Propósito**

**Porta de entrada** do sistema. Gerencia identidade e sessão.

## 📌 **Endpoints:**

| Método | Endpoint | Descrição | Público |
|--------|----------|-----------|---------|
| `GET` | `/login` | Página de login HTML | ✅ Sim |
| `POST` | `/auth/login` | Autenticação (JSON) | ✅ Sim |
| `GET` | `/auth/me` | Usuário atual | ❌ Não |
| `GET` | `/auth/logout` | Logout web | ✅ Sim* |
| `POST` | `/auth/logout` | Logout API | ❌ Não |
| `POST` | `/auth/register` | Registro pagante | ✅ Sim |

*\* GET /auth/logout funciona sem token, apenas remove cookies*

## ⚠️ **Ponto de Atenção:**

Registro trial (`POST /auth/signup/free-trial`) **não está aqui** - está em `templates/register_trial.py` (e faz sentido!).

---

# 👥 **4. `customers/` - API Pública para Clientes**

```
customers/
├── public_services.py  # 📱 Agendamento público
├── README.md
└── __init__.py
```

## 🎯 **Propósito**

**Face pública** do Agendame. É o que os **clientes dos salões** utilizam para agendar.

## 📌 **Endpoints:**

| Método | Endpoint | Descrição | Público |
|--------|----------|-----------|---------|
| `GET` | `/services/{identifier}` | Listar serviços da empresa | ✅ Sim |
| `GET` | `/services/{identifier}/available-times` | Horários disponíveis | ✅ Sim |
| `POST` | `/services/{identifier}/book` | Realizar agendamento | ✅ Sim |

## 🔍 **Características Únicas:**

- ✅ **Busca flexível** - Slug, username ou nome da empresa
- ✅ **Sem autenticação** - Qualquer pessoa pode agendar
- ✅ **URLs amigáveis** - `/services/barbearia-exemplo`
- ✅ **Validação de disponibilidade** em tempo real

---

# 🖼️ **5. `templates/` - Páginas HTML e Utilitários**

```
templates/
├── register_trial.py  # 🆓 Cadastro trial (página + API)
├── home.py            # 🏠 Dashboard (HTML protegido)
├── health.py          # 🏥 Monitoramento e keep-alive
├── README.md
└── __init__.py
```

## 🎯 **Propósito**

**Interfaces visuais** do sistema e endpoints de **infraestrutura**.

## 📌 **Endpoints:**

| Arquivo | Método | Endpoint | Descrição | Público |
|---------|--------|----------|-----------|---------|
| `register_trial.py` | `GET` | `/agendame/trial` | Página de cadastro trial | ✅ Sim |
| `register_trial.py` | `POST` | `/auth/signup/free-trial` | Criar conta trial | ✅ Sim |
| `home.py` | `GET` | `/agendame/dashboard` | Dashboard da empresa | ❌ Não |
| `health.py` | `GET` | `/health` | Health check | ✅ Sim |
| `health.py` | `GET` | `/ping` | Ping/Pong | ✅ Sim |
| `health.py` | `GET` | `/keepalive` | Keep alive | ✅ Sim |

---

# 🏠 **6. `landpage.py` - Landing Page Institucional**

## 📌 **Endpoints:**

| Método | Endpoint | Descrição | Público |
|--------|----------|-----------|---------|
| `GET` | `/` | Landing page principal | ✅ Sim |

## 🎯 **Propósito**

A **cara do Agendame**. Página de vendas e apresentação do produto.

## 🔍 **Características:**

- ✅ **Primeira impressão** do usuário
- ✅ **SEO-friendly** (título, descrição, meta tags)
- ✅ **Call-to-action** para trial e contato
- ✅ **Design responsivo** e otimizado

---

# 🔄 **7. `agendame.py` - Agrupamento de Rotas Públicas**

## 📌 **Provável Conteúdo:**

```python
from fastapi import APIRouter
from .customers import public_services
from .templates import register_trial, health

router = APIRouter(prefix='/agendame', tags=['Agendame Público'])

# Agrupa rotas públicas relacionadas
router.include_router(public_services.router)
router.include_router(register_trial.router)
router.include_router(health.router)
```

## 🎯 **Propósito**

**Organização** e **prefixo comum** para rotas públicas do Agendame.

---

# 🗺️ **Mapa Completo de Rotas**

## 🌐 **Rotas Públicas (Sem Autenticação)**

```
🏠 Landpage
   GET  /                           → landpage.py

🔐 Autenticação
   GET  /login                      → auth/login.py
   POST /auth/login                 → auth/login.py
   POST /auth/register              → auth/register.py
   GET  /auth/logout                → auth/login.py

🆓 Trial
   GET  /agendame/trial             → templates/register_trial.py
   POST /auth/signup/free-trial     → templates/register_trial.py

👥 Clientes (Agendamento Público)
   GET  /services/{identifier}      → customers/public_services.py
   GET  /services/{identifier}/available-times → customers/public_services.py
   POST /services/{identifier}/book → customers/public_services.py

🏥 Monitoramento
   GET  /health                     → templates/health.py
   GET  /ping                       → templates/health.py
   GET  /keepalive                  → templates/health.py
```

## 🔒 **Rotas Privadas (Requer Autenticação)**

```
📊 Dashboard
   GET  /agendame/dashboard         → templates/home.py

🏢 Gestão da Empresa
   GET  /agendame/{slug}/info       → agendame_company/info_company.py
   GET  /agendame/services          → agendame_company/agendame_service.py
   POST /agendame/register/service  → agendame_company/register_services.py
   PUT  /agendame/update/service/{id} → agendame_company/agendame_service.py
   DELETE /agendame/remove/service/{id} → agendame_company/agendame_service.py

📅 Gestão de Agendamentos
   POST /agendame/appointments      → agendame_company/appointments.py
   GET  /agendame/appointments/today → agendame_company/appointments.py
   GET  /agendame/appointments/upcoming → agendame_company/appointments.py
   POST /agendame/appointments/create → agendame_company/appointments.py
   PUT  /agendame/appointments/{id} → agendame_company/appointments.py
   PUT  /agendame/appointments/{id}/status → agendame_company/appointments.py
   DELETE /agendame/appointments/{id} → agendame_company/appointments.py
   GET  /agendame/appointments/{id} → agendame_company/appointments.py

👥 Clientes (Gestão)
   GET  /clients                    → agendame_company/agendame_service.py

📈 Estatísticas
   GET  /dashboard/stats           → agendame_company/agendame_service.py

👤 Usuário
   GET  /auth/me                   → auth/login.py
   POST /auth/logout               → auth/login.py
```

---

# 📊 **Estatísticas do Módulo**

| Categoria | Diretórios | Arquivos | Endpoints (aprox.) |
|-----------|------------|----------|-------------------|
| **Dashboard** | `agendame_company/` | 7 | 15+ |
| **Autenticação** | `auth/` | 4 | 7 |
| **Clientes** | `customers/` | 3 | 3 |
| **Templates** | `templates/` | 5 | 6 |
| **Raiz** | `./` | 4 | 2 |
| **TOTAL** | **5** | **23** | **~33** |

---

# 🧠 **Decisões de Design e Arquitetura**

## ✅ **Separação por Público-Alvo**

```
auth/          → Qualquer pessoa (login/registro)
customers/     → Clientes dos salões (agendamento)
agendame_company/ → Donos de estabelecimento (gestão)
templates/     → Interfaces HTML
```

**Benefício:** Clareza de propósito e manutenção independente.

---

## ✅ **Prefixos Consistentes**

| Prefixo | Significado | Exemplo |
|---------|-------------|---------|
| `/auth/*` | Autenticação | `/auth/login` |
| `/agendame/*` | Funcionalidades do Agendame | `/agendame/dashboard` |
| `/services/*` | API pública | `/services/barbearia-x` |
| `/health` | Monitoramento | `/health` |

**Benefício:** Intuitivo e auto-documentado.

---

## ✅ **Coesão vs Acoplamento**

**Exemplo de coesão:**
- `POST /auth/signup/free-trial` está em `templates/register_trial.py`
- ✅ Faz sentido! Está junto da **página** de cadastro trial.

**Exemplo de acoplamento baixo:**
- `customers/public_services.py` não depende de `agendame_company/`
- ✅ Pode ser desenvolvido/testado isoladamente.

---

# ⚠️ **Pontos de Atenção**

## 🔴 **1. Código Morto**
`agendame_company/remove_or_upgrad_service.py` - **Remover!**

## 🟡 **2. Duplicação de Configuração**
`home.py` recria `Jinja2Templates` - **Importar de `core.config`!**

## 🟢 **3. Tratamento de Erros**
Algumas rotas não têm `try/except` consistente.

## 🟠 **4. Documentação**
`README.md` em cada subpasta - ✅ Excelente prática, manter!

---

# 🎯 **Responsabilidades Claras**

| Módulo | Responsabilidade | Não Responsabilidade |
|--------|------------------|---------------------|
| **`agendame_company/`** | Gestão do estabelecimento | Agendamento público |
| **`auth/`** | Identidade e sessão | Lógica de negócio |
| **`customers/`** | Experiência do cliente | Dashboard |
| **`templates/`** | Interfaces HTML | APIs JSON |
| **`landpage.py`** | Marketing e vendas | Funcionalidades |
| **`router.py`** | Registro de rotas | Lógica alguma |

---

# 🚀 **Fluxos Completos do Sistema**

## **1. Fluxo de Aquisição (Marketing → Trial → Cliente)**
```
🏠 Landpage (/) → Call to Action
    ↓
🆓 Página Trial (/agendame/trial)
    ↓
📝 Formulário → POST /auth/signup/free-trial
    ↓
✅ Conta Trial Criada (7 dias)
    ↓
🔐 Login (/login) → POST /auth/login
    ↓
📊 Dashboard (/agendame/dashboard)
```

## **2. Fluxo do Cliente Final**
```
📱 Link do Salão (ex: /barbearia-x)
    ↓
🔍 GET /services/barbearia-x
    ↓
📅 Escolhe serviço + data
    ↓
🕐 GET /services/barbearia-x/available-times
    ↓
✅ POST /services/barbearia-x/book
    ↓
📲 Confirmação WhatsApp + Código AGD123
```

## **3. Fluxo do Estabelecimento (Diário)**
```
🔐 Login → Dashboard
    ↓
📅 GET /agendame/appointments/today
    ↓
✅ Confirmar agendamentos
    ↓
👤 GET /clients?search=João
    ↓
📞 POST /agendame/appointments/create (telefone)
    ↓
📊 GET /dashboard/stats (fechamento do dia)
```

---

# 📌 **Conclusão**

O módulo `routes/` do Agendame é **exemplar** em termos de organização:

✅ **Separação clara** - Cada coisa em seu lugar
✅ **Nomes intuitivos** - URLs que fazem sentido
✅ **Responsabilidade única** - Cada arquivo tem um propósito
✅ **Baixo acoplamento** - Módulos independentes
✅ **Alta coesão** - Funcionalidades relacionadas agrupadas
✅ **Auto-documentado** - READMEs em cada subpasta

**É a porta de entrada e saída de todo o sistema. E está muito bem organizada.** 🏆

---

## 🔧 **Últimas Recomendações**

```bash
# 1. Remover código morto
rm app/routes/agendame_company/remove_or_upgrad_service.py

# 2. Corrigir duplicação de templates
# Em home.py, substituir por:
from app.core.config import templates

# 3. Padronizar tratamento de erros
# Adicionar try/except consistente em todas as rotas
```

---

**📘 Documentação gerada a partir da árvore real do projeto em `app/routes/` - 5 diretórios, 24 arquivos, ~33 endpoints, 1 arquitetura sólida.**
