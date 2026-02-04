import { useState, useEffect } from 'react'
import { Upload, Eye, Download, History, Shield, Loader2, FileX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import FileTypeIcon, { formatFileSize } from './FileTypeIcon'
import ApprovalBadge from './ApprovalBadge'
import FileUploadModal from './FileUploadModal'
import VersionHistoryModal from './VersionHistoryModal'

export default function DeliveryFileSection({
  entregavel,
  projetoId,
  isAdmin = false,
  compact = false
}) {
  const { user } = useAuth()
  const [currentFile, setCurrentFile] = useState(null)
  const [versionCount, setVersionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    if (entregavel?.id) {
      loadCurrentFile()
    }
  }, [entregavel?.id])

  const loadCurrentFile = async () => {
    try {
      // Buscar ficheiro atual
      const { data: current, error: currentError } = await supabase
        .from('entrega_ficheiros')
        .select('*')
        .eq('entregavel_id', entregavel.id)
        .eq('versao_atual', true)
        .single()

      if (!currentError && current) {
        setCurrentFile(current)
      } else {
        setCurrentFile(null)
      }

      // Contar versões
      const { count, error: countError } = await supabase
        .from('entrega_ficheiros')
        .select('*', { count: 'exact', head: true })
        .eq('entregavel_id', entregavel.id)

      if (!countError) {
        setVersionCount(count || 0)
      }
    } catch (err) {
      console.error('Erro ao carregar ficheiro:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveForConstruction = async () => {
    if (!currentFile || !isAdmin) return
    if (!confirm('Tem certeza que deseja marcar este ficheiro como "Bom para Construção"?')) return

    setApproving(true)
    try {
      const { error } = await supabase
        .from('entrega_ficheiros')
        .update({
          aprovado_construcao: true,
          aprovado_em: new Date().toISOString(),
          aprovado_por: user?.id || null,
          aprovado_por_nome: user?.nome || user?.email || 'Admin'
        })
        .eq('id', currentFile.id)

      if (error) throw error

      // Recarregar ficheiro
      loadCurrentFile()
    } catch (err) {
      console.error('Erro ao aprovar:', err)
      alert('Erro ao aprovar ficheiro: ' + err.message)
    } finally {
      setApproving(false)
    }
  }

  const handleUploaded = () => {
    loadCurrentFile()
  }

  if (loading) {
    return (
      <div style={{
        padding: compact ? '12px' : '16px',
        background: 'var(--cream)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--brown-light)',
        fontSize: '13px'
      }}>
        <Loader2 size={16} className="animate-spin" />
        <span style={{ marginLeft: '8px' }}>A carregar...</span>
      </div>
    )
  }

  // Vista compacta (para listas)
  if (compact) {
    return (
      <>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {currentFile ? (
            <>
              <FileTypeIcon type={currentFile.tipo_ficheiro} size={24} />
              <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                v{currentFile.versao}
              </span>
              {currentFile.aprovado_construcao && (
                <Shield size={14} style={{ color: 'var(--success)' }} />
              )}
              <a
                href={currentFile.ficheiro_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--brown-light)', marginLeft: '4px' }}
                title="Ver ficheiro"
              >
                <Eye size={14} />
              </a>
            </>
          ) : (
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px dashed var(--stone)',
                borderRadius: '4px',
                fontSize: '11px',
                color: 'var(--brown-light)',
                cursor: 'pointer'
              }}
            >
              <Upload size={12} />
              Upload
            </button>
          )}
        </div>

        {showUploadModal && (
          <FileUploadModal
            entregavel={entregavel}
            projetoId={projetoId}
            onClose={() => setShowUploadModal(false)}
            onUploaded={handleUploaded}
          />
        )}
      </>
    )
  }

  // Vista completa
  return (
    <>
      <div style={{
        padding: '16px',
        background: 'var(--cream)',
        borderRadius: '10px',
        marginTop: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: currentFile ? '12px' : '0'
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--brown-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Ficheiro de Entrega
          </span>
          {versionCount > 1 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--stone)',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--brown-light)',
                cursor: 'pointer'
              }}
            >
              <History size={12} />
              {versionCount} versões
            </button>
          )}
        </div>

        {currentFile ? (
          <div>
            {/* File info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--white)',
              borderRadius: '8px',
              marginBottom: '12px'
            }}>
              <FileTypeIcon type={currentFile.tipo_ficheiro} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontWeight: 500,
                  color: 'var(--brown)',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {currentFile.nome_ficheiro}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                  v{currentFile.versao} · {formatFileSize(currentFile.tamanho_bytes)} ·{' '}
                  {new Date(currentFile.carregado_em).toLocaleDateString('pt-PT')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <a
                href={currentFile.ficheiro_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'var(--white)',
                  border: '1px solid var(--stone)',
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
                href={currentFile.ficheiro_url}
                download
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'var(--white)',
                  border: '1px solid var(--stone)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '12px',
                  color: 'var(--brown)'
                }}
              >
                <Download size={14} />
                Download
              </a>
              <button
                onClick={() => setShowUploadModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'var(--brown)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <Upload size={14} />
                Nova Versão
              </button>
            </div>

            {/* Approval */}
            {currentFile.aprovado_construcao ? (
              <ApprovalBadge
                approvedAt={currentFile.aprovado_em}
                approvedBy={currentFile.aprovado_por_nome}
              />
            ) : isAdmin && (
              <button
                onClick={handleApproveForConstruction}
                disabled={approving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  marginTop: '12px',
                  background: 'rgba(122, 158, 122, 0.1)',
                  border: '1px solid var(--success)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--success)',
                  fontWeight: 500,
                  cursor: approving ? 'not-allowed' : 'pointer',
                  opacity: approving ? 0.7 : 1,
                  justifyContent: 'center'
                }}
              >
                {approving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    A aprovar...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Marcar Bom para Construção
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Empty state */
          <div
            onClick={() => setShowUploadModal(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              background: 'var(--white)',
              borderRadius: '8px',
              border: '1px dashed var(--stone)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FileX size={32} style={{ color: 'var(--brown-light)', opacity: 0.4, marginBottom: '8px' }} />
            <span style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '4px' }}>
              Nenhum ficheiro
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--brown)',
              fontWeight: 500
            }}>
              <Upload size={14} />
              Clique para fazer upload
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUploadModal && (
        <FileUploadModal
          entregavel={entregavel}
          projetoId={projetoId}
          onClose={() => setShowUploadModal(false)}
          onUploaded={handleUploaded}
        />
      )}

      {showHistoryModal && (
        <VersionHistoryModal
          entregavel={entregavel}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </>
  )
}
