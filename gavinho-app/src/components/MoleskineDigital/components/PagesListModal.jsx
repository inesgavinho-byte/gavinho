import { X, Plus } from 'lucide-react'

export default function PagesListModal({
  show,
  onClose,
  pages,
  currentPageIndex,
  goToPage,
  onAddPage,
}) {
  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    }} onClick={onClose}>
      <div style={{
        background: '#FFFFFF', borderRadius: 12, padding: 24,
        maxWidth: 400, width: '90%', maxHeight: '80vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#5F5C59' }}>Páginas</h3>
          <button onClick={onClose}
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
              onClick={() => { goToPage(idx); onClose() }}>
              <span style={{ fontWeight: idx === currentPageIndex ? 600 : 400, color: '#5F5C59' }}>
                Página {idx + 1}
              </span>
              <span style={{ fontSize: 12, color: '#8B8670' }}>
                {page.elements.length} elementos
              </span>
            </div>
          ))}
        </div>

        <button onClick={() => { onAddPage(); onClose() }}
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
  )
}
