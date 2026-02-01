import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, Search, MessageCircle, CheckCircle, Clock, AlertCircle, X,
  Upload, Image, User, Calendar, FileText, ChevronRight, Edit2, Trash2
} from 'lucide-react'

const STATUS_CONFIG = {
  pending: { label: 'Pendente Resposta', color: '#E6A23C', bg: '#FDF6EC' },
  discussion: { label: 'Em Discussão', color: '#409EFF', bg: '#ECF5FF' },
  resolved: { label: 'Resolvido', color: '#67C23A', bg: '#F0F9EB' }
}

export default function DuvidasLog({ projeto }) {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedDecision, setSelectedDecision] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [entregaveis, setEntregaveis] = useState([])
  const [utilizadores, setUtilizadores] = useState([])

  useEffect(() => {
    if (projeto?.id) {
      fetchDecisions()
      fetchEntregaveis()
      fetchUtilizadores()
    }
  }, [projeto?.id])

  const fetchDecisions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('projeto_duvidas')
        .select(`
          *,
          entregavel:projeto_entregaveis(id, codigo, nome)
        `)
        .eq('projeto_id', projeto.id)
        .order('submetido_em', { ascending: false })

      if (error) throw error

      // Carregar contagem de comentários para cada decisão
      const decisionsWithComments = await Promise.all((data || []).map(async (decision) => {
        try {
          const { count, error: countError } = await supabase
            .from('duvida_comentarios')
            .select('*', { count: 'exact', head: true })
            .eq('duvida_id', decision.id)

          return {
            ...decision,
            comment_count: countError ? 0 : (count || 0)
          }
        } catch {
          return { ...decision, comment_count: 0 }
        }
      }))

      setDecisions(decisionsWithComments)
    } catch (err) {
      console.error('Erro ao carregar decisões:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEntregaveis = async () => {
    try {
      const { data } = await supabase
        .from('projeto_entregaveis')
        .select('id, codigo, nome')
        .eq('projeto_id', projeto.id)
        .order('codigo')
      setEntregaveis(data || [])
    } catch (err) {
      console.error('Erro ao carregar entregáveis:', err)
    }
  }

  const fetchUtilizadores = async () => {
    try {
      const { data } = await supabase
        .from('utilizadores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      setUtilizadores(data || [])
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err)
    }
  }

  // Filter decisions
  const filteredDecisions = decisions.filter(d => {
    const matchesFilter = filter === 'all' || d.status === filter
    const matchesSearch =
      d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.descricao.toLowerCase().includes(search.toLowerCase()) ||
      d.entregavel?.nome?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleDecisionCreated = () => {
    setShowNewModal(false)
    fetchDecisions()
  }

  const handleResponseSubmitted = () => {
    setSelectedDecision(null)
    fetchDecisions()
  }

  const handleDeleteDecision = async (decision) => {
    if (!confirm(`Eliminar a dúvida "${decision.titulo}"?`)) return

    try {
      const { error } = await supabase
        .from('projeto_duvidas')
        .delete()
        .eq('id', decision.id)
      if (error) throw error
      fetchDecisions()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert('Erro ao eliminar')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
        A carregar decisões...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
          Dúvidas & Definições
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
          Registo de dúvidas que precisam de resposta ou definição
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar decisões..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'all', label: 'Todas' },
            { key: 'pending', label: 'Pendentes' },
            { key: 'discussion', label: 'Em Discussão' },
            { key: 'resolved', label: 'Resolvidas' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? 'btn btn-secondary' : 'btn btn-outline'}
              style={{ fontSize: '12px', padding: '8px 14px' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="btn btn-primary"
          style={{ fontSize: '12px', padding: '8px 16px', marginLeft: 'auto' }}
        >
          <Plus size={14} /> Nova Dúvida
        </button>
      </div>

      {/* Decision Grid */}
      {filteredDecisions.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <MessageCircle size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ margin: 0 }}>Nenhuma decisão encontrada</p>
          <p style={{ fontSize: '12px', margin: '8px 0 0' }}>
            {filter !== 'all' ? 'Tente ajustar os filtros ou ' : ''}
            Crie uma nova dúvida para começar
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {filteredDecisions.map(decision => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              onClick={() => setSelectedDecision(decision)}
              onDelete={() => handleDeleteDecision(decision)}
            />
          ))}
        </div>
      )}

      {/* Modal: Ver/Responder Decisão */}
      {selectedDecision && (
        <DecisionModal
          decision={selectedDecision}
          utilizadores={utilizadores}
          onClose={() => setSelectedDecision(null)}
          onResponseSubmitted={handleResponseSubmitted}
        />
      )}

      {/* Modal: Nova Dúvida */}
      {showNewModal && (
        <NewDecisionModal
          projetoId={projeto.id}
          entregaveis={entregaveis}
          utilizadores={utilizadores}
          onClose={() => setShowNewModal(false)}
          onCreated={handleDecisionCreated}
        />
      )}
    </div>
  )
}

