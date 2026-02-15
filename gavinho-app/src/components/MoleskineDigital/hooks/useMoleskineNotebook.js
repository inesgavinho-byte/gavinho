import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { createBlankPage } from '../utils'

export function useMoleskineNotebook(projectId, projectName) {
  const { profile } = useAuth()

  const [notebookId, setNotebookId] = useState(null)
  const [pages, setPages] = useState([createBlankPage()])
  const [notebookName, setNotebookName] = useState(`Moleskine - ${projectName || 'Novo'}`)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pageHistory, setPageHistory] = useState({})
  const [historyIndex, setHistoryIndex] = useState({})

  // Load notebook from database
  useEffect(() => {
    const loadNotebook = async () => {
      if (!projectId) return

      try {
        const { data, error } = await supabase
          .from('projeto_moleskine')
          .select('*')
          .eq('projeto_id', projectId)
          .single()

        if (error && error.code !== 'PGRST116') {
          return
        }

        if (data) {
          setNotebookId(data.id)
          setNotebookName(data.nome || `Moleskine - ${projectName}`)
          setPages(data.pages || [createBlankPage()])

          const initialHistory = {}
          const initialIndex = {}
          ;(data.pages || []).forEach((page) => {
            initialHistory[page.id] = [page.elements || []]
            initialIndex[page.id] = 0
          })
          setPageHistory(initialHistory)
          setHistoryIndex(initialIndex)
        }
      } catch (err) {
        // Table may not exist yet
      }
    }

    loadNotebook()
  }, [projectId, projectName])

  // Save notebook to database
  const saveNotebook = async () => {
    if (!projectId) return

    setIsSaving(true)
    try {
      const notebookData = {
        projeto_id: projectId,
        nome: notebookName,
        pages: pages,
        updated_by: profile?.id,
        updated_at: new Date().toISOString(),
      }

      if (notebookId) {
        const { error } = await supabase
          .from('projeto_moleskine')
          .update(notebookData)
          .eq('id', notebookId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('projeto_moleskine')
          .insert([notebookData])
          .select()
          .single()

        if (error) throw error
        setNotebookId(data.id)
      }

      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Erro ao guardar:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const saveTimeout = setTimeout(() => {
      saveNotebook()
    }, 5000)

    return () => clearTimeout(saveTimeout)
  }, [pages, hasUnsavedChanges])

  return {
    notebookId,
    pages,
    setPages,
    notebookName,
    setNotebookName,
    isSaving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    saveNotebook,
    pageHistory,
    setPageHistory,
    historyIndex,
    setHistoryIndex,
  }
}
