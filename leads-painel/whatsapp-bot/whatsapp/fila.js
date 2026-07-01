// whatsapp-bot/whatsapp/fila.js
const gerenciadorChips = require('./gerenciadorChips')

// ─── Configurações (serão sobrescritas pelo MongoDB) ─────────
let DELAY_MIN_SEGUNDOS = 60
let DELAY_MAX_SEGUNDOS = 240
let LIMITE_DIARIO = 35
let PAUSA_A_CADA = 8
let PAUSA_MINUTOS = 20

let DELAY_MIN = DELAY_MIN_SEGUNDOS * 1000
let DELAY_MAX = DELAY_MAX_SEGUNDOS * 1000

// ─── Estado da fila ──────────────────────────────────────────
let fila = []
let processando = false
let enviadosHoje = 0
let ultimoReset = new Date().toDateString()
let contadorSemPausa = 0
let errosConsecutivos = 0  // Detecta possível ban

const listeners = []
function notificar(evento, dados) { listeners.forEach(fn => fn(evento, dados)) }
function subscribe(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1) }

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Delay "humano" progressivo ──────────────────────────────
// Quanto mais mensagens enviadas no dia, mais devagar fica
// (um humano também digitaria mais devagar com o tempo)
function delayAleatorio() {
  // Fator de cansaço: a cada 10 mensagens, delays ficam 15% maiores
  const fatorCansaco = 1 + Math.floor(enviadosHoje / 10) * 0.15
  const minMs = Math.floor(DELAY_MIN * fatorCansaco)
  const maxMs = Math.floor(DELAY_MAX * fatorCansaco)

  // Adiciona micro-variação extra (+/- 20%) para não ser previsível
  const variacao = 0.8 + Math.random() * 0.4 // entre 0.8 e 1.2
  const ms = Math.floor((Math.random() * (maxMs - minMs + 1) + minMs) * variacao)

  console.log(`[FILA] Aguardando ${(ms / 1000).toFixed(0)}s antes do próximo envio... (fator cansaço: ${fatorCansaco.toFixed(2)}x)`)
  return delay(ms)
}

// Pausa com variação aleatória (não faz pausas sempre do mesmo tamanho)
function pausaAleatoria() {
  const varMin = Math.max(1, PAUSA_MINUTOS - 5)
  const varMax = PAUSA_MINUTOS + 10
  const minutos = varMin + Math.floor(Math.random() * (varMax - varMin + 1))
  const ms = minutos * 60 * 1000
  console.log(`[FILA] ☕ Pausa de ${minutos} min após ${PAUSA_A_CADA} mensagens...`)
  notificar('pausa_longa', { minutos })
  return delay(ms)
}

function resetarContadorDiario() {
  const hoje = new Date().toDateString()
  if (hoje !== ultimoReset) {
    enviadosHoje = 0
    contadorSemPausa = 0
    errosConsecutivos = 0
    ultimoReset = hoje
    console.log('[FILA] Contador diário resetado.')
  }
}

// ─── Variações de texto mais naturais ────────────────────────
function variarMensagem(template, lead) {
  const hora = new Date().getHours()

  // Saudação baseada na hora REAL do dia
  let saudacoes
  if (hora >= 5 && hora < 12) {
    saudacoes = ['Bom dia', 'Bom dia!', 'Oi, bom dia']
  } else if (hora >= 12 && hora < 18) {
    saudacoes = ['Boa tarde', 'Boa tarde!', 'Oi, boa tarde']
  } else {
    saudacoes = ['Boa noite', 'Boa noite!', 'Oi, boa noite']
  }

  const encerramentos = [
    'Aguardo seu retorno!',
    'Fico à disposição!',
    'Qualquer dúvida estou aqui!',
    'Abraços!',
    'Fico no aguardo.',
    'Estou à disposição!',
    'Me chama se precisar!',
    'Espero seu contato!',
  ]

  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)]
  const encerramento = encerramentos[Math.floor(Math.random() * encerramentos.length)]

  // Variação sutil: às vezes adiciona/remove pontuação, espaços extras
  let msg = template
    .replace(/\{saudacao\}/gi, saudacao)
    .replace(/\{nome\}/gi, lead.nome || 'tudo bem')
    .replace(/\{encerramento\}/gi, encerramento)
    .trim()

  // 30% de chance de adicionar um emoji diferente no final
  const emojis = ['😊', '👍', '🤝', '✨', '']
  if (Math.random() < 0.3) {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)]
    if (emoji) msg += ' ' + emoji
  }

  return msg
}

