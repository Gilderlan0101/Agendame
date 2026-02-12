# ⚙️ **app/core/config.py - Configurações Centrais e Middleware de Autenticação**

## 📋 **Visão Geral do Módulo**

O módulo `core` é o **coração configurável** da aplicação Agendame. Ele contém dois componentes fundamentais:

| Componente | Responsabilidade |
|------------|------------------|
| **`TemplatesConfig`** | Configuração do sistema de templates Jinja2 e arquivos estáticos |
| **`AuthMiddleware`** | Middleware global de autenticação e segurança |

---

# 🎨 **PARTE 1: TemplatesConfig - Sistema de Templates**

## 📌 **Propósito**

Gerencia a configuração do **Jinja2** (motor de templates HTML) e o diretório de arquivos estáticos da aplicação.

## 🏗️ **Estrutura da Classe**

```python
class TemplatesConfig:
    def __init__(self):
        self.BASE_DIR = ...        # Diretório raiz do projeto
        self.template_dir = ...    # Caminho para templates HTML
        self.templates = ...       # Instância Jinja2Templates
        self.static_dir = ...      # Caminho para arquivos estáticos
```

## 🔍 **Funcionamento Interno**

### **1. Descoberta do Diretório Base**
```python
self.BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
```

**Resultado:**
```
__file__ = /app/core/config.py
                    ↓
os.path.dirname() = /app/core/
                    ↓
os.path.dirname() = /app/      ← BASE_DIR (raiz do projeto)
```

### **2. Configuração dos Diretórios**

| Atributo | Caminho | Conteúdo |
|----------|---------|----------|
| `template_dir` | `{BASE_DIR}/templates` | Arquivos `.html` |
| `static_dir` | `{BASE_DIR}/static` | Arquivos `.css`, `.js`, imagens |

### **3. Fallback Automático**
```python
if not os.path.exists(self.static_dir):
    os.mkdir(path=self.static_dir)  # Cria o diretório se não existir
    print(f'Diretório static criado: {self.static_dir}')
```

## 💡 **Instância Global**

```python
templates_config = TemplatesConfig()
templates = templates_config.templates
```

**Uso em rotas:**
```python
from app.core.config import templates

@router.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
```

---

# 🔐 **PARTE 2: AuthMiddleware - Sistema de Autenticação Global**

## 📌 **Propósito**

Middleware global que **intercepta TODAS as requisições** para:
- ✅ Verificar autenticação do usuário
- ✅ Proteger rotas privadas
- ✅ Gerenciar rotas públicas
- ✅ Validar hosts em produção
- ✅ Redirecionar usuários não autenticados

## 🏗️ **Arquitetura do Middleware**

```
Requisição HTTP → AuthMiddleware
                        ↓
                ┌───────┴───────┐
                ↓               ↓
           Rota Pública?   Rota Privada?
                ↓               ↓
            ✅ Permite      🔐 Verifica Token
                ↓               ↓
                            Válido? Inválido?
                              ↓        ↓
                            ✅       ❌ Redireciona
                              ↓        ↓
                            ✅ API?  /login
                              ↓
                            JSON 404
```

---

## 🛡️ **1. Controle de Rotas Públicas vs Privadas**

### **Rotas Públicas (HTML) - Sem autenticação**
```python
self.public_routes = {
    '/',                    # Landing page
    '/login',              # Página de login
    '/auth/agendame/trial', # Página de cadastro trial
    '/404',                # Página não encontrada
    '/health', '/ping',    # Health checks
    '/docs', '/redoc',     # Documentação Swagger
}
```

### **APIs Públicas (JSON) - Sem autenticação**
```python
self.public_api_routes = {
    '/auth/login',         # POST apenas (login)
    '/auth/register',      # Cadastro de usuário
    '/auth/signup/free-trial', # Cadastro trial
    '/auth/debug',         # Debug (apenas desenvolvimento)
}
```

### **Prefixos Públicos**
```python
self.public_prefixes = [
    '/static/',     # Arquivos CSS, JS, imagens
    '/docs/',       # Documentação
    '/redoc/',
    '/openapi',     # OpenAPI schema
    '/favicon',     # Ícone do site
    '/health',      # Monitoramento
]
```

