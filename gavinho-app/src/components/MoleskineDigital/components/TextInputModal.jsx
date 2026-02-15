export default function TextInputModal({
  textPosition,
  textInput,
  setTextInput,
  onSubmit,
  onCancel,
  scale,
  offset,
}) {
  if (!textPosition) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: textPosition.x * scale + offset.x,
        top: textPosition.y * scale + offset.y,
        transform: 'translate(-50%, -100%)',
        background: '#FFFFFF', borderRadius: 8, padding: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 100,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
        placeholder="Escreva aqui..."
        style={{
          width: 200, padding: '8px 12px', borderRadius: 6,
          border: '1px solid #E0DED8', fontSize: 14, outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #E0DED8',
            background: '#FFFFFF', fontSize: 13, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={onSubmit} disabled={!textInput.trim()}
          style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none',
            background: textInput.trim() ? '#8B8670' : '#E5E5E5',
            color: textInput.trim() ? '#FFFFFF' : '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
          Adicionar
        </button>
      </div>
    </div>
  )
}
