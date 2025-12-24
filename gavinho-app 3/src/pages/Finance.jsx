import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Euro,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  MoreVertical,
  X,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  PieChart,
  BarChart3,
  Receipt,
  CreditCard,
  Wallet,
  FileText,
  Plus,
  Loader2
} from 'lucide-react'

const healthConfig = {
  good: { label: 'No Track', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  warning: { label: 'At Risk', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  critical: { label: 'Crítico', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' },
  neutral: { label: 'Suspenso', color: 'var(--brown-light)', bg: 'var(--stone)' }
}

const CAPITULOS_PADRAO = [
  'Arquitetura & Design',
  'Construção Civil',
  'Instalações Técnicas',
  'Acabamentos',
  'Mobiliário & Equipamento',
  'Contingência'
]

export default function Finance() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectsFinance, setProjectsFinance] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedHealth, setSelectedHealth] = useState('Todos')
  const [expandedProjects, setExpandedProjects] = useState({})
  const [selectedProject, setSelectedProject] = useState(null)
  const [showAddCostModal, setShowAddCostModal] = useState(false)
  
  // Form state para novo custo
  const [newCost, setNewCost] = useState({
    projeto_id: '',
    capitulo: '',
    estado: 'comprometido',
    tipo_documento: 'fatura',
    numero_documento: '',
    data_documento: new Date().toISOString().split('T')[0],
    fornecedor_id: '',
    valor_bruto: '',
    iva_percentagem: 23,
    descricao: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Buscar projetos ativos com orçamento
      const { data: projetos, error: projError } = await supabase
        .from('projetos')
        .select('*')
        .eq('arquivado', false)
        .order('updated_at', { ascending: false })

      if (projError) throw projError

      // 2. Buscar custos agregados por capítulo (view)
      const { data: custosView, error: custosError } = await supabase
        .from('v_custos_por_capitulo')
        .select('*')

      // 3. Buscar fornecedores ativos
      const { data: forns, error: fornError } = await supabase
        .from('fornecedores')
        .select('id, codigo, nome')
        .eq('ativo', true)
        .order('nome')

      if (fornError) throw fornError
      setFornecedores(forns || [])

      // 4. Processar dados para o formato esperado pelo UI
      const projectsProcessed = projetos.map(projeto => {
        // Custos deste projeto
        const projetoCustos = custosView?.filter(c => c.projeto_id === projeto.id) || []
        
        // Totais por estado
        const totalComprometido = projetoCustos.reduce((sum, c) => sum + parseFloat(c.comprometido || 0), 0)
        const totalRealizado = projetoCustos.reduce((sum, c) => sum + parseFloat(c.realizado || 0), 0)
        const totalFaturado = projetoCustos.reduce((sum, c) => sum + parseFloat(c.faturado || 0), 0)
        
        // Orçamento do projeto
        const orcamentoAtual = parseFloat(projeto.orcamento_atual || projeto.valor_contratado || 0)
        
        // Calcular margem
        const margemTarget = parseFloat(projeto.margem_target || 25)
        const custoTotal = totalComprometido > 0 ? totalComprometido : totalRealizado
        const margemAtual = orcamentoAtual > 0 
          ? ((orcamentoAtual - custoTotal) / orcamentoAtual * 100)
          : margemTarget
        
        // Desvio = custos que excedem o orçamento esperado (considerando margem)
        const custoEsperado = orcamentoAtual * (1 - margemTarget / 100)
        const desvio = totalComprometido - custoEsperado
        
        // Health do projeto
        let health = 'good'
        if (projeto.status === 'on_hold') {
          health = 'neutral'
        } else if (desvio > custoEsperado * 0.1) {
          health = 'critical'
        } else if (desvio > custoEsperado * 0.05 || margemAtual < margemTarget - 5) {
          health = 'warning'
        }

        // Capítulos com custos
        const capitulos = CAPITULOS_PADRAO.map(capNome => {
          const capCusto = projetoCustos.find(c => c.capitulo === capNome)
          // Orçamento por capítulo (estimado como proporção do total)
          const orcamentoCapitulo = orcamentoAtual / CAPITULOS_PADRAO.length // Simplificado
          
          return {
            nome: capNome,
            orcamento: orcamentoCapitulo,
            comprometido: parseFloat(capCusto?.comprometido || 0),
            realizado: parseFloat(capCusto?.realizado || 0),
            faturado: parseFloat(capCusto?.faturado || 0),
            desvio: (parseFloat(capCusto?.comprometido || 0)) - orcamentoCapitulo
          }
        }).filter(cap => cap.comprometido > 0 || cap.realizado > 0 || cap.faturado > 0)

        // Se não há capítulos com custos, mostrar os padrão com valores zero
        const capitulosFinais = capitulos.length > 0 ? capitulos : CAPITULOS_PADRAO.map(nome => ({
          nome,
          orcamento: orcamentoAtual / CAPITULOS_PADRAO.length,
          comprometido: 0,
          realizado: 0,
          faturado: 0,
          desvio: 0
        }))

        return {
          id: projeto.id,
          projeto: { 
            codigo: projeto.codigo, 
            nome: projeto.nome 
          },
          cliente: projeto.cliente_nome || 'Cliente não definido',
          fase: projeto.fase || 'Briefing',
          orcamento: {
            inicial: orcamentoAtual,
            atual: orcamentoAtual,
            versao: 1
          },
          custos: {
            comprometido: totalComprometido,
            realizado: totalRealizado,
            faturado: totalFaturado
          },
          faturacao: {
            contratado: orcamentoAtual,
            faturado: 0, // TODO: implementar quando tiver tabela de faturação
            recebido: 0
          },
          margem: {
            prevista: margemTarget,
            atual: Math.max(0, margemAtual).toFixed(1)
          },
          desvio: {
            valor: desvio,
            percentagem: orcamentoAtual > 0 ? (desvio / orcamentoAtual * 100).toFixed(1) : 0,
            tendencia: desvio > 0 ? 'up' : desvio < 0 ? 'down' : 'stable'
          },
          health,
          capitulos: capitulosFinais
        }
      })

      // Filtrar apenas projetos com orçamento definido
      const projectsWithBudget = projectsProcessed.filter(p => p.orcamento.atual > 0)
      setProjectsFinance(projectsWithBudget)

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  // Guardar novo custo
  const handleSaveCost = async () => {
    if (!newCost.projeto_id || !newCost.capitulo || !newCost.valor_bruto || !newCost.descricao) {
      alert('Preenche todos os campos obrigatórios')
      return
    }

    try {
      setSaving(true)

      const valorBruto = parseFloat(newCost.valor_bruto)
      const ivaPerc = parseFloat(newCost.iva_percentagem)
      const ivaValor = valorBruto * (ivaPerc / 100)
      const valorTotal = valorBruto + ivaValor

      const { error } = await supabase
        .from('projeto_custos')
        .insert({
          projeto_id: newCost.projeto_id,
          capitulo: newCost.capitulo,
          estado: newCost.estado,
          tipo_documento: newCost.tipo_documento,
          numero_documento: newCost.numero_documento || null,
          data_documento: newCost.data_documento,
          fornecedor_id: newCost.fornecedor_id || null,
          valor_bruto: valorBruto,
          iva_percentagem: ivaPerc,
          iva_valor: ivaValor,
          valor_total: valorTotal,
          descricao: newCost.descricao
        })

      if (error) throw error

      // Reset form e fechar modal
      setNewCost({
        projeto_id: '',
        capitulo: '',
        estado: 'comprometido',
        tipo_documento: 'fatura',
        numero_documento: '',
        data_documento: new Date().toISOString().split('T')[0],
        fornecedor_id: '',
        valor_bruto: '',
        iva_percentagem: 23,
        descricao: ''
      })
      setShowAddCostModal(false)
      
      // Recarregar dados
      fetchData()

    } catch (error) {
      console.error('Erro ao guardar custo:', error)
      alert('Erro ao guardar custo: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredProjects = projectsFinance.filter(p => {
    const matchesSearch = p.projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.projeto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesHealth = selectedHealth === 'Todos' || p.health === selectedHealth
    return matchesSearch && matchesHealth
  })

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatCompact = (value) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`
    }
    return `€${(value / 1000).toFixed(0)}k`
  }

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const getProgressWidth = (value, total) => {
    if (!total || total === 0) return 0
    return Math.min((value / total) * 100, 100)
  }

  const getDesvioIcon = (tendencia) => {
    switch (tendencia) {
      case 'up': return <ArrowUpRight size={14} style={{ color: 'var(--error)' }} />
      case 'down': return <ArrowDownRight size={14} style={{ color: 'var(--success)' }} />
      default: return <Minus size={14} style={{ color: 'var(--brown-light)' }} />
    }
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
          <p style={{ color: 'var(--text-secondary)' }}>A carregar dados financeiros...</p>
        </div>
      </div>
    )
  }

  // KPIs totais
  const totais = projectsFinance.reduce((acc, p) => ({
    orcamento: acc.orcamento + p.orcamento.atual,
    comprometido: acc.comprometido + p.custos.comprometido,
    realizado: acc.realizado + p.custos.realizado,
    faturado: acc.faturado + p.faturacao.faturado,
    recebido: acc.recebido + p.faturacao.recebido
  }), { orcamento: 0, comprometido: 0, realizado: 0, faturado: 0, recebido: 0 })

  const margemMedia = projectsFinance.length > 0 
    ? (projectsFinance.reduce((sum, p) => sum + parseFloat(p.margem.atual), 0) / projectsFinance.length).toFixed(1)
    : 0
  const projectosEmRisco = projectsFinance.filter(p => p.health === 'warning' || p.health === 'critical').length

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Controlo de custos e margens por projeto</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary">
            <Download size={18} />
            Exportar
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddCostModal(true)}>
            <Plus size={18} />
            Registar Custo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="stats-grid mb-xl">
        <div className="stat-card">
          <div className="stat-icon finance">
            <Wallet size={22} />
          </div>
          <div className="stat-value">{formatCompact(totais.orcamento)}</div>
          <div className="stat-label">Orçamento Total</div>
          <div className="stat-trend">
            {projectsFinance.length} projeto{projectsFinance.length !== 1 ? 's' : ''} ativo{projectsFinance.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(138, 158, 184, 0.15)' }}>
            <CreditCard size={22} style={{ stroke: 'var(--info)' }} />
          </div>
          <div className="stat-value">{formatCompact(totais.comprometido)}</div>
          <div className="stat-label">Comprometido</div>
          <div className="stat-trend">
            {totais.orcamento > 0 ? Math.round((totais.comprometido / totais.orcamento) * 100) : 0}% do orçamento
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon works">
            <Receipt size={22} />
          </div>
          <div className="stat-value">{margemMedia}%</div>
          <div className="stat-label">Margem Média</div>
          <div className="stat-trend">
            Baseado em custos comprometidos
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: projectosEmRisco > 0 ? 'rgba(201, 168, 130, 0.2)' : 'rgba(122, 158, 122, 0.15)' }}>
            <AlertTriangle size={22} style={{ stroke: projectosEmRisco > 0 ? 'var(--warning)' : 'var(--success)' }} />
          </div>
          <div className="stat-value">{projectosEmRisco}</div>
          <div className="stat-label">Projetos em Risco</div>
          {projectosEmRisco > 0 && (
            <div className="stat-trend" style={{ background: 'rgba(201, 168, 130, 0.2)', color: 'var(--warning)' }}>
              Requer atenção
            </div>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="card mb-lg">
        <div className="flex items-center justify-between mb-md">
          <h3 style={{ fontWeight: 600 }}>Resumo Global</h3>
          <div className="text-muted" style={{ fontSize: '13px' }}>
            Valores agregados de todos os projetos
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-lg)' }}>
          <div>
            <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Orçamentado
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency(totais.orcamento)}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Comprometido
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--info)' }}>{formatCurrency(totais.comprometido)}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Realizado
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(totais.realizado)}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Faturado Cliente
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(totais.faturado)}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Recebido
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(totais.recebido)}</div>
          </div>
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
              placeholder="Pesquisar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <select 
            className="select" 
            style={{ width: 'auto', minWidth: '150px' }}
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
          >
            <option value="Todos">Todos os estados</option>
            <option value="good">No Track</option>
            <option value="warning">At Risk</option>
            <option value="critical">Crítico</option>
            <option value="neutral">Suspenso</option>
          </select>

          <div className="text-muted" style={{ fontSize: '13px', marginLeft: 'auto' }}>
            {filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <Euro size={48} style={{ color: 'var(--stone-dark)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
            {projectsFinance.length === 0 ? 'Nenhum projeto com orçamento' : 'Nenhum resultado encontrado'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {projectsFinance.length === 0 
              ? 'Adiciona um orçamento aos projetos para ver o controlo financeiro.'
              : 'Tenta ajustar os filtros de pesquisa.'
            }
          </p>
        </div>
      ) : (
        /* Projects List */
        <div className="flex flex-col gap-md">
          {filteredProjects.map((project) => (
            <div key={project.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Project Header */}
              <div 
                style={{ 
                  padding: '20px',
                  cursor: 'pointer',
                  borderBottom: expandedProjects[project.id] ? '1px solid var(--stone)' : 'none'
                }}
                onClick={() => toggleProject(project.id)}
              >
                <div className="flex items-center gap-lg">
                  {/* Expand Icon */}
                  <div style={{ color: 'var(--brown-light)' }}>
                    {expandedProjects[project.id] ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </div>

                  {/* Project Info */}
                  <div style={{ minWidth: '200px' }}>
                    <div className="flex items-center gap-sm mb-xs">
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--blush-dark)' }}>
                        {project.projeto.codigo}
                      </span>
                      <span 
                        className="badge"
                        style={{ 
                          background: healthConfig[project.health].bg,
                          color: healthConfig[project.health].color
                        }}
                      >
                        {healthConfig[project.health].label}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{project.projeto.nome}</div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>{project.cliente} "¢ {project.fase}</div>
                  </div>

                  {/* Progress Bars */}
                  <div style={{ flex: 1, maxWidth: '300px' }}>
                    <div className="flex items-center justify-between mb-xs">
                      <span className="text-muted" style={{ fontSize: '11px' }}>Comprometido</span>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>
                        {Math.round(getProgressWidth(project.custos.comprometido, project.orcamento.atual))}%
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: '6px', marginBottom: '8px' }}>
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${getProgressWidth(project.custos.comprometido, project.orcamento.atual)}%`,
                          background: 'var(--info)'
                        }} 
                      />
                    </div>
                    <div className="flex items-center justify-between mb-xs">
                      <span className="text-muted" style={{ fontSize: '11px' }}>Realizado</span>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>
                        {Math.round(getProgressWidth(project.custos.realizado, project.orcamento.atual))}%
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${getProgressWidth(project.custos.realizado, project.orcamento.atual)}%`,
                          background: 'var(--warning)'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Values */}
                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>
                      {formatCurrency(project.orcamento.atual)}
                    </div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      Orçamento
                    </div>
                  </div>

                  {/* Margin */}
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700,
                      color: parseFloat(project.margem.atual) >= project.margem.prevista ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {project.margem.atual}%
                    </div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      Margem
                    </div>
                  </div>

                  {/* Desvio */}
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div className="flex items-center justify-end gap-xs">
                      {getDesvioIcon(project.desvio.tendencia)}
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: project.desvio.valor > 0 ? 'var(--error)' : project.desvio.valor < 0 ? 'var(--success)' : 'var(--brown-light)'
                      }}>
                        {project.desvio.valor > 0 ? '+' : ''}{formatCurrency(project.desvio.valor)}
                      </span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {project.desvio.percentagem > 0 ? '+' : ''}{project.desvio.percentagem}% desvio
                    </div>
                  </div>

                  {/* Actions */}
                  <button 
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedProject(project)
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              {/* Expanded - Capitulos */}
              {expandedProjects[project.id] && (
                <div style={{ padding: '20px', background: 'var(--cream)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--brown-light)', fontWeight: 600 }}>
                          Capítulo
                        </th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--brown-light)', fontWeight: 600 }}>
                          Comprometido
                        </th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--brown-light)', fontWeight: 600 }}>
                          Realizado
                        </th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--brown-light)', fontWeight: 600 }}>
                          Faturado
                        </th>
                        <th style={{ width: '150px', padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--brown-light)', fontWeight: 600 }}>
                          Progresso
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.capitulos.map((cap, idx) => (
                        <tr 
                          key={idx}
                          style={{ 
                            background: idx % 2 === 0 ? 'var(--white)' : 'transparent',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <td style={{ padding: '12px', fontWeight: 500 }}>{cap.nome}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--info)' }}>
                            {formatCurrency(cap.comprometido)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--warning)' }}>
                            {formatCurrency(cap.realizado)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {formatCurrency(cap.faturado)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div className="progress-bar" style={{ height: '6px' }}>
                              <div 
                                className="progress-fill" 
                                style={{ 
                                  width: `${cap.comprometido > 0 ? Math.min((cap.realizado / cap.comprometido) * 100, 100) : 0}%`,
                                  background: 'var(--blush)'
                                }} 
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--stone)' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>TOTAL</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--info)' }}>
                          {formatCurrency(project.custos.comprometido)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--warning)' }}>
                          {formatCurrency(project.custos.realizado)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(project.custos.faturado)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Button to add cost */}
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setNewCost(prev => ({ ...prev, projeto_id: project.id }))
                        setShowAddCostModal(true)
                      }}
                    >
                      <Plus size={16} />
                      Adicionar Custo a este Projeto
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Cost Modal */}
      {showAddCostModal && (
        <div className="modal-overlay" onClick={() => setShowAddCostModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Registar Custo</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddCostModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Projeto *</label>
                <select 
                  className="select"
                  value={newCost.projeto_id}
                  onChange={(e) => setNewCost(prev => ({ ...prev, projeto_id: e.target.value }))}
                >
                  <option value="">Selecionar projeto...</option>
                  {projectsFinance.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.projeto.codigo} "” {p.projeto.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Capítulo *</label>
                <select 
                  className="select"
                  value={newCost.capitulo}
                  onChange={(e) => setNewCost(prev => ({ ...prev, capitulo: e.target.value }))}
                >
                  <option value="">Selecionar capítulo...</option>
                  {CAPITULOS_PADRAO.map(cap => (
                    <option key={cap} value={cap}>{cap}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">Estado do Custo</label>
                  <select 
                    className="select"
                    value={newCost.estado}
                    onChange={(e) => setNewCost(prev => ({ ...prev, estado: e.target.value }))}
                  >
                    <option value="comprometido">Comprometido</option>
                    <option value="realizado">Realizado</option>
                    <option value="faturado">Faturado</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Tipo de Documento</label>
                  <select 
                    className="select"
                    value={newCost.tipo_documento}
                    onChange={(e) => setNewCost(prev => ({ ...prev, tipo_documento: e.target.value }))}
                  >
                    <option value="fatura">Fatura</option>
                    <option value="auto_medicao">Auto de Medição</option>
                    <option value="nota_encomenda">Nota de Encomenda</option>
                    <option value="adiantamento">Adiantamento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">Valor Bruto (€) *</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="0.00"
                    value={newCost.valor_bruto}
                    onChange={(e) => setNewCost(prev => ({ ...prev, valor_bruto: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">IVA (%)</label>
                  <select 
                    className="select"
                    value={newCost.iva_percentagem}
                    onChange={(e) => setNewCost(prev => ({ ...prev, iva_percentagem: e.target.value }))}
                  >
                    <option value="0">0% (Isento)</option>
                    <option value="6">6%</option>
                    <option value="13">13%</option>
                    <option value="23">23%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">NÂº Documento</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="FAT-2024/001"
                    value={newCost.numero_documento}
                    onChange={(e) => setNewCost(prev => ({ ...prev, numero_documento: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Data do Documento</label>
                  <input 
                    type="date" 
                    className="input"
                    value={newCost.data_documento}
                    onChange={(e) => setNewCost(prev => ({ ...prev, data_documento: e.target.value }))}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Fornecedor</label>
                <select 
                  className="select"
                  value={newCost.fornecedor_id}
                  onChange={(e) => setNewCost(prev => ({ ...prev, fornecedor_id: e.target.value }))}
                >
                  <option value="">Selecionar fornecedor...</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.codigo} "” {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Descrição *</label>
                <textarea 
                  className="textarea" 
                  placeholder="Descrição do custo..."
                  style={{ minHeight: '80px' }}
                  value={newCost.descricao}
                  onChange={(e) => setNewCost(prev => ({ ...prev, descricao: e.target.value }))}
                />
              </div>

              {/* Preview do valor total */}
              {newCost.valor_bruto && (
                <div style={{ 
                  padding: '12px 16px', 
                  background: 'var(--cream)', 
                  borderRadius: 'var(--radius-md)',
                  marginTop: '8px'
                }}>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Valor Total (com IVA)</span>
                    <span style={{ fontWeight: 700, fontSize: '18px' }}>
                      {formatCurrency(
                        parseFloat(newCost.valor_bruto || 0) * (1 + parseFloat(newCost.iva_percentagem) / 100)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddCostModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveCost}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Plus size={16} />
                )}
                {saving ? 'A guardar...' : 'Registar Custo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Sidebar */}
      {selectedProject && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedProject(null)}
          style={{ justifyContent: 'flex-end', padding: 0 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '480px',
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
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-sm mb-xs">
                    <span style={{ fontSize: '12px', color: 'var(--blush-dark)', fontWeight: 600 }}>
                      {selectedProject.projeto.codigo}
                    </span>
                    <span 
                      className="badge"
                      style={{ 
                        background: healthConfig[selectedProject.health].bg,
                        color: healthConfig[selectedProject.health].color
                      }}
                    >
                      {healthConfig[selectedProject.health].label}
                    </span>
                  </div>
                  <h2 style={{ fontWeight: 600 }}>{selectedProject.projeto.nome}</h2>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedProject(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: 'var(--space-lg)' }}>
              {/* Summary Card */}
              <div 
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--space-lg)',
                  color: 'var(--brown-dark)'
                }}
              >
                <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '2px' }}>Orçamento</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {formatCurrency(selectedProject.orcamento.atual)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '2px' }}>Margem Atual</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {selectedProject.margem.atual}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Costs Breakdown */}
              <div className="mb-lg">
                <div className="text-muted" style={{ fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Custos
                </div>
                <div className="flex flex-col gap-sm">
                  <div 
                    style={{
                      padding: '14px 16px',
                      background: 'var(--cream)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div className="flex items-center gap-sm">
                      <CreditCard size={16} style={{ color: 'var(--info)' }} />
                      <span>Comprometido</span>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--info)' }}>
                      {formatCurrency(selectedProject.custos.comprometido)}
                    </span>
                  </div>
                  <div 
                    style={{
                      padding: '14px 16px',
                      background: 'var(--cream)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div className="flex items-center gap-sm">
                      <Receipt size={16} style={{ color: 'var(--warning)' }} />
                      <span>Realizado</span>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                      {formatCurrency(selectedProject.custos.realizado)}
                    </span>
                  </div>
                  <div 
                    style={{
                      padding: '14px 16px',
                      background: 'var(--cream)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div className="flex items-center gap-sm">
                      <FileText size={16} style={{ color: 'var(--brown-light)' }} />
                      <span>Faturado</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>
                      {formatCurrency(selectedProject.custos.faturado)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desvio Alert */}
              {selectedProject.desvio.valor > 0 && (
                <div 
                  style={{
                    marginBottom: 'var(--space-lg)',
                    padding: '12px 16px',
                    background: 'rgba(201, 168, 130, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--warning)'
                  }}
                >
                  <div className="flex items-center gap-sm">
                    <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--warning)', fontSize: '13px' }}>
                      Desvio de {formatCurrency(selectedProject.desvio.valor)} ({selectedProject.desvio.percentagem}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-sm">
                <button className="btn btn-outline" style={{ width: '100%' }}>
                  <Download size={16} />
                  Exportar Relatório
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => {
                    setNewCost(prev => ({ ...prev, projeto_id: selectedProject.id }))
                    setSelectedProject(null)
                    setShowAddCostModal(true)
                  }}
                >
                  <Plus size={16} />
                  Registar Custo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
