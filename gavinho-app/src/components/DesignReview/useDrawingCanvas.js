import { useState, useRef, useCallback, useEffect } from 'react'
import { DRAWING_TOOLS } from './constants'

export default function useDrawingCanvas({
  drawings,
  activeTool,
  drawingColor,
  drawingThickness,
  scale,
  pdfDimensions,
  onSaveDrawing,
  onDeleteDrawing,
  onRestoreDrawing,
}) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentDrawing, setCurrentDrawing] = useState(null)

  // Undo/Redo state (max 3 actions)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])

  // Get canvas coordinates from pointer event
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x, y }
  }, [])

  // Get pressure from pointer/touch event (Apple Pencil support)
  const getPointerPressure = useCallback((e) => {
    if (e.pressure !== undefined && e.pressure > 0) return e.pressure
    if (e.force !== undefined && e.force > 0) return e.force / 3
    return 0.5
  }, [])

  // Draw a single shape on canvas context
  const drawShape = useCallback((ctx, drawing, scaledWidth, scaledHeight, strokeColor, lineWidth) => {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const data = drawing.data

    const drawPencilPath = (points, baseWidth, color) => {
      if (!points || points.length < 2) return
      const hasPressure = points.some(pt => pt.p !== undefined && pt.p !== 0.5)
      if (hasPressure) {
        for (let i = 1; i < points.length; i++) {
          const p = points[i].p ?? 0.5
          ctx.lineWidth = baseWidth * (0.4 + p * 1.2)
          ctx.strokeStyle = color
          ctx.beginPath()
          ctx.moveTo(points[i - 1].x * scaledWidth / 100, points[i - 1].y * scaledHeight / 100)
          ctx.lineTo(points[i].x * scaledWidth / 100, points[i].y * scaledHeight / 100)
          ctx.stroke()
        }
      } else {
        ctx.beginPath()
        ctx.moveTo(points[0].x * scaledWidth / 100, points[0].y * scaledHeight / 100)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x * scaledWidth / 100, points[i].y * scaledHeight / 100)
        }
        ctx.stroke()
      }
    }

    switch (drawing.tipo) {
      case 'pencil':
        drawPencilPath(data.points, lineWidth, strokeColor)
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
      case 'line': {
        const x1 = data.x1 * scaledWidth / 100
        const y1 = data.y1 * scaledHeight / 100
        const x2 = data.x2 * scaledWidth / 100
        const y2 = data.y2 * scaledHeight / 100

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

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
      }

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
  }, [scale])

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
      drawShape(ctx, drawing, scaledWidth, scaledHeight, drawing.cor, drawing.espessura * scale)
    })

    // Draw current drawing in progress
    if (currentDrawing) {
      drawShape(ctx, currentDrawing, scaledWidth, scaledHeight, drawingColor, drawingThickness * scale)
    }
  }, [drawings, currentDrawing, scale, pdfDimensions, drawingColor, drawingThickness, drawShape])

  // Redraw when dependencies change
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // Eraser: find and delete drawing at click position
  const handleEraserClick = useCallback((e) => {
    if (activeTool !== 'eraser') return

    const { x, y } = getCanvasCoords(e)
    const threshold = 3

    for (let i = drawings.length - 1; i >= 0; i--) {
      const drawing = drawings[i]
      const data = drawing.data
      let hit = false

      switch (drawing.tipo) {
        case 'pencil':
          if (data.points) {
            for (const point of data.points) {
              const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2))
              if (dist < threshold) { hit = true; break }
            }
          }
          break

        case 'rectangle': {
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
        }

        case 'arrow':
        case 'line': {
          const lineLength = Math.sqrt(Math.pow(data.x2 - data.x1, 2) + Math.pow(data.y2 - data.y1, 2))
          if (lineLength > 0) {
            const t = Math.max(0, Math.min(1,
              ((x - data.x1) * (data.x2 - data.x1) + (y - data.y1) * (data.y2 - data.y1)) / (lineLength * lineLength)
            ))
            const nearestX = data.x1 + t * (data.x2 - data.x1)
            const nearestY = data.y1 + t * (data.y2 - data.y1)
            const dist = Math.sqrt(Math.pow(x - nearestX, 2) + Math.pow(y - nearestY, 2))
            if (dist < threshold) hit = true
          }
          break
        }

        case 'circle': {
          const distFromCenter = Math.sqrt(Math.pow(x - data.cx, 2) + Math.pow(y - data.cy, 2))
          if (Math.abs(distFromCenter - data.radius) < threshold) hit = true
          break
        }
      }

      if (hit) {
        onDeleteDrawing(drawing.id).then(deleted => {
          if (deleted) {
            setUndoStack(prev => [...prev.slice(-2), deleted])
            setRedoStack([])
          }
        })
        break
      }
    }
  }, [activeTool, drawings, getCanvasCoords, onDeleteDrawing])

  const handleCanvasPointerDown = useCallback((e) => {
    if (!DRAWING_TOOLS.includes(activeTool)) return
    e.preventDefault()
    e.stopPropagation()

    if (e.pointerId !== undefined && canvasRef.current?.setPointerCapture) {
      canvasRef.current.setPointerCapture(e.pointerId)
    }

    const { x, y } = getCanvasCoords(e)
    const pressure = getPointerPressure(e)
    setIsDrawing(true)

    switch (activeTool) {
      case 'pencil':
        setCurrentDrawing({ tipo: 'pencil', data: { points: [{ x, y, p: pressure }] } })
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
  }, [activeTool, getCanvasCoords, getPointerPressure])

  const handleCanvasPointerMove = useCallback((e) => {
    if (!isDrawing || !currentDrawing) return
    e.preventDefault()

    const { x, y } = getCanvasCoords(e)
    const pressure = getPointerPressure(e)

    switch (currentDrawing.tipo) {
      case 'pencil':
        setCurrentDrawing(prev => ({
          ...prev,
          data: { points: [...prev.data.points, { x, y, p: pressure }] }
        }))
        break
      case 'rectangle': {
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
      }
      case 'arrow':
      case 'line':
        setCurrentDrawing(prev => ({
          ...prev,
          data: { ...prev.data, x2: x, y2: y }
        }))
        break
      case 'circle': {
        const cx = currentDrawing.data.startX
        const cy = currentDrawing.data.startY
        const radius = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2))
        setCurrentDrawing(prev => ({
          ...prev,
          data: { ...prev.data, cx, cy, radius }
        }))
        break
      }
    }
  }, [isDrawing, currentDrawing, getCanvasCoords, getPointerPressure])

  const handleCanvasPointerUp = useCallback((e) => {
    if (!isDrawing || !currentDrawing) return

    if (e?.pointerId !== undefined && canvasRef.current?.releasePointerCapture) {
      try { canvasRef.current.releasePointerCapture(e.pointerId) } catch (_) {}
    }

    setIsDrawing(false)

    let shouldSave = false
    let drawingToSave = { ...currentDrawing }

    switch (currentDrawing.tipo) {
      case 'pencil':
        shouldSave = currentDrawing.data.points.length > 2
        break
      case 'rectangle':
        shouldSave = currentDrawing.data.width > 1 && currentDrawing.data.height > 1
        if (shouldSave) {
          const { startX, startY, ...cleanData } = currentDrawing.data
          drawingToSave = { ...currentDrawing, data: cleanData }
        }
        break
      case 'arrow':
      case 'line': {
        const dx = currentDrawing.data.x2 - currentDrawing.data.x1
        const dy = currentDrawing.data.y2 - currentDrawing.data.y1
        shouldSave = Math.sqrt(dx * dx + dy * dy) > 2
        break
      }
      case 'circle':
        shouldSave = currentDrawing.data.radius > 1
        if (shouldSave) {
          const { startX, startY, ...cleanData } = currentDrawing.data
          drawingToSave = { ...currentDrawing, data: cleanData }
        }
        break
    }

    if (shouldSave) {
      onSaveDrawing(drawingToSave)
    }

    setCurrentDrawing(null)
  }, [isDrawing, currentDrawing, onSaveDrawing])

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return
    const lastDeleted = undoStack[undoStack.length - 1]

    const restored = await onRestoreDrawing(lastDeleted)
    if (restored) {
      setUndoStack(prev => prev.slice(0, -1))
      setRedoStack(prev => [...prev.slice(-2), restored])
    }
  }, [undoStack, onRestoreDrawing])

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return
    const lastRestored = redoStack[redoStack.length - 1]

    await onDeleteDrawing(lastRestored.id)
    setRedoStack(prev => prev.slice(0, -1))
  }, [redoStack, onDeleteDrawing])

  const clearAllDrawings = useCallback(async (drawingsList) => {
    for (const d of drawingsList) {
      await onDeleteDrawing(d.id)
    }
  }, [onDeleteDrawing])

  return {
    canvasRef,
    undoStack,
    redoStack,
    handleEraserClick,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleUndo,
    handleRedo,
    clearAllDrawings,
    redrawCanvas,
  }
}
