# 👥 **app/routes/customers/public_services.py - API Pública de Agendamento**

## 📋 **Visão Geral do Módulo**

Este módulo contém todas as **rotas públicas** para clientes finais realizarem agendamentos, além de **rotas privadas** para empresas visualizarem seus dados. É a **porta de entrada** para os usuários dos estabelecimentos.

## 🎯 **Propósito**

| Tipo de Rota | Público-Alvo | Autenticação |
|--------------|--------------|--------------|
| **Públicas** | Clientes finais | ❌ Não requer |
| **Privadas** | Estabelecimentos | ✅ Requer JWT |

---

# 🚪 **PARTE 1: ROTAS PÚBLICAS - Interface do Cliente**

## 📌 **Características Comuns**

- ✅ **Sem autenticação** - Qualquer pessoa pode acessar
- ✅ **Busca flexível** - Localiza empresas por slug, username ou nome
- ✅ **URL amigável** - `/{identificador}` (ex: `/barbearia-exemplo`)
- ✅ **Tratamento de erros** - HTTPException padronizada

---

## 📄 **1.1 `GET /services/{company_identifier}` - Listar Serviços**

### **Endpoint:**
```http
GET /services/{company_identifier}
```

### **Propósito:**
Lista todos os serviços disponíveis de uma empresa para que o cliente possa escolher.

### **Parâmetros de URL:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `company_identifier` | `str` | ✅ Sim | Slug, username ou nome da empresa |

### **Query Parameters:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `search_by` | `str` | `'auto'` | `auto`, `slug`, `username`, `name` |
| `filter_by` | `str` | `None` | Campo para filtrar (`name`, `duration_minutes`, `price`) |
| `filter_value` | `str` | `None` | Valor do filtro |
| `is_active` | `bool` | `True` | Apenas serviços ativos |
| `order_by` | `str` | `None` | Ordenação (ex: `price,name`) |
| `include_inactive` | `bool` | `False` | Incluir inativos (sobrescreve `is_active`) |

### **Exemplos de Uso:**

```bash
# Busca automática (mais comum)
GET /services/beleza-saloon

# Busca específica por slug
GET /services/beleza-saloon?search_by=slug

# Filtrar por duração
GET /services/beleza-saloon?filter_by=duration_minutes&filter_value=30

# Ordenar por preço (menor primeiro)
GET /services/beleza-saloon?order_by=price

# Ordenar por preço e nome
GET /services/beleza-saloon?order_by=price,name
```

### **Resposta de Sucesso (200 OK):**
```json
{
  "company": "Barbearia Beleza Saloon",
  "company_slug": "beleza-saloon",
  "company_username": "belezasaloon",
  "services": [
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
  ],
  "total_services": 1,
  "filters_applied": {
    "search_by": "auto",
    "filter_by": null,
    "filter_value": null,
    "is_active": true
  }
}
```

### **Tratamento de Erros:**
| Status | Significado |
|--------|-------------|
| `404` | Empresa não encontrada |
| `500` | Erro interno no servidor |

---

## 📄 **1.2 `GET /services/{company_identifier}/available-times` - Horários Disponíveis**

### **Endpoint:**
```http
GET /services/{company_identifier}/available-times
```

### **Propósito:**
Consulta horários livres para um serviço específico em uma determinada data.

### **Parâmetros de URL:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `company_identifier` | `str` | ✅ Sim | Slug, username ou nome da empresa |

### **Query Parameters (OBRIGATÓRIOS):**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `service_id` | `int` | ✅ Sim | ID do serviço desejado |
| `date` | `date` | ✅ Sim | Data no formato `YYYY-MM-DD` |
| `search_by` | `str` | ❌ Não | `auto` (padrão), `slug`, `username`, `name` |

### **Exemplo de Uso:**
```bash
GET /services/beleza-saloon/available-times?service_id=1&date=2024-01-15
```

### **Resposta de Sucesso (200 OK):**
```json
{
  "date": "2024-01-15",
  "service": {
    "id": 1,
    "name": "Corte Masculino",
    "duration_minutes": 30,
    "price": "45.00"
  },
  "available_times": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
  "business_hours": {
    "open": "09:00",
    "close": "18:00"
  },
  "total_available": 6,
  "is_today": false,
  "min_booking_hours": 1
}
```

### **Comportamento Especial:**
- 📅 Se a data for **hoje**, horários anteriores a `agora + min_booking_hours` são removidos
- 🏪 Se a empresa **não funciona** no dia, retorna `available_times: []`
- ⏰ Respeita a duração do serviço para cálculo dos slots

---

## 📄 **1.3 `POST /services/{company_identifier}/book` - Realizar Agendamento**

### **Endpoint:**
```http
POST /services/{company_identifier}/book
```

### **Propósito:**
Cria um novo agendamento para o cliente.

