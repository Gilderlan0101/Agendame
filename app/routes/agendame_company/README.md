# 🏢 **app/routes/agendame_company/ - API do Dashboard da Empresa**

## 📋 **Visão Geral do Módulo**

Este módulo contém todas as **rotas protegidas** para o dashboard dos estabelecimentos. É o **painel de controle** onde empresas gerenciam serviços, agendamentos, clientes e visualizam estatísticas.

## 🎯 **Propósito**

| Categoria | Funcionalidade | Autenticação |
|-----------|----------------|--------------|
| **Serviços** | CRUD completo de serviços | ✅ Requer JWT |
| **Agendamentos** | Gestão da agenda | ✅ Requer JWT |
| **Clientes** | Base de clientes | ✅ Requer JWT |
| **Dashboard** | Estatísticas e métricas | ✅ Requer JWT |
| **Empresa** | Dados do estabelecimento | ✅ Requer JWT |

---

# 📁 **Estrutura do Módulo**

```
agendame_company/
├── agendame_service.py        # 📦 Gestão de serviços e clientes
├── appointments.py            # 📅 Gestão de agendamentos
├── info_company.py           # ℹ️ Dados da empresa
├── register_services.py      # ✨ Cadastro de serviços
└── remove_or_upgrad_service.py # 🗑️ (Código morto/obsoleto)
```

---

# 📄 **1. `agendame_service.py` - Gestão de Serviços e Clientes**

## 🎯 **Propósito**

Rotas para **gerenciamento de serviços**, **clientes** e **dashboard estatístico**.

## 🔐 **Autenticação**
Todas as rotas exigem `Depends(get_current_user)` e recebem `current_user: SystemUser`.

---

### **1.1 `GET /agendame/services` - Listar Serviços**

```http
GET /agendame/services
Authorization: Bearer <token>
```

**Descrição:** Retorna todos os serviços da empresa logada.

**Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Corte Masculino",
    "description": "Corte com tesoura e máquina",
    "price": "45.00",
    "duration_minutes": 30,
    "order": 1,
    "is_active": true,
    "created_at": "2024-01-01T10:00:00",
    "updated_at": "2024-01-01T10:00:00"
  }
]
```

---

### **1.2 `DELETE /agendame/remove/service/{service_id}` - Remover Serviço**

```http
DELETE /agendame/remove/service/1
Authorization: Bearer <token>
```

**Descrição:** Remove **permanentemente** um serviço.

**Resposta (200 OK):**
```json
{
  "status": 200
}
```

**Erros:**
- `404` - Serviço não encontrado
- `500` - Erro interno

---

### **1.3 `PUT /agendame/update/service/{service_id}` - Atualizar Serviço**

```http
PUT /agendame/update/service/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Corte Degradê",
  "price": 55.00,
  "duration_minutes": 45
}
```

**Descrição:** Atualiza dados de um serviço existente.

**Campos atualizáveis:** `name`, `description`, `price`, `duration_minutes`, `order`, `is_active`

**Resposta (200 OK):**
```json
{
  "status": "success",
  "updated_fields": ["name", "price", "duration_minutes"]
}
```

---

### **1.4 `GET /clients` - Listar Clientes**

```http
GET /clients?search_query=João&limit=20&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `search_query` | `str` | `None` | Busca por nome do cliente |
| `limit` | `int` | `50` | Máximo 100 itens |
| `offset` | `int` | `0` | Paginação |

