// =====================================================
// DELETE CONFIRM MODAL
// Modal de confirmação para eliminar projeto
// =====================================================

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  projectName
}) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--brown)' }}>Eliminar Projeto</h3>
        <p style={{ margin: '0 0 24px', color: 'var(--brown-light)', fontSize: '14px' }}>
          Tem a certeza que deseja eliminar o projeto <strong>{projectName}</strong>? Esta ação não pode ser revertida.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'var(--stone)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              color: 'var(--brown)'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              background: 'var(--error)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
