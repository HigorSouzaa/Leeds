// src/components/LeadsTable.jsx
import { useState } from 'react'
import { Trash2, Check, ChevronDown, Search, Loader2 } from 'lucide-react'

const STATUS_CONFIG = {
  novo:        { label: 'Novo',        color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'var(--accent-border)' },
  contatado:   { label: 'Contatado',   color: 'var(--amber)',  bg: 'var(--amber-soft)',  border: 'rgba(250,204,21,0.2)' },
  qualificado: { label: 'Qualificado', color: 'var(--green)',  bg: 'var(--green-soft)',  border: 'rgba(74,222,128,0.2)' },
  descartado:  { label: 'Descartado',  color: 'var(--red)',    bg: 'var(--red-soft)',    border: 'rgba(248,113,113,0.2)' },
}
const STATUS_OPCOES = ['novo', 'contatado', 'qualificado', 'descartado']

function StatusDropdown({ lead, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG['novo']
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 8px', borderRadius: 'var(--radius-full)',
        fontSize: 11, fontWeight: 600,
        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        transition: 'all 0.15s ease', whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
        {cfg.label}
        <ChevronDown size={10} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border-hover)',
            borderRadius: 'var(--radius-md)', overflow: 'hidden', minWidth: 140,
            boxShadow: 'var(--shadow-lg)', animation: 'slideDown 0.12s ease',
          }}>
            {STATUS_OPCOES.map(st => {
              const c = STATUS_CONFIG[st]
              return (
                <button key={st}
                  onClick={() => { onStatusChange(lead.id, st); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    color: c.color, background: lead.status === st ? 'var(--bg-hover)' : 'transparent',
                    border: 'none', width: '100%', textAlign: 'left',
                    fontFamily: 'var(--font-body)', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = lead.status === st ? 'var(--bg-hover)' : 'transparent'}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} />
                  {c.label}
                  {lead.status === st && <Check size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                </button>
              )
            })}
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

const thStyle = {
  padding: '10px 12px', textAlign: 'left',
  fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--border)',
  position: 'sticky', top: 0, background: 'var(--bg-base)', zIndex: 1,
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '11px 12px', borderBottom: '1px solid var(--border)',
  fontSize: 13, color: 'var(--text-1)', verticalAlign: 'middle',
}

import EditLeadModal from './EditLeadModal.jsx'

export default function LeadsTable({ leads, loading, selecionados, total, onToggle, onToggleTodos, onSelectAllFiltered, onClearSelection, onStatusChange, onDelete, onLeadUpdated }) {
  const comTelefone = leads.filter(l => l.telefone)
  const todosSelecionados = comTelefone.length > 0 && comTelefone.every(l => selecionados.find(s => s.id === l.id))

  if (loading && leads.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={28} style={{ color: 'var(--text-3)', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Carregando leads...</div>
        </div>
      </div>
    )
  }

  if (!loading && leads.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Search size={32} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <div style={{ fontSize: 15, color: 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}>Nenhum lead encontrado</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Ajuste os filtros ou rode o bot para coletar novos leads</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>

      {/* Selection bar */}
      {selecionados.length > 0 && (
        <div style={{
          margin: '12px 0 0', padding: '8px 14px', borderRadius: 'var(--radius-md)',
          background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <span style={{
            minWidth: 24, height: 24, borderRadius: 'var(--radius-full)',
            background: 'var(--accent)', color: '#fff', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
            padding: '0 6px',
          }}>{selecionados.length}</span>
          <span style={{ color: 'var(--text-2)', fontSize: 12 }}>
            selecionado{selecionados.length > 1 ? 's' : ''} — vá para Disparos
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={onClearSelection} style={{
              padding: '5px 12px', background: 'transparent',
              color: 'var(--text-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >Limpar</button>
            <button onClick={onSelectAllFiltered} style={{
              padding: '5px 12px', background: 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
            }}>Selecionar todos ({total})</button>
          </div>
        </div>
      )}

      {selecionados.length === 0 && total > 0 && (
        <div style={{ margin: '12px 0 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onSelectAllFiltered} style={{
            padding: '6px 14px', background: 'var(--bg-elevated)',
            color: 'var(--text-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            <Check size={13} /> Selecionar todos ({total})
          </button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 40 }}>
              <input type="checkbox" checked={todosSelecionados} onChange={onToggleTodos} />
            </th>
            <th style={thStyle}>Nome</th>
            <th style={thStyle}>Telefone</th>
            <th style={thStyle}>Site</th>
            <th style={thStyle}>Categoria</th>
            <th style={thStyle}>Cidade</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Data</th>
            <th style={{ ...thStyle, width: 44 }}></th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => {
            const selecionado = !!selecionados.find(s => s.id === lead.id)
            return (
              <tr key={lead.id}
                style={{
                  transition: 'background 0.1s ease',
                  background: selecionado ? 'var(--accent-soft)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (!selecionado) e.currentTarget.style.background = 'var(--bg-elevated)'
                  const actions = e.currentTarget.querySelector('.row-actions')
                  if (actions) actions.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  if (!selecionado) e.currentTarget.style.background = 'transparent'
                  const actions = e.currentTarget.querySelector('.row-actions')
                  if (actions) actions.style.opacity = '0'
                }}
              >
                <td style={{ ...tdStyle, width: 40 }}>
                  {lead.telefone
                    ? <input type="checkbox" checked={selecionado} onChange={() => onToggle(lead)} />
                    : <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
                  }
                </td>
                <td style={{ ...tdStyle, fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.nome || '—'}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {lead.telefone
                    ? <span style={{ color: 'var(--green)' }}>{lead.telefone}</span>
                    : <span style={{ color: 'var(--text-3)' }}>—</span>
                  }
                </td>
                <td style={tdStyle}>
                  {lead.site
                    ? <a href={lead.site} target="_blank" rel="noopener noreferrer" style={{
                        color: 'var(--accent)', textDecoration: 'none', fontSize: 12,
                        fontFamily: 'var(--font-mono)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 150, display: 'inline-block',
                      }} title={lead.site}>
                        {lead.site.replace(/^https?:\/\/(www\.)?/, '').slice(0, 25)}
                      </a>
                    : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                  }
                </td>
                <td style={tdStyle}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-elevated)', color: 'var(--text-2)',
                    border: '1px solid var(--border)', whiteSpace: 'nowrap',
                  }}>{lead.categoria || '—'}</span>
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-2)', fontSize: 12 }}>{lead.cidade || '—'}</td>
                <td style={tdStyle}><StatusDropdown lead={lead} onStatusChange={onStatusChange} /></td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{formatarData(lead.criado_em)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', width: 60 }}>
                  <div className="row-actions" style={{ opacity: 0, transition: 'opacity 0.15s', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <EditLeadModal lead={lead} onLeadUpdated={onLeadUpdated} />
                    <button onClick={() => onDelete(lead.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px 6px', borderRadius: 'var(--radius-sm)',
                      color: 'var(--red)', transition: 'background 0.1s',
                      display: 'inline-flex',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--red-soft)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      title="Excluir lead"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