**Resposta (200 OK):**
```json
{
  "clients": [
    {
      "id": 45,
      "full_name": "João Silva",
      "phone": "11999999999",
      "total_appointments": 3,
      "last_service": "Corte Masculino",
      "created_at": "2024-01-10T10:30:00",
      "is_active": true
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

---

### **1.5 `GET /dashboard/stats` - Estatísticas do Dashboard**

```http
GET /dashboard/stats
Authorization: Bearer <token>
```

**Descrição:** Retorna métricas em tempo real para o painel.

**Resposta (200 OK):**
```json
{
  "stats": {
    "total_services": 5,
    "total_clients": 47,
    "today_appointments": 8,
    "today_revenue": 360.00,
    "upcoming_appointments": 12
  },
  "upcoming_appointments": [
    {
      "id": 123,
      "client_name": "João Silva",
      "service_name": "Corte Masculino",
      "appointment_date": "2024-01-15",
      "appointment_time": "14:00",
      "price": 45.00
    }
  ]
}
```

---

# 📄 **2. `appointments.py` - Gestão de Agendamentos**

## 🎯 **Propósito**

Módulo **mais completo** do dashboard. Gerencia todo o ciclo de vida dos agendamentos.

---

### **2.1 `POST /agendame/appointments` - Listar Agendamentos com Filtros**

```http
POST /agendame/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "status": "scheduled",
  "client_name": "João",
  "service_id": 1,
  "limit": 20,
  "offset": 0
}
```

**Resposta (200 OK):**
```json
{
  "appointments": [...],
  "total": 15,
  "offset": 0,
  "limit": 20
}
```

---

### **2.2 `GET /agendame/appointments/today` - Agendamentos de Hoje**

```http
GET /agendame/appointments/today?status_filter=scheduled
Authorization: Bearer <token>
```

**Resposta:** Mesmo formato da rota anterior, filtrado para data atual.

---

### **2.3 `GET /agendame/appointments/available-times` - Horários Disponíveis**

```http
GET /agendame/appointments/available-times?service_id=1&date=2024-01-15
Authorization: Bearer <token>
```

**Descrição:** Útil para **reagendamentos** pelo painel.

**Resposta:**
```json
{
  "date": "2024-01-15",
  "service": {...},
  "available_times": ["09:00", "10:00", "11:00", "14:00"],
  "total_available": 4
}
```

---

### **2.4 `POST /agendame/appointments/create` - Criar Agendamento (Interno)**

```http
POST /agendame/appointments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "service_id": 1,
  "appointment_date": "2024-01-15",
  "appointment_time": "14:00",
  "client_name": "Maria Santos",
  "client_phone": "11988887777",
  "notes": "Cliente novo"
}
```

**Descrição:** Cria agendamento **pelo dashboard da empresa**.

**Resposta:**
```json
{
  "id": 124,
  "client_name": "Maria Santos",
  "client_phone": "11988887777",
  "service_name": "Corte Masculino",
  "appointment_date": "2024-01-15",
  "appointment_time": "14:00",
  "price": "45.00",
  "status": "scheduled",
  "confirmation_code": "AGD000124",
  "message": "✅ Agendamento confirmado..."
}
```

---

### **2.5 `POST /agendame/appointments/public/create` - Agendamento Público**

```http
POST /agendame/appointments/public/create?company_slug=barbearia-x
Content-Type: application/json

{
  "service_id": 1,
  "appointment_date": "2024-01-15",
  "appointment_time": "14:00",
  "client_name": "Pedro Lima",
  "client_phone": "11955556666"
}
```

**Descrição:** **NÃO requer autenticação**. Usado pelo site público do cliente.

---

### **2.6 `GET /agendame/appointments/public/available-times` - Disponibilidade Pública**

```http
GET /agendame/appointments/public/available-times?service_id=1&date=2024-01-15&company_slug=barbearia-x
```

**Descrição:** **NÃO requer autenticação**. Consulta pública de horários.

---

### **2.7 `PUT /agendame/appointments/{appointment_id}/status` - Atualizar Status**

```http
PUT /agendame/appointments/123/status?status=confirmed
Authorization: Bearer <token>
```

**Status válidos:**
| Status | Significado |
|--------|-------------|
| `scheduled` | Agendado (padrão) |
| `confirmed` | Confirmado pelo estabelecimento |
| `completed` | Atendimento realizado |
| `cancelled` | Cancelado |
| `no_show` | Cliente não compareceu |

**Resposta:**
```json
{
  "success": true,
  "message": "Status do agendamento atualizado para 'confirmed'",
  "appointment_id": 123,
  "status": "confirmed"
}
```

---

### **2.8 `DELETE /agendame/appointments/{appointment_id}` - Remover Agendamento**

```http
DELETE /agendame/appointments/123
Authorization: Bearer <token>
```

**Descrição:** Remove permanentemente um agendamento.

**Resposta:**
```json
{
  "success": true,
  "message": "Agendamento removido com sucesso",
  "appointment_id": 123
}
```

---

### **2.9 `PUT /agendame/appointments/{appointment_id}` - Atualização Completa**

```http
PUT /agendame/appointments/123
Authorization: Bearer <token>
Content-Type: application/json

