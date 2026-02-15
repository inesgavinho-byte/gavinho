import { Pencil, Highlighter, Eraser, X } from 'lucide-react'
import { TOOLS, STROKE_COLORS } from '../constants'

export default function FloatingToolbar({
  show,
  setShow,
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
}) {
  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', borderRadius: 8, border: '1px solid #E0DED8',
          background: 'rgba(255,255,255,0.95)', fontSize: 12, color: '#5F5C59',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        Mostrar Toolbar
      </button>
    )
  }

  return (
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
      <button onClick={() => setShow(false)} title="Esconder"
        style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer' }}>
        <X size={14} color="#8B8670" />
      </button>
    </div>
  )
}