### **🌐 Páginas Públicas de Agendamento**
```python
# URLs como /agendame/barbearia-exemplo são PÚBLICAS
if path.startswith('/agendame/') and not path.startswith('/agendame/dashboard'):
    private_sections = ['dashboard', 'services', 'appointments', 'clients']
    if parts[2] not in private_sections:
        return True  # ✅ Rota pública
```

### **🎯 Slugs Diretos**
```python
# URLs como /corte-supremo são PÚBLICAS
if len(path.split('/')) == 2 and path != '/':
    return True  # ✅ Landing page da empresa
```

---

## 🔑 **2. Verificação de Autenticação**

### **Fluxo de Extração do Token:**
```python
# 1. Primeiro tenta cookie
access_token = request.cookies.get('access_token')

# 2. Fallback para header Authorization
if not access_token:
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        access_token = auth_header.split(' ')[1]
```

### **Validação do Token:**
```python
decoded_data = DecodeToken(access_token)  # 👈 Decodifica JWT
user_id = decoded_data.user_id

# Busca usuário REAL no banco
user = await User.get_or_none(id=user_id)  # Primeiro User
if not user:
    user = await TrialAccount.get_or_none(id=user_id)  # Depois Trial
    is_trial = True
```

### **Estrutura do Usuário Autenticado:**
```python
user_data = {
    'id': user.id,
    'email': user.email,
    'username': user.username,
    'business_name': user.business_name,
    'business_slug': user.business_slug,
    'phone': user.phone,
    'is_trial': is_trial,
    '_user_obj': user,  # Objeto ORM original
}

request.state.user = user_data  # ✅ Disponível em TODAS as rotas
```

---

## 🚪 **3. Tratamento de Não Autenticados**

### **📱 Para APIs (JSON):**
```python
if path.startswith('/api/') or (path.startswith('/auth/') and path != '/auth/login'):
    return templates.TemplateResponse(
        '404.html',  # 👈 Retorna página 404 (não JSON)
        status_code=404
    )
```

**🤔 Por que 404 e não 401?**
- **Segurança por obscuridade**: Não revela que a rota existe
- **Previne enumeração de endpoints**
- **UX consistente**: Usuário vê página bonita, não erro técnico

### **🌐 Para Web (HTML):**
```python
# Redireciona para login com next URL
next_url = quote(path, safe='')
redirect_url = f'/login?next={next_url}'
return RedirectResponse(url=redirect_url, status_code=303)
```

**Exemplo:** `/agendame/dashboard` → `/login?next=%2Fagendame%2Fdashboard`

---

## 🌍 **4. Segurança em Produção**

### **Validação de Host (Anti-Hijacking)**
```python
if self.is_production and request.headers.get('host'):
    host = request.headers.get('host').split(':')[0]
    if host not in self.allowed_hosts:
        return JSONResponse(status_code=400, content={'detail': 'Host não permitido'})
```

**Configuração no .env:**
```env
ALLOWED_HOSTS=agendame.com,www.agendame.com,api.agendame.com
DOMAIN=agendame.com
```

### **Headers de Segurança**
```python
response.headers.update({
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'X-Frame-Options': 'DENY',              # 👈 Evita clickjacking
    'X-Content-Type-Options': 'nosniff',    # 👈 Evita MIME sniffing
    'Referrer-Policy': 'strict-origin-when-cross-origin',
})
```

### **Cookies Cross-Site**
```python
SAMESITE='none'  # No .env - permite cookies em iframes/embeds
```

---

## 📊 **5. Logs e Debug**

### **Modo Desenvolvimento (verbose):**
```
=== MIDDLEWARE: GET /agendame/dashboard ===
✗ Rota protegida: /agendame/dashboard
Token encontrado: eyJhbGciOiJIUzI1NiI...
✓ Usuário autenticado: [200]
```

### **Modo Produção (silencioso):**
```
GET /agendame/dashboard
POST /auth/login
GET /static/styles.css
```

---

## 🧪 **6. Exemplos de Comportamento**

