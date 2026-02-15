import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants'

export default function ZoomControls({
  scale,
  setScale,
  setOffset,
  fitToScreen,
  containerRef,
}) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, right: 20,
      display: 'flex', gap: 8, alignItems: 'center',
      background: '#F2F0E7', padding: '8px 14px', borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <button onClick={() => {
        const newScale = Math.max(0.1, scale - (scale > 0.5 ? 0.1 : 0.05))
        setScale(newScale)
      }}
        title="Zoom out (⌘-)"
        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4, border: '1px solid #E0DED8', background: '#FFFFFF', cursor: 'pointer' }}>
        <ZoomOut size={16} />
      </button>

      {/* Smooth zoom slider */}
      <input
        type="range"
        min={10}
        max={300}
        step={5}
        value={Math.round(scale * 100)}
        onChange={(e) => {
          const newScale = parseInt(e.target.value) / 100
          setScale(newScale)
        }}
        style={{
          width: 120,
          height: 4,
          accentColor: '#8B8670',
          cursor: 'pointer',
        }}
        title={`Zoom: ${Math.round(scale * 100)}%`}
      />

      {/* Current zoom percentage - clickable to reset to 100% */}
      <button
        onClick={() => {
          setScale(1)
          if (containerRef.current) {
            setOffset({
              x: (containerRef.current.clientWidth - CANVAS_WIDTH) / 2,
              y: (containerRef.current.clientHeight - CANVAS_HEIGHT) / 2
            })
          }
        }}
        title="Clica para repor 100%"
        style={{
          minWidth: 44, padding: '3px 6px', borderRadius: 4, border: 'none',
          background: Math.abs(scale - 1) < 0.03 ? '#8B8670' : 'transparent',
          color: Math.abs(scale - 1) < 0.03 ? '#FFFFFF' : '#5F5C59',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
        }}
      >
        {Math.round(scale * 100)}%
      </button>

      <button onClick={() => {
        const newScale = Math.min(3, scale + (scale >= 0.5 ? 0.1 : 0.05))
        setScale(newScale)
      }}
        title="Zoom in (⌘+)"
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
  )
}
