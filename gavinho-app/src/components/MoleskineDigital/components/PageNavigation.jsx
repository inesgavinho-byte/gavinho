import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

export default function PageNavigation({
  currentPageIndex,
  totalPages,
  goToPage,
  showPagesList,
  setShowPagesList,
  onAddPage,
}) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, alignItems: 'center',
      background: '#F2F0E7', padding: '8px 16px', borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <button onClick={() => goToPage(currentPageIndex - 1)} disabled={currentPageIndex === 0}
        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6, border: '1px solid #E0DED8', background: '#FFFFFF',
          cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
          color: currentPageIndex === 0 ? '#D1D5DB' : '#5F5C59' }}>
        <ChevronLeft size={18} />
      </button>

      <button onClick={() => setShowPagesList(!showPagesList)}
        style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #E0DED8',
          background: '#FFFFFF', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5F5C59' }}>
        {currentPageIndex + 1} / {totalPages}
      </button>

      <button onClick={() => goToPage(currentPageIndex + 1)} disabled={currentPageIndex === totalPages - 1}
        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6, border: '1px solid #E0DED8', background: '#FFFFFF',
          cursor: currentPageIndex === totalPages - 1 ? 'not-allowed' : 'pointer',
          color: currentPageIndex === totalPages - 1 ? '#D1D5DB' : '#5F5C59' }}>
        <ChevronRight size={18} />
      </button>

      <div style={{ width: 1, height: 24, background: '#E0DED8', margin: '0 4px' }} />

      <button onClick={onAddPage} title="Nova Página"
        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6, border: 'none', background: '#8B8670', color: '#FFFFFF', cursor: 'pointer' }}>
        <Plus size={18} />
      </button>
    </div>
  )
}
