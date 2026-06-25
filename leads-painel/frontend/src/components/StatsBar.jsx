// src/components/StatsBar.jsx
import { BarChart3, Phone, Globe, Target } from 'lucide-react'

const cards = [
  {
    key: 'total', label: 'Total de Leads', icon: BarChart3,
    getValue: (s) => s?.total ?? 0,
    getSub: () => 'no banco de dados',
    color: 'var(--accent)',
  },
  {
    key: 'telefone', label: 'Com Telefone', icon: Phone,
    getValue: (s) => s?.com_telefone ?? 0,
    getSub: (s) => `${s?.total ? Math.round((s.com_telefone / s.total) * 100) : 0}% do total`,
    color: 'var(--green)',
  },
  {
    key: 'site', label: 'Com Site', icon: Globe,
    getValue: (s) => s?.com_site ?? 0,
    getSub: (s) => `${s?.total ? Math.round((s.com_site / s.total) * 100) : 0}% do total`,
    color: 'var(--purple)',
  },
  {
    key: 'filtrados', label: 'Filtrados', icon: Target,
    getValue: (_, total) => total ?? 0,
    getSub: () => 'resultado atual',
    color: 'var(--amber)',
  },
]

export default function StatsBar({ stats, total, loading }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12, padding: '20px 0 16px',
    }}>
      {cards.map((card) => {
        const Icon = card.icon
        const value = card.getValue(stats, total)
        return (
          <div key={card.key} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 18px',
            transition: 'border-color 0.15s ease',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {card.label}
              </span>
              <Icon size={16} style={{ color: card.color, opacity: 0.7 }} />
            </div>
            <div style={{
              fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: 'var(--text-1)', letterSpacing: '-1px', lineHeight: 1,
            }}>
              {loading ? '—' : (typeof value === 'number' ? value.toLocaleString('pt-BR') : value)}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, display: 'block' }}>
              {card.getSub(stats)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
