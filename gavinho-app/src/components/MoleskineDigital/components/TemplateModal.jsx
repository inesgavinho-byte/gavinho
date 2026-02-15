import { X } from 'lucide-react'
import { PAGE_TEMPLATES } from '../constants'

export default function TemplateModal({
  show,
  onClose,
  onSelectTemplate,
}) {
  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    }} onClick={onClose}>
      <div style={{
        background: '#FFFFFF', borderRadius: 12, padding: 24,
        maxWidth: 500, width: '90%',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#5F5C59' }}>Nova Página</h3>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F5C59' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 14, color: '#8B8670', marginBottom: 16 }}>
          Escolhe um template para a nova página:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PAGE_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              style={{
                padding: '16px 12px', borderRadius: 8,
                border: '2px solid #E0DED8', background: '#FFFFFF',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8B8670'
                e.currentTarget.style.background = '#F9F9F7'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E0DED8'
                e.currentTarget.style.background = '#FFFFFF'
              }}
            >
              {/* Template Preview */}
              <div style={{
                width: 80, height: 50, borderRadius: 4, overflow: 'hidden',
                border: '1px solid #E0DED8', background: '#FFFFFF',
              }}>
                {template.id === 'blank' && (
                  <div style={{ width: '100%', height: '100%', background: '#FFFFFF' }} />
                )}
                {template.id === 'grid' && (
                  <div style={{
                    width: '100%', height: '100%',
                    backgroundImage: 'linear-gradient(#E5E5E5 1px, transparent 1px), linear-gradient(90deg, #E5E5E5 1px, transparent 1px)',
                    backgroundSize: '8px 8px',
                  }} />
                )}
                {template.id === 'lines' && (
                  <div style={{
                    width: '100%', height: '100%',
                    backgroundImage: 'linear-gradient(transparent 7px, #E5E5E5 8px)',
                    backgroundSize: '100% 8px',
                  }} />
                )}
                {template.id === 'dots' && (
                  <div style={{
                    width: '100%', height: '100%',
                    backgroundImage: 'radial-gradient(#D0D0D0 1.5px, transparent 1.5px)',
                    backgroundSize: '8px 8px',
                  }} />
                )}
                {template.id === 'cornell' && (
                  <div style={{
                    width: '100%', height: '100%', position: 'relative',
                    backgroundImage: 'linear-gradient(transparent 7px, #E5E5E5 8px)',
                    backgroundSize: '100% 8px',
                  }}>
                    <div style={{
                      position: 'absolute', left: '25%', top: 0, bottom: 0,
                      width: 2, background: '#D0D0D0',
                    }} />
                    <div style={{
                      position: 'absolute', left: 0, right: 0, bottom: '30%',
                      height: 2, background: '#D0D0D0',
                    }} />
                  </div>
                )}
              </div>
              <span style={{ fontSize: 13, color: '#5F5C59', fontWeight: 500 }}>
                {template.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
