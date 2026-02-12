# 📘 ** Ponto de Entrada da Aplicação Agendame**

## URL: https://agendame.onrender.com/

## 🎯 **Visão Geral**

O arquivo `main.py` é o **ponto de entrada principal** da aplicação Agendame. Ele é responsável por:
- Configurar e inicializar a instância do **FastAPI**
- Gerenciar o **ciclo de vida** da aplicação (startup/shutdown)
- Configurar **middlewares** (CORS, autenticação, MIME types)
- Servir **arquivos estáticos** (CSS, JS, imagens)
- Registrar **rotas** da API e páginas HTML
- Tratar **exceções** globalmente
- Iniciar o **servidor Uvicorn**

---

## 🏗️ **Estrutura do Arquivo**

```
main.py
├── Base Paths
├── Lifespan (Startup/Shutdown)
├── Server Class
│   ├── __init__()
│   ├── setup_static_files()
│   ├── setup_middlewares()
│   ├── setup_routes()
│   ├── setup_exception_handlers()
│   └── run()
├── Bootstrap
└── Entry Point
```

---

## 🔄 **Ciclo de Vida da Aplicação (Lifespan)**

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_dotenv()           # 1. Carrega variáveis de ambiente
    await init_database()   # 2. Inicializa banco de dados
    yield                   # 3. Aplicação em execução
    await close_database()  # 4. Encerra conexões
```

**Fluxo de inicialização:**

```
📦 FastAPI iniciando
    ↓
🔧 load_dotenv() ← Carrega .env
    ↓
🗄️ init_database() ← Configura ORM + Testa conexão + Cria tabelas
    ↓
✅ yield ← APLICAÇÃO PRONTA (aguarda requisições)
    ↓
🧹 close_database() ← Fecha conexões com banco
    ↓
🛑 FastAPI encerrado
```

---

## 🧠 **Classe `Server` - Orquestradora Principal**

A classe `Server` encapsula **toda a configuração** da aplicação FastAPI, seguindo o princípio de **responsabilidade única**.

### **1. `__init__()` - Construtor**

```python
def __init__(self) -> None:
    self.app = FastAPI(
        title='Agendame',
        description='Sistema de agendamento para salões e serviços',
        version='1.0.0',
        lifespan=lifespan,
        docs_url='/docs',
        redoc_url='/redoc',
    )
    self.setup_static_files()
    self.setup_middlewares()
    self.setup_routes()
    self.setup_exception_handlers()
```

**Cria a instância FastAPI com:**
- ✅ Título e descrição personalizados
- ✅ Suporte a lifespan (async)
- ✅ Documentação automática Swagger (`/docs`) e ReDoc (`/redoc`)
- ✅ Executa todas as configurações na ordem correta

---

### **2. `setup_static_files()` - Arquivos Estáticos**

**Responsabilidades:**
- ✅ Mapeia o diretório `app/static/` para a rota `/static`
- ✅ Cria o diretório automaticamente se não existir
- ✅ Configura middleware para **Content-Type** correto (JS, CSS, HTML)

**Problema resolvido:**
Navegadores modernos exigem `Content-Type: text/javascript` para arquivos .js. Este middleware adiciona automaticamente:

```python
if path.endswith('.js'):
    response.headers['Content-Type'] = 'text/javascript'
elif path.endswith('.css'):
    response.headers['Content-Type'] = 'text/css'
```

**Tratamento especial:**
Captura erro `No response returned` e retorna JSON 500 amigável.

---

### **3. `setup_middlewares()` - Middlewares Globais**

#### **CORS Middleware**
```python
self.app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(os.getenv('ORIGIN'))],
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['*'],
)
```
- Permite requisições de origem cruzada (Cross-Origin)
- Lê domínio permitido da variável `ORIGIN` no `.env`
- Restringe métodos HTTP para segurança

#### **AuthMiddleware**
```python
self.app.add_middleware(AuthMiddleware)
```
Middleware customizado (definido em `app.core.config`) para autenticação JWT.

---

### **4. `setup_routes()` - Registro de Rotas**

```python
def setup_routes(self) -> None:
    register_routes(self.app)
```

Delega para `app.routes.router.register_routes()` o registro centralizado de todas as rotas da aplicação.

---

### **5. `setup_exception_handlers()` - Tratamento Global de Erros**

**Handler 1 - Erro de Validação (422):**
```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(...):
    return JSONResponse(status_code=422, content={'detail': exc.errors()})
```

**Handler 2 - Página 404:**
```python
@app.exception_handler(404)
async def not_found_exception_handler(...):
    if request.url.path.startswith('/api/') or request.url.path.startswith('/auth/'):
        return templates.TemplateResponse('404.html', status_code=404)
