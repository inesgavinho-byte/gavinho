import { Upload } from 'lucide-react'

export default function UploadVersionModal({ onClose, onUpload }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--white)',
        borderRadius: '16px',
        padding: '24px',
        width: '400px',
        maxWidth: '90vw'
      }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--brown)' }}>
          Nova Versao
        </h3>
        <div
          style={{
            border: '2px dashed var(--stone)',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('version-upload').click()}
        >
          <Upload size={32} style={{ color: 'var(--brown-light)', marginBottom: '8px' }} />
          <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>
            Clique ou arraste um ficheiro PDF
          </p>
          <input
            id="version-upload"
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onUpload(e.target.files[0])
              }
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
