// src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Sidebar from './components/Sidebar.jsx'
import StatsBar from './components/StatsBar.jsx'
import LeadsTable from './components/LeadsTable.jsx'
import Pagination from './components/Pagination.jsx'
import DisparosTab from './components/DisparosTab.jsx'

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar filtros={filtros} stats={stats} onChange={aplicarFiltros} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Abas */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          padding: '0 24px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)', flexShrink: 0,
        }}>
          {[
            { id: 'leads', label: '🎯 Leads' },
            { id: 'disparos', label: `📤 Disparos${selecionados.length ? ` (${selecionados.length})` : ''}` },
          ].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              padding: '13px 18px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-body)',
              color: aba === a.id ? 'var(--blue)' : 'var(--text-2)',
              borderBottom: aba === a.id ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}>
              {a.label}
            </button>
          ))}
        </div>

        {aba === 'leads' && (
          <>
            <StatsBar stats={stats} total={total} loading={loading} />
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
            />
            <Pagination
              pagina={pagina}
              totalPag={totalPag}
              total={total}
              onChange={(p) => buscarLeads(p, filtros)}
            />
          </>
        )}

        {aba === 'disparos' && (
          <DisparosTab
            selecionados={selecionados}
            onLimparSelecionados={() => setSelecionados([])}
            botApi={BOT_API}
          />
        )}

      </main>
    </div>
  )
}
