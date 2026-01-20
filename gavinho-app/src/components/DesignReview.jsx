import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  MessageCircle,
  Pencil,
  Square,
  ArrowUpRight,
  Triangle,
  Layers,
  BarChart3,
  Minus,
  Plus,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertTriangle,
  Check,
  X,
  Clock,
  Send,
  MoreVertical,
  Eye,
  Filter,
  Trash2
} from 'lucide-react'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Categorias de anotacao
const CATEGORIAS = [
  { id: 'geral', label: 'Geral', color: '#6B7280' },
  { id: 'erro', label: 'Erro', color: '#EF4444' },
  { id: 'duvida', label: 'Duvida', color: '#F59E0B' },
  { id: 'sugestao', label: 'Sugestao', color: '#3B82F6' },
  { id: 'cota_falta', label: 'Cota em falta', color: '#8B5CF6' },
  { id: 'material', label: 'Material', color: '#10B981' },
  { id: 'dimensao', label: 'Dimensao', color: '#EC4899' },
  { id: 'alinhamento', label: 'Alinhamento', color: '#06B6D4' }
]

const getCategoriaColor = (cat) => {
  return CATEGORIAS.find(c => c.id === cat)?.color || '#6B7280'
}

const getStatusColor = (status) => {
  switch (status) {
    case 'aberto': return '#F59E0B'
    case 'em_discussao': return '#3B82F6'
    case 'resolvido': return '#10B981'
    default: return '#6B7280'
  }
}

