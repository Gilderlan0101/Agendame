# 🔧 **app/service/ - Camada de Serviços e Autenticação**

## 📋 **Visão Geral do Módulo**

O módulo `service` é responsável por toda a **lógica de autenticação, geração e validação de tokens JWT**, e gerenciamento de contas (pagantes e trial). Esta camada atua como um **intermediário especializado** entre as rotas (HTTP) e os controllers (domínio), isolando a complexidade de segurança e identidade.

---

## 📁 **Estrutura do Módulo**

```
service/
├── auth/                 # 🔐 Autenticação e criação de contas
│   ├── auth_login.py        # Login de usuários (User e Trial)
│   ├── auth_register.py     # Registro de contas pagantes e trial
│   └── __init__.py
│
├── jwt/                  # 🎫 JSON Web Tokens
│   ├── auth.py              # Criação e verificação de tokens
│   ├── depends.py           # Dependency injection (get_current_user)
│   ├── jwt_decode_token.py  # Decodificação e validação
│   └── __init__.py
│
└── README.md            # 📘 Documentação
```

---

# 🔐 **PARTE 1: Módulo `auth/` - Autenticação e Registro**

## 🎯 **Propósito**

Gerencia todo o ciclo de vida de **identidade dos usuários**:
- ✅ Login de usuários pagantes (`User`)
- ✅ Login de contas trial (`TrialAccount`)
- ✅ Registro de novas contas pagantes
- ✅ Registro de contas trial (7 dias grátis)
- ✅ Contagem regressiva de dias restantes

---

## 📄 **1.1 `auth_login.py` - Serviço de Login**

### **Função: `checking_account()`**
```python
async def checking_account(request: Optional[Request] = None, target: Dict[str, Any] = None)
```

**Responsabilidade:**
Autentica usuários **pagantes** (`User`) e gera tokens JWT.

**Fluxo:**
```
1. Recebe credentials (username/email + password)
2. Busca usuário na tabela User
3. Verifica senha com bcrypt
4. Gera access_token e refresh_token
5. Se houver Request → cria RedirectResponse com cookie
6. Retorna dados do usuário + tokens
```

**Características:**
- ✅ Busca por **email OU username** (flexível)
- ✅ Suporte a **requisições com ou sem Request** (API + Web)
- ✅ Redirecionamento para `next` URL após login
- ✅ Cookie HTTP-only com `SameSite` dinâmico

**Retorno (autenticado):**
```python
{
    'access_token': 'eyJhbGci...',
    'refresh_token': 'eyJhbGci...',
    'token_type': 'bearer',
    'user_id': 123,
    'username': 'barbearia_x',
    'email': 'contato@barbearia.com',
    'business_name': 'Barbearia X',
    'slug': 'barbearia-x',
    'response': RedirectResponse,  # Se request fornecido
    'is_trial': False
}
```

---

### **Função: `checking_account_trial()`**
```python
async def checking_account_trial(request: Optional[Request] = None, target: Dict[str, Any] = None)
```

**Responsabilidade:**
Autentica usuários **trial** (`TrialAccount`) e gera tokens JWT.

**Diferenças do login pagante:**
- ✅ Busca **apenas na tabela TrialAccount**
- ✅ Calcula `days_remaining` (dias restantes do teste)
- ✅ Flag `is_trial: True`

**Retorno adicional:**
```python
{
    # ... mesmos campos do login pagante
    'is_trial': True,
    'days_remaining': 5  # Dias restantes do período de teste
}
```

---

## 📄 **1.2 `auth_register.py` - Serviço de Registro**

### **Função: `create_account()`**
```python
async def create_account(target: Dict[str, Any])
```

**Responsabilidade:**
Cria novas contas **pagantes** (`User`).

**Validações:**
- ✅ Todos os campos obrigatórios preenchidos
- ✅ Email não pode estar duplicado
- ✅ Senha hasheada com bcrypt (truncada em 72 bytes)

**Retorno:**
```python
{
    'username': 'barbearia_x',
    'email': 'contato@barbearia.com',
    'status': True,
    'is_trial': False  # Conta pagante
}
```

