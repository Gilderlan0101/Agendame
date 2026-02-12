# 🧰 **app/utils/ - Módulo de Utilitários e Funções Auxiliares**

## 📋 **Visão Geral do Módulo**

O módulo `utils` é uma **coleção de ferramentas especializadas** que fornecem funcionalidades transversais para toda a aplicação Agendame. Estas funções não se encaixam perfeitamente em outras camadas (controllers, services, models) e são **reutilizáveis** em diferentes contextos.

## 🎯 **Propósito**

| Utilitário | Responsabilidade |
|------------|------------------|
| **`i_requests.py`** | Verificação de existência de empresas (User/Trial) |
| **`normalize_company_datas.py`** | Padronização de slugs para URLs |
| **`hashed_email.py`** | Anonimização e busca de emails (LGPD) |

---

# 📄 **1. `i_requests.py` - Verificação de Empresas**

## 📌 **Propósito**

Camada de **abstração para consulta de empresas** que unifica a busca nas tabelas `User` e `TrialAccount`. É a **fonte oficial** para verificar se uma empresa existe no sistema.

## 🔧 **Função Única: `company_exist()`**

```python
async def company_exist(companyID: int) -> Optional[User | TrialAccount]
```

### **Assinatura:**
```python
async def company_exist(companyID: int) -> Optional[User]:
```

### **Comportamento:**

```
company_exist(123)
    ↓
├── Busca em User.get_or_none(id=123)
│   ├── ✅ Encontrou → retorna User
│   └── ❌ Não encontrou
│       ↓
│       Busca em TrialAccount.get_or_none(id=123)
│       ├── ✅ Encontrou → retorna TrialAccount
│       └── ❌ Não encontrou → retorna None
```

### **Validações:**

| Cenário | Comportamento |
|---------|---------------|
| `companyID = 123` (int válido) | Busca normal |
| `companyID = "123"` (string) | ❌ `ValueError` |
| `companyID = None` | ❌ `ValueError` |
| ID existe em User | ✅ Retorna `User` |
| ID existe em Trial | ✅ Retorna `TrialAccount` |
| ID não existe | ✅ Retorna `None` |
| Erro de banco | ⚠️ Log + retorna `None` |

### **Exemplo de Uso:**
```python
from app.utils.i_requests import company_exist

# Em controllers/company/company_data.py
@classmethod
async def create(cls, company_id: int) -> 'MyCompany':
    company = await company_exist(companyID=company_id)
    if not company:
        raise ValueError('Empresa não encontrada')
    return cls(target_company=company)
```

### **Por que existe?** 🤔

**Problema:** Antes, cada módulo precisava saber sobre User **E** TrialAccount:
```python
# ❌ Código espalhado e repetitivo
user = await User.get_or_none(id=company_id)
if not user:
    user = await TrialAccount.get_or_none(id=company_id)
if not user:
    raise HTTPException(...)
```

**Solução:** Centralizar em `company_exist()`:
```python
# ✅ Abstração limpa
company = await company_exist(company_id)
if not company:
    raise HTTPException(...)
```

---

# 📄 **2. `normalize_company_datas.py` - Padronização de Slugs**

## 📌 **Propósito**

Garante que **URLs públicas** sejam consistentes, sem caracteres especiais ou maiúsculas. Essencial para o sistema de rotas amigáveis (`/agendame/barbearia-exemplo`).

## 🔧 **Função Única: `normalize_company_slug()`**

```python
def normalize_company_slug(slug: str) -> str
```

### **Comportamento:**

| Entrada | Processamento | Saída |
|---------|---------------|-------|
| `"Barbearia do Paulo"` | Remove espaços e especiais + lower | `barbeariadopaulo` |
| `"Corte&Estilo!"` | Remove & e ! | `corteestilo` |
| `"São Paulo Barber"` | Remove acentos? **Não** (apenas regex `[^\w]`) | `sopaulobarber` |
| `"João's Barbershop"` | Remove ' e espaços | `joaosbarbershop` |
| `"123Barbearia"` | Mantém números | `123barbearia` |

### **Código:**
```python
def normalize_company_slug(slug: str) -> str:
    # Remove qualquer caractere que não seja letra, número ou underscore
    slug = re.sub(r'[^\w]', '', slug)
    # Converte para minúsculas
    return slug.lower()
```

### **Uso no Sistema:**
```python
from app.utils.normalize_company_datas import normalize_company_slug

# Durante o registro
business_slug = normalize_company_slug(form_data.business_name)
await User.create(business_slug=business_slug, ...)
```

