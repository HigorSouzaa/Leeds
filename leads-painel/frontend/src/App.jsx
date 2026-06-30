// src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Crosshair, Search, Send, Loader2, CheckCircle, Bot } from 'lucide-react'
import FilterBar from './components/FilterBar.jsx'
import StatsBar from './components/StatsBar.jsx'
import LeadsTable from './components/LeadsTable.jsx'
import Pagination from './components/Pagination.jsx'
import DisparosTab from './components/DisparosTab.jsx'
import ScraperTab from './components/ScraperTab.jsx'
import NovoLeadModal from './components/NovoLeadModal.jsx'

const API = '/api'
const BOT_API = 'http://localhost:3001/api'

export default function App() {
  const [aba, setAba]             = useState('leads')
  const [leads, setLeads]         = useState([])
  const [stats, setStats]         = useState(null)
  const [total, setTotal]         = useState(0)
  const [pagina, setPagina]       = useState(1)
  const [totalPag, setTotalPag]   = useState(1)
  const [loading, setLoading]     = useState(false)
  const [selecionados, setSelecionados] = useState([])
  const [filtros, setFiltros]     = useState({
    busca: '', categoria: '', cidade: '', status: '',
    tem_telefone: '', tem_site: ''
  })

  const buscarLeads = useCallback(async (pag = 1, f = filtros) => {
    setLoading(true)
    try {
      const params = { pagina: pag, por_pagina: 20 }
      if (f.busca)       params.busca = f.busca
      if (f.categoria)   params.categoria = f.categoria
      if (f.cidade)      params.cidade = f.cidade
      if (f.status)      params.status = f.status
      if (f.tem_telefone !== '') params.tem_telefone = f.tem_telefone === 'sim'
      if (f.tem_site !== '')     params.tem_site = f.tem_site === 'sim'

      const res = await axios.get(`${API}/leads`, { params })
      setLeads(res.data.leads)
      setTotal(res.data.total)
      setTotalPag(res.data.total_paginas)
      setPagina(pag)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filtros])

  const buscarStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leads/stats`)
      setStats(res.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    buscarLeads(1, filtros)
    buscarStats()
  }, [])

  const aplicarFiltros = (novosFiltros) => {
    setFiltros(novosFiltros)
    buscarLeads(1, novosFiltros)
    setSelecionados([])
  }

  const mudarStatus = async (id, status) => {
    await axios.patch(`${API}/leads/${id}/status`, { status })
    buscarLeads(pagina, filtros)
    buscarStats()
  }

  const deletarLead = async (id) => {
    if (!confirm('Remover este lead?')) return
    await axios.delete(`${API}/leads/${id}`)
    setSelecionados(s => s.filter(x => x.id !== id))
    buscarLeads(pagina, filtros)
    buscarStats()
  }

  const toggleSelecionado = (lead) => {
    setSelecionados(prev =>
      prev.find(x => x.id === lead.id)
        ? prev.filter(x => x.id !== lead.id)
        : [...prev, lead]
    )
  }

  const toggleTodos = () => {
    const todosNaPagina = leads.filter(l => l.telefone)
    const todosSelecionados = todosNaPagina.every(l => selecionados.find(s => s.id === l.id))
    if (todosSelecionados) {
      setSelecionados(prev => prev.filter(s => !todosNaPagina.find(l => l.id === s.id)))
    } else {
      const novos = todosNaPagina.filter(l => !selecionados.find(s => s.id === l.id))
      setSelecionados(prev => [...prev, ...novos])
    }
  }

  const selecionarTodosFiltrados = async () => {
    setLoading(true)
    try {
      const params = { pagina: 1, por_pagina: 10000 }
      if (filtros.busca)       params.busca = filtros.busca
      if (filtros.categoria)   params.categoria = filtros.categoria
      if (filtros.cidade)      params.cidade = filtros.cidade
      if (filtros.status)      params.status = filtros.status
      if (filtros.tem_telefone !== '') params.tem_telefone = filtros.tem_telefone === 'sim'
      if (filtros.tem_site !== '')     params.tem_site = filtros.tem_site === 'sim'

      const res = await axios.get(`${API}/leads`, { params })
      const comTelefone = res.data.leads.filter(l => l.telefone)
      
      setSelecionados(prev => {
        const novos = comTelefone.filter(l => !prev.find(s => s.id === l.id))
        return [...prev, ...novos]
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 32px', height: 52, flexShrink: 0,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Crosshair size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)', letterSpacing: '-0.3px' }}>
            LeadHunter
          </span>
        </div>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 380, marginLeft: 24, position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-3)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={filtros.busca}
            onChange={e => aplicarFiltros({ ...filtros, busca: e.target.value })}
            style={{
              width: '100%', background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)', padding: '7px 12px 7px 32px',
              color: 'var(--text-1)', fontSize: 13, outline: 'none',
              fontFamily: 'var(--font-body)', transition: 'border-color 0.15s ease',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border-hover)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Status */}
        <div style={{ marginLeft: 'auto' }}>
          {loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 'var(--radius-full)',
              fontSize: 11, color: 'var(--amber)', fontWeight: 500,
            }}>
              <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
              Carregando
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 'var(--radius-full)',
              fontSize: 11, color: 'var(--green)', fontWeight: 500,
            }}>
              <CheckCircle size={12} />
              Online
            </div>
          )}
        </div>
      </header>

      {/* ── Tabs + Filters (same line) ─────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Tabs (left) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {[
            { id: 'leads', label: 'Leads', icon: Crosshair },
            { id: 'extrator', label: 'Extrator', icon: Bot },
            { id: 'disparos', label: 'Disparos', icon: Send, badge: selecionados.length || null },
          ].map(a => {
            const Icon = a.icon
            return (
              <button key={a.id} onClick={() => setAba(a.id)} style={{
                padding: '11px 16px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-body)',
                color: aba === a.id ? 'var(--text-1)' : 'var(--text-3)',
                borderBottom: aba === a.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
                onMouseEnter={e => { if (aba !== a.id) e.currentTarget.style.color = 'var(--text-2)' }}
                onMouseLeave={e => { if (aba !== a.id) e.currentTarget.style.color = 'var(--text-3)' }}
              >
                <Icon size={14} />
                {a.label}
                {a.badge && (
                  <span style={{
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    padding: '0px 5px', borderRadius: 'var(--radius-full)',
                    lineHeight: '16px', minWidth: 16, textAlign: 'center',
                  }}>{a.badge}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Filters (right) — only visible on Leads tab */}
        {aba === 'leads' && (
          <FilterBar filtros={filtros} onChange={aplicarFiltros} />
        )}
      </div>

      {/* ── Content (with padding) ─────────────── */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minWidth: 0,
        padding: '0 32px',
      }}>
        {aba === 'leads' && (
          <>
            <StatsBar stats={stats} total={total} loading={loading} />
            <div style={{ paddingBottom: 12 }}>
              <NovoLeadModal onLeadCreated={() => { buscarLeads(pagina, filtros); buscarStats() }} />
            </div>
            <LeadsTable
              leads={leads}
              loading={loading}
              selecionados={selecionados}
              total={total}
              onToggle={toggleSelecionado}
              onToggleTodos={toggleTodos}
              onSelectAllFiltered={selecionarTodosFiltrados}
              onClearSelection={() => setSelecionados([])}
              onStatusChange={mudarStatus}
              onDelete={deletarLead}
              onLeadUpdated={() => { buscarLeads(pagina, filtros); buscarStats() }}
            />
            <Pagination
              pagina={pagina}
              totalPag={totalPag}
              total={total}
              onChange={(p) => buscarLeads(p, filtros)}
            />
          </>
        )}

        {aba === 'extrator' && (
          <ScraperTab
            api={API}
            onScraperFinish={() => { buscarLeads(1, filtros); buscarStats(); }}
          />
        )}

        {aba === 'disparos' && (
          <DisparosTab
            selecionados={selecionados}
            onLimparSelecionados={() => setSelecionados([])}
            botApi={BOT_API}
            onMensagemEnviada={() => { buscarLeads(pagina, filtros); buscarStats(); }}
          />
        )}
      </main>
    </div>
  )
}
