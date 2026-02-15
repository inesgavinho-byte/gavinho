import { X, Loader2 } from 'lucide-react'
import { ImageIcon } from './icons'

export default function RenderPickerModal({
  show,
  onClose,
  loading,
  renders,
  onSelectRender,
}) {
  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    }} onClick={onClose}>
      <div style={{
        background: '#FFFFFF', borderRadius: 12, padding: 24,
        maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#5F5C59' }}>Importar Render do Projeto</h3>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F5C59' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8B8670' }}>
            <Loader2 size={32} className="animate-spin" />
            <p>A carregar renders...</p>
          </div>
        ) : renders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8B8670' }}>
            <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>Nenhum render disponível neste projeto</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {renders.map(render => (
              <div
                key={render.id}
                onClick={() => onSelectRender(render)}
                style={{
                  borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                  border: '2px solid transparent', transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8B8670'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <img src={render.url} alt={render.compartimento}
                  style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                <div style={{ padding: 8, background: '#F9F9F7', fontSize: 12, color: '#5F5C59' }}>
                  {render.compartimento || 'Render'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
