// =====================================================
// CLIENTE CARD
// Card com informações do cliente do projeto
// =====================================================

import { Mail, Phone, Globe } from 'lucide-react'

export default function ClienteCard({ cliente }) {
  const initials = (cliente?.nome || 'Cliente')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-lg">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
          Cliente
        </h3>
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          Ver Ficha
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: 'var(--cream)',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--blush), var(--blush-dark))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--white)',
          fontWeight: 600,
          fontSize: '16px'
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
            {cliente?.titulo} {cliente?.nome || 'Cliente'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
            {cliente?.codigo || 'N/D'} • {cliente?.tipo || 'Particular'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {cliente?.email && (
          <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
            <Mail size={14} />
            {cliente.email}
          </div>
        )}
        {cliente?.telefone && (
          <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
            <Phone size={14} />
            {cliente.telefone}
          </div>
        )}
        {(cliente?.segmento || cliente?.idioma) && (
          <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
            <Globe size={14} />
            {[cliente?.segmento, cliente?.idioma].filter(Boolean).join(' • ')}
          </div>
        )}
      </div>
    </div>
  )
}
