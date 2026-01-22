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
  Trash2,
  Circle,
  Eraser,
  Undo2,
  Redo2
} from 'lucide-react'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Cores disponiveis para desenho
const DRAWING_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#000000', // black
]

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

  // Edit/Delete state
  const [editingAnnotation, setEditingAnnotation] = useState(null)
  const [editText, setEditText] = useState('')
  const [editCategoria, setEditCategoria] = useState('geral')

  // Drawing state
  const canvasRef = useRef(null)
  const [drawings, setDrawings] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentDrawing, setCurrentDrawing] = useState(null)
  const [drawingColor, setDrawingColor] = useState('#EF4444')
  const [drawingThickness, setDrawingThickness] = useState(2)
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 })

  // Undo/Redo state (max 3 actions)
  const [undoStack, setUndoStack] = useState([]) // Stack of deleted drawing IDs
  const [redoStack, setRedoStack] = useState([]) // Stack of drawings to redo

  // New Review Form
  const [newReviewName, setNewReviewName] = useState('')
  const [newReviewCodigo, setNewReviewCodigo] = useState('')
  const [newReviewFile, setNewReviewFile] = useState(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState(null)

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

  // Load annotations and drawings when version selected
  useEffect(() => {
    if (selectedVersion) {
      loadAnnotations()
      loadDrawings()
    }
  }, [selectedVersion])

  // Load drawings when page changes
  useEffect(() => {
    if (selectedVersion && currentPage) {
      loadDrawings()
    }
  }, [currentPage])

  // Redraw canvas when drawings change or scale changes
  useEffect(() => {
    redrawCanvas()
  }, [drawings, scale, pdfDimensions])

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

  const loadDrawings = async () => {
    if (!selectedVersion) return
    try {
      const { data, error } = await supabase
        .from('design_review_drawings')
        .select('*')
        .eq('version_id', selectedVersion.id)
        .eq('pagina', currentPage)
        .order('criado_em', { ascending: true })

      if (error) throw error
      setDrawings(data || [])
    } catch (err) {
      console.error('Error loading drawings:', err)
    }
  }

  const saveDrawing = async (drawingData) => {
    if (!selectedVersion) return
    try {
      const { data, error } = await supabase
        .from('design_review_drawings')
        .insert({
          version_id: selectedVersion.id,
          pagina: currentPage,
          tipo: drawingData.tipo,
          data: drawingData.data,
          cor: drawingColor,
          espessura: drawingThickness,
          autor_id: profile?.id,
          autor_nome: profile?.nome || user?.email || 'Utilizador'
        })
        .select()
        .single()

      if (error) throw error
      setDrawings(prev => [...prev, data])
    } catch (err) {
      console.error('Error saving drawing:', err)
    }
  }

  const deleteDrawing = async (drawingId, addToUndo = false) => {
    try {
      // Find the drawing before deleting (for undo)
      const drawingToDelete = drawings.find(d => d.id === drawingId)

      const { error } = await supabase
        .from('design_review_drawings')
        .delete()
        .eq('id', drawingId)

      if (error) throw error

      setDrawings(prev => prev.filter(d => d.id !== drawingId))

      // Add to undo stack if requested (max 3)
      if (addToUndo && drawingToDelete) {
        setUndoStack(prev => [...prev.slice(-2), drawingToDelete])
        setRedoStack([]) // Clear redo when new action is performed
      }
    } catch (err) {
      console.error('Error deleting drawing:', err)
    }
  }

  // Undo last drawing action (restore deleted drawing)
  const handleUndo = async () => {
    if (undoStack.length === 0) return

    const lastDeleted = undoStack[undoStack.length - 1]

    try {
      // Re-insert the drawing
      const { data, error } = await supabase
        .from('design_review_drawings')
        .insert({
          version_id: lastDeleted.version_id,
          pagina: lastDeleted.pagina,
          tipo: lastDeleted.tipo,
          data: lastDeleted.data,
          cor: lastDeleted.cor,
          espessura: lastDeleted.espessura,
          autor_id: lastDeleted.autor_id,
          autor_nome: lastDeleted.autor_nome
        })
        .select()
        .single()

      if (error) throw error

      setDrawings(prev => [...prev, data])
      setUndoStack(prev => prev.slice(0, -1))
      setRedoStack(prev => [...prev.slice(-2), data]) // Add to redo stack (max 3)
    } catch (err) {
      console.error('Error undoing:', err)
    }
  }

  // Redo last undone action (delete the restored drawing)
  const handleRedo = async () => {
    if (redoStack.length === 0) return

    const lastRestored = redoStack[redoStack.length - 1]

    try {
      const { error } = await supabase
        .from('design_review_drawings')
        .delete()
        .eq('id', lastRestored.id)

      if (error) throw error

      setDrawings(prev => prev.filter(d => d.id !== lastRestored.id))
      setRedoStack(prev => prev.slice(0, -1))
      // Don't add back to undo stack to avoid loops
    } catch (err) {
      console.error('Error redoing:', err)
    }
  }

  // Eraser: find and delete drawing at click position
  const handleEraserClick = (e) => {
    if (activeTool !== 'eraser') return

    const { x, y } = getCanvasCoords(e)
    const threshold = 3 // percentage threshold for hit detection

    // Find drawing near click position (reverse order to get topmost first)
    for (let i = drawings.length - 1; i >= 0; i--) {
      const drawing = drawings[i]
      const data = drawing.data

      let hit = false

      switch (drawing.tipo) {
        case 'pencil':
          // Check if click is near any point in the path
          if (data.points) {
            for (const point of data.points) {
              const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2))
              if (dist < threshold) {
                hit = true
                break
              }
            }
          }
          break

        case 'rectangle':
          // Check if click is near rectangle edges
          const inXRange = x >= data.x - threshold && x <= data.x + data.width + threshold
          const inYRange = y >= data.y - threshold && y <= data.y + data.height + threshold
          const nearLeftEdge = Math.abs(x - data.x) < threshold
          const nearRightEdge = Math.abs(x - (data.x + data.width)) < threshold
          const nearTopEdge = Math.abs(y - data.y) < threshold
          const nearBottomEdge = Math.abs(y - (data.y + data.height)) < threshold

          if ((inYRange && (nearLeftEdge || nearRightEdge)) ||
              (inXRange && (nearTopEdge || nearBottomEdge))) {
            hit = true
          }
          break

        case 'arrow':
        case 'line':
          // Check if click is near line
          const lineLength = Math.sqrt(Math.pow(data.x2 - data.x1, 2) + Math.pow(data.y2 - data.y1, 2))
          if (lineLength > 0) {
            const t = Math.max(0, Math.min(1,
              ((x - data.x1) * (data.x2 - data.x1) + (y - data.y1) * (data.y2 - data.y1)) / (lineLength * lineLength)
            ))
            const nearestX = data.x1 + t * (data.x2 - data.x1)
            const nearestY = data.y1 + t * (data.y2 - data.y1)
            const dist = Math.sqrt(Math.pow(x - nearestX, 2) + Math.pow(y - nearestY, 2))
            if (dist < threshold) {
              hit = true
            }
          }
          break

        case 'circle':
          // Check if click is near circle edge
          const distFromCenter = Math.sqrt(Math.pow(x - data.cx, 2) + Math.pow(y - data.cy, 2))
          if (Math.abs(distFromCenter - data.radius) < threshold) {
            hit = true
          }
          break
      }

      if (hit) {
        deleteDrawing(drawing.id, true) // Delete with undo support
        break
      }
    }
  }

  // Redraw all drawings on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || pdfDimensions.width === 0) return

    const ctx = canvas.getContext('2d')
    const scaledWidth = pdfDimensions.width * scale
    const scaledHeight = pdfDimensions.height * scale

    canvas.width = scaledWidth
    canvas.height = scaledHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all saved drawings
    drawings.forEach(drawing => {
      ctx.strokeStyle = drawing.cor
      ctx.lineWidth = drawing.espessura * scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const data = drawing.data

      switch (drawing.tipo) {
        case 'pencil':
          if (data.points && data.points.length > 1) {
            ctx.beginPath()
            ctx.moveTo(data.points[0].x * scaledWidth / 100, data.points[0].y * scaledHeight / 100)
            for (let i = 1; i < data.points.length; i++) {
              ctx.lineTo(data.points[i].x * scaledWidth / 100, data.points[i].y * scaledHeight / 100)
            }
            ctx.stroke()
          }
          break

        case 'rectangle':
          ctx.strokeRect(
            data.x * scaledWidth / 100,
            data.y * scaledHeight / 100,
            data.width * scaledWidth / 100,
            data.height * scaledHeight / 100
          )
          break

        case 'arrow':
        case 'line':
          const x1 = data.x1 * scaledWidth / 100
          const y1 = data.y1 * scaledHeight / 100
          const x2 = data.x2 * scaledWidth / 100
          const y2 = data.y2 * scaledHeight / 100

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          // Draw arrow head
          if (drawing.tipo === 'arrow') {
            const angle = Math.atan2(y2 - y1, x2 - x1)
            const headLength = 15 * scale
            ctx.beginPath()
            ctx.moveTo(x2, y2)
            ctx.lineTo(
              x2 - headLength * Math.cos(angle - Math.PI / 6),
              y2 - headLength * Math.sin(angle - Math.PI / 6)
            )
            ctx.moveTo(x2, y2)
            ctx.lineTo(
              x2 - headLength * Math.cos(angle + Math.PI / 6),
              y2 - headLength * Math.sin(angle + Math.PI / 6)
            )
            ctx.stroke()
          }
          break

        case 'circle':
          ctx.beginPath()
          ctx.arc(
            data.cx * scaledWidth / 100,
            data.cy * scaledHeight / 100,
            data.radius * scaledWidth / 100,
            0, 2 * Math.PI
          )
          ctx.stroke()
          break
      }
    })

    // Draw current drawing in progress
    if (currentDrawing) {
      ctx.strokeStyle = drawingColor
      ctx.lineWidth = drawingThickness * scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const data = currentDrawing.data

      switch (currentDrawing.tipo) {
        case 'pencil':
          if (data.points && data.points.length > 1) {
            ctx.beginPath()
            ctx.moveTo(data.points[0].x * scaledWidth / 100, data.points[0].y * scaledHeight / 100)
            for (let i = 1; i < data.points.length; i++) {
              ctx.lineTo(data.points[i].x * scaledWidth / 100, data.points[i].y * scaledHeight / 100)
            }
            ctx.stroke()
          }
          break

        case 'rectangle':
          ctx.strokeRect(
            data.x * scaledWidth / 100,
            data.y * scaledHeight / 100,
            data.width * scaledWidth / 100,
            data.height * scaledHeight / 100
          )
          break

        case 'arrow':
        case 'line':
          const x1 = data.x1 * scaledWidth / 100
          const y1 = data.y1 * scaledHeight / 100
          const x2 = data.x2 * scaledWidth / 100
          const y2 = data.y2 * scaledHeight / 100

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          if (currentDrawing.tipo === 'arrow') {
            const angle = Math.atan2(y2 - y1, x2 - x1)
            const headLength = 15 * scale
            ctx.beginPath()
            ctx.moveTo(x2, y2)
            ctx.lineTo(
              x2 - headLength * Math.cos(angle - Math.PI / 6),
              y2 - headLength * Math.sin(angle - Math.PI / 6)
            )
            ctx.moveTo(x2, y2)
            ctx.lineTo(
              x2 - headLength * Math.cos(angle + Math.PI / 6),
              y2 - headLength * Math.sin(angle + Math.PI / 6)
            )
            ctx.stroke()
          }
          break

        case 'circle':
          ctx.beginPath()
          ctx.arc(
            data.cx * scaledWidth / 100,
            data.cy * scaledHeight / 100,
            data.radius * scaledWidth / 100,
            0, 2 * Math.PI
          )
          ctx.stroke()
          break
      }
    }
  }, [drawings, currentDrawing, scale, pdfDimensions, drawingColor, drawingThickness])

  // Canvas mouse event handlers
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x, y }
  }

  const handleCanvasMouseDown = (e) => {
    if (!['pencil', 'rectangle', 'arrow', 'circle', 'line'].includes(activeTool)) return
    e.preventDefault()

    const { x, y } = getCanvasCoords(e)
    setIsDrawing(true)

    switch (activeTool) {
      case 'pencil':
        setCurrentDrawing({ tipo: 'pencil', data: { points: [{ x, y }] } })
        break
      case 'rectangle':
        setCurrentDrawing({ tipo: 'rectangle', data: { x, y, width: 0, height: 0, startX: x, startY: y } })
        break
      case 'arrow':
        setCurrentDrawing({ tipo: 'arrow', data: { x1: x, y1: y, x2: x, y2: y } })
        break
      case 'line':
        setCurrentDrawing({ tipo: 'line', data: { x1: x, y1: y, x2: x, y2: y } })
        break
      case 'circle':
        setCurrentDrawing({ tipo: 'circle', data: { cx: x, cy: y, radius: 0, startX: x, startY: y } })
        break
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || !currentDrawing) return

    const { x, y } = getCanvasCoords(e)

    switch (currentDrawing.tipo) {
      case 'pencil':
        setCurrentDrawing(prev => ({
          ...prev,
          data: { points: [...prev.data.points, { x, y }] }
        }))
        break
      case 'rectangle':
        const startX = currentDrawing.data.startX
        const startY = currentDrawing.data.startY
        setCurrentDrawing(prev => ({
          ...prev,
          data: {
            ...prev.data,
            x: Math.min(startX, x),
            y: Math.min(startY, y),
            width: Math.abs(x - startX),
            height: Math.abs(y - startY)
          }
        }))
        break
      case 'arrow':
      case 'line':
        setCurrentDrawing(prev => ({
          ...prev,
          data: { ...prev.data, x2: x, y2: y }
        }))
        break
      case 'circle':
        const cx = currentDrawing.data.startX
        const cy = currentDrawing.data.startY
        const radius = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2))
        setCurrentDrawing(prev => ({
          ...prev,
          data: { ...prev.data, cx, cy, radius }
        }))
        break
    }

    redrawCanvas()
  }

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentDrawing) return

    setIsDrawing(false)

    // Only save if drawing has meaningful size
    let shouldSave = false
    switch (currentDrawing.tipo) {
      case 'pencil':
        shouldSave = currentDrawing.data.points.length > 2
        break
      case 'rectangle':
        shouldSave = currentDrawing.data.width > 1 && currentDrawing.data.height > 1
        // Clean up startX, startY before saving
        if (shouldSave) {
          const { startX, startY, ...cleanData } = currentDrawing.data
          currentDrawing.data = cleanData
        }
        break
      case 'arrow':
      case 'line':
        const dx = currentDrawing.data.x2 - currentDrawing.data.x1
        const dy = currentDrawing.data.y2 - currentDrawing.data.y1
        shouldSave = Math.sqrt(dx * dx + dy * dy) > 2
        break
      case 'circle':
        shouldSave = currentDrawing.data.radius > 1
        // Clean up startX, startY before saving
        if (shouldSave) {
          const { startX, startY, ...cleanData } = currentDrawing.data
          currentDrawing.data = cleanData
        }
        break
    }

    if (shouldSave) {
      saveDrawing(currentDrawing)
    }

    setCurrentDrawing(null)
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
          autor_id: profile?.id,
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
          resolvido_por: profile?.id,
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

  const startEditAnnotation = (annotation) => {
    setEditingAnnotation(annotation)
    setEditText(annotation.comentario)
    setEditCategoria(annotation.categoria)
  }

  const handleEditAnnotation = async () => {
    if (!editingAnnotation || !editText.trim()) return

    try {
      const { error } = await supabase
        .from('design_review_annotations')
        .update({
          comentario: editText.trim(),
          categoria: editCategoria
        })
        .eq('id', editingAnnotation.id)

      if (error) throw error

      setAnnotations(prev =>
        prev.map(a => a.id === editingAnnotation.id
          ? { ...a, comentario: editText.trim(), categoria: editCategoria }
          : a)
      )
      setEditingAnnotation(null)
      setEditText('')
    } catch (err) {
      console.error('Error editing annotation:', err)
    }
  }

  const handleDeleteAnnotation = async (annotation) => {
    if (!confirm('Tem certeza que deseja apagar esta anotação?')) return

    try {
      const { error } = await supabase
        .from('design_review_annotations')
        .delete()
        .eq('id', annotation.id)

      if (error) throw error

      setAnnotations(prev => prev.filter(a => a.id !== annotation.id))
      if (selectedAnnotation?.id === annotation.id) {
        setSelectedAnnotation(null)
      }
    } catch (err) {
      console.error('Error deleting annotation:', err)
    }
  }

  const handleReopenAnnotation = async (annotation) => {
    try {
      const { error } = await supabase
        .from('design_review_annotations')
        .update({
          status: 'aberto',
          resolvido_por: null,
          resolvido_por_nome: null,
          resolvido_em: null
        })
        .eq('id', annotation.id)

      if (error) throw error

      setAnnotations(prev =>
        prev.map(a => a.id === annotation.id ? { ...a, status: 'aberto' } : a)
      )
    } catch (err) {
      console.error('Error reopening annotation:', err)
    }
  }

  const handleCreateReview = async () => {
    if (!newReviewName.trim() || !newReviewFile) return

    setCreateLoading(true)
    setCreateError(null)

    try {
      // Upload file to storage
      const fileName = `design-reviews/${projeto.id}/${Date.now()}_${newReviewFile.name}`
      console.log('Uploading file:', fileName)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, newReviewFile)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(fileName)

      console.log('File URL:', urlData.publicUrl)

      // Create review (use profile.id which is the utilizadores table ID)
      const { data: reviewData, error: reviewError } = await supabase
        .from('design_reviews')
        .insert({
          projeto_id: projeto.id,
          nome: newReviewName.trim(),
          codigo_documento: newReviewCodigo.trim() || null,
          criado_por: profile?.id || null,
          criado_por_nome: profile?.nome || user?.email || 'Utilizador'
        })
        .select()
        .single()

      if (reviewError) {
        console.error('Review error:', reviewError)
        throw new Error(`Erro ao criar review: ${reviewError.message}`)
      }

      console.log('Review created:', reviewData)

      // Create first version
      const { error: versionError } = await supabase
        .from('design_review_versions')
        .insert({
          review_id: reviewData.id,
          numero_versao: 1,
          file_url: urlData.publicUrl,
          file_name: newReviewFile.name,
          file_size: newReviewFile.size,
          uploaded_by: profile?.id || null,
          uploaded_by_nome: profile?.nome || user?.email || 'Utilizador'
        })

      if (versionError) {
        console.error('Version error:', versionError)
        throw new Error(`Erro ao criar versao: ${versionError.message}`)
      }

      // Reload
      await loadReviews()
      setShowNewReviewModal(false)
      setNewReviewName('')
      setNewReviewCodigo('')
      setNewReviewFile(null)
    } catch (err) {
      console.error('Error creating review:', err)
      setCreateError(err.message || 'Erro ao criar review')
    } finally {
      setCreateLoading(false)
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
          uploaded_by: profile?.id,
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
      case 'meus': return a.autor_id === profile?.id
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
            onClose={() => { setShowNewReviewModal(false); setCreateError(null) }}
            onSubmit={handleCreateReview}
            name={newReviewName}
            setName={setNewReviewName}
            codigo={newReviewCodigo}
            setCodigo={setNewReviewCodigo}
            file={newReviewFile}
            setFile={setNewReviewFile}
            loading={createLoading}
            error={createError}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 380px)', minHeight: '500px', maxHeight: '800px' }}>
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
              { id: 'comment', icon: MessageCircle, label: 'Comentario' },
              { id: 'pencil', icon: Pencil, label: 'Desenho livre' },
              { id: 'rectangle', icon: Square, label: 'Retangulo' },
              { id: 'arrow', icon: ArrowUpRight, label: 'Seta' },
              { id: 'circle', icon: Circle, label: 'Circulo' },
              { id: 'line', icon: Minus, label: 'Linha' },
              { id: 'eraser', icon: Eraser, label: 'Borracha' }
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
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
                  color: activeTool === tool.id ? 'var(--white)' : 'var(--brown)',
                  cursor: 'pointer'
                }}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>

          {/* Undo/Redo */}
          <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title={`Desfazer (${undoStack.length}/3)`}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: '1px solid var(--stone)',
                background: 'var(--white)',
                color: undoStack.length === 0 ? 'var(--stone)' : 'var(--brown)',
                cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
                opacity: undoStack.length === 0 ? 0.5 : 1
              }}
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title={`Refazer (${redoStack.length}/3)`}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: '1px solid var(--stone)',
                background: 'var(--white)',
                color: redoStack.length === 0 ? 'var(--stone)' : 'var(--brown)',
                cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
                opacity: redoStack.length === 0 ? 0.5 : 1
              }}
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--stone)' }} />

          {/* Color Picker */}
          {['pencil', 'rectangle', 'arrow', 'circle', 'line'].includes(activeTool) && (
            <>
              <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                {DRAWING_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setDrawingColor(color)}
                    title={color}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: drawingColor === color ? '2px solid var(--brown)' : '2px solid transparent',
                      background: color,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  />
                ))}
              </div>
              <div style={{ width: '1px', height: '24px', background: 'var(--stone)', marginLeft: '8px' }} />
            </>
          )}

          {/* Clear Drawings Button */}
          {['pencil', 'rectangle', 'arrow', 'circle', 'line'].includes(activeTool) && drawings.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Apagar todos os desenhos desta página?')) {
                  drawings.forEach(d => deleteDrawing(d.id))
                }
              }}
              title="Apagar desenhos"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #EF4444',
                background: 'transparent',
                color: '#EF4444',
                fontSize: '12px',
                cursor: 'pointer',
                marginLeft: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={14} />
              Limpar
            </button>
          )}

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
                cursor: activeTool === 'comment' ? 'crosshair' :
                        ['pencil', 'rectangle', 'arrow', 'circle', 'line'].includes(activeTool) ? 'crosshair' : 'default',
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
                  onMouseDown={(e) => {
                    if (activeTool === 'eraser') {
                      handleEraserClick(e)
                    } else {
                      handleCanvasMouseDown(e)
                    }
                  }}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: pdfDimensions.width * scale,
                    height: pdfDimensions.height * scale,
                    pointerEvents: ['pencil', 'rectangle', 'arrow', 'circle', 'line', 'eraser'].includes(activeTool) ? 'auto' : 'none',
                    cursor: activeTool === 'eraser' ? 'crosshair' : 'crosshair',
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
        width: '320px',
        minWidth: '280px',
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
                          onClick={() => setEditingAnnotation(null)}
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
                          onClick={handleEditAnnotation}
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
                          </div>
                          {/* Edit/Delete buttons */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditAnnotation(annotation)
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
                                handleDeleteAnnotation(annotation)
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
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReopenAnnotation(annotation)
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
          onClose={() => { setShowNewReviewModal(false); setCreateError(null) }}
          onSubmit={handleCreateReview}
          name={newReviewName}
          setName={setNewReviewName}
          codigo={newReviewCodigo}
          setCodigo={setNewReviewCodigo}
          file={newReviewFile}
          setFile={setNewReviewFile}
          loading={createLoading}
          error={createError}
        />
      )}
    </div>
  )
}

// New Review Modal Component
function NewReviewModal({ onClose, onSubmit, name, setName, codigo, setCodigo, file, setFile, loading, error }) {
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

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: '#FEE2E2',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            color: '#B91C1C',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

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
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={!name.trim() || !file || loading}
            style={{ minWidth: '120px' }}
          >
            {loading ? 'A criar...' : 'Criar Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
