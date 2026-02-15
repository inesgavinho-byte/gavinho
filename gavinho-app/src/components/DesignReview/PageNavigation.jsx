import { ChevronLeft, ChevronRight, Upload, Trash2 } from 'lucide-react'

export default function PageNavigation({
  selectedReview,
  currentPage,
  numPages,
  setCurrentPage,
  onDeleteReview,
  onUploadNewVersion,
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '12px',
      borderTop: '1px solid var(--stone)',
      background: 'var(--white)'
    }}>
      {selectedReview && (
        <span style={{ fontSize: '13px', color: 'var(--brown-light)', marginRight: 'auto' }}>
          {selectedReview.codigo_documento} - {selectedReview.nome}
        </span>
      )}
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage <= 1}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          border: '1px solid var(--stone)',
          background: 'var(--white)',
          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          opacity: currentPage <= 1 ? 0.5 : 1
        }}
      >
        <ChevronLeft size={18} />
      </button>
      <span style={{ fontSize: '13px', minWidth: '100px', textAlign: 'center' }}>
        Folha {currentPage} de {numPages || '?'}
      </span>
      <button
        onClick={() => setCurrentPage(p => Math.min(numPages || 1, p + 1))}
        disabled={currentPage >= (numPages || 1)}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          border: '1px solid var(--stone)',
          background: 'var(--white)',
          cursor: currentPage >= (numPages || 1) ? 'not-allowed' : 'pointer',
          opacity: currentPage >= (numPages || 1) ? 0.5 : 1
        }}
      >
        <ChevronRight size={18} />
      </button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
        <button
          onClick={onDeleteReview}
          className="btn"
          style={{ padding: '8px 12px', color: 'var(--error)', border: '1px solid rgba(180,100,100,0.3)' }}
          title="Eliminar pacote de desenhos"
        >
          <Trash2 size={14} style={{ marginRight: '6px' }} />
          Eliminar
        </button>
        <button
          onClick={onUploadNewVersion}
          className="btn btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <Upload size={14} style={{ marginRight: '6px' }} />
          Nova Versao
        </button>
      </div>
    </div>
  )
}
