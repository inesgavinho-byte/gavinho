// =====================================================
// INTERVENIENTE MODAL
// Modal para adicionar/editar intervenientes do projeto
// =====================================================

import { X } from 'lucide-react'
import { TIPOS_INTERVENIENTES } from '../../../constants/projectConstants'

export default function IntervenienteModal({
  isOpen,
  onClose,
  onSave,
  intervenienteForm,
  setIntervenienteForm,
  editingInterveniente
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--stone)', paddingBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
              {editingInterveniente ? 'Editar Interveniente' : 'Adicionar Interveniente'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--brown-light)' }}>
              Registe os intervenientes externos do projeto
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          {/* Tipo e Entidade */}
          <div style={{
            background: 'var(--cream)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Identificação
            </h4>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                Tipo de Interveniente *
              </label>
              <select
                value={intervenienteForm.tipo}
                onChange={(e) => setIntervenienteForm(prev => ({ ...prev, tipo: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--white)',
                  color: 'var(--brown)'
                }}
              >
                <option value="">Selecionar tipo...</option>
                {TIPOS_INTERVENIENTES.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                  Entidade / Empresa
                </label>
                <input
                  type="text"
                  value={intervenienteForm.entidade}
                  onChange={(e) => setIntervenienteForm(prev => ({ ...prev, entidade: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Nome da empresa ou entidade"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                  Contacto Geral
                </label>
                <input
                  type="text"
                  value={intervenienteForm.contacto_geral}
                  onChange={(e) => setIntervenienteForm(prev => ({ ...prev, contacto_geral: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="email@empresa.pt ou telefone"
                />
              </div>
            </div>
          </div>

          {/* Responsável Principal */}
          <div style={{
            background: 'var(--cream)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Responsável Principal
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={intervenienteForm.responsavel_nome}
                  onChange={(e) => setIntervenienteForm(prev => ({ ...prev, responsavel_nome: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={intervenienteForm.responsavel_email}
                  onChange={(e) => setIntervenienteForm(prev => ({ ...prev, responsavel_email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="email@exemplo.pt"
                />
              </div>
            </div>
          </div>

          {/* Responsável Secundário */}
          <div style={{
            background: 'var(--cream)',
            padding: '20px',
            borderRadius: '12px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Responsável Secundário <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={intervenienteForm.responsavel_secundario_nome}
                  onChange={(e) => setIntervenienteForm(prev => ({ ...prev, responsavel_secundario_nome: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={intervenienteForm.responsavel_secundario_email}
                  onChange={(e) => setIntervenienteForm(prev => ({ ...prev, responsavel_secundario_email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="email@exemplo.pt"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ borderTop: '1px solid var(--stone)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '10px 20px' }}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={!intervenienteForm.tipo}
            style={{ padding: '10px 24px' }}
          >
            {editingInterveniente ? 'Guardar Alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
