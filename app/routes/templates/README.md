# 🖼️ **app/routes/templates/ - Rotas de Páginas HTML e Utilitários**

## 📋 **Visão Geral do Módulo**

Este módulo contém as **rotas que renderizam páginas HTML** e **endpoints utilitários** do Agendame. Diferente das rotas de API que retornam JSON, aqui o foco é a **experiência do usuário** com interfaces web.

## 🎯 **Propósito**

| Arquivo | Responsabilidade | Tipo |
|---------|------------------|------|
| **`register_trial.py`** | Página e API de cadastro trial | 🖼️ HTML + 📦 API |
| **`home.py`** | Dashboard principal | 🖼️ HTML |
| **`health.py`** | Monitoramento e keep-alive | 📦 API |

---

# 📄 **1. `register_trial.py` - Cadastro de Contas Trial**

## 🎯 **Propósito**

Gerencia o **fluxo completo de contas de teste (7 dias grátis)**:
- ✅ Exibe página de cadastro trial
- ✅ Processa registro de novas contas trial
- ✅ Integração com `SignupFreeTrial` (service)

---

## 🌐 **1.1 `GET /agendame/trial` - Página de Cadastro Trial**

```http
GET /agendame/trial
```

**Descrição:** Renderiza a página HTML de cadastro para contas de teste gratuito.

**Resposta:** `HTML 200` - Página `register-trial.html` renderizada.

**Fluxo:**
```
Usuário clica em "Testar grátis por 7 dias"
    ↓
GET /agendame/trial
    ↓
Renderiza formulário de cadastro
    ↓
Usuário preenche dados
    ↓
POST /auth/signup/free-trial
```

---

## 📦 **1.2 `POST /auth/signup/free-trial` - Criar Conta Trial**

```http
POST /auth/signup/free-trial
Content-Type: application/json

{
  "username": "teste_salao",
  "email": "teste@email.com",
  "password": "123456",
  "business_name": "Teste Salão",
  "business_type": "barbearia",
  "phone": "1133333333",
  "whatsapp": "5511999999999",
  "business_slug": "teste-salao"
}
```

**Descrição:** Endpoint **público** que cria uma nova conta de teste com validade de **7 dias**.

**Validações:**
- ✅ Email único na tabela `TrialAccount`
- ✅ Todos os campos obrigatórios
- ✅ Slug normalizado
- ✅ Senha hasheada com bcrypt

**Lógica de Expiração:**
```python
subscription_start = now_utc
subscription_end = now_utc + timedelta(days=8)  # 7 dias úteis
```

**Resposta (201 Created):**
```json
{
  "username": "teste_salao",
  "email": "teste@email.com",
  "days_remaining": 7,
  "status": true,
  "is_trial": true
}
```

**Erros:**
| Status | Significado |
|--------|-------------|
| `409` | Email já registrado |
| `500` | Erro interno |

---

## ✅ **O Problema Resolvido!**

**Lembra da documentação anterior onde apontamos:**

> "❌ Rota de registro trial AUSENTE! - Funcionalidade existe mas não está exposta!"

**Aqui está a solução!** ✅ A rota `POST /auth/signup/free-trial` existe neste arquivo, não em `auth/register.py`. Faz sentido estar aqui, pois está acoplada à página de cadastro trial.

---

# 📄 **2. `home.py` - Dashboard Principal**

## 🎯 **Propósito**

Gerencia a **página principal do dashboard** da empresa, com proteção de autenticação.

---

## 📊 **2.1 `GET /agendame/dashboard` - Dashboard**

```http
GET /agendame/dashboard
```

**Descrição:** Renderiza o dashboard da empresa. **Requer autenticação.**

### **Fluxo de Autorização:**

```
GET /agendame/dashboard
    ↓
get_current_user() → verifica token
    ↓
├── ✅ Autenticado → Renderiza index.html com user data
└── ❌ Não autenticado → 303 Redirect → /login?next=/agendame/dashboard
```

### **Proteção Automática:**

```python
if not current_user:
    return RedirectResponse(
        url=f'/login?next={request.url.path}',  # ← Salva URL original
        status_code=303
    )
```

**Benefício:** Após o login, o usuário é redirecionado de volta para o dashboard.

---

### **Dados Disponíveis no Template:**

```python
return templates.TemplateResponse(
    'index.html',
    {
        'request': request,
        'user': current_user,  # ← Objeto SystemUser completo!
    }
)
```

**No template HTML (Jinja2):**
```html
{% if user %}
  <h1>Bem-vindo, {{ user.name }}!</h1>
  <p>Slug: {{ user.slug }}</p>
  <p>Trial: {{ user.is_trial }}</p>
{% endif %}
```

