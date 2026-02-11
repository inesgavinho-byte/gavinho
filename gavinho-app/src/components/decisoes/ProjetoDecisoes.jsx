import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  Search, Plus, Filter, AlertCircle, Mail, Mic, MessageSquare, Edit3,
  ChevronRight, ArrowRight, ArrowLeft, Check, XCircle, X, ExternalLink,
  Clock, Calendar, Euro, Building, Tag, Loader2, FileText, Sparkles
} from 'lucide-react'

// Configurações de tipos e impactos
const TIPO_CONFIG = {
  design: { label: 'Design', color: '#E0E7FF', text: '#4338CA', icon: '🎨' },
  material: { label: 'Material', color: '#FEF3C7', text: '#D97706', icon: '🪨' },
  tecnico: { label: 'Técnico', color: '#DCFCE7', text: '#16A34A', icon: '🔧' },
  financeiro: { label: 'Financeiro', color: '#FCE7F3', text: '#DB2777', icon: '💰' },
  prazo: { label: 'Prazo', color: '#E0E7FF', text: '#4338CA', icon: '📅' },
  fornecedor: { label: 'Fornecedor', color: '#F3E8FF', text: '#9333EA', icon: '🚚' },
  alteracao: { label: 'Alteração', color: '#FEE2E2', text: '#DC2626', icon: '🔄' }
}

const IMPACTO_CONFIG = {
  critico: { label: 'Crítico', color: '#EF4444', bg: '#FEE2E2' },
  alto: { label: 'Alto', color: '#F59E0B', bg: '#FEF3C7' },
  medio: { label: 'Médio', color: '#8B8670', bg: '#F5F3EF' },
  baixo: { label: 'Baixo', color: '#9CA3AF', bg: '#F3F4F6' }
}

const FONTE_CONFIG = {
  email: { icon: Mail, label: 'Email' },
  reuniao: { icon: Mic, label: 'Reunião' },
  chat: { icon: MessageSquare, label: 'Chat' },
  manual: { icon: Edit3, label: 'Manual' }
}

