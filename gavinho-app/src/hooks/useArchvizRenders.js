// =====================================================
// ARCHVIZ RENDERS HOOK
// Manages all render state, CRUD, lightbox, drag-drop
// for the ProjetoArchviz tab component
// =====================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export function useArchvizRenders(projectId, userId, userEmail) {
  // Render state
  const [renders, setRenders] = useState([])
  const [showRenderModal, setShowRenderModal] = useState(false)
  const [editingRender, setEditingRender] = useState(null)
  const [renderForm, setRenderForm] = useState({
    compartimento: '',
    vista: '',
    versao: 1,
    descricao: '',
    is_final: false,
    imagem_url: '',
    data_upload: new Date().toISOString().split('T')[0]
  })

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState(null)
  const [lightboxImages, setLightboxImages] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // UI state
  const [collapsedCompartimentos, setCollapsedCompartimentos] = useState({})
  const [moleskineRender, setMoleskineRender] = useState(null)
  const [renderAnnotations, setRenderAnnotations] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  const [projetoCompartimentos, setProjetoCompartimentos] = useState([])

  // Final images drag-and-drop
  const [finalImageOrder, setFinalImageOrder] = useState([])
  const [draggedImage, setDraggedImage] = useState(null)

  // ── Fetch renders ──
  const fetchRenders = useCallback(async (projId) => {
    const pid = projId || projectId
    if (!pid) return
    try {
      const { data, error } = await supabase
        .from('projeto_renders')
        .select('*')
        .eq('projeto_id', pid)
        .order('compartimento')
        .order('vista')

      if (error) throw error

      const sorted = (data || []).sort((a, b) => {
        if (a.compartimento !== b.compartimento) return a.compartimento.localeCompare(b.compartimento)
        if ((a.vista || '') !== (b.vista || '')) return (a.vista || '').localeCompare(b.vista || '')
        return (b.versao || 0) - (a.versao || 0)
      })
      setRenders(sorted)

      // Fetch compartimentos
      const { data: compartimentosData } = await supabase
        .from('projeto_compartimentos')
        .select('nome')
        .eq('projeto_id', pid)
        .order('nome')

      if (compartimentosData) {
        setProjetoCompartimentos(compartimentosData.map(c => c.nome))
      }

      // Fetch annotations
      const { data: annotationsData } = await supabase
        .from('render_annotations')
        .select('render_id, annotations')
        .eq('projeto_id', pid)

      if (annotationsData) {
        const annotationsMap = {}
        annotationsData.forEach(a => {
          annotationsMap[a.render_id] = a.annotations?.length || 0
        })
        setRenderAnnotations(annotationsMap)
      }
    } catch (err) {
      console.error('Erro ao carregar renders:', err)
    }
  }, [projectId])

  // Auto-fetch on projectId change
  useEffect(() => {
    if (projectId) fetchRenders(projectId)
  }, [projectId, fetchRenders])

  // Load final image order from localStorage
  useEffect(() => {
    if (projectId) {
      const stored = localStorage.getItem(`gavinho_final_images_order_${projectId}`)
      if (stored) {
        try {
          setFinalImageOrder(JSON.parse(stored))
        } catch {
          setFinalImageOrder([])
        }
      }
    }
  }, [projectId])

  // ── Version helpers ──
  const getNextVersion = useCallback((compartimento, vista = '') => {
    const matchingRenders = renders.filter(r =>
      r.compartimento === compartimento &&
      (r.vista || '') === (vista || '')
    )
    return matchingRenders.length + 1
  }, [renders])

  // ── Modal helpers ──
  const openAddRenderModal = useCallback((compartimento = '', vista = '') => {
    setEditingRender(null)
    const versao = compartimento ? getNextVersion(compartimento, vista) : 1
    setRenderForm({
      compartimento,
      vista,
      versao,
      descricao: '',
      is_final: false,
      imagem_url: '',
      data_upload: new Date().toISOString().split('T')[0]
    })
    setShowRenderModal(true)
  }, [getNextVersion])

  const openEditRenderModal = useCallback((render) => {
    setEditingRender(render)
    setRenderForm({
      compartimento: render.compartimento,
      vista: render.vista || '',
      versao: render.versao,
      descricao: render.descricao || '',
      is_final: render.is_final || false,
      imagem_url: render.imagem_url || '',
      data_upload: render.data_upload || render.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    })
    setShowRenderModal(true)
  }, [])

  const handleRenderCompartimentoChange = useCallback((compartimento) => {
    const versao = getNextVersion(compartimento, renderForm.vista)
    setRenderForm(prev => ({ ...prev, compartimento, versao }))
  }, [getNextVersion, renderForm.vista])

  // ── CRUD ──
  const handleSaveRender = useCallback(async () => {
    if (!renderForm.compartimento) {
      alert('Por favor selecione um compartimento')
      return
    }

    try {
      const compartimentoNome = renderForm.compartimento.trim()
      if (compartimentoNome && !projetoCompartimentos.includes(compartimentoNome)) {
        const { error: compError } = await supabase
          .from('projeto_compartimentos')
          .insert([{
            projeto_id: projectId,
            nome: compartimentoNome,
            created_by: userId,
            created_by_name: userEmail?.split('@')[0] || 'Utilizador'
          }])
          .select()

        if (!compError) {
          setProjetoCompartimentos(prev => [...prev, compartimentoNome].sort())
        }
      }

      const renderData = {
        projeto_id: projectId,
        compartimento: compartimentoNome,
        vista: renderForm.vista || null,
        versao: editingRender ? renderForm.versao : getNextVersion(compartimentoNome, renderForm.vista),
        descricao: renderForm.descricao,
        is_final: renderForm.is_final,
        imagem_url: renderForm.imagem_url,
        created_at: new Date().toISOString()
      }

      if (editingRender) {
        const { error } = await supabase
          .from('projeto_renders')
          .update(renderData)
          .eq('id', editingRender.id)
        if (error) throw error
        setRenders(prev => prev.map(r =>
          r.id === editingRender.id ? { ...r, ...renderData } : r
        ))
      } else {
        const { data, error } = await supabase
          .from('projeto_renders')
          .insert([renderData])
          .select()
          .single()
        if (error) {
          alert('Erro ao guardar render: ' + error.message)
          return
        }
        setRenders(prev => [...prev, data])
      }

      setShowRenderModal(false)
      setEditingRender(null)
    } catch (err) {
      alert('Erro ao guardar render: ' + err.message)
    }
  }, [renderForm, editingRender, projectId, userId, userEmail, projetoCompartimentos, getNextVersion])

  const handleDeleteRender = useCallback(async (render) => {
    if (!confirm('Tem certeza que deseja eliminar este render?')) return
    try {
      const { error } = await supabase
        .from('projeto_renders')
        .delete()
        .eq('id', render.id)
      if (error) throw error
      setRenders(prev => prev.filter(r => r.id !== render.id))
    } catch (err) {
      alert('Erro ao eliminar: ' + err.message)
    }
  }, [])

  const toggleFinalImage = useCallback(async (render) => {
    const newIsFinal = !render.is_final
    try {
      const { error } = await supabase
        .from('projeto_renders')
        .update({ is_final: newIsFinal })
        .eq('id', render.id)
      if (error) throw error
      setRenders(prev => prev.map(r =>
        r.id === render.id ? { ...r, is_final: newIsFinal } : r
      ))
    } catch (err) {
      alert('Erro ao atualizar: ' + err.message)
    }
  }, [])

  // ── Image upload ──
  const processImageFile = useCallback((file) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um ficheiro de imagem válido')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setRenderForm(prev => ({ ...prev, imagem_url: event.target?.result }))
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRenderImageUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) processImageFile(file)
  }, [processImageFile])

  // ── Drag & drop for render upload ──
  const handleRenderDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleRenderDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleRenderDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImageFile(file)
  }, [processImageFile])

  // ── Lightbox ──
  const openLightbox = useCallback((render, imageArray = null) => {
    if (render.imagem_url) {
      setLightboxImage(render)
      if (imageArray && imageArray.length > 0) {
        const imagesWithUrl = imageArray.filter(r => r.imagem_url)
        setLightboxImages(imagesWithUrl)
        const index = imagesWithUrl.findIndex(r => r.id === render.id)
        setLightboxIndex(index >= 0 ? index : 0)
      } else {
        setLightboxImages([render])
        setLightboxIndex(0)
      }
    }
  }, [])

  const navigateLightbox = useCallback((direction) => {
    const newIndex = lightboxIndex + direction
    if (newIndex >= 0 && newIndex < lightboxImages.length) {
      setLightboxIndex(newIndex)
      setLightboxImage(lightboxImages[newIndex])
    }
  }, [lightboxIndex, lightboxImages])

  const closeLightbox = useCallback(() => {
    setLightboxImage(null)
    setLightboxImages([])
    setLightboxIndex(0)
  }, [])

  // ── Compartimento collapse ──
  const toggleCompartimentoCollapse = useCallback((compartimento) => {
    setCollapsedCompartimentos(prev => ({
      ...prev,
      [compartimento]: !prev[compartimento]
    }))
  }, [])

  const toggleAllCompartimentos = useCallback((collapse) => {
    const newState = {}
    Object.keys(rendersByCompartimento).forEach(comp => {
      newState[comp] = collapse
    })
    setCollapsedCompartimentos(newState)
  }, [])

  // ── Computed values ──
  const rendersByCompartimento = useMemo(() => {
    return renders.reduce((acc, render) => {
      if (!acc[render.compartimento]) acc[render.compartimento] = []
      acc[render.compartimento].push(render)
      return acc
    }, {})
  }, [renders])

  // Re-bind toggleAllCompartimentos with latest rendersByCompartimento
  const toggleAll = useCallback((collapse) => {
    const newState = {}
    Object.keys(rendersByCompartimento).forEach(comp => {
      newState[comp] = collapse
    })
    setCollapsedCompartimentos(newState)
  }, [rendersByCompartimento])

  const imagensFinais = useMemo(() => {
    const finals = renders.filter(r => r.is_final)
    if (finalImageOrder.length === 0) return finals
    return finals.sort((a, b) => {
      const indexA = finalImageOrder.indexOf(a.id)
      const indexB = finalImageOrder.indexOf(b.id)
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }, [renders, finalImageOrder])

  // ── Final image drag-and-drop ──
  const handleFinalImageDragStart = useCallback((e, render) => {
    setDraggedImage(render)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleFinalImageDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleFinalImageDrop = useCallback((e, targetRender) => {
    e.preventDefault()
    if (!draggedImage || draggedImage.id === targetRender.id) {
      setDraggedImage(null)
      return
    }
    const currentOrder = imagensFinais.map(r => r.id)
    const draggedIndex = currentOrder.indexOf(draggedImage.id)
    const targetIndex = currentOrder.indexOf(targetRender.id)
    currentOrder.splice(draggedIndex, 1)
    currentOrder.splice(targetIndex, 0, draggedImage.id)
    setFinalImageOrder(currentOrder)
    localStorage.setItem(`gavinho_final_images_order_${projectId}`, JSON.stringify(currentOrder))
    setDraggedImage(null)
  }, [draggedImage, imagensFinais, projectId])

  const handleFinalImageDragEnd = useCallback(() => {
    setDraggedImage(null)
  }, [])

  // ── Refresh annotations (called after Moleskine save) ──
  const refreshAnnotations = useCallback(async () => {
    if (!projectId) return
    const { data: annotationsData } = await supabase
      .from('render_annotations')
      .select('render_id, annotations')
      .eq('projeto_id', projectId)
    if (annotationsData) {
      const annotationsMap = {}
      annotationsData.forEach(a => {
        annotationsMap[a.render_id] = a.annotations?.length || 0
      })
      setRenderAnnotations(annotationsMap)
    }
  }, [projectId])

  return {
    // State
    renders,
    showRenderModal, setShowRenderModal,
    editingRender,
    renderForm, setRenderForm,
    lightboxImage, lightboxImages, lightboxIndex,
    collapsedCompartimentos,
    moleskineRender, setMoleskineRender,
    renderAnnotations,
    isDragging,
    projetoCompartimentos,
    draggedImage,

    // Computed
    rendersByCompartimento,
    imagensFinais,

    // Actions
    fetchRenders,
    getNextVersion,
    openAddRenderModal,
    openEditRenderModal,
    handleRenderCompartimentoChange,
    handleSaveRender,
    handleDeleteRender,
    toggleFinalImage,
    handleRenderImageUpload,
    processImageFile,
    handleRenderDragOver,
    handleRenderDragLeave,
    handleRenderDrop,
    openLightbox,
    navigateLightbox,
    closeLightbox,
    toggleCompartimentoCollapse,
    toggleAllCompartimentos: toggleAll,
    handleFinalImageDragStart,
    handleFinalImageDragOver,
    handleFinalImageDrop,
    handleFinalImageDragEnd,
    refreshAnnotations
  }
}

export default useArchvizRenders
