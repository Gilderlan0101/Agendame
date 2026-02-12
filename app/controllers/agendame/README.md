Vou criar o README.md para cada módulo baseado no código que você mostrou:

---

# 📁 **app/controllers/agendame/README.md**

## 🎯 **Visão Geral do Módulo**
Módulo responsável pela lógica de domínio (camada de negócio) do sistema de agendamento. Gerencia serviços, agendamentos, clientes e estatísticas para empresas do tipo **User** (usuários pagantes) e **TrialAccount** (contas de teste).

---

## 📦 **Estrutura de Arquivos**

```
agendame/
├── appointments.py      # Lógica de agendamentos e disponibilidade
├── services.py          # Lógica de serviços, clientes e dashboard
├── remove_service.py    # Remoção de serviços
├── update_service.py    # Atualização de serviços
└── __init__.py          # Exportação dos módulos
```

---

## 🧠 **Classes e Responsabilidades**

### **1. `appointments.py` - Classe `Appointments`**
Gerencia todo o fluxo de agendamentos, incluindo disponibilidade, criação e atualização.

**Principais métodos:**

| Método | Descrição |
|--------|-----------|
| `get_available_times()` | Retorna horários disponíveis para um serviço em uma data específica |
| `create_appointment()` | Cria um novo agendamento e vincula cliente |
| `update_one_appointments()` | Atualiza dados de um agendamento existente |
| `get_company_appointments()` | Lista todos os agendamentos da empresa |
| `_get_business_hours()` | Obtém horários de funcionamento (User ou Trial) |
| `_generate_time_slots()` | Gera slots de horário baseado na duração do serviço |
| `_filter_available_slots()` | Filtra apenas horários livres |

**Recursos importantes:**
- Suporte a **User** e **TrialAccount** simultaneamente
- Validação de horário mínimo para agendamento (`min_booking_hours`)
- Geração automática de código de confirmação (`AGD{id}`)
- Atualização automática do contador de agendamentos do cliente

---

### **2. `services.py` - Classe `Services`**
Gerencia serviços, clientes e estatísticas da empresa.

**Principais métodos:**

| Método | Descrição |
|--------|-----------|
| `get_services()` | Lista serviços com filtros (nome, preço, ativo, etc) |
| `create_service_for_current_user()` | Cria novo serviço para usuário logado |
| `upgrade_service()` | Atualiza dados de um serviço |
| `remove_one_service()` | Remove permanentemente um serviço |
| `get_clients()` | Lista clientes com busca e paginação |
| `get_dashboard_stats()` | Retorna estatísticas para o dashboard |
| `_get_company_by_identifier()` | Busca empresa por slug, username ou business_name |

**Recursos importantes:**
- Busca inteligente de empresas por múltiplos identificadores
- Tratamento de preços com `Decimal`
- Paginação e ordenação dinâmica
- Relacionamento correto com `user` ou `trial_account`

---

### **3. `update_service.py` - Função `update_one_service()`**
Função auxiliar para atualização direta de serviços.

**Características:**
- Atualização dinâmica baseada nos campos enviados
- Validação de propriedade do serviço (deve pertencer ao usuário)
- Retorno padronizado de sucesso

---

### **4. `remove_service.py` - Função `remove_one_service()`**
Função auxiliar para remoção de serviços.

**Características:**
- Remove serviço pelo ID
- Verifica se o serviço pertence ao usuário
- Retorna status 200 ou 404

---

## 🔄 **Fluxos de Negócio**

### **Fluxo de Agendamento:**
1. Cliente acessa página pública da empresa
2. Sistema busca empresa por `business_slug`
3. Cliente escolhe serviço e data
4. `get_available_times()` calcula horários disponíveis
5. `create_appointment()` cria agendamento e/ou cliente
6. Retorna confirmação com dados da empresa e código

### **Fluxo de Disponibilidade:**
- Considera horário de funcionamento por dia da semana
- Respeita `min_booking_hours` (horas mínimas de antecedência)
- Não permite agendamentos para hoje após horário limite
- Bloqueia horários já ocupados