---

### **Classe: `SignupFreeTrial`**

**Responsabilidade:**
Gerencia todo o ciclo de vida de **contas de teste (7 dias grátis)**.

```python
class SignupFreeTrial:
    def __init__(self, data: Dict[str, Any] | None)
    async def create(self) -> Dict
    async def count_days_remaining(self, account_target_id) -> int
    async def remove_account_after_trial(self, target_by_email: str) -> bool
    def set_test_mode(self, enabled: bool = True, days_remaining: int = 4)
```

#### **🔧 Método: `create()`**
Cria uma nova conta trial com período de 8 dias (start + 8 = end).

**Características:**
- ✅ `subscription_start`: momento do registro (UTC)
- ✅ `subscription_end`: start + 8 dias
- ✅ Calcula `days_remaining` automaticamente

#### **⏳ Método: `count_days_remaining()`**
Calcula quantos dias faltam para o término do período trial.

**Lógica:**
```python
if date_now >= subscription_end:
    return 0  # Já expirou
else:
    delta = subscription_end - date_now
    return delta.days  # Dias restantes
```

#### **🧪 Modo de Teste**

A classe possui um **modo de teste** para desenvolvimento:

```python
# Ativar modo de teste (sempre retorna 4 dias)
trial = SignupFreeTrial(data)
trial.set_test_mode(enabled=True, days_remaining=4)

# Modo normal (cálculo real)
trial.set_test_mode(enabled=False)
```

**Por que existe?**
Evita que contas trial expirem durante o desenvolvimento, permitindo testar funcionalidades sem precisar recriar contas a cada 7 dias.

#### **🗑️ Método: `remove_account_after_trial()`**
Remove automaticamente contas trial expiradas.

**Comportamento:**
- Em **modo teste**: sempre retorna `False` (nunca remove)
- Em **modo normal**: remove se `data_atual > subscription_end`

---

# 🎫 **PARTE 2: Módulo `jwt/` - JSON Web Tokens**

## 🎯 **Propósito**

Camada completa de gerenciamento de **tokens JWT**:
- ✅ Criação de Access Tokens
- ✅ Criação de Refresh Tokens
- ✅ Hash e verificação de senhas (bcrypt)
- ✅ Decodificação e validação de tokens
- ✅ Dependency injection para usuário atual
- ✅ Verificação de expiração próxima

---

## 📄 **2.1 `auth.py` - Core de Tokens e Senhas**

### **🔐 Hash de Senhas: `get_hashed_password()`**

```python
def get_hashed_password(password: str) -> str
```

**Implementação crítica:**
```python
# 1. Converte para bytes
password_bytes = password.encode('utf-8')

# 2. TRUNCAMENTO: bcrypt aceita no máximo 72 bytes
if len(password_bytes) > 72:
    password_bytes = password_bytes[:72]

# 3. Hash com bcrypt (salt automático)
hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
```

**⚠️ IMPORTANTE:**
O truncamento de 72 bytes **deve ser idêntico** na verificação! Qualquer discrepância quebrará a autenticação.

---

### **✅ Verificação: `verify_password()`**

```python
def verify_password(plain_password: str, hashed_password: str) -> bool
```

**Aplica o MESMO truncamento** da função de hash:
```python
password_bytes = plain_password.encode('utf-8')
if len(password_bytes) > 72:
    password_bytes = password_bytes[:72]  # ← CRÍTICO!
```

**Fallback:** Se bcrypt falhar, tenta `passlib.CryptContext`

---

### **🎟️ Access Token: `create_access_token()`**

```python
def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[int] = ACCESS_TOKEN_EXPIRE_MINUTES
) -> str
```

**Características:**
- ✅ Payload: `{ "exp": timestamp, "sub": user_id }`
- ✅ Assinado com `JWT_SECRET_KEY`
- ✅ Algoritmo: `HS256` (do .env)
- ✅ Timezone: `America/Sao_Paulo`

**Duração padrão:** `60 * 8 = 480 minutos` (8 horas)

---

### **🔄 Refresh Token: `create_refresh_token()`**

```python
def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[int] = None
) -> str
```

