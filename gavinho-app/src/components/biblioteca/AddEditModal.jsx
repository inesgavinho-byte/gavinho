import { X, Layers, Box, Sparkles } from 'lucide-react'
import MaterialForm from './MaterialForm'
import Modelo3dForm from './Modelo3dForm'
import InspiracaoForm from './InspiracaoForm'
import TagSelector from './TagSelector'

export default function AddEditModal({
  activeTab, editingItem, setEditingItem,
  // Forms
  materialForm, setMaterialForm,
  modelo3dForm, setModelo3dForm,
  inspiracaoForm, setInspiracaoForm,
  // Data
  categorias, tags, projetos, getCategoriasByTipo,
  // File upload
  uploadingFile, tempFileUrl, setTempFileUrl, tempMiniaturaUrl, tempFichaTecnicaUrl,
  handleFileUpload,
  // Tags
  getCurrentFormTags, toggleTagInForm,
  showInlineTagInput, setShowInlineTagInput,
  inlineTagName, setInlineTagName,
  inlineTagColor, setInlineTagColor,
  handleInlineTagCreate,
  // Actions
  handleSave, closeModal
}) {
  const isSaveDisabled =
    (activeTab === 'materiais' && !materialForm.nome) ||
    (activeTab === 'modelos3d' && !modelo3dForm.nome) ||
    (activeTab === 'inspiracao' && !(tempFileUrl || editingItem?.imagem_url))

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{
        maxWidth: '640px', maxHeight: '90vh', overflow: 'hidden',
        borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '1px solid var(--stone)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, var(--off-white), var(--white))'
        }}>
          <div>
            <h3 style={{
              fontSize: '20px', fontWeight: 700, color: 'var(--brown)', margin: 0,
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              {activeTab === 'materiais' && <Layers size={22} style={{ color: 'var(--gold)' }} />}
              {activeTab === 'modelos3d' && <Box size={22} style={{ color: 'var(--gold)' }} />}
              {activeTab === 'inspiracao' && <Sparkles size={22} style={{ color: 'var(--gold)' }} />}
              {editingItem ? 'Editar' : 'Novo'} {activeTab === 'materiais' ? 'Material' : activeTab === 'modelos3d' ? 'Modelo 3D' : 'Inspiração'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
              {activeTab === 'materiais' && 'Adicionar à biblioteca de materiais'}
              {activeTab === 'modelos3d' && 'Adicionar à biblioteca de modelos 3D'}
              {activeTab === 'inspiracao' && 'Adicionar à biblioteca de inspiração'}
            </p>
          </div>
          <button
            onClick={closeModal}
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              border: '1px solid var(--stone)', background: 'var(--white)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} style={{ color: 'var(--brown-light)' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '24px 28px', overflowY: 'auto',
          maxHeight: 'calc(90vh - 180px)', background: 'var(--white)'
        }}>
          {activeTab === 'materiais' && (
            <MaterialForm
              form={materialForm} setForm={setMaterialForm}
              categorias={categorias} projetos={projetos}
              getCategoriasByTipo={getCategoriasByTipo}
              editingItem={editingItem} uploadingFile={uploadingFile}
              tempFileUrl={tempFileUrl} tempFichaTecnicaUrl={tempFichaTecnicaUrl}
              handleFileUpload={handleFileUpload}
            />
          )}

          {activeTab === 'modelos3d' && (
            <Modelo3dForm
              form={modelo3dForm} setForm={setModelo3dForm}
              getCategoriasByTipo={getCategoriasByTipo}
              editingItem={editingItem} uploadingFile={uploadingFile}
              tempFileUrl={tempFileUrl} tempMiniaturaUrl={tempMiniaturaUrl}
              handleFileUpload={handleFileUpload}
            />
          )}

          {activeTab === 'inspiracao' && (
            <InspiracaoForm
              form={inspiracaoForm} setForm={setInspiracaoForm}
              getCategoriasByTipo={getCategoriasByTipo} projetos={projetos}
              editingItem={editingItem} setEditingItem={setEditingItem}
              uploadingFile={uploadingFile} tempFileUrl={tempFileUrl} setTempFileUrl={setTempFileUrl}
              handleFileUpload={handleFileUpload}
            />
          )}

          {/* Tags Selection */}
          <TagSelector
            tags={tags} getCurrentFormTags={getCurrentFormTags} toggleTagInForm={toggleTagInForm}
            showInlineTagInput={showInlineTagInput} setShowInlineTagInput={setShowInlineTagInput}
            inlineTagName={inlineTagName} setInlineTagName={setInlineTagName}
            inlineTagColor={inlineTagColor} setInlineTagColor={setInlineTagColor}
            handleInlineTagCreate={handleInlineTagCreate}
          />
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={closeModal} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn btn-primary" disabled={isSaveDisabled}>
            {editingItem ? 'Guardar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
