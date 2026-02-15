import {
  Search, Plus, Filter, Grid, List, Tag,
  Image, Box, Sparkles, Layers, Edit, Trash2
} from 'lucide-react'
import { TABS } from '../components/biblioteca/constants'
import useBibliotecaData from '../components/biblioteca/useBibliotecaData'
import ItemCard from '../components/biblioteca/ItemCard'
import AddEditModal from '../components/biblioteca/AddEditModal'
import TagManagementModal from '../components/biblioteca/TagManagementModal'
import CategoryManagementModal from '../components/biblioteca/CategoryManagementModal'
import DeleteConfirmModal from '../components/biblioteca/DeleteConfirmModal'
import PreviewModal from '../components/biblioteca/PreviewModal'
import BibliotecaStyles from '../components/biblioteca/BibliotecaStyles'

export default function Biblioteca() {
  const data = useBibliotecaData()

  const filteredItems = data.getFilteredItems()
  const currentCategorias = data.getCategoriasByTipo(data.activeTab === 'modelos3d' ? 'modelo3d' : data.activeTab)

  if (data.loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Biblioteca</h1>
          <p className="page-subtitle">Materiais, modelos 3D e inspiração</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => data.setShowCategoriaModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} /> Categorias
          </button>
          <button onClick={() => data.setShowTagModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={16} /> Tags
          </button>
          <button onClick={data.openNewModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0, marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--stone)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const count = tab.id === 'materiais' ? data.materiais.length :
                         tab.id === 'modelos3d' ? data.modelos3d.length : data.inspiracao.length
            return (
              <button
                key={tab.id}
                onClick={() => data.setActiveTab(tab.id)}
                style={{
                  padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: data.activeTab === tab.id ? 600 : 400,
                  color: data.activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
                  borderBottom: data.activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Icon size={18} />
                {tab.label}
                <span style={{
                  background: data.activeTab === tab.id ? 'var(--gold)' : 'var(--stone)',
                  color: data.activeTab === tab.id ? 'white' : 'var(--brown-light)',
                  padding: '2px 8px', borderRadius: '10px', fontSize: '11px'
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
            <input
              type="text" placeholder="Pesquisar..."
              value={data.searchTerm} onChange={e => data.setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}
            />
          </div>

          <select
            value={data.selectedCategoria} onChange={e => data.setSelectedCategoria(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', minWidth: '150px' }}
          >
            <option value="">Todas as categorias</option>
            {currentCategorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>

          <div style={{ display: 'flex', border: '1px solid var(--stone)', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => data.setViewMode('grid')}
              style={{
                padding: '8px 12px',
                background: data.viewMode === 'grid' ? 'var(--brown)' : 'white',
                color: data.viewMode === 'grid' ? 'white' : 'var(--brown)',
                border: 'none', cursor: 'pointer'
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => data.setViewMode('list')}
              style={{
                padding: '8px 12px',
                background: data.viewMode === 'list' ? 'var(--brown)' : 'white',
                color: data.viewMode === 'list' ? 'white' : 'var(--brown)',
                border: 'none', cursor: 'pointer'
              }}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Tags Filter */}
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {data.tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => data.setSelectedTags(prev =>
                prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
              )}
              style={{
                padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                border: data.selectedTags.includes(tag.id) ? '2px solid var(--brown)' : '1px solid var(--stone)',
                background: data.selectedTags.includes(tag.id) ? tag.cor + '30' : 'white',
                color: 'var(--brown)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.cor }} />
              {tag.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filteredItems.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px', opacity: 0.3 }}>
            {data.activeTab === 'materiais' ? <Layers size={48} /> : data.activeTab === 'modelos3d' ? <Box size={48} /> : <Sparkles size={48} />}
          </div>
          <p style={{ color: 'var(--brown-light)', marginBottom: '16px' }}>
            {data.searchTerm || data.selectedCategoria || data.selectedTags.length > 0
              ? 'Nenhum resultado encontrado'
              : `Ainda não há ${data.activeTab === 'materiais' ? 'materiais' : data.activeTab === 'modelos3d' ? 'modelos 3D' : 'imagens de inspiração'}`
            }
          </p>
          <button onClick={data.openNewModal} className="btn btn-primary">
            <Plus size={16} /> Adicionar {data.activeTab === 'materiais' ? 'Material' : data.activeTab === 'modelos3d' ? 'Modelo' : 'Imagem'}
          </button>
        </div>
      ) : data.viewMode === 'grid' ? (
        <div className={data.activeTab === 'inspiracao' ? 'biblioteca-masonry' : 'biblioteca-grid-regular'}>
          {filteredItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              type={data.activeTab}
              tags={data.tags}
              categorias={data.categorias}
              onEdit={() => data.openEditModal(item)}
              onDelete={() => data.setShowDeleteConfirm(item)}
              onPreview={() => data.setShowPreview(item)}
              onToggleFavorite={data.activeTab === 'inspiracao' ? () => data.handleToggleFavorite(item) : null}
              fixedHeight={data.activeTab !== 'inspiracao'}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>
                  {data.activeTab === 'inspiracao' ? 'Imagem' : 'Preview'}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Nome</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Categoria</th>
                {data.activeTab === 'materiais' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Fornecedor</th>}
                {data.activeTab === 'materiais' && <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Preço/m²</th>}
                {data.activeTab === 'modelos3d' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Formato</th>}
                {data.activeTab === 'modelos3d' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Dimensões</th>}
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const categoria = data.categorias.find(c => c.id === item.categoria_id)
                const imageUrl = data.activeTab === 'materiais' ? item.textura_url :
                                 data.activeTab === 'modelos3d' ? item.miniatura_url : item.imagem_url
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--stone)' }}>
                    <td style={{ padding: '8px 16px' }}>
                      <div
                        onClick={() => data.setShowPreview(item)}
                        style={{
                          width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                          background: imageUrl ? `url(${imageUrl}) center/cover` : 'var(--stone)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {!imageUrl && <Image size={20} style={{ color: 'var(--brown-light)' }} />}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500 }}>{item.nome || '(sem nome)'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--brown-light)' }}>{categoria?.nome || '-'}</td>
                    {data.activeTab === 'materiais' && <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.fornecedor || '-'}</td>}
                    {data.activeTab === 'materiais' && <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right' }}>{item.preco_m2 ? `€${item.preco_m2}` : '-'}</td>}
                    {data.activeTab === 'modelos3d' && <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.formato || '-'}</td>}
                    {data.activeTab === 'modelos3d' && <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.largura_cm && item.altura_cm && item.profundidade_cm ? `${item.largura_cm}×${item.altura_cm}×${item.profundidade_cm} cm` : '-'}</td>}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button onClick={() => data.openEditModal(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginRight: '4px' }}>
                        <Edit size={16} style={{ color: 'var(--brown-light)' }} />
                      </button>
                      <button onClick={() => data.setShowDeleteConfirm(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} style={{ color: 'var(--error)' }} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {data.showModal && (
        <AddEditModal
          activeTab={data.activeTab}
          editingItem={data.editingItem} setEditingItem={data.setEditingItem}
          materialForm={data.materialForm} setMaterialForm={data.setMaterialForm}
          modelo3dForm={data.modelo3dForm} setModelo3dForm={data.setModelo3dForm}
          inspiracaoForm={data.inspiracaoForm} setInspiracaoForm={data.setInspiracaoForm}
          categorias={data.categorias} tags={data.tags} projetos={data.projetos}
          getCategoriasByTipo={data.getCategoriasByTipo}
          uploadingFile={data.uploadingFile}
          tempFileUrl={data.tempFileUrl} setTempFileUrl={data.setTempFileUrl}
          tempMiniaturaUrl={data.tempMiniaturaUrl}
          tempFichaTecnicaUrl={data.tempFichaTecnicaUrl}
          handleFileUpload={data.handleFileUpload}
          getCurrentFormTags={data.getCurrentFormTags} toggleTagInForm={data.toggleTagInForm}
          showInlineTagInput={data.showInlineTagInput} setShowInlineTagInput={data.setShowInlineTagInput}
          inlineTagName={data.inlineTagName} setInlineTagName={data.setInlineTagName}
          inlineTagColor={data.inlineTagColor} setInlineTagColor={data.setInlineTagColor}
          handleInlineTagCreate={data.handleInlineTagCreate}
          handleSave={data.handleSave} closeModal={data.closeModal}
        />
      )}

      {data.showTagModal && (
        <TagManagementModal
          tags={data.tags}
          newTag={data.newTag} setNewTag={data.setNewTag}
          editingTag={data.editingTag} setEditingTag={data.setEditingTag}
          handleSaveTag={data.handleSaveTag}
          handleUpdateTag={data.handleUpdateTag}
          handleDeleteTag={data.handleDeleteTag}
          onClose={() => data.setShowTagModal(false)}
        />
      )}

      {data.showCategoriaModal && (
        <CategoryManagementModal
          categorias={data.categorias}
          newCategoria={data.newCategoria} setNewCategoria={data.setNewCategoria}
          editingCategoria={data.editingCategoria} setEditingCategoria={data.setEditingCategoria}
          handleSaveCategoria={data.handleSaveCategoria}
          handleUpdateCategoria={data.handleUpdateCategoria}
          handleDeleteCategoria={data.handleDeleteCategoria}
          onClose={() => data.setShowCategoriaModal(false)}
        />
      )}

      {data.showDeleteConfirm && (
        <DeleteConfirmModal
          item={data.showDeleteConfirm}
          onConfirm={data.handleDelete}
          onClose={() => data.setShowDeleteConfirm(null)}
        />
      )}

      {data.showPreview && (
        <PreviewModal
          item={data.showPreview}
          activeTab={data.activeTab}
          onClose={() => data.setShowPreview(null)}
        />
      )}

      <BibliotecaStyles />
    </div>
  )
}
