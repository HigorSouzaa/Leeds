// src/components/Pagination.jsx
const s = {
  wrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px', borderTop: '1px solid var(--border)',
    background: 'var(--bg-card)', flexShrink: 0,
  },
  info: { fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' },
  btns: { display: 'flex', gap: 4 },
  btn: (ativo, desativado) => ({
    padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    cursor: desativado ? 'not-allowed' : 'pointer',
    border: ativo ? 'none' : '1px solid var(--border)',
    background: ativo ? 'var(--blue)' : 'transparent',
    color: ativo ? '#fff' : desativado ? 'var(--text-3)' : 'var(--text-2)',
    fontFamily: 'var(--font-mono)', transition: 'all 0.15s',
    opacity: desativado ? 0.4 : 1,
  }),
}

export default function Pagination({ pagina, totalPag, total, onChange }) {
  const inicio = Math.max(1, pagina - 2)
  const fim    = Math.min(totalPag, pagina + 2)
  const pages  = []
  for (let i = inicio; i <= fim; i++) pages.push(i)

  return (
    <div style={s.wrap}>
      <span style={s.info}>
        {total?.toLocaleString('pt-BR')} leads · página {pagina} de {totalPag}
      </span>
      <div style={s.btns}>
        <button style={s.btn(false, pagina === 1)} disabled={pagina === 1} onClick={() => onChange(pagina - 1)}>‹</button>
        {inicio > 1 && (
          <>
            <button style={s.btn(false, false)} onClick={() => onChange(1)}>1</button>
            {inicio > 2 && <span style={{ padding: '5px 4px', color: 'var(--text-3)', fontSize: 12 }}>…</span>}
          </>
        )}
        {pages.map(p => (
          <button key={p} style={s.btn(p === pagina, false)} onClick={() => onChange(p)}>{p}</button>
        ))}
        {fim < totalPag && (
          <>
            {fim < totalPag - 1 && <span style={{ padding: '5px 4px', color: 'var(--text-3)', fontSize: 12 }}>…</span>}
            <button style={s.btn(false, false)} onClick={() => onChange(totalPag)}>{totalPag}</button>
          </>
        )}
        <button style={s.btn(false, pagina === totalPag)} disabled={pagina === totalPag} onClick={() => onChange(pagina + 1)}>›</button>
      </div>
    </div>
  )
}
