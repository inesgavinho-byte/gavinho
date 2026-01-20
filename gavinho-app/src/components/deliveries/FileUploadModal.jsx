import { useState, useCallback } from 'react'
import { X, Upload, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import FileTypeIcon, { getFileTypeLabel, formatFileSize } from './FileTypeIcon'

const ACCEPTED_EXTENSIONS = ['pdf', 'jpeg', 'jpg', 'png', 'dwg', 'dwf']
const MAX_FILE_SIZE = 104857600 // 100MB

export default function FileUploadModal({
  entregavel,
  projetoId,
  onClose,
  onUploaded
}) {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const validateFile = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Formato não suportado. Use: ${ACCEPTED_EXTENSIONS.join(', ').toUpperCase()}`
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Ficheiro demasiado grande. Máximo: 100MB'
    }
    return null
  }

  const handleFileSelect = (selectedFile) => {
    setError(null)
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }
    setFile(selectedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleInputChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop().toLowerCase()
      const timestamp = Date.now()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${projetoId}/${entregavel.id}/${timestamp}_${safeFileName}`

      // 1. Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('delivery-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      // Simular progresso (o Supabase JS v2 não tem onUploadProgress nativo)
      setProgress(50)

      if (uploadError) {
        // Se o bucket não existir, tentar criar
        if (uploadError.message?.includes('bucket') || uploadError.statusCode === '404') {
          throw new Error('Bucket de storage não configurado. Execute a migration no Supabase.')
        }
        throw uploadError
      }

      setProgress(75)

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage
        .from('delivery-files')
        .getPublicUrl(storagePath)

      // 3. Inserir registo na BD
      const { error: dbError } = await supabase
        .from('entrega_ficheiros')
        .insert({
          entregavel_id: entregavel.id,
          projeto_id: projetoId,
          nome_ficheiro: file.name,
          tipo_ficheiro: fileExt,
          ficheiro_url: urlData.publicUrl,
          tamanho_bytes: file.size,
          carregado_por: user?.id || null,
          carregado_por_nome: user?.nome || user?.email || 'Utilizador',
          notas: notes || null
        })

      if (dbError) throw dbError

      setProgress(100)

      // Sucesso
      setTimeout(() => {
        onUploaded()
        onClose()
      }, 500)

    } catch (err) {
      console.error('Erro no upload:', err)
      setError(err.message || 'Erro ao fazer upload. Tente novamente.')
      setUploading(false)
    }
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
          width: '500px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto'
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
              Upload de Ficheiro
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

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Error */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: 'rgba(180, 100, 100, 0.1)',
              border: '1px solid rgba(180, 100, 100, 0.3)',
              borderRadius: '8px',
              marginBottom: '20px',
              color: 'var(--error)',
              fontSize: '13px'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Dropzone */}
          <div
            style={{
              border: `2px dashed ${isDragging ? 'var(--brown)' : 'var(--stone)'}`,
              borderRadius: '12px',
              padding: file ? '16px' : '40px 24px',
              background: isDragging ? 'var(--cream)' : 'var(--white)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '20px'
            }}
            onClick={() => !file && document.getElementById('file-input').click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <FileTypeIcon type={file.name.split('.').pop()} size={48} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{
                    fontWeight: 500,
                    color: 'var(--brown)',
                    display: 'block',
                    marginBottom: '4px',
                    wordBreak: 'break-all'
                  }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    {getFileTypeLabel(file.name.split('.').pop())} · {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setError(null)
                  }}
                  style={{
                    background: 'var(--stone)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: 'var(--brown-light)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <Upload
                  size={36}
                  style={{
                    color: isDragging ? 'var(--brown)' : 'var(--brown-light)',
                    opacity: isDragging ? 1 : 0.5,
                    marginBottom: '12px'
                  }}
                />
                <p style={{
                  margin: '0 0 8px',
                  fontWeight: 500,
                  color: isDragging ? 'var(--brown)' : 'var(--brown-light)'
                }}>
                  {isDragging ? 'Solte o ficheiro aqui...' : 'Arraste um ficheiro ou clique para selecionar'}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--brown-light)',
                  opacity: 0.7
                }}>
                  Formatos aceites: PDF, JPEG, PNG, DWG, DWF (máx. 100MB)
                </p>
              </>
            )}
            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpeg,.jpg,.png,.dwg,.dwf"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
          </div>

          {/* Notas */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--brown)',
              marginBottom: '8px'
            }}>
              Notas da versão (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Corrigida cota da varanda, atualizado mapa de vãos..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Progress */}
          {uploading && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '12px',
                color: 'var(--brown-light)'
              }}>
                <span>A carregar...</span>
                <span>{progress}%</span>
              </div>
              <div style={{
                height: '6px',
                background: 'var(--stone)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'var(--brown)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--stone)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            disabled={uploading}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: (!file || uploading) ? 0.6 : 1
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <Upload size={16} />
                Fazer Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
