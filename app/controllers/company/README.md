# 📁 **app/controllers/company/company_data.py - Classe `MyCompany`**

## 📋 **Visão Geral**

A classe `MyCompany` é uma **abstração de domínio** que representa uma empresa carregada em memória durante o ciclo de vida de uma requisição. Ela atua como uma **fachada unificada** para acessar dados de empresas, independentemente de serem do tipo `User` ou `TrialAccount`.

> ⚠️ **ATENÇÃO:** Esta versão do código difere da documentação anterior. O arquivo real contém uma implementação mais simples e direta, sem suporte a `TrialAccount`. A versão anterior era uma proposta conceitual.

---

## 🏗️ **Estrutura da Classe**

```python
class MyCompany:
    """
    MyCompany é responsável por entregar os dados da empresa atual.
    Cada tipo de informação deve ter um método único.
    Atua como camada de domínio sobre o model User.
    """
```

---

## 🔧 **Métodos da Classe**

### **1. Factory Method - `create()`**

```python
@classmethod
async def create(cls, company_id: int) -> 'MyCompany'
```

**Descrição:**
Factory assíncrona que cria uma instância de `MyCompany` validando primeiro se a empresa existe.

**Parâmetros:**
- `company_id` (int): ID da empresa a ser carregada

**Retorno:**
- `MyCompany`: Instância configurada da empresa

**Exceções:**
- `ValueError`: Levantada quando a empresa não é encontrada

**Exemplo:**
```python
try:
    company = await MyCompany.create(company_id=123)
except ValueError:
    # Empresa não encontrada
    raise HTTPException(status_code=404, detail="Empresa não existe")
```

---

### **2. Métodos de Acesso a Dados**

Cada método abaixo retorna um atributo específico da empresa:

| Método | Retorno | Descrição |
|--------|---------|-----------|
| `company_id()` | `int` | ID único da empresa no banco |
| `company_slug()` | `str` | Slug para URL pública (ex: `barbearia-exemplo`) |
| `company_name()` | `str` | Nome fantasia/razão social |
| `company_email()` | `str` | E-mail de contato |
| `company_phone()` | `str` | Telefone fixo |
| `company_whatsapp()` | `str` | Número do WhatsApp |
| `company_business_type()` | `str` | Tipo de negócio (barbearia, salão, etc) |
| `company_url_unic()` | `str` | URL completa da landing page |
| `is_active()` | `bool` | Status da assinatura (ativo/inativo) |

---

### **3. Método Especial - `company_url_unic()`**

```python
def company_url_unic(self) -> str:
    CURRENT_DOMINIO = os.getenv('CURRENT_DOMINIO')
    return f'{CURRENT_DOMINIO + self.company_slug()}'
```

**Descrição:**
Gera a URL pública única da empresa combinando o domínio base (do `.env`) com o slug da empresa.

**Exemplo de saída:**
```
https://agendame.com/barbearia-exemplo
```

**Dependência:**
- Requer a variável de ambiente `CURRENT_DOMINIO` configurada no arquivo `.env`

---

### **4. Método - `is_active()`**

```python
def is_active(self) -> bool:
    return bool(getattr(self.target_company, 'subscription_active', True))
```

**Descrição:**
Verifica se a assinatura da empresa está ativa. Usa `getattr()` com fallback `True` para compatibilidade com registros antigos que não possuem o campo.

**Comportamento:**
- Retorna `True` se o campo `subscription_active` não existir
- Retorna o valor real do campo se ele existir
- Converte para booleano explicitamente

---

## 🎯 **Propósito no Sistema**

### **Problema Resolvido:**
Antes do `MyCompany`, o código precisava:
```python
# ❌ Código espalhado e repetitivo
user = await User.get(id=company_id)
if not user:
    user = await TrialAccount.get(id=company_id)  # Em outras partes

business_name = user.business_name if user else None
slug = user.business_slug if user else None
# ... e assim por diante
```

