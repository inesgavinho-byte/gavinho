import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, X, Camera, BookOpen, FileText, AlertTriangle,
  Upload, Trash2, Edit, Send, FileCheck, ChevronDown,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { colors } from './constants'
import { formatDate } from './utils'

export default function AcompanhamentoTab({ obraId, activeSubtab, currentUser }) {
  // ============================================
  // FOTOGRAFIAS: STATE
  // ============================================
  const [fotos, setFotos] = useState([])
  const [fotosLoading, setFotosLoading] = useState(false)
  const [zonas, setZonas] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [fotoFiltroZona, setFotoFiltroZona] = useState('')
  const [fotoFiltroEspec, setFotoFiltroEspec] = useState('')
  const [showFotoModal, setShowFotoModal] = useState(false)
  const [fotoUploading, setFotoUploading] = useState(false)
  const [fotoForm, setFotoForm] = useState({ titulo: '', descricao: '', zona_id: '', especialidade_id: '', files: [] })
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const fotoInputRef = useRef(null)

  // ============================================
  // FOTOGRAFIAS: LOGIC
  // ============================================
  const loadFotos = useCallback(async () => {
    if (!obraId) return
    setFotosLoading(true)
    try {
      const [fotosRes, zonasRes, especRes] = await Promise.all([
        supabase.from('obra_fotografias').select('*, obra_zonas(nome), especialidades(nome, cor)').eq('obra_id', obraId).order('data_fotografia', { ascending: false }),
        supabase.from('obra_zonas').select('id, nome, piso').eq('obra_id', obraId).order('nome'),
        supabase.from('especialidades').select('id, nome, cor, categoria').eq('ativo', true).order('ordem')
      ])
      if (fotosRes.error) throw fotosRes.error
      setFotos(fotosRes.data || [])
      setZonas(zonasRes.data || [])
      setEspecialidades(especRes.data || [])
    } catch (err) { console.error('Erro fotos:', err) }
    finally { setFotosLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'fotografias' && obraId) loadFotos()
  }, [activeSubtab, obraId, loadFotos])

  const handleFotoUpload = async () => {
    if (!fotoForm.files.length || !obraId) return
    setFotoUploading(true)
    try {
      for (const file of fotoForm.files) {
        const ext = file.name.split('.').pop()
        const fileName = `${obraId}/fotos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('obras').upload(fileName, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('obras').getPublicUrl(fileName)

        await supabase.from('obra_fotografias').insert({
          obra_id: obraId,
          url: urlData.publicUrl,
          filename: file.name,
          tamanho_bytes: file.size,
          titulo: fotoForm.titulo || null,
          descricao: fotoForm.descricao || null,
          zona_id: fotoForm.zona_id || null,
          especialidade_id: fotoForm.especialidade_id || null,
          data_fotografia: new Date().toISOString().split('T')[0],
          autor_nome: currentUser?.nome || null,
          autor_id: currentUser?.id || null
        })
      }
      setShowFotoModal(false)
      setFotoForm({ titulo: '', descricao: '', zona_id: '', especialidade_id: '', files: [] })
      loadFotos()
    } catch (err) {
      console.error('Erro upload:', err)
      alert('Erro ao fazer upload: ' + err.message)
    } finally { setFotoUploading(false) }
  }

  const handleDeleteFoto = async (foto) => {
    if (!confirm('Eliminar esta fotografia?')) return
    try {
      const path = foto.url.split('/obras/')[1]
      if (path) await supabase.storage.from('obras').remove([path])
      await supabase.from('obra_fotografias').delete().eq('id', foto.id)
      loadFotos()
    } catch (err) { console.error('Erro delete foto:', err) }
  }

  const filteredFotos = fotos.filter(f => {
    if (fotoFiltroZona && f.zona_id !== fotoFiltroZona) return false
    if (fotoFiltroEspec && f.especialidade_id !== fotoFiltroEspec) return false
    return true
  })

  // Group filtered photos by date for timeline
  const groupedByDate = (() => {
    const groups = {}
    filteredFotos.forEach(f => {
      const key = f.data_fotografia || 'sem-data'
      if (!groups[key]) groups[key] = []
      groups[key].push(f)
    })
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, fotos]) => ({ date, fotos }))
  })()

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight' && lightboxIndex < filteredFotos.length - 1) setLightboxIndex(i => i + 1)
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(i => i - 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, filteredFotos.length])

  // Get the flat index of a photo in filteredFotos
  const openLightbox = (foto) => {
    const idx = filteredFotos.findIndex(f => f.id === foto.id)
    if (idx !== -1) setLightboxIndex(idx)
  }

  // ============================================
  // DIARIO DE PROJETO: STATE
  // ============================================
  const [diarioEntradas, setDiarioEntradas] = useState([])
  const [diarioLoading, setDiarioLoading] = useState(false)
  const [showDiarioModal, setShowDiarioModal] = useState(false)
  const [diarioSaving, setDiarioSaving] = useState(false)
  const [diarioForm, setDiarioForm] = useState({ titulo: '', descricao: '', tipo: 'manual', impacto_prazo: 'nenhum', impacto_custo: 'nenhum', accoes_requeridas: '', responsavel_accao: '', data_limite: '' })

  // ============================================
  // DIARIO DE PROJETO: LOGIC
  // ============================================
  const loadDiario = useCallback(async () => {
    if (!obraId) return
    setDiarioLoading(true)
    try {
      const { data, error } = await supabase.from('obra_diario_projeto').select('*').eq('obra_id', obraId).order('data_evento', { ascending: false })
      if (error) throw error
      setDiarioEntradas(data || [])
    } catch (err) { console.error('Erro diario:', err) }
    finally { setDiarioLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'diario' && obraId) loadDiario()
  }, [activeSubtab, obraId, loadDiario])

  const handleDiarioSave = async () => {
    if (!diarioForm.titulo) return
    setDiarioSaving(true)
    try {
      const maxNum = diarioEntradas.reduce((max, d) => { const n = parseInt(d.codigo?.replace('DP-', '')); return n > max ? n : max }, 0)
      await supabase.from('obra_diario_projeto').insert({
        obra_id: obraId, codigo: `DP-${String(maxNum + 1).padStart(3, '0')}`,
        titulo: diarioForm.titulo, descricao: diarioForm.descricao || null,
        tipo: diarioForm.tipo, impacto_prazo: diarioForm.impacto_prazo,
        impacto_custo: diarioForm.impacto_custo,
        accoes_requeridas: diarioForm.accoes_requeridas || null,
        responsavel_accao: diarioForm.responsavel_accao || null,
        data_limite: diarioForm.data_limite || null,
        created_by: currentUser?.id || null
      })
      setShowDiarioModal(false)
      setDiarioForm({ titulo: '', descricao: '', tipo: 'manual', impacto_prazo: 'nenhum', impacto_custo: 'nenhum', accoes_requeridas: '', responsavel_accao: '', data_limite: '' })
      loadDiario()
    } catch (err) { console.error('Erro diario:', err); alert('Erro: ' + err.message) }
    finally { setDiarioSaving(false) }
  }

  // ============================================
  // RELATORIOS: STATE
  // ============================================
  const [relatorios, setRelatorios] = useState([])
  const [relatoriosLoading, setRelatoriosLoading] = useState(false)
  const [showRelModal, setShowRelModal] = useState(false)
  const [editingRel, setEditingRel] = useState(null)
  const [relSaving, setRelSaving] = useState(false)
  const [relForm, setRelForm] = useState({ titulo: '', tipo: 'semanal', data_inicio: '', data_fim: '', resumo_executivo: '', trabalhos_realizados: '', trabalhos_proxima_semana: '', problemas_identificados: '', progresso_global: 0 })

  // ============================================
  // RELATORIOS: LOGIC
  // ============================================
  const loadRelatorios = useCallback(async () => {
    if (!obraId) return
    setRelatoriosLoading(true)
    try {
      const { data, error } = await supabase.from('obra_relatorios')
        .select('*')
        .eq('obra_id', obraId)
        .order('data_fim', { ascending: false })
      if (error) throw error
      setRelatorios(data || [])
    } catch (err) { console.error('Erro relatorios:', err) }
    finally { setRelatoriosLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'relatorios' && obraId) loadRelatorios()
  }, [activeSubtab, obraId, loadRelatorios])

  const getNextRelCodigo = () => {
    const maxNum = relatorios.reduce((max, r) => {
      const num = parseInt(r.codigo?.replace('REL-', ''))
      return num > max ? num : max
    }, 0)
    return `REL-${String(maxNum + 1).padStart(3, '0')}`
  }

  const openRelModal = (rel = null) => {
    if (rel) {
      setEditingRel(rel)
      setRelForm({
        titulo: rel.titulo || '', tipo: rel.tipo || 'semanal',
        data_inicio: rel.data_inicio || '', data_fim: rel.data_fim || '',
        resumo_executivo: rel.resumo_executivo || '',
        trabalhos_realizados: rel.trabalhos_realizados || '',
        trabalhos_proxima_semana: rel.trabalhos_proxima_semana || '',
        problemas_identificados: rel.problemas_identificados || '',
        progresso_global: rel.progresso_global || 0,
      })
    } else {
      setEditingRel(null)
      const hoje = new Date()
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1)
      setRelForm({
        titulo: '', tipo: 'semanal',
        data_inicio: inicioSemana.toISOString().split('T')[0],
        data_fim: hoje.toISOString().split('T')[0],
        resumo_executivo: '', trabalhos_realizados: '',
        trabalhos_proxima_semana: '', problemas_identificados: '',
        progresso_global: 0,
      })
    }
    setShowRelModal(true)
  }

  const handleRelSave = async () => {
    if (!relForm.titulo || !relForm.data_inicio || !relForm.data_fim) return
    setRelSaving(true)
    try {
      const data = {
        obra_id: obraId, titulo: relForm.titulo, tipo: relForm.tipo,
        data_inicio: relForm.data_inicio, data_fim: relForm.data_fim,
        resumo_executivo: relForm.resumo_executivo || null,
        trabalhos_realizados: relForm.trabalhos_realizados || null,
        trabalhos_proxima_semana: relForm.trabalhos_proxima_semana || null,
        problemas_identificados: relForm.problemas_identificados || null,
        progresso_global: relForm.progresso_global,
      }
      if (editingRel) {
        await supabase.from('obra_relatorios').update(data).eq('id', editingRel.id)
      } else {
        data.codigo = getNextRelCodigo()
        data.estado = 'rascunho'
        data.autor_id = currentUser?.id || null
        await supabase.from('obra_relatorios').insert(data)
      }
      setShowRelModal(false)
      loadRelatorios()
    } catch (err) {
      console.error('Erro relatorio:', err)
      alert('Erro: ' + err.message)
    } finally { setRelSaving(false) }
  }

  const handleRelEstadoChange = async (rel, novoEstado) => {
    try {
      const update = { estado: novoEstado }
      if (novoEstado === 'publicado') update.data_publicacao = new Date().toISOString()
      await supabase.from('obra_relatorios').update(update).eq('id', rel.id)
      loadRelatorios()
    } catch (err) { console.error('Erro estado rel:', err) }
  }

  const relEstados = {
    rascunho: { label: 'Rascunho', color: '#6B7280', bg: '#F3F4F6' },
    em_revisao: { label: 'Em Revisao', color: '#F59E0B', bg: '#FEF3C7' },
    publicado: { label: 'Publicado', color: '#10B981', bg: '#D1FAE5' },
  }

  // ============================================
  // NAO CONFORMIDADES: STATE
  // ============================================
  const [ncs, setNcs] = useState([])
  const [ncsLoading, setNcsLoading] = useState(false)
  const [ncFiltroEstado, setNcFiltroEstado] = useState('')
  const [ncFiltroGravidade, setNcFiltroGravidade] = useState('')
  const [showNcModal, setShowNcModal] = useState(false)
  const [editingNc, setEditingNc] = useState(null)
  const [ncSaving, setNcSaving] = useState(false)
  const [ncForm, setNcForm] = useState({ titulo: '', descricao: '', tipo: 'execucao', gravidade: 'menor', especialidade_id: '', zona_id: '', data_limite_resolucao: '', responsavel_resolucao: '', acao_corretiva: '', acao_preventiva: '' })
  const [expandedNc, setExpandedNc] = useState(null)

  const ncEstados = [
    { value: 'aberta', label: 'Aberta', color: '#F44336', bg: '#FFEBEE' },
    { value: 'em_resolucao', label: 'Em Resolucao', color: '#FF9800', bg: '#FFF3E0' },
    { value: 'resolvida', label: 'Resolvida', color: '#4CAF50', bg: '#E8F5E9' },
    { value: 'verificada', label: 'Verificada', color: '#2196F3', bg: '#E3F2FD' },
    { value: 'encerrada', label: 'Encerrada', color: '#9E9E9E', bg: '#F5F5F5' },
  ]

  const ncGravidades = [
    { value: 'menor', label: 'Menor', color: '#FF9800' },
    { value: 'maior', label: 'Maior', color: '#F44336' },
    { value: 'critica', label: 'Critica', color: '#9C27B0' },
  ]

  // ============================================
  // NAO CONFORMIDADES: LOGIC
  // ============================================
  const loadNcs = useCallback(async () => {
    if (!obraId) return
    setNcsLoading(true)
    try {
      const { data, error } = await supabase.from('nao_conformidades')
        .select('*, especialidades(nome, cor), obra_zonas(nome)')
        .eq('obra_id', obraId)
        .order('data_identificacao', { ascending: false })
      if (error) throw error
      setNcs(data || [])
    } catch (err) { console.error('Erro NCs:', err) }
    finally { setNcsLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'nao-conformidades' && obraId) loadNcs()
  }, [activeSubtab, obraId, loadNcs])

  const getNextNcCodigo = () => {
    const maxNum = ncs.reduce((max, nc) => {
      const num = parseInt(nc.codigo?.replace('NC-', ''))
      return num > max ? num : max
    }, 0)
    return `NC-${String(maxNum + 1).padStart(3, '0')}`
  }

  const openNcModal = (nc = null) => {
    if (nc) {
      setEditingNc(nc)
      setNcForm({
        titulo: nc.titulo || '', descricao: nc.descricao || '', tipo: nc.tipo || 'execucao',
        gravidade: nc.gravidade || 'menor', especialidade_id: nc.especialidade_id || '',
        zona_id: nc.zona_id || '', data_limite_resolucao: nc.data_limite_resolucao || '',
        responsavel_resolucao: nc.responsavel_resolucao || '',
        acao_corretiva: nc.acao_corretiva || '', acao_preventiva: nc.acao_preventiva || ''
      })
    } else {
      setEditingNc(null)
      setNcForm({ titulo: '', descricao: '', tipo: 'execucao', gravidade: 'menor', especialidade_id: '', zona_id: '', data_limite_resolucao: '', responsavel_resolucao: '', acao_corretiva: '', acao_preventiva: '' })
    }
    setShowNcModal(true)
  }

  const handleNcSave = async () => {
    if (!ncForm.titulo || !ncForm.descricao) return
    setNcSaving(true)
    try {
      const data = {
        obra_id: obraId, titulo: ncForm.titulo, descricao: ncForm.descricao,
        tipo: ncForm.tipo, gravidade: ncForm.gravidade,
        especialidade_id: ncForm.especialidade_id || null,
        zona_id: ncForm.zona_id || null,
        data_limite_resolucao: ncForm.data_limite_resolucao || null,
        responsavel_resolucao: ncForm.responsavel_resolucao || null,
        acao_corretiva: ncForm.acao_corretiva || null,
        acao_preventiva: ncForm.acao_preventiva || null,
      }
      if (editingNc) {
        await supabase.from('nao_conformidades').update(data).eq('id', editingNc.id)
      } else {
        data.codigo = getNextNcCodigo()
        data.identificado_por = currentUser?.id || null
        data.created_by = currentUser?.id || null
        await supabase.from('nao_conformidades').insert(data)
      }
      setShowNcModal(false)
      loadNcs()
    } catch (err) {
      console.error('Erro NC:', err)
      alert('Erro: ' + err.message)
    } finally { setNcSaving(false) }
  }

  const handleNcEstadoChange = async (nc, novoEstado) => {
    try {
      const update = { estado: novoEstado }
      if (novoEstado === 'resolvida') update.data_resolucao = new Date().toISOString().split('T')[0]
      if (novoEstado === 'verificada') { update.data_verificacao = new Date().toISOString().split('T')[0]; update.verificado_por = currentUser?.id || null }
      await supabase.from('nao_conformidades').update(update).eq('id', nc.id)
      loadNcs()
    } catch (err) { console.error('Erro estado NC:', err) }
  }

  const filteredNcs = ncs.filter(nc => {
    if (ncFiltroEstado && nc.estado !== ncFiltroEstado) return false
    if (ncFiltroGravidade && nc.gravidade !== ncFiltroGravidade) return false
    return true
  })

  const ncStats = {
    abertas: ncs.filter(n => n.estado === 'aberta').length,
    emResolucao: ncs.filter(n => n.estado === 'em_resolucao').length,
    resolvidas: ncs.filter(n => ['resolvida', 'verificada', 'encerrada'].includes(n.estado)).length,
    criticas: ncs.filter(n => n.gravidade === 'critica' && !['encerrada', 'verificada'].includes(n.estado)).length,
  }

  // ============================================
  // RENDER: FOTOGRAFIAS (Timeline)
  // ============================================
  const formatDateLabel = (dateStr) => {
    if (!dateStr || dateStr === 'sem-data') return 'Sem data'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const lightboxFoto = lightboxIndex !== null ? filteredFotos[lightboxIndex] : null

  const renderFotografiasTab = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={fotoFiltroZona} onChange={e => setFotoFiltroZona(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="">Todas as zonas</option>
            {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}{z.piso ? ` (${z.piso})` : ''}</option>)}
          </select>
          <select value={fotoFiltroEspec} onChange={e => setFotoFiltroEspec(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="">Todas as especialidades</option>
            {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <button onClick={() => setShowFotoModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <Upload size={16} /> Upload Fotos
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>
          {filteredFotos.length} fotografia{filteredFotos.length !== 1 ? 's' : ''}
          {groupedByDate.length > 0 && <> &middot; {groupedByDate.length} data{groupedByDate.length !== 1 ? 's' : ''}</>}
        </span>
      </div>

      {/* Timeline */}
      {fotosLoading ? (
        <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
      ) : filteredFotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}` }}>
          <Camera size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
          <p style={{ color: colors.textMuted }}>Nenhuma fotografia</p>
          <button onClick={() => setShowFotoModal(true)} style={{ marginTop: 8, padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            <Upload size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Adicionar
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 5, top: 6, bottom: 0, width: 2, background: colors.border }} />

          {groupedByDate.map((group, gi) => (
            <div key={group.date} style={{ marginBottom: gi < groupedByDate.length - 1 ? 24 : 0 }}>
              {/* Date header with dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, position: 'relative' }}>
                {/* Dot */}
                <div style={{ position: 'absolute', left: -28, top: 1, width: 12, height: 12, borderRadius: '50%', background: colors.primary, border: `2px solid ${colors.white}`, boxShadow: `0 0 0 2px ${colors.border}`, zIndex: 1 }} />
                {/* Date label */}
                <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{formatDateLabel(group.date)}</span>
                <span style={{ fontSize: 12, color: colors.textMuted }}>{group.fotos.length} foto{group.fotos.length !== 1 ? 's' : ''}</span>
                <div style={{ flex: 1, height: 1, background: colors.border }} />
              </div>

              {/* Photo grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {group.fotos.map(foto => (
                  <div key={foto.id} onClick={() => openLightbox(foto)} style={{ background: colors.white, borderRadius: 8, overflow: 'hidden', border: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ position: 'relative', paddingBottom: '75%', background: '#f0ede8' }}>
                      <img src={foto.url} alt={foto.titulo || foto.filename} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      {foto.especialidades && (
                        <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 600, background: foto.especialidades.cor || colors.primary, color: '#fff' }}>
                          {foto.especialidades.nome}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {foto.titulo || foto.filename}
                      </div>
                      {foto.obra_zonas && (
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{foto.obra_zonas.nome}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox with navigation */}
      {lightboxFoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', flexDirection: 'column' }} onClick={() => setLightboxIndex(null)}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              {lightboxIndex + 1} de {filteredFotos.length}
            </div>
            <button onClick={() => setLightboxIndex(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>

          {/* Image area with arrows */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 16, minHeight: 0 }} onClick={e => e.stopPropagation()}>
            {/* Left arrow */}
            <button
              onClick={() => lightboxIndex > 0 && setLightboxIndex(lightboxIndex - 1)}
              disabled={lightboxIndex === 0}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: lightboxIndex === 0 ? 'default' : 'pointer', color: lightboxIndex === 0 ? 'rgba(255,255,255,0.2)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Image */}
            <img
              src={lightboxFoto.url}
              alt={lightboxFoto.titulo || ''}
              style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
            />

            {/* Right arrow */}
            <button
              onClick={() => lightboxIndex < filteredFotos.length - 1 && setLightboxIndex(lightboxIndex + 1)}
              disabled={lightboxIndex === filteredFotos.length - 1}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: lightboxIndex === filteredFotos.length - 1 ? 'default' : 'pointer', color: lightboxIndex === filteredFotos.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Bottom info bar */}
          <div style={{ padding: '16px 24px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                {lightboxFoto.titulo || lightboxFoto.filename}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {new Date(lightboxFoto.data_fotografia).toLocaleDateString('pt-PT')}
                {lightboxFoto.obra_zonas && <> &middot; {lightboxFoto.obra_zonas.nome}</>}
                {lightboxFoto.especialidades && <> &middot; {lightboxFoto.especialidades.nome}</>}
                {lightboxFoto.autor && <> &middot; {lightboxFoto.autor}</>}
              </div>
              {lightboxFoto.descricao && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{lightboxFoto.descricao}</div>
              )}
            </div>
            <button onClick={() => { const idx = lightboxIndex; handleDeleteFoto(filteredFotos[idx]).then(() => { if (filteredFotos.length <= 1) setLightboxIndex(null); else if (idx >= filteredFotos.length - 1) setLightboxIndex(idx - 1) }) }} style={{ padding: '8px 14px', background: 'rgba(244,67,54,0.15)', color: '#F44336', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              <Trash2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showFotoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>Upload Fotografias</h2>
              <button onClick={() => setShowFotoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Fotografias *</label>
                <input ref={fotoInputRef} type="file" accept="image/*" multiple onChange={e => setFotoForm({ ...fotoForm, files: Array.from(e.target.files) })} style={{ display: 'none' }} />
                <button onClick={() => fotoInputRef.current?.click()} style={{ width: '100%', padding: 24, border: `2px dashed ${colors.border}`, borderRadius: 10, background: colors.background, cursor: 'pointer', fontSize: 13, color: colors.textMuted }}>
                  <Camera size={24} style={{ display: 'block', margin: '0 auto 8px' }} />
                  {fotoForm.files.length ? `${fotoForm.files.length} ficheiro(s) selecionado(s)` : 'Clica para selecionar fotografias'}
                </button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Titulo</label>
                <input type="text" value={fotoForm.titulo} onChange={e => setFotoForm({ ...fotoForm, titulo: e.target.value })} placeholder="Ex: Betonagem laje piso 2" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Descricao</label>
                <textarea value={fotoForm.descricao} onChange={e => setFotoForm({ ...fotoForm, descricao: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Zona</label>
                  <select value={fotoForm.zona_id} onChange={e => setFotoForm({ ...fotoForm, zona_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Especialidade</label>
                  <select value={fotoForm.especialidade_id} onChange={e => setFotoForm({ ...fotoForm, especialidade_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-</option>
                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowFotoModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer', color: colors.text }}>Cancelar</button>
              <button onClick={handleFotoUpload} disabled={!fotoForm.files.length || fotoUploading} style={{ flex: 1, padding: '12px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !fotoForm.files.length ? 0.5 : 1 }}>
                {fotoUploading ? 'A enviar...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // RENDER: DIARIO
  // ============================================
  const renderDiarioTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>{diarioEntradas.length} entrada{diarioEntradas.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowDiarioModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><Plus size={16} /> Nova Entrada</button>
      </div>
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {diarioLoading ? <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        : diarioEntradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <BookOpen size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhuma entrada no diario</p>
          </div>
        ) : diarioEntradas.map((d, i) => (
          <div key={d.id} style={{ padding: '16px 20px', borderBottom: i < diarioEntradas.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>{d.codigo}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{d.titulo}</span>
              {d.impacto_prazo !== 'nenhum' && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: '#E3F2FD', color: '#1976D2' }}>Prazo: {d.impacto_prazo}</span>}
              {d.impacto_custo !== 'nenhum' && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: '#F3E5F5', color: '#7B1FA2' }}>Custo: {d.impacto_custo}</span>}
            </div>
            {d.descricao && <p style={{ margin: '0 0 6px', fontSize: 13, color: colors.textMuted }}>{d.descricao}</p>}
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: colors.textMuted }}>
              <span>{new Date(d.data_evento).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              {d.responsavel_accao && <span>Resp: {d.responsavel_accao}</span>}
              {d.data_limite && <span>Prazo: {new Date(d.data_limite).toLocaleDateString('pt-PT')}</span>}
            </div>
          </div>
        ))}
      </div>
      {showDiarioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>Nova Entrada</h2>
              <button onClick={() => setShowDiarioModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Titulo *</label>
                <input type="text" value={diarioForm.titulo} onChange={e => setDiarioForm({ ...diarioForm, titulo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Descricao</label>
                <textarea value={diarioForm.descricao} onChange={e => setDiarioForm({ ...diarioForm, descricao: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Impacto prazo</label>
                  <select value={diarioForm.impacto_prazo} onChange={e => setDiarioForm({ ...diarioForm, impacto_prazo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="nenhum">Nenhum</option><option value="menor">Menor</option><option value="significativo">Significativo</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Impacto custo</label>
                  <select value={diarioForm.impacto_custo} onChange={e => setDiarioForm({ ...diarioForm, impacto_custo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="nenhum">Nenhum</option><option value="menor">Menor</option><option value="significativo">Significativo</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Acoes requeridas</label>
                <textarea value={diarioForm.accoes_requeridas} onChange={e => setDiarioForm({ ...diarioForm, accoes_requeridas: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Responsavel</label>
                  <input type="text" value={diarioForm.responsavel_accao} onChange={e => setDiarioForm({ ...diarioForm, responsavel_accao: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Prazo</label>
                  <input type="date" value={diarioForm.data_limite} onChange={e => setDiarioForm({ ...diarioForm, data_limite: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowDiarioModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDiarioSave} disabled={!diarioForm.titulo || diarioSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !diarioForm.titulo ? 0.5 : 1 }}>
                {diarioSaving ? 'A guardar...' : 'Criar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // RENDER: RELATORIOS
  // ============================================
  const renderRelatoriosTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>
          {relatorios.length} relatorio{relatorios.length !== 1 ? 's' : ''}
        </span>
        <button onClick={() => openRelModal()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={16} /> Novo Relatorio
        </button>
      </div>

      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {relatoriosLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        ) : relatorios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <FileText size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhum relatorio</p>
          </div>
        ) : relatorios.map((rel, i) => {
          const estado = relEstados[rel.estado] || relEstados.rascunho
          return (
            <div key={rel.id} style={{ padding: '16px 20px', borderBottom: i < relatorios.length - 1 ? `1px solid ${colors.border}` : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} style={{ color: colors.primary }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>{rel.codigo}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{rel.titulo}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                  <span>{rel.tipo}</span>
                  <span>{new Date(rel.data_inicio).toLocaleDateString('pt-PT')} - {new Date(rel.data_fim).toLocaleDateString('pt-PT')}</span>
                  {rel.progresso_global > 0 && <span>Progresso: {rel.progresso_global}%</span>}
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: estado.color, background: estado.bg }}>{estado.label}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {rel.estado === 'rascunho' && (
                  <button onClick={() => handleRelEstadoChange(rel, 'em_revisao')} style={{ padding: '6px 10px', background: '#FEF3C7', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#F59E0B' }} title="Enviar para revisao">
                    <Send size={12} />
                  </button>
                )}
                {rel.estado === 'em_revisao' && (
                  <button onClick={() => handleRelEstadoChange(rel, 'publicado')} style={{ padding: '6px 10px', background: '#D1FAE5', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#10B981' }} title="Publicar">
                    <FileCheck size={12} />
                  </button>
                )}
                <button onClick={() => openRelModal(rel)} style={{ padding: '6px 10px', background: colors.background, border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: colors.text }} title="Editar">
                  <Edit size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Relatorio Modal */}
      {showRelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>{editingRel ? 'Editar Relatorio' : 'Novo Relatorio'}</h2>
              <button onClick={() => setShowRelModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Titulo *</label>
                <input type="text" value={relForm.titulo} onChange={e => setRelForm({ ...relForm, titulo: e.target.value })} placeholder="Ex: Relatorio Semanal #12" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Tipo</label>
                  <select value={relForm.tipo} onChange={e => setRelForm({ ...relForm, tipo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option><option value="milestone">Milestone</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Data inicio *</label>
                  <input type="date" value={relForm.data_inicio} onChange={e => setRelForm({ ...relForm, data_inicio: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Data fim *</label>
                  <input type="date" value={relForm.data_fim} onChange={e => setRelForm({ ...relForm, data_fim: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Progresso global (%)</label>
                <input type="range" min="0" max="100" value={relForm.progresso_global} onChange={e => setRelForm({ ...relForm, progresso_global: parseInt(e.target.value) })} style={{ width: '100%' }} />
                <span style={{ fontSize: 13, color: colors.textMuted }}>{relForm.progresso_global}%</span>
              </div>
              {[
                { key: 'resumo_executivo', label: 'Resumo executivo' },
                { key: 'trabalhos_realizados', label: 'Trabalhos realizados' },
                { key: 'trabalhos_proxima_semana', label: 'Trabalhos proxima semana' },
                { key: 'problemas_identificados', label: 'Problemas identificados' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>{field.label}</label>
                  <textarea value={relForm[field.key]} onChange={e => setRelForm({ ...relForm, [field.key]: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              ))}
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowRelModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleRelSave} disabled={!relForm.titulo || !relForm.data_inicio || !relForm.data_fim || relSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!relForm.titulo) ? 0.5 : 1 }}>
                {relSaving ? 'A guardar...' : (editingRel ? 'Guardar' : 'Criar Relatorio')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // RENDER: NAO CONFORMIDADES
  // ============================================
  const renderNaoConformidadesTab = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={ncFiltroEstado} onChange={e => setNcFiltroEstado(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="">Todos os estados</option>
            {ncEstados.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={ncFiltroGravidade} onChange={e => setNcFiltroGravidade(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13 }}>
            <option value="">Todas as gravidades</option>
            {ncGravidades.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <button onClick={() => openNcModal()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={16} /> Nova NC
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Abertas', value: ncStats.abertas, color: '#F44336', bg: '#FFEBEE' },
          { label: 'Em Resolucao', value: ncStats.emResolucao, color: '#FF9800', bg: '#FFF3E0' },
          { label: 'Resolvidas', value: ncStats.resolvidas, color: '#4CAF50', bg: '#E8F5E9' },
          { label: 'Criticas', value: ncStats.criticas, color: '#9C27B0', bg: '#F3E5F5' },
        ].map(s => (
          <div key={s.label} style={{ padding: 14, background: s.bg, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {ncsLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        ) : filteredNcs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <AlertTriangle size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhuma NC encontrada</p>
          </div>
        ) : filteredNcs.map((nc, i) => {
          const estadoInfo = ncEstados.find(e => e.value === nc.estado) || ncEstados[0]
          const gravInfo = ncGravidades.find(g => g.value === nc.gravidade) || ncGravidades[0]
          const isExpanded = expandedNc === nc.id
          return (
            <div key={nc.id} style={{ borderBottom: i < filteredNcs.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpandedNc(isExpanded ? null : nc.id)}>
                <div style={{ width: 6, height: 36, borderRadius: 3, background: gravInfo.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>{nc.codigo}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.titulo}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                    <span>{new Date(nc.data_identificacao).toLocaleDateString('pt-PT')}</span>
                    {nc.especialidades && <span>{nc.especialidades.nome}</span>}
                    {nc.obra_zonas && <span>{nc.obra_zonas.nome}</span>}
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: estadoInfo.color, background: estadoInfo.bg }}>{estadoInfo.label}</span>
                <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: gravInfo.color }}>{gravInfo.label}</span>
                <ChevronDown size={18} style={{ color: colors.textMuted, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              {isExpanded && (
                <div style={{ padding: '0 20px 16px 40px', fontSize: 13 }}>
                  <p style={{ color: colors.text, marginTop: 0 }}>{nc.descricao}</p>
                  {nc.acao_corretiva && <div style={{ marginBottom: 8 }}><strong style={{ color: colors.text }}>Acao corretiva:</strong> <span style={{ color: colors.textMuted }}>{nc.acao_corretiva}</span></div>}
                  {nc.acao_preventiva && <div style={{ marginBottom: 8 }}><strong style={{ color: colors.text }}>Acao preventiva:</strong> <span style={{ color: colors.textMuted }}>{nc.acao_preventiva}</span></div>}
                  {nc.responsavel_resolucao && <div style={{ marginBottom: 8 }}><strong>Responsavel:</strong> {nc.responsavel_resolucao}</div>}
                  {nc.data_limite_resolucao && <div style={{ marginBottom: 8 }}><strong>Prazo:</strong> {new Date(nc.data_limite_resolucao).toLocaleDateString('pt-PT')}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => openNcModal(nc)} style={{ padding: '6px 14px', background: colors.background, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: colors.text }}>
                      <Edit size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Editar
                    </button>
                    {nc.estado === 'aberta' && (
                      <button onClick={() => handleNcEstadoChange(nc, 'em_resolucao')} style={{ padding: '6px 14px', background: '#FFF3E0', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#FF9800' }}>
                        Iniciar Resolucao
                      </button>
                    )}
                    {nc.estado === 'em_resolucao' && (
                      <button onClick={() => handleNcEstadoChange(nc, 'resolvida')} style={{ padding: '6px 14px', background: '#E8F5E9', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4CAF50' }}>
                        Marcar Resolvida
                      </button>
                    )}
                    {nc.estado === 'resolvida' && (
                      <button onClick={() => handleNcEstadoChange(nc, 'verificada')} style={{ padding: '6px 14px', background: '#E3F2FD', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#2196F3' }}>
                        Verificar
                      </button>
                    )}
                    {nc.estado === 'verificada' && (
                      <button onClick={() => handleNcEstadoChange(nc, 'encerrada')} style={{ padding: '6px 14px', background: '#F5F5F5', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#9E9E9E' }}>
                        Encerrar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* NC Modal */}
      {showNcModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>{editingNc ? 'Editar NC' : 'Nova Nao Conformidade'}</h2>
              <button onClick={() => setShowNcModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Titulo *</label>
                <input type="text" value={ncForm.titulo} onChange={e => setNcForm({ ...ncForm, titulo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Descricao *</label>
                <textarea value={ncForm.descricao} onChange={e => setNcForm({ ...ncForm, descricao: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Tipo</label>
                  <select value={ncForm.tipo} onChange={e => setNcForm({ ...ncForm, tipo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="execucao">Execucao</option><option value="material">Material</option>
                    <option value="projeto">Projeto</option><option value="seguranca">Seguranca</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Gravidade</label>
                  <select value={ncForm.gravidade} onChange={e => setNcForm({ ...ncForm, gravidade: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="menor">Menor</option><option value="maior">Maior</option><option value="critica">Critica</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Zona</label>
                  <select value={ncForm.zona_id} onChange={e => setNcForm({ ...ncForm, zona_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Especialidade</label>
                  <select value={ncForm.especialidade_id} onChange={e => setNcForm({ ...ncForm, especialidade_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">-</option>
                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Prazo resolucao</label>
                  <input type="date" value={ncForm.data_limite_resolucao} onChange={e => setNcForm({ ...ncForm, data_limite_resolucao: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Responsavel</label>
                  <input type="text" value={ncForm.responsavel_resolucao} onChange={e => setNcForm({ ...ncForm, responsavel_resolucao: e.target.value })} placeholder="Nome do responsavel" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Acao corretiva</label>
                <textarea value={ncForm.acao_corretiva} onChange={e => setNcForm({ ...ncForm, acao_corretiva: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Acao preventiva</label>
                <textarea value={ncForm.acao_preventiva} onChange={e => setNcForm({ ...ncForm, acao_preventiva: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowNcModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleNcSave} disabled={!ncForm.titulo || !ncForm.descricao || ncSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!ncForm.titulo || !ncForm.descricao) ? 0.5 : 1 }}>
                {ncSaving ? 'A guardar...' : (editingNc ? 'Guardar' : 'Criar NC')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // MAIN RETURN
  // ============================================
  return (
    <>
      {activeSubtab === 'fotografias' && renderFotografiasTab()}
      {activeSubtab === 'diario' && renderDiarioTab()}
      {activeSubtab === 'relatorios' && renderRelatoriosTab()}
      {activeSubtab === 'nao-conformidades' && renderNaoConformidadesTab()}
    </>
  )
}
