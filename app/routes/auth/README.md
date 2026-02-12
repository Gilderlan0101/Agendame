# 🔐 **app/routes/auth/ - API de Autenticação e Registro**

## 📋 **Visão Geral do Módulo**

Este módulo contém todas as rotas relacionadas a **autenticação, registro e gerenciamento de sessão** do Agendame. É a **porta de entrada** para usuários e empresas acessarem o sistema.

## 🎯 **Propósito**

| Rota | Funcionalidade | Público |
|------|----------------|---------|
| **Login** | Autenticação de usuários (User e Trial) | ✅ Público |
| **Logout** | Encerramento de sessão | 🔒 Privado |
| **Registro** | Criação de contas pagantes | ✅ Público |
| **Trial** | Registro de contas de teste | ✅ Público |
| **Me** | Informações do usuário atual | 🔒 Privado |

---

# 📁 **Estrutura do Módulo**

```
auth/
├── login.py      # 🔑 Login, logout, sessão atual
├── register.py   # ✍️ Registro de contas (User)
└── __init__.py   # 🧩 Exportação das rotas
```

---

# 📄 **1. `login.py` - Autenticação e Sessão**

## 🎯 **Propósito**

Gerencia todo o ciclo de vida da **sessão do usuário**:
- ✅ Exibição da página de login
- ✅ Autenticação (User e Trial)
- ✅ Logout (GET e POST)
- ✅ Informações do usuário atual

---

## 🌐 **1.1 `GET /login` - Página de Login**

```http
GET /login?error=Credenciais+inv%C3%A1lidas&next=/agendame/dashboard
```

**Descrição:** Renderiza a página HTML de login.

**Query Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `error` | `str` | Mensagem de erro a ser exibida |
| `success` | `str` | Mensagem de sucesso |
| `next_url` | `str` | URL para redirecionamento pós-login |

**Resposta:** `HTML 200` - Página `login.html` renderizada.

**Uso típico:**
```html
<!-- Redirecionamento automático após login -->
<form action="/auth/login" method="post">
  <input type="hidden" name="next" value="{{ next_url }}">
  <!-- ... campos de login ... -->
</form>
```

---

## 🔑 **1.2 `POST /auth/login` - Autenticação de Usuários**

```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=contato@barbearia.com&password=123456
```

**Descrição:** Endpoint **público** que autentica usuários e retorna tokens JWT.

### **Fluxo de Autenticação:**

```
1. Recebe credentials (username/email + password)
2. Verifica expiração de conta trial (remove se expirada)
3. Tenta autenticar como usuário pagante (User)
4. Se falhar, tenta como conta trial (TrialAccount)
5. Se falhar, retorna erro 401
6. Se sucesso, retorna JSON com tokens + dados do usuário
```

### **Lógica de Busca:**

```python
# 1º - Tabela User
verify_auth = await checking_account(...)

# 2º - Tabela TrialAccount (se não encontrado)
if verify_auth is None:
    verify_auth = await checking_account_trial(...)
```

### **Resposta de Sucesso (200 OK):**

**Usuário Pagante:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": 123,
  "username": "barbearia_x",
  "email": "contato@barbearia.com",
  "business_name": "Barbearia X",
  "slug": "barbearia-x",
  "is_trial": false
}
```

**Conta Trial:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": 456,
  "username": "teste_salao",
  "email": "teste@email.com",
  "business_name": "Teste Salão",
  "slug": "teste-salao",
  "is_trial": true,
  "days_remaining": 5
}
```

### **Tratamento de Erros:**

| Status | Significado | Comportamento |
|--------|-------------|---------------|
| `401` | Credenciais inválidas | 🔄 Redireciona para `/login` |
| `401` | Conta trial expirada | 🔄 Redireciona para `/login` |
| `500` | Erro interno | 🔄 Redireciona para `/login` |

**⚠️ IMPORTANTE:** Em caso de erro, o usuário é **redirecionado** para a página de login, não recebe JSON de erro.

---

## 👤 **1.3 `GET /auth/me` - Usuário Atual**

```http
GET /auth/me
Authorization: Bearer <token>
# ou Cookie: access_token=<token>
```

**Descrição:** Retorna informações do usuário **autenticado**.

**Resposta (200 OK):**
```json
{
  "id": 123,
  "username": "barbearia_x",
  "email": "contato@barbearia.com",
  "phone": "1133333333",
  "name": "Barbearia X",
  "slug": "barbearia-x",
  "is_trial": false,
  "photo": null,
  "status": true
}
```

**Erros:**
- `401` - Não autenticado
- `404` - Usuário não encontrado

---

## 🚪 **1.4 `GET /auth/logout` - Logout (Web)**

```http
GET /auth/logout
```

**Descrição:** Encerra a sessão do usuário e remove cookies.

**Comportamento:**
1. ✅ Remove cookie `access_token`
2. ✅ Remove cookie `refresh_token`
3. ✅ Remove cookie `user_id`
4. ✅ Headers `Cache-Control: no-store`
5. 🔄 Redireciona para `/login`

