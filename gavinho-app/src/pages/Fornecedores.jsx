// =====================================================
// FORNECEDORES + G.A.R.V.I.S. PROCUREMENT
// Módulo de gestão de fornecedores com inteligência
// Deal Rooms, Matching, Orçamentos, Chat IA
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import GarvisPanel from '../components/GarvisPanel'
import DealRoomModal from '../components/DealRoomModal'
import { useGarvisAlerts } from '../hooks/useGarvisAlerts'
import { useIsMobile } from '../hooks/useIsMobile'
import { useDealRooms } from '../hooks/useDealRooms'
import { useGarvisKPIs } from '../hooks/useGarvisKPIs'
import { getTopRecommendations } from '../services/garvisMatching'
import {
  Plus, Search, Edit2, Trash2, Phone, Mail,
  Star, X, Loader2, Upload, Download,
  AlertTriangle, TrendingUp, Users, Sparkles
} from 'lucide-react'
import * as XLSX from 'xlsx'

const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Quattrocento Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
}

const C = {
  success: '#5B7B6A',
  warning: '#C4956A',
  danger: '#A65D57',
  info: '#7A8B9E',
  dark: '#2C2C2B',
  muted: '#9A978A',
  light: '#6B6B6B',
  border: '#E5E2D9',
  cream: '#F5F3EB',
  white: '#FFFFFF',
}

const STATUS_FORNECEDOR = {
  ativo: { label: 'Ativo', color: C.success, bg: 'rgba(91,123,106,0.10)' },
  preferencial: { label: 'Preferencial', color: C.info, bg: 'rgba(122,139,158,0.10)' },
  inativo: { label: 'Inativo', color: C.muted, bg: 'rgba(154,151,138,0.10)' },
  bloqueado: { label: 'Bloqueado', color: C.danger, bg: 'rgba(166,93,87,0.10)' }
}

const statusTabs = [
  { key: '', label: 'Todos' },
  { key: 'ativo', label: 'Ativos' },
  { key: 'preferencial', label: 'Preferenciais' },
  { key: 'inativo', label: 'Inativos' },
]


