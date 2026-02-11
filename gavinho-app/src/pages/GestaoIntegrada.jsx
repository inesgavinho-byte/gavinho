import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Layers, Handshake, ShoppingCart, PieChart, FileCheck,
  Building2, FolderKanban, ChevronRight, Loader2, HardHat,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Search,
  Link2, ArrowRight, Truck, DollarSign
} from 'lucide-react'

const MODULES = [
  { key: 'procurement', label: 'Procurement', icon: Handshake, color: '#8B5CF6' },
  { key: 'compras', label: 'Compras', icon: ShoppingCart, color: '#3B82F6' },
  { key: 'controlo', label: 'Controlo Executado', icon: PieChart, color: '#D97706' },
  { key: 'autos', label: 'Autos', icon: FileCheck, color: '#059669' },
]

const formatCurrency = (val) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val || 0)

export default function GestaoIntegrada() {
  const navigate = useNavigate()
  const [projetos, setProjetos] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState(null)
  const [viewMode, setViewMode] = useState('all') // 'all', 'design_build', 'design_only', 'obras_only'

  // Real data
  const [dealRooms, setDealRooms] = useState([])
  const [orcamentosRecebidos, setOrcamentosRecebidos] = useState([])
  const [obrasCompras, setObrasCompras] = useState([])
  const [comprasFinanceiro, setComprasFinanceiro] = useState([])
  const [obrasExecucao, setObrasExecucao] = useState([])
  const [autos, setAutos] = useState([])

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      // Core data
      const [projetosRes, obrasRes] = await Promise.all([
        supabase.from('projetos').select('*').order('codigo', { ascending: true }),
        supabase.from('obras').select('*').order('codigo', { ascending: true }),
      ])
      const projetosData = projetosRes.data || []
      const obrasData = obrasRes.data || []
      setProjetos(projetosData)
      setObras(obrasData)

      const projetoIds = projetosData.map(p => p.id)
      const obraIds = obrasData.map(o => o.id)

      // Fetch all module data in parallel
      const promises = []

      if (projetoIds.length > 0) {
        promises.push(
          supabase.from('deal_rooms').select('*').in('projeto_id', projetoIds)
            .then(r => setDealRooms(r.data || [])).catch(() => setDealRooms([]))
        )
        promises.push(
          supabase.from('orcamentos_recebidos').select('*').in('projeto_id', projetoIds)
            .then(r => setOrcamentosRecebidos(r.data || [])).catch(() => setOrcamentosRecebidos([]))
        )
        promises.push(
          supabase.from('compras').select('*').in('projeto_id', projetoIds)
            .then(r => setComprasFinanceiro(r.data || [])).catch(() => setComprasFinanceiro([]))
        )
      }

      if (obraIds.length > 0) {
        promises.push(
          supabase.from('obras_compras').select('*, fornecedores(nome)').in('obra_id', obraIds)
            .then(r => setObrasCompras(r.data || [])).catch(() => setObrasCompras([]))
        )
        promises.push(
          supabase.from('obras_execucao').select('*').in('obra_id', obraIds)
            .then(r => setObrasExecucao(r.data || [])).catch(() => setObrasExecucao([]))
        )
        promises.push(
          supabase.from('autos').select('*').in('obra_id', obraIds)
            .then(r => setAutos(r.data || [])).catch(() => setAutos([]))
        )
      }

      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cross-reference: projetos ↔ obras
  const getObrasForProject = (projetoId) => obras.filter(o => o.projeto_id === projetoId)

  const designBuildProjects = projetos.filter(p => getObrasForProject(p.id).length > 0)
  const designOnlyProjects = projetos.filter(p => getObrasForProject(p.id).length === 0)
  const orphanObras = obras.filter(o => !o.projeto_id)

  // Aggregated stats per project
  const getProjectStats = (projetoId) => {
    const obraIds = getObrasForProject(projetoId).map(o => o.id)

    const procurement = {
      dealRooms: dealRooms.filter(d => d.projeto_id === projetoId).length,
      orcamentos: orcamentosRecebidos.filter(o => o.projeto_id === projetoId).length,
    }

    const comprasObra = obrasCompras.filter(c => obraIds.includes(c.obra_id))
    const comprasProj = comprasFinanceiro.filter(c => c.projeto_id === projetoId)
    const compras = {
      count: comprasObra.length + comprasProj.length,
      valor: comprasObra.reduce((s, c) => s + (c.preco_comprado_total || 0), 0)
        + comprasProj.reduce((s, c) => s + (c.valor || 0), 0),
    }

    const exec = obrasExecucao.filter(e => obraIds.includes(e.obra_id))
    const controlo = {
      count: exec.length,
      avgExec: exec.length > 0 ? exec.reduce((s, e) => s + (e.percentagem_execucao || 0), 0) / exec.length : 0,
    }

    const autosP = autos.filter(a => obraIds.includes(a.obra_id))
    const autosStats = {
      count: autosP.length,
      valor: autosP.reduce((s, a) => s + (a.valor_acumulado || 0), 0),
    }

    return { procurement, compras, controlo, autos: autosStats }
  }

  // Global KPIs
  const totalComprasValor = obrasCompras.reduce((s, c) => s + (c.preco_comprado_total || 0), 0)
    + comprasFinanceiro.reduce((s, c) => s + (c.valor || 0), 0)
  const avgExecGlobal = obrasExecucao.length > 0
    ? obrasExecucao.reduce((s, e) => s + (e.percentagem_execucao || 0), 0) / obrasExecucao.length : 0
  const totalAutosValor = autos.reduce((s, a) => s + (a.valor_acumulado || 0), 0)

  // Filter based on view mode
  const getFilteredProjects = () => {
    let list = projetos
    if (viewMode === 'design_build') list = designBuildProjects
    else if (viewMode === 'design_only') list = designOnlyProjects

    return list.filter(p =>
      !searchTerm ||
      p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredProjetos = getFilteredProjects()

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-olive)' }} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestão Integrada</h1>
          <p className="page-subtitle">Visão global — Projetos, Obras, Procurement, Compras, Controlo e Autos</p>
        </div>
      </div>

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--accent-olive)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderKanban size={20} style={{ color: 'var(--accent-olive)' }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{projetos.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Projetos</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HardHat size={20} style={{ color: '#D97706' }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{obras.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Obras</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #8B5CF6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link2 size={20} style={{ color: '#8B5CF6' }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{designBuildProjects.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Design & Build</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DollarSign size={20} style={{ color: '#3B82F6' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brown)' }}>{formatCurrency(totalComprasValor)}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Total Compras</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileCheck size={20} style={{ color: '#059669' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brown)' }}>{formatCurrency(totalAutosValor)}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Autos Acumulados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {MODULES.map(mod => {
          const Icon = mod.icon
          const isSelected = selectedModule === mod.key
          const counts = {
            procurement: dealRooms.length + orcamentosRecebidos.length,
            compras: obrasCompras.length + comprasFinanceiro.length,
            controlo: obrasExecucao.length,
            autos: autos.length,
          }
          return (
            <div
              key={mod.key}
              className="card"
              onClick={() => setSelectedModule(isSelected ? null : mod.key)}
              style={{
                padding: '16px', cursor: 'pointer',
                borderTop: `3px solid ${mod.color}`,
                background: isSelected ? `${mod.color}08` : undefined,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: `${mod.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={20} style={{ color: mod.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>{mod.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: mod.color }}>{counts[mod.key]}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* View Mode Toggle + Search */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--cream)', borderRadius: '8px', padding: '3px' }}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'design_build', label: 'Design & Build' },
            { key: 'design_only', label: 'Só Design' },
            { key: 'obras_only', label: 'Só Obras' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                background: viewMode === v.key ? 'var(--accent-olive)' : 'transparent',
                color: viewMode === v.key ? 'white' : 'var(--brown-light)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* Main Content: Cross-Module Table */}
      {viewMode !== 'obras_only' && (
        <div className="card" style={{ overflow: 'auto', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Projeto</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>
                  <HardHat size={12} style={{ verticalAlign: '-2px' }} /> Obras
                </th>
                <th style={{ ...thStyle, textAlign: 'center' }}>
                  <Handshake size={12} style={{ verticalAlign: '-2px' }} /> Procurement
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }}>
                  <ShoppingCart size={12} style={{ verticalAlign: '-2px' }} /> Compras
                </th>
                <th style={{ ...thStyle, textAlign: 'center' }}>
                  <PieChart size={12} style={{ verticalAlign: '-2px' }} /> Exec.
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }}>
                  <FileCheck size={12} style={{ verticalAlign: '-2px' }} /> Autos
                </th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filteredProjetos.map(projeto => {
                const projetoObras = getObrasForProject(projeto.id)
                const stats = getProjectStats(projeto.id)
                const isDB = projetoObras.length > 0

                return (
                  <tr
                    key={projeto.id}
                    style={{ borderBottom: '1px solid var(--stone)', cursor: 'pointer' }}
                    onClick={() => navigate(`/projetos/${projeto.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--accent-olive)' }}>
                      {projeto.codigo}
                      {isDB && (
                        <span style={{
                          marginLeft: '6px', padding: '1px 6px', borderRadius: '4px',
                          fontSize: '9px', fontWeight: 700, background: '#8B5CF615', color: '#8B5CF6',
                          verticalAlign: '1px'
                        }}>D&B</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--brown)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {projeto.nome}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--brown-light)', fontSize: '12px' }}>{projeto.cliente_nome || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                        background: 'rgba(122, 139, 110, 0.12)', color: 'var(--accent-olive)',
                        textTransform: 'capitalize'
                      }}>
                        {projeto.fase || projeto.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {isDB ? (
                        <span style={{ fontWeight: 600, color: '#D97706' }}>{projetoObras.length}</span>
                      ) : (
                        <span style={{ color: 'var(--stone)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {(stats.procurement.dealRooms + stats.procurement.orcamentos) > 0 ? (
                        <span style={{ fontWeight: 600, color: '#8B5CF6' }}>
                          {stats.procurement.dealRooms + stats.procurement.orcamentos}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--stone)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {stats.compras.count > 0 ? (
                        <span style={{ fontWeight: 600, color: '#3B82F6', fontSize: '12px' }}>
                          {formatCurrency(stats.compras.valor)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--stone)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {stats.controlo.count > 0 ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#D97706', fontSize: '12px' }}>
                            {stats.controlo.avgExec.toFixed(0)}%
                          </div>
                          <div style={{
                            height: '3px', borderRadius: '2px', background: 'var(--stone)',
                            width: '40px', margin: '2px auto 0'
                          }}>
                            <div style={{
                              height: '100%', borderRadius: '2px',
                              width: `${Math.min(stats.controlo.avgExec, 100)}%`,
                              background: '#D97706'
                            }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--stone)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {stats.autos.count > 0 ? (
                        <span style={{ fontWeight: 600, color: '#059669', fontSize: '12px' }}>
                          {formatCurrency(stats.autos.valor)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--stone)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <ChevronRight size={14} style={{ color: 'var(--brown-light)' }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredProjetos.length === 0 && (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Layers size={48} />
              <h3>Nenhum projeto encontrado</h3>
            </div>
          )}
        </div>
      )}

      {/* Obras without project (orphan) or obras-only view */}
      {(viewMode === 'obras_only' || (viewMode === 'all' && orphanObras.length > 0)) && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardHat size={18} style={{ color: '#D97706' }} />
            {viewMode === 'obras_only' ? 'Todas as Obras' : 'Obras sem Projeto Associado'}
          </h3>
          <div className="card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Obra</th>
                  <th style={thStyle}>Projeto</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Progresso</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {(viewMode === 'obras_only' ? obras : orphanObras).map(obra => {
                  const proj = projetos.find(p => p.id === obra.projeto_id)
                  return (
                    <tr
                      key={obra.id}
                      style={{ borderBottom: '1px solid var(--stone)', cursor: 'pointer' }}
                      onClick={() => navigate(`/obras/${obra.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#D97706' }}>{obra.codigo}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 500, color: 'var(--brown)' }}>{obra.nome}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--brown-light)', fontSize: '12px' }}>
                        {proj ? `${proj.codigo} — ${proj.nome}` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                          background: 'rgba(217, 119, 6, 0.12)', color: '#D97706',
                          textTransform: 'capitalize'
                        }}>
                          {obra.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {obra.progresso > 0 ? (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>{obra.progresso}%</span>
                            <div style={{ height: '3px', borderRadius: '2px', background: 'var(--stone)', width: '50px', margin: '2px auto 0' }}>
                              <div style={{
                                height: '100%', borderRadius: '2px',
                                width: `${obra.progresso}%`,
                                background: 'var(--accent-olive)'
                              }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--stone)', fontSize: '12px' }}>0%</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <ChevronRight size={14} style={{ color: 'var(--brown-light)' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '12px 14px',
  color: 'var(--brown-light)',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
}
