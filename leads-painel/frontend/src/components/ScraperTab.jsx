// src/components/ScraperTab.jsx
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Play, Square, Terminal, Search, MapPin, Hash, Check } from 'lucide-react'

const inputStyle = {
  width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', padding: '8px 11px', color: 'var(--text-1)',
  fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
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

function Btn({ cor = 'ghost', disabled, onClick, children, full, icon: Icon, type = 'button' }) {
  const styles = {
    blue:  { bg: 'var(--accent)', color: '#fff', border: 'none' },
    green: { bg: 'var(--green)', color: '#fff', border: 'none' },
    red:   { bg: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' },
    ghost: { bg: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' },
  }
  const s = styles[cor] || styles.ghost
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: '8px 16px', borderRadius: 'var(--radius-sm)',
      fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition: 'opacity 0.15s',
      background: s.bg, color: s.color, border: s.border,
      width: full ? '100%' : 'auto',
      display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
    }}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )
}

export default function ScraperTab({ api, onScraperFinish }) {
  const [termo, setTermo] = useState('')
  const [cidade, setCidade] = useState('')
  const [qtd, setQtd] = useState(100)
  
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [feedback, setFeedback] = useState(null)
  
  const terminalRef = useRef(null)

  function mostrarFeedback(msg, tipo = 'green') {
    setFeedback({ msg, tipo })
    setTimeout(() => setFeedback(null), 4000)
  }

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${api}/scraper/logs`)
      setLogs(res.data.logs)
      setRunning(res.data.running)
      
      // Se parou de rodar e a gente sabia que estava rodando antes
      if (!res.data.running && running) {
        onScraperFinish()
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    // Busca inicial para saber o estado
    fetchLogs()
    
    // Polling a cada 1 segundo
    const interval = setInterval(() => {
      fetchLogs()
    }, 1000)
    
    return () => clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  const iniciarBot = async (e) => {
    e.preventDefault()
    if (!termo.trim()) return mostrarFeedback('O termo de busca é obrigatório!', 'red')
    
    try {
      const res = await axios.post(`${api}/scraper/start`, { termo, cidade, qtd })
      if (res.data.ok) {
        setRunning(true)
        mostrarFeedback('Bot iniciado com sucesso!')
      } else {
        mostrarFeedback(res.data.erro, 'red')
      }
    } catch (err) {
      mostrarFeedback(err.response?.data?.erro || err.response?.data?.detail || 'Erro ao iniciar.', 'red')
    }
  }

  const pararBot = async () => {
    if (!confirm('Deseja forçar a parada do bot?')) return
    try {
      await axios.post(`${api}/scraper/stop`)
      setRunning(false)
      mostrarFeedback('Comando de parada enviado.')
    } catch (err) {
      mostrarFeedback('Erro ao parar bot.', 'red')
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {feedback && (
        <div style={{
          position: 'fixed', top: 16, right: 24, zIndex: 999,
          padding: '10px 16px', borderRadius: 'var(--radius-md)',
          fontSize: 13, fontWeight: 500,
          background: feedback.tipo === 'red' ? 'var(--red-soft)' : 'var(--green-soft)',
          color: feedback.tipo === 'red' ? 'var(--red)' : 'var(--green)',
          border: `1px solid ${feedback.tipo === 'red' ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`,
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Check size={14} />
          {feedback.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start', height: '100%' }}>
        
        {/* Formulário */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 20
        }}>
          <CardTitle icon={Search}>Configuração da Busca</CardTitle>
          
          <form onSubmit={iniciarBot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>O que buscar?</Label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-3)' }} />
                <input 
                  style={{ ...inputStyle, paddingLeft: 32 }} 
                  value={termo} 
                  onChange={e => setTermo(e.target.value)} 
                  placeholder="Ex: chácara, dentista" 
                  disabled={running}
                />
              </div>
            </div>
            
            <div>
              <Label>Cidade/Estado (Opcional)</Label>
              <div style={{ position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-3)' }} />
                <input 
                  style={{ ...inputStyle, paddingLeft: 32 }} 
                  value={cidade} 
                  onChange={e => setCidade(e.target.value)} 
                  placeholder="Ex: Campinas SP" 
                  disabled={running}
                />
              </div>
            </div>
            
            <div>
              <Label>Quantos Leads (Meta)</Label>
              <div style={{ position: 'relative' }}>
                <Hash size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-3)' }} />
                <input 
                  type="number"
                  style={{ ...inputStyle, paddingLeft: 32 }} 
                  value={qtd} 
                  onChange={e => setQtd(Number(e.target.value))} 
                  min="1"
                  disabled={running}
                />
              </div>
            </div>
            
            <div style={{ marginTop: 8 }}>
              {running ? (
                <Btn cor="red" icon={Square} full onClick={pararBot}>Parar Extrator</Btn>
              ) : (
                <Btn cor="green" type="submit" icon={Play} full>Iniciar Busca Automática</Btn>
              )}
            </div>
          </form>
          
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 16, lineHeight: 1.5 }}>
            <span style={{ color: 'var(--amber)' }}>Aviso:</span> O navegador será aberto automaticamente na sua máquina para simular um humano e evitar bloqueios. Não minimize a janela enquanto a extração acontece.
          </div>
        </div>
        
        {/* Terminal */}
        <div style={{
          background: '#0d1117', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column',
          height: 'calc(100vh - 180px)', overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px', background: '#161b22', borderBottom: '1px solid #30363d',
            display: 'flex', alignItems: 'center', gap: 8, color: '#c9d1d9', fontSize: 13, fontWeight: 600
          }}>
            <Terminal size={16} />
            Terminal do Bot
            {running && (
              <span style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: 'var(--accent)', fontWeight: 500
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)', animation: 'pulse 2s infinite'
                }}></span>
                Rodando...
              </span>
            )}
          </div>
          
          <div ref={terminalRef} style={{
            flex: 1, overflowY: 'auto', padding: 16, fontFamily: 'var(--font-mono)',
            fontSize: 12, color: '#8b949e', lineHeight: 1.6
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#484f58', fontStyle: 'italic' }}>Aguardando comandos...</div>
            ) : (
              logs.map((log, i) => {
                // Colorir alguns logs
                let color = '#8b949e'
                if (log.includes('✅') || log.includes('🎯')) color = '#3fb950'
                if (log.includes('⚠️') || log.includes('⏭️')) color = '#d29922'
                if (log.includes('❌') || log.includes('🛑')) color = '#f85149'
                if (log.includes('📍') || log.includes('🌐') || log.includes('🔍')) color = '#58a6ff'
                if (log.includes('==============')) color = '#484f58'
                
                return (
                  <div key={i} style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {log}
                  </div>
                )
              })
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}
