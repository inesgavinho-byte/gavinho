import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePortal } from './PortalLayout'
import { Loader2, FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

export default function PortalRelatorios() {
  const { config, t } = usePortal()
  const [relatorios, setRelatorios] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    loadRelatorios()
  }, [config])

  const loadRelatorios = async () => {
    if (!config?.projeto_id) { setLoading(false); return }

    try {
      const { data, error } = await supabase
        .from('obra_relatorios')
        .select('id, titulo, descricao, resumo_portal, created_at, data_publicacao, tipo')
        .eq('publicar_no_portal', true)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') { setLoading(false); return }
        throw error
      }

      setRelatorios(data || [])
      // Auto-expand first
      if (data && data.length > 0) setExpandedId(data[0].id)
    } catch (err) {
      console.error('Reports error:', err)
    } finally {
      setLoading(false)
    }
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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={S.h1}>{t('reports')}</h1>
        <p style={{ fontSize: '14px', color: '#8B8670', marginTop: '4px' }}>
          {relatorios.length} {relatorios.length === 1 ? 'relatório publicado' : 'relatórios publicados'}
        </p>
      </div>

      {relatorios.length === 0 ? (
        <div style={S.empty}>
          <FileText size={32} style={{ color: '#D4D1C7', marginBottom: '12px' }} />
          <p style={{ color: '#8B8670', fontSize: '14px' }}>Ainda não existem relatórios publicados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {relatorios.map((r, i) => {
            const isExpanded = expandedId === r.id
            const content = r.resumo_portal || r.descricao

            return (
              <div key={r.id} style={S.card}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  style={S.cardHeader}
                >
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <FileText size={15} style={{ color: '#ADAA96', flexShrink: 0 }} />
                      <span style={{ fontSize: '15px', fontWeight: 500, color: '#2D2B28' }}>
                        {r.titulo}
                      </span>
                      {i === 0 && (
                        <span style={S.newBadge}>Mais recente</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#8B8670', paddingLeft: '23px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={11} />
                        {new Date(r.data_publicacao || r.created_at).toLocaleDateString('pt-PT', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </span>
                      {r.tipo && <span style={S.typeBadge}>{r.tipo}</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{ color: '#8B8670' }} /> : <ChevronDown size={16} style={{ color: '#8B8670' }} />}
                </button>

                {isExpanded && content && (
                  <div style={S.cardBody}>
                    <div style={S.contentBox}>
                      {content.split('\n').map((line, j) => (
                        <p key={j} style={{ margin: j === 0 ? 0 : '8px 0 0', fontSize: '14px', color: '#2D2B28', lineHeight: '1.7' }}>
                          {line}
                        </p>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#ADAA96', textAlign: 'right', marginTop: '12px' }}>
                      — Equipa GAVINHO
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
  card: {
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E6DF',
    overflow: 'hidden',
  },
  cardHeader: {
    width: '100%',
    padding: '16px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  cardBody: {
    padding: '0 20px 20px',
    borderTop: '1px solid #F0EDE6',
    paddingTop: '16px',
  },
  contentBox: {
    background: '#FAFAF8',
    borderRadius: '8px',
    padding: '20px',
    borderLeft: '3px solid #ADAA96',
  },
  newBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '4px',
    background: '#F5F3EB',
    color: '#8B8670',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  typeBadge: {
    padding: '1px 6px',
    background: '#F0EDE6',
    borderRadius: '4px',
    fontSize: '11px',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E6DF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
}
