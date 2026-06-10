# 🤖 LeadHunter — Fase 3: Disparos WhatsApp

Integração do bot de disparos WhatsApp ao painel de leads.

---

## 📁 Estrutura

```
leads-fase3/
├── whatsapp-bot/          ← Servidor Node.js do bot
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── models/
│   │   └── campanha.js
│   ├── routes/
│   │   └── api.js
│   └── whatsapp/
│       ├── client.js      ← Gerencia conexão WhatsApp
│       └── fila.js        ← Fila com anti-bloqueio
│
└── painel-atualizado/     ← Painel React com aba de Disparos
    └── frontend/
        ├── index.html
        ├── package.json
        ├── vite.config.js
        └── src/
            ├── App.jsx
            ├── index.css
            ├── main.jsx
            └── components/
                ├── Sidebar.jsx
                ├── StatsBar.jsx
                ├── LeadsTable.jsx   ← Com checkboxes de seleção
                ├── Pagination.jsx
                └── DisparosTab.jsx  ← QR code + campanhas
```

---

## 🚀 Como rodar (3 terminais)

### Terminal 1 — API Python (Fase 2)
```bash
cd leads-painel/api
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Bot WhatsApp
```bash
cd leads-fase3/whatsapp-bot

# 1. Copie o .env e preencha
cp .env.example .env

# 2. Instale dependências
npm install

# 3. Inicie
npm start
```

### Terminal 3 — Painel React (versão atualizada)
```bash
cd leads-fase3/painel-atualizado/frontend
npm install
npm run dev
```

Acesse: `http://localhost:5173`

---

## ⚙️ Configuração do .env

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/...

# Anti-bloqueio
DELAY_MIN_SEGUNDOS=45     # Mínimo entre mensagens
DELAY_MAX_SEGUNDOS=180    # Máximo entre mensagens
LIMITE_DIARIO=50          # Máx mensagens por dia
PAUSA_A_CADA=10           # Pausa longa a cada X msgs
PAUSA_MINUTOS=15          # Duração da pausa longa
```

---

## 📱 Como usar os disparos

1. **Abra o painel** em `http://localhost:5173`
2. Na aba **Leads**, filtre e marque os checkboxes dos leads desejados (só aparecem leads com telefone)
3. Clique na aba **📤 Disparos**
4. Clique em **Conectar WhatsApp** — um QR code aparece na tela
5. No celular: WhatsApp → **Dispositivos vinculados** → **Vincular dispositivo** → escaneie o QR
6. Após conectar, dê um **nome** à campanha e edite a **mensagem**
7. Clique em **Criar campanha**
8. Clique em **▶ Iniciar** — o bot começa a enviar com delays aleatórios

---

## 🛡️ Proteções anti-bloqueio

| Proteção | Detalhe |
|----------|---------|
| Delay aleatório | 45s a 3min entre cada mensagem |
| Limite diário | Máx 50 msgs/dia por padrão |
| Pausa longa | 15 min a cada 10 msgs enviadas |
| Variação de texto | Saudações e encerramentos rotativos |
| Verifica número | Checa se o número tem WhatsApp antes de enviar |
| Sessão persistida | QR code só na primeira vez |

---

## 📝 Variáveis da mensagem

| Variável | Resultado |
|----------|-----------|
| `{nome}` | Nome do lead |
| `{saudacao}` | Olá / Oi / Bom dia / Boa tarde (aleatório) |
| `{encerramento}` | Aguardo retorno! / Abraços! etc (aleatório) |

**Exemplo:**
```
{saudacao}, {nome}! Tudo bem?
Sou [SEU NOME] e gostaria de apresentar nossos serviços.
{encerramento}
```

---

## ⚠️ Avisos importantes

- Use com responsabilidade — respeite a privacidade das pessoas
- Nunca dispare para números que não solicitaram contato em massa
- Comece com poucos envios por dia e aumente gradualmente
- Mantenha o celular conectado à internet durante os disparos
