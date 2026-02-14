// =====================================================
// LEADS PIPELINE - Kanban board page
// Commercial funnel from first contact to signed contract
// Features: Kanban columns, KPIs, filters, detail panel,
//           list view toggle, creation form
// =====================================================

import { useState, useMemo } from 'react'
import {
  Plus, Search, TrendingUp, Users, Euro, Clock,
  Target, BarChart3, Loader2, Columns3, List,
  ChevronRight
} from 'lucide-react'
import { useLeadsPipeline } from '../hooks/useLeadsPipeline'
import { LeadCard } from '../components/leads/LeadCard'
import { LeadDetalhe } from '../components/leads/LeadDetalhe'
import { LeadForm } from '../components/leads/LeadForm'
import styles from './LeadsPipeline.module.css'

// ── Constants ──
const FASES = [
  { key: 'contacto_inicial', label: 'Contacto Inicial', color: '#6B7280' },
  { key: 'qualificacao', label: 'Qualificacao', color: '#D97706' },
  { key: 'proposta', label: 'Proposta', color: '#3B82F6' },
  { key: 'negociacao', label: 'Negociacao', color: '#8B5CF6' },
  { key: 'ganho', label: 'Ganho', color: '#059669' },
  { key: 'perdido', label: 'Perdido', color: '#DC2626' }
]

const TIPOLOGIAS = [
  { key: '', label: 'Todas Tipologias' },
  { key: 'moradia', label: 'Moradia' },
  { key: 'apartamento', label: 'Apartamento' },
  { key: 'comercial', label: 'Comercial' },
  { key: 'reabilitacao', label: 'Reabilitacao' },
  { key: 'outro', label: 'Outro' }
]

const PRIORIDADES = [
  { key: '', label: 'Todas Prioridades' },
  { key: 'alta', label: 'Alta' },
  { key: 'media', label: 'Media' },
  { key: 'baixa', label: 'Baixa' }
]

const FONTES = [
  { key: '', label: 'Todas Fontes' },
  { key: 'site', label: 'Website' },
  { key: 'referencia', label: 'Referencia' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'outro', label: 'Outro' }
]

const fmt = (v) => new Intl.NumberFormat('pt-PT', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0
}).format(v || 0)

const fmtPct = (v) => `${(v || 0).toFixed(1)}%`

