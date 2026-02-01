// =====================================================
// SEED PREVIEW COMPONENT
// Pré-visualização de dados antes de inserção
// =====================================================

import { useState } from 'react'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Plus
} from 'lucide-react'

const styles = {
  container: {
    background: 'var(--cream)',
    borderRadius: '12px',
    border: '1px solid var(--stone)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'white',
    borderBottom: '1px solid var(--stone)'
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--brown)'
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--brown-light)',
    marginTop: '2px'
  },
  stats: {
    display: 'flex',
    gap: '16px'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px'
  },
  validStat: {
    color: 'var(--success)'
  },
  invalidStat: {
    color: 'var(--error)'
  },
  tableContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  th: {
    position: 'sticky',
    top: 0,
    background: 'var(--cream)',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    color: 'var(--brown)',
    borderBottom: '1px solid var(--stone)',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '10px 16px',
    borderBottom: '1px solid var(--stone-light)',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--brown-light)'
  },
  rowValid: {
    background: 'white'
  },
  rowInvalid: {
    background: 'rgba(239, 68, 68, 0.05)'
  },
  rowHover: {
    background: 'var(--cream)'
  },
  errorCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--error)',
    fontSize: '12px'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center'
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    color: 'var(--brown-light)',
    transition: 'all 0.15s'
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--brown-light)'
  },
  expandedRow: {
    background: 'var(--cream)',
    padding: '12px 16px'
  },
  fieldList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '8px',
    marginTop: '8px'
  },
  field: {
    background: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px'
  },
  fieldLabel: {
    color: 'var(--brown-light)',
    marginBottom: '2px'
  },
  fieldValue: {
    color: 'var(--brown)',
    fontWeight: 500
  }
}

export function SeedPreview({
  data = [],
  invalidData = [],
  schema,
  tableName,
  onEdit,
  onDelete,
  onValidate
}) {
  const [expandedRow, setExpandedRow] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

  const totalRows = data.length + invalidData.length
  const validCount = data.length
  const invalidCount = invalidData.length

  // Obter colunas a mostrar (limitado para não ficar muito largo)
  const visibleFields = schema
    ? Object.entries(schema.fields)
        .filter(([, config]) => config.required || Math.random() > 0.5)
        .slice(0, 5)
        .map(([name]) => name)
    : data.length > 0
    ? Object.keys(data[0]).slice(0, 5)
    : []

  const toggleExpand = (idx) => {
    setExpandedRow(expandedRow === idx ? null : idx)
  }

  if (totalRows === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <AlertTriangle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>Nenhum dado para pré-visualizar</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            Cole texto ou carregue um ficheiro para ver os dados parseados
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>
            Pré-visualização de Dados
          </div>
          <div style={styles.subtitle}>
            {tableName ? `Tabela: ${tableName}` : 'A aguardar parsing...'}
          </div>
        </div>
        <div style={styles.stats}>
          <div style={{ ...styles.stat, ...styles.validStat }}>
            <CheckCircle size={16} />
            {validCount} válidos
          </div>
          {invalidCount > 0 && (
            <div style={{ ...styles.stat, ...styles.invalidStat }}>
              <AlertCircle size={16} />
              {invalidCount} com erros
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '50px' }}>#</th>
              {visibleFields.map(field => (
                <th key={field} style={styles.th}>
                  {field}
                </th>
              ))}
              <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>
                Estado
              </th>
              <th style={{ ...styles.th, width: '100px', textAlign: 'center' }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Valid rows */}
            {data.map((row, idx) => (
              <>
                <tr
                  key={`valid-${idx}`}
                  style={{
                    ...styles.rowValid,
                    ...(hoveredRow === `valid-${idx}` ? styles.rowHover : {})
                  }}
                  onMouseEnter={() => setHoveredRow(`valid-${idx}`)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={styles.td}>{idx + 1}</td>
                  {visibleFields.map(field => (
                    <td key={field} style={styles.td} title={row[field]}>
                      {row[field] || '-'}
                    </td>
                  ))}
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <CheckCircle size={16} color="var(--success)" />
                  </td>
                  <td style={{ ...styles.td, ...styles.actions }}>
                    <button
                      style={styles.actionBtn}
                      onClick={() => toggleExpand(`valid-${idx}`)}
                      title="Ver detalhes"
                    >
                      {expandedRow === `valid-${idx}` ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {onEdit && (
                      <button
                        style={styles.actionBtn}
                        onClick={() => onEdit(idx, row)}
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        style={{ ...styles.actionBtn, color: 'var(--error)' }}
                        onClick={() => onDelete(idx)}
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
                {expandedRow === `valid-${idx}` && (
                  <tr key={`expand-valid-${idx}`}>
                    <td colSpan={visibleFields.length + 3} style={styles.expandedRow}>
                      <div style={styles.fieldList}>
                        {Object.entries(row).map(([key, value]) => (
                          <div key={key} style={styles.field}>
                            <div style={styles.fieldLabel}>{key}</div>
                            <div style={styles.fieldValue}>{value || '-'}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}

            {/* Invalid rows */}
            {invalidData.map((item, idx) => (
              <>
                <tr
                  key={`invalid-${idx}`}
                  style={{
                    ...styles.rowInvalid,
                    ...(hoveredRow === `invalid-${idx}` ? styles.rowHover : {})
                  }}
                  onMouseEnter={() => setHoveredRow(`invalid-${idx}`)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={styles.td}>{data.length + idx + 1}</td>
                  {visibleFields.map(field => (
                    <td key={field} style={styles.td} title={item.row?.[field]}>
                      {item.row?.[field] || '-'}
                    </td>
                  ))}
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <AlertCircle size={16} color="var(--error)" />
                  </td>
                  <td style={{ ...styles.td, ...styles.actions }}>
                    <button
                      style={styles.actionBtn}
                      onClick={() => toggleExpand(`invalid-${idx}`)}
                      title="Ver erros"
                    >
                      {expandedRow === `invalid-${idx}` ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </td>
                </tr>
                {expandedRow === `invalid-${idx}` && (
                  <tr key={`expand-invalid-${idx}`}>
                    <td colSpan={visibleFields.length + 3} style={styles.expandedRow}>
                      <div style={styles.errorCell}>
                        <AlertCircle size={14} />
                        {item.errors?.join(', ') || 'Erro desconhecido'}
                      </div>
                      <div style={styles.fieldList}>
                        {Object.entries(item.row || {}).map(([key, value]) => (
                          <div key={key} style={styles.field}>
                            <div style={styles.fieldLabel}>{key}</div>
                            <div style={styles.fieldValue}>{value || '-'}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SeedPreview
