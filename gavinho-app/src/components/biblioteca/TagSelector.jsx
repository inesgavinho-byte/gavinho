import { Plus, Check } from 'lucide-react'

export default function TagSelector({
  tags, getCurrentFormTags, toggleTagInForm,
  showInlineTagInput, setShowInlineTagInput,
  inlineTagName, setInlineTagName,
  inlineTagColor, setInlineTagColor,
  handleInlineTagCreate
}) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--brown)' }}>
        <span>Tags</span>
        <button
          type="button"
          onClick={() => setShowInlineTagInput(!showInlineTagInput)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blush)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Plus size={14} /> Nova Tag
        </button>
      </label>

      {showInlineTagInput && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', padding: '10px', background: 'var(--cream)', borderRadius: '8px' }}>
          <input
            type="text"
            value={inlineTagName}
            onChange={e => setInlineTagName(e.target.value)}
            placeholder="Nome da tag..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '13px' }}
            onKeyDown={e => e.key === 'Enter' && handleInlineTagCreate()}
          />
          <input
            type="color"
            value={inlineTagColor}
            onChange={e => setInlineTagColor(e.target.value)}
            style={{ width: '36px', height: '36px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '6px', cursor: 'pointer' }}
          />
          <button
            type="button"
            onClick={handleInlineTagCreate}
            disabled={!inlineTagName.trim()}
            style={{ padding: '8px 12px', background: inlineTagName.trim() ? 'var(--brown)' : 'var(--stone)', color: 'white', border: 'none', borderRadius: '6px', cursor: inlineTagName.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontSize: '12px' }}
          >
            Criar
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {tags.map(tag => {
          const isSelected = getCurrentFormTags().includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTagInForm(tag.id)}
              style={{
                padding: '6px 12px', borderRadius: '16px', fontSize: '12px',
                border: isSelected ? `2px solid ${tag.cor}` : '1px solid var(--stone)',
                background: isSelected ? tag.cor + '25' : 'white',
                color: 'var(--brown)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tag.cor, border: isSelected ? '2px solid white' : 'none', boxShadow: isSelected ? `0 0 0 1px ${tag.cor}` : 'none' }} />
              {tag.nome}
              {isSelected && <Check size={12} style={{ color: tag.cor }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
