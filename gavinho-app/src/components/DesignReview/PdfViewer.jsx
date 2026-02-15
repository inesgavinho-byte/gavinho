import { useState, useRef, useEffect, forwardRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  MessageCircle, Pencil, Square, ArrowUpRight, Minus,
  Eye, Circle, Eraser, Check, Plus, X, Send,
  AlertTriangle
} from 'lucide-react'
import { DRAWING_COLORS, DRAWING_TOOLS, CATEGORIAS, getCategoriaColor } from './constants'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const FLOATING_TOOLS = [
  { id: 'select', icon: Eye, label: 'Selecionar' },
  { id: 'comment', icon: MessageCircle, label: 'Comentário' },
  { id: 'pencil', icon: Pencil, label: 'Desenho livre' },
  { id: 'rectangle', icon: Square, label: 'Retângulo' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Seta' },
  { id: 'circle', icon: Circle, label: 'Círculo' },
  { id: 'line', icon: Minus, label: 'Linha' },
  { id: 'eraser', icon: Eraser, label: 'Borracha' }
]

const PdfViewer = forwardRef(function PdfViewer({
  selectedVersion,
  currentPage,
  scale,
  activeTool,
  setActiveTool,
  drawingColor,
  setDrawingColor,
  pdfDimensions,
  setPdfDimensions,
  setNumPages,
  // Canvas handlers
  canvasRef,
  onEraserClick,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  // Annotations
  allPageAnnotations,
  selectedAnnotation,
  setSelectedAnnotation,
  // New comment
  isAddingComment,
  setIsAddingComment,
  newCommentPos,
  setNewCommentPos,
  newComment,
  setNewComment,
  newCommentCategoria,
  setNewCommentCategoria,
  onAddAnnotation,
  // Zoom
  onSetScale,
}, containerRef) {
  const pdfContainerRef = useRef(null)
  const [pdfError, setPdfError] = useState(null)

  // Prevent browser zoom on Ctrl+scroll
  useEffect(() => {
    const el = containerRef?.current
    if (!el) return
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const zoomFactor = 1 - (e.deltaY * 0.002)
        onSetScale(prev => Math.min(3, Math.max(0.1, prev * zoomFactor)))
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [containerRef, onSetScale])

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

  const isDrawingTool = DRAWING_TOOLS.includes(activeTool)

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* Floating Toolbar */}
      {selectedVersion?.file_url && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '8px',
          background: 'var(--white)',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {FLOATING_TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: 'none',
                background: activeTool === tool.id ? 'var(--brown)' : 'transparent',
                color: activeTool === tool.id ? 'var(--white)' : 'var(--brown)',
                cursor: 'pointer'
              }}
            >
              <tool.icon size={20} />
            </button>
          ))}

          <div style={{ height: '1px', background: 'var(--stone)', margin: '4px 0' }} />

          {isDrawingTool && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {DRAWING_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setDrawingColor(color)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: drawingColor === color ? '2px solid var(--brown)' : '2px solid transparent',
                    background: color,
                    cursor: 'pointer',
                    padding: 0,
                    margin: '0 auto'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scrollable PDF Area */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'auto',
          padding: '24px',
          paddingLeft: '80px',
          textAlign: 'center',
        }}
      >
        {selectedVersion?.file_url ? (
          <div
            ref={pdfContainerRef}
            onClick={handlePdfClick}
            style={{
              position: 'relative',
              display: 'inline-block',
              textAlign: 'left',
              cursor: activeTool === 'comment' ? 'crosshair' :
                      isDrawingTool ? 'crosshair' : 'default',
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
                onRenderSuccess={(page) => {
                  setPdfDimensions({
                    width: page.width / scale,
                    height: page.height / scale
                  })
                }}
              />
            </Document>

            {/* Drawing Canvas Overlay */}
            {pdfDimensions.width > 0 && (
              <canvas
                ref={canvasRef}
                onPointerDown={(e) => {
                  if (activeTool === 'eraser') {
                    onEraserClick(e)
                  } else {
                    onCanvasPointerDown(e)
                  }
                }}
                onPointerMove={onCanvasPointerMove}
                onPointerUp={onCanvasPointerUp}
                onPointerLeave={onCanvasPointerUp}
                onPointerCancel={onCanvasPointerUp}
                onTouchStart={(e) => e.preventDefault()}
                onTouchMove={(e) => e.preventDefault()}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: pdfDimensions.width * scale,
                  height: pdfDimensions.height * scale,
                  pointerEvents: [...DRAWING_TOOLS, 'eraser'].includes(activeTool) ? 'auto' : 'none',
                  cursor: 'crosshair',
                  touchAction: 'none',
                  zIndex: 5
                }}
              />
            )}

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
                }}
              >
                {annotation.status === 'resolvido' ? (
                  <Check size={14} />
                ) : (
                  index + 1
                )}
              </div>
            ))}

            {/* New Comment Marker + Floating Input */}
            {isAddingComment && newCommentPos && (
              <>
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
                {/* Floating Comment Input Box */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.min(newCommentPos.x + 3, 70)}%`,
                    top: `${newCommentPos.y}%`,
                    transform: 'translateY(-50%)',
                    width: '280px',
                    padding: '12px',
                    background: 'var(--white)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    zIndex: 25
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escreva o seu comentário..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--stone)',
                      fontSize: '13px',
                      resize: 'none',
                      minHeight: '70px',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={newCommentCategoria}
                      onChange={(e) => setNewCommentCategoria(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px',
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
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </>
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
    </div>
  )
})

export default PdfViewer
