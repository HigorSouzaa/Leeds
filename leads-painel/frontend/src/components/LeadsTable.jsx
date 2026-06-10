// src/components/LeadsTable.jsx
import { useState } from 'react'

const STATUS_CONFIG = {
  novo:        { label: 'Novo',        color: 'var(--blue)',   bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)'  },
  contatado:   { label: 'Contatado',   color: 'var(--amber)',  bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
  qualificado: { label: 'Qualificado', color: 'var(--green)',  bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)'   },
  descartado:  { label: 'Descartado',  color: 'var(--red)',    bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
}
const STATUS_OPCOES = ['novo', 'contatado', 'qualificado', 'descartado']

const s = {
  wrap:   { flex: 1, overflow: 'auto', padding: '0 24px' },
  table:  { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
  th: {
    padding: '8px 12px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, background: 'var(--bg-base)', zIndex: 1,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 12px', borderBottom: '1px solid var(--border)',
    fontSize: 13, color: 'var(--text-1)', verticalAlign: 'middle',
  },
  mono:  { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' },
  link:  {
    color: 'var(--blue)', textDecoration: 'none', fontSize: 12,
    fontFamily: 'var(--font-mono)', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    maxWidth: 160, display: 'inline-block',
  },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px 6px', borderRadius: 5, fontSize: 14,
    transition: 'background 0.15s',
  },
  checkbox: {
    width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--blue)',
  },
  empty: { padding: '60px 0', textAlign: 'center', color: 'var(--text-3)' },
}

function StatusDropdown({ lead, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG['novo']
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 500,
          color: cfg.color, background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        }}
        onClick={() => setOpen(o => !o)}
      >
        {cfg.label} ▾
      </span>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, overflow: 'hidden', minWidth: 140,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {STATUS_OPCOES.map(st => (
              <button key={st}
                onClick={() => { onStatusChange(lead.id, st); setOpen(false) }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{
                  padding: '8px 14px', cursor: 'pointer', fontSize: 12,
                  color: STATUS_CONFIG[st].color, background: 'transparent',
                  border: 'none', width: '100%', textAlign: 'left',
                  fontFamily: 'var(--font-body)', transition: 'background 0.1s',
                }}>
                {STATUS_CONFIG[st].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function LeadsTable({ leads, loading, selecionados, total, onToggle, onToggleTodos, onSelectAllFiltered, onClearSelection, onStatusChange, onDelete }) {
  const comTelefone = leads.filter(l => l.telefone)
  const todosSelecionados = comTelefone.length > 0 && comTelefone.every(l => selecionados.find(s => s.id === l.id))

  if (loading && leads.length === 0) {
    return (
      <div style={{ ...s.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={s.empty}><div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div><div>Carregando leads...</div></div>
      </div>
    )
  }

  if (!loading && leads.length === 0) {
    return (
      <div style={{ ...s.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={s.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 6 }}>Nenhum lead encontrado</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Ajuste os filtros ou rode o bot para coletar leads</div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      {selecionados.length > 0 && (
        <div style={{
          margin: '12px 0 0', padding: '10px 14px', borderRadius: 8,
          background: 'var(--blue-glow)', border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap'
        }}>
          <span style={{ color: 'var(--blue)', fontWeight: 600 }}>
            ✅ {selecionados.length} lead{selecionados.length > 1 ? 's' : ''} selecionado{selecionados.length > 1 ? 's' : ''}
          </span>
          <span style={{ color: 'var(--text-2)' }}>— vá para a aba 📤 Disparos</span>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button 
              style={{ padding: '6px 12px', background: 'transparent', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              onClick={onClearSelection}
            >
              Limpar seleção
            </button>
            <button 
              style={{ padding: '6px 12px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              onClick={onSelectAllFiltered}
            >
              Selecionar todos {total} filtrados
            </button>
          </div>
        </div>
      )}

      {selecionados.length === 0 && total > 0 && (
        <div style={{ margin: '12px 0 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            style={{ padding: '6px 12px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            onClick={onSelectAllFiltered}
          >
            Selecionar todos os {total} leads filtrados
          </button>
        </div>
      )}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={{ ...s.th, width: 36 }}>
              <input type="checkbox" style={s.checkbox} checked={todosSelecionados} onChange={onToggleTodos} title="Selecionar todos com telefone" />
            </th>
            <th style={s.th}>Nome</th>
            <th style={s.th}>Telefone</th>
            <th style={s.th}>Site</th>
            <th style={s.th}>Categoria</th>
            <th style={s.th}>Cidade</th>
            <th style={s.th}>Status</th>
            <th style={s.th}>Data</th>
            <th style={s.th}></th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => {
            const selecionado = !!selecionados.find(s => s.id === lead.id)
            return (
              <tr key={lead.id}
                style={{ transition: 'background 0.1s', background: selecionado ? 'rgba(59,130,246,0.05)' : 'transparent' }}
                onMouseEnter={e => { if (!selecionado) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!selecionado) e.currentTarget.style.background = 'transparent' }}
              >
                <td style={{ ...s.td, width: 36 }}>
                  {lead.telefone ? (
                    <input type="checkbox" style={s.checkbox} checked={selecionado} onChange={() => onToggle(lead)} />
                  ) : (
                    <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
                  )}
                </td>
                <td style={{ ...s.td, fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.nome || '—'}
                </td>
                <td style={{ ...s.td, ...s.mono }}>
                  {lead.telefone
                    ? <span style={{ color: 'var(--green)' }}>{lead.telefone}</span>
                    : <span style={{ color: 'var(--text-3)' }}>—</span>}
                </td>
                <td style={s.td}>
                  {lead.site
                    ? <a href={lead.site} target="_blank" rel="noopener noreferrer" style={s.link} title={lead.site}>
                        {lead.site.replace(/^https?:\/\/(www\.)?/, '').slice(0, 25)}…
                      </a>
                    : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}
                </td>
                <td style={s.td}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    {lead.categoria || '—'}
                  </span>
                </td>
                <td style={{ ...s.td, color: 'var(--text-2)', fontSize: 12 }}>{lead.cidade || '—'}</td>
                <td style={s.td}><StatusDropdown lead={lead} onStatusChange={onStatusChange} /></td>
                <td style={{ ...s.td, ...s.mono, fontSize: 11, color: 'var(--text-3)' }}>{formatarData(lead.criado_em)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  <button style={{ ...s.iconBtn, color: 'var(--red)' }}
                    onClick={() => onDelete(lead.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    🗑
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
