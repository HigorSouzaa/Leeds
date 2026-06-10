// src/components/Sidebar.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api'

const s = {
  sidebar: {
    width: 240, minWidth: 240, height: '100vh', background: 'var(--bg-card)',
    borderRight: '1px solid var(--border)', display: 'flex',
    flexDirection: 'column', overflow: 'hidden'
  },
  logo: {
    padding: '20px 18px 16px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: 10
  },
  logoIcon: {
    width: 32, height: 32, borderRadius: 8, background: 'var(--blue)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, boxShadow: '0 0 12px var(--blue-glow)'
  },
  logoText: { fontWeight: 700, fontSize: 15, color: 'var(--text-1)', letterSpacing: '-0.3px' },
  logoSub:  { fontSize: 11, color: 'var(--text-2)', marginTop: 1 },
  scroll:   { flex: 1, overflowY: 'auto', padding: '14px 12px' },
  section:  { marginBottom: 20 },
  label: {
    fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 4
  },
  input: {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '7px 10px', color: 'var(--text-1)',
    fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)', transition: 'border-color 0.15s'
  },
  select: {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '7px 10px', color: 'var(--text-1)',
    fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer', appearance: 'none'
  },
  btnLimpar: {
    width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-2)', fontSize: 12,
    cursor: 'pointer', marginTop: 4, transition: 'all 0.15s', fontFamily: 'var(--font-body)'
  },
  divider: { height: 1, background: 'var(--border)', margin: '4px 0 16px' }
}

const STATUS_OPTS = [
  { value: '', label: 'Todos status' },
  { value: 'novo', label: '🟦 Novo' },
  { value: 'contatado', label: '🟨 Contatado' },
  { value: 'qualificado', label: '🟩 Qualificado' },
  { value: 'descartado', label: '🟥 Descartado' },
]

export default function Sidebar({ filtros, stats, onChange }) {
  const [categorias, setCategorias] = useState([])
  const [cidades, setCidades]       = useState([])
  const [local, setLocal]           = useState(filtros)

  useEffect(() => {
    axios.get(`${API}/leads/categorias`).then(r => setCategorias(r.data)).catch(() => {})
    axios.get(`${API}/leads/cidades`).then(r => setCidades(r.data)).catch(() => {})
  }, [])

  const update = (campo, valor) => {
    const novo = { ...local, [campo]: valor }
    setLocal(novo)
    onChange(novo)
  }

  const limpar = () => {
    const vazio = { busca: '', categoria: '', cidade: '', status: '', tem_telefone: '', tem_site: '' }
    setLocal(vazio)
    onChange(vazio)
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoIcon}>🎯</div>
        <div>
          <div style={s.logoText}>LeadHunter</div>
          <div style={s.logoSub}>Painel de leads</div>
        </div>
      </div>

      <div style={s.scroll}>
        <div style={s.section}>
          <div style={s.label}>Busca</div>
          <input style={s.input} placeholder="Nome ou telefone..." value={local.busca} onChange={e => update('busca', e.target.value)} />
        </div>
        <div style={s.section}>
          <div style={s.label}>Categoria</div>
          <select style={s.select} value={local.categoria} onChange={e => update('categoria', e.target.value)}>
            <option value="">Todas</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={s.section}>
          <div style={s.label}>Cidade</div>
          <select style={s.select} value={local.cidade} onChange={e => update('cidade', e.target.value)}>
            <option value="">Todas</option>
            {cidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={s.section}>
          <div style={s.label}>Status</div>
          <select style={s.select} value={local.status} onChange={e => update('status', e.target.value)}>
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={s.divider} />
        <div style={s.section}>
          <div style={s.label}>Telefone</div>
          <select style={s.select} value={local.tem_telefone} onChange={e => update('tem_telefone', e.target.value)}>
            <option value="">Todos</option>
            <option value="sim">✅ Com telefone</option>
            <option value="nao">❌ Sem telefone</option>
          </select>
        </div>
        <div style={s.section}>
          <div style={s.label}>Site</div>
          <select style={s.select} value={local.tem_site} onChange={e => update('tem_site', e.target.value)}>
            <option value="">Todos</option>
            <option value="sim">✅ Com site</option>
            <option value="nao">❌ Sem site</option>
          </select>
        </div>
        <button style={s.btnLimpar} onClick={limpar}>✕ Limpar filtros</button>

        {stats?.por_categoria?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={s.label}>Top categorias</div>
            {stats.por_categoria.slice(0, 6).map(c => (
              <div key={c.nome} onClick={() => update('categoria', c.nome)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 8px', borderRadius: 5, cursor: 'pointer', marginBottom: 2,
                  background: local.categoria === c.nome ? 'var(--bg-hover)' : 'transparent'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = local.categoria === c.nome ? 'var(--bg-hover)' : 'transparent'}
              >
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.nome}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{c.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
