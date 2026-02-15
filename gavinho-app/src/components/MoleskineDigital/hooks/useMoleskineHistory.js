import { useCallback } from 'react'

export function useMoleskineHistory({
  pages,
  setPages,
  currentPageIndex,
  currentPage,
  pageHistory,
  setPageHistory,
  historyIndex,
  setHistoryIndex,
  setHasUnsavedChanges,
}) {
  const updatePageElements = useCallback((newElements) => {
    const updatedPages = [...pages]
    updatedPages[currentPageIndex] = {
      ...currentPage,
      elements: newElements
    }
    setPages(updatedPages)
    setHasUnsavedChanges(true)

    const pageId = currentPage.id
    const currentHistory = pageHistory[pageId] || [[]]
    const currentIdx = historyIndex[pageId] || 0
    const newHistory = currentHistory.slice(0, currentIdx + 1)
    newHistory.push(newElements)
    if (newHistory.length > 50) newHistory.shift()

    setPageHistory(prev => ({ ...prev, [pageId]: newHistory }))
    setHistoryIndex(prev => ({ ...prev, [pageId]: newHistory.length - 1 }))
  }, [pages, currentPageIndex, currentPage, pageHistory, historyIndex, setPages, setPageHistory, setHistoryIndex, setHasUnsavedChanges])

  const handleUndo = useCallback(() => {
    const pageId = currentPage.id
    const currentIdx = historyIndex[pageId] || 0
    if (currentIdx <= 0) return

    const newIdx = currentIdx - 1
    const history = pageHistory[pageId] || [[]]

    setHistoryIndex(prev => ({ ...prev, [pageId]: newIdx }))

    const updatedPages = [...pages]
    updatedPages[currentPageIndex] = {
      ...currentPage,
      elements: history[newIdx]
    }
    setPages(updatedPages)
    setHasUnsavedChanges(true)
  }, [currentPage, historyIndex, pageHistory, pages, currentPageIndex, setPages, setHistoryIndex, setHasUnsavedChanges])

  const handleRedo = useCallback(() => {
    const pageId = currentPage.id
    const history = pageHistory[pageId] || [[]]
    const currentIdx = historyIndex[pageId] || 0
    if (currentIdx >= history.length - 1) return

    const newIdx = currentIdx + 1

    setHistoryIndex(prev => ({ ...prev, [pageId]: newIdx }))

    const updatedPages = [...pages]
    updatedPages[currentPageIndex] = {
      ...currentPage,
      elements: history[newIdx]
    }
    setPages(updatedPages)
    setHasUnsavedChanges(true)
  }, [currentPage, historyIndex, pageHistory, pages, currentPageIndex, setPages, setHistoryIndex, setHasUnsavedChanges])

  return { updatePageElements, handleUndo, handleRedo }
}