**⚠️ OBSERVAÇÃO TÉCNICA:**
Atualmente usa a mesma duração do Access Token (8h). **Recomenda-se** criar uma variável `REFRESH_TOKEN_EXPIRE_MINUTES` para duração maior (ex: 7 dias).

**Assinatura:** `JWT_REFRESH_SECRET_KEY` (chave diferente do Access Token)

---

### **🔍 Verificação de Refresh: `verify_refresh_token()`**

```python
def verify_refresh_token(token: str) -> str
```

- ✅ Decodifica com `JWT_REFRESH_SECRET_KEY`
- ✅ Valida expiração
- ✅ Retorna `user_id` (subject) se válido
- ❌ Lança HTTPException 401 se inválido/expirado

---

### **⏰ Utilitários de Token:**

| Função | Descrição |
|--------|-----------|
| `get_token_payload()` | Decodifica **sem verificar expiração** (debug) |
| `is_token_expiring_soon()` | Verifica se expira em < X minutos |

---

## 📄 **2.2 `jwt_decode_token.py` - Decodificação e Validação**

### **Classe: `DecodeToken`**

```python
class DecodeToken:
    def __init__(self, token: str)
    @property
    def user_id(self) -> int
    @property
    def subject(self) -> str
```

**Responsabilidade:**
Encapsula toda a lógica de **decodificação e validação** de tokens JWT.

**Fluxo:**
```
1. Recebe token string
2. Tenta decodificar com JWT_SECRET_KEY + HS256
3. Converte payload para TokenPayload (Pydantic)
4. Verifica expiração manualmente
5. Expõe user_id como inteiro
```

**Tratamento de erros:**
- ❌ Token inválido → HTTPException 401
- ❌ Token expirado → HTTPException 401
- ❌ Token não fornecido → HTTPException 401

**Por que uma classe e não uma função?**
Para **encapsular estado** e permitir acesso consistente aos dados decodificados.

---

## 📄 **2.3 `depends.py` - Dependency Injection**

### **Schema: `SystemUser`**

```python
class SystemUser(BaseModel):
    id: int
    username: str
    email: EmailStr
    phone: str
    name: str
    slug: str
    is_trial: bool
    # ... outros campos
```

**Representação unificada** do usuário autenticado, independente de ser `User` ou `TrialAccount`.

---

### **Dependency: `get_current_user()`**

```python
async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[SystemUser]
```

**Esta é a função MAIS IMPORTANTE do módulo!** 🎯

**Estratégia de busca do token:**

```
1. Tenta header Authorization: Bearer <token>
2. Se não existir, tenta cookie: access_token
3. Se não existir, retorna None (não autenticado)
```

**Fluxo de validação:**
```
1. DecodeToken(token) → obtém user_id
2. Busca em User.get_or_none(id=user_id)
3. Se não encontrar, busca em TrialAccount
4. Se não encontrar, retorna None
5. Constrói SystemUser com dados disponíveis
```

**Uso em rotas protegidas:**
```python
@router.get("/dashboard")
async def dashboard(current_user = Depends(get_current_user)):
    if not current_user:
        return RedirectResponse("/login")
    return {"user": current_user.email}
```

---

# 🔄 **Fluxo Completo de Autenticação**

## **1. Registro (Sign Up)**
```
POST /auth/register
    → auth_register.create_account()
        → User.create()
        ← 201 Created

POST /auth/signup/free-trial
    → SignupFreeTrial().create()
        → TrialAccount.create()
        ← 201 Created + days_remaining
```

## **2. Login**
```
POST /auth/login
    → checking_account() ou checking_account_trial()
        → verify_password()
        → create_access_token()
        → create_refresh_token()
        ← 200 OK + tokens + user data
```

## **3. Uso de Rotas Protegidas**
```
GET /agendame/dashboard
    → AuthMiddleware (core/config.py)
        → get_current_user() [depends.py]
            → DecodeToken() [jwt_decode_token.py]
            → User.get_or_none() / TrialAccount.get_or_none()
            ← SystemUser
    → request.state.user (disponível)
    ← 200 OK
```

