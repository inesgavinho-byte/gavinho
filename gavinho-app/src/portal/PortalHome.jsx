import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePortal } from './PortalLayout'
import { Image, ClipboardList, FileText, Clock, ArrowRight, Loader2 } from 'lucide-react'

export default function PortalHome() {
  const { config, projeto, t } = usePortal()
  const navigate = useNavigate()
  const [data, setData] = useState({ fotos: 0, decisoesPendentes: 0, relatorios: 0, marcos: [], ultimoRelatorio: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [config])

  const loadDashboard = async () => {
    if (!config?.projeto_id) { setLoading(false); return }
    const pid = config.projeto_id

    try {
      // Photos this week
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const { count: fotosCount } = await supabase
        .from('obra_fotografias')
        .select('id', { count: 'exact', head: true })
        .eq('publicar_no_portal', true)
        .gte('created_at', weekAgo)

      // Pending decisions
      const { count: decisoesCount } = await supabase
        .from('decisoes')
        .select('id', { count: 'exact', head: true })
        .eq('projeto_id', pid)
        .eq('publicar_no_portal', true)
        .eq('requer_resposta_cliente', true)
        .is('resposta_cliente', null)

      // Recent reports
      const { count: relCount } = await supabase
        .from('obra_relatorios')
        .select('id', { count: 'exact', head: true })
        .eq('publicar_no_portal', true)

      // Last report
      const { data: lastReport } = await supabase
        .from('obra_relatorios')
        .select('id, titulo, resumo_portal, descricao, created_at')
        .eq('publicar_no_portal', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Milestones
      const { data: marcos } = await supabase
        .from('projeto_marcos')
        .select('*')
        .eq('projeto_id', pid)
        .eq('publicar_no_portal', true)
        .order('data_prevista', { ascending: true })
        .limit(5)

      setData({
        fotos: fotosCount || 0,
        decisoesPendentes: decisoesCount || 0,
        relatorios: relCount || 0,
        marcos: marcos || [],
        ultimoRelatorio: lastReport,
      })
    } catch (err) {
      console.error('Portal home error:', err)
    } finally {
      setLoading(false)
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('welcome')
    if (h < 18) return t('welcome').replace('Bom dia', 'Boa tarde').replace('Good morning', 'Good afternoon')
    return t('welcome').replace('Bom dia', 'Boa noite').replace('Good morning', 'Good evening')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#ADAA96' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={S.h1}>{greeting()}, {config.cliente_nome?.split(' ')[0] || ''}</h1>
        <p style={S.subtitle}>{projeto?.nome} · {projeto?.codigo}</p>
      </div>

      {/* Progress Bar */}
      {projeto?.progresso != null && (
        <div style={S.progressCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#8B8670' }}>Progresso Global</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#2D2B28' }}>{projeto.progresso}%</span>
          </div>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${projeto.progresso || 0}%` }} />
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div style={S.statsGrid}>
        <button onClick={() => navigate('/portal/galeria')} style={S.statCard}>
          <Image size={22} style={{ color: '#ADAA96' }} />
          <div style={S.statNumber}>{data.fotos}</div>
          <div style={S.statLabel}>
            {data.fotos === 1 ? 'Nova foto' : 'Novas fotos'}
            <br />esta semana
          </div>
        </button>
        <button onClick={() => navigate('/portal/decisoes')} style={{ ...S.statCard, borderColor: data.decisoesPendentes > 0 ? '#F59E0B' : '#E8E6DF' }}>
          <ClipboardList size={22} style={{ color: data.decisoesPendentes > 0 ? '#F59E0B' : '#ADAA96' }} />
          <div style={{ ...S.statNumber, color: data.decisoesPendentes > 0 ? '#F59E0B' : '#2D2B28' }}>{data.decisoesPendentes}</div>
          <div style={S.statLabel}>
            {data.decisoesPendentes === 1 ? 'Decisão' : 'Decisões'}
            <br />pendente{data.decisoesPendentes !== 1 ? 's' : ''}
          </div>
        </button>
        <button onClick={() => navigate('/portal/relatorios')} style={S.statCard}>
          <FileText size={22} style={{ color: '#ADAA96' }} />
          <div style={S.statNumber}>{data.relatorios}</div>
          <div style={S.statLabel}>
            {data.relatorios === 1 ? 'Relatório' : 'Relatórios'}
            <br />publicado{data.relatorios !== 1 ? 's' : ''}
          </div>
        </button>
      </div>

      {/* Next Milestones */}
      {data.marcos.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <h2 style={S.h2}>
              <Clock size={18} style={{ color: '#ADAA96' }} />
              Próximos Marcos
            </h2>
            <button onClick={() => navigate('/portal/timeline')} style={S.linkBtn}>
              Ver timeline <ArrowRight size={14} />
            </button>
          </div>
          <div style={S.card}>
            {data.marcos.filter(m => m.estado !== 'concluido').slice(0, 4).map((marco, i) => (
              <div key={marco.id} style={{
                ...S.marcoRow,
                borderBottom: i < Math.min(data.marcos.length - 1, 3) ? '1px solid #F0EDE6' : 'none'
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: marco.estado === 'em_progresso' ? '#F59E0B' : marco.estado === 'atrasado' ? '#DC2626' : '#E8E6DF',
                  flexShrink: 0, marginTop: '6px'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#2D2B28', fontWeight: 500 }}>{marco.titulo}</div>
                  {marco.data_prevista && (
                    <div style={{ fontSize: '12px', color: '#8B8670', marginTop: '2px' }}>
                      {new Date(marco.data_prevista).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      {data.ultimoRelatorio && (
        <div style={S.section}>
          <h2 style={S.h2}>Última Actualização</h2>
          <div style={{ ...S.card, padding: '24px' }}>
            <p style={{ fontSize: '15px', color: '#2D2B28', lineHeight: '1.7', margin: '0 0 12px', fontStyle: 'italic' }}>
              "{data.ultimoRelatorio.resumo_portal || data.ultimoRelatorio.descricao || data.ultimoRelatorio.titulo}"
            </p>
            <div style={{ fontSize: '12px', color: '#ADAA96', textAlign: 'right' }}>
              — Equipa GAVINHO · {new Date(data.ultimoRelatorio.created_at).toLocaleDateString('pt-PT')}
            </div>
          </div>
        </div>
      )}

      {/* Custom Welcome Message */}
      {config.mensagem_boas_vindas && (
        <div style={{ ...S.card, padding: '20px', marginTop: '24px', background: '#F5F3EB', border: 'none' }}>
          <p style={{ fontSize: '14px', color: '#2D2B28', lineHeight: '1.6', margin: 0 }}>
            {config.mensagem_boas_vindas}
          </p>
        </div>
      )}
    </div>
  )
}

const S = {
  h1: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '28px',
    fontWeight: 500,
    color: '#2D2B28',
    margin: 0,
  },
  h2: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '20px',
    fontWeight: 500,
    color: '#2D2B28',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#8B8670',
    marginTop: '4px',
  },
  progressCard: {
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    border: '1px solid #E8E6DF',
  },
  progressTrack: {
    height: '8px',
    background: '#F0EDE6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ADAA96, #8B8670)',
    borderRadius: '4px',
    transition: 'width 1s ease-out',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '32px',
  },
  statCard: {
    background: '#FFFFFF',
    border: '1px solid #E8E6DF',
    borderRadius: '12px',
    padding: '20px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, transform 0.15s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2D2B28',
  },
  statLabel: {
    fontSize: '12px',
    color: '#8B8670',
    lineHeight: '1.4',
  },
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E6DF',
    overflow: 'hidden',
  },
  marcoRow: {
    display: 'flex',
    gap: '12px',
    padding: '14px 20px',
    alignItems: 'flex-start',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#ADAA96',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
}
