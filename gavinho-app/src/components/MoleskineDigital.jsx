import { useState, useEffect, useRef, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import * as pdfjsLib from 'pdfjs-dist'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
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
  FilePlus
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
const createBlankPage = () => ({
  id: generateId(),
  elements: [],
  background: '#FFFFFF',
  createdAt: new Date().toISOString()
})

export default function MoleskineDigital({ projectId, projectName, onClose }) {
  const { profile } = useAuth()
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
          console.error('Erro ao carregar moleskine:', error)
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
        console.error('Erro ao carregar moleskine:', err)
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
  const addNewPage = () => {
    const newPage = createBlankPage()
    setPages([...pages, newPage])
    setCurrentPageIndex(pages.length)
    setPageHistory(prev => ({ ...prev, [newPage.id]: [[]] }))
    setHistoryIndex(prev => ({ ...prev, [newPage.id]: 0 }))
    setHasUnsavedChanges(true)
  }

  const deletePage = (index) => {
    if (pages.length <= 1) return
    const newPages = pages.filter((_, i) => i !== index)
    setPages(newPages)
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(newPages.length - 1)
    }
    setHasUnsavedChanges(true)
  }

  const goToPage = (index) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index)
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

    // Text mode
    if (activeTool === TOOLS.TEXT) {
      setTextPosition({ x, y })
      setIsAddingText(true)
      return
    }

    // Link mode
    if (activeTool === TOOLS.LINK) {
      setLinkPosition({ x, y })
      setIsAddingLink(true)
      return
    }

    // Image mode
    if (activeTool === TOOLS.IMAGE) {
      fileInputRef.current?.click()
      return
    }

    // Eraser mode
    if (activeTool === TOOLS.ERASER) {
      const hitElement = findElementAtPoint(x, y)
      if (hitElement) {
        const newElements = currentPage.elements.filter(el => el.id !== hitElement.id)
        updatePageElements(newElements)
      }
      return
    }

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
    } else if ([TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.ARROW].includes(activeTool)) {
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

  // Handle pointer move
  const handlePointerMove = (e) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
      return
    }

    if (!isDrawing || !currentElement) return

    const { x, y } = getCanvasCoords(e)

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
      alert('Erro ao fazer upload da imagem')
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
      console.error('Erro ao carregar renders:', err)
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
      alert('Erro ao importar PDF. Verifique se o ficheiro é válido.')
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
      } else if (el.type === TOOLS.RECTANGLE) {
        const minX = Math.min(el.x1, el.x2)
        const maxX = Math.max(el.x1, el.x2)
        const minY = Math.min(el.y1, el.y2)
        const maxY = Math.max(el.y1, el.y2)
        if (x >= minX - threshold && x <= maxX + threshold &&
            y >= minY - threshold && y <= maxY + threshold) {
          return el
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
                  onClick={() => setCurrentPageIndex(idx)}
                  style={{
                    cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                    border: idx === currentPageIndex ? '2px solid #8B8670' : '2px solid transparent',
                    background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.15s',
                  }}
                >
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
                        backgroundImage: 'linear-gradient(#f0f0f0 1px, transparent 1px), linear-gradient(90deg, #f0f0f0 1px, transparent 1px)',
                        backgroundSize: '10px 10px',
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
                    {page.pdfName && (
                      <span style={{ fontSize: 10, color: '#8B8670', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        PDF p.{page.pdfPage}
                      </span>
                    )}
                    {!page.pdfName && page.elements.length > 0 && (
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
              <button onClick={addNewPage}
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
                {/* Grid pattern (only show if no background image) */}
                {!currentPage.backgroundImage && (
                  <>
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </>
                )}

                {currentPage.elements.map(renderElement)}
                {currentElement && renderElement(currentElement)}
              </svg>
            </div>
          </div>

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

            <button onClick={addNewPage} title="Nova Página"
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, border: 'none', background: '#8B8670', color: '#FFFFFF', cursor: 'pointer' }}>
              <Plus size={18} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div style={{
            position: 'absolute', bottom: 20, right: 20,
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#F2F0E7', padding: '8px 12px', borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            <button onClick={() => setScale(s => Math.max(0.2, s - 0.25))}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, border: '1px solid #E0DED8', background: '#FFFFFF', cursor: 'pointer' }}>
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 50, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.25))}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, border: '1px solid #E0DED8', background: '#FFFFFF', cursor: 'pointer' }}>
              <ZoomIn size={16} />
            </button>
            <button onClick={fitToScreen} title="Ajustar"
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

            <button onClick={() => { addNewPage(); setShowPagesList(false) }}
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
    </div>
  )
}
