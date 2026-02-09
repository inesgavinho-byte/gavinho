import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import {
  FileText, Plus, X, Calendar, Edit2, Trash2, Send, Save, Clock, Loader2,
  CheckCircle, FileEdit, ChevronDown, Camera, Upload,
  ListOrdered, MessageSquare, AlertTriangle, ClipboardList, Eye
} from 'lucide-react'
import PortalToggle from './PortalToggle'

const TIPOS_RELATORIO = [
  { id: 'semanal', label: 'Semanal' },
  { id: 'quinzenal', label: 'Quinzenal' },
  { id: 'mensal', label: 'Mensal' },
  { id: 'milestone', label: 'Milestone' }
]

const ESTADOS_RELATORIO = {
  rascunho: { label: 'Rascunho', cor: '#6B7280', icon: FileEdit },
  em_revisao: { label: 'Em Revisão', cor: '#F59E0B', icon: Clock },
  publicado: { label: 'Publicado', cor: '#10B981', icon: CheckCircle }
}

export default function ObraRelatorios({ obra }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null })
  const [relatorios, setRelatorios] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [fotografias, setFotografias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [editingRelatorio, setEditingRelatorio] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({})

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Form básico
  const [formData, setFormData] = useState({
    titulo: '', tipo: 'semanal', data_inicio: '', data_fim: ''
  })

  // Form editor
  const [editorData, setEditorData] = useState({
    resumo_executivo: '', trabalhos_realizados: '', trabalhos_proxima_semana: '',
    problemas_identificados: '', decisoes_pendentes: '', observacoes: '',
    progresso_global: 0, progresso_por_especialidade: {},
    topicos: [], // { titulo, descricao, tipo }
    fotos_relatorio: [], // { url, legenda }
    publicar_no_portal: false, resumo_portal: ''
  })

  useEffect(() => {
    if (obra?.id) loadData()
  }, [obra?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [relatoriosRes, especRes, fotosRes] = await Promise.all([
        supabase.from('obra_relatorios').select('*').eq('obra_id', obra.id)
          .order('data_fim', { ascending: false }),
        supabase.from('especialidades').select('*').eq('ativo', true).order('ordem'),
        supabase.from('obra_fotografias').select('id, url, titulo, data_fotografia')
          .eq('obra_id', obra.id).order('data_fotografia', { ascending: false }).limit(100)
      ])
      setRelatorios(relatoriosRes.data || [])
      setEspecialidades(especRes.data || [])
      setFotografias(fotosRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateCodigo = () => `REL-${String(relatorios.length + 1).padStart(3, '0')}`

  const handleCreate = async () => {
    if (!formData.titulo || !formData.data_inicio || !formData.data_fim) {
      toast.warning('Atenção', 'Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('obra_relatorios')
        .insert({
          obra_id: obra.id, codigo: generateCodigo(), titulo: formData.titulo,
          tipo: formData.tipo, data_inicio: formData.data_inicio,
          data_fim: formData.data_fim, estado: 'rascunho'
        }).select().single()
      if (error) throw error
      setShowModal(false)
      setFormData({ titulo: '', tipo: 'semanal', data_inicio: '', data_fim: '' })
      loadData()
      handleEdit(data)
    } catch (err) {
      toast.error('Erro', 'Erro ao criar relatório: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (relatorio) => {
    setEditingRelatorio(relatorio)
    setEditorData({
      resumo_executivo: relatorio.resumo_executivo || '',
      trabalhos_realizados: relatorio.trabalhos_realizados || '',
      trabalhos_proxima_semana: relatorio.trabalhos_proxima_semana || '',
      problemas_identificados: relatorio.problemas_identificados || '',
      decisoes_pendentes: relatorio.decisoes_pendentes || '',
      observacoes: relatorio.observacoes || '',
      progresso_global: relatorio.progresso_global || 0,
      progresso_por_especialidade: relatorio.progresso_por_especialidade || {},
      topicos: relatorio.topicos || [],
      fotos_relatorio: relatorio.fotos_relatorio || [],
      publicar_no_portal: relatorio.publicar_no_portal || false,
      resumo_portal: relatorio.resumo_portal || ''
    })
    setCollapsedSections({})
    setShowEditorModal(true)
  }

  const handleSave = async (publish = false) => {
    if (!editingRelatorio) return
    setSaving(true)
    try {
      const updateData = {
        resumo_executivo: editorData.resumo_executivo || null,
        trabalhos_realizados: editorData.trabalhos_realizados || null,
        trabalhos_proxima_semana: editorData.trabalhos_proxima_semana || null,
        problemas_identificados: editorData.problemas_identificados || null,
        decisoes_pendentes: editorData.decisoes_pendentes || null,
        observacoes: editorData.observacoes || null,
        progresso_global: editorData.progresso_global,
        progresso_por_especialidade: editorData.progresso_por_especialidade,
        topicos: editorData.topicos.length > 0 ? editorData.topicos : null,
        fotos_relatorio: editorData.fotos_relatorio.length > 0 ? editorData.fotos_relatorio : null,
        publicar_no_portal: editorData.publicar_no_portal,
        resumo_portal: editorData.resumo_portal || null
      }
      if (publish) {
        updateData.estado = 'publicado'
        updateData.data_publicacao = new Date().toISOString()
      }
      const { error } = await supabase.from('obra_relatorios')
        .update(updateData).eq('id', editingRelatorio.id)
      if (error) throw error
      toast.success(publish ? 'Relatório publicado' : 'Rascunho guardado')
      setShowEditorModal(false)
      setEditingRelatorio(null)
      loadData()
    } catch (err) {
      toast.error('Erro', 'Erro ao guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (relatorio) => {
    setConfirmModal({
      isOpen: true, title: 'Apagar Relatório',
      message: 'Tem certeza que deseja apagar este relatório?', type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('obra_relatorios').delete().eq('id', relatorio.id)
          if (error) throw error
          loadData()
        } catch (err) {
          toast.error('Erro', 'Erro ao apagar relatório')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  // Topics management
  const addTopico = () => {
    setEditorData(prev => ({
      ...prev,
      topicos: [...prev.topicos, { titulo: '', descricao: '', tipo: 'info' }]
    }))
  }

  const updateTopico = (index, field, value) => {
    setEditorData(prev => ({
      ...prev,
      topicos: prev.topicos.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }))
  }

  const removeTopico = (index) => {
    setEditorData(prev => ({
      ...prev, topicos: prev.topicos.filter((_, i) => i !== index)
    }))
  }

  // Photo upload for report
  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploadingFoto(true)
    try {
      for (const file of files) {
        const fileName = `${obra.codigo}/relatorios/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage.from('obras').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('obras').getPublicUrl(fileName)
        setEditorData(prev => ({
          ...prev,
          fotos_relatorio: [...prev.fotos_relatorio, { url: publicUrl, legenda: file.name.replace(/\.[^/.]+$/, '') }]
        }))
      }
    } catch (err) {
      toast.error('Erro', 'Erro ao fazer upload')
    } finally {
      setUploadingFoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeFotoRelatorio = (index) => {
    setEditorData(prev => ({
      ...prev, fotos_relatorio: prev.fotos_relatorio.filter((_, i) => i !== index)
    }))
  }

  const addFotoFromGallery = (foto) => {
    if (editorData.fotos_relatorio.some(f => f.url === foto.url)) return
    setEditorData(prev => ({
      ...prev,
      fotos_relatorio: [...prev.fotos_relatorio, { url: foto.url, legenda: foto.titulo || '' }]
    }))
  }

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const relatoriosFiltrados = relatorios.filter(rel => {
    if (filtroTipo && rel.tipo !== filtroTipo) return false
    if (filtroEstado && rel.estado !== filtroEstado) return false
    return true
  })

  const formatDateRange = (inicio, fim) => {
    if (!inicio || !fim) return ''
    const i = new Date(inicio)
    const f = new Date(fim)
    const s = { day: 'numeric', month: 'short' }
    const l = { day: 'numeric', month: 'short', year: 'numeric' }
    return i.getFullYear() === f.getFullYear()
      ? `${i.toLocaleDateString('pt-PT', s)} – ${f.toLocaleDateString('pt-PT', l)}`
      : `${i.toLocaleDateString('pt-PT', l)} – ${f.toLocaleDateString('pt-PT', l)}`
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ADAA96' }}>
        <Loader2 className="spin" size={24} style={{ marginBottom: '8px' }} />
        <p>A carregar relatórios...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#3D3D3D' }}>Relatórios de Obra</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#ADAA96' }}>
            {relatorios.length} {relatorios.length === 1 ? 'relatório' : 'relatórios'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={S.addBtn}><Plus size={14} /> Novo Relatório</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={S.selectInput}>
          <option value="">Todos os tipos</option>
          {TIPOS_RELATORIO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={S.selectInput}>
          <option value="">Todos os estados</option>
          {Object.entries(ESTADOS_RELATORIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filtroTipo || filtroEstado) && (
          <button onClick={() => { setFiltroTipo(''); setFiltroEstado('') }}
            style={{ fontSize: '11px', color: '#ADAA96', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Limpar
          </button>
        )}
      </div>

      {/* Report List */}
      {relatoriosFiltrados.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FAFAF8', borderRadius: '12px', border: '1px solid #E5E2D9' }}>
          <FileText size={48} style={{ color: '#ADAA96', opacity: 0.4, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#3D3D3D', fontSize: '15px' }}>Sem relatórios</h3>
          <p style={{ color: '#8B8670', margin: 0, fontSize: '13px' }}>Crie o primeiro relatório para documentar o progresso da obra</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {relatoriosFiltrados.map(rel => {
            const ec = ESTADOS_RELATORIO[rel.estado] || ESTADOS_RELATORIO.rascunho
            const EI = ec.icon
            const topicCount = (rel.topicos || []).length
            const fotoCount = (rel.fotos_relatorio || []).length
            return (
              <div key={rel.id} style={S.reportCard}>
                <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                  {/* Left accent */}
                  <div style={{ width: '4px', borderRadius: '2px', background: ec.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Top line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#ADAA96', fontFamily: 'monospace' }}>{rel.codigo}</span>
                      <span style={{ ...S.pill, background: `${ec.cor}15`, color: ec.cor }}>
                        <EI size={10} /> {ec.label}
                      </span>
                      <span style={{ ...S.pill, background: '#F5F3EB', color: '#8B8670' }}>
                        {TIPOS_RELATORIO.find(t => t.id === rel.tipo)?.label}
                      </span>
                    </div>
                    {/* Title */}
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#3D3D3D' }}>{rel.titulo}</h4>
                    {/* Date */}
                    <div style={{ fontSize: '12px', color: '#ADAA96', marginBottom: rel.progresso_global > 0 ? '10px' : '0' }}>
                      <Calendar size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {formatDateRange(rel.data_inicio, rel.data_fim)}
                      {topicCount > 0 && <span style={{ marginLeft: '12px' }}><ListOrdered size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{topicCount} tópicos</span>}
                      {fotoCount > 0 && <span style={{ marginLeft: '12px' }}><Camera size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{fotoCount} fotos</span>}
                    </div>
                    {/* Progress bar */}
                    {rel.progresso_global > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '5px', background: '#E5E2D9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${rel.progresso_global}%`, height: '100%', borderRadius: '3px',
                            background: rel.progresso_global >= 80 ? '#10B981' : rel.progresso_global >= 40 ? '#F59E0B' : '#ADAA96',
                            transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#3D3D3D', minWidth: '32px', textAlign: 'right' }}>{rel.progresso_global}%</span>
                      </div>
                    )}
                    {/* Photo thumbnails */}
                    {fotoCount > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                        {(rel.fotos_relatorio || []).slice(0, 5).map((f, i) => (
                          <div key={i} style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                        {fotoCount > 5 && (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#F5F3EB',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#8B8670', fontWeight: 600 }}>
                            +{fotoCount - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignSelf: 'flex-start' }}>
                  <button onClick={() => handleEdit(rel)} style={S.iconBtn} title="Editar"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(rel)} style={{ ...S.iconBtn, color: '#DC2626' }} title="Apagar"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={S.backdrop} onClick={() => setShowModal(false)}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'Cormorant Garamond, serif', color: '#3D3D3D' }}>Novo Relatório</h3>
              <button onClick={() => setShowModal(false)} style={S.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={S.label}>Título *</label>
                <input type="text" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Relatório Semanal #12" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Tipo</label>
                <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} style={S.input}>
                  {TIPOS_RELATORIO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={S.label}>Data Início *</label>
                  <input type="date" value={formData.data_inicio}
                    onChange={e => setFormData({ ...formData, data_inicio: e.target.value })} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Data Fim *</label>
                  <input type="date" value={formData.data_fim}
                    onChange={e => setFormData({ ...formData, data_fim: e.target.value })} style={S.input} />
                </div>
              </div>
            </div>
            <div style={S.modalFooter}>
              <button onClick={() => setShowModal(false)} style={S.cancelBtn}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving} style={S.submitBtn}>
                {saving && <Loader2 className="spin" size={14} />} Criar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditorModal && editingRelatorio && (
        <div style={S.backdrop} onClick={() => setShowEditorModal(false)}>
          <div style={{ ...S.modalCard, width: '720px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ ...S.modalHeader, flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'Cormorant Garamond, serif', color: '#3D3D3D' }}>
                  {editingRelatorio.titulo}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#ADAA96' }}>
                  {formatDateRange(editingRelatorio.data_inicio, editingRelatorio.data_fim)}
                </p>
              </div>
              <button onClick={() => setShowEditorModal(false)} style={S.closeBtn}><X size={18} /></button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>

              {/* Progresso Global */}
              <EditorSection title="Progresso Global" icon={<CheckCircle size={14} />}
                collapsed={collapsedSections.progresso} onToggle={() => toggleSection('progresso')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="range" min="0" max="100" value={editorData.progresso_global}
                      onChange={e => setEditorData({ ...editorData, progresso_global: parseInt(e.target.value) })}
                      style={S.rangeInput} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#ADAA96' }}>0%</span>
                      <span style={{ fontSize: '10px', color: '#ADAA96' }}>100%</span>
                    </div>
                  </div>
                  <div style={S.progressBadge}>{editorData.progresso_global}%</div>
                </div>
              </EditorSection>

              {/* Resumo Executivo */}
              <EditorSection title="Resumo Executivo" icon={<MessageSquare size={14} />}
                collapsed={collapsedSections.resumo} onToggle={() => toggleSection('resumo')}>
                <textarea value={editorData.resumo_executivo}
                  onChange={e => setEditorData({ ...editorData, resumo_executivo: e.target.value })}
                  placeholder="Breve resumo do período..." rows={3} style={S.textarea} />
              </EditorSection>

              {/* Trabalhos Realizados */}
              <EditorSection title="Trabalhos Realizados" icon={<ClipboardList size={14} />}
                collapsed={collapsedSections.trabalhos} onToggle={() => toggleSection('trabalhos')}>
                <textarea value={editorData.trabalhos_realizados}
                  onChange={e => setEditorData({ ...editorData, trabalhos_realizados: e.target.value })}
                  placeholder="Descreva os trabalhos executados..." rows={4} style={S.textarea} />
              </EditorSection>

              {/* Tópicos */}
              <EditorSection title="Tópicos" icon={<ListOrdered size={14} />}
                count={editorData.topicos.length} collapsed={collapsedSections.topicos} onToggle={() => toggleSection('topicos')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {editorData.topicos.map((topico, idx) => (
                    <div key={idx} style={S.topicoCard}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={S.topicoNum}>{idx + 1}</span>
                        <div style={{ flex: 1 }}>
                          <input type="text" value={topico.titulo} placeholder="Título do tópico..."
                            onChange={e => updateTopico(idx, 'titulo', e.target.value)}
                            style={{ ...S.input, fontWeight: 500, marginBottom: '6px' }} />
                          <textarea value={topico.descricao} placeholder="Descrição, notas, pontos relevantes..."
                            onChange={e => updateTopico(idx, 'descricao', e.target.value)}
                            rows={2} style={{ ...S.textarea, fontSize: '12px' }} />
                          <select value={topico.tipo} onChange={e => updateTopico(idx, 'tipo', e.target.value)}
                            style={{ ...S.input, width: 'auto', marginTop: '6px', fontSize: '11px', padding: '4px 8px' }}>
                            <option value="info">Informação</option>
                            <option value="progresso">Progresso</option>
                            <option value="problema">Problema</option>
                            <option value="decisao">Decisão</option>
                          </select>
                        </div>
                        <button onClick={() => removeTopico(idx)} style={{ ...S.iconBtn, color: '#DC2626', flexShrink: 0 }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addTopico} style={S.addItemBtn}>
                    <Plus size={13} /> Adicionar Tópico
                  </button>
                </div>
              </EditorSection>

              {/* Fotografias */}
              <EditorSection title="Fotografias" icon={<Camera size={14} />}
                count={editorData.fotos_relatorio.length} collapsed={collapsedSections.fotos} onToggle={() => toggleSection('fotos')}>
                {/* Upload + gallery picker */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFoto} style={S.addItemBtn}>
                    {uploadingFoto ? <Loader2 className="spin" size={13} /> : <Upload size={13} />}
                    Fazer Upload
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFotoUpload} style={{ display: 'none' }} />
                </div>

                {/* Selected photos */}
                {editorData.fotos_relatorio.length > 0 && (
                  <div style={{ columns: '3 140px', columnGap: '8px', marginBottom: '12px' }}>
                    {editorData.fotos_relatorio.map((foto, idx) => (
                      <div key={idx} style={{ breakInside: 'avoid', marginBottom: '8px', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                        <img src={foto.url} alt={foto.legenda} style={{ width: '100%', display: 'block', borderRadius: '8px' }} />
                        <button onClick={() => removeFotoRelatorio(idx)} style={S.fotoRemoveBtn}><X size={10} /></button>
                        <input type="text" value={foto.legenda} placeholder="Legenda..."
                          onChange={e => {
                            const updated = [...editorData.fotos_relatorio]
                            updated[idx] = { ...updated[idx], legenda: e.target.value }
                            setEditorData(prev => ({ ...prev, fotos_relatorio: updated }))
                          }}
                          style={S.fotoLegendaInput} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Gallery picker */}
                {fotografias.length > 0 && (
                  <div>
                    <p style={{ fontSize: '11px', color: '#ADAA96', marginBottom: '8px' }}>Selecionar da galeria da obra:</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto' }}>
                      {fotografias.slice(0, 20).map(foto => {
                        const selected = editorData.fotos_relatorio.some(f => f.url === foto.url)
                        return (
                          <div key={foto.id}
                            onClick={() => !selected && addFotoFromGallery(foto)}
                            style={{
                              width: '52px', height: '52px', borderRadius: '6px', overflow: 'hidden',
                              cursor: selected ? 'default' : 'pointer', opacity: selected ? 0.4 : 1,
                              border: selected ? '2px solid #7A8B6E' : '2px solid transparent',
                              transition: 'all 0.15s', flexShrink: 0
                            }}>
                            <img src={foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </EditorSection>

              {/* Progresso por Especialidade */}
              <EditorSection title="Progresso por Especialidade" icon={<CheckCircle size={14} />}
                collapsed={collapsedSections.especialidades} onToggle={() => toggleSection('especialidades')}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                  {especialidades.slice(0, 8).map(esp => (
                    <div key={esp.id} style={S.espCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: esp.cor || '#3D3D3D' }}>{esp.nome}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{editorData.progresso_por_especialidade[esp.id] || 0}%</span>
                      </div>
                      <input type="range" min="0" max="100"
                        value={editorData.progresso_por_especialidade[esp.id] || 0}
                        onChange={e => setEditorData(prev => ({
                          ...prev, progresso_por_especialidade: { ...prev.progresso_por_especialidade, [esp.id]: parseInt(e.target.value) }
                        }))} style={{ ...S.rangeInput, width: '100%' }} />
                    </div>
                  ))}
                </div>
              </EditorSection>

              {/* Trabalhos Próximo Período */}
              <EditorSection title="Trabalhos Próximo Período" icon={<ClipboardList size={14} />}
                collapsed={collapsedSections.proxima} onToggle={() => toggleSection('proxima')}>
                <textarea value={editorData.trabalhos_proxima_semana}
                  onChange={e => setEditorData({ ...editorData, trabalhos_proxima_semana: e.target.value })}
                  placeholder="Trabalhos planeados..." rows={3} style={S.textarea} />
              </EditorSection>

              {/* Problemas */}
              <EditorSection title="Problemas Identificados" icon={<AlertTriangle size={14} />}
                collapsed={collapsedSections.problemas} onToggle={() => toggleSection('problemas')}>
                <textarea value={editorData.problemas_identificados}
                  onChange={e => setEditorData({ ...editorData, problemas_identificados: e.target.value })}
                  placeholder="Problemas ou obstáculos..." rows={3} style={S.textarea} />
              </EditorSection>

              {/* Decisões + Observações */}
              <EditorSection title="Decisões Pendentes & Observações" icon={<MessageSquare size={14} />}
                collapsed={collapsedSections.decisoes} onToggle={() => toggleSection('decisoes')}>
                <label style={{ ...S.label, marginBottom: '4px' }}>Decisões Pendentes</label>
                <textarea value={editorData.decisoes_pendentes}
                  onChange={e => setEditorData({ ...editorData, decisoes_pendentes: e.target.value })}
                  placeholder="Decisões que aguardam resolução..." rows={2} style={{ ...S.textarea, marginBottom: '12px' }} />
                <label style={{ ...S.label, marginBottom: '4px' }}>Observações</label>
                <textarea value={editorData.observacoes}
                  onChange={e => setEditorData({ ...editorData, observacoes: e.target.value })}
                  placeholder="Outras observações relevantes..." rows={2} style={S.textarea} />
              </EditorSection>

              {/* Portal */}
              <div style={{ borderTop: '1px solid #E5E2D9', paddingTop: '12px', marginTop: '4px' }}>
                <PortalToggle checked={editorData.publicar_no_portal}
                  onChange={v => setEditorData({ ...editorData, publicar_no_portal: v })} />
                {editorData.publicar_no_portal && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={S.label}>Resumo para o Portal</label>
                    <textarea value={editorData.resumo_portal}
                      onChange={e => setEditorData({ ...editorData, resumo_portal: e.target.value })}
                      placeholder="Resumo simplificado visível ao cliente..." rows={3} style={S.textarea} />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ ...S.modalFooter, flexShrink: 0 }}>
              <button onClick={() => setShowEditorModal(false)} style={S.cancelBtn}>Cancelar</button>
              <button onClick={() => handleSave(false)} disabled={saving} style={{ ...S.cancelBtn, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={13} /> Rascunho
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} style={S.submitBtn}>
                {saving ? <Loader2 className="spin" size={14} /> : <Send size={13} />} Publicar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm} title={confirmModal.title}
        message={confirmModal.message} type={confirmModal.type} />
    </div>
  )
}

// Collapsible section component
function EditorSection({ title, icon, count, collapsed, onToggle, children }) {
  return (
    <div style={{ border: '1px solid #E5E2D9', borderRadius: '10px', overflow: 'hidden' }}>
      <div onClick={onToggle} style={S.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#3D3D3D' }}>{title}</span>
          {count > 0 && <span style={{ fontSize: '10px', color: '#7A8B6E', background: '#7A8B6E15', padding: '1px 6px', borderRadius: '8px' }}>{count}</span>}
        </div>
        <ChevronDown size={16} style={{ color: '#ADAA96', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }} />
      </div>
      {!collapsed && <div style={{ padding: '14px 16px' }}>{children}</div>}
    </div>
  )
}

// ─── Styles ────────────────────────────────────
const S = {
  addBtn: {
    padding: '8px 16px', background: '#3D3D3D', color: 'white', border: 'none',
    borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  selectInput: {
    padding: '7px 10px', border: '1px solid #E5E2D9', borderRadius: '20px',
    fontSize: '12px', background: '#FAFAF8', color: '#3D3D3D', outline: 'none',
  },
  reportCard: {
    display: 'flex', justifyContent: 'space-between', gap: '12px',
    padding: '14px 16px', background: '#FFF', border: '1px solid #E5E2D9',
    borderRadius: '12px', transition: 'box-shadow 0.15s',
  },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
  },
  iconBtn: {
    padding: '6px', background: 'none', border: 'none', cursor: 'pointer',
    borderRadius: '6px', color: '#ADAA96', display: 'flex', alignItems: 'center',
  },
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalCard: {
    width: '500px', maxWidth: '95vw', background: '#FFF', borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #E5E2D9',
  },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: '8px',
    padding: '14px 20px', borderTop: '1px solid #E5E2D9',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#ADAA96', padding: '4px',
  },
  label: {
    display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B8670', marginBottom: '4px',
  },
  input: {
    width: '100%', padding: '8px 10px', border: '1px solid #E5E2D9', borderRadius: '8px',
    fontSize: '12px', background: '#FAFAF8', color: '#3D3D3D', fontFamily: 'inherit',
  },
  textarea: {
    width: '100%', padding: '8px 10px', border: '1px solid #E5E2D9', borderRadius: '8px',
    fontSize: '12px', background: '#FAFAF8', color: '#3D3D3D', fontFamily: 'inherit',
    resize: 'vertical',
  },
  cancelBtn: {
    padding: '8px 16px', background: 'transparent', border: '1px solid #E5E2D9',
    borderRadius: '8px', fontSize: '12px', color: '#8B8670', cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 20px', background: '#7A8B6E', color: 'white', border: 'none',
    borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  rangeInput: {
    width: '100%', height: '6px', WebkitAppearance: 'none', appearance: 'none',
    background: '#E5E2D9', borderRadius: '3px', outline: 'none', cursor: 'pointer',
  },
  progressBadge: {
    fontSize: '18px', fontWeight: 700, color: '#3D3D3D', minWidth: '50px', textAlign: 'center',
    padding: '6px 12px', background: '#F5F3EB', borderRadius: '10px',
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', cursor: 'pointer', userSelect: 'none',
    background: '#FAFAF8',
  },
  topicoCard: {
    padding: '12px', background: '#FAFAF8', borderRadius: '10px', border: '1px solid #E5E2D9',
  },
  topicoNum: {
    width: '24px', height: '24px', borderRadius: '50%', background: '#3D3D3D', color: '#FFF',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: 600, flexShrink: 0, marginTop: '6px',
  },
  addItemBtn: {
    padding: '8px 14px', background: 'transparent', border: '1px dashed #E5E2D9',
    borderRadius: '8px', fontSize: '12px', color: '#8B8670', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
  },
  espCard: {
    padding: '10px', background: '#FAFAF8', borderRadius: '8px',
  },
  fotoRemoveBtn: {
    position: 'absolute', top: '4px', right: '4px', width: '18px', height: '18px',
    background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  fotoLegendaInput: {
    position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)',
    border: 'none', color: 'white', fontSize: '10px', padding: '4px 6px', outline: 'none',
  },
}
