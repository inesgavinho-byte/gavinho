import { useState, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { colors } from './constants'

export default function SpreadsheetTable({ columns, data, onUpdate, onDelete, onAdd, isLocked, emptyMessage }) {
  const [editingCell, setEditingCell] = useState(null)
  const cellInputRef = useRef(null)

  const handleKeyDown = (e, rowId, field, rowIndex, colIndex) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      setEditingCell(null)

      // Move to next cell
      if (e.key === 'Tab' && !e.shiftKey) {
        const nextColIndex = colIndex + 1
        if (nextColIndex < columns.filter(c => c.editable).length) {
          const nextCol = columns.filter(c => c.editable)[nextColIndex]
          setEditingCell({ rowId, field: nextCol.key })
        } else if (rowIndex + 1 < data.length) {
          const firstEditableCol = columns.find(c => c.editable)
          setEditingCell({ rowId: data[rowIndex + 1].id, field: firstEditableCol.key })
        }
      } else if (e.key === 'Enter') {
        if (rowIndex + 1 < data.length) {
          setEditingCell({ rowId: data[rowIndex + 1].id, field })
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  return (
    <div style={{
      background: colors.white,
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
      overflow: 'hidden'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        background: colors.background
      }}>
        <span style={{ fontSize: '13px', color: colors.textMuted }}>
          {data.length} {data.length === 1 ? 'linha' : 'linhas'}
        </span>
        {!isLocked && (
          <button
            onClick={onAdd}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Nova Linha
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: colors.background }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{
                    padding: '10px 12px',
                    textAlign: col.align || 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: `1px solid ${colors.border}`,
                    width: col.width || 'auto'
                  }}
                >
                  {col.label}
                </th>
              ))}
              {!isLocked && <th style={{ width: '50px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (isLocked ? 0 : 1)}
                  style={{
                    padding: '48px',
                    textAlign: 'center',
                    color: colors.textMuted
                  }}
                >
                  {emptyMessage || 'Sem dados. Clique em "Nova Linha" para começar.'}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = colors.background}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      style={{
                        padding: editingCell?.rowId === row.id && editingCell?.field === col.key ? '4px' : '10px 12px',
                        textAlign: col.align || 'left',
                        fontSize: '13px',
                        color: colors.text,
                        cursor: col.editable && !isLocked ? 'text' : 'default'
                      }}
                      onClick={() => {
                        if (col.editable && !isLocked && editingCell?.rowId !== row.id) {
                          setEditingCell({ rowId: row.id, field: col.key })
                        }
                      }}
                    >
                      {editingCell?.rowId === row.id && editingCell?.field === col.key ? (
                        col.type === 'select' ? (
                          <select
                            autoFocus
                            value={row[col.key] || ''}
                            onChange={(e) => {
                              onUpdate(row.id, col.key, e.target.value)
                              setEditingCell(null)
                            }}
                            onBlur={() => setEditingCell(null)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: `2px solid ${colors.primary}`,
                              borderRadius: '4px',
                              fontSize: '13px',
                              outline: 'none'
                            }}
                          >
                            {col.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            ref={cellInputRef}
                            type={col.type === 'number' ? 'number' : 'text'}
                            autoFocus
                            defaultValue={row[col.key] || ''}
                            onBlur={(e) => {
                              const value = col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                              if (value !== row[col.key]) {
                                onUpdate(row.id, col.key, value)
                              }
                              setEditingCell(null)
                            }}
                            onKeyDown={(e) => handleKeyDown(e, row.id, col.key, rowIndex, colIndex)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: `2px solid ${colors.primary}`,
                              borderRadius: '4px',
                              fontSize: '13px',
                              outline: 'none',
                              textAlign: col.align || 'left'
                            }}
                          />
                        )
                      ) : col.render ? (
                        col.render(row[col.key], row)
                      ) : (
                        row[col.key] || '-'
                      )}
                    </td>
                  ))}
                  {!isLocked && (
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => onDelete(row.id)}
                        aria-label="Eliminar linha"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: colors.textMuted,
                          opacity: 0.5,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
