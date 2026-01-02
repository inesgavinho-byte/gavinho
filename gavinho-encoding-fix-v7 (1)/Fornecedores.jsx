import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus, Search, Edit2, Trash2, Phone, Mail, Globe, MapPin,
  Star, Building2, User, X, Loader2, Upload, Download,
  Filter, ChevronDown, ChevronRight, FileSpreadsheet, MoreVertical
} from 'lucide-react'
import * as XLSX from 'xlsx'

const STATUS_FORNECEDOR = {
  ativo: { label: 'Ativo', color: '#16a34a', bg: '#dcfce7' },
  preferencial: { label: 'Preferencial', color: '#2563eb', bg: '#dbeafe' },
  inativo: { label: 'Inativo', color: '#78716c', bg: '#f5f5f4' },
  bloqueado: { label: 'Bloqueado', color: '#dc2626', bg: '#fee2e2' }
}

export default function Fornecedores() {
  const { profile } = useAuth()
  const fileInputRef = useRef(null)
  
  const [fornecedores, setFornecedores] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [search, setSearch] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState(null)
  
  const [form, setForm] = useState({
    nome: '', nif: '', morada: '', codigo_postal: '', cidade: '', website: '',
    responsavel: '', email: '', email2: '', telefone: '', telemovel: '',
    especialidade: '', status: 'ativo', prazo_pagamento: 30, desconto_comercial: 0,
    rating: null, notas: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [fornecedoresRes, especialidadesRes] = await Promise.all([
        supabase.from('fornecedores').select('*').order('nome'),
        supabase.from('fornecedor_especialidades').select('*').order('ordem')
      ])
      setFornecedores(fornecedoresRes.data || [])
      setEspecialidades(especialidadesRes.data || [])
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      nome: '', nif: '', morada: '', codigo_postal: '', cidade: '', website: '',
      responsavel: '', email: '', email2: '', telefone: '', telemovel: '',
      especialidade: '', status: 'ativo', prazo_pagamento: 30, desconto_comercial: 0,
      rating: null, notas: ''
    })
  }

  const handleSave = async () => {
    if (!form.nome) { alert('Nome é obrigatório'); return }
    setSaving(true)
    try {
      const data = { ...form, updated_at: new Date().toISOString() }
      if (editingFornecedor) {
        await supabase.from('fornecedores').update(data).eq('id', editingFornecedor.id)
      } else {
        data.created_by = profile?.id
        await supabase.from('fornecedores').insert(data)
      }
      setShowModal(false); setEditingFornecedor(null); resetForm(); loadData()
    } catch (err) {
      alert(`Erro: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (f) => {
    setForm({
      nome: f.nome || '', nif: f.nif || '', morada: f.morada || '',
      codigo_postal: f.codigo_postal || '', cidade: f.cidade || '', website: f.website || '',
      responsavel: f.responsavel || '', email: f.email || '', email2: f.email2 || '',
      telefone: f.telefone || '', telemovel: f.telemovel || '', especialidade: f.especialidade || '',
      status: f.status || 'ativo', prazo_pagamento: f.prazo_pagamento || 30,
      desconto_comercial: f.desconto_comercial || 0, rating: f.rating, notas: f.notas || ''
    })
    setEditingFornecedor(f); setShowModal(true)
  }

  const handleDelete = async (f) => {
    if (!confirm(`Eliminar "${f.nome}"?`)) return
    try {
      const { error } = await supabase.from('fornecedores').delete().eq('id', f.id)
      if (error) {
        alert(`Erro ao eliminar: ${error.message}`)
      } else {
        loadData()
      }
    } catch (err) {
      alert(`Erro: ${err.message}`)
    }
  }

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
      const dataRows = rows.slice(1).filter(row => row && row[0])
      
      const toInsert = dataRows.map(row => ({
        nome: String(row[0] || '').trim(),
        responsavel: String(row[1] || '').trim() || null,
        email: String(row[2] || '').trim() || null,
        email2: String(row[3] || '').trim() || null,
        telefone: String(row[4] || '').trim() || null,
        telemovel: String(row[5] || '').trim() || null,
        especialidade: String(row[6] || '').trim() || null,
        status: 'ativo',
        notas: String(row[8] || '').trim() || null,
        created_by: profile?.id
      })).filter(f => f.nome)
      
      let inserted = 0
      let errors = []
      
      for (const f of toInsert) {
        try {
          // Verificar se já existe (sem .single() que dá erro)
          const { data: existing } = await supabase
            .from('fornecedores')
            .select('id')
            .ilike('nome', f.nome)
          
          if (!existing || existing.length === 0) {
            const { error } = await supabase.from('fornecedores').insert(f)
            if (error) {
              errors.push(`${f.nome}: ${error.message}`)
            } else {
              inserted++
            }
          }
        } catch (err) {
          errors.push(`${f.nome}: ${err.message}`)
        }
      }
      
      if (errors.length > 0) {
        console.error('Erros na importação:', errors)
      }
      
      alert(`Importados ${inserted} fornecedores (${toInsert.length - inserted} já existiam ou com erro)`)
      loadData()
    } catch (err) {
      alert(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const exportarExcel = () => {
    const data = fornecedores.map(f => ({
      'Empresa': f.nome, 'NIF': f.nif || '', 'Responsável': f.responsavel || '',
      'Email': f.email || '', 'Telefone': f.telefone || '', 'Telemóvel': f.telemovel || '',
      'Especialidade': f.especialidade || '', 'Status': f.status, 'Notas': f.notas || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores')
    XLSX.writeFile(wb, 'fornecedores_gavinho.xlsx')
  }

  const fornecedoresFiltrados = fornecedores.filter(f => {
    if (search && !f.nome.toLowerCase().includes(search.toLowerCase()) &&
        !f.responsavel?.toLowerCase().includes(search.toLowerCase()) &&
        !f.especialidade?.toLowerCase().includes(search.toLowerCase())) return false
    if (filtroEspecialidade && f.especialidade !== filtroEspecialidade) return false
    if (filtroStatus && f.status !== filtroStatus) return false
    return true
  })

  const especialidadesUnicas = [...new Set(fornecedores.map(f => f.especialidade).filter(Boolean))]

  if (loading && fornecedores.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
    </div>
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Fornecedores</h1>
          <p style={{ fontSize: '14px', color: 'var(--brown-light)', margin: '4px 0 0' }}>{fornecedores.length} fornecedores registados</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={16} /> Importar
          </button>
          <button onClick={exportarExcel} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Exportar
          </button>
          <button onClick={() => { resetForm(); setEditingFornecedor(null); setShowModal(true) }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Novo Fornecedor
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brown)' }}>{fornecedores.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Total</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)' }}>{fornecedores.filter(f => f.status === 'ativo').length}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Ativos</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--info)' }}>{fornecedores.filter(f => f.status === 'preferencial').length}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Preferenciais</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warning)' }}>{especialidadesUnicas.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Especialidades</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
            <input type="text" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 38px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <select value={filtroEspecialidade} onChange={e => setFiltroEspecialidade(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}>
            <option value="">Todas Especialidades</option>
            {especialidadesUnicas.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}>
            <option value="">Todos Status</option>
            {Object.entries(STATUS_FORNECEDOR).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--stone)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fornecedor</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Especialidade</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Contacto</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, width: '80px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedoresFiltrados.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>Nenhum fornecedor encontrado</td></tr>
            ) : fornecedoresFiltrados.map(f => {
              const statusConf = STATUS_FORNECEDOR[f.status] || STATUS_FORNECEDOR.ativo
              return (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--stone)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{f.nome}</div>
                    {f.responsavel && <div style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {f.responsavel}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', background: 'var(--stone)', borderRadius: '4px', fontSize: '11px' }}>{f.especialidade || '-'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                      {f.email && <a href={`mailto:${f.email}`} style={{ color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {f.email}</a>}
                      {(f.telefone || f.telemovel) && <span style={{ color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {f.telemovel || f.telefone}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusConf.bg, color: statusConf.color }}>{statusConf.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(f)} style={{ padding: '6px', background: 'var(--stone)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(f)} style={{ padding: '6px', background: 'var(--stone)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Nome da Empresa *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>NIF</label>
                  <input type="text" value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Especialidade</label>
                  <select value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }}>
                    <option value="">Selecionar...</option>
                    {especialidades.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
                  </select>
                </div>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--brown-light)' }}>Contactos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Responsável</label>
                  <input type="text" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Telefone</label>
                  <input type="text" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Telemóvel</label>
                  <input type="text" value={form.telemovel} onChange={e => setForm({ ...form, telemovel: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--brown-light)' }}>Status e Condições</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }}>
                    {Object.entries(STATUS_FORNECEDOR).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Prazo Pagamento (dias)</label>
                  <input type="number" value={form.prazo_pagamento} onChange={e => setForm({ ...form, prazo_pagamento: parseInt(e.target.value) || 30 })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Rating</label>
                  <select value={form.rating || ''} onChange={e => setForm({ ...form, rating: e.target.value ? parseInt(e.target.value) : null })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }}>
                    <option value="">Sem rating</option>
                    <option value="1">â­ 1</option>
                    <option value="2">â­â­ 2</option>
                    <option value="3">â­â­â­ 3</option>
                    <option value="4">â­â­â­â­ 4</option>
                    <option value="5">â­â­â­â­â­ 5</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={16} className="spin" />}
                {editingFornecedor ? 'Guardar' : 'Criar Fornecedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
