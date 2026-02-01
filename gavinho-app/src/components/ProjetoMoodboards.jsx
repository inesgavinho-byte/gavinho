import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Upload, FileCode, Eye, Trash2, X, Plus, Loader2,
  Maximize2, Minimize2, ExternalLink, Download, Edit,
  Palette, Calendar, User, MoreVertical, RefreshCw
} from 'lucide-react'
import './ProjetoMoodboards.css'

export default function ProjetoMoodboards({ projeto, userId, userName }) {
  const [moodboards, setMoodboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedMoodboard, setSelectedMoodboard] = useState(null)
  const [htmlContent, setHtmlContent] = useState(null)
  const [loadingHtml, setLoadingHtml] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMoodboard, setEditingMoodboard] = useState(null)

  const fileInputRef = useRef(null)
  const iframeRef = useRef(null)

  // Fetch HTML content when moodboard is selected
  const loadHtmlContent = async (moodboard) => {
    if (!moodboard?.file_url) return

    setLoadingHtml(true)
    setHtmlContent(null)

    try {
      const response = await fetch(moodboard.file_url)
      const text = await response.text()
      setHtmlContent(text)
    } catch (err) {
      console.error('Erro ao carregar HTML:', err)
      setHtmlContent(`<html><body><h1>Erro ao carregar</h1><p>${err.message}</p></body></html>`)
    } finally {
      setLoadingHtml(false)
    }
  }

  // Handle moodboard selection
  const handleSelectMoodboard = (moodboard) => {
    setSelectedMoodboard(moodboard)
    loadHtmlContent(moodboard)
  }

  // Form state for new moodboard
  const [newMoodboard, setNewMoodboard] = useState({
    titulo: '',
    descricao: '',
    tipo: 'conceito', // conceito, materiais, cores, espacos
    arquivo: null
  })

  const TIPOS_MOODBOARD = [
    { value: 'conceito', label: 'Conceito Geral', icon: Palette },
    { value: 'materiais', label: 'Materiais', icon: Palette },
    { value: 'cores', label: 'Paleta de Cores', icon: Palette },
    { value: 'espacos', label: 'Espaços', icon: Palette },
    { value: 'outro', label: 'Outro', icon: FileCode }
  ]

  useEffect(() => {
    if (projeto?.id) {
      loadMoodboards()
    }
  }, [projeto?.id])

  const loadMoodboards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projeto_moodboards')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMoodboards(data || [])
    } catch (err) {
      console.error('Erro ao carregar moodboards:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      alert('Por favor selecione um ficheiro HTML (.html ou .htm)')
      e.target.value = ''
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Ficheiro demasiado grande. Máximo: 10MB')
      e.target.value = ''
      return
    }

    setNewMoodboard(prev => ({
      ...prev,
      arquivo: file,
      titulo: prev.titulo || file.name.replace(/\.(html|htm)$/, '')
    }))
  }

  const handleUpload = async () => {
    if (!newMoodboard.arquivo || !newMoodboard.titulo.trim()) {
      alert('Por favor preencha o título e selecione um ficheiro')
      return
    }

    setUploading(true)
    try {
      // Upload file to storage
      const fileExt = newMoodboard.arquivo.name.split('.').pop()
      const fileName = `${projeto.id}/moodboards/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('projeto-files')
        .upload(fileName, newMoodboard.arquivo, {
          contentType: 'text/html',
          cacheControl: '3600'
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('projeto-files')
        .getPublicUrl(fileName)

      // Create database record
      const { error: dbError } = await supabase
        .from('projeto_moodboards')
        .insert([{
          projeto_id: projeto.id,
          titulo: newMoodboard.titulo.trim(),
          descricao: newMoodboard.descricao.trim() || null,
          tipo: newMoodboard.tipo,
          file_url: urlData.publicUrl,
          file_path: fileName,
          file_size: newMoodboard.arquivo.size,
          created_by: userId,
          created_by_name: userName
        }])

      if (dbError) throw dbError

      // Reset form and reload
      setNewMoodboard({ titulo: '', descricao: '', tipo: 'conceito', arquivo: null })
      setShowUploadModal(false)
      loadMoodboards()
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (moodboard) => {
    if (!confirm(`Eliminar "${moodboard.titulo}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      // Delete from storage
      if (moodboard.file_path) {
        await supabase.storage
          .from('projeto-files')
          .remove([moodboard.file_path])
      }

      // Delete from database
      const { error } = await supabase
        .from('projeto_moodboards')
        .delete()
        .eq('id', moodboard.id)

      if (error) throw error

      // Close viewer if this was selected
      if (selectedMoodboard?.id === moodboard.id) {
        setSelectedMoodboard(null)
      }

      loadMoodboards()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert('Erro ao eliminar: ' + err.message)
    }
  }

  const handleEdit = async () => {
    if (!editingMoodboard) return

    try {
      const { error } = await supabase
        .from('projeto_moodboards')
        .update({
          titulo: editingMoodboard.titulo,
          descricao: editingMoodboard.descricao,
          tipo: editingMoodboard.tipo,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMoodboard.id)

      if (error) throw error

      setShowEditModal(false)
      setEditingMoodboard(null)
      loadMoodboards()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      alert('Erro ao atualizar: ' + err.message)
    }
  }

  const openEdit = (moodboard) => {
    setEditingMoodboard({ ...moodboard })
    setShowEditModal(true)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getTipoLabel = (tipo) => {
    const found = TIPOS_MOODBOARD.find(t => t.value === tipo)
    return found ? found.label : tipo
  }

  if (loading) {
    return (
      <div className="moodboards-loading">
        <Loader2 size={32} className="spin" />
        <p>A carregar moodboards...</p>
      </div>
    )
  }

  return (
    <div className={`moodboards-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <div className="moodboards-header">
        <div className="moodboards-title">
          <Palette size={24} />
          <div>
            <h2>Moodboards & Conceito</h2>
            <p>{moodboards.length} moodboard{moodboards.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowUploadModal(true)}
        >
          <Plus size={16} />
          Adicionar Moodboard
        </button>
      </div>

      <div className="moodboards-content">
        {/* Sidebar with list */}
        <div className="moodboards-sidebar">
          {moodboards.length === 0 ? (
            <div className="moodboards-empty">
              <FileCode size={32} />
              <p>Sem moodboards</p>
              <span>Adicione ficheiros HTML para visualizar os conceitos do projeto</span>
            </div>
          ) : (
            <div className="moodboards-list">
              {moodboards.map(mb => (
                <div
                  key={mb.id}
                  className={`moodboard-item ${selectedMoodboard?.id === mb.id ? 'active' : ''}`}
                  onClick={() => handleSelectMoodboard(mb)}
                >
                  <div className="moodboard-item-icon">
                    <FileCode size={20} />
                  </div>
                  <div className="moodboard-item-info">
                    <h4>{mb.titulo}</h4>
                    <span className="moodboard-item-meta">
                      {getTipoLabel(mb.tipo)} · {formatFileSize(mb.file_size)}
                    </span>
                  </div>
                  <div className="moodboard-item-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(mb)
                      }}
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(mb)
                      }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Viewer */}
        <div className="moodboards-viewer">
          {selectedMoodboard ? (
            <>
              <div className="viewer-toolbar">
                <div className="viewer-info">
                  <h3>{selectedMoodboard.titulo}</h3>
                  {selectedMoodboard.descricao && (
                    <p>{selectedMoodboard.descricao}</p>
                  )}
                </div>
                <div className="viewer-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => loadHtmlContent(selectedMoodboard)}
                    title="Recarregar"
                    disabled={loadingHtml}
                  >
                    <RefreshCw size={16} className={loadingHtml ? 'spin' : ''} />
                  </button>
                  <a
                    className="btn btn-ghost"
                    href={selectedMoodboard.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir em nova janela"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <a
                    className="btn btn-ghost"
                    href={selectedMoodboard.file_url}
                    download={`${selectedMoodboard.titulo}.html`}
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    className="btn btn-ghost"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Sair de ecrã inteiro' : 'Ecrã inteiro'}
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  {isFullscreen && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setIsFullscreen(false)
                        setSelectedMoodboard(null)
                      }}
                      title="Fechar"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="viewer-frame-container">
                {loadingHtml ? (
                  <div className="viewer-loading">
                    <Loader2 size={32} className="spin" />
                    <p>A carregar moodboard...</p>
                  </div>
                ) : htmlContent ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={htmlContent}
                    title={selectedMoodboard.titulo}
                    className="viewer-iframe"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                ) : (
                  <div className="viewer-loading">
                    <Loader2 size={32} className="spin" />
                  </div>
                )}
              </div>
              <div className="viewer-footer">
                <span>
                  <Calendar size={12} />
                  {new Date(selectedMoodboard.created_at).toLocaleDateString('pt-PT')}
                </span>
                <span>
                  <User size={12} />
                  {selectedMoodboard.created_by_name || 'Desconhecido'}
                </span>
              </div>
            </>
          ) : (
            <div className="viewer-placeholder">
              <Eye size={48} />
              <h3>Selecione um moodboard</h3>
              <p>Clique num moodboard da lista para visualizar</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar Moodboard</h3>
              <button className="btn-close" onClick={() => setShowUploadModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={newMoodboard.titulo}
                  onChange={e => setNewMoodboard(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Nome do moodboard"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={newMoodboard.tipo}
                  onChange={e => setNewMoodboard(prev => ({ ...prev, tipo: e.target.value }))}
                  className="form-select"
                >
                  {TIPOS_MOODBOARD.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={newMoodboard.descricao}
                  onChange={e => setNewMoodboard(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição opcional do moodboard"
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Ficheiro HTML *</label>
                <div
                  className="upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {newMoodboard.arquivo ? (
                    <div className="upload-preview">
                      <FileCode size={32} />
                      <span>{newMoodboard.arquivo.name}</span>
                      <span className="upload-size">{formatFileSize(newMoodboard.arquivo.size)}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} />
                      <span>Clique para selecionar ficheiro HTML</span>
                      <span className="upload-hint">.html ou .htm (máx. 10MB)</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileSelect}
                    hidden
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowUploadModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading || !newMoodboard.arquivo || !newMoodboard.titulo.trim()}
              >
                {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                {uploading ? 'A fazer upload...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingMoodboard && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Moodboard</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={editingMoodboard.titulo}
                  onChange={e => setEditingMoodboard(prev => ({ ...prev, titulo: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={editingMoodboard.tipo}
                  onChange={e => setEditingMoodboard(prev => ({ ...prev, tipo: e.target.value }))}
                  className="form-select"
                >
                  {TIPOS_MOODBOARD.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={editingMoodboard.descricao || ''}
                  onChange={e => setEditingMoodboard(prev => ({ ...prev, descricao: e.target.value }))}
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleEdit}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
