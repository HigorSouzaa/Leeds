// src/components/ClientesTab.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Users, Plus, Search, Building2, Phone, Mail, Globe, Server,
  FileText, CheckCircle, Clock, XCircle, Pencil, Trash2,
  Upload, Download, ExternalLink, Copy, Eye, EyeOff,
  DollarSign, Calendar, StickyNote, ChevronDown, ChevronUp, X
} from 'lucide-react'

const API = 'http://localhost:8000'

const STATUS_MAP = {
  ativo:       { label: 'Ativo',          cor: '#4ade80', bg: 'rgba(74,222,128,0.1)', icon: CheckCircle },
  implantacao: { label: 'Em implantação', cor: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  icon: Clock },
  inativo:     { label: 'Inativo',        cor: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: XCircle },
}

const inputStyle = {
  width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', padding: '8px 11px', color: 'var(--text-1)',
  fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}
const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: 80 }

function Label({ children }) {
  return <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'block' }}>{children}</label>
}

function Btn({ cor = 'ghost', onClick, children, icon: Icon, disabled, size = 'md' }) {
  const styles = {
    blue:  { background: 'var(--accent)', color: '#fff', border: 'none' },
    green: { background: 'var(--green)', color: '#fff', border: 'none' },
    red:   { background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' },
    ghost: { background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' },
    amber: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' },
  }
  const s = styles[cor] || styles.ghost
  const pad = size === 'sm' ? '5px 10px' : '8px 14px'
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: pad, borderRadius: 'var(--radius-sm)', fontWeight: 600,
      fontSize: 12, fontFamily: 'var(--font-body)', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1, ...s, display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {Icon && <Icon size={12} />}{children}
    </button>
  )
}

function StatusTag({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.inativo
  const Icon = s.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
      borderRadius: 99, fontSize: 11, fontWeight: 600, color: s.cor, background: s.bg,
    }}>
      <Icon size={10} />{s.label}
    </span>
  )
}