**Resposta:** `303 See Other` → `/login`

---

## 🚪 **1.5 `POST /auth/logout` - Logout (API)**

```http
POST /auth/logout
Authorization: Bearer <token>
```

**Descrição:** Versão API do logout, retorna JSON.

**Resposta (200 OK):**
```json
{
  "message": "Logout realizado com sucesso",
  "user": "contato@barbearia.com"
}
```

---

# 📄 **2. `register.py` - Registro de Contas**

## 🎯 **Propósito**

Gerencia a **criação de novas contas** no sistema.

**⚠️ ATENÇÃO:** Este arquivo atualmente **só suporta contas pagantes (`User`)**. Contas trial são gerenciadas pelo `SignupFreeTrial` em `service/auth/auth_register.py`, mas **não possuem rota própria** neste módulo.

---

## ✍️ **2.1 `POST /auth/register` - Registro de Conta Pagante**

```http
POST /auth/register
Content-Type: application/json

{
  "username": "barbearia_x",
  "email": "contato@barbearia.com",
  "password": "123456",
  "business_name": "Barbearia X",
  "business_type": "barbearia",
  "phone": "1133333333",
  "whatsapp": "5511999999999",
  "business_slug": "barbearia-x"
}
```

**Descrição:** Cria uma nova conta **pagante** (`User`).

**Validações:**
- ✅ Email único
- ✅ Todos os campos obrigatórios
- ✅ Senha hasheada com bcrypt
- ✅ Slug normalizado (sem caracteres especiais)

**Resposta (201 Created):**
```json
{
  "message": "account created successfully"
}
```

**Erros:**
| Status | Significado |
|--------|-------------|
| `409` | Email já registrado |
| `500` | Erro interno |

---

## 🏗️ **Configuração de Templates (Register.py)**

```python
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # /Agendame/
template_dir = BASE_DIR / 'app' / 'templates'
static_dir = BASE_DIR / 'app' / 'static'
```

**Problema:** Este arquivo **recria** a configuração de templates Jinja2, que **já existe** em `app/core/config.py`. Isso é duplicação de código.

**Sugestão:** Importar `templates` de `app.core.config` em vez de recriar.

---

# 🔄 **Fluxos Completos de Autenticação**

## **1. Fluxo de Registro → Login → Dashboard**

```
Usuário novo
    ↓
POST /auth/register → Conta criada
    ↓
GET /login → Página de login
    ↓
POST /auth/login → Autenticação
    ↓
✅ Cookies HTTP-only setados
    ↓
303 Redirect → /agendame/dashboard
    ↓
Dashboard carregado com usuário autenticado
```

## **2. Fluxo de Conta Trial**

```
Usuário acessa /auth/agendame/trial (rota em templates/register_trial.py)
    ↓
Preenche formulário
    ↓
POST /auth/signup/free-trial (???)
    ↓
❌ ESTA ROTA NÃO EXISTE EM auth/register.py!
    ↓
⚠️ Conta trial criada apenas via SignupFreeTrial().create() em outra rota
```

**⚠️ PROBLEMA IDENTIFICADO:**
O endpoint para registro de contas trial **não está implementado** em `routes/auth/register.py`. A funcionalidade existe em `service/auth/auth_register.py` (classe `SignupFreeTrial`), mas **não há rota exposta**!

---

## **3. Fluxo de Logout**

```
Usuário logado
    ↓
Clica em "Sair"
    ↓
GET /auth/logout
    ↓
🗑️ Cookies removidos
    ↓
303 Redirect → /login
```

---

# 🧠 **Decisões de Design**

## ✅ **Por que redirecionar em erro de login?**

**Motivo:** A rota `/auth/login` é usada tanto por **APIs** quanto por **formulários HTML**. Para formulários, redirecionar com mensagem de erro é mais amigável que retornar JSON.

**Solução:**
- ✅ APIs recebem JSON
- ✅ Formulários recebem `RedirectResponse`
- ✅ Mensagens via query params (`?error=...`)

## ✅ **Por que `OAuth2PasswordRequestForm`?**

**Motivo:** Compatibilidade com o padrão OAuth2 e com o `Swagger UI` do FastAPI, que gera automaticamente um formulário de teste.

## ✅ **Por que `GET /logout` e `POST /logout`?**

**Motivo:**
- `GET` → Conveniente para links HTML (`<a href="/auth/logout">Sair</a>`)
- `POST` → Seguro para APIs (não deve haver efeitos colaterais em GET)

---

# ⚠️ **Problemas Identificados**

## 🔴 **1. Rota de Registro Trial AUSENTE!**

**Problema:** A funcionalidade existe (`SignupFreeTrial`), mas **não há endpoint público** para criar contas trial.

