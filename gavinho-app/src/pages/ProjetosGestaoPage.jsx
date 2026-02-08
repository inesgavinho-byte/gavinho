import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  FolderKanban, ClipboardList, Handshake, ShoppingCart, PieChart,
  FileCheck, Search, Loader2, ChevronRight, Building2, Truck,
  Calendar, AlertTriangle, CheckCircle2, Clock, DollarSign, HardHat
} from 'lucide-react'

const TABS = [
  { key: 'procurement', label: 'Procurement', icon: Handshake, color: '#8B5CF6' },
  { key: 'compras', label: 'Compras', icon: ShoppingCart, color: '#3B82F6' },
  { key: 'controlo', label: 'Controlo Executado', icon: PieChart, color: '#D97706' },
  { key: 'autos', label: 'Autos', icon: FileCheck, color: '#059669' },
]

const formatCurrency = (val) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val || 0)

export default function ProjetosGestaoPage({ mode = 'em-curso' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isEmCurso = mode === 'em-curso'

  const pathParts = location.pathname.split('/')
  const activeTab = TABS.find(t => pathParts.includes(t.key))?.key || null

  const [projetos, setProjetos] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Real data from tables
  const [dealRooms, setDealRooms] = useState([])
  const [orcamentosRecebidos, setOrcamentosRecebidos] = useState([])
  const [obrasCompras, setObrasCompras] = useState([])
  const [comprasFinanceiro, setComprasFinanceiro] = useState([])
  const [obrasExecucao, setObrasExecucao] = useState([])
  const [autos, setAutos] = useState([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch projetos
      let query = supabase.from('projetos').select('*').order('codigo', { ascending: true })
      if (isEmCurso) {
        query = query.in('status', ['em_curso', 'ativo', 'Em Curso', 'Ativo', 'design', 'execução', 'construção', 'planeamento'])
      } else {
        query = query.in('status', ['concluido', 'Concluído', 'concluída', 'finalizado'])
      }
      const { data: projetosData } = await query
      setProjetos(projetosData || [])

      const projetoIds = (projetosData || []).map(p => p.id)
      if (projetoIds.length === 0) { setLoading(false); return }

      // 2. Fetch obras linked to these projetos
      const { data: obrasData } = await supabase
        .from('obras')
        .select('*')
        .in('projeto_id', projetoIds)
      setObras(obrasData || [])
      const obraIds = (obrasData || []).map(o => o.id)

      // 3. Fetch tab-specific data in parallel
      const promises = []

      // Procurement: deal_rooms + orcamentos_recebidos
      promises.push(
        supabase.from('deal_rooms').select('*').in('projeto_id', projetoIds)
          .then(r => setDealRooms(r.data || []))
          .catch(() => setDealRooms([]))
      )
      promises.push(
        supabase.from('orcamentos_recebidos').select('*').in('projeto_id', projetoIds)
          .then(r => setOrcamentosRecebidos(r.data || []))
          .catch(() => setOrcamentosRecebidos([]))
      )

      // Compras: obras_compras (via obras) + compras (financeiro, direct)
      if (obraIds.length > 0) {
        promises.push(
          supabase.from('obras_compras').select('*, fornecedores(nome)').in('obra_id', obraIds)
            .then(r => setObrasCompras(r.data || []))
            .catch(() => setObrasCompras([]))
        )
      }
      promises.push(
        supabase.from('compras').select('*').in('projeto_id', projetoIds)
          .then(r => setComprasFinanceiro(r.data || []))
          .catch(() => setComprasFinanceiro([]))
      )

      // Controlo Executado: obras_execucao (via obras)
      if (obraIds.length > 0) {
        promises.push(
          supabase.from('obras_execucao').select('*').in('obra_id', obraIds)
            .then(r => setObrasExecucao(r.data || []))
            .catch(() => setObrasExecucao([]))
        )
      }

      // Autos (via obras)
      if (obraIds.length > 0) {
        promises.push(
          supabase.from('autos').select('*').in('obra_id', obraIds).order('ano', { ascending: false })
            .then(r => setAutos(r.data || []))
            .catch(() => setAutos([]))
        )
      }

      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [mode, isEmCurso])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filteredProjetos = projetos.filter(p =>
    !searchTerm ||
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Helper: get obras for a project
  const getObrasForProject = (projetoId) => obras.filter(o => o.projeto_id === projetoId)
  const getObraIds = (projetoId) => getObrasForProject(projetoId).map(o => o.id)

  // Per-project data getters
  const getProjectProcurement = (projetoId) => {
    const dr = dealRooms.filter(d => d.projeto_id === projetoId)
    const orc = orcamentosRecebidos.filter(o => o.projeto_id === projetoId)
    return { dealRooms: dr, orcamentos: orc, total: dr.length + orc.length }
  }

  const getProjectCompras = (projetoId) => {
    const oIds = getObraIds(projetoId)
    const fromObras = obrasCompras.filter(c => oIds.includes(c.obra_id))
    const fromFinanceiro = comprasFinanceiro.filter(c => c.projeto_id === projetoId)
    const totalValor = fromObras.reduce((s, c) => s + (c.preco_comprado_total || 0), 0)
      + fromFinanceiro.reduce((s, c) => s + (c.valor || 0), 0)
    return { fromObras, fromFinanceiro, count: fromObras.length + fromFinanceiro.length, totalValor }
  }

  const getProjectControlo = (projetoId) => {
    const oIds = getObraIds(projetoId)
    const exec = obrasExecucao.filter(e => oIds.includes(e.obra_id))
    const avgExec = exec.length > 0
      ? exec.reduce((s, e) => s + (e.percentagem_execucao || 0), 0) / exec.length
      : 0
    return { execucoes: exec, count: exec.length, avgExecucao: avgExec }
  }

  const getProjectAutos = (projetoId) => {
    const oIds = getObraIds(projetoId)
    const autosP = autos.filter(a => oIds.includes(a.obra_id))
    const totalValor = autosP.reduce((s, a) => s + (a.valor_acumulado || 0), 0)
    return { autos: autosP, count: autosP.length, totalValor }
  }

  // KPI totals
  const totalDealRooms = dealRooms.length
  const totalOrcRecebidos = orcamentosRecebidos.length
  const totalComprasValor = obrasCompras.reduce((s, c) => s + (c.preco_comprado_total || 0), 0)
    + comprasFinanceiro.reduce((s, c) => s + (c.valor || 0), 0)
  const totalComprasCount = obrasCompras.length + comprasFinanceiro.length
  const avgExecGlobal = obrasExecucao.length > 0
    ? obrasExecucao.reduce((s, e) => s + (e.percentagem_execucao || 0), 0) / obrasExecucao.length : 0
  const totalAutosValor = autos.reduce((s, a) => s + (a.valor_acumulado || 0), 0)

  const handleTabClick = (tabKey) => {
    navigate(`/gestao-projeto/${mode}/${tabKey}`)
  }

  const autosLabel = isEmCurso ? 'Autos Projeto' : 'Autos Obra'

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-olive)' }} />
      </div>
    )
  }

  const renderTabKPIs = () => {
    if (!activeTab) return null
    const kpis = {
      procurement: [
        { label: 'Deal Rooms', value: totalDealRooms, color: '#8B5CF6' },
        { label: 'Orçamentos Recebidos', value: totalOrcRecebidos, color: '#3B82F6' },
        { label: 'Abertos', value: dealRooms.filter(d => d.status === 'aberto').length, color: '#D97706' },
        { label: 'Decididos', value: dealRooms.filter(d => d.status === 'decidido').length, color: '#059669' },
      ],
      compras: [
        { label: 'Total Compras', value: formatCurrency(totalComprasValor), color: 'var(--accent-olive)' },
        { label: 'N.º Compras', value: totalComprasCount, color: '#3B82F6' },
        { label: 'Via Obras', value: obrasCompras.length, color: '#D97706' },
        { label: 'Via Projetos', value: comprasFinanceiro.length, color: '#8B5CF6' },
      ],
      controlo: [
        { label: 'Exec. Média', value: `${avgExecGlobal.toFixed(1)}%`, color: 'var(--accent-olive)' },
        { label: 'Registos', value: obrasExecucao.length, color: '#3B82F6' },
        { label: 'Obras Vinculadas', value: obras.length, color: '#D97706' },
      ],
      autos: [
        { label: 'Valor Acumulado', value: formatCurrency(totalAutosValor), color: 'var(--accent-olive)' },
        { label: 'N.º Autos', value: autos.length, color: '#3B82F6' },
        { label: 'Aprovados', value: autos.filter(a => a.estado === 'aprovado').length, color: '#059669' },
        { label: 'Rascunho', value: autos.filter(a => a.estado === 'rascunho').length, color: '#6B7280' },
      ],
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {(kpis[activeTab] || []).map((kpi, i) => (
          <div key={i} className="card" style={{ padding: '16px', borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brown)' }}>{kpi.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderProjectCard = (projeto) => {
    const procurement = getProjectProcurement(projeto.id)
    const compras = getProjectCompras(projeto.id)
    const controlo = getProjectControlo(projeto.id)
    const autosP = getProjectAutos(projeto.id)
    const projetoObras = getObrasForProject(projeto.id)

    const tabData = {
      procurement: [
        { label: 'Deal Rooms', value: procurement.dealRooms.length },
        { label: 'Orçamentos', value: procurement.orcamentos.length },
      ],
      compras: [
        { label: 'Compras', value: compras.count },
        { label: 'Valor', value: formatCurrency(compras.totalValor) },
      ],
      controlo: [
        { label: 'Exec. Média', value: `${controlo.avgExecucao.toFixed(1)}%` },
        { label: 'Registos', value: controlo.count },
      ],
      autos: [
        { label: 'Autos', value: autosP.count },
        { label: 'Valor', value: formatCurrency(autosP.totalValor) },
      ],
    }

    const data = activeTab ? tabData[activeTab] : null

    return (
      <div
        key={projeto.id}
        className="card"
        style={{ padding: '16px', cursor: 'pointer', transition: 'transform 0.15s' }}
        onClick={() => navigate(`/projetos/${projeto.id}`)}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(122, 139, 110, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Building2 size={18} style={{ color: 'var(--accent-olive)' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', fontWeight: 600, letterSpacing: '0.5px' }}>
                {projeto.codigo}
                {projetoObras.length > 0 && (
                  <span style={{ marginLeft: '8px', color: '#D97706', fontSize: '10px' }}>
                    <HardHat size={10} style={{ verticalAlign: '-1px' }} /> {projetoObras.length} obra{projetoObras.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {projeto.nome}
              </div>
              {projeto.cliente_nome && (
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{projeto.cliente_nome}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            {/* Tab-specific data pills */}
            {data && (
              <div style={{ display: 'flex', gap: '12px' }}>
                {data.map((d, i) => (
                  <div key={i} style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brown)' }}>{d.value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--brown-light)' }}>{d.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Status + arrow */}
            <span style={{
              padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
              background: isEmCurso ? 'rgba(217, 119, 6, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              color: isEmCurso ? '#D97706' : '#059669'
            }}>
              {projeto.fase || projeto.status}
            </span>
            <ChevronRight size={16} style={{ color: 'var(--brown-light)' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEmCurso ? 'Projetos em Curso' : 'Projetos Concluídos'}
          </h1>
          <p className="page-subtitle">
            {isEmCurso
              ? `${projetos.length} projetos ativos — Procurement, Compras, Controlo e Autos`
              : `${projetos.length} projetos concluídos — Histórico e documentação`
            }
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px',
        borderBottom: '2px solid var(--stone)', paddingBottom: '0'
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          const label = tab.key === 'autos' ? autosLabel : tab.label
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 20px',
                background: isActive ? 'var(--accent-olive)' : 'transparent',
                color: isActive ? 'white' : 'var(--brown-light)',
                border: 'none', borderRadius: '8px 8px 0 0',
                cursor: 'pointer', fontSize: '13px',
                fontWeight: isActive ? 600 : 500, transition: 'all 0.2s'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab KPIs */}
      {renderTabKPIs()}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
        <input
          type="text"
          placeholder="Pesquisar projetos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Project Cards */}
      {activeTab ? (
        filteredProjetos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredProjetos.map(renderProjectCard)}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              {activeTab === 'procurement' && <Handshake size={48} />}
              {activeTab === 'compras' && <ShoppingCart size={48} />}
              {activeTab === 'controlo' && <PieChart size={48} />}
              {activeTab === 'autos' && <FileCheck size={48} />}
              <h3>Sem dados de {TABS.find(t => t.key === activeTab)?.label}</h3>
              <p>Os dados serão apresentados aqui quando disponíveis.</p>
            </div>
          </div>
        )
      ) : (
        /* Overview - no tab selected */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const label = tab.key === 'autos' ? autosLabel : tab.label
              const counts = {
                procurement: totalDealRooms + totalOrcRecebidos,
                compras: totalComprasCount,
                controlo: obrasExecucao.length,
                autos: autos.length,
              }
              return (
                <div
                  key={tab.key}
                  className="card"
                  onClick={() => handleTabClick(tab.key)}
                  style={{ padding: '24px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', borderTop: `3px solid ${tab.color}` }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: `${tab.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <Icon size={24} style={{ color: tab.color }} />
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>{label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: tab.color, margin: '4px 0' }}>
                    {counts[tab.key]}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                    registos em {projetos.length} projetos
                  </div>
                </div>
              )
            })}
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>
            {isEmCurso ? 'Projetos Ativos' : 'Projetos Concluídos'}
          </h3>
          {filteredProjetos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredProjetos.map(renderProjectCard)}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                {isEmCurso ? <FolderKanban size={48} /> : <ClipboardList size={48} />}
                <h3>Nenhum projeto {isEmCurso ? 'em curso' : 'concluído'}</h3>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
