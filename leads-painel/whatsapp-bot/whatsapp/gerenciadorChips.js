// whatsapp-bot/whatsapp/gerenciadorChips.js
// Gerencia N instâncias do WhatsApp em paralelo

const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode')
const path = require('path')

// ─── Estado dos chips ────────────────────────────────────────────
// chips = { [chipId]: { id, apelido, estado, qrBase64, cliente } }
const chips = new Map()

const listeners = []
function notificar(evento, dados) { listeners.forEach(fn => fn(evento, dados)) }
function subscribe(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1) }

// ─── Criação de cliente WhatsApp por chip ────────────────────────
function criarClienteChip(chipId) {
  const sessionPath = path.join(__dirname, '..', `.wpp_session_${chipId}`)

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    puppeteer: {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
  })

  client.on('qr', async (qr) => {
    const chip = chips.get(chipId)
    if (!chip) return
    chip.estado = 'aguardando_qr'
    chip.qrBase64 = await qrcode.toDataURL(qr)
    console.log(`[CHIP ${chipId}] QR code gerado`)
    notificar('chip_qr', { chipId, qrBase64: chip.qrBase64, estado: 'aguardando_qr' })
  })

  client.on('authenticated', () => {
    const chip = chips.get(chipId)
    if (chip) chip.qrBase64 = null
    console.log(`[CHIP ${chipId}] Autenticado com sucesso!`)
    notificar('chip_autenticado', { chipId, estado: 'autenticado' })
  })

  client.on('ready', () => {
    const chip = chips.get(chipId)
    if (chip) { chip.estado = 'conectado'; chip.qrBase64 = null }
    console.log(`[CHIP ${chipId}] ✅ Pronto para envio!`)
    notificar('chip_pronto', { chipId, estado: 'conectado' })
  })

  client.on('disconnected', async (reason) => {
    console.log(`[CHIP ${chipId}] Desconectado: ${reason}`)
    const chip = chips.get(chipId)
    if (chip) { chip.estado = 'desconectado'; chip.qrBase64 = null }
    notificar('chip_desconectado', { chipId, estado: 'desconectado', reason })
    try { await client.destroy().catch(() => {}) } catch (e) {}
    if (chip) chip.cliente = null
  })

  client.on('auth_failure', (msg) => {
    console.error(`[CHIP ${chipId}] Falha de autenticação: ${msg}`)
    const chip = chips.get(chipId)
    if (chip) { chip.estado = 'erro'; chip.qrBase64 = null }
    notificar('chip_erro_auth', { chipId, msg })
  })

  return client
}

// ─── API pública ─────────────────────────────────────────────────

async function adicionarChip(chipId, apelido) {
  if (chips.has(chipId)) {
    throw new Error(`Chip ${chipId} já existe`)
  }
  const chip = { id: chipId, apelido: apelido || `Chip ${chipId}`, estado: 'iniciando', qrBase64: null, cliente: null }
  chips.set(chipId, chip)
  notificar('chip_adicionado', { chipId, apelido: chip.apelido })

  const cliente = criarClienteChip(chipId)
  chip.cliente = cliente
  await cliente.initialize()
  return chip
}

async function removerChip(chipId) {
  const chip = chips.get(chipId)
  if (!chip) throw new Error(`Chip ${chipId} não encontrado`)

  try {
    if (chip.cliente) await chip.cliente.destroy().catch(() => {})
  } catch (e) {}

  chips.delete(chipId)
  notificar('chip_removido', { chipId })
}

async function reconectarChip(chipId) {
  const chip = chips.get(chipId)
  if (!chip) throw new Error(`Chip ${chipId} não encontrado`)

  try {
    if (chip.cliente) await chip.cliente.destroy().catch(() => {})
  } catch (e) {}

  chip.estado = 'iniciando'
  chip.qrBase64 = null
  chip.cliente = null
  notificar('chip_reconectando', { chipId })

  const cliente = criarClienteChip(chipId)
  chip.cliente = cliente
  await cliente.initialize()
}

// Retorna o próximo chip conectado disponível (round-robin)
let ultimoChipIdx = 0
function getProximoChipDisponivel() {
  const conectados = [...chips.values()].filter(c => c.estado === 'conectado' && c.cliente)
  if (conectados.length === 0) return null

  ultimoChipIdx = ultimoChipIdx % conectados.length
  const chip = conectados[ultimoChipIdx]
  ultimoChipIdx++
  return chip.cliente
}

function getChipEspecifico(chipId) {
  const chip = chips.get(chipId)
  if (!chip || chip.estado !== 'conectado') return null
  return chip.cliente
}

function getStatusTodos() {
  return [...chips.values()].map(c => ({
    id: c.id,
    apelido: c.apelido,
    estado: c.estado,
    qrBase64: c.qrBase64,
  }))
}

function getTotalConectados() {
  return [...chips.values()].filter(c => c.estado === 'conectado').length
}

module.exports = {
  adicionarChip,
  removerChip,
  reconectarChip,
  getProximoChipDisponivel,
  getChipEspecifico,
  getStatusTodos,
  getTotalConectados,
  subscribe,
  notificar,
}
