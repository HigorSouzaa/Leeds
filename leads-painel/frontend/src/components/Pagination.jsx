// src/components/Pagination.jsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ pagina, totalPag, total, onChange }) {
  const inicio = Math.max(1, pagina - 2)
  const fim    = Math.min(totalPag, pagina + 2)
  const pages  = []
  for (let i = inicio; i <= fim; i++) pages.push(i)

  const btnStyle = (ativo, desativado) => ({
    padding: '5px 10px', borderRadius: 'var(--radius-sm)',
    fontSize: 12, fontWeight: ativo ? 600 : 400,
    cursor: desativado ? 'not-allowed' : 'pointer',
    border: ativo ? 'none' : '1px solid var(--border)',
    background: ativo ? 'var(--accent)' : 'transparent',
    color: ativo ? '#fff' : desativado ? 'var(--text-3)' : 'var(--text-2)',
    fontFamily: 'var(--font-mono)', transition: 'all 0.15s ease',
    opacity: desativado ? 0.35 : 1,
    minWidth: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderTop: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{total?.toLocaleString('pt-BR')}</span>
        {' '}leads · pág {pagina} de {totalPag}
      </span>

      <div style={{ display: 'flex', gap: 3 }}>
        <button style={btnStyle(false, pagina === 1)} disabled={pagina === 1} onClick={() => onChange(pagina - 1)}
          onMouseEnter={e => { if (pagina > 1) e.currentTarget.style.background = 'var(--bg-elevated)' }}
          onMouseLeave={e => { if (pagina > 1) e.currentTarget.style.background = 'transparent' }}
        ><ChevronLeft size={14} /></button>

        {inicio > 1 && (
          <>
            <button style={btnStyle(false, false)} onClick={() => onChange(1)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >1</button>
            {inicio > 2 && <span style={{ padding: '5px 3px', color: 'var(--text-3)', fontSize: 12 }}>…</span>}
          </>
        )}

        {pages.map(p => (
          <button key={p} style={btnStyle(p === pagina, false)} onClick={() => onChange(p)}
            onMouseEnter={e => { if (p !== pagina) e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { if (p !== pagina) e.currentTarget.style.background = 'transparent' }}
          >{p}</button>
        ))}

        {fim < totalPag && (
          <>
            {fim < totalPag - 1 && <span style={{ padding: '5px 3px', color: 'var(--text-3)', fontSize: 12 }}>…</span>}
            <button style={btnStyle(false, false)} onClick={() => onChange(totalPag)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{totalPag}</button>
          </>
        )}

        <button style={btnStyle(false, pagina === totalPag)} disabled={pagina === totalPag} onClick={() => onChange(pagina + 1)}
          onMouseEnter={e => { if (pagina < totalPag) e.currentTarget.style.background = 'var(--bg-elevated)' }}
          onMouseLeave={e => { if (pagina < totalPag) e.currentTarget.style.background = 'transparent' }}
        ><ChevronRight size={14} /></button>
      </div>
    </div>
  )
}
