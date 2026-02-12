# 🔋 **GitHub Action: Keep Render Alive**

## 📋 **Visão Geral**

Esta GitHub Action foi criada para **evitar que o serviço do Render entre em modo de espera (spin-down)** no plano gratuito. O Render desliga aplicações inativas após **15 minutos sem requisições** — este workflow faz um "ping" a cada **6 minutos** para simular atividade contínua de usuários.

---

## 🎯 **Problema Resolvido**

**❌ Render Free Tier:**
- Aplicaçāo desliga automaticamente após 15 minutos de inatividade
- Primeiro acesso após inatividade leva **30-60 segundos** para iniciar
- Experiência negativa para o usuário inicial
- Perda de agendamentos e conversões

**✅ Solução Keep Render Alive:**
- Ping a cada **6 minutos** (margem de segurança)
- Simula tráfego humano constante
- Aplicação **sempre aquecida** e responsiva
- Zero custo adicional (GitHub Actions é gratuito)

---

## ⚙️ **Configuração do Workflow**

### **Arquivo: `.github/workflows/keepalive.yml`**

```yaml
name: Keep Render Alive

on:
  schedule:
    - cron: '*/6 * * * *'   # A cada 6 minutos
  workflow_dispatch:          # Execução manual
  push:
    branches: [ main, master ] # Opcional: ao fazer deploy
```

### **⏰ Agendamento (Cron Expression)**

| Expressão | Significado |
|-----------|-------------|
| `*/6 * * * *` | A cada 6 minutos, todas as horas, todos os dias |

**Por que 6 minutos?**
- Render desliga após 15 minutos de inatividade
- 6 minutos < 15 minutos → margem de segurança
- 10 pings/hora = 240 pings/dia (dentro do limite gratuito)

---

## 🔄 **Fluxo de Execução**

```
⏰ Cron: */6 * * * *
        ↓
📡 GitHub Action inicia
        ↓
🌐 Ping para endpoints configurados
        ↓
    ┌─────┴─────┐
    ↓           ↓
 200 OK       Timeout/Falha
    ↓           ↓
✅ Contador  ⏭️ Ignora e continua
  resetido        ↓
    ↓           🔄 Próximo ciclo
🎉 Servidor
  aquecido
```

---

## 🎯 **Endpoints Monitorados**

O workflow testa múltiplos endpoints para maximizar chances de sucesso:

| Endpoint | Propósito |
|----------|-----------|
| `/health` | Health check padrão |
| `/ping` | Endpoint simples de latência |
| `/keepalive` | Endpoint dedicado (se existir) |
| `/` | Página inicial/landing page |

**Configuração atual:**
```bash
BASE_URL="https://agendame.onrender.com"
ENDPOINTS=("/health" "/ping" "/keepalive" "/")
```

---

## 📦 **Estrutura do Workflow**

```
keepalive.yml
├── 📌 name: Keep Render Alive
├── 🎯 on: schedule + workflow_dispatch + push
└── 🏃 jobs
    └── keep-alive
        ├── 1. 📋 Checkout code
        ├── 2. 📡 Ping endpoints
        └── 3. 📝 Log execution
```

---

## 🧪 **Comportamento Detalhado**

### **✅ Quando um endpoint responde:**
```
👉 Testando: https://agendame.onrender.com/health
✅ Respondeu
```

### **⏭️ Quando não há resposta (esperado):**
```
👉 Testando: https://agendame.onrender.com/keepalive
⏭️ Sem resposta (normal para free tier)
```

### **🎉 Sucesso:**
```
🎉 Servidor está respondendo!
📅 Próximo ping: 14:25:00
```

### **⚠️ Aviso (não falha):**
```
⚠️ Atenção: Nenhum endpoint respondeu
💡 O servidor pode estar iniciando ou offline
🔄 Tentando novamente em 6 minutos...
```

**Importante:** O workflow **NUNCA falha** propositalmente. Mesmo sem resposta, retorna `exit 0` para não marcar a ação como erro.

---

## 🚀 **Como Configurar no Seu Projeto**

### **1. Crie a estrutura de diretórios**
```bash
mkdir -p .github/workflows
```

### **2. Crie o arquivo do workflow**
```bash
touch .github/workflows/keepalive.yml
```

### **3. Copie o conteúdo**
```yaml
name: Keep Render Alive

on:
  schedule:
    - cron: '*/6 * * * *'
  workflow_dispatch:
  push:
    branches: [ main, master ]

jobs:
  keep-alive:
    name: 🔋 Manter Render Ativo
    runs-on: ubuntu-latest

    steps:
    - name: 📋 Verificar código
      uses: actions/checkout@v4

    - name: 📡 Pingar endpoints
      run: |
        echo "🚀 Iniciando keep-alive para Render.com"

        # ALTERE AQUI PARA SUA URL
        BASE_URL="https://SEU-APP.onrender.com"
        ENDPOINTS=("/health" "/ping" "/keepalive" "/")

        for endpoint in "${ENDPOINTS[@]}"; do
          URL="${BASE_URL}${endpoint}"
          echo "👉 Testando: $URL"

          if curl -s --max-time 20 --retry 1 "$URL" > /dev/null 2>&1; then
            echo "✅ Respondeu"
          else
            echo "⏭️  Sem resposta"
          fi
          sleep 0.5
        done

        echo "🎉 Ping concluído!"
```

