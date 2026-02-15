import {
  BookOpen,
  FilePlus,
  Layers,
  Download,
  Save,
  Loader2,
  X,
} from 'lucide-react'

export default function MoleskineHeader({
  notebookName,
  setNotebookName,
  currentPageIndex,
  totalPages,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  isSaving,
  saveNotebook,
  loadingPdf,
  isExporting,
  pdfInputRef,
  onImportRender,
  exportToPdf,
  onClose,
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', background: '#F2F0E7', borderBottom: '1px solid #E0DED8',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <BookOpen size={24} style={{ color: '#8B8670' }} />
        <input
          type="text"
          value={notebookName}
          onChange={(e) => {
            setNotebookName(e.target.value)
            setHasUnsavedChanges(true)
          }}
          style={{
            fontSize: 18, fontWeight: 600, color: '#5F5C59',
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            border: 'none', background: 'transparent', outline: 'none',
            minWidth: 200,
          }}
        />
        <span style={{ fontSize: 13, color: '#8B8670' }}>
          Página {currentPageIndex + 1} de {totalPages}
        </span>
        {hasUnsavedChanges && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4,
            background: '#FEF3C7', color: '#D97706',
          }}>
            Por guardar
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => pdfInputRef.current?.click()}
          disabled={loadingPdf}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 6,
            border: '1px solid #E0DED8', background: '#FFFFFF',
            color: '#5F5C59', fontSize: 13, cursor: loadingPdf ? 'wait' : 'pointer',
            opacity: loadingPdf ? 0.7 : 1,
          }}
        >
          {loadingPdf ? <Loader2 size={16} className="animate-spin" /> : <FilePlus size={16} />}
          Importar PDF
        </button>
        <button
          onClick={onImportRender}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 6,
            border: '1px solid #E0DED8', background: '#FFFFFF',
            color: '#5F5C59', fontSize: 13, cursor: 'pointer',
          }}
        >
          <Layers size={16} />
          Importar Render
        </button>
        <button
          onClick={exportToPdf}
          disabled={isExporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 6,
            border: '1px solid #E0DED8', background: '#FFFFFF',
            color: '#5F5C59', fontSize: 13, cursor: isExporting ? 'wait' : 'pointer',
            opacity: isExporting ? 0.7 : 1,
          }}
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Exportar PDF
        </button>
        <button
          onClick={saveNotebook}
          disabled={isSaving || !hasUnsavedChanges}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 6, border: 'none',
            background: hasUnsavedChanges ? '#8B8670' : '#E5E5E5',
            color: hasUnsavedChanges ? '#FFFFFF' : '#9CA3AF',
            fontSize: 13, cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
          }}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar
        </button>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, border: '1px solid #E0DED8', background: '#FFFFFF',
            color: '#5F5C59', cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