{
  "client_name": "João Souza",
  "client_phone": "11977778888",
  "appointment_date": "2024-01-16",
  "appointment_time": "15:30"
}
```

**Descrição:** Atualização completa de dados do agendamento.

---

### **2.10 `GET /agendame/appointments/{appointment_id}` - Detalhes do Agendamento**

```http
GET /agendame/appointments/123
Authorization: Bearer <token>
```

**Resposta:** Objeto completo do agendamento.

---

### **2.11 `GET /agendame/appointments/upcoming` - Próximos Agendamentos**

```http
GET /agendame/appointments/upcoming?days=7
Authorization: Bearer <token>
```

**Descrição:** Lista agendamentos dos próximos X dias (padrão: 7).

---

# 📄 **3. `info_company.py` - Dados da Empresa**

## 🎯 **Propósito**

Retorna informações detalhadas do estabelecimento logado.

---

### **3.1 `GET /agendame/{company_slug}/info`**

```http
GET /agendame/barbearia-x/info
Authorization: Bearer <token>
```

**Descrição:** Obtém dados completos da empresa atual.

**Resposta (200 OK):**
```json
{
  "id": 1,
  "name": "Barbearia X",
  "slug": "barbearia-x",
  "phone": "1133333333",
  "whatsapp": "5511999999999",
  "type": "barbearia",
  "url_default": "http://localhost:8000/agendame/barbearia-x",
  "active": true
}
```

---

# 📄 **4. `register_services.py` - Cadastro de Serviços**

## 🎯 **Propósito**

Rota exclusiva para **criação de novos serviços**.

---

### **4.1 `POST /agendame/register/service`**

```http
POST /agendame/register/service
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Barba Completa",
  "description": "Barba com navalha e produtos",
  "price": 35.00,
  "duration_minutes": 20,
  "order": 2,
  "is_active": true
}
```

**Descrição:** Cadastra um novo serviço para a empresa.

**Validações:**
- ✅ Nome único por empresa
- ✅ Preço deve ser decimal válido
- ✅ Duração em minutos > 0

**Resposta (200 OK):**
```json
{
  "status": "success",
  "message": "Serviço criado com sucesso!",
  "service": {
    "id": 3,
    "name": "Barba Completa",
    "description": "Barba com navalha e produtos",
    "price": "35.00",
    "duration_minutes": 20,
    "order": 2,
    "is_active": true,
    "created_at": "2024-01-15T14:30:00",
    "updated_at": "2024-01-15T14:30:00"
  }
}
```

---

# 🗑️ **5. `remove_or_upgrad_service.py` - Código Morto**

## ⚠️ **Status: OBSOLETO / NÃO UTILIZADO**

Este arquivo contém código **comentado/obsoleto** e **não deve ser usado**.

**Problemas:**
- ❌ Funcionalidades duplicadas em `agendame_service.py`
- ❌ Lógica desatualizada
- ❌ Sem manutenção

**Recomendação:** Remover em futura refatoração.

---

# 🔄 **Fluxos de Negócio do Dashboard**

## **1. Fluxo de Gestão de Serviços**
```
Empresa logada
    ↓
GET /agendame/services → Visualiza catálogo
    ↓
POST /agendame/register/service → Adiciona novo
    ↓
PUT /agendame/update/service/{id} → Edita
    ↓
DELETE /agendame/remove/service/{id} → Remove
```

## **2. Fluxo de Gestão de Agendamentos**
```
Empresa logada
    ↓
GET /agendame/appointments/today → Agenda do dia
    ↓
POST /agendame/appointments/create → Novo agendamento (telefone)
    ↓
PUT /agendame/appointments/{id}/status → Confirma/Conclui
    ↓
GET /agendame/appointments/upcoming → Próximos dias
```

## **3. Fluxo de Relacionamento com Cliente**
```
Empresa logada
    ↓
GET /clients → Base completa
    ↓
Busca por nome → Cliente específico
    ↓
Histórico via GET /agendame/appointments?client_name=...
    ↓