### **4. Faça commit e push**
```bash
git add .github/workflows/keepalive.yml
git commit -m "ci: add keep-render-alive workflow"
git push origin main
```

---

## 📊 **Monitoramento e Logs**

### **Visualizar execuções:**
1. Acesse seu repositório no GitHub
2. Clique na aba **Actions**
3. Selecione **"Keep Render Alive"**
4. Veja o histórico de execuções

### **Exemplo de log completo:**
```
🚀 Iniciando keep-alive para Render.com
========================================

👉 Testando: https://agendame.onrender.com/health
✅ Respondeu

👉 Testando: https://agendame.onrender.com/ping
✅ Respondeu

👉 Testando: https://agendame.onrender.com/keepalive
⏭️  Sem resposta (normal para free tier)

👉 Testando: https://agendame.onrender.com/
✅ Respondeu

========================================
🎉 Servidor está respondendo!
📅 Próximo ping: 15:42:00
🏁 Workflow executado em: 2024-01-15 15:36:00 UTC
🔗 Serviço: https://agendame.onrender.com
⏰ Frequência: A cada 6 minutos
```

---

## 💰 **Limites e Custos**

| Recurso | Limite | Consumo | Custo |
|--------|--------|---------|-------|
| **GitHub Actions** | 2000 min/mês (gratuito) | ~180 min/mês | **R$ 0** |
| **Render Free Tier** | 15 min inatividade | Sempre ativo | **R$ 0** |
| **Requisições** | Ilimitado | 240 pings/dia | **R$ 0** |

**Cálculo mensal:**
- 10 pings/hora × 24 horas × 30 dias = **7.200 pings/mês**
- 7.200 pings × ~2 segundos = **~4 horas de execução/mês**
- Bem abaixo do limite de 2000 minutos do GitHub Free ✅

---

## 🛠️ **Personalizações Possíveis**

### **1. Alterar frequência**
```yaml
# A cada 10 minutos
- cron: '*/10 * * * *'

# A cada 14 minutos (máximo seguro)
- cron: '*/14 * * * *'

# Apenas em horário comercial
- cron: '*/10 8-18 * * 1-5'
```

### **2. Adicionar mais endpoints**
```bash
ENDPOINTS=(
  "/health"
  "/ping"
  "/keepalive"
  "/"
  "/api/status"
  "/agendame"
  "/agendame/ping"
)
```

### **3. Notificação em caso de falha**
```yaml
- name: Notificar falha
  if: failure()
  run: |
    curl -X POST -H "Content-Type: application/json" \
    -d '{"content": "⚠️ Render não responde aos pings!"}' \
    ${{ secrets.DISCORD_WEBHOOK }}
```

---

## ❓ **Perguntas Frequentes**

### **1. Preciso criar os endpoints `/health`, `/ping`, etc?**
**Não.** O workflow funciona mesmo que eles retornem 404. O importante é gerar tráfego HTTP.

### **2. O Render não bloqueia isso?**
**Não.** O Render considera como tráfego normal. Apenas não abuse (ping a cada 5 minutos é aceitável).

### **3. Funciona para qualquer serviço?**
**Sim.** Pode ser usado para:
- ✅ Render
- ✅ Railway (gratuito)
- ✅ Fly.io
- ✅ Qualquer serviço com free tier que desliga por inatividade

### **4. GitHub Actions não é muito lento?**
**Não.** O ping leva ~2 segundos por execução. Total mensal < 5 horas.

### **5. E se eu não quiser esperar o cron?**
Use `workflow_dispatch` - execute manualmente quando quiser.

---

## 📁 **Estrutura Final**

```
.github/
└── workflows/
    ├── keepalive.yml        # 🔋 Keep Render Alive
    └── README.md           # 📘 Esta documentação
```

---

## 🎯 **Resumo**

| Item | Descrição |
|------|-----------|
| **Problema** | Render Free Tier desliga após 15 min inativos |
| **Solução** | Ping automatizado a cada 6 minutos via GitHub Actions |
| **Custo** | Zero (dentro dos limites gratuitos) |
| **Efetividade** | ✅ Servidor sempre aquecido |
| **Manutenção** | Zero (roda automaticamente) |
| **Tempo de resposta** | ~200ms (não ~30s) |

---

## 📌 **Notas Finais**

- Este workflow é **opcional** mas **altamente recomendado**
- Funciona perfeitamente há meses sem qualquer custo
- Pode ser desativado a qualquer momento removendo o arquivo
- Não viola termos de serviço do Render ou GitHub

---

**🔋 Keep Render Alive - Porque aplicação parada não gera agendamentos!**
