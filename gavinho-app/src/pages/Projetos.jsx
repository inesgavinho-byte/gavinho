import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, LayoutGrid, List, MoreVertical, MapPin, Calendar, X,
  Edit, Trash2, Eye, FolderKanban, ChevronDown
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

const fases = ['Todas', 'Proposta', 'Conceito', 'Projeto', 'Licenciamento', 'Construção', 'Fit-out', 'Entrega']
const tipologias = ['Residencial', 'Hospitalidade', 'Comercial', 'Misto']
const statusOptions = ['on_track', 'at_risk', 'delayed', 'on_hold', 'completed']
const prioridades = ['Todas', 'Urgente', 'Alta', 'Média', 'Baixa']

export default function Projetos() {
  const navigate = useNavigate()
  const toast = useToast()
  const [projects, setProjects] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFase, setSelectedFase] = useState('Todas')
  const [selectedPrioridade, setSelectedPrioridade] = useState('Todas')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    tipologia: 'Residencial',
    localizacao: '',
    morada: '',
    cidade: '',
    cliente_id: '',
    cliente_nome: '',
    fase: 'Conceito',
    status: 'on_track',
    progresso: 0,
    descricao: '',
    data_inicio: '',
    data_prevista_conclusao: '',
    orcamento_atual: ''
  })

  // Calcular status automatico baseado no timeline
  const calcularStatusAutomatico = (projeto) => {
    // Se ja tem status definido explicitamente, usar esse
    if (projeto.status && projeto.status !== '') {
      return projeto.status
    }

    const today = new Date()
    const dataFim = projeto.data_prevista_conclusao ? new Date(projeto.data_prevista_conclusao) : null
    const dataInicio = projeto.data_inicio ? new Date(projeto.data_inicio) : null
    const progress = projeto.progresso || 0

    if (!dataFim || !dataInicio) {
      return progress >= 25 ? 'on_track' : progress > 0 ? 'at_risk' : 'on_track'
    }

    const totalDays = (dataFim - dataInicio) / (1000 * 60 * 60 * 24)
    const elapsedDays = (today - dataInicio) / (1000 * 60 * 60 * 24)
    const expectedProgress = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0

    if (progress < expectedProgress - 20) return 'delayed'
    if (progress < expectedProgress - 10) return 'at_risk'
    return 'on_track'
  }

  // Carregar projetos, clientes e calcular metricas
  // Otimizado: usa JOINs do Supabase em vez de queries separadas
  const loadData = async () => {
    try {
      const [projRes, cliRes] = await Promise.all([
        supabase
          .from('projetos')
          .select(`
            *,
            projeto_entregaveis(status),
            projeto_pagamentos(valor, estado)
          `)
          .order('codigo', { ascending: true }),
        supabase.from('clientes').select('id, nome').order('nome')
      ])

      const projetos = projRes.data || []

      // Calcular progresso e financeiro para cada projeto
      // Dados ja vem relacionados - sem necessidade de filtrar
      const projetosComMetricas = projetos.map(p => {
        const entregaveis = p.projeto_entregaveis || []
        const pagamentos = p.projeto_pagamentos || []

        // Calcular progresso dos entregaveis
        let progressoCalculado = p.progresso || 0
        if (entregaveis.length > 0) {
          const concluidos = entregaveis.filter(e =>
            e.status === 'concluido' || e.status === 'aprovado'
          ).length
          progressoCalculado = Math.round((concluidos / entregaveis.length) * 100)
        }

        // Calcular financeiro
        const valorPago = pagamentos
          .filter(pg => pg.estado === 'pago')
          .reduce((sum, pg) => sum + (parseFloat(pg.valor) || 0), 0)

        // Calcular status automatico
        const statusCalculado = calcularStatusAutomatico({ ...p, progresso: progressoCalculado })

        return {
          ...p,
          projeto_entregaveis: undefined, // Remover dados aninhados
          projeto_pagamentos: undefined,
          progresso: progressoCalculado,
          progresso_manual: p.progresso,
          status_calculado: statusCalculado,
          valor_pago: valorPago,
          entregaveis_total: entregaveis.length,
          entregaveis_concluidos: entregaveis.filter(e =>
            e.status === 'concluido' || e.status === 'aprovado'
          ).length
        }
      })

      setProjects(projetosComMetricas)
      setClientes(cliRes.data || [])
    } catch (err) {
      // Silent fail - will show empty state
    } finally {
      setLoading(false)
    }
  }

  // Carregar dados inicialmente e configurar realtime subscriptions
  useEffect(() => {
    loadData()

    // Supabase Realtime subscription para sincronizar alteracoes
    // Escutar projetos, entregaveis e pagamentos para recalcular metricas
    const channel = supabase
      .channel('projetos-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projetos' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projeto_entregaveis' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projeto_pagamentos' },
        () => loadData()
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filtrar projetos - memoizado para evitar recalculos desnecessarios
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        p.nome?.toLowerCase().includes(searchLower) ||
        p.codigo?.toLowerCase().includes(searchLower) ||
        p.cliente_nome?.toLowerCase().includes(searchLower)
      const matchesFase = selectedFase === 'Todas' || p.fase === selectedFase
      return matchesSearch && matchesFase
    })
  }, [projects, searchTerm, selectedFase])

  // Abrir modal para criar
  const handleNewProject = () => {
    setEditingProject(null)
    setFormData({
      codigo: '', nome: '', tipologia: 'Residencial', localizacao: '', morada: '', cidade: '',
      cliente_id: '', cliente_nome: '', fase: 'Conceito', status: 'on_track',
      progresso: 0, descricao: '', data_inicio: new Date().toISOString().split('T')[0],
      data_prevista_conclusao: '', orcamento_atual: ''
    })
    setShowModal(true)
  }

  // Abrir modal para editar
  const handleEditProject = (project) => {
    setEditingProject(project)
    setFormData({
      codigo: project.codigo || '',
      nome: project.nome || '',
      tipologia: project.tipologia || 'Residencial',
      localizacao: project.localizacao || '',
      morada: project.morada || '',
      cidade: project.cidade || '',
      cliente_id: project.cliente_id || '',
      cliente_nome: project.cliente_nome || '',
      fase: project.fase || 'Conceito',
      status: project.status || 'on_track',
      progresso: project.progresso || 0,
      descricao: project.descricao || '',
      data_inicio: project.data_inicio || '',
      data_prevista_conclusao: project.data_prevista_conclusao || '',
      orcamento_atual: project.orcamento_atual || ''
    })
    setShowModal(true)
    setActiveMenu(null)
  }

  // Guardar projeto (criar ou atualizar)
  const handleSaveProject = async () => {
    if (!formData.codigo.trim()) {
      toast.warning('Aviso', 'O código do projeto é obrigatório')
      return
    }
    if (!formData.nome.trim()) {
      toast.warning('Aviso', 'O nome do projeto é obrigatório')
      return
    }

    try {
      // Buscar nome do cliente se selecionado
      let clienteNome = formData.cliente_nome
      if (formData.cliente_id) {
        const cliente = clientes.find(c => c.id === formData.cliente_id)
        if (cliente) clienteNome = cliente.nome
      }

      const projectData = {
        nome: formData.nome,
        tipologia: formData.tipologia || 'Residencial',
        localizacao: formData.localizacao || null,
        morada: formData.morada || null,
        cidade: formData.cidade || null,
        cliente_id: formData.cliente_id || null,
        cliente_nome: clienteNome || null,
        fase: formData.fase || 'Conceito',
        status: formData.status || 'on_track',
        progresso: parseInt(formData.progresso) || 0,
        descricao: formData.descricao || null,
        data_inicio: formData.data_inicio || null,
        data_prevista_conclusao: formData.data_prevista_conclusao || null,
        orcamento_atual: formData.orcamento_atual ? parseFloat(formData.orcamento_atual) : null,
        updated_at: new Date().toISOString()
      }

      // Incluir código quando estiver a editar
      if (editingProject && formData.codigo) {
        projectData.codigo = formData.codigo
      }

      console.log('A guardar projeto:', projectData)

      if (editingProject) {
        // Atualizar
        const { data, error } = await supabase
          .from('projetos')
          .update(projectData)
          .eq('id', editingProject.id)
          .select()

        if (error) {
          console.error('Erro Supabase:', error)
          throw error
        }
        console.log('Projeto atualizado:', data)
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from('projetos')
          .insert([{ ...projectData, codigo: formData.codigo.trim() }])
          .select()

        if (error) {
          console.error('Erro Supabase:', error)
          throw error
        }
        console.log('Projeto criado:', data)
      }

      setShowModal(false)
      setEditingProject(null)
      // Recarregar dados
      const { data } = await supabase.from('projetos').select('*').eq('arquivado', false).order('codigo', { ascending: true })
      setProjects(data || [])
    } catch (err) {
      console.error('Erro ao guardar projeto:', err)
      toast.error('Erro', 'Erro ao guardar projeto: ' + (err.message || JSON.stringify(err)))
    }
  }

  // Eliminar projeto
  const handleDeleteProject = async (project) => {
    try {
      const { error } = await supabase.from('projetos').delete().eq('id', project.id)
      if (error) throw error
      
      setShowDeleteConfirm(null)
      setProjects(projects.filter(p => p.id !== project.id))
    } catch (err) {
      console.error('Erro ao eliminar projeto:', err)
      toast.error('Erro', 'Erro ao eliminar projeto. Verifique se não tem dados associados.')
    }
  }

  // Helpers
  const getStatusColor = (status) => {
    const colors = { on_track: 'var(--success)', at_risk: 'var(--warning)', blocked: 'var(--error)' }
    return colors[status] || 'var(--info)'
  }

  const getStatusLabel = (status) => {
    const labels = { on_track: 'Em Andamento', at_risk: 'Em Risco', blocked: 'Bloqueado' }
    return labels[status] || 'N/D'
  }

  const getFaseColor = (fase) => {
    const colors = { 'Proposta': '#8A9EB8', 'Conceito': '#C9A882', 'Projeto': '#C3BAAF', 'Licenciamento': '#B0A599', 'Construção': '#7A9E7A', 'Fit-out': '#5F5C59', 'Entrega': '#4A4845' }
    return colors[fase] || '#C3BAAF'
  }

  const getPrioridadeFromOrcamento = (orcamento) => {
    if (!orcamento) return 'media'
    if (orcamento >= 500000) return 'urgente'
    if (orcamento >= 300000) return 'alta'
    if (orcamento >= 100000) return 'media'
    return 'baixa'
  }

  const getPrioridadeStyle = (prioridade) => {
    const styles = {
      urgente: { bg: 'var(--priority-urgente)', label: 'URGENTE' },
      alta: { bg: 'var(--priority-alta)', label: 'ALTA' },
      media: { bg: 'var(--priority-media)', label: 'MÉDIA' },
      baixa: { bg: 'var(--priority-baixa)', label: 'BAIXA' }
    }
    return styles[prioridade] || styles.media
  }

  const formatCurrency = (value) => {
    if (!value) return '— €0'
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
  }

  const formatDateRange = (dataInicio, dataFim) => {
    const format = (d) => {
      if (!d) return ''
      return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    const inicio = format(dataInicio)
    const fim = format(dataFim)
    if (inicio && fim) return `${inicio} - ${fim}`
    if (inicio) return inicio
    if (fim) return `até ${fim}`
    return '—'
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-subtitle">Gestão completa de projetos de design & build</p>
        </div>
        <button className="btn btn-primary" onClick={handleNewProject}>
          <Plus size={18} />
          Novo Projeto
        </button>
      </div>

      {/* Filtros - Novo Design */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '300px', maxWidth: '450px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Procurar por nome, cliente ou localização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--brown)'
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedFase}
            onChange={(e) => setSelectedFase(e.target.value)}
            style={{
              padding: '14px 40px 14px 20px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--brown)',
              appearance: 'none',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="Todas">Todos os estados</option>
            {fases.filter(f => f !== 'Todas').map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', pointerEvents: 'none' }} />
        </div>

        {/* Priority Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedPrioridade}
            onChange={(e) => setSelectedPrioridade(e.target.value)}
            style={{
              padding: '14px 40px 14px 20px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--brown)',
              appearance: 'none',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="Todas">Todas as prioridades</option>
            {prioridades.filter(p => p !== 'Todas').map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Lista/Grid de Projetos */}
      {filteredProjects.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <FolderKanban size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>Nenhum projeto encontrado</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleNewProject}>Criar Primeiro Projeto</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredProjects.map((p) => {
            const prioridade = getPrioridadeFromOrcamento(p.orcamento_atual)
            const prioridadeStyle = getPrioridadeStyle(prioridade)
            return (
              <div
                key={p.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '20px 20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'box-shadow 0.2s ease'
                }}
                onClick={() => navigate(`/projetos/${p.codigo}`)}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              >
                {/* Header: Título + Badge + Menu */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--brown)',
                        margin: 0,
                        lineHeight: 1.4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {p.codigo}_{(p.nome || '').toUpperCase()}
                      </h3>
                      {p.codigo_interno && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: 'var(--info)',
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          {p.codigo_interno}
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--brown-light)',
                      margin: 0
                    }}>
                      {p.cliente_nome || 'Cliente não definido'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* Priority Badge */}
                    <span style={{
                      padding: '4px 10px',
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderRadius: '4px',
                      background: prioridadeStyle.bg,
                      color: 'white'
                    }}>
                      {prioridadeStyle.label}
                    </span>

                    {/* Menu */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === p.id ? null : p.id) }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--brown-light)',
                          borderRadius: '4px'
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeMenu === p.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: 'var(--white)',
                          borderRadius: '10px',
                          boxShadow: 'var(--shadow-lg)',
                          minWidth: '150px',
                          zIndex: 100,
                          overflow: 'hidden'
                        }}>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/projetos/${p.codigo}`) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}><Eye size={14} />Ver Detalhe</button>
                          <button onClick={(e) => { e.stopPropagation(); handleEditProject(p) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}><Edit size={14} />Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(p); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}><Trash2 size={14} />Eliminar</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta Info: Localização + Datas */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '12px',
                  color: 'var(--brown-light)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={13} />
                    {p.cidade || p.localizacao || '—'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} />
                    {formatDateRange(p.data_inicio, p.data_prevista_conclusao)}
                  </span>
                </div>

                {/* Progress Bar com percentagem */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                      {p.entregaveis_total > 0
                        ? `${p.entregaveis_concluidos}/${p.entregaveis_total} entregaveis`
                        : 'Sem entregaveis'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                      {p.progresso || 0}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    background: 'var(--stone)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${p.progresso || 0}%`,
                      height: '100%',
                      background: getStatusColor(p.status_calculado || p.status),
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Footer: Status + Financeiro */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px'
                }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--brown-light)'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: getStatusColor(p.status_calculado || p.status)
                    }} />
                    {getStatusLabel(p.status_calculado || p.status)}
                  </span>
                  {p.orcamento_atual > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                      {formatCurrency(p.valor_pago || 0)} / {formatCurrency(p.orcamento_atual)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Código</th><th>ID Interno</th><th>Nome</th><th>Fase</th><th>Status</th><th>Progresso</th><th></th></tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/projetos/${p.codigo}`)} style={{ cursor: 'pointer' }}>
                    <td><span style={{ fontWeight: 600, color: 'var(--warning)', fontFamily: 'monospace' }}>{p.codigo}</span></td>
                    <td><span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--info)', fontFamily: 'monospace' }}>{p.codigo_interno || '—'}</span></td>
                    <td style={{ fontWeight: 500 }}>{p.nome}</td>
                    <td><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: `${getFaseColor(p.fase)}20`, color: getFaseColor(p.fase) }}>{p.fase}</span></td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(p.status_calculado || p.status) }} />{getStatusLabel(p.status_calculado || p.status)}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${p.progresso || 0}%`, height: '100%', background: getStatusColor(p.status_calculado || p.status), borderRadius: '3px' }} /></div>
                        <span style={{ fontSize: '12px' }}>{p.progresso || 0}%</span>
                        {p.entregaveis_total > 0 && <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>({p.entregaveis_concluidos}/{p.entregaveis_total})</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === p.id ? null : p.id) }} className="btn btn-ghost btn-icon"><MoreVertical size={16} /></button>
                        {activeMenu === p.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--white)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', minWidth: '150px', zIndex: 100, overflow: 'hidden' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleEditProject(p) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}><Edit size={14} />Editar</button>
                            <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(p); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}><Trash2 size={14} />Eliminar</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Código do Projeto *</label>
                <input type="text" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} placeholder="Ex: GA00123" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Nome do Projeto *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Casa Silva" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Tipologia</label>
                  <select value={formData.tipologia} onChange={(e) => setFormData({...formData, tipologia: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    {tipologias.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Cliente</label>
                  <select value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    <option value="">Selecionar cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Fase</label>
                  <select value={formData.fase} onChange={(e) => setFormData({...formData, fase: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    {fases.filter(f => f !== 'Todas').map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    <option value="on_track">No Prazo</option>
                    <option value="at_risk">Em Risco</option>
                    <option value="delayed">Atrasado</option>
                    <option value="on_hold">Em Espera</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Progresso (%)</label>
                <input type="number" min="0" max="100" value={formData.progresso} onChange={(e) => setFormData({...formData, progresso: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Localização</label>
                  <input type="text" value={formData.localizacao} onChange={(e) => setFormData({...formData, localizacao: e.target.value})} placeholder="Ex: Restelo, Lisboa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Cidade</label>
                  <input type="text" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} placeholder="Lisboa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Data Início</label>
                  <input type="date" value={formData.data_inicio} onChange={(e) => setFormData({...formData, data_inicio: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Previsão Conclusão</label>
                  <input type="date" value={formData.data_prevista_conclusao} onChange={(e) => setFormData({...formData, data_prevista_conclusao: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Orçamento (€)</label>
                <input type="number" value={formData.orcamento_atual} onChange={(e) => setFormData({...formData, orcamento_atual: e.target.value})} placeholder="50000" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Descrição</label>
                <textarea value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Descrição do projeto..." rows={3} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveProject} className="btn btn-primary" disabled={!formData.codigo.trim() || !formData.nome.trim()}>{editingProject ? 'Guardar Alterações' : 'Criar Projeto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Eliminar Projeto</h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '24px', lineHeight: 1.5 }}>
              Tem a certeza que deseja eliminar <strong>{showDeleteConfirm.nome}</strong> ({showDeleteConfirm.codigo})? Esta ação não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={() => handleDeleteProject(showDeleteConfirm)} style={{ padding: '10px 20px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {activeMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setActiveMenu(null)} />}
    </div>
  )
}