// ─── Modal Cadastrar / Editar Cliente ────────────────────────────
function ModalCliente({ inicial, onSalvar, onFechar, leadOrigem }) {
  const vazio = {
    nome: '', empresa: '', telefone: '', email: '', cidade: '',
    data_assinatura: '', valor_contrato: '', tipo_servico: '', data_renovacao: '',
    ip_servidor: '', link_painel: '', plano: '', senha_inicial: '', obs_tecnicas: '',
    status_cliente: 'ativo', lead_id: leadOrigem?.id || '',
  }
  const [form, setForm] = useState(inicial ? { ...vazio, ...inicial } : { ...vazio, nome: leadOrigem?.nome || '', telefone: leadOrigem?.telefone || '', cidade: leadOrigem?.cidade || '' })
  const [salvando, setSalvando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  function set(campo, val) { setForm(prev => ({ ...prev, [campo]: val })) }

  async function salvar(e) {
    e.preventDefault()
    if (!form.nome) return alert('Nome é obrigatório!')
    setSalvando(true)
    try {
      await onSalvar(form)
      onFechar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar cliente')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)', position: 'relative',
      }}>
        <button onClick={onFechar} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={18} /></button>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>
          {inicial ? 'Editar Cliente' : 'Cadastrar Cliente'}
        </h2>

        <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Seção: Dados básicos */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
            👤 Dados do Cliente
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Nome *</Label><input style={inputStyle} value={form.nome} onChange={e => set('nome', e.target.value)} /></div>
            <div><Label>Empresa</Label><input style={inputStyle} value={form.empresa} onChange={e => set('empresa', e.target.value)} /></div>
            <div><Label>Telefone</Label><input style={inputStyle} value={form.telefone} onChange={e => set('telefone', e.target.value)} /></div>
            <div><Label>E-mail</Label><input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><Label>Cidade</Label><input style={inputStyle} value={form.cidade} onChange={e => set('cidade', e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <select style={inputStyle} value={form.status_cliente} onChange={e => set('status_cliente', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="implantacao">Em implantação</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          {/* Seção: Venda */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 4, borderBottom: '1px solid var(--border)', marginTop: 4 }}>
            💰 Dados da Venda
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Tipo de Serviço</Label><input style={inputStyle} value={form.tipo_servico} onChange={e => set('tipo_servico', e.target.value)} placeholder="Ex: Site + Painel" /></div>
            <div><Label>Plano</Label><input style={inputStyle} value={form.plano} onChange={e => set('plano', e.target.value)} placeholder="Ex: Mensal, Anual..." /></div>
            <div><Label>Valor do Contrato</Label><input style={inputStyle} value={form.valor_contrato} onChange={e => set('valor_contrato', e.target.value)} placeholder="Ex: R$ 299/mês" /></div>
            <div><Label>Data de Assinatura</Label><input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={form.data_assinatura?.split('T')[0] || ''} onChange={e => set('data_assinatura', e.target.value)} /></div>
            <div><Label>Data de Renovação</Label><input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={form.data_renovacao?.split('T')[0] || ''} onChange={e => set('data_renovacao', e.target.value)} /></div>
          </div>

          {/* Seção: Servidor/VPS */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 4, borderBottom: '1px solid var(--border)', marginTop: 4 }}>
            🖥️ Configuração do Servidor / VPS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>IP da VPS</Label><input style={inputStyle} value={form.ip_servidor} onChange={e => set('ip_servidor', e.target.value)} placeholder="Ex: 192.168.1.1" /></div>
            <div><Label>Link do Painel / Sistema</Label><input style={inputStyle} value={form.link_painel} onChange={e => set('link_painel', e.target.value)} placeholder="https://..." /></div>
            <div>
              <Label>Senha Inicial</Label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 36 }} type={mostrarSenha ? 'text' : 'password'} value={form.senha_inicial} onChange={e => set('senha_inicial', e.target.value)} />
                <button type="button" onClick={() => setMostrarSenha(p => !p)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                  {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
          <div><Label>Observações Técnicas</Label><textarea style={textareaStyle} value={form.obs_tecnicas} onChange={e => set('obs_tecnicas', e.target.value)} placeholder="Configurações especiais, credenciais extras, anotações importantes..." /></div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Btn cor="ghost" onClick={onFechar}>Cancelar</Btn>
            <Btn cor="blue" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Cliente'}</Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Card do Cliente ─────────────────────────────────────────────
function CardCliente({ cliente, onEditar, onDeletar, onUpload, api }) {
  const [expandido, setExpandido] = useState(false)
  const [nota, setNota] = useState('')
  const [adicionandoNota, setAdicionandoNota] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  function copiar(texto) {
    navigator.clipboard.writeText(texto)
  }

  async function adicionarNota() {
    if (!nota.trim()) return
    await axios.post(`${api}/clientes/${cliente.id}/nota`, { texto: nota })
    setNota('')
    setAdicionandoNota(false)
    onEditar(cliente) // refresh
  }

  const dataAssina = cliente.data_assinatura ? new Date(cliente.data_assinatura).toLocaleDateString('pt-BR') : null
  const dataRenova = cliente.data_renovacao ? new Date(cliente.data_renovacao).toLocaleDateString('pt-BR') : null

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)', overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Cabeçalho */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{(cliente.nome || 'C')[0].toUpperCase()}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cliente.nome}</div>
            {cliente.empresa && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{cliente.empresa}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <StatusTag status={cliente.status_cliente} />
          {cliente.valor_contrato && (
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'rgba(74,222,128,0.1)', padding: '3px 8px', borderRadius: 99 }}>
              {cliente.valor_contrato}
            </span>
          )}
          <button onClick={() => setExpandido(p => !p)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', padding: '4px 8px' }}>
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Info rápida */}
      <div style={{ padding: '0 18px 12px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {cliente.telefone && (
          <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Phone size={11} />{cliente.telefone}
          </span>
        )}
        {cliente.tipo_servico && (
          <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={11} />{cliente.tipo_servico}
          </span>
        )}
        {dataAssina && (
          <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} />Assinou: {dataAssina}
          </span>
        )}
        {dataRenova && (
          <span style={{ fontSize: 12, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} />Renova: {dataRenova}
          </span>
        )}
      </div>

      {/* Conteúdo expandido */}
      {expandido && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Grid de infos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {cliente.email && (
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={9} />E-MAIL</div>
                <div style={{ fontSize: 12, color: 'var(--text-1)' }}>{cliente.email}</div>
              </div>
            )}
            {cliente.plano && (
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={9} />PLANO</div>
                <div style={{ fontSize: 12, color: 'var(--text-1)' }}>{cliente.plano}</div>
              </div>
            )}
            {cliente.ip_servidor && (
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Server size={9} />IP DA VPS</div>
                <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {cliente.ip_servidor}
                  <button onClick={() => copiar(cliente.ip_servidor)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}><Copy size={10} /></button>
                </div>
              </div>
            )}
            {cliente.link_painel && (
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={9} />LINK DO SISTEMA</div>
                <a href={cliente.link_painel} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Abrir <ExternalLink size={10} />
                </a>
              </div>
            )}
            {cliente.senha_inicial && (
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={9} />SENHA INICIAL</div>
                <div style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {senhaVisivel ? cliente.senha_inicial : '••••••••'}
                  <button onClick={() => setSenhaVisivel(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>
                    {senhaVisivel ? <EyeOff size={10} /> : <Eye size={10} />}
                  </button>
                  <button onClick={() => copiar(cliente.senha_inicial)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}><Copy size={10} /></button>
                </div>
              </div>
            )}
          </div>

          {/* Obs técnicas */}
          {cliente.obs_tecnicas && (
            <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><StickyNote size={9} />OBSERVAÇÕES TÉCNICAS</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cliente.obs_tecnicas}</div>
            </div>
          )}

          {/* Notas */}
          {(cliente.notas?.length > 0 || adicionandoNota) && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>Notas</div>
              {cliente.notas?.map((n, i) => (
                <div key={i} style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 2 }}>{new Date(n.data).toLocaleString('pt-BR')}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>{n.texto}</div>
                </div>
              ))}
              {adicionandoNota && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <textarea style={{ ...textareaStyle, flex: 1, minHeight: 60 }} value={nota} onChange={e => setNota(e.target.value)} placeholder="Digite sua nota..." autoFocus />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Btn cor="blue" size="sm" onClick={adicionarNota}>Salvar</Btn>
                    <Btn cor="ghost" size="sm" onClick={() => setAdicionandoNota(false)}>Cancelar</Btn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <Btn cor="ghost" icon={Pencil} size="sm" onClick={() => onEditar(cliente)}>Editar</Btn>
            <Btn cor="ghost" icon={StickyNote} size="sm" onClick={() => setAdicionandoNota(true)}>Nota</Btn>
            {cliente.documento_nome
              ? <a href={`${api}/clientes/${cliente.id}/documento`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Btn cor="ghost" icon={Download} size="sm">Contrato</Btn>
                </a>
              : <Btn cor="ghost" icon={Upload} size="sm" onClick={() => onUpload(cliente)}>Upload Contrato</Btn>
            }
            {cliente.documento_nome && (
              <Btn cor="ghost" icon={Upload} size="sm" onClick={() => onUpload(cliente)}>Atualizar</Btn>
            )}
            <Btn cor="red" icon={Trash2} size="sm" onClick={() => onDeletar(cliente.id)}>Excluir</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────
export default function ClientesTab({ qualificados }) {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState(null)
  const [leadOrigemModal, setLeadOrigemModal] = useState(null)
  const [uploadClienteId, setUploadClienteId] = useState(null)
  const [abaSelecionada, setAbaSelecionada] = useState('clientes') // 'qualificados' | 'clientes'
  const [feedback, setFeedback] = useState(null)

  useEffect(() => { buscarClientes() }, [busca, filtroStatus])

  async function buscarClientes() {
    try {
      const r = await axios.get(`${API}/clientes`, { params: { busca: busca || undefined, status: filtroStatus || undefined } })
      setClientes(r.data)
    } catch (e) {}
  }

  function mostrarFeedback(msg, tipo = 'green') {
    setFeedback({ msg, tipo })
    setTimeout(() => setFeedback(null), 3500)
  }

  async function salvarCliente(form) {
    if (clienteEditando) {
      await axios.put(`${API}/clientes/${clienteEditando.id}`, form)
      mostrarFeedback('Cliente atualizado com sucesso!')
    } else {
      await axios.post(`${API}/clientes`, form)
      mostrarFeedback('Cliente cadastrado com sucesso!')
    }
    buscarClientes()
    setModalAberto(false)
    setClienteEditando(null)
    setLeadOrigemModal(null)
  }

  async function deletarCliente(id) {
    if (!confirm('Excluir este cliente permanentemente?')) return
    await axios.delete(`${API}/clientes/${id}`)
    mostrarFeedback('Cliente removido.', 'amber')
    buscarClientes()
  }

  function editarCliente(cliente) {
    setClienteEditando(cliente)
    setModalAberto(true)
  }

  function cadastrarDeQualificado(lead) {
    setLeadOrigemModal(lead)
    setClienteEditando(null)
    setModalAberto(true)
    setAbaSelecionada('clientes')
  }

  async function uploadDoc(clienteId, arquivo) {
    const form = new FormData()
    form.append('arquivo', arquivo)
    await axios.post(`${API}/clientes/${clienteId}/documento`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    mostrarFeedback('Contrato enviado com sucesso!')
    buscarClientes()
    setUploadClienteId(null)
  }

  const cores = { green: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'rgba(74,222,128,0.2)' }, amber: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)' }, red: { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' } }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Feedback */}
      {feedback && (
        <div style={{ position: 'fixed', top: 16, right: 24, zIndex: 999, padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, background: cores[feedback.tipo]?.bg, color: cores[feedback.tipo]?.color, border: `1px solid ${cores[feedback.tipo]?.border}`, boxShadow: 'var(--shadow-lg)' }}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {['qualificados', 'clientes'].map(aba => (
            <button key={aba} onClick={() => setAbaSelecionada(aba)} style={{
              padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              borderBottom: abaSelecionada === aba ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none', border: 'none', borderRadius: 0,
              color: abaSelecionada === aba ? 'var(--accent)' : 'var(--text-3)',
              transition: 'all 0.15s', fontFamily: 'var(--font-body)',
            }}>
              {aba === 'qualificados' ? `🎯 Qualificados (${qualificados?.length || 0})` : `🏆 Clientes (${clientes.length})`}
            </button>
          ))}
        </div>
        {abaSelecionada === 'clientes' && (
          <Btn cor="blue" icon={Plus} onClick={() => { setClienteEditando(null); setLeadOrigemModal(null); setModalAberto(true) }}>
            Novo Cliente
          </Btn>
        )}
      </div>

      {/* Aba Qualificados */}
      {abaSelecionada === 'qualificados' && (
        <div>
          {!qualificados?.length ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 14 }}>
              <Users size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div>Nenhum lead qualificado ainda.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Marque leads como "Qualificado" na aba Leads.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {qualificados.map(lead => (
                <div key={lead.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{lead.nome}</div>
                  {lead.empresa && <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{lead.empresa}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {lead.telefone && <span style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} />{lead.telefone}</span>}
                    {lead.cidade && <span style={{ fontSize: 11, color: 'var(--text-2)' }}>📍 {lead.cidade}</span>}
                  </div>
                  <Btn cor="green" icon={CheckCircle} onClick={() => cadastrarDeQualificado(lead)}>
                    Cadastrar como Cliente
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aba Clientes */}
      {abaSelecionada === 'clientes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Buscar por nome, empresa ou telefone..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <select style={{ ...inputStyle, width: 'auto', minWidth: 140 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="implantacao">Em implantação</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {!clientes.length ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 14 }}>
              <Building2 size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div>Nenhum cliente cadastrado.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Cadastre a partir de leads qualificados ou clique em "Novo Cliente".</div>
            </div>
          ) : (
            clientes.map(c => (
              <CardCliente
                key={c.id}
                cliente={c}
                api={API}
                onEditar={editarCliente}
                onDeletar={deletarCliente}
                onUpload={cli => setUploadClienteId(cli.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Modal cadastro/edição */}
      {modalAberto && (
        <ModalCliente
          inicial={clienteEditando}
          leadOrigem={leadOrigemModal}
          onSalvar={salvarCliente}
          onFechar={() => { setModalAberto(false); setClienteEditando(null); setLeadOrigemModal(null) }}
        />
      )}

      {/* Input de upload oculto */}
      {uploadClienteId && (
        <div style={{ display: 'none' }}>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            id="upload-contrato"
            onChange={e => {
              if (e.target.files[0]) uploadDoc(uploadClienteId, e.target.files[0])
            }}
            autoFocus
          />
        </div>
      )}
      {uploadClienteId && (() => {
        // Abre o dialog de arquivo automaticamente
        setTimeout(() => document.getElementById('upload-contrato')?.click(), 50)
        return null
      })()}
    </div>
  )
}
