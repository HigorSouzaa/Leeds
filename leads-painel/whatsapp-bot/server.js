// whatsapp-bot/server.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const Config = require('./models/config')
const chips = require('./whatsapp/gerenciadorChips')
const filaWpp = require('./whatsapp/fila')
const apiRoutes = require('./routes/api')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))
console.log('[DEBUG] Limite JSON aumentado para 100MB')
app.use('/api', apiRoutes)

// ─── SSE — push de eventos em tempo real para o painel ────────
const sseClients = new Set()

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  res.flushHeaders()

  // Envia estado atual ao conectar
  const todosChips = chips.getStatusTodos()
  const filaAtual = filaWpp.getStatus()
  res.write(`data: ${JSON.stringify({ tipo: 'estado_inicial', chips: todosChips, fila: filaAtual })}` + '\n\n')

  sseClients.add(res)
  req.on('close', () => sseClients.delete(res))
})

function broadcast(tipo, dados) {
  const payload = JSON.stringify({ tipo, ...dados })
  sseClients.forEach(res => res.write(`data: ${payload}\n\n`))
}

// Escuta eventos dos chips e repassa pro painel via SSE
chips.subscribe((evento, dados) => {
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

      // Carrega chips salvos no banco e inicializa automaticamente
      const Chip = require('./models/chip')
      const chipsSalvos = await Chip.find({})
      for (const c of chipsSalvos) {
        console.log(`[CHIP] Iniciando chip salvo: ${c.apelido} (${c.chipId})`)
        chips.adicionarChip(c.chipId, c.apelido).catch(err => {
          console.error(`[CHIP] Erro ao iniciar chip ${c.chipId}:`, err.message)
        })
      }
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
