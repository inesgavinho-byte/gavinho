import { useState, useRef, useCallback } from 'react'
import { Eye, Plus, FolderOpen } from 'lucide-react'
import ConfirmModal from '../ui/ConfirmModal'
import useDesignReviewData from './useDesignReviewData'
import useDrawingCanvas from './useDrawingCanvas'
import TabsBar from './TabsBar'
import DesignReviewToolbar from './DesignReviewToolbar'
import PdfViewer from './PdfViewer'
import CommentsPanel from './CommentsPanel'
import PageNavigation from './PageNavigation'
import UploadVersionModal from './UploadVersionModal'
import NewReviewModal from './NewReviewModal'

export default function DesignReview({ projeto, initialReviewId }) {
  const containerRef = useRef(null)

  // Data layer
  const data = useDesignReviewData({ projeto, initialReviewId })

  // UI state
  const [activeTool, setActiveTool] = useState('comment')
  const [activeTab, setActiveTab] = useState('todos')
  const [drawingColor, setDrawingColor] = useState('#EF4444')
  const [drawingThickness] = useState(2)
  const [scale, setScale] = useState(1)
  const [numPages, setNumPages] = useState(null)
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showNewReviewModal, setShowNewReviewModal] = useState(false)
  const [showReviewSelector, setShowReviewSelector] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  // Comment form state
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [newCommentPos, setNewCommentPos] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [newCommentCategoria, setNewCommentCategoria] = useState('geral')

  // Edit annotation state
  const [editingAnnotation, setEditingAnnotation] = useState(null)
  const [editText, setEditText] = useState('')
  const [editCategoria, setEditCategoria] = useState('geral')

  // New Review Form state
  const [newReviewName, setNewReviewName] = useState('')
  const [newReviewCodigo, setNewReviewCodigo] = useState('')
  const [newReviewFile, setNewReviewFile] = useState(null)

  // Drawing canvas
  const handleSaveDrawing = useCallback((drawingData) => {
    data.saveDrawing(drawingData, drawingColor, drawingThickness)
  }, [data.saveDrawing, drawingColor, drawingThickness])

  const canvas = useDrawingCanvas({
    drawings: data.drawings,
    activeTool,
    drawingColor,
    drawingThickness,
    scale,
    pdfDimensions,
    onSaveDrawing: handleSaveDrawing,
    onDeleteDrawing: data.deleteDrawing,
    onRestoreDrawing: data.restoreDrawing,
  })

  // Annotation handlers
  const handleAddAnnotation = async () => {
    const result = await data.addAnnotation({
      pos: newCommentPos,
      comment: newComment,
      categoria: newCommentCategoria
    })
    if (result) {
      setIsAddingComment(false)
      setNewCommentPos(null)
      setNewComment('')
    }
  }

  const handleStartEdit = (annotation) => {
    setEditingAnnotation(annotation)
    setEditText(annotation.comentario)
    setEditCategoria(annotation.categoria)
  }

  const handleSaveEdit = async () => {
    if (!editingAnnotation || !editText.trim()) return
    await data.editAnnotation(editingAnnotation.id, {
      comentario: editText,
      categoria: editCategoria
    })
    setEditingAnnotation(null)
    setEditText('')
  }

  const handleDeleteAnnotation = (annotation) => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Anotação',
      message: 'Tem certeza que deseja apagar esta anotação?',
      type: 'danger',
      onConfirm: async () => {
        await data.deleteAnnotation(annotation.id)
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleDeleteVersion = () => {
    if (!data.selectedVersion) return
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Versão',
      message: `Tem certeza que deseja eliminar a Versão ${data.selectedVersion.numero_versao}? Todas as anotações e desenhos desta versão serão apagados.`,
      type: 'danger',
      onConfirm: async () => {
        await data.deleteVersion()
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleDeleteReview = () => {
    if (!data.selectedReview) return
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Pacote de Desenhos',
      message: `Tem certeza que deseja eliminar "${data.selectedReview.nome}"? Todas as versões, anotações e ficheiros serão apagados permanentemente.`,
      type: 'danger',
      onConfirm: async () => {
        await data.deleteReview()
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleConfirmClearDrawings = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Desenhos',
      message: 'Apagar todos os desenhos desta página?',
      type: 'danger',
      onConfirm: async () => {
        await canvas.clearAllDrawings(data.drawings)
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleCreateReview = async () => {
    const result = await data.createReview({
      name: newReviewName,
      codigo: newReviewCodigo,
      file: newReviewFile
    })
    if (result) {
      setShowNewReviewModal(false)
      setNewReviewName('')
      setNewReviewCodigo('')
      setNewReviewFile(null)
    }
  }

  const handleUploadNewVersion = async (file) => {
    await data.uploadNewVersion(file)
    setShowUploadModal(false)
  }

  const fitToScreen = () => {
    if (containerRef.current && pdfDimensions.width > 0 && pdfDimensions.height > 0) {
      const containerWidth = containerRef.current.clientWidth - 48
      const containerHeight = containerRef.current.clientHeight - 48
      const scaleX = containerWidth / pdfDimensions.width
      const scaleY = containerHeight / pdfDimensions.height
      const newScale = Math.min(scaleX, scaleY, 2)
      setScale(Math.max(0.1, newScale))
    }
  }

  const allPageAnnotations = data.annotations.filter(a => a.pagina === data.currentPage)

  // Loading state
  if (data.loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '16px', color: 'var(--brown-light)' }}>A carregar...</p>
      </div>
    )
  }

  // No reviews yet
  if (data.reviews.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', minHeight: '600px' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
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
        </div>

        {showNewReviewModal && (
          <NewReviewModal
            onClose={() => { setShowNewReviewModal(false); data.setCreateError(null) }}
            onSubmit={handleCreateReview}
            name={newReviewName}
            setName={setNewReviewName}
            codigo={newReviewCodigo}
            setCodigo={setNewReviewCodigo}
            file={newReviewFile}
            setFile={setNewReviewFile}
            loading={data.createLoading}
            error={data.createError}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', minHeight: '600px', overflow: 'hidden' }}>
      {/* Tabs Bar */}
      <TabsBar
        openTabs={data.openTabs}
        activeTabId={data.activeTabId}
        reviews={data.reviews}
        showReviewSelector={showReviewSelector}
        setShowReviewSelector={setShowReviewSelector}
        onSwitchTab={data.switchTab}
        onCloseTab={data.closeTab}
        onAddTab={data.addTab}
        onNewReview={() => setShowNewReviewModal(true)}
      />

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* No tabs open */}
        {data.openTabs.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F5F5F0',
            padding: '48px'
          }}>
            <FolderOpen size={64} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '24px' }} />
            <h3 style={{ color: 'var(--brown)', marginBottom: '8px', fontSize: '18px' }}>
              Nenhum pacote de desenhos aberto
            </h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
              Selecione um pacote de desenhos existente ou crie um novo para iniciar a revisão.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {data.reviews.length > 0 && (
                <button
                  onClick={() => setShowReviewSelector(true)}
                  className="btn btn-secondary"
                >
                  <FolderOpen size={16} style={{ marginRight: '8px' }} />
                  Abrir Existente
                </button>
              )}
              <button
                onClick={() => setShowNewReviewModal(true)}
                className="btn btn-primary"
              >
                <Plus size={16} style={{ marginRight: '8px' }} />
                Novo Pacote
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Main PDF Viewer Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F5F5F0', minWidth: 0, overflow: 'hidden' }}>
              {/* Toolbar */}
              <DesignReviewToolbar
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                drawingColor={drawingColor}
                setDrawingColor={setDrawingColor}
                undoStack={canvas.undoStack}
                redoStack={canvas.redoStack}
                onUndo={canvas.handleUndo}
                onRedo={canvas.handleRedo}
                onClearDrawings={canvas.clearAllDrawings}
                drawingsCount={data.drawings.length}
                scale={scale}
                setScale={setScale}
                onFitToScreen={fitToScreen}
                versions={data.versions}
                selectedVersion={data.selectedVersion}
                setSelectedVersion={data.setSelectedVersion}
                selectedReview={data.selectedReview}
                onDeleteVersion={handleDeleteVersion}
                onRefresh={() => data.loadVersions()}
                onConfirmClear={handleConfirmClearDrawings}
              />

              {/* PDF Content Area */}
              <PdfViewer
                ref={containerRef}
                selectedVersion={data.selectedVersion}
                currentPage={data.currentPage}
                scale={scale}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                drawingColor={drawingColor}
                setDrawingColor={setDrawingColor}
                pdfDimensions={pdfDimensions}
                setPdfDimensions={setPdfDimensions}
                setNumPages={setNumPages}
                canvasRef={canvas.canvasRef}
                onEraserClick={canvas.handleEraserClick}
                onCanvasPointerDown={canvas.handleCanvasPointerDown}
                onCanvasPointerMove={canvas.handleCanvasPointerMove}
                onCanvasPointerUp={canvas.handleCanvasPointerUp}
                allPageAnnotations={allPageAnnotations}
                selectedAnnotation={data.selectedAnnotation}
                setSelectedAnnotation={data.setSelectedAnnotation}
                isAddingComment={isAddingComment}
                setIsAddingComment={setIsAddingComment}
                newCommentPos={newCommentPos}
                setNewCommentPos={setNewCommentPos}
                newComment={newComment}
                setNewComment={setNewComment}
                newCommentCategoria={newCommentCategoria}
                setNewCommentCategoria={setNewCommentCategoria}
                onAddAnnotation={handleAddAnnotation}
                onSetScale={setScale}
              />

              {/* Page Navigation */}
              <PageNavigation
                selectedReview={data.selectedReview}
                currentPage={data.currentPage}
                numPages={numPages}
                setCurrentPage={data.setCurrentPage}
                onDeleteReview={handleDeleteReview}
                onUploadNewVersion={() => setShowUploadModal(true)}
              />
            </div>

            {/* Comments Panel */}
            <CommentsPanel
              annotations={data.annotations}
              currentPage={data.currentPage}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedAnnotation={data.selectedAnnotation}
              setSelectedAnnotation={data.setSelectedAnnotation}
              profile={data.profile}
              isAddingComment={isAddingComment}
              newComment={newComment}
              setNewComment={setNewComment}
              newCommentCategoria={newCommentCategoria}
              setNewCommentCategoria={setNewCommentCategoria}
              setIsAddingComment={setIsAddingComment}
              setNewCommentPos={setNewCommentPos}
              onAddAnnotation={handleAddAnnotation}
              activeTool={activeTool}
              onResolve={data.resolveAnnotation}
              onReopen={data.reopenAnnotation}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => { setEditingAnnotation(null); setEditText('') }}
              onDelete={handleDeleteAnnotation}
              editingAnnotation={editingAnnotation}
              editText={editText}
              setEditText={setEditText}
              editCategoria={editCategoria}
              setEditCategoria={setEditCategoria}
            />
          </>
        )}
      </div>

      {/* Upload New Version Modal */}
      {showUploadModal && (
        <UploadVersionModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadNewVersion}
        />
      )}

      {/* New Review Modal */}
      {showNewReviewModal && (
        <NewReviewModal
          onClose={() => { setShowNewReviewModal(false); data.setCreateError(null) }}
          onSubmit={handleCreateReview}
          name={newReviewName}
          setName={setNewReviewName}
          codigo={newReviewCodigo}
          setCodigo={setNewReviewCodigo}
          file={newReviewFile}
          setFile={setNewReviewFile}
          loading={data.createLoading}
          error={data.createError}
        />
      )}

      {/* Click outside to close review selector */}
      {showReviewSelector && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowReviewSelector(false)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}
