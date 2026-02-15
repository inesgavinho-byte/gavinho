import { Trash2 } from 'lucide-react'

export default function DeleteConfirmModal({
  pageIndex,
  onCancel,
  onConfirm,
}) {
  if (pageIndex === null) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001,
    }} onClick={onCancel}>
      <div style={{
        background: '#FFFFFF', borderRadius: 12, padding: 24,
        maxWidth: 400, width: '90%',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#FEE2E2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={20} color="#DC2626" />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#5F5C59', marginBottom: 4 }}>
              Apagar Página {pageIndex + 1}?
            </h3>
            <p style={{ fontSize: 13, color: '#8B8670' }}>
              Esta ação não pode ser revertida.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              border: '1px solid #E0DED8', background: '#FFFFFF',
              color: '#5F5C59', fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(pageIndex)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              border: 'none', background: '#DC2626',
              color: '#FFFFFF', fontSize: 14, cursor: 'pointer',
            }}
          >
            Apagar Página
          </button>
        </div>
      </div>
    </div>
  )
}
