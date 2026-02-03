import { useState, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatFileSize } from '../utils/helpers'

export function useFileUpload() {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || [])
    const newFiles = files.map(file => ({
      file,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))
    setSelectedFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const newFiles = files.map(file => ({
        file,
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: file.type.startsWith('image/') ? 'image' : 'file',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }))
      setSelectedFiles(prev => [...prev, ...newFiles])
    }
  }, [])

  const uploadFiles = useCallback(async (canalId) => {
    const attachments = []

    for (const file of selectedFiles) {
      const fileName = `${canalId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file.file)

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(fileName)
        attachments.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size
        })
      }
    }

    return attachments
  }, [selectedFiles])

  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }, [])

  const clearFiles = useCallback(() => {
    selectedFiles.forEach(file => {
      if (file.preview) URL.revokeObjectURL(file.preview)
    })
    setSelectedFiles([])
  }, [selectedFiles])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return {
    selectedFiles,
    uploading,
    setUploading,
    isDragging,
    fileInputRef,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    uploadFiles,
    removeFile,
    clearFiles,
    openFileDialog
  }
}
