import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Plus, Upload, FileText, Download, Trash2, Edit2, Save, X,
  Calendar, Euro, CheckCircle, Clock, AlertCircle, File,
  Loader2, Eye, FileCheck, FilePlus2
} from 'lucide-react'

const tipoConfig = {
  'proposta': { label: 'Proposta', color: 'var(--warning)', icon: FileText },
  'contrato': { label: 'Contrato', color: 'var(--info)', icon: FileCheck },
  'aditamento': { label: 'Aditamento', color: 'var(--brown)', icon: FilePlus2 },
  'outro': { label: 'Outro', color: 'var(--brown-light)', icon: File }
}

const statusConfig = {
  'pendente': { label: 'Pendente', color: 'var(--brown-light)', bg: 'var(--stone)' },
  'assinado': { label: 'Assinado', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  'adjudicado': { label: 'Adjudicado', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  'cancelado': { label: 'Cancelado', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' }
}

export default function ProjetoDocumentos({ projeto, onValorUpdate }) {
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    tipo: 'proposta',
    nome: '',
    descricao: '',
    data_documento: '',
    valor: '',
    status: 'pendente',
    ficheiro_url: '',
    ficheiro_nome: ''
  })

  useEffect(() => {
    if (projeto?.id) {
      loadDocumentos()
    }
  }, [projeto?.id])

  const loadDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('projeto_documentos')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocumentos(data || [])

      // Calcular valor total adjudicado e notificar
      const valorAdjudicado = data?.filter(d => d.status === 'adjudicado').reduce((sum, d) => sum + (d.valor || 0), 0) || 0
      if (onValorUpdate) onValorUpdate(valorAdjudicado)
    } catch (err) {
      console.error('Erro ao carregar documentos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileName = `${projeto.codigo}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage
        .from('documentos')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName)

      setFormData(prev => ({
        ...prev,
        ficheiro_url: publicUrl,
        ficheiro_nome: file.name,
        nome: prev.nome || file.name.replace(/\.[^/.]+$/, '')
      }))
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload do ficheiro')
    } finally {
      setUploading(false)
    }

    e.target.value = ''
  }

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      alert('Nome é obrigatório')
      return
    }

    setSaving(true)
    try {
      const docData = {
        projeto_id: projeto.id,
        tipo: formData.tipo,
        nome: formData.nome.trim(),
        descricao: formData.descricao || null,
        data_documento: formData.data_documento || null,
        valor: formData.valor ? parseFloat(formData.valor) : null,
        status: formData.status,
        ficheiro_url: formData.ficheiro_url || null,
        ficheiro_nome: formData.ficheiro_nome || null
      }

      if (editingDoc) {
        const { error } = await supabase
          .from('projeto_documentos')
          .update(docData)
          .eq('id', editingDoc.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projeto_documentos')
          .insert([docData])
        if (error) throw error
      }

      setShowModal(false)
      setEditingDoc(null)
      resetForm()
      loadDocumentos()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (doc) => {
    if (!confirm(`Eliminar "${doc.nome}"?`)) return

    try {
      const { error } = await supabase
        .from('projeto_documentos')
        .delete()
        .eq('id', doc.id)
      if (error) throw error
      loadDocumentos()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert('Erro ao eliminar')
    }
  }

  const handleEdit = (doc) => {
    setEditingDoc(doc)
    setFormData({
      tipo: doc.tipo,
      nome: doc.nome,
      descricao: doc.descricao || '',
      data_documento: doc.data_documento || '',
      valor: doc.valor || '',
      status: doc.status || 'pendente',
      ficheiro_url: doc.ficheiro_url || '',
      ficheiro_nome: doc.ficheiro_nome || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      tipo: 'proposta',
      nome: '',
      descricao: '',
      data_documento: '',
      valor: '',
      status: 'pendente',
      ficheiro_url: '',
      ficheiro_nome: ''
    })
  }

  const formatCurrency = (value) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-PT')
  }

  // Calcular totais
  const totais = {
    propostas: documentos.filter(d => d.tipo === 'proposta').length,
    valorTotal: documentos.reduce((sum, d) => sum + (d.valor || 0), 0),
    valorAdjudicado: documentos.filter(d => d.status === 'adjudicado').reduce((sum, d) => sum + (d.valor || 0), 0)
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
      {/* Header com Resumo */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Documentos Contratuais</h3>
            <p style={{ fontSize: '12px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
              Propostas, contratos e aditamentos
            </p>
          </div>
          <button 
            onClick={() => { resetForm(); setEditingDoc(null); setShowModal(true) }}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '8px 12px' }}
          >
            <Plus size={14} /> Adicionar Documento
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Total Propostas</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{totais.propostas}</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Valor Total</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(totais.valorTotal)}</div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(122, 158, 122, 0.1)', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--success)', marginBottom: '4px' }}>Valor Adjudicado</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(totais.valorAdjudicado)}</div>
          </div>
        </div>
      </div>

      {/* Lista de Documentos */}
      {documentos.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <FileText size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Sem documentos registados</p>
          <p style={{ fontSize: '12px', margin: '8px 0 0' }}>Adicione propostas assinadas, contratos e aditamentos</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {documentos.map(doc => {
            const TipoIcon = tipoConfig[doc.tipo]?.icon || FileText
            return (
              <div key={doc.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${tipoConfig[doc.tipo]?.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TipoIcon size={24} style={{ color: tipoConfig[doc.tipo]?.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{doc.nome}</span>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: tipoConfig[doc.tipo]?.color + '20', color: tipoConfig[doc.tipo]?.color }}>
                        {tipoConfig[doc.tipo]?.label}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: statusConfig[doc.status]?.bg, color: statusConfig[doc.status]?.color }}>
                        {statusConfig[doc.status]?.label}
                      </span>
                    </div>
                    {doc.descricao && (
                      <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '0 0 8px' }}>{doc.descricao}</p>
                    )}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                      {doc.data_documento && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {formatDate(doc.data_documento)}
                        </span>
                      )}
                      {doc.valor && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--brown)' }}>
                          <Euro size={12} /> {formatCurrency(doc.valor)}
                        </span>
                      )}
                      {doc.ficheiro_nome && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <File size={12} /> {doc.ficheiro_nome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {doc.ficheiro_url && (
                      <a href={doc.ficheiro_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-icon" style={{ padding: '8px' }} title="Ver documento">
                        <Eye size={16} />
                      </a>
                    )}
                    <button onClick={() => handleEdit(doc)} className="btn btn-ghost btn-icon" style={{ padding: '8px' }} title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(doc)} className="btn btn-ghost btn-icon" style={{ padding: '8px', color: 'var(--error)' }} title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '500px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{editingDoc ? 'Editar Documento' : 'Novo Documento'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Upload de Ficheiro */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Ficheiro</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  style={{ display: 'none' }}
                />
                {formData.ficheiro_nome ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
                    <File size={20} style={{ color: 'var(--info)' }} />
                    <span style={{ flex: 1, fontSize: '13px' }}>{formData.ficheiro_nome}</span>
                    <button onClick={() => setFormData({ ...formData, ficheiro_url: '', ficheiro_nome: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ width: '100%', padding: '20px', border: '2px dashed var(--stone)', borderRadius: '8px', background: 'var(--cream)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                  >
                    {uploading ? (
                      <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
                    ) : (
                      <>
                        <Upload size={24} style={{ color: 'var(--brown-light)' }} />
                        <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Clique para fazer upload</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="proposta">Proposta</option>
                    <option value="contrato">Contrato</option>
                    <option value="aditamento">Aditamento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Estado</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="assinado">Assinado</option>
                    <option value="adjudicado">Adjudicado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do documento"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Data</label>
                  <input
                    type="date"
                    value={formData.data_documento}
                    onChange={e => setFormData({ ...formData, data_documento: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Valor (€)</label>
                  <input
                    type="number"
                    value={formData.valor}
                    onChange={e => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  rows={2}
                  placeholder="Descrição ou notas..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving || !formData.nome.trim()}>
                {saving ? <Loader2 size={16} className="spin" /> : <><Save size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
