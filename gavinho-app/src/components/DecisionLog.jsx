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

export default function DecisionLog({ projeto }) {
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
        .from('project_decisions')
        .select(`
          *,
          entregavel:projeto_entregaveis(id, codigo, nome)
        `)
        .eq('projeto_id', projeto.id)
        .order('submetido_em', { ascending: false })

      if (error) throw error
      setDecisions(data || [])
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
        .from('project_decisions')
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
          Decision Log
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
          Registo de dúvidas e decisões do projeto
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

// Card Component
function DecisionCard({ decision, onClick, onDelete }) {
  const status = STATUS_CONFIG[decision.status]

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s'
      }}
      onClick={onClick}
    >
      {/* Image */}
      {decision.imagem_url ? (
        <div style={{
          height: '160px',
          background: `url(${decision.imagem_url}) center/cover`,
          borderBottom: '1px solid var(--stone)'
        }} />
      ) : (
        <div style={{
          height: '120px',
          background: 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid var(--stone)',
          color: 'var(--brown-light)'
        }}>
          <span style={{ fontSize: '12px', opacity: 0.6 }}>Sem imagem</span>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--brown)', flex: 1 }}>
            {decision.titulo}
          </h4>
          <span style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 600,
            backgroundColor: status.bg,
            color: status.color,
            whiteSpace: 'nowrap'
          }}>
            {status.label}
          </span>
        </div>

        {decision.entregavel && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'var(--stone)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'var(--brown)',
            marginBottom: '10px'
          }}>
            <span style={{ fontWeight: 600 }}>{decision.entregavel.codigo}</span>
            <span style={{ color: 'var(--brown-light)' }}>{decision.entregavel.nome}</span>
          </div>
        )}

        <p style={{
          margin: '0 0 12px',
          fontSize: '12px',
          color: 'var(--brown-light)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {decision.descricao}
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--brown-light)',
          paddingTop: '12px',
          borderTop: '1px solid var(--stone)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={12} />
            {decision.submetido_por_nome || 'Utilizador'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} />
            {new Date(decision.submetido_em).toLocaleDateString('pt-PT')}
          </span>
        </div>
      </div>
    </div>
  )
}

// Modal para Ver/Responder Decisão
function DecisionModal({ decision, utilizadores, onClose, onResponseSubmitted }) {
  const [response, setResponse] = useState('')
  const [respondidoPor, setRespondidoPor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const status = STATUS_CONFIG[decision.status]

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      alert('Por favor escreva uma resposta')
      return
    }

    setSubmitting(true)
    try {
      const respondente = utilizadores.find(u => u.id === respondidoPor)

      const { error } = await supabase
        .from('project_decisions')
        .update({
          resposta: response,
          respondido_por: respondidoPor || null,
          respondido_por_nome: respondente?.nome || 'Utilizador',
          respondido_em: new Date().toISOString(),
          status: 'resolved'
        })
        .eq('id', decision.id)

      if (error) throw error
      onResponseSubmitted()
    } catch (err) {
      console.error('Erro ao submeter resposta:', err)
      alert('Erro ao submeter resposta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangeStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('project_decisions')
        .update({ status: newStatus })
        .eq('id', decision.id)

      if (error) throw error
      onResponseSubmitted()
    } catch (err) {
      console.error('Erro ao alterar estado:', err)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
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

          {/* Response Section */}
          {decision.status === 'resolved' && decision.resposta ? (
            <div style={{
              padding: '16px',
              background: 'rgba(103, 194, 58, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(103, 194, 58, 0.3)'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)', marginBottom: '8px', display: 'block' }}>
                ✓ Resposta / Decisão
              </label>
              <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.6, color: 'var(--brown)' }}>
                {decision.resposta}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--brown-light)' }}>
                <span><strong>Respondido por:</strong> {decision.respondido_por_nome || 'Utilizador'}</span>
                <span><strong>Data:</strong> {decision.respondido_em ? new Date(decision.respondido_em).toLocaleDateString('pt-PT') : '-'}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                Adicionar Resposta / Decisão
              </label>

              <select
                value={respondidoPor}
                onChange={e => setRespondidoPor(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value="">Quem está a responder?</option>
                {utilizadores.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>

              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Escreva a resposta ou decisão..."
                rows={4}
                style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
              />

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {decision.status !== 'discussion' && (
                  <button
                    onClick={() => handleChangeStatus('discussion')}
                    className="btn btn-outline"
                    style={{ fontSize: '12px' }}
                  >
                    Marcar Em Discussão
                  </button>
                )}
                <button
                  onClick={handleSubmitResponse}
                  className="btn btn-primary"
                  disabled={submitting || !response.trim()}
                  style={{ fontSize: '12px', marginLeft: 'auto' }}
                >
                  {submitting ? 'A submeter...' : 'Submeter Resposta'}
                </button>
              </div>

              <p style={{ fontSize: '10px', color: 'var(--brown-light)', margin: 0 }}>
                * A resposta será registada automaticamente no diário de bordo do projeto
              </p>
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
  const [imagemUrl, setImagemUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagemUrl(e.target.result)
      setImageFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageSelect(file)
  }

  const handleSubmit = async () => {
    if (!titulo.trim() || !descricao.trim()) {
      alert('Por favor preencha o título e descrição')
      return
    }

    setSubmitting(true)
    try {
      const submitter = utilizadores.find(u => u.id === submetidoPor)

      const { error } = await supabase
        .from('project_decisions')
        .insert({
          projeto_id: projetoId,
          entregavel_id: entregavelId || null,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          imagem_url: imagemUrl || null,
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
                background: isDragging ? 'rgba(64, 158, 255, 0.05)' : imagemUrl ? `url(${imagemUrl}) center/cover` : 'var(--cream)',
                minHeight: imagemUrl ? '150px' : '80px',
                position: 'relative',
                transition: 'all 0.2s'
              }}
            >
              {!imagemUrl && (
                <>
                  <Upload size={24} style={{ color: 'var(--brown-light)', opacity: 0.5, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--brown-light)' }}>
                    Arraste ou clique para fazer upload
                  </p>
                </>
              )}
              {imagemUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); setImagemUrl(''); setImageFile(null) }}
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
