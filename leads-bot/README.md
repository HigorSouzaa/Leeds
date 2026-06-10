# 🤖 Bot de Leads - Google Maps

Bot de coleta de leads via Google Maps com salvamento no MongoDB Atlas.

---

## 📁 Estrutura do projeto

```
leads-bot/
├── main.py                  ← Ponto de entrada, roda por aqui
├── requirements.txt
├── config/
│   └── settings.py          ← Coloque sua URI do MongoDB aqui
├── bot/
│   └── maps_scraper.py      ← Lógica de scraping
└── utils/
    ├── human_behavior.py    ← Funções anti-detecção
    └── database.py          ← Conexão com MongoDB
```

---

## 🚀 Instalação

### 1. Pré-requisitos
- Python 3.10 ou superior
- Conta no [MongoDB Atlas](https://cloud.mongodb.com) (gratuito)

### 2. Instalar dependências
```bash
pip install -r requirements.txt
playwright install chromium
```

### 3. Configurar MongoDB Atlas

1. Crie uma conta em https://cloud.mongodb.com
2. Crie um cluster gratuito (M0)
3. Em **Database Access** → crie um usuário com senha
4. Em **Network Access** → adicione seu IP (ou 0.0.0.0/0 para qualquer IP)
5. Em **Connect** → escolha "Connect your application" → copie a URI

Abra `config/settings.py` e substitua:
```python
MONGODB_URI = "mongodb+srv://SEU_USUARIO:SUA_SENHA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
```

---

## ▶️ Como usar

```bash
python main.py
```

O bot vai perguntar:
- **O que buscar?** → ex: `chácara`, `salão de beleza`, `pizzaria`
- **Cidade?** → ex: `São Paulo SP` (opcional)
- **Quantos leads?** → ex: `30`

---

## 📦 O que é salvo no MongoDB

Cada lead salvo contém:

| Campo       | Exemplo                        |
|-------------|-------------------------------|
| nome        | Chácara Recanto Verde          |
| telefone    | (11) 99999-9999                |
| site        | https://chacaraverde.com.br    |
| categoria   | chácara                        |
| cidade      | São Paulo                      |
| status      | novo                           |
| criado_em   | 2025-01-15T14:30:00Z           |

---

## 🛡️ Medidas anti-detecção

- **User-agent rotativo** — simula Chrome, Firefox e Safari reais
- **Delays aleatórios** — pausa entre 3 e 8 segundos entre ações
- **Digitação humana** — caractere por caractere com velocidade variável
- **Movimento de mouse** — curvas de Bezier, não movimento linear
- **Scroll orgânico** — velocidade e quantidade variáveis
- **Locale pt-BR** — timezone e idioma do Brasil
- **Remove webdriver flag** — elimina o principal sinal de bot
- **Headless desativado** — navegador real visível é menos suspeito

---

## ⚙️ Configurações em `config/settings.py`

```python
MIN_DELAY = 3      # Pausa mínima entre ações (segundos)
MAX_DELAY = 8      # Pausa máxima entre ações (segundos)
MAX_RESULTS = 50   # Padrão de leads por busca
```

> Aumentar os delays reduz velocidade mas aumenta segurança.

---

## 🔮 Próximas fases

- **Fase 2** → Painel web em React para visualizar e filtrar leads
- **Fase 3** → Bot de contato automático (WhatsApp/Email)