export default function DesignReview({ projeto }) {
  const { user, profile } = useAuth()
  const containerRef = useRef(null)
  const pdfContainerRef = useRef(null)

  // Reviews e versoes
  const [reviews, setReviews] = useState([])
  const [selectedReview, setSelectedReview] = useState(null)
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)

  // PDF State
  const [numPages, setNumPages] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [pdfError, setPdfError] = useState(null)

  // Annotations
  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotation, setSelectedAnnotation] = useState(null)
  const [replies, setReplies] = useState([])

  // UI State
  const [activeTab, setActiveTab] = useState('todos') // todos, abertos, resolvidos, meus
  const [activeTool, setActiveTool] = useState('comment') // comment, pencil, rectangle, arrow, etc.
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [newCommentPos, setNewCommentPos] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [newCommentCategoria, setNewCommentCategoria] = useState('geral')
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showNewReviewModal, setShowNewReviewModal] = useState(false)

  // New Review Form
  const [newReviewName, setNewReviewName] = useState('')
  const [newReviewCodigo, setNewReviewCodigo] = useState('')
  const [newReviewFile, setNewReviewFile] = useState(null)

  // Load reviews
  useEffect(() => {
    if (projeto?.id) {
      loadReviews()
    }
  }, [projeto?.id])

  // Load versions when review selected
  useEffect(() => {
    if (selectedReview) {
      loadVersions()
    }
  }, [selectedReview])

  // Load annotations when version selected
  useEffect(() => {
    if (selectedVersion) {
      loadAnnotations()
    }
  }, [selectedVersion])

  // Load replies when annotation selected
  useEffect(() => {
    if (selectedAnnotation) {
      loadReplies()
    }
  }, [selectedAnnotation])

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('design_reviews')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setReviews(data || [])

      if (data && data.length > 0) {
        setSelectedReview(data[0])
      }
    } catch (err) {
      console.error('Error loading reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('design_review_versions')
        .select('*')
        .eq('review_id', selectedReview.id)
        .order('numero_versao', { ascending: false })

      if (error) throw error
      setVersions(data || [])

      if (data && data.length > 0) {
        setSelectedVersion(data[0])
      }
    } catch (err) {
      console.error('Error loading versions:', err)
    }
  }

  const loadAnnotations = async () => {
    try {
      const { data, error } = await supabase
        .from('design_review_annotations')
        .select('*')
        .eq('version_id', selectedVersion.id)
        .order('criado_em', { ascending: true })

      if (error) throw error
      setAnnotations(data || [])
    } catch (err) {
      console.error('Error loading annotations:', err)
    }
  }

  const loadReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('design_review_replies')
        .select('*')
        .eq('annotation_id', selectedAnnotation.id)
        .order('criado_em', { ascending: true })

      if (error) throw error
      setReplies(data || [])
    } catch (err) {
      console.error('Error loading replies:', err)
    }
  }

  const handlePdfClick = (e) => {
    if (activeTool !== 'comment' || !pdfContainerRef.current) return

    const rect = pdfContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setNewCommentPos({ x, y })
    setIsAddingComment(true)
    setNewComment('')
    setNewCommentCategoria('geral')
  }

  const handleAddAnnotation = async () => {
    if (!newComment.trim() || !newCommentPos || !selectedVersion) return

    try {
      const { data, error } = await supabase
        .from('design_review_annotations')
        .insert({
          version_id: selectedVersion.id,
          pagina: currentPage,
          pos_x: newCommentPos.x,
          pos_y: newCommentPos.y,
          comentario: newComment.trim(),
          categoria: newCommentCategoria,
          autor_id: user?.id,
          autor_nome: profile?.nome || user?.email || 'Utilizador'
        })
        .select()
        .single()

      if (error) throw error

      setAnnotations(prev => [...prev, data])
      setIsAddingComment(false)
      setNewCommentPos(null)
      setNewComment('')
    } catch (err) {
      console.error('Error adding annotation:', err)
    }
  }

  const handleResolveAnnotation = async (annotation) => {
    try {
      const { error } = await supabase
        .from('design_review_annotations')
        .update({
          status: 'resolvido',
          resolvido_por: user?.id,
          resolvido_por_nome: profile?.nome || user?.email,
          resolvido_em: new Date().toISOString()
        })
        .eq('id', annotation.id)

      if (error) throw error

      setAnnotations(prev =>
        prev.map(a => a.id === annotation.id ? { ...a, status: 'resolvido' } : a)
      )
    } catch (err) {
      console.error('Error resolving annotation:', err)
    }
  }

  const handleCreateReview = async () => {
    if (!newReviewName.trim() || !newReviewFile) return

    try {
      // Upload file to storage
      const fileName = `design-reviews/${projeto.id}/${Date.now()}_${newReviewFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, newReviewFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(fileName)

      // Create review
      const { data: reviewData, error: reviewError } = await supabase
        .from('design_reviews')
        .insert({
          projeto_id: projeto.id,
          nome: newReviewName.trim(),
          codigo_documento: newReviewCodigo.trim() || null,
          criado_por: user?.id,
          criado_por_nome: profile?.nome || user?.email
        })
        .select()
        .single()

      if (reviewError) throw reviewError

      // Create first version
      const { error: versionError } = await supabase
        .from('design_review_versions')
        .insert({
          review_id: reviewData.id,
          numero_versao: 1,
          file_url: urlData.publicUrl,
          file_name: newReviewFile.name,
          file_size: newReviewFile.size,
          uploaded_by: user?.id,
          uploaded_by_nome: profile?.nome || user?.email
        })

      if (versionError) throw versionError

      // Reload
      await loadReviews()
      setShowNewReviewModal(false)
      setNewReviewName('')
      setNewReviewCodigo('')
      setNewReviewFile(null)
    } catch (err) {
      console.error('Error creating review:', err)
    }
  }

  const handleUploadNewVersion = async (file) => {
    if (!file || !selectedReview) return

    try {
      // Upload file
      const fileName = `design-reviews/${projeto.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(fileName)

      // Create new version
      const newVersionNum = (versions[0]?.numero_versao || 0) + 1
      const { error: versionError } = await supabase
        .from('design_review_versions')
        .insert({
          review_id: selectedReview.id,
          numero_versao: newVersionNum,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user?.id,
          uploaded_by_nome: profile?.nome || user?.email
        })

      if (versionError) throw versionError

      await loadVersions()
      setShowUploadModal(false)
    } catch (err) {
      console.error('Error uploading version:', err)
    }
  }

  // Filter annotations by tab
  const filteredAnnotations = annotations.filter(a => {
    if (a.pagina !== currentPage) return false
    switch (activeTab) {
      case 'abertos': return a.status !== 'resolvido'
      case 'resolvidos': return a.status === 'resolvido'
      case 'meus': return a.autor_id === user?.id
      default: return true
    }
  })

  const allPageAnnotations = annotations.filter(a => a.pagina === currentPage)

  // Count stats
  const openCount = annotations.filter(a => a.status !== 'resolvido').length
  const resolvedCount = annotations.filter(a => a.status === 'resolvido').length

  // Repeated issues (same categoria appears 3+ times)
  const categoryCounts = annotations.reduce((acc, a) => {
    acc[a.categoria] = (acc[a.categoria] || 0) + 1
    return acc
  }, {})
  const repeatedIssues = Object.entries(categoryCounts)
    .filter(([_, count]) => count >= 3)
    .map(([cat, count]) => ({ categoria: cat, count }))

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '16px', color: 'var(--brown-light)' }}>A carregar...</p>
      </div>
    )
  }

  // No reviews yet
  if (reviews.length === 0) {
    return (
      <div style={{
        padding: '48px',
        background: 'var(--cream)',
        borderRadius: '12px',
        textAlign: 'center',
        color: 'var(--brown-light)'
      }}>
        <Eye size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
        <h4 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Design Review</h4>
        <p style={{ marginBottom: '24px' }}>Sistema de revisao de desenhos tecnicos com comentarios e aprovacoes.</p>
        <button
          className="btn btn-primary"
          onClick={() => setShowNewReviewModal(true)}
        >
          <Plus size={16} style={{ marginRight: '8px' }} />
          Iniciar Design Review
        </button>

        {/* New Review Modal */}
        {showNewReviewModal && (
          <NewReviewModal
            onClose={() => setShowNewReviewModal(false)}
            onSubmit={handleCreateReview}
            name={newReviewName}
            setName={setNewReviewName}
            codigo={newReviewCodigo}
            setCodigo={setNewReviewCodigo}
            file={newReviewFile}
            setFile={setNewReviewFile}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 300px)', minHeight: '600px' }}>
      {/* Main PDF Viewer Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F5F5F0' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--stone)',
          background: 'var(--white)'
        }}>
          {/* Drawing Tools */}
          <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
            {[
              { id: 'select', icon: Eye, label: 'Selecionar' },
              { id: 'comment', icon: MessageCircle, label: 'Comentario', active: true },
              { id: 'pencil', icon: Pencil, label: 'Desenhar', disabled: true },
              { id: 'rectangle', icon: Square, label: 'Retangulo', disabled: true },
              { id: 'arrow', icon: ArrowUpRight, label: 'Seta', disabled: true },
              { id: 'shape', icon: Triangle, label: 'Forma', disabled: true },
              { id: 'layers', icon: Layers, label: 'Camadas', disabled: true },
              { id: 'measure', icon: BarChart3, label: 'Medir', disabled: true }
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => !tool.disabled && setActiveTool(tool.id)}
                disabled={tool.disabled}
                title={tool.label}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTool === tool.id ? 'var(--brown)' : 'transparent',
                  color: activeTool === tool.id ? 'var(--white)' : tool.disabled ? 'var(--stone-dark)' : 'var(--brown)',
                  cursor: tool.disabled ? 'not-allowed' : 'pointer',
                  opacity: tool.disabled ? 0.5 : 1
                }}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--stone)' }} />

          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: '1px solid var(--stone)',
                background: 'var(--white)',
                cursor: 'pointer'
              }}
            >
              <Minus size={16} />
            </button>
            <span style={{ minWidth: '60px', textAlign: 'center', fontSize: '13px', fontWeight: 500 }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(3, s + 0.25))}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: '1px solid var(--stone)',
                background: 'var(--white)',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          <div style={{ flex: 1 }} />

          {/* Version Selector */}
          <select
            value={selectedVersion?.id || ''}
            onChange={(e) => {
              const v = versions.find(v => v.id === e.target.value)
              setSelectedVersion(v)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--stone)',
              background: 'var(--white)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {versions.map(v => (
              <option key={v.id} value={v.id}>
                Versao {v.numero_versao} {v.numero_versao === selectedReview?.versao_atual ? '(atual)' : ''}
              </option>
            ))}
          </select>

          {/* Actions */}
          <button
            onClick={() => loadVersions()}
            title="Atualizar"
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: '1px solid var(--stone)',
              background: 'var(--white)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
          </button>
          <a
            href={selectedVersion?.file_url}
            download
            title="Download"
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: '1px solid var(--stone)',
              background: 'var(--white)',
              cursor: 'pointer',
              color: 'inherit',
              textDecoration: 'none'
            }}
          >
            <Download size={16} />
          </a>
        </div>

        {/* PDF Content */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '24px'
          }}
        >
          {selectedVersion?.file_url ? (
            <div
              ref={pdfContainerRef}
              onClick={handlePdfClick}
              style={{
                position: 'relative',
                cursor: activeTool === 'comment' ? 'crosshair' : 'default',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
            >
              <Document
                file={selectedVersion.file_url}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                onLoadError={(error) => setPdfError(error.message)}
                loading={
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <div className="loading-spinner" />
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>

              {/* Annotation Markers */}
              {allPageAnnotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedAnnotation(annotation)
                  }}
                  style={{
                    position: 'absolute',
                    left: `${annotation.pos_x}%`,
                    top: `${annotation.pos_y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: annotation.status === 'resolvido'
                      ? '#10B981'
                      : getCategoriaColor(annotation.categoria),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: selectedAnnotation?.id === annotation.id
                      ? '0 0 0 3px rgba(0,0,0,0.3)'
                      : '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: selectedAnnotation?.id === annotation.id ? 10 : 1,
                    transition: 'transform 0.15s',
                    ':hover': { transform: 'translate(-50%, -50%) scale(1.1)' }
                  }}
                >
                  {annotation.status === 'resolvido' ? (
                    <Check size={14} />
                  ) : (
                    index + 1
                  )}
                </div>
              ))}

              {/* New Comment Marker */}
              {isAddingComment && newCommentPos && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${newCommentPos.x}%`,
                    top: `${newCommentPos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: getCategoriaColor(newCommentCategoria),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 3px rgba(0,0,0,0.3)',
                    zIndex: 20
                  }}
                >
                  <Plus size={14} />
                </div>
              )}

              {pdfError && (
                <div style={{
                  padding: '48px',
                  textAlign: 'center',
                  color: 'var(--error)'
                }}>
                  <AlertTriangle size={48} style={{ marginBottom: '16px' }} />
                  <p>Erro ao carregar PDF: {pdfError}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--brown-light)' }}>
              <Eye size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Nenhuma versao disponivel</p>
            </div>
          )}
        </div>

        {/* Page Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '12px',
          borderTop: '1px solid var(--stone)',
          background: 'var(--white)'
        }}>
          {selectedReview && (
            <span style={{ fontSize: '13px', color: 'var(--brown-light)', marginRight: 'auto' }}>
              {selectedReview.codigo_documento} - {selectedReview.nome}
            </span>
          )}
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid var(--stone)',
              background: 'var(--white)',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage <= 1 ? 0.5 : 1
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '13px', minWidth: '100px', textAlign: 'center' }}>
            Folha {currentPage} de {numPages || '?'}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(numPages || 1, p + 1))}
            disabled={currentPage >= (numPages || 1)}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid var(--stone)',
              background: 'var(--white)',
              cursor: currentPage >= (numPages || 1) ? 'not-allowed' : 'pointer',
              opacity: currentPage >= (numPages || 1) ? 0.5 : 1
            }}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-secondary"
            style={{ marginLeft: 'auto', padding: '8px 12px' }}
          >
            <Upload size={14} style={{ marginRight: '6px' }} />
            Nova Versao
          </button>
        </div>
      </div>

      {/* Comments Panel */}
      <div style={{
        width: '360px',
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
                        gap: '6px',
                        marginBottom: '4px'
                      }}>
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
                        marginTop: '8px'
                      }}>
                        <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                          {new Date(annotation.criado_em).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {annotation.status !== 'resolvido' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleResolveAnnotation(annotation)
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
                        )}
                      </div>
                    </div>
                  </div>
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
                  onClick={handleAddAnnotation}
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
              onClick={() => {
                if (activeTool === 'comment') {
                  // Prompt user to click on PDF
                }
              }}
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

      {/* Upload New Version Modal */}
      {showUploadModal && (
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
            background: 'var(--white)',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--brown)' }}>
              Nova Versao
            </h3>
            <div
              style={{
                border: '2px dashed var(--stone)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('version-upload').click()}
            >
              <Upload size={32} style={{ color: 'var(--brown-light)', marginBottom: '8px' }} />
              <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>
                Clique ou arraste um ficheiro PDF
              </p>
              <input
                id="version-upload"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleUploadNewVersion(e.target.files[0])
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowUploadModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Review Modal */}
      {showNewReviewModal && (
        <NewReviewModal
          onClose={() => setShowNewReviewModal(false)}
          onSubmit={handleCreateReview}
          name={newReviewName}
          setName={setNewReviewName}
          codigo={newReviewCodigo}
          setCodigo={setNewReviewCodigo}
          file={newReviewFile}
          setFile={setNewReviewFile}
        />
      )}
    </div>
  )
}

// New Review Modal Component
function NewReviewModal({ onClose, onSubmit, name, setName, codigo, setCodigo, file, setFile }) {
  return (
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
        background: 'var(--white)',
        borderRadius: '16px',
        padding: '24px',
        width: '450px',
        maxWidth: '90vw'
      }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--brown)' }}>
          Novo Design Review
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>
            Nome do Documento *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Planta Piso 0"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--stone)',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>
            Codigo do Documento
          </label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ex: 01.01.01"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--stone)',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>
            Ficheiro PDF *
          </label>
          <div
            style={{
              border: file ? '1px solid var(--stone)' : '2px dashed var(--stone)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? 'var(--cream)' : 'transparent'
            }}
            onClick={() => document.getElementById('new-review-upload').click()}
          >
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Eye size={20} style={{ color: 'var(--brown)' }} />
                <span style={{ color: 'var(--brown)', fontSize: '13px' }}>{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={16} style={{ color: 'var(--brown-light)' }} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} style={{ color: 'var(--brown-light)', marginBottom: '8px' }} />
                <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>
                  Clique para selecionar um PDF
                </p>
              </>
            )}
            <input
              id="new-review-upload"
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFile(e.target.files[0])
                }
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={!name.trim() || !file}
          >
            Criar Review
          </button>
        </div>
      </div>
    </div>
  )
}
