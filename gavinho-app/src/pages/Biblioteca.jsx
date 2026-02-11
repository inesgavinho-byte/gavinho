import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { 
  Search, Plus, Filter, Grid, List, X, Upload, Tag, Edit, Trash2,
  Image, Box, Sparkles, Mountain, Trees, Layers, Shirt, Square,
  Sofa, Lamp, Bath, ChefHat, TreePalm, Building, Bed, Monitor, ZoomIn,
  ExternalLink, Heart, MoreVertical, Check, ChevronDown, Eye
} from 'lucide-react'

// ============================================
// CONSTANTES
// ============================================
const TABS = [
  { id: 'materiais', label: 'Materiais', icon: Layers },
  { id: 'modelos3d', label: 'Modelos 3D', icon: Box },
  { id: 'inspiracao', label: 'Inspiração', icon: Sparkles }
]

const FORMATOS_3D = ['.obj', '.fbx', '.skp', '.3ds', '.blend', '.glb', '.gltf']

const ICON_MAP = {
  'mountain': Mountain,
  'trees': Trees,
  'layers': Layers,
  'grid-3x3': Grid,
  'shirt': Shirt,
  'square': Square,
  'sofa': Sofa,
  'lamp': Lamp,
  'bath': Bath,
  'chef-hat': ChefHat,
  'tree-palm': TreePalm,
  'building': Building,
  'bed': Bed,
  'monitor': Monitor,
  'zoom-in': ZoomIn,
  'box': Box,
  'flower-2': Sparkles
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function Biblioteca() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('materiais')
  const [viewMode, setViewMode] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  
  // Data
  const [categorias, setCategorias] = useState([])
  const [tags, setTags] = useState([])
  const [materiais, setMateriais] = useState([])
  const [modelos3d, setModelos3d] = useState([])
  const [inspiracao, setInspiracao] = useState([])
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modals
  const [showModal, setShowModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showPreview, setShowPreview] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [editingCategoria, setEditingCategoria] = useState(null)
  const [editingTag, setEditingTag] = useState(null)
  
  // Forms
  const [materialForm, setMaterialForm] = useState({
    nome: '', descricao: '', categoria_id: '', fornecedor: '', referencia: '',
    preco_m2: '', cor: '', acabamento: '', notas: '', tags: [],
    ficha_tecnica_url: '', projeto_id: ''
  })
  const [modelo3dForm, setModelo3dForm] = useState({
    nome: '', descricao: '', categoria_id: '', formato: '', fornecedor: '',
    preco: '', largura_cm: '', altura_cm: '', profundidade_cm: '', notas: '', tags: []
  })
  const [inspiracaoForm, setInspiracaoForm] = useState({
    nome: '', descricao: '', categoria_id: '', fonte: '', link_original: '',
    projeto_id: '', notas: '', tags: []
  })
  const [newTag, setNewTag] = useState({ nome: '', cor: '#C9A882' })
  const [newCategoria, setNewCategoria] = useState({ nome: '', tipo: 'materiais', icone: 'layers', cor: '#C9A882' })
  
  // Inline tag creation
  const [showInlineTagInput, setShowInlineTagInput] = useState(false)
  const [inlineTagName, setInlineTagName] = useState('')
  const [inlineTagColor, setInlineTagColor] = useState('#C9A882')
  
  // File uploads
  const [uploadingFile, setUploadingFile] = useState(false)
  const [tempFileUrl, setTempFileUrl] = useState('')
  const [tempMiniaturaUrl, setTempMiniaturaUrl] = useState('')
  const [tempFichaTecnicaUrl, setTempFichaTecnicaUrl] = useState('')

  // ============================================
  // LOAD DATA
  // ============================================
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setSelectedCategoria('')
    setSelectedTags([])
    setSearchTerm('')
  }, [activeTab])

  const loadData = async () => {
    try {
      const [catRes, tagRes, matRes, modRes, inspRes, projRes] = await Promise.all([
        supabase.from('biblioteca_categorias').select('*').order('ordem'),
        supabase.from('biblioteca_tags').select('*').order('nome'),
        supabase.from('biblioteca_materiais').select('*, biblioteca_materiais_tags(tag_id)').eq('ativo', true).order('nome'),
        supabase.from('biblioteca_modelos3d').select('*, biblioteca_modelos3d_tags(tag_id)').eq('ativo', true).order('nome'),
        supabase.from('biblioteca_inspiracao').select('*, biblioteca_inspiracao_tags(tag_id)').eq('ativo', true).order('created_at', { ascending: false }),
        supabase.from('projetos').select('id, codigo, nome').eq('arquivado', false).order('codigo', { ascending: false })
      ])

      if (catRes.data) setCategorias(catRes.data)
      if (tagRes.data) setTags(tagRes.data)
      if (matRes.data) setMateriais(matRes.data.map(m => ({ ...m, tags: m.biblioteca_materiais_tags?.map(t => t.tag_id) || [] })))
      if (modRes.data) setModelos3d(modRes.data.map(m => ({ ...m, tags: m.biblioteca_modelos3d_tags?.map(t => t.tag_id) || [] })))
      if (inspRes.data) setInspiracao(inspRes.data.map(i => ({ ...i, tags: i.biblioteca_inspiracao_tags?.map(t => t.tag_id) || [] })))
      if (projRes.data) setProjetos(projRes.data)
    } catch (err) {
      // Tables may not exist yet
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FILTERS
  // ============================================
  const getCategoriasByTipo = (tipo) => categorias.filter(c => c.tipo === tipo)
  
  const getFilteredItems = () => {
    let items = []
    if (activeTab === 'materiais') items = materiais
    else if (activeTab === 'modelos3d') items = modelos3d
    else items = inspiracao

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(i => 
        i.nome?.toLowerCase().includes(term) ||
        i.descricao?.toLowerCase().includes(term) ||
        i.fornecedor?.toLowerCase().includes(term) ||
        i.referencia?.toLowerCase().includes(term)
      )
    }

    // Filter by categoria
    if (selectedCategoria) {
      items = items.filter(i => i.categoria_id === selectedCategoria)
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      items = items.filter(i => selectedTags.some(tagId => i.tags?.includes(tagId)))
    }

    return items
  }

  // ============================================
  // FILE UPLOAD
  // ============================================
  const handleFileUpload = async (e, type = 'main') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const bucket = activeTab === 'materiais' ? 'biblioteca-materiais' : 
                     activeTab === 'modelos3d' ? 'biblioteca-modelos3d' : 'biblioteca-inspiracao'
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      
      if (type === 'miniatura') {
        setTempMiniaturaUrl(urlData.publicUrl)
      } else if (type === 'ficha_tecnica') {
        setTempFichaTecnicaUrl(urlData.publicUrl)
      } else {
        setTempFileUrl(urlData.publicUrl)
      }
    } catch (err) {
      console.error('Erro upload:', err)
      toast.error('Erro', 'Erro ao fazer upload do ficheiro')
    } finally {
      setUploadingFile(false)
    }
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleSave = async () => {
    try {
      if (activeTab === 'materiais') {
        const data = {
          ...materialForm,
          textura_url: tempFileUrl || editingItem?.textura_url,
          ficha_tecnica_url: tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url || null,
          preco_m2: materialForm.preco_m2 ? parseFloat(materialForm.preco_m2) : null,
          categoria_id: materialForm.categoria_id || null,
          projeto_id: materialForm.projeto_id || null
        }
        delete data.tags

        let itemId
        if (editingItem) {
          const { error: updateError } = await supabase.from('biblioteca_materiais').update(data).eq('id', editingItem.id)
          if (updateError) throw updateError
          itemId = editingItem.id
          // Remove old tags
          await supabase.from('biblioteca_materiais_tags').delete().eq('material_id', itemId)
        } else {
          const { data: newItem, error: insertError } = await supabase.from('biblioteca_materiais').insert([data]).select().single()
          if (insertError) throw insertError
          itemId = newItem.id
        }
        // Add tags
        if (materialForm.tags.length > 0) {
          await supabase.from('biblioteca_materiais_tags').insert(
            materialForm.tags.map(tagId => ({ material_id: itemId, tag_id: tagId }))
          )
        }
      } else if (activeTab === 'modelos3d') {
        const data = {
          ...modelo3dForm,
          ficheiro_url: tempFileUrl || editingItem?.ficheiro_url,
          miniatura_url: tempMiniaturaUrl || editingItem?.miniatura_url,
          preco: modelo3dForm.preco ? parseFloat(modelo3dForm.preco) : null,
          largura_cm: modelo3dForm.largura_cm ? parseFloat(modelo3dForm.largura_cm) : null,
          altura_cm: modelo3dForm.altura_cm ? parseFloat(modelo3dForm.altura_cm) : null,
          profundidade_cm: modelo3dForm.profundidade_cm ? parseFloat(modelo3dForm.profundidade_cm) : null,
          categoria_id: modelo3dForm.categoria_id || null
        }
        delete data.tags

        let itemId
        if (editingItem) {
          const { error: updateError } = await supabase.from('biblioteca_modelos3d').update(data).eq('id', editingItem.id)
          if (updateError) throw updateError
          itemId = editingItem.id
          await supabase.from('biblioteca_modelos3d_tags').delete().eq('modelo_id', itemId)
        } else {
          const { data: newItem, error: insertError } = await supabase.from('biblioteca_modelos3d').insert([data]).select().single()
          if (insertError) throw insertError
          itemId = newItem.id
        }
        if (modelo3dForm.tags.length > 0) {
          await supabase.from('biblioteca_modelos3d_tags').insert(
            modelo3dForm.tags.map(tagId => ({ modelo_id: itemId, tag_id: tagId }))
          )
        }
      } else {
        const data = {
          ...inspiracaoForm,
          imagem_url: tempFileUrl || editingItem?.imagem_url,
          projeto_id: inspiracaoForm.projeto_id || null,
          categoria_id: inspiracaoForm.categoria_id || null
        }
        delete data.tags

        let itemId
        if (editingItem) {
          const { error: updateError } = await supabase.from('biblioteca_inspiracao').update(data).eq('id', editingItem.id)
          if (updateError) throw updateError
          itemId = editingItem.id
          await supabase.from('biblioteca_inspiracao_tags').delete().eq('inspiracao_id', itemId)
        } else {
          const { data: newItem, error: insertError } = await supabase.from('biblioteca_inspiracao').insert([data]).select().single()
          if (insertError) throw insertError
          itemId = newItem.id
        }
        if (inspiracaoForm.tags.length > 0) {
          await supabase.from('biblioteca_inspiracao_tags').insert(
            inspiracaoForm.tags.map(tagId => ({ inspiracao_id: itemId, tag_id: tagId }))
          )
        }
      }

      closeModal()
      loadData()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      toast.error('Erro', `Erro ao guardar: ${err.message || 'Verifique os campos e tente novamente'}`)
    }
  }

  const handleDelete = async (item) => {
    try {
      const table = activeTab === 'materiais' ? 'biblioteca_materiais' :
                    activeTab === 'modelos3d' ? 'biblioteca_modelos3d' : 'biblioteca_inspiracao'
      
      await supabase.from(table).update({ ativo: false }).eq('id', item.id)
      setShowDeleteConfirm(null)
      loadData()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
    }
  }

  const handleToggleFavorite = async (item) => {
    try {
      await supabase.from('biblioteca_inspiracao')
        .update({ favorito: !item.favorito })
        .eq('id', item.id)
      loadData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  // ============================================
  // TAG MANAGEMENT
  // ============================================
  const handleSaveTag = async () => {
    if (!newTag.nome.trim()) return
    try {
      await supabase.from('biblioteca_tags').insert([newTag])
      setNewTag({ nome: '', cor: '#C9A882' })
      setShowTagModal(false)
      loadData()
    } catch (err) {
      console.error('Erro ao criar tag:', err)
    }
  }

  // Criar tag inline (dentro do modal de adicionar)
  const handleInlineTagCreate = async () => {
    if (!inlineTagName.trim()) return
    try {
      const { data, error } = await supabase.from('biblioteca_tags').insert([{ nome: inlineTagName.trim(), cor: inlineTagColor }]).select().single()
      if (error) throw error
      
      // Adicionar tag à lista e selecionar automaticamente
      setTags(prev => [...prev, data])
      
      // Adicionar ao form atual
      const currentTags = getCurrentFormTags()
      if (activeTab === 'materiais') {
        setMaterialForm(prev => ({ ...prev, tags: [...currentTags, data.id] }))
      } else if (activeTab === 'modelos3d') {
        setModelo3dForm(prev => ({ ...prev, tags: [...currentTags, data.id] }))
      } else {
        setInspiracaoForm(prev => ({ ...prev, tags: [...currentTags, data.id] }))
      }
      
      // Reset inputs
      setInlineTagName('')
      setInlineTagColor('#C9A882')
      setShowInlineTagInput(false)
    } catch (err) {
      console.error('Erro ao criar tag:', err)
      toast.error('Erro', 'Erro ao criar tag')
    }
  }

  // Editar tag existente
  const handleUpdateTag = async () => {
    if (!editingTag || !editingTag.nome.trim()) return
    try {
      const { error } = await supabase.from('biblioteca_tags').update({ nome: editingTag.nome, cor: editingTag.cor }).eq('id', editingTag.id)
      if (error) throw error
      setEditingTag(null)
      loadData()
    } catch (err) {
      console.error('Erro ao atualizar tag:', err)
      toast.error('Erro', 'Erro ao atualizar tag')
    }
  }

  // Eliminar tag
  const handleDeleteTag = async (tagId) => {
    try {
      await supabase.from('biblioteca_tags').delete().eq('id', tagId)
      loadData()
    } catch (err) {
      console.error('Erro ao eliminar tag:', err)
      toast.error('Erro', 'Erro ao eliminar tag')
    }
  }

  // ============================================
  // CATEGORY MANAGEMENT
  // ============================================
  const handleSaveCategoria = async () => {
    if (!newCategoria.nome.trim()) return
    try {
      const ordem = categorias.filter(c => c.tipo === newCategoria.tipo).length + 1
      const { error } = await supabase.from('biblioteca_categorias').insert([{ ...newCategoria, ordem }])
      if (error) throw error
      setNewCategoria({ nome: '', tipo: activeTab === 'modelos3d' ? 'modelo3d' : activeTab, icone: 'layers', cor: '#C9A882' })
      loadData()
    } catch (err) {
      console.error('Erro ao criar categoria:', err)
      toast.error('Erro', 'Erro ao criar categoria')
    }
  }

  const handleUpdateCategoria = async () => {
    if (!editingCategoria || !editingCategoria.nome.trim()) return
    try {
      const { error } = await supabase.from('biblioteca_categorias')
        .update({ nome: editingCategoria.nome, icone: editingCategoria.icone, cor: editingCategoria.cor })
        .eq('id', editingCategoria.id)
      if (error) throw error
      setEditingCategoria(null)
      loadData()
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err)
      toast.error('Erro', 'Erro ao atualizar categoria')
    }
  }

  const handleDeleteCategoria = async (categoriaId) => {
    try {
      await supabase.from('biblioteca_categorias').delete().eq('id', categoriaId)
      loadData()
    } catch (err) {
      console.error('Erro ao eliminar categoria:', err)
      toast.error('Erro', 'Erro ao eliminar categoria (pode ter itens associados)')
    }
  }

  // ============================================
  // MODAL HELPERS
  // ============================================
  const openNewModal = () => {
    setEditingItem(null)
    setTempFileUrl('')
    setTempMiniaturaUrl('')
    setTempFichaTecnicaUrl('')
    if (activeTab === 'materiais') {
      setMaterialForm({ nome: '', descricao: '', categoria_id: '', fornecedor: '', referencia: '', preco_m2: '', cor: '', acabamento: '', notas: '', tags: [], ficha_tecnica_url: '', projeto_id: '' })
    } else if (activeTab === 'modelos3d') {
      setModelo3dForm({ nome: '', descricao: '', categoria_id: '', formato: '', fornecedor: '', preco: '', largura_cm: '', altura_cm: '', profundidade_cm: '', notas: '', tags: [] })
    } else {
      setInspiracaoForm({ nome: '', descricao: '', categoria_id: '', fonte: '', link_original: '', projeto_id: '', notas: '', tags: [] })
    }
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setTempFileUrl('')
    setTempMiniaturaUrl('')
    setTempFichaTecnicaUrl('')
    if (activeTab === 'materiais') {
      setMaterialForm({
        nome: item.nome || '', descricao: item.descricao || '', categoria_id: item.categoria_id || '',
        fornecedor: item.fornecedor || '', referencia: item.referencia || '', preco_m2: item.preco_m2 || '',
        cor: item.cor || '', acabamento: item.acabamento || '', notas: item.notas || '', tags: item.tags || [],
        ficha_tecnica_url: item.ficha_tecnica_url || '', projeto_id: item.projeto_id || ''
      })
    } else if (activeTab === 'modelos3d') {
      setModelo3dForm({
        nome: item.nome || '', descricao: item.descricao || '', categoria_id: item.categoria_id || '',
        formato: item.formato || '', fornecedor: item.fornecedor || '', preco: item.preco || '',
        largura_cm: item.largura_cm || '', altura_cm: item.altura_cm || '', profundidade_cm: item.profundidade_cm || '',
        notas: item.notas || '', tags: item.tags || []
      })
    } else {
      setInspiracaoForm({
        nome: item.nome || '', descricao: item.descricao || '', categoria_id: item.categoria_id || '',
        fonte: item.fonte || '', link_original: item.link_original || '', projeto_id: item.projeto_id || '',
        notas: item.notas || '', tags: item.tags || []
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setTempFileUrl('')
    setTempMiniaturaUrl('')
    setTempFichaTecnicaUrl('')
  }

  const toggleTagInForm = (tagId) => {
    if (activeTab === 'materiais') {
      setMaterialForm(prev => ({
        ...prev,
        tags: prev.tags.includes(tagId) ? prev.tags.filter(t => t !== tagId) : [...prev.tags, tagId]
      }))
    } else if (activeTab === 'modelos3d') {
      setModelo3dForm(prev => ({
        ...prev,
        tags: prev.tags.includes(tagId) ? prev.tags.filter(t => t !== tagId) : [...prev.tags, tagId]
      }))
    } else {
      setInspiracaoForm(prev => ({
        ...prev,
        tags: prev.tags.includes(tagId) ? prev.tags.filter(t => t !== tagId) : [...prev.tags, tagId]
      }))
    }
  }

  const getCurrentFormTags = () => {
    if (activeTab === 'materiais') return materialForm.tags
    if (activeTab === 'modelos3d') return modelo3dForm.tags
    return inspiracaoForm.tags
  }

  // ============================================
  // RENDER
  // ============================================
  const filteredItems = getFilteredItems()
  const currentCategorias = getCategoriasByTipo(activeTab === 'modelos3d' ? 'modelo3d' : activeTab)

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Biblioteca</h1>
          <p className="page-subtitle">Materiais, modelos 3D e inspiração</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowCategoriaModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} /> Categorias
          </button>
          <button onClick={() => setShowTagModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={16} /> Tags
          </button>
          <button onClick={openNewModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0, marginBottom: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--stone)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const count = tab.id === 'materiais' ? materiais.length :
                         tab.id === 'modelos3d' ? modelos3d.length : inspiracao.length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 24px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Icon size={18} />
                {tab.label}
                <span style={{
                  background: activeTab === tab.id ? 'var(--gold)' : 'var(--stone)',
                  color: activeTab === tab.id ? 'white' : 'var(--brown-light)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px'
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}
            />
          </div>

          {/* Categoria Filter */}
          <select
            value={selectedCategoria}
            onChange={e => setSelectedCategoria(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', minWidth: '150px' }}
          >
            <option value="">Todas as categorias</option>
            {currentCategorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>

          {/* View Mode */}
          <div style={{ display: 'flex', border: '1px solid var(--stone)', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '8px 12px',
                background: viewMode === 'grid' ? 'var(--brown)' : 'white',
                color: viewMode === 'grid' ? 'white' : 'var(--brown)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 12px',
                background: viewMode === 'list' ? 'var(--brown)' : 'white',
                color: viewMode === 'list' ? 'white' : 'var(--brown)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Tags Filter */}
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTags(prev => 
                prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
              )}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                border: selectedTags.includes(tag.id) ? '2px solid var(--brown)' : '1px solid var(--stone)',
                background: selectedTags.includes(tag.id) ? tag.cor + '30' : 'white',
                color: 'var(--brown)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.cor }} />
              {tag.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px', opacity: 0.3 }}>
            {activeTab === 'materiais' ? <Layers size={48} /> : activeTab === 'modelos3d' ? <Box size={48} /> : <Sparkles size={48} />}
          </div>
          <p style={{ color: 'var(--brown-light)', marginBottom: '16px' }}>
            {searchTerm || selectedCategoria || selectedTags.length > 0 
              ? 'Nenhum resultado encontrado'
              : `Ainda não há ${activeTab === 'materiais' ? 'materiais' : activeTab === 'modelos3d' ? 'modelos 3D' : 'imagens de inspiração'}`
            }
          </p>
          <button onClick={openNewModal} className="btn btn-primary">
            <Plus size={16} /> Adicionar {activeTab === 'materiais' ? 'Material' : activeTab === 'modelos3d' ? 'Modelo' : 'Imagem'}
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: activeTab === 'inspiracao' ? 'repeat(auto-fill, minmax(250px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {filteredItems.map(item => (
            <ItemCard 
              key={item.id} 
              item={item} 
              type={activeTab}
              tags={tags}
              categorias={categorias}
              onEdit={() => openEditModal(item)}
              onDelete={() => setShowDeleteConfirm(item)}
              onPreview={() => setShowPreview(item)}
              onToggleFavorite={activeTab === 'inspiracao' ? () => handleToggleFavorite(item) : null}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>
                  {activeTab === 'inspiracao' ? 'Imagem' : 'Preview'}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Nome</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Categoria</th>
                {activeTab === 'materiais' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Fornecedor</th>}
                {activeTab === 'materiais' && <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Preço/m²</th>}
                {activeTab === 'modelos3d' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Formato</th>}
                {activeTab === 'modelos3d' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Dimensões</th>}
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const categoria = categorias.find(c => c.id === item.categoria_id)
                const imageUrl = activeTab === 'materiais' ? item.textura_url :
                                 activeTab === 'modelos3d' ? item.miniatura_url : item.imagem_url
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--stone)' }}>
                    <td style={{ padding: '8px 16px' }}>
                      <div 
                        onClick={() => setShowPreview(item)}
                        style={{ 
                          width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                          background: imageUrl ? `url(${imageUrl}) center/cover` : 'var(--stone)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {!imageUrl && <Image size={20} style={{ color: 'var(--brown-light)' }} />}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500 }}>{item.nome || '(sem nome)'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--brown-light)' }}>{categoria?.nome || '-'}</td>
                    {activeTab === 'materiais' && <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.fornecedor || '-'}</td>}
                    {activeTab === 'materiais' && <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right' }}>{item.preco_m2 ? `€${item.preco_m2}` : '-'}</td>}
                    {activeTab === 'modelos3d' && <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.formato || '-'}</td>}
                    {activeTab === 'modelos3d' && <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.largura_cm && item.altura_cm && item.profundidade_cm ? `${item.largura_cm}×${item.altura_cm}×${item.profundidade_cm} cm` : '-'}</td>}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button onClick={() => openEditModal(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginRight: '4px' }}>
                        <Edit size={16} style={{ color: 'var(--brown-light)' }} />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} style={{ color: 'var(--error)' }} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{
            maxWidth: '640px',
            maxHeight: '90vh',
            overflow: 'hidden',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header melhorado */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid var(--stone)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, var(--off-white), var(--white))'
            }}>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--brown)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {activeTab === 'materiais' && <Layers size={22} style={{ color: 'var(--gold)' }} />}
                  {activeTab === 'modelos3d' && <Box size={22} style={{ color: 'var(--gold)' }} />}
                  {activeTab === 'inspiracao' && <Sparkles size={22} style={{ color: 'var(--gold)' }} />}
                  {editingItem ? 'Editar' : 'Novo'} {activeTab === 'materiais' ? 'Material' : activeTab === 'modelos3d' ? 'Modelo 3D' : 'Inspiração'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
                  {activeTab === 'materiais' && 'Adicionar à biblioteca de materiais'}
                  {activeTab === 'modelos3d' && 'Adicionar à biblioteca de modelos 3D'}
                  {activeTab === 'inspiracao' && 'Adicionar à biblioteca de inspiração'}
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid var(--stone)',
                  background: 'var(--white)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <X size={18} style={{ color: 'var(--brown-light)' }} />
              </button>
            </div>

            {/* Body com scroll */}
            <div style={{
              padding: '24px 28px',
              overflowY: 'auto',
              maxHeight: 'calc(90vh - 180px)',
              background: 'var(--white)'
            }}>
              {/* Material Form */}
              {activeTab === 'materiais' && (
                <>
                  {/* Secção: Imagem/Textura - Design melhorado */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Image size={14} style={{ color: 'white' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                        Textura / Imagem
                      </span>
                    </div>

                    <div style={{
                      border: (tempFileUrl || editingItem?.textura_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      background: (tempFileUrl || editingItem?.textura_url) ? `url(${tempFileUrl || editingItem?.textura_url}) center/cover` : 'linear-gradient(135deg, var(--cream) 0%, var(--off-white) 100%)',
                      minHeight: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}>
                      {(tempFileUrl || editingItem?.textura_url) && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%)',
                          borderRadius: '14px'
                        }} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e)}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        disabled={uploadingFile}
                      />

                      {(tempFileUrl || editingItem?.textura_url) ? (
                        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '20px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.95)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                          }}>
                            <Check size={24} style={{ color: 'var(--success)' }} />
                          </div>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'white',
                            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                          }}>
                            Imagem carregada
                          </span>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                            Clica para substituir
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '30px' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'var(--white)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                          }}>
                            <Upload size={24} style={{ color: 'var(--brown-light)' }} />
                          </div>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--brown)',
                            display: 'block',
                            marginBottom: '6px'
                          }}>
                            {uploadingFile ? 'A carregar...' : 'Clica ou arrasta para fazer upload'}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                            PNG, JPG ou WEBP até 10MB
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secção: Identificação - Design melhorado */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--info) 0%, #5a7a9a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Tag size={14} style={{ color: 'white' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                        Identificação
                      </span>
                    </div>

                    <div style={{
                      background: 'var(--off-white)',
                      padding: '20px',
                      borderRadius: '14px',
                      border: '1px solid var(--stone)'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--brown)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>
                            Nome do Material *
                          </label>
                          <input
                            type="text"
                            value={materialForm.nome}
                            onChange={e => setMaterialForm({ ...materialForm, nome: e.target.value })}
                            placeholder="Ex: Mármore Carrara"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              border: '2px solid var(--stone)',
                              borderRadius: '10px',
                              fontSize: '14px',
                              background: 'var(--white)',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--brown)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>
                            Categoria
                          </label>
                          <select
                            value={materialForm.categoria_id}
                            onChange={e => setMaterialForm({ ...materialForm, categoria_id: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              border: '2px solid var(--stone)',
                              borderRadius: '10px',
                              fontSize: '14px',
                              background: 'var(--white)',
                              cursor: 'pointer',
                              boxSizing: 'border-box'
                            }}
                          >
                            <option value="">Selecionar...</option>
                            {getCategoriasByTipo('materiais').map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.nome}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--brown)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>
                            Fornecedor
                          </label>
                          <input
                            type="text"
                            value={materialForm.fornecedor}
                            onChange={e => setMaterialForm({ ...materialForm, fornecedor: e.target.value })}
                            placeholder="Ex: AtlasPlan"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              border: '2px solid var(--stone)',
                              borderRadius: '10px',
                              fontSize: '14px',
                              background: 'var(--white)',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--brown)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>
                            Referência
                          </label>
                          <input
                            type="text"
                            value={materialForm.referencia}
                            onChange={e => setMaterialForm({ ...materialForm, referencia: e.target.value })}
                            placeholder="Código de referência"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              border: '2px solid var(--stone)',
                              borderRadius: '10px',
                              fontSize: '14px',
                              background: 'var(--white)',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Secção: Características - Design melhorado */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--success) 0%, #5a8a5a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Filter size={14} style={{ color: 'white' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                        Características
                      </span>
                    </div>

                    <div style={{
                      background: 'var(--off-white)',
                      padding: '20px',
                      borderRadius: '14px',
                      border: '1px solid var(--stone)'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--brown)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>
                            Preço/m²
                          </label>
                          <div style={{ position: 'relative' }}>
                            <span style={{
                              position: 'absolute',
                              left: '14px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--brown-light)',
                              fontSize: '14px',
                              fontWeight: 500
                            }}>€</span>
                            <input
                              type="number"
                              step="0.01"
                              value={materialForm.preco_m2}
                              onChange={e => setMaterialForm({ ...materialForm, preco_m2: e.target.value })}
                              placeholder="0.00"
                              style={{
                                width: '100%',
                                padding: '12px 14px 12px 32px',
                                border: '2px solid var(--stone)',
                                borderRadius: '10px',
                                fontSize: '14px',
                                background: 'var(--white)',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--brown)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>
                            Cor
                          </label>
                          <input
                            type="text"
                            value={materialForm.cor}
                            onChange={e => setMaterialForm({ ...materialForm, cor: e.target.value })}
                            placeholder="Ex: Branco"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              border: '2px solid var(--stone)',
                              borderRadius: '10px',
                              fontSize: '14px',
                              background: 'var(--white)',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: 'var(--brown)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>
                            Acabamento
                          </label>
                          <input
                            type="text"
                            value={materialForm.acabamento}
                            onChange={e => setMaterialForm({ ...materialForm, acabamento: e.target.value })}
                            placeholder="Ex: Polido"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              border: '2px solid var(--stone)',
                              borderRadius: '10px',
                              fontSize: '14px',
                              background: 'var(--white)',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 600,
                          marginBottom: '8px',
                          color: 'var(--brown)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>
                          Descrição
                        </label>
                        <textarea
                          value={materialForm.descricao}
                          onChange={e => setMaterialForm({ ...materialForm, descricao: e.target.value })}
                          rows={2}
                          placeholder="Notas ou descrição do material..."
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid var(--stone)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            background: 'var(--white)',
                            resize: 'vertical',
                            minHeight: '70px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secção: Documentação - Compacta */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: 'var(--off-white)',
                      borderRadius: '14px',
                      border: '1px solid var(--stone)',
                      position: 'relative'
                    }}>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => handleFileUpload(e, 'ficha_tecnica')}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        disabled={uploadingFile}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: (tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url) ? 'var(--success)' : 'var(--stone)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {(tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url) ? (
                            <Check size={20} style={{ color: 'white' }} />
                          ) : (
                            <Upload size={18} style={{ color: 'var(--brown-light)' }} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>
                            Ficha Técnica (PDF)
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                            {(tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url)
                              ? 'Ficheiro carregado'
                              : uploadingFile ? 'A carregar...' : 'Clica para fazer upload'}
                          </div>
                        </div>
                      </div>
                      {(tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url) && (
                        <a
                          href={tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '8px 14px',
                            background: 'var(--white)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: 'var(--brown)',
                            textDecoration: 'none',
                            border: '1px solid var(--stone)',
                            position: 'relative',
                            zIndex: 1
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          Ver PDF
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Secção: Vincular a Projeto - Compacta */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>
                        Vincular a Projeto
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>(opcional)</span>
                    </div>
                    <select
                      value={materialForm.projeto_id}
                      onChange={e => setMaterialForm({ ...materialForm, projeto_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid var(--stone)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: 'var(--white)',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Nenhum projeto selecionado</option>
                      {projetos.map(proj => (
                        <option key={proj.id} value={proj.id}>{proj.codigo} - {proj.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Modelo 3D Form - Design melhorado */}
              {activeTab === 'modelos3d' && (
                <>
                  {/* Section: Ficheiros */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--info) 0%, #5a7a9a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Box size={16} style={{ color: 'white' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Ficheiros</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
                      {/* Ficheiro 3D */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                          Ficheiro 3D
                        </label>
                        <div style={{
                          border: (tempFileUrl || editingItem?.ficheiro_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
                          borderRadius: '12px',
                          padding: '20px',
                          textAlign: 'center',
                          background: (tempFileUrl || editingItem?.ficheiro_url) ? 'rgba(122, 158, 122, 0.08)' : 'var(--cream)',
                          position: 'relative',
                          minHeight: '100px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}>
                          <input
                            type="file"
                            accept=".obj,.fbx,.skp,.3ds,.blend,.glb,.gltf"
                            onChange={e => handleFileUpload(e)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                            disabled={uploadingFile}
                          />
                          {(tempFileUrl || editingItem?.ficheiro_url) ? (
                            <>
                              <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                background: 'var(--success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Box size={22} style={{ color: 'white' }} />
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
                                ✓ Ficheiro carregado
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                                Clica para substituir
                              </div>
                            </>
                          ) : (
                            <>
                              <Box size={28} style={{ color: 'var(--brown-light)' }} />
                              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                                {uploadingFile ? 'A carregar...' : 'Upload ficheiro 3D'}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--stone-dark)' }}>
                                .obj, .fbx, .skp, .blend, .glb
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Miniatura */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                          Miniatura / Preview
                        </label>
                        <div style={{
                          border: (tempMiniaturaUrl || editingItem?.miniatura_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: (tempMiniaturaUrl || editingItem?.miniatura_url)
                            ? `url(${tempMiniaturaUrl || editingItem?.miniatura_url}) center/cover`
                            : 'linear-gradient(135deg, var(--cream) 0%, var(--off-white) 100%)',
                          position: 'relative',
                          minHeight: '100px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleFileUpload(e, 'miniatura')}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                            disabled={uploadingFile}
                          />
                          {(tempMiniaturaUrl || editingItem?.miniatura_url) && (
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: '8px',
                              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}>
                              <span style={{ fontSize: '11px', color: 'white', fontWeight: 500 }}>✓ Imagem carregada</span>
                            </div>
                          )}
                          {!(tempMiniaturaUrl || editingItem?.miniatura_url) && (
                            <div style={{ textAlign: 'center', padding: '16px' }}>
                              <Image size={24} style={{ color: 'var(--brown-light)', marginBottom: '6px' }} />
                              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Upload imagem</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Identificação */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Tag size={16} style={{ color: 'white' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Identificação</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
                          Nome *
                        </label>
                        <input
                          type="text"
                          value={modelo3dForm.nome}
                          onChange={e => setModelo3dForm({ ...modelo3dForm, nome: e.target.value })}
                          placeholder="Ex: WALL LIGHT - Capsule"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid var(--stone)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            transition: 'border-color 0.2s',
                            outline: 'none'
                          }}
                          onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                          onBlur={e => e.target.style.borderColor = 'var(--stone)'}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
                          Categoria
                        </label>
                        <select
                          value={modelo3dForm.categoria_id}
                          onChange={e => setModelo3dForm({ ...modelo3dForm, categoria_id: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid var(--stone)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            background: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">Selecionar categoria...</option>
                          {getCategoriasByTipo('modelo3d').map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
                          Formato
                        </label>
                        <select
                          value={modelo3dForm.formato}
                          onChange={e => setModelo3dForm({ ...modelo3dForm, formato: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid var(--stone)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            background: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">Selecionar...</option>
                          {FORMATOS_3D.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
                          Fornecedor
                        </label>
                        <input
                          type="text"
                          value={modelo3dForm.fornecedor}
                          onChange={e => setModelo3dForm({ ...modelo3dForm, fornecedor: e.target.value })}
                          placeholder="Ex: Mooijane"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid var(--stone)',
                            borderRadius: '10px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
                          Preço (€)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--brown-light)',
                            fontSize: '14px',
                            fontWeight: 500
                          }}>€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={modelo3dForm.preco}
                            onChange={e => setModelo3dForm({ ...modelo3dForm, preco: e.target.value })}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '12px 14px 12px 32px',
                              border: '2px solid var(--stone)',
                              borderRadius: '10px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Dimensões */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--success) 0%, #5a8a5a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Square size={16} style={{ color: 'white' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Dimensões</span>
                      <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>(em centímetros)</span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '14px',
                      padding: '16px',
                      background: 'var(--cream)',
                      borderRadius: '12px',
                      border: '1px solid var(--stone)'
                    }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Largura (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={modelo3dForm.largura_cm}
                          onChange={e => setModelo3dForm({ ...modelo3dForm, largura_cm: e.target.value })}
                          placeholder="L"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid var(--stone)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            background: 'white',
                            textAlign: 'center',
                            fontWeight: 500
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Altura (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={modelo3dForm.altura_cm}
                          onChange={e => setModelo3dForm({ ...modelo3dForm, altura_cm: e.target.value })}
                          placeholder="A"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid var(--stone)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            background: 'white',
                            textAlign: 'center',
                            fontWeight: 500
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Profund. (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={modelo3dForm.profundidade_cm}
                          onChange={e => setModelo3dForm({ ...modelo3dForm, profundidade_cm: e.target.value })}
                          placeholder="P"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid var(--stone)',
                            borderRadius: '10px',
                            fontSize: '14px',
                            background: 'white',
                            textAlign: 'center',
                            fontWeight: 500
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Descrição */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                      Descrição / Link <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(opcional)</span>
                    </label>
                    <textarea
                      value={modelo3dForm.descricao}
                      onChange={e => setModelo3dForm({ ...modelo3dForm, descricao: e.target.value })}
                      rows={2}
                      placeholder="Link do produto, notas ou descrição..."
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid var(--stone)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        resize: 'vertical',
                        minHeight: '60px'
                      }}
                    />
                  </div>
                </>
              )}

              {/* Inspiração Form */}
              {activeTab === 'inspiracao' && (
                <>
                  {/* Upload Imagem - Design melhorado */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                      Imagem *
                    </label>
                    <div style={{
                      border: (tempFileUrl || editingItem?.imagem_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
                      borderRadius: '12px',
                      padding: '16px',
                      background: 'var(--cream)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      position: 'relative',
                      minHeight: '90px'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e)}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        disabled={uploadingFile}
                      />
                      {(tempFileUrl || editingItem?.imagem_url) ? (
                        <>
                          <img src={tempFileUrl || editingItem?.imagem_url} alt="Preview" style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--stone)' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '13px', marginBottom: '4px' }}>✓ Imagem carregada</div>
                            <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Clica para substituir</div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setTempFileUrl(''); if (editingItem) setEditingItem({ ...editingItem, imagem_url: '' }) }}
                            style={{ background: 'var(--stone)', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            Remover
                          </button>
                        </>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px' }}>
                          <Upload size={28} style={{ color: 'var(--brown-light)' }} />
                          <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                            {uploadingFile ? 'A carregar...' : 'Clica ou arrasta para fazer upload'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--stone-dark)' }}>PNG, JPG, WEBP até 10MB</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Nome / Título</label>
                      <input type="text" value={inspiracaoForm.nome} onChange={e => setInspiracaoForm({ ...inspiracaoForm, nome: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }} placeholder="Ex: Sala minimalista" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Categoria / Divisão</label>
                      <select value={inspiracaoForm.categoria_id} onChange={e => setInspiracaoForm({ ...inspiracaoForm, categoria_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                        <option value="">Selecionar...</option>
                        {getCategoriasByTipo('inspiracao').map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Fonte</label>
                      <input type="text" value={inspiracaoForm.fonte} onChange={e => setInspiracaoForm({ ...inspiracaoForm, fonte: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }} placeholder="Ex: Pinterest, ArchDaily" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Link Original</label>
                      <input type="url" value={inspiracaoForm.link_original} onChange={e => setInspiracaoForm({ ...inspiracaoForm, link_original: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }} placeholder="https://..." />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Projeto Relacionado</label>
                    <select value={inspiracaoForm.projeto_id} onChange={e => setInspiracaoForm({ ...inspiracaoForm, projeto_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                      <option value="">Nenhum</option>
                      {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Descrição / Notas <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(opcional)</span></label>
                    <textarea value={inspiracaoForm.descricao} onChange={e => setInspiracaoForm({ ...inspiracaoForm, descricao: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} rows={2} placeholder="Notas sobre a imagem..." />
                  </div>
                </>
              )}

              {/* Tags Selection - Com criação inline */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--brown)' }}>
                  <span>Tags</span>
                  <button
                    type="button"
                    onClick={() => setShowInlineTagInput(!showInlineTagInput)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blush)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Nova Tag
                  </button>
                </label>
                
                {/* Input para nova tag inline */}
                {showInlineTagInput && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', padding: '10px', background: 'var(--cream)', borderRadius: '8px' }}>
                    <input
                      type="text"
                      value={inlineTagName}
                      onChange={e => setInlineTagName(e.target.value)}
                      placeholder="Nome da tag..."
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '13px' }}
                      onKeyDown={e => e.key === 'Enter' && handleInlineTagCreate()}
                    />
                    <input
                      type="color"
                      value={inlineTagColor}
                      onChange={e => setInlineTagColor(e.target.value)}
                      style={{ width: '36px', height: '36px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <button 
                      type="button"
                      onClick={handleInlineTagCreate}
                      disabled={!inlineTagName.trim()}
                      style={{ padding: '8px 12px', background: inlineTagName.trim() ? 'var(--brown)' : 'var(--stone)', color: 'white', border: 'none', borderRadius: '6px', cursor: inlineTagName.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontSize: '12px' }}
                    >
                      Criar
                    </button>
                  </div>
                )}
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {tags.map(tag => {
                    const isSelected = getCurrentFormTags().includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTagInForm(tag.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          border: isSelected ? `2px solid ${tag.cor}` : '1px solid var(--stone)',
                          background: isSelected ? tag.cor + '25' : 'white',
                          color: 'var(--brown)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tag.cor, border: isSelected ? '2px solid white' : 'none', boxShadow: isSelected ? `0 0 0 1px ${tag.cor}` : 'none' }} />
                        {tag.nome}
                        {isSelected && <Check size={12} style={{ color: tag.cor }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeModal} className="btn btn-secondary">Cancelar</button>
              <button 
                onClick={handleSave} 
                className="btn btn-primary"
                disabled={
                  (activeTab === 'materiais' && !materialForm.nome) ||
                  (activeTab === 'modelos3d' && !modelo3dForm.nome) ||
                  (activeTab === 'inspiracao' && !(tempFileUrl || editingItem?.imagem_url))
                }
              >
                {editingItem ? 'Guardar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerir Tags */}
      {showTagModal && (
        <div className="modal-overlay" onClick={() => { setShowTagModal(false); setEditingTag(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Gerir Tags</h3>
              <button onClick={() => { setShowTagModal(false); setEditingTag(null) }} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* Nova Tag */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={newTag.nome}
                  onChange={e => setNewTag({ ...newTag, nome: e.target.value })}
                  placeholder="Nova tag..."
                  className="form-input"
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && newTag.nome.trim() && handleSaveTag()}
                />
                <input
                  type="color"
                  value={newTag.cor}
                  onChange={e => setNewTag({ ...newTag, cor: e.target.value })}
                  style={{ width: '40px', height: '38px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '6px', cursor: 'pointer' }}
                />
                <button onClick={handleSaveTag} className="btn btn-primary" disabled={!newTag.nome.trim()}>
                  <Plus size={16} />
                </button>
              </div>

              {/* Lista de Tags */}
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {tags.map(tag => (
                  <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 8px', borderBottom: '1px solid var(--stone)' }}>
                    {editingTag?.id === tag.id ? (
                      <>
                        <input
                          type="text"
                          value={editingTag.nome}
                          onChange={e => setEditingTag({ ...editingTag, nome: e.target.value })}
                          className="form-input"
                          style={{ flex: 1, padding: '6px 10px' }}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleUpdateTag()}
                        />
                        <input
                          type="color"
                          value={editingTag.cor}
                          onChange={e => setEditingTag({ ...editingTag, cor: e.target.value })}
                          style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '4px', cursor: 'pointer' }}
                        />
                        <button onClick={handleUpdateTag} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                          <Check size={16} style={{ color: 'var(--success)' }} />
                        </button>
                        <button onClick={() => setEditingTag(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                          <X size={16} style={{ color: 'var(--brown-light)' }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: tag.cor }} />
                        <span style={{ flex: 1, fontSize: '13px' }}>{tag.nome}</span>
                        <button onClick={() => setEditingTag({ ...tag })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                          <Edit size={14} style={{ color: 'var(--brown-light)' }} />
                        </button>
                        <button onClick={() => handleDeleteTag(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={14} style={{ color: 'var(--error)' }} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerir Categorias */}
      {showCategoriaModal && (
        <div className="modal-overlay" onClick={() => { setShowCategoriaModal(false); setEditingCategoria(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Gerir Categorias</h3>
              <button onClick={() => { setShowCategoriaModal(false); setEditingCategoria(null) }} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* Nova Categoria */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={newCategoria.nome}
                  onChange={e => setNewCategoria({ ...newCategoria, nome: e.target.value })}
                  placeholder="Nova categoria..."
                  className="form-input"
                  style={{ flex: 1, minWidth: '150px' }}
                  onKeyDown={e => e.key === 'Enter' && newCategoria.nome.trim() && handleSaveCategoria()}
                />
                <select
                  value={newCategoria.tipo}
                  onChange={e => setNewCategoria({ ...newCategoria, tipo: e.target.value })}
                  className="form-input"
                  style={{ width: '130px' }}
                >
                  <option value="materiais">Materiais</option>
                  <option value="modelo3d">Modelos 3D</option>
                  <option value="inspiracao">Inspiração</option>
                </select>
                <input
                  type="color"
                  value={newCategoria.cor}
                  onChange={e => setNewCategoria({ ...newCategoria, cor: e.target.value })}
                  style={{ width: '40px', height: '38px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '6px', cursor: 'pointer' }}
                />
                <button onClick={handleSaveCategoria} className="btn btn-primary" disabled={!newCategoria.nome.trim()}>
                  <Plus size={16} />
                </button>
              </div>

              {/* Tabs por tipo */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                {[
                  { id: 'materiais', label: 'Materiais' },
                  { id: 'modelo3d', label: 'Modelos 3D' },
                  { id: 'inspiracao', label: 'Inspiração' }
                ].map(tipo => (
                  <button
                    key={tipo.id}
                    onClick={() => setNewCategoria(prev => ({ ...prev, tipo: tipo.id }))}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '6px',
                      background: newCategoria.tipo === tipo.id ? 'var(--brown)' : 'white',
                      color: newCategoria.tipo === tipo.id ? 'white' : 'var(--brown)',
                      cursor: 'pointer'
                    }}
                  >
                    {tipo.label} ({categorias.filter(c => c.tipo === tipo.id).length})
                  </button>
                ))}
              </div>

              {/* Lista de Categorias */}
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {categorias.filter(c => c.tipo === newCategoria.tipo).map(cat => {
                  const IconComponent = ICON_MAP[cat.icone] || Layers
                  return (
                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 8px', borderBottom: '1px solid var(--stone)' }}>
                      {editingCategoria?.id === cat.id ? (
                        <>
                          <input
                            type="text"
                            value={editingCategoria.nome}
                            onChange={e => setEditingCategoria({ ...editingCategoria, nome: e.target.value })}
                            className="form-input"
                            style={{ flex: 1, padding: '6px 10px' }}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleUpdateCategoria()}
                          />
                          <input
                            type="color"
                            value={editingCategoria.cor || '#C9A882'}
                            onChange={e => setEditingCategoria({ ...editingCategoria, cor: e.target.value })}
                            style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid var(--stone)', borderRadius: '4px', cursor: 'pointer' }}
                          />
                          <button onClick={handleUpdateCategoria} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <Check size={16} style={{ color: 'var(--success)' }} />
                          </button>
                          <button onClick={() => setEditingCategoria(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <X size={16} style={{ color: 'var(--brown-light)' }} />
                          </button>
                        </>
                      ) : (
                        <>
                          <IconComponent size={16} style={{ color: cat.cor || 'var(--brown-light)' }} />
                          <span style={{ flex: 1, fontSize: '13px' }}>{cat.nome}</span>
                          <button onClick={() => setEditingCategoria({ ...cat })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <Edit size={14} style={{ color: 'var(--brown-light)' }} />
                          </button>
                          <button onClick={() => handleDeleteCategoria(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={14} style={{ color: 'var(--error)' }} />
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
                {categorias.filter(c => c.tipo === newCategoria.tipo).length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '13px' }}>
                    Sem categorias neste tipo
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Delete */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Eliminar</h3>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>Tens a certeza que queres eliminar "{showDeleteConfirm.nome || 'este item'}"?</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn" style={{ background: 'var(--error)', color: 'white' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(null)} style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button 
              onClick={() => setShowPreview(null)} 
              style={{ 
                position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', 
                color: 'white', cursor: 'pointer', padding: '8px' 
              }}
            >
              <X size={24} />
            </button>
            <img
              src={activeTab === 'materiais' ? showPreview.textura_url : activeTab === 'modelos3d' ? showPreview.miniatura_url : showPreview.imagem_url}
              alt={showPreview.nome}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <div style={{ color: 'white', textAlign: 'center', marginTop: '12px' }}>
              <div style={{ fontWeight: 600 }}>{showPreview.nome}</div>
              {showPreview.fornecedor && <div style={{ fontSize: '13px', opacity: 0.8 }}>{showPreview.fornecedor}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// ITEM CARD COMPONENT
// ============================================
function ItemCard({ item, type, tags, categorias, onEdit, onDelete, onPreview, onToggleFavorite }) {
  const [menuOpen, setMenuOpen] = useState(false)
  
  const imageUrl = type === 'materiais' ? item.textura_url :
                   type === 'modelos3d' ? item.miniatura_url : item.imagem_url
  
  const categoria = categorias.find(c => c.id === item.categoria_id)
  const itemTags = tags.filter(t => item.tags?.includes(t.id))

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Image */}
      <div 
        onClick={onPreview}
        style={{ 
          height: type === 'inspiracao' ? '200px' : '160px',
          background: imageUrl ? `url(${imageUrl}) center/cover` : 'linear-gradient(135deg, var(--cream) 0%, var(--stone) 100%)',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {!imageUrl && (
          <div style={{ color: 'var(--brown-light)', textAlign: 'center' }}>
            {type === 'materiais' ? <Layers size={32} /> : type === 'modelos3d' ? <Box size={32} /> : <Image size={32} />}
            <div style={{ fontSize: '11px', marginTop: '4px' }}>Sem imagem</div>
          </div>
        )}
        
        {/* Overlay on hover */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          opacity: 0,
          transition: 'opacity 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }} className="card-overlay">
          <button style={{ background: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={18} style={{ color: 'var(--brown)' }} />
          </button>
        </div>

        {/* Favorito (só inspiração) */}
        {type === 'inspiracao' && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.() }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: item.favorito ? 'var(--error)' : 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Heart size={16} fill={item.favorito ? 'white' : 'none'} style={{ color: item.favorito ? 'white' : 'var(--brown-light)' }} />
          </button>
        )}

        {/* Link externo (só inspiração) */}
        {type === 'inspiracao' && item.link_original && (
          <a
            href={item.link_original}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ExternalLink size={14} style={{ color: 'var(--brown)' }} />
          </a>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)', marginBottom: '2px' }}>
              {item.nome || '(sem nome)'}
            </div>
            {categoria && (
              <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{categoria.nome}</div>
            )}
          </div>
          
          {/* Menu */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setMenuOpen(!menuOpen)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <MoreVertical size={16} style={{ color: 'var(--brown-light)' }} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'white',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 10,
                minWidth: '120px'
              }}>
                <button onClick={() => { onEdit(); setMenuOpen(false) }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <Edit size={14} /> Editar
                </button>
                <button onClick={() => { onDelete(); setMenuOpen(false) }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metadados específicos */}
        {type === 'materiais' && (
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '8px' }}>
            {item.fornecedor && <span>{item.fornecedor}</span>}
            {item.fornecedor && item.preco_m2 && <span>  –  </span>}
            {item.preco_m2 && <span style={{ color: 'var(--brown)', fontWeight: 500 }}>€{item.preco_m2}/m²</span>}
          </div>
        )}

        {type === 'modelos3d' && (
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '8px' }}>
            {item.formato && <span style={{ background: 'var(--stone)', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>{item.formato}</span>}
            {item.largura_cm && item.altura_cm && item.profundidade_cm && (
              <span>{item.largura_cm}×{item.altura_cm}×{item.profundidade_cm} cm</span>
            )}
          </div>
        )}

        {type === 'inspiracao' && item.fonte && (
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '8px' }}>
            Fonte: {item.fonte}
          </div>
        )}

        {/* Tags */}
        {itemTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {itemTags.slice(0, 3).map(tag => (
              <span key={tag.id} style={{
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                background: tag.cor + '25',
                color: 'var(--brown)'
              }}>
                {tag.nome}
              </span>
            ))}
            {itemTags.length > 3 && (
              <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>+{itemTags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <style>{`
        .card:hover .card-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}