export default function ProjetoDecisoes({ projetoId }) {
  const toast = useToast()
  const { profile } = useAuth()

  // Estados principais
  const [decisoes, setDecisoes] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Navegação
  const [view, setView] = useState('list') // 'list', 'detail', 'validar', 'nova'
  const [selectedDecisao, setSelectedDecisao] = useState(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroImpacto, setFiltroImpacto] = useState('todos')

  // Formulário nova decisão
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'material',
    impacto: 'medio',
    decidido_por: '',
    decidido_por_tipo: 'cliente',
    data_decisao: new Date().toISOString().split('T')[0],
    impacto_orcamento: '',
    impacto_prazo_dias: '',
    divisao: '',
    justificacao: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (projetoId) {
      fetchDecisoes()
      fetchPendentes()
    }
  }, [projetoId])

  useEffect(() => {
    if (projetoId) {
      fetchDecisoes()
    }
  }, [filtroTipo, filtroImpacto, search])

  const fetchDecisoes = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('decisoes')
        .select('*')
        .eq('projeto_id', projetoId)
        .eq('estado', 'validada')
        .order('data_decisao', { ascending: false })

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }
      if (filtroImpacto !== 'todos') {
        query = query.eq('impacto', filtroImpacto)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Filtrar por pesquisa local
      let filtered = data || []
      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(d =>
          d.titulo.toLowerCase().includes(searchLower) ||
          d.descricao.toLowerCase().includes(searchLower) ||
          d.decidido_por.toLowerCase().includes(searchLower)
        )
      }

      setDecisoes(filtered)
    } catch (err) {
      // Table may not exist yet
    } finally {
      setLoading(false)
    }
  }

  const fetchPendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('decisoes')
        .select('*')
        .eq('projeto_id', projetoId)
        .eq('estado', 'sugerida')
        .order('created_at', { ascending: false })

      if (!error) {
        setPendentes(data || [])
      }
    } catch (err) {
      // Table may not exist yet
    }
  }

  const handleSelectDecisao = async (decisao) => {
    setSelectedDecisao(decisao)
    setView('detail')

    // Carregar histórico
    const { data: historico } = await supabase
      .from('decisoes_historico')
      .select('*')
      .eq('decisao_id', decisao.id)
      .order('alterado_em', { ascending: false })

    setSelectedDecisao(prev => ({ ...prev, historico: historico || [] }))
  }

  const handleAprovar = async (id) => {
    try {
      const utilizadorId = profile?.id

      const { error } = await supabase
        .from('decisoes')
        .update({
          estado: 'validada',
          aprovado_por: utilizadorId
        })
        .eq('id', id)

      if (error) throw error

      // Registar no histórico
      await supabase.from('decisoes_historico').insert({
        decisao_id: id,
        campo_alterado: 'estado',
        valor_anterior: 'sugerida',
        valor_novo: 'validada',
        alterado_por: utilizadorId,
        motivo: 'Aprovada manualmente'
      })

      fetchDecisoes()
      fetchPendentes()
    } catch (err) {
      console.error('Erro ao aprovar:', err)
      toast.error('Erro', 'Erro ao aprovar decisão')
    }
  }

  const handleRejeitar = async (id) => {
    try {
      const utilizadorId = profile?.id

      const { error } = await supabase
        .from('decisoes')
        .update({ estado: 'rejeitada' })
        .eq('id', id)

      if (error) throw error

      await supabase.from('decisoes_historico').insert({
        decisao_id: id,
        campo_alterado: 'estado',
        valor_anterior: 'sugerida',
        valor_novo: 'rejeitada',
        alterado_por: utilizadorId,
        motivo: 'Não é uma decisão válida'
      })

      fetchPendentes()
    } catch (err) {
      console.error('Erro ao rejeitar:', err)
      toast.error('Erro', 'Erro ao rejeitar decisão')
    }
  }

  const handleCriarDecisao = async (e) => {
    e.preventDefault()
    if (!formData.titulo || !formData.descricao || !formData.decidido_por) {
      toast.warning('Aviso', 'Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    try {
      const utilizadorId = profile?.id

      const { error } = await supabase
        .from('decisoes')
        .insert({
          projeto_id: projetoId,
          titulo: formData.titulo,
          descricao: formData.descricao,
          tipo: formData.tipo,
          impacto: formData.impacto,
          decidido_por: formData.decidido_por,
          decidido_por_tipo: formData.decidido_por_tipo,
          data_decisao: formData.data_decisao,
          impacto_orcamento: formData.impacto_orcamento ? parseFloat(formData.impacto_orcamento) : null,
          impacto_prazo_dias: formData.impacto_prazo_dias ? parseInt(formData.impacto_prazo_dias) : null,
          divisao: formData.divisao || null,
          justificacao: formData.justificacao || null,
          fonte: 'manual',
          estado: 'validada',
          aprovado_por: utilizadorId,
          created_by: utilizadorId
        })

      if (error) throw error

      // Reset form
      setFormData({
        titulo: '',
        descricao: '',
        tipo: 'material',
        impacto: 'medio',
        decidido_por: '',
        decidido_por_tipo: 'cliente',
        data_decisao: new Date().toISOString().split('T')[0],
        impacto_orcamento: '',
        impacto_prazo_dias: '',
        divisao: '',
        justificacao: ''
      })

      setView('list')
      fetchDecisoes()
    } catch (err) {
      console.error('Erro ao criar:', err)
      toast.error('Erro', 'Erro ao criar decisão')
    } finally {
      setSaving(false)
    }
  }

  // Agrupar decisões por mês
  const decisoesPorMes = decisoes.reduce((acc, d) => {
    const mes = new Date(d.data_decisao).toLocaleDateString('pt-PT', {
      month: 'long',
      year: 'numeric'
    })
    if (!acc[mes]) acc[mes] = []
    acc[mes].push(d)
    return acc
  }, {})

  // Formatar valores
  const formatCurrency = (value) => {
    if (!value) return null
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Estilos
  const styles = {
    container: {
      padding: '24px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      fontSize: '20px',
      fontWeight: 600,
      color: 'var(--brown)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '10px 16px',
      backgroundColor: 'var(--brown)',
      color: 'var(--white)',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500
    },
    searchBar: {
      display: 'flex',
      gap: '12px',
      marginBottom: '16px',
      flexWrap: 'wrap'
    },
    searchInput: {
      flex: 1,
      minWidth: '200px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 14px',
      backgroundColor: 'var(--white)',
      border: '1px solid var(--stone)',
      borderRadius: '8px'
    },
    input: {
      flex: 1,
      border: 'none',
      outline: 'none',
      fontSize: '14px',
      color: 'var(--brown)'
    },
    filterSelect: {
      padding: '10px 14px',
      border: '1px solid var(--stone)',
      borderRadius: '8px',
      fontSize: '13px',
      color: 'var(--brown)',
      backgroundColor: 'var(--white)',
      cursor: 'pointer'
    },
    pendentesAlert: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '14px 18px',
      backgroundColor: '#FEF3C7',
      borderRadius: '10px',
      marginBottom: '24px',
      border: '1px solid #FDE68A'
    },
    pendentesText: {
      flex: 1,
      fontSize: '14px',
      color: '#92400E',
      fontWeight: 500
    },
    validarButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      backgroundColor: '#D97706',
      color: 'var(--white)',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500
    },
    mesHeader: {
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '1.5px',
      color: 'var(--brown-light)',
      marginBottom: '12px',
      marginTop: '24px',
      textTransform: 'uppercase'
    },
    card: {
      backgroundColor: 'var(--white)',
      borderRadius: '10px',
      padding: '18px',
      marginBottom: '12px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      border: '1px solid var(--stone)'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    },
    codigo: {
      fontSize: '11px',
      fontWeight: 700,
      color: 'var(--brown-light)',
      letterSpacing: '0.5px'
    },
    data: {
      fontSize: '12px',
      color: 'var(--brown-light)'
    },
    cardTitle: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--brown)',
      marginBottom: '12px',
      lineHeight: 1.4
    },
    cardMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '12px'
    },
    tag: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 600
    },
    cardFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px',
      color: 'var(--brown-light)',
      paddingTop: '12px',
      borderTop: '1px solid var(--stone)'
    },
    fonte: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 40px',
      color: 'var(--brown-light)'
    },
    // Detail view styles
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'none',
      border: 'none',
      color: 'var(--brown-light)',
      cursor: 'pointer',
      marginBottom: '20px',
      fontSize: '13px',
      padding: 0
    },
    detailHeader: {
      marginBottom: '24px'
    },
    detailTitle: {
      fontSize: '22px',
      fontWeight: 600,
      color: 'var(--brown)',
      marginBottom: '16px',
      lineHeight: 1.3
    },
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px'
    },
    detailCard: {
      backgroundColor: 'var(--white)',
      borderRadius: '10px',
      padding: '18px',
      border: '1px solid var(--stone)'
    },
    detailCardTitle: {
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '1px',
      color: 'var(--brown-light)',
      marginBottom: '14px',
      textTransform: 'uppercase'
    },
    field: {
      marginBottom: '14px'
    },
    fieldLabel: {
      fontSize: '12px',
      color: 'var(--brown-light)',
      marginBottom: '4px'
    },
    fieldValue: {
      fontSize: '14px',
      color: 'var(--brown)',
      fontWeight: 500
    },
    excerto: {
      fontSize: '13px',
      color: 'var(--brown)',
      fontStyle: 'italic',
      borderLeft: '3px solid var(--brown-light)',
      paddingLeft: '14px',
      marginTop: '8px',
      lineHeight: 1.6
    },
    timeline: {
      marginTop: '12px'
    },
    timelineItem: {
      display: 'flex',
      gap: '12px',
      padding: '10px 0',
      borderBottom: '1px solid var(--stone)',
      fontSize: '13px'
    },
    timelineDate: {
      color: 'var(--brown-light)',
      minWidth: '100px'
    },
    timelineEvent: {
      color: 'var(--brown)'
    },
    // Form styles
    form: {
      maxWidth: '600px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    formLabel: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--brown)',
      marginBottom: '6px'
    },
    formInput: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid var(--stone)',
      borderRadius: '8px',
      fontSize: '14px',
      color: 'var(--brown)'
    },
    formTextarea: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid var(--stone)',
      borderRadius: '8px',
      fontSize: '14px',
      color: 'var(--brown)',
      minHeight: '100px',
      resize: 'vertical'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    formActions: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px'
    },
    cancelButton: {
      padding: '10px 20px',
      backgroundColor: 'var(--white)',
      color: 'var(--brown)',
      border: '1px solid var(--stone)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    submitButton: {
      padding: '10px 20px',
      backgroundColor: 'var(--brown)',
      color: 'var(--white)',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    // Validação styles
    validacaoCard: {
      backgroundColor: 'var(--white)',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid var(--stone)'
    },
    validacaoFonte: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: 'var(--brown-light)',
      marginBottom: '16px'
    },
    validacaoBox: {
      backgroundColor: 'var(--cream)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px'
    },
    validacaoActions: {
      display: 'flex',
      gap: '10px'
    },
    aprovarBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 16px',
      backgroundColor: '#10B981',
      color: 'var(--white)',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500
    },
    rejeitarBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 16px',
      backgroundColor: 'var(--white)',
      color: '#EF4444',
      border: '1px solid #FEE2E2',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500
    }
  }

  // Render: Loading
  if (loading && decisoes.length === 0 && view === 'list') {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <Loader2 size={32} className="spin" style={{ marginBottom: '16px' }} />
          <p>A carregar decisões...</p>
        </div>
      </div>
    )
  }

  // Render: Nova Decisão
  if (view === 'nova') {
    return (
      <div style={styles.container}>
        <button onClick={() => setView('list')} style={styles.backButton}>
          <ArrowLeft size={16} />
          Voltar
        </button>

        <h2 style={{ ...styles.title, marginBottom: '24px' }}>
          <Plus size={20} />
          Nova Decisão
        </h2>

        <form onSubmit={handleCriarDecisao} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Título *</label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Mármore Calacatta para bancada WC"
              style={styles.formInput}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Descrição *</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição completa da decisão..."
              style={styles.formTextarea}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Tipo *</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                style={styles.formInput}
              >
                {Object.entries(TIPO_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Impacto *</label>
              <select
                value={formData.impacto}
                onChange={(e) => setFormData({ ...formData, impacto: e.target.value })}
                style={styles.formInput}
              >
                {Object.entries(IMPACTO_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Decidido por *</label>
              <input
                type="text"
                value={formData.decidido_por}
                onChange={(e) => setFormData({ ...formData, decidido_por: e.target.value })}
                placeholder="Nome de quem decidiu"
                style={styles.formInput}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Tipo de decisor</label>
              <select
                value={formData.decidido_por_tipo}
                onChange={(e) => setFormData({ ...formData, decidido_por_tipo: e.target.value })}
                style={styles.formInput}
              >
                <option value="cliente">Cliente</option>
                <option value="gavinho">GAVINHO</option>
                <option value="conjunto">Conjunto</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Data da decisão</label>
              <input
                type="date"
                value={formData.data_decisao}
                onChange={(e) => setFormData({ ...formData, data_decisao: e.target.value })}
                style={styles.formInput}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Divisão/Zona</label>
              <input
                type="text"
                value={formData.divisao}
                onChange={(e) => setFormData({ ...formData, divisao: e.target.value })}
                placeholder="Ex: Cozinha, WC Suite"
                style={styles.formInput}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Impacto financeiro (€)</label>
              <input
                type="number"
                value={formData.impacto_orcamento}
                onChange={(e) => setFormData({ ...formData, impacto_orcamento: e.target.value })}
                placeholder="Ex: 3200 ou -500"
                style={styles.formInput}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Impacto no prazo (dias)</label>
              <input
                type="number"
                value={formData.impacto_prazo_dias}
                onChange={(e) => setFormData({ ...formData, impacto_prazo_dias: e.target.value })}
                placeholder="Ex: 15 ou -5"
                style={styles.formInput}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Justificação</label>
            <textarea
              value={formData.justificacao}
              onChange={(e) => setFormData({ ...formData, justificacao: e.target.value })}
              placeholder="Razão para esta decisão..."
              style={{ ...styles.formTextarea, minHeight: '80px' }}
            />
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={() => setView('list')} style={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={styles.submitButton}>
              {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
              {saving ? 'A guardar...' : 'Criar Decisão'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Render: Validação
  if (view === 'validar') {
    return (
      <div style={styles.container}>
        <button onClick={() => setView('list')} style={styles.backButton}>
          <ArrowLeft size={16} />
          Voltar
        </button>

        <h2 style={{ ...styles.title, marginBottom: '24px' }}>
          <AlertCircle size={20} color="#D97706" />
          Decisões para Validar ({pendentes.length})
        </h2>

        {pendentes.length === 0 ? (
          <div style={styles.emptyState}>
            <Check size={48} color="#10B981" style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '16px' }}>Todas as decisões estão validadas!</p>
          </div>
        ) : (
          pendentes.map(sugestao => {
            const tipoConfig = TIPO_CONFIG[sugestao.tipo]
            const impactoConfig = IMPACTO_CONFIG[sugestao.impacto]
            const FonteIcon = FONTE_CONFIG[sugestao.fonte]?.icon || FileText

            return (
              <div key={sugestao.id} style={styles.validacaoCard}>
                <div style={styles.validacaoFonte}>
                  <FonteIcon size={14} />
                  <span>{FONTE_CONFIG[sugestao.fonte]?.label} de {sugestao.decidido_por}</span>
                  <span style={{ marginLeft: 'auto' }}>
                    {new Date(sugestao.created_at).toLocaleDateString('pt-PT', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div style={styles.validacaoBox}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>
                    {sugestao.titulo}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <span style={{
                      ...styles.tag,
                      backgroundColor: tipoConfig.color,
                      color: tipoConfig.text
                    }}>
                      {tipoConfig.icon} {tipoConfig.label}
                    </span>
                    <span style={{
                      ...styles.tag,
                      backgroundColor: impactoConfig.bg,
                      color: impactoConfig.color
                    }}>
                      {impactoConfig.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--brown)', marginBottom: '8px' }}>
                    {sugestao.descricao}
                  </div>

                  {sugestao.impacto_orcamento && (
                    <div style={{ fontSize: '13px', color: 'var(--brown)' }}>
                      💰 {sugestao.impacto_orcamento > 0 ? '+' : ''}{formatCurrency(sugestao.impacto_orcamento)}
                    </div>
                  )}

                  {sugestao.fonte_excerto && (
                    <div style={styles.excerto}>
                      "{sugestao.fonte_excerto}"
                    </div>
                  )}
                </div>

                <div style={styles.validacaoActions}>
                  <button onClick={() => handleAprovar(sugestao.id)} style={styles.aprovarBtn}>
                    <Check size={14} /> Aprovar
                  </button>
                  <button onClick={() => handleRejeitar(sugestao.id)} style={styles.rejeitarBtn}>
                    <XCircle size={14} /> Não é decisão
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  // Render: Detalhe
  if (view === 'detail' && selectedDecisao) {
    const tipoConfig = TIPO_CONFIG[selectedDecisao.tipo]
    const impactoConfig = IMPACTO_CONFIG[selectedDecisao.impacto]
    const FonteIcon = FONTE_CONFIG[selectedDecisao.fonte]?.icon || FileText

    return (
      <div style={styles.container}>
        <button onClick={() => { setView('list'); setSelectedDecisao(null) }} style={styles.backButton}>
          <ArrowLeft size={16} />
          Voltar às decisões
        </button>

        <div style={styles.detailHeader}>
          <div style={styles.codigo}>{selectedDecisao.codigo}</div>
          <h2 style={styles.detailTitle}>{selectedDecisao.titulo}</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              ...styles.tag,
              backgroundColor: tipoConfig.color,
              color: tipoConfig.text
            }}>
              {tipoConfig.icon} {tipoConfig.label}
            </span>
            <span style={{
              ...styles.tag,
              backgroundColor: impactoConfig.bg,
              color: impactoConfig.color
            }}>
              {impactoConfig.label}
            </span>
            {selectedDecisao.impacto_orcamento && (
              <span style={{ ...styles.tag, backgroundColor: '#F0FDF4', color: '#166534' }}>
                💰 {selectedDecisao.impacto_orcamento > 0 ? '+' : ''}{formatCurrency(selectedDecisao.impacto_orcamento)}
              </span>
            )}
            {selectedDecisao.impacto_prazo_dias && (
              <span style={{ ...styles.tag, backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                📅 {selectedDecisao.impacto_prazo_dias > 0 ? '+' : ''}{selectedDecisao.impacto_prazo_dias} dias
              </span>
            )}
          </div>
        </div>

        <div style={styles.detailGrid}>
          {/* Detalhes */}
          <div style={styles.detailCard}>
            <h3 style={styles.detailCardTitle}>Detalhes</h3>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Data da decisão</div>
              <div style={styles.fieldValue}>{formatDate(selectedDecisao.data_decisao)}</div>
            </div>
            <div style={styles.field}>
              <div style={styles.fieldLabel}>Decidido por</div>
              <div style={styles.fieldValue}>
                {selectedDecisao.decidido_por}
                <span style={{ color: 'var(--brown-light)', fontWeight: 400 }}>
                  {' '}({selectedDecisao.decidido_por_tipo})
                </span>
              </div>
            </div>
            {selectedDecisao.divisao && (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>Divisão/Zona</div>
                <div style={styles.fieldValue}>{selectedDecisao.divisao}</div>
              </div>
            )}
          </div>

          {/* Fonte */}
          <div style={styles.detailCard}>
            <h3 style={styles.detailCardTitle}>Fonte</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <FonteIcon size={16} />
              <span style={{ fontWeight: 500 }}>{FONTE_CONFIG[selectedDecisao.fonte]?.label}</span>
            </div>
            {selectedDecisao.fonte_excerto && (
              <div style={styles.excerto}>
                "{selectedDecisao.fonte_excerto}"
              </div>
            )}
          </div>

          {/* Descrição */}
          <div style={{ ...styles.detailCard, gridColumn: '1 / -1' }}>
            <h3 style={styles.detailCardTitle}>Descrição</h3>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brown)' }}>
              {selectedDecisao.descricao}
            </p>
          </div>

          {/* Justificação */}
          {selectedDecisao.justificacao && (
            <div style={{ ...styles.detailCard, gridColumn: '1 / -1' }}>
              <h3 style={styles.detailCardTitle}>Justificação</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brown)' }}>
                {selectedDecisao.justificacao}
              </p>
            </div>
          )}

          {/* Alternativas */}
          {selectedDecisao.alternativas_consideradas?.length > 0 && (
            <div style={{ ...styles.detailCard, gridColumn: '1 / -1' }}>
              <h3 style={styles.detailCardTitle}>Alternativas Consideradas</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {selectedDecisao.alternativas_consideradas.map((alt, i) => (
                  <li key={i} style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--brown)' }}>
                    <strong>{alt.opcao}</strong> — Rejeitada: {alt.motivo_rejeicao}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Histórico */}
          {selectedDecisao.historico?.length > 0 && (
            <div style={{ ...styles.detailCard, gridColumn: '1 / -1' }}>
              <h3 style={styles.detailCardTitle}>Histórico</h3>
              <div style={styles.timeline}>
                {selectedDecisao.historico.map((h, i) => (
                  <div key={i} style={styles.timelineItem}>
                    <span style={styles.timelineDate}>
                      {new Date(h.alterado_em).toLocaleDateString('pt-PT', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span style={styles.timelineEvent}>
                      {h.campo_alterado === 'estado' && h.valor_novo === 'validada'
                        ? 'Decisão validada'
                        : h.campo_alterado === 'estado' && h.valor_novo === 'sugerida'
                          ? 'Decisão sugerida pelo sistema'
                          : `${h.campo_alterado} alterado`}
                      {h.motivo && ` — ${h.motivo}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render: Lista
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>
          📋 Decisões
        </h2>
        <button onClick={() => setView('nova')} style={styles.addButton}>
          <Plus size={16} />
          Nova
        </button>
      </div>

      {/* Search & Filters */}
      <div style={styles.searchBar}>
        <div style={styles.searchInput}>
          <Search size={16} style={{ opacity: 0.5 }} />
          <input
            type="text"
            placeholder="Pesquisar decisões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="todos">Todos os tipos</option>
          {Object.entries(TIPO_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select
          value={filtroImpacto}
          onChange={(e) => setFiltroImpacto(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="todos">Todos os impactos</option>
          {Object.entries(IMPACTO_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Alerta de Pendentes */}
      {pendentes.length > 0 && (
        <div style={styles.pendentesAlert}>
          <AlertCircle size={18} color="#D97706" />
          <span style={styles.pendentesText}>
            {pendentes.length} {pendentes.length === 1 ? 'decisão aguarda' : 'decisões aguardam'} validação
          </span>
          <button onClick={() => setView('validar')} style={styles.validarButton}>
            Validar <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Lista */}
      {decisoes.length === 0 ? (
        <div style={styles.emptyState}>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhuma decisão registada</p>
          <p style={{ fontSize: '13px' }}>As decisões detectadas em emails aparecerão aqui para validação.</p>
        </div>
      ) : (
        Object.entries(decisoesPorMes).map(([mes, items]) => (
          <div key={mes}>
            <h3 style={styles.mesHeader}>{mes}</h3>
            {items.map(decisao => {
              const tipoConfig = TIPO_CONFIG[decisao.tipo]
              const impactoConfig = IMPACTO_CONFIG[decisao.impacto]
              const FonteIcon = FONTE_CONFIG[decisao.fonte]?.icon || FileText

              return (
                <div
                  key={decisao.id}
                  style={styles.card}
                  onClick={() => handleSelectDecisao(decisao)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brown-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--stone)'}
                >
                  <div style={styles.cardHeader}>
                    <span style={styles.codigo}>{decisao.codigo}</span>
                    <span style={styles.data}>
                      {new Date(decisao.data_decisao).toLocaleDateString('pt-PT', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>

                  <div style={styles.cardTitle}>{decisao.titulo}</div>

                  <div style={styles.cardMeta}>
                    <span style={{
                      ...styles.tag,
                      backgroundColor: tipoConfig.color,
                      color: tipoConfig.text
                    }}>
                      {tipoConfig.label}
                    </span>
                    <span style={{
                      ...styles.tag,
                      backgroundColor: impactoConfig.bg,
                      color: impactoConfig.color
                    }}>
                      {impactoConfig.label}
                    </span>
                    {decisao.impacto_orcamento && (
                      <span style={{ fontSize: '12px', color: 'var(--brown)' }}>
                        💰 {decisao.impacto_orcamento > 0 ? '+' : ''}{formatCurrency(decisao.impacto_orcamento)}
                      </span>
                    )}
                    {decisao.impacto_prazo_dias && (
                      <span style={{ fontSize: '12px', color: 'var(--brown)' }}>
                        📅 {decisao.impacto_prazo_dias > 0 ? '+' : ''}{decisao.impacto_prazo_dias} dias
                      </span>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <span>Decidido por: {decisao.decidido_por}</span>
                    <span style={styles.fonte}>
                      <FonteIcon size={12} />
                      {FONTE_CONFIG[decisao.fonte]?.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
