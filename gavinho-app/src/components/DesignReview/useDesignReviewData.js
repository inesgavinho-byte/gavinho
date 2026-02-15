import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../ui/Toast'

export default function useDesignReviewData({ projeto, initialReviewId }) {
  const { user, profile } = useAuth()
  const toast = useToast()

  // Reviews e versoes
  const [reviews, setReviews] = useState([])
  const [selectedReview, setSelectedReview] = useState(null)
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [loading, setLoading] = useState(true)

  // Annotations
  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotation, setSelectedAnnotation] = useState(null)
  const [replies, setReplies] = useState([])

  // Drawings
  const [drawings, setDrawings] = useState([])

  // Tab management
  const [openTabs, setOpenTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)

  // New Review Form
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Page state
  const [currentPage, setCurrentPage] = useState(1)

  const addTab = useCallback((review) => {
    setOpenTabs(prev => {
      if (prev.some(t => t.reviewId === review.id)) {
        setActiveTabId(review.id)
        setSelectedReview(review)
        return prev
      }
      const newTab = {
        reviewId: review.id,
        reviewName: review.nome,
        reviewCodigo: review.codigo_documento
      }
      setActiveTabId(review.id)
      setSelectedReview(review)
      return [...prev, newTab]
    })
  }, [])

  const closeTab = useCallback((reviewId, e) => {
    if (e) e.stopPropagation()
    setOpenTabs(prev => {
      const newTabs = prev.filter(t => t.reviewId !== reviewId)
      setActiveTabId(current => {
        if (current === reviewId) {
          if (newTabs.length > 0) {
            const nextTab = newTabs[newTabs.length - 1]
            setSelectedReview(reviews.find(r => r.id === nextTab.reviewId) || null)
            return nextTab.reviewId
          } else {
            setSelectedReview(null)
            return null
          }
        }
        return current
      })
      return newTabs
    })
  }, [reviews])

  const switchTab = useCallback((reviewId) => {
    setActiveTabId(reviewId)
    const review = reviews.find(r => r.id === reviewId)
    setSelectedReview(review)
  }, [reviews])

  // Load reviews
  const loadReviews = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('design_reviews')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setReviews(data || [])
      return data || []
    } catch (err) {
      console.error('Error loading reviews:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [projeto?.id])

  // Initial load
  useEffect(() => {
    if (projeto?.id) {
      loadReviews().then(data => {
        if (data && data.length > 0 && !initialReviewId) {
          addTab(data[0])
        }
      })
    }
  }, [projeto?.id])

  // Handle initial review ID
  useEffect(() => {
    if (initialReviewId && reviews.length > 0) {
      const review = reviews.find(r => r.id === initialReviewId)
      if (review) {
        addTab(review)
      }
    }
  }, [initialReviewId, reviews, addTab])

  const loadVersions = useCallback(async () => {
    if (!selectedReview) return
    try {
      const { data, error } = await supabase
        .from('design_review_versions')
        .select('*')
        .eq('review_id', selectedReview.id)
        .order('numero_versao', { ascending: false })

      if (error) throw error
      setVersions(data || [])

      if (data && data.length > 0) {
        setSelectedVersion(data[0])
      }
    } catch (err) {
      console.error('Error loading versions:', err)
    }
  }, [selectedReview?.id])

  // Load versions when review selected
  useEffect(() => {
    if (selectedReview) {
      loadVersions()
    }
  }, [selectedReview, loadVersions])

  const loadAnnotations = useCallback(async () => {
    if (!selectedVersion) return
    try {
      const { data, error } = await supabase
        .from('design_review_annotations')
        .select('*')
        .eq('version_id', selectedVersion.id)
        .order('criado_em', { ascending: true })

      if (error) throw error
      setAnnotations(data || [])
    } catch (err) {
      console.error('Error loading annotations:', err)
    }
  }, [selectedVersion?.id])

  const loadReplies = useCallback(async () => {
    if (!selectedAnnotation) return
    try {
      const { data, error } = await supabase
        .from('design_review_replies')
        .select('*')
        .eq('annotation_id', selectedAnnotation.id)
        .order('criado_em', { ascending: true })

      if (error) throw error
      setReplies(data || [])
    } catch (err) {
      console.error('Error loading replies:', err)
    }
  }, [selectedAnnotation?.id])

  const loadDrawings = useCallback(async () => {
    if (!selectedVersion) return
    try {
      const { data, error } = await supabase
        .from('design_review_drawings')
        .select('*')
        .eq('version_id', selectedVersion.id)
        .eq('pagina', currentPage)
        .order('criado_em', { ascending: true })

      if (error) throw error
      setDrawings(data || [])
    } catch (err) {
      console.error('Error loading drawings:', err)
    }
  }, [selectedVersion?.id, currentPage])

  // Load annotations and drawings when version selected
  useEffect(() => {
    if (selectedVersion) {
      loadAnnotations()
      loadDrawings()
    }
  }, [selectedVersion, loadAnnotations, loadDrawings])

  // Load drawings when page changes
  useEffect(() => {
    if (selectedVersion && currentPage) {
      loadDrawings()
    }
  }, [currentPage, loadDrawings])

  // Load replies when annotation selected
  useEffect(() => {
    if (selectedAnnotation) {
      loadReplies()
    }
  }, [selectedAnnotation, loadReplies])

  const saveDrawing = useCallback(async (drawingData, drawingColor, drawingThickness) => {
    if (!selectedVersion) return
    try {
      const { data, error } = await supabase
        .from('design_review_drawings')
        .insert({
          version_id: selectedVersion.id,
          pagina: currentPage,
          tipo: drawingData.tipo,
          data: drawingData.data,
          cor: drawingColor,
          espessura: drawingThickness,
          autor_id: profile?.id,
          autor_nome: profile?.nome || user?.email || 'Utilizador'
        })
        .select()
        .single()

      if (error) throw error
      setDrawings(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error saving drawing:', err)
    }
  }, [selectedVersion?.id, currentPage, profile, user])

  const deleteDrawing = useCallback(async (drawingId) => {
    try {
      const drawingToDelete = drawings.find(d => d.id === drawingId)
      const { error } = await supabase
        .from('design_review_drawings')
        .delete()
        .eq('id', drawingId)

      if (error) throw error
      setDrawings(prev => prev.filter(d => d.id !== drawingId))
      return drawingToDelete
    } catch (err) {
      console.error('Error deleting drawing:', err)
    }
  }, [drawings])

  const restoreDrawing = useCallback(async (drawing) => {
    try {
      const { data, error } = await supabase
        .from('design_review_drawings')
        .insert({
          version_id: drawing.version_id,
          pagina: drawing.pagina,
          tipo: drawing.tipo,
          data: drawing.data,
          cor: drawing.cor,
          espessura: drawing.espessura,
          autor_id: drawing.autor_id,
          autor_nome: drawing.autor_nome
        })
        .select()
        .single()

      if (error) throw error
      setDrawings(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error restoring drawing:', err)
    }
  }, [])

  const addAnnotation = useCallback(async ({ pos, comment, categoria }) => {
    if (!comment.trim() || !pos || !selectedVersion) return
    try {
      const { data, error } = await supabase
        .from('design_review_annotations')
        .insert({
          version_id: selectedVersion.id,
          pagina: currentPage,
          pos_x: pos.x,
          pos_y: pos.y,
          comentario: comment.trim(),
          categoria,
          autor_id: profile?.id,
          autor_nome: profile?.nome || user?.email || 'Utilizador'
        })
        .select()
        .single()

      if (error) throw error
      setAnnotations(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error adding annotation:', err)
    }
  }, [selectedVersion?.id, currentPage, profile, user])

  const resolveAnnotation = useCallback(async (annotation) => {
    try {
      const { error } = await supabase
        .from('design_review_annotations')
        .update({
          status: 'resolvido',
          resolvido_por: profile?.id,
          resolvido_por_nome: profile?.nome || user?.email,
          resolvido_em: new Date().toISOString()
        })
        .eq('id', annotation.id)

      if (error) throw error
      setAnnotations(prev =>
        prev.map(a => a.id === annotation.id ? { ...a, status: 'resolvido' } : a)
      )
    } catch (err) {
      console.error('Error resolving annotation:', err)
    }
  }, [profile, user])

  const editAnnotation = useCallback(async (annotationId, { comentario, categoria }) => {
    try {
      const { error } = await supabase
        .from('design_review_annotations')
        .update({ comentario: comentario.trim(), categoria })
        .eq('id', annotationId)

      if (error) throw error
      setAnnotations(prev =>
        prev.map(a => a.id === annotationId
          ? { ...a, comentario: comentario.trim(), categoria }
          : a)
      )
    } catch (err) {
      console.error('Error editing annotation:', err)
    }
  }, [])

  const deleteAnnotation = useCallback(async (annotationId) => {
    try {
      const { error } = await supabase
        .from('design_review_annotations')
        .delete()
        .eq('id', annotationId)

      if (error) throw error
      setAnnotations(prev => prev.filter(a => a.id !== annotationId))
      if (selectedAnnotation?.id === annotationId) {
        setSelectedAnnotation(null)
      }
    } catch (err) {
      console.error('Error deleting annotation:', err)
    }
  }, [selectedAnnotation])

  const reopenAnnotation = useCallback(async (annotation) => {
    try {
      const { error } = await supabase
        .from('design_review_annotations')
        .update({
          status: 'aberto',
          resolvido_por: null,
          resolvido_por_nome: null,
          resolvido_em: null
        })
        .eq('id', annotation.id)

      if (error) throw error
      setAnnotations(prev =>
        prev.map(a => a.id === annotation.id ? { ...a, status: 'aberto' } : a)
      )
    } catch (err) {
      console.error('Error reopening annotation:', err)
    }
  }, [])

  const createReview = useCallback(async ({ name, codigo, file }) => {
    if (!name.trim() || !file) return
    setCreateLoading(true)
    setCreateError(null)

    try {
      const fileName = `design-reviews/${projeto.id}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file)

      if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(fileName)

      const { data: reviewData, error: reviewError } = await supabase
        .from('design_reviews')
        .insert({
          projeto_id: projeto.id,
          nome: name.trim(),
          codigo_documento: codigo.trim() || null,
          criado_por: profile?.id || null,
          criado_por_nome: profile?.nome || user?.email || 'Utilizador'
        })
        .select()
        .single()

      if (reviewError) throw new Error(`Erro ao criar review: ${reviewError.message}`)

      const { error: versionError } = await supabase
        .from('design_review_versions')
        .insert({
          review_id: reviewData.id,
          numero_versao: 1,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: profile?.id || null,
          uploaded_by_nome: profile?.nome || user?.email || 'Utilizador'
        })

      if (versionError) throw new Error(`Erro ao criar versao: ${versionError.message}`)

      addTab(reviewData)
      await loadReviews()
      return reviewData
    } catch (err) {
      console.error('Error creating review:', err)
      setCreateError(err.message || 'Erro ao criar review')
    } finally {
      setCreateLoading(false)
    }
  }, [projeto?.id, profile, user, addTab, loadReviews])

  const deleteVersion = useCallback(async () => {
    if (!selectedVersion) return
    try {
      if (selectedVersion.file_url) {
        const urlParts = selectedVersion.file_url.split('/project-files/')
        if (urlParts[1]) {
          await supabase.storage.from('project-files').remove([decodeURIComponent(urlParts[1])])
        }
      }
      const { error } = await supabase
        .from('design_review_versions')
        .delete()
        .eq('id', selectedVersion.id)
      if (error) throw error

      toast.success('Versão eliminada')
      await loadVersions()
    } catch (err) {
      console.error('Error deleting version:', err)
      toast.error('Erro', 'Não foi possível eliminar a versão')
    }
  }, [selectedVersion, loadVersions, toast])

  const deleteReview = useCallback(async () => {
    if (!selectedReview) return
    try {
      for (const v of versions) {
        if (v.file_url) {
          const urlParts = v.file_url.split('/project-files/')
          if (urlParts[1]) {
            await supabase.storage.from('project-files').remove([decodeURIComponent(urlParts[1])])
          }
        }
      }
      const { error } = await supabase
        .from('design_reviews')
        .delete()
        .eq('id', selectedReview.id)
      if (error) throw error

      toast.success('Pacote eliminado')
      setOpenTabs(prev => prev.filter(t => t.reviewId !== selectedReview.id))
      setSelectedReview(null)
      setVersions([])
      setSelectedVersion(null)
      await loadReviews()
    } catch (err) {
      console.error('Error deleting review:', err)
      toast.error('Erro', 'Não foi possível eliminar o pacote')
    }
  }, [selectedReview, versions, loadReviews, toast])

  const uploadNewVersion = useCallback(async (file) => {
    if (!file || !selectedReview) return
    try {
      const fileName = `design-reviews/${projeto.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(fileName)

      const newVersionNum = (versions[0]?.numero_versao || 0) + 1
      const { data: newVersion, error: versionError } = await supabase
        .from('design_review_versions')
        .insert({
          review_id: selectedReview.id,
          numero_versao: newVersionNum,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: profile?.id,
          uploaded_by_nome: profile?.nome || user?.email
        })
        .select()
        .single()

      if (versionError) throw versionError

      // Copy unresolved annotations from current version to new version
      if (selectedVersion && newVersion) {
        const { data: unresolvedAnnotations } = await supabase
          .from('design_review_annotations')
          .select('*')
          .eq('version_id', selectedVersion.id)
          .neq('status', 'resolvido')

        if (unresolvedAnnotations && unresolvedAnnotations.length > 0) {
          const annotationsToCopy = unresolvedAnnotations.map(ann => ({
            version_id: newVersion.id,
            pagina: ann.pagina,
            pos_x: ann.pos_x,
            pos_y: ann.pos_y,
            comentario: ann.comentario,
            categoria: ann.categoria,
            status: ann.status,
            autor_id: ann.autor_id,
            autor_nome: ann.autor_nome,
            herdado_de: ann.herdado_de || ann.id
          }))

          await supabase
            .from('design_review_annotations')
            .insert(annotationsToCopy)
        }
      }

      await loadVersions()
    } catch (err) {
      console.error('Error uploading version:', err)
    }
  }, [selectedReview, selectedVersion, versions, projeto?.id, profile, user, loadVersions])

  return {
    // State
    reviews,
    selectedReview,
    setSelectedReview,
    versions,
    selectedVersion,
    setSelectedVersion,
    loading,
    annotations,
    selectedAnnotation,
    setSelectedAnnotation,
    replies,
    drawings,
    setDrawings,
    currentPage,
    setCurrentPage,
    createLoading,
    createError,
    setCreateError,

    // Tab management
    openTabs,
    setOpenTabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    switchTab,

    // Data operations
    loadReviews,
    loadVersions,
    loadAnnotations,
    loadDrawings,
    saveDrawing,
    deleteDrawing,
    restoreDrawing,
    addAnnotation,
    resolveAnnotation,
    editAnnotation,
    deleteAnnotation,
    reopenAnnotation,
    createReview,
    deleteVersion,
    deleteReview,
    uploadNewVersion,

    // Auth context
    user,
    profile,
  }
}
