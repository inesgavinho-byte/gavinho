import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  MapPin,
  ArrowRight,
  Calendar,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  FONTS,
  COLORS,
  SHADOWS,
  getPhaseColor,
  getPhaseBg,
} from '../styles/designTokens'

// Mockup colors
const C = {
  success: '#5B7B6A',
  warning: '#C4956A',
  danger: '#A65D57',
  dark: '#2C2C2B',
  darkCard: '#1E1E1D',
  muted: '#9A978A',
  light: '#6B6B6B',
  border: '#E5E2D9',
  cream: '#F5F3EB',
  white: '#FFFFFF',
  bg: '#F2F0E7',
}

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'tarefas', label: 'Tarefas', badge: 5 },
  { key: 'planning', label: 'Planning' },
  { key: 'bloqueios', label: 'Bloqueios', badge: 2 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalProjetos: 0,
    projetosAtivos: 0,
    projetosNoPrazo: 0,
    projetosEmRisco: 0,
    projetosAtrasados: 0,
    decisoesPendentes: 0,
  })
  const [heroProject, setHeroProject] = useState(null)
  const [recentProjects, setRecentProjects] = useState([])
  const [projectsByPhase, setProjectsByPhase] = useState([])
  const [milestones, setMilestones] = useState([])

  const fetchData = async () => {
    try {
      const { data: projetos } = await supabase
        .from('projetos')
        .select('*')
        .order('updated_at', { ascending: false })

      if (projetos && projetos.length > 0) {
        const ativos = projetos.filter(p => p.fase !== 'Entrega' && p.fase !== 'Casa Viva')
        const noPrazo = projetos.filter(p => p.status === 'on_track')
        const emRisco = projetos.filter(p => p.status === 'at_risk')
        const atrasados = projetos.filter(p => p.status === 'delayed')

        // Hero: project with highest progress that's active
        const hero = ativos
          .filter(p => p.progresso > 0)
          .sort((a, b) => (b.progresso || 0) - (a.progresso || 0))[0] || ativos[0]

        setHeroProject(hero || null)

        setStats({
          totalProjetos: projetos.length,
          projetosAtivos: ativos.length,
          projetosNoPrazo: noPrazo.length,
          projetosEmRisco: emRisco.length,
          projetosAtrasados: atrasados.length,
          decisoesPendentes: 0,
        })

        setRecentProjects(projetos.slice(0, 5))

        const faseCount = {}
        projetos.forEach(p => {
          const fase = p.fase || 'Outros'
          faseCount[fase] = (faseCount[fase] || 0) + 1
        })
        setProjectsByPhase(
          Object.entries(faseCount)
            .map(([fase, count]) => ({ fase, count }))
            .sort((a, b) => b.count - a.count)
        )

        // Milestones from projects with deadlines
        const upcoming = projetos
          .filter(p => p.data_fim)
          .map(p => ({
            id: p.id,
            titulo: p.nome,
            codigo: p.codigo,
            data: new Date(p.data_fim),
          }))
          .filter(m => m.data >= new Date())
          .sort((a, b) => a.data - b.data)
          .slice(0, 3)
        setMilestones(upcoming)
      }

      // Decisões pendentes
      try {
        const { data: decisoes } = await supabase
          .from('decisoes')
          .select('id')
          .eq('status', 'pendente')
        if (decisoes) {
          setStats(prev => ({ ...prev, decisoesPendentes: decisoes.length }))
        }
      } catch (e) { /* table may not exist */ }

    } catch (err) {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleTabClick = (key) => {
    if (key === 'tarefas') navigate('/equipa')
    else if (key === 'planning') navigate('/planning')
    else if (key === 'bloqueios') navigate('/bloqueios')
    else setActiveTab(key)
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'on_track': return 'No Prazo'
      case 'at_risk': return 'Atenção'
      case 'delayed': return 'Atrasado'
      case 'on_hold': return 'Pausado'
      case 'completed': return 'Concluído'
      default: return 'Em Curso'
    }
  }

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'on_track': return C.success
      case 'at_risk': return C.warning
      case 'delayed': return C.danger
      default: return C.muted
    }
  }

  const daysUntil = (date) => {
    const diff = Math.ceil((date - new Date()) / 86400000)
    return diff
  }

  const totalPhase = projectsByPhase.reduce((s, p) => s + p.count, 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
            border: `3px solid ${C.border}`,
            borderTopColor: C.success,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: C.light, fontFamily: FONTS.body, fontSize: '14px' }}>A carregar...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* ═══ 1. HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: '36px',
            fontWeight: 600,
            color: C.dark,
            letterSpacing: '-0.5px',
            margin: 0,
            lineHeight: 1.1
          }}>
            Dashboard
          </h1>
          <p style={{
            fontFamily: FONTS.body,
            fontSize: '14px',
            color: C.light,
            marginTop: '6px'
          }}>
            Visão geral e gestão de projetos
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px',
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            fontFamily: FONTS.body,
            fontSize: '13px',
            fontWeight: 600,
            color: C.dark,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '28px',
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: '0',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabClick(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.key ? `2px solid ${C.dark}` : '2px solid transparent',
              fontFamily: FONTS.body,
              fontSize: '13px',
              fontWeight: activeTab === t.key ? 700 : 400,
              color: activeTab === t.key ? C.dark : C.light,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: '-1px',
            }}
          >
            {t.label}
            {t.badge && (
              <span style={{
                background: activeTab === t.key ? C.dark : 'rgba(0,0,0,0.08)',
                color: activeTab === t.key ? C.white : C.light,
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '10px',
                lineHeight: '14px',
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ 2. HERO PROJECT ═══ */}
      {heroProject && (
        <div
          onClick={() => navigate(`/projetos/${heroProject.codigo}`)}
          style={{
            background: `linear-gradient(135deg, ${C.dark} 0%, #3A3A38 50%, #2C2C2B 100%)`,
            borderRadius: '16px',
            padding: '32px 36px',
            marginBottom: '24px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '180px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Subtle texture overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.03) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />

          {/* Status badge */}
          <div style={{
            position: 'absolute', top: '24px', right: '28px',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.08)',
            padding: '6px 14px',
            borderRadius: '20px',
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: getStatusDotColor(heroProject.status),
            }} />
            <span style={{
              fontFamily: FONTS.body, fontSize: '12px', fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
            }}>
              {getStatusLabel(heroProject.status)}
            </span>
          </div>

          {/* Image placeholder right side */}
          <div style={{
            position: 'absolute', right: '36px', bottom: '28px',
            width: '140px', height: '90px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <span style={{
            fontFamily: FONTS.body, fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.45)',
            marginBottom: '10px',
          }}>
            Projeto em destaque
          </span>

          <h2 style={{
            fontFamily: FONTS.heading, fontSize: '28px', fontWeight: 600,
            color: C.white, margin: '0 0 12px', lineHeight: 1.15,
            maxWidth: '60%',
          }}>
            {heroProject.nome}
          </h2>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            flexWrap: 'wrap',
          }}>
            {heroProject.codigo && (
              <span style={{ fontFamily: FONTS.mono, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {heroProject.codigo}
              </span>
            )}
            {heroProject.cliente_nome && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{ fontFamily: FONTS.body, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  {heroProject.cliente_nome}
                </span>
              </>
            )}
            {heroProject.localizacao && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{ fontFamily: FONTS.body, fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={11} />
                  {heroProject.localizacao}
                </span>
              </>
            )}
            {heroProject.progresso > 0 && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{ fontFamily: FONTS.body, fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                  {heroProject.progresso}% concluído
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ 3. METRICS ROW ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {[
          { label: 'PROJETOS', value: stats.totalProjetos, detail: `${stats.projetosAtivos} em andamento`, color: C.dark },
          { label: 'NO PRAZO', value: stats.projetosNoPrazo, detail: `${stats.projetosAtrasados} com atraso`, color: C.success },
          { label: 'ATENÇÃO', value: stats.projetosEmRisco, detail: stats.projetosEmRisco > 0 ? 'requerem atenção' : 'tudo em ordem', color: C.warning, detailColor: C.warning },
          { label: 'DECISÕES', value: stats.decisoesPendentes, detail: stats.decisoesPendentes > 0 ? 'pendentes de aprovação' : 'sem pendentes', color: C.danger, detailColor: stats.decisoesPendentes > 0 ? C.danger : undefined },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: C.white,
            borderRadius: '14px',
            padding: '20px 22px',
            border: `1px solid ${C.border}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}>
            <span style={{
              fontFamily: FONTS.body, fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: C.muted,
            }}>
              {kpi.label}
            </span>
            <div style={{
              fontFamily: FONTS.body, fontSize: '38px', fontWeight: 700,
              color: C.dark, lineHeight: 1, marginTop: '8px', letterSpacing: '-1px',
            }}>
              {kpi.value}
            </div>
            <span style={{
              fontFamily: FONTS.body, fontSize: '12px',
              color: kpi.detailColor || C.light,
              marginTop: '6px', display: 'block',
            }}>
              {kpi.detail}
            </span>
          </div>
        ))}
      </div>

      {/* ═══ 4. TWO-COL: Performance + Projetos por Fase ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {/* Performance */}
        <div style={{
          background: C.white,
          borderRadius: '14px',
          padding: '22px 24px',
          border: `1px solid ${C.border}`,
        }}>
          <h3 style={{
            fontFamily: FONTS.body, fontSize: '15px', fontWeight: 700,
            color: C.dark, margin: '0 0 18px',
          }}>
            Performance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'No Prazo', value: stats.projetosNoPrazo, color: C.success },
              { label: 'Atenção', value: stats.projetosEmRisco, color: C.warning },
              { label: 'Atrasado', value: stats.projetosAtrasados, color: C.danger },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: C.cream,
                borderRadius: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '9px', height: '9px', borderRadius: '50%',
                    background: row.color,
                  }} />
                  <span style={{ fontFamily: FONTS.body, fontSize: '13px', fontWeight: 500, color: C.dark }}>
                    {row.label}
                  </span>
                </div>
                <span style={{ fontFamily: FONTS.body, fontSize: '18px', fontWeight: 700, color: C.dark }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Projetos por Fase */}
        <div style={{
          background: C.white,
          borderRadius: '14px',
          padding: '22px 24px',
          border: `1px solid ${C.border}`,
        }}>
          <h3 style={{
            fontFamily: FONTS.body, fontSize: '15px', fontWeight: 700,
            color: C.dark, margin: '0 0 18px',
          }}>
            Projetos por Fase
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projectsByPhase.map(({ fase, count }) => {
              const pct = totalPhase > 0 ? Math.round((count / totalPhase) * 100) : 0
              return (
                <div key={fase}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '5px',
                  }}>
                    <span style={{ fontFamily: FONTS.body, fontSize: '13px', fontWeight: 500, color: C.dark }}>
                      {fase}
                    </span>
                    <span style={{ fontFamily: FONTS.body, fontSize: '12px', color: C.light }}>
                      {count} {count === 1 ? 'projeto' : 'projetos'} · {pct}%
                    </span>
                  </div>
                  <div style={{
                    height: '6px',
                    background: C.cream,
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: getPhaseColor(fase),
                      borderRadius: '3px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ 5. PROJETOS RECENTES ═══ */}
      <div style={{
        background: C.white,
        borderRadius: '14px',
        border: `1px solid ${C.border}`,
        marginBottom: '24px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
        }}>
          <h3 style={{
            fontFamily: FONTS.body, fontSize: '15px', fontWeight: 700,
            color: C.dark, margin: 0,
          }}>
            Projetos Recentes
          </h3>
          <button
            onClick={() => navigate('/projetos')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: FONTS.body, fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: C.muted, display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            Ver todos
            <ArrowRight size={12} />
          </button>
        </div>

        {recentProjects.length > 0 ? (
          <div>
            {recentProjects.map((p, idx) => (
              <div
                key={p.codigo || p.id}
                onClick={() => navigate(`/projetos/${p.codigo}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: '20px',
                  alignItems: 'center',
                  padding: '14px 24px',
                  cursor: 'pointer',
                  borderTop: `1px solid ${C.border}`,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.cream}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Name + code/client */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONTS.heading, fontSize: '15px', fontWeight: 600,
                    color: C.dark,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.nome}
                  </div>
                  <div style={{
                    fontFamily: FONTS.body, fontSize: '12px', color: C.light, marginTop: '2px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span style={{ fontFamily: FONTS.mono, fontWeight: 600, color: C.muted }}>{p.codigo}</span>
                    {p.cliente_nome && (
                      <>
                        <span style={{ color: C.border }}>·</span>
                        <span>{p.cliente_nome}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Location */}
                <span style={{
                  fontFamily: FONTS.body, fontSize: '12px', color: C.light,
                  display: 'flex', alignItems: 'center', gap: '4px',
                  whiteSpace: 'nowrap',
                }}>
                  {p.localizacao && <><MapPin size={11} />{p.localizacao}</>}
                </span>

                {/* Phase */}
                <span style={{
                  fontFamily: FONTS.body, fontSize: '11px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  color: getPhaseColor(p.fase),
                  whiteSpace: 'nowrap',
                }}>
                  {p.fase || 'N/D'}
                </span>

                {/* Status dot + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: getStatusDotColor(p.status),
                  }} />
                  <span style={{
                    fontFamily: FONTS.body, fontSize: '12px', fontWeight: 500,
                    color: getStatusDotColor(p.status),
                  }}>
                    {getStatusLabel(p.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center', color: C.light, fontFamily: FONTS.body }}>
            Nenhum projeto encontrado
          </div>
        )}
      </div>

      {/* ═══ 6. TWO-COL: Milestones + Decisões Pendentes ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
      }}>
        {/* Próximos Milestones */}
        <div style={{
          background: C.white,
          borderRadius: '14px',
          padding: '22px 24px',
          border: `1px solid ${C.border}`,
        }}>
          <h3 style={{
            fontFamily: FONTS.body, fontSize: '15px', fontWeight: 700,
            color: C.dark, margin: '0 0 18px',
          }}>
            Próximos Milestones
          </h3>

          {milestones.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {milestones.map(m => {
                const days = daysUntil(m.data)
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                  }}>
                    <div style={{
                      width: '44px', flexShrink: 0, textAlign: 'center',
                    }}>
                      <div style={{
                        fontFamily: FONTS.body, fontSize: '22px', fontWeight: 700,
                        color: C.dark, lineHeight: 1,
                      }}>
                        {m.data.getDate()}
                      </div>
                      <div style={{
                        fontFamily: FONTS.body, fontSize: '11px',
                        color: C.muted, textTransform: 'uppercase',
                      }}>
                        {m.data.toLocaleDateString('pt-PT', { month: 'short' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: FONTS.body, fontSize: '13px', fontWeight: 600,
                        color: C.dark,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {m.titulo}
                      </div>
                      <div style={{
                        fontFamily: FONTS.mono, fontSize: '11px', color: C.muted, marginTop: '2px',
                      }}>
                        {m.codigo}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: FONTS.body, fontSize: '11px', fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '10px',
                      background: days <= 7 ? 'rgba(196,149,106,0.12)' : 'rgba(0,0,0,0.04)',
                      color: days <= 7 ? C.warning : C.muted,
                      whiteSpace: 'nowrap',
                    }}>
                      {days} dias
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{
              padding: '24px', textAlign: 'center',
              color: C.light, fontFamily: FONTS.body, fontSize: '13px',
            }}>
              <Calendar size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div>Sem milestones próximos</div>
            </div>
          )}
        </div>

        {/* Decisões Pendentes */}
        <div style={{
          background: `linear-gradient(135deg, ${C.white} 0%, rgba(196,149,106,0.04) 100%)`,
          borderRadius: '14px',
          padding: '22px 24px',
          border: `1px solid ${C.border}`,
          borderLeft: stats.decisoesPendentes > 0 ? `3px solid ${C.warning}` : `1px solid ${C.border}`,
        }}>
          <h3 style={{
            fontFamily: FONTS.body, fontSize: '15px', fontWeight: 700,
            color: C.dark, margin: '0 0 18px',
          }}>
            Decisões Pendentes
          </h3>

          <div style={{
            fontFamily: FONTS.body, fontSize: '42px', fontWeight: 700,
            color: stats.decisoesPendentes > 0 ? C.warning : C.muted,
            lineHeight: 1,
          }}>
            {stats.decisoesPendentes}
          </div>
          <p style={{
            fontFamily: FONTS.body, fontSize: '13px',
            color: C.light, marginTop: '6px',
          }}>
            {stats.decisoesPendentes === 1
              ? 'decisão aguarda aprovação'
              : stats.decisoesPendentes > 1
                ? 'decisões aguardam aprovação'
                : 'sem decisões pendentes'
            }
          </p>

          {stats.decisoesPendentes > 0 && (
            <button
              onClick={() => navigate('/bloqueios')}
              style={{
                marginTop: '16px',
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px',
                background: 'rgba(196,149,106,0.10)',
                border: 'none',
                borderRadius: '8px',
                fontFamily: FONTS.body, fontSize: '12px', fontWeight: 600,
                color: C.warning,
                cursor: 'pointer',
              }}
            >
              <AlertTriangle size={13} />
              Ver decisões
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
