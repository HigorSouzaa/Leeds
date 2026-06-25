// src/components/NovoLeadModal.jsx
import { useState } from 'react'
import { Plus, X, User, Phone, Globe, MapPin, FolderOpen } from 'lucide-react'
import axios from 'axios'

export default function NovoLeadModal({ onLeadCreated }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    site: '',
    categoria: '',
    cidade: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return alert('O nome é obrigatório.')

    setLoading(true)
    try {
      await axios.post('/api/leads', form)
      setOpen(false)
      setForm({ nome: '', telefone: '', site: '', categoria: '', cidade: '' })
      onLeadCreated()
    } catch (err) {
      alert('Erro ao criar lead.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '8px 10px 8px 32px', color: 'var(--text-1)',
    fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
    transition: 'border-color 0.15s',
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', background: 'var(--bg-card)',
        color: 'var(--text-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)',
        transition: 'all 0.15s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-1)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
      >
        <Plus size={14} /> Novo Lead
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 24, width: '100%',
            maxWidth: 420, boxShadow: 'var(--shadow-lg)',
            animation: 'slideDown 0.15s ease', position: 'relative'
          }}>
            <button onClick={() => setOpen(false)} style={{
              position: 'absolute', top: 16, right: 16, background: 'none',
              border: 'none', color: 'var(--text-3)', cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            ><X size={18} /></button>

            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 20 }}>Adicionar Lead</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input name="nome" placeholder="Nome da empresa ou lead *" value={form.nome} onChange={handleChange} style={inputStyle} autoFocus />
              </div>
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input name="telefone" placeholder="Telefone (ex: 11999999999)" value={form.telefone} onChange={handleChange} style={inputStyle} />
              </div>
              <div style={{ position: 'relative' }}>
                <Globe size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input name="site" placeholder="Website" value={form.site} onChange={handleChange} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ position: 'relative' }}>
                  <FolderOpen size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                  <input name="categoria" placeholder="Categoria" value={form.categoria} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                  <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
                }}>Cancelar</button>
                <button type="submit" disabled={loading} style={{
                  padding: '8px 16px', background: 'var(--accent)', border: 'none',
                  color: '#fff', borderRadius: 'var(--radius-sm)', cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', opacity: loading ? 0.7 : 1
                }}>
                  {loading ? 'Salvando...' : 'Salvar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
