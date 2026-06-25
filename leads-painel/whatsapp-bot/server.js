// whatsapp-bot/server.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const Config = require('./models/config')
const wppClient = require('./whatsapp/client')
const filaWpp = require('./whatsapp/fila')
const apiRoutes = require('./routes/api')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json())
app.use('/api', apiRoutes)

// ─── SSE — push de eventos em tempo real para o painel ────────
// O painel faz uma conexão SSE e recebe updates sem precisar ficar
// fazendo polling. Funciona tipo WebSocket mas mais simples.
const sseClients = new Set()

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  res.flushHeaders()

  // Envia estado atual ao conectar
  const estadoAtual = wppClient.getEstado()
  const filaAtual = filaWpp.getStatus()
  res.write(`data: ${JSON.stringify({ tipo: 'estado_inicial', ...estadoAtual, fila: filaAtual })}\n\n`)

  sseClients.add(res)
  req.on('close', () => sseClients.delete(res))
})

function broadcast(tipo, dados) {
  const payload = JSON.stringify({ tipo, ...dados })
  sseClients.forEach(res => res.write(`data: ${payload}\n\n`))
}

// Escuta eventos do WhatsApp e repassa pro painel via SSE
wppClient.subscribe((evento, dados) => {
  broadcast(evento, dados)
})

filaWpp.subscribe((evento, dados) => {
  broadcast(evento, dados)
})

// ─── Banco ────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, { dbName: 'leads_db' })
  .then(async () => {
    console.log('[DB] MongoDB conectado')
    try {
      let config = await Config.findById('global')
      if (!config) {
        config = await Config.create({ _id: 'global' })
        console.log('[DB] Configuração padrão criada no MongoDB.')
      }
      filaWpp.setConfig(config)
    } catch(e) {
      console.error('[DB] Erro ao carregar configurações:', e)
    }
  })
  .catch(err => console.error('[DB] Erro:', err))

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🤖 Bot WhatsApp rodando em http://localhost:${PORT}`)
  console.log(`📡 Eventos SSE em http://localhost:${PORT}/events`)
  console.log(`📋 API em http://localhost:${PORT}/api\n`)
})