### **⚠️ Limitação Conhecida:**
A regex `[^\w]` remove acentos e caracteres especiais, mas **não** os normaliza. Exemplo:
- `"São Paulo"` → `"sopaulo"` (perdeu o "ã")
- `"Café"` → `"caf"` (perdeu o "é")

**Sugestão de melhoria:** Adicionar `unidecode` ou `unicodedata.normalize()`.

---

# 📄 **3. `hashed_email.py` - Proteção LGPD e Busca**

## 📌 **Propósito**

Sistema de **anonimização de emails** para conformidade com a LGPD, permitindo:
- ✅ Armazenar emails de forma **irreversível** (hash)
- ✅ Verificar credenciais sem expor o email original
- ✅ Buscar registros por email de forma eficiente

## 🔧 **Estrutura de Segurança em Duas Camadas**

```
Email do usuário
        ↓
    ┌───┴───┐
    ↓       ↓
[Camada 1] [Camada 2]
   bcrypt    SHA-256
    ↓       ↓
Hash para   Hash para
autenticação  busca
    ↓       ↓
 Irreversível Determinístico
```

---

## **1️⃣ Camada de Autenticação - `bcrypt`**

### **`get_hashed_email(email: str) -> str`**
```python
def get_hashed_email(email: str) -> str:
    return EMAIL_CONTEXT.hash(email)  # bcrypt
```

**Características:**
- 🔐 **Salt automático** → hashes diferentes para mesmo email
- 🔒 **Irreversível** → não é possível recuperar o email original
- ⏱️ **Lento propositalmente** → dificulta ataques de força bruta
- ✅ **Uso**: Armazenamento seguro no banco

### **`verify_email(email: str, hashed_email: str) -> bool`**
```python
def verify_email(email: str, hashed_email: str) -> bool:
    return EMAIL_CONTEXT.verify(email, hashed_email)
```

**Uso:** Verificar se um email fornecido corresponde ao hash armazenado.

---

## **2️⃣ Camada de Busca - `SHA-256`**

### **`create_email_search_hash(email: str) -> str`**
```python
def create_email_search_hash(email: str) -> str:
    return hashlib.sha256(email.lower().encode('utf-8')).hexdigest()
```

**Características:**
- 🔍 **Determinístico** → mesmo email = mesmo hash (sempre!)
- ⚡ **Rápido** → ideal para consultas e índices
- 📏 **Tamanho fixo** → 64 caracteres hexadecimais
- ⚠️ **Não use para senhas!** (sem salt, vulnerável a rainbow tables)

**Uso:**
```python
# Durante o registro
email_hash = get_hashed_email(user.email)        # Para autenticação
email_search = create_email_search_hash(user.email)  # Para busca

await User.create(
    email=email_hash,  # Campo original (agora é hash!)
    email_search=email_search,  # Novo campo indexado
    ...
)

# Durante o login
search_hash = create_email_search_hash(form.email)
user = await User.get_or_none(email_search=search_hash)
if user and verify_email(form.email, user.email):
    # Autenticado!
```

---

## 🔍 **Comparação: bcrypt vs SHA-256**

| Característica | `get_hashed_email()` | `create_email_search_hash()` |
|----------------|---------------------|------------------------------|
| **Algoritmo** | bcrypt | SHA-256 |
| **Salt** | ✅ Sim (aleatório) | ❌ Não |
| **Determinístico** | ❌ Não | ✅ Sim |
| **Velocidade** | 🐢 Lento | ⚡ Muito rápido |
| **Segurança** | 🔒🔒🔒 Alta | 🔒 Média |
| **Uso** | Autenticação | Busca/Indexação |
| **Tamanho** | Variável (60 chars) | Fixo (64 chars) |

---

## 🏗️ **Modelo de Dados Sugerido**

```python
class User(models.Model):
    # Campo para autenticação (bcrypt)
    email = fields.CharField(max_length=255)

    # Campo para busca (SHA-256) - indexado!
    email_search = fields.CharField(max_length=64, unique=True, index=True)

    # ... outros campos
```

---

## 🎯 **Cenários de Uso**

### **✅ Correto:**
```python
# 1. Registro
email = "usuario@exemplo.com"
email_hash = get_hashed_email(email)        # Guarda para login
email_search = create_email_search_hash(email)  # Guarda para busca
await User.create(email=email_hash, email_search=email_search)

# 2. Login
search_hash = create_email_search_hash(form.email)
user = await User.get(email_search=search_hash)
if user and verify_email(form.email, user.email):
    # Logado!

# 3. Busca administrativa
search_hash = create_email_search_hash("cliente@email.com")
user = await User.get(email_search=search_hash)
```

### **❌ Incorreto:**
```python
# NUNCA faça isso!
user = await User.get(email=form.email)  # Email está hasheado!

# NUNCA armazene email em texto puro!
user = await User.create(email="joao@email.com")  # ❌ Violação LGPD
```