// Card Component - Design melhorado
function DecisionCard({ decision, onClick, onDelete }) {
  const status = STATUS_CONFIG[decision.status]
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      style={{
        background: 'var(--white)',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isHovered
          ? '0 12px 40px rgba(0,0,0,0.12)'
          : '0 2px 12px rgba(0,0,0,0.06)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        border: '1px solid var(--stone)',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Bar no topo */}
      <div style={{
        height: '4px',
        background: status.color,
        transition: 'all 0.3s'
      }} />

      {/* Image Area */}
      {decision.imagem_url ? (
        <div style={{
          height: '140px',
          background: `url(${decision.imagem_url}) center/cover`,
          position: 'relative'
        }}>
          {/* Overlay gradient */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.3))'
          }} />
        </div>
      ) : (
        <div style={{
          height: '80px',
          background: 'linear-gradient(135deg, var(--cream) 0%, var(--stone) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <FileText size={28} style={{ color: 'var(--brown-light)', opacity: 0.3 }} />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header: Status + Entregável */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: status.bg,
            color: status.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {decision.status === 'pending' && <Clock size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
            {decision.status === 'discussion' && <MessageCircle size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
            {decision.status === 'resolved' && <CheckCircle size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
            {status.label}
          </span>

          {decision.entregavel && (
            <span style={{
              padding: '4px 8px',
              background: 'var(--stone)',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--brown)'
            }}>
              {decision.entregavel.codigo}
            </span>
          )}
        </div>

        {/* Título */}
        <h4 style={{
          margin: '0 0 8px',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--brown)',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {decision.titulo}
        </h4>

        {/* Descrição */}
        <p style={{
          margin: '0 0 auto',
          fontSize: '12px',
          color: 'var(--brown-light)',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {decision.descricao}
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid var(--stone)'
        }}>
          {/* Autor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blush-dark) 0%, var(--warning) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={12} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--brown)', fontWeight: 500 }}>
              {decision.submetido_por_nome || 'Utilizador'}
            </span>
          </div>

          {/* Meta info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {decision.comment_count > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                background: 'rgba(64, 158, 255, 0.1)',
                borderRadius: '12px'
              }}>
                <MessageCircle size={11} style={{ color: 'var(--info)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--info)' }}>
                  {decision.comment_count}
                </span>
              </div>
            )}
            <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>
              {new Date(decision.submetido_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Modal para Ver/Responder Decisão (com sistema de thread/comentários)
function DecisionModal({ decision, utilizadores, onClose, onResponseSubmitted }) {
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [autorId, setAutorId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [resolucaoFinal, setResolucaoFinal] = useState('')
  const status = STATUS_CONFIG[decision.status]

  // Carregar comentários ao abrir
  useEffect(() => {
    loadComments()
  }, [decision.id])

  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const { data, error } = await supabase
        .from('duvida_comentarios')
        .select('*')
        .eq('duvida_id', decision.id)
        .order('criado_em', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      console.error('Erro ao carregar comentários:', err)
      // Se a tabela não existir, silently fail
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  // Adicionar novo comentário
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert('Por favor escreva um comentário')
      return
    }

    setSubmitting(true)
    try {
      const autor = utilizadores.find(u => u.id === autorId)

      const { error } = await supabase
        .from('duvida_comentarios')
        .insert({
          duvida_id: decision.id,
          comentario: newComment.trim(),
          autor_id: autorId || null,
          autor_nome: autor?.nome || 'Utilizador'
        })

      if (error) throw error

      setNewComment('')
      loadComments()
      // Notificar parent para atualizar status se necessário
      onResponseSubmitted()
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err)
      alert('Erro ao adicionar comentário: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Marcar como resolvido
  const handleResolve = async () => {
    if (!resolucaoFinal.trim()) {
      alert('Por favor escreva a resolução final')
      return
    }

    setResolving(true)
    try {
      const autor = utilizadores.find(u => u.id === autorId)

      const { error } = await supabase
        .from('projeto_duvidas')
        .update({
          status: 'resolved',
          resolucao_final: resolucaoFinal.trim(),
          resolvido_em: new Date().toISOString(),
          resolvido_por: autorId || null,
          resolvido_por_nome: autor?.nome || 'Utilizador'
        })
        .eq('id', decision.id)

      if (error) throw error
      onResponseSubmitted()
    } catch (err) {
      console.error('Erro ao resolver:', err)
      alert('Erro ao marcar como resolvido: ' + err.message)
    } finally {
      setResolving(false)
    }
  }

  // Reabrir questão
  const handleReopen = async () => {
    try {
      const { error } = await supabase
        .from('projeto_duvidas')
        .update({
          status: 'discussion',
          resolucao_final: null,
          resolvido_em: null,
          resolvido_por: null,
          resolvido_por_nome: null
        })
        .eq('id', decision.id)

      if (error) throw error
      onResponseSubmitted()
    } catch (err) {
      console.error('Erro ao reabrir:', err)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h3>{decision.titulo}</h3>
          <button onClick={onClose} className="modal-close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Meta info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {decision.entregavel && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--stone)',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <span style={{ fontWeight: 600 }}>{decision.entregavel.codigo}</span>
                <span style={{ color: 'var(--brown-light)' }}>{decision.entregavel.nome}</span>
              </div>
            )}
            <span style={{
              padding: '6px 14px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: status.bg,
              color: status.color
            }}>
              {status.label}
            </span>
          </div>

          {/* Image */}
          {decision.imagem_url && (
            <img
              src={decision.imagem_url}
              alt=""
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid var(--stone)'
              }}
            />
          )}

          {/* Submission info */}
          <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--brown-light)' }}>
            <span><strong>Submetido por:</strong> {decision.submetido_por_nome || 'Utilizador'}</span>
            <span><strong>Data:</strong> {new Date(decision.submetido_em).toLocaleDateString('pt-PT')}</span>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px', display: 'block' }}>
              Dúvida / Pedido de Definição
            </label>
            <p style={{
              margin: 0,
              padding: '12px',
              background: 'var(--cream)',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--brown)'
            }}>
              {decision.descricao}
            </p>
          </div>

          {/* Thread de Comentários */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={14} />
              Discussão ({comments.length} {comments.length === 1 ? 'comentário' : 'comentários'})
            </label>

            {loadingComments ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '12px' }}>
                A carregar comentários...
              </div>
            ) : comments.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                background: 'var(--cream)',
                borderRadius: '8px',
                color: 'var(--brown-light)',
                fontSize: '12px'
              }}>
                Ainda não há comentários. Seja o primeiro a responder!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                {comments.map((comment, idx) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '12px',
                      background: idx % 2 === 0 ? 'var(--cream)' : 'rgba(138, 158, 184, 0.08)',
                      borderRadius: '8px',
                      borderLeft: '3px solid var(--info)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--info)' }}>
                        {comment.autor_nome}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>
                        {new Date(comment.criado_em).toLocaleDateString('pt-PT')} às {new Date(comment.criado_em).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--brown)' }}>
                      {comment.comentario}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolução Final (se resolvido) */}
          {decision.status === 'resolved' && (decision.resolucao_final || decision.resposta) && (
            <div style={{
              padding: '16px',
              background: 'rgba(103, 194, 58, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(103, 194, 58, 0.3)'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} />
                Resolução Final
              </label>
              <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.6, color: 'var(--brown)' }}>
                {decision.resolucao_final || decision.resposta}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--brown-light)' }}>
                  <span><strong>Resolvido por:</strong> {decision.resolvido_por_nome || decision.respondido_por_nome || 'Utilizador'}</span>
                  <span><strong>Data:</strong> {(decision.resolvido_em || decision.respondido_em) ? new Date(decision.resolvido_em || decision.respondido_em).toLocaleDateString('pt-PT') : '-'}</span>
                </div>
                <button
                  onClick={handleReopen}
                  className="btn btn-outline"
                  style={{ fontSize: '10px', padding: '4px 10px' }}
                >
                  Reabrir
                </button>
              </div>
            </div>
          )}

          {/* Formulário de Novo Comentário (se não resolvido) */}
          {decision.status !== 'resolved' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--stone)', paddingTop: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                Adicionar Comentário
              </label>

              <select
                value={autorId}
                onChange={e => setAutorId(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value="">Quem está a comentar?</option>
                {utilizadores.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>

              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Escreva o seu comentário ou resposta..."
                rows={3}
                style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
              />

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowResolveForm(true)}
                  className="btn btn-outline"
                  style={{ fontSize: '12px', color: 'var(--success)', borderColor: 'var(--success)' }}
                >
                  <CheckCircle size={14} /> Marcar como Resolvido
                </button>
                <button
                  onClick={handleAddComment}
                  className="btn btn-primary"
                  disabled={submitting || !newComment.trim()}
                  style={{ fontSize: '12px' }}
                >
                  {submitting ? 'A enviar...' : 'Adicionar Comentário'}
                </button>
              </div>
            </div>
          )}

          {/* Modal/Form para Resolução */}
          {showResolveForm && (
            <div style={{
              padding: '16px',
              background: 'rgba(103, 194, 58, 0.05)',
              borderRadius: '8px',
              border: '1px solid var(--success)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
                Resolução Final
              </label>
              <p style={{ fontSize: '11px', color: 'var(--brown-light)', margin: 0 }}>
                Descreva a decisão final que resolve esta questão.
              </p>
              <textarea
                value={resolucaoFinal}
                onChange={e => setResolucaoFinal(e.target.value)}
                placeholder="Escreva a resolução final..."
                rows={3}
                style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowResolveForm(false); setResolucaoFinal('') }}
                  className="btn btn-outline"
                  style={{ fontSize: '12px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResolve}
                  className="btn btn-primary"
                  disabled={resolving || !resolucaoFinal.trim()}
                  style={{ fontSize: '12px', background: 'var(--success)' }}
                >
                  {resolving ? 'A resolver...' : 'Confirmar Resolução'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Modal para Nova Dúvida
function NewDecisionModal({ projetoId, entregaveis, utilizadores, onClose, onCreated }) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [entregavelId, setEntregavelId] = useState('')
  const [submetidoPor, setSubmetidoPor] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) return

    // Create preview URL for display only
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    setImageFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageSelect(file)
  }

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview('')
    setImageFile(null)
  }

  const handleSubmit = async () => {
    if (!titulo.trim() || !descricao.trim()) {
      alert('Por favor preencha o título e descrição')
      return
    }

    setSubmitting(true)
    try {
      const submitter = utilizadores.find(u => u.id === submetidoPor)
      let finalImageUrl = null

      // Upload image to Supabase Storage if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop().toLowerCase()
        const timestamp = Date.now()
        const safeFileName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `${projetoId}/${timestamp}_${safeFileName}`

        const { error: uploadError } = await supabase.storage
          .from('decision-images')
          .upload(storagePath, imageFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Erro no upload da imagem:', uploadError)
          throw new Error('Erro ao carregar imagem. Verifique se o bucket "decision-images" está configurado.')
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('decision-images')
          .getPublicUrl(storagePath)

        finalImageUrl = urlData.publicUrl
      }

      const { error } = await supabase
        .from('projeto_duvidas')
        .insert({
          projeto_id: projetoId,
          entregavel_id: entregavelId || null,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          imagem_url: finalImageUrl,
          submetido_por: submetidoPor || null,
          submetido_por_nome: submitter?.nome || 'Utilizador'
        })

      if (error) throw error
      onCreated()
    } catch (err) {
      console.error('Erro ao criar decisão:', err)
      alert('Erro ao criar dúvida: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h3>Nova Dúvida</h3>
          <button onClick={onClose} className="modal-close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quem submete */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '6px', display: 'block' }}>
              Quem está a submeter?
            </label>
            <select
              value={submetidoPor}
              onChange={e => setSubmetidoPor(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="">Selecionar utilizador...</option>
              {utilizadores.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '6px', display: 'block' }}>
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Breve descrição da dúvida"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* Entregável */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '6px', display: 'block' }}>
              Entregável Associado
            </label>
            <select
              value={entregavelId}
              onChange={e => setEntregavelId(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="">Selecionar entregável (opcional)...</option>
              {entregaveis.map(e => (
                <option key={e.id} value={e.id}>{e.codigo} - {e.nome}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '6px', display: 'block' }}>
              Descrição / Pedido de Definição *
            </label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva a dúvida ou pedido de definição em detalhe..."
              rows={4}
              style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          {/* Imagem */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '6px', display: 'block' }}>
              Imagem de Referência (opcional)
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed var(--info)' : '2px dashed var(--stone)',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'rgba(64, 158, 255, 0.05)' : imagePreview ? `url(${imagePreview}) center/cover` : 'var(--cream)',
                minHeight: imagePreview ? '150px' : '80px',
                position: 'relative',
                transition: 'all 0.2s'
              }}
            >
              {!imagePreview && (
                <>
                  <Upload size={24} style={{ color: 'var(--brown-light)', opacity: 0.5, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--brown-light)' }}>
                    Arraste ou clique para fazer upload
                  </p>
                </>
              )}
              {imagePreview && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage() }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Remover
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleImageSelect(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={submitting || !titulo.trim() || !descricao.trim()}
          >
            {submitting ? 'A submeter...' : 'Submeter Dúvida'}
          </button>
        </div>
      </div>
    </div>
  )
}
