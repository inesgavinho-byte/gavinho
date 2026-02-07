// =====================================================
// CENTRAL ENTREGAS CHAT - Internal Deliveries
// Shows chat files and links to project deliveries
// =====================================================

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  FileText, Upload, Download, Eye, ExternalLink, Package,
  FolderOpen, Clock, User, Search, Filter, Loader2,
  FileImage, FileSpreadsheet, File, AlertCircle
} from 'lucide-react'

// File type icon helper
const getFileIcon = (fileName, tipo) => {
  if (tipo === 'imagem' || fileName?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return FileImage
  }
  if (fileName?.match(/\.(xlsx|xls|csv)$/i)) {
    return FileSpreadsheet
  }
  if (fileName?.match(/\.(pdf|doc|docx)$/i)) {
    return FileText
  }
  return File
}

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function CentralEntregasChat({ canalAtivo, onNavigateToEntregaveis }) {
  const [chatFiles, setChatFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all', 'images', 'documents', 'spreadsheets'

  useEffect(() => {
    if (canalAtivo?.id) {
      loadChatFiles()
    }
  }, [canalAtivo?.id])

  const loadChatFiles = async () => {
    try {
      setLoading(true)

      // Buscar mensagens com ficheiros do canal
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select(`
          id,
          conteudo,
          ficheiro_url,
          ficheiro_nome,
          ficheiro_tamanho,
          ficheiro_tipo,
          tipo,
          created_at,
          autor:autor_id(id, nome, avatar_url)
        `)
        .eq('canal_id', canalAtivo.id)
        .eq('eliminado', false)
        .not('ficheiro_url', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChatFiles(data || [])
    } catch (err) {
      console.error('Erro ao carregar ficheiros:', err)
      setChatFiles([])
    } finally {
      setLoading(false)
    }
  }

  // Filter files based on search and type
  const filteredFiles = chatFiles.filter(file => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fileName = (file.ficheiro_nome || '').toLowerCase()
      const autorName = (file.autor?.nome || '').toLowerCase()
      if (!fileName.includes(query) && !autorName.includes(query)) {
        return false
      }
    }

    // Type filter
    if (filterType !== 'all') {
      const fileName = file.ficheiro_nome || ''
      const tipo = file.tipo

      switch (filterType) {
        case 'images':
          if (tipo !== 'imagem' && !fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return false
          break
        case 'documents':
          if (!fileName.match(/\.(pdf|doc|docx|txt)$/i)) return false
          break
        case 'spreadsheets':
          if (!fileName.match(/\.(xlsx|xls|csv)$/i)) return false
          break
      }
    }

    return true
  })

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      {/* Header with link to project deliveries */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--brown)',
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <FolderOpen size={22} />
            Ficheiros do Canal
          </h2>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--brown-light)'
          }}>
            Ficheiros partilhados nas conversas deste projeto
          </p>
        </div>

        {/* Link to Project Entregáveis */}
        <button
          onClick={() => onNavigateToEntregaveis?.(canalAtivo)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'var(--accent-olive)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Package size={18} />
          Central de Entregas do Projeto
          <ExternalLink size={14} style={{ opacity: 0.7 }} />
        </button>
      </div>

      {/* Info banner about client deliveries */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        background: 'rgba(138, 158, 184, 0.15)',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '1px solid rgba(138, 158, 184, 0.3)'
      }}>
        <AlertCircle size={20} style={{ color: 'var(--info)', flexShrink: 0 }} />
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: 'var(--brown)',
          lineHeight: '1.5'
        }}>
          <strong>Nota:</strong> Ficheiros partilhados aqui são apenas para uso interno da equipa.
          Todas as entregas oficiais ao cliente devem ser feitas através da{' '}
          <button
            onClick={() => onNavigateToEntregaveis?.(canalAtivo)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--accent-olive)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Central de Entregas do Projeto
          </button>.
        </p>
      </div>

      {/* Search and filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{
          flex: 1,
          minWidth: '200px',
          position: 'relative'
        }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--brown-light)'
          }} />
          <input
            type="text"
            placeholder="Pesquisar ficheiros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid var(--stone)',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
              background: 'var(--white)'
            }}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'images', label: 'Imagens' },
            { id: 'documents', label: 'Documentos' },
            { id: 'spreadsheets', label: 'Folhas de cálculo' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: filterType === filter.id ? 'var(--brown)' : 'var(--cream)',
                border: filterType === filter.id ? 'none' : '1px solid var(--stone)',
                color: filterType === filter.id ? 'white' : 'var(--brown-light)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Files list */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: 'var(--brown-light)'
        }}>
          <Loader2 size={24} className="animate-spin" />
          <span style={{ marginLeft: '12px', fontSize: '14px' }}>A carregar ficheiros...</span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--brown-light)'
        }}>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--brown)' }}>
            {searchQuery || filterType !== 'all' ? 'Nenhum ficheiro encontrado' : 'Sem ficheiros'}
          </h3>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {searchQuery || filterType !== 'all'
              ? 'Tenta ajustar os filtros de pesquisa'
              : 'Os ficheiros partilhados nas conversas aparecerão aqui'
            }
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '12px'
        }}>
          {filteredFiles.map(file => {
            const FileIcon = getFileIcon(file.ficheiro_nome, file.tipo)
            return (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: 'var(--white)',
                  borderRadius: '10px',
                  border: '1px solid var(--stone)',
                  transition: 'all 0.15s'
                }}
              >
                {/* File icon or preview */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {file.tipo === 'imagem' && file.ficheiro_url ? (
                    <img
                      src={file.ficheiro_url}
                      alt={file.ficheiro_nome}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <FileIcon size={24} style={{ color: 'var(--brown-light)' }} />
                  )}
                </div>

                {/* File info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 500,
                    color: 'var(--brown)',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '4px'
                  }}>
                    {file.ficheiro_nome || 'Ficheiro sem nome'}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: 'var(--brown-light)'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} />
                      {file.autor?.nome || 'Desconhecido'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {formatDate(file.created_at)}
                    </span>
                    <span>{formatFileSize(file.ficheiro_tamanho)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={file.ficheiro_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver ficheiro"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--cream)',
                      border: '1px solid var(--stone)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brown)',
                      textDecoration: 'none'
                    }}
                  >
                    <Eye size={16} />
                  </a>
                  <a
                    href={file.ficheiro_url}
                    download={file.ficheiro_nome}
                    title="Descarregar"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--cream)',
                      border: '1px solid var(--stone)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brown)',
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={16} />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* File count */}
      {!loading && filteredFiles.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--brown-light)'
        }}>
          {filteredFiles.length} {filteredFiles.length === 1 ? 'ficheiro' : 'ficheiros'}
          {(searchQuery || filterType !== 'all') && ` de ${chatFiles.length} total`}
        </div>
      )}
    </div>
  )
}
