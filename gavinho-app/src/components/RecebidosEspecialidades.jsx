import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, FileText, Edit2, Trash2, Save, X, Calendar, User, CheckCircle,
  Clock, AlertCircle, Download, Upload, ChevronRight, ChevronDown,
  Loader2, Eye, Zap, Thermometer, Layers, Building2, Droplets, Shield,
  FileSpreadsheet, Paperclip, ExternalLink, RefreshCw
} from 'lucide-react'

// Configuração das especialidades
const especialidadeConfig = {
  'estrutura': { label: 'Estrutura', icon: Building2, color: '#8B5A2B' },
  'avac': { label: 'AVAC', icon: Thermometer, color: '#4A90A4' },
  'eletrico': { label: 'Elétrico', icon: Zap, color: '#D4A017' },
  'hidraulico': { label: 'Hidráulico', icon: Droplets, color: '#3498DB' },
  'arquitetura': { label: 'Arquitetura', icon: Layers, color: '#7A9E7A' },
  'seguranca': { label: 'Segurança', icon: Shield, color: '#C75050' },
  'outros': { label: 'Outros', icon: FileText, color: '#8A9EB8' }
}

const statusConfig = {
  'aprovado': { label: 'Aprovado', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  'em_revisao': { label: 'Em Revisão', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.15)' },
  'desatualizado': { label: 'Desatualizado', color: 'var(--error)', bg: 'rgba(180, 100, 100, 0.15)' },
  'pendente': { label: 'Pendente', color: 'var(--brown-light)', bg: 'var(--stone)' }
}

export default function RecebidosEspecialidades({ projeto }) {
  const [recebidos, setRecebidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedEspecialidades, setExpandedEspecialidades] = useState({})
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    especialidade: 'estrutura',
    codigo: '',
    descricao: '',
    origem: '',
    data_recebido: '',
    revisao: '',
    status: 'pendente',
    ficheiro_url: '',
    ficheiro_nome: '',
    observacoes: ''
  })

  useEffect(() => {
    if (projeto?.id) {
      loadRecebidos()
    }
  }, [projeto?.id])

  const loadRecebidos = async () => {
    try {
      const { data, error } = await supabase
        .from('projeto_recebidos')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('data_recebido', { ascending: false })

      if (error) {
        // If table doesn't exist, use sample data
        if (error.code === '42P01') {
          setRecebidos(getSampleData())
        } else {
          throw error
        }
      } else {
        setRecebidos(data || [])
      }
    } catch (err) {
      console.error('Erro ao carregar recebidos:', err)
      setRecebidos(getSampleData())
    } finally {
      setLoading(false)
    }
  }

  const getSampleData = () => [
    {
      id: 'sample-1',
      especialidade: 'estrutura',
      codigo: 'EST.001',
      descricao: 'Planta de Fundações',
      origem: 'Eng. Silva & Associados',
      data_recebido: '2025-08-10',
      revisao: 'R02',
      status: 'aprovado',
      ficheiro_nome: 'fundacoes_r02.pdf'
    },
    {
      id: 'sample-2',
      especialidade: 'estrutura',
      codigo: 'EST.002',
      descricao: 'Planta Piso 0 - Estrutural',
      origem: 'Eng. Silva & Associados',
      data_recebido: '2025-08-12',
      revisao: 'R01',
      status: 'em_revisao',
      ficheiro_nome: 'piso0_estrutural_r01.pdf'
    },
    {
      id: 'sample-3',
      especialidade: 'avac',
      codigo: 'AVAC.001',
      descricao: 'Sistema de Climatização - Geral',
      origem: 'ClimaConfort Lda',
      data_recebido: '2025-08-08',
      revisao: 'R01',
      status: 'pendente',
      ficheiro_nome: 'avac_geral_r01.pdf'
    },
    {
      id: 'sample-4',
      especialidade: 'eletrico',
      codigo: 'ELEC.001',
      descricao: 'Quadro Elétrico Principal',
      origem: 'ElectroTech',
      data_recebido: '2025-08-05',
      revisao: 'R03',
      status: 'aprovado',
      ficheiro_nome: 'qe_principal_r03.pdf'
    },
    {
      id: 'sample-5',
      especialidade: 'hidraulico',
      codigo: 'HID.001',
      descricao: 'Rede de Águas e Esgotos',
      origem: 'HidroProj',
      data_recebido: '2025-07-28',
      revisao: 'R01',
      status: 'desatualizado',
      ficheiro_nome: 'aguas_esgotos_r01.pdf'
    }
  ]

  const resetForm = () => {
    setFormData({
      especialidade: 'estrutura',
      codigo: '',
      descricao: '',
      origem: '',
      data_recebido: new Date().toISOString().split('T')[0],
      revisao: 'R01',
      status: 'pendente',
      ficheiro_url: '',
      ficheiro_nome: '',
      observacoes: ''
    })
    setUploadedFile(null)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      especialidade: item.especialidade || 'estrutura',
      codigo: item.codigo || '',
      descricao: item.descricao || '',
      origem: item.origem || '',
      data_recebido: item.data_recebido || '',
      revisao: item.revisao || '',
      status: item.status || 'pendente',
      ficheiro_url: item.ficheiro_url || '',
      ficheiro_nome: item.ficheiro_nome || '',
      observacoes: item.observacoes || ''
    })
    setUploadedFile(null)
    setShowModal(true)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `recebidos/${projeto.id}/${fileName}`

      const { data, error } = await supabase.storage
        .from('projeto-files')
        .upload(filePath, file)

      if (error) {
        console.error('Erro ao fazer upload:', error)
        // Still track file info for demo
        setUploadedFile({
          name: file.name,
          url: URL.createObjectURL(file),
          local: true
        })
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('projeto-files')
          .getPublicUrl(filePath)

        setUploadedFile({
          name: file.name,
          url: publicUrl,
          path: filePath
        })
      }
    } catch (err) {
      console.error('Erro no upload:', err)
      setUploadedFile({
        name: file.name,
        url: URL.createObjectURL(file),
        local: true
      })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!formData.codigo.trim() || !formData.descricao.trim()) {
      alert('Código e Descrição são obrigatórios')
      return
    }

    setSaving(true)
    try {
      const itemData = {
        projeto_id: projeto.id,
        especialidade: formData.especialidade,
        codigo: formData.codigo.trim(),
        descricao: formData.descricao.trim(),
        origem: formData.origem || null,
        data_recebido: formData.data_recebido || null,
        revisao: formData.revisao || null,
        status: formData.status,
        ficheiro_url: uploadedFile?.url || formData.ficheiro_url || null,
        ficheiro_nome: uploadedFile?.name || formData.ficheiro_nome || null,
        observacoes: formData.observacoes || null
      }

      if (editingItem && !editingItem.id.startsWith('sample-')) {
        const { error } = await supabase
          .from('projeto_recebidos')
          .update(itemData)
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projeto_recebidos')
          .insert([itemData])
        if (error) throw error
      }

      setShowModal(false)
      setEditingItem(null)
      resetForm()
      loadRecebidos()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Eliminar "${item.codigo} - ${item.descricao}"?`)) return

    if (item.id.startsWith('sample-')) {
      setRecebidos(prev => prev.filter(r => r.id !== item.id))
      return
    }

    try {
      const { error } = await supabase
        .from('projeto_recebidos')
        .delete()
        .eq('id', item.id)

      if (error) throw error
      loadRecebidos()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert('Erro ao eliminar: ' + err.message)
    }
  }

  const updateStatus = async (item, newStatus) => {
    if (item.id.startsWith('sample-')) {
      setRecebidos(prev => prev.map(r =>
        r.id === item.id ? { ...r, status: newStatus } : r
      ))
      return
    }

    try {
      const { error } = await supabase
        .from('projeto_recebidos')
        .update({ status: newStatus })
        .eq('id', item.id)

      if (error) throw error
      loadRecebidos()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
    }
  }

  const toggleEspecialidade = (esp) => {
    setExpandedEspecialidades(prev => ({ ...prev, [esp]: !prev[esp] }))
  }

  const addToEspecialidade = (especialidade) => {
    resetForm()
    setFormData(prev => ({ ...prev, especialidade }))
    setEditingItem(null)
    setShowModal(true)
  }

  // Agrupar por especialidade
  const groupedByEspecialidade = Object.keys(especialidadeConfig).reduce((acc, esp) => {
    acc[esp] = recebidos.filter(r => r.especialidade === esp)
    return acc
  }, {})

  // Calcular estatísticas
  const stats = {
    total: recebidos.length,
    aprovados: recebidos.filter(r => r.status === 'aprovado').length,
    emRevisao: recebidos.filter(r => r.status === 'em_revisao').length,
    desatualizados: recebidos.filter(r => r.status === 'desatualizado').length,
    pendentes: recebidos.filter(r => r.status === 'pendente').length
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header com Stats */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Desenhos Recebidos</h3>
            <p style={{ fontSize: '12px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
              {stats.total} documentos de especialidades externas
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { resetForm(); setEditingItem(null); setShowModal(true) }}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '8px 12px' }}
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {/* Stats badges */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }} />
            Aprovados: {stats.aprovados}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--warning)' }} />
            Em Revisão: {stats.emRevisao}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--error)' }} />
            Desatualizados: {stats.desatualizados}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--brown-light)' }} />
            Pendentes: {stats.pendentes}
          </span>
        </div>
      </div>

      {/* Lista por Especialidade */}
      {recebidos.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ margin: 0 }}>Nenhum documento recebido</p>
          <p style={{ fontSize: '12px', margin: '8px 0 0' }}>Adicione documentos de especialidades externas</p>
          <button
            onClick={() => { resetForm(); setEditingItem(null); setShowModal(true) }}
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
          >
            <Plus size={16} /> Adicionar Documento
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(especialidadeConfig).map(([espKey, espConfig]) => {
            const items = groupedByEspecialidade[espKey] || []
            if (items.length === 0) return null

            const EspIcon = espConfig.icon
            const aprovados = items.filter(i => i.status === 'aprovado').length

            return (
              <div key={espKey} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header da Especialidade */}
                <div
                  style={{
                    padding: '14px 20px',
                    background: `linear-gradient(135deg, ${espConfig.color}20 0%, ${espConfig.color}10 100%)`,
                    borderLeft: `4px solid ${espConfig.color}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div
                    onClick={() => toggleEspecialidade(espKey)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
                  >
                    {expandedEspecialidades[espKey] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <EspIcon size={20} style={{ color: espConfig.color }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                        {espConfig.label}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                        {items.length} documentos  –  {aprovados} aprovados
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      addToEspecialidade(espKey)
                    }}
                    title={`Adicionar documento de ${espConfig.label}`}
                    style={{
                      background: espConfig.color,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Lista de Documentos */}
                {expandedEspecialidades[espKey] && (
                  <div style={{ padding: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--stone)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Código</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Descrição</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Origem</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Data</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Rev.</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Status</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Ficheiro</th>
                          <th style={{ padding: '8px 12px', width: '80px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '')).map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--stone)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 500, color: espConfig.color }}>
                              {item.codigo}
                            </td>
                            <td style={{ padding: '10px 12px' }}>{item.descricao}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--brown-light)' }}>
                              {item.origem || '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>
                              {item.data_recebido ? new Date(item.data_recebido).toLocaleDateString('pt-PT') : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                background: 'var(--cream)',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}>
                                {item.revisao || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <select
                                value={item.status}
                                onChange={(e) => updateStatus(item, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  border: 'none',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: statusConfig[item.status]?.bg,
                                  color: statusConfig[item.status]?.color,
                                  cursor: 'pointer',
                                  appearance: 'none',
                                  textAlign: 'center',
                                  minWidth: '90px'
                                }}
                              >
                                {Object.entries(statusConfig).map(([key, config]) => (
                                  <option key={key} value={key}>{config.label}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {item.ficheiro_nome ? (
                                <a
                                  href={item.ficheiro_url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: 'var(--info)',
                                    textDecoration: 'none',
                                    fontSize: '11px'
                                  }}
                                  title={item.ficheiro_nome}
                                >
                                  <Paperclip size={14} />
                                </a>
                              ) : (
                                <span style={{ color: 'var(--stone)' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="btn btn-ghost btn-icon"
                                  style={{ padding: '4px' }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="btn btn-ghost btn-icon"
                                  style={{ padding: '4px', color: 'var(--error)' }}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      {showModal && (
        <div
          style={{
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
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '500px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--stone)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                {editingItem ? 'Editar Documento' : 'Novo Documento Recebido'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown-light)',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Especialidade */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Especialidade *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.entries(especialidadeConfig).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, especialidade: key })}
                        style={{
                          padding: '8px 12px',
                          border: formData.especialidade === key ? `2px solid ${config.color}` : '1px solid var(--stone)',
                          borderRadius: '8px',
                          background: formData.especialidade === key ? `${config.color}15` : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: formData.especialidade === key ? 600 : 400,
                          color: formData.especialidade === key ? config.color : 'var(--brown)'
                        }}
                      >
                        <Icon size={14} />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Código e Revisão */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ex: EST.001"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                    Revisão
                  </label>
                  <input
                    type="text"
                    value={formData.revisao}
                    onChange={(e) => setFormData({ ...formData, revisao: e.target.value })}
                    placeholder="R01"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Planta de Fundações"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Origem e Data */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                    Origem (Fornecedor/Empresa)
                  </label>
                  <input
                    type="text"
                    value={formData.origem}
                    onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                    placeholder="Ex: Eng. Silva & Associados"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                    Data Recebido
                  </label>
                  <input
                    type="date"
                    value={formData.data_recebido}
                    onChange={(e) => setFormData({ ...formData, data_recebido: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
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
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* Ficheiro */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px' }}>
                  Ficheiro
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx"
                  style={{ display: 'none' }}
                />

                {(uploadedFile || formData.ficheiro_nome) ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--cream)',
                    borderRadius: '8px',
                    border: '1px solid var(--stone)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Paperclip size={16} style={{ color: 'var(--info)' }} />
                      <span style={{ fontSize: '13px' }}>
                        {uploadedFile?.name || formData.ficheiro_nome}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null)
                        setFormData({ ...formData, ficheiro_url: '', ficheiro_nome: '' })
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--error)',
                        padding: '4px'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      width: '100%',
                      padding: '16px',
                      border: '2px dashed var(--stone)',
                      borderRadius: '8px',
                      background: 'var(--cream)',
                      cursor: uploading ? 'wait' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {uploading ? (
                      <Loader2 size={20} className="spin" style={{ color: 'var(--brown-light)' }} />
                    ) : (
                      <Upload size={20} style={{ color: 'var(--brown-light)' }} />
                    )}
                    <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                      {uploading ? 'A carregar...' : 'Clique para anexar ficheiro'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--brown-light)', opacity: 0.7 }}>
                      PDF, DWG, DXF, DOC, XLS
                    </span>
                  </button>
                )}
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
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--stone)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: 'var(--cream)'
            }}>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.codigo.trim() || !formData.descricao.trim()}
                className="btn btn-primary"
              >
                {saving ? <Loader2 size={16} className="spin" /> : <><Save size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
