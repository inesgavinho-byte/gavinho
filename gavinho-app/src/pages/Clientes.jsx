import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  MoreVertical,
  X,
  Edit,
  Trash2,
  User,
  FolderKanban,
  LayoutGrid,
  List
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

// ─── Helpers ────────────────────────────────────────────────
function getInitials(name) {
  return (name || '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function timeAgo(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'há 1 dia'
  if (diffDays < 30) return `há ${diffDays} dias`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths === 1) return 'há 1 mês'
  return `há ${diffMonths} meses`
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
}

const STATUS_MAP = {
  'on_track':   { label: 'ATIVO',       bg: 'rgba(122, 139, 110, 0.15)', color: 'var(--success)' },
  'at_risk':    { label: 'EM RISCO',    bg: 'rgba(201, 168, 130, 0.2)',  color: '#9A7B52' },
  'delayed':    { label: 'ATRASADO',    bg: 'rgba(184, 138, 138, 0.15)', color: 'var(--error)' },
  'on_hold':    { label: 'PAUSADO',     bg: 'rgba(201, 168, 130, 0.2)',  color: '#9A7B52' },
  'completed':  { label: 'CONCLUÍDO',   bg: 'rgba(138, 158, 184, 0.15)', color: 'var(--info)' },
  'blocked':    { label: 'BLOQUEADO',   bg: 'rgba(184, 138, 138, 0.15)', color: 'var(--error)' },
  'Em Curso':   { label: 'ATIVO',       bg: 'rgba(122, 139, 110, 0.15)', color: 'var(--success)' },
  'Planeamento':{ label: 'PLANEAMENTO', bg: 'var(--stone)',              color: 'var(--brown)' },
  'Concluído':  { label: 'CONCLUÍDO',   bg: 'rgba(138, 158, 184, 0.15)', color: 'var(--info)' },
  'Concluída':  { label: 'CONCLUÍDO',   bg: 'rgba(138, 158, 184, 0.15)', color: 'var(--info)' },
  'Pausada':    { label: 'PAUSADO',     bg: 'rgba(201, 168, 130, 0.2)',  color: '#9A7B52' },
  'Cancelada':  { label: 'CANCELADO',   bg: 'rgba(184, 138, 138, 0.15)', color: 'var(--error)' },
}

function getStatusInfo(status) {
  return STATUS_MAP[status] || { label: status || 'N/D', bg: 'var(--stone)', color: 'var(--brown)' }
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #ADAA96, #9A978A)',
  'linear-gradient(135deg, #7A8B6E, #6B7A5F)',
  'linear-gradient(135deg, #C9A86C, #B0925A)',
  'linear-gradient(135deg, #7A8B9E, #6B7A8B)',
  'linear-gradient(135deg, #9A6B5B, #8B5C4C)',
  'linear-gradient(135deg, #8B8670, #7A7660)',
]

function getAvatarColor(id) {
  const hash = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ─── Filter chips ───────────────────────────────────────────
const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'com_projeto', label: 'Com projeto ativo' },
  { key: 'decisao_pendente', label: 'Decisão pendente' },
  { key: 'sem_contacto', label: 'Sem contacto recente' },
]