// Formata número para padrão internacional
function formatarNumero(telefone) {
  const nums = telefone.replace(/\D/g, '')
  if (nums.startsWith('55') && nums.length >= 12) return `${nums}@c.us`
  if (nums.length === 10 || nums.length === 11) return `55${nums}@c.us`
  return `${nums}@c.us`
}

// ─── Callback de interrupção ─────────────────────────────────
let onFilaInterrompida = null
function setOnFilaInterrompida(fn) { onFilaInterrompida = fn }

// ─── Processamento principal ─────────────────────────────────
async function processarFila() {
  if (processando || fila.length === 0) return
  processando = true

  let motivoParada = null

  while (fila.length > 0) {
    resetarContadorDiario()

    // ─── Limite diário atingido ───
    if (enviadosHoje >= LIMITE_DIARIO) {
      console.log(`[FILA] ⛔ Limite diário de ${LIMITE_DIARIO} mensagens atingido. Retomando amanhã.`)
      notificar('limite_diario', { enviados: enviadosHoje, limite: LIMITE_DIARIO })
      motivoParada = 'limite_diario'
      fila = []
      break
    }

    // ─── Detecção de possível ban ───
    // Se tiver muitos erros seguidos, provavelmente foi banido/restrito
    if (errosConsecutivos >= 3) {
      console.log(`[FILA] 🚨 ${errosConsecutivos} erros consecutivos detectados! Possível restrição do WhatsApp.`)
      console.log('[FILA] 🛑 Parando envios por segurança. Verifique seu WhatsApp.')
      notificar('possivel_ban', { errosConsecutivos })
      motivoParada = 'possivel_ban'
      fila = []
      break
    }

    // ─── Pausa periódica (com variação no intervalo) ───
    if (contadorSemPausa > 0 && contadorSemPausa % PAUSA_A_CADA === 0) {
      await pausaAleatoria()
    }

    const item = fila.shift()
    const cliente = gerenciadorChips.getProximoChipDisponivel()

    if (!cliente) {
      console.log('[FILA] ⚠️ Cliente desconectado. Abortando fila.')
      item.onErro?.('Cliente WhatsApp desconectado')
      motivoParada = 'desconectado'
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
        // Números não registrados NÃO contam como erros consecutivos
        continue
      }

      await cliente.sendMessage(numero, mensagem)
      enviadosHoje++
      contadorSemPausa++
      errosConsecutivos = 0  // Resetar — envio bem sucedido

      console.log(`[FILA] ✅ Enviado para ${item.lead.nome} (${item.telefone}) | ${enviadosHoje}/${LIMITE_DIARIO} hoje`)
      item.onSucesso?.()
      notificar('enviado', { lead: item.lead, enviadosHoje })

    } catch (err) {
      errosConsecutivos++
      console.error(`[FILA] ❌ Erro ao enviar para ${item.telefone}: ${err.message} (${errosConsecutivos} erros seguidos)`)
      item.onErro?.(err.message)
      notificar('erro_envio', { lead: item.lead, erro: err.message, errosConsecutivos })

      // Se está dando erro, faz uma pausa extra para não piorar a situação
      if (errosConsecutivos >= 2) {
        const pausaSeguranca = 60000 + Math.random() * 60000 // 1-2 min
        console.log(`[FILA] ⏸️ Pausa de segurança de ${(pausaSeguranca / 1000).toFixed(0)}s por erros consecutivos...`)
        await delay(pausaSeguranca)
      }
    }

    if (fila.length > 0) await delayAleatorio()
  }

  processando = false

  // Se parou por motivo externo, avisa para atualizar o status da campanha
  if (motivoParada && onFilaInterrompida) {
    console.log(`[FILA] 🔄 Fila interrompida por: ${motivoParada}`)
    onFilaInterrompida(motivoParada)
  }

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
    errosConsecutivos,
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

module.exports = { adicionarNaFila, limparFila, getStatus, subscribe, getConfig, setConfig, setOnFilaInterrompida }
