// whatsapp-bot/routes/api.js
const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Campanha = require('../models/campanha')
const Config = require('../models/config')
const Chip = require('../models/chip')
const gerenciadorChips = require('../whatsapp/gerenciadorChips')
const fila = require('../whatsapp/fila')

// ─── Rastrear campanha ativa (para recuperação) ──────────────
let campanhaAtivaId = null

// Quando a fila é interrompida, atualiza campanha para 'pausada'
fila.setOnFilaInterrompida(async (motivo) => {
  if (!campanhaAtivaId) return
  console.log(`[CAMPANHA] Fila interrompida (${motivo}). Pausando campanha ${campanhaAtivaId}...`)
  try {
    await Campanha.findByIdAndUpdate(campanhaAtivaId, { status: 'pausada' })
    console.log(`[CAMPANHA] ✅ Campanha pausada. Pode ser retomada.`)
  } catch (err) {
    console.error('[CAMPANHA] Erro ao pausar campanha:', err)
  }
  campanhaAtivaId = null
})

// Recuperação de campanhas travadas ao reiniciar
async function recuperarCampanhasTravadas() {
  try {
    const travadas = await Campanha.find({ status: 'em_andamento' })
    for (const camp of travadas) {
      console.log(`[RECUPERAÇÃO] Campanha "${camp.nome}" estava em_andamento → pausada`)
      await Campanha.findByIdAndUpdate(camp._id, { status: 'pausada' })
    }
    if (travadas.length > 0) {
      console.log(`[RECUPERAÇÃO] ${travadas.length} campanha(s) recuperada(s)!`)
    }
  } catch (err) {
    console.error('[RECUPERAÇÃO] Erro:', err)
  }
}
mongoose.connection.once('open', () => { recuperarCampanhasTravadas() })

// ─── Status geral ────────────────────────────────────────────

router.get('/wpp/status', (req, res) => {
  res.json({
    chips: gerenciadorChips.getStatusTodos(),
    totalConectados: gerenciadorChips.getTotalConectados(),
    fila: fila.getStatus(),
  })
})

// ─── Gerenciamento de chips ──────────────────────────────────

router.get('/chips', async (req, res) => {
  const status = gerenciadorChips.getStatusTodos()
  res.json(status)
})

router.post('/chips', async (req, res) => {
  const { apelido } = req.body
  // Gera um ID único para o chip
  const chipId = `chip_${Date.now()}`
  try {
    // Salva no banco para recarregar automaticamente
    await Chip.create({ chipId, apelido: apelido || `Chip ${chipId}` })
    // Inicia a sessão (não faz await — pode demorar)
    gerenciadorChips.adicionarChip(chipId, apelido || `Chip ${chipId}`).catch(err => {
      console.error(`[CHIP] Erro ao adicionar chip ${chipId}:`, err.message)
    })
    res.json({ ok: true, chipId, msg: 'Chip adicionado. Aguarde o QR code.' })
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message })
  }
})

router.delete('/chips/:chipId', async (req, res) => {
  try {
    await gerenciadorChips.removerChip(req.params.chipId)
    await Chip.deleteOne({ chipId: req.params.chipId })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message })
  }
})

router.post('/chips/:chipId/reconectar', async (req, res) => {
  try {
    gerenciadorChips.reconectarChip(req.params.chipId).catch(err => {
      console.error(`[CHIP] Erro ao reconectar ${req.params.chipId}:`, err.message)
    })
    res.json({ ok: true, msg: 'Reconectando... aguarde o QR code.' })
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message })
  }
})

// ─── Config do robô ──────────────────────────────────────────

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
    res.status(500).json({ erro: 'Erro ao salvar configurações' })
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
  const campanha = await Campanha.create({ nome, mensagem, disparos, totalLeads: disparos.length })
  res.status(201).json(campanha)
})

router.post('/campanhas/:id/leads', async (req, res) => {
  const { leads } = req.body
  if (!leads || !leads.length) return res.status(400).json({ erro: 'Nenhum lead fornecido.' })
  const camp = await Campanha.findById(req.params.id)
  if (!camp) return res.status(404).json({ erro: 'Campanha não encontrada.' })
  const existentes = new Set(camp.disparos.map(d => d.leadId))
  const novos = leads.filter(l => !existentes.has(l.id || l._id))
  if (!novos.length) return res.json({ ok: true, adicionados: 0, msg: 'Todos já estavam na campanha.' })
  const novosDisparos = novos.map(lead => ({ leadId: lead.id || lead._id, nome: lead.nome, telefone: lead.telefone, status: 'pendente' }))
  await Campanha.findByIdAndUpdate(camp._id, {
    $push: { disparos: { $each: novosDisparos } },
    $inc: { totalLeads: novosDisparos.length },
  })
  res.json({ ok: true, adicionados: novosDisparos.length, msg: `${novosDisparos.length} leads adicionados.` })
})