### **Fluxo de Empresas (User vs Trial):**
- **User**: Usuários pagantes, tabela `User`
- **Trial**: Contas de teste, tabela `TrialAccount`
- Ambos compartilham mesma estrutura de negócio
- Sistema verifica automaticamente qual tabela consultar

---

## 🛠️ **Dependências**

- **FastAPI** - HTTPException, status
- **Tortoise ORM** - Q, filter, select_related
- **Python** - datetime, decimal, typing
- **Modelos**: User, TrialAccount, Service, Appointment, Client, BusinessSettings

---

## ✅ **Validações Importantes**

### Appointments:
- Não permite agendar fora do horário de funcionamento
- Não permite agendar para horários já ocupados
- Não permite agendar sem antecedência mínima
- Valida existência do serviço

### Services:
- Nome do serviço deve ser único por empresa
- Preço deve ser decimal válido
- Serviço deve pertencer à empresa que tenta alterá-lo

---

## 📊 **Exemplo de Resposta - Horários Disponíveis**

```json
{
  "date": "2024-03-20",
  "service": {
    "id": 1,
    "name": "Corte Masculino",
    "duration_minutes": 30,
    "price": "45.00"
  },
  "available_times": ["09:00", "10:00", "11:00"],
  "business_hours": {"open": "09:00", "close": "18:00"},
  "total_available": 3,
  "is_today": true,
  "min_booking_hours": 1
}
```

---

## 📋 **Exemplo de Resposta - Criação de Agendamento**

```json
{
  "success": true,
  "appointment_id": 123,
  "confirmation": {
    "company": {
      "name": "Barbearia Exemplo",
      "phone": "11999999999",
      "whatsapp": "551199999999"
    },
    "client": {
      "name": "João Silva",
      "phone": "11988887777"
    },
    "service": {
      "name": "Corte Masculino",
      "duration": 30,
      "price": "45.00"
    },
    "appointment": {
      "date": "2024-03-20",
      "time": "10:00",
      "confirmation_code": "AGD000123"
    },
    "message": "✅ Agendamento confirmado! Seu horário..."
  }
}
```

---

## 🔐 **Segurança e Boas Práticas**

- **Nunca** expõe dados sensíveis
- **Sempre** valida propriedade do recurso (usuário só acessa seus dados)
- **Tratamento** consistente de exceções
- **Logs** estruturados para debug
- **Busca flexível** sem SQL injection (Tortoise ORM)

---

## 🧪 **Contas de Teste (Trial)**
O módulo oferece suporte completo a contas Trial, permitindo:
- Criar serviços normalmente
- Gerenciar agendamentos
- Visualizar dashboard
- **Limitação**: não é possível migrar dados para conta paga automaticamente

---

**📌 Nota:** Este módulo é a **camada de domínio** do sistema. Ele não lida diretamente com requisições HTTP (isso é responsabilidade das `routes`), mas sim com a **lógica de negócio pura**.

---

Agora vou criar o README.md para o módulo `controllers/company`:

---

# 📁 **app/controllers/company/README.md**

## 🎯 **Visão Geral do Módulo**
Módulo responsável por gerenciar os dados da empresa atualmente em uso no contexto da requisição. Fornece uma abstração unificada para acessar informações de empresas independentemente de serem **User** ou **TrialAccount**.

---

## 📦 **Estrutura de Arquivos**

```
company/
├── company_data.py     # Classe MyCompany - Representação da empresa em memória
├── __init__.py         # Exportação dos módulos
└── README.md           # Esta documentação
```

---

## 🧠 **Classe Principal: `MyCompany`**

Localizada em `company_data.py`, esta classe representa uma empresa carregada em memória durante o ciclo de vida de uma requisição.

### **Construtor Privado**
```python
@classmethod
async def create(cls, company_id: int) -> "MyCompany":
    """Factory method - carrega dados da empresa do banco."""
```

A classe **não deve** ser instanciada diretamente. Use sempre `MyCompany.create(company_id)`.

---

