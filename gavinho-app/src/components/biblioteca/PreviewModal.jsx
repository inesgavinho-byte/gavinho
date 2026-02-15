import { X } from 'lucide-react'

export default function PreviewModal({ item, activeTab, onClose }) {
  const imageUrl = activeTab === 'materiais' ? item.textura_url :
                   activeTab === 'modelos3d' ? item.miniatura_url : item.imagem_url

  return (
    <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none',
            color: 'white', cursor: 'pointer', padding: '8px'
          }}
        >
          <X size={24} />
        </button>
        <img
          src={imageUrl}
          alt={item.nome}
          style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
        />
        <div style={{ color: 'white', textAlign: 'center', marginTop: '12px' }}>
          <div style={{ fontWeight: 600 }}>{item.nome}</div>
          {item.fornecedor && <div style={{ fontSize: '13px', opacity: 0.8 }}>{item.fornecedor}</div>}
        </div>
      </div>
    </div>
  )
}
