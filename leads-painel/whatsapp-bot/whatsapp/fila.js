// whatsapp-bot/whatsapp/fila.js
const { getCliente } = require('./client')

let DELAY_MIN_SEGUNDOS = 45
let DELAY_MAX_SEGUNDOS = 180
let LIMITE_DIARIO = 50
let PAUSA_A_CADA = 10
let PAUSA_MINUTOS = 15

let DELAY_MIN = DELAY_MIN_SEGUNDOS * 1000
let DELAY_MAX = DELAY_MAX_SEGUNDOS * 1000

let fila = []
let processando = false
let enviadosHoje = 0
let ultimoReset = new Date().toDateString()
let contadorSemPausa = 0

const listeners = []
function notificar(evento, dados) { listeners.forEach(fn => fn(evento, dados)) }
function subscribe(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1) }

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function delayAleatorio() {
  const ms = Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1)) + DELAY_MIN
  console.log(`[FILA] Aguardando ${(ms / 1000).toFixed(0)}s antes do próximo envio...`)
  return delay(ms)
}

function resetarContadorDiario() {
  const hoje = new Date().toDateString()
  if (hoje !== ultimoReset) {
    enviadosHoje = 0
    ultimoReset = hoje
    console.log('[FILA] Contador diário resetado.')
  }
}

// Variações de texto para não enviar mensagens idênticas
function variarMensagem(template, lead) {
  const saudacoes = ['Olá', 'Oi', 'Bom dia', 'Boa tarde']
  const encerramentos = ['Aguardo seu retorno!', 'Fico à disposição!', 'Qualquer dúvida estou aqui!', 'Abraços!']

  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)]
  const encerramento = encerramentos[Math.floor(Math.random() * encerramentos.length)]

  return template
    .replace(/\{saudacao\}/gi, saudacao)
    .replace(/\{nome\}/gi, lead.nome || 'tudo bem')
    .replace(/\{encerramento\}/gi, encerramento)
    .trim()
}

// Formata número para padrão internacional
function formatarNumero(telefone) {
  const nums = telefone.replace(/\D/g, '')
  // Já tem DDI
  if (nums.startsWith('55') && nums.length >= 12) return `${nums}@c.us`
  // Número brasileiro sem DDI
  if (nums.length === 10 || nums.length === 11) return `55${nums}@c.us`
  return `${nums}@c.us`
}

async function processarFila() {
  if (processando || fila.length === 0) return
  processando = true

  while (fila.length > 0) {
    resetarContadorDiario()

    if (enviadosHoje >= LIMITE_DIARIO) {
      console.log(`[FILA] ⛔ Limite diário de ${LIMITE_DIARIO} mensagens atingido. Retomando amanhã.`)
      notificar('limite_diario', { enviados: enviadosHoje, limite: LIMITE_DIARIO })
      fila = []
      break
    }

    // Pausa longa a cada X mensagens
    if (contadorSemPausa > 0 && contadorSemPausa % PAUSA_A_CADA === 0) {
      const pausaMs = PAUSA_MINUTOS * 60 * 1000
      console.log(`[FILA] ☕ Pausa de ${PAUSA_MINUTOS} min após ${PAUSA_A_CADA} mensagens...`)
      notificar('pausa_longa', { minutos: PAUSA_MINUTOS })
      await delay(pausaMs)
    }

    const item = fila.shift()
    const cliente = getCliente()

    if (!cliente) {
      console.log('[FILA] ⚠️ Cliente desconectado. Abortando fila.')
      item.onErro?.('Cliente WhatsApp desconectado')
      fila = []
      break
    }

    try {
      const numero = formatarNumero(item.telefone)
      const mensagem = variarMensagem(item.mensagem, item.lead)

      // Verifica se número existe no WhatsApp antes de enviar
      const existe = await cliente.isRegisteredUser(numero)
      if (!existe) {
        console.log(`[FILA] ⚠️ Número não registrado no WhatsApp: ${item.telefone}`)
        item.onErro?.('Número não registrado no WhatsApp')
        notificar('nao_registrado', { lead: item.lead })
        continue
      }

      await cliente.sendMessage(numero, mensagem)
      enviadosHoje++
      contadorSemPausa++

      console.log(`[FILA] ✅ Enviado para ${item.lead.nome} (${item.telefone}) | ${enviadosHoje}/${LIMITE_DIARIO} hoje`)
      item.onSucesso?.()
      notificar('enviado', { lead: item.lead, enviadosHoje })

    } catch (err) {
      console.error(`[FILA] ❌ Erro ao enviar para ${item.telefone}:`, err.message)
      item.onErro?.(err.message)
      notificar('erro_envio', { lead: item.lead, erro: err.message })
    }

    if (fila.length > 0) await delayAleatorio()
  }

  processando = false
  console.log('[FILA] 🏁 Fila finalizada.')
  notificar('fila_finalizada', { enviadosHoje })
}

function adicionarNaFila(itens) {
  fila.push(...itens)
  notificar('fila_atualizada', { tamanho: fila.length })
  processarFila()
}

function limparFila() {
  fila = []
  notificar('fila_limpa', {})
}

function getStatus() {
  return {
    processando,
    tamanho: fila.length,
    enviadosHoje,
    limiteD: LIMITE_DIARIO,
    contadorSemPausa,
  }
}

function getConfig() {
  return {
    DELAY_MIN_SEGUNDOS,
    DELAY_MAX_SEGUNDOS,
    LIMITE_DIARIO,
    PAUSA_A_CADA,
    PAUSA_MINUTOS,
  }
}

function setConfig(newCfg) {
  if (newCfg.DELAY_MIN_SEGUNDOS !== undefined) DELAY_MIN_SEGUNDOS = newCfg.DELAY_MIN_SEGUNDOS;
  if (newCfg.DELAY_MAX_SEGUNDOS !== undefined) DELAY_MAX_SEGUNDOS = newCfg.DELAY_MAX_SEGUNDOS;
  if (newCfg.LIMITE_DIARIO !== undefined) LIMITE_DIARIO = newCfg.LIMITE_DIARIO;
  if (newCfg.PAUSA_A_CADA !== undefined) PAUSA_A_CADA = newCfg.PAUSA_A_CADA;
  if (newCfg.PAUSA_MINUTOS !== undefined) PAUSA_MINUTOS = newCfg.PAUSA_MINUTOS;

  DELAY_MIN = DELAY_MIN_SEGUNDOS * 1000;
  DELAY_MAX = DELAY_MAX_SEGUNDOS * 1000;
}

module.exports = { adicionarNaFila, limparFila, getStatus, subscribe, getConfig, setConfig }
