// =====================================================
// INTERVENIENTES CARD
// Card com tabela de intervenientes do projeto
// =====================================================

import { Plus, Edit, Trash2 } from 'lucide-react'

export default function IntervenientesCard({
  intervenientes,
  onAdd,
  onEdit,
  onRemove
}) {
  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div className="flex items-center justify-between mb-lg">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
          Intervenientes do Projeto
        </h3>
        <button
          className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={onAdd}
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {intervenientes.length === 0 ? (
        <p style={{
          fontSize: '13px',
          color: 'var(--brown-light)',
          textAlign: 'center',
          padding: '24px',
          background: 'var(--cream)',
          borderRadius: '12px'
        }}>
          Nenhum interveniente registado.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--brown)', fontWeight: 600 }}>
                  Tipo
                </th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--brown)', fontWeight: 600 }}>
                  Entidade
                </th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--brown)', fontWeight: 600 }}>
                  Responsável
                </th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--brown)', fontWeight: 600 }}>
                  Responsável Secundário
                </th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {intervenientes.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--cream)' }}>
                  <td style={{ padding: '12px 8px', color: 'var(--brown)', fontWeight: 500 }}>
                    {item.tipo}
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--brown-light)' }}>
                    <div>{item.entidade || '—'}</div>
                    {item.contacto_geral && (
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                        {item.contacto_geral}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ color: 'var(--brown)' }}>{item.responsavel_nome || '—'}</div>
                    {item.responsavel_email && (
                      <a
                        href={`mailto:${item.responsavel_email}`}
                        style={{ fontSize: '11px', color: 'var(--gold-dark)' }}
                      >
                        {item.responsavel_email}
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ color: 'var(--brown)' }}>
                      {item.responsavel_secundario_nome || '—'}
                    </div>
                    {item.responsavel_secundario_email && (
                      <a
                        href={`mailto:${item.responsavel_secundario_email}`}
                        style={{ fontSize: '11px', color: 'var(--gold-dark)' }}
                      >
                        {item.responsavel_secundario_email}
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => onEdit(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--brown-light)'
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onRemove(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--danger)'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
