// =====================================================
// SERVICOS CARD
// Card com serviços contratados do projeto
// =====================================================

import { formatDate } from '../../../constants/projectConstants'

export default function ServicosCard({ servicos }) {
  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
        Serviços Contratados
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {(!servicos || servicos.length === 0) ? (
          <p style={{
            fontSize: '13px',
            color: 'var(--brown-light)',
            textAlign: 'center',
            padding: '24px',
            background: 'var(--cream)',
            borderRadius: '12px'
          }}>
            Nenhum serviço contratado.
          </p>
        ) : servicos.map((servico, idx) => (
          <div
            key={idx}
            style={{
              padding: '20px',
              background: 'var(--cream)',
              borderRadius: '12px'
            }}
          >
            <div className="flex items-center justify-between mb-sm">
              <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                {servico.tipo}
              </div>
              {servico.data_fim && (
                <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                  Até {formatDate(servico.data_fim)}
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '12px' }}>
              {servico.descricao}
            </div>

            {servico.inclui && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {servico.inclui.map((item, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '4px 10px',
                      background: 'var(--white)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'var(--brown)'
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
