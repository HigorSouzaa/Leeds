// whatsapp-bot/routes/api.js
const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Campanha = require('../models/campanha')
const Config = require('../models/config')
const wppClient = require('../whatsapp/client')
const fila = require('../whatsapp/fila')

// ─── WhatsApp status ───────────────────────────────────────────

router.get('/wpp/status', (req, res) => {
  const { estado, qrBase64 } = wppClient.getEstado()
  const filaStatus = fila.getStatus()
  res.json({ estado, qrBase64, fila: filaStatus })
})

router.post('/wpp/iniciar', (req, res) => {
  try {
    // Não faz await — initialize() demora (abre Puppeteer).
    // O QR code chegará via SSE quando estiver pronto.
    wppClient.iniciar().catch(err => {
      console.error('[WPP] Erro ao iniciar:', err.message)
    })
    res.json({ ok: true, msg: 'Iniciando... aguarde o QR code.' })
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message })
  }
})

router.post('/wpp/desconectar', async (req, res) => {
  try {
    await wppClient.desconectar()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message })
  }
})

router.get('/wpp/config', (req, res) => {
  res.json(fila.getConfig())
})

router.post('/wpp/config', async (req, res) => {
  try {
    let config = await Config.findById('global')
    if (!config) config = new Config({ _id: 'global' })
    
    if (req.body.DELAY_MIN_SEGUNDOS !== undefined) config.DELAY_MIN_SEGUNDOS = req.body.DELAY_MIN_SEGUNDOS
    if (req.body.DELAY_MAX_SEGUNDOS !== undefined) config.DELAY_MAX_SEGUNDOS = req.body.DELAY_MAX_SEGUNDOS
    if (req.body.LIMITE_DIARIO !== undefined) config.LIMITE_DIARIO = req.body.LIMITE_DIARIO
    if (req.body.PAUSA_A_CADA !== undefined) config.PAUSA_A_CADA = req.body.PAUSA_A_CADA
    if (req.body.PAUSA_MINUTOS !== undefined) config.PAUSA_MINUTOS = req.body.PAUSA_MINUTOS
    
    await config.save()
    fila.setConfig(config)
    res.json({ ok: true, config: fila.getConfig() })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar configurações no MongoDB' })
  }
})

// ─── Campanhas ────────────────────────────────────────────────

router.get('/campanhas', async (req, res) => {
  const campanhas = await Campanha.find().sort({ criadoEm: -1 }).limit(50)
  res.json(campanhas)
})

router.post('/campanhas', async (req, res) => {
  const { nome, mensagem, leads } = req.body

  if (!nome || !mensagem) {
    return res.status(400).json({ erro: 'nome e mensagem são obrigatórios' })
  }

  const disparos = (leads || []).map(lead => ({
    leadId:   lead.id || lead._id,
    nome:     lead.nome,
    telefone: lead.telefone,
    status:   'pendente',
  }))

  const campanha = await Campanha.create({
    nome,
    mensagem,
    disparos,
    totalLeads: disparos.length,
  })

  res.status(201).json(campanha)
})

router.post('/campanhas/:id/leads', async (req, res) => {
  const { leads } = req.body
  if (!leads || !leads.length) return res.status(400).json({ erro: 'Nenhum lead fornecido.' })

  const camp = await Campanha.findById(req.params.id)
  if (!camp) return res.status(404).json({ erro: 'Campanha não encontrada.' })

  const existentes = new Set(camp.disparos.map(d => d.leadId))
  const novos = leads.filter(l => !existentes.has(l.id || l._id))

  if (!novos.length) return res.json({ ok: true, adicionados: 0, msg: 'Todos os leads já estavam na campanha.' })

  const novosDisparos = novos.map(lead => ({
    leadId:   lead.id || lead._id,
    nome:     lead.nome,
    telefone: lead.telefone,
    status:   'pendente',
  }))

  await Campanha.findByIdAndUpdate(camp._id, {
    $push: { disparos: { $each: novosDisparos } },
    $inc:  { totalLeads: novosDisparos.length }
  })

  res.json({ ok: true, adicionados: novosDisparos.length, msg: `${novosDisparos.length} leads adicionados à campanha.` })
})

