import { CheckCircle, Shield } from 'lucide-react'

export default function ApprovalBadge({ approvedAt, approvedBy, compact = false }) {
  const formattedDate = approvedAt ? new Date(approvedAt).toLocaleDateString('pt-PT') : ''

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: 'rgba(122, 158, 122, 0.15)',
        borderRadius: '4px',
        fontSize: '11px',
        color: 'var(--success)',
        fontWeight: 500
      }}>
        <CheckCircle size={12} />
        <span>Bom p/ Construção</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'linear-gradient(135deg, rgba(122, 158, 122, 0.1) 0%, rgba(122, 158, 122, 0.15) 100%)',
      border: '1px solid rgba(122, 158, 122, 0.3)',
      borderRadius: '8px',
      marginTop: '12px'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        background: 'var(--success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <Shield size={18} />
      </div>
      <div>
        <span style={{
          fontWeight: 600,
          color: 'var(--success)',
          display: 'block',
          fontSize: '13px'
        }}>
          Bom para Construção
        </span>
        <span style={{
          fontSize: '11px',
          color: 'var(--brown-light)'
        }}>
          {formattedDate && `Desde ${formattedDate}`}
          {approvedBy && ` · Aprovado por ${approvedBy}`}
        </span>
      </div>
    </div>
  )
}
