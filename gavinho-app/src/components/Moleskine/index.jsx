import { useState, useEffect, useRef, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Pencil,
  Highlighter,
  Square,
  Circle,
  ArrowUpRight,
  Type,
  Eraser,
  MousePointer2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Download,
  Trash2,
  X,
  Save,
  Check,
  Loader2,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2
} from 'lucide-react'

// Cores por categoria (consistente com Design Review)
const STROKE_COLORS = [
  { id: 'design', name: 'Design', color: '#4338CA', bg: '#E0E7FF' },
  { id: 'technical', name: 'Tecnico', color: '#D97706', bg: '#FEF3C7' },
  { id: 'dimension', name: 'Cota', color: '#16A34A', bg: '#DCFCE7' },
  { id: 'black', name: 'Preto', color: '#000000', bg: '#F3F4F6' },
  { id: 'red', name: 'Vermelho', color: '#DC2626', bg: '#FEE2E2' },
]

// Ferramentas disponiveis
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
}

// Espessuras de linha
const STROKE_WIDTHS = [2, 4, 6, 8]

// Opcoes do perfect-freehand para tracos naturais
const getPenOptions = (size, pressure = true) => ({
  size,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: !pressure,
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

// Converte pontos do perfect-freehand para path SVG
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

// Gera ID unico para anotacoes
function generateAnnotationId() {
  return 'ann_' + Math.random().toString(36).substr(2, 9)
}

export default function Moleskine({
  projectId,
  renderId,
  renderImageUrl,
  renderName,
  onClose,
  onSave
}) {
  const { user, profile } = useAuth()
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  // Tool state
  const [activeTool, setActiveTool] = useState(TOOLS.PEN)
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0].color)
  const [strokeWidth, setStrokeWidth] = useState(4)

  // Annotations state
  const [annotations, setAnnotations] = useState([])
  const [currentAnnotation, setCurrentAnnotation] = useState(null)

  // History state (undo/redo)
  const [history, setHistory] = useState([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Zoom and pan state
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState(null)

  // Image state
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  // Text input state
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState(null)
  const [isAddingText, setIsAddingText] = useState(false)

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  // Load background image
  useEffect(() => {
    if (renderImageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
        imageRef.current = img
        setImageLoaded(true)
        // Fit to screen initially
        fitToScreen()
      }
      img.onerror = () => {
        console.error('Erro ao carregar imagem')
      }
      img.src = renderImageUrl
    }
  }, [renderImageUrl])

  // Load existing annotations
  useEffect(() => {
    const loadAnnotations = async () => {
      if (!projectId || !renderId) return

      try {
        const { data, error } = await supabase
          .from('render_annotations')
          .select('*')
          .eq('projeto_id', projectId)
          .eq('render_id', renderId)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar anotacoes:', error)
          return
        }

        if (data?.annotations) {
          setAnnotations(data.annotations)
          setHistory([data.annotations])
          setHistoryIndex(0)
        }
      } catch (err) {
        console.error('Erro ao carregar anotacoes:', err)
      }
    }

    loadAnnotations()
  }, [projectId, renderId])

  // Fit image to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !imageDimensions.width) return

    const container = containerRef.current
    const containerWidth = container.clientWidth - 120 // Leave space for toolbar
    const containerHeight = container.clientHeight - 80

    const scaleX = containerWidth / imageDimensions.width
    const scaleY = containerHeight / imageDimensions.height
    const newScale = Math.min(scaleX, scaleY, 1) // Max 100%

    setScale(newScale)
    setOffset({
      x: (containerWidth - imageDimensions.width * newScale) / 2 + 60,
      y: (containerHeight - imageDimensions.height * newScale) / 2 + 40
    })
  }, [imageDimensions])

  // Handle resize
  useEffect(() => {
    const handleResize = () => fitToScreen()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [fitToScreen])

  // Save annotations to database
  const saveAnnotations = async () => {
    if (!projectId || !renderId) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('render_annotations')
        .upsert({
          projeto_id: projectId,
          render_id: renderId,
          render_url: renderImageUrl,
          annotations: annotations,
          canvas_width: imageDimensions.width,
          canvas_height: imageDimensions.height,
          updated_by: profile?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'projeto_id,render_id'
        })

      if (error) throw error

      setHasUnsavedChanges(false)
      onSave?.()
    } catch (err) {
      console.error('Erro ao guardar:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges || annotations.length === 0) return

    const saveTimeout = setTimeout(() => {
      saveAnnotations()
    }, 3000) // 3 seconds debounce

    return () => clearTimeout(saveTimeout)
  }, [annotations, hasUnsavedChanges])

  // Push to history
  const pushToHistory = (newAnnotations) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newAnnotations)
    // Keep max 50 history items
    if (newHistory.length > 50) newHistory.shift()
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations(history[historyIndex - 1])
      setHasUnsavedChanges(true)
    }
  }

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations(history[historyIndex + 1])
      setHasUnsavedChanges(true)
    }
  }

  // Clear all annotations
  const handleClearAll = () => {
    const newAnnotations = []
    setAnnotations(newAnnotations)
    pushToHistory(newAnnotations)
    setHasUnsavedChanges(true)
    setShowConfirmClear(false)
  }

  // Get canvas coordinates from mouse/touch event
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
    if (!imageLoaded) return

    const { x, y } = getCanvasCoords(e)

    // Pan mode
    if (activeTool === TOOLS.PAN || (e.altKey && !isDrawing)) {
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

    // Eraser mode
    if (activeTool === TOOLS.ERASER) {
      const hitAnnotation = findAnnotationAtPoint(x, y)
      if (hitAnnotation) {
        const newAnnotations = annotations.filter(a => a.id !== hitAnnotation.id)
        setAnnotations(newAnnotations)
        pushToHistory(newAnnotations)
        setHasUnsavedChanges(true)
      }
      return
    }

    // Start drawing
    setIsDrawing(true)
    setStartPoint({ x, y })

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.HIGHLIGHTER) {
      setCurrentAnnotation({
        id: generateAnnotationId(),
        type: activeTool,
        color: strokeColor,
        width: strokeWidth,
        points: [[x, y, e.pressure || 0.5]],
        createdBy: profile?.id,
        createdAt: new Date().toISOString()
      })
    } else if (activeTool === TOOLS.RECTANGLE || activeTool === TOOLS.CIRCLE || activeTool === TOOLS.ARROW) {
      setCurrentAnnotation({
        id: generateAnnotationId(),
        type: activeTool,
        color: strokeColor,
        width: strokeWidth,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        createdBy: profile?.id,
        createdAt: new Date().toISOString()
      })
    }
  }

  // Handle pointer move
  const handlePointerMove = (e) => {
    // Panning
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
      return
    }

    if (!isDrawing || !currentAnnotation) return

    const { x, y } = getCanvasCoords(e)

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.HIGHLIGHTER) {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: [...prev.points, [x, y, e.pressure || 0.5]]
      }))
    } else if (activeTool === TOOLS.RECTANGLE || activeTool === TOOLS.CIRCLE || activeTool === TOOLS.ARROW) {
      setCurrentAnnotation(prev => ({
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

    if (!isDrawing || !currentAnnotation) return

    setIsDrawing(false)

    // Check if annotation is valid (has meaningful size)
    let isValid = false
    if (currentAnnotation.type === TOOLS.PEN || currentAnnotation.type === TOOLS.HIGHLIGHTER) {
      isValid = currentAnnotation.points.length > 2
    } else if (currentAnnotation.type === TOOLS.RECTANGLE || currentAnnotation.type === TOOLS.CIRCLE) {
      const dx = Math.abs(currentAnnotation.x2 - currentAnnotation.x1)
      const dy = Math.abs(currentAnnotation.y2 - currentAnnotation.y1)
      isValid = dx > 5 || dy > 5
    } else if (currentAnnotation.type === TOOLS.ARROW) {
      const dx = currentAnnotation.x2 - currentAnnotation.x1
      const dy = currentAnnotation.y2 - currentAnnotation.y1
      isValid = Math.sqrt(dx * dx + dy * dy) > 10
    }

    if (isValid) {
      const newAnnotations = [...annotations, currentAnnotation]
      setAnnotations(newAnnotations)
      pushToHistory(newAnnotations)
      setHasUnsavedChanges(true)
    }

    setCurrentAnnotation(null)
    setStartPoint(null)
  }

  // Handle text submit
  const handleTextSubmit = () => {
    if (!textInput.trim() || !textPosition) return

    const newAnnotation = {
      id: generateAnnotationId(),
      type: TOOLS.TEXT,
      color: strokeColor,
      text: textInput.trim(),
      x: textPosition.x,
      y: textPosition.y,
      fontSize: strokeWidth * 4 + 8,
      createdBy: profile?.id,
      createdAt: new Date().toISOString()
    }

    const newAnnotations = [...annotations, newAnnotation]
    setAnnotations(newAnnotations)
    pushToHistory(newAnnotations)
    setHasUnsavedChanges(true)

    setTextInput('')
    setTextPosition(null)
    setIsAddingText(false)
  }

  // Find annotation at point (for eraser)
  const findAnnotationAtPoint = (x, y) => {
    const threshold = 10 / scale

    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i]

      if (ann.type === TOOLS.PEN || ann.type === TOOLS.HIGHLIGHTER) {
        for (const [px, py] of ann.points) {
          const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
          if (dist < threshold + ann.width) return ann
        }
      } else if (ann.type === TOOLS.RECTANGLE) {
        const minX = Math.min(ann.x1, ann.x2)
        const maxX = Math.max(ann.x1, ann.x2)
        const minY = Math.min(ann.y1, ann.y2)
        const maxY = Math.max(ann.y1, ann.y2)

        const nearEdge =
          (x >= minX - threshold && x <= maxX + threshold && Math.abs(y - minY) < threshold) ||
          (x >= minX - threshold && x <= maxX + threshold && Math.abs(y - maxY) < threshold) ||
          (y >= minY - threshold && y <= maxY + threshold && Math.abs(x - minX) < threshold) ||
          (y >= minY - threshold && y <= maxY + threshold && Math.abs(x - maxX) < threshold)

        if (nearEdge) return ann
      } else if (ann.type === TOOLS.CIRCLE) {
        const cx = (ann.x1 + ann.x2) / 2
        const cy = (ann.y1 + ann.y2) / 2
        const rx = Math.abs(ann.x2 - ann.x1) / 2
        const ry = Math.abs(ann.y2 - ann.y1) / 2
        const dist = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)

        if (Math.abs(dist - 1) < threshold / Math.max(rx, ry)) return ann
      } else if (ann.type === TOOLS.ARROW) {
        const lineLength = Math.sqrt((ann.x2 - ann.x1) ** 2 + (ann.y2 - ann.y1) ** 2)
        if (lineLength > 0) {
          const t = Math.max(0, Math.min(1,
            ((x - ann.x1) * (ann.x2 - ann.x1) + (y - ann.y1) * (ann.y2 - ann.y1)) / (lineLength ** 2)
          ))
          const nearestX = ann.x1 + t * (ann.x2 - ann.x1)
          const nearestY = ann.y1 + t * (ann.y2 - ann.y1)
          const dist = Math.sqrt((x - nearestX) ** 2 + (y - nearestY) ** 2)
          if (dist < threshold) return ann
        }
      } else if (ann.type === TOOLS.TEXT) {
        const textWidth = ann.text.length * ann.fontSize * 0.6
        const textHeight = ann.fontSize
        if (x >= ann.x && x <= ann.x + textWidth && y >= ann.y - textHeight && y <= ann.y) {
          return ann
        }
      }
    }

    return null
  }

  // Handle zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(3, Math.max(0.1, scale * delta))

      // Zoom towards mouse position
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const newOffset = {
        x: mouseX - (mouseX - offset.x) * (newScale / scale),
        y: mouseY - (mouseY - offset.y) * (newScale / scale)
      }

      setScale(newScale)
      setOffset(newOffset)
    }
  }

  // Export as PNG
  const handleExport = async () => {
    if (!imageRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = imageDimensions.width
    canvas.height = imageDimensions.height
    const ctx = canvas.getContext('2d')

    // Draw background image
    ctx.drawImage(imageRef.current, 0, 0)

    // Draw annotations
    renderAnnotationsToCanvas(ctx, annotations)

    // Download
    const link = document.createElement('a')
    link.download = `${renderName || 'render'}_anotado_${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Render annotations to canvas (for export)
  const renderAnnotationsToCanvas = (ctx, anns) => {
    anns.forEach(ann => {
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = ann.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (ann.type === TOOLS.PEN) {
        const stroke = getStroke(ann.points, getPenOptions(ann.width))
        const path = new Path2D(getSvgPathFromStroke(stroke))
        ctx.fill(path)
      } else if (ann.type === TOOLS.HIGHLIGHTER) {
        ctx.globalAlpha = 0.3
        const stroke = getStroke(ann.points, getHighlighterOptions(ann.width))
        const path = new Path2D(getSvgPathFromStroke(stroke))
        ctx.fill(path)
        ctx.globalAlpha = 1
      } else if (ann.type === TOOLS.RECTANGLE) {
        const x = Math.min(ann.x1, ann.x2)
        const y = Math.min(ann.y1, ann.y2)
        const w = Math.abs(ann.x2 - ann.x1)
        const h = Math.abs(ann.y2 - ann.y1)
        ctx.strokeRect(x, y, w, h)
      } else if (ann.type === TOOLS.CIRCLE) {
        const cx = (ann.x1 + ann.x2) / 2
        const cy = (ann.y1 + ann.y2) / 2
        const rx = Math.abs(ann.x2 - ann.x1) / 2
        const ry = Math.abs(ann.y2 - ann.y1) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      } else if (ann.type === TOOLS.ARROW) {
        ctx.beginPath()
        ctx.moveTo(ann.x1, ann.y1)
        ctx.lineTo(ann.x2, ann.y2)
        ctx.stroke()

        // Arrowhead
        const angle = Math.atan2(ann.y2 - ann.y1, ann.x2 - ann.x1)
        const headLength = 15
        ctx.beginPath()
        ctx.moveTo(ann.x2, ann.y2)
        ctx.lineTo(
          ann.x2 - headLength * Math.cos(angle - Math.PI / 6),
          ann.y2 - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(ann.x2, ann.y2)
        ctx.lineTo(
          ann.x2 - headLength * Math.cos(angle + Math.PI / 6),
          ann.y2 - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
      } else if (ann.type === TOOLS.TEXT) {
        ctx.font = `${ann.fontSize}px 'Quattrocento Sans', sans-serif`
        ctx.fillText(ann.text, ann.x, ann.y)
      }
    })
  }

  // Render single annotation to SVG
  const renderAnnotation = (ann) => {
    const key = ann.id

    if (ann.type === TOOLS.PEN) {
      const stroke = getStroke(ann.points, getPenOptions(ann.width))
      return (
        <path
          key={key}
          d={getSvgPathFromStroke(stroke)}
          fill={ann.color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }

    if (ann.type === TOOLS.HIGHLIGHTER) {
      const stroke = getStroke(ann.points, getHighlighterOptions(ann.width))
      return (
        <path
          key={key}
          d={getSvgPathFromStroke(stroke)}
          fill={ann.color}
          opacity={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }

    if (ann.type === TOOLS.RECTANGLE) {
      const x = Math.min(ann.x1, ann.x2)
      const y = Math.min(ann.y1, ann.y2)
      const w = Math.abs(ann.x2 - ann.x1)
      const h = Math.abs(ann.y2 - ann.y1)
      return (
        <rect
          key={key}
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke={ann.color}
          strokeWidth={ann.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }

    if (ann.type === TOOLS.CIRCLE) {
      const cx = (ann.x1 + ann.x2) / 2
      const cy = (ann.y1 + ann.y2) / 2
      const rx = Math.abs(ann.x2 - ann.x1) / 2
      const ry = Math.abs(ann.y2 - ann.y1) / 2
      return (
        <ellipse
          key={key}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={ann.color}
          strokeWidth={ann.width}
        />
      )
    }

    if (ann.type === TOOLS.ARROW) {
      const angle = Math.atan2(ann.y2 - ann.y1, ann.x2 - ann.x1)
      const headLength = 15
      return (
        <g key={key}>
          <line
            x1={ann.x1}
            y1={ann.y1}
            x2={ann.x2}
            y2={ann.y2}
            stroke={ann.color}
            strokeWidth={ann.width}
            strokeLinecap="round"
          />
          <line
            x1={ann.x2}
            y1={ann.y2}
            x2={ann.x2 - headLength * Math.cos(angle - Math.PI / 6)}
            y2={ann.y2 - headLength * Math.sin(angle - Math.PI / 6)}
            stroke={ann.color}
            strokeWidth={ann.width}
            strokeLinecap="round"
          />
          <line
            x1={ann.x2}
            y1={ann.y2}
            x2={ann.x2 - headLength * Math.cos(angle + Math.PI / 6)}
            y2={ann.y2 - headLength * Math.sin(angle + Math.PI / 6)}
            stroke={ann.color}
            strokeWidth={ann.width}
            strokeLinecap="round"
          />
        </g>
      )
    }

    if (ann.type === TOOLS.TEXT) {
      return (
        <text
          key={key}
          x={ann.x}
          y={ann.y}
          fill={ann.color}
          fontSize={ann.fontSize}
          fontFamily="'Quattrocento Sans', sans-serif"
        >
          {ann.text}
        </text>
      )
    }

    return null
  }

  // Tool button component
  const ToolButton = ({ tool, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTool(tool)}
      title={label}
      style={{
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: 'none',
        background: activeTool === tool ? '#8B8670' : 'transparent',
        color: activeTool === tool ? '#FFFFFF' : '#5F5C59',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={20} />
    </button>
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: '#F2F0E7',
          borderBottom: '1px solid #E0DED8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#5F5C59',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              margin: 0,
            }}
          >
            Moleskine
          </h2>
          {renderName && (
            <span style={{ fontSize: 14, color: '#8B8670' }}>
              {renderName}
            </span>
          )}
          {hasUnsavedChanges && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: '#FEF3C7',
                color: '#D97706',
              }}
            >
              Alteracoes por guardar
            </span>
          )}
          {isSaving && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: '#E0E7FF',
                color: '#4338CA',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Loader2 size={12} className="animate-spin" />
              A guardar...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #E0DED8',
              background: '#FFFFFF',
              color: '#5F5C59',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            Exportar
          </button>
          <button
            onClick={saveAnnotations}
            disabled={isSaving || !hasUnsavedChanges}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: hasUnsavedChanges ? '#8B8670' : '#E5E5E5',
              color: hasUnsavedChanges ? '#FFFFFF' : '#9CA3AF',
              fontSize: 13,
              cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
            }}
          >
            <Save size={16} />
            Guardar
          </button>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              border: '1px solid #E0DED8',
              background: '#FFFFFF',
              color: '#5F5C59',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Toolbar - Left Side */}
        <div
          style={{
            width: 60,
            background: '#F2F0E7',
            borderRight: '1px solid #E0DED8',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* Drawing Tools */}
          <ToolButton tool={TOOLS.SELECT} icon={MousePointer2} label="Selecionar" />
          <ToolButton tool={TOOLS.PEN} icon={Pencil} label="Caneta" />
          <ToolButton tool={TOOLS.HIGHLIGHTER} icon={Highlighter} label="Marcador" />
          <ToolButton tool={TOOLS.RECTANGLE} icon={Square} label="Retangulo" />
          <ToolButton tool={TOOLS.CIRCLE} icon={Circle} label="Circulo" />
          <ToolButton tool={TOOLS.ARROW} icon={ArrowUpRight} label="Seta" />
          <ToolButton tool={TOOLS.TEXT} icon={Type} label="Texto" />
          <ToolButton tool={TOOLS.ERASER} icon={Eraser} label="Borracha" />
          <ToolButton tool={TOOLS.PAN} icon={Move} label="Mover (Alt)" />

          <div style={{ height: 1, background: '#E0DED8', margin: '8px 0' }} />

          {/* Colors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            {STROKE_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setStrokeColor(c.color)}
                title={c.name}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: strokeColor === c.color ? '2px solid #5F5C59' : '2px solid transparent',
                  background: c.color,
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
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
                title={`Espessura ${w}`}
                style={{
                  width: 32,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  border: 'none',
                  background: strokeWidth === w ? '#E0DED8' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: w,
                    borderRadius: w / 2,
                    background: strokeColor,
                  }}
                />
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Desfazer (Ctrl+Z)"
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: historyIndex <= 0 ? '#D1D5DB' : '#5F5C59',
              cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Refazer (Ctrl+Y)"
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: historyIndex >= history.length - 1 ? '#D1D5DB' : '#5F5C59',
              cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <RotateCw size={20} />
          </button>

          <div style={{ height: 1, background: '#E0DED8', margin: '8px 0' }} />

          {/* Clear */}
          <button
            onClick={() => setShowConfirmClear(true)}
            disabled={annotations.length === 0}
            title="Limpar tudo"
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: annotations.length === 0 ? '#D1D5DB' : '#DC2626',
              cursor: annotations.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Trash2 size={20} />
          </button>
        </div>

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
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: '#1a1a1a',
            cursor: activeTool === TOOLS.PAN || isPanning
              ? 'grab'
              : activeTool === TOOLS.ERASER
                ? 'crosshair'
                : activeTool === TOOLS.TEXT
                  ? 'text'
                  : 'crosshair',
          }}
        >
          {!imageLoaded ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9CA3AF',
              }}
            >
              <Loader2 size={32} className="animate-spin" />
            </div>
          ) : (
            <div
              style={{
                position: 'absolute',
                left: offset.x,
                top: offset.y,
                transform: `scale(${scale})`,
                transformOrigin: '0 0',
              }}
            >
              {/* Background Image */}
              <img
                src={renderImageUrl}
                alt={renderName}
                style={{
                  display: 'block',
                  maxWidth: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
                draggable={false}
              />

              {/* SVG Overlay for Annotations */}
              <svg
                width={imageDimensions.width}
                height={imageDimensions.height}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                }}
              >
                {annotations.map(renderAnnotation)}
                {currentAnnotation && renderAnnotation(currentAnnotation)}
              </svg>
            </div>
          )}

          {/* Text Input Modal */}
          {isAddingText && textPosition && (
            <div
              style={{
                position: 'absolute',
                left: textPosition.x * scale + offset.x,
                top: textPosition.y * scale + offset.y,
                transform: 'translate(-50%, -100%)',
                background: '#FFFFFF',
                borderRadius: 8,
                padding: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                zIndex: 100,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit()
                  if (e.key === 'Escape') {
                    setIsAddingText(false)
                    setTextPosition(null)
                    setTextInput('')
                  }
                }}
                autoFocus
                placeholder="Escreva aqui..."
                style={{
                  width: 200,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #E0DED8',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    setIsAddingText(false)
                    setTextPosition(null)
                    setTextInput('')
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #E0DED8',
                    background: '#FFFFFF',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: textInput.trim() ? '#8B8670' : '#E5E5E5',
                    color: textInput.trim() ? '#FFFFFF' : '#9CA3AF',
                    fontSize: 13,
                    cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* Zoom Controls */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: '#F2F0E7',
              padding: '8px 12px',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <button
              onClick={() => setScale((s) => Math.max(0.1, s - 0.25))}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                border: '1px solid #E0DED8',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 50, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.25))}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                border: '1px solid #E0DED8',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={fitToScreen}
              title="Ajustar ao ecra"
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                border: '1px solid #E0DED8',
                background: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Clear Modal */}
      {showConfirmClear && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowConfirmClear(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#5F5C59',
                marginBottom: 12,
              }}
            >
              Limpar Anotacoes
            </h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              Tem a certeza que deseja apagar todas as anotacoes? Esta acao nao pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmClear(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: '1px solid #E0DED8',
                  background: '#FFFFFF',
                  color: '#5F5C59',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                style={{
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