## 📊 **Atributos da Classe**

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `id` | `int` | ID da empresa (User ou TrialAccount) |
| `username` | `str` | Nome de usuário único |
| `business_name` | `str` | Nome fantasia da empresa |
| `business_slug` | `str` | Slug para URL pública (único) |
| `business_type` | `str` | Tipo de negócio (barbearia, salão, etc) |
| `email` | `str` | E-mail de contato |
| `phone` | `str` | Telefone fixo |
| `whatsapp` | `str` | WhatsApp para contato |
| `business_hours` | `dict` | Horários de funcionamento por dia |
| `is_trial` | `bool` | Indica se é conta Trial |
| `created_at` | `datetime` | Data de criação |
| `updated_at` | `datetime` | Data da última atualização |

---

## 🛠️ **Métodos Públicos**

| Método | Descrição |
|--------|-----------|
| `company_id()` | Retorna o ID da empresa (compatibilidade) |
| `to_dict()` | Converte todos os dados para dicionário |
| `get_business_hours(day: str)` | Retorna horário de um dia específico |

---

## 🔍 **Comportamento Interno**

### **1. Carregamento Inteligente**
Ao chamar `MyCompany.create(id)`:
1. Tenta buscar na tabela `User`
2. Se não encontrar, busca na tabela `TrialAccount`
3. Se não encontrar em nenhuma, retorna `None`

### **2. Unificação de Interface**
Empresas de tipos diferentes (User/Trial) expõem **os mesmos atributos**, permitindo que o resto do sistema trate ambas de forma idêntica.

### **3. Cache em Memória**
A classe armazena os dados em atributos de instância, evitando múltiplas consultas ao banco durante a mesma requisição.

---

## 💡 **Exemplo de Uso**

```python
from app.controllers.company.company_data import MyCompany

# Carregar empresa
company = await MyCompany.create(company_id=123)

if company:
    # Acessar dados
    print(f"Empresa: {company.business_name}")
    print(f"Slug: {company.business_slug}")
    print(f"É trial? {company.is_trial}")

    # Horário de segunda-feira
    monday_hours = company.get_business_hours('monday')

    # Converter para dict (útil para responses)
    data = company.to_dict()
else:
    # Empresa não encontrada
    print("Empresa não existe")
```

---

## 🎯 **Propósito no Sistema**

A classe `MyCompany` resolve um problema fundamental do sistema:

**❌ Antes:**
```python
# Código espalhado verificando tipo toda hora
if is_trial:
    company = await TrialAccount.get(id=company_id)
else:
    company = await User.get(id=company_id)

# Acessar campos diferentes dependendo do tipo...
```

**✅ Agora:**
```python
# Abstração unificada
company = await MyCompany.create(company_id)
print(company.business_name)  # Funciona sempre!
```

---

## 🔄 **Integração com Outros Módulos**

Este módulo é amplamente utilizado por:

| Módulo | Como utiliza |
|--------|--------------|
| `controllers/agendame` | Obtém dados da empresa para operações |
| `routes/agendame_company` | Carrega empresa do usuário logado |
| `routes/customers` | Busca empresa pública por slug |
| `routes/auth` | Cria empresa ao registrar novo usuário |

---

## ✅ **Boas Práticas no Uso**

1. **Sempre use o factory method** `create()`, nunca instancie diretamente
2. **Verifique se company não é None** antes de acessar atributos
3. **Prefira `to_dict()`** para serialização em respostas API
4. **Use `company_id()`** quando precisar apenas do ID, não do objeto inteiro
5. **Não armazene** objetos `MyCompany` em cache global (use apenas por requisição)

---

## 🐛 **Tratamento de Erros**

```python
try:
    company = await MyCompany.create(company_id=999)
    if not company:
        # Empresa não existe em User nem TrialAccount
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
except Exception as e:
    # Erro de banco de dados ou outro
    logger.error(f"Erro ao carregar empresa: {e}")
    raise HTTPException(status_code=500, detail="Erro interno")
```

---

## 📌 **Notas Importantes**

- A classe **não faz cache entre requisições** (intencional)
- Dados são sempre frescos do banco
- Atributos `user_id` e `trial_account_id` são unificados como `id`
- Compatível com **Tortoise ORM** e **Pydantic**

---

**📌 Resumo:** `MyCompany` é a **única fonte de verdade** para dados de empresa durante uma requisição, abstraindo completamente a diferença entre usuários pagos e contas de teste.

---