---

# 🔄 **Fluxo Completo de Proteção de Emails**

```
📝 Registro
    email = "joao@email.com"
    ↓
    email_hash = bcrypt.hash(email)     → armazena em `email`
    email_search = sha256(email.lower()) → armazena em `email_search`
    ↓
💾 Banco de Dados
    email: "$2b$12$KIXVjPUq3U..." (bcrypt)
    email_search: "a7c3f9e2b1d8..." (sha256)

🔐 Login
    "joao@email.com" (form)
    ↓
    sha256("joao@email.com") = "a7c3f9e2b1d8..."
    ↓
    SELECT * FROM users WHERE email_search = "a7c3f9e2b1d8..."
    ↓
    bcrypt.verify("joao@email.com", "$2b$12$KIXVjPUq3U...")
    ↓
    ✅ Autenticado!
```

---

# 📊 **Resumo do Módulo utils/**

| Arquivo | Função | Responsabilidade | Uso Principal |
|---------|--------|------------------|---------------|
| `i_requests.py` | `company_exist()` | Verificar existência de empresa | `MyCompany.create()` |
| `normalize_company_datas.py` | `normalize_company_slug()` | Padronizar URLs | Registro de empresas |
| `hashed_email.py` | `get_hashed_email()` | Hash bcrypt para autenticação | Armazenar email |
| `hashed_email.py` | `verify_email()` | Verificar email vs hash | Login |
| `hashed_email.py` | `create_email_search_hash()` | Hash SHA-256 para busca | Consultas indexadas |

---

# 🧪 **Exemplos de Uso no Sistema**

## **1. Em `controllers/company/company_data.py`:**
```python
from app.utils.i_requests import company_exist

@classmethod
async def create(cls, company_id: int) -> 'MyCompany':
    company = await company_exist(companyID=company_id)
    if not company:
        raise ValueError('Empresa não encontrada')
    return cls(target_company=company)
```

## **2. Em `routes/auth/register.py`:**
```python
from app.utils.normalize_company_datas import normalize_company_slug
from app.utils.hashed_email import get_hashed_email, create_email_search_hash

@router.post("/register")
async def register(data: RegisterSchema):
    slug = normalize_company_slug(data.business_name)
    email_hash = get_hashed_email(data.email)
    email_search = create_email_search_hash(data.email)

    user = await User.create(
        email=email_hash,
        email_search=email_search,
        business_slug=slug,
        # ...
    )
```

## **3. Em `service/auth/auth_login.py`:**
```python
from app.utils.hashed_email import create_email_search_hash, verify_email

async def checking_account(target):
    email = target.get('email')
    search_hash = create_email_search_hash(email)
    user = await User.get_or_none(email_search=search_hash)

    if user and verify_email(email, user.email):
        # Autenticado!
```

---

# ⚠️ **Pontos de Atenção**

## 🔴 **1. `company_exist()` retorna `User` ou `TrialAccount`**
A anotação de tipo diz `Optional[User]`, mas pode retornar `TrialAccount`. **Corrigir:** `Union[User, TrialAccount, None]`.

## 🟡 **2. Normalização de slugs não trata acentos**
`"São Paulo"` → `"sopaulo"` (perdeu "ã"). Sugerir `unidecode`.

## 🟢 **3. Emails hasheados perdem formatação**
Não é possível saber se o email era `joao@email.com` ou `Joao@Email.Com`. **Por design:** isso é uma feature, não bug.

## 🟠 **4. `company_exist()` silencia erros**
```python
except Exception as e:
    print(f'Erro: {e}')
    return None  # ⚠️ Esconde falhas de banco!
```

---

# 📌 **Conclusão**

O módulo `utils/` é a **caixa de ferramentas essencial** do Agendame:

✅ **`i_requests.py`** - Abstração crítica para unificar User/Trial
✅ **`normalize_company_datas.py`** - Garante URLs consistentes e amigáveis
✅ **`hashed_email.py`** - Conformidade LGPD com busca eficiente

**Sem estes utilitários, o sistema seria:**
- ❌ Repetitivo (mesma lógica em 10 lugares)
- ❌ Inconsistente (slugs com maiúsculas/caracteres especiais)
- ❌ Inseguro (emails em texto puro)
- ❌ Não-conforme (violação LGPD)

**Com eles, o Agendame é:** ✅ Limpo, ✅ Consistente, ✅ Seguro, ✅ Legal. 🎯

---

**📘 Documentação gerada a partir do código fonte em `app/utils/` - 4 utilitários, 1 propósito: Facilitar a vida do desenvolvedor.**
