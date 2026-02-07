// =====================================================
// EXPORT MODAL COMPONENT
// Modal for exporting conversations in various formats
// =====================================================

import { useState } from 'react'
import {
  X, FileDown, FileJson, FileText, File,
  Calendar, Loader2, Check, AlertCircle
} from 'lucide-react'
import { exportConversation, EXPORT_FORMATS } from '../../utils/exportConversation'

const FORMAT_OPTIONS = [
  {
    id: EXPORT_FORMATS.PDF,
    label: 'PDF',
    description: 'Documento formatado para impressão',
    icon: FileDown,
    color: '#e74c3c'
  },
  {
    id: EXPORT_FORMATS.DOCX,
    label: 'Word (DOCX)',
    description: 'Editável no Microsoft Word',
    icon: File,
    color: '#2b579a'
  },
  {
    id: EXPORT_FORMATS.JSON,
    label: 'JSON',
    description: 'Dados estruturados para desenvolvimento',
    icon: FileJson,
    color: '#f1c40f'
  },
  {
    id: EXPORT_FORMATS.TXT,
    label: 'Texto (TXT)',
    description: 'Texto simples sem formatação',
    icon: FileText,
    color: '#95a5a6'
  }
]

export default function ExportModal({
  isOpen,
  onClose,
  channelInfo,
  messages = [],
  onSuccess,
  onError
}) {
  const [selectedFormat, setSelectedFormat] = useState(EXPORT_FORMATS.PDF)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)

  if (!isOpen) return null

  const handleExport = async () => {
    setIsExporting(true)
    setExportResult(null)

    try {
      const result = await exportConversation(
        selectedFormat,
        messages,
        channelInfo,
        { dateFrom, dateTo, includeMetadata }
      )

      if (result.success) {
        setExportResult({
          type: 'success',
          message: `Exportadas ${result.messageCount} mensagens para ${result.filename}`
        })
        onSuccess?.(result)
      } else {
        setExportResult({
          type: 'error',
          message: result.error || 'Erro ao exportar conversa'
        })
        onError?.(result.error)
      }
    } catch (error) {
      setExportResult({
        type: 'error',
        message: error.message || 'Erro inesperado ao exportar'
      })
      onError?.(error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleClose = () => {
    setExportResult(null)
    setDateFrom('')
    setDateTo('')
    onClose()
  }

  // Calculate message count for preview
  const filteredCount = messages.filter(msg => {
    if (!dateFrom && !dateTo) return true
    const msgDate = new Date(msg.created_at)

    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      if (msgDate < from) return false
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      if (msgDate > to) return false
    }

    return true
  }).length

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--accent-olive)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FileDown size={20} />
            </div>
            <div>
              <h2
                id="export-modal-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--brown)'
                }}
              >
                Exportar Conversa
              </h2>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--brown-light)'
              }}>
                {channelInfo?.codigo} - {channelInfo?.nome}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar modal"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brown-light)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 180px)' }}>
          {/* Format Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--brown)',
              marginBottom: '12px'
            }}>
              Formato de exportação
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px'
            }}>
              {FORMAT_OPTIONS.map(format => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: selectedFormat === format.id
                      ? '2px solid var(--accent-olive)'
                      : '1px solid var(--stone)',
                    background: selectedFormat === format.id
                      ? 'rgba(128, 128, 90, 0.08)'
                      : 'var(--white)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '6px'
                  }}>
                    <format.icon size={18} style={{ color: format.color }} />
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--brown)'
                    }}>
                      {format.label}
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '11px',
                    color: 'var(--brown-light)'
                  }}>
                    {format.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--brown)',
              marginBottom: '12px'
            }}>
              <Calendar size={16} />
              Período (opcional)
            </label>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--brown-light)',
                  marginBottom: '6px'
                }}>
                  De
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--brown-light)',
                  marginBottom: '6px'
                }}>
                  Até
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: 'var(--brown)',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: 'var(--accent-olive)'
                }}
              />
              Incluir reações e anexos
            </label>
          </div>

          {/* Preview Count */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--cream)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: '13px',
              color: 'var(--brown)'
            }}>
              Mensagens a exportar:
            </span>
            <span style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--accent-olive)'
            }}>
              {filteredCount}
            </span>
          </div>

          {/* Export Result */}
          {exportResult && (
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              background: exportResult.type === 'success'
                ? 'rgba(39, 174, 96, 0.1)'
                : 'rgba(231, 76, 60, 0.1)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {exportResult.type === 'success' ? (
                <Check size={18} style={{ color: 'var(--success)' }} />
              ) : (
                <AlertCircle size={18} style={{ color: 'var(--error)' }} />
              )}
              <span style={{
                fontSize: '13px',
                color: exportResult.type === 'success' ? 'var(--success)' : 'var(--error)',
                fontWeight: 500
              }}>
                {exportResult.message}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--stone)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'var(--cream)',
              border: '1px solid var(--stone)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--brown)'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || filteredCount === 0}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: isExporting || filteredCount === 0
                ? 'var(--stone)'
                : 'var(--accent-olive)',
              border: 'none',
              cursor: isExporting || filteredCount === 0 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="spin" />
                A exportar...
              </>
            ) : (
              <>
                <FileDown size={16} />
                Exportar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