---

## ⚠️ **Problema: Duplicação de Configuração**

```python
# ❌ Recriando a configuração do zero!
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
template_dir = BASE_DIR / 'app' / 'templates'
templates = Jinja2Templates(directory=str(template_dir))
```

**Este código já existe em `app/core/config.py`!** ✅

**Solução:** Importar de `app.core.config`:
```python
from app.core.config import templates  # ✅ Instância única
```

---

# 📄 **3. `health.py` - Monitoramento e Keep-Alive**

## 🎯 **Propósito**

Endpoints **públicos** para monitoramento da saúde da aplicação e prevenção de spin-down em serviços free-tier.

---

## 🏥 **3.1 `GET /health` - Health Check**

```http
GET /health
```

**Descrição:** Endpoint principal de verificação de saúde.

**Resposta (200 OK):**
```json
{
  "status": "ok",
  "message": "Application is healthy",
  "timestamp": "2024-01-15T10:30:00.123456",
  "keepalive": true
}
```

**Uso:** Monitoramento externo (UptimeRobot, Pingdom, etc).

---

## 🏓 **3.2 `GET /ping` - Ping**

```http
GET /ping
```

**Descrição:** Endpoint simples para teste de latência.

**Resposta (200 OK):**
```json
{
  "status": "pong",
  "timestamp": "2024-01-15T10:30:00.123456",
  "service": "agendame",
  "message": "Server is alive"
}
```

**Uso:** Testes rápidos de conectividade.

---

## 💤 **3.3 `GET /keepalive` - Keep Alive**

```http
GET /keepalive
```

**Descrição:** Endpoint específico para **prevenir spin-down** em serviços gratuitos (Render, Railway, etc).

**Características:**
- ✅ Resposta leve e rápida
- ✅ Inclui tempo de atividade (uptime)
- ✅ Projetado para ser chamado a cada 5-10 minutos

**Resposta (200 OK):**
```json
{
  "alive": true,
  "timestamp": "2024-01-15T10:30:00.123456",
  "uptime": "3 days, 2:15:30.123456"
}
```

**Cálculo de Uptime:**
```python
START_TIME = datetime.utcnow()  # Global no módulo
uptime = str(datetime.utcnow() - START_TIME)
```

---

## 🔄 **GitHub Action Integration**

Estes endpoints são usados pelo workflow `.github/workflows/keepalive.yml`:

```yaml
ENDPOINTS=("/health" "/ping" "/keepalive" "/")
BASE_URL="https://agendame.onrender.com"
```

---

# 🔗 **Relacionamento entre os Arquivos**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  register_trial.py  │───▶  health.py       │     │  home.py         │
│  - GET /trial        │     - GET /health    │     │  - GET /dashboard│
│  - POST /signup      │     - GET /ping      │     └────────┬────────┘
└──────────┬──────────┘     - GET /keepalive  │              │
           │                └─────────────────┘              │
           │                                                │
           ▼                                                ▼
    ┌─────────────────┐                           ┌─────────────────┐
    │  TrialAccount   │                           │  User/Trial     │
    │  (7 dias grátis)│                           │  Autenticado    │
    └─────────────────┘                           └─────────────────┘
           │                                                │
           ▼                                                ▼
    ┌─────────────────┐                           ┌─────────────────┐
    │  /login         │                           │  index.html     │
    │  (após cadastro)│                           │  (dashboard)    │
    └─────────────────┘                           └─────────────────┘
```

---

# 🧠 **Decisões de Design**

## ✅ **Por que rotas de template separadas das APIs?**

**Motivo:**
- 🖼️ **Templates** → Foco em UX, renderização HTML, redirecionamentos
- 📦 **APIs** → Foco em dados, JSON, integração com sistemas

**Benefício:** Clareza de responsabilidade e manutenção independente.

---

## ✅ **Por que `POST /auth/signup/free-trial` está aqui e não em `auth/register.py`?**

**Motivo:** Acoplamento coeso. Esta rota **só faz sentido** junto com a página de cadastro trial. Mantê-las no mesmo arquivo garante que, se uma for removida, a outra também será.

---

## ✅ **Por que `START_TIME` global em `health.py`?**

**Motivo:** Calcular uptime desde a inicialização do módulo, não desde a primeira requisição.

```python
# ✅ Correto: desde o deploy
START_TIME = datetime.utcnow()

