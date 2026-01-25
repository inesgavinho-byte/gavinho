import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  AlertTriangle, Plus, X, Calendar, MapPin, Edit2, Trash2,
  ChevronDown, ChevronRight, Clock, User, Camera, CheckCircle,
  ArrowRight, Loader2, Upload, AlertCircle, Search, Filter,
  FileText, Check
} from 'lucide-react'

const TIPOS_NC = [
  { id: 'execucao', label: 'Execução', descricao: 'Desvio na execução do trabalho' },
  { id: 'material', label: 'Material', descricao: 'Problema com material' },
  { id: 'projeto', label: 'Projeto', descricao: 'Erro ou omissão de projeto' },
  { id: 'seguranca', label: 'Segurança', descricao: 'Questão de segurança' }
]

const GRAVIDADES = {
  menor: { label: 'Menor', cor: '#3B82F6', descricao: 'Impacto reduzido, resolução simples' },
  maior: { label: 'Maior', cor: '#F59E0B', descricao: 'Impacto significativo, requer atenção' },
  critica: { label: 'Crítica', cor: '#EF4444', descricao: 'Impacto severo, resolução urgente' }
}

const ESTADOS = {
  aberta: { label: 'Aberta', cor: '#EF4444', icon: AlertCircle },
  em_resolucao: { label: 'Em Resolução', cor: '#F59E0B', icon: Clock },
  resolvida: { label: 'Resolvida', cor: '#3B82F6', icon: Check },
  verificada: { label: 'Verificada', cor: '#10B981', icon: CheckCircle },
  encerrada: { label: 'Encerrada', cor: '#6B7280', icon: FileText }
}