export default function Fornecedores() {
  const { profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const fileInputRef = useRef(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  // G.A.R.V.I.S. real data hooks
  const { alertas, topAlert, criticalCount, unreadCount } = useGarvisAlerts()
  const {
    dealRooms, activeDealRooms, fetchDealRooms,
    createDealRoom, updateDealRoom, inviteSupplier,
    updateSupplierStatus, selectWinner
  } = useDealRooms()
  const { kpis: garvisKPIs } = useGarvisKPIs()

  const [fornecedores, setFornecedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState(null)
  const [showGarvis, setShowGarvis] = useState(false)
  const [dismissedAlert, setDismissedAlert] = useState(false)

  // Deal Room Modal state
  const [showDealRoomModal, setShowDealRoomModal] = useState(false)
  const [selectedDealRoom, setSelectedDealRoom] = useState(null)

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

  // Deal Room handlers
  const handleCreateDealRoom = () => { setSelectedDealRoom(null); setShowDealRoomModal(true) }
  const handleOpenDealRoom = (dr) => { setSelectedDealRoom(dr); setShowDealRoomModal(true) }

  const handleSaveDealRoom = async (data, existingId) => {
    if (existingId) {
      const result = await updateDealRoom(existingId, data)
      if (result.error) toast.error('Erro', result.error)
      else toast.success('Deal Room atualizado')
      return result
    } else {
      const result = await createDealRoom(data)
      if (result.error) toast.error('Erro', result.error)
      else toast.success('Deal Room criado', `Código: ${result.data?.codigo}`)
      return result
    }
  }

  const handleInviteSupplier = async (dealRoomId, fornecedorId) => {
    const result = await inviteSupplier(dealRoomId, fornecedorId)
    if (result.error) toast.error('Erro', result.error)
    else toast.success('Fornecedor convidado')
    return result
  }

  const handleUpdateSupplierStatus = async (dealRoomId, fornecedorId, newStatus) => {
    const result = await updateSupplierStatus(dealRoomId, fornecedorId, newStatus)
    if (result.error) toast.error('Erro', result.error)
    return result
  }

  const handleSelectWinner = async (dealRoomId, fornecedorId, justificacao) => {
    const result = await selectWinner(dealRoomId, fornecedorId, justificacao)
    if (result.error) toast.error('Erro', result.error)
    else toast.success('Fornecedor selecionado', 'Deal Room concluído com sucesso')
    return result
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

  // Counts per status for tab badges
  const statusCounts = {
    ativo: fornecedores.filter(f => f.status === 'ativo').length,
    preferencial: fornecedores.filter(f => f.status === 'preferencial').length,
    inativo: fornecedores.filter(f => f.status === 'inativo').length,
  }

  // KPI data
  const avgRating = fornecedores.filter(f => f.rating).length > 0
    ? (fornecedores.filter(f => f.rating).reduce((s, f) => s + f.rating, 0) / fornecedores.filter(f => f.rating).length).toFixed(1)
    : '—'

  // G.A.R.V.I.S. KPI data (for the panel)
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
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
            border: `3px solid ${C.border}`,
            borderTopColor: C.success,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: C.light, fontFamily: FONTS.body, fontSize: '14px' }}>A carregar...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: '36px',
            fontWeight: 600,
            color: C.dark,
            letterSpacing: '-0.5px',
            margin: 0,
            lineHeight: 1.1
          }}>
            Fornecedores
          </h1>
          <p style={{
            fontFamily: FONTS.body,
            fontSize: '14px',
            color: C.light,
            marginTop: '6px'
          }}>
            Gestão de fornecedores e procurement
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowGarvis(!showGarvis)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px',
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              fontFamily: FONTS.body,
              fontSize: '13px',
              fontWeight: 600,
              color: C.dark,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} style={{ color: '#C9A86C' }} />
            G.A.R.V.I.S.
          </button>
          <button
            onClick={() => { resetForm(); setEditingFornecedor(null); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px',
              background: C.dark,
              border: 'none',
              borderRadius: '10px',
              fontFamily: FONTS.body,
              fontSize: '13px',
              fontWeight: 600,
              color: C.white,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Novo Fornecedor
          </button>
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        borderBottom: `1px solid ${C.border}`,
      }}>
        {statusTabs.map(t => {
          const count = t.key ? statusCounts[t.key] || 0 : fornecedores.length
          return (
            <button
              key={t.key}
              onClick={() => setFiltroStatus(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: filtroStatus === t.key ? `2px solid ${C.dark}` : '2px solid transparent',
                fontFamily: FONTS.body,
                fontSize: '13px',
                fontWeight: filtroStatus === t.key ? 700 : 400,
                color: filtroStatus === t.key ? C.dark : C.light,
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: '-1px',
              }}
            >
              {t.label}
              <span style={{
                background: filtroStatus === t.key ? C.dark : 'rgba(0,0,0,0.06)',
                color: filtroStatus === t.key ? C.white : C.light,
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '10px',
                lineHeight: '14px',
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ═══ KPI ROW ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {[
          { label: 'TOTAL', value: fornecedores.length, detail: `${statusCounts.ativo} ativos` },
          { label: 'ATIVOS', value: statusCounts.ativo, detail: `${statusCounts.preferencial} preferenciais` },
          { label: 'RATING MÉDIO', value: avgRating, detail: `${fornecedores.filter(f => f.rating).length} com avaliação`, icon: true },
          { label: 'ESPECIALIDADES', value: especialidadesUnicas.length, detail: `${kpis.dealRooms} deal rooms` },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: C.white,
            borderRadius: '14px',
            padding: '20px 22px',
            border: `1px solid ${C.border}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}>
            <span style={{
              fontFamily: FONTS.body, fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: C.muted,
            }}>
              {kpi.label}
            </span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              marginTop: '8px',
            }}>
              <span style={{
                fontFamily: FONTS.body, fontSize: '38px', fontWeight: 700,
                color: C.dark, lineHeight: 1, letterSpacing: '-1px',
              }}>
                {kpi.value}
              </span>
              {kpi.icon && <Star size={18} fill={C.warning} stroke={C.warning} style={{ marginBottom: '-4px' }} />}
            </div>
            <span style={{
              fontFamily: FONTS.body, fontSize: '12px',
              color: C.light, marginTop: '6px', display: 'block',
            }}>
              {kpi.detail}
            </span>
          </div>
        ))}
      </div>

      {/* ═══ SEARCH + FILTERS ═══ */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input
            type="text"
            placeholder="Pesquisar fornecedor, responsável ou especialidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              fontSize: '13px',
              fontFamily: FONTS.body,
              background: C.white,
              boxSizing: 'border-box',
              outline: 'none',
              color: C.dark,
            }}
          />
        </div>
        <select
          value={filtroEspecialidade}
          onChange={e => setFiltroEspecialidade(e.target.value)}
          style={{
            padding: '10px 14px',
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: FONTS.body,
            background: C.white,
            color: C.dark,
            cursor: 'pointer',
          }}
        >
          <option value="">Todas Especialidades</option>
          {especialidadesUnicas.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <button onClick={() => fileInputRef.current?.click()} style={{
            padding: '9px 14px', background: C.white, border: `1px solid ${C.border}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: FONTS.body,
            color: C.light, display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500,
          }}>
            <Upload size={13} /> Importar
          </button>
          <button onClick={exportarExcel} style={{
            padding: '9px 14px', background: C.white, border: `1px solid ${C.border}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: FONTS.body,
            color: C.light, display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500,
          }}>
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      {/* ═══ SUPPLIER TABLE ═══ */}
      <div style={{
        background: C.white,
        borderRadius: '14px',
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: FONTS.body, minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={thStyle}>FORNECEDOR</th>
                <th style={thStyle}>ESPECIALIDADE</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>RATING</th>
                <th style={thStyle}>CONTACTO</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>STATUS</th>
                <th style={{ ...thStyle, textAlign: 'center', width: '70px' }}></th>
              </tr>
            </thead>
            <tbody>
              {fornecedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: '48px', textAlign: 'center', color: C.light, fontFamily: FONTS.body,
                  }}>
                    Nenhum fornecedor encontrado
                  </td>
                </tr>
              ) : (
                fornecedoresFiltrados.map((f, idx) => {
                  const statusConf = STATUS_FORNECEDOR[f.status] || STATUS_FORNECEDOR.ativo
                  return (
                    <tr
                      key={f.id}
                      onClick={() => navigate(`/fornecedores/${f.id}`)}
                      style={{
                        borderTop: `1px solid ${C.border}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.cream}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Fornecedor */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px', height: '38px',
                            borderRadius: '10px',
                            background: C.cream,
                            border: `1px solid ${C.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: C.muted,
                            flexShrink: 0,
                          }}>
                            {f.nome?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{
                              fontFamily: FONTS.heading,
                              fontWeight: 600,
                              color: C.dark,
                              fontSize: '14px',
                            }}>
                              {f.nome}
                            </div>
                            {f.responsavel && (
                              <div style={{ fontSize: '12px', color: C.light, marginTop: '1px' }}>
                                {f.responsavel}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Especialidade */}
                      <td style={tdStyle}>
                        {f.especialidade ? (
                          <span style={{
                            padding: '4px 10px',
                            background: C.cream,
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: C.light,
                            fontWeight: 500,
                          }}>
                            {f.especialidade}
                          </span>
                        ) : (
                          <span style={{ color: C.muted, fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {f.rating ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Star size={13} fill={C.warning} stroke={C.warning} />
                            <span style={{ fontWeight: 700, fontSize: '13px', color: C.dark }}>{f.rating}</span>
                          </div>
                        ) : (
                          <span style={{ color: C.muted, fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Contacto */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {f.email && (
                            <span style={{ color: C.light, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Mail size={11} style={{ color: C.muted }} /> {f.email}
                            </span>
                          )}
                          {(f.telefone || f.telemovel) && (
                            <span style={{ color: C.light, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Phone size={11} style={{ color: C.muted }} /> {f.telemovel || f.telefone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: statusConf.bg,
                          color: statusConf.color,
                        }}>
                          <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: statusConf.color,
                          }} />
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => handleEdit(f)} style={actionBtnStyle}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(f)} style={{ ...actionBtnStyle, color: C.danger }}>
                            <Trash2 size={14} />
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

      {/* ═══ G.A.R.V.I.S. Side Panel (toggled) ═══ */}
      {showGarvis && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px',
          zIndex: 200, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        }}>
          <GarvisPanel
            onClose={() => setShowGarvis(false)}
            fornecedores={fornecedores}
            kpis={kpis}
            onOpenDealRoom={handleOpenDealRoom}
          />
        </div>
      )}

      {/* Deal Room Modal */}
      <DealRoomModal
        isOpen={showDealRoomModal}
        onClose={() => { setShowDealRoomModal(false); setSelectedDealRoom(null); fetchDealRooms() }}
        dealRoom={selectedDealRoom}
        fornecedores={fornecedores}
        onSave={handleSaveDealRoom}
        onInvite={handleInviteSupplier}
        onUpdateSupplierStatus={handleUpdateSupplierStatus}
        onSelectWinner={handleSelectWinner}
      />

      {/* Modal - Novo/Editar Fornecedor */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: C.white, borderRadius: '16px',
            width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{
                margin: 0, fontSize: '20px', fontWeight: 600,
                fontFamily: FONTS.heading, color: C.dark,
              }}>
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                padding: '4px', borderRadius: '6px',
              }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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

              <h4 style={{
                fontSize: '11px', fontWeight: 700, marginBottom: '14px',
                color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Contactos
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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

              <h4 style={{
                fontSize: '11px', fontWeight: 700, marginBottom: '14px',
                color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Status e Condições
              </h4>
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

            {/* Modal footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: '12px',
            }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: '10px 20px', background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontFamily: FONTS.body,
                color: C.dark, fontWeight: 500,
              }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '10px 24px', background: C.dark, color: C.white,
                border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px',
                fontFamily: FONTS.body, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
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

// Styles
const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#9A978A',
  background: '#F5F3EB',
  fontFamily: "'Quattrocento Sans', sans-serif",
}

const tdStyle = {
  padding: '12px 16px',
  verticalAlign: 'middle',
}

const actionBtnStyle = {
  padding: '6px',
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#9A978A',
  transition: 'all 0.15s',
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '5px',
  color: '#6B6B6B',
  fontFamily: "'Quattrocento Sans', sans-serif",
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E5E2D9',
  borderRadius: '8px',
  boxSizing: 'border-box',
  fontSize: '13px',
  fontFamily: "'Quattrocento Sans', sans-serif",
  color: '#2C2C2B',
  outline: 'none',
  background: '#FFFFFF',
}
