export default function LinkInputModal({
  linkPosition,
  linkInput,
  setLinkInput,
  onSubmit,
  onCancel,
  scale,
  offset,
}) {
  if (!linkPosition) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: linkPosition.x * scale + offset.x,
        top: linkPosition.y * scale + offset.y,
        transform: 'translate(-50%, -100%)',
        background: '#FFFFFF', borderRadius: 8, padding: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 100,
        minWidth: 280,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={linkInput.url}
        onChange={(e) => setLinkInput(prev => ({ ...prev, url: e.target.value }))}
        autoFocus
        placeholder="https://..."
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 6,
          border: '1px solid #E0DED8', fontSize: 14, outline: 'none', marginBottom: 8,
        }}
      />
      <input
        type="text"
        value={linkInput.label}
        onChange={(e) => setLinkInput(prev => ({ ...prev, label: e.target.value }))}
        placeholder="Texto do link (opcional)"
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 6,
          border: '1px solid #E0DED8', fontSize: 14, outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #E0DED8',
            background: '#FFFFFF', fontSize: 13, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={onSubmit} disabled={!linkInput.url.trim()}
          style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none',
            background: linkInput.url.trim() ? '#4338CA' : '#E5E5E5',
            color: linkInput.url.trim() ? '#FFFFFF' : '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
          Adicionar Link
        </button>
      </div>
    </div>
  )
}