## **4. Logout**
```
POST /auth/logout
    → Remove cookie access_token
    ← 303 Redirect to /login
```

---

# 🔐 **Variáveis de Ambiente Utilizadas**

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `JWT_SECRET_KEY` | ✅ Sim | Chave para assinar Access Tokens |
| `JWT_REFRESH_SECRET_KEY` | ✅ Sim | Chave para assinar Refresh Tokens |
| `ALGORITHM` | ✅ Sim | Algoritmo (HS256) |
| `schemes_PASSWORD` | ✅ Sim | bcrypt |
| `DEPRECATED_PASSWORD` | ✅ Sim | auto |

**Exemplo .env:**
```env
JWT_SECRET_KEY=seu_segredo_aqui_32_bytes_hex
JWT_REFRESH_SECRET_KEY=outro_segredo_aqui_32_bytes_hex
ALGORITHM=HS256
schemes_PASSWORD=bcrypt
DEPRECATED_PASSWORD=auto
```

---

# 🧪 **Modo de Teste vs Produção**

## **Em Desenvolvimento:**
```python
# auth_register.py
trial = SignupFreeTrial(data)
trial.set_test_mode(True, days_remaining=4)  # Sempre 4 dias
```

## **Em Produção:**
```python
# auth_register.py
trial = SignupFreeTrial(data)
trial.set_test_mode(False)  # Cálculo real
```

**⚠️ ATENÇÃO:** Remova ou desative o modo de teste **antes** de ir para produção!

---

# 📊 **Resumo de Responsabilidades**

| Arquivo | Classe/Função | Responsabilidade |
|---------|---------------|------------------|
| `auth_login.py` | `checking_account()` | Login de usuários pagantes |
| `auth_login.py` | `checking_account_trial()` | Login de usuários trial |
| `auth_register.py` | `create_account()` | Registro de contas pagantes |
| `auth_register.py` | `SignupFreeTrial` | Ciclo de vida de contas trial |
| `jwt/auth.py` | `get_hashed_password()` | Hash de senhas (bcrypt) |
| `jwt/auth.py` | `create_access_token()` | Geração de Access Tokens |
| `jwt/auth.py` | `create_refresh_token()` | Geração de Refresh Tokens |
| `jwt/jwt_decode_token.py` | `DecodeToken` | Decodificação e validação |
| `jwt/depends.py` | `get_current_user()` | Dependency injection do usuário |
| `jwt/depends.py` | `SystemUser` | Schema unificado de usuário |

---

# 🚨 **Pontos Críticos e Manutenção**

## ⚠️ **1. Truncamento de Senhas (72 bytes)**
**Problema:** bcrypt ignora caracteres além de 72 bytes
**Solução:** Aplicar truncamento **idêntico** no hash e na verificação

## ⚠️ **2. Refresh Token com duração curta**
**Problema:** Atualmente expira em 8h (igual Access Token)
**Solução:** Criar `REFRESH_TOKEN_EXPIRE_MINUTES` e usar duração maior

## ⚠️ **3. Modo de Teste ativo em produção**
**Problema:** Contas trial nunca expiram se `test_mode = True`
**Solução:** Desativar modo de teste via variável de ambiente

## ⚠️ **4. Busca em duas tabelas**
**Problema:** User e TrialAccount têm schemas diferentes
**Solução:** `get_current_user()` unifica os campos disponíveis

---

# 📌 **Conclusão**

O módulo `service/` é a **camada de segurança e identidade** do Agendame:

✅ **Autenticação robusta** - JWT + bcrypt + HTTP-only cookies
✅ **Duplo modelo de negócio** - Suporte a usuários pagantes e trial
✅ **Flexibilidade** - Funciona via API (Bearer) e Web (Cookie)
✅ **Encapsulamento** - Lógica complexa isolada das rotas
✅ **Testável** - Modo de teste para desenvolvimento

**Sem este módulo, não há usuários. Sem usuários, não há sistema.** 🔐

---

**📘 Documentação gerada a partir do código fonte em `app/service/` - 3 diretórios, 9 arquivos, 1 propósito: Autenticação.**
