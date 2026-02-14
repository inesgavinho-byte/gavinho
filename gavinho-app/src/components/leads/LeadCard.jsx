// =====================================================
// LEAD CARD - Individual lead card for kanban board
// Shows name, empresa, tipologia, orcamento, prioridade,
// and days since last interaction
// =====================================================

import { Building2, MapPin, Clock, Euro } from 'lucide-react'
import styles from './LeadCard.module.css'

const TIPOLOGIA_LABELS = {
  moradia: 'Moradia',
  apartamento: 'Apartamento',
  comercial: 'Comercial',
  reabilitacao: 'Reabilitacao',
  outro: 'Outro'
}

const fmt = (v) => new Intl.NumberFormat('pt-PT', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0
}).format(v || 0)

function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - d) / 86400000)
}

export function LeadCard({ lead, onClick }) {
  const dias = daysSince(lead.data_ultima_interacao || lead.created_at)
  const prioridadeClass = lead.prioridade === 'alta'
    ? styles.prioridadeAlta
    : lead.prioridade === 'baixa'
      ? styles.prioridadeBaixa
      : styles.prioridadeMedia

  return (
    <div className={styles.card} onClick={() => onClick?.(lead)}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.nome}>{lead.nome}</div>
          {lead.empresa && (
            <div className={styles.empresa}>{lead.empresa}</div>
          )}
        </div>
        <span className={`${styles.prioridadeBadge} ${prioridadeClass}`}>
          {lead.prioridade || 'media'}
        </span>
      </div>

      <div className={styles.cardBody}>
        {lead.tipologia && lead.tipologia !== 'outro' && (
          <span className={styles.tipologiaBadge}>
            <Building2 size={10} />
            {TIPOLOGIA_LABELS[lead.tipologia] || lead.tipologia}
          </span>
        )}

        {lead.localizacao && (
          <div className={styles.metaRow}>
            <MapPin size={12} />
            <span>{lead.localizacao}</span>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        {lead.orcamento_estimado ? (
          <span className={styles.orcamento}>
            {fmt(lead.orcamento_estimado)}
          </span>
        ) : (
          <span className={styles.orcamento} style={{ opacity: 0.4, fontWeight: 400, fontSize: '0.72rem' }}>
            Sem orcamento
          </span>
        )}

        {dias !== null && (
          <span className={`${styles.diasLabel} ${dias > 14 ? styles.stale : ''}`}>
            <Clock size={10} />
            {dias === 0 ? 'Hoje' : dias === 1 ? '1 dia' : `${dias} dias`}
          </span>
        )}
      </div>
    </div>
  )
}

export default LeadCard