### **Solução Atual:**
```python
# ✅ Abstração limpa e consistente
company = await MyCompany.create(company_id)
business_name = company.company_name()
slug = company.company_slug()
url = company.company_url_unic()
```

---

## 💻 **Exemplos de Uso**

### **Exemplo 1 - Em uma Rota FastAPI**
```python
from app.controllers.company.company_data import MyCompany

@router.get("/company/{company_id}/dashboard")
async def get_dashboard(company_id: int):
    try:
        company = await MyCompany.create(company_id)

        return {
            "company": {
                "id": company.company_id(),
                "name": company.company_name(),
                "slug": company.company_slug(),
                "url": company.company_url_unic(),
                "active": company.is_active()
            }
        }
    except ValueError:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
```

### **Exemplo 2 - Integração com Services**
```python
from app.controllers.agendame.services import Services
from app.controllers.company.company_data import MyCompany

async def get_company_services(company_id: int):
    company = await MyCompany.create(company_id)

    services_domain = Services(
        target_company_id=company.company_id(),
        target_company_name=company.company_name(),
        target_company_business_slug=company.company_slug()
    )

    return await services_domain.get_services()
```

---

## 🔄 **Fluxo de Carregamento**

```
1. Requisição HTTP recebida
2. Extrai company_id (do token, parâmetro, etc)
3. MyCompany.create(company_id)
4. ↓
   company_exist() - Verifica no banco
   ↓
   Retorna objeto User completo
   ↓
5. Instância MyCompany criada
6. ↓
   Métodos acessam atributos do User internamente
7. Dados disponíveis para toda a requisição
```

---

## 🧪 **Testes e Validações**

### **Cenários de Teste Recomendados:**

1. **Empresa existe** → Deve retornar instância válida
2. **Empresa não existe** → Deve lançar `ValueError`
3. **Campo subscription_active ausente** → `is_active()` retorna `True`
4. **Campo subscription_active = False** → `is_active()` retorna `False`
5. **CURRENT_DOMINIO não configurado** → URL gerada pode ficar incompleta

---

## ⚠️ **Limitações Conhecidas**

1. **Sem suporte a TrialAccount**
   Esta implementação funciona **apenas** com a tabela `User`. Contas de teste não são reconhecidas.

2. **Sem cache**
   Cada chamada a `create()` faz uma consulta ao banco. Para múltiplos acessos na mesma requisição, reutilize a instância.

3. **Acoplamento com os.getenv()**
   O método `company_url_unic()` depende diretamente de variável de ambiente, dificultando testes unitários.

---

## 📌 **Recomendações de Melhoria**

```python
# 1. Adicionar suporte a TrialAccount
@classmethod
async def create(cls, company_id: int, include_trial: bool = False):
    if include_trial:
        # Buscar em User e TrialAccount
        pass

# 2. Injetar domínio como parâmetro
def company_url_unic(self, base_domain: str = None):
    domain = base_domain or os.getenv('CURRENT_DOMINIO')
    return f'{domain}{self.company_slug()}'

# 3. Propriedades ao invés de métodos
@property
def slug(self):
    return self.target_company.business_slug
```

---

## 🔗 **Dependências**

| Dependência | Uso |
|-------------|-----|
| `os` | Acessar variáveis de ambiente |
| `dotenv` | Carregar .env |
| `app.models.user.User` | Modelo ORM da empresa |
| `app.utils.i_requests.company_exist` | Validação de existência |

---

## 📝 **Resumo**

A classe `MyCompany` é uma **camada de domínio leve e focada** que:

✅ Encapsula acesso a dados da empresa
✅ Fornece interface consistente
✅ Valida existência da empresa
✅ Gera URL pública automaticamente
✅ Verifica status da assinatura

**Não é** um ORM, **não é** um repository, **não é** um DTO. É uma **representação da empresa em memória** durante o processamento da requisição.

---

**📌 Nota Final:** Esta implementação é mais simples do que a versão conceitual documentada anteriormente. Prefira **sempre** ler o código real ao invés de confiar apenas na documentação.
