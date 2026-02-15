import { useState, useCallback, useEffect } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants'

export function useMoleskineCanvas(containerRef, currentPageIndex) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const padding = 100
    const availableWidth = container.clientWidth - padding
    const availableHeight = container.clientHeight - padding

    const scaleX = availableWidth / CANVAS_WIDTH
    const scaleY = availableHeight / CANVAS_HEIGHT
    const newScale = Math.min(scaleX, scaleY, 1)

    setScale(newScale)
    setOffset({
      x: (container.clientWidth - CANVAS_WIDTH * newScale) / 2,
      y: (container.clientHeight - CANVAS_HEIGHT * newScale) / 2
    })
  }, [containerRef])

  // Auto-center when changing pages
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen()
    }, 50)
    return () => clearTimeout(timer)
  }, [currentPageIndex, fitToScreen])

  // Fit on mount and resize
  useEffect(() => {
    fitToScreen()
    window.addEventListener('resize', fitToScreen)
    return () => window.removeEventListener('resize', fitToScreen)
  }, [fitToScreen])

  // Get canvas coordinates from mouse/touch event
  const getCanvasCoords = useCallback((e) => {
    if (!containerRef.current) return { x: 0, y: 0 }

    const rect = containerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    const x = (clientX - rect.left - offset.x) / scale
    const y = (clientY - rect.top - offset.y) / scale

    return { x, y }
  }, [containerRef, offset, scale])

  // Handle wheel zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.95 : 1.05
      const newScale = Math.min(3, Math.max(0.1, scale * delta))

      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      setScale(newScale)
      setOffset({
        x: mouseX - (mouseX - offset.x) * (newScale / scale),
        y: mouseY - (mouseY - offset.y) * (newScale / scale)
      })
    }
  }, [containerRef, scale, offset])

  return {
    scale,
    setScale,
    offset,
    setOffset,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    fitToScreen,
    getCanvasCoords,
    handleWheel,
  }
}