### **Parâmetros de URL:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `company_identifier` | `str` | ✅ Sim | Slug, username ou nome da empresa |

### **Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `service_id` | `int` | ✅ Sim | ID do serviço |
| `appointment_date` | `date` | ✅ Sim | Data do agendamento |
| `appointment_time` | `str` | ✅ Sim | Hora no formato `HH:MM` |
| `client_name` | `str` | ✅ Sim | Nome completo (max 200) |
| `client_phone` | `str` | ✅ Sim | Telefone (max 20) |
| `search_by` | `str` | ❌ Não | `auto` (padrão) |
| `notes` | `str` | ❌ Não | Observações adicionais |

### **Exemplo de Requisição:**
```json
POST /services/beleza-saloon/book
Content-Type: application/json

{
    "service_id": 1,
    "appointment_date": "2024-01-15",
    "appointment_time": "14:00",
    "client_name": "João Silva",
    "client_phone": "11999999999",
    "notes": "Prefiro corte na máquina 2"
}
```

### **Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "appointment_id": 123,
  "confirmation": {
    "company": {
      "name": "Barbearia Beleza Saloon",
      "phone": "1133333333",
      "whatsapp": "5511999999999"
    },
    "client": {
      "name": "João Silva",
      "phone": "11999999999"
    },
    "service": {
      "name": "Corte Masculino",
      "duration": 30,
      "price": "45.00"
    },
    "appointment": {
      "date": "2024-01-15",
      "time": "14:00",
      "confirmation_code": "AGD000123"
    },
    "message": "✅ Agendamento confirmado! Seu horário para Corte Masculino está marcado para 15/01/2024 às 14:00."
  }
}
```

### **Validações:**
- ✅ Horário deve estar **disponível**
- ✅ Horário deve respeitar **antecedência mínima**
- ✅ Empresa deve **funcionar** no dia/horário
- ✅ Serviço deve estar **ativo**

---

# 🔐 **PARTE 2: ROTAS PRIVADAS - Dashboard da Empresa**

## 📌 **Características Comuns**

- ✅ **Requer autenticação** - `Depends(get_current_user)`
- ✅ **Escopo automático** - Filtra por `current_user.id`
- ✅ **Suporte a User e Trial** - Ambos os tipos funcionam

---

## 📄 **2.1 `GET /company/appointments` - Listar Agendamentos da Empresa**

### **Endpoint:**
```http
GET /company/appointments
```

### **Propósito:**
Visualiza todos os agendamentos da empresa com filtros opcionais.

### **Headers:**
```
Authorization: Bearer <jwt_token>
# ou Cookie: access_token=<jwt_token>
```

### **Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `start_date` | `date` | ❌ Não | Data inicial (YYYY-MM-DD) |
| `end_date` | `date` | ❌ Não | Data final (YYYY-MM-DD) |
| `status` | `str` | ❌ Não | `scheduled`, `confirmed`, `cancelled`, `completed` |

### **Exemplos de Uso:**
```bash
# Todos agendamentos
GET /company/appointments

# Agendamentos de janeiro
GET /company/appointments?start_date=2024-01-01&end_date=2024-01-31

# Apenas agendamentos pendentes
GET /company/appointments?status=scheduled
```

### **Resposta de Sucesso (200 OK):**
```json
{
  "appointments": [
    {
      "id": 123,
      "date": "2024-01-15",
      "time": "14:00",
      "client": {
        "name": "João Silva",
        "phone": "11999999999",
        "client_id": 45
      },
      "service": {
        "id": 1,
        "name": "Corte Masculino",
        "price": "45.00"
      },
      "status": "scheduled",
      "notes": "Prefiro corte na máquina 2",
      "created_at": "2024-01-10T10:30:00"
    }
  ],
  "total": 1
}
```

---

## 📄 **2.2 `GET /company/services` - Listar Serviços da Empresa**

### **Endpoint:**
```http
GET /company/services
```

### **Propósito:**
Visualiza os serviços cadastrados pela empresa (uso interno).

### **Headers:**
```
Authorization: Bearer <jwt_token>
```

### **Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `is_active` | `bool` | ❌ Não | Filtrar por status (ativo/inativo) |

### **Exemplo de Uso:**
```bash
# Todos serviços
GET /company/services

# Apenas serviços ativos
GET /company/services?is_active=true

# Apenas serviços inativos
GET /company/services?is_active=false
```

### **Resposta de Sucesso (200 OK):**
```json
{
  "services": [
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
  ],
  "total": 1
}
```

---

# 🔄 **Fluxo Completo do Cliente**

```
1️⃣ Cliente acessa URL da empresa
    ↓
2️⃣ GET /services/{slug}
    ↓
   Lista serviços disponíveis
    ↓
3️⃣ Cliente escolhe serviço + data
    ↓
4️⃣ GET /services/{slug}/available-times?service_id=X&date=Y
    ↓
   Retorna horários livres
    ↓
