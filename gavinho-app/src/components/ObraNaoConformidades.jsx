import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  AlertTriangle, Plus, X, Calendar, MapPin, Edit2, Trash2,
  ChevronDown, ChevronRight, Clock, User, Camera, CheckCircle,
  ArrowRight, Loader2, Upload, AlertCircle, Search, Filter,
  FileText, Check, Image, Euro, Building2, Wrench, Zap, Hammer, Layers
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
  resolvida: { label: 'Resolvida', cor: '#10B981', icon: Check },
  verificada: { label: 'Verificada', cor: '#10B981', icon: CheckCircle },
  encerrada: { label: 'Encerrada', cor: '#6B7280', icon: FileText }
}

// Ícones por especialidade
const ESPECIALIDADE_ICONS = {
  'estrutura': Layers,
  'avac': Wrench,
  'eletrico': Zap,
  'carpintaria': Hammer,
  'default': Building2
}

const getEspecialidadeIcon = (nome) => {
  if (!nome) return ESPECIALIDADE_ICONS.default
  const key = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return ESPECIALIDADE_ICONS[key] || ESPECIALIDADE_ICONS.default
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
    acao_preventiva: '',
    artigo: '',
    valor_estimado: '',
    ref_proposta: '',
    especificacao_contratual: '',
    comunicado_por: ''
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
      acao_preventiva: '',
      artigo: '',
      valor_estimado: '',
      ref_proposta: '',
      especificacao_contratual: '',
      comunicado_por: ''
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
          estado: 'aberta',
          artigo: formData.artigo || null,
          valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
          ref_proposta: formData.ref_proposta || null,
          especificacao_contratual: formData.especificacao_contratual || null,
          comunicado_por: formData.comunicado_por || null
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
          acao_preventiva: formData.acao_preventiva || null,
          artigo: formData.artigo || null,
          valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
          ref_proposta: formData.ref_proposta || null,
          especificacao_contratual: formData.especificacao_contratual || null,
          comunicado_por: formData.comunicado_por || null
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
      acao_preventiva: nc.acao_preventiva || '',
      artigo: nc.artigo || '',
      valor_estimado: nc.valor_estimado || '',
      ref_proposta: nc.ref_proposta || '',
      especificacao_contratual: nc.especificacao_contratual || '',
      comunicado_por: nc.comunicado_por || ''
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
    resolvidas: ncs.filter(nc => nc.estado === 'resolvida').length,
    verificadas: ncs.filter(nc => nc.estado === 'verificada').length,
    criticas: ncs.filter(nc => nc.gravidade === 'critica' && nc.estado === 'aberta').length
  }

  // Contar NCs por estado por especialidade
  const getEspecialidadeStats = (espId) => {
    const ncsEsp = ncs.filter(nc => nc.especialidade_id === espId)
    return {
      abertas: ncsEsp.filter(nc => nc.estado === 'aberta').length,
      emResolucao: ncsEsp.filter(nc => nc.estado === 'em_resolucao').length,
      resolvidas: ncsEsp.filter(nc => ['resolvida', 'verificada'].includes(nc.estado)).length
    }
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
        {/* Header com título e contadores */}
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                Não Conformidades
              </h3>
              {/* Status counters com dots coloridos */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  Abertas: {stats.abertas}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  Em Resolução: {stats.emResolucao}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  Resolvidas: {stats.resolvidas}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  Verificadas: {stats.verificadas}
                </span>
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Registar NC
            </button>
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
              {Object.entries(ncsPorEspecialidade).map(([espId, { especialidade, ncs: ncsEsp }]) => {
                const EspIcon = getEspecialidadeIcon(especialidade.nome)
                const espStats = getEspecialidadeStats(espId)

                return (
                <div key={espId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Header da especialidade */}
                  <button
                    onClick={() => toggleEspecialidade(espId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '14px 16px',
                      background: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderLeft: `4px solid ${especialidade.cor || '#8B8670'}`
                    }}
                  >
                    {/* Ícone da especialidade */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: `${especialidade.cor || '#8B8670'}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: especialidade.cor || '#8B8670'
                    }}>
                      <EspIcon size={18} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>{especialidade.nome}</div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{ncsEsp.length} não conformidades</div>
                    </div>

                    {/* Badges de contagem por estado */}
                    <div style={{ display: 'flex', gap: '6px', marginRight: '8px' }}>
                      {espStats.abertas > 0 && (
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: '#FEE2E2', color: '#EF4444',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 600
                        }}>{espStats.abertas}</span>
                      )}
                      {espStats.emResolucao > 0 && (
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: '#FEF3C7', color: '#D97706',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 600
                        }}>{espStats.emResolucao}</span>
                      )}
                      {espStats.resolvidas > 0 && (
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: '#D1FAE5', color: '#10B981',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 600
                        }}>{espStats.resolvidas}</span>
                      )}
                    </div>

                    {expandedEspecialidades.includes(espId) ? <ChevronDown size={18} color="var(--brown-light)" /> : <ChevronRight size={18} color="var(--brown-light)" />}
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
              )})}


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
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
          >
            {/* Header do Modal */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid #E5E2D9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={20} color="#D97706" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#4A4637' }}>
                    {editingNC ? 'Editar Não Conformidade' : 'Nova Não Conformidade'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#8B8670' }}>
                    Registe os detalhes da não conformidade identificada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #E5E2D9',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8B8670'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo do Modal - Scrollable */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px 28px'
            }}>
              {/* Secção: Identificação */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  margin: '0 0 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#8B8670',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Identificação
                </h4>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    marginBottom: '6px',
                    display: 'block',
                    color: '#4A4637'
                  }}>
                    Título <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Descrição breve do problema..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #E5E2D9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    marginBottom: '6px',
                    display: 'block',
                    color: '#4A4637'
                  }}>
                    Descrição <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva o desvio identificado com detalhes..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #E5E2D9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Secção: Classificação */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  margin: '0 0 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#8B8670',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Classificação
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Especialidade
                    </label>
                    <select
                      value={formData.especialidade_id}
                      onChange={e => setFormData({ ...formData, especialidade_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Selecionar...</option>
                      {especialidades.map(esp => (
                        <option key={esp.id} value={esp.id}>{esp.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Zona / Local
                    </label>
                    <select
                      value={formData.zona_id}
                      onChange={e => setFormData({ ...formData, zona_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Selecionar...</option>
                      {zonas.map(zona => (
                        <option key={zona.id} value={zona.id}>{zona.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Tipo
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {TIPOS_NC.map(tipo => (
                        <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Gravidade
                    </label>
                    <select
                      value={formData.gravidade}
                      onChange={e => setFormData({ ...formData, gravidade: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {Object.entries(GRAVIDADES).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Secção: Prazos e Responsabilidade */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  margin: '0 0 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#8B8670',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Prazos e Responsabilidade
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Data Identificação
                    </label>
                    <input
                      type="date"
                      value={formData.data_identificacao}
                      onChange={e => setFormData({ ...formData, data_identificacao: e.target.value })}
                      disabled={editingNC}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: editingNC ? '#F5F5F3' : 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Data Limite Resolução
                    </label>
                    <input
                      type="date"
                      value={formData.data_limite_resolucao}
                      onChange={e => setFormData({ ...formData, data_limite_resolucao: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                    Responsável pela Resolução
                  </label>
                  <input
                    type="text"
                    value={formData.responsavel_resolucao}
                    onChange={e => setFormData({ ...formData, responsavel_resolucao: e.target.value })}
                    placeholder="Nome ou empresa responsável..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #E5E2D9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Secção: Informação Contratual */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  margin: '0 0 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#8B8670',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Informação Contratual
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Artigo (Caderno Encargos)
                    </label>
                    <input
                      type="text"
                      value={formData.artigo}
                      onChange={e => setFormData({ ...formData, artigo: e.target.value })}
                      placeholder="Ex: 1.4 - Peças lancil"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Valor Estimado (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_estimado}
                      onChange={e => setFormData({ ...formData, valor_estimado: e.target.value })}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Ref. Proposta
                    </label>
                    <input
                      type="text"
                      value={formData.ref_proposta}
                      onChange={e => setFormData({ ...formData, ref_proposta: e.target.value })}
                      placeholder="Ex: POP.003.2025 - Extras 08"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Comunicado por
                    </label>
                    <input
                      type="text"
                      value={formData.comunicado_por}
                      onChange={e => setFormData({ ...formData, comunicado_por: e.target.value })}
                      placeholder="Nome da empresa/entidade"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                    Especificação Contratual
                  </label>
                  <textarea
                    value={formData.especificacao_contratual}
                    onChange={e => setFormData({ ...formData, especificacao_contratual: e.target.value })}
                    placeholder="Texto do caderno de encargos relevante..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #E5E2D9',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Secção: Ações (apenas em edição) */}
              {editingNC && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    margin: '0 0 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#8B8670',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Ações de Resolução
                  </h4>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Ação Corretiva
                    </label>
                    <textarea
                      value={formData.acao_corretiva}
                      onChange={e => setFormData({ ...formData, acao_corretiva: e.target.value })}
                      placeholder="Descreva a ação corretiva a implementar..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block', color: '#4A4637' }}>
                      Ação Preventiva
                    </label>
                    <textarea
                      value={formData.acao_preventiva}
                      onChange={e => setFormData({ ...formData, acao_preventiva: e.target.value })}
                      placeholder="Medidas para evitar recorrência..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E2D9',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div style={{
              padding: '20px 28px',
              borderTop: '1px solid #E5E2D9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: '#FAFAF8'
            }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #E5E2D9',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#4A4637',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={editingNC ? handleUpdate : handleCreate}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#10B981',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving && <Loader2 className="spin" size={16} />}
                {editingNC ? 'Guardar Alterações' : 'Criar NC'}
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
  const estado = ESTADOS[nc.estado] || ESTADOS.aberta

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatCurrency = (value) => {
    if (!value) return null
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
  }

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: isSelected ? 'var(--cream)' : 'white',
        transition: 'background 0.15s'
      }}
    >
      {/* Indicador de estado (dot) */}
      <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: estado.cor,
        flexShrink: 0
      }} />

      {/* Conteúdo principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--brown)',
          marginBottom: '4px'
        }}>
          {nc.titulo}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--brown-light)' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{nc.codigo}</span>
          {nc.zona && (
            <>
              <span>·</span>
              <span>{nc.zona.nome}</span>
            </>
          )}
          {nc.artigo && (
            <>
              <span>·</span>
              <span>Art. {nc.artigo}</span>
            </>
          )}
        </div>
      </div>

      {/* Valor estimado */}
      {nc.valor_estimado && (
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--brown)',
          textAlign: 'right',
          minWidth: '80px'
        }}>
          {formatCurrency(nc.valor_estimado)}
        </div>
      )}

      {/* Data */}
      <div style={{
        fontSize: '12px',
        color: 'var(--brown-light)',
        textAlign: 'right',
        minWidth: '80px'
      }}>
        {formatDate(nc.data_identificacao)}
      </div>
    </div>
  )
}

// Componente para painel de detalhes
function NCDetailPanel({ nc, onClose, onEdit, onEstadoChange, formatDate }) {
  const estado = ESTADOS[nc.estado] || ESTADOS.aberta

  const formatCurrency = (value) => {
    if (!value) return null
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
  }

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

  // Determinar texto do botão principal
  const getMainAction = () => {
    if (nc.estado === 'aberta' || nc.estado === 'em_resolucao') return 'resolvida'
    if (nc.estado === 'resolvida') return 'verificada'
    return null
  }

  const mainAction = getMainAction()

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brown-light)' }}>
            {nc.codigo}
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 500,
            background: `${estado.cor}15`,
            color: estado.cor,
            border: `1px solid ${estado.cor}30`
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: estado.cor }} />
            {estado.label}
          </span>
        </div>
        <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: 'var(--brown)', lineHeight: 1.4 }}>{nc.titulo}</h4>
        {nc.zona && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--brown-light)' }}>
            <MapPin size={14} />
            {nc.zona.nome}
          </div>
        )}
      </div>

      {/* Conteúdo scrollável */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Secção: Informação */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h5 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Informação
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>Data</div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatDate(nc.data_identificacao)}</div>
            </div>
            {nc.artigo && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>Artigo</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{nc.artigo}</div>
              </div>
            )}
            {nc.ref_proposta && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>Ref. Proposta</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{nc.ref_proposta}</div>
              </div>
            )}
            {nc.valor_estimado && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>Valor Estimado</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{formatCurrency(nc.valor_estimado)}</div>
              </div>
            )}
            {nc.comunicado_por && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>Comunicado por</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{nc.comunicado_por}</div>
              </div>
            )}
          </div>
        </div>

        {/* Secção: Descrição do Problema */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h5 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Descrição do Problema
          </h5>
          <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6, color: 'var(--brown)' }}>{nc.descricao}</p>
        </div>

        {/* Secção: Especificação Contratual */}
        {nc.especificacao_contratual && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h5 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Especificação Contratual
            </h5>
            <div style={{
              padding: '16px',
              background: '#F0EDE5',
              borderRadius: '8px',
              borderLeft: '3px solid #8B8670',
              fontSize: '13px',
              fontStyle: 'italic',
              lineHeight: 1.6,
              color: 'var(--brown)'
            }}>
              "{nc.especificacao_contratual}"
            </div>
          </div>
        )}

        {/* Secção: Registo Fotográfico */}
        {nc.fotos && nc.fotos.length > 0 && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h5 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Registo Fotográfico
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {nc.fotos.map((foto, idx) => (
                <div key={idx} style={{
                  aspectRatio: '4/3',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'var(--stone)',
                  position: 'relative'
                }}>
                  <img
                    src={foto.url}
                    alt={foto.descricao || `Foto ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {foto.descricao && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '8px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      color: 'white',
                      fontSize: '11px'
                    }}>
                      {foto.descricao}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder para fotos quando não existem */}
        {(!nc.fotos || nc.fotos.length === 0) && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h5 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Registo Fotográfico
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {[1, 2].map(idx => (
                <div key={idx} style={{
                  aspectRatio: '4/3',
                  borderRadius: '8px',
                  background: 'var(--stone)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brown-light)'
                }}>
                  <Image size={24} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Secção: Pedido de Esclarecimentos */}
        {nc.esclarecimentos && nc.esclarecimentos.length > 0 && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h5 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pedido de Esclarecimentos
            </h5>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.8, color: 'var(--brown)' }}>
              {nc.esclarecimentos.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Secção: Ação Corretiva */}
        {nc.acao_corretiva && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h5 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ação Corretiva
            </h5>
            <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6, color: 'var(--brown)' }}>{nc.acao_corretiva}</p>
          </div>
        )}
      </div>

      {/* Footer com ações */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'white' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--brown)',
              cursor: 'pointer'
            }}
          >
            <Edit2 size={16} /> Editar
          </button>
          {mainAction && (
            <button
              onClick={() => onEstadoChange(mainAction)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                background: '#10B981',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <CheckCircle size={16} /> Marcar {ESTADOS[mainAction].label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
