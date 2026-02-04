// =====================================================
// FASE CONTRATUAL MODAL
// Modal para adicionar/editar fases contratuais do projeto
// =====================================================

import { X } from 'lucide-react'

export default function FaseContratualModal({
  isOpen,
  onClose,
  onSave,
  faseForm,
  setFaseForm,
  editingFase
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>{editingFase ? 'Editar Fase' : 'Adicionar Fase Contratual'}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Nº Fase *</label>
              <input
                type="number"
                value={faseForm.numero}
                onChange={(e) => setFaseForm(prev => ({ ...prev, numero: e.target.value }))}
                className="form-control"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Nome da Fase *</label>
              <input
                type="text"
                value={faseForm.nome}
                onChange={(e) => setFaseForm(prev => ({ ...prev, nome: e.target.value }))}
                className="form-control"
                placeholder="Ex: Estudos de Layout/Revisão do Projeto de Arquitetura"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Data Início</label>
              <input
                type="date"
                value={faseForm.data_inicio}
                onChange={(e) => setFaseForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Nº Dias da Fase</label>
              <input
                type="text"
                value={faseForm.num_dias}
                onChange={(e) => setFaseForm(prev => ({ ...prev, num_dias: e.target.value }))}
                className="form-control"
                placeholder="Ex: 40 ou 60 dias úteis após entrega do PB"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Conclusão Prevista</label>
              <input
                type="text"
                value={faseForm.conclusao_prevista}
                onChange={(e) => setFaseForm(prev => ({ ...prev, conclusao_prevista: e.target.value }))}
                className="form-control"
                placeholder="Ex: Março 2025 ou Final de Outubro 2025"
              />
            </div>
            <div className="form-group">
              <label>Data Entrega</label>
              <input
                type="date"
                value={faseForm.data_entrega}
                onChange={(e) => setFaseForm(prev => ({ ...prev, data_entrega: e.target.value }))}
                className="form-control"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Estado</label>
              <select
                value={faseForm.estado}
                onChange={(e) => setFaseForm(prev => ({ ...prev, estado: e.target.value }))}
                className="form-control"
              >
                <option value="nao_iniciado">Não iniciado</option>
                <option value="em_curso">Em curso</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div className="form-group">
              <label>Avaliação Performance</label>
              <select
                value={faseForm.avaliacao}
                onChange={(e) => setFaseForm(prev => ({ ...prev, avaliacao: e.target.value }))}
                className="form-control"
              >
                <option value="">—</option>
                <option value="on_time">On Time</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={!faseForm.nome}
          >
            {editingFase ? 'Guardar Alterações' : 'Adicionar Fase'}
          </button>
        </div>
      </div>
    </div>
  )
}
