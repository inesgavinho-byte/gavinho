import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Calendar, User,
  ChevronRight, Plus, X, Edit, Trash2, ExternalLink, Mail, FileText,
  Package, MessageSquare, Receipt, AlertCircle, MoreVertical
} from 'lucide-react'

const colors = {
  primary: '#5C4B3A',
  text: '#3D3326',
  textMuted: '#8B7355',
  background: '#F5F3EF',
  white: '#FFFFFF',
  border: '#E8E4DC',
  success: '#6B8F5E',
  warning: '#F5A623',
  error: '#DC2626',
  urgente: '#DC2626',
  estaSemana: '#F5A623',
  proximasSemanas: '#3B82F6',
  monitorizacao: '#8B7355',
}

const prioridadeConfig = {
  urgente: { label: 'Urgente', icon: AlertTriangle, color: colors.urgente, bg: '#FEE2E2' },
  esta_semana: { label: 'Esta Semana', icon: Clock, color: colors.estaSemana, bg: '#FEF3C7' },
  proximas_semanas: { label: 'Próximas Semanas', icon: Calendar, color: colors.proximasSemanas, bg: '#DBEAFE' },
  monitorizacao: { label: 'Em Monitorização', icon: Circle, color: colors.monitorizacao, bg: '#F3F4F6' },
}

const tipoConfig = {
  nc: { label: 'NC', icon: AlertCircle, color: '#DC2626' },
  aguarda_resposta: { label: 'Aguarda Resposta', icon: Mail, color: '#F5A623' },
  encomenda: { label: 'Encomenda', icon: Package, color: '#3B82F6' },
  decisao: { label: 'Decisão', icon: MessageSquare, color: '#8B5CF6' },
  lead_time: { label: 'Lead Time', icon: Clock, color: '#F59E0B' },
  documento: { label: 'Documento', icon: FileText, color: '#6B7280' },
  auto: { label: 'Auto', icon: Receipt, color: '#10B981' },
  followup: { label: 'Follow-up', icon: Mail, color: '#F97316' },
  entrega: { label: 'Entrega', icon: Package, color: '#06B6D4' },
  outro: { label: 'Outro', icon: Circle, color: '#6B7280' },
}

