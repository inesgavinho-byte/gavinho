import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePortal } from './PortalLayout'
import { Loader2, CheckCircle2, Clock, AlertTriangle, Circle, Truck } from 'lucide-react'

export default function PortalTimeline() {
  const { config, lang, t } = usePortal()
  const [marcos, setMarcos] = useState([])
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('marcos')

  useEffect(() => {
    loadTimeline()
  }, [config])

  const loadTimeline = async () => {
    if (!config?.projeto_id) { setLoading(false); return }

    try {
      const [marcosRes, entregasRes] = await Promise.all([
        supabase
          .from('projeto_marcos')
          .select('*')
          .eq('projeto_id', config.projeto_id)
          .eq('publicar_no_portal', true)
          .order('ordem', { ascending: true })
          .order('data_prevista', { ascending: true }),
        config.mostrar_entregas_material !== false
          ? supabase
              .from('purchase_orders')
              .select('id, codigo, descricao_portal, data_entrega_prevista, data_entrega_real, estado')
              .eq('projeto_id', config.projeto_id)
              .eq('publicar_no_portal', true)
              .not('estado', 'in', '("cancelada","rascunho")')
              .order('data_entrega_prevista', { ascending: true })
          : { data: [], error: null }
      ])

      if (marcosRes.error && marcosRes.error.code !== '42P01') throw marcosRes.error
      if (entregasRes.error && entregasRes.error.code !== '42P01') throw entregasRes.error

      setMarcos(marcosRes.data || [])
      setEntregas(entregasRes.data || [])
    } catch (err) {
      console.error('Timeline error:', err)
    } finally {
      setLoading(false)
    }
  }

  const estadoIcon = (estado) => {
    switch (estado) {
      case 'concluido': return <CheckCircle2 size={18} style={{ color: '#10B981' }} />
      case 'em_progresso': return <Clock size={18} style={{ color: '#F59E0B' }} />
      case 'atrasado': return <AlertTriangle size={18} style={{ color: '#DC2626' }} />
      default: return <Circle size={18} style={{ color: '#D4D1C7' }} />
    }
  }

  const estadoLabel = (estado) => {
    const labels = {
      pendente: 'Pendente', em_progresso: 'Em progresso',
      concluido: 'Concluído', atrasado: 'Atrasado',
    }
    return labels[estado] || estado
  }

  const estadoColor = (estado) => {
    switch (estado) {
      case 'concluido': return '#10B981'
      case 'em_progresso': return '#F59E0B'
      case 'atrasado': return '#DC2626'
      default: return '#D4D1C7'
    }
  }

  // Progress calculation
  const totalMarcos = marcos.length
  const concluidos = marcos.filter(m => m.estado === 'concluido').length
  const progresso = totalMarcos > 0 ? Math.round((concluidos / totalMarcos) * 100) : 0

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#ADAA96' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={S.h1}>{t('timeline')}</h1>
      </div>

      {/* Progress Summary */}
      {totalMarcos > 0 && (
        <div style={S.progressCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: '#2D2B28', fontWeight: 500 }}>
              {concluidos} de {totalMarcos} marcos concluídos
            </span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#2D2B28' }}>{progresso}%</span>
          </div>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${progresso}%` }} />
          </div>
        </div>
      )}

      {/* View Tabs */}
      {entregas.length > 0 && (
        <div style={S.tabs}>
          <button
            onClick={() => setView('marcos')}
            style={{ ...S.tab, borderBottom: view === 'marcos' ? '2px solid #ADAA96' : '2px solid transparent', color: view === 'marcos' ? '#2D2B28' : '#8B8670' }}
          >
            <Clock size={14} /> Marcos ({marcos.length})
          </button>
          <button
            onClick={() => setView('entregas')}
            style={{ ...S.tab, borderBottom: view === 'entregas' ? '2px solid #ADAA96' : '2px solid transparent', color: view === 'entregas' ? '#2D2B28' : '#8B8670' }}
          >
            <Truck size={14} /> Entregas ({entregas.length})
          </button>
        </div>
      )}

      {/* Marcos Timeline */}
      {view === 'marcos' && (
        marcos.length === 0 ? (
          <div style={S.empty}>
            <p style={{ color: '#8B8670', fontSize: '14px' }}>Ainda não existem marcos publicados.</p>
          </div>
        ) : (
          <div style={S.timeline}>
            {marcos.map((marco, i) => (
              <div key={marco.id} style={S.timelineItem}>
                {/* Line */}
                <div style={S.timelineLine}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: estadoColor(marco.estado),
                    border: marco.estado === 'pendente' ? '2px solid #D4D1C7' : 'none',
                    boxSizing: 'border-box', zIndex: 1,
                  }} />
                  {i < marcos.length - 1 && (
                    <div style={{
                      width: '2px', flex: 1,
                      background: marco.estado === 'concluido' ? '#10B981' : '#E8E6DF',
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={S.timelineContent}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500, color: '#2D2B28' }}>
                      {lang === 'en' && marco.titulo_en ? marco.titulo_en : marco.titulo}
                    </span>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                      background: marco.estado === 'concluido' ? '#ECFDF5' : marco.estado === 'em_progresso' ? '#FEF3C7' : marco.estado === 'atrasado' ? '#FEF2F2' : '#F0EDE6',
                      color: estadoColor(marco.estado),
                      fontWeight: 600,
                    }}>
                      {estadoLabel(marco.estado)}
                    </span>
                  </div>

                  {(lang === 'en' && marco.descricao_en ? marco.descricao_en : marco.descricao) && (
                    <p style={{ fontSize: '13px', color: '#8B8670', margin: '0 0 6px', lineHeight: '1.5' }}>
                      {lang === 'en' && marco.descricao_en ? marco.descricao_en : marco.descricao}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#ADAA96' }}>
                    {marco.data_prevista && (
                      <span>Previsto: {new Date(marco.data_prevista).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}</span>
                    )}
                    {marco.data_real && (
                      <span style={{ color: '#10B981' }}>
                        Concluído: {new Date(marco.data_real).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Entregas */}
      {view === 'entregas' && (
        entregas.length === 0 ? (
          <div style={S.empty}>
            <p style={{ color: '#8B8670', fontSize: '14px' }}>Sem entregas de material publicadas.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {entregas.map(e => (
              <div key={e.id} style={S.entregaCard}>
                <Truck size={16} style={{ color: '#ADAA96', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#2D2B28' }}>
                    {e.descricao_portal || e.codigo}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#8B8670', marginTop: '4px' }}>
                    {e.data_entrega_prevista && (
                      <span>Prevista: {new Date(e.data_entrega_prevista).toLocaleDateString('pt-PT')}</span>
                    )}
                    {e.data_entrega_real && (
                      <span style={{ color: '#10B981' }}>
                        Entregue: {new Date(e.data_entrega_real).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
                  background: e.estado === 'entregue' ? '#ECFDF5' : e.estado === 'confirmada' ? '#EFF6FF' : '#F0EDE6',
                  color: e.estado === 'entregue' ? '#10B981' : e.estado === 'confirmada' ? '#3B82F6' : '#8B8670',
                  fontWeight: 500, alignSelf: 'flex-start',
                }}>
                  {e.estado}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
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
    background: 'linear-gradient(90deg, #10B981, #059669)',
    borderRadius: '4px',
    transition: 'width 1s ease-out',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid #E8E6DF',
    marginBottom: '24px',
  },
  tab: {
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  timeline: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
  },
  timelineLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '4px',
    width: '12px',
    flexShrink: 0,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: '28px',
  },
  entregaCard: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    background: '#FFFFFF',
    borderRadius: '10px',
    border: '1px solid #E8E6DF',
    alignItems: 'flex-start',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E6DF',
  },
}
