import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, Search, Filter, Calendar, User, Mail, CheckSquare, PenTool,
  Box, Truck, Users, StickyNote, FileText, X, Edit2, Trash2, Tag,
  ChevronDown, ChevronRight, Paperclip, Clock, MoreVertical
} from 'lucide-react'

const iconMap = {
  CheckSquare, PenTool, Box, User, Truck, Mail, Users, StickyNote, FileText
}

export default function DiarioBordo({ projeto }) {
  const [entradas, setEntradas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [utilizadores, setUtilizadores] = useState([])
  const [syncing, setSyncing] = useState(false)

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroTag, setFiltroTag] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroData, setFiltroData] = useState('')

  // Form
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria_id: '',
    data_evento: new Date().toISOString().split('T')[0],
    tags: []
  })

  useEffect(() => {
    if (projeto?.id) {
      loadData()
    }
  }, [projeto?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [entradasRes, categoriasRes, tagsRes, utilizadoresRes] = await Promise.all([
        supabase
          .from('projeto_diario')
          .select(`
            *,
            categoria:diario_categorias(*),
            utilizador:utilizadores(id, nome),
            projeto_diario_tags(tag_id)
          `)
          .eq('projeto_id', projeto.id)
          .order('data_evento', { ascending: false }),
        supabase.from('diario_categorias').select('*').order('ordem'),
        supabase.from('diario_tags').select('*').order('nome'),
        supabase.from('utilizadores').select('id, nome').eq('ativo', true).order('nome')
      ])

      if (entradasRes.data) setEntradas(entradasRes.data)
      if (categoriasRes.data) setCategorias(categoriasRes.data)
      if (tagsRes.data) setTags(tagsRes.data)
      if (utilizadoresRes.data) setUtilizadores(utilizadoresRes.data)
    } catch (err) {
      console.error('Erro ao carregar diário:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncOutlook = async () => {
    setSyncing(true)
    try {
      const response = await fetch(
        'https://vctcppuvqjstscbzdykn.supabase.co/functions/v1/outlook-sync',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
          }
        }
      )
      const result = await response.json()

      if (result.success) {
        alert(`Sincronização concluída!\n${result.imported} emails importados\n${result.skipped} ignorados`)
        loadData()
      } else {
        alert('Erro na sincronização: ' + (result.error || 'Erro desconhecido'))
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err)
      alert('Erro ao sincronizar: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      categoria_id: categorias[0]?.id || '',
      data_evento: new Date().toISOString().split('T')[0],
      tags: []
    })
    setEditingItem(null)
  }

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      alert('Título é obrigatório')
      return
    }

    try {
      const entradaData = {
        projeto_id: projeto.id,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao?.trim() || null,
        categoria_id: formData.categoria_id || null,
        data_evento: formData.data_evento || new Date().toISOString(),
        tipo: 'manual',
        fonte: 'manual'
      }

      let entradaId

      if (editingItem) {
        const { error } = await supabase
          .from('projeto_diario')
          .update(entradaData)
          .eq('id', editingItem.id)
        if (error) throw error
        entradaId = editingItem.id
      } else {
        const { data, error } = await supabase
          .from('projeto_diario')
          .insert([entradaData])
          .select()
          .single()
        if (error) throw error
        entradaId = data.id
      }

      // Atualizar tags
      await supabase.from('projeto_diario_tags').delete().eq('diario_id', entradaId)
      if (formData.tags.length > 0) {
        await supabase.from('projeto_diario_tags').insert(
          formData.tags.map(tagId => ({ diario_id: entradaId, tag_id: tagId }))
        )
      }

      setShowModal(false)
      resetForm()
      loadData()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar: ' + err.message)
    }
  }

  const handleDelete = async (entrada) => {
    if (!confirm('Tem certeza que deseja apagar esta entrada?')) return

    try {
      await supabase.from('projeto_diario').delete().eq('id', entrada.id)
      loadData()
    } catch (err) {
      console.error('Erro ao apagar:', err)
    }
  }

  const handleEdit = (entrada) => {
    setFormData({
      titulo: entrada.titulo,
      descricao: entrada.descricao || '',
      categoria_id: entrada.categoria_id || '',
      data_evento: entrada.data_evento?.split('T')[0] || '',
      tags: entrada.projeto_diario_tags?.map(t => t.tag_id) || []
    })
    setEditingItem(entrada)
    setShowModal(true)
  }

  // Filtrar entradas
  const entradasFiltradas = entradas.filter(e => {
    if (filtroCategoria && e.categoria_id !== filtroCategoria) return false
    if (filtroTag && !e.projeto_diario_tags?.some(t => t.tag_id === filtroTag)) return false
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase()
      if (!e.titulo.toLowerCase().includes(busca) &&
          !(e.descricao || '').toLowerCase().includes(busca)) return false
    }
    if (filtroData && !e.data_evento?.startsWith(filtroData)) return false
    return true
  })

  // Agrupar por data
  const entradasAgrupadas = entradasFiltradas.reduce((acc, entrada) => {
    const data = entrada.data_evento?.split('T')[0] || 'Sem data'
    if (!acc[data]) acc[data] = []
    acc[data].push(entrada)
    return acc
  }, {})

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    if (date.toDateString() === hoje.toDateString()) return 'Hoje'
    if (date.toDateString() === ontem.toDateString()) return 'Ontem'

    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== hoje.getFullYear() ? 'numeric' : undefined
    })
  }

  const getIcon = (iconName) => {
    const Icon = iconMap[iconName] || FileText
    return Icon
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
        A carregar diário de bordo...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
            Diário de Bordo
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--brown-light)' }}>
            {entradas.length} {entradas.length === 1 ? 'entrada' : 'entradas'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSyncOutlook}
            className="btn btn-outline"
            style={{ fontSize: '12px', padding: '8px 12px' }}
            disabled={syncing}
          >
            <Mail size={14} /> {syncing ? 'A sincronizar...' : 'Sync Outlook'}
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '8px 16px' }}
          >
            <Plus size={14} /> Nova Entrada
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px', fontSize: '13px' }}
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          style={{ fontSize: '13px', minWidth: '140px' }}
        >
          <option value="">Todas categorias</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nome}</option>
          ))}
        </select>

        <select
          value={filtroTag}
          onChange={e => setFiltroTag(e.target.value)}
          style={{ fontSize: '13px', minWidth: '140px' }}
        >
          <option value="">Todas tags</option>
          {tags.map(tag => (
            <option key={tag.id} value={tag.id}>{tag.nome}</option>
          ))}
        </select>

        <input
          type="date"
          value={filtroData}
          onChange={e => setFiltroData(e.target.value)}
          style={{ fontSize: '13px' }}
        />

        {(filtroCategoria || filtroTag || filtroBusca || filtroData) && (
          <button
            onClick={() => { setFiltroCategoria(''); setFiltroTag(''); setFiltroBusca(''); setFiltroData('') }}
            style={{ fontSize: '12px', color: 'var(--brown-light)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Lista de Entradas */}
      {entradasFiltradas.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <FileText size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Sem entradas no diário</p>
          <p style={{ fontSize: '12px', margin: '8px 0 0' }}>Adicione a primeira entrada para começar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(entradasAgrupadas).map(([data, items]) => (
            <div key={data}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--brown-light)',
                marginBottom: '8px',
                textTransform: 'capitalize'
              }}>
                {formatDate(data)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map(entrada => {
                  const Icon = entrada.categoria ? getIcon(entrada.categoria.icone) : FileText
                  const entradaTags = tags.filter(t =>
                    entrada.projeto_diario_tags?.some(et => et.tag_id === t.id)
                  )

                  return (
                    <div
                      key={entrada.id}
                      className="card"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        transition: 'box-shadow 0.2s',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleEdit(entrada)}
                    >
                      {/* Ícone da categoria */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: entrada.categoria?.cor ? `${entrada.categoria.cor}20` : 'var(--stone)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={16} style={{ color: entrada.categoria?.cor || 'var(--brown-light)' }} />
                      </div>

                      {/* Conteúdo */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                            {entrada.titulo}
                          </span>
                          {entrada.categoria && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: `${entrada.categoria.cor}20`,
                              color: entrada.categoria.cor
                            }}>
                              {entrada.categoria.nome}
                            </span>
                          )}
                          {entrada.tipo === 'email' && (
                            <Mail size={12} style={{ color: 'var(--info)' }} />
                          )}
                        </div>

                        {entrada.descricao && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--brown-light)',
                            margin: '0 0 6px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {entrada.descricao}
                          </p>
                        )}

                        {/* Tags */}
                        {entradaTags.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {entradaTags.map(tag => (
                              <span
                                key={tag.id}
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: `${tag.cor}20`,
                                  color: tag.cor
                                }}
                              >
                                {tag.nome}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Meta info */}
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          marginTop: '6px',
                          fontSize: '11px',
                          color: 'var(--brown-light)'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={10} />
                            {new Date(entrada.data_evento).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {entrada.utilizador && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={10} />
                              {entrada.utilizador.nome}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(entrada)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: 'var(--brown-light)'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entrada)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: 'var(--danger)'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingItem ? 'Editar Entrada' : 'Nova Entrada'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Descreva brevemente a ação..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Categoria
                  </label>
                  <select
                    value={formData.categoria_id}
                    onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="">Selecionar...</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Data
                  </label>
                  <input
                    type="date"
                    value={formData.data_evento}
                    onChange={e => setFormData({ ...formData, data_evento: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Adicione mais detalhes..."
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                  Tags
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        const newTags = formData.tags.includes(tag.id)
                          ? formData.tags.filter(t => t !== tag.id)
                          : [...formData.tags, tag.id]
                        setFormData({ ...formData, tags: newTags })
                      }}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: formData.tags.includes(tag.id) ? tag.cor : 'var(--border)',
                        background: formData.tags.includes(tag.id) ? `${tag.cor}20` : 'white',
                        color: formData.tags.includes(tag.id) ? tag.cor : 'var(--brown-light)',
                        cursor: 'pointer'
                      }}
                    >
                      {tag.nome}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-outline">
                Cancelar
              </button>
              <button onClick={handleSave} className="btn btn-primary">
                {editingItem ? 'Guardar' : 'Criar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
