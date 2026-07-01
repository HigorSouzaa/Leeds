// src/components/DisparosTab.jsx
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Smartphone, Wifi, WifiOff, QrCode, Settings, Mail, Plus,
  Play, Pause, Trash2, RefreshCw, Check, AlertTriangle, Clock,
  Send, X, ChevronRight, Loader2, RotateCcw, Pencil
} from 'lucide-react'

const VARIAVEIS = ['{saudacao}', '{nome}', '{encerramento}']

const STATUS_CAMP = {
  rascunho:     { label: 'Rascunho',     cor: 'ghost' },
  em_andamento: { label: 'Em andamento', cor: 'amber' },
  pausada:      { label: 'Pausada',      cor: 'red'   },
  finalizada:   { label: 'Finalizada',   cor: 'green' },
}

const colorMap = {
  green: { bg: 'var(--green-soft)', color: 'var(--green)', border: 'rgba(74,222,128,0.2)' },
  amber: { bg: 'var(--amber-soft)', color: 'var(--amber)', border: 'rgba(250,204,21,0.2)' },
  red:   { bg: 'var(--red-soft)',   color: 'var(--red)',   border: 'rgba(248,113,113,0.2)' },
  blue:  { bg: 'var(--accent-soft)', color: 'var(--accent)', border: 'var(--accent-border)' },
  ghost: { bg: 'var(--bg-elevated)', color: 'var(--text-2)', border: 'var(--border)' },
}

function Tag({ cor, children }) {
  const c = colorMap[cor] || colorMap.ghost
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>{children}</span>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: 20,
      transition: 'border-color 0.15s ease', ...style,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >{children}</div>
  )
}

function CardTitle({ icon: Icon, children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: 'var(--text-1)',
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {Icon && <Icon size={16} style={{ color: 'var(--text-3)' }} />}
      {children}
    </div>
  )
}

function Label({ children }) {
  return (
    <label style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 6, display: 'block',
    }}>{children}</label>
  )
}

const inputStyle = {
  width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', padding: '8px 11px', color: 'var(--text-1)',
  fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}

const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: 110 }

function Btn({ cor = 'ghost', disabled, onClick, children, full, icon: Icon }) {
  const styles = {
    blue:  { bg: 'var(--accent)', color: '#fff', border: 'none' },
    green: { bg: 'var(--green)', color: '#fff', border: 'none' },
    amber: { bg: 'var(--amber-soft)', color: 'var(--amber)', border: '1px solid rgba(250,204,21,0.25)' },
    red:   { bg: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' },
    ghost: { bg: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' },
  }
  const s = styles[cor] || styles.ghost
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 16px', borderRadius: 'var(--radius-sm)',
      fontWeight: 600, fontSize: 12, fontFamily: 'var(--font-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1, transition: 'opacity 0.15s',
      background: s.bg, color: s.color, border: s.border,
      width: full ? '100%' : 'auto',
      display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
    }}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  )
}