**Solução:** Criar rota:
```python
@router.post('/signup/free-trial')
async def register_trial(data: TrialCreateSchema):
    trial = SignupFreeTrial(data=data.model_dump())
    return await trial.create()
```

---

## 🟡 **2. Duplicação de Configuração de Templates**

**Arquivo 1:** `app/core/config.py`
```python
templates_config = TemplatesConfig()
templates = templates_config.templates  # ✅ Instância única
```

**Arquivo 2:** `app/routes/auth/register.py`
```python
template_dir = BASE_DIR / 'app' / 'templates'
templates = Jinja2Templates(directory=str(template_dir))  # ❌ Duplicado
```

**Solução:** Importar `templates` de `app.core.config`.

---

## 🟢 **3. Tratamento de Erros Inconsistente**

Em `login_user()`:
```python
except HTTPException as e:
    return RedirectResponse(url=f'/login')  # ⚠️ Perde a mensagem de erro!
```

O parâmetro `error` não está sendo passado na URL.

**Solução:**
```python
from urllib.parse import quote
return RedirectResponse(url=f'/login?error={quote(e.detail)}')
```

---

## 🟠 **4. `remove_account_after_trial()` em toda requisição de login**

```python
is_trial = SignupFreeTrial(data=None)
result = await is_trial.remove_account_after_trial(...)
```

**Problema:** Isso cria uma nova instância `SignupFreeTrial` **a cada tentativa de login**, mesmo para usuários pagantes.

**Impacto:** Consulta desnecessária ao banco.

**Solução:** Verificar se é trial **antes** de tentar remover.

---

# 📊 **Resumo de Endpoints**

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| `GET` | `/login` | Página de login HTML | ❌ Não |
| `POST` | `/auth/login` | Autenticação (JSON) | ❌ Não |
| `GET` | `/auth/me` | Usuário atual | ✅ Sim |
| `GET` | `/auth/logout` | Logout web | ✅ Sim* |
| `POST` | `/auth/logout` | Logout API | ✅ Sim |
| `POST` | `/auth/register` | Registro pagante | ❌ Não |
| `POST` | `/auth/signup/free-trial` | **❌ NÃO EXISTE** | ❌ Não |

*\* GET /auth/logout funciona sem token, apenas remove cookies*

---

# 🛡️ **Segurança**

## ✅ **Cookies HTTP-Only**
```python
response.delete_cookie(
    key='access_token',
    httponly=True,     # ❌ Não acessível via JavaScript
    secure=True,       # ✅ Apenas HTTPS (produção)
    samesite='none'    # ✅ Cross-site (para API separada)
)
```

## ✅ **Headers Anti-Cache**
```python
response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
response.headers['Pragma'] = 'no-cache'
```

## ✅ **Senhas Hasheadas**
Nunca trafegam ou armazenam senhas em texto puro (bcrypt).

---

# 🚀 **Exemplos Práticos**

## **1. Login via cURL (API)**
```bash
curl -X POST https://agendame.com/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=contato@barbearia.com&password=123456"
```

## **2. Login via Formulário HTML**
```html
<form action="/auth/login" method="post">
  <input type="text" name="username" placeholder="Email">
  <input type="password" name="password" placeholder="Senha">
  <input type="hidden" name="next" value="/agendame/dashboard">
  <button type="submit">Entrar</button>
</form>
```

## **3. Verificar Usuário Atual**
```bash
curl -X GET https://agendame.com/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## **4. Logout via Link HTML**
```html
<a href="/auth/logout">Sair do sistema</a>
```

---

# 📌 **Conclusão**

O módulo `auth/` é a **porta de entrada** do Agendame:

✅ **Funcional** - Login, logout, registro, sessão
✅ **Flexível** - Suporta API e formulários HTML
✅ **Seguro** - Cookies HTTP-only, headers anti-cache
✅ **Compatível** - Swagger UI via OAuth2PasswordRequestForm

⚠️ **Mas com problemas críticos:**
- ❌ **Registro trial não implementado** - Funcionalidade existe mas não está exposta!
- ❌ **Duplicação de código** - Configuração de templates recriada
- ❌ **Erros sem mensagem** - Redirect perde o detalhe do erro

**Sem este módulo, ninguém entra. Sem entrada, não há sistema.** 🔐

---

## 🔧 **Correções Sugeridas Imediatas**

```python
# 1. Adicionar rota de registro trial
@router.post('/signup/free-trial', status_code=201)
async def register_trial(data: TrialCreateSchema):
    trial = SignupFreeTrial(data=data.model_dump())
    return await trial.create()

# 2. Importar templates do core.config
from app.core.config import templates  # ✅ Remover configuração duplicada

# 3. Passar mensagem de erro no redirect
from urllib.parse import quote
return RedirectResponse(
    url=f'/login?error={quote(e.detail)}',
    status_code=303
)
```

---

**📘 Documentação gerada a partir do código fonte em `app/routes/auth/` - 2 arquivos, 6 endpoints, 1 problema crítico.**
