// src/components/StatsBar.jsx
const s = {
  bar: {
    padding: '14px 24px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--bg-card)', flexWrap: 'wrap', flexShrink: 0,
  },
  card: {
    display: 'flex', flexDirection: 'column', padding: '8px 16px',
    borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-base)', minWidth: 110,
  },
  cardLabel: { fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 },
  cardValue: { fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-1)', letterSpacing: '-1px' },
  cardSub:   { fontSize: 11, color: 'var(--text-2)', marginTop: 1 },
  title:     { fontSize: 18, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px', marginRight: 'auto' },
  dot:       { width: 7, height: 7, borderRadius: '50%', display: 'inline-block', marginRight: 5 },
  pulse:     {
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
    color: 'var(--green)', fontWeight: 500, padding: '4px 10px', borderRadius: 99,
    border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.06)',
  }
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={s.card}>
      <span style={s.cardLabel}>{label}</span>
      <span style={{ ...s.cardValue, color: color || 'var(--text-1)' }}>{value ?? '—'}</span>
      {sub && <span style={s.cardSub}>{sub}</span>}
    </div>
  )
}

export default function StatsBar({ stats, total, loading }) {
  const pct = (n, d) => d ? Math.round((n / d) * 100) : 0
  return (
    <div style={s.bar}>
      <span style={s.title}>Leads</span>
      <StatCard label="Total" value={stats?.total?.toLocaleString('pt-BR') ?? 0} sub="no banco" />
      <StatCard label="Com telefone" value={stats?.com_telefone ?? 0} sub={`${pct(stats?.com_telefone, stats?.total)}% do total`} color="var(--green)" />
      <StatCard label="Com site" value={stats?.com_site ?? 0} sub={`${pct(stats?.com_site, stats?.total)}% do total`} color="var(--blue)" />
      <StatCard label="Filtrados" value={total?.toLocaleString('pt-BR') ?? 0} sub="resultado atual" color="var(--amber)" />
      <div style={{ marginLeft: 'auto' }}>
        {loading
          ? <span style={{ ...s.pulse, color: 'var(--amber)', borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.06)' }}>
              <span style={{ ...s.dot, background: 'var(--amber)' }} />Carregando...
            </span>
          : <span style={s.pulse}><span style={{ ...s.dot, background: 'var(--green)' }} />Atualizado</span>
        }
      </div>
    </div>
  )
}
