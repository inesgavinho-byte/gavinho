import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TIPO_CONFIG = {
  design: { label: 'Design', bg: '#E0E7FF', color: '#4338CA', icon: '🎨' },
  material: { label: 'Material', bg: '#FEF3C7', color: '#D97706', icon: '🪨' },
  tecnico: { label: 'Técnico', bg: '#DCFCE7', color: '#16A34A', icon: '⚙️' },
  financeiro: { label: 'Financeiro', bg: '#FCE7F3', color: '#DB2777', icon: '💰' },
  prazo: { label: 'Prazo', bg: '#E0E7FF', color: '#4338CA', icon: '📅' },
  fornecedor: { label: 'Fornecedor', bg: '#F3E8FF', color: '#9333EA', icon: '🏭' },
  alteracao: { label: 'Alteração', bg: '#FEE2E2', color: '#DC2626', icon: '🔄' }
}

const IMPACTO_CONFIG = {
  critico: { label: 'Crítico', bg: '#EF4444', color: '#FFF' },
  alto: { label: 'Alto', bg: '#F59E0B', color: '#FFF' },
  medio: { label: 'Médio', bg: '#8B8670', color: '#FFF' },
  baixo: { label: 'Baixo', bg: '#9CA3AF', color: '#FFF' }
}

export default function DecisoesList({ projetoId, onSelectDecisao, onNovaDecisao }) {
  const [decisoes, setDecisoes] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [stats, setStats] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ tipo: null, impacto: null, estado: 'validada' })
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (projetoId) {
      fetchDecisoes()
      fetchPendentes()
      fetchStats()
    }
  }, [projetoId, filters])

  const fetchDecisoes = async () => {
    setLoading(true)
    let query = supabase
      .from('decisoes')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('data_decisao', { ascending: false })

    if (filters.estado) query = query.eq('estado', filters.estado)
    if (filters.tipo) query = query.eq('tipo', filters.tipo)
    if (filters.impacto) query = query.eq('impacto', filters.impacto)

    const { data } = await query
    setDecisoes(data || [])
    setLoading(false)
  }

  const fetchPendentes = async () => {
    const { data } = await supabase
      .from('decisoes')
      .select('*')
      .eq('projeto_id', projetoId)
      .eq('estado', 'sugerida')
    setPendentes(data || [])
  }

  const fetchStats = async () => {
    const { data } = await supabase.rpc('get_decisoes_stats', { p_projeto_id: projetoId })
    if (data && data.length > 0) setStats(data[0])
  }

  const handleSearch = async () => {
    if (!search.trim()) { fetchDecisoes(); return }
    setLoading(true)
    const { data } = await supabase.rpc('search_decisoes_fulltext', {
      search_query: search,
      filter_projeto_id: projetoId,
      filter_estado: filters.estado
    })
    setDecisoes(data || [])
    setLoading(false)
  }

  const decisoesPorMes = decisoes.reduce((acc, d) => {
    const mes = new Date(d.data_decisao).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    if (!acc[mes]) acc[mes] = []
    acc[mes].push(d)
    return acc
  }, {})

  const formatCurrency = (value) => {
    if (!value) return null
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'Cormorant Garamond, serif', margin: 0 }}>📋 Decisões</h1>
          {stats && <span style={{ fontSize: '13px', color: '#8B8670' }}>{stats.validadas} registadas</span>}
        </div>
        <button onClick={onNovaDecisao} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', backgroundColor: '#8B8670', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          + Nova Decisão
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', backgroundColor: '#FFF', border: '1px solid #E5E5E5', borderRadius: '8px' }}>
          <input
            type="text"
            placeholder="Pesquisar decisões..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px' }}
          />
          {search && <button onClick={handleSearch} style={{ padding: '6px 12px', backgroundColor: '#8B8670', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Pesquisar</button>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '10px 16px', backgroundColor: showFilters ? '#F2F0E7' : '#FFF', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ backgroundColor: '#FFF', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B8670', marginBottom: '8px', textTransform: 'uppercase' }}>Tipo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button onClick={() => setFilters({ ...filters, tipo: null })} style={{ padding: '6px 12px', backgroundColor: filters.tipo === null ? '#8B8670' : '#F9F9F7', color: filters.tipo === null ? '#FFF' : '#5F5C59', border: '1px solid #E5E5E5', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>Todos</button>
              {Object.entries(TIPO_CONFIG).map(([key, config]) => (
                <button key={key} onClick={() => setFilters({ ...filters, tipo: key })} style={{ padding: '6px 12px', backgroundColor: filters.tipo === key ? '#8B8670' : '#F9F9F7', color: filters.tipo === key ? '#FFF' : '#5F5C59', border: '1px solid #E5E5E5', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pendentes Alert */}
      {pendentes.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', backgroundColor: '#FEF3C7', borderRadius: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#92400E' }}>{pendentes.length} decisões aguardam validação</strong>
          </div>
          <button onClick={() => setFilters({ ...filters, estado: 'sugerida' })} style={{ padding: '8px 14px', backgroundColor: '#D97706', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Validar →</button>
        </div>
      )}

      {/* Estado Toggle */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: '#F2F0E7', borderRadius: '8px', marginBottom: '20px', width: 'fit-content' }}>
        {[{ v: 'validada', l: 'Validadas' }, { v: 'sugerida', l: 'Pendentes' }, { v: null, l: 'Todas' }].map(({ v, l }) => (
          <button key={l} onClick={() => setFilters({ ...filters, estado: v })} style={{ padding: '8px 16px', backgroundColor: filters.estado === v ? '#FFF' : 'transparent', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: filters.estado === v ? 500 : 400 }}>{l}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>A carregar...</div>
      ) : decisoes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#FFF', borderRadius: '12px', border: '1px dashed #E5E5E5' }}>
          <span style={{ fontSize: '48px' }}>📋</span>
          <p style={{ color: '#9CA3AF', margin: '16px 0' }}>Ainda não há decisões registadas</p>
          <button onClick={onNovaDecisao} style={{ padding: '10px 18px', backgroundColor: '#8B8670', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>+ Registar primeira decisão</button>
        </div>
      ) : (
        Object.entries(decisoesPorMes).map(([mes, items]) => (
          <div key={mes} style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#8B8670', marginBottom: '12px', textTransform: 'uppercase' }}>{mes}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map(decisao => {
                const tipo = TIPO_CONFIG[decisao.tipo] || TIPO_CONFIG.design
                const impacto = IMPACTO_CONFIG[decisao.impacto] || IMPACTO_CONFIG.medio
                return (
                  <div key={decisao.id} onClick={() => onSelectDecisao(decisao)} style={{ backgroundColor: decisao.estado === 'sugerida' ? '#FFFBEB' : '#FFF', borderRadius: '10px', padding: '16px 18px', cursor: 'pointer', border: `1px solid ${decisao.estado === 'sugerida' ? '#FCD34D' : '#E5E5E5'}`, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#8B8670' }}>{decisao.codigo}</span>
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{new Date(decisao.data_decisao).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#1a1a1a' }}>{decisao.titulo}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: tipo.bg, color: tipo.color }}>{tipo.icon} {tipo.label}</span>
                      <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: impacto.bg, color: impacto.color }}>{impacto.label}</span>
                      {decisao.impacto_orcamento && <span style={{ fontSize: '12px', fontWeight: 500, color: decisao.impacto_orcamento > 0 ? '#DC2626' : '#16A34A' }}>{decisao.impacto_orcamento > 0 ? '+' : ''}{formatCurrency(decisao.impacto_orcamento)}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9CA3AF' }}>
                      <span style={{ color: '#5F5C59' }}>{decisao.decidido_por}</span>
                      <span>{decisao.fonte === 'email' ? '📧 Email' : decisao.fonte === 'reuniao' ? '🎤 Reunião' : '✏️ Manual'}</span>
                    </div>
                    {decisao.estado === 'sugerida' && <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 8px', backgroundColor: '#FCD34D', color: '#92400E', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>A VALIDAR</div>}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
