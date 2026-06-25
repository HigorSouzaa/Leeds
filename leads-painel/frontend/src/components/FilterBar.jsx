// src/components/FilterBar.jsx
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { FolderOpen, MapPin, Zap, Phone, Globe, X, ChevronDown, Check } from 'lucide-react'

const API = '/api'

const STATUS_OPTS = [
  { value: 'novo', label: 'Novo', color: 'var(--accent)' },
  { value: 'contatado', label: 'Contatado', color: 'var(--amber)' },
  { value: 'qualificado', label: 'Qualificado', color: 'var(--green)' },
  { value: 'descartado', label: 'Descartado', color: 'var(--red)' },
]

function Popover({ open, onClose, anchorRef, children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose, anchorRef])

  if (!open) return null
  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
      background: 'var(--bg-card)', border: '1px solid var(--border-hover)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden', minWidth: 200,
      boxShadow: 'var(--shadow-lg)',
      animation: 'slideDown 0.15s ease',
    }}>
      {children}
    </div>
  )
}

function FilterChip({ label, icon: Icon, active, activeLabel, onClear, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: active ? '5px 6px 5px 10px' : '5px 10px',
          borderRadius: 'var(--radius-full)',
          border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
          background: active ? 'var(--accent-soft)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-2)',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
            e.currentTarget.style.color = 'var(--text-1)'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-2)'
          }
        }}
      >
        <Icon size={13} />
        {active ? activeLabel : label}
        {active ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false) }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: '50%',
              background: 'rgba(108,138,255,0.18)', cursor: 'pointer', marginLeft: 1,
            }}
          ><X size={10} /></span>
        ) : (
          <ChevronDown size={11} style={{ opacity: 0.5 }} />
        )}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref}>
        {typeof children === 'function' ? children(() => setOpen(false)) : children}
      </Popover>
    </div>
  )
}

