// =====================================================
// EDIT PROJECT MODAL
// Modal para editar dados gerais do projeto
// =====================================================

import { X, Plus } from 'lucide-react'
import {
  TIPOLOGIAS,
  SUBTIPOS,
  FASES,
  STATUS_OPTIONS
} from '../../../constants/projectConstants'

export default function EditProjectModal({
  isOpen,
  onClose,
  onSave,
  editForm,
  setEditForm,
  clientes,
  equipaProjeto,
  saving,
  onShowEquipaModal,
  onRemoveMembro
}) {
  if (!isOpen) return null

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
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'auto',
          margin: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--stone)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Editar Projeto</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Nome */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
              Nome do Projeto *
            </label>
            <input
              type="text"
              value={editForm.nome || ''}
              onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '15px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Cliente */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
              Cliente
            </label>
            <select
              value={editForm.cliente_id || ''}
              onChange={e => setEditForm({ ...editForm, cliente_id: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '15px'
              }}
            >
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome} {c.codigo ? `(${c.codigo})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Tipologia e Subtipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Tipologia
              </label>
              <select
                value={editForm.tipologia || ''}
                onChange={e => setEditForm({ ...editForm, tipologia: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
              >
                {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Subtipo
              </label>
              <select
                value={editForm.subtipo || ''}
                onChange={e => setEditForm({ ...editForm, subtipo: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
              >
                <option value="">Selecionar...</option>
                {SUBTIPOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Fase e Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Fase
              </label>
              <select
                value={editForm.fase || ''}
                onChange={e => setEditForm({ ...editForm, fase: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
              >
                {FASES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Status
              </label>
              <select
                value={editForm.status || ''}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
              >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Progresso */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
              Progresso: {editForm.progresso || 0}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={editForm.progresso || 0}
              onChange={e => setEditForm({ ...editForm, progresso: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Localização */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Morada
              </label>
              <input
                type="text"
                value={editForm.localizacao || ''}
                onChange={e => setEditForm({ ...editForm, localizacao: e.target.value })}
                placeholder="Rua, número..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Cidade
              </label>
              <input
                type="text"
                value={editForm.cidade || ''}
                onChange={e => setEditForm({ ...editForm, cidade: e.target.value })}
                placeholder="Lisboa"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                País
              </label>
              <input
                type="text"
                value={editForm.pais || ''}
                onChange={e => setEditForm({ ...editForm, pais: e.target.value })}
                placeholder="Portugal"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Áreas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Área Bruta (m²)
              </label>
              <input
                type="number"
                value={editForm.area_bruta || ''}
                onChange={e => setEditForm({ ...editForm, area_bruta: e.target.value })}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Área Exterior (m²)
              </label>
              <input
                type="number"
                value={editForm.area_exterior || ''}
                onChange={e => setEditForm({ ...editForm, area_exterior: e.target.value })}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Datas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Data de Início
              </label>
              <input
                type="date"
                value={editForm.data_inicio || ''}
                onChange={e => setEditForm({ ...editForm, data_inicio: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Data Prevista de Conclusão
              </label>
              <input
                type="date"
                value={editForm.data_prevista || ''}
                onChange={e => setEditForm({ ...editForm, data_prevista: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Orçamento */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
              Orçamento (€)
            </label>
            <input
              type="number"
              value={editForm.orcamento_atual || ''}
              onChange={e => setEditForm({ ...editForm, orcamento_atual: e.target.value })}
              placeholder="0"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '15px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Notas */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
              Notas
            </label>
            <textarea
              value={editForm.notas || ''}
              onChange={e => setEditForm({ ...editForm, notas: e.target.value })}
              rows={3}
              placeholder="Notas adicionais sobre o projeto..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '15px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Equipa do Projeto */}
          <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: '1px solid var(--stone)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500 }}>
                Equipa do Projeto
              </label>
              <button
                type="button"
                onClick={onShowEquipaModal}
                style={{
                  padding: '6px 12px',
                  background: 'var(--brown)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {equipaProjeto.length === 0 ? (
              <p style={{
                fontSize: '13px',
                color: 'var(--brown-light)',
                textAlign: 'center',
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '8px'
              }}>
                Sem membros atribuídos
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {equipaProjeto.map(m => (
                  <div key={m.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--cream)',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--brown)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      {m.utilizadores?.nome?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{m.utilizadores?.nome}</div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{m.funcao}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveMembro(m.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: 'var(--brown-light)'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          padding: '16px 24px',
          borderTop: '1px solid var(--stone)',
          background: 'var(--cream)'
        }}>
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'A guardar...' : 'Guardar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
