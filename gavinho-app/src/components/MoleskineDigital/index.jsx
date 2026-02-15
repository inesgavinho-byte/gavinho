import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { jsPDF } from 'jspdf'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'

import { TOOLS, STROKE_COLORS, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants'
import { generateId, createBlankPage } from './utils'
import { renderElement, drawElementToCanvas, drawTemplatePattern } from './renderers.jsx'

import { useMoleskineNotebook } from './hooks/useMoleskineNotebook'
import { useMoleskineHistory } from './hooks/useMoleskineHistory'
import { useMoleskineCanvas } from './hooks/useMoleskineCanvas'

import MoleskineHeader from './components/MoleskineHeader'
import MoleskineToolbar from './components/MoleskineToolbar'
import MoleskineThumbnails from './components/MoleskineThumbnails'
import FloatingToolbar from './components/FloatingToolbar'
import TextInputModal from './components/TextInputModal'
import LinkInputModal from './components/LinkInputModal'
import RenderPickerModal from './components/RenderPickerModal'
import PagesListModal from './components/PagesListModal'
import TemplateModal from './components/TemplateModal'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import PageNavigation from './components/PageNavigation'
import ZoomControls from './components/ZoomControls'

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function MoleskineDigital({ projectId, projectName, onClose }) {
  const toast = useToast()
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const pdfInputRef = useRef(null)

  // Current page index
  const [currentPageIndex, setCurrentPageIndex] = useState(0)

  // Tool state
  const [activeTool, setActiveTool] = useState(TOOLS.PEN)
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0].color)
  const [strokeWidth, setStrokeWidth] = useState(4)

  // Current drawing state
  const [currentElement, setCurrentElement] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)

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
  const [resizeHandle, setResizeHandle] = useState(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [hoveredElement, setHoveredElement] = useState(null)
  const [hoveredHandle, setHoveredHandle] = useState(null)

  // Floating toolbar state
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(true)

  // Clipboard state
  const [clipboard, setClipboard] = useState(null)

  // Drag and drop page reorder state
  const [draggedPageIndex, setDraggedPageIndex] = useState(null)
  const [dragOverPageIndex, setDragOverPageIndex] = useState(null)

  // UI state
  const [showPagesList, setShowPagesList] = useState(false)
  const [showRenderPicker, setShowRenderPicker] = useState(false)
  const [projectRenders, setProjectRenders] = useState([])
  const [loadingRenders, setLoadingRenders] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(true)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  // Custom hooks
  const notebook = useMoleskineNotebook(projectId, projectName)
  const {
    pages, setPages,
    notebookName, setNotebookName,
    isSaving, hasUnsavedChanges, setHasUnsavedChanges,
    saveNotebook,
    pageHistory, setPageHistory,
    historyIndex, setHistoryIndex,
  } = notebook

  const currentPage = pages[currentPageIndex] || createBlankPage()

  const { updatePageElements, handleUndo, handleRedo } = useMoleskineHistory({
    pages, setPages,
    currentPageIndex,
    currentPage,
    pageHistory, setPageHistory,
    historyIndex, setHistoryIndex,
    setHasUnsavedChanges,
  })

  const canvas = useMoleskineCanvas(containerRef, currentPageIndex)
  const {
    scale, setScale,
    offset, setOffset,
    isPanning, setIsPanning,
    panStart, setPanStart,
    fitToScreen,
    getCanvasCoords,
    handleWheel,
  } = canvas

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Page navigation
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        if (currentPageIndex > 0) setCurrentPageIndex(prev => prev - 1)
      }
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        if (currentPageIndex < pages.length - 1) setCurrentPageIndex(prev => prev + 1)
      }

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault()
        setScale(s => Math.min(3, s + (s >= 0.5 ? 0.1 : 0.05)))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setScale(s => Math.max(0.1, s - (s > 0.5 ? 0.1 : 0.05)))
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

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElement) {
        e.preventDefault()
        setClipboard({ ...selectedElement })
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
        e.preventDefault()
        const pastedElement = {
          ...clipboard,
          id: generateId(),
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
        setClipboard(pastedElement)
      }

      // Duplicate
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

      // Escape
      if (e.key === 'Escape') {
        setSelectedElement(null)
        setIsAddingText(false)
        setIsAddingLink(false)
      }
    }

    const handleKeyUp = (e) => {
      if (e.key === ' ') setActiveTool(TOOLS.PEN)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [currentPageIndex, pages.length, selectedElement, currentPage, fitToScreen, clipboard, updatePageElements, setScale])

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
  const handlePageDragStart = (index) => setDraggedPageIndex(index)

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
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [CANVAS_WIDTH, CANVAS_HEIGHT]
      })

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const canvasEl = document.createElement('canvas')
        canvasEl.width = CANVAS_WIDTH * 2
        canvasEl.height = CANVAS_HEIGHT * 2
        const ctx = canvasEl.getContext('2d')
        ctx.scale(2, 2)

        ctx.fillStyle = page.background || '#FFFFFF'
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        if (page.backgroundImage) {
          await new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
              ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
              resolve()
            }
            img.onerror = resolve
            img.src = page.backgroundImage
          })
        }

        if (page.template && page.template !== 'blank') {
          drawTemplatePattern(ctx, page.template)
        }

        for (const el of page.elements) {
          await drawElementToCanvas(ctx, el)
        }

        if (i > 0) {
          pdf.addPage([CANVAS_WIDTH, CANVAS_HEIGHT], 'landscape')
        }

        const imgData = canvasEl.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgData, 'JPEG', 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      }

      const fileName = `${notebookName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast.error('Erro', 'Erro ao exportar PDF. Tente novamente.')
    } finally {
      setIsExporting(false)
    }
  }

  // Get resize handle at point
  const getResizeHandleAtPoint = (element, x, y) => {
    if (!element || element.type !== 'image') return null
    const hs = 12 / scale
    const midX = element.x + element.width / 2
    const midY = element.y + element.height / 2

    const corners = {
      nw: { x: element.x, y: element.y },
      ne: { x: element.x + element.width, y: element.y },
      sw: { x: element.x, y: element.y + element.height },
      se: { x: element.x + element.width, y: element.y + element.height },
    }
    for (const [key, pos] of Object.entries(corners)) {
      if (Math.abs(x - pos.x) < hs && Math.abs(y - pos.y) < hs) return key
    }

    const edges = {
      n: { x: midX, y: element.y },
      s: { x: midX, y: element.y + element.height },
      w: { x: element.x, y: midY },
      e: { x: element.x + element.width, y: midY },
    }
    for (const [key, pos] of Object.entries(edges)) {
      if (Math.abs(x - pos.x) < hs && Math.abs(y - pos.y) < hs) return key
    }

    return null
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

  // Handle pointer down
  const handlePointerDown = (e) => {
    const { x, y } = getCanvasCoords(e)

    if (activeTool === TOOLS.PAN || e.altKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      return
    }

    if (activeTool === TOOLS.SELECT) {
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

    if (activeTool === TOOLS.TEXT) {
      setSelectedElement(null)
      setTextPosition({ x, y })
      setIsAddingText(true)
      return
    }

    if (activeTool === TOOLS.LINK) {
      setSelectedElement(null)
      setLinkPosition({ x, y })
      setIsAddingLink(true)
      return
    }

    if (activeTool === TOOLS.IMAGE) {
      setSelectedElement(null)
      fileInputRef.current?.click()
      return
    }

    if (activeTool === TOOLS.ERASER) {
      const hitElement = findElementAtPoint(x, y)
      if (hitElement && hitElement.type !== 'image') {
        const newElements = currentPage.elements.filter(el => el.id !== hitElement.id)
        updatePageElements(newElements)
        if (selectedElement?.id === hitElement.id) setSelectedElement(null)
      }
      return
    }

    setSelectedElement(null)
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
        x1: x, y1: y, x2: x, y2: y,
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

    const { x, y } = getCanvasCoords(e)

    // Track hover for cursor feedback in SELECT mode
    if (activeTool === TOOLS.SELECT && !isDragging && !isResizing) {
      if (selectedElement && selectedElement.type === 'image') {
        const handle = getResizeHandleAtPoint(selectedElement, x, y)
        if (handle) {
          setHoveredHandle(handle)
          setHoveredElement(null)
        } else {
          setHoveredHandle(null)
          const hit = findElementAtPoint(x, y)
          setHoveredElement(hit)
        }
      } else {
        setHoveredHandle(null)
        const hit = findElementAtPoint(x, y)
        setHoveredElement(hit)
      }
    }

    // Handle resizing
    if (isResizing && selectedElement && resizeHandle) {
      const dx = x - resizeStart.mouseX
      const dy = y - resizeStart.mouseY
      let newX = resizeStart.x
      let newY = resizeStart.y
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      const aspectRatio = resizeStart.width / resizeStart.height
      const isCorner = resizeHandle.length === 2

      if (resizeHandle.includes('e')) newWidth = Math.max(50, resizeStart.width + dx)
      if (resizeHandle.includes('w')) {
        newWidth = Math.max(50, resizeStart.width - dx)
        newX = resizeStart.x + (resizeStart.width - newWidth)
      }
      if (resizeHandle.includes('s')) newHeight = Math.max(50, resizeStart.height + dy)
      if (resizeHandle.includes('n')) {
        newHeight = Math.max(50, resizeStart.height - dy)
        newY = resizeStart.y + (resizeStart.height - newHeight)
      }

      if (e.shiftKey && isCorner) {
        const newAR = newWidth / newHeight
        if (newAR > aspectRatio) {
          newWidth = Math.max(50, newHeight * aspectRatio)
          if (resizeHandle.includes('w')) newX = resizeStart.x + resizeStart.width - newWidth
        } else {
          newHeight = Math.max(50, newWidth / aspectRatio)
          if (resizeHandle.includes('n')) newY = resizeStart.y + resizeStart.height - newHeight
        }
      }

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
          const offsetX = newX - (el.x || el.points[0]?.[0] || 0)
          const offsetY = newY - (el.y || el.points[0]?.[1] || 0)
          return {
            ...el,
            points: el.points.map(([px, py, pressure]) => [px + offsetX - (dragStart.x - (el.points[0]?.[0] || 0)), py + offsetY - (dragStart.y - (el.points[0]?.[1] || 0)), pressure])
          }
        } else if (el.x1 !== undefined) {
          const ddx = newX - (el.x1 || 0)
          const ddy = newY - (el.y1 || 0)
          return { ...el, x1: newX, y1: newY, x2: el.x2 + ddx, y2: el.y2 + ddy }
        }
        return el
      })
      updatePageElements(updatedElements)

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
        x2: x, y2: y
      }))
    }
  }

  // Handle pointer up
  const handlePointerUp = () => {
    if (isPanning) { setIsPanning(false); return }
    if (isResizing) { setIsResizing(false); setResizeHandle(null); return }
    if (isDragging) { setIsDragging(false); return }

    if (!isDrawing || !currentElement) return

    setIsDrawing(false)

    let isValid = false
    if (currentElement.type === TOOLS.PEN || currentElement.type === TOOLS.HIGHLIGHTER) {
      isValid = currentElement.points.length > 2
    } else {
      const ddx = Math.abs(currentElement.x2 - currentElement.x1)
      const ddy = Math.abs(currentElement.y2 - currentElement.y1)
      isValid = ddx > 5 || ddy > 5
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

  const handleTextCancel = () => {
    setIsAddingText(false)
    setTextPosition(null)
    setTextInput('')
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

  const handleLinkCancel = () => {
    setIsAddingLink(false)
    setLinkPosition(null)
    setLinkInput({ url: '', label: '' })
  }

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileName = `moleskine/${projectId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('renders')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('renders')
        .getPublicUrl(fileName)

      const containerRect = containerRef.current?.getBoundingClientRect()
      const centerX = containerRect ? (containerRect.width / 2 - offset.x) / scale : CANVAS_WIDTH / 2
      const centerY = containerRect ? (containerRect.height / 2 - offset.y) / scale : CANVAS_HEIGHT / 2

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
      setSelectedElement(newElement)
      setActiveTool(TOOLS.SELECT)
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
        const viewport = page.getViewport({ scale: 2 })

        const canvasEl = document.createElement('canvas')
        const context = canvasEl.getContext('2d')
        canvasEl.width = viewport.width
        canvasEl.height = viewport.height

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise

        const imageUrl = canvasEl.toDataURL('image/png')

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

      setPages(prev => [...prev, ...newPages])
      setCurrentPageIndex(pages.length)
      setHasUnsavedChanges(true)

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
    const centerX = containerRect ? (containerRect.width / 2 - offset.x) / scale : CANVAS_WIDTH / 2
    const centerY = containerRect ? (containerRect.height / 2 - offset.y) / scale : CANVAS_HEIGHT / 2

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
    setSelectedElement(newElement)
    setActiveTool(TOOLS.SELECT)
  }

  // Compute dynamic cursor
  const getCanvasCursor = () => {
    if (activeTool === TOOLS.PAN || isPanning) return 'grab'
    if (activeTool === TOOLS.ERASER) return 'crosshair'
    if (activeTool === TOOLS.TEXT) return 'text'
    if (activeTool === TOOLS.SELECT) {
      if (isDragging) return 'grabbing'
      if (isResizing) {
        const cursorMap = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }
        return cursorMap[resizeHandle] || 'default'
      }
      if (hoveredHandle) {
        const cursorMap = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }
        return cursorMap[hoveredHandle] || 'default'
      }
      if (hoveredElement) return 'move'
      return 'default'
    }
    return 'crosshair'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)',
      zIndex: 9999, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <MoleskineHeader
        notebookName={notebookName}
        setNotebookName={setNotebookName}
        currentPageIndex={currentPageIndex}
        totalPages={pages.length}
        hasUnsavedChanges={hasUnsavedChanges}
        setHasUnsavedChanges={setHasUnsavedChanges}
        isSaving={isSaving}
        saveNotebook={saveNotebook}
        loadingPdf={loadingPdf}
        isExporting={isExporting}
        pdfInputRef={pdfInputRef}
        onImportRender={() => {
          loadProjectRenders()
          setShowRenderPicker(true)
        }}
        exportToPdf={exportToPdf}
        onClose={onClose}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Toolbar */}
        <MoleskineToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          strokeColor={strokeColor}
          setStrokeColor={setStrokeColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          showThumbnails={showThumbnails}
          setShowThumbnails={setShowThumbnails}
        />

        {/* Thumbnails Panel */}
        {showThumbnails && (
          <MoleskineThumbnails
            pages={pages}
            currentPageIndex={currentPageIndex}
            setCurrentPageIndex={setCurrentPageIndex}
            onAddPage={() => setShowTemplateModal(true)}
            onDeletePage={(idx) => setShowDeleteConfirm(idx)}
            draggedPageIndex={draggedPageIndex}
            dragOverPageIndex={dragOverPageIndex}
            onDragStart={handlePageDragStart}
            onDragOver={handlePageDragOver}
            onDragEnd={handlePageDragEnd}
          />
        )}

        {/* Canvas Area */}
        <div
          ref={containerRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onDoubleClick={(e) => {
            const { x, y } = getCanvasCoords(e)
            const hit = findElementAtPoint(x, y)
            if (hit && hit.type === 'image') {
              setActiveTool(TOOLS.SELECT)
              setSelectedElement(hit)
            }
          }}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            background: '#2a2a2a',
            cursor: getCanvasCursor(),
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
              width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
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
              <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ position: 'relative', zIndex: 1 }}>
                {/* Template patterns */}
                {!currentPage.backgroundImage && (
                  <>
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="1"/>
                      </pattern>
                      <pattern id="lines" width="100%" height="32" patternUnits="userSpaceOnUse">
                        <line x1="60" y1="32" x2={CANVAS_WIDTH - 60} y2="32" stroke="#E5E5E5" strokeWidth="1"/>
                      </pattern>
                      <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
                        <circle cx="15" cy="15" r="2" fill="#D0D0D0"/>
                      </pattern>
                    </defs>
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
                        <line x1="200" y1="0" x2="200" y2={CANVAS_HEIGHT} stroke="#D0D0D0" strokeWidth="2"/>
                        <line x1="0" y1={CANVAS_HEIGHT - 200} x2={CANVAS_WIDTH} y2={CANVAS_HEIGHT - 200} stroke="#D0D0D0" strokeWidth="2"/>
                      </>
                    )}
                  </>
                )}

                {currentPage.elements.map(renderElement)}
                {currentElement && renderElement(currentElement)}

                {/* Hover highlight for images in SELECT mode */}
                {activeTool === TOOLS.SELECT && hoveredElement && hoveredElement.type === 'image' && hoveredElement.id !== selectedElement?.id && (
                  <rect
                    x={hoveredElement.x - 1}
                    y={hoveredElement.y - 1}
                    width={hoveredElement.width + 2}
                    height={hoveredElement.height + 2}
                    fill="none"
                    stroke="#8B8670"
                    strokeWidth={1.5}
                    strokeDasharray="6,3"
                    opacity={0.6}
                    pointerEvents="none"
                  />
                )}

                {/* Selection highlight and resize handles */}
                {selectedElement && activeTool === TOOLS.SELECT && (
                  <>
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
                              fill={hoveredHandle === handle ? '#4338CA' : '#FFFFFF'}
                              stroke="#4338CA"
                              strokeWidth={2}
                              rx={1}
                              style={{ cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize' }}
                            />
                          )
                        })}
                        {['n', 'e', 's', 'w'].map(handle => {
                          const midX = selectedElement.x + selectedElement.width / 2
                          const midY = selectedElement.y + selectedElement.height / 2
                          const hx = handle === 'w' ? selectedElement.x : handle === 'e' ? selectedElement.x + selectedElement.width : midX
                          const hy = handle === 'n' ? selectedElement.y : handle === 's' ? selectedElement.y + selectedElement.height : midY
                          const isHoriz = handle === 'n' || handle === 's'
                          return (
                            <rect
                              key={handle}
                              x={hx - (isHoriz ? 8 : 4)}
                              y={hy - (isHoriz ? 4 : 8)}
                              width={isHoriz ? 16 : 8}
                              height={isHoriz ? 8 : 16}
                              fill={hoveredHandle === handle ? '#4338CA' : '#FFFFFF'}
                              stroke="#4338CA"
                              strokeWidth={1.5}
                              rx={2}
                              style={{ cursor: isHoriz ? 'ns-resize' : 'ew-resize' }}
                            />
                          )
                        })}
                      </>
                    )}
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
          <FloatingToolbar
            show={showFloatingToolbar}
            setShow={setShowFloatingToolbar}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
          />

          {/* Text Input Modal */}
          {isAddingText && (
            <TextInputModal
              textPosition={textPosition}
              textInput={textInput}
              setTextInput={setTextInput}
              onSubmit={handleTextSubmit}
              onCancel={handleTextCancel}
              scale={scale}
              offset={offset}
            />
          )}

          {/* Link Input Modal */}
          {isAddingLink && (
            <LinkInputModal
              linkPosition={linkPosition}
              linkInput={linkInput}
              setLinkInput={setLinkInput}
              onSubmit={handleLinkSubmit}
              onCancel={handleLinkCancel}
              scale={scale}
              offset={offset}
            />
          )}

          {/* Page Navigation */}
          <PageNavigation
            currentPageIndex={currentPageIndex}
            totalPages={pages.length}
            goToPage={goToPage}
            showPagesList={showPagesList}
            setShowPagesList={setShowPagesList}
            onAddPage={() => setShowTemplateModal(true)}
          />

          {/* Zoom Controls */}
          <ZoomControls
            scale={scale}
            setScale={setScale}
            setOffset={setOffset}
            fitToScreen={fitToScreen}
            containerRef={containerRef}
          />
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

      {/* Modals */}
      <RenderPickerModal
        show={showRenderPicker}
        onClose={() => setShowRenderPicker(false)}
        loading={loadingRenders}
        renders={projectRenders}
        onSelectRender={addRenderToPage}
      />

      <PagesListModal
        show={showPagesList}
        onClose={() => setShowPagesList(false)}
        pages={pages}
        currentPageIndex={currentPageIndex}
        goToPage={goToPage}
        onAddPage={() => setShowTemplateModal(true)}
      />

      <TemplateModal
        show={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={addNewPage}
      />

      <DeleteConfirmModal
        pageIndex={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(null)}
        onConfirm={deletePage}
      />
    </div>
  )
}