router.get('/campanhas/:id', async (req, res) => {
  const camp = await Campanha.findById(req.params.id)
  if (!camp) return res.status(404).json({ erro: 'Campanha não encontrada' })
  res.json(camp)
})

router.post('/campanhas/:id/iniciar', async (req, res) => {
  const camp = await Campanha.findById(req.params.id)
  if (!camp) return res.status(404).json({ erro: 'Campanha não encontrada' })

  const { estado } = wppClient.getEstado()
  if (estado !== 'conectado') {
    return res.status(400).json({ erro: 'WhatsApp não está conectado. Conecte primeiro.' })
  }

  if (camp.status === 'em_andamento') {
    return res.status(400).json({ erro: 'Campanha já está em andamento.' })
  }

  // Só envia os pendentes (permite retomar campanhas pausadas)
  const pendentes = camp.disparos.filter(d => d.status === 'pendente')
  if (!pendentes.length) {
    return res.status(400).json({ erro: 'Nenhum disparo pendente.' })
  }

  await Campanha.findByIdAndUpdate(camp._id, {
    status: 'em_andamento',
    iniciadoEm: new Date(),
  })

  const itens = pendentes.map(d => ({
    telefone: d.telefone,
    mensagem: camp.mensagem,
    lead: { nome: d.nome, id: d.leadId },

    onSucesso: async () => {
      await Campanha.findOneAndUpdate(
        { _id: camp._id, 'disparos._id': d._id },
        {
          $set: { 'disparos.$.status': 'enviado', 'disparos.$.enviadoEm': new Date() },
          $inc: { totalEnviados: 1 },
        }
      )
      
      // Atualizar o status do lead na collection principal
      try {
        const db = mongoose.connection.db;
        if (db && d.leadId) {
          const { ObjectId } = mongoose.Types;
          await db.collection('leads').updateOne(
            { _id: new ObjectId(d.leadId) },
            { $set: { status: 'contatado', atualizado_em: new Date() } }
          );
        }
      } catch (err) {
        console.error('[MongoDB] Erro ao atualizar status do lead para contatado:', err);
      }

      // Verifica se finalizou
      const atualizada = await Campanha.findById(camp._id)
      if (!atualizada) return
      const todosFeitos = atualizada.disparos.every(x => x.status !== 'pendente')
      if (todosFeitos) {
        await Campanha.findByIdAndUpdate(camp._id, { status: 'finalizada', finalizadoEm: new Date() })
      }
    },

    onErro: async (msg) => {
      const statusErro = msg?.includes('não registrado') ? 'sem_wpp' : 'erro'
      await Campanha.findOneAndUpdate(
        { _id: camp._id, 'disparos._id': d._id },
        {
          $set: { 'disparos.$.status': statusErro, 'disparos.$.erro': msg },
          $inc: { totalErros: 1 },
        }
      )

      // Verifica se finalizou
      const atualizada = await Campanha.findById(camp._id)
      if (!atualizada) return
      const todosFeitos = atualizada.disparos.every(x => x.status !== 'pendente')
      if (todosFeitos) {
        await Campanha.findByIdAndUpdate(camp._id, { status: 'finalizada', finalizadoEm: new Date() })
      }
    },
  }))

  fila.adicionarNaFila(itens)
  res.json({ ok: true, total: itens.length, msg: `${itens.length} mensagens adicionadas à fila.` })
})

router.post('/campanhas/:id/pausar', async (req, res) => {
  fila.limparFila()
  await Campanha.findByIdAndUpdate(req.params.id, { status: 'pausada' })
  res.json({ ok: true })
})

router.delete('/campanhas/:id', async (req, res) => {
  await Campanha.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

module.exports = router