5️⃣ Cliente escolhe horário
    ↓
6️⃣ POST /services/{slug}/book
    ↓
   Cria agendamento + cliente (se novo)
    ↓
7️⃣ ✅ Confirmação com código AGD{id}
```

---

# 🔐 **Fluxo da Empresa (Dashboard)**

```
1️⃣ Empresa faz login
    ↓
2️⃣ GET /company/appointments
    ↓
   Visualiza agenda do dia
    ↓
3️⃣ GET /company/services
    ↓
   Gerencia serviços (via outras rotas)
```

---

# 🧠 **Decisões de Design**

## ✅ **Por que rotas separadas (públicas vs privadas)?**

**Públicas** (`/services/{...}`):
- Sem autenticação
- URLs amigáveis e semânticas
- Foco na experiência do cliente

**Privadas** (`/company/...`):
- Exigem autenticação
- Prefixo `/company` para agrupamento
- Foco na gestão do estabelecimento

---

## ✅ **Por que `company_identifier` e não `company_id`?**

**Problema:** Clientes não sabem o ID numérico da empresa.
**Solução:** Identificador amigável (slug/username) que aparece na URL.

**Exemplo:**
- ❌ `GET /services/123` (o cliente não sabe que 123 é o ID)
- ✅ `GET /services/barbearia-exemplo` (memorável e compartilhável)

---

## ✅ **Por que dois níveis de busca (`search_by`)?**

1. **`auto`** - Para 99% dos casos, tenta tudo e funciona
2. **`slug`/`username`/`name`** - Para casos específicos ou quando há ambiguidade

**Exemplo de ambiguidade:**
- Empresa A: username = `corte`, business_name = `Corte & Estilo`
- Empresa B: username = `estilo`, business_name = `Corte & Estilo`

Com `auto`, ambas seriam encontradas? Não, a primeira encontrada vence.
Com `search_by=username`, você controla exatamente qual campo buscar.

---

# 🛡️ **Segurança e Boas Práticas**

## ✅ **URL Decoding**
```python
decoded_identifier = urllib.parse.unquote(company_identifier)
```
Permite caracteres especiais na URL (espaços, acentos, etc).

## ✅ **Tratamento de Erros Consistente**
```python
except HTTPException as e:
    raise e  # Re-lança exceções conhecidas
except Exception as e:
    print(f'Erro: {str(e)}')  # Log para debug
    raise HTTPException(status_code=500, detail='Erro interno')
```

## ✅ **Validação de Tipos**
- `date` - FastAPI converte automaticamente de string ISO
- `int` - Validação automática
- `max_length` - Em campos de texto

---

# 📊 **Resumo das Rotas**

| Método | Endpoint | Público | Descrição |
|--------|----------|---------|-----------|
| `GET` | `/services/{identifier}` | ✅ Sim | Listar serviços da empresa |
| `GET` | `/services/{identifier}/available-times` | ✅ Sim | Horários disponíveis |
| `POST` | `/services/{identifier}/book` | ✅ Sim | Criar agendamento |
| `GET` | `/company/appointments` | ❌ Não | Listar agendamentos (empresa) |
| `GET` | `/company/services` | ❌ Não | Listar serviços (empresa) |

---

# 🚀 **Exemplos Práticos**

## **Cenário 1: Cliente agendando corte**
```bash
# 1. Ver serviços
curl -X GET "https://agendame.com/services/barbearia-x"

# 2. Ver horários para 20/01
curl -X GET "https://agendame.com/services/barbearia-x/available-times?service_id=1&date=2024-01-20"

# 3. Agendar
curl -X POST "https://agendame.com/services/barbearia-x/book" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "appointment_date": "2024-01-20",
    "appointment_time": "15:00",
    "client_name": "Pedro Santos",
    "client_phone": "11988887777"
  }'
```

## **Cenário 2: Barbearia vendo agenda**
```bash
# Login primeiro
curl -X POST "https://agendame.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "barbeariax", "password": "123456"}' \
  -c cookies.txt

# Ver agendamentos de hoje
curl -X GET "https://agendame.com/company/appointments?start_date=2024-01-20" \
  -b cookies.txt
```

---

# 📌 **Conclusão**

O módulo `customers/public_services.py` é a **face pública do Agendame**:

✅ **Simples** - URLs intuitivas, parâmetros opcionais
✅ **Flexível** - Busca empresas de 4 formas diferentes
✅ **Robusto** - Tratamento de erros em camadas
✅ **Seguro** - Autenticação clara para rotas privadas
✅ **Completo** - Do catálogo à confirmação em 3 passos

**Sem este módulo, clientes não agendam. Sem agendamentos, o sistema não existe.** 🎯

---

**📘 Documentação gerada a partir do código fonte em `app/routes/customers/public_services.py` - 5 rotas, 2 públicos, 1 propósito: Conectar clientes a estabelecimentos.**
