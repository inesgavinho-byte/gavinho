import {
  MessageCircle, Pencil, Square, ArrowUpRight, Minus, Plus,
  RefreshCw, Download, Eye, Trash2, Circle, Eraser, Undo2, Redo2
} from 'lucide-react'
import { DRAWING_COLORS, DRAWING_TOOLS } from './constants'

const TOOLBAR_TOOLS = [
  { id: 'select', icon: Eye, label: 'Selecionar' },
  { id: 'comment', icon: MessageCircle, label: 'Comentario' },
  { id: 'pencil', icon: Pencil, label: 'Desenho livre' },
  { id: 'rectangle', icon: Square, label: 'Retangulo' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Seta' },
  { id: 'circle', icon: Circle, label: 'Circulo' },
  { id: 'line', icon: Minus, label: 'Linha' },
  { id: 'eraser', icon: Eraser, label: 'Borracha' }
]

export default function DesignReviewToolbar({
  activeTool,
  setActiveTool,
  drawingColor,
  setDrawingColor,
  undoStack,
  redoStack,
  onUndo,
  onRedo,
  onClearDrawings,
  drawingsCount,
  scale,
  setScale,
  onFitToScreen,
  versions,
  selectedVersion,
  setSelectedVersion,
  selectedReview,
  onDeleteVersion,
  onRefresh,
  onConfirmClear,
}) {
  const isDrawingTool = DRAWING_TOOLS.includes(activeTool)

  return (
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
        {TOOLBAR_TOOLS.map(tool => (
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
          onClick={onUndo}
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
          onClick={onRedo}
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
      {isDrawingTool && (
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
      {isDrawingTool && drawingsCount > 0 && (
        <button
          onClick={onConfirmClear}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => setScale(s => Math.max(0.1, s - (s > 0.5 ? 0.1 : 0.05)))}
          title="Zoom out"
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
        <input
          type="range"
          min={10}
          max={300}
          step={5}
          value={Math.round(scale * 100)}
          onChange={(e) => setScale(parseInt(e.target.value) / 100)}
          style={{ width: 100, height: 4, accentColor: 'var(--accent-olive)', cursor: 'pointer' }}
          title={`Zoom: ${Math.round(scale * 100)}%`}
        />
        <button
          onClick={() => setScale(1)}
          title="Repor 100%"
          style={{
            minWidth: '44px',
            padding: '4px 6px',
            borderRadius: '4px',
            border: 'none',
            background: Math.abs(scale - 1) < 0.03 ? 'var(--accent-olive)' : 'transparent',
            color: Math.abs(scale - 1) < 0.03 ? 'white' : 'var(--brown)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => setScale(s => Math.min(3, s + (s >= 0.5 ? 0.1 : 0.05)))}
          title="Zoom in"
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
        <button
          onClick={onFitToScreen}
          title="Ajustar ao ecrã"
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--stone)',
            background: 'var(--white)',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--brown)'
          }}
        >
          Ajustar
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
        onClick={onDeleteVersion}
        title="Eliminar esta versão"
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          border: '1px solid rgba(180, 100, 100, 0.3)',
          background: 'var(--white)',
          cursor: 'pointer',
          color: 'var(--error)'
        }}
      >
        <Trash2 size={16} />
      </button>
      <button
        onClick={onRefresh}
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
  )
}
