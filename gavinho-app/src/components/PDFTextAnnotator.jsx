import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import {
  X, Type, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Trash2, Save, Download, Loader2, Move, Undo, Redo,
  Palette, ALargeSmall
} from 'lucide-react'

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]
const COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#5F5C59', '#B88A8A', '#7A9E7A', '#8A9EB8',
  '#C9A882', '#C3BAAF', '#4A4845', '#1a1a2e'
]

export default function PDFTextAnnotator({
  pdfUrl,
  onClose,
  onSave,
  documentName = 'documento'
}) {
  // PDF State
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Annotations State
  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotation, setSelectedAnnotation] = useState(null)
  const [isAddingText, setIsAddingText] = useState(false)
  const [editingText, setEditingText] = useState(null)

  // Tool Settings
  const [fontSize, setFontSize] = useState(14)
  const [textColor, setTextColor] = useState('#000000')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showSizePicker, setShowSizePicker] = useState(false)

  // History for undo/redo
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Saving state
  const [saving, setSaving] = useState(false)

  // Refs
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const containerRef = useRef(null)
  const textInputRef = useRef(null)

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true)
        setError(null)

        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise

        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        setCurrentPage(1)
      } catch (err) {
        console.error('Erro ao carregar PDF:', err)
        setError('Erro ao carregar o PDF. Verifique se o ficheiro é válido.')
      } finally {
        setLoading(false)
      }
    }

    if (pdfUrl) {
      loadPdf()
    }
  }, [pdfUrl])

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return

      try {
        const page = await pdfDoc.getPage(currentPage)
        const viewport = page.getViewport({ scale })

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        canvas.height = viewport.height
        canvas.width = viewport.width

        // Also resize overlay
        if (overlayRef.current) {
          overlayRef.current.style.width = `${viewport.width}px`
          overlayRef.current.style.height = `${viewport.height}px`
        }

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise
      } catch (err) {
        console.error('Erro ao renderizar página:', err)
      }
    }

    renderPage()
  }, [pdfDoc, currentPage, scale])

  // Save to history
  const saveToHistory = useCallback((newAnnotations) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newAnnotations])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations([...history[historyIndex - 1]])
    }
  }, [history, historyIndex])

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations([...history[historyIndex + 1]])
    }
  }, [history, historyIndex])

  // Handle canvas click to add text
  const handleCanvasClick = (e) => {
    if (!isAddingText) return

    const rect = overlayRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Create new text annotation
    const newAnnotation = {
      id: Date.now(),
      page: currentPage,
      x,
      y,
      text: '',
      fontSize,
      color: textColor,
      scale
    }

    setEditingText(newAnnotation)
    setIsAddingText(false)

    // Focus will be set after render
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus()
      }
    }, 50)
  }

  // Handle text input change
  const handleTextChange = (e) => {
    if (!editingText) return
    setEditingText({ ...editingText, text: e.target.value })
  }

  // Handle text input blur or enter
  const handleTextSubmit = () => {
    if (!editingText) return

    if (editingText.text.trim()) {
      const newAnnotations = [...annotations, editingText]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
    }

    setEditingText(null)
  }

  // Handle text input keydown
  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    } else if (e.key === 'Escape') {
      setEditingText(null)
    }
  }

  // Select annotation
  const handleSelectAnnotation = (annotation, e) => {
    e.stopPropagation()
    setSelectedAnnotation(annotation.id)
  }

  // Delete selected annotation
  const handleDeleteAnnotation = () => {
    if (!selectedAnnotation) return

    const newAnnotations = annotations.filter(a => a.id !== selectedAnnotation)
    setAnnotations(newAnnotations)
    saveToHistory(newAnnotations)
    setSelectedAnnotation(null)
  }

  // Handle annotation drag
  const handleAnnotationDrag = (annotation, e) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = overlayRef.current.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const origX = annotation.x
    const origY = annotation.y

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY

      const newX = Math.max(0, Math.min(rect.width - 50, origX + dx))
      const newY = Math.max(20, Math.min(rect.height - 20, origY + dy))

      setAnnotations(prev => prev.map(a =>
        a.id === annotation.id ? { ...a, x: newX, y: newY } : a
      ))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      saveToHistory(annotations)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Navigation
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  // Zoom
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

  // Export/Save annotated PDF (generates canvas with annotations)
  const handleExport = async () => {
    setSaving(true)

    try {
      // Create a canvas with PDF + annotations
      const exportCanvas = document.createElement('canvas')
      const ctx = exportCanvas.getContext('2d')

      // Copy PDF canvas
      const pdfCanvas = canvasRef.current
      exportCanvas.width = pdfCanvas.width
      exportCanvas.height = pdfCanvas.height
      ctx.drawImage(pdfCanvas, 0, 0)

      // Draw annotations for current page
      const pageAnnotations = annotations.filter(a => a.page === currentPage)
      pageAnnotations.forEach(annotation => {
        // Adjust position based on scale
        const adjustedX = annotation.x * (scale / annotation.scale)
        const adjustedY = annotation.y * (scale / annotation.scale)
        const adjustedFontSize = annotation.fontSize * (scale / annotation.scale)

        ctx.font = `${adjustedFontSize}px Inter, sans-serif`
        ctx.fillStyle = annotation.color
        ctx.fillText(annotation.text, adjustedX, adjustedY)
      })

      // Download as PNG
      const link = document.createElement('a')
      link.download = `${documentName}_anotado_pag${currentPage}.png`
      link.href = exportCanvas.toDataURL('image/png')
      link.click()

      // If onSave callback provided, call it with annotations data
      if (onSave) {
        await onSave(annotations)
      }
    } catch (err) {
      console.error('Erro ao exportar:', err)
      alert('Erro ao exportar o documento')
    } finally {
      setSaving(false)
    }
  }

  // Get annotations for current page
  const currentPageAnnotations = annotations.filter(a => a.page === currentPage)

  if (loading) {
    return (
      <div className="pdf-annotator-overlay">
        <div className="pdf-annotator-loading">
          <Loader2 size={32} className="spin" />
          <p>A carregar PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pdf-annotator-overlay">
        <div className="pdf-annotator-error">
          <p>{error}</p>
          <button onClick={onClose} className="btn btn-primary">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="pdf-annotator-overlay">
      <div className="pdf-annotator-container">
        {/* Header / Toolbar */}
        <div className="pdf-annotator-header">
          <div className="pdf-annotator-title">
            <Type size={20} />
            <span>Anotar PDF - {documentName}</span>
          </div>

          <div className="pdf-annotator-tools">
            {/* Text Tool */}
            <button
              className={`pdf-tool-btn ${isAddingText ? 'active' : ''}`}
              onClick={() => setIsAddingText(!isAddingText)}
              title="Adicionar texto"
            >
              <Type size={18} />
              <span>Texto</span>
            </button>

            {/* Divider */}
            <div className="pdf-tool-divider" />

            {/* Font Size */}
            <div className="pdf-tool-dropdown">
              <button
                className="pdf-tool-btn"
                onClick={() => { setShowSizePicker(!showSizePicker); setShowColorPicker(false) }}
                title="Tamanho da fonte"
              >
                <ALargeSmall size={18} />
                <span>{fontSize}px</span>
              </button>
              {showSizePicker && (
                <div className="pdf-dropdown-menu">
                  {FONT_SIZES.map(size => (
                    <button
                      key={size}
                      className={`pdf-dropdown-item ${fontSize === size ? 'active' : ''}`}
                      onClick={() => { setFontSize(size); setShowSizePicker(false) }}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div className="pdf-tool-dropdown">
              <button
                className="pdf-tool-btn"
                onClick={() => { setShowColorPicker(!showColorPicker); setShowSizePicker(false) }}
                title="Cor do texto"
              >
                <Palette size={18} />
                <span
                  className="pdf-color-preview"
                  style={{ backgroundColor: textColor }}
                />
              </button>
              {showColorPicker && (
                <div className="pdf-dropdown-menu pdf-color-grid">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`pdf-color-option ${textColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => { setTextColor(color); setShowColorPicker(false) }}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="pdf-tool-divider" />

            {/* Undo/Redo */}
            <button
              className="pdf-tool-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Desfazer"
            >
              <Undo size={18} />
            </button>
            <button
              className="pdf-tool-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Refazer"
            >
              <Redo size={18} />
            </button>

            {/* Delete Selected */}
            {selectedAnnotation && (
              <button
                className="pdf-tool-btn pdf-tool-danger"
                onClick={handleDeleteAnnotation}
                title="Eliminar selecionado"
              >
                <Trash2 size={18} />
              </button>
            )}

            {/* Divider */}
            <div className="pdf-tool-divider" />

            {/* Zoom Controls */}
            <button
              className="pdf-tool-btn"
              onClick={zoomOut}
              disabled={scale <= 0.5}
              title="Diminuir zoom"
            >
              <ZoomOut size={18} />
            </button>
            <span className="pdf-zoom-level">{Math.round(scale * 100)}%</span>
            <button
              className="pdf-tool-btn"
              onClick={zoomIn}
              disabled={scale >= 3}
              title="Aumentar zoom"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="pdf-annotator-actions">
            <button
              className="btn btn-outline"
              onClick={handleExport}
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              Exportar
            </button>
            <button className="pdf-close-btn" onClick={onClose} title="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="pdf-annotator-body">
          {/* Page Navigation */}
          <div className="pdf-page-nav">
            <button
              className="pdf-nav-btn"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="pdf-page-info">
              Página {currentPage} de {totalPages}
            </span>
            <button
              className="pdf-nav-btn"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Canvas Container */}
          <div
            className="pdf-canvas-container"
            ref={containerRef}
            onClick={() => { setSelectedAnnotation(null); setShowColorPicker(false); setShowSizePicker(false) }}
          >
            <div className="pdf-canvas-wrapper">
              <canvas ref={canvasRef} className="pdf-canvas" />

              {/* Annotation Overlay */}
              <div
                ref={overlayRef}
                className={`pdf-overlay ${isAddingText ? 'adding-text' : ''}`}
                onClick={handleCanvasClick}
              >
                {/* Existing Annotations */}
                {currentPageAnnotations.map(annotation => {
                  const adjustedX = annotation.x * (scale / annotation.scale)
                  const adjustedY = annotation.y * (scale / annotation.scale)
                  const adjustedFontSize = annotation.fontSize * (scale / annotation.scale)

                  return (
                    <div
                      key={annotation.id}
                      className={`pdf-annotation ${selectedAnnotation === annotation.id ? 'selected' : ''}`}
                      style={{
                        left: adjustedX,
                        top: adjustedY - adjustedFontSize,
                        fontSize: `${adjustedFontSize}px`,
                        color: annotation.color
                      }}
                      onClick={(e) => handleSelectAnnotation(annotation, e)}
                      onMouseDown={(e) => handleAnnotationDrag(annotation, e)}
                    >
                      {annotation.text}
                      {selectedAnnotation === annotation.id && (
                        <div className="pdf-annotation-handle">
                          <Move size={12} />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Text Input (when adding new text) */}
                {editingText && editingText.page === currentPage && (
                  <textarea
                    ref={textInputRef}
                    className="pdf-text-input"
                    style={{
                      left: editingText.x,
                      top: editingText.y - fontSize,
                      fontSize: `${fontSize}px`,
                      color: textColor
                    }}
                    value={editingText.text}
                    onChange={handleTextChange}
                    onBlur={handleTextSubmit}
                    onKeyDown={handleTextKeyDown}
                    placeholder="Escreva aqui..."
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          {isAddingText && (
            <div className="pdf-instructions">
              Clique no documento para adicionar texto
            </div>
          )}

          {/* Annotations Summary */}
          {annotations.length > 0 && (
            <div className="pdf-annotations-summary">
              <span>{annotations.length} {annotations.length === 1 ? 'anotacao' : 'anotacoes'}</span>
              <span className="pdf-summary-divider">|</span>
              <span>{currentPageAnnotations.length} nesta pagina</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