# ❌ Incorreto: desde a primeira requisição
start_time = datetime.utcnow()  # dentro da função!
```

---

# ⚠️ **Problemas Identificados**

## 🔴 **1. Duplicação de Configuração de Templates (novamente!)**

**Arquivo:** `home.py`
```python
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
template_dir = BASE_DIR / 'app' / 'templates'
templates = Jinja2Templates(directory=str(template_dir))
```

**Solução:** Importar de `app.core.config`:
```python
from app.core.config import templates  # ✅ Já existe!
```

---

## 🟡 **2. Inconsistência de Nomenclatura**

**`register_trial.py`** contém:
- `GET /agendame/trial` → Página de cadastro
- `POST /auth/signup/free-trial` → API

**Sugestão:** Padronizar prefixo:
- `GET /auth/trial` (em vez de `/agendame/trial`)
- `POST /auth/trial` (ou manter `/auth/signup/free-trial`)

---

## 🟢 **3. Tratamento de Erros no Registro Trial**

```python
async def signup_trial(target: CrateUser):
    data = { ... }
    create = SignupFreeTrial(data=data)
    result = await create.create()
    return result  # ⚠️ Sem try/except!
```

**Problema:** Exceções não tratadas viram erro 500 sem detalhes.

**Solução:**
```python
try:
    result = await create.create()
    return result
except HTTPException:
    raise
except Exception as e:
    raise HTTPException(status_code=500, detail=f'Erro no registro: {str(e)}')
```

---

# 📊 **Resumo de Endpoints**

| Método | Endpoint | Descrição | Autenticação | Arquivo |
|--------|----------|-----------|--------------|---------|
| `GET` | `/agendame/trial` | Página de cadastro trial | ❌ Não | `register_trial.py` |
| `POST` | `/auth/signup/free-trial` | Criar conta trial | ❌ Não | `register_trial.py` |
| `GET` | `/agendame/dashboard` | Dashboard da empresa | ✅ Sim | `home.py` |
| `GET` | `/health` | Health check | ❌ Não | `health.py` |
| `GET` | `/ping` | Ping/Pong | ❌ Não | `health.py` |
| `GET` | `/keepalive` | Keep alive | ❌ Não | `health.py` |

---

# 🚀 **Exemplos Práticos**

## **1. Fluxo Completo de Trial → Dashboard**

```bash
# 1. Acessar página de cadastro
# Browser: GET https://agendame.com/agendame/trial

# 2. Preencher formulário e enviar
curl -X POST https://agendame.com/auth/signup/free-trial \
  -H "Content-Type: application/json" \
  -d '{
    "username": "barbearia_teste",
    "email": "teste@barbearia.com",
    "password": "123456",
    "business_name": "Barbearia Teste",
    "business_type": "barbearia",
    "phone": "1133334444",
    "whatsapp": "5511999998888",
    "business_slug": "barbearia-teste"
  }'

# 3. Login (automático ou manual)
# POST /auth/login

# 4. Dashboard
# GET /agendame/dashboard
```

## **2. Monitoramento com cURL**

```bash
# Health check
curl -X GET https://agendame.com/health

# Ping
curl -X GET https://agendame.com/ping

# Keep alive (para cron jobs)
curl -X GET https://agendame.com/keepalive
```

---

# 🛡️ **Segurança**

## ✅ **Dashboard Protegido**
```python
if not current_user:
    return RedirectResponse(url='/login?next=/agendame/dashboard')
```

## ✅ **Sem Exposição de Dados Sensíveis**
Endpoints de health/ping/keepalive não retornam:
- ❌ Informações do servidor
- ❌ Versões de bibliotecas
- ❌ Configurações internas

---

# 📌 **Conclusão**

O módulo `templates/` é a **face visível** do Agendame:

✅ **`register_trial.py`** - Resolve o problema crítico de registro trial
✅ **`home.py`** - Protege e renderiza o dashboard
✅ **`health.py`** - Mantém a aplicação viva e monitorada

⚠️ **Mas com um problema recorrente:**
- ❌ **Duplicação de configuração de templates** em `home.py`

---

## 🔧 **Correção Sugerida Imediata**

```python
# home.py - VERSÃO CORRETA
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse

from app.core.config import templates  # ✅ Importar instância única!
from app.service.jwt.depends import SystemUser, get_current_user

router = APIRouter(prefix='/agendame', tags=['Page home'])

@router.get('/dashboard', response_class=HTMLResponse)
async def render_agendame_dashboard(
    request: Request,
    current_user: Optional[SystemUser] = Depends(get_current_user),
):
    if not current_user:
        return RedirectResponse(
            url=f'/login?next={request.url.path}',
            status_code=303
        )

    return templates.TemplateResponse(
        'index.html',
        {
            'request': request,
            'user': current_user,
        }
    )
```

---

**📘 Documentação gerada a partir do código fonte em `app/routes/templates/` - 3 arquivos, 6 endpoints, 1 problema de duplicação.**
