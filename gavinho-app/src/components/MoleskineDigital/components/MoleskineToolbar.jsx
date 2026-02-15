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
  Move,
  Minus,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { ImageIcon, LinkIcon } from './icons'
import { TOOLS, STROKE_COLORS, STROKE_WIDTHS } from '../constants'

function ToolButton({ tool, icon: Icon, label, activeTool, setActiveTool }) {
  return (
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
}

export default function MoleskineToolbar({
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  handleUndo,
  handleRedo,
  showThumbnails,
  setShowThumbnails,
}) {
  const toolProps = { activeTool, setActiveTool }

  return (
    <div style={{
      width: 60, background: '#F2F0E7', borderRight: '1px solid #E0DED8',
      padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <ToolButton tool={TOOLS.SELECT} icon={MousePointer2} label="Selecionar" {...toolProps} />
      <ToolButton tool={TOOLS.PEN} icon={Pencil} label="Caneta" {...toolProps} />
      <ToolButton tool={TOOLS.HIGHLIGHTER} icon={Highlighter} label="Marcador" {...toolProps} />
      <ToolButton tool={TOOLS.LINE} icon={Minus} label="Linha" {...toolProps} />
      <ToolButton tool={TOOLS.RECTANGLE} icon={Square} label="Retângulo" {...toolProps} />
      <ToolButton tool={TOOLS.CIRCLE} icon={Circle} label="Círculo" {...toolProps} />
      <ToolButton tool={TOOLS.ARROW} icon={ArrowUpRight} label="Seta" {...toolProps} />
      <ToolButton tool={TOOLS.TEXT} icon={Type} label="Texto" {...toolProps} />
      <ToolButton tool={TOOLS.LINK} icon={LinkIcon} label="Link" {...toolProps} />
      <ToolButton tool={TOOLS.IMAGE} icon={ImageIcon} label="Imagem" {...toolProps} />
      <ToolButton tool={TOOLS.ERASER} icon={Eraser} label="Borracha" {...toolProps} />
      <ToolButton tool={TOOLS.PAN} icon={Move} label="Mover" {...toolProps} />

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
  )
}