// ── Main Component ──
export default function LeadsPipeline() {
  const {
    leads,
    leadsByFase,
    interacoes,
    loading,
    kpis,
    fetchInteracoes,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    addInteracao
  } = useLeadsPipeline()

  // UI state
  const [showForm, setShowForm] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [viewMode, setViewMode] = useState('kanban') // kanban | list
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipologia, setFilterTipologia] = useState('')
  const [filterPrioridade, setFilterPrioridade] = useState('')
  const [filterFonte, setFilterFonte] = useState('')

  // ── Filter leads ──
  const filteredLeads = useMemo(() => {
    let list = leads
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      list = list.filter(l =>
        l.nome?.toLowerCase().includes(term) ||
        l.empresa?.toLowerCase().includes(term) ||
        l.codigo?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term) ||
        l.localizacao?.toLowerCase().includes(term)
      )
    }
    if (filterTipologia) {
      list = list.filter(l => l.tipologia === filterTipologia)
    }
    if (filterPrioridade) {
      list = list.filter(l => l.prioridade === filterPrioridade)
    }
    if (filterFonte) {
      list = list.filter(l => l.fonte === filterFonte)
    }
    return list
  }, [leads, searchTerm, filterTipologia, filterPrioridade, filterFonte])

  // ── Filtered leads grouped by fase (for kanban) ──
  const filteredByFase = useMemo(() => {
    const grouped = {}
    for (const f of FASES) {
      grouped[f.key] = filteredLeads.filter(l => l.fase === f.key)
    }
    return grouped
  }, [filteredLeads])

  // ── Handlers ──
  const handleCardClick = async (lead) => {
    setSelectedLead(lead)
    await fetchInteracoes(lead.id)
  }

  const handleCreateLead = async (data) => {
    await createLead(data)
  }

  const handleMoveFase = async (leadId, newFase) => {
    const updated = await moveLead(leadId, newFase)
    setSelectedLead(updated)
    await fetchInteracoes(leadId)
  }

  const handleAddInteracao = async (leadId, data) => {
    await addInteracao(leadId, data)
  }

  const handleUpdateLead = async (leadId, updates) => {
    const updated = await updateLead(leadId, updates)
    setSelectedLead(updated)
  }

  const handleDeleteLead = async (leadId) => {
    await deleteLead(leadId)
    setSelectedLead(null)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-olive)' }} />
        <span style={{ fontSize: '0.85rem' }}>A carregar pipeline...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className={`${styles.page} fade-in`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Pipeline Comercial</h1>
          <p>Gestao de leads e oportunidades de negocio</p>
        </div>
        <button className={styles.novoBtn} onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Novo Lead
        </button>
      </div>

      {/* KPIs */}
      <div className={styles.kpiRow}>
        {[
          {
            label: 'Pipeline Ativo',
            value: kpis.pipelineAtivo,
            icon: Users,
            color: '#4a5d4a'
          },
          {
            label: 'Valor Pipeline',
            value: fmt(kpis.valorPipeline),
            icon: Euro,
            color: '#C9A882'
          },
          {
            label: 'Taxa Conversao',
            value: fmtPct(kpis.taxaConversao),
            icon: Target,
            color: kpis.taxaConversao > 30 ? '#059669' : '#D97706'
          },
          {
            label: 'Valor Ganho',
            value: fmt(kpis.valorGanho),
            icon: TrendingUp,
            color: '#059669'
          },
          {
            label: 'Tempo Medio',
            value: kpis.tempoMedioConversao > 0 ? `${kpis.tempoMedioConversao} dias` : '-',
            icon: Clock,
            color: '#6B7280'
          },
          {
            label: 'Total Leads',
            value: kpis.total,
            icon: BarChart3,
            color: '#4a5d4a'
          }
        ].map((kpi, i) => (
          <div key={i} className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: `${kpi.color}12` }}>
              <kpi.icon size={20} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className={styles.kpiLabel}>{kpi.label}</div>
              <div className={styles.kpiValue} style={{ color: kpi.color }}>
                {kpi.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Pesquisar leads..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={filterTipologia}
          onChange={e => setFilterTipologia(e.target.value)}
        >
          {TIPOLOGIAS.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filterPrioridade}
          onChange={e => setFilterPrioridade(e.target.value)}
        >
          {PRIORIDADES.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filterFonte}
          onChange={e => setFilterFonte(e.target.value)}
        >
          {FONTES.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.active : ''}`}
            onClick={() => setViewMode('kanban')}
          >
            <Columns3 size={14} />
            Kanban
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={14} />
            Lista
          </button>
        </div>
      </div>

      {/* Main Content */}
      {filteredLeads.length === 0 && leads.length === 0 ? (
        <div className={styles.emptyState}>
          <TrendingUp size={48} style={{ opacity: 0.3 }} />
          <h3>Nenhum lead registado</h3>
          <p>
            Comece a registar leads para acompanhar o pipeline comercial.
            Clique em "Novo Lead" para adicionar o primeiro.
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board */
        <div className={styles.kanban}>
          {FASES.map(fase => (
            <div key={fase.key} className={styles.kanbanColumn}>
              <div
                className={styles.columnHeader}
                style={{ borderBottomColor: fase.color }}
              >
                <span className={styles.columnTitle} style={{ color: fase.color }}>
                  {fase.label}
                </span>
                <span
                  className={styles.columnCount}
                  style={{ background: fase.color }}
                >
                  {filteredByFase[fase.key]?.length || 0}
                </span>
              </div>

              <div className={styles.columnCards}>
                {(filteredByFase[fase.key] || []).length > 0 ? (
                  filteredByFase[fase.key].map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={handleCardClick}
                    />
                  ))
                ) : (
                  <div className={styles.emptyColumn}>
                    Sem leads nesta fase
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className={styles.listView}>
          {/* List header */}
          <div className={styles.listItem} style={{
            background: 'var(--cream)',
            cursor: 'default',
            fontWeight: 700,
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            color: 'var(--brown-light)'
          }}>
            <div>Nome / Empresa</div>
            <div>Tipologia</div>
            <div>Fase</div>
            <div>Prioridade</div>
            <div>Orcamento</div>
            <div></div>
          </div>

          {filteredLeads.map(lead => {
            const fase = FASES.find(f => f.key === lead.fase) || FASES[0]
            return (
              <div
                key={lead.id}
                className={styles.listItem}
                onClick={() => handleCardClick(lead)}
              >
                <div>
                  <div className={styles.listNome}>{lead.nome}</div>
                  {lead.empresa && <div className={styles.listEmpresa}>{lead.empresa}</div>}
                </div>
                <div className={styles.listCell}>
                  {lead.tipologia ? lead.tipologia.charAt(0).toUpperCase() + lead.tipologia.slice(1) : '-'}
                </div>
                <div>
                  <span
                    className={styles.faseBadge}
                    style={{ background: `${fase.color}15`, color: fase.color }}
                  >
                    {fase.label}
                  </span>
                </div>
                <div className={styles.listCell}>
                  <span
                    className={styles.prioridadeDot}
                    style={{
                      background: lead.prioridade === 'alta' ? '#c44'
                        : lead.prioridade === 'baixa' ? '#4a5d4a'
                        : '#D97706'
                    }}
                  />
                  {(lead.prioridade || 'media').charAt(0).toUpperCase() + (lead.prioridade || 'media').slice(1)}
                </div>
                <div className={styles.listCell} style={{ fontWeight: 600 }}>
                  {lead.orcamento_estimado ? fmt(lead.orcamento_estimado) : '-'}
                </div>
                <div>
                  <ChevronRight size={16} style={{ color: 'var(--brown-light)' }} />
                </div>
              </div>
            )
          })}

          {filteredLeads.length === 0 && leads.length > 0 && (
            <div className={styles.emptyState}>
              <Search size={40} style={{ opacity: 0.3 }} />
              <h3>Nenhum resultado</h3>
              <p>Nenhum lead corresponde aos filtros selecionados.</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Panel */}
      {selectedLead && (
        <LeadDetalhe
          lead={selectedLead}
          interacoes={interacoes[selectedLead.id] || []}
          onClose={() => setSelectedLead(null)}
          onMoveFase={handleMoveFase}
          onAddInteracao={handleAddInteracao}
          onDelete={handleDeleteLead}
          onUpdate={handleUpdateLead}
        />
      )}

      {/* Create Form */}
      {showForm && (
        <LeadForm
          onSave={handleCreateLead}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
