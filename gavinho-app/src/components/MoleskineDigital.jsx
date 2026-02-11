import { useState, useEffect, useRef, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import * as pdfjsLib from 'pdfjs-dist'
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './ui/Toast'
import {
  Pencil,
  Highlighter,
  Square,
  Circle,
  ArrowUpRight,
  Type,
  Eraser,
  MousePointer2,
  RotateCcw,
  RotateCw,
  Download,
  Trash2,
  X,
  Save,
  Loader2,
  ZoomIn,
  ZoomOut,
  Move,
  Plus,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Upload,
  Grid3X3,
  Maximize2,
  BookOpen,
  Layers,
  PanelLeftClose,
  PanelLeft,
  FilePlus,
  Minus,
  GripVertical,
  Copy,
  Clipboard,
  LayoutGrid,
  AlignJustify
} from 'lucide-react'

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// Cores disponíveis
const STROKE_COLORS = [
  { id: 'black', name: 'Preto', color: '#000000' },
  { id: 'brown', name: 'Castanho', color: '#8B7355' },
  { id: 'blue', name: 'Azul', color: '#4338CA' },
  { id: 'orange', name: 'Laranja', color: '#D97706' },
  { id: 'green', name: 'Verde', color: '#16A34A' },
  { id: 'red', name: 'Vermelho', color: '#DC2626' },
]

// Ferramentas
const TOOLS = {
  SELECT: 'select',
  PEN: 'pen',
  HIGHLIGHTER: 'highlighter',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  ARROW: 'arrow',
  TEXT: 'text',
  ERASER: 'eraser',
  PAN: 'pan',
  IMAGE: 'image',
  LINK: 'link',
}

const STROKE_WIDTHS = [2, 4, 6, 8]

// Page templates
const PAGE_TEMPLATES = [
  { id: 'blank', name: 'Em branco', icon: 'blank', pattern: null },
  { id: 'grid', name: 'Quadriculado', icon: 'grid', pattern: 'grid' },
  { id: 'lines', name: 'Linhas', icon: 'lines', pattern: 'lines' },
  { id: 'dots', name: 'Pontos', icon: 'dots', pattern: 'dots' },
  { id: 'cornell', name: 'Cornell', icon: 'cornell', pattern: 'cornell' },
]

// Opções do perfect-freehand
const getPenOptions = (size) => ({
  size,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
})

const getHighlighterOptions = (size) => ({
  size: size * 4,
  thinning: 0,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: false,
})

// Converter pontos para path SVG
function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return ''
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )
  d.push('Z')
  return d.join(' ')
}

// Gerar ID único
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// Página em branco default
const createBlankPage = (template = 'blank') => ({
  id: generateId(),
  elements: [],
  background: '#FFFFFF',
  template: template,
  createdAt: new Date().toISOString()
})

