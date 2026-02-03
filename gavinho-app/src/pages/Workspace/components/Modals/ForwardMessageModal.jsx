// =====================================================
// FORWARD MESSAGE MODAL
// Modal para reencaminhar mensagens para outros canais
// =====================================================

import { Forward, Hash, X } from 'lucide-react'

export default function ForwardMessageModal({
  isOpen,
  onClose,
  message,
  canais,
  currentCanalId,
  onForward
}) {
  if (!isOpen || !message) return null

  const availableCanais = canais.filter(c => c.id !== currentCanalId)

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          padding: '24px',
          width: '400px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--brown)' }}>
            <Forward size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Reencaminhar Mensagem
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div style={{
          padding: '12px',
          background: 'var(--cream)',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
            De: {message.autor?.nome}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown)' }}>
            {message.conteudo?.substring(0, 100)}{message.conteudo?.length > 100 ? '...' : ''}
          </p>
        </div>

        {/* Channel Selection */}
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '12px' }}>
          Selecionar canal de destino
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
          {availableCanais.map(canal => (
            <button
              key={canal.id}
              onClick={() => onForward(canal.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                background: 'var(--off-white)',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--cream)'
                e.currentTarget.style.borderColor = 'var(--accent-olive)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--off-white)'
                e.currentTarget.style.borderColor = 'var(--stone)'
              }}
            >
              <Hash size={16} style={{ color: 'var(--brown-light)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                  {canal.codigo}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                  {canal.nome}
                </div>
              </div>
              <Forward size={14} style={{ color: 'var(--brown-light)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
