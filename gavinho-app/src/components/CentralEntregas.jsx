import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import {
  Plus, FileText, Edit2, Trash2, Save, X, Calendar, User, CheckCircle,
  Clock, AlertCircle, Download, Upload, Send, Package, Users, Building2,
  Loader2, Eye, ChevronDown, ChevronRight, FileCheck, ExternalLink, Paperclip, File,
  FileSearch, ArrowRight
} from 'lucide-react'

const tipoConfig = {
  'interna': { label: 'Interna', icon: Users, color: 'var(--info)' },
  'cliente': { label: 'Cliente', icon: Building2, color: 'var(--success)' }
}

const statusConfig = {
  'pendente': { label: 'Pendente', color: 'var(--brown-light)', bg: 'var(--stone)' },
  'em_preparacao': { label: 'Em Preparação', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  'enviado': { label: 'Enviado', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.15)' },
  'entregue': { label: 'Entregue', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  'aprovado': { label: 'Aprovado pelo Cliente', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.25)' },
  'rejeitado': { label: 'Rejeitado', color: 'var(--error)', bg: 'rgba(180, 100, 100, 0.15)' }
}

export default function CentralEntregas({ projeto, onNavigateToDesignReview }) {
  const { user, profile } = useAuth()
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('interna')
  const [expandedItems, setExpandedItems] = useState({})
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [convertingToReview, setConvertingToReview] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertFile, setConvertFile] = useState(null)
  const [convertEntrega, setConvertEntrega] = useState(null)
  const [convertName, setConvertName] = useState('')
  const [convertCodigo, setConvertCodigo] = useState('')
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null })
  const [teamMembers, setTeamMembers] = useState([])
  const [destQuery, setDestQuery] = useState('')
  const [showDestDropdown, setShowDestDropdown] = useState(false)
  const [selectedDestUser, setSelectedDestUser] = useState(null)
  const destRef = useRef(null)

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'interna',
    destinatario: '',
    destinatario_id: null,
    data_prevista: '',
    data_entrega: '',
    status: 'pendente',
    documentos: '',
    observacoes: ''
  })

  useEffect(() => {
    if (projeto?.id) {
      loadEntregas()
    }
  }, [projeto?.id])

  // Load team members for @mention autocomplete
  useEffect(() => {
    const loadTeam = async () => {
      const { data } = await supabase
        .from('utilizadores')
        .select('id, nome, funcao, avatar_url')
        .eq('ativo', true)
        .order('nome')
      if (data) setTeamMembers(data)
    }
    loadTeam()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (destRef.current && !destRef.current.contains(e.target)) {
        setShowDestDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadEntregas = async () => {
    try {
      const { data, error } = await supabase
        .from('projeto_entregas')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('data_prevista', { ascending: true })

      if (error) {
        // If table doesn't exist, use sample data
        if (error.code === '42P01') {
          setEntregas(getSampleData())
        } else {
          throw error
        }
      } else {
        setEntregas(data || [])
      }
    } catch (err) {
      // Table may not exist yet - use sample data
      // Use sample data for demo
      setEntregas(getSampleData())
    } finally {
      setLoading(false)
    }
  }

  const getSampleData = () => [
    {
      id: 'sample-1',
      tipo: 'interna',
      titulo: 'Briefing do Projeto',
      descricao: 'Documentação inicial com requisitos e escopo do projeto',
      destinatario: 'Equipa de Design',
      data_prevista: '2025-08-15',
      data_entrega: '2025-08-14',
      status: 'entregue',
      documentos: 'briefing_v1.pdf'
    },
    {
      id: 'sample-2',
      tipo: 'interna',
      titulo: 'Moodboard e Referências',
      descricao: 'Painel de referências visuais e conceituais',
      destinatario: 'Equipa de Design',
      data_prevista: '2025-08-22',
      status: 'em_preparacao',
      documentos: ''
    },
    {
      id: 'sample-3',
      tipo: 'cliente',
      titulo: 'Apresentação Conceito - Fase 1',
      descricao: 'Proposta conceptual inicial para aprovação do cliente',
      destinatario: projeto?.cliente?.nome || 'Cliente',
      data_prevista: '2025-09-01',
      status: 'pendente',
      documentos: ''
    },
    {
      id: 'sample-4',
      tipo: 'cliente',
      titulo: 'Proposta de Materiais e Acabamentos',
      descricao: 'Seleção de materiais, cores e acabamentos',
      destinatario: projeto?.cliente?.nome || 'Cliente',
      data_prevista: '2025-09-15',
      status: 'pendente',
      documentos: ''
    }
  ]

  const resetForm = () => {
    setSelectedDestUser(null)
    setDestQuery('')
    setFormData({
      titulo: '',
      descricao: '',
      tipo: activeSection,
      destinatario: activeSection === 'cliente' ? (projeto?.cliente?.nome || '') : '',
      destinatario_id: null,
      data_prevista: '',
      data_entrega: '',
      status: 'pendente',
      documentos: '',
      observacoes: ''
    })
    setUploadedFiles([])
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      tipo: item.tipo || 'interna',
      destinatario: item.destinatario || '',
      data_prevista: item.data_prevista || '',
      data_entrega: item.data_entrega || '',
      status: item.status || 'pendente',
      documentos: item.documentos || '',
      observacoes: item.observacoes || ''
    })
    // Parse existing documents if editing
    if (item.documentos) {
      const existingFiles = item.documentos.split(',').map(doc => ({
        name: doc.trim().split('/').pop(),
        url: doc.trim(),
        existing: true
      }))
      setUploadedFiles(existingFiles)
    } else {
      setUploadedFiles([])
    }
    setShowModal(true)
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    const newFiles = []

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `entregas/${projeto.id}/${fileName}`

        const { data, error } = await supabase.storage
          .from('projeto-files')
          .upload(filePath, file)

        if (error) {
          console.error('Erro ao fazer upload:', error)
          // Still add to list for demo purposes
          newFiles.push({
            name: file.name,
            url: URL.createObjectURL(file),
            local: true
          })
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('projeto-files')
            .getPublicUrl(filePath)

          newFiles.push({
            name: file.name,
            url: publicUrl,
            path: filePath
          })
        }
      } catch (err) {
        console.error('Erro no upload:', err)
        newFiles.push({
          name: file.name,
          url: URL.createObjectURL(file),
          local: true
        })
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles])
    setUploading(false)
    e.target.value = ''
  }

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      toast.warning('Atenção', 'O título é obrigatório')
      return
    }

    setSaving(true)
    try {
      // Concatenate file URLs
      const documentosUrls = uploadedFiles
        .filter(f => f.url)
        .map(f => f.url)
        .join(', ')

      const itemData = {
        projeto_id: projeto.id,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        destinatario: formData.destinatario || null,
        data_prevista: formData.data_prevista || null,
        data_entrega: formData.data_entrega || null,
        status: formData.status,
        documentos: documentosUrls || null,
        observacoes: formData.observacoes || null
      }

      if (editingItem && !editingItem.id.startsWith('sample-')) {
        const { error } = await supabase
          .from('projeto_entregas')
          .update(itemData)
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projeto_entregas')
          .insert([itemData])
        if (error) throw error
      }

      // Create notification for the recipient
      if (formData.destinatario_id && formData.destinatario_id !== profile?.id) {
        try {
          await supabase.from('notificacoes').insert({
            user_id: formData.destinatario_id,
            sender_id: profile?.id,
            type: 'entrega',
            title: 'Nova Entrega',
            message: `${profile?.nome || 'Alguém'} atribuiu-te a entrega "${formData.titulo}"`,
            context: {
              project: projeto?.codigo || projeto?.nome,
              entrega_titulo: formData.titulo,
              tipo: formData.tipo,
              data_prevista: formData.data_prevista
            },
            link: `/projetos/${projeto?.codigo}?tab=entregas`,
            read: false
          })
        } catch (notifErr) {
          console.warn('Could not create delivery notification:', notifErr.message)
        }
      }

      setShowModal(false)
      setEditingItem(null)
      resetForm()
      setSelectedDestUser(null)
      setDestQuery('')
      loadEntregas()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      toast.error('Erro', 'Erro ao guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (item) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Entrega',
      message: 'Tem certeza que deseja eliminar esta entrega?',
      type: 'danger',
      onConfirm: async () => {
        if (item.id.startsWith('sample-')) {
          setEntregas(prev => prev.filter(e => e.id !== item.id))
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
          return
        }

        try {
          const { error } = await supabase
            .from('projeto_entregas')
            .delete()
            .eq('id', item.id)

          if (error) throw error
          loadEntregas()
        } catch (err) {
          console.error('Erro ao eliminar:', err)
          toast.error('Erro', 'Erro ao eliminar: ' + err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const updateStatus = async (item, newStatus) => {
    if (item.id.startsWith('sample-')) {
      setEntregas(prev => prev.map(e =>
        e.id === item.id ? { ...e, status: newStatus } : e
      ))
      return
    }

    try {
      const updateData = { status: newStatus }
      if (newStatus === 'entregue' && !item.data_entrega) {
        updateData.data_entrega = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('projeto_entregas')
        .update(updateData)
        .eq('id', item.id)

      if (error) throw error
      loadEntregas()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
    }
  }

  // Helper to check if file is PDF
  const isPdfFile = (url) => {
    if (!url) return false
    const lowered = url.toLowerCase()
    return lowered.endsWith('.pdf') || lowered.includes('.pdf')
  }

  // Get PDF files from entrega documents
  const getPdfFilesFromEntrega = (item) => {
    if (!item.documentos) return []
    return item.documentos.split(',').map(doc => doc.trim()).filter(doc => isPdfFile(doc))
  }

  // Open convert to design review modal
  const openConvertModal = (item, fileUrl) => {
    setConvertEntrega(item)
    setConvertFile(fileUrl)
    setConvertName(item.titulo || '')
    setConvertCodigo('')
    setShowConvertModal(true)
  }

  // Convert PDF to Design Review
  const handleConvertToDesignReview = async () => {
    if (!convertFile || !convertName.trim()) return

    setConvertingToReview(true)
    try {
      // Create design review
      const { data: reviewData, error: reviewError } = await supabase
        .from('design_reviews')
        .insert({
          projeto_id: projeto.id,
          nome: convertName.trim(),
          codigo_documento: convertCodigo.trim() || null,
          criado_por: profile?.id || null,
          criado_por_nome: profile?.nome || user?.email || 'Utilizador',
          origem_entrega_id: convertEntrega?.id || null
        })
        .select()
        .single()

      if (reviewError) {
        console.error('Review error:', reviewError)
        throw new Error(`Erro ao criar review: ${reviewError.message}`)
      }

      // Create first version using existing file URL
      const fileName = convertFile.split('/').pop() || 'documento.pdf'
      const { error: versionError } = await supabase
        .from('design_review_versions')
        .insert({
          review_id: reviewData.id,
          numero_versao: 1,
          file_url: convertFile,
          file_name: fileName,
          uploaded_by: profile?.id || null,
          uploaded_by_nome: profile?.nome || user?.email || 'Utilizador'
        })

      if (versionError) {
        console.error('Version error:', versionError)
        throw new Error(`Erro ao criar versão: ${versionError.message}`)
      }

      setShowConvertModal(false)
      setConvertFile(null)
      setConvertEntrega(null)
      setConvertName('')
      setConvertCodigo('')

      // Navigate to design review if callback provided
      if (onNavigateToDesignReview) {
        onNavigateToDesignReview(reviewData.id)
      } else {
        toast.success('Sucesso', 'Design Review criado com sucesso!')
      }
    } catch (err) {
      console.error('Erro ao converter para Design Review:', err)
      toast.error('Erro', err.message)
    } finally {
      setConvertingToReview(false)
    }
  }

  const filteredEntregas = entregas.filter(e => e.tipo === activeSection)

  const stats = {
    interna: {
      total: entregas.filter(e => e.tipo === 'interna').length,
      pendentes: entregas.filter(e => e.tipo === 'interna' && ['pendente', 'em_preparacao'].includes(e.status)).length,
      entregues: entregas.filter(e => e.tipo === 'interna' && e.status === 'entregue').length
    },
    cliente: {
      total: entregas.filter(e => e.tipo === 'cliente').length,
      pendentes: entregas.filter(e => e.tipo === 'cliente' && ['pendente', 'em_preparacao', 'enviado'].includes(e.status)).length,
      aprovadas: entregas.filter(e => e.tipo === 'cliente' && e.status === 'aprovado').length
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'entregue':
      case 'aprovado':
        return <CheckCircle size={14} />
      case 'enviado':
        return <Send size={14} />
      case 'em_preparacao':
        return <Clock size={14} />
      case 'rejeitado':
        return <AlertCircle size={14} />
      default:
        return <Clock size={14} />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: '48px' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--brown-light)' }} />
        <span style={{ marginLeft: '12px', color: 'var(--brown-light)' }}>A carregar...</span>
      </div>
    )
  }

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-2" style={{ gap: '16px', marginBottom: '24px' }}>
        <div
          className="card"
          onClick={() => setActiveSection('interna')}
          style={{
            cursor: 'pointer',
            border: activeSection === 'interna' ? '2px solid var(--brown)' : '1px solid var(--stone)',
            transition: 'all 0.2s'
          }}
        >
          <div className="flex items-center gap-md">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>
                {stats.interna.total}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Entregas Internas
              </div>
            </div>
          </div>
          <div className="flex gap-md" style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--warning)' }}>
              {stats.interna.pendentes} pendentes
            </span>
            <span style={{ fontSize: '12px', color: 'var(--success)' }}>
              {stats.interna.entregues} entregues
            </span>
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveSection('cliente')}
          style={{
            cursor: 'pointer',
            border: activeSection === 'cliente' ? '2px solid var(--brown)' : '1px solid var(--stone)',
            transition: 'all 0.2s'
          }}
        >
          <div className="flex items-center gap-md">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>
                {stats.cliente.total}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Entregas ao Cliente
              </div>
            </div>
          </div>
          <div className="flex gap-md" style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--warning)' }}>
              {stats.cliente.pendentes} pendentes
            </span>
            <span style={{ fontSize: '12px', color: 'var(--success)' }}>
              {stats.cliente.aprovadas} aprovadas
            </span>
          </div>
        </div>
      </div>

      {/* Header da secção */}
      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
            {activeSection === 'interna' ? 'Entregas Internas' : 'Entregas ao Cliente'}
          </h3>
          <button
            onClick={() => {
              resetForm()
              setEditingItem(null)
              setShowModal(true)
            }}
            className="btn btn-primary flex items-center gap-sm"
            style={{ padding: '10px 16px' }}
          >
            <Plus size={16} />
            Nova Entrega
          </button>
        </div>

        {/* Lista de entregas */}
        {filteredEntregas.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            color: 'var(--brown-light)',
            background: 'var(--cream)',
            borderRadius: '12px'
          }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>Nenhuma entrega {activeSection === 'interna' ? 'interna' : 'ao cliente'} registada.</p>
            <button
              onClick={() => {
                resetForm()
                setEditingItem(null)
                setShowModal(true)
              }}
              className="btn btn-secondary"
              style={{ marginTop: '16px' }}
            >
              <Plus size={16} style={{ marginRight: '8px' }} />
              Adicionar Entrega
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredEntregas.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '16px',
                  background: 'var(--cream)',
                  borderRadius: '12px',
                  border: '1px solid var(--stone)'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-md" style={{ flex: 1 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: statusConfig[item.status]?.bg || 'var(--stone)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: statusConfig[item.status]?.color || 'var(--brown-light)'
                    }}>
                      {getStatusIcon(item.status)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
                        {item.titulo}
                      </div>
                      {item.descricao && (
                        <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>
                          {item.descricao}
                        </div>
                      )}
                      <div className="flex items-center gap-md" style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                        {item.destinatario && (
                          <span className="flex items-center gap-xs">
                            <User size={12} />
                            {item.destinatario}
                          </span>
                        )}
                        {item.data_prevista && (
                          <span className="flex items-center gap-xs">
                            <Calendar size={12} />
                            Previsto: {new Date(item.data_prevista).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                        {item.data_entrega && (
                          <span className="flex items-center gap-xs" style={{ color: 'var(--success)' }}>
                            <CheckCircle size={12} />
                            Entregue: {new Date(item.data_entrega).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                        {item.documentos && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))
                            }}
                            className="flex items-center gap-xs"
                            style={{
                              color: 'var(--info)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            <Paperclip size={12} />
                            {item.documentos.split(',').length} anexo(s)
                            {expandedItems[item.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-sm">
                    {/* Status badge */}
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 500,
                      background: statusConfig[item.status]?.bg || 'var(--stone)',
                      color: statusConfig[item.status]?.color || 'var(--brown-light)'
                    }}>
                      {statusConfig[item.status]?.label || item.status}
                    </span>

                    {/* Quick actions */}
                    <div className="flex items-center gap-xs">
                      {item.status === 'pendente' && (
                        <button
                          onClick={() => updateStatus(item, 'em_preparacao')}
                          title="Iniciar preparação"
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--info)'
                          }}
                        >
                          <Clock size={16} />
                        </button>
                      )}
                      {item.status === 'em_preparacao' && (
                        <button
                          onClick={() => updateStatus(item, activeSection === 'cliente' ? 'enviado' : 'entregue')}
                          title={activeSection === 'cliente' ? 'Marcar como enviado' : 'Marcar como entregue'}
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--success)'
                          }}
                        >
                          <Send size={16} />
                        </button>
                      )}
                      {item.status === 'enviado' && activeSection === 'cliente' && (
                        <>
                          <button
                            onClick={() => updateStatus(item, 'aprovado')}
                            title="Marcar como aprovado"
                            style={{
                              padding: '6px',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: 'var(--success)'
                            }}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => updateStatus(item, 'rejeitado')}
                            title="Marcar como rejeitado"
                            style={{
                              padding: '6px',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: 'var(--error)'
                            }}
                          >
                            <AlertCircle size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(item)}
                        title="Editar"
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: 'var(--brown-light)'
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        title="Eliminar"
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: 'var(--error)'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded documents section */}
                {expandedItems[item.id] && item.documentos && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--stone)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brown-light)' }}>
                      Documentos anexados:
                    </span>
                    {item.documentos.split(',').map((doc, idx) => {
                      const docUrl = doc.trim()
                      const docName = docUrl.split('/').pop() || `Documento ${idx + 1}`
                      const isPdf = isPdfFile(docUrl)
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'white',
                            border: '1px solid var(--stone)',
                            borderRadius: '8px'
                          }}
                        >
                          <div className="flex items-center gap-sm" style={{ flex: 1, minWidth: 0 }}>
                            <File size={16} style={{ color: isPdf ? '#EF4444' : 'var(--brown-light)', flexShrink: 0 }} />
                            <span style={{
                              fontSize: '13px',
                              color: 'var(--brown)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {docName}
                            </span>
                            {isPdf && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                                flexShrink: 0
                              }}>
                                PDF
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-xs">
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver documento"
                              style={{
                                padding: '6px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                color: 'var(--brown-light)',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <ExternalLink size={14} />
                            </a>
                            {isPdf && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openConvertModal(item, docUrl)
                                }}
                                title="Converter para Design Review"
                                style={{
                                  padding: '6px 10px',
                                  background: 'var(--brown)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500
                                }}
                              >
                                <FileSearch size={14} />
                                Design Review
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Adicionar/Editar */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--stone)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                {editingItem ? 'Editar Entrega' : 'Nova Entrega'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingItem(null)
                  resetForm()
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown-light)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tipo */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Tipo de Entrega
                </label>
                <div className="flex gap-sm">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'interna' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: formData.tipo === 'interna' ? '2px solid var(--brown)' : '1px solid var(--stone)',
                      borderRadius: '8px',
                      background: formData.tipo === 'interna' ? 'var(--cream)' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: formData.tipo === 'interna' ? 600 : 400,
                      color: 'var(--brown)'
                    }}
                  >
                    <Users size={16} />
                    Interna
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'cliente', destinatario: projeto?.cliente?.nome || '' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: formData.tipo === 'cliente' ? '2px solid var(--brown)' : '1px solid var(--stone)',
                      borderRadius: '8px',
                      background: formData.tipo === 'cliente' ? 'var(--cream)' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: formData.tipo === 'cliente' ? 600 : 400,
                      color: 'var(--brown)'
                    }}
                  >
                    <Building2 size={16} />
                    Cliente
                  </button>
                </div>
              </div>

              {/* Título */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Apresentação Conceito Fase 1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Descrição */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição da entrega..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Destinatário */}
              <div ref={destRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Destinatário
                </label>
                {formData.tipo === 'cliente' ? (
                  <input
                    type="text"
                    value={formData.destinatario}
                    onChange={(e) => setFormData({ ...formData, destinatario: e.target.value, destinatario_id: null })}
                    placeholder="Nome do cliente"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        border: '1px solid var(--stone)',
                        borderRadius: '8px',
                        cursor: 'text',
                        background: 'var(--white)'
                      }}
                      onClick={() => setShowDestDropdown(true)}
                    >
                      {selectedDestUser ? (
                        <>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-olive), var(--accent-olive-dark))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 600, color: 'white', flexShrink: 0
                          }}>
                            {selectedDestUser.avatar_url
                              ? <img src={selectedDestUser.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              : selectedDestUser.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                            }
                          </div>
                          <span style={{ fontSize: '14px', color: 'var(--brown)', flex: 1 }}>
                            {selectedDestUser.nome}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDestUser(null)
                              setFormData(prev => ({ ...prev, destinatario: '', destinatario_id: null }))
                              setDestQuery('')
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--brown-light)' }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={destQuery}
                          onChange={(e) => {
                            setDestQuery(e.target.value)
                            setShowDestDropdown(true)
                          }}
                          onFocus={() => setShowDestDropdown(true)}
                          placeholder="Pesquisar pessoa..."
                          style={{
                            border: 'none',
                            outline: 'none',
                            width: '100%',
                            fontSize: '14px',
                            background: 'transparent'
                          }}
                        />
                      )}
                    </div>
                    {showDestDropdown && !selectedDestUser && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: 'var(--white)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--stone)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 50
                      }}>
                        {teamMembers
                          .filter(m => !destQuery || m.nome?.toLowerCase().includes(destQuery.toLowerCase()))
                          .map(m => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedDestUser(m)
                                setFormData(prev => ({ ...prev, destinatario: m.nome, destinatario_id: m.id }))
                                setShowDestDropdown(false)
                                setDestQuery('')
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                cursor: 'pointer',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-olive), var(--accent-olive-dark))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', fontWeight: 600, color: 'white', flexShrink: 0
                              }}>
                                {m.avatar_url
                                  ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                  : m.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                }
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>{m.nome}</div>
                                {m.funcao && <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{m.funcao}</div>}
                              </div>
                            </div>
                          ))
                        }
                        {teamMembers.filter(m => !destQuery || m.nome?.toLowerCase().includes(destQuery.toLowerCase())).length === 0 && (
                          <div style={{ padding: '12px', fontSize: '13px', color: 'var(--brown-light)', textAlign: 'center' }}>
                            Nenhum resultado
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Datas */}
              <div className="grid grid-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    value={formData.data_prevista}
                    onChange={(e) => setFormData({ ...formData, data_prevista: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                    Data de Entrega
                  </label>
                  <input
                    type="date"
                    value={formData.data_entrega}
                    onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Notas adicionais..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Anexos */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Anexos
                </label>

                {/* Upload area */}
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    border: '2px dashed var(--stone)',
                    borderRadius: '8px',
                    background: 'var(--cream)',
                    cursor: uploading ? 'wait' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => !uploading && (e.currentTarget.style.borderColor = 'var(--brown-light)')}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--stone)'}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar"
                  />
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={24} style={{ color: 'var(--brown-light)', marginBottom: '8px' }} />
                      <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>A carregar ficheiros...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={24} style={{ color: 'var(--brown-light)', marginBottom: '8px' }} />
                      <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Clique para anexar ficheiros</span>
                      <span style={{ fontSize: '11px', color: 'var(--brown-light)', opacity: 0.7, marginTop: '4px' }}>
                        PDF, DOC, XLS, PPT, Imagens, ZIP
                      </span>
                    </>
                  )}
                </label>

                {/* Lista de ficheiros */}
                {uploadedFiles.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'white',
                          border: '1px solid var(--stone)',
                          borderRadius: '6px'
                        }}
                      >
                        <div className="flex items-center gap-sm" style={{ flex: 1, minWidth: 0 }}>
                          <File size={16} style={{ color: 'var(--brown-light)', flexShrink: 0 }} />
                          <span style={{
                            fontSize: '13px',
                            color: 'var(--brown)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {file.name}
                          </span>
                          {file.local && (
                            <span style={{
                              fontSize: '10px',
                              color: 'var(--warning)',
                              background: 'rgba(201, 168, 130, 0.2)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              flexShrink: 0
                            }}>
                              Local
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--error)',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--stone)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingItem(null)
                  resetForm()
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex items-center gap-sm"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {editingItem ? 'Guardar' : 'Criar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Converter para Design Review */}
      {showConvertModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '450px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--stone)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Converter para Design Review
              </h3>
              <button
                onClick={() => {
                  setShowConvertModal(false)
                  setConvertFile(null)
                  setConvertEntrega(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown-light)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Info about source */}
              <div style={{
                padding: '12px',
                background: 'var(--cream)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <FileSearch size={24} style={{ color: 'var(--brown)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                    {convertFile?.split('/').pop() || 'Documento PDF'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                    Da entrega: {convertEntrega?.titulo}
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Nome do Documento *
                </label>
                <input
                  type="text"
                  value={convertName}
                  onChange={(e) => setConvertName(e.target.value)}
                  placeholder="Ex: Planta Piso 0"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Código */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Código do Documento
                </label>
                <input
                  type="text"
                  value={convertCodigo}
                  onChange={(e) => setConvertCodigo(e.target.value)}
                  placeholder="Ex: 01.01.01"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Info */}
              <div style={{
                padding: '12px',
                background: 'rgba(138, 158, 184, 0.15)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--brown-light)'
              }}>
                <strong>O que acontece:</strong>
                <ul style={{ margin: '8px 0 0 16px', paddingLeft: 0 }}>
                  <li>Será criado um novo Design Review</li>
                  <li>O PDF será a versão 1 do review</li>
                  <li>Poderá adicionar anotações e comentários</li>
                </ul>
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--stone)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowConvertModal(false)
                  setConvertFile(null)
                  setConvertEntrega(null)
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleConvertToDesignReview}
                disabled={convertingToReview || !convertName.trim()}
                className="btn btn-primary flex items-center gap-sm"
              >
                {convertingToReview ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}
                Criar Design Review
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  )
}