export default function MoleskineDigital({ projectId, projectName, onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Notebook state
  const [notebookId, setNotebookId] = useState(null)
  const [pages, setPages] = useState([createBlankPage()])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [notebookName, setNotebookName] = useState(`Moleskine - ${projectName || 'Novo'}`)

  // Tool state
  const [activeTool, setActiveTool] = useState(TOOLS.PEN)
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0].color)
  const [strokeWidth, setStrokeWidth] = useState(4)

  // Current drawing state
  const [currentElement, setCurrentElement] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // History per page
  const [pageHistory, setPageHistory] = useState({})
  const [historyIndex, setHistoryIndex] = useState({})

  // View state
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Canvas dimensions (horizontal/landscape)
  const canvasWidth = 1600
  const canvasHeight = 1000

  // Text input state
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState(null)
  const [isAddingText, setIsAddingText] = useState(false)

  // Link input state
  const [linkInput, setLinkInput] = useState({ url: '', label: '' })
  const [linkPosition, setLinkPosition] = useState(null)
  const [isAddingLink, setIsAddingLink] = useState(false)

  // Selection state
  const [selectedElement, setSelectedElement] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null) // 'nw', 'ne', 'sw', 'se'
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // Floating toolbar state
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(true)

  // Crop state
  const [isCropping, setIsCropping] = useState(false)
  const [cropRect, setCropRect] = useState(null) // { x, y, width, height } relative to image
  const [cropStart, setCropStart] = useState(null)

  // Clipboard state
  const [clipboard, setClipboard] = useState(null)

  // Drag and drop page reorder state
  const [draggedPageIndex, setDraggedPageIndex] = useState(null)
  const [dragOverPageIndex, setDragOverPageIndex] = useState(null)

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showPagesList, setShowPagesList] = useState(false)
  const [showRenderPicker, setShowRenderPicker] = useState(false)
  const [projectRenders, setProjectRenders] = useState([])
  const [loadingRenders, setLoadingRenders] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(true) // Painel de miniaturas
  const [loadingPdf, setLoadingPdf] = useState(false) // Estado de carregamento PDF
  const pdfInputRef = useRef(null) // Ref para input de PDF
  const [showTemplateModal, setShowTemplateModal] = useState(false) // Modal de templates
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null) // Index da página a apagar
  const [isExporting, setIsExporting] = useState(false) // Estado de exportação PDF

  // Current page shortcut
  const currentPage = pages[currentPageIndex] || createBlankPage()

  // Load notebook from database
  useEffect(() => {
    const loadNotebook = async () => {
      if (!projectId) return

      try {
        const { data, error } = await supabase
          .from('projeto_moleskine')
          .select('*')
          .eq('projeto_id', projectId)
          .single()

        if (error && error.code !== 'PGRST116') {
          // Table may not exist yet
          return
        }

        if (data) {
          setNotebookId(data.id)
          setNotebookName(data.nome || `Moleskine - ${projectName}`)
          setPages(data.pages || [createBlankPage()])

          // Initialize history for each page
          const initialHistory = {}
          const initialIndex = {}
          ;(data.pages || []).forEach((page, idx) => {
            initialHistory[page.id] = [page.elements || []]
            initialIndex[page.id] = 0
          })
          setPageHistory(initialHistory)
          setHistoryIndex(initialIndex)
        }
      } catch (err) {
        // Table may not exist yet
      }
    }

    loadNotebook()
  }, [projectId, projectName])

  // Save notebook to database
  const saveNotebook = async () => {
    if (!projectId) return

    setIsSaving(true)
    try {
      const notebookData = {
        projeto_id: projectId,
        nome: notebookName,
        pages: pages,
        updated_by: profile?.id,
        updated_at: new Date().toISOString(),
      }

      if (notebookId) {
        const { error } = await supabase
          .from('projeto_moleskine')
          .update(notebookData)
          .eq('id', notebookId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('projeto_moleskine')
          .insert([notebookData])
          .select()
          .single()

        if (error) throw error
        setNotebookId(data.id)
      }

      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Erro ao guardar:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const saveTimeout = setTimeout(() => {
      saveNotebook()
    }, 5000)

    return () => clearTimeout(saveTimeout)
  }, [pages, hasUnsavedChanges])

  // Fit canvas to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const padding = 100
    const availableWidth = container.clientWidth - padding
    const availableHeight = container.clientHeight - padding

    const scaleX = availableWidth / canvasWidth
    const scaleY = availableHeight / canvasHeight
    const newScale = Math.min(scaleX, scaleY, 1)

    setScale(newScale)
    setOffset({
      x: (container.clientWidth - canvasWidth * newScale) / 2,
      y: (container.clientHeight - canvasHeight * newScale) / 2
    })
  }, [])

  // Auto-center when changing pages
  useEffect(() => {
    // Small delay to ensure container is ready
    const timer = setTimeout(() => {
      fitToScreen()
    }, 50)
    return () => clearTimeout(timer)
  }, [currentPageIndex, fitToScreen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Page navigation
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        if (currentPageIndex > 0) {
          setCurrentPageIndex(prev => prev - 1)
        }
      }
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        if (currentPageIndex < pages.length - 1) {
          setCurrentPageIndex(prev => prev + 1)
        }
      }

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault()
        setScale(s => Math.min(3, s + 0.25))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setScale(s => Math.max(0.2, s - 0.25))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        fitToScreen()
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') setActiveTool(TOOLS.SELECT)
      if (e.key === 'p' || e.key === 'P') setActiveTool(TOOLS.PEN)
      if (e.key === 'h' || e.key === 'H') setActiveTool(TOOLS.HIGHLIGHTER)
      if (e.key === 'l' || e.key === 'L') setActiveTool(TOOLS.LINE)
      if (e.key === 'e' || e.key === 'E') setActiveTool(TOOLS.ERASER)
      if (e.key === ' ') {
        e.preventDefault()
        setActiveTool(TOOLS.PAN)
      }

      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        e.preventDefault()
        const newElements = currentPage.elements.filter(el => el.id !== selectedElement.id)
        updatePageElements(newElements)
        setSelectedElement(null)
      }

      // Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElement) {
        e.preventDefault()
        setClipboard({ ...selectedElement })
      }

      // Paste (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
        e.preventDefault()
        const pastedElement = {
          ...clipboard,
          id: generateId(),
          // Offset position slightly to show it's a copy
          x: clipboard.x !== undefined ? clipboard.x + 20 : undefined,
          y: clipboard.y !== undefined ? clipboard.y + 20 : undefined,
          x1: clipboard.x1 !== undefined ? clipboard.x1 + 20 : undefined,
          y1: clipboard.y1 !== undefined ? clipboard.y1 + 20 : undefined,
          x2: clipboard.x2 !== undefined ? clipboard.x2 + 20 : undefined,
          y2: clipboard.y2 !== undefined ? clipboard.y2 + 20 : undefined,
          points: clipboard.points ? clipboard.points.map(([px, py, pressure]) => [px + 20, py + 20, pressure]) : undefined,
        }
        updatePageElements([...currentPage.elements, pastedElement])
        setSelectedElement(pastedElement)
        // Update clipboard with new position for successive pastes
        setClipboard(pastedElement)
      }

      // Duplicate (Ctrl+D / Cmd+D)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedElement) {
        e.preventDefault()
        const duplicatedElement = {
          ...selectedElement,
          id: generateId(),
          x: selectedElement.x !== undefined ? selectedElement.x + 30 : undefined,
          y: selectedElement.y !== undefined ? selectedElement.y + 30 : undefined,
          x1: selectedElement.x1 !== undefined ? selectedElement.x1 + 30 : undefined,
          y1: selectedElement.y1 !== undefined ? selectedElement.y1 + 30 : undefined,
          x2: selectedElement.x2 !== undefined ? selectedElement.x2 + 30 : undefined,
          y2: selectedElement.y2 !== undefined ? selectedElement.y2 + 30 : undefined,
          points: selectedElement.points ? selectedElement.points.map(([px, py, pressure]) => [px + 30, py + 30, pressure]) : undefined,
        }
        updatePageElements([...currentPage.elements, duplicatedElement])
        setSelectedElement(duplicatedElement)
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedElement(null)
        setIsAddingText(false)
        setIsAddingLink(false)
      }
    }

    const handleKeyUp = (e) => {
      // Return to previous tool after space (pan)
      if (e.key === ' ') {
        setActiveTool(TOOLS.PEN)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [currentPageIndex, pages.length, selectedElement, currentPage, fitToScreen, clipboard])

  // Fit on mount and resize
  useEffect(() => {
    fitToScreen()
    window.addEventListener('resize', fitToScreen)
    return () => window.removeEventListener('resize', fitToScreen)
  }, [fitToScreen])

  // Update page elements
  const updatePageElements = (newElements) => {
    const updatedPages = [...pages]
    updatedPages[currentPageIndex] = {
      ...currentPage,
      elements: newElements
    }
    setPages(updatedPages)
    setHasUnsavedChanges(true)

    // Update history
    const pageId = currentPage.id
    const currentHistory = pageHistory[pageId] || [[]]
    const currentIdx = historyIndex[pageId] || 0
    const newHistory = currentHistory.slice(0, currentIdx + 1)
    newHistory.push(newElements)
    if (newHistory.length > 50) newHistory.shift()

    setPageHistory(prev => ({ ...prev, [pageId]: newHistory }))
    setHistoryIndex(prev => ({ ...prev, [pageId]: newHistory.length - 1 }))
  }

  // Undo/Redo
  const handleUndo = () => {
    const pageId = currentPage.id
    const currentIdx = historyIndex[pageId] || 0
    if (currentIdx <= 0) return

    const newIdx = currentIdx - 1
    const history = pageHistory[pageId] || [[]]

    setHistoryIndex(prev => ({ ...prev, [pageId]: newIdx }))

    const updatedPages = [...pages]
    updatedPages[currentPageIndex] = {
      ...currentPage,
      elements: history[newIdx]
    }
    setPages(updatedPages)
    setHasUnsavedChanges(true)
  }

  const handleRedo = () => {
    const pageId = currentPage.id
    const history = pageHistory[pageId] || [[]]
    const currentIdx = historyIndex[pageId] || 0
    if (currentIdx >= history.length - 1) return

    const newIdx = currentIdx + 1

    setHistoryIndex(prev => ({ ...prev, [pageId]: newIdx }))

    const updatedPages = [...pages]
    updatedPages[currentPageIndex] = {
      ...currentPage,
      elements: history[newIdx]
    }
    setPages(updatedPages)
    setHasUnsavedChanges(true)
  }

  // Page management
  const addNewPage = (template = 'blank') => {
    const newPage = createBlankPage(template)
    setPages([...pages, newPage])
    setCurrentPageIndex(pages.length)
    setPageHistory(prev => ({ ...prev, [newPage.id]: [[]] }))
    setHistoryIndex(prev => ({ ...prev, [newPage.id]: 0 }))
    setHasUnsavedChanges(true)
    setShowTemplateModal(false)
  }

  const deletePage = (index) => {
    if (pages.length <= 1) return
    const newPages = pages.filter((_, i) => i !== index)
    setPages(newPages)
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(newPages.length - 1)
    }
    setHasUnsavedChanges(true)
    setShowDeleteConfirm(null)
  }

  const goToPage = (index) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index)
    }
  }

  // Drag and drop page reordering
  const handlePageDragStart = (index) => {
    setDraggedPageIndex(index)
  }

  const handlePageDragOver = (e, index) => {
    e.preventDefault()
    if (draggedPageIndex !== null && draggedPageIndex !== index) {
      setDragOverPageIndex(index)
    }
  }

  const handlePageDragEnd = () => {
    if (draggedPageIndex !== null && dragOverPageIndex !== null && draggedPageIndex !== dragOverPageIndex) {
      const newPages = [...pages]
      const [draggedPage] = newPages.splice(draggedPageIndex, 1)
      newPages.splice(dragOverPageIndex, 0, draggedPage)
      setPages(newPages)
      setHasUnsavedChanges(true)

      // Update current page index if needed
      if (currentPageIndex === draggedPageIndex) {
        setCurrentPageIndex(dragOverPageIndex)
      } else if (draggedPageIndex < currentPageIndex && dragOverPageIndex >= currentPageIndex) {
        setCurrentPageIndex(currentPageIndex - 1)
      } else if (draggedPageIndex > currentPageIndex && dragOverPageIndex <= currentPageIndex) {
        setCurrentPageIndex(currentPageIndex + 1)
      }
    }
    setDraggedPageIndex(null)
    setDragOverPageIndex(null)
  }

  // Export to PDF
  const exportToPdf = async () => {
    setIsExporting(true)
    try {
      // Create PDF in landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvasWidth, canvasHeight]
      })

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]

        // Create canvas for this page
        const canvas = document.createElement('canvas')
        canvas.width = canvasWidth * 2 // Higher resolution
        canvas.height = canvasHeight * 2
        const ctx = canvas.getContext('2d')
        ctx.scale(2, 2)

        // Draw background
        ctx.fillStyle = page.background || '#FFFFFF'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        // Draw background image if exists (PDF)
        if (page.backgroundImage) {
          await new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)
              resolve()
            }
            img.onerror = resolve
            img.src = page.backgroundImage
          })
        }

        // Draw template pattern
        if (page.template && page.template !== 'blank') {
          drawTemplatePattern(ctx, page.template)
        }

        // Draw elements
        for (const el of page.elements) {
          await drawElementToCanvas(ctx, el)
        }

        // Add page to PDF
        if (i > 0) {
          pdf.addPage([canvasWidth, canvasHeight], 'landscape')
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgData, 'JPEG', 0, 0, canvasWidth, canvasHeight)
      }

      // Save PDF
      const fileName = `${notebookName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast.error('Erro', 'Erro ao exportar PDF. Tente novamente.')
    } finally {
      setIsExporting(false)
    }
  }

  // Draw template pattern to canvas context
  const drawTemplatePattern = (ctx, template) => {
    ctx.strokeStyle = '#E5E5E5'
    ctx.lineWidth = 1

    if (template === 'grid') {
      const gridSize = 40
      ctx.beginPath()
      for (let x = 0; x <= canvasWidth; x += gridSize) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasHeight)
      }
      for (let y = 0; y <= canvasHeight; y += gridSize) {
        ctx.moveTo(0, y)
        ctx.lineTo(canvasWidth, y)
      }
      ctx.stroke()
    } else if (template === 'lines') {
      const lineSpacing = 32
      ctx.beginPath()
      for (let y = lineSpacing; y < canvasHeight; y += lineSpacing) {
        ctx.moveTo(60, y)
        ctx.lineTo(canvasWidth - 60, y)
      }
      ctx.stroke()
    } else if (template === 'dots') {
      const dotSpacing = 30
      ctx.fillStyle = '#D0D0D0'
      for (let x = dotSpacing; x < canvasWidth; x += dotSpacing) {
        for (let y = dotSpacing; y < canvasHeight; y += dotSpacing) {
          ctx.beginPath()
          ctx.arc(x, y, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (template === 'cornell') {
      ctx.strokeStyle = '#D0D0D0'
      ctx.lineWidth = 2
      ctx.beginPath()
      // Left margin line
      ctx.moveTo(200, 0)
      ctx.lineTo(200, canvasHeight)
      // Bottom summary area
      ctx.moveTo(0, canvasHeight - 200)
      ctx.lineTo(canvasWidth, canvasHeight - 200)
      ctx.stroke()
      // Horizontal lines in main area
      ctx.strokeStyle = '#E5E5E5'
      ctx.lineWidth = 1
      const lineSpacing = 32
      for (let y = lineSpacing; y < canvasHeight - 200; y += lineSpacing) {
        ctx.beginPath()
        ctx.moveTo(200, y)
        ctx.lineTo(canvasWidth - 40, y)
        ctx.stroke()
      }
    }
  }

  // Draw element to canvas
  const drawElementToCanvas = async (ctx, el) => {
    if (el.type === TOOLS.PEN || el.type === TOOLS.HIGHLIGHTER) {
      const options = el.type === TOOLS.PEN ? getPenOptions(el.width) : getHighlighterOptions(el.width)
      const stroke = getStroke(el.points, options)
      const path = new Path2D(getSvgPathFromStroke(stroke))

      ctx.globalAlpha = el.type === TOOLS.HIGHLIGHTER ? 0.3 : 1
      ctx.fillStyle = el.color
      ctx.fill(path)
      ctx.globalAlpha = 1
    } else if (el.type === TOOLS.LINE) {
      ctx.beginPath()
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.width
      ctx.lineCap = 'round'
      ctx.moveTo(el.x1, el.y1)
      ctx.lineTo(el.x2, el.y2)
      ctx.stroke()
    } else if (el.type === TOOLS.RECTANGLE) {
      ctx.beginPath()
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.width
      ctx.strokeRect(
        Math.min(el.x1, el.x2),
        Math.min(el.y1, el.y2),
        Math.abs(el.x2 - el.x1),
        Math.abs(el.y2 - el.y1)
      )
    } else if (el.type === TOOLS.CIRCLE) {
      ctx.beginPath()
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.width
      ctx.ellipse(
        (el.x1 + el.x2) / 2,
        (el.y1 + el.y2) / 2,
        Math.abs(el.x2 - el.x1) / 2,
        Math.abs(el.y2 - el.y1) / 2,
        0, 0, Math.PI * 2
      )
      ctx.stroke()
    } else if (el.type === TOOLS.ARROW) {
      ctx.beginPath()
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.width
      ctx.lineCap = 'round'
      ctx.moveTo(el.x1, el.y1)
      ctx.lineTo(el.x2, el.y2)
      ctx.stroke()

      // Arrow head
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
      const headLength = 15
      ctx.beginPath()
      ctx.moveTo(el.x2, el.y2)
      ctx.lineTo(el.x2 - headLength * Math.cos(angle - Math.PI / 6), el.y2 - headLength * Math.sin(angle - Math.PI / 6))
      ctx.moveTo(el.x2, el.y2)
      ctx.lineTo(el.x2 - headLength * Math.cos(angle + Math.PI / 6), el.y2 - headLength * Math.sin(angle + Math.PI / 6))
      ctx.stroke()
    } else if (el.type === TOOLS.TEXT) {
      ctx.fillStyle = el.color
      ctx.font = `${el.fontSize}px 'Quattrocento Sans', sans-serif`
      ctx.fillText(el.text, el.x, el.y)
    } else if (el.type === TOOLS.LINK) {
      ctx.fillStyle = '#4338CA'
      ctx.font = `16px 'Quattrocento Sans', sans-serif`
      ctx.fillText(el.label, el.x, el.y)
    } else if (el.type === 'image') {
      await new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.drawImage(img, el.x, el.y, el.width, el.height)
          resolve()
        }
        img.onerror = resolve
        img.src = el.url
      })
    }
  }

  // Get canvas coordinates
  const getCanvasCoords = (e) => {
    if (!containerRef.current) return { x: 0, y: 0 }

    const rect = containerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    const x = (clientX - rect.left - offset.x) / scale
    const y = (clientY - rect.top - offset.y) / scale

    return { x, y }
  }

  // Handle pointer down
  const handlePointerDown = (e) => {
    const { x, y } = getCanvasCoords(e)

    // Pan mode
    if (activeTool === TOOLS.PAN || e.altKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      return
    }

    // Select mode - check for element selection or resize handles
    if (activeTool === TOOLS.SELECT) {
      // Check if clicking on resize handle of selected element
      if (selectedElement && selectedElement.type === 'image') {
        const handle = getResizeHandleAtPoint(selectedElement, x, y)
        if (handle) {
          setIsResizing(true)
          setResizeHandle(handle)
          setResizeStart({
            x: selectedElement.x,
            y: selectedElement.y,
            width: selectedElement.width,
            height: selectedElement.height,
            mouseX: x,
            mouseY: y
          })
          return
        }
      }

      // Check if clicking on an element to select it
      const hitElement = findElementAtPoint(x, y)
      if (hitElement) {
        setSelectedElement(hitElement)
        setIsDragging(true)
        setDragStart({ x: x - (hitElement.x || hitElement.x1 || 0), y: y - (hitElement.y || hitElement.y1 || 0) })
      } else {
        setSelectedElement(null)
      }
      return
    }

    // Text mode
    if (activeTool === TOOLS.TEXT) {
      setSelectedElement(null)
      setTextPosition({ x, y })
      setIsAddingText(true)
      return
    }

    // Link mode
    if (activeTool === TOOLS.LINK) {
      setSelectedElement(null)
      setLinkPosition({ x, y })
      setIsAddingLink(true)
      return
    }

    // Image mode
    if (activeTool === TOOLS.IMAGE) {
      setSelectedElement(null)
      fileInputRef.current?.click()
      return
    }

    // Eraser mode - only erase strokes and shapes, NOT images
    if (activeTool === TOOLS.ERASER) {
      const hitElement = findElementAtPoint(x, y)
      if (hitElement && hitElement.type !== 'image') {
        const newElements = currentPage.elements.filter(el => el.id !== hitElement.id)
        updatePageElements(newElements)
        if (selectedElement?.id === hitElement.id) setSelectedElement(null)
      }
      return
    }

    // Clear selection when drawing
    setSelectedElement(null)

    // Start drawing
    setIsDrawing(true)

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.HIGHLIGHTER) {
      setCurrentElement({
        id: generateId(),
        type: activeTool,
        color: strokeColor,
        width: strokeWidth,
        points: [[x, y, e.pressure || 0.5]],
      })
    } else if ([TOOLS.LINE, TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.ARROW].includes(activeTool)) {
      setCurrentElement({
        id: generateId(),
        type: activeTool,
        color: strokeColor,
        width: strokeWidth,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
      })
    }
  }

  // Get resize handle at point
  const getResizeHandleAtPoint = (element, x, y) => {
    if (!element || element.type !== 'image') return null
    const handleSize = 12 / scale
    const handles = {
      nw: { x: element.x, y: element.y },
      ne: { x: element.x + element.width, y: element.y },
      sw: { x: element.x, y: element.y + element.height },
      se: { x: element.x + element.width, y: element.y + element.height },
    }
    for (const [key, pos] of Object.entries(handles)) {
      if (Math.abs(x - pos.x) < handleSize && Math.abs(y - pos.y) < handleSize) {
        return key
      }
    }
    return null
  }

  // Handle pointer move
  const handlePointerMove = (e) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
      return
    }

    const { x, y } = getCanvasCoords(e)

    // Handle resizing
    if (isResizing && selectedElement && resizeHandle) {
      const dx = x - resizeStart.mouseX
      const dy = y - resizeStart.mouseY
      let newX = resizeStart.x
      let newY = resizeStart.y
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height

      // Maintain aspect ratio with shift key (optional)
      const aspectRatio = resizeStart.width / resizeStart.height

      if (resizeHandle.includes('e')) {
        newWidth = Math.max(50, resizeStart.width + dx)
      }
      if (resizeHandle.includes('w')) {
        newWidth = Math.max(50, resizeStart.width - dx)
        newX = resizeStart.x + (resizeStart.width - newWidth)
      }
      if (resizeHandle.includes('s')) {
        newHeight = Math.max(50, resizeStart.height + dy)
      }
      if (resizeHandle.includes('n')) {
        newHeight = Math.max(50, resizeStart.height - dy)
        newY = resizeStart.y + (resizeStart.height - newHeight)
      }

      // Update element in page
      const updatedElements = currentPage.elements.map(el =>
        el.id === selectedElement.id
          ? { ...el, x: newX, y: newY, width: newWidth, height: newHeight }
          : el
      )
      updatePageElements(updatedElements)
      setSelectedElement({ ...selectedElement, x: newX, y: newY, width: newWidth, height: newHeight })
      return
    }

    // Handle dragging selected element
    if (isDragging && selectedElement) {
      const newX = x - dragStart.x
      const newY = y - dragStart.y

      const updatedElements = currentPage.elements.map(el => {
        if (el.id !== selectedElement.id) return el

        if (el.type === 'image' || el.type === TOOLS.TEXT || el.type === TOOLS.LINK) {
          return { ...el, x: newX, y: newY }
        } else if (el.points) {
          // Move freehand strokes
          const offsetX = newX - (el.x || el.points[0]?.[0] || 0)
          const offsetY = newY - (el.y || el.points[0]?.[1] || 0)
          return {
            ...el,
            points: el.points.map(([px, py, pressure]) => [px + offsetX - (dragStart.x - (el.points[0]?.[0] || 0)), py + offsetY - (dragStart.y - (el.points[0]?.[1] || 0)), pressure])
          }
        } else if (el.x1 !== undefined) {
          // Move shapes
          const dx = newX - (el.x1 || 0)
          const dy = newY - (el.y1 || 0)
          return { ...el, x1: newX, y1: newY, x2: el.x2 + dx, y2: el.y2 + dy }
        }
        return el
      })
      updatePageElements(updatedElements)

      // Update selected element reference
      const updated = updatedElements.find(el => el.id === selectedElement.id)
      if (updated) setSelectedElement(updated)
      return
    }

    if (!isDrawing || !currentElement) return

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.HIGHLIGHTER) {
      setCurrentElement(prev => ({
        ...prev,
        points: [...prev.points, [x, y, e.pressure || 0.5]]
      }))
    } else {
      setCurrentElement(prev => ({
        ...prev,
        x2: x,
        y2: y
      }))
    }
  }

  // Handle pointer up
  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    // End resizing
    if (isResizing) {
      setIsResizing(false)
      setResizeHandle(null)
      return
    }

    // End dragging
    if (isDragging) {
      setIsDragging(false)
      return
    }

    if (!isDrawing || !currentElement) return

    setIsDrawing(false)

    // Check if valid
    let isValid = false
    if (currentElement.type === TOOLS.PEN || currentElement.type === TOOLS.HIGHLIGHTER) {
      isValid = currentElement.points.length > 2
    } else {
      const dx = Math.abs(currentElement.x2 - currentElement.x1)
      const dy = Math.abs(currentElement.y2 - currentElement.y1)
      isValid = dx > 5 || dy > 5
    }

    if (isValid) {
      updatePageElements([...currentPage.elements, currentElement])
    }

    setCurrentElement(null)
  }

  // Handle text submit
  const handleTextSubmit = () => {
    if (!textInput.trim() || !textPosition) return

    const newElement = {
      id: generateId(),
      type: TOOLS.TEXT,
      color: strokeColor,
      text: textInput.trim(),
      x: textPosition.x,
      y: textPosition.y,
      fontSize: strokeWidth * 4 + 12,
    }

    updatePageElements([...currentPage.elements, newElement])

    setTextInput('')
    setTextPosition(null)
    setIsAddingText(false)
  }

  // Handle link submit
  const handleLinkSubmit = () => {
    if (!linkInput.url.trim() || !linkPosition) return

    const newElement = {
      id: generateId(),
      type: TOOLS.LINK,
      url: linkInput.url.trim(),
      label: linkInput.label.trim() || linkInput.url.trim(),
      x: linkPosition.x,
      y: linkPosition.y,
    }

    updatePageElements([...currentPage.elements, newElement])

    setLinkInput({ url: '', label: '' })
    setLinkPosition(null)
    setIsAddingLink(false)
  }

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Upload to storage
      const fileName = `moleskine/${projectId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('renders')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('renders')
        .getPublicUrl(fileName)

      // Add image element at center of viewport
      const containerRect = containerRef.current?.getBoundingClientRect()
      const centerX = containerRect ? (containerRect.width / 2 - offset.x) / scale : canvasWidth / 2
      const centerY = containerRect ? (containerRect.height / 2 - offset.y) / scale : canvasHeight / 2

      const newElement = {
        id: generateId(),
        type: 'image',
        url: urlData.publicUrl,
        x: centerX - 150,
        y: centerY - 100,
        width: 300,
        height: 200,
      }

      updatePageElements([...currentPage.elements, newElement])
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      toast.error('Erro', 'Erro ao fazer upload da imagem')
    }

    e.target.value = ''
  }

  // Load project renders for picker
  const loadProjectRenders = async () => {
    if (!projectId) return

    setLoadingRenders(true)
    try {
      const { data: rendersData } = await supabase
        .from('projeto_renders')
        .select('id, compartimento, imagem_url')
        .eq('projeto_id', projectId)

      const { data: versoesData } = await supabase
        .from('projeto_render_versoes')
        .select('render_id, url')

      // Combine
      const renders = (rendersData || []).map(r => ({
        ...r,
        url: r.imagem_url || versoesData?.find(v => v.render_id === r.id)?.url
      })).filter(r => r.url)

      setProjectRenders(renders)
    } catch (err) {
      // Storage bucket may not exist
    } finally {
      setLoadingRenders(false)
    }
  }

  // Handle PDF import
  const handlePdfImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoadingPdf(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const numPages = pdf.numPages

      const newPages = []

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2 }) // Alta resolução

        // Criar canvas para renderizar página
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise

        // Converter para data URL
        const imageUrl = canvas.toDataURL('image/png')

        // Criar nova página com a imagem do PDF como fundo
        newPages.push({
          id: generateId(),
          elements: [],
          background: '#FFFFFF',
          backgroundImage: imageUrl,
          pdfPage: i,
          pdfName: file.name,
          createdAt: new Date().toISOString()
        })
      }

      // Adicionar todas as páginas do PDF
      setPages(prev => [...prev, ...newPages])
      setCurrentPageIndex(pages.length) // Ir para a primeira página do PDF
      setHasUnsavedChanges(true)

      // Inicializar histórico para novas páginas
      newPages.forEach(page => {
        setPageHistory(prev => ({ ...prev, [page.id]: [[]] }))
        setHistoryIndex(prev => ({ ...prev, [page.id]: 0 }))
      })

    } catch (err) {
      console.error('Erro ao importar PDF:', err)
      toast.error('Erro', 'Erro ao importar PDF. Verifique se o ficheiro é válido.')
    } finally {
      setLoadingPdf(false)
      e.target.value = ''
    }
  }

  // Add render from project
  const addRenderToPage = (render) => {
    const containerRect = containerRef.current?.getBoundingClientRect()
    const centerX = containerRect ? (containerRect.width / 2 - offset.x) / scale : canvasWidth / 2
    const centerY = containerRect ? (containerRect.height / 2 - offset.y) / scale : canvasHeight / 2

    const newElement = {
      id: generateId(),
      type: 'image',
      url: render.url,
      x: centerX - 200,
      y: centerY - 150,
      width: 400,
      height: 300,
      source: 'render',
      renderId: render.id,
    }

    updatePageElements([...currentPage.elements, newElement])
    setShowRenderPicker(false)
  }

  // Find element at point
  const findElementAtPoint = (x, y) => {
    const threshold = 15 / scale

    for (let i = currentPage.elements.length - 1; i >= 0; i--) {
      const el = currentPage.elements[i]

      if (el.type === TOOLS.PEN || el.type === TOOLS.HIGHLIGHTER) {
        for (const [px, py] of el.points) {
          const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
          if (dist < threshold + el.width) return el
        }
      } else if (el.type === 'image') {
        if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
          return el
        }
      } else if (el.type === TOOLS.TEXT || el.type === TOOLS.LINK) {
        const textWidth = (el.text || el.label || '').length * 10
        const textHeight = el.fontSize || 20
        if (x >= el.x && x <= el.x + textWidth && y >= el.y - textHeight && y <= el.y) {
          return el
        }
      } else if (el.type === TOOLS.RECTANGLE || el.type === TOOLS.CIRCLE) {
        const minX = Math.min(el.x1, el.x2)
        const maxX = Math.max(el.x1, el.x2)
        const minY = Math.min(el.y1, el.y2)
        const maxY = Math.max(el.y1, el.y2)
        if (x >= minX - threshold && x <= maxX + threshold &&
            y >= minY - threshold && y <= maxY + threshold) {
          return el
        }
      } else if (el.type === TOOLS.LINE || el.type === TOOLS.ARROW) {
        // Check distance to line segment
        const lineLength = Math.sqrt((el.x2 - el.x1) ** 2 + (el.y2 - el.y1) ** 2)
        if (lineLength > 0) {
          const t = Math.max(0, Math.min(1,
            ((x - el.x1) * (el.x2 - el.x1) + (y - el.y1) * (el.y2 - el.y1)) / (lineLength ** 2)
          ))
          const nearestX = el.x1 + t * (el.x2 - el.x1)
          const nearestY = el.y1 + t * (el.y2 - el.y1)
          const dist = Math.sqrt((x - nearestX) ** 2 + (y - nearestY) ** 2)
          if (dist < threshold + el.width) return el
        }
      }
    }

    return null
  }

  // Handle wheel zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(3, Math.max(0.2, scale * delta))

      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      setScale(newScale)
      setOffset({
        x: mouseX - (mouseX - offset.x) * (newScale / scale),
        y: mouseY - (mouseY - offset.y) * (newScale / scale)
      })
    }
  }

  // Render element
  const renderElement = (el) => {
    const key = el.id

    if (el.type === TOOLS.PEN) {
      const stroke = getStroke(el.points, getPenOptions(el.width))
      return (
        <path
          key={key}
          d={getSvgPathFromStroke(stroke)}
          fill={el.color}
        />
      )
    }

    if (el.type === TOOLS.HIGHLIGHTER) {
      const stroke = getStroke(el.points, getHighlighterOptions(el.width))
      return (
        <path
          key={key}
          d={getSvgPathFromStroke(stroke)}
          fill={el.color}
          opacity={0.3}
        />
      )
    }

    if (el.type === TOOLS.LINE) {
      return (
        <line
          key={key}
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke={el.color}
          strokeWidth={el.width}
          strokeLinecap="round"
        />
      )
    }

    if (el.type === TOOLS.RECTANGLE) {
      return (
        <rect
          key={key}
          x={Math.min(el.x1, el.x2)}
          y={Math.min(el.y1, el.y2)}
          width={Math.abs(el.x2 - el.x1)}
          height={Math.abs(el.y2 - el.y1)}
          fill="none"
          stroke={el.color}
          strokeWidth={el.width}
        />
      )
    }

    if (el.type === TOOLS.CIRCLE) {
      return (
        <ellipse
          key={key}
          cx={(el.x1 + el.x2) / 2}
          cy={(el.y1 + el.y2) / 2}
          rx={Math.abs(el.x2 - el.x1) / 2}
          ry={Math.abs(el.y2 - el.y1) / 2}
          fill="none"
          stroke={el.color}
          strokeWidth={el.width}
        />
      )
    }

    if (el.type === TOOLS.ARROW) {
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
      const headLength = 15
      return (
        <g key={key}>
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
            stroke={el.color} strokeWidth={el.width} strokeLinecap="round" />
          <line x1={el.x2} y1={el.y2}
            x2={el.x2 - headLength * Math.cos(angle - Math.PI / 6)}
            y2={el.y2 - headLength * Math.sin(angle - Math.PI / 6)}
            stroke={el.color} strokeWidth={el.width} strokeLinecap="round" />
          <line x1={el.x2} y1={el.y2}
            x2={el.x2 - headLength * Math.cos(angle + Math.PI / 6)}
            y2={el.y2 - headLength * Math.sin(angle + Math.PI / 6)}
            stroke={el.color} strokeWidth={el.width} strokeLinecap="round" />
        </g>
      )
    }

    if (el.type === TOOLS.TEXT) {
      return (
        <text key={key} x={el.x} y={el.y} fill={el.color}
          fontSize={el.fontSize} fontFamily="'Quattrocento Sans', sans-serif">
          {el.text}
        </text>
      )
    }

    if (el.type === TOOLS.LINK) {
      return (
        <a key={key} href={el.url} target="_blank" rel="noopener noreferrer">
          <text x={el.x} y={el.y} fill="#4338CA" fontSize={16}
            fontFamily="'Quattrocento Sans', sans-serif"
            textDecoration="underline" style={{ cursor: 'pointer' }}>
            {el.label}
          </text>
        </a>
      )
    }

    if (el.type === 'image') {
      return (
        <image key={key} href={el.url} x={el.x} y={el.y}
          width={el.width} height={el.height}
          preserveAspectRatio="xMidYMid meet" />
      )
    }

    return null
  }

  // Tool button
  const ToolButton = ({ tool, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTool(tool)}
      title={label}
      style={{
        width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, border: 'none',
        background: activeTool === tool ? '#8B8670' : 'transparent',
        color: activeTool === tool ? '#FFFFFF' : '#5F5C59',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <Icon size={20} />
    </button>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)',
      zIndex: 9999, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: '#F2F0E7', borderBottom: '1px solid #E0DED8',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <BookOpen size={24} style={{ color: '#8B8670' }} />
          <input
            type="text"
            value={notebookName}
            onChange={(e) => {
              setNotebookName(e.target.value)
              setHasUnsavedChanges(true)
            }}
            style={{
              fontSize: 18, fontWeight: 600, color: '#5F5C59',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              border: 'none', background: 'transparent', outline: 'none',
              minWidth: 200,
            }}
          />
          <span style={{ fontSize: 13, color: '#8B8670' }}>
            Página {currentPageIndex + 1} de {pages.length}
          </span>
          {hasUnsavedChanges && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: '#FEF3C7', color: '#D97706',
            }}>
              Por guardar
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => pdfInputRef.current?.click()}
            disabled={loadingPdf}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 6,
              border: '1px solid #E0DED8', background: '#FFFFFF',
              color: '#5F5C59', fontSize: 13, cursor: loadingPdf ? 'wait' : 'pointer',
              opacity: loadingPdf ? 0.7 : 1,
            }}
          >
            {loadingPdf ? <Loader2 size={16} className="animate-spin" /> : <FilePlus size={16} />}
            Importar PDF
          </button>
          <button
            onClick={() => {
              loadProjectRenders()
              setShowRenderPicker(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 6,
              border: '1px solid #E0DED8', background: '#FFFFFF',
              color: '#5F5C59', fontSize: 13, cursor: 'pointer',
            }}
          >
            <Layers size={16} />
            Importar Render
          </button>
          <button
            onClick={exportToPdf}
            disabled={isExporting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 6,
              border: '1px solid #E0DED8', background: '#FFFFFF',
              color: '#5F5C59', fontSize: 13, cursor: isExporting ? 'wait' : 'pointer',
              opacity: isExporting ? 0.7 : 1,
            }}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exportar PDF
          </button>
          <button
            onClick={saveNotebook}
            disabled={isSaving || !hasUnsavedChanges}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 6, border: 'none',
              background: hasUnsavedChanges ? '#8B8670' : '#E5E5E5',
              color: hasUnsavedChanges ? '#FFFFFF' : '#9CA3AF',
              fontSize: 13, cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
            }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar
          </button>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, border: '1px solid #E0DED8', background: '#FFFFFF',
              color: '#5F5C59', cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Toolbar */}
        <div style={{
          width: 60, background: '#F2F0E7', borderRight: '1px solid #E0DED8',
          padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <ToolButton tool={TOOLS.SELECT} icon={MousePointer2} label="Selecionar" />
          <ToolButton tool={TOOLS.PEN} icon={Pencil} label="Caneta" />
          <ToolButton tool={TOOLS.HIGHLIGHTER} icon={Highlighter} label="Marcador" />
          <ToolButton tool={TOOLS.LINE} icon={Minus} label="Linha" />
          <ToolButton tool={TOOLS.RECTANGLE} icon={Square} label="Retângulo" />
          <ToolButton tool={TOOLS.CIRCLE} icon={Circle} label="Círculo" />
          <ToolButton tool={TOOLS.ARROW} icon={ArrowUpRight} label="Seta" />
          <ToolButton tool={TOOLS.TEXT} icon={Type} label="Texto" />
          <ToolButton tool={TOOLS.LINK} icon={LinkIcon} label="Link" />
          <ToolButton tool={TOOLS.IMAGE} icon={ImageIcon} label="Imagem" />
          <ToolButton tool={TOOLS.ERASER} icon={Eraser} label="Borracha" />
          <ToolButton tool={TOOLS.PAN} icon={Move} label="Mover" />

          <div style={{ height: 1, background: '#E0DED8', margin: '8px 0' }} />

          {/* Colors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            {STROKE_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setStrokeColor(c.color)}
                title={c.name}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: strokeColor === c.color ? '2px solid #5F5C59' : '2px solid transparent',
                  background: c.color, cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ height: 1, background: '#E0DED8', margin: '8px 0' }} />

          {/* Stroke Width */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                style={{
                  width: 32, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, border: 'none',
                  background: strokeWidth === w ? '#E0DED8' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 20, height: w, borderRadius: w / 2, background: strokeColor }} />
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Undo/Redo */}
          <button onClick={handleUndo} title="Desfazer"
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: 'none', background: 'transparent',
              color: '#5F5C59', cursor: 'pointer' }}>
            <RotateCcw size={20} />
          </button>
          <button onClick={handleRedo} title="Refazer"
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: 'none', background: 'transparent',
              color: '#5F5C59', cursor: 'pointer' }}>
            <RotateCw size={20} />
          </button>

          <div style={{ height: 1, background: '#E0DED8', margin: '8px 0' }} />

          {/* Toggle Thumbnails */}
          <button onClick={() => setShowThumbnails(!showThumbnails)} title={showThumbnails ? 'Esconder Páginas' : 'Mostrar Páginas'}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: 'none', background: showThumbnails ? '#E0DED8' : 'transparent',
              color: '#5F5C59', cursor: 'pointer' }}>
            {showThumbnails ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          </button>
        </div>

        {/* Thumbnails Panel - GoodNotes style */}
        {showThumbnails && (
          <div style={{
            width: 180, background: '#F9F9F7', borderRight: '1px solid #E0DED8',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Panel Header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #E0DED8',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5F5C59' }}>Páginas</span>
              <span style={{ fontSize: 12, color: '#8B8670' }}>{pages.length}</span>
            </div>

            {/* Thumbnails List */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '12px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {pages.map((page, idx) => (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => handlePageDragStart(idx)}
                  onDragOver={(e) => handlePageDragOver(e, idx)}
                  onDragEnd={handlePageDragEnd}
                  onClick={() => setCurrentPageIndex(idx)}
                  style={{
                    cursor: 'grab', borderRadius: 8, overflow: 'hidden',
                    border: dragOverPageIndex === idx
                      ? '2px solid #4338CA'
                      : idx === currentPageIndex
                        ? '2px solid #8B8670'
                        : '2px solid transparent',
                    background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.15s',
                    opacity: draggedPageIndex === idx ? 0.5 : 1,
                    transform: dragOverPageIndex === idx ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {/* Drag Handle */}
                  <div style={{
                    padding: '4px 8px', background: '#F9F9F7', borderBottom: '1px solid #E0DED8',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8B8670' }}>
                      <GripVertical size={12} />
                      <span style={{ fontSize: 11 }}>Arrastar</span>
                    </div>
                    {pages.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(idx); }}
                        title="Apagar página"
                        style={{
                          width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#DC2626', opacity: 0.6, borderRadius: 4,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  {/* Thumbnail Preview */}
                  <div style={{
                    width: '100%', aspectRatio: '16/10', position: 'relative',
                    background: page.background || '#FFFFFF', overflow: 'hidden',
                  }}>
                    {page.backgroundImage ? (
                      <img src={page.backgroundImage} alt="" style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                      }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        backgroundImage: page.template === 'dots'
                          ? 'radial-gradient(#D0D0D0 1px, transparent 1px)'
                          : page.template === 'lines'
                            ? 'linear-gradient(transparent 31px, #E5E5E5 32px)'
                            : 'linear-gradient(#f0f0f0 1px, transparent 1px), linear-gradient(90deg, #f0f0f0 1px, transparent 1px)',
                        backgroundSize: page.template === 'dots' ? '8px 8px' : page.template === 'lines' ? '100% 8px' : '10px 10px',
                      }} />
                    )}
                    {/* Mini preview of elements */}
                    <svg style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      pointerEvents: 'none',
                    }} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} preserveAspectRatio="xMidYMid meet">
                      {page.elements.slice(0, 50).map(el => {
                        if (el.type === TOOLS.PEN || el.type === TOOLS.HIGHLIGHTER) {
                          if (!el.points || el.points.length < 2) return null
                          const pathData = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
                          return <path key={el.id} d={pathData} stroke={el.color} strokeWidth={el.width * 2} fill="none" opacity={el.type === TOOLS.HIGHLIGHTER ? 0.3 : 1} />
                        }
                        if (el.type === TOOLS.RECTANGLE) {
                          return <rect key={el.id} x={Math.min(el.x1, el.x2)} y={Math.min(el.y1, el.y2)}
                            width={Math.abs(el.x2 - el.x1)} height={Math.abs(el.y2 - el.y1)}
                            fill="none" stroke={el.color} strokeWidth={el.width * 2} />
                        }
                        if (el.type === 'image') {
                          return <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height}
                            fill="#E0E7FF" stroke="#4338CA" strokeWidth={4} />
                        }
                        return null
                      })}
                    </svg>
                  </div>
                  {/* Page Info */}
                  <div style={{
                    padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: idx === currentPageIndex ? '#F2F0E7' : '#FFFFFF',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: idx === currentPageIndex ? 600 : 400, color: '#5F5C59' }}>
                      {idx + 1}
                    </span>
                    {page.template && page.template !== 'blank' && (
                      <span style={{ fontSize: 10, color: '#8B8670', textTransform: 'capitalize' }}>
                        {page.template}
                      </span>
                    )}
                    {page.pdfName && (
                      <span style={{ fontSize: 10, color: '#8B8670', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        PDF p.{page.pdfPage}
                      </span>
                    )}
                    {!page.pdfName && !page.template && page.elements.length > 0 && (
                      <span style={{ fontSize: 10, color: '#8B8670' }}>
                        {page.elements.length} elem.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Page Button */}
            <div style={{ padding: '12px', borderTop: '1px solid #E0DED8' }}>
              <button onClick={() => setShowTemplateModal(true)}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  border: '2px dashed #E0DED8', background: 'transparent',
                  color: '#8B8670', fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <Plus size={16} />
                Nova Página
              </button>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div
          ref={containerRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            background: '#2a2a2a',
            cursor: activeTool === TOOLS.PAN || isPanning ? 'grab'
              : activeTool === TOOLS.ERASER ? 'crosshair'
              : activeTool === TOOLS.TEXT ? 'text' : 'crosshair',
          }}
        >
          {/* Canvas */}
          <div style={{
            position: 'absolute',
            left: offset.x, top: offset.y,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}>
            <div style={{
              width: canvasWidth, height: canvasHeight,
              background: currentPage.background || '#FFFFFF',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              position: 'relative',
            }}>
              {/* Background image (PDF) */}
              {currentPage.backgroundImage && (
                <img
                  src={currentPage.backgroundImage}
                  alt="Fundo"
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100%', height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <svg width={canvasWidth} height={canvasHeight} style={{ position: 'relative', zIndex: 1 }}>
                {/* Template patterns (only show if no background image) */}
                {!currentPage.backgroundImage && (
                  <>
                    <defs>
                      {/* Grid pattern */}
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="1"/>
                      </pattern>
                      {/* Lines pattern */}
                      <pattern id="lines" width="100%" height="32" patternUnits="userSpaceOnUse">
                        <line x1="60" y1="32" x2={canvasWidth - 60} y2="32" stroke="#E5E5E5" strokeWidth="1"/>
                      </pattern>
                      {/* Dots pattern */}
                      <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
                        <circle cx="15" cy="15" r="2" fill="#D0D0D0"/>
                      </pattern>
                    </defs>
                    {/* Render template based on page template */}
                    {(!currentPage.template || currentPage.template === 'blank' || currentPage.template === 'grid') && (
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    )}
                    {currentPage.template === 'lines' && (
                      <rect width="100%" height="100%" fill="url(#lines)" />
                    )}
                    {currentPage.template === 'dots' && (
                      <rect width="100%" height="100%" fill="url(#dots)" />
                    )}
                    {currentPage.template === 'cornell' && (
                      <>
                        <rect width="100%" height="100%" fill="url(#lines)" />
                        <line x1="200" y1="0" x2="200" y2={canvasHeight} stroke="#D0D0D0" strokeWidth="2"/>
                        <line x1="0" y1={canvasHeight - 200} x2={canvasWidth} y2={canvasHeight - 200} stroke="#D0D0D0" strokeWidth="2"/>
                      </>
                    )}
                  </>
                )}

                {currentPage.elements.map(renderElement)}
                {currentElement && renderElement(currentElement)}

                {/* Selection highlight and resize handles */}
                {selectedElement && activeTool === TOOLS.SELECT && (
                  <>
                    {/* Selection box */}
                    {selectedElement.type === 'image' && (
                      <>
                        <rect
                          x={selectedElement.x - 2}
                          y={selectedElement.y - 2}
                          width={selectedElement.width + 4}
                          height={selectedElement.height + 4}
                          fill="none"
                          stroke="#4338CA"
                          strokeWidth={2}
                          strokeDasharray="5,5"
                        />
                        {/* Resize handles */}
                        {['nw', 'ne', 'sw', 'se'].map(handle => {
                          const hx = handle.includes('e') ? selectedElement.x + selectedElement.width : selectedElement.x
                          const hy = handle.includes('s') ? selectedElement.y + selectedElement.height : selectedElement.y
                          return (
                            <rect
                              key={handle}
                              x={hx - 6}
                              y={hy - 6}
                              width={12}
                              height={12}
                              fill="#FFFFFF"
                              stroke="#4338CA"
                              strokeWidth={2}
                              style={{ cursor: `${handle}-resize` }}
                            />
                          )
                        })}
                      </>
                    )}
                    {/* Selection for other elements */}
                    {selectedElement.type !== 'image' && selectedElement.x1 !== undefined && (
                      <rect
                        x={Math.min(selectedElement.x1, selectedElement.x2) - 4}
                        y={Math.min(selectedElement.y1, selectedElement.y2) - 4}
                        width={Math.abs(selectedElement.x2 - selectedElement.x1) + 8}
                        height={Math.abs(selectedElement.y2 - selectedElement.y1) + 8}
                        fill="none"
                        stroke="#4338CA"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                      />
                    )}
                    {selectedElement.type === TOOLS.TEXT && (
                      <rect
                        x={selectedElement.x - 4}
                        y={selectedElement.y - (selectedElement.fontSize || 20) - 4}
                        width={(selectedElement.text?.length || 1) * 12 + 8}
                        height={(selectedElement.fontSize || 20) + 8}
                        fill="none"
                        stroke="#4338CA"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                      />
                    )}
                  </>
                )}
              </svg>
            </div>
          </div>

          {/* Floating Toolbar */}
          {showFloatingToolbar && (
            <div style={{
              position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 4, alignItems: 'center',
              background: 'rgba(255,255,255,0.95)', padding: '8px 12px', borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)',
            }}>
              {/* Quick tool selection */}
              <button onClick={() => setActiveTool(TOOLS.PEN)} title="Caneta"
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, border: 'none', background: activeTool === TOOLS.PEN ? '#E0DED8' : 'transparent',
                  cursor: 'pointer' }}>
                <Pencil size={18} color={activeTool === TOOLS.PEN ? '#5F5C59' : '#8B8670'} />
              </button>
              <button onClick={() => setActiveTool(TOOLS.HIGHLIGHTER)} title="Marcador"
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, border: 'none', background: activeTool === TOOLS.HIGHLIGHTER ? '#E0DED8' : 'transparent',
                  cursor: 'pointer' }}>
                <Highlighter size={18} color={activeTool === TOOLS.HIGHLIGHTER ? '#5F5C59' : '#8B8670'} />
              </button>
              <button onClick={() => setActiveTool(TOOLS.ERASER)} title="Borracha"
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, border: 'none', background: activeTool === TOOLS.ERASER ? '#E0DED8' : 'transparent',
                  cursor: 'pointer' }}>
                <Eraser size={18} color={activeTool === TOOLS.ERASER ? '#5F5C59' : '#8B8670'} />
              </button>

              <div style={{ width: 1, height: 24, background: '#E0DED8', margin: '0 4px' }} />

              {/* Quick colors */}
              {STROKE_COLORS.slice(0, 5).map(c => (
                <button
                  key={c.id}
                  onClick={() => setStrokeColor(c.color)}
                  title={c.name}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: strokeColor === c.color ? '2px solid #5F5C59' : '2px solid #E0DED8',
                    background: c.color, cursor: 'pointer',
                  }}
                />
              ))}

              <div style={{ width: 1, height: 24, background: '#E0DED8', margin: '0 4px' }} />

              {/* Quick stroke widths */}
              {[2, 4, 8].map(w => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4, border: 'none',
                    background: strokeWidth === w ? '#E0DED8' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 16, height: w, borderRadius: w / 2, background: strokeColor }} />
                </button>
              ))}

              <div style={{ width: 1, height: 24, background: '#E0DED8', margin: '0 4px' }} />

              {/* Close floating toolbar */}
              <button onClick={() => setShowFloatingToolbar(false)} title="Esconder"
                style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={14} color="#8B8670" />
              </button>
            </div>
          )}

          {/* Show floating toolbar button */}
          {!showFloatingToolbar && (
            <button
              onClick={() => setShowFloatingToolbar(true)}
              style={{
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                padding: '8px 16px', borderRadius: 8, border: '1px solid #E0DED8',
                background: 'rgba(255,255,255,0.95)', fontSize: 12, color: '#5F5C59',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              Mostrar Toolbar
            </button>
          )}

          {/* Text Input Modal */}
          {isAddingText && textPosition && (
            <div
              style={{
                position: 'absolute',
                left: textPosition.x * scale + offset.x,
                top: textPosition.y * scale + offset.y,
                transform: 'translate(-50%, -100%)',
                background: '#FFFFFF', borderRadius: 8, padding: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 100,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit()
                  if (e.key === 'Escape') { setIsAddingText(false); setTextPosition(null); setTextInput('') }
                }}
                autoFocus
                placeholder="Escreva aqui..."
                style={{
                  width: 200, padding: '8px 12px', borderRadius: 6,
                  border: '1px solid #E0DED8', fontSize: 14, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => { setIsAddingText(false); setTextPosition(null); setTextInput('') }}
                  style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #E0DED8',
                    background: '#FFFFFF', fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleTextSubmit} disabled={!textInput.trim()}
                  style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none',
                    background: textInput.trim() ? '#8B8670' : '#E5E5E5',
                    color: textInput.trim() ? '#FFFFFF' : '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* Link Input Modal */}
          {isAddingLink && linkPosition && (
            <div
              style={{
                position: 'absolute',
                left: linkPosition.x * scale + offset.x,
                top: linkPosition.y * scale + offset.y,
                transform: 'translate(-50%, -100%)',
                background: '#FFFFFF', borderRadius: 8, padding: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 100,
                minWidth: 280,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={linkInput.url}
                onChange={(e) => setLinkInput(prev => ({ ...prev, url: e.target.value }))}
                autoFocus
                placeholder="https://..."
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  border: '1px solid #E0DED8', fontSize: 14, outline: 'none', marginBottom: 8,
                }}
              />
              <input
                type="text"
                value={linkInput.label}
                onChange={(e) => setLinkInput(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Texto do link (opcional)"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  border: '1px solid #E0DED8', fontSize: 14, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => { setIsAddingLink(false); setLinkPosition(null); setLinkInput({ url: '', label: '' }) }}
                  style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #E0DED8',
                    background: '#FFFFFF', fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleLinkSubmit} disabled={!linkInput.url.trim()}
                  style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none',
                    background: linkInput.url.trim() ? '#4338CA' : '#E5E5E5',
                    color: linkInput.url.trim() ? '#FFFFFF' : '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
                  Adicionar Link
                </button>
              </div>
            </div>
          )}

          {/* Page Navigation */}
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#F2F0E7', padding: '8px 16px', borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            <button onClick={() => goToPage(currentPageIndex - 1)} disabled={currentPageIndex === 0}
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, border: '1px solid #E0DED8', background: '#FFFFFF',
                cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
                color: currentPageIndex === 0 ? '#D1D5DB' : '#5F5C59' }}>
              <ChevronLeft size={18} />
            </button>

            <button onClick={() => setShowPagesList(!showPagesList)}
              style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #E0DED8',
                background: '#FFFFFF', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5F5C59' }}>
              {currentPageIndex + 1} / {pages.length}
            </button>

            <button onClick={() => goToPage(currentPageIndex + 1)} disabled={currentPageIndex === pages.length - 1}
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, border: '1px solid #E0DED8', background: '#FFFFFF',
                cursor: currentPageIndex === pages.length - 1 ? 'not-allowed' : 'pointer',
                color: currentPageIndex === pages.length - 1 ? '#D1D5DB' : '#5F5C59' }}>
              <ChevronRight size={18} />
            </button>

            <div style={{ width: 1, height: 24, background: '#E0DED8', margin: '0 4px' }} />

            <button onClick={() => setShowTemplateModal(true)} title="Nova Página"
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, border: 'none', background: '#8B8670', color: '#FFFFFF', cursor: 'pointer' }}>
              <Plus size={18} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div style={{
            position: 'absolute', bottom: 20, right: 20,
            display: 'flex', gap: 6, alignItems: 'center',
            background: '#F2F0E7', padding: '8px 12px', borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, border: '1px solid #E0DED8', background: '#FFFFFF', cursor: 'pointer' }}>
              <ZoomOut size={16} />
            </button>

            {/* Preset zoom levels */}
            <div style={{ display: 'flex', gap: 2 }}>
              {[0.5, 0.75, 1, 1.5, 2].map(level => (
                <button
                  key={level}
                  onClick={() => {
                    setScale(level)
                    // Center after zoom change
                    if (containerRef.current) {
                      setOffset({
                        x: (containerRef.current.clientWidth - canvasWidth * level) / 2,
                        y: (containerRef.current.clientHeight - canvasHeight * level) / 2
                      })
                    }
                  }}
                  style={{
                    padding: '4px 8px', borderRadius: 4, border: 'none',
                    background: Math.abs(scale - level) < 0.05 ? '#8B8670' : 'transparent',
                    color: Math.abs(scale - level) < 0.05 ? '#FFFFFF' : '#5F5C59',
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {level * 100}%
                </button>
              ))}
            </div>

            <button onClick={() => setScale(s => Math.min(3, s + 0.25))}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, border: '1px solid #E0DED8', background: '#FFFFFF', cursor: 'pointer' }}>
              <ZoomIn size={16} />
            </button>

            <div style={{ width: 1, height: 20, background: '#E0DED8' }} />

            <button onClick={fitToScreen} title="Ajustar à janela (⌘0)"
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, border: '1px solid #E0DED8', background: '#FFFFFF', cursor: 'pointer' }}>
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          hidden
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handlePdfImport}
          hidden
        />
      </div>

      {/* Render Picker Modal */}
      {showRenderPicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }} onClick={() => setShowRenderPicker(false)}>
          <div style={{
            background: '#FFFFFF', borderRadius: 12, padding: 24,
            maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#5F5C59' }}>Importar Render do Projeto</h3>
              <button onClick={() => setShowRenderPicker(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F5C59' }}>
                <X size={20} />
              </button>
            </div>

            {loadingRenders ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8B8670' }}>
                <Loader2 size={32} className="animate-spin" />
                <p>A carregar renders...</p>
              </div>
            ) : projectRenders.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8B8670' }}>
                <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p>Nenhum render disponível neste projeto</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {projectRenders.map(render => (
                  <div
                    key={render.id}
                    onClick={() => addRenderToPage(render)}
                    style={{
                      borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      border: '2px solid transparent', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8B8670'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    <img src={render.url} alt={render.compartimento}
                      style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                    <div style={{ padding: 8, background: '#F9F9F7', fontSize: 12, color: '#5F5C59' }}>
                      {render.compartimento || 'Render'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pages List Modal */}
      {showPagesList && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }} onClick={() => setShowPagesList(false)}>
          <div style={{
            background: '#FFFFFF', borderRadius: 12, padding: 24,
            maxWidth: 400, width: '90%', maxHeight: '80vh', overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#5F5C59' }}>Páginas</h3>
              <button onClick={() => setShowPagesList(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F5C59' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pages.map((page, idx) => (
                <div key={page.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 8,
                    background: idx === currentPageIndex ? '#F2F0E7' : '#FFFFFF',
                    border: '1px solid #E0DED8', cursor: 'pointer',
                  }}
                  onClick={() => { goToPage(idx); setShowPagesList(false) }}>
                  <span style={{ fontWeight: idx === currentPageIndex ? 600 : 400, color: '#5F5C59' }}>
                    Página {idx + 1}
                  </span>
                  <span style={{ fontSize: 12, color: '#8B8670' }}>
                    {page.elements.length} elementos
                  </span>
                </div>
              ))}
            </div>

            <button onClick={() => { setShowTemplateModal(true); setShowPagesList(false) }}
              style={{
                width: '100%', marginTop: 12, padding: '12px', borderRadius: 8,
                border: '2px dashed #E0DED8', background: 'transparent',
                color: '#8B8670', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <Plus size={18} />
              Adicionar Página
            </button>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }} onClick={() => setShowTemplateModal(false)}>
          <div style={{
            background: '#FFFFFF', borderRadius: 12, padding: 24,
            maxWidth: 500, width: '90%',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#5F5C59' }}>Nova Página</h3>
              <button onClick={() => setShowTemplateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F5C59' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: '#8B8670', marginBottom: 16 }}>
              Escolhe um template para a nova página:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {PAGE_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => addNewPage(template.id)}
                  style={{
                    padding: '16px 12px', borderRadius: 8,
                    border: '2px solid #E0DED8', background: '#FFFFFF',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#8B8670'
                    e.currentTarget.style.background = '#F9F9F7'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E0DED8'
                    e.currentTarget.style.background = '#FFFFFF'
                  }}
                >
                  {/* Template Preview */}
                  <div style={{
                    width: 80, height: 50, borderRadius: 4, overflow: 'hidden',
                    border: '1px solid #E0DED8', background: '#FFFFFF',
                  }}>
                    {template.id === 'blank' && (
                      <div style={{ width: '100%', height: '100%', background: '#FFFFFF' }} />
                    )}
                    {template.id === 'grid' && (
                      <div style={{
                        width: '100%', height: '100%',
                        backgroundImage: 'linear-gradient(#E5E5E5 1px, transparent 1px), linear-gradient(90deg, #E5E5E5 1px, transparent 1px)',
                        backgroundSize: '8px 8px',
                      }} />
                    )}
                    {template.id === 'lines' && (
                      <div style={{
                        width: '100%', height: '100%',
                        backgroundImage: 'linear-gradient(transparent 7px, #E5E5E5 8px)',
                        backgroundSize: '100% 8px',
                      }} />
                    )}
                    {template.id === 'dots' && (
                      <div style={{
                        width: '100%', height: '100%',
                        backgroundImage: 'radial-gradient(#D0D0D0 1.5px, transparent 1.5px)',
                        backgroundSize: '8px 8px',
                      }} />
                    )}
                    {template.id === 'cornell' && (
                      <div style={{
                        width: '100%', height: '100%', position: 'relative',
                        backgroundImage: 'linear-gradient(transparent 7px, #E5E5E5 8px)',
                        backgroundSize: '100% 8px',
                      }}>
                        <div style={{
                          position: 'absolute', left: '25%', top: 0, bottom: 0,
                          width: 2, background: '#D0D0D0',
                        }} />
                        <div style={{
                          position: 'absolute', left: 0, right: 0, bottom: '30%',
                          height: 2, background: '#D0D0D0',
                        }} />
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: '#5F5C59', fontWeight: 500 }}>
                    {template.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001,
        }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{
            background: '#FFFFFF', borderRadius: 12, padding: 24,
            maxWidth: 400, width: '90%',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#FEE2E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={20} color="#DC2626" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#5F5C59', marginBottom: 4 }}>
                  Apagar Página {showDeleteConfirm + 1}?
                </h3>
                <p style={{ fontSize: 13, color: '#8B8670' }}>
                  Esta ação não pode ser revertida.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8,
                  border: '1px solid #E0DED8', background: '#FFFFFF',
                  color: '#5F5C59', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => deletePage(showDeleteConfirm)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8,
                  border: 'none', background: '#DC2626',
                  color: '#FFFFFF', fontSize: 14, cursor: 'pointer',
                }}
              >
                Apagar Página
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
