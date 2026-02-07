// =====================================================
// FORNECEDORES + G.A.R.V.I.S. PROCUREMENT
// Módulo de gestão de fornecedores com inteligência
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import GarvisPanel from '../components/GarvisPanel'
import { useGarvisAlerts } from '../hooks/useGarvisAlerts'
import { useDealRooms } from '../hooks/useDealRooms'
import { useGarvisKPIs } from '../hooks/useGarvisKPIs'
import {
  Plus, Search, Edit2, Trash2, Phone, Mail, Globe, MapPin,
  Star, Building2, User, X, Loader2, Upload, Download,
  Filter, ChevronDown, ChevronRight, FileSpreadsheet, MoreVertical,
  AlertTriangle, TrendingUp, Users, ShoppingCart, Bell,
  ExternalLink, Eye, BarChart3
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
  const toast = useToast()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  // G.A.R.V.I.S. real data hooks
  const { alertas, topAlert, criticalCount, unreadCount } = useGarvisAlerts()
  const { activeDealRooms } = useDealRooms()
  const { kpis: garvisKPIs } = useGarvisKPIs()

  const [fornecedores, setFornecedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState(null)
  const [showGarvis, setShowGarvis] = useState(true)
  const [dismissedAlert, setDismissedAlert] = useState(false)

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
      const { data, error } = await supabase.from('fornecedores').select('*').order('nome')
      if (error) throw error
      setFornecedores(data || [])
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
    if (!form.nome) { toast.warning('Aviso', 'Nome é obrigatório'); return }
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
      toast.success(editingFornecedor ? 'Fornecedor atualizado' : 'Fornecedor criado')
    } catch (err) {
      toast.error('Erro', err.message)
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
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Fornecedor',
      message: `Eliminar "${f.nome}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('fornecedores').delete().eq('id', f.id)
          if (error) toast.error('Erro', error.message)
          else loadData()
        } catch (err) {
          toast.error('Erro', err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
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
        telefone: String(row[4] || '').trim() || null,
        especialidade: String(row[6] || '').trim() || null,
        status: 'ativo',
        created_by: profile?.id
      })).filter(f => f.nome)
      let inserted = 0
      for (const f of toInsert) {
        const { data: existing } = await supabase.from('fornecedores').select('id').ilike('nome', f.nome)
        if (!existing || existing.length === 0) {
          const { error } = await supabase.from('fornecedores').insert(f)
          if (!error) inserted++
        }
      }
      toast.success('Importação Concluída', `${inserted} fornecedores importados`)
      loadData()
    } catch (err) {
      toast.error('Erro', err.message)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const exportarExcel = () => {
    const data = fornecedores.map(f => ({
      'Empresa': f.nome, 'NIF': f.nif || '', 'Responsável': f.responsavel || '',
      'Email': f.email || '', 'Telefone': f.telefone || '',
      'Especialidade': f.especialidade || '', 'Status': f.status, 'Rating': f.rating || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores')
    XLSX.writeFile(wb, 'fornecedores_gavinho.xlsx')
  }

  const fornecedoresFiltrados = fornecedores.filter(f => {
    if (search && !f.nome?.toLowerCase().includes(search.toLowerCase()) &&
        !f.responsavel?.toLowerCase().includes(search.toLowerCase()) &&
        !f.especialidade?.toLowerCase().includes(search.toLowerCase())) return false
    if (filtroEspecialidade && f.especialidade !== filtroEspecialidade) return false
    if (filtroStatus && f.status !== filtroStatus) return false
    return true
  })

  const especialidadesUnicas = [...new Set(fornecedores.map(f => f.especialidade).filter(Boolean))]
  const fornecedoresAtivos = fornecedores.filter(f => f.status === 'ativo' || f.status === 'preferencial').length

  // Real KPI data from hooks
  const kpis = {
    total: garvisKPIs.totalFornecedores || fornecedores.length,
    volumeYTD: garvisKPIs.volumeYTDFormatted || '€0',
    dealRooms: garvisKPIs.dealRoomsAtivos || activeDealRooms.length,
    orcamentos: garvisKPIs.orcamentosPendentes || 0,
    alertas: garvisKPIs.alertasCriticos || criticalCount
  }

  if (loading && fornecedores.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Alert Banner - Real data from GARVIS */}
        {!dismissedAlert && topAlert && (
          <div style={{
            background: topAlert.prioridade === 'critico'
              ? 'linear-gradient(90deg, #FEE2E2 0%, #FECACA 100%)'
              : 'linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: topAlert.prioridade === 'critico' ? '1px solid #dc2626' : '1px solid #F59E0B'
          }}>
            <AlertTriangle size={18} style={{ color: topAlert.prioridade === 'critico' ? '#991b1b' : '#92400E', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, color: topAlert.prioridade === 'critico' ? '#991b1b' : '#92400E', fontSize: '13px' }}>
                {topAlert.titulo}
              </span>
              <span style={{ color: topAlert.prioridade === 'critico' ? '#7f1d1d' : '#78350F', fontSize: '13px', marginLeft: '8px' }}>
                {topAlert.mensagem}
              </span>
            </div>
            {topAlert.acao_label && (
              <button
                onClick={() => topAlert.acao_sugerida && navigate(topAlert.acao_sugerida)}
                style={{
                  padding: '6px 14px',
                  background: topAlert.prioridade === 'critico' ? '#991b1b' : '#92400E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                {topAlert.acao_label}
              </button>
            )}
            <button style={{
              padding: '6px 14px',
              background: 'rgba(146, 64, 14, 0.1)',
              color: topAlert.prioridade === 'critico' ? '#991b1b' : '#92400E',
              border: '1px solid rgba(146, 64, 14, 0.2)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
              onClick={() => setDismissedAlert(true)}
            >
              Ver Mais Tarde
            </button>
          </div>
        )}

        <div style={{ padding: '24px 32px', flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '32px',
                fontWeight: 700,
                margin: 0,
                color: 'var(--brown)',
                letterSpacing: '-0.5px'
              }}>
                Fornecedores
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
                {fornecedores.length} fornecedores · {kpis.dealRooms} deal rooms ativos · {kpis.orcamentos} orçamentos pendentes
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" style={{ display: 'none' }} />
              <button
                onClick={() => toast.info('Em breve', 'Comparador de fornecedores disponível em breve')}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: 'var(--brown)',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Search size={14} /> Comparar
              </button>
              <button
                onClick={() => toast.info('Em breve', 'Deal Rooms disponíveis em breve')}
                style={{
                  padding: '8px 16px',
                  background: 'var(--brown)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} /> Novo Deal Room
              </button>
            </div>
          </div>

          {/* G.A.R.V.I.S. Recommendation Card */}
          <GarvisRecommendation
            fornecedores={fornecedores}
            activeDealRooms={activeDealRooms}
            toast={toast}
          />

          {/* KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <KPICard value={kpis.total} label="Total Fornecedores" />
            <KPICard value={kpis.volumeYTD} label="Volume YTD" trend="+23%" />
            <KPICard value={kpis.dealRooms} label="Deal Rooms Ativos" />
            <KPICard value={kpis.orcamentos} label="Orçamentos Pendentes" />
            <KPICard value={kpis.alertas} label="Alertas Críticos" />
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
              <input
                type="text"
                placeholder="Pesquisar fornecedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 38px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: 'var(--white)',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
            <select value={filtroEspecialidade} onChange={e => setFiltroEspecialidade(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', background: 'var(--white)' }}>
              <option value="">Todas Especialidades</option>
              {especialidadesUnicas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', background: 'var(--white)' }}>
              <option value="">Todos Status</option>
              {Object.entries(STATUS_FORNECEDOR).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              <button onClick={() => fileInputRef.current?.click()} style={{
                padding: '8px 12px', background: 'transparent', border: '1px solid var(--stone)',
                borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--brown-light)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <Upload size={14} /> Importar
              </button>
              <button onClick={exportarExcel} style={{
                padding: '8px 12px', background: 'transparent', border: '1px solid var(--stone)',
                borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--brown-light)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <Download size={14} /> Exportar
              </button>
              <button onClick={() => { resetForm(); setEditingFornecedor(null); setShowModal(true) }} style={{
                padding: '8px 12px', background: 'var(--accent-olive)', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <Plus size={14} /> Novo Fornecedor
              </button>
            </div>
          </div>

          {/* Supplier Table */}
          <div style={{
            background: 'var(--white)',
            borderRadius: '12px',
            border: '1px solid var(--stone)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--stone)' }}>
                  <th style={thStyle}>FORNECEDOR</th>
                  <th style={thStyle}>ESPECIALIDADE</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>RATING</th>
                  <th style={thStyle}>CONTACTO</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>STATUS</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {fornecedoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
                      Nenhum fornecedor encontrado
                    </td>
                  </tr>
                ) : (
                  fornecedoresFiltrados.map(f => {
                    const statusConf = STATUS_FORNECEDOR[f.status] || STATUS_FORNECEDOR.ativo
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--stone)', cursor: 'pointer' }}
                        onClick={() => navigate(`/fornecedores/${f.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px', height: '36px',
                              borderRadius: '8px',
                              background: f.logo_url ? 'transparent' : 'var(--cream)',
                              border: '1px solid var(--stone)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--brown-light)',
                              flexShrink: 0
                            }}>
                              {f.nome?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '13px' }}>{f.nome}</div>
                              {f.responsavel && (
                                <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{f.responsavel}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {f.especialidade ? (
                            <span style={{
                              padding: '3px 8px',
                              background: 'var(--cream)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: 'var(--brown-light)',
                              fontWeight: 500
                            }}>
                              {f.especialidade}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--stone-dark)', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {f.rating ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                              <Star size={12} fill="var(--warning)" stroke="var(--warning)" />
                              <span style={{ fontWeight: 600, fontSize: '12px' }}>{f.rating}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--stone-dark)', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                            {f.email && (
                              <span style={{ color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Mail size={11} /> {f.email}
                              </span>
                            )}
                            {(f.telefone || f.telemovel) && (
                              <span style={{ color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={11} /> {f.telemovel || f.telefone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: statusConf.bg,
                            color: statusConf.color
                          }}>
                            {statusConf.label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={() => handleEdit(f)} style={actionBtnStyle}>
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(f)} style={{ ...actionBtnStyle, color: 'var(--error)' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* G.A.R.V.I.S. Side Panel */}
      {showGarvis && (
        <GarvisPanel
          onClose={() => setShowGarvis(false)}
          fornecedores={fornecedores}
          kpis={kpis}
        />
      )}

      {/* Modal - Novo/Editar Fornecedor */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Nome da Empresa *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>NIF</label>
                  <input type="text" value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Especialidade</label>
                  <input type="text" value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })} placeholder="Ex: Caixilharia, Cantaria..." style={inputStyle} />
                </div>
              </div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contactos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Responsável</label>
                  <input type="text" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Telefone</label>
                  <input type="text" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Telemóvel</label>
                  <input type="text" value={form.telemovel} onChange={e => setForm({ ...form, telemovel: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status e Condições</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    {Object.entries(STATUS_FORNECEDOR).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Prazo Pagamento (dias)</label>
                  <input type="number" value={form.prazo_pagamento} onChange={e => setForm({ ...form, prazo_pagamento: parseInt(e.target.value) || 30 })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Rating</label>
                  <select value={form.rating || ''} onChange={e => setForm({ ...form, rating: e.target.value ? parseInt(e.target.value) : null })} style={inputStyle}>
                    <option value="">Sem rating</option>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'★'.repeat(n)} {n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: '8px 16px', background: 'transparent', border: '1px solid var(--stone)',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)'
              }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '8px 20px', background: 'var(--brown)', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {saving && <Loader2 size={14} className="spin" />}
                {editingFornecedor ? 'Guardar' : 'Criar Fornecedor'}
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
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}

// G.A.R.V.I.S. Recommendation Component - Dynamic from real data
function GarvisRecommendation({ fornecedores, activeDealRooms, toast }) {
  // Find best supplier: highest rated with a specialty
  const topSupplier = fornecedores
    .filter(f => f.rating && f.rating >= 4 && f.especialidade && (f.status === 'ativo' || f.status === 'preferencial'))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]

  if (!topSupplier && fornecedores.length < 3) {
    return (
      <div style={{
        background: 'var(--white)',
        borderRadius: '16px',
        border: '1px solid var(--stone)',
        padding: '24px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 12px',
          background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 700, color: 'var(--brown-dark)'
        }}>G</div>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px'
        }}>
          G.A.R.V.I.S. a analisar...
        </div>
        <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: 0, lineHeight: 1.5 }}>
          Adicione mais fornecedores com ratings e especialidades para ativar as recomendações inteligentes.
        </p>
      </div>
    )
  }

  if (!topSupplier) return null

  const matchScore = Math.min(70 + (topSupplier.rating || 0) * 5 + (topSupplier.is_preferencial ? 5 : 0), 99)
  const initials = topSupplier.nome?.substring(0, 2).toUpperCase() || '??'

  const tags = []
  if (topSupplier.especialidade) tags.push({ text: `Especialista em ${topSupplier.especialidade}`, type: 'success' })
  if (topSupplier.rating >= 4) tags.push({ text: `Rating ${topSupplier.rating}/5`, type: 'success' })
  if (topSupplier.is_preferencial) tags.push({ text: 'Fornecedor preferencial', type: 'success' })
  if (topSupplier.prazo_pagamento && topSupplier.prazo_pagamento > 30) tags.push({ text: `Prazo ${topSupplier.prazo_pagamento} dias`, type: 'warning' })

  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: '16px',
      border: '1px solid var(--stone)',
      padding: '24px',
      marginBottom: '24px',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute', top: '-8px', right: '20px',
        background: 'var(--accent-olive)', color: 'white', borderRadius: '12px',
        width: '24px', height: '24px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '11px', fontWeight: 700
      }}>1</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: 'var(--brown-dark)'
        }}>G</div>
        <span style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '16px', fontWeight: 600, color: 'var(--brown)'
        }}>
          Recomendação G.A.R.V.I.S.
        </span>
        {topSupplier.especialidade && (
          <div style={{ marginLeft: 'auto' }}>
            <span style={{
              fontSize: '12px', padding: '4px 12px', background: 'var(--cream)',
              borderRadius: '8px', color: 'var(--brown-light)', fontWeight: 500
            }}>
              Especialidade: {topSupplier.especialidade}
            </span>
          </div>
        )}
      </div>

      <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Baseado nos ratings, especialidades e histórico de colaborações dos seus fornecedores:
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
        background: 'var(--cream)', borderRadius: '12px', marginBottom: '12px'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px', background: 'var(--brown-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-olive)', fontWeight: 700, fontSize: '14px', flexShrink: 0
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '18px', fontWeight: 700, color: 'var(--brown)'
          }}>{topSupplier.nome}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
            {topSupplier.especialidade || 'Geral'} · Rating {topSupplier.rating}/5
            {topSupplier.responsavel ? ` · ${topSupplier.responsavel}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '32px', fontWeight: 700, color: 'var(--accent-olive)', lineHeight: 1
          }}>{matchScore}%</div>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>match</div>
        </div>
      </div>

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {tags.map((tag, i) => (
            <span key={i} style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
              border: `1px solid ${tag.type === 'success' ? 'rgba(122, 139, 110, 0.3)' : 'rgba(201, 168, 108, 0.4)'}`,
              color: tag.type === 'success' ? 'var(--accent-olive)' : 'var(--warning)',
              background: tag.type === 'success' ? 'rgba(122, 139, 110, 0.06)' : 'rgba(201, 168, 108, 0.06)',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              {tag.type === 'success' ? '✓' : '⚠'} {tag.text}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button
          onClick={() => toast.info('Deal Rooms', 'Aplique a migration SQL no Supabase para ativar Deal Rooms')}
          style={{
            padding: '12px', background: 'var(--blush)', color: 'var(--white)',
            border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
          }}
        >
          Criar Deal Room
        </button>
        <button
          onClick={() => toast.info('Alternativas', `Existem ${fornecedores.filter(f => f.rating >= 3 && f.id !== topSupplier.id).length} fornecedores alternativos`)}
          style={{
            padding: '12px', background: 'transparent', color: 'var(--brown)',
            border: '1px solid var(--stone)', borderRadius: '8px', cursor: 'pointer',
            fontSize: '13px', fontWeight: 500
          }}
        >
          Ver alternativas
        </button>
      </div>
    </div>
  )
}

// KPI Card Component
function KPICard({ value, label, trend }) {
  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: '12px',
      border: '1px solid var(--stone)',
      padding: '20px 16px',
      textAlign: 'center'
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '28px',
        fontWeight: 700,
        color: 'var(--brown)',
        lineHeight: 1.1,
        marginBottom: '4px'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--brown-light)', fontWeight: 500 }}>
        {label}
      </div>
      {trend && (
        <div style={{
          fontSize: '11px',
          color: 'var(--accent-olive)',
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px'
        }}>
          <TrendingUp size={12} /> {trend}
        </div>
      )}
    </div>
  )
}

// Styles
const thStyle = {
  padding: '10px 16px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--brown-light)',
  background: 'var(--cream)',
  borderBottom: '1px solid var(--stone)'
}

const tdStyle = {
  padding: '10px 16px',
  verticalAlign: 'middle'
}

const actionBtnStyle = {
  padding: '5px',
  background: 'transparent',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  color: 'var(--brown-light)',
  transition: 'all 0.15s'
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  marginBottom: '4px',
  color: 'var(--brown-light)'
}

const inputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid var(--stone)',
  borderRadius: '6px',
  boxSizing: 'border-box',
  fontSize: '13px',
  color: 'var(--brown)',
  outline: 'none',
  background: 'var(--white)'
}
