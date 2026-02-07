import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  TrendingUp, Euro, Users, FolderKanban, FileText,
  CheckCircle, Clock, ArrowUpRight, UserPlus, X, Check, Mail, Phone,
  Hammer, MapPin, Calendar, Percent, LayoutGrid, List
} from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'

export default function DashboardAdmin() {
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [loading, setLoading] = useState(true)
  const [pendingUsers, setPendingUsers] = useState([])
  const [projetos, setProjetos] = useState([])
  const [obras, setObras] = useState([])
  const [stats, setStats] = useState({
    totalProjetos: 0,
    projetosAtivos: 0,
    totalClientes: 0,
    totalObras: 0,
    obrasEmCurso: 0,
    valorContratadoObras: 0,
    totalFaturadoObras: 0,
    orcamentoTotalProjetos: 0,
    orcamentoAprovado: 0,
    faturado: 0,
    porFaturar: 0
  })
  const [viewMode, setViewMode] = useState({ projetos: 'grid', obras: 'grid' })
  
  // Modal de aprovação com seleção de role
  const [approvalModal, setApprovalModal] = useState(null)
  const [approvalData, setApprovalData] = useState({
    role: 'user',
    cargo: '',
    departamento: 'Equipa'
  })

  const ROLES = [
    { value: 'admin', label: 'Administrador', desc: 'Acesso total a todas as funcionalidades', color: '#dc2626' },
    { value: 'gestor', label: 'Gestor de Projeto', desc: 'Gestão de projetos, orçamentos e equipa', color: '#2563eb' },
    { value: 'tecnico', label: 'Técnico', desc: 'Acesso a projetos e obras atribuídas', color: '#16a34a' },
    { value: 'user', label: 'Colaborador', desc: 'Acesso básico a tarefas e diário', color: '#78716c' }
  ]

  const DEPARTAMENTOS = ['Arquitetura', 'Design Interiores', 'Construção', 'Gestão', 'Comercial', 'Administrativo']
  const CARGOS = ['Diretor', 'Gestor de Projeto', 'Arquiteto', 'Designer', 'Engenheiro', 'Encarregado', 'Técnico', 'Administrativo', 'Estagiário']

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [projetosRes, clientesRes, orcamentosRes, pendingRes, obrasRes, propostasRes] = await Promise.all([
        supabase.from('projetos').select('*').eq('arquivado', false).order('created_at', { ascending: false }),
        supabase.from('clientes').select('*'),
        supabase.from('orcamentos').select('*, projetos(codigo, nome)'),
        supabase.from('utilizadores').select('*').eq('ativo', false).order('created_at', { ascending: false }),
        supabase.from('obras').select('*, projetos(codigo, nome)').order('created_at', { ascending: false }),
        supabase.from('obra_propostas').select('obra_id, valor_total')
      ])

      const projetosData = projetosRes.data || []
      const clientes = clientesRes.data || []
      const orcamentos = orcamentosRes.data || []
      const obrasData = obrasRes.data || []
      const propostas = propostasRes.data || []
      
      setPendingUsers(pendingRes.data || [])
      setProjetos(projetosData)
      setObras(obrasData)

      // Calcular valor contratado por obra (soma das propostas)
      const valorPorObra = {}
      propostas.forEach(p => {
        valorPorObra[p.obra_id] = (valorPorObra[p.obra_id] || 0) + (p.valor_total || 0)
      })
      const valorContratadoObras = Object.values(valorPorObra).reduce((sum, v) => sum + v, 0)

      // Calcular stats
      const orcamentosAprovados = orcamentos.filter(o => o.status === 'aprovado')
      const valorAprovado = orcamentosAprovados.reduce((sum, o) => sum + (o.total_com_iva || 0), 0)
      const totalFaturadoObras = obrasData.reduce((sum, o) => sum + (o.total_faturado || 0), 0)
      const orcamentoTotalProjetos = projetosData.reduce((sum, p) => sum + (p.orcamento_atual || 0), 0)
      
      setStats({
        totalProjetos: projetosData.length,
        projetosAtivos: projetosData.filter(p => p.status === 'on_track' || p.status === 'at_risk').length,
        totalClientes: clientes.length,
        totalObras: obrasData.length,
        obrasEmCurso: obrasData.filter(o => o.status === 'em_curso').length,
        valorContratadoObras,
        totalFaturadoObras,
        orcamentoTotalProjetos,
        orcamentoAprovado: valorAprovado,
        faturado: projetosData.reduce((sum, p) => sum + (p.faturado || 0), 0),
        porFaturar: valorAprovado - projetosData.reduce((sum, p) => sum + (p.faturado || 0), 0)
      })

    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
  }

  const getProjetoStatusColor = (status) => {
    const colors = { on_track: 'var(--success)', at_risk: 'var(--warning)', blocked: 'var(--error)' }
    return colors[status] || 'var(--info)'
  }

  const getProjetoStatusLabel = (status) => {
    const labels = { on_track: 'No prazo', at_risk: 'Em risco', blocked: 'Bloqueado' }
    return labels[status] || 'N/D'
  }

  const getFaseColor = (fase) => {
    const colors = { 
      'Proposta': '#8A9EB8', 'Conceito': '#C9A882', 'Projeto': '#C3BAAF', 
      'Licenciamento': '#B0A599', 'Construção': '#7A9E7A', 'Fit-out': '#5F5C59', 'Entrega': '#4A4845' 
    }
    return colors[fase] || '#C3BAAF'
  }

  const getObraStatusConfig = (status) => {
    const configs = {
      'pendente': { label: 'Pendente', color: 'var(--brown-light)', bg: 'var(--stone)' },
      'em_curso': { label: 'Em Curso', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
      'concluida': { label: 'Concluída', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
      'suspensa': { label: 'Suspensa', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' }
    }
    return configs[status] || configs.pendente
  }

  const openApprovalModal = (user) => {
    setApprovalData({
      role: 'user',
      cargo: user.funcao || '',
      departamento: 'Equipa'
    })
    setApprovalModal(user)
  }

  const handleApproveUser = async () => {
    if (!approvalModal) return
    
    try {
      const { error } = await supabase
        .from('utilizadores')
        .update({ 
          ativo: true, 
          role: approvalData.role,
          cargo: approvalData.cargo,
          departamento: approvalData.departamento
        })
        .eq('id', approvalModal.id)

      if (error) throw error
      setPendingUsers(prev => prev.filter(u => u.id !== approvalModal.id))
      setApprovalModal(null)
      toast.success('Sucesso', `${approvalModal.nome} foi aprovado como ${ROLES.find(r => r.value === approvalData.role)?.label}!`)
    } catch (err) {
      console.error('Erro ao aprovar:', err)
      toast.error('Erro', 'Erro ao aprovar utilizador')
    }
  }

  const handleRejectUser = async (user) => {
    setConfirmModal({
      isOpen: true,
      title: 'Rejeitar Pedido',
      message: `Rejeitar o pedido de ${user.nome}? Esta ação não pode ser revertida.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('utilizadores').delete().eq('id', user.id)
          if (error) throw error
          setPendingUsers(prev => prev.filter(u => u.id !== user.id))
          toast.success('Sucesso', `Pedido de ${user.nome} foi rejeitado.`)
        } catch (err) {
          console.error('Erro ao rejeitar:', err)
          toast.error('Erro', 'Erro ao rejeitar utilizador')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
    return
  }

  const getInitials = (nome) => nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: '4px' }}>Dashboard Gestão</h1>
        <p style={{ color: 'var(--brown-light)', fontSize: '14px', margin: 0 }}>
          Visão geral de projetos e obras
        </p>
      </div>

      {/* Utilizadores Pendentes de Aprovação */}
      {pendingUsers.length > 0 && (
        <div className="card" style={{ padding: 0, marginBottom: '24px', border: '2px solid var(--warning)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: 'rgba(201, 168, 130, 0.15)', borderBottom: '1px solid var(--stone)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Pedidos de Registo Pendentes</h3>
            <span style={{ background: 'var(--warning)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{pendingUsers.length}</span>
          </div>
          <div>
            {pendingUsers.map(user => (
              <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderBottom: '1px solid var(--stone)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                  {getInitials(user.nome)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{user.nome}</div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {user.email}</span>
                    {user.telefone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {user.telefone}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openApprovalModal(user)} style={{ padding: '8px 16px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Aprovar
                  </button>
                  <button onClick={() => handleRejectUser(user)} style={{ padding: '8px 16px', background: 'var(--cream)', color: 'var(--error)', border: '1px solid var(--error)', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={14} /> Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(201, 168, 130, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.totalProjetos}</div>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Projetos</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(184, 143, 102, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hammer size={18} style={{ color: 'rgb(184, 143, 102)' }} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.totalObras}</div>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Obras</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(138, 158, 184, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.obrasEmCurso}</div>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Em Curso</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(138, 158, 184, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.totalClientes}</div>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Clientes</div>
          </div>
        </div>
      </div>

      {/* KPIs Financeiros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Euro size={16} style={{ color: 'var(--warning)' }} />
            <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Orçamento Projetos</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>
            {stats.orcamentoTotalProjetos > 0 ? formatCurrency(stats.orcamentoTotalProjetos) : '0 €'}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Euro size={16} style={{ color: 'rgb(184, 143, 102)' }} />
            <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Contratado Obras</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>
            {stats.valorContratadoObras > 0 ? formatCurrency(stats.valorContratadoObras) : '0 €'}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CheckCircle size={16} style={{ color: 'var(--success)' }} />
            <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Faturado Obras</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>
            {stats.totalFaturadoObras > 0 ? formatCurrency(stats.totalFaturadoObras) : '0 €'}
          </div>
        </div>
      </div>

      {/* ========== SECÇÃO PROJETOS ========== */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FolderKanban size={22} style={{ color: 'var(--warning)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Projetos</h2>
            <span style={{ background: 'var(--stone)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{projetos.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', background: 'var(--stone)', borderRadius: '8px', padding: '2px' }}>
              <button 
                onClick={() => setViewMode(v => ({ ...v, projetos: 'grid' }))}
                style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: viewMode.projetos === 'grid' ? 'var(--white)' : 'transparent', color: 'var(--brown)' }}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode(v => ({ ...v, projetos: 'list' }))}
                style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: viewMode.projetos === 'list' ? 'var(--white)' : 'transparent', color: 'var(--brown)' }}
              >
                <List size={16} />
              </button>
            </div>
            <button onClick={() => navigate('/projetos')} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '12px' }}>
              Ver Todos <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {projetos.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
            <FolderKanban size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>Sem projetos registados</div>
          </div>
        ) : viewMode.projetos === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {projetos.slice(0, 6).map((p) => (
              <div key={p.id} className="card" style={{ cursor: 'pointer', padding: '20px' }} onClick={() => navigate(`/projetos/${p.codigo}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--warning)' }}>{p.codigo}</span>
                  <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: `${getFaseColor(p.fase)}20`, color: getFaseColor(p.fase) }}>{p.fase}</span>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', lineHeight: 1.3 }}>{p.nome}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${p.progresso || 0}%`, height: '100%', background: getProjetoStatusColor(p.status), borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{p.progresso || 0}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--brown-light)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} />{p.cidade || p.localizacao || '-'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getProjetoStatusColor(p.status) }} />
                    {getProjetoStatusLabel(p.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Código</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Nome</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fase</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Progresso</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Localização</th>
                </tr>
              </thead>
              <tbody>
                {projetos.slice(0, 8).map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/projetos/${p.codigo}`)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--stone)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--warning)', fontFamily: 'monospace' }}>{p.codigo}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.nome}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: `${getFaseColor(p.fase)}20`, color: getFaseColor(p.fase) }}>{p.fase}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getProjetoStatusColor(p.status) }} />
                        {getProjetoStatusLabel(p.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${p.progresso || 0}%`, height: '100%', background: getProjetoStatusColor(p.status), borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '12px' }}>{p.progresso || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                      {p.cidade || p.localizacao || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== SECÇÃO OBRAS ========== */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hammer size={22} style={{ color: 'rgb(184, 143, 102)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Obras</h2>
            <span style={{ background: 'var(--stone)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{obras.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', background: 'var(--stone)', borderRadius: '8px', padding: '2px' }}>
              <button 
                onClick={() => setViewMode(v => ({ ...v, obras: 'grid' }))}
                style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: viewMode.obras === 'grid' ? 'var(--white)' : 'transparent', color: 'var(--brown)' }}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode(v => ({ ...v, obras: 'list' }))}
                style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: viewMode.obras === 'list' ? 'var(--white)' : 'transparent', color: 'var(--brown)' }}
              >
                <List size={16} />
              </button>
            </div>
            <button onClick={() => navigate('/obras')} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '12px' }}>
              Ver Todas <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {obras.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
            <Hammer size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>Sem obras registadas</div>
          </div>
        ) : viewMode.obras === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {obras.slice(0, 6).map((obra) => {
              const statusConfig = getObraStatusConfig(obra.status)
              const progresso = obra.valor_contrato > 0 ? Math.round((obra.total_faturado || 0) / obra.valor_contrato * 100) : 0
              
              return (
                <div key={obra.id} className="card" style={{ cursor: 'pointer', padding: '20px' }} onClick={() => navigate(`/obras/${obra.codigo}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--warning)' }}>{obra.codigo}</span>
                    {obra.projetos?.codigo && <span style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--brown-light)', fontSize: '12px' }}>{obra.projetos.codigo}</span>}
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusConfig.bg, color: statusConfig.color, marginLeft: 'auto' }}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', lineHeight: 1.3 }}>{obra.nome}</h3>
                  
                  {obra.valor_contrato > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(progresso, 100)}%`, height: '100%', background: statusConfig.color, borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{progresso}%</span>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--brown-light)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      {obra.localizacao ? obra.localizacao.substring(0, 25) + (obra.localizacao.length > 25 ? '...' : '') : '-'}
                    </span>
                    {obra.valor_contrato > 0 && (
                      <span style={{ fontWeight: 600, color: 'var(--brown)' }}>{formatCurrency(obra.valor_contrato)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Código</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Nome</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Projeto</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Valor Contrato</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Localização</th>
                </tr>
              </thead>
              <tbody>
                {obras.slice(0, 8).map((obra) => {
                  const statusConfig = getObraStatusConfig(obra.status)
                  return (
                    <tr key={obra.id} onClick={() => navigate(`/obras/${obra.codigo}`)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--stone)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--warning)' }}>{obra.codigo}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{obra.nome}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--brown-light)' }}>{obra.projetos?.nome || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusConfig.bg, color: statusConfig.color }}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>
                        {obra.valor_contrato ? formatCurrency(obra.valor_contrato) : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                        {obra.localizacao ? obra.localizacao.substring(0, 30) + (obra.localizacao.length > 30 ? '...' : '') : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Aprovação */}
      {approvalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setApprovalModal(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '480px', margin: '20px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Aprovar Utilizador</h3>
              <button onClick={() => setApprovalModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {/* Info do utilizador */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--cream)', borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                  {approvalModal.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{approvalModal.nome}</div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{approvalModal.email}</div>
                  {approvalModal.funcao && <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>Função indicada: {approvalModal.funcao}</div>}
                </div>
              </div>

              {/* Seleção de Role */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--brown)' }}>
                  Nível de Acesso *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ROLES.map(role => (
                    <label 
                      key={role.value}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '12px 16px', 
                        border: approvalData.role === role.value ? `2px solid ${role.color}` : '1px solid var(--stone)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: approvalData.role === role.value ? `${role.color}10` : 'var(--white)'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="role" 
                        value={role.value}
                        checked={approvalData.role === role.value}
                        onChange={e => setApprovalData({ ...approvalData, role: e.target.value })}
                        style={{ accentColor: role.color }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: role.color }}>{role.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{role.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cargo */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Cargo</label>
                <select
                  value={approvalData.cargo}
                  onChange={e => setApprovalData({ ...approvalData, cargo: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}
                >
                  <option value="">Selecionar cargo...</option>
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Departamento */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Departamento</label>
                <select
                  value={approvalData.departamento}
                  onChange={e => setApprovalData({ ...approvalData, departamento: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}
                >
                  {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setApprovalModal(null)}
                  style={{ flex: 1, padding: '12px', background: 'var(--cream)', color: 'var(--brown)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleApproveUser}
                  style={{ flex: 1, padding: '12px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Check size={16} /> Aprovar Acesso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}