Novo agendamento para cliente existente
```

---

# 🔐 **Segurança e Permissões**

## **Autenticação Obrigatória (exceto rotas públicas explícitas)**

```python
current_user: SystemUser = Depends(get_current_user)
```

**O que isso garante:**
- ✅ Usuário **autenticado** via JWT
- ✅ Apenas dados da **própria empresa**
- ✅ Suporte a **User e TrialAccount**
- ❌ Bloqueio automático de acesso cruzado

## **Escopo Automático por Empresa**

```python
Services(target_company_id=current_user.id)
Appointments(target_company_id=current_user.id)
```

**Benefício:** O desenvolvedor **não pode esquecer** de filtrar por empresa. O ID já vem do token.

---

# 📊 **Resumo de Endpoints**

| Módulo | Método | Endpoint | Descrição |
|--------|--------|----------|-----------|
| **serviço** | `GET` | `/agendame/services` | Listar serviços |
| **serviço** | `POST` | `/agendame/register/service` | Criar serviço |
| **serviço** | `PUT` | `/agendame/update/service/{id}` | Atualizar serviço |
| **serviço** | `DELETE` | `/agendame/remove/service/{id}` | Remover serviço |
| **cliente** | `GET` | `/clients` | Listar clientes |
| **dashboard** | `GET` | `/dashboard/stats` | Estatísticas |
| **agenda** | `POST` | `/agendame/appointments` | Listar com filtros |
| **agenda** | `GET` | `/agendame/appointments/today` | Hoje |
| **agenda** | `GET` | `/agendame/appointments/upcoming` | Próximos |
| **agenda** | `POST` | `/agendame/appointments/create` | Criar (interno) |
| **agenda** | `PUT` | `/agendame/appointments/{id}` | Atualizar |
| **agenda** | `PUT` | `/agendame/appointments/{id}/status` | Status |
| **agenda** | `DELETE` | `/agendame/appointments/{id}` | Remover |
| **agenda** | `GET` | `/agendame/appointments/{id}` | Detalhes |
| **empresa** | `GET` | `/agendame/{slug}/info` | Dados da empresa |
| **público** | `POST` | `/agendame/appointments/public/create` | Agendamento público |
| **público** | `GET` | `/agendame/appointments/public/available-times` | Disponibilidade pública |

---

# 🧠 **Decisões de Design**

## ✅ **Por que `POST` para listagem com filtros?**
**Problema:** Muitos filtros opcionais tornam a URL enorme e complexa.
**Solução:** Usar `POST` com body JSON para consultas complexas.

## ✅ **Rotas Públicas dentro do mesmo arquivo?**
**Motivo:** Coesão. Tudo relacionado a agendamento está junto, mesmo com níveis de acesso diferentes.

## ✅ **`SystemUser` vs `User` model?**
**Benefício:** `SystemUser` é um schema **Pydantic** otimizado para a view, contendo apenas o necessário e já tratando diferenças entre User/Trial.

---

# ⚠️ **Pontos de Atenção**

## 🔴 **1. Código Morto**
Arquivo `remove_or_upgrad_service.py` deve ser **removido** em futura refatoração.

## 🟡 **2. Duplicação de Lógica**
`GET /agendame/appointments/public/available-times` e `GET /agendame/appointments/available-times` fazem a mesma coisa, apenas mudam a fonte do `company_id`.

## 🟢 **3. Tratamento de Erros**
Consistente em todas as rotas:
```python
except HTTPException:
    raise  # Re-lança exceções conhecidas
except Exception as e:
    print(f'Erro: {e}')  # Log
    raise HTTPException(status_code=500, detail='Erro interno')
```

---

# 📌 **Conclusão**

O módulo `agendame_company` é o **coração operacional** do Agendame:

✅ **Completo** - CRUD de serviços, agenda, clientes e estatísticas
✅ **Seguro** - Autenticação JWT em todas as rotas operacionais
✅ **Intuitivo** - URLs semânticas e parâmetros claros
✅ **Flexível** - Suporte a User e TrialAccount
✅ **Manutenível** - Separação clara de responsabilidades

**Sem este módulo, empresas não gerenciam seus negócios. Sem gestão, o Agendame é apenas um catálogo.** 🏆

---

**📘 Documentação gerada a partir do código fonte em `app/routes/agendame_company/` - 5 arquivos, 20+ endpoints, 1 propósito: Empoderar estabelecimentos.**
