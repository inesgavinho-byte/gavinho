import { useState, useEffect } from 'react'
import { X, Download, Eye, ExternalLink, Clock, User, CheckCircle, Circle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import FileTypeIcon, { formatFileSize } from './FileTypeIcon'
import ApprovalBadge from './ApprovalBadge'

export default function VersionHistoryModal({
  entregavel,
  onClose
}) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' ou 'timeline'

  useEffect(() => {
    fetchVersions()
  }, [entregavel.id])

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('entrega_ficheiros')
        .select('*')
        .eq('entregavel_id', entregavel.id)
        .order('versao', { ascending: false })

      if (!error) {
        setVersions(data || [])
      }
    } catch (err) {
      console.error('Erro ao carregar versões:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('pt-PT')
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
              Histórico de Versões
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--brown-light)' }}>
              {entregavel.codigo} — {entregavel.descricao || entregavel.nome}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brown-light)',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* View Toggle */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: viewMode === 'list' ? 'var(--brown)' : 'var(--stone)',
              color: viewMode === 'list' ? 'white' : 'var(--brown-light)'
            }}
          >
            Lista
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: viewMode === 'timeline' ? 'var(--brown)' : 'var(--stone)',
              color: viewMode === 'timeline' ? 'white' : 'var(--brown-light)'
            }}
          >
            Timeline
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px',
              color: 'var(--brown-light)'
            }}>
              <Loader2 className="animate-spin" size={24} />
              <span style={{ marginLeft: '12px' }}>A carregar...</span>
            </div>
          ) : versions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px',
              color: 'var(--brown-light)'
            }}>
              <Clock size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Nenhuma versão encontrada</p>
            </div>
          ) : viewMode === 'list' ? (
            /* Vista Lista */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  style={{
                    padding: '16px',
                    background: version.versao_atual ? 'var(--cream)' : 'var(--white)',
                    borderRadius: '12px',
                    border: version.versao_atual ? '2px solid var(--brown)' : '1px solid var(--stone)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    {/* Version badge */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: version.versao_atual ? 'var(--brown)' : 'var(--stone)',
                        color: version.versao_atual ? 'white' : 'var(--brown-light)',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        v{version.versao}
                      </span>
                      {version.versao_atual && (
                        <span style={{
                          fontSize: '10px',
                          color: 'var(--success)',
                          fontWeight: 500
                        }}>
                          Atual
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px'
                      }}>
                        <FileTypeIcon type={version.tipo_ficheiro} size={28} />
                        <div>
                          <span style={{
                            fontWeight: 500,
                            color: 'var(--brown)',
                            display: 'block',
                            wordBreak: 'break-all'
                          }}>
                            {version.nome_ficheiro}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                            {formatFileSize(version.tamanho_bytes)} · {formatDateTime(version.carregado_em)}
                          </span>
                        </div>
                      </div>

                      {/* Uploader */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--brown-light)',
                        marginBottom: '8px'
                      }}>
                        <User size={12} />
                        Enviado por {version.carregado_por_nome || 'Utilizador'}
                      </div>

                      {/* Notes */}
                      {version.notas && (
                        <p style={{
                          margin: '8px 0',
                          padding: '8px 12px',
                          background: 'rgba(0,0,0,0.03)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: 'var(--brown-light)',
                          fontStyle: 'italic'
                        }}>
                          "{version.notas}"
                        </p>
                      )}

                      {/* Approval badge */}
                      {version.aprovado_construcao && (
                        <ApprovalBadge
                          approvedAt={version.aprovado_em}
                          approvedBy={version.aprovado_por_nome}
                          compact
                        />
                      )}

                      {/* Actions */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '12px'
                      }}>
                        <a
                          href={version.ficheiro_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'var(--stone)',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '12px',
                            color: 'var(--brown)'
                          }}
                        >
                          <Eye size={14} />
                          Ver
                        </a>
                        <a
                          href={version.ficheiro_url}
                          download
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'var(--stone)',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '12px',
                            color: 'var(--brown)'
                          }}
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vista Timeline */
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute',
                left: '11px',
                top: '12px',
                bottom: '12px',
                width: '2px',
                background: 'var(--stone)'
              }} />

              {versions.map((version, index) => (
                <div
                  key={version.id}
                  style={{
                    position: 'relative',
                    paddingBottom: index < versions.length - 1 ? '24px' : '0'
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-32px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: version.aprovado_construcao
                      ? 'var(--success)'
                      : version.versao_atual
                        ? 'var(--brown)'
                        : 'var(--stone)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    border: '3px solid white',
                    boxShadow: '0 0 0 2px var(--stone)'
                  }}>
                    {version.aprovado_construcao ? (
                      <CheckCircle size={12} />
                    ) : version.versao_atual ? (
                      <Circle size={10} style={{ fill: 'currentColor' }} />
                    ) : (
                      <Circle size={10} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{
                    padding: '12px 16px',
                    background: version.versao_atual ? 'var(--cream)' : 'var(--white)',
                    borderRadius: '8px',
                    border: '1px solid var(--stone)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontWeight: 600,
                        color: 'var(--brown)',
                        fontSize: '14px'
                      }}>
                        Versão {version.versao}
                        {version.versao_atual && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            background: 'var(--brown)',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>
                            ATUAL
                          </span>
                        )}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--brown-light)'
                      }}>
                        {formatDateTime(version.carregado_em)}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'var(--white)',
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}>
                      <FileTypeIcon type={version.tipo_ficheiro} size={24} />
                      <span style={{ fontSize: '13px', color: 'var(--brown)', flex: 1 }}>
                        {version.nome_ficheiro}
                      </span>
                      <a
                        href={version.ficheiro_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--brown-light)' }}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    {version.notas && (
                      <p style={{
                        margin: '0 0 8px',
                        fontSize: '12px',
                        color: 'var(--brown-light)',
                        fontStyle: 'italic'
                      }}>
                        "{version.notas}"
                      </p>
                    )}

                    {version.aprovado_construcao && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        background: 'rgba(122, 158, 122, 0.15)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: 'var(--success)'
                      }}>
                        <CheckCircle size={12} />
                        Bom para Construção desde {formatDate(version.aprovado_em)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