// ─── Main Component ─────────────────────────────────────────
export default function Clientes() {
  const navigate = useNavigate()
  const toast = useToast()

  // Data
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('todos')
  const [viewMode, setViewMode] = useState('cards')
  const [activeMenu, setActiveMenu] = useState(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [formData, setFormData] = useState({
    nome: '', empresa: '', tipo: 'Particular', email: '', telefone: '',
    cidade: '', morada: '', codigo_postal: '', nif: '', notas: ''
  })

  // ─── Data Loading ───────────────────────────────────────
  const loadData = async () => {
    try {
      const [clientsRes, projectsRes, decisionsRes] = await Promise.all([
        supabase.from('clientes').select('*').order('nome', { ascending: true }),
        supabase.from('projetos').select('id, cliente_id, codigo, nome, status').order('codigo'),
        supabase.from('decisoes').select('id, projeto_id, titulo, status, created_at')
          .in('status', ['pendente', 'em_analise', 'rascunho'])
          .order('created_at', { ascending: false })
      ])

      if (clientsRes.error) throw clientsRes.error
      setClients(clientsRes.data || [])
      setProjects(projectsRes.data || [])
      setDecisions(decisionsRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ─── Derived Data ───────────────────────────────────────
  const projectsByClient = useMemo(() => {
    const map = {}
    projects.forEach(p => {
      if (p.cliente_id) {
        if (!map[p.cliente_id]) map[p.cliente_id] = []
        map[p.cliente_id].push(p)
      }
    })
    return map
  }, [projects])

  const decisionsByClient = useMemo(() => {
    const projectToClient = {}
    projects.forEach(p => {
      if (p.cliente_id) projectToClient[p.id] = p.cliente_id
    })
    const map = {}
    decisions.forEach(d => {
      const clientId = projectToClient[d.projeto_id]
      if (clientId) {
        if (!map[clientId]) map[clientId] = []
        map[clientId].push(d)
      }
    })
    return map
  }, [projects, decisions])

  // ─── KPI Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const total = clients.length
    const particulares = clients.filter(c => (c.tipo || 'Particular') === 'Particular').length
    const empresas = total - particulares

    const activeStatuses = ['on_track', 'at_risk', 'Em Curso', 'Planeamento', 'Em Progresso', 'in_progress']
    const clientsWithActive = new Set()
    let activeProjectCount = 0
    projects.forEach(p => {
      if (p.cliente_id && activeStatuses.includes(p.status)) {
        clientsWithActive.add(p.cliente_id)
        activeProjectCount++
      }
    })

    const clientsWithDecisions = new Set()
    Object.keys(decisionsByClient).forEach(cid => {
      if (decisionsByClient[cid].length > 0) clientsWithDecisions.add(cid)
    })

    const noContact14d = clients.filter(c => daysSince(c.updated_at) > 14).length

    return {
      total,
      particulares,
      empresas,
      comProjetoAtivo: clientsWithActive.size,
      projetosEmCurso: activeProjectCount,
      decisoesPendentes: clientsWithDecisions.size,
      semContacto: noContact14d,
    }
  }, [clients, projects, decisionsByClient])

  // ─── Filtering ──────────────────────────────────────────
  const filteredClients = useMemo(() => {
    let result = clients

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(c =>
        c.nome?.toLowerCase().includes(term) ||
        c.empresa?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.cidade?.toLowerCase().includes(term)
      )
    }

    // Chip filters
    const activeStatuses = ['on_track', 'at_risk', 'Em Curso', 'Planeamento', 'Em Progresso', 'in_progress']
    if (activeFilter === 'com_projeto') {
      const activeClientIds = new Set()
      projects.forEach(p => {
        if (p.cliente_id && activeStatuses.includes(p.status)) activeClientIds.add(p.cliente_id)
      })
      result = result.filter(c => activeClientIds.has(c.id))
    } else if (activeFilter === 'decisao_pendente') {
      result = result.filter(c => (decisionsByClient[c.id] || []).length > 0)
    } else if (activeFilter === 'sem_contacto') {
      result = result.filter(c => daysSince(c.updated_at) > 14)
    }

    return result
  }, [clients, searchTerm, activeFilter, projects, decisionsByClient])

  // ─── CRUD Handlers ──────────────────────────────────────
  const handleNewClient = () => {
    setEditingClient(null)
    setFormData({ nome: '', empresa: '', tipo: 'Particular', email: '', telefone: '', cidade: '', morada: '', codigo_postal: '', nif: '', notas: '' })
    setShowModal(true)
  }

  const handleEditClient = (client) => {
    setEditingClient(client)
    setFormData({
      nome: client.nome || '', empresa: client.empresa || '', tipo: client.tipo || 'Particular',
      email: client.email || '', telefone: client.telefone || '', cidade: client.cidade || '',
      morada: client.morada || '', codigo_postal: client.codigo_postal || '',
      nif: client.nif || '', notas: client.notas || ''
    })
    setShowModal(true)
    setActiveMenu(null)
  }

  const handleSaveClient = async () => {
    if (!formData.nome.trim()) return
    try {
      if (editingClient) {
        const { error } = await supabase.from('clientes').update({
          nome: formData.nome, empresa: formData.empresa || null, tipo: formData.tipo,
          email: formData.email || null, telefone: formData.telefone || null,
          cidade: formData.cidade || null, morada: formData.morada || null,
          codigo_postal: formData.codigo_postal || null, nif: formData.nif || null,
          notas: formData.notas || null, updated_at: new Date().toISOString()
        }).eq('id', editingClient.id)
        if (error) throw error
      } else {
        const { data: maxCode } = await supabase.from('clientes').select('codigo').order('codigo', { ascending: false }).limit(1)
        let nextNum = 1
        if (maxCode?.length > 0 && maxCode[0].codigo) {
          const match = maxCode[0].codigo.match(/CLI_(\d+)/)
          if (match) nextNum = parseInt(match[1]) + 1
        }
        const codigo = `CLI_${String(nextNum).padStart(5, '0')}`
        const { error } = await supabase.from('clientes').insert([{
          codigo, nome: formData.nome, empresa: formData.empresa || null, tipo: formData.tipo,
          email: formData.email || null, telefone: formData.telefone || null,
          cidade: formData.cidade || null, morada: formData.morada || null,
          codigo_postal: formData.codigo_postal || null, nif: formData.nif || null,
          notas: formData.notas || null
        }])
        if (error) throw error
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      console.error('Erro ao guardar cliente:', err)
      toast.error('Erro', 'Erro ao guardar cliente')
    }
  }

  const handleDeleteClient = async (client) => {
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', client.id)
      if (error) throw error
      setShowDeleteConfirm(null)
      loadData()
    } catch (err) {
      console.error('Erro ao eliminar cliente:', err)
      toast.error('Erro', 'Erro ao eliminar cliente. Verifique se não tem projetos associados.')
    }
  }

  // ─── Loading State ──────────────────────────────────────
  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="fade-in">
      {/* ── Header ───────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Relacionamento e acompanhamento de projetos</p>
        </div>
        <button className="btn btn-primary" onClick={handleNewClient}>
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* ── KPI Stats ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { value: stats.total, label: 'Total Clientes', color: 'var(--brown)', sub: `${stats.particulares} particulares · ${stats.empresas} empresas` },
          { value: stats.comProjetoAtivo, label: 'Projeto Ativo', color: 'var(--accent-olive-dark)', sub: `${stats.projetosEmCurso} projetos em curso` },
          { value: stats.decisoesPendentes, label: 'Decisões Pendentes', color: '#9A7B52', sub: 'Aguardam resposta' },
          { value: stats.semContacto, label: 'Sem Contacto +14D', color: 'var(--error)', sub: 'Requer follow-up' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--white)', borderRadius: '12px', padding: '20px',
            border: '1px solid var(--stone)'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: kpi.color, lineHeight: 1.1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginTop: '6px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter Chips ────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: '280px', flex: '0 1 350px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Procurar cliente, projeto, localização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px 12px 48px',
              border: '1px solid var(--stone)', borderRadius: 'var(--radius-full)',
              fontSize: '14px', background: 'var(--white)', color: 'var(--brown)',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-full)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                border: activeFilter === f.key ? '1px solid var(--accent-olive-dark)' : '1px solid var(--stone)',
                background: activeFilter === f.key ? 'var(--accent-olive-dark)' : 'var(--white)',
                color: activeFilter === f.key ? 'var(--white)' : 'var(--brown)',
                transition: 'all 0.2s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── View Tabs ──────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--stone)' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { key: 'cards', label: 'Cards', icon: <LayoutGrid size={14} /> },
            { key: 'lista', label: 'Lista', icon: <List size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                border: 'none', background: 'none',
                color: viewMode === tab.key ? 'var(--brown)' : 'var(--brown-light)',
                borderBottom: viewMode === tab.key ? '2px solid var(--brown)' : '2px solid transparent',
                marginBottom: '-1px', transition: 'all 0.2s ease'
              }}
            >
              {tab.icon} {tab.label}
              <span style={{
                fontSize: '11px', fontWeight: 600,
                padding: '1px 7px', borderRadius: '10px',
                background: viewMode === tab.key ? 'var(--brown)' : 'var(--stone)',
                color: viewMode === tab.key ? 'var(--white)' : 'var(--brown-light)'
              }}>
                {filteredClients.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty State ──────────────────────────── */}
      {filteredClients.length === 0 ? (
        <div className="card" style={{ padding: '64px 48px', textAlign: 'center' }}>
          <User size={48} style={{ color: 'var(--stone-dark)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--brown-light)', marginBottom: '16px', fontSize: '15px' }}>
            {searchTerm || activeFilter !== 'todos' ? 'Nenhum cliente encontrado com os filtros aplicados' : 'Nenhum cliente registado'}
          </p>
          {!searchTerm && activeFilter === 'todos' && (
            <button className="btn btn-primary" onClick={handleNewClient}>Criar Primeiro Cliente</button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* ── Cards View ────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredClients.map(client => {
            const clientProjects = projectsByClient[client.id] || []
            const clientDecisions = decisionsByClient[client.id] || []
            const lastContactDays = daysSince(client.updated_at)
            const lastContactLabel = timeAgo(client.updated_at)

            return (
              <div
                key={client.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => {/* future: navigate to client detail */}}
              >
                {/* Card Header */}
                <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                    background: getAvatarColor(client.id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--white)', fontWeight: 600, fontSize: '16px'
                  }}>
                    {getInitials(client.nome)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--brown)', marginBottom: '4px' }}>
                      {client.nome}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '10px',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                        background: (client.tipo || 'Particular') === 'Empresa'
                          ? 'rgba(201, 168, 130, 0.2)' : 'var(--stone)',
                        color: (client.tipo || 'Particular') === 'Empresa'
                          ? '#9A7B52' : 'var(--brown)'
                      }}>
                        {client.tipo || 'Particular'}
                      </span>
                      {client.cidade && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--brown-light)' }}>
                          <MapPin size={12} /> {client.cidade}
                        </span>
                      )}
                    </div>
                    {/* Contact info - horizontal */}
                    {(client.email || client.telefone) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--brown-light)', marginTop: '8px', flexWrap: 'wrap' }}>
                        {client.email && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {client.email}
                          </span>
                        )}
                        {client.telefone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {client.telefone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === client.id ? null : client.id) }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === client.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', background: 'var(--white)',
                        borderRadius: '10px', boxShadow: 'var(--shadow-lg)', minWidth: '150px',
                        zIndex: 100, overflow: 'hidden'
                      }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditClient(client) }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}
                        >
                          <Edit size={14} /> Editar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(client); setActiveMenu(null) }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Projects Section */}
                {clientProjects.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--stone)', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Projetos
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                        {clientProjects.length} projeto{clientProjects.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {clientProjects.slice(0, 3).map(p => {
                        const si = getStatusInfo(p.status)
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--brown)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              <span style={{ fontWeight: 500 }}>{p.codigo}</span>
                              <span style={{ color: 'var(--brown-light)', margin: '0 4px' }}>·</span>
                              {p.nome}
                            </span>
                            <span style={{
                              padding: '2px 8px', borderRadius: '10px', fontSize: '10px',
                              fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                              background: si.bg, color: si.color
                            }}>
                              {si.label}
                            </span>
                          </div>
                        )
                      })}
                      {clientProjects.length > 3 && (
                        <span style={{ fontSize: '12px', color: 'var(--brown-light)', fontStyle: 'italic' }}>
                          +{clientProjects.length - 3} projeto{clientProjects.length - 3 > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Decisions Section - Inline */}
                {clientDecisions.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--stone)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--brown)' }}>
                      <span style={{ fontWeight: 600 }}>
                        {clientDecisions.length} {clientDecisions.length === 1 ? 'decisão pendente' : 'decisões pendentes'}
                      </span>
                      <span style={{ color: 'var(--brown-light)' }}>
                        {' — '}
                        {clientDecisions.slice(0, 2).map(d => d.titulo).join(', ')}
                        {clientDecisions.length > 2 && ` +${clientDecisions.length - 2}`}
                      </span>
                    </span>
                  </div>
                )}

                {/* Last Contact Footer */}
                <div style={{
                  borderTop: '1px solid var(--stone)', padding: '12px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--cream)'
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    Último contacto: {client.updated_at
                      ? `${new Date(client.updated_at).toLocaleDateString('pt-PT')} · ${lastContactLabel}`
                      : 'N/D'}
                  </span>
                  {lastContactLabel && (
                    <span style={{
                      padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                      background: lastContactDays > 14
                        ? 'rgba(154, 107, 91, 0.15)' : lastContactDays > 7
                        ? 'rgba(201, 168, 130, 0.2)' : 'rgba(122, 139, 110, 0.15)',
                      color: lastContactDays > 14
                        ? 'var(--error)' : lastContactDays > 7
                        ? '#9A7B52' : 'var(--success)'
                    }}>
                      {lastContactDays > 14 ? 'Requer atenção' : lastContactDays > 7 ? 'A monitorizar' : 'Recente'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── List View (Table) ─────────────────── */
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Contacto</th>
                  <th>Projetos</th>
                  <th>Decisões</th>
                  <th>Último Contacto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => {
                  const clientProjects = projectsByClient[client.id] || []
                  const clientDecisions = decisionsByClient[client.id] || []
                  const lastContactDays = daysSince(client.updated_at)

                  return (
                    <tr key={client.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                            background: getAvatarColor(client.id),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--white)', fontWeight: 600, fontSize: '13px'
                          }}>
                            {getInitials(client.nome)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{client.nome}</div>
                            {client.empresa && <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{client.empresa}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                          background: (client.tipo || 'Particular') === 'Empresa' ? 'rgba(201, 168, 130, 0.2)' : 'var(--stone)',
                          color: (client.tipo || 'Particular') === 'Empresa' ? '#9A7B52' : 'var(--brown)'
                        }}>
                          {client.tipo || 'Particular'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brown-light)' }}><Mail size={12} />{client.email}</div>}
                          {client.telefone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brown-light)' }}><Phone size={12} />{client.telefone}</div>}
                        </div>
                      </td>
                      <td>
                        {clientProjects.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: 'var(--brown)' }}>
                              <FolderKanban size={13} style={{ color: 'var(--accent-olive)' }} />
                              {clientProjects.length} projeto{clientProjects.length !== 1 ? 's' : ''}
                            </span>
                            <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                              {clientProjects.slice(0, 2).map(p => p.codigo).join(', ')}
                              {clientProjects.length > 2 && ` +${clientProjects.length - 2}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {clientDecisions.length > 0 ? (
                          <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                            {clientDecisions.length} pendente{clientDecisions.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                          background: lastContactDays > 14
                            ? 'rgba(154, 107, 91, 0.15)' : lastContactDays > 7
                            ? 'rgba(201, 168, 130, 0.2)' : 'rgba(122, 139, 110, 0.15)',
                          color: lastContactDays > 14
                            ? 'var(--error)' : lastContactDays > 7
                            ? '#9A7B52' : 'var(--success)'
                        }}>
                          {timeAgo(client.updated_at) || 'N/D'}
                        </span>
                      </td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <button className="btn btn-ghost btn-icon" onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}>
                            <MoreVertical size={16} />
                          </button>
                          {activeMenu === client.id && (
                            <div style={{
                              position: 'absolute', right: 0, top: '100%', background: 'var(--white)',
                              borderRadius: '10px', boxShadow: 'var(--shadow-lg)', minWidth: '150px',
                              zIndex: 100, overflow: 'hidden'
                            }}>
                              <button onClick={() => handleEditClient(client)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}>
                                <Edit size={14} /> Editar
                              </button>
                              <button onClick={() => { setShowDeleteConfirm(client); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}>
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Criar/Editar ───────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} placeholder="Nome completo" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                  <option value="Particular">Particular</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Investidor">Investidor</option>
                </select>
              </div>
              {formData.tipo !== 'Particular' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Empresa</label>
                  <input type="text" value={formData.empresa} onChange={(e) => setFormData({...formData, empresa: e.target.value})} placeholder="Nome da empresa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@exemplo.com" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Telefone</label>
                  <input type="tel" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="+351 912 345 678" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>NIF</label>
                <input type="text" value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} placeholder="123456789" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Morada</label>
                <input type="text" value={formData.morada} onChange={(e) => setFormData({...formData, morada: e.target.value})} placeholder="Rua, número, andar" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Código Postal</label>
                  <input type="text" value={formData.codigo_postal} onChange={(e) => setFormData({...formData, codigo_postal: e.target.value})} placeholder="1000-001" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Cidade</label>
                  <input type="text" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} placeholder="Lisboa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Notas</label>
                <textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} placeholder="Observações sobre o cliente..." rows={3} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveClient} className="btn btn-primary" disabled={!formData.nome.trim()}>{editingClient ? 'Guardar Alterações' : 'Criar Cliente'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar ────────────── */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Eliminar Cliente</h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '24px', lineHeight: 1.5 }}>
              Tem a certeza que deseja eliminar <strong>{showDeleteConfirm.nome}</strong>? Esta ação não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={() => handleDeleteClient(showDeleteConfirm)} style={{ padding: '10px 20px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close menus */}
      {activeMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setActiveMenu(null)} />}
    </div>
  )
}
