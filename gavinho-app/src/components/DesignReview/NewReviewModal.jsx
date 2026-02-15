import { Upload, Eye, X } from 'lucide-react'

export default function NewReviewModal({ onClose, onSubmit, name, setName, codigo, setCodigo, file, setFile, loading, error }) {
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
        width: '450px',
        maxWidth: '90vw'
      }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--brown)' }}>
          Novo Design Review
        </h3>

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: '#FEE2E2',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            color: '#B91C1C',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>
            Nome do Documento *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Planta Piso 0"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--stone)',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>
            Codigo do Documento
          </label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ex: 01.01.01"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--stone)',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>
            Ficheiro PDF *
          </label>
          <div
            style={{
              border: file ? '1px solid var(--stone)' : '2px dashed var(--stone)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? 'var(--cream)' : 'transparent'
            }}
            onClick={() => document.getElementById('new-review-upload').click()}
          >
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Eye size={20} style={{ color: 'var(--brown)' }} />
                <span style={{ color: 'var(--brown)', fontSize: '13px' }}>{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={16} style={{ color: 'var(--brown-light)' }} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} style={{ color: 'var(--brown-light)', marginBottom: '8px' }} />
                <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>
                  Clique para selecionar um PDF
                </p>
              </>
            )}
            <input
              id="new-review-upload"
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFile(e.target.files[0])
                }
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={!name.trim() || !file || loading}
            style={{ minWidth: '120px' }}
          >
            {loading ? 'A criar...' : 'Criar Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