| URL | Método | Autenticação | Resultado |
|-----|--------|--------------|-----------|
| `/` | GET | ❌ Não | ✅ 200 - Landing page |
| `/login` | GET | ❌ Não | ✅ 200 - Página de login |
| `/auth/login` | POST | ❌ Não | ✅ 200 - API pública |
| `/auth/login` | GET | ❌ Não | ❌ 404 - Página 404 |
| `/agendame/barbearia-x` | GET | ❌ Não | ✅ 200 - Agendamento público |
| `/agendame/dashboard` | GET | ✅ Sim | ✅ 200 - Dashboard |
| `/agendame/dashboard` | GET | ❌ Não | 🔄 303 → /login |
| `/api/services` | GET | ✅ Sim | ✅ 200 - Lista serviços |
| `/api/services` | GET | ❌ Não | ❌ 404 - Página 404 |
| `Host: hacker.com` | ANY | N/A | ❌ 400 - Host não permitido |

---

## 🔧 **7. Configuração Recomendada (.env)**

```env
# ===================================
# SECURITY & AUTH
# ===================================
ENVIRONMENT=PRODUCTION
DOMAIN=agendame.com
ALLOWED_HOSTS=agendame.com,www.agendame.com,api.agendame.com
COOKIE_DOMAIN=.agendame.com
SAMESITE=none
```

---

## 🎯 **8. Integração com o Sistema**

### **Obter usuário autenticado em qualquer rota:**
```python
@router.get("/dashboard")
async def dashboard(request: Request):
    user = request.state.user  # 👈 Disponível graças ao middleware
    return {"business": user['business_name']}
```

### **Proteger rotas explicitamente (camada extra):**
```python
from app.service.jwt.depends import get_current_user

@router.get("/settings")
async def settings(current_user = Depends(get_current_user)):
    # Dupla verificação: middleware + dependency
    return {"user": current_user.email}
```

---

## 📌 **9. Resumo das Responsabilidades**

| Componente | Responsabilidade |
|------------|------------------|
| **`TemplatesConfig`** | Configurar Jinja2 e diretórios estáticos |
| **`AuthMiddleware.dispatch()`** | Interceptar e processar todas as requisições |
| **`_is_public_route()`** | Classificar rotas como públicas/privadas |
| **`_check_authentication()`** | Validar token JWT e buscar usuário |
| **`_handle_unauthenticated()`** | Redirecionar ou retornar 404 |
| **`_get_allowed_hosts()`** | Configurar whitelist de hosts |

---

## 🚨 **10. Pontos de Atenção**

### ⚠️ **Token no Cookie vs Header**
- **Cookie**: Melhor para páginas HTML (browser envia automaticamente)
- **Header**: Melhor para APIs (controle explícito)
- **Suporte a ambos**: O middleware aceita as duas formas

### ⚠️ **404 em APIs não autenticadas**
- **Escolha de design deliberada**: Não revela existência de endpoints
- **Alternativa**: Descomentar JSONResponse com 401 no código

### ⚠️ **Busca em User e TrialAccount**
- **Sempre** busca nas duas tabelas
- **Prioridade**: User primeiro, Trial depois
- **Flag `is_trial`** disponível no request.state.user

---

## 📁 **Estrutura do Módulo**

```
core/
├── config.py         # ← TemplatesConfig e AuthMiddleware
├── __init__.py       # Exporta templates e middleware
└── README.md         # Documentação
```

---

## 🎬 **Conclusão**

O `core/config.py` é um dos módulos mais críticos do Agendame:

✅ **Centraliza** configurações essenciais
✅ **Protege** rotas privadas automaticamente
✅ **Gerencia** sessões de usuário via JWT
✅ **Diferencia** User de TrialAccount
✅ **Prepara** ambiente de templates HTML
✅ **Segurança** em camadas (hosts, headers, cookies)

**Sem ele, não há autenticação. Sem autenticação, não há sistema.** 🔐

---

**📌 Nota:** Este módulo trabalha em conjunto com `app/service/jwt/` (criação/decode de tokens) e `app/routes/` (definição de endpoints). A separação de responsabilidades é clara e segue boas práticas de arquitetura.
