// =====================================================
// LEAD DETALHE - Slide-out detail panel
// Full lead info, phase change, interaction history,
// and interaction creation form
// =====================================================

import { useState, useEffect } from 'react'
import {
  X, Phone, Mail, Video, MapPin, StickyNote,
  Calendar, Building2, Euro, Clock, Trash2, Send
} from 'lucide-react'
import styles from './LeadDetalhe.module.css'

const FASES = [
  { key: 'contacto_inicial', label: 'Contacto Inicial', color: '#6B7280' },
  { key: 'qualificacao', label: 'Qualificacao', color: '#D97706' },
  { key: 'proposta', label: 'Proposta', color: '#3B82F6' },
  { key: 'negociacao', label: 'Negociacao', color: '#8B5CF6' },
  { key: 'ganho', label: 'Ganho', color: '#059669' },
  { key: 'perdido', label: 'Perdido', color: '#DC2626' }
]

const INTERACAO_TIPOS = [
  { key: 'chamada', label: 'Chamada', icon: Phone, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  { key: 'email', label: 'Email', icon: Mail, color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  { key: 'reuniao', label: 'Reuniao', icon: Video, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  { key: 'visita', label: 'Visita', icon: MapPin, color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  { key: 'nota', label: 'Nota', icon: StickyNote, color: '#6B7280', bg: 'rgba(107,114,128,0.12)' }
]

const TIPOLOGIA_LABELS = {
  moradia: 'Moradia',
  apartamento: 'Apartamento',
  comercial: 'Comercial',
  reabilitacao: 'Reabilitacao',
  outro: 'Outro'
}

const FONTE_LABELS = {
  site: 'Website',
  referencia: 'Referencia',
  instagram: 'Instagram',
  outro: 'Outro'
}

const fmt = (v) => new Intl.NumberFormat('pt-PT', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0
}).format(v || 0)

const fmtDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const fmtDateTime = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function LeadDetalhe({
  lead,
  interacoes = [],
  onClose,
  onMoveFase,
  onAddInteracao,
  onDelete,
  onUpdate
}) {
  const [newInteracao, setNewInteracao] = useState({ tipo: 'nota', descricao: '' })
  const [saving, setSaving] = useState(false)
  const [motivoPerda, setMotivoPerda] = useState(lead.motivo_perda || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setMotivoPerda(lead.motivo_perda || '')
  }, [lead.motivo_perda])

  const handleMoveFase = async (newFase) => {
    if (newFase === lead.fase) return
    try {
      await onMoveFase(lead.id, newFase)
    } catch (err) {
      console.error('Erro ao mover fase:', err)
    }
  }

  const handleAddInteracao = async () => {
    if (!newInteracao.descricao.trim()) return
    setSaving(true)
    try {
      await onAddInteracao(lead.id, newInteracao)
      setNewInteracao({ tipo: 'nota', descricao: '' })
    } catch (err) {
      console.error('Erro ao adicionar interacao:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleMotivoPerda = async () => {
    if (motivoPerda !== lead.motivo_perda) {
      try {
        await onUpdate(lead.id, { motivo_perda: motivoPerda })
      } catch (err) {
        console.error('Erro ao guardar motivo:', err)
      }
    }
  }

  const handleDelete = async () => {
    try {
      await onDelete(lead.id)
      onClose()
    } catch (err) {
      console.error('Erro ao eliminar lead:', err)
    }
  }

  const getInteracaoConfig = (tipo) =>
    INTERACAO_TIPOS.find(t => t.key === tipo) || INTERACAO_TIPOS[4]

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderLeft}>
            <div>
              <div className={styles.codigo}>{lead.codigo}</div>
              <h2 className={styles.panelTitle}>{lead.nome}</h2>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.panelBody}>
          {/* Phase selector */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Fase do Pipeline</div>
            <div className={styles.faseSelector}>
              {FASES.map(f => (
                <button
                  key={f.key}
                  className={`${styles.faseBtn} ${lead.fase === f.key ? styles.active : ''}`}
                  style={lead.fase === f.key ? { background: f.color, borderColor: f.color } : {}}
                  onClick={() => handleMoveFase(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {lead.fase === 'perdido' && (
              <input
                type="text"
                className={styles.motivoPerdaInput}
                placeholder="Motivo da perda..."
                value={motivoPerda}
                onChange={e => setMotivoPerda(e.target.value)}
                onBlur={handleMotivoPerda}
              />
            )}
          </div>

          {/* Lead details */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Detalhes</div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Empresa</span>
                <span className={`${styles.fieldValue} ${!lead.empresa ? styles.empty : ''}`}>
                  {lead.empresa || 'Sem empresa'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Tipologia</span>
                <span className={`${styles.fieldValue} ${!lead.tipologia ? styles.empty : ''}`}>
                  {TIPOLOGIA_LABELS[lead.tipologia] || '-'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Email</span>
                <span className={`${styles.fieldValue} ${!lead.email ? styles.empty : ''}`}>
                  {lead.email || '-'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Telefone</span>
                <span className={`${styles.fieldValue} ${!lead.telefone ? styles.empty : ''}`}>
                  {lead.telefone || '-'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Localizacao</span>
                <span className={`${styles.fieldValue} ${!lead.localizacao ? styles.empty : ''}`}>
                  {lead.localizacao || '-'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Area Estimada</span>
                <span className={`${styles.fieldValue} ${!lead.area_estimada ? styles.empty : ''}`}>
                  {lead.area_estimada ? `${lead.area_estimada} m2` : '-'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Orcamento Estimado</span>
                <span className={`${styles.fieldValue} ${!lead.orcamento_estimado ? styles.empty : ''}`}>
                  {lead.orcamento_estimado ? fmt(lead.orcamento_estimado) : '-'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Fonte</span>
                <span className={`${styles.fieldValue} ${!lead.fonte ? styles.empty : ''}`}>
                  {FONTE_LABELS[lead.fonte] || lead.fonte || '-'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Prioridade</span>
                <span className={styles.fieldValue} style={{
                  color: lead.prioridade === 'alta' ? '#c44'
                    : lead.prioridade === 'baixa' ? '#4a5d4a'
                    : '#b8923c',
                  fontWeight: 700
                }}>
                  {(lead.prioridade || 'media').charAt(0).toUpperCase() + (lead.prioridade || 'media').slice(1)}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Data Contacto</span>
                <span className={styles.fieldValue}>{fmtDate(lead.data_contacto)}</span>
              </div>
              {lead.data_conversao && (
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Data Conversao</span>
                  <span className={styles.fieldValue}>{fmtDate(lead.data_conversao)}</span>
                </div>
              )}
              {lead.notas && (
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fieldLabel}>Notas</span>
                  <span className={styles.fieldValue} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {lead.notas}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactions section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Interacoes</div>

            {/* New interaction form */}
            <div className={styles.interacaoForm}>
              <div className={styles.interacaoFormRow}>
                <select
                  className={styles.interacaoSelect}
                  value={newInteracao.tipo}
                  onChange={e => setNewInteracao(prev => ({ ...prev, tipo: e.target.value }))}
                >
                  {INTERACAO_TIPOS.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <input
                  className={styles.interacaoInput}
                  placeholder="Descricao da interacao..."
                  value={newInteracao.descricao}
                  onChange={e => setNewInteracao(prev => ({ ...prev, descricao: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddInteracao()
                    }
                  }}
                />
                <button
                  className={styles.addBtn}
                  onClick={handleAddInteracao}
                  disabled={saving || !newInteracao.descricao.trim()}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className={styles.timeline}>
              {interacoes.length > 0 ? (
                interacoes.map(inter => {
                  const config = getInteracaoConfig(inter.tipo)
                  const Icon = config.icon
                  return (
                    <div key={inter.id} className={styles.timelineItem}>
                      <div
                        className={styles.timelineIcon}
                        style={{ background: config.bg }}
                      >
                        <Icon size={14} style={{ color: config.color }} />
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTipo} style={{ color: config.color }}>
                          {config.label}
                        </div>
                        <div className={styles.timelineDescricao}>
                          {inter.descricao}
                        </div>
                        <div className={styles.timelineDate}>
                          {fmtDateTime(inter.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className={styles.emptyTimeline}>
                  Nenhuma interacao registada. Adicione a primeira acima.
                </div>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className={styles.dangerZone}>
            {!showDeleteConfirm ? (
              <button
                className={styles.deleteBtn}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Eliminar Lead
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#c44', fontWeight: 600 }}>
                  Tem a certeza?
                </span>
                <button
                  className={styles.deleteBtn}
                  style={{ background: '#c44', color: '#fff', borderColor: '#c44' }}
                  onClick={handleDelete}
                >
                  Sim, eliminar
                </button>
                <button
                  className={styles.deleteBtn}
                  style={{ color: 'var(--brown)', borderColor: 'var(--stone)' }}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default LeadDetalhe
