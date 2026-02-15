import { FolderOpen, X, PlusCircle, Plus, Columns } from 'lucide-react'

export default function TabsBar({
  openTabs,
  activeTabId,
  reviews,
  showReviewSelector,
  setShowReviewSelector,
  onSwitchTab,
  onCloseTab,
  onAddTab,
  onNewReview,
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 12px',
      borderBottom: '1px solid var(--stone)',
      background: 'var(--cream)',
      minHeight: '48px'
    }}>
      {/* Open Tabs */}
      {openTabs.map((tab) => (
        <div
          key={tab.reviewId}
          onClick={() => onSwitchTab(tab.reviewId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px 8px 0 0',
            background: activeTabId === tab.reviewId ? 'var(--white)' : 'transparent',
            border: activeTabId === tab.reviewId ? '1px solid var(--stone)' : '1px solid transparent',
            borderBottom: activeTabId === tab.reviewId ? '1px solid var(--white)' : '1px solid transparent',
            marginBottom: activeTabId === tab.reviewId ? '-1px' : '0',
            cursor: 'pointer',
            maxWidth: '200px',
            transition: 'all 0.15s'
          }}
        >
          <FolderOpen size={14} style={{ color: 'var(--brown)', flexShrink: 0 }} />
          <span style={{
            fontSize: '12px',
            fontWeight: activeTabId === tab.reviewId ? 600 : 400,
            color: 'var(--brown)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {tab.reviewCodigo ? `${tab.reviewCodigo} - ` : ''}{tab.reviewName}
          </span>
          <button
            onClick={(e) => onCloseTab(tab.reviewId, e)}
            style={{
              padding: '2px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--error)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--brown-light)'}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* Add Tab Button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowReviewSelector(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px dashed var(--stone)',
            cursor: 'pointer',
            color: 'var(--brown-light)',
            fontSize: '12px'
          }}
        >
          <PlusCircle size={14} />
          Adicionar
        </button>

        {/* Review Selector Dropdown */}
        {showReviewSelector && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: 'var(--white)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid var(--stone)',
            minWidth: '280px',
            maxHeight: '300px',
            overflow: 'auto',
            zIndex: 100
          }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--stone)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                Selecionar Pacote de Desenhos
              </span>
            </div>
            {reviews.filter(r => !openTabs.some(t => t.reviewId === r.id)).length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '12px' }}>
                Todos os pacotes já estão abertos
              </div>
            ) : (
              reviews.filter(r => !openTabs.some(t => t.reviewId === r.id)).map((review) => (
                <div
                  key={review.id}
                  onClick={() => {
                    onAddTab(review)
                    setShowReviewSelector(false)
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <FolderOpen size={16} style={{ color: 'var(--brown-light)' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                      {review.nome}
                    </div>
                    {review.codigo_documento && (
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                        {review.codigo_documento}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div
              onClick={() => {
                setShowReviewSelector(false)
                onNewReview()
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderTop: '1px solid var(--stone)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--brown)'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--cream)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={16} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Criar Novo Pacote</span>
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Open tabs count */}
      {openTabs.length > 1 && (
        <span style={{ fontSize: '11px', color: 'var(--brown-light)', marginRight: '8px' }}>
          <Columns size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          {openTabs.length} pacotes abertos
        </span>
      )}
    </div>
  )
}