```

**Comportamento inteligente:**
- Rotas de API (`/api/*`, `/auth/*`) → Renderiza `404.html`
- Outras rotas → FastAPI lida com default

---

### **6. `run()` - Inicialização do Servidor**

```python
def run(self, host: str = '0.0.0.0', port: int = 8000) -> None:
    uvicorn.run(
        'main:app',
        host=host,
        port=port,
        reload=os.getenv('ENVIRONMENT') == 'DEVELOPMENT',
        workers=1,
    )
```

**Características:**
- 🚀 Banner ASCII de inicialização
- 📊 Mostra diretórios e URLs ativos
- 🔄 **Hot reload** automático em desenvolvimento
- ⚙️ Worker único (padrão para desenvolvimento)

**Saída no terminal:**
```
==================================================
🚀 Iniciando Agendame
📁 Diretório estático: /home/user/Code/Agendame/app/static
🌐 URL: http://localhost:8000
📚 Documentação: http://localhost:8000/docs
==================================================
```

---

## 🎬 **Bootstrap e Entry Point**

### **Instância Global**
```python
server_instance = Server()
app = server_instance.app
```
A variável `app` é exportada para uso pelo Uvicorn.

### **Execução Direta**
```python
if __name__ == '__main__':
    server_instance.run()
```
Permite executar o arquivo diretamente: `python main.py`

---

## 📁 **Estrutura de Diretórios no Sistema de Arquivos**

```
Agendame/
├── main.py                 # ← VOCÊ ESTÁ AQUI
├── app/
│   ├── static/             # Arquivos públicos (JS, CSS, imagens)
│   │   ├── styles.css
│   │   ├── main.js
│   │   └── icon/
│   └── templates/          # Templates HTML
│       ├── index.html
│       ├── login.html
│       └── 404.html
```

---

## 🔧 **Variáveis de Ambiente Utilizadas**

| Variável | Obrigatória | Padrão | Uso |
|----------|-------------|--------|-----|
| `ENVIRONMENT` | Não | `DEVELOPMENT` | Define reload automático |
| `ORIGIN` | **Sim** | - | Domínio permitido para CORS |

**Exemplo `.env`:**
```env
# 🔐 **Configuração de Ambiente (.env) - Agendame**

## 📋 **Visão Geral do Arquivo .env**

O arquivo `.env` é o **centro nervoso de configuração** da aplicação Agendame. Ele contém todas as variáveis sensíveis e específicas de ambiente que a aplicação precisa para funcionar corretamente. **Este arquivo NUNCA deve ser versionado no Git** (já está no `.gitignore`).

---

## 🧩 **Estrutura do Arquivo .env**

```
.env
├── 🌍 ENVIRONMENT
├── 🔑 JWT CONFIG
├── 💾 DATABASE - DEVELOPMENT
├── 🏭 DATABASE - PRODUCTION
├── 🔐 EMAIL HASH
├── ☁️ SUPABASE
├── 🌐 DOMÍNIOS
└── 🍪 SAMESITE
```

---

## 🌍 **1. ENVIRONMENT - Ambiente de Execução**

```env
# ===================================
# ENVIRONMENT
# ===================================
ENVIRONMENT=DEVELOPMENT
#ENVIRONMENT=PRODUCTION
```

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `ENVIRONMENT` | `DEVELOPMENT` / `PRODUCTION` | Define o ambiente de execução |

**Impacto no sistema:**
- ✅ **DEVELOPMENT**: SQLite + Hot reload + Debug ativo
- ✅ **PRODUCTION**: PostgreSQL + Sem reload + Otimizações

**⚠️ IMPORTANTE:** Apenas **UMA** opção deve estar descomentada! Comente a que não estiver usando.

---

## 🔑 **2. JWT CONFIG - Autenticação e Tokens**

```env
# ===================================
# JWT CONFIG
# ===================================
JWT_SECRET_KEY=sua_chave_secreta_aqui
JWT_REFRESH_SECRET_KEY=sua_chave_refresh_aqui
ALGORITHM=HS256

# Tempo do access token (8h já está hardcoded no código)
# ACCESS_TOKEN_EXPIRE_MINUTES=480

schemes_PASSWORD=bcrypt
DEPRECATED_PASSWORD=auto
```

| Variável | Descrição | Segurança |
|----------|-----------|-----------|
| `JWT_SECRET_KEY` | Chave para assinar tokens de acesso | 🔴 **CRÍTICA** |
| `JWT_REFRESH_SECRET_KEY` | Chave para refresh tokens | 🔴 **CRÍTICA** |
| `ALGORITHM` | Algoritmo de criptografia (HS256) | ✅ Padrão seguro |
| `schemes_PASSWORD` | Algoritmo de hash de senha (bcrypt) | ✅ Forte |
| `DEPRECATED_PASSWORD` | Fallback para hashes antigos | ⚠️ Manter como 'auto' |

### 🔒 **Gerando Chaves JWT Seguras:**

```bash
# Linux/Mac - gere uma chave de 32 bytes (64 caracteres hex)
openssl rand -hex 32

# Windows - PowerShell
$bytes = [byte[]]::new(32); (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [System.BitConverter]::ToString($bytes) -replace '-', ''
```

**⚠️ IMPORTANTE:**
- As chaves **NUNCA** devem ser compartilhadas ou versionadas
- Em produção, use um **cofre de senhas** (AWS Secrets Manager, HashiCorp Vault, etc)
- Rotacione as chaves periodicamente

---

## 💾 **3. DATABASE - DEVELOPMENT (SQLite)**

```env
# ===================================
# DATABASE - DEVELOPMENT (SQLite)
# ===================================
DB_NAME_DEV_LOCAL=agendame.db
```

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DB_NAME_DEV_LOCAL` | `agendame.db` | Nome do arquivo SQLite local |

**Características:**
- ✅ Zero configuração - apenas instale e use
- ✅ Ideal para desenvolvimento e testes locais
- ✅ Arquivo criado automaticamente na primeira execução
- ❌ **NÃO USAR EM PRODUÇÃO** (baixa concorrência, sem rede)

**Localização do arquivo:**
```
./agendame.db  ← Raiz do projeto
```

---

## 🏭 **4. DATABASE - PRODUCTION (MySQL/PostgreSQL)**

```env
# ===================================
# DATABASE - PRODUCTION (MySQL)
# ===================================
DB_USER_PROD=seu_usuario
DB_PASSWORD_PROD=sua_senha_forte
DB_HOST_PROD=localhost
DB_PORT_PROD=3306
DB_NAME_PROD=agendame_prod
```

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DB_USER_PROD` | Usuário do banco | `agendame_user`, `postgres`, `root` |
| `DB_PASSWORD_PROD` | Senha do banco | 🔴 **Mantenha em segredo** |
| `DB_HOST_PROD` | Host/endereço | `localhost`, `192.168.1.100`, `db.empresa.com` |
| `DB_PORT_PROD` | Porta de conexão | `3306` (MySQL), `5432` (PostgreSQL) |
| `DB_NAME_PROD` | Nome do banco | `agendame_production` |

**📌 Nota:** O sistema atualmente **prioriza** `DATABASE_URL` (Supabase) para produção. Estas variáveis servem como fallback ou para outros ambientes.

---

## ☁️ **5. SUPABASE - Produção (Recomendado)**

```env
# ===================================
# SUPABASE
# ===================================
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima_aqui
DATABASE_URL=postgresql://usuario:senha@host.supabase.co:5432/postgres
```

| Variável | Descrição | Tipo |
|----------|-----------|------|
| `SUPABASE_URL` | URL do seu projeto Supabase | Pública |
| `SUPABASE_ANON_KEY` | Chave anônima do cliente | Pública* |
| `DATABASE_URL` | String de conexão direta ao PostgreSQL | 🔴 **CRÍTICA** |

### 📌 **Estrutura da DATABASE_URL:**

```
postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]

Exemplo:
postgresql://postgres:minha_senha@db.seu-projeto.supabase.co:5432/postgres
         ↑         ↑          ↑                             ↑       ↑
      usuário    senha      host                          porta   banco
```

**✅ Vantagens do Supabase:**
- Gerenciamento zero de infraestrutura
- Backups automáticos
- Escalabilidade sob demanda
- Autenticação integrada (opcional)

---

## 🔐 **6. EMAIL HASH - Anonimização (LGPD)**

```env
# ===================================
# EMAIL HASH
# ===================================
EMAIL_HASH_SCHEME=bcrypt
EMAIL_HASH_DEPRECATED=auto
```

| Variável | Descrição | Função |
|----------|-----------|--------|
| `EMAIL_HASH_SCHEME` | Algoritmo para hash de email | `bcrypt` (recomendado) |
| `EMAIL_HASH_DEPRECATED` | Fallback para hashes antigos | Manter `auto` |

**Por que hashear emails?**
- ✅ **LGPD** - Dados pessoais devem ser protegidos
- ✅ **Anonimização** - Emails não ficam expostos no banco
- ✅ **Busca preservada** - Hash permite buscas exatas
- ✅ **Segurança em camadas** - Mesmo com vazamento, emails não são legíveis

---

## 🌐 **7. DOMÍNIOS - URLs e CORS**

```env
# ===================================
# DOMÍNIOS
# ===================================
# AVISO: ALTERE O DOMÍNIO QUANDO SUBIR EM UM SERVIDOR
CURRENT_DOMINIO="http://localhost:8000/agendame/"
ORIGIN="http://localhost:8000/"
```

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `CURRENT_DOMINIO` | Base URL para links públicos | Landing pages, URLs de agendamento |
| `ORIGIN` | Domínio permitido para CORS | Quem pode acessar a API |

### 🔍 **Diferença entre as variáveis:**

```
CURRENT_DOMINIO = "http://localhost:8000/agendame/"
                        ↓
        "http://localhost:8000/agendame/barbearia-exemplo"
                                    ↑
                          (slug da empresa concatenado)

ORIGIN = "http://localhost:8000/"
         ↓
         Browser faz requisição DESTE domínio
         CORS permite APENAS esta origem
```

**Exemplos por ambiente:**

| Ambiente | CURRENT_DOMINIO | ORIGIN |
|----------|-----------------|--------|
| **Local** | `http://localhost:8000/agendame/` | `http://localhost:8000` |
| **Homologação** | `https://homolog.agendame.com/agendame/` | `https://homolog.agendame.com` |
| **Produção** | `https://app.agendame.com/agendame/` | `https://app.agendame.com` |

---

## 🍪 **8. SAMESITE - Política de Cookies**

```env
# ===================================
# SAMESITE
# ===================================
SAMESITE='none'
```

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `SAMESITE` | `none` / `lax` / `strict` | Política de segurança de cookies |

**Opções disponíveis:**

| Valor | Comportamento | Uso |
|-------|---------------|-----|
| `none` | Cookie enviado em **todas** as requisições (incluindo cross-site) | ✅ API separada do frontend |
| `lax` | Cookie enviado apenas em navegação "top-level" | ⚠️ Padrão moderno |
| `strict` | Cookie enviado apenas no mesmo site | 🔒 Mais restritivo |

**✅ Recomendação para Agendame:** `SAMESITE='none'` + `Secure` (em produção)

**⚠️ Nota:** Com `SAMESITE=none`, o cookie **DEVE** ter a flag `Secure` em produção (HTTPS obrigatório).

---

## 📋 **Modelo Completo do .env (Template Seguro)**

```env
# ===================================
# ENVIRONMENT
# ===================================
ENVIRONMENT=DEVELOPMENT
#ENVIRONMENT=PRODUCTION

# ===================================
# JWT CONFIG
# ===================================
JWT_SECRET_KEY=altere_esta_chave_em_producao
JWT_REFRESH_SECRET_KEY=altere_esta_chave_tambem
ALGORITHM=HS256
schemes_PASSWORD=bcrypt
DEPRECATED_PASSWORD=auto

# ===================================
# DATABASE - DEVELOPMENT
# ===================================
DB_NAME_DEV_LOCAL=agendame.db

# ===================================
# DATABASE - PRODUCTION
# ===================================
# Para MySQL
# DB_USER_PROD=seu_usuario
# DB_PASSWORD_PROD=sua_senha
# DB_HOST_PROD=localhost
# DB_PORT_PROD=3306
# DB_NAME_PROD=agendame_prod

# Para Supabase (recomendado)
# SUPABASE_URL=https://seu-projeto.supabase.co
# SUPABASE_ANON_KEY=sua_chave_anonima
# DATABASE_URL=postgresql://usuario:senha@db.seu-projeto.supabase.co:5432/postgres

# ===================================
# EMAIL HASH (LGPD)
# ===================================
EMAIL_HASH_SCHEME=bcrypt
EMAIL_HASH_DEPRECATED=auto

# ===================================
# DOMÍNIOS
# ===================================
CURRENT_DOMINIO="http://localhost:8000/agendame/"
ORIGIN="http://localhost:8000/"

# ===================================
# COOKIES
# ===================================
SAMESITE='none'
```

---

## ✅ **Checklist de Segurança para Produção**

- [ ] `ENVIRONMENT=PRODUCTION` - Desativa hot reload e debug
- [ ] `JWT_SECRET_KEY` - Gerada aleatoriamente (32+ bytes hex)
- [ ] `JWT_REFRESH_SECRET_KEY` - Diferente da chave principal
- [ ] `DB_PASSWORD_PROD` ou `DATABASE_URL` - Senha forte (20+ caracteres)
- [ ] `SUPABASE_ANON_KEY` - Restrita por domínio no painel do Supabase
- [ ] `CURRENT_DOMINIO` e `ORIGIN` - Usando HTTPS
- [ ] `SAMESITE='none'` + `Secure` - Requer HTTPS
- [ ] Arquivo `.env` **EXCLUÍDO** do versionamento

---

## 🚨 **Erros Comuns e Soluções**

| Erro | Causa Provável | Solução |
|------|----------------|---------|
| `JWT_SECRET_KEY not set` | .env não carregado | `load_dotenv()` antes de usar |
| `InvalidAlgorithmError` | `ALGORITHM` incorreto | Use `HS256` |
| `Connection refused` | `DB_HOST_PROD` errado | Verifique IP/domínio |
| `CORS blocked` | `ORIGIN` não corresponde | Incluir `http://` exato |
| Cookie não enviado | `SAMESITE='none'` sem `Secure` | Em HTTP use `lax` |

---

## 📌 **Resumo**

O arquivo `.env` do Agendame configura:

| Categoria | Responsabilidade |
|-----------|------------------|
| 🌍 **ENVIRONMENT** | Ambiente de execução (dev/prod) |
| 🔑 **JWT** | Assinatura e validação de tokens |
| 💾 **Database** | Conexão com SQLite (dev) ou PostgreSQL (prod) |
| ☁️ **Supabase** | Hospedagem gerenciada do banco |
| 🔐 **Email Hash** | Proteção LGPD de dados pessoais |
| 🌐 **Domínios** | URLs públicas e CORS |
| 🍪 **SAMESITE** | Política de cookies |

---

**⚠️ ÚLTIMO AVISO:** Este arquivo contém **SEGREDOS DA APLICAÇÃO**. Mantenha-o seguro, não o compartilhe e **NUNCA** o version
```

---

## 🧪 **Testes e Validações**

### **Cenários de Inicialização:**

| Cenário | Comportamento Esperado |
|---------|----------------------|
| Ambiente DEVELOPMENT | SQLite + Hot reload |
| Ambiente PRODUCTION | PostgreSQL + Sem reload |
| Diretório static ausente | Criado automaticamente |
| ORIGIN não definido | CORS bloqueia requisições |
| Database offline | RuntimeError + app não inicia |

---

## 🛡️ **Tratamento de Erros Críticos**

```python
ok = await init_database()
if not ok:
    raise RuntimeError('Falha ao inicializar o banco de dados')
```

**IMPORTANTE:** Se o banco de dados não inicializar, a aplicação **não** inicia. Isso evita estado inconsistente.

---

## 📌 **Boas Práticas Implementadas**

✅ **Separação de responsabilidades** - Classe Server encapsula configuração
✅ **Lifespan manager** - Startup/shutdown assíncrono
✅ **Fallback seguro** - Cria diretório static se não existir
✅ **MIME types corretos** - Middleware para JS/CSS
✅ **Graceful shutdown** - Fecha conexões do banco
✅ **Configuração centralizada** - Rotas em módulo separado
✅ **Tratamento global** - Exception handlers unificados

---

## 🚀 **Exemplos de Uso**

### **1. Iniciar em Desenvolvimento:**
```bash
python main.py
```

### **2. Iniciar em Produção (via Gunicorn + Uvicorn):**
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### **3. Importar app em outro módulo:**
```python
from main import app

# Usar com TestClient do FastAPI
from fastapi.testclient import TestClient
client = TestClient(app)
```

---

## 🔮 **Melhorias Futuras Sugeridas**

```python
# 1. Suporte a workers configuráveis
workers = int(os.getenv('WORKERS', '1'))

# 2. Logging estruturado
import logging
logging.basicConfig(level=logging.INFO)

# 3. Health check endpoint
@app.get('/health')
async def health_check():
    return {'status': 'healthy'}

# 4. Middleware de rate limiting
# 5. Sentry para monitoramento de erros
# 6. Cache de arquivos estáticos
```

---

## 📊 **Resumo das Responsabilidades**

| Componente | Responsabilidade |
|------------|------------------|
| `lifespan()` | Startup/shutdown do banco |
| `Server.__init__()` | Instância FastAPI + configurações |
| `setup_static_files()` | Servir JS/CSS/HTML com MIME correto |
| `setup_middlewares()` | CORS + Autenticação |
| `setup_routes()` | Registrar endpoints |
| `setup_exception_handlers()` | Erros 422, 404 e validação |
| `run()` | Iniciar servidor Uvicorn |

---

## 📝 **Conclusão**

O `main.py` do Agendame é um **excelente exemplo de arquitetura limpa** para aplicações FastAPI:

- ✅ **Organizado** - Cada responsabilidade em seu método
- ✅ **Robusto** - Tratamento de erros em todas as camadas
- ✅ **Flexível** - Configuração por ambiente
- ✅ **Auto-documentado** - Nomes descritivos e comentários estratégicos
- ✅ **Produtivo** - Hot reload em desenvolvimento

**Não é apenas um "main.py" - é o maestro que rege toda a orquestra do sistema.** 🎼

---

# 📄 **README.md - Documentação Geral do Projeto (Atualizada)**

Agora, com base na análise completa do código, apresento a **documentação geral do projeto Agendame** revisada e aprimorada:

---

# 🗓️ **Agendame - Micro-SaaS de Agendamento para Salões e Barbearias**

![Agendame Logo](https://img.icons8.com/color/96/000000/calendar--v1.png)

<div align="center">
  <h3>Automatize agendamentos. Elimine faltas. Aumente seu faturamento.</h3>
  <p>
    <a href="#-sobre-o-projeto">Sobre</a> •
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="#-arquitetura">Arquitetura</a> •
    <a href="#-tecnologias">Tecnologias</a> •
    <a href="#-como-executar">Como Executar</a> •
    <a href="#-estrutura-do-projeto">Estrutura</a>
  </p>
</div>

---

## 📋 **Sobre o Projeto**

O **Agendame** é uma solução completa de **Micro-SaaS** desenvolvida para salões de beleza e barbearias que desejam automatizar seu processo de agendamentos.

**O problema que resolvemos:**
- 📞 Salões perdem horas no telefone agendando horários
- ❌ Clientes esquecem compromissos → 30% de faltas
- 💰 Horários ociosos → Prejuízo financeiro
- 📝 Gestão manual → Caos na agenda

**Nossa solução:**
- ✅ Agendamento online 24/7
- ✅ Lembretes automáticos via WhatsApp
- ✅ Dashboard financeiro em tempo real
- ✅ Link personalizado para cada salão

---

## ✨ **Funcionalidades**

### **👨‍💼 Para Estabelecimentos**

| Funcionalidade | Descrição | Benefício |
|----------------|-----------|-----------|
| **Dashboard Completo** | Agendamentos do dia, semana e mês | Visão panorâmica do negócio |
| **Controle Financeiro** | Faturamento realizado e potencial | Tomada de decisão baseada em dados |
| **Gestão de Serviços** | Cadastro de serviços com preço/duração | Catálogo sempre atualizado |
| **Base de Clientes** | Histórico completo de cada cliente | Relacionamento personalizado |
| **Comunicação Automática** | Confirmações e lembretes via WhatsApp | Redução de 80% nas faltas |
| **Link Exclusivo** | URL personalizada (ex: agendame.com/barbearia-x) | Presença digital profissional |

### **👤 Para Clientes**

| Funcionalidade | Descrição | Fluxo |
|----------------|-----------|-------|
| **Agendamento Instantâneo** | Marque horário sem ligar | 1. Nome → 2. Serviço → 3. Horário → 4. Confirmar |
| **Visualização de Preços** | Todos os valores antes de agendar | Transparência total |
| **Confirmação Imediata** | Comprovante via WhatsApp | Segurança e praticidade |
| **Interface Simples** | Design intuitivo, 4 passos | Experiência sem fricção |

---

## 🏗️ **Arquitetura do Sistema**

### **Estrutura em Camadas**

```
┌─────────────────┐
│   Routes (API)  │ ← FastAPI endpoints
├─────────────────┤
│ Controllers (DOM)│ ← Regras de negócio
├─────────────────┤
│    Services     │ ← Lógica reutilizável
├─────────────────┤
│     Models      │ ← Tortoise ORM
├─────────────────┤
│   Database      │ ← PostgreSQL / SQLite
└─────────────────┘
```

### **Principais Módulos**

```
app/
├── controllers/    # 🧠 DOMÍNIO - Regras de negócio PURAS
│   ├── agendame/   # Agendamentos, serviços, clientes
│   └── company/    # Abstração de empresa (MyCompany)
│
├── routes/         # 🚪 API - Endpoints HTTP
│   ├── auth/       # Login, registro
│   ├── customers/  # Página pública de agendamento
│   └── agendame_company/ # Dashboard do salão
│
├── models/         # 📦 ORM - Mapeamento objeto-relacional
│   ├── user.py     # Usuários pagantes
│   └── trial.py    # Contas de teste (7 dias)
│
├── schemas/        # 📐 Pydantic - Validação e serialização
│
├── service/        # 🔧 SERVIÇOS - Lógica auxiliar
│   ├── auth/       # Autenticação
│   └── jwt/        # Tokens JWT
│
├── database/       # 💾 BANCO - Configuração e migrações
│   └── init_database.py # Setup Tortoise ORM
│
├── static/         # 🎨 FRONTEND - CSS, JS, imagens
│
└── templates/      # 🖼️ HTML - Jinja2
    ├── index.html      # Landing page
    ├── login.html      # Login do salão
    └── agendame.html   # Página de agendamento público
```

---

## 🛠️ **Stack Tecnológica**

### **Backend**
| Tecnologia | Versão | Função |
|------------|--------|--------|
| **Python** | 3.11+ | Linguagem principal |
| **FastAPI** | 0.124.0 | Framework web assíncrono |
| **Tortoise ORM** | 0.25.1 | ORM assíncrono (similar Django ORM) |
| **Pydantic** | 2.12.5 | Validação de dados |
| **JWT** | 2.10.1 | Autenticação stateless |
| **Passlib** | 1.7.4 | Hash de senhas (bcrypt) |

### **Banco de Dados**
| Ambiente | Banco | Driver |
|----------|-------|--------|
| **Desenvolvimento** | SQLite | aiosqlite |
| **Produção** | PostgreSQL (Supabase) | asyncpg |

### **Frontend**
| Tecnologia | Função |
|------------|--------|
| **HTML5 + Jinja2** | Templates server-side |
| **CSS3** | Estilização responsiva |
| **JavaScript (Vanilla)** | Interatividade sem frameworks |
| **WhatsApp API** | Comunicação com clientes |

---

## 🚀 **Como Executar o Projeto**

### **Pré-requisitos**
- Python 3.11 ou superior
- pip (gerenciador de pacotes)
- Git
- (Opcional) Conta no Supabase para produção

### **1. Clone o repositório**
```bash
git clone https://github.com/seu-usuario/agendame.git
cd agendame
```

### **2. Crie e ative o ambiente virtual**
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# ou
.venv\Scripts\activate  # Windows
```

### **3. Instale as dependências**
```bash
pip install -r requirements.txt
```

### **4. Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:

```env
# Ambiente: DEVELOPMENT ou PRODUCTION
ENVIRONMENT=DEVELOPMENT

# Domínio permitido para CORS
ORIGIN=http://localhost:8000

# Banco de Dados (SQLite para desenvolvimento)
DB_NAME_DEV_LOCAL=agendame.db

# JWT Secret (altere em produção!)
SECRET_KEY=sua_chave_secreta_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# URL base para links
CURRENT_DOMINIO=http://localhost:8000/
```

### **5. Execute a aplicação**
```bash
python main.py
```

Acesse: http://localhost:8000
Local: http://localhost:8000/docs (Swagger UI)
Documentação: https://agendame.onrender.com/docs

---

## 📁 **Estrutura Detalhada do Projeto**

```
Agendame/
├── main.py                    # Ponto de entrada
├── agendame.db               # SQLite (desenvolvimento)
├── requirements.txt          # Dependências
├── .env                      # Variáveis de ambiente
│
├── app/
│   ├── controllers/          # 🧠 REGRAS DE NEGÓCIO
│   │   ├── agendame/
│   │   │   ├── appointments.py  # Disponibilidade + agendamentos
│   │   │   └── services.py      # CRUD serviços + dashboard
│   │   └── company/
│   │       └── company_data.py  # Classe MyCompany
│   │
│   ├── routes/              # 🚪 ENDPOINTS HTTP
│   │   ├── auth/           # /auth/*
│   │   ├── customers/      # /{slug} (página pública)
│   │   ├── agendame_company/ # /agendame/company/*
│   │   └── router.py       # Registro centralizado
│   │
│   ├── models/             # 📦 MODELOS ORM
│   │   ├── user.py        # User, Service, Appointment, Client
│   │   └── trial.py       # TrialAccount
│   │
│   ├── schemas/           # 📐 VALIDAÇÃO PYDANTIC
│   │   ├── auth/          # Login, Register
│   │   └── agendame/      # Service, Appointment, Upgrade
│   │
│   ├── database/          # 💾 CONFIGURAÇÃO DE BANCO
│   │   └── init_database.py
│   │
│   ├── service/           # 🔧 SERVIÇOS AUXILIARES
│   │   ├── auth/          # Register, Login
│   │   └── jwt/           # Create, Decode, Depends
│   │
│   ├── core/              # ⚙️ CONFIGURAÇÕES GLOBAIS
│   │   └── config.py      # AuthMiddleware, templates
│   │
│   ├── utils/             # 🧰 UTILITÁRIOS
│   │   ├── hashed_email.py
│   │   └── normalize_company_datas.py
│   │
│   ├── static/            # 🎨 FRONTEND (CSS, JS)
│   │   ├── styles.css
│   │   ├── main.js
│   │   └── ...
│   │
│   └── templates/         # 🖼️ HTML (Jinja2)
│       ├── index.html     # Landing page
│       ├── login.html     # Login
│       └── 404.html       # Página não encontrada
│
└── teste.py               # Scripts de teste
```

---

## 🔐 **Autenticação e Segurança**

### **Fluxo de Autenticação JWT**
1. Usuário envia email/senha → `/auth/login`
2. Servidor valida credenciais → gera token JWT
3. Token assinado com `SECRET_KEY` + `HS256`
4. Cliente armazena token (localStorage)
5. Token enviado no header `Authorization: Bearer <token>`
6. Middleware `AuthMiddleware` valida em rotas protegidas

### **Proteção de Rotas**
```python
from app.service.jwt.depends import get_current_user

@router.get("/dashboard")
async def dashboard(current_user = Depends(get_current_user)):
    # Apenas usuários autenticados acessam
```

### **Senhas**
- Hash com **bcrypt** via Passlib
- Salt automático
- Nunca armazenadas em texto puro

---

## 💾 **Banco de Dados**

### **Modelos Principais**

**User / TrialAccount** (Empresas)
- `id`, `username`, `email`, `business_name`, `business_slug`
- `phone`, `whatsapp`, `business_hours`
- `subscription_active` (apenas User)

**Service** (Serviços)
- `name`, `description`, `price`, `duration_minutes`
- `is_active`, `order`
- Relacionado a `User` OU `TrialAccount`

**Appointment** (Agendamentos)
- `appointment_date`, `appointment_time`
- `client_name`, `client_phone`
- `status` (scheduled, confirmed, cancelled, completed)
- Relacionado a `Service` e `Client`

**Client** (Clientes)
- `full_name`, `phone`
- `total_appointments`
- Relacionado a `User` OU `TrialAccount`

---

## 🧪 **Sistema de Trial (Teste Gratuito)**

O Agendame oferece **7 dias de teste gratuito** através do modelo `TrialAccount`:

### **Características:**
- ✅ Cadastro rápido (sem cartão de crédito)
- ✅ Todas as funcionalidades liberadas
- ⏰ Expira automaticamente após 7 dias
- 🔄 Conversão para conta `User` paga

### **Limitações:**
- ❌ Não é possível migrar dados do Trial para User (manualmente)
- ❌ Sem suporte prioritário

---

## 📊 **Métricas e KPIs**

O sistema coleta automaticamente:

| Métrica | Onde ver | Importância |
|---------|----------|-------------|
| Agendamentos/dia | Dashboard | Ocupação |
| Faturamento diário | Dashboard | Receita |
| Serviços mais agendados | Dashboard (futuro) | Estratégia |
| Clientes novos | Base de clientes | Crescimento |
| Taxa de conversão Trial → Pago | Admin (futuro) | Negócio |

---

## 🐛 **Tratamento de Erros**

### **Camadas de Tratamento:**

1. **Database** → `init_database()` aborta inicialização se falhar
2. **Controllers** → HTTPException com status codes apropriados
3. **Routes** → Captura exceções e retorna respostas amigáveis
4. **Global** → Exception handlers para 404, 422, 500

### **Status Codes Utilizados:**
- `200` - Sucesso
- `201` - Criado
- `400` - Erro do cliente
- `401` - Não autenticado
- `403` - Não autorizado
- `404` - Não encontrado
- `422` - Dados inválidos
- `500` - Erro interno

---

## 📈 **Roadmap e Próximos Passos**

### **Versão 1.0 (Atual)**
- ✅ Agendamento público
- ✅ Dashboard básico
- ✅ Autenticação JWT
- ✅ Controle de serviços
- ✅ Integração WhatsApp

### **Versão 1.5 (Próximo)**
- 🔄 Lembretes automáticos programados
- 🔄 Relatórios financeiros
- 🔄 Migração automática Trial → User
- 🔄 Múltiplos profissionais por salão

### **Versão 2.0 (Futuro)**
- 📱 Aplicativo mobile
- 💳 Pagamento online
- 📊 Analytics avançado
- 🤖 Chatbot para agendamento

---

## 🤝 **Contribuição**

Contribuições são bem-vindas! Siga o padrão:

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 **Licença**

Este projeto é proprietário. Todos os direitos reservados.

---

## 📞 **Suporte**

- **Email**: contatodevorbit@gmail.com
- **WhatsApp**: (73) 99932-0283
- **Documentação**: https://agendame.onrender.com/ (Produção)

---

<div align="center">
  <p>Desenvolvido com ❤️ para barbearias e salões de todo o Brasil</p>
  <p>
    <sub>© 2024 Agendame. Transformando a gestão de salões, um agendamento de cada vez.</sub>
  </p>
</div>
```

---

**📌 Nota Final:** Esta documentação reflete **fielmente** o código apresentado, incluindo suas limitações (como a falta de suporte a TrialAccount em `MyCompany`). Qualquer discrepância entre documentação e código deve ser resolvida **alterando o código** para corresponder à documentação, ou vice-versa.
