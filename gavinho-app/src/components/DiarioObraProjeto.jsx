import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, Search, Filter, Calendar, X, Edit, Trash2,
  FileText, Users, CheckCircle, AlertTriangle, MapPin,
  Truck, User, RefreshCw, Upload, ChevronDown, Tag
} from 'lucide-react'

const iconMap = {
  FileText, Users, CheckCircle, AlertTriangle, MapPin, Truck, User, RefreshCw
}

export default function DiarioObraProjeto({ obraId, obraCodigo }) {
  const [entradas, setEntradas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showFilters, setShowFilters] = useState(false)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria_id: '',
    data_evento: new Date().toISOString().slice(0, 16),
    tags: [],
    anexos: []
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchData()
  }, [obraId])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchEntradas(), fetchCategorias(), fetchTags()])
    setLoading(false)
  }

  const fetchEntradas = async () => {
    const { data } = await supabase
      .from('obra_diario_projeto')
      .select(`
        *,
        categoria:obra_diario_categorias(*),
        obra_diario_projeto_tags(tag_id)
      `)
      .eq('obra_id', obraId)
      .order('data_evento', { ascending: false })

    setEntradas(data || [])
  }

  const fetchCategorias = async () => {
    const { data } = await supabase
      .from('obra_diario_categorias')
      .select('*')
      .order('ordem')
    setCategorias(data || [])
  }

  const fetchTags = async () => {
    const { data } = await supabase
      .from('obra_diario_tags')
      .select('*')
    setTags(data || [])
  }

  const handleSave = async () => {
    if (!form.titulo.trim()) return

    const entryData = {
      obra_id: obraId,
      titulo: form.titulo,
      descricao: form.descricao,
      categoria_id: form.categoria_id || null,
      data_evento: form.data_evento,
      anexos: form.anexos,
      updated_at: new Date().toISOString()
    }

    let entryId = editingEntry?.id

    if (editingEntry) {
      await supabase.from('obra_diario_projeto').update(entryData).eq('id', entryId)
    } else {
      const { data } = await supabase.from('obra_diario_projeto').insert([entryData]).select()
      entryId = data?.[0]?.id
    }

    // Update tags
    if (entryId) {
      await supabase.from('obra_diario_projeto_tags').delete().eq('diario_id', entryId)
      if (form.tags.length > 0) {
        const tagInserts = form.tags.map(tagId => ({ diario_id: entryId, tag_id: tagId }))
        await supabase.from('obra_diario_projeto_tags').insert(tagInserts)
      }
    }

    setShowModal(false)
    resetForm()
    fetchEntradas()
  }

  const handleDelete = async (entry) => {
    await supabase.from('obra_diario_projeto').delete().eq('id', entry.id)
    setDeleteConfirm(null)
    fetchEntradas()
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    const newAnexos = [...form.anexos]

    for (const file of files) {
      const fileName = `${obraCodigo}/diario-projeto/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('obras').upload(fileName, file)

      if (!error) {
        const { data: urlData } = supabase.storage.from('obras').getPublicUrl(fileName)
        newAnexos.push({ url: urlData.publicUrl, nome: file.name, data: new Date().toISOString() })
      }
    }

    setForm({ ...form, anexos: newAnexos })
    setUploading(false)
  }

  const removeAnexo = (index) => {
    const newAnexos = form.anexos.filter((_, i) => i !== index)
    setForm({ ...form, anexos: newAnexos })
  }

  const resetForm = () => {
    setForm({
      titulo: '',
      descricao: '',
      categoria_id: '',
      data_evento: new Date().toISOString().slice(0, 16),
      tags: [],
      anexos: []
    })
    setEditingEntry(null)
  }

  const openEditModal = (entry) => {
    setEditingEntry(entry)
    setForm({
      titulo: entry.titulo,
      descricao: entry.descricao || '',
      categoria_id: entry.categoria_id || '',
      data_evento: entry.data_evento ? entry.data_evento.slice(0, 16) : new Date().toISOString().slice(0, 16),
      tags: entry.obra_diario_projeto_tags?.map(t => t.tag_id) || [],
      anexos: entry.anexos || []
    })
    setShowModal(true)
  }

  const toggleTag = (tagId) => {
    if (form.tags.includes(tagId)) {
      setForm({ ...form, tags: form.tags.filter(t => t !== tagId) })
    } else {
      setForm({ ...form, tags: [...form.tags, tagId] })
    }
  }

  const toggleFilterTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(t => t !== tagId))
    } else {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategoria(null)
    setSelectedTags([])
    setDateRange({ start: '', end: '' })
  }

  // Filter entries
  const filteredEntradas = entradas.filter(entry => {
    if (searchTerm && !entry.titulo.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !entry.descricao?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (selectedCategoria && entry.categoria_id !== selectedCategoria) {
      return false
    }
    if (selectedTags.length > 0) {
      const entryTagIds = entry.obra_diario_projeto_tags?.map(t => t.tag_id) || []
      if (!selectedTags.some(t => entryTagIds.includes(t))) {
        return false
      }
    }
    if (dateRange.start && new Date(entry.data_evento) < new Date(dateRange.start)) {
      return false
    }
    if (dateRange.end && new Date(entry.data_evento) > new Date(dateRange.end + 'T23:59:59')) {
      return false
    }
    return true
  })

  const hasActiveFilters = searchTerm || selectedCategoria || selectedTags.length > 0 || dateRange.start || dateRange.end

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getCategoriaIcon = (iconName) => {
    const IconComponent = iconMap[iconName] || FileText
    return IconComponent
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>A carregar...</div>
  }

  return (
    <div className="diario-projeto-container">
      {/* Header */}
      <div className="diario-header">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Diário de Projeto</h2>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
            {filteredEntradas.length} {filteredEntradas.length === 1 ? 'entrada' : 'entradas'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-outline ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtros
            {hasActiveFilters && <span className="filter-badge">{selectedTags.length + (selectedCategoria ? 1 : 0) + (dateRange.start ? 1 : 0)}</span>}
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
            <Plus size={16} />
            Nova Entrada
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="diario-search-bar">
        <Search size={18} style={{ color: 'var(--brown-light)' }} />
        <input
          type="text"
          placeholder="Pesquisar entradas..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="diario-filters-panel">
          <div className="filter-section">
            <label>Categoria</label>
            <div className="filter-chips">
              {categorias.map(cat => {
                const Icon = getCategoriaIcon(cat.icone)
                return (
                  <button
                    key={cat.id}
                    className={`filter-chip ${selectedCategoria === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategoria(selectedCategoria === cat.id ? null : cat.id)}
                    style={{ '--chip-color': cat.cor }}
                  >
                    <Icon size={14} />
                    {cat.nome}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="filter-section">
            <label>Tags</label>
            <div className="filter-chips">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  className={`filter-chip ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                  onClick={() => toggleFilterTag(tag.id)}
                  style={{ '--chip-color': tag.cor }}
                >
                  <Tag size={14} />
                  {tag.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label>Período</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="date-input"
              />
              <span style={{ color: 'var(--brown-light)' }}>até</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="date-input"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button className="btn btn-ghost" onClick={clearFilters} style={{ marginTop: '8px' }}>
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Entries List */}
      {filteredEntradas.length === 0 ? (
        <div className="diario-empty">
          <FileText size={48} strokeWidth={1} />
          <p>{hasActiveFilters ? 'Nenhuma entrada encontrada com os filtros aplicados' : 'Ainda não há entradas no diário'}</p>
          {!hasActiveFilters && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
              <Plus size={16} />
              Criar primeira entrada
            </button>
          )}
        </div>
      ) : (
        <div className="diario-entries">
          {filteredEntradas.map(entry => {
            const Icon = entry.categoria ? getCategoriaIcon(entry.categoria.icone) : FileText
            const entryTags = entry.obra_diario_projeto_tags?.map(t => tags.find(tag => tag.id === t.tag_id)).filter(Boolean) || []

            return (
              <div key={entry.id} className="diario-entry">
                <div className="entry-icon" style={{ background: entry.categoria?.cor || '#6b7280' }}>
                  <Icon size={18} color="white" />
                </div>
                <div className="entry-content">
                  <div className="entry-header">
                    <h3>{entry.titulo}</h3>
                    <div className="entry-actions">
                      <button className="btn btn-ghost btn-icon" onClick={() => openEditModal(entry)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(entry)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="entry-meta">
                    <span className="entry-date">
                      <Calendar size={12} />
                      {formatDate(entry.data_evento)}
                    </span>
                    {entry.categoria && (
                      <span className="entry-categoria" style={{ background: entry.categoria.cor + '20', color: entry.categoria.cor }}>
                        {entry.categoria.nome}
                      </span>
                    )}
                    {entryTags.map(tag => (
                      <span key={tag.id} className="entry-tag" style={{ background: tag.cor + '20', color: tag.cor }}>
                        {tag.nome}
                      </span>
                    ))}
                  </div>

                  {entry.descricao && (
                    <p className="entry-description">{entry.descricao}</p>
                  )}

                  {entry.anexos && entry.anexos.length > 0 && (
                    <div className="entry-anexos">
                      {entry.anexos.slice(0, 4).map((anexo, idx) => (
                        <a key={idx} href={anexo.url} target="_blank" rel="noopener noreferrer" className="anexo-link">
                          <FileText size={12} />
                          {anexo.nome}
                        </a>
                      ))}
                      {entry.anexos.length > 4 && (
                        <span className="anexos-more">+{entry.anexos.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content diario-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEntry ? 'Editar Entrada' : 'Nova Entrada'}</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Título da entrada..."
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoria</label>
                  <select
                    value={form.categoria_id}
                    onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Sem categoria</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Data e Hora</label>
                  <input
                    type="datetime-local"
                    value={form.data_evento}
                    onChange={e => setForm({ ...form, data_evento: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tags-selector">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`tag-btn ${form.tags.includes(tag.id) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag.id)}
                      style={{ '--tag-color': tag.cor }}
                    >
                      {tag.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descrição detalhada..."
                  rows={4}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Anexos</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload size={16} />
                  {uploading ? 'A carregar...' : 'Adicionar ficheiros'}
                </button>

                {form.anexos.length > 0 && (
                  <div className="anexos-list">
                    {form.anexos.map((anexo, idx) => (
                      <div key={idx} className="anexo-item">
                        <FileText size={14} />
                        <span>{anexo.nome}</span>
                        <button type="button" onClick={() => removeAnexo(idx)} className="btn btn-ghost btn-icon">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.titulo.trim()}>
                {editingEntry ? 'Guardar' : 'Criar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <h3>Eliminar entrada?</h3>
            <p style={{ color: 'var(--brown-light)', margin: '8px 0 20px' }}>
              Esta ação não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
