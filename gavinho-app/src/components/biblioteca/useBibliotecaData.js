import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'

const INITIAL_MATERIAL_FORM = {
  nome: '', descricao: '', categoria_id: '', fornecedor: '', referencia: '',
  preco_m2: '', cor: '', acabamento: '', notas: '', tags: [],
  ficha_tecnica_url: '', projeto_id: ''
}

const INITIAL_MODELO3D_FORM = {
  nome: '', descricao: '', categoria_id: '', formato: '', fornecedor: '',
  preco: '', largura_cm: '', altura_cm: '', profundidade_cm: '', notas: '', tags: []
}

const INITIAL_INSPIRACAO_FORM = {
  nome: '', descricao: '', categoria_id: '', fonte: '', link_original: '',
  projeto_id: '', notas: '', tags: []
}

export default function useBibliotecaData() {
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
  const [materialForm, setMaterialForm] = useState(INITIAL_MATERIAL_FORM)
  const [modelo3dForm, setModelo3dForm] = useState(INITIAL_MODELO3D_FORM)
  const [inspiracaoForm, setInspiracaoForm] = useState(INITIAL_INSPIRACAO_FORM)
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

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(i =>
        i.nome?.toLowerCase().includes(term) ||
        i.descricao?.toLowerCase().includes(term) ||
        i.fornecedor?.toLowerCase().includes(term) ||
        i.referencia?.toLowerCase().includes(term)
      )
    }

    if (selectedCategoria) {
      items = items.filter(i => i.categoria_id === selectedCategoria)
    }

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
          await supabase.from('biblioteca_materiais_tags').delete().eq('material_id', itemId)
        } else {
          const { data: newItem, error: insertError } = await supabase.from('biblioteca_materiais').insert([data]).select().single()
          if (insertError) throw insertError
          itemId = newItem.id
        }
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

  const handleInlineTagCreate = async () => {
    if (!inlineTagName.trim()) return
    try {
      const { data, error } = await supabase.from('biblioteca_tags').insert([{ nome: inlineTagName.trim(), cor: inlineTagColor }]).select().single()
      if (error) throw error

      setTags(prev => [...prev, data])

      const currentTags = getCurrentFormTags()
      if (activeTab === 'materiais') {
        setMaterialForm(prev => ({ ...prev, tags: [...currentTags, data.id] }))
      } else if (activeTab === 'modelos3d') {
        setModelo3dForm(prev => ({ ...prev, tags: [...currentTags, data.id] }))
      } else {
        setInspiracaoForm(prev => ({ ...prev, tags: [...currentTags, data.id] }))
      }

      setInlineTagName('')
      setInlineTagColor('#C9A882')
      setShowInlineTagInput(false)
    } catch (err) {
      console.error('Erro ao criar tag:', err)
      toast.error('Erro', 'Erro ao criar tag')
    }
  }

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
      setMaterialForm(INITIAL_MATERIAL_FORM)
    } else if (activeTab === 'modelos3d') {
      setModelo3dForm(INITIAL_MODELO3D_FORM)
    } else {
      setInspiracaoForm(INITIAL_INSPIRACAO_FORM)
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

  return {
    // Tab / View
    activeTab, setActiveTab,
    viewMode, setViewMode,
    searchTerm, setSearchTerm,
    selectedCategoria, setSelectedCategoria,
    selectedTags, setSelectedTags,
    loading,

    // Data
    categorias, tags, setTags, materiais, modelos3d, inspiracao, projetos,

    // Modals
    showModal, setShowModal,
    showTagModal, setShowTagModal,
    showCategoriaModal, setShowCategoriaModal,
    showDeleteConfirm, setShowDeleteConfirm,
    showPreview, setShowPreview,
    editingItem, setEditingItem,
    editingCategoria, setEditingCategoria,
    editingTag, setEditingTag,

    // Forms
    materialForm, setMaterialForm,
    modelo3dForm, setModelo3dForm,
    inspiracaoForm, setInspiracaoForm,
    newTag, setNewTag,
    newCategoria, setNewCategoria,

    // Inline tag
    showInlineTagInput, setShowInlineTagInput,
    inlineTagName, setInlineTagName,
    inlineTagColor, setInlineTagColor,

    // File upload
    uploadingFile, tempFileUrl, setTempFileUrl, tempMiniaturaUrl, tempFichaTecnicaUrl,
    handleFileUpload,

    // Filters
    getCategoriasByTipo, getFilteredItems,

    // CRUD
    handleSave, handleDelete, handleToggleFavorite,
    openNewModal, openEditModal, closeModal,

    // Tags
    handleSaveTag, handleInlineTagCreate, handleUpdateTag, handleDeleteTag,
    toggleTagInForm, getCurrentFormTags,

    // Categories
    handleSaveCategoria, handleUpdateCategoria, handleDeleteCategoria,
  }
}