function ToggleChip({ label, icon: Icon, value, onClick }) {
  const isSim = value === 'sim'
  const isNao = value === 'nao'
  const isActive = isSim || isNao

  let bg = 'transparent'
  let border = 'var(--border)'
  let color = 'var(--text-2)'

  if (isSim) {
    bg = 'var(--green-soft)'
    border = 'rgba(74,222,128,0.25)'
    color = 'var(--green)'
  } else if (isNao) {
    bg = 'var(--red-soft)'
    border = 'rgba(248,113,113,0.25)'
    color = 'var(--red)'
  }

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${border}`,
        background: bg,
        color: color,
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'var(--border-hover)'
          e.currentTarget.style.color = 'var(--text-1)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-2)'
        }
      }}
    >
      <Icon size={13} />
      {label}
      {isSim && <Check size={12} />}
      {isNao && <X size={12} />}
    </button>
  )
}

function PopoverOption({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '8px 14px', border: 'none',
        background: active ? 'var(--bg-hover)' : 'transparent',
        color: color || 'var(--text-1)', fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        textAlign: 'left', transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = active ? 'var(--bg-hover)' : 'transparent'}
    >
      {active && <Check size={12} style={{ color: 'var(--accent)' }} />}
      {label}
    </button>
  )
}

export default function FilterBar({ filtros, onChange }) {
  const [categorias, setCategorias] = useState([])
  const [cidades, setCidades] = useState([])
  const [searchCat, setSearchCat] = useState('')
  const [searchCity, setSearchCity] = useState('')

  useEffect(() => {
    axios.get(`${API}/leads/categorias`).then(r => setCategorias(r.data)).catch(() => {})
    axios.get(`${API}/leads/cidades`).then(r => setCidades(r.data)).catch(() => {})
  }, [])

  const update = (campo, valor) => {
    onChange({ ...filtros, [campo]: valor })
  }

  const limpar = () => {
    onChange({ busca: '', categoria: '', cidade: '', status: '', tem_telefone: '', tem_site: '' })
  }

  const hasFilters = filtros.categoria || filtros.cidade || filtros.status || filtros.tem_telefone || filtros.tem_site

  const filteredCats = searchCat ? categorias.filter(c => c.toLowerCase().includes(searchCat.toLowerCase())) : categorias
  const filteredCities = searchCity ? cidades.filter(c => c.toLowerCase().includes(searchCity.toLowerCase())) : cidades

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <FilterChip
        label="Categoria" icon={FolderOpen}
        active={!!filtros.categoria} activeLabel={filtros.categoria}
        onClear={() => update('categoria', '')}
      >
        {(close) => (
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <input placeholder="Buscar..." value={searchCat} onChange={e => setSearchCat(e.target.value)} autoFocus
                style={{
                  width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: 'var(--text-1)',
                  fontSize: 12, outline: 'none', fontFamily: 'var(--font-body)',
                }} />
            </div>
            <PopoverOption label="Todas" active={!filtros.categoria} onClick={() => { update('categoria', ''); close() }} />
            {filteredCats.map(c => (
              <PopoverOption key={c} label={c} active={filtros.categoria === c} onClick={() => { update('categoria', c); close() }} />
            ))}
          </div>
        )}
      </FilterChip>

      <FilterChip
        label="Cidade" icon={MapPin}
        active={!!filtros.cidade}
        activeLabel={(() => {
          const arr = filtros.cidade ? filtros.cidade.split('|') : []
          if (arr.length === 0) return ''
          if (arr.length === 1) return arr[0]
          return `${arr.length} Cidades`
        })()}
        onClear={() => update('cidade', '')}
      >
        {(close) => {
          const selectedCities = filtros.cidade ? filtros.cidade.split('|') : []
          const toggleCity = (c) => {
            let newCities = [...selectedCities]
            if (newCities.includes(c)) newCities = newCities.filter(x => x !== c)
            else newCities.push(c)
            update('cidade', newCities.join('|'))
          }
          return (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                <input placeholder="Buscar..." value={searchCity} onChange={e => setSearchCity(e.target.value)} autoFocus
                  style={{
                    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: 'var(--text-1)',
                    fontSize: 12, outline: 'none', fontFamily: 'var(--font-body)',
                  }} />
              </div>
              <PopoverOption label="Todas" active={!filtros.cidade} onClick={() => update('cidade', '')} />
              {filteredCities.map(c => (
                <PopoverOption key={c} label={c} active={selectedCities.includes(c)} onClick={(e) => {
                  e.stopPropagation();
                  toggleCity(c);
                }} />
              ))}
            </div>
          )
        }}
      </FilterChip>

      <FilterChip
        label="Status" icon={Zap}
        active={!!filtros.status}
        activeLabel={STATUS_OPTS.find(o => o.value === filtros.status)?.label || filtros.status}
        onClear={() => update('status', '')}
      >
        {(close) => (
          <>
            <PopoverOption label="Todos" active={!filtros.status} onClick={() => { update('status', ''); close() }} />
            {STATUS_OPTS.map(o => (
              <PopoverOption key={o.value} label={o.label} color={o.color} active={filtros.status === o.value} onClick={() => { update('status', o.value); close() }} />
            ))}
          </>
        )}
      </FilterChip>

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

      <ToggleChip label="Telefone" icon={Phone} value={filtros.tem_telefone}
        onClick={() => {
          const next = filtros.tem_telefone === '' ? 'sim' : filtros.tem_telefone === 'sim' ? 'nao' : ''
          update('tem_telefone', next)
        }} />

      <ToggleChip label="Site" icon={Globe} value={filtros.tem_site}
        onClick={() => {
          const next = filtros.tem_site === '' ? 'sim' : filtros.tem_site === 'sim' ? 'nao' : ''
          update('tem_site', next)
        }} />

      {hasFilters && (
        <button onClick={limpar} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(248,113,113,0.2)',
          background: 'var(--red-soft)', color: 'var(--red)',
          fontSize: 11, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          transition: 'all 0.15s ease',
        }}>
          <X size={11} /> Limpar
        </button>
      )}
    </div>
  )
}
