import { X, Plus, Edit, Trash2, Check } from 'lucide-react'

export default function TagManagementModal({
  tags, newTag, setNewTag, editingTag, setEditingTag,
  handleSaveTag, handleUpdateTag, handleDeleteTag,
  onClose
}) {
  return (
    <div className="modal-overlay" onClick={() => { onClose(); setEditingTag(null) }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>Gerir Tags</h3>
          <button onClick={() => { onClose(); setEditingTag(null) }} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Nova Tag */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={newTag.nome}
              onChange={e => setNewTag({ ...newTag, nome: e.target.value })}
              placeholder="Nova tag..."
              className="form-input"
              style={{ flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && newTag.nome.trim() && handleSaveTag()}
            />
            <input
              type="color"
              value={newTag.cor}
              onChange={e => setNewTag({ ...newTag, cor: e.target.value })}
              style={{ width: '40px', height: '38px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '6px', cursor: 'pointer' }}
            />
            <button onClick={handleSaveTag} className="btn btn-primary" disabled={!newTag.nome.trim()}>
              <Plus size={16} />
            </button>
          </div>

          {/* Lista de Tags */}
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {tags.map(tag => (
              <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 8px', borderBottom: '1px solid var(--stone)' }}>
                {editingTag?.id === tag.id ? (
                  <>
                    <input
                      type="text"
                      value={editingTag.nome}
                      onChange={e => setEditingTag({ ...editingTag, nome: e.target.value })}
                      className="form-input"
                      style={{ flex: 1, padding: '6px 10px' }}
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleUpdateTag()}
                    />
                    <input
                      type="color"
                      value={editingTag.cor}
                      onChange={e => setEditingTag({ ...editingTag, cor: e.target.value })}
                      style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <button onClick={handleUpdateTag} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      <Check size={16} style={{ color: 'var(--success)' }} />
                    </button>
                    <button onClick={() => setEditingTag(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      <X size={16} style={{ color: 'var(--brown-light)' }} />
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: tag.cor }} />
                    <span style={{ flex: 1, fontSize: '13px' }}>{tag.nome}</span>
                    <button onClick={() => setEditingTag({ ...tag })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      <Edit size={14} style={{ color: 'var(--brown-light)' }} />
                    </button>
                    <button onClick={() => handleDeleteTag(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} style={{ color: 'var(--error)' }} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