export default function DisparosTab({ selecionados, onLimparSelecionados, botApi, onMensagemEnviada }) {
  const [chips, setChips]             = useState([])
  const [filaStatus, setFilaStatus]   = useState(null)
  const [botOffline, setBotOffline]   = useState(false)
  const [campanhas, setCampanhas]     = useState([])
  const [botConfig, setBotConfig]     = useState(null)
  const [nomeCamp, setNomeCamp]       = useState('')
  const [mensagem, setMensagem]       = useState('Olá {nome}! Tudo bem? Me chamo [SEU NOME] e gostaria de apresentar nossos serviços. {encerramento}')
  const [criando, setCriando]         = useState(false)
  const [feedback, setFeedback]       = useState(null)
  const [apelidoNovoChip, setApelidoNovoChip] = useState('')
  const eventRef                      = useRef(null)

  useEffect(() => {
    const es = new EventSource('http://localhost:3001/events')
    eventRef.current = es

    es.onmessage = (e) => {
      const dados = JSON.parse(e.data)

      // ─── Estado inicial ───
      if (dados.tipo === 'estado_inicial') {
        setChips(dados.chips || [])
        setFilaStatus(dados.fila)
      }

      // ─── Eventos de chips ───
      if (['chip_qr', 'chip_pronto', 'chip_desconectado', 'chip_reconectando', 'chip_adicionado', 'chip_removido'].includes(dados.tipo)) {
        // Recarrega a lista de chips do servidor
        axios.get(`${botApi}/chips`).then(r => setChips(r.data)).catch(() => {})
        if (dados.tipo === 'chip_pronto') mostrarFeedback(`Chip "${dados.chipId}" conectado!`, 'green')
        if (dados.tipo === 'chip_desconectado') mostrarFeedback(`Chip "${dados.chipId}" desconectado.`, 'amber')
      }

      // ─── Fila ───
      if (['enviado', 'fila_atualizada', 'fila_finalizada'].includes(dados.tipo)) {
        setFilaStatus(prev => ({ ...prev, ...dados }))
        buscarCampanhas()
        if (dados.tipo === 'enviado' && typeof onMensagemEnviada === 'function') onMensagemEnviada()
      }

      // ─── Alertas ───
      if (dados.tipo === 'possivel_ban') { mostrarFeedback('🚨 Possível restrição! Envios pausados por segurança.', 'red'); buscarCampanhas() }
      if (dados.tipo === 'limite_diario') { mostrarFeedback(`⛔ Limite diário atingido. Campanha pausada.`, 'amber'); buscarCampanhas() }
      if (dados.tipo === 'pausa_longa') mostrarFeedback(`☕ Pausa de ${dados.minutos} min para segurança...`, 'amber')
    }

    es.onerror = () => setBotOffline(true)

    axios.get(`${botApi}/wpp/status`)
      .then(r => { setChips(r.data.chips || []); setFilaStatus(r.data.fila) })
      .catch(() => setBotOffline(true))

    axios.get(`${botApi}/wpp/config`).then(r => setBotConfig(r.data)).catch(console.error)
    buscarCampanhas()

    return () => es.close()
  }, [])

  const buscarCampanhas = async () => {
    try { const r = await axios.get(`${botApi}/campanhas`); setCampanhas(r.data) } catch (e) {}
  }

  function mostrarFeedback(msg, tipo) {
    setFeedback({ msg, tipo })
    setTimeout(() => setFeedback(null), 4000)
  }

  const adicionarChip = async () => {
    try {
      await axios.post(`${botApi}/chips`, { apelido: apelidoNovoChip || undefined })
      setApelidoNovoChip('')
      mostrarFeedback('Chip adicionado! Aguarde o QR code.', 'green')
    } catch (e) { mostrarFeedback(e.response?.data?.erro || 'Erro ao adicionar chip.', 'red') }
  }

  const removerChip = async (chipId) => {
    if (!confirm('Remover este chip?')) return
    await axios.delete(`${botApi}/chips/${chipId}`)
    setChips(prev => prev.filter(c => c.id !== chipId))
    mostrarFeedback('Chip removido.', 'amber')
  }

  const reconectarChip = async (chipId) => {
    await axios.post(`${botApi}/chips/${chipId}/reconectar`)
    mostrarFeedback('Reconectando... aguarde o QR code.', 'amber')
  }

  const criarCampanha = async () => {
    if (!nomeCamp.trim()) return mostrarFeedback('Dê um nome para a campanha.', 'red')
    if (!mensagem.trim()) return mostrarFeedback('Escreva a mensagem.', 'red')
    const semTelefone = selecionados.filter(l => !l.telefone)
    if (semTelefone.length) return mostrarFeedback(`${semTelefone.length} lead(s) sem telefone.`, 'amber')

    setCriando(true)
    try {
      const r = await axios.post(`${botApi}/campanhas`, { nome: nomeCamp, mensagem, leads: selecionados })
      mostrarFeedback(`Campanha "${r.data.nome}" criada com ${selecionados.length} leads!`, 'green')
      setNomeCamp(''); onLimparSelecionados(); buscarCampanhas()
    } catch (e) { mostrarFeedback('Erro ao criar campanha.', 'red') }
    finally { setCriando(false) }
  }

  const iniciarCampanha = async (id) => {
    try { const r = await axios.post(`${botApi}/campanhas/${id}/iniciar`); mostrarFeedback(r.data.msg, 'green'); buscarCampanhas() }
    catch (e) { mostrarFeedback(e.response?.data?.erro || 'Erro ao iniciar.', 'red') }
  }

  const adicionarLeads = async (id) => {
    if (!selecionados.length) return
    const semTel = selecionados.filter(l => !l.telefone)
    if (semTel.length) return mostrarFeedback(`${semTel.length} lead(s) sem telefone.`, 'amber')
    try { const r = await axios.post(`${botApi}/campanhas/${id}/leads`, { leads: selecionados }); mostrarFeedback(r.data.msg, 'green'); onLimparSelecionados(); buscarCampanhas() }
    catch (e) { mostrarFeedback(e.response?.data?.erro || 'Erro ao adicionar.', 'red') }
  }

  const pausarCampanha = async (id) => { await axios.post(`${botApi}/campanhas/${id}/pausar`); mostrarFeedback('Campanha pausada.', 'amber'); buscarCampanhas() }
  const deletarCampanha = async (id) => { if (!confirm('Excluir campanha?')) return; await axios.delete(`${botApi}/campanhas/${id}`); buscarCampanhas() }
  
  const reiniciarCampanha = async (id) => {
    if (!confirm('Deseja realmente reiniciar esta campanha? Todos os disparos voltarão para Pendente.')) return;
    try {
      const r = await axios.post(`${botApi}/campanhas/${id}/reiniciar`)
      mostrarFeedback(r.data.msg, 'green')
      buscarCampanhas()
    } catch (e) {
      mostrarFeedback(e.response?.data?.erro || 'Erro ao reiniciar.', 'red')
    }
  }

  const [editandoCamp, setEditandoCamp] = useState(null)
  
  const salvarEdicaoCampanha = async (e) => {
    e.preventDefault()
    if (!editandoCamp.nome.trim() || !editandoCamp.mensagem.trim()) {
      return mostrarFeedback('Nome e mensagem são obrigatórios.', 'red')
    }
    try {
      const r = await axios.put(`${botApi}/campanhas/${editandoCamp._id}`, { nome: editandoCamp.nome, mensagem: editandoCamp.mensagem })
      mostrarFeedback(r.data.msg, 'green')
      setEditandoCamp(null)
      buscarCampanhas()
    } catch (err) {
      mostrarFeedback(err.response?.data?.erro || 'Erro ao editar.', 'red')
    }
  }

  const inserirVariavel = (v) => setMensagem(prev => prev + v)
  const inserirVariavelEdicao = (v) => setEditandoCamp(prev => ({ ...prev, mensagem: prev.mensagem + v }))

  const salvarConfig = async () => {
    try { const r = await axios.post(`${botApi}/wpp/config`, botConfig); setBotConfig(r.data.config); mostrarFeedback('Configurações salvas!', 'green') }
    catch (e) { mostrarFeedback('Erro ao salvar.', 'red') }
  }

  const totalConectados = chips.filter(c => c.estado === 'conectado').length

  function calcularETA(camp) {
    if (!botConfig) return null
    const pendentes = camp.totalLeads - camp.totalEnviados - camp.totalErros
    if (pendentes <= 0) return null
    const mediaSeg = (botConfig.DELAY_MIN_SEGUNDOS + botConfig.DELAY_MAX_SEGUNDOS) / 2
    const segsMensagens = pendentes * mediaSeg
    const pausas = Math.floor(pendentes / botConfig.PAUSA_A_CADA)
    const segsPausa = pausas * botConfig.PAUSA_MINUTOS * 60
    const totalMinutos = Math.round((segsMensagens + segsPausa) / 60)
    if (totalMinutos < 60) return `~${totalMinutos}min`
    return `~${Math.floor(totalMinutos / 60)}h ${totalMinutos % 60}m`
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {feedback && (
        <div style={{
          position: 'fixed', top: 16, right: 24, zIndex: 999,
          padding: '10px 16px', borderRadius: 'var(--radius-md)',
          fontSize: 13, fontWeight: 500,
          background: colorMap[feedback.tipo]?.bg || colorMap.ghost.bg,
          color: colorMap[feedback.tipo]?.color || colorMap.ghost.color,
          border: `1px solid ${colorMap[feedback.tipo]?.border || colorMap.ghost.border}`,
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Check size={14} />
          {feedback.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ─── Chips WhatsApp ─── */}
          <Card>
            <CardTitle icon={Smartphone}>Chips WhatsApp</CardTitle>

            {botOffline && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--red-soft)', border: '1px solid rgba(248,113,113,0.15)', fontSize: 12, color: 'var(--red)', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>Bot offline. Inicie o servidor:<br /><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>cd whatsapp-bot && npm start</span></div>
              </div>
            )}

            {/* Lista de chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {chips.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>Nenhum chip adicionado.<br />Adicione abaixo.</div>
              )}
              {chips.map(chip => (
                <div key={chip.id} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: chip.qrBase64 ? 8 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {chip.estado === 'conectado' ? <Wifi size={13} style={{ color: 'var(--green)' }} /> : chip.estado === 'aguardando_qr' ? <Loader2 size={13} style={{ color: 'var(--amber)', animation: 'spin 1s linear infinite' }} /> : <WifiOff size={13} style={{ color: 'var(--text-3)' }} />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{chip.apelido}</span>
                      <span style={{ fontSize: 10, color: chip.estado === 'conectado' ? 'var(--green)' : chip.estado === 'aguardando_qr' ? 'var(--amber)' : 'var(--text-3)', background: chip.estado === 'conectado' ? 'rgba(74,222,128,0.1)' : 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 99 }}>
                        {chip.estado === 'conectado' ? 'Conectado' : chip.estado === 'aguardando_qr' ? 'Aguardando QR' : chip.estado === 'iniciando' ? 'Iniciando...' : 'Desconectado'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {chip.estado === 'desconectado' && <Btn cor="ghost" icon={RefreshCw} onClick={() => reconectarChip(chip.id)}>Reconectar</Btn>}
                      <Btn cor="red" icon={Trash2} onClick={() => removerChip(chip.id)}>Remover</Btn>
                    </div>
                  </div>
                  {chip.qrBase64 && (
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Abra o WhatsApp → <b>Dispositivos vinculados</b> → <b>Vincular</b></div>
                      <img src={chip.qrBase64} alt="QR" style={{ width: 160, height: 160, borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', background: '#fff' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Adicionar chip */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <Label>Adicionar novo chip</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Apelido (ex: Chip 1 - Vendas)" value={apelidoNovoChip} onChange={e => setApelidoNovoChip(e.target.value)} />
                <Btn cor="green" icon={Plus} onClick={adicionarChip} disabled={botOffline}>Adicionar</Btn>
              </div>
            </div>

            {/* Status da fila */}
            {totalConectados > 0 && filaStatus && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid var(--border)', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', marginBottom: 4 }}>
                  <span>Chips conectados:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 700 }}>{totalConectados}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', marginBottom: 4 }}>
                  <span>Na fila:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{filaStatus.tamanho ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)' }}>
                  <span>Enviados hoje:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{filaStatus.enviadosHoje ?? 0}/{filaStatus.limiteD ?? 35}</span>
                </div>
              </div>
            )}
          </Card>

          {/* Config */}
          {botConfig && (
            <Card>
              <CardTitle icon={Settings}>Configurações do Robô</CardTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div><Label>Delay Mín (s)</Label><input type="number" style={inputStyle} value={botConfig.DELAY_MIN_SEGUNDOS} onChange={e => setBotConfig({ ...botConfig, DELAY_MIN_SEGUNDOS: Number(e.target.value) })} /></div>
                <div><Label>Delay Máx (s)</Label><input type="number" style={inputStyle} value={botConfig.DELAY_MAX_SEGUNDOS} onChange={e => setBotConfig({ ...botConfig, DELAY_MAX_SEGUNDOS: Number(e.target.value) })} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div><Label>Pausa a cada</Label><input type="number" style={inputStyle} value={botConfig.PAUSA_A_CADA} onChange={e => setBotConfig({ ...botConfig, PAUSA_A_CADA: Number(e.target.value) })} /></div>
                <div><Label>Pausa (min)</Label><input type="number" style={inputStyle} value={botConfig.PAUSA_MINUTOS} onChange={e => setBotConfig({ ...botConfig, PAUSA_MINUTOS: Number(e.target.value) })} /></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Label>Limite Diário (Mensagens/Dia)</Label>
                <input type="number" style={inputStyle} value={botConfig.LIMITE_DIARIO} onChange={e => setBotConfig({ ...botConfig, LIMITE_DIARIO: Number(e.target.value) })} />
              </div>
              <Btn cor="ghost" onClick={salvarConfig} full>Salvar configurações</Btn>
            </Card>
          )}

          {/* Nova campanha */}
          <Card>
            <CardTitle icon={Mail}>
              Nova Campanha
              {selecionados.length > 0 && <Tag cor="blue">{selecionados.length} leads</Tag>}
            </CardTitle>

            {selecionados.length === 0 && (
              <div style={{
                fontSize: 12, color: 'var(--text-3)', marginBottom: 12,
                padding: '8px 12px', background: 'var(--bg-base)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', lineHeight: 1.5,
              }}>
                Você pode criar a campanha agora e <b>adicionar leads depois</b>.
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <Label>Nome da campanha</Label>
              <input style={inputStyle} value={nomeCamp} onChange={e => setNomeCamp(e.target.value)} placeholder="Ex: Prospecção Chácaras SP" />
            </div>

            <div style={{ marginBottom: 10 }}>
              <Label>Mensagem</Label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {VARIAVEIS.map(v => (
                  <button key={v} onClick={() => inserirVariavel(v)} style={{
                    padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                    color: 'var(--text-2)', fontSize: 11, cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}>
                    <Plus size={10} style={{ marginRight: 3 }} />{v}
                  </button>
                ))}
              </div>
              <textarea style={textareaStyle} value={mensagem} onChange={e => setMensagem(e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
                <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{'{nome}'}</code> = nome do lead · <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{'{saudacao}'}</code> = varia · <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{'{encerramento}'}</code> = varia
              </div>
            </div>

            <Btn cor="blue" onClick={criarCampanha} disabled={criando} full icon={Send}>
              {criando ? 'Criando...' : `Criar campanha${selecionados.length ? ` (${selecionados.length} leads)` : ''}`}
            </Btn>
          </Card>
        </div>

        {/* Campanhas */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <CardTitle icon={Mail}>Campanhas</CardTitle>
            <Btn cor="ghost" onClick={buscarCampanhas} icon={RefreshCw}>Atualizar</Btn>
          </div>

          {campanhas.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Mail size={28} style={{ color: 'var(--text-3)', marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Nenhuma campanha criada</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Crie uma ao lado para começar</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campanhas.map(camp => {
              const pct = camp.totalLeads ? Math.round(((camp.totalEnviados + camp.totalErros) / camp.totalLeads) * 100) : 0
              const cfg = STATUS_CAMP[camp.status] || STATUS_CAMP.rascunho
              return (
                <div key={camp._id} style={{
                  padding: '14px 16px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--bg-base)',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{camp.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(camp.criadoEm).toLocaleDateString('pt-BR')} · {camp.totalLeads} leads</div>
                    </div>
                    <Tag cor={cfg.cor}>{cfg.label}</Tag>
                  </div>

                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 'var(--radius-full)', width: `${pct}%`,
                      background: camp.status === 'finalizada' ? 'var(--green)' : camp.status === 'em_andamento' ? 'var(--amber)' : 'var(--accent)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>

                  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-2)', marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Check size={11} /> {camp.totalEnviados} enviados</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><X size={11} /> {camp.totalErros} erros</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {camp.totalLeads - camp.totalEnviados - camp.totalErros} pendentes</span>
                    {camp.status !== 'finalizada' && calcularETA(camp) && (
                      <span style={{ color: 'var(--amber)' }}>{calcularETA(camp)}</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-1)' }}>{pct}%</span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(camp.status === 'rascunho' || camp.status === 'pausada') && (
                      <Btn cor="green" icon={Play} onClick={() => iniciarCampanha(camp._id)} disabled={totalConectados === 0}>
                        {camp.status === 'pausada' ? `Retomar (${camp.totalLeads - camp.totalEnviados - camp.totalErros} restantes)` : 'Iniciar'}
                      </Btn>
                    )}
                    {selecionados.length > 0 && (camp.status === 'rascunho' || camp.status === 'pausada' || camp.status === 'finalizada') && (
                      <Btn cor="blue" icon={Plus} onClick={() => adicionarLeads(camp._id)}>{selecionados.length} leads</Btn>
                    )}
                    {camp.status === 'em_andamento' && (
                      <Btn cor="amber" icon={Pause} onClick={() => pausarCampanha(camp._id)}>Pausar</Btn>
                    )}
                    {camp.status !== 'em_andamento' && (
                      <Btn cor="ghost" icon={Pencil} onClick={() => setEditandoCamp({ ...camp })}>Editar</Btn>
                    )}
                    {(camp.status === 'finalizada' || camp.status === 'pausada' || camp.status === 'rascunho') && camp.totalEnviados > 0 && (
                      <Btn cor="ghost" icon={RotateCcw} onClick={() => reiniciarCampanha(camp._id)}>Reiniciar</Btn>
                    )}
                    <Btn cor="red" icon={Trash2} onClick={() => deletarCampanha(camp._id)}>Excluir</Btn>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Modal Edição */}
      {editandoCamp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 24, width: '100%',
            maxWidth: 420, boxShadow: 'var(--shadow-lg)',
            animation: 'slideDown 0.15s ease', position: 'relative'
          }}>
            <button onClick={() => setEditandoCamp(null)} style={{
              position: 'absolute', top: 16, right: 16, background: 'none',
              border: 'none', color: 'var(--text-3)', cursor: 'pointer',
            }}><X size={18} /></button>

            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 20 }}>Editar Campanha</h2>

            <form onSubmit={salvarEdicaoCampanha} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label>Nome da campanha</Label>
                <input style={inputStyle} value={editandoCamp.nome} onChange={e => setEditandoCamp({ ...editandoCamp, nome: e.target.value })} autoFocus />
              </div>
              <div>
                <Label>Mensagem</Label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {VARIAVEIS.map(v => (
                    <button type="button" key={v} onClick={() => inserirVariavelEdicao(v)} style={{
                      padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                      color: 'var(--text-2)', fontSize: 11, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}>
                      <Plus size={10} style={{ marginRight: 3 }} />{v}
                    </button>
                  ))}
                </div>
                <textarea style={textareaStyle} value={editandoCamp.mensagem} onChange={e => setEditandoCamp({ ...editandoCamp, mensagem: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setEditandoCamp(null)} style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
                }}>Cancelar</button>
                <button type="submit" style={{
                  padding: '8px 16px', background: 'var(--accent)', border: 'none',
                  color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)'
                }}>Salvar Edição</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
