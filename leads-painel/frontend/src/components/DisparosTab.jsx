// src/components/DisparosTab.jsx
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const s = {
  wrap: { flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 },
  grid: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 20,
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, display: 'block' },
  input: {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 11px', color: 'var(--text-1)',
    fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 11px', color: 'var(--text-1)',
    fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
    resize: 'vertical', minHeight: 120, boxSizing: 'border-box',
  },
  btn: (cor, disabled) => ({
    padding: '9px 18px', borderRadius: 7, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-body)',
    opacity: disabled ? 0.45 : 1, transition: 'all 0.15s',
    background: cor === 'blue' ? 'var(--blue)' : cor === 'green' ? 'var(--green)' : cor === 'red' ? 'rgba(239,68,68,0.15)' : 'var(--bg-hover)',
    color: cor === 'red' ? 'var(--red)' : cor === 'ghost' ? 'var(--text-2)' : '#fff',
    border: cor === 'red' ? '1px solid rgba(239,68,68,0.3)' : cor === 'ghost' ? '1px solid var(--border)' : 'none',
  }),
  tag: (c) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500,
    background: c === 'green' ? 'rgba(34,197,94,0.1)' : c === 'amber' ? 'rgba(245,158,11,0.1)' : c === 'red' ? 'rgba(239,68,68,0.1)' : c === 'blue' ? 'rgba(59,130,246,0.1)' : 'var(--bg-hover)',
    color: c === 'green' ? 'var(--green)' : c === 'amber' ? 'var(--amber)' : c === 'red' ? 'var(--red)' : c === 'blue' ? 'var(--blue)' : 'var(--text-2)',
    border: `1px solid ${c === 'green' ? 'rgba(34,197,94,0.3)' : c === 'amber' ? 'rgba(245,158,11,0.3)' : c === 'red' ? 'rgba(239,68,68,0.3)' : c === 'blue' ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
  }),
  dot: (c) => ({ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: c === 'green' ? 'var(--green)' : c === 'amber' ? 'var(--amber)' : 'var(--text-3)', flexShrink: 0 }),
  divider: { height: 1, background: 'var(--border)', margin: '14px 0' },
  campRow: {
    padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-base)', marginBottom: 10,
  },
  progressBar: (pct, cor) => ({
    height: 5, borderRadius: 3, width: `${pct}%`,
    background: cor === 'green' ? 'var(--green)' : cor === 'amber' ? 'var(--amber)' : 'var(--blue)',
    transition: 'width 0.4s',
  }),
}

const VARIAVEIS = ['{saudacao}', '{nome}', '{encerramento}']

const STATUS_CAMP = {
  rascunho:     { label: 'Rascunho',     cor: 'ghost' },
  em_andamento: { label: 'Em andamento', cor: 'amber' },
  pausada:      { label: 'Pausada',      cor: 'red'   },
  finalizada:   { label: 'Finalizada',   cor: 'green' },
}

export default function DisparosTab({ selecionados, onLimparSelecionados, botApi }) {
  const [wppStatus, setWppStatus]     = useState({ estado: 'desconectado', qrBase64: null, fila: null })
  const [campanhas, setCampanhas]     = useState([])
  const [botConfig, setBotConfig]     = useState(null)
  const [nomeCamp, setNomeCamp]       = useState('')
  const [mensagem, setMensagem]       = useState('Olá {nome}! Tudo bem? Me chamo [SEU NOME] e gostaria de apresentar nossos serviços. {encerramento}')
  const [criando, setCriando]         = useState(false)
  const [feedback, setFeedback]       = useState(null)
  const eventRef                      = useRef(null)

  // ── SSE: escuta eventos do bot em tempo real ──────────────────
  useEffect(() => {
    const es = new EventSource('http://localhost:3001/events')
    eventRef.current = es

    es.onmessage = (e) => {
      const dados = JSON.parse(e.data)
      if (dados.tipo === 'estado_inicial' || dados.tipo === 'pronto' || dados.tipo === 'qr' || dados.tipo === 'desconectado' || dados.tipo === 'autenticado') {
        setWppStatus(prev => ({ ...prev, estado: dados.estado ?? prev.estado, qrBase64: dados.qrBase64 ?? null, fila: dados.fila ?? prev.fila }))
      }
      if (dados.tipo === 'enviado' || dados.tipo === 'fila_atualizada' || dados.tipo === 'fila_finalizada') {
        setWppStatus(prev => ({ ...prev, fila: { ...prev.fila, ...dados } }))
        buscarCampanhas()
      }
      if (dados.tipo === 'pronto') {
        setWppStatus({ estado: 'conectado', qrBase64: null, fila: null })
        mostrarFeedback('✅ WhatsApp conectado com sucesso!', 'green')
      }
      if (dados.tipo === 'desconectado') {
        setWppStatus({ estado: 'desconectado', qrBase64: null, fila: null })
      }
    }

    es.onerror = () => {
      setWppStatus(prev => ({ ...prev, _botOffline: true }))
    }

    // Puxa status inicial via REST também
    axios.get(`${botApi}/wpp/status`)
      .then(r => setWppStatus(prev => ({ ...prev, ...r.data })))
      .catch(() => setWppStatus(prev => ({ ...prev, _botOffline: true })))

    // Puxa configs do bot
    axios.get(`${botApi}/wpp/config`)
      .then(r => setBotConfig(r.data))
      .catch(console.error)

    buscarCampanhas()

    return () => es.close()
  }, [])

  const buscarCampanhas = async () => {
    try {
      const r = await axios.get(`${botApi}/campanhas`)
      setCampanhas(r.data)
    } catch (e) { /* bot offline */ }
  }

  function mostrarFeedback(msg, tipo) {
    setFeedback({ msg, tipo })
    setTimeout(() => setFeedback(null), 4000)
  }

  const iniciarWpp = async () => {
    try {
      await axios.post(`${botApi}/wpp/iniciar`)
      setWppStatus(prev => ({ ...prev, estado: 'aguardando_qr' }))
    } catch (e) { mostrarFeedback('Erro ao iniciar bot. Verifique se o servidor está rodando.', 'red') }
  }

  const desconectarWpp = async () => {
    if (!confirm('Desconectar WhatsApp?')) return
    await axios.post(`${botApi}/wpp/desconectar`)
    setWppStatus({ estado: 'desconectado', qrBase64: null, fila: null })
  }

  const criarCampanha = async () => {
    if (!nomeCamp.trim())  return mostrarFeedback('Dê um nome para a campanha.', 'red')
    if (!mensagem.trim())  return mostrarFeedback('Escreva a mensagem.', 'red')

    const semTelefone = selecionados.filter(l => !l.telefone)
    if (semTelefone.length) return mostrarFeedback(`${semTelefone.length} lead(s) sem telefone não podem ser incluídos.`, 'amber')

    setCriando(true)
    try {
      const r = await axios.post(`${botApi}/campanhas`, { nome: nomeCamp, mensagem, leads: selecionados })
      mostrarFeedback(`Campanha "${r.data.nome}" criada com ${selecionados.length} leads!`, 'green')
      setNomeCamp('')
      onLimparSelecionados()
      buscarCampanhas()
    } catch (e) {
      mostrarFeedback('Erro ao criar campanha.', 'red')
    } finally { setCriando(false) }
  }

  const iniciarCampanha = async (id) => {
    try {
      const r = await axios.post(`${botApi}/campanhas/${id}/iniciar`)
      mostrarFeedback(r.data.msg, 'green')
      buscarCampanhas()
    } catch (e) {
      mostrarFeedback(e.response?.data?.erro || 'Erro ao iniciar campanha.', 'red')
    }
  }

  const adicionarLeads = async (id) => {
    if (!selecionados.length) return
    const semTelefone = selecionados.filter(l => !l.telefone)
    if (semTelefone.length) return mostrarFeedback(`${semTelefone.length} lead(s) sem telefone não podem ser incluídos.`, 'amber')

    try {
      const r = await axios.post(`${botApi}/campanhas/${id}/leads`, { leads: selecionados })
      mostrarFeedback(r.data.msg, 'green')
      onLimparSelecionados()
      buscarCampanhas()
    } catch (e) {
      mostrarFeedback(e.response?.data?.erro || 'Erro ao adicionar leads.', 'red')
    }
  }

  const pausarCampanha = async (id) => {
    await axios.post(`${botApi}/campanhas/${id}/pausar`)
    mostrarFeedback('Campanha pausada.', 'amber')
    buscarCampanhas()
  }

  const deletarCampanha = async (id) => {
    if (!confirm('Excluir esta campanha?')) return
    await axios.delete(`${botApi}/campanhas/${id}`)
    buscarCampanhas()
  }

  const inserirVariavel = (v) => {
    setMensagem(prev => prev + v)
  }

  const salvarConfig = async () => {
    try {
      const r = await axios.post(`${botApi}/wpp/config`, botConfig)
      setBotConfig(r.data.config)
      mostrarFeedback('Configurações salvas!', 'green')
    } catch (e) {
      mostrarFeedback('Erro ao salvar configurações.', 'red')
    }
  }

  // ── Render ────────────────────────────────────────────────────
  const { estado, qrBase64, _botOffline } = wppStatus

  function calcularETA(camp) {
    if (!botConfig) return null;
    const pendentes = camp.totalLeads - camp.totalEnviados - camp.totalErros;
    if (pendentes <= 0) return null;
    
    const mediaSeg = (botConfig.DELAY_MIN_SEGUNDOS + botConfig.DELAY_MAX_SEGUNDOS) / 2;
    const segsMensagens = pendentes * mediaSeg;
    const pausas = Math.floor(pendentes / botConfig.PAUSA_A_CADA);
    const segsPausa = pausas * botConfig.PAUSA_MINUTOS * 60;
    
    const totalMinutos = Math.round((segsMensagens + segsPausa) / 60);
    if (totalMinutos < 60) return `~ ${totalMinutos} min`;
    const h = Math.floor(totalMinutos / 60);
    const m = totalMinutos % 60;
    return `~ ${h}h ${m}m`;
  }

  return (
    <div style={s.wrap}>

      {/* Feedback toast */}
      {feedback && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: feedback.tipo === 'green' ? 'rgba(34,197,94,0.15)' : feedback.tipo === 'red' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
          color: feedback.tipo === 'green' ? 'var(--green)' : feedback.tipo === 'red' ? 'var(--red)' : 'var(--amber)',
          border: `1px solid ${feedback.tipo === 'green' ? 'rgba(34,197,94,0.3)' : feedback.tipo === 'red' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>{feedback.msg}</div>
      )}

      <div style={s.grid}>

        {/* Coluna esquerda — WhatsApp + criar campanha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Status WhatsApp */}
          <div style={s.card}>
            <div style={s.cardTitle}>📱 Conexão WhatsApp</div>

            {_botOffline && (
              <div style={{ padding: '10px 14px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>
                ⚠️ Bot offline. Inicie o servidor:<br />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>
                  cd whatsapp-bot && npm start
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={s.dot(estado === 'conectado' ? 'green' : estado === 'aguardando_qr' ? 'amber' : 'gray')} />
              <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>
                {estado === 'conectado' ? 'Conectado' : estado === 'aguardando_qr' ? 'Aguardando QR code...' : 'Desconectado'}
              </span>
            </div>

            {/* QR Code */}
            {qrBase64 && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
                  📱 Abra o WhatsApp → <b>Dispositivos vinculados</b> → <b>Vincular dispositivo</b> e escaneie:
                </div>
                <img
                  src={qrBase64}
                  alt="QR Code WhatsApp"
                  style={{ width: 200, height: 200, borderRadius: 8, border: '3px solid var(--border)', background: '#fff' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                  O código se renova automaticamente a cada 30s
                </div>
              </div>
            )}

            {/* Fila status */}
            {estado === 'conectado' && wppStatus.fila && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--bg-base)', border: '1px solid var(--border)', fontSize: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)' }}>
                  <span>Na fila agora:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{wppStatus.fila.tamanho ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', marginTop: 4 }}>
                  <span>Enviados hoje:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{wppStatus.fila.enviadosHoje ?? 0} / {wppStatus.fila.limiteD ?? 50}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {estado === 'desconectado' && (
                <button style={s.btn('green', _botOffline)} onClick={iniciarWpp} disabled={_botOffline}>
                  Conectar WhatsApp
                </button>
              )}
              {estado === 'aguardando_qr' && (
                <span style={{ fontSize: 12, color: 'var(--amber)' }}>⏳ Escaneie o QR code com seu celular...</span>
              )}
              {estado === 'conectado' && (
                <button style={s.btn('red', false)} onClick={desconectarWpp}>Desconectar</button>
              )}
            </div>
          </div>

          {/* Configurações */}
          {botConfig && (
            <div style={s.card}>
              <div style={s.cardTitle}>⚙️ Configurações do Robô</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={s.label}>Delay Mín (s)</label>
                  <input type="number" style={s.input} value={botConfig.DELAY_MIN_SEGUNDOS} onChange={e => setBotConfig({ ...botConfig, DELAY_MIN_SEGUNDOS: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={s.label}>Delay Máx (s)</label>
                  <input type="number" style={s.input} value={botConfig.DELAY_MAX_SEGUNDOS} onChange={e => setBotConfig({ ...botConfig, DELAY_MAX_SEGUNDOS: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={s.label}>Pausa a cada</label>
                  <input type="number" style={s.input} value={botConfig.PAUSA_A_CADA} onChange={e => setBotConfig({ ...botConfig, PAUSA_A_CADA: Number(e.target.value) })} title="A cada X mensagens enviadas" />
                </div>
                <div>
                  <label style={s.label}>Pausa (min)</label>
                  <input type="number" style={s.input} value={botConfig.PAUSA_MINUTOS} onChange={e => setBotConfig({ ...botConfig, PAUSA_MINUTOS: Number(e.target.value) })} />
                </div>
              </div>
              <button style={{ ...s.btn('ghost', false), width: '100%' }} onClick={salvarConfig}>
                💾 Salvar Configurações
              </button>
            </div>
          )}

          {/* Criar campanha */}
          <div style={s.card}>
            <div style={s.cardTitle}>
              ✉️ Nova Campanha
              {selecionados.length > 0 && (
                <span style={s.tag('blue')}>{selecionados.length} leads selecionados</span>
              )}
            </div>

            {selecionados.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 6, border: '1px solid var(--border)' }}>
                ℹ️ Você pode criar a campanha agora e <b>adicionar leads depois</b>.
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Nome da campanha</label>
              <input style={s.input} value={nomeCamp} onChange={e => setNomeCamp(e.target.value)} placeholder="Ex: Prospecção Chácaras SP" />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>Mensagem</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {VARIAVEIS.map(v => (
                  <button key={v} onClick={() => inserirVariavel(v)} style={s.btn('ghost', false)} title={`Inserir ${v}`}>
                    + {v}
                  </button>
                ))}
              </div>
              <textarea style={s.textarea} value={mensagem} onChange={e => setMensagem(e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                Variáveis: <code>{'{nome}'}</code> = nome do lead · <code>{'{saudacao}'}</code> = varia automaticamente · <code>{'{encerramento}'}</code> = varia automaticamente
              </div>
            </div>

            <button
              style={{ ...s.btn('blue', criando), width: '100%', marginTop: 4 }}
              onClick={criarCampanha}
              disabled={criando}
            >
              {criando ? 'Criando...' : `Criar campanha${selecionados.length ? ` (${selecionados.length} leads)` : ''}`}
            </button>
          </div>
        </div>

        {/* Coluna direita — campanhas */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={s.cardTitle}>📋 Campanhas</div>
            <button style={s.btn('ghost', false)} onClick={buscarCampanhas}>↻ Atualizar</button>
          </div>

          {campanhas.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div>Nenhuma campanha criada ainda</div>
            </div>
          )}

          {campanhas.map(camp => {
            const pct = camp.totalLeads ? Math.round(((camp.totalEnviados + camp.totalErros) / camp.totalLeads) * 100) : 0
            const cfg = STATUS_CAMP[camp.status] || STATUS_CAMP.rascunho
            return (
              <div key={camp._id} style={s.campRow}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{camp.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {new Date(camp.criadoEm).toLocaleDateString('pt-BR')} · {camp.totalLeads} leads
                    </div>
                  </div>
                  <span style={s.tag(cfg.cor)}>{cfg.label}</span>
                </div>

                {/* Barra de progresso */}
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={s.progressBar(pct, camp.status === 'finalizada' ? 'green' : camp.status === 'em_andamento' ? 'amber' : 'blue')} />
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-2)', marginBottom: 12 }}>
                  <span>✅ {camp.totalEnviados} enviados</span>
                  <span>❌ {camp.totalErros} erros</span>
                  <span>⏳ {camp.totalLeads - camp.totalEnviados - camp.totalErros} pendentes</span>
                  {camp.status !== 'finalizada' && calcularETA(camp) && (
                    <span style={{ color: 'var(--amber)', fontWeight: 500 }}>⏱ Estimativa: {calcularETA(camp)}</span>
                  )}
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{pct}%</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {(camp.status === 'rascunho' || camp.status === 'pausada') && (
                    <button style={s.btn('green', estado !== 'conectado')} onClick={() => iniciarCampanha(camp._id)} disabled={estado !== 'conectado'} title={estado !== 'conectado' ? 'Conecte o WhatsApp primeiro' : ''}>
                      ▶ {camp.status === 'pausada' ? 'Retomar' : 'Iniciar'}
                    </button>
                  )}
                  {selecionados.length > 0 && (camp.status === 'rascunho' || camp.status === 'pausada' || camp.status === 'finalizada') && (
                    <button style={s.btn('blue', false)} onClick={() => adicionarLeads(camp._id)}>
                      + Adicionar {selecionados.length} leads
                    </button>
                  )}
                  {camp.status === 'em_andamento' && (
                    <button style={s.btn('amber', false)} onClick={() => pausarCampanha(camp._id)}>⏸ Pausar</button>
                  )}
                  <button style={s.btn('red', false)} onClick={() => deletarCampanha(camp._id)}>Excluir</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
