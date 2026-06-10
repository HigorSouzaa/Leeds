// whatsapp-bot/whatsapp/client.js
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode')

let estadoAtual = 'desconectado' // desconectado | aguardando_qr | conectado
let qrBase64 = null
let clienteWpp = null

const listeners = [] // callbacks pra notificar mudanças

function notificar(evento, dados) {
  listeners.forEach(fn => fn(evento, dados))
}

function subscribe(fn) {
  listeners.push(fn)
  return () => listeners.splice(listeners.indexOf(fn), 1)
}

function criarCliente() {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wpp_session' }),
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
    // Simula versão real do WhatsApp Web
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
  })

  client.on('qr', async (qr) => {
    estadoAtual = 'aguardando_qr'
    // Converte QR para imagem base64 pra exibir no painel
    qrBase64 = await qrcode.toDataURL(qr)
    console.log('[WPP] QR code gerado — aguardando leitura...')
    notificar('qr', { qrBase64, estado: estadoAtual })
  })

  client.on('authenticated', () => {
    console.log('[WPP] Autenticado com sucesso!')
    qrBase64 = null
    notificar('autenticado', { estado: 'conectado' })
  })

  client.on('ready', () => {
    estadoAtual = 'conectado'
    qrBase64 = null
    console.log('[WPP] ✅ WhatsApp pronto para envio!')
    notificar('pronto', { estado: 'conectado' })
  })

  client.on('disconnected', (reason) => {
    estadoAtual = 'desconectado'
    qrBase64 = null
    clienteWpp = null
    console.log('[WPP] Desconectado:', reason)
    notificar('desconectado', { estado: 'desconectado', reason })
  })

  client.on('auth_failure', (msg) => {
    estadoAtual = 'desconectado'
    console.error('[WPP] Falha de autenticação:', msg)
    notificar('erro_auth', { msg })
  })

  return client
}

async function iniciar() {
  if (clienteWpp) return
  console.log('[WPP] Iniciando cliente...')
  clienteWpp = criarCliente()
  await clienteWpp.initialize()
}

async function desconectar() {
  if (!clienteWpp) return
  await clienteWpp.destroy()
  clienteWpp = null
  estadoAtual = 'desconectado'
  qrBase64 = null
}

function getEstado() {
  return { estado: estadoAtual, qrBase64 }
}

function getCliente() {
  return clienteWpp
}

module.exports = { iniciar, desconectar, getEstado, getCliente, subscribe }
