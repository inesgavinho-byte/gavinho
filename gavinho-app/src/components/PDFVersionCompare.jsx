import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2,
  GitCompare, CheckCircle, XCircle, AlertTriangle, Clock,
  MessageSquare, Lock, Send, FileText, History, Eye,
  ChevronDown, ChevronUp, Filter, User, Calendar, Maximize,
  Flag, Reply, CornerDownRight, ThumbsUp, ThumbsDown, Edit3,
  AtSign, LayoutGrid
} from 'lucide-react'

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// Status de correcao para cada item
const CORRECTION_STATUS = {
  IMPLEMENTED: { key: 'implementado', label: 'Implementado', icon: CheckCircle, color: 'var(--success)' },
  PENDING: { key: 'pendente', label: 'Pendente', icon: Clock, color: 'var(--warning)' },
  ERROR: { key: 'erro', label: 'Erro', icon: XCircle, color: 'var(--error)' },
  OMISSION: { key: 'omissao', label: 'Omissao', icon: AlertTriangle, color: 'var(--info)' }
}

// Prioridades para anotacoes
const PRIORITY_LEVELS = {
  urgente: { label: 'Urgente', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)' },
  alta: { label: 'Alta', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.15)' },
  normal: { label: 'Normal', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' },
  baixa: { label: 'Baixa', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' }
}

export default function PDFVersionCompare({
  documentoId,
  versaoAnteriorUrl,
  versaoAtualUrl,
  versaoAnteriorNome,
  versaoAtualNome,
  revisoesAnteriores = [],
  onClose,
  onSubmitReview,
  projetoId,
  userId,
  userName
}) {
  const toast = useToast()

  // PDF State
  const [pdfAnterior, setPdfAnterior] = useState(null)
  const [pdfAtual, setPdfAtual] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPagesAnterior, setTotalPagesAnterior] = useState(0)
  const [totalPagesAtual, setTotalPagesAtual] = useState(0)
  const [scale, setScale] = useState(0.8)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Review State
  const [reviewItems, setReviewItems] = useState([])
  const [newComment, setNewComment] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('pendente')
  const [selectedPriority, setSelectedPriority] = useState('normal')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [showFilters, setShowFilters] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [expandedThreads, setExpandedThreads] = useState(new Set())

  // Submission State
  const [submitting, setSubmitting] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  // Decision State
  const [showDecisionModal, setShowDecisionModal] = useState(null) // 'approve' | 'changes' | null
  const [decisionNotes, setDecisionNotes] = useState('')

  // History State
  const [showHistory, setShowHistory] = useState(false)
  const [revisionHistory, setRevisionHistory] = useState([])

  // Mentions State
  const [teamMembers, setTeamMembers] = useState([])
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionCursorPos, setMentionCursorPos] = useState(0)
  const [activeMentionField, setActiveMentionField] = useState(null) // 'comment' | 'reply'

  // Thumbnails State
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [thumbnails, setThumbnails] = useState([])
  const [loadingThumbnails, setLoadingThumbnails] = useState(false)

  // Refs
  const canvasAnteriorRef = useRef(null)
  const canvasAtualRef = useRef(null)
  const pdfContainerRef = useRef(null)
  const commentInputRef = useRef(null)
  const replyInputRef = useRef(null)

  // Load PDFs
  useEffect(() => {
    const loadPdfs = async () => {
      try {
        setLoading(true)
        setError(null)

        const [anterior, atual] = await Promise.all([
          versaoAnteriorUrl ? pdfjsLib.getDocument(versaoAnteriorUrl).promise : null,
          pdfjsLib.getDocument(versaoAtualUrl).promise
        ])

        if (anterior) {
          setPdfAnterior(anterior)
          setTotalPagesAnterior(anterior.numPages)
        }

        setPdfAtual(atual)
        setTotalPagesAtual(atual.numPages)
        setCurrentPage(1)
      } catch (err) {
        console.error('Erro ao carregar PDFs:', err)
        setError('Erro ao carregar os documentos. Verifique se os ficheiros sao validos.')
      } finally {
        setLoading(false)
      }
    }

    if (versaoAtualUrl) {
      loadPdfs()
    }
  }, [versaoAnteriorUrl, versaoAtualUrl])

  // Load previous review items
  useEffect(() => {
    if (revisoesAnteriores && revisoesAnteriores.length > 0) {
      // Convert previous revisions to review items
      const items = revisoesAnteriores.map((rev, index) => ({
        id: rev.id || `prev-${index}`,
        pagina: rev.pagina || 1,
        comentario: rev.comentario || rev.texto,
        status: rev.status || 'pendente',
        autor: rev.autor || 'Desconhecido',
        data: rev.data || rev.created_at,
        tipo: rev.tipo || 'comentario',
        resolvido: rev.resolvido || false,
        notasResolucao: rev.notas_resolucao || ''
      }))
      setReviewItems(items)
    }
  }, [revisoesAnteriores])

  // Load revision history
  useEffect(() => {
    const loadHistory = async () => {
      if (!documentoId) return

      try {
        const { data, error } = await supabase
          .from('documento_revisoes')
          .select('*')
          .eq('documento_id', documentoId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setRevisionHistory(data || [])
      } catch (err) {
        console.error('Erro ao carregar historico:', err)
      }
    }

    loadHistory()
  }, [documentoId])

  // Load team members for mentions
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('utilizadores')
          .select('id, nome, email, cargo, avatar_url')
          .eq('ativo', true)
          .order('nome')

        if (error) throw error
        setTeamMembers(data || [])
      } catch (err) {
        console.error('Erro ao carregar equipa:', err)
      }
    }

    loadTeamMembers()
  }, [])

  // Generate thumbnails when PDF loads
  useEffect(() => {
    const generateThumbnails = async () => {
      if (!pdfAtual || loadingThumbnails) return

      setLoadingThumbnails(true)
      const thumbs = []

      try {
        for (let i = 1; i <= totalPagesAtual; i++) {
          const page = await pdfAtual.getPage(i)
          const viewport = page.getViewport({ scale: 0.2 })

          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.height = viewport.height
          canvas.width = viewport.width

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise

          thumbs.push({
            page: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.6)
          })
        }

        setThumbnails(thumbs)
      } catch (err) {
        console.error('Erro ao gerar miniaturas:', err)
      } finally {
        setLoadingThumbnails(false)
      }
    }

    if (pdfAtual && totalPagesAtual > 0 && thumbnails.length === 0) {
      generateThumbnails()
    }
  }, [pdfAtual, totalPagesAtual])

  // Render PDF pages
  useEffect(() => {
    const renderPages = async () => {
      // Render anterior
      if (pdfAnterior && canvasAnteriorRef.current) {
        try {
          const pageNum = Math.min(currentPage, totalPagesAnterior)
          const page = await pdfAnterior.getPage(pageNum)
          const viewport = page.getViewport({ scale })
          const canvas = canvasAnteriorRef.current
          const context = canvas.getContext('2d')

          canvas.height = viewport.height
          canvas.width = viewport.width

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise
        } catch (err) {
          console.error('Erro ao renderizar pagina anterior:', err)
        }
      }

      // Render atual
      if (pdfAtual && canvasAtualRef.current) {
        try {
          const pageNum = Math.min(currentPage, totalPagesAtual)
          const page = await pdfAtual.getPage(pageNum)
          const viewport = page.getViewport({ scale })
          const canvas = canvasAtualRef.current
          const context = canvas.getContext('2d')

          canvas.height = viewport.height
          canvas.width = viewport.width

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise
        } catch (err) {
          console.error('Erro ao renderizar pagina atual:', err)
        }
      }
    }

    renderPages()
  }, [pdfAnterior, pdfAtual, currentPage, scale, totalPagesAnterior, totalPagesAtual])

  // Navigation
  const maxPages = Math.max(totalPagesAnterior, totalPagesAtual)
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1))
  const goToNextPage = () => setCurrentPage(prev => Math.min(maxPages, prev + 1))

  // Zoom
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.4))

  // Fit to width
  const fitToWidth = useCallback(async () => {
    if (!pdfAtual || !pdfContainerRef.current) return

    try {
      const page = await pdfAtual.getPage(currentPage)
      const viewport = page.getViewport({ scale: 1 })
      // Each panel is roughly half the container width minus padding
      const panelWidth = (pdfContainerRef.current.clientWidth / 2) - 32
      const newScale = panelWidth / viewport.width
      setScale(Math.min(Math.max(newScale, 0.4), 2))
    } catch (err) {
      console.error('Erro ao ajustar zoom:', err)
    }
  }, [pdfAtual, currentPage])

  // Handle mention input
  const handleMentionInput = (text, field, cursorPos) => {
    // Check for @ symbol before cursor
    const textBeforeCursor = text.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if there's no space after @ (user is typing a mention)
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase())
        setMentionCursorPos(lastAtIndex)
        setActiveMentionField(field)
        setShowMentionSuggestions(true)
        return
      }
    }

    setShowMentionSuggestions(false)
    setActiveMentionField(null)
  }

  // Filter team members by search
  const filteredMembers = teamMembers.filter(member =>
    member.nome.toLowerCase().includes(mentionSearch) ||
    (member.email && member.email.toLowerCase().includes(mentionSearch))
  ).slice(0, 5)

  // Insert mention into text
  const insertMention = (member) => {
    const mention = `@${member.nome}`

    if (activeMentionField === 'comment') {
      const before = newComment.substring(0, mentionCursorPos)
      const after = newComment.substring(mentionCursorPos + mentionSearch.length + 1)
      setNewComment(before + mention + ' ' + after)
      // Focus back on input
      setTimeout(() => commentInputRef.current?.focus(), 0)
    } else if (activeMentionField === 'reply') {
      const before = replyText.substring(0, mentionCursorPos)
      const after = replyText.substring(mentionCursorPos + mentionSearch.length + 1)
      setReplyText(before + mention + ' ' + after)
      setTimeout(() => replyInputRef.current?.focus(), 0)
    }

    setShowMentionSuggestions(false)
    setActiveMentionField(null)
  }

  // Extract mentions from text and save to database
  const extractAndSaveMentions = async (text, reviewItemId) => {
    const mentionRegex = /@([A-Za-zÀ-ÿ\s]+?)(?=\s|$|@)/g
    const mentions = []
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1].trim()
      const member = teamMembers.find(m =>
        m.nome.toLowerCase() === mentionedName.toLowerCase()
      )
      if (member) {
        mentions.push(member)
      }
    }

    if (mentions.length > 0 && documentoId) {
      try {
        const mentionRecords = mentions.map(member => ({
          documento_id: documentoId,
          review_item_id: reviewItemId,
          mentioned_user_id: member.id,
          mentioned_by_user_id: userId,
          mentioned_by_name: userName,
          created_at: new Date().toISOString()
        }))

        await supabase
          .from('design_review_mentions')
          .insert(mentionRecords)
      } catch (err) {
        console.error('Erro ao guardar mencoes:', err)
      }
    }

    return mentions
  }

  // Render text with highlighted mentions
  const renderTextWithMentions = (text) => {
    if (!text) return null

    const parts = text.split(/(@[A-Za-zÀ-ÿ\s]+?)(?=\s|$|@)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const name = part.substring(1).trim()
        const member = teamMembers.find(m =>
          m.nome.toLowerCase() === name.toLowerCase()
        )
        if (member) {
          return (
            <span key={index} className="mention-tag" title={member.email}>
              <AtSign size={12} />
              {name}
            </span>
          )
        }
      }
      return part
    })
  }

  // Add new review item
  const handleAddComment = async () => {
    if (!newComment.trim()) return

    const newItemId = `new-${Date.now()}`
    const newItem = {
      id: newItemId,
      pagina: currentPage,
      comentario: newComment,
      status: selectedStatus,
      prioridade: selectedPriority,
      autor: userName || 'Utilizador',
      data: new Date().toISOString(),
      tipo: 'comentario',
      resolvido: false,
      notasResolucao: '',
      respostas: []
    }

    setReviewItems(prev => [...prev, newItem])

    // Extract and save mentions
    await extractAndSaveMentions(newComment, newItemId)

    setNewComment('')
    setShowMentionSuggestions(false)
  }

  // Add reply to a comment
  const handleAddReply = async (parentId) => {
    if (!replyText.trim()) return

    const replyId = `reply-${Date.now()}`
    const reply = {
      id: replyId,
      autor: userName || 'Utilizador',
      data: new Date().toISOString(),
      texto: replyText
    }

    setReviewItems(prev => prev.map(item =>
      item.id === parentId
        ? { ...item, respostas: [...(item.respostas || []), reply] }
        : item
    ))

    // Extract and save mentions
    await extractAndSaveMentions(replyText, replyId)

    setReplyText('')
    setReplyingTo(null)
    setShowMentionSuggestions(false)
  }

  // Toggle thread expansion
  const toggleThread = (itemId) => {
    setExpandedThreads(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // Update item priority
  const handleUpdatePriority = (itemId, newPriority) => {
    setReviewItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, prioridade: newPriority } : item
    ))
  }

  // Update item status
  const handleUpdateStatus = (itemId, newStatus) => {
    setReviewItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    ))
  }

  // Toggle item resolved
  const handleToggleResolved = (itemId) => {
    setReviewItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, resolvido: !item.resolvido } : item
    ))
  }

  // Update resolution notes
  const handleUpdateNotes = (itemId, notes) => {
    setReviewItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, notasResolucao: notes } : item
    ))
  }

  // Filter items
  const filteredItems = reviewItems.filter(item => {
    if (filterStatus === 'todos') return true
    if (filterStatus === 'pagina') return item.pagina === currentPage
    return item.status === filterStatus
  })

  // Get statistics
  const stats = {
    total: reviewItems.length,
    implementado: reviewItems.filter(i => i.status === 'implementado').length,
    pendente: reviewItems.filter(i => i.status === 'pendente').length,
    erro: reviewItems.filter(i => i.status === 'erro').length,
    omissao: reviewItems.filter(i => i.status === 'omissao').length
  }

  // Submit review
  const handleSubmitReview = async () => {
    if (!reviewNotes.trim()) {
      toast.warning('Aviso', 'Por favor adicione notas sobre esta revisão')
      return
    }

    setSubmitting(true)

    try {
      const reviewData = {
        documento_id: documentoId,
        projeto_id: projetoId,
        user_id: userId,
        user_name: userName,
        versao_anterior: versaoAnteriorNome,
        versao_atual: versaoAtualNome,
        notas: reviewNotes,
        items: reviewItems,
        estatisticas: stats,
        status: stats.pendente === 0 && stats.erro === 0 ? 'aprovado' : 'pendente',
        created_at: new Date().toISOString()
      }

      // Save to database
      const { error: saveError } = await supabase
        .from('documento_revisoes')
        .insert([reviewData])

      if (saveError) throw saveError

      // Call callback
      if (onSubmitReview) {
        await onSubmitReview(reviewData)
      }

      setShowSubmitModal(false)
      toast.success('Sucesso', 'Revisão submetida e versão trancada com sucesso!')
      onClose()
    } catch (err) {
      console.error('Erro ao submeter revisao:', err)
      toast.error('Erro', 'Erro ao submeter revisão. Por favor tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle decision (Approve or Request Changes)
  const handleDecision = async (decision) => {
    if (!decisionNotes.trim()) {
      toast.warning('Aviso', 'Por favor adicione notas sobre esta decisão')
      return
    }

    setSubmitting(true)

    try {
      const decisionData = {
        documento_id: documentoId,
        projeto_id: projetoId,
        user_id: userId,
        user_name: userName,
        versao_anterior: versaoAnteriorNome,
        versao_atual: versaoAtualNome,
        notas: decisionNotes,
        items: reviewItems,
        estatisticas: stats,
        decisao: decision, // 'aprovado' ou 'alteracoes'
        status: decision === 'aprovado' ? 'aprovado' : 'alteracoes_pedidas',
        created_at: new Date().toISOString()
      }

      // Save to database
      const { error: saveError } = await supabase
        .from('documento_revisoes')
        .insert([decisionData])

      if (saveError) throw saveError

      // Call callback
      if (onSubmitReview) {
        await onSubmitReview(decisionData)
      }

      setShowDecisionModal(null)
      setDecisionNotes('')

      if (decision === 'aprovado') {
        toast.success('Sucesso', 'Documento aprovado e versão trancada com sucesso!')
      } else {
        toast.success('Sucesso', 'Pedido de alterações registado com sucesso!')
      }

      onClose()
    } catch (err) {
      console.error('Erro ao registar decisao:', err)
      toast.error('Erro', 'Erro ao registar decisão. Por favor tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="version-compare-overlay">
        <div className="version-compare-loading">
          <Loader2 size={32} className="spin" />
          <p>A carregar documentos para comparacao...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="version-compare-overlay">
        <div className="version-compare-error">
          <AlertTriangle size={48} />
          <p>{error}</p>
          <button onClick={onClose} className="btn btn-primary">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="version-compare-overlay">
      <div className="version-compare-container">
        {/* Header */}
        <div className="version-compare-header">
          <div className="version-compare-title">
            <GitCompare size={20} />
            <span>Comparar Versoes</span>
          </div>

          <div className="version-compare-nav">
            <button onClick={goToPreviousPage} disabled={currentPage <= 1} className="pdf-nav-btn">
              <ChevronLeft size={18} />
            </button>
            <span className="pdf-page-info">Pagina {currentPage} de {maxPages}</span>
            <button onClick={goToNextPage} disabled={currentPage >= maxPages} className="pdf-nav-btn">
              <ChevronRight size={18} />
            </button>

            <div className="pdf-tool-divider" />

            <button onClick={zoomOut} disabled={scale <= 0.4} className="pdf-tool-btn">
              <ZoomOut size={16} />
            </button>
            <span className="pdf-zoom-level">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} disabled={scale >= 2} className="pdf-tool-btn">
              <ZoomIn size={16} />
            </button>
            <button onClick={fitToWidth} className="pdf-tool-btn" title="Ajustar a largura">
              <Maximize size={16} />
            </button>
          </div>

          <div className="version-compare-actions">
            <button
              className={`btn btn-outline ${showThumbnails ? 'active' : ''}`}
              onClick={() => setShowThumbnails(!showThumbnails)}
              title="Miniaturas das paginas"
            >
              <LayoutGrid size={16} />
              Miniaturas
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History size={16} />
              Historico
            </button>

            {/* Decision Buttons */}
            <div className="decision-buttons">
              <button
                className="btn btn-success decision-btn"
                onClick={() => setShowDecisionModal('approve')}
                title="Aprovar documento"
              >
                <ThumbsUp size={16} />
                Aprovar
              </button>
              <button
                className="btn btn-warning decision-btn"
                onClick={() => setShowDecisionModal('changes')}
                title="Pedir alteracoes"
              >
                <Edit3 size={16} />
                Pedir Alteracoes
              </button>
            </div>

            <button
              className="btn btn-outline"
              onClick={() => setShowSubmitModal(true)}
              title="Submeter revisao detalhada"
            >
              <Lock size={16} />
              Submeter Log
            </button>
            <button className="pdf-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="version-compare-stats">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item implemented">
            <CheckCircle size={14} />
            <span>{stats.implementado} Implementado</span>
          </div>
          <div className="stat-item pending">
            <Clock size={14} />
            <span>{stats.pendente} Pendente</span>
          </div>
          <div className="stat-item error">
            <XCircle size={14} />
            <span>{stats.erro} Erro</span>
          </div>
          <div className="stat-item omission">
            <AlertTriangle size={14} />
            <span>{stats.omissao} Omissao</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="version-compare-body">
          {/* Thumbnails Panel */}
          {showThumbnails && (
            <div className="thumbnails-panel">
              <div className="thumbnails-header">
                <h4><LayoutGrid size={16} /> Paginas</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowThumbnails(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="thumbnails-list">
                {loadingThumbnails ? (
                  <div className="thumbnails-loading">
                    <Loader2 size={24} className="spin" />
                    <p>A gerar miniaturas...</p>
                  </div>
                ) : thumbnails.length === 0 ? (
                  <div className="thumbnails-empty">
                    <FileText size={24} />
                    <p>Sem miniaturas disponiveis</p>
                  </div>
                ) : (
                  thumbnails.map(thumb => (
                    <div
                      key={thumb.page}
                      className={`thumbnail-item ${currentPage === thumb.page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(thumb.page)}
                    >
                      <img src={thumb.dataUrl} alt={`Pagina ${thumb.page}`} />
                      <span className="thumbnail-page">Pag. {thumb.page}</span>
                      {reviewItems.filter(item => item.pagina === thumb.page).length > 0 && (
                        <span className="thumbnail-badge">
                          {reviewItems.filter(item => item.pagina === thumb.page).length}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PDF Comparison Panel */}
          <div className="version-compare-pdfs" ref={pdfContainerRef}>
            {/* Versao Anterior */}
            <div className="version-pdf-panel">
              <div className="version-pdf-header">
                <FileText size={16} />
                <span>Versao Anterior</span>
                {versaoAnteriorNome && <small>{versaoAnteriorNome}</small>}
              </div>
              <div className="version-pdf-canvas">
                {versaoAnteriorUrl ? (
                  <canvas ref={canvasAnteriorRef} />
                ) : (
                  <div className="version-pdf-empty">
                    <Eye size={32} />
                    <p>Sem versao anterior para comparar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Versao Atual */}
            <div className="version-pdf-panel">
              <div className="version-pdf-header">
                <FileText size={16} />
                <span>Versao Atual</span>
                {versaoAtualNome && <small>{versaoAtualNome}</small>}
              </div>
              <div className="version-pdf-canvas">
                <canvas ref={canvasAtualRef} />
              </div>
            </div>
          </div>

          {/* Review Panel */}
          <div className="version-review-panel">
            <div className="review-panel-header">
              <h4>
                <MessageSquare size={16} />
                Analise de Diferencas
              </h4>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={14} />
                Filtros
                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="review-filters">
                <button
                  className={`filter-btn ${filterStatus === 'todos' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('todos')}
                >
                  Todos ({stats.total})
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'pagina' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('pagina')}
                >
                  Esta Pagina
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'implementado' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('implementado')}
                >
                  Implementado
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'pendente' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('pendente')}
                >
                  Pendente
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'erro' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('erro')}
                >
                  Erros
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'omissao' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('omissao')}
                >
                  Omissoes
                </button>
              </div>
            )}

            {/* Review Items List */}
            <div className="review-items-list">
              {filteredItems.length === 0 ? (
                <div className="review-empty">
                  <MessageSquare size={24} />
                  <p>Sem comentarios ou anotacoes</p>
                </div>
              ) : (
                filteredItems.map(item => (
                  <div key={item.id} className={`review-item ${item.resolvido ? 'resolved' : ''} priority-${item.prioridade || 'normal'}`}>
                    <div className="review-item-header">
                      <div className="review-item-meta">
                        <span className="review-page">Pag. {item.pagina}</span>
                        <span className={`review-status status-${item.status}`}>
                          {CORRECTION_STATUS[item.status.toUpperCase()]?.icon &&
                            React.createElement(CORRECTION_STATUS[item.status.toUpperCase()].icon, { size: 12 })}
                          {CORRECTION_STATUS[item.status.toUpperCase()]?.label || item.status}
                        </span>
                        {item.prioridade && (
                          <span
                            className="review-priority"
                            style={{
                              background: PRIORITY_LEVELS[item.prioridade]?.bg,
                              color: PRIORITY_LEVELS[item.prioridade]?.color
                            }}
                          >
                            <Flag size={10} />
                            {PRIORITY_LEVELS[item.prioridade]?.label}
                          </span>
                        )}
                      </div>
                      <div className="review-item-author">
                        <User size={12} />
                        <span>{item.autor}</span>
                        <Calendar size={12} />
                        <span>{new Date(item.data).toLocaleDateString('pt-PT')}</span>
                      </div>
                    </div>

                    <p className="review-item-comment">{renderTextWithMentions(item.comentario)}</p>

                    {/* Status & Priority Selectors */}
                    <div className="review-item-actions">
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        className="review-status-select"
                      >
                        <option value="implementado">Implementado</option>
                        <option value="pendente">Pendente</option>
                        <option value="erro">Erro</option>
                        <option value="omissao">Omissao</option>
                      </select>

                      <select
                        value={item.prioridade || 'normal'}
                        onChange={(e) => handleUpdatePriority(item.id, e.target.value)}
                        className="review-priority-select"
                      >
                        <option value="urgente">Urgente</option>
                        <option value="alta">Alta</option>
                        <option value="normal">Normal</option>
                        <option value="baixa">Baixa</option>
                      </select>

                      <button
                        className={`btn btn-sm ${item.resolvido ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => handleToggleResolved(item.id)}
                      >
                        <CheckCircle size={14} />
                        {item.resolvido ? 'Resolvido' : 'Marcar'}
                      </button>

                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
                      >
                        <Reply size={14} />
                        Responder
                      </button>
                    </div>

                    {/* Resolution Notes */}
                    <div className="review-item-notes">
                      <textarea
                        placeholder="Notas de resolucao..."
                        value={item.notasResolucao}
                        onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* Replies Thread */}
                    {item.respostas && item.respostas.length > 0 && (
                      <div className="review-thread">
                        <button
                          className="thread-toggle"
                          onClick={() => toggleThread(item.id)}
                        >
                          <CornerDownRight size={14} />
                          {expandedThreads.has(item.id) ? 'Ocultar' : 'Ver'} {item.respostas.length} {item.respostas.length === 1 ? 'resposta' : 'respostas'}
                          {expandedThreads.has(item.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {expandedThreads.has(item.id) && (
                          <div className="thread-replies">
                            {item.respostas.map(reply => (
                              <div key={reply.id} className="thread-reply">
                                <div className="reply-header">
                                  <User size={10} />
                                  <span className="reply-author">{reply.autor}</span>
                                  <span className="reply-date">{new Date(reply.data).toLocaleDateString('pt-PT')}</span>
                                </div>
                                <p className="reply-text">{renderTextWithMentions(reply.texto)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reply Input */}
                    {replyingTo === item.id && (
                      <div className="review-reply-input">
                        <div className="mention-input-wrapper">
                          <textarea
                            ref={replyInputRef}
                            placeholder="Escreva a sua resposta... Use @ para mencionar"
                            value={replyText}
                            onChange={(e) => {
                              setReplyText(e.target.value)
                              handleMentionInput(e.target.value, 'reply', e.target.selectionStart)
                            }}
                            onKeyDown={(e) => {
                              if (showMentionSuggestions && activeMentionField === 'reply') {
                                if (e.key === 'Escape') {
                                  setShowMentionSuggestions(false)
                                } else if (e.key === 'Enter' && filteredMembers.length > 0) {
                                  e.preventDefault()
                                  insertMention(filteredMembers[0])
                                }
                              }
                            }}
                            rows={2}
                            autoFocus
                          />
                          {/* Mention Suggestions Dropdown for Reply */}
                          {showMentionSuggestions && activeMentionField === 'reply' && filteredMembers.length > 0 && (
                            <div className="mention-suggestions">
                              {filteredMembers.map(member => (
                                <div
                                  key={member.id}
                                  className="mention-suggestion-item"
                                  onClick={() => insertMention(member)}
                                >
                                  <div className="mention-avatar">
                                    {member.avatar_url ? (
                                      <img src={member.avatar_url} alt={member.nome} />
                                    ) : (
                                      <User size={16} />
                                    )}
                                  </div>
                                  <div className="mention-info">
                                    <span className="mention-name">{member.nome}</span>
                                    {member.cargo && <span className="mention-cargo">{member.cargo}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="reply-actions">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => { setReplyingTo(null); setReplyText(''); setShowMentionSuggestions(false) }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleAddReply(item.id)}
                            disabled={!replyText.trim()}
                          >
                            <Send size={12} />
                            Enviar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add New Comment */}
            <div className="review-add-comment">
              <div className="add-comment-header">
                <span>Adicionar Comentario na Pagina {currentPage}</span>
                <div className="add-comment-selects">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="review-status-select"
                  >
                    <option value="implementado">Implementado</option>
                    <option value="pendente">Pendente</option>
                    <option value="erro">Erro</option>
                    <option value="omissao">Omissao</option>
                  </select>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="review-priority-select"
                  >
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="normal">Normal</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>
              <div className="add-comment-input">
                <div className="mention-input-wrapper">
                  <textarea
                    ref={commentInputRef}
                    placeholder="Descreva a diferenca, erro ou omissao... Use @ para mencionar pessoas"
                    value={newComment}
                    onChange={(e) => {
                      setNewComment(e.target.value)
                      handleMentionInput(e.target.value, 'comment', e.target.selectionStart)
                    }}
                    onKeyDown={(e) => {
                      if (showMentionSuggestions && activeMentionField === 'comment') {
                        if (e.key === 'Escape') {
                          setShowMentionSuggestions(false)
                        } else if (e.key === 'Enter' && filteredMembers.length > 0) {
                          e.preventDefault()
                          insertMention(filteredMembers[0])
                        }
                      }
                    }}
                    rows={3}
                  />
                  {/* Mention Suggestions Dropdown */}
                  {showMentionSuggestions && activeMentionField === 'comment' && filteredMembers.length > 0 && (
                    <div className="mention-suggestions">
                      {filteredMembers.map(member => (
                        <div
                          key={member.id}
                          className="mention-suggestion-item"
                          onClick={() => insertMention(member)}
                        >
                          <div className="mention-avatar">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.nome} />
                            ) : (
                              <User size={16} />
                            )}
                          </div>
                          <div className="mention-info">
                            <span className="mention-name">{member.nome}</span>
                            {member.cargo && <span className="mention-cargo">{member.cargo}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="add-comment-actions">
                  <span className="mention-hint">
                    <AtSign size={12} /> Use @ para mencionar
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    <Send size={16} />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="version-history-panel">
            <div className="history-header">
              <h4><History size={16} /> Historico de Revisoes</h4>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="history-list">
              {revisionHistory.length === 0 ? (
                <div className="history-empty">
                  <p>Sem revisoes anteriores</p>
                </div>
              ) : (
                revisionHistory.map(rev => (
                  <div key={rev.id} className="history-item">
                    <div className="history-item-header">
                      <span className={`history-status ${rev.status}`}>
                        {rev.status === 'aprovado' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {rev.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                      </span>
                      <span className="history-date">
                        {new Date(rev.created_at).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                    <p className="history-user">{rev.user_name}</p>
                    <p className="history-notes">{rev.notas}</p>
                    {rev.estatisticas && (
                      <div className="history-stats">
                        <span>{rev.estatisticas.implementado} impl.</span>
                        <span>{rev.estatisticas.pendente} pend.</span>
                        <span>{rev.estatisticas.erro} erros</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Submit Modal */}
        {showSubmitModal && (
          <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Lock size={20} /> Submeter Revisao e Trancar Versao</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowSubmitModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="submit-summary">
                  <h4>Resumo da Revisao</h4>
                  <div className="submit-stats">
                    <div className="stat"><CheckCircle size={16} /> {stats.implementado} Implementado</div>
                    <div className="stat"><Clock size={16} /> {stats.pendente} Pendente</div>
                    <div className="stat"><XCircle size={16} /> {stats.erro} Erros</div>
                    <div className="stat"><AlertTriangle size={16} /> {stats.omissao} Omissoes</div>
                  </div>

                  {(stats.pendente > 0 || stats.erro > 0) && (
                    <div className="alert alert-warning">
                      <AlertTriangle size={16} />
                      <span>Existem {stats.pendente + stats.erro} items por resolver</span>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Notas da Revisao *</label>
                  <textarea
                    className="textarea"
                    placeholder="Descreva o estado desta revisao, decisoes tomadas, proximos passos..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowSubmitModal(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitReview}
                  disabled={submitting || !reviewNotes.trim()}
                >
                  {submitting ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
                  Submeter e Trancar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decision Modal (Approve / Request Changes) */}
        {showDecisionModal && (
          <div className="modal-overlay" onClick={() => { setShowDecisionModal(null); setDecisionNotes('') }}>
            <div className="modal decision-modal" onClick={e => e.stopPropagation()}>
              <div className={`modal-header ${showDecisionModal === 'approve' ? 'modal-header-success' : 'modal-header-warning'}`}>
                <h3>
                  {showDecisionModal === 'approve' ? (
                    <><ThumbsUp size={20} /> Aprovar Documento</>
                  ) : (
                    <><Edit3 size={20} /> Pedir Alteracoes</>
                  )}
                </h3>
                <button className="btn btn-ghost btn-icon" onClick={() => { setShowDecisionModal(null); setDecisionNotes('') }}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                {/* Stats Summary */}
                <div className="decision-summary">
                  <div className="decision-stats">
                    <div className="stat-row">
                      <span className="stat-icon success"><CheckCircle size={16} /></span>
                      <span>{stats.implementado} Implementado</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-icon warning"><Clock size={16} /></span>
                      <span>{stats.pendente} Pendente</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-icon error"><XCircle size={16} /></span>
                      <span>{stats.erro} Erros</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-icon info"><AlertTriangle size={16} /></span>
                      <span>{stats.omissao} Omissoes</span>
                    </div>
                  </div>

                  {showDecisionModal === 'approve' && (stats.pendente > 0 || stats.erro > 0) && (
                    <div className="alert alert-warning" style={{ marginTop: '16px' }}>
                      <AlertTriangle size={16} />
                      <span>Atencao: Existem {stats.pendente + stats.erro} items por resolver. Tem a certeza que deseja aprovar?</span>
                    </div>
                  )}

                  {showDecisionModal === 'changes' && (
                    <div className="alert alert-info" style={{ marginTop: '16px' }}>
                      <Edit3 size={16} />
                      <span>Descreva as alteracoes necessarias para que o documento seja aprovado.</span>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">
                    {showDecisionModal === 'approve' ? 'Notas de Aprovacao *' : 'Alteracoes Necessarias *'}
                  </label>
                  <textarea
                    className="textarea"
                    placeholder={showDecisionModal === 'approve'
                      ? 'Adicione comentarios sobre a aprovacao, condicoes ou observacoes...'
                      : 'Descreva detalhadamente as alteracoes que devem ser feitas...'}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    rows={5}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => { setShowDecisionModal(null); setDecisionNotes('') }}
                >
                  Cancelar
                </button>
                <button
                  className={`btn ${showDecisionModal === 'approve' ? 'btn-success' : 'btn-warning'}`}
                  onClick={() => handleDecision(showDecisionModal === 'approve' ? 'aprovado' : 'alteracoes')}
                  disabled={submitting || !decisionNotes.trim()}
                >
                  {submitting ? (
                    <Loader2 size={16} className="spin" />
                  ) : showDecisionModal === 'approve' ? (
                    <><ThumbsUp size={16} /> Confirmar Aprovacao</>
                  ) : (
                    <><Send size={16} /> Enviar Pedido</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
