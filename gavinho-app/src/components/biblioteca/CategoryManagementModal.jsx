import { X, Plus, Edit, Trash2, Check, Layers } from 'lucide-react'
import { ICON_MAP } from './constants'

const CATEGORY_TYPES = [
  { id: 'materiais', label: 'Materiais' },
  { id: 'modelo3d', label: 'Modelos 3D' },
  { id: 'inspiracao', label: 'Inspiração' }
]

export default function CategoryManagementModal({
  categorias, newCategoria, setNewCategoria,
  editingCategoria, setEditingCategoria,
  handleSaveCategoria, handleUpdateCategoria, handleDeleteCategoria,
  onClose
}) {
  return (
    <div className="modal-overlay" onClick={() => { onClose(); setEditingCategoria(null) }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h3>Gerir Categorias</h3>
          <button onClick={() => { onClose(); setEditingCategoria(null) }} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Nova Categoria */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newCategoria.nome}
              onChange={e => setNewCategoria({ ...newCategoria, nome: e.target.value })}
              placeholder="Nova categoria..."
              className="form-input"
              style={{ flex: 1, minWidth: '150px' }}
              onKeyDown={e => e.key === 'Enter' && newCategoria.nome.trim() && handleSaveCategoria()}
            />
            <select
              value={newCategoria.tipo}
              onChange={e => setNewCategoria({ ...newCategoria, tipo: e.target.value })}
              className="form-input"
              style={{ width: '130px' }}
            >
              <option value="materiais">Materiais</option>
              <option value="modelo3d">Modelos 3D</option>
              <option value="inspiracao">Inspiração</option>
            </select>
            <input
              type="color"
              value={newCategoria.cor}
              onChange={e => setNewCategoria({ ...newCategoria, cor: e.target.value })}
              style={{ width: '40px', height: '38px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '6px', cursor: 'pointer' }}
            />
            <button onClick={handleSaveCategoria} className="btn btn-primary" disabled={!newCategoria.nome.trim()}>
              <Plus size={16} />
            </button>
          </div>

          {/* Tabs por tipo */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {CATEGORY_TYPES.map(tipo => (
              <button
                key={tipo.id}
                onClick={() => setNewCategoria(prev => ({ ...prev, tipo: tipo.id }))}
                style={{
                  padding: '6px 12px', fontSize: '12px',
                  border: '1px solid var(--stone)', borderRadius: '6px',
                  background: newCategoria.tipo === tipo.id ? 'var(--brown)' : 'white',
                  color: newCategoria.tipo === tipo.id ? 'white' : 'var(--brown)',
                  cursor: 'pointer'
                }}
              >
                {tipo.label} ({categorias.filter(c => c.tipo === tipo.id).length})
              </button>
            ))}
          </div>

          {/* Lista de Categorias */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {categorias.filter(c => c.tipo === newCategoria.tipo).map(cat => {
              const IconComponent = ICON_MAP[cat.icone] || Layers
              return (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 8px', borderBottom: '1px solid var(--stone)' }}>
                  {editingCategoria?.id === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editingCategoria.nome}
                        onChange={e => setEditingCategoria({ ...editingCategoria, nome: e.target.value })}
                        className="form-input"
                        style={{ flex: 1, padding: '6px 10px' }}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleUpdateCategoria()}
                      />
                      <input
                        type="color"
                        value={editingCategoria.cor || '#C9A882'}
                        onChange={e => setEditingCategoria({ ...editingCategoria, cor: e.target.value })}
                        style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      <button onClick={handleUpdateCategoria} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Check size={16} style={{ color: 'var(--success)' }} />
                      </button>
                      <button onClick={() => setEditingCategoria(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={16} style={{ color: 'var(--brown-light)' }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <IconComponent size={16} style={{ color: cat.cor || 'var(--brown-light)' }} />
                      <span style={{ flex: 1, fontSize: '13px' }}>{cat.nome}</span>
                      <button onClick={() => setEditingCategoria({ ...cat })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Edit size={14} style={{ color: 'var(--brown-light)' }} />
                      </button>
                      <button onClick={() => handleDeleteCategoria(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={14} style={{ color: 'var(--error)' }} />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
            {categorias.filter(c => c.tipo === newCategoria.tipo).length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px' }}>
                Sem categorias neste tipo
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
