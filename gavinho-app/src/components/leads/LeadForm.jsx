// =====================================================
// LEAD FORM - Create / Edit lead modal
// Full form with all lead fields, validates nome
// =====================================================

import { useState } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import styles from './LeadForm.module.css'

const TIPOLOGIAS = [
  { key: 'moradia', label: 'Moradia' },
  { key: 'apartamento', label: 'Apartamento' },
  { key: 'comercial', label: 'Comercial' },
  { key: 'reabilitacao', label: 'Reabilitacao' },
  { key: 'outro', label: 'Outro' }
]

const FONTES = [
  { key: 'site', label: 'Website' },
  { key: 'referencia', label: 'Referencia' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'outro', label: 'Outro' }
]

const PRIORIDADES = [
  { key: 'alta', label: 'Alta' },
  { key: 'media', label: 'Media' },
  { key: 'baixa', label: 'Baixa' }
]

const FASES = [
  { key: 'contacto_inicial', label: 'Contacto Inicial' },
  { key: 'qualificacao', label: 'Qualificacao' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'negociacao', label: 'Negociacao' },
  { key: 'ganho', label: 'Ganho' },
  { key: 'perdido', label: 'Perdido' }
]

const INITIAL_STATE = {
  nome: '',
  email: '',
  telefone: '',
  empresa: '',
  tipologia: 'outro',
  localizacao: '',
  area_estimada: '',
  orcamento_estimado: '',
  fonte: 'outro',
  notas: '',
  fase: 'contacto_inicial',
  prioridade: 'media',
  data_contacto: new Date().toISOString().split('T')[0]
}

export function LeadForm({ lead, onSave, onClose }) {
  const isEditing = !!lead
  const [formData, setFormData] = useState(
    isEditing
      ? {
          nome: lead.nome || '',
          email: lead.email || '',
          telefone: lead.telefone || '',
          empresa: lead.empresa || '',
          tipologia: lead.tipologia || 'outro',
          localizacao: lead.localizacao || '',
          area_estimada: lead.area_estimada || '',
          orcamento_estimado: lead.orcamento_estimado || '',
          fonte: lead.fonte || 'outro',
          notas: lead.notas || '',
          fase: lead.fase || 'contacto_inicial',
          prioridade: lead.prioridade || 'media',
          data_contacto: lead.data_contacto || new Date().toISOString().split('T')[0]
        }
      : { ...INITIAL_STATE }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      setError('O nome e obrigatorio.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...formData,
        area_estimada: formData.area_estimada ? parseFloat(formData.area_estimada) : null,
        orcamento_estimado: formData.orcamento_estimado ? parseFloat(formData.orcamento_estimado) : null
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      console.error('Erro ao guardar lead:', err)
      setError(err.message || 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEditing ? 'Editar Lead' : 'Novo Lead'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem',
              background: 'rgba(204,68,68,0.08)', color: '#c44', fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {/* Nome + Empresa */}
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>
                Nome <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={formData.nome}
                onChange={e => handleChange('nome', e.target.value)}
                placeholder="Nome do contacto"
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Empresa</label>
              <input
                className={styles.input}
                value={formData.empresa}
                onChange={e => handleChange('empresa', e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tipologia</label>
              <select
                className={styles.select}
                value={formData.tipologia}
                onChange={e => handleChange('tipologia', e.target.value)}
              >
                {TIPOLOGIAS.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="email@exemplo.pt"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Telefone</label>
              <input
                className={styles.input}
                value={formData.telefone}
                onChange={e => handleChange('telefone', e.target.value)}
                placeholder="+351 912 345 678"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Localizacao</label>
              <input
                className={styles.input}
                value={formData.localizacao}
                onChange={e => handleChange('localizacao', e.target.value)}
                placeholder="Cidade, distrito"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Area Estimada (m2)</label>
              <input
                className={styles.input}
                type="number"
                step="0.1"
                value={formData.area_estimada}
                onChange={e => handleChange('area_estimada', e.target.value)}
                placeholder="200"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Orcamento Estimado</label>
              <input
                className={styles.input}
                type="number"
                step="100"
                value={formData.orcamento_estimado}
                onChange={e => handleChange('orcamento_estimado', e.target.value)}
                placeholder="250000"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Fonte</label>
              <select
                className={styles.select}
                value={formData.fonte}
                onChange={e => handleChange('fonte', e.target.value)}
              >
                {FONTES.map(f => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Prioridade</label>
              <select
                className={styles.select}
                value={formData.prioridade}
                onChange={e => handleChange('prioridade', e.target.value)}
              >
                {PRIORIDADES.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Fase</label>
              <select
                className={styles.select}
                value={formData.fase}
                onChange={e => handleChange('fase', e.target.value)}
              >
                {FASES.map(f => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Data de Contacto</label>
              <input
                className={styles.input}
                type="date"
                value={formData.data_contacto}
                onChange={e => handleChange('data_contacto', e.target.value)}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Notas</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={formData.notas}
                onChange={e => handleChange('notas', e.target.value)}
                placeholder="Observacoes, detalhes do projeto, etc."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={styles.submitBtn} disabled={saving || !formData.nome.trim()}>
            {saving ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Save size={16} />
            )}
            {isEditing ? 'Guardar' : 'Criar Lead'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default LeadForm
