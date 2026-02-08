import { Globe } from 'lucide-react'

/**
 * Reusable toggle for "Publicar no Portal Cliente"
 * Used in admin forms: Fotografias, Relatórios, Decisões
 */
export default function PortalToggle({ checked, onChange, label }) {
  return (
    <label style={S.wrapper}>
      <div style={S.left}>
        <Globe size={14} style={{ color: checked ? '#10B981' : '#ADAA96' }} />
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#5F5C59' }}>
          {label || 'Publicar no Portal Cliente'}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          ...S.toggle,
          background: checked ? '#10B981' : '#D4D1C7',
        }}
      >
        <div style={{
          ...S.dot,
          transform: checked ? 'translateX(16px)' : 'translateX(2px)',
        }} />
      </button>
    </label>
  )
}

const S = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#F9F9F7',
    borderRadius: '8px',
    border: '1px solid #E8E6DF',
    cursor: 'pointer',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toggle: {
    width: '36px',
    height: '20px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
    padding: 0,
  },
  dot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#FFFFFF',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  },
}