router.get('/campanhas/:id', async (req, res) => {
  const camp = await Campanha.findById(req.params.id)
  if (!camp) return res.status(404).json({ erro: 'Campanha não encontrada' })
  res.json(camp)
})

router.post('/campanhas/:id/iniciar', async (req, res) => {
  const camp = await Campanha.findById(req.params.id)
  if (!camp) return res.status(404).json({ erro: 'Campanha não encontrada' })

  if (gerenciadorChips.getTotalConectados() === 0) {
    return res.status(400).json({ erro: 'Nenhum chip WhatsApp conectado. Adicione e conecte um chip primeiro.' })
  }
  if (camp.status === 'em_andamento') {
    return res.status(400).json({ erro: 'Campanha já está em andamento.' })
  }

  const pendentes = camp.disparos.filter(d => d.status === 'pendente')
  if (!pendentes.length) {
    return res.status(400).json({ erro: 'Nenhum disparo pendente.' })
  }

  campanhaAtivaId = camp._id.toString()
  await Campanha.findByIdAndUpdate(camp._id, { status: 'em_andamento', iniciadoEm: new Date() })

  const itens = pendentes.map(d => ({
    telefone: d.telefone,
    mensagem: camp.mensagem,
    lead: { nome: d.nome, id: d.leadId },

    onSucesso: async () => {
      await Campanha.findOneAndUpdate(
        { _id: camp._id, 'disparos._id': d._id },
        { $set: { 'disparos.$.status': 'enviado', 'disparos.$.enviadoEm': new Date() }, $inc: { totalEnviados: 1 } }
      )
      try {
        const db = mongoose.connection.db
        if (db && d.leadId) {
          const { ObjectId } = mongoose.Types
          await db.collection('leads').updateOne(
            { _id: new ObjectId(d.leadId) },
            { $set: { status: 'contatado', atualizado_em: new Date() } }
          )
        }
      } catch (err) {}
      const atualizada = await Campanha.findById(camp._id)
      if (!atualizada) return
      const todosFeitos = atualizada.disparos.every(x => x.status !== 'pendente')
      if (todosFeitos) {
        await Campanha.findByIdAndUpdate(camp._id, { status: 'finalizada', finalizadoEm: new Date() })
        campanhaAtivaId = null
      }
    },

    onErro: async (msg) => {
      const statusErro = msg?.includes('não registrado') ? 'sem_wpp' : 'erro'
      await Campanha.findOneAndUpdate(
        { _id: camp._id, 'disparos._id': d._id },
        { $set: { 'disparos.$.status': statusErro, 'disparos.$.erro': msg }, $inc: { totalErros: 1 } }
      )
      const atualizada = await Campanha.findById(camp._id)
      if (!atualizada) return
      const todosFeitos = atualizada.disparos.every(x => x.status !== 'pendente')
      if (todosFeitos) {
        await Campanha.findByIdAndUpdate(camp._id, { status: 'finalizada', finalizadoEm: new Date() })
        campanhaAtivaId = null
      }
    },
  }))

  fila.adicionarNaFila(itens)
  res.json({ ok: true, total: itens.length, msg: `${itens.length} mensagens adicionadas à fila.` })
})

router.post('/campanhas/:id/pausar', async (req, res) => {
  campanhaAtivaId = null
  fila.limparFila()
  await Campanha.findByIdAndUpdate(req.params.id, { status: 'pausada' })
  res.json({ ok: true })
})

router.delete('/campanhas/:id', async (req, res) => {
  await Campanha.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

router.post('/campanhas/:id/reiniciar', async (req, res) => {
  const camp = await Campanha.findById(req.params.id)
  if (!camp) return res.status(404).json({ erro: 'Campanha não encontrada' })
  const disparosResetados = camp.disparos.map(d => ({ ...d.toObject(), status: 'pendente', erro: null, enviadoEm: null }))
  await Campanha.findByIdAndUpdate(camp._id, {
    status: 'rascunho', totalEnviados: 0, totalErros: 0,
    iniciadoEm: null, finalizadoEm: null, disparos: disparosResetados,
  })
  res.json({ ok: true, msg: 'Campanha reiniciada com sucesso.' })
})

router.put('/campanhas/:id', async (req, res) => {
  const { nome, mensagem } = req.body
  const camp = await Campanha.findById(req.params.id)
  if (!camp) return res.status(404).json({ erro: 'Campanha não encontrada' })
  if (camp.status === 'em_andamento') {
    return res.status(400).json({ erro: 'Não é possível editar uma campanha em andamento.' })
  }
  await Campanha.findByIdAndUpdate(camp._id, { nome, mensagem })
  res.json({ ok: true, msg: 'Campanha atualizada com sucesso.' })
})

module.exports = router
