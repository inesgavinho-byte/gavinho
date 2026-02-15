import {
  MessageCircle, Pencil, Check, X, Send,
  RefreshCw, Trash2, AlertTriangle, Clock, History
} from 'lucide-react'
import { CATEGORIAS, getCategoriaColor } from './constants'

export default function CommentsPanel({
  annotations,
  currentPage,
  activeTab,
  setActiveTab,
  selectedAnnotation,
  setSelectedAnnotation,
  profile,
  // Comment form
  isAddingComment,
  newComment,
  setNewComment,
  newCommentCategoria,
  setNewCommentCategoria,
  setIsAddingComment,
  setNewCommentPos,
  onAddAnnotation,
  activeTool,
  // Annotation operations
  onResolve,
  onReopen,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  editingAnnotation,
  editText,
  setEditText,
  editCategoria,
  setEditCategoria,
}) {
  // Filter annotations by tab
  const filteredAnnotations = annotations.filter(a => {
    if (a.pagina !== currentPage) return false
    switch (activeTab) {
      case 'abertos': return a.status !== 'resolvido'
      case 'resolvidos': return a.status === 'resolvido'
      case 'meus': return a.autor_id === profile?.id
      default: return true
    }
  })

  const openCount = annotations.filter(a => a.status !== 'resolvido').length
  const resolvedCount = annotations.filter(a => a.status === 'resolvido').length

  // Repeated issues
  const categoryCounts = annotations.reduce((acc, a) => {
    acc[a.categoria] = (acc[a.categoria] || 0) + 1
    return acc
  }, {})
  const repeatedIssues = Object.entries(categoryCounts)
    .filter(([_, count]) => count >= 3)
    .map(([cat, count]) => ({ categoria: cat, count }))

  return (
    <div style={{
      width: '320px',
      minWidth: '280px',
      flexShrink: 0,
      borderLeft: '1px solid var(--stone)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--white)'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--stone)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)' }}>
            Comentarios
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
            {openCount} abertos  {resolvedCount} resolvidos
          </span>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'abertos', label: 'Abertos' },
            { id: 'resolvidos', label: 'Resolvidos' },
            { id: 'meus', label: 'Meus' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === tab.id ? 'var(--brown)' : 'var(--cream)',
                color: activeTab === tab.id ? 'var(--white)' : 'var(--brown)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Repeated Issues Warning */}
      {repeatedIssues.length > 0 && (
        <div style={{
          margin: '12px',
          padding: '12px',
          background: '#FEF3C7',
          borderRadius: '8px',
          border: '1px solid #F59E0B'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#B45309',
            fontSize: '12px',
            fontWeight: 500
          }}>
            <AlertTriangle size={14} />
            Atencao: "{CATEGORIAS.find(c => c.id === repeatedIssues[0].categoria)?.label}" foi reportado {repeatedIssues[0].count}x neste projeto
          </div>
        </div>
      )}

      {/* Comments List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {filteredAnnotations.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--brown-light)'
          }}>
            <MessageCircle size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontSize: '13px' }}>
              {activeTab === 'todos'
                ? 'Nenhum comentario nesta pagina. Clique no desenho para adicionar.'
                : 'Nenhum comentario com este filtro.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredAnnotations.map((annotation, index) => (
              <div
                key={annotation.id}
                onClick={() => setSelectedAnnotation(annotation)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: selectedAnnotation?.id === annotation.id
                    ? 'var(--cream)'
                    : 'transparent',
                  border: `1px solid ${selectedAnnotation?.id === annotation.id ? 'var(--stone-dark)' : 'var(--stone)'}`,
                  cursor: 'pointer'
                }}
              >
                {/* Edit Mode */}
                {editingAnnotation?.id === annotation.id ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--stone)',
                        fontSize: '13px',
                        resize: 'none',
                        minHeight: '60px',
                        marginBottom: '8px'
                      }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={editCategoria}
                        onChange={(e) => setEditCategoria(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--stone)',
                          fontSize: '12px'
                        }}
                      >
                        {CATEGORIAS.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={onCancelEdit}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--stone)',
                          background: 'var(--white)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={onSaveEdit}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: annotation.status === 'resolvido'
                          ? '#10B981'
                          : getCategoriaColor(annotation.categoria),
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        flexShrink: 0
                      }}
                    >
                      {annotation.status === 'resolvido' ? <Check size={12} /> : index + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                            {annotation.autor_nome}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: `${getCategoriaColor(annotation.categoria)}20`,
                            color: getCategoriaColor(annotation.categoria)
                          }}>
                            {CATEGORIAS.find(c => c.id === annotation.categoria)?.label}
                          </span>
                          {annotation.herdado_de && (
                            <span
                              title="Comentário herdado de versão anterior"
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#7C3AED20',
                                color: '#7C3AED',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <History size={10} />
                              Herdado
                            </span>
                          )}
                        </div>
                        {/* Edit/Delete buttons */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onStartEdit(annotation)
                            }}
                            title="Editar"
                            style={{
                              padding: '4px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--brown-light)',
                              borderRadius: '4px'
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(annotation)
                            }}
                            title="Apagar"
                            style={{
                              padding: '4px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#EF4444',
                              borderRadius: '4px'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p style={{
                        fontSize: '13px',
                        color: 'var(--brown)',
                        lineHeight: 1.4,
                        margin: 0
                      }}>
                        {annotation.comentario}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                          {new Date(annotation.criado_em).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {annotation.status !== 'resolvido' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onResolve(annotation)
                            }}
                            style={{
                              fontSize: '11px',
                              color: '#10B981',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Check size={12} />
                            Resolver
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onReopen(annotation)
                            }}
                            style={{
                              fontSize: '11px',
                              color: '#F59E0B',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RefreshCw size={12} />
                            Reabrir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Comment Input */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--stone)',
        background: 'var(--cream)'
      }}>
        {isAddingComment ? (
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva o seu comentario..."
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--stone)',
                fontSize: '13px',
                resize: 'none',
                minHeight: '80px',
                marginBottom: '8px'
              }}
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <select
                value={newCommentCategoria}
                onChange={(e) => setNewCommentCategoria(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--stone)',
                  fontSize: '12px',
                  background: 'var(--white)'
                }}
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setIsAddingComment(false)
                  setNewCommentPos(null)
                }}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--stone)',
                  background: 'var(--white)',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
              <button
                onClick={onAddAnnotation}
                disabled={!newComment.trim()}
                className="btn btn-primary"
                style={{ padding: '8px 16px' }}
              >
                <Send size={14} style={{ marginRight: '6px' }} />
                Enviar
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px dashed var(--stone-dark)',
              background: 'var(--white)',
              textAlign: 'center',
              color: 'var(--brown-light)',
              fontSize: '13px'
            }}
          >
            Clique no desenho para adicionar um comentario, ou escreva aqui...
          </div>
        )}
      </div>

      {/* Review Decision Section */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--stone)',
        background: 'var(--white)'
      }}>
        <h4 style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--brown-light)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px'
        }}>
          Decisao de Revisao
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '12px',
              color: '#F59E0B',
              borderColor: '#F59E0B'
            }}
          >
            <Clock size={14} style={{ marginRight: '6px' }} />
            Pedir Alteracoes
          </button>
          <button
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '12px',
              background: '#10B981',
              borderColor: '#10B981'
            }}
          >
            <Check size={14} style={{ marginRight: '6px' }} />
            Aprovar
          </button>
        </div>
      </div>
    </div>
  )
}
