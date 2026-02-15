import { Plus, Trash2, GripVertical } from 'lucide-react'
import { TOOLS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants'

export default function MoleskineThumbnails({
  pages,
  currentPageIndex,
  setCurrentPageIndex,
  onAddPage,
  onDeletePage,
  draggedPageIndex,
  dragOverPageIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
}) {
  return (
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
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={onDragEnd}
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
                  onClick={(e) => { e.stopPropagation(); onDeletePage(idx); }}
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
              }} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
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
        <button onClick={onAddPage}
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
  )
}