export default function ObraChecklist({ obraId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedPriority, setExpandedPriority] = useState({
    urgente: true,
    esta_semana: true,
    proximas_semanas: false,
    monitorizacao: false
  })

  const [novoItem, setNovoItem] = useState({
    tipo: 'outro',
    titulo: '',
    descricao: '',
    prioridade: 'esta_semana',
    data_limite: '',
    responsavel_nome: ''
  })

  useEffect(() => {
    if (obraId) {
      fetchItems()
      subscribeToItems()
    }
  }, [obraId])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('obra_id', obraId)
        .eq('estado', 'aberto')
        .order('prioridade')
        .order('data_limite', { ascending: true, nullsFirst: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Erro ao carregar checklist:', err)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToItems = () => {
    const subscription = supabase
      .channel(`checklist:${obraId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'checklist_items',
        filter: `obra_id=eq.${obraId}`
      }, () => {
        fetchItems()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }

  const concluirItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({
          estado: 'concluido',
          concluido_em: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
      setItems(items.filter(i => i.id !== itemId))
    } catch (err) {
      console.error('Erro ao concluir item:', err)
    }
  }

  const adicionarItem = async () => {
    if (!novoItem.titulo.trim()) return

    try {
      const { error } = await supabase
        .from('checklist_items')
        .insert({
          obra_id: obraId,
          ...novoItem,
          criado_por: 'manual'
        })

      if (error) throw error

      setShowAddModal(false)
      setNovoItem({
        tipo: 'outro',
        titulo: '',
        descricao: '',
        prioridade: 'esta_semana',
        data_limite: '',
        responsavel_nome: ''
      })
      fetchItems()
    } catch (err) {
      console.error('Erro ao adicionar item:', err)
    }
  }

  const eliminarItem = async (itemId) => {
    if (!confirm('Eliminar este item da checklist?')) return

    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      setItems(items.filter(i => i.id !== itemId))
    } catch (err) {
      console.error('Erro ao eliminar item:', err)
    }
  }

  // Agrupar itens por prioridade
  const itemsPorPrioridade = {
    urgente: items.filter(i => i.prioridade === 'urgente'),
    esta_semana: items.filter(i => i.prioridade === 'esta_semana'),
    proximas_semanas: items.filter(i => i.prioridade === 'proximas_semanas'),
    monitorizacao: items.filter(i => i.prioridade === 'monitorizacao'),
  }

  const formatDate = (date) => {
    if (!date) return null
    const d = new Date(date)
    const today = new Date()
    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: `Há ${Math.abs(diffDays)} dias`, color: colors.error }
    if (diffDays === 0) return { text: 'Hoje', color: colors.warning }
    if (diffDays === 1) return { text: 'Amanhã', color: colors.warning }
    if (diffDays <= 7) return { text: `Em ${diffDays} dias`, color: colors.estaSemana }
    return { text: d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }), color: colors.textMuted }
  }

  const calcularDiasAberto = (createdAt) => {
    const dias = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24))
    return dias === 0 ? 'Hoje' : `Há ${dias} dias`
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        color: colors.textMuted
      }}>
        A carregar checklist...
      </div>
    )
  }

  return (
    <div style={{
      background: colors.white,
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        background: colors.background
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.text }}>
            Checklist Viva
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>
            {items.length} {items.length === 1 ? 'item aberto' : 'itens abertos'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* Content */}
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{
            padding: '48px 20px',
            textAlign: 'center',
            color: colors.textMuted
          }}>
            <CheckCircle2 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ margin: 0 }}>Tudo em dia! Sem itens pendentes.</p>
          </div>
        ) : (
          Object.entries(prioridadeConfig).map(([prioridade, config]) => {
            const prioridadeItems = itemsPorPrioridade[prioridade]
            if (prioridadeItems.length === 0) return null

            const Icon = config.icon
            const isExpanded = expandedPriority[prioridade]

            return (
              <div key={prioridade}>
                {/* Priority Header */}
                <button
                  onClick={() => setExpandedPriority(prev => ({ ...prev, [prioridade]: !prev[prioridade] }))}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    background: config.bg,
                    border: 'none',
                    borderBottom: `1px solid ${colors.border}`,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Icon size={16} style={{ color: config.color }} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '13px', color: config.color }}>
                    {config.label.toUpperCase()} ({prioridadeItems.length})
                  </span>
                  <ChevronRight
                    size={16}
                    style={{
                      color: config.color,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>

                {/* Items */}
                {isExpanded && (
                  <div>
                    {prioridadeItems.map(item => {
                      const tipo = tipoConfig[item.tipo] || tipoConfig.outro
                      const TipoIcon = tipo.icon
                      const dataInfo = formatDate(item.data_limite)

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '16px 20px',
                            borderBottom: `1px solid ${colors.border}`,
                            transition: 'background 0.1s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = colors.background}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => concluirItem(item.id)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              border: `2px solid ${colors.border}`,
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = colors.success
                              e.currentTarget.style.background = `${colors.success}15`
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = colors.border
                              e.currentTarget.style.background = 'transparent'
                            }}
                            title="Marcar como concluído"
                          >
                            <CheckCircle2 size={14} style={{ color: colors.success, opacity: 0 }} />
                          </button>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <TipoIcon size={14} style={{ color: tipo.color, flexShrink: 0 }} />
                              <span style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: colors.text,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {item.titulo}
                              </span>
                            </div>

                            {item.descricao && (
                              <p style={{
                                margin: '0 0 8px',
                                fontSize: '13px',
                                color: colors.textMuted,
                                lineHeight: '1.4'
                              }}>
                                {item.descricao}
                              </p>
                            )}

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              fontSize: '12px',
                              color: colors.textMuted
                            }}>
                              {item.responsavel_nome && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <User size={12} />
                                  {item.responsavel_nome}
                                </span>
                              )}
                              {dataInfo && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: dataInfo.color }}>
                                  <Calendar size={12} />
                                  {dataInfo.text}
                                </span>
                              )}
                              <span style={{ opacity: 0.6 }}>
                                {calcularDiasAberto(item.created_at)}
                              </span>
                              {item.criado_por === 'jarvis' && (
                                <span style={{
                                  padding: '2px 6px',
                                  background: '#EEF5EC',
                                  color: colors.success,
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600
                                }}>
                                  J.A.R.V.I.S.
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <button
                            onClick={() => eliminarItem(item.id)}
                            style={{
                              padding: '4px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: colors.textMuted,
                              opacity: 0.5,
                              flexShrink: 0
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.white,
            borderRadius: '16px',
            padding: '24px',
            width: '480px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0 }}>Novo Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} style={{ color: colors.textMuted }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Título */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={novoItem.titulo}
                  onChange={e => setNovoItem({ ...novoItem, titulo: e.target.value })}
                  placeholder="O que precisa ser feito?"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Tipo e Prioridade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                    Tipo
                  </label>
                  <select
                    value={novoItem.tipo}
                    onChange={e => setNovoItem({ ...novoItem, tipo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    {Object.entries(tipoConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                    Prioridade
                  </label>
                  <select
                    value={novoItem.prioridade}
                    onChange={e => setNovoItem({ ...novoItem, prioridade: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    {Object.entries(prioridadeConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Limite e Responsável */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                    Data Limite
                  </label>
                  <input
                    type="date"
                    value={novoItem.data_limite}
                    onChange={e => setNovoItem({ ...novoItem, data_limite: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={novoItem.responsavel_nome}
                    onChange={e => setNovoItem({ ...novoItem, responsavel_nome: e.target.value })}
                    placeholder="Nome do responsável"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  Descrição
                </label>
                <textarea
                  value={novoItem.descricao}
                  onChange={e => setNovoItem({ ...novoItem, descricao: e.target.value })}
                  placeholder="Detalhes adicionais..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarItem}
                disabled={!novoItem.titulo.trim()}
                className="btn btn-primary"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
