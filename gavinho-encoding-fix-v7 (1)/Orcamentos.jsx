import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Plus, 
  Search,
  Filter,
  FileText,
  Euro,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  X,
  ChevronRight,
  ChevronDown,
  Copy,
  Send,
  Eye,
  Edit3,
  Trash2,
  Download,
  Building2,
  Calendar,
  User,
  Percent,
  Loader2
} from 'lucide-react'

const statusConfig = {
  rascunho: { label: 'Rascunho', color: 'var(--brown-light)', bg: 'var(--stone)' },
  em_revisao: { label: 'Em Revisão', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  enviado: { label: 'Enviado', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  aprovado: { label: 'Aprovado', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  rejeitado: { label: 'Rejeitado', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' },
  expirado: { label: 'Expirado', color: 'var(--brown-light)', bg: 'var(--stone)' }
}

const CAPITULOS_TEMPLATE = {
  completo: [
    { nome: 'Arquitetura & Design', percentagem: 10 },
    { nome: 'Construção Civil', percentagem: 40 },
    { nome: 'Instalações Técnicas', percentagem: 18 },
    { nome: 'Acabamentos', percentagem: 15 },
    { nome: 'Mobiliário & Equipamento', percentagem: 12 },
    { nome: 'Contingência', percentagem: 5 }
  ],
  design: [
    { nome: 'Conceito & Programa', percentagem: 15 },
    { nome: 'Projeto de Interiores', percentagem: 40 },
    { nome: 'Especificações Técnicas', percentagem: 20 },
    { nome: 'Acompanhamento', percentagem: 20 },
    { nome: 'Contingência', percentagem: 5 }
  ],
  remodelacao: [
    { nome: 'Demolições & Preparação', percentagem: 10 },
    { nome: 'Construção Civil', percentagem: 35 },
    { nome: 'Instalações Técnicas', percentagem: 20 },
    { nome: 'Acabamentos', percentagem: 25 },
    { nome: 'Contingência', percentagem: 10 }
  ]
}

export default function Orcamentos() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orcamentos, setOrcamentos] = useState([])
  const [projetos, setProjetos] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('Todos')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedOrcamento, setSelectedOrcamento] = useState(null)

  // Form state para novo orçamento
  const [newOrcamento, setNewOrcamento] = useState({
    projeto_id: '',
    titulo: '',
    margem_percentagem: 28,
    validade_dias: 30,
    template: 'completo',
    notas_internas: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Buscar orçamentos com capítulos
      const { data: orcamentosData, error: orcError } = await supabase
        .from('orcamentos')
        .select(`
          *,
          orcamento_capitulos (*)
        `)
        .order('created_at', { ascending: false })

      if (orcError) throw orcError

      // 2. Buscar projetos para dropdown
      const { data: projetosData, error: projError } = await supabase
        .from('projetos')
        .select('id, codigo, nome, cliente_nome')
        .eq('arquivado', false)
        .order('codigo', { ascending: false })

      if (projError) throw projError
      setProjetos(projetosData || [])

      // 3. Processar orçamentos
      const orcamentosProcessed = (orcamentosData || []).map(orc => {
        const capitulos = orc.orcamento_capitulos || []
        const subtotal = capitulos.reduce((sum, cap) => sum + parseFloat(cap.valor || 0), 0)
        const margemValor = subtotal * (parseFloat(orc.margem_percentagem || 25) / 100)
        const total = subtotal + margemValor

        return {
          id: orc.id,
          codigo: orc.codigo,
          projeto: {
            id: orc.projeto_id,
            codigo: orc.projeto_codigo,
            nome: orc.projeto_nome
          },
          cliente: {
            nome: orc.cliente_nome || 'Cliente não definido',
            contacto: orc.cliente_contacto
          },
          titulo: orc.titulo,
          versao: orc.versao || 1,
          status: orc.status || 'rascunho',
          data_criacao: orc.created_at,
          data_envio: orc.data_envio,
          data_aprovacao: orc.data_aprovacao,
          validade: orc.validade,
          criado_por: orc.criado_por_nome || 'Sistema',
          notas_internas: orc.notas_internas,
          valores: {
            subtotal,
            margem_percentagem: parseFloat(orc.margem_percentagem || 25),
            margem_valor: margemValor,
            total,
            iva: 23
          },
          capitulos: capitulos.map(cap => ({
            id: cap.id,
            nome: cap.nome,
            valor: parseFloat(cap.valor || 0),
            descricao: cap.descricao
          }))
        }
      })

      setOrcamentos(orcamentosProcessed)

    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Criar novo orçamento
  const handleCreateOrcamento = async () => {
    if (!newOrcamento.projeto_id) {
      alert('Seleciona um projeto')
      return
    }

    try {
      setSaving(true)

      // Buscar dados do projeto
      const projeto = projetos.find(p => p.id === newOrcamento.projeto_id)
      if (!projeto) throw new Error('Projeto não encontrado')

      // Gerar código do orçamento
      const { data: countData } = await supabase
        .from('orcamentos')
        .select('id')
        .eq('projeto_id', newOrcamento.projeto_id)

      const versao = (countData?.length || 0) + 1
      const codigo = `ORC_${projeto.codigo.replace('GA', '').replace('GB', '')}_${String(versao).padStart(3, '0')}`

      // Calcular validade
      const validade = new Date()
      validade.setDate(validade.getDate() + newOrcamento.validade_dias)

      // Inserir orçamento
      const { data: orcamentoData, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          codigo,
          projeto_id: newOrcamento.projeto_id,
          projeto_codigo: projeto.codigo,
          projeto_nome: projeto.nome,
          cliente_nome: projeto.cliente_nome,
          titulo: newOrcamento.titulo || `Proposta ${projeto.nome}`,
          versao,
          status: 'rascunho',
          margem_percentagem: newOrcamento.margem_percentagem,
          validade: validade.toISOString(),
          notas_internas: newOrcamento.notas_internas
        })
        .select()
        .single()

      if (orcError) throw orcError

      // Inserir capítulos do template
      const template = CAPITULOS_TEMPLATE[newOrcamento.template] || CAPITULOS_TEMPLATE.completo
      const capitulos = template.map((cap, idx) => ({
        orcamento_id: orcamentoData.id,
        ordem: idx + 1,
        nome: cap.nome,
        valor: 0, // Começa a zero, será preenchido depois
        descricao: ''
      }))

      const { error: capError } = await supabase
        .from('orcamento_capitulos')
        .insert(capitulos)

      if (capError) throw capError

      // Reset e fechar
      setNewOrcamento({
        projeto_id: '',
        titulo: '',
        margem_percentagem: 28,
        validade_dias: 30,
        template: 'completo',
        notas_internas: ''
      })
      setShowNewModal(false)

      // Recarregar dados
      fetchData()

    } catch (error) {
      console.error('Erro ao criar orçamento:', error)
      alert('Erro ao criar orçamento: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Atualizar status do orçamento
  const handleUpdateStatus = async (orcamentoId, novoStatus) => {
    try {
      setSaving(true)

      const updates = { status: novoStatus }

      // Adicionar datas conforme o status
      if (novoStatus === 'enviado') {
        updates.data_envio = new Date().toISOString()
      } else if (novoStatus === 'aprovado') {
        updates.data_aprovacao = new Date().toISOString()
      }

      const { error } = await supabase
        .from('orcamentos')
        .update(updates)
        .eq('id', orcamentoId)

      if (error) throw error

      // Atualizar localmente
      setOrcamentos(prev => prev.map(orc => 
        orc.id === orcamentoId 
          ? { ...orc, status: novoStatus, ...updates }
          : orc
      ))

      // Atualizar sidebar se aberta
      if (selectedOrcamento?.id === orcamentoId) {
        setSelectedOrcamento(prev => ({ ...prev, status: novoStatus, ...updates }))
      }

    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Duplicar orçamento (criar nova versão)
  const handleDuplicate = async (orcamento) => {
    try {
      setSaving(true)

      // Calcular nova versão
      const { data: countData } = await supabase
        .from('orcamentos')
        .select('versao')
        .eq('projeto_id', orcamento.projeto.id)
        .order('versao', { ascending: false })
        .limit(1)

      const novaVersao = (countData?.[0]?.versao || 0) + 1
      const novoCodigo = `ORC_${orcamento.projeto.codigo.replace('GA', '').replace('GB', '')}_${String(novaVersao).padStart(3, '0')}`

      // Nova validade (30 dias)
      const validade = new Date()
      validade.setDate(validade.getDate() + 30)

      // Inserir novo orçamento
      const { data: novoOrc, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          codigo: novoCodigo,
          projeto_id: orcamento.projeto.id,
          projeto_codigo: orcamento.projeto.codigo,
          projeto_nome: orcamento.projeto.nome,
          cliente_nome: orcamento.cliente.nome,
          titulo: orcamento.titulo,
          versao: novaVersao,
          status: 'rascunho',
          margem_percentagem: orcamento.valores.margem_percentagem,
          validade: validade.toISOString()
        })
        .select()
        .single()

      if (orcError) throw orcError

      // Copiar capítulos
      const capitulos = orcamento.capitulos.map((cap, idx) => ({
        orcamento_id: novoOrc.id,
        ordem: idx + 1,
        nome: cap.nome,
        valor: cap.valor,
        descricao: cap.descricao || ''
      }))

      const { error: capError } = await supabase
        .from('orcamento_capitulos')
        .insert(capitulos)

      if (capError) throw capError

      setSelectedOrcamento(null)
      fetchData()

    } catch (error) {
      console.error('Erro ao duplicar:', error)
      alert('Erro ao duplicar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredOrcamentos = orcamentos.filter(o => {
    const matchesSearch = o.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         o.projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         o.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'Todos' || o.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.rascunho
    return (
      <span 
        className="badge"
        style={{ 
          background: config.bg, 
          color: config.color 
        }}
      >
        {config.label}
      </span>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 
            size={48} 
            style={{ 
              color: 'var(--gold)', 
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }} 
          />
          <p style={{ color: 'var(--text-secondary)' }}>A carregar orçamentos...</p>
        </div>
      </div>
    )
  }

  // KPIs
  const totalEmProposta = orcamentos
    .filter(o => ['enviado', 'em_revisao'].includes(o.status))
    .reduce((sum, o) => sum + o.valores.total, 0)
  const totalAprovado = orcamentos
    .filter(o => o.status === 'aprovado')
    .reduce((sum, o) => sum + o.valores.total, 0)
  const orcamentosEnviados = orcamentos.filter(o => !['rascunho'].includes(o.status)).length
  const taxaConversao = orcamentosEnviados > 0
    ? Math.round((orcamentos.filter(o => o.status === 'aprovado').length / orcamentosEnviados) * 100)
    : 0
  const margemMedia = orcamentos.length > 0
    ? Math.round(orcamentos.reduce((sum, o) => sum + o.valores.margem_percentagem, 0) / orcamentos.length)
    : 0

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">Propostas comerciais e orçamentação</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
          <Plus size={18} />
          Nova Proposta
        </button>
      </div>

      {/* KPIs */}
      <div className="stats-grid mb-xl">
        <div className="stat-card">
          <div className="stat-icon finance">
            <Clock size={22} />
          </div>
          <div className="stat-value">{formatCurrency(totalEmProposta)}</div>
          <div className="stat-label">Em Proposta</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon works">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-value">{formatCurrency(totalAprovado)}</div>
          <div className="stat-label">Aprovado</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon clients">
            <TrendingUp size={22} />
          </div>
          <div className="stat-value">{taxaConversao}%</div>
          <div className="stat-label">Taxa Conversão</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon projects">
            <Percent size={22} />
          </div>
          <div className="stat-value">{margemMedia}%</div>
          <div className="stat-label">Margem Média</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-lg">
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--brown-light)'
              }} 
            />
            <input 
              type="text"
              className="input"
              placeholder="Pesquisar propostas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <select 
            className="select" 
            style={{ width: 'auto', minWidth: '150px' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="Todos">Todos os estados</option>
            <option value="rascunho">Rascunho</option>
            <option value="em_revisao">Em Revisão</option>
            <option value="enviado">Enviado</option>
            <option value="aprovado">Aprovado</option>
            <option value="rejeitado">Rejeitado</option>
          </select>

          <div className="text-muted" style={{ fontSize: '13px', marginLeft: 'auto' }}>
            {filteredOrcamentos.length} proposta{filteredOrcamentos.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredOrcamentos.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--stone-dark)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
            {orcamentos.length === 0 ? 'Nenhum orçamento criado' : 'Nenhum resultado encontrado'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {orcamentos.length === 0 
              ? 'Cria a primeira proposta para começar.'
              : 'Tenta ajustar os filtros de pesquisa.'
            }
          </p>
          {orcamentos.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
              <Plus size={18} />
              Nova Proposta
            </button>
          )}
        </div>
      ) : (
        /* Proposals List */
        <div className="flex flex-col gap-md">
          {filteredOrcamentos.map((orcamento) => (
            <div 
              key={orcamento.id} 
              className="card"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setSelectedOrcamento(orcamento)}
            >
              <div className="flex items-center gap-lg">
                {/* Icon */}
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    background: statusConfig[orcamento.status]?.bg || 'var(--stone)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <FileText size={22} style={{ color: statusConfig[orcamento.status]?.color || 'var(--brown-light)' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-sm mb-xs">
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--blush-dark)' }}>
                      {orcamento.codigo}
                    </span>
                    {getStatusBadge(orcamento.status)}
                    {orcamento.versao > 1 && (
                      <span className="badge" style={{ background: 'var(--stone)', color: 'var(--brown-light)' }}>
                        v{orcamento.versao}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>
                    {orcamento.projeto.nome}
                  </div>
                  <div className="flex items-center gap-md text-muted" style={{ fontSize: '13px' }}>
                    <span className="flex items-center gap-xs">
                      <Building2 size={13} />
                      {orcamento.cliente.nome}
                    </span>
                    <span className="flex items-center gap-xs">
                      <Calendar size={13} />
                      {new Date(orcamento.data_criacao).toLocaleDateString('pt-PT')}
                    </span>
                    {orcamento.criado_por && (
                      <span className="flex items-center gap-xs">
                        <User size={13} />
                        {orcamento.criado_por}
                      </span>
                    )}
                  </div>
                </div>

                {/* Values */}
                <div style={{ textAlign: 'right', minWidth: '140px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brown)' }}>
                    {formatCurrency(orcamento.valores.total)}
                  </div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>
                    Margem {orcamento.valores.margem_percentagem}% ({formatCurrency(orcamento.valores.margem_valor)})
                  </div>
                </div>

                {/* Actions */}
                <button 
                  className="btn btn-ghost btn-icon"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={18} />
                </button>
              </div>

              {/* Capitulos Preview */}
              {orcamento.capitulos.length > 0 && (
                <div 
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--stone)',
                    overflowX: 'auto'
                  }}
                >
                  {orcamento.capitulos.slice(0, 6).map((cap, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--cream)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span className="text-muted">{cap.nome}:</span>
                      <span style={{ fontWeight: 600, marginLeft: '4px' }}>
                        {formatCurrency(cap.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Proposal Detail Sidebar */}
      {selectedOrcamento && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedOrcamento(null)}
          style={{ justifyContent: 'flex-end', padding: 0 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '580px',
              height: '100vh',
              background: 'var(--white)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'auto',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: 'var(--space-lg)',
              borderBottom: '1px solid var(--stone)',
              position: 'sticky',
              top: 0,
              background: 'var(--white)',
              zIndex: 10
            }}>
              <div className="flex items-center justify-between mb-sm">
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--blush-dark)' }}>
                    {selectedOrcamento.codigo}
                  </span>
                  {getStatusBadge(selectedOrcamento.status)}
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedOrcamento(null)}>
                  <X size={20} />
                </button>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
                {selectedOrcamento.projeto.nome}
              </h2>
              <div className="text-muted">{selectedOrcamento.cliente.nome}</div>
            </div>

            {/* Content */}
            <div style={{ padding: 'var(--space-lg)' }}>
              {/* Summary */}
              <div 
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--space-lg)',
                  color: 'var(--brown-dark)'
                }}
              >
                <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>Valor Total</div>
                <div style={{ fontSize: '36px', fontWeight: 700 }}>
                  {formatCurrency(selectedOrcamento.valores.total)}
                </div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Margem: {selectedOrcamento.valores.margem_percentagem}% 
                  <span style={{ opacity: 0.8 }}> ({formatCurrency(selectedOrcamento.valores.margem_valor)})</span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-2 mb-lg" style={{ gap: 'var(--space-md)' }}>
                <div>
                  <div className="text-muted" style={{ fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Criado em
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {new Date(selectedOrcamento.data_criacao).toLocaleDateString('pt-PT', { 
                      day: 'numeric', month: 'long', year: 'numeric' 
                    })}
                  </div>
                </div>
                {selectedOrcamento.data_envio && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Enviado em
                    </div>
                    <div style={{ fontWeight: 500 }}>
                      {new Date(selectedOrcamento.data_envio).toLocaleDateString('pt-PT', { 
                        day: 'numeric', month: 'long', year: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
                {selectedOrcamento.data_aprovacao && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Aprovado em
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--success)' }}>
                      {new Date(selectedOrcamento.data_aprovacao).toLocaleDateString('pt-PT', { 
                        day: 'numeric', month: 'long', year: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
                {selectedOrcamento.validade && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Validade
                    </div>
                    <div style={{ fontWeight: 500 }}>
                      {new Date(selectedOrcamento.validade).toLocaleDateString('pt-PT', { 
                        day: 'numeric', month: 'long', year: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Capitulos */}
              <div className="mb-lg">
                <div className="text-muted" style={{ fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Capítulos
                </div>
                {selectedOrcamento.capitulos.length > 0 ? (
                  <div className="flex flex-col gap-sm">
                    {selectedOrcamento.capitulos.map((cap, idx) => (
                      <div 
                        key={cap.id || idx}
                        style={{
                          padding: '14px 16px',
                          background: 'var(--cream)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div className="flex items-center gap-md">
                          <span 
                            style={{
                              width: '24px',
                              height: '24px',
                              background: 'var(--stone)',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--brown-light)'
                            }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontWeight: 500 }}>{cap.nome}</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(cap.valor)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted" style={{ fontStyle: 'italic' }}>
                    Nenhum capítulo definido
                  </div>
                )}

                {/* Totals */}
                <div 
                  style={{
                    marginTop: '12px',
                    padding: '16px',
                    background: 'var(--off-white)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--stone)'
                  }}
                >
                  <div className="flex justify-between mb-sm" style={{ fontSize: '14px' }}>
                    <span className="text-muted">Subtotal</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(selectedOrcamento.valores.subtotal)}</span>
                  </div>
                  <div className="flex justify-between mb-sm" style={{ fontSize: '14px' }}>
                    <span className="text-muted">Margem ({selectedOrcamento.valores.margem_percentagem}%)</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(selectedOrcamento.valores.margem_valor)}</span>
                  </div>
                  <div 
                    className="flex justify-between" 
                    style={{ 
                      fontSize: '16px', 
                      fontWeight: 700,
                      paddingTop: '12px',
                      borderTop: '1px solid var(--stone)'
                    }}
                  >
                    <span>Total (s/IVA)</span>
                    <span>{formatCurrency(selectedOrcamento.valores.total)}</span>
                  </div>
                  <div className="flex justify-between mt-sm text-muted" style={{ fontSize: '13px' }}>
                    <span>Total c/IVA ({selectedOrcamento.valores.iva}%)</span>
                    <span>{formatCurrency(selectedOrcamento.valores.total * 1.23)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-sm">
                {selectedOrcamento.status === 'rascunho' && (
                  <>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%' }}
                      onClick={() => handleUpdateStatus(selectedOrcamento.id, 'enviado')}
                      disabled={saving}
                    >
                      {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                      Enviar ao Cliente
                    </button>
                    <div className="flex gap-sm">
                      <button className="btn btn-outline" style={{ flex: 1 }}>
                        <Edit3 size={16} />
                        Editar
                      </button>
                      <button className="btn btn-outline" style={{ flex: 1 }}>
                        <Eye size={16} />
                        Pré-visualizar
                      </button>
                    </div>
                  </>
                )}
                {selectedOrcamento.status === 'enviado' && (
                  <>
                    <div className="flex gap-sm">
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1, background: 'var(--success)' }}
                        onClick={() => handleUpdateStatus(selectedOrcamento.id, 'aprovado')}
                        disabled={saving}
                      >
                        <CheckCircle2 size={16} />
                        Aprovar
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ flex: 1, borderColor: 'var(--error)', color: 'var(--error)' }}
                        onClick={() => handleUpdateStatus(selectedOrcamento.id, 'rejeitado')}
                        disabled={saving}
                      >
                        <XCircle size={16} />
                        Rejeitar
                      </button>
                    </div>
                    <button 
                      className="btn btn-outline" 
                      style={{ width: '100%' }}
                      onClick={() => handleDuplicate(selectedOrcamento)}
                      disabled={saving}
                    >
                      <Copy size={16} />
                      Criar Nova Versão
                    </button>
                  </>
                )}
                {selectedOrcamento.status === 'aprovado' && (
                  <div className="flex gap-sm">
                    <button className="btn btn-outline" style={{ flex: 1 }}>
                      <Download size={16} />
                      Download PDF
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ flex: 1 }}
                      onClick={() => handleDuplicate(selectedOrcamento)}
                      disabled={saving}
                    >
                      <Copy size={16} />
                      Duplicar
                    </button>
                  </div>
                )}
                {selectedOrcamento.status === 'rejeitado' && (
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={() => handleDuplicate(selectedOrcamento)}
                    disabled={saving}
                  >
                    <Copy size={16} />
                    Criar Nova Versão
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Proposal Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Nova Proposta</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Projeto *</label>
                <select 
                  className="select"
                  value={newOrcamento.projeto_id}
                  onChange={(e) => setNewOrcamento(prev => ({ ...prev, projeto_id: e.target.value }))}
                >
                  <option value="">Selecionar projeto...</option>
                  {projetos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} "" {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Título da Proposta</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Ex: Proposta de Remodelação Completa"
                  value={newOrcamento.titulo}
                  onChange={(e) => setNewOrcamento(prev => ({ ...prev, titulo: e.target.value }))}
                />
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">Margem (%)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="28"
                    value={newOrcamento.margem_percentagem}
                    onChange={(e) => setNewOrcamento(prev => ({ ...prev, margem_percentagem: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Validade (dias)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="30"
                    value={newOrcamento.validade_dias}
                    onChange={(e) => setNewOrcamento(prev => ({ ...prev, validade_dias: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Template</label>
                <select 
                  className="select"
                  value={newOrcamento.template}
                  onChange={(e) => setNewOrcamento(prev => ({ ...prev, template: e.target.value }))}
                >
                  <option value="completo">Projeto Completo (Design + Construção)</option>
                  <option value="design">Apenas Design de Interiores</option>
                  <option value="remodelacao">Remodelação</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Notas Internas (opcional)</label>
                <textarea 
                  className="textarea" 
                  placeholder="Notas visíveis apenas internamente..."
                  style={{ minHeight: '80px' }}
                  value={newOrcamento.notas_internas}
                  onChange={(e) => setNewOrcamento(prev => ({ ...prev, notas_internas: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowNewModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateOrcamento}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Plus size={16} />
                )}
                {saving ? 'A criar...' : 'Criar Proposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
