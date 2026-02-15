import { X } from 'lucide-react'

export default function DeleteConfirmModal({ item, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Eliminar</h3>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p>Tens a certeza que queres eliminar "{item.nome || 'este item'}"?</p>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button onClick={() => onConfirm(item)} className="btn" style={{ background: 'var(--error)', color: 'white' }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}
