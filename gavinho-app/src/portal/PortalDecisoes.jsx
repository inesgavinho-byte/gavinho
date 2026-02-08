import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePortal } from './PortalLayout'
import { Loader2, AlertTriangle, CheckCircle2, Clock, Send, ChevronDown, ChevronUp } from 'lucide-react'

export default function PortalDecisoes() {
  const { config, t } = usePortal()
  const [decisoes, setDecisoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendentes')
  const [expandedId, setExpandedId] = useState(null)
  const [resposta, setResposta] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadDecisoes()
  }, [config])

  const loadDecisoes = async () => {
    if (!config?.projeto_id) { setLoading(false); return }

    try {
      const { data, error } = await supabase
        .from('decisoes')
        .select('*')
        .eq('projeto_id', config.projeto_id)
        .eq('publicar_no_portal', true)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') { setLoading(false); return }
        throw error
      }

      setDecisoes(data || [])
    } catch (err) {
      console.error('Decisoes error:', err)
    } finally {
      setLoading(false)
    }
  }

  const submitResposta = async (decisaoId) => {
    if (!resposta.trim()) return
    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('decisoes')
        .update({
          resposta_cliente: resposta.trim(),
          resposta_cliente_em: new Date().toISOString(),
        })
        .eq('id', decisaoId)

      if (error) throw error

      setDecisoes(prev => prev.map(d =>
        d.id === decisaoId
          ? { ...d, resposta_cliente: resposta.trim(), resposta_cliente_em: new Date().toISOString() }
          : d
      ))
      setResposta('')
      setExpandedId(null)
    } catch (err) {
      console.error('Submit response error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const pendentes = decisoes.filter(d => d.requer_resposta_cliente && !d.resposta_cliente)
  const respondidas = decisoes.filter(d => d.resposta_cliente)
  const informativas = decisoes.filter(d => !d.requer_resposta_cliente && !d.resposta_cliente)

  const displayed = filtro === 'pendentes' ? pendentes
    : filtro === 'respondidas' ? respondidas
    : filtro === 'informativas' ? informativas
    : decisoes

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
        <h1 style={S.h1}>{t('decisions')}</h1>
        {pendentes.length > 0 && (
          <p style={{ fontSize: '14px', color: '#F59E0B', marginTop: '4px', fontWeight: 500 }}>
            {pendentes.length} {pendentes.length === 1 ? 'decisão aguarda' : 'decisões aguardam'} a sua resposta
          </p>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={S.tabs}>
        {[
          { key: 'pendentes', label: 'Pendentes', count: pendentes.length },
          { key: 'respondidas', label: 'Respondidas', count: respondidas.length },
          { key: 'informativas', label: 'Informativas', count: informativas.length },
          { key: 'todas', label: 'Todas', count: decisoes.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFiltro(tab.key)}
            style={{
              ...S.tab,
              borderBottom: filtro === tab.key ? '2px solid #ADAA96' : '2px solid transparent',
              color: filtro === tab.key ? '#2D2B28' : '#8B8670',
            }}
          >
            {tab.label}
            <span style={{
              ...S.tabBadge,
              background: tab.key === 'pendentes' && tab.count > 0 ? '#FEF3C7' : '#F0EDE6',
              color: tab.key === 'pendentes' && tab.count > 0 ? '#F59E0B' : '#8B8670',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Decisions List */}
      {displayed.length === 0 ? (
        <div style={S.empty}>
          <p style={{ color: '#8B8670', fontSize: '14px' }}>
            {filtro === 'pendentes' ? 'Não existem decisões pendentes.' : 'Sem decisões nesta categoria.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayed.map(d => {
            const isExpanded = expandedId === d.id
            const isPending = d.requer_resposta_cliente && !d.resposta_cliente
            const isOverdue = isPending && d.prazo_resposta_cliente && new Date(d.prazo_resposta_cliente) < new Date()

            return (
              <div key={d.id} style={{
                ...S.card,
                borderLeft: isPending ? '3px solid #F59E0B' : isOverdue ? '3px solid #DC2626' : d.resposta_cliente ? '3px solid #10B981' : '3px solid #E8E6DF',
              }}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  style={S.cardHeader}
                >
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {isPending ? (
                        <AlertTriangle size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
                      ) : d.resposta_cliente ? (
                        <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                      ) : (
                        <Clock size={14} style={{ color: '#8B8670', flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: '15px', fontWeight: 500, color: '#2D2B28' }}>{d.titulo}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#8B8670', paddingLeft: '22px' }}>
                      {d.divisao && <span>{d.divisao}</span>}
                      {d.tipo && <span style={S.typeBadge}>{d.tipo}</span>}
                      <span>{new Date(d.created_at).toLocaleDateString('pt-PT')}</span>
                      {isOverdue && <span style={{ color: '#DC2626', fontWeight: 600 }}>Prazo ultrapassado</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{ color: '#8B8670' }} /> : <ChevronDown size={16} style={{ color: '#8B8670' }} />}
                </button>

                {isExpanded && (
                  <div style={S.cardBody}>
                    {d.descricao && (
                      <p style={{ fontSize: '14px', color: '#2D2B28', lineHeight: '1.7', margin: '0 0 16px' }}>
                        {d.descricao}
                      </p>
                    )}

                    {d.impacto && (
                      <div style={{ fontSize: '13px', color: '#8B8670', marginBottom: '12px' }}>
                        <strong>Impacto:</strong> {d.impacto}
                      </div>
                    )}

                    {d.prazo_resposta_cliente && (
                      <div style={{ fontSize: '13px', color: isOverdue ? '#DC2626' : '#8B8670', marginBottom: '12px' }}>
                        <strong>Prazo:</strong> {new Date(d.prazo_resposta_cliente).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    )}

                    {/* Options (if provided) */}
                    {d.opcoes_cliente && Array.isArray(d.opcoes_cliente) && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#2D2B28', marginBottom: '8px' }}>Opções:</div>
                        {d.opcoes_cliente.map((opcao, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (isPending) {
                                setResposta(typeof opcao === 'string' ? opcao : opcao.label || opcao.texto || '')
                              }
                            }}
                            style={{
                              ...S.optionBtn,
                              borderColor: resposta === (typeof opcao === 'string' ? opcao : opcao.label || opcao.texto || '') ? '#ADAA96' : '#E8E6DF',
                              background: resposta === (typeof opcao === 'string' ? opcao : opcao.label || opcao.texto || '') ? '#F5F3EB' : '#FFFFFF',
                            }}
                            disabled={!isPending}
                          >
                            {typeof opcao === 'string' ? opcao : opcao.label || opcao.texto || ''}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Client Response */}
                    {d.resposta_cliente ? (
                      <div style={S.responseBox}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#10B981', marginBottom: '6px' }}>A sua resposta:</div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#2D2B28', lineHeight: '1.6' }}>{d.resposta_cliente}</p>
                        {d.resposta_cliente_em && (
                          <div style={{ fontSize: '11px', color: '#8B8670', marginTop: '6px' }}>
                            Respondido em {new Date(d.resposta_cliente_em).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ) : isPending ? (
                      <div style={S.replyBox}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#2D2B28', marginBottom: '8px' }}>
                          A sua resposta
                        </div>
                        <textarea
                          value={resposta}
                          onChange={e => setResposta(e.target.value)}
                          placeholder="Escreva aqui a sua decisão ou comentário..."
                          style={S.textarea}
                          rows={3}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button
                            onClick={() => submitResposta(d.id)}
                            disabled={!resposta.trim() || submitting}
                            style={{
                              ...S.submitBtn,
                              opacity: !resposta.trim() || submitting ? 0.5 : 1,
                            }}
                          >
                            {submitting ? (
                              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <Send size={14} />
                            )}
                            Enviar resposta
                          </button>
                        </div>
                      </div>
                    ) : null}
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
  tabs: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid #E8E6DF',
    marginBottom: '24px',
    overflowX: 'auto',
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
    whiteSpace: 'nowrap',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  tabBadge: {
    padding: '1px 7px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
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
  typeBadge: {
    padding: '1px 6px',
    background: '#F0EDE6',
    borderRadius: '4px',
    fontSize: '11px',
  },
  optionBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    border: '1px solid #E8E6DF',
    borderRadius: '8px',
    background: '#FFFFFF',
    fontSize: '14px',
    color: '#2D2B28',
    cursor: 'pointer',
    marginBottom: '6px',
    fontFamily: "'Quattrocento Sans', sans-serif",
    transition: 'border-color 0.2s, background 0.2s',
  },
  responseBox: {
    background: '#ECFDF5',
    borderRadius: '8px',
    padding: '14px 16px',
    border: '1px solid #D1FAE5',
  },
  replyBox: {
    background: '#FAFAF8',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #E8E6DF',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E8E6DF',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#2D2B28',
    resize: 'vertical',
    outline: 'none',
    fontFamily: "'Quattrocento Sans', sans-serif",
    boxSizing: 'border-box',
    lineHeight: '1.5',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#2D2B28',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E6DF',
  },
}