export default function ObraNaoConformidades({ obra }) {
  const [ncs, setNcs] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [zonas, setZonas] = useState([])
  const [utilizadores, setUtilizadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNC, setEditingNC] = useState(null)
  const [selectedNC, setSelectedNC] = useState(null)
  const [saving, setSaving] = useState(false)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroGravidade, setFiltroGravidade] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [expandedEspecialidades, setExpandedEspecialidades] = useState([])

  // Form
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    especialidade_id: '',
    zona_id: '',
    tipo: 'execucao',
    gravidade: 'maior',
    data_identificacao: new Date().toISOString().split('T')[0],
    data_limite_resolucao: '',
    responsavel_resolucao: '',
    acao_corretiva: '',
    acao_preventiva: ''
  })

  useEffect(() => {
    if (obra?.id) {
      loadData()
    }
  }, [obra?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ncsRes, especRes, zonasRes, usersRes] = await Promise.all([
        supabase
          .from('nao_conformidades')
          .select('*, especialidade:especialidades(id, nome, cor), zona:obra_zonas(id, nome, codigo)')
          .eq('obra_id', obra.id)
          .order('data_identificacao', { ascending: false }),
        supabase
          .from('especialidades')
          .select('*')
          .eq('ativo', true)
          .order('ordem'),
        supabase
          .from('obra_zonas')
          .select('*')
          .eq('obra_id', obra.id)
          .order('ordem'),
        supabase
          .from('utilizadores')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome')
      ])

      setNcs(ncsRes.data || [])
      setEspecialidades(especRes.data || [])
      setZonas(zonasRes.data || [])
      setUtilizadores(usersRes.data || [])

      // Expandir especialidades com NCs por padrão
      const especsComNCs = [...new Set((ncsRes.data || []).map(nc => nc.especialidade_id).filter(Boolean))]
      setExpandedEspecialidades(especsComNCs)
    } catch (err) {
      console.error('Erro ao carregar NCs:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateCodigo = () => {
    const count = ncs.length + 1
    return `NC-${String(count).padStart(3, '0')}`
  }

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      especialidade_id: '',
      zona_id: '',
      tipo: 'execucao',
      gravidade: 'maior',
      data_identificacao: new Date().toISOString().split('T')[0],
      data_limite_resolucao: '',
      responsavel_resolucao: '',
      acao_corretiva: '',
      acao_preventiva: ''
    })
    setEditingNC(null)
  }

  const handleCreate = async () => {
    if (!formData.titulo || !formData.descricao) {
      alert('Título e descrição são obrigatórios')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('nao_conformidades')
        .insert({
          obra_id: obra.id,
          codigo: generateCodigo(),
          titulo: formData.titulo,
          descricao: formData.descricao,
          especialidade_id: formData.especialidade_id || null,
          zona_id: formData.zona_id || null,
          tipo: formData.tipo,
          gravidade: formData.gravidade,
          data_identificacao: formData.data_identificacao,
          data_limite_resolucao: formData.data_limite_resolucao || null,
          responsavel_resolucao: formData.responsavel_resolucao || null,
          estado: 'aberta'
        })
        .select()
        .single()

      if (error) throw error

      // Adicionar ao histórico
      await supabase.from('nc_historico').insert({
        nc_id: data.id,
        acao: 'criada',
        descricao: 'Não conformidade criada',
        estado_novo: 'aberta'
      })

      setShowModal(false)
      resetForm()
      loadData()
    } catch (err) {
      console.error('Erro ao criar NC:', err)
      alert('Erro ao criar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingNC) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('nao_conformidades')
        .update({
          titulo: formData.titulo,
          descricao: formData.descricao,
          especialidade_id: formData.especialidade_id || null,
          zona_id: formData.zona_id || null,
          tipo: formData.tipo,
          gravidade: formData.gravidade,
          data_limite_resolucao: formData.data_limite_resolucao || null,
          responsavel_resolucao: formData.responsavel_resolucao || null,
          acao_corretiva: formData.acao_corretiva || null,
          acao_preventiva: formData.acao_preventiva || null
        })
        .eq('id', editingNC.id)

      if (error) throw error

      setShowModal(false)
      resetForm()
      loadData()
    } catch (err) {
      console.error('Erro ao atualizar NC:', err)
      alert('Erro ao atualizar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (nc) => {
    if (!confirm('Tem certeza que deseja apagar esta não conformidade?')) return

    try {
      const { error } = await supabase
        .from('nao_conformidades')
        .delete()
        .eq('id', nc.id)

      if (error) throw error

      if (selectedNC?.id === nc.id) setSelectedNC(null)
      loadData()
    } catch (err) {
      console.error('Erro ao apagar:', err)
      alert('Erro ao apagar NC')
    }
  }

  const handleEstadoChange = async (nc, novoEstado) => {
    try {
      const updateData = { estado: novoEstado }

      if (novoEstado === 'resolvida') {
        updateData.data_resolucao = new Date().toISOString().split('T')[0]
      } else if (novoEstado === 'verificada') {
        updateData.data_verificacao = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('nao_conformidades')
        .update(updateData)
        .eq('id', nc.id)

      if (error) throw error

      // Adicionar ao histórico
      await supabase.from('nc_historico').insert({
        nc_id: nc.id,
        acao: 'estado_alterado',
        descricao: `Estado alterado para ${ESTADOS[novoEstado].label}`,
        estado_anterior: nc.estado,
        estado_novo: novoEstado
      })

      loadData()

      // Atualizar selecionada se for a mesma
      if (selectedNC?.id === nc.id) {
        setSelectedNC({ ...nc, estado: novoEstado, ...updateData })
      }
    } catch (err) {
      console.error('Erro ao alterar estado:', err)
      alert('Erro ao alterar estado')
    }
  }

  const handleEdit = (nc) => {
    setEditingNC(nc)
    setFormData({
      titulo: nc.titulo || '',
      descricao: nc.descricao || '',
      especialidade_id: nc.especialidade_id || '',
      zona_id: nc.zona_id || '',
      tipo: nc.tipo || 'execucao',
      gravidade: nc.gravidade || 'maior',
      data_identificacao: nc.data_identificacao || '',
      data_limite_resolucao: nc.data_limite_resolucao || '',
      responsavel_resolucao: nc.responsavel_resolucao || '',
      acao_corretiva: nc.acao_corretiva || '',
      acao_preventiva: nc.acao_preventiva || ''
    })
    setShowModal(true)
  }

  const toggleEspecialidade = (espId) => {
    setExpandedEspecialidades(prev =>
      prev.includes(espId)
        ? prev.filter(id => id !== espId)
        : [...prev, espId]
    )
  }

  // Filtrar NCs
  const ncsFiltradas = ncs.filter(nc => {
    if (filtroEstado && nc.estado !== filtroEstado) return false
    if (filtroGravidade && nc.gravidade !== filtroGravidade) return false
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase()
      if (!(nc.titulo || '').toLowerCase().includes(busca) &&
          !(nc.descricao || '').toLowerCase().includes(busca) &&
          !(nc.codigo || '').toLowerCase().includes(busca)) return false
    }
    return true
  })

  // Agrupar por especialidade
  const ncsPorEspecialidade = especialidades.reduce((acc, esp) => {
    const ncsEsp = ncsFiltradas.filter(nc => nc.especialidade_id === esp.id)
    if (ncsEsp.length > 0) {
      acc[esp.id] = { especialidade: esp, ncs: ncsEsp }
    }
    return acc
  }, {})

  // NCs sem especialidade
  const ncsSemEspecialidade = ncsFiltradas.filter(nc => !nc.especialidade_id)

  // Estatísticas
  const stats = {
    total: ncs.length,
    abertas: ncs.filter(nc => nc.estado === 'aberta').length,
    emResolucao: ncs.filter(nc => nc.estado === 'em_resolucao').length,
    resolvidas: ncs.filter(nc => ['resolvida', 'verificada', 'encerrada'].includes(nc.estado)).length,
    criticas: ncs.filter(nc => nc.gravidade === 'critica' && nc.estado === 'aberta').length
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
        <Loader2 className="spin" size={24} style={{ marginBottom: '8px' }} />
        <p>A carregar não conformidades...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 300px)', minHeight: '500px' }}>
      {/* Painel esquerdo - Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
              Não Conformidades
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--brown-light)' }}>
              {stats.total} total • {stats.abertas} abertas • {stats.criticas > 0 && <span style={{ color: '#EF4444' }}>{stats.criticas} críticas</span>}
            </p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="btn btn-primary">
            <Plus size={16} /> Nova NC
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: '#FEE2E2', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#EF4444' }}>{stats.abertas}</div>
            <div style={{ fontSize: '11px', color: '#B91C1C' }}>Abertas</div>
          </div>
          <div style={{ padding: '12px', background: '#FEF3C7', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#F59E0B' }}>{stats.emResolucao}</div>
            <div style={{ fontSize: '11px', color: '#B45309' }}>Em Resolução</div>
          </div>
          <div style={{ padding: '12px', background: '#D1FAE5', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>{stats.resolvidas}</div>
            <div style={{ fontSize: '11px', color: '#047857' }}>Resolvidas</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--stone)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brown)' }}>{stats.total}</div>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Total</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="card" style={{ padding: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '150px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={filtroBusca}
              onChange={e => setFiltroBusca(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px', fontSize: '12px', padding: '8px 8px 8px 32px' }}
            />
          </div>

          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            style={{ fontSize: '12px', minWidth: '120px', padding: '8px' }}
          >
            <option value="">Todos estados</option>
            {Object.entries(ESTADOS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filtroGravidade}
            onChange={e => setFiltroGravidade(e.target.value)}
            style={{ fontSize: '12px', minWidth: '120px', padding: '8px' }}
          >
            <option value="">Todas gravidades</option>
            {Object.entries(GRAVIDADES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Lista por Especialidade */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {ncsFiltradas.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <AlertTriangle size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ color: 'var(--brown-light)', marginBottom: '8px' }}>Sem não conformidades</p>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Registar não conformidades para acompanhamento de qualidade</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(ncsPorEspecialidade).map(([espId, { especialidade, ncs: ncsEsp }]) => (
                <div key={espId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Header da especialidade */}
                  <button
                    onClick={() => toggleEspecialidade(espId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '12px 16px',
                      background: 'var(--cream)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {expandedEspecialidades.includes(espId) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      background: especialidade.cor
                    }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '13px' }}>{especialidade.nome}</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'var(--stone)',
                      color: 'var(--brown)'
                    }}>
                      {ncsEsp.length}
                    </span>
                  </button>

                  {/* Lista de NCs */}
                  {expandedEspecialidades.includes(espId) && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {ncsEsp.map(nc => (
                        <NCListItem
                          key={nc.id}
                          nc={nc}
                          isSelected={selectedNC?.id === nc.id}
                          onSelect={() => setSelectedNC(nc)}
                          onEdit={() => handleEdit(nc)}
                          onDelete={() => handleDelete(nc)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* NCs sem especialidade */}
              {ncsSemEspecialidade.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--cream)',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--brown-light)'
                  }}>
                    Sem Especialidade ({ncsSemEspecialidade.length})
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {ncsSemEspecialidade.map(nc => (
                      <NCListItem
                        key={nc.id}
                        nc={nc}
                        isSelected={selectedNC?.id === nc.id}
                        onSelect={() => setSelectedNC(nc)}
                        onEdit={() => handleEdit(nc)}
                        onDelete={() => handleDelete(nc)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Painel direito - Detalhes */}
      {selectedNC && (
        <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <NCDetailPanel
            nc={selectedNC}
            onClose={() => setSelectedNC(null)}
            onEdit={() => handleEdit(selectedNC)}
            onEstadoChange={(novoEstado) => handleEstadoChange(selectedNC, novoEstado)}
            formatDate={formatDate}
          />
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>{editingNC ? 'Editar Não Conformidade' : 'Nova Não Conformidade'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Descrição breve do problema..."
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                  Descrição *
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o desvio identificado com detalhes..."
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Especialidade
                  </label>
                  <select
                    value={formData.especialidade_id}
                    onChange={e => setFormData({ ...formData, especialidade_id: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="">Selecionar...</option>
                    {especialidades.map(esp => (
                      <option key={esp.id} value={esp.id}>{esp.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Zona
                  </label>
                  <select
                    value={formData.zona_id}
                    onChange={e => setFormData({ ...formData, zona_id: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="">Selecionar...</option>
                    {zonas.map(zona => (
                      <option key={zona.id} value={zona.id}>{zona.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Tipo
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    {TIPOS_NC.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Gravidade
                  </label>
                  <select
                    value={formData.gravidade}
                    onChange={e => setFormData({ ...formData, gravidade: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    {Object.entries(GRAVIDADES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Data Identificação
                  </label>
                  <input
                    type="date"
                    value={formData.data_identificacao}
                    onChange={e => setFormData({ ...formData, data_identificacao: e.target.value })}
                    style={{ width: '100%' }}
                    disabled={editingNC}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Data Limite Resolução
                  </label>
                  <input
                    type="date"
                    value={formData.data_limite_resolucao}
                    onChange={e => setFormData({ ...formData, data_limite_resolucao: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                  Responsável pela Resolução
                </label>
                <input
                  type="text"
                  value={formData.responsavel_resolucao}
                  onChange={e => setFormData({ ...formData, responsavel_resolucao: e.target.value })}
                  placeholder="Nome ou empresa responsável..."
                  style={{ width: '100%' }}
                />
              </div>

              {editingNC && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                      Ação Corretiva
                    </label>
                    <textarea
                      value={formData.acao_corretiva}
                      onChange={e => setFormData({ ...formData, acao_corretiva: e.target.value })}
                      placeholder="Descreva a ação corretiva a implementar..."
                      rows={3}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                      Ação Preventiva
                    </label>
                    <textarea
                      value={formData.acao_preventiva}
                      onChange={e => setFormData({ ...formData, acao_preventiva: e.target.value })}
                      placeholder="Medidas para evitar recorrência..."
                      rows={2}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-outline">
                Cancelar
              </button>
              <button
                onClick={editingNC ? handleUpdate : handleCreate}
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? <Loader2 className="spin" size={14} /> : null}
                {editingNC ? 'Guardar' : 'Criar NC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para item da lista
function NCListItem({ nc, isSelected, onSelect, onEdit, onDelete }) {
  const gravidade = GRAVIDADES[nc.gravidade] || GRAVIDADES.maior
  const estado = ESTADOS[nc.estado] || ESTADOS.aberta
  const EstadoIcon = estado.icon

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: isSelected ? 'var(--cream)' : 'white',
        transition: 'background 0.15s'
      }}
    >
      {/* Indicador de gravidade */}
      <div style={{
        width: '4px',
        height: '40px',
        borderRadius: '2px',
        background: gravidade.cor
      }} />

      {/* Conteúdo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', fontFamily: 'monospace' }}>
            {nc.codigo}
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 500,
            background: `${estado.cor}20`,
            color: estado.cor
          }}>
            <EstadoIcon size={10} />
            {estado.label}
          </span>
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {nc.titulo}
        </div>
        {nc.zona && (
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>
            {nc.zona.nome}
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon" onClick={onEdit} style={{ padding: '4px' }}>
          <Edit2 size={14} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onDelete} style={{ padding: '4px', color: 'var(--error)' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// Componente para painel de detalhes
function NCDetailPanel({ nc, onClose, onEdit, onEstadoChange, formatDate }) {
  const gravidade = GRAVIDADES[nc.gravidade] || GRAVIDADES.maior
  const estado = ESTADOS[nc.estado] || ESTADOS.aberta
  const EstadoIcon = estado.icon

  // Determinar próximos estados possíveis
  const getProximosEstados = () => {
    switch (nc.estado) {
      case 'aberta': return ['em_resolucao']
      case 'em_resolucao': return ['resolvida', 'aberta']
      case 'resolvida': return ['verificada', 'em_resolucao']
      case 'verificada': return ['encerrada']
      default: return []
    }
  }

  const proximosEstados = getProximosEstados()

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', fontFamily: 'monospace' }}>
            {nc.codigo}
          </span>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
        <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>{nc.titulo}</h4>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            background: `${estado.cor}20`,
            color: estado.cor
          }}>
            <EstadoIcon size={12} />
            {estado.label}
          </span>
          <span style={{
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            background: `${gravidade.cor}20`,
            color: gravidade.cor
          }}>
            {gravidade.label}
          </span>
          {nc.especialidade && (
            <span style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              background: `${nc.especialidade.cor}20`,
              color: nc.especialidade.cor
            }}>
              {nc.especialidade.nome}
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Descrição */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
            Descrição
          </label>
          <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{nc.descricao}</p>
        </div>

        {/* Datas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
              Identificada
            </label>
            <span style={{ fontSize: '13px' }}>{formatDate(nc.data_identificacao)}</span>
          </div>
          {nc.data_limite_resolucao && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
                Prazo
              </label>
              <span style={{ fontSize: '13px' }}>{formatDate(nc.data_limite_resolucao)}</span>
            </div>
          )}
        </div>

        {/* Responsável */}
        {nc.responsavel_resolucao && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
              Responsável
            </label>
            <span style={{ fontSize: '13px' }}>{nc.responsavel_resolucao}</span>
          </div>
        )}

        {/* Zona */}
        {nc.zona && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
              Zona
            </label>
            <span style={{ fontSize: '13px' }}>{nc.zona.nome}</span>
          </div>
        )}

        {/* Ação Corretiva */}
        {nc.acao_corretiva && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
              Ação Corretiva
            </label>
            <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5, padding: '8px', background: 'var(--cream)', borderRadius: '6px' }}>
              {nc.acao_corretiva}
            </p>
          </div>
        )}

        {/* Ação Preventiva */}
        {nc.acao_preventiva && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
              Ação Preventiva
            </label>
            <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5, padding: '8px', background: 'var(--cream)', borderRadius: '6px' }}>
              {nc.acao_preventiva}
            </p>
          </div>
        )}
      </div>

      {/* Footer com ações */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={onEdit} className="btn btn-outline" style={{ flex: 1 }}>
            <Edit2 size={14} /> Editar
          </button>
          {proximosEstados.map(novoEstado => {
            const novoEstadoConfig = ESTADOS[novoEstado]
            return (
              <button
                key={novoEstado}
                onClick={() => onEstadoChange(novoEstado)}
                className="btn btn-primary"
                style={{ flex: 1, background: novoEstadoConfig.cor }}
              >
                <ArrowRight size={14} /> {novoEstadoConfig.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
