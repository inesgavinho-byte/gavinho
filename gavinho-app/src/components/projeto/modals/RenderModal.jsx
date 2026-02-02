// =====================================================
// RENDER MODAL
// Modal para adicionar/editar renders do projeto
// =====================================================

import { X, Upload } from 'lucide-react'
import { COMPARTIMENTOS } from '../../../constants/projectConstants'

export default function RenderModal({
  isOpen,
  onClose,
  onSave,
  renderForm,
  setRenderForm,
  editingRender,
  isDragging,
  getNextVersion,
  onCompartimentoChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onImageUpload,
  projetoCompartimentos = [] // Compartimentos específicos do projeto
}) {
  if (!isOpen) return null

  // Combinar compartimentos do projeto com os gerais (projeto primeiro)
  const allCompartimentos = [
    ...projetoCompartimentos.filter(c => !COMPARTIMENTOS.includes(c)),
    ...COMPARTIMENTOS
  ]

  // Remover duplicados
  const uniqueCompartimentos = [...new Set(allCompartimentos)]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          margin: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--stone)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
            {editingRender ? 'Editar Render' : 'Adicionar Render'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px' }}>
          {/* Compartimento */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
              Compartimento *
            </label>
            <input
              type="text"
              list="compartimentos-list"
              value={renderForm.compartimento}
              onChange={(e) => onCompartimentoChange(e.target.value)}
              placeholder="Selecionar ou escrever nome..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--white)',
                color: 'var(--brown)'
              }}
            />
            <datalist id="compartimentos-list">
              {projetoCompartimentos.length > 0 && (
                <>
                  <option disabled>── Deste Projeto ──</option>
                  {projetoCompartimentos.map(comp => (
                    <option key={`proj-${comp}`} value={comp} />
                  ))}
                  <option disabled>── Sugestões ──</option>
                </>
              )}
              {COMPARTIMENTOS.map(comp => (
                <option key={comp} value={comp} />
              ))}
            </datalist>
            <p style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '6px' }}>
              Selecione da lista ou escreva um nome personalizado
            </p>
          </div>

          {/* Vista */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
              Vista
            </label>
            <input
              type="text"
              value={renderForm.vista || ''}
              onChange={(e) => setRenderForm(prev => ({ ...prev, vista: e.target.value }))}
              placeholder="Ex: Vista Frontal, Vista Diagonal, Detalhe Sofá..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--white)',
                color: 'var(--brown)'
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '6px' }}>
              Diferenciar várias vistas dentro do mesmo compartimento
            </p>
          </div>

          {/* Versão (auto) */}
          {renderForm.compartimento && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 16px',
              background: 'var(--cream)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Versão automática
              </span>
              <span style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--brown)',
                background: 'var(--white)',
                padding: '4px 12px',
                borderRadius: '6px'
              }}>
                v{editingRender ? renderForm.versao : getNextVersion(renderForm.compartimento, renderForm.vista)}
              </span>
            </div>
          )}

          {/* Imagem Upload com Drag & Drop */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
              Imagem do Render
            </label>
            <div
              style={{
                position: 'relative',
                aspectRatio: '16/10',
                background: renderForm.imagem_url ? `url(${renderForm.imagem_url}) center/cover` : 'var(--cream)',
                borderRadius: '12px',
                border: isDragging ? '3px dashed var(--info)' : '2px dashed var(--stone)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.2s',
                transform: isDragging ? 'scale(1.02)' : 'scale(1)'
              }}
              onClick={() => document.getElementById('render-image-input').click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              {!renderForm.imagem_url && (
                <>
                  <Upload size={32} style={{ color: isDragging ? 'var(--info)' : 'var(--brown-light)', opacity: isDragging ? 1 : 0.5, marginBottom: '8px' }} />
                  <span style={{ fontSize: '13px', color: isDragging ? 'var(--info)' : 'var(--brown-light)', fontWeight: isDragging ? 600 : 400 }}>
                    {isDragging ? 'Largue a imagem aqui' : 'Arraste ou clique para fazer upload'}
                  </span>
                </>
              )}
              {renderForm.imagem_url && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  padding: '6px 12px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}>
                  Arraste ou clique para alterar
                </div>
              )}
            </div>
            <input
              id="render-image-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onImageUpload}
            />
          </div>

          {/* Data de Carregamento */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
              Data de Carregamento
            </label>
            <input
              type="date"
              value={renderForm.data_upload}
              onChange={(e) => setRenderForm(prev => ({ ...prev, data_upload: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--white)',
                color: 'var(--brown)'
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '6px' }}>
              Altere a data para registar histórico de imagens anteriores
            </p>
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
              Descrição (opcional)
            </label>
            <textarea
              value={renderForm.descricao}
              onChange={(e) => setRenderForm(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Notas sobre este render..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Marcar como Final */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: renderForm.is_final ? 'rgba(var(--success-rgb), 0.1)' : 'var(--cream)',
            borderRadius: '12px',
            border: renderForm.is_final ? '2px solid var(--success)' : '1px solid var(--stone)'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={renderForm.is_final}
                onChange={(e) => setRenderForm(prev => ({ ...prev, is_final: e.target.checked }))}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--success)'
                }}
              />
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brown)', display: 'block' }}>
                  Marcar como Imagem Final
                </span>
                <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                  Esta imagem aparecerá nas entregas ao cliente
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          padding: '16px 24px',
          borderTop: '1px solid var(--stone)',
          background: 'var(--cream)'
        }}>
          <button onClick={onClose} className="btn btn-outline">
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="btn btn-primary"
            disabled={!renderForm.compartimento}
          >
            {editingRender ? 'Guardar Alterações' : 'Adicionar Render'}
          </button>
        </div>
      </div>
    </div>
  )
}
