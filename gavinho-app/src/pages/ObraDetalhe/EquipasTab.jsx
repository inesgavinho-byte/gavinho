import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Users, Truck, Grid3X3, Trash2 } from 'lucide-react'
import { colors } from './constants'

export default function EquipasTab({ obraId, activeSubtab }) {
  // ============================================
  // SHARED: ESPECIALIDADES
  // ============================================
  const [especialidades, setEspecialidades] = useState([])

  const loadEspecialidades = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('especialidades').select('id, nome, cor, categoria').eq('ativo', true).order('ordem')
      if (error) throw error
      setEspecialidades(data || [])
    } catch (err) { console.error('Erro especialidades:', err) }
  }, [])

  // ============================================
  // EQUIPA GAVINHO
  // ============================================
  const [equipaMembers, setEquipaMembers] = useState([])
  const [equipaLoading, setEquipaLoading] = useState(false)
  const [allTrabalhadores, setAllTrabalhadores] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [addMemberTrab, setAddMemberTrab] = useState('')

  const loadEquipa = useCallback(async () => {
    if (!obraId) return
    setEquipaLoading(true)
    try {
      const [membersRes, trabRes] = await Promise.all([
        supabase.from('trabalhador_obras').select('*, trabalhadores(id, nome, cargo, telefone, ativo)').eq('obra_id', obraId),
        supabase.from('trabalhadores').select('id, nome, cargo').eq('ativo', true).order('nome')
      ])
      setEquipaMembers(membersRes.data || [])
      setAllTrabalhadores(trabRes.data || [])
    } catch (err) { console.error('Erro equipa:', err) }
    finally { setEquipaLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'equipa' && obraId) loadEquipa()
  }, [activeSubtab, obraId, loadEquipa])

  const handleAddMember = async () => {
    if (!addMemberTrab) return
    try {
      await supabase.from('trabalhador_obras').insert({ trabalhador_id: addMemberTrab, obra_id: obraId })
      setShowAddMember(false)
      setAddMemberTrab('')
      loadEquipa()
    } catch (err) { console.error('Erro:', err); alert('Erro: ' + err.message) }
  }

  const handleRemoveMember = async (member) => {
    if (!confirm(`Remover ${member.trabalhadores?.nome} desta obra?`)) return
    try {
      await supabase.from('trabalhador_obras').delete().eq('id', member.id)
      loadEquipa()
    } catch (err) { console.error('Erro:', err) }
  }

  const existingIds = equipaMembers.map(m => m.trabalhador_id)
  const availableTrab = allTrabalhadores.filter(t => !existingIds.includes(t.id))

  // ============================================
  // SUBEMPREITEIROS
  // ============================================
  const [subs, setSubs] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [subSaving, setSubSaving] = useState(false)
  const [subForm, setSubForm] = useState({ nome: '', empresa: '', nif: '', contacto: '', email: '', especialidade_id: '', contrato_valor: '', contrato_inicio: '', contrato_fim: '', notas: '' })

  const loadSubs = useCallback(async () => {
    if (!obraId) return
    setSubsLoading(true)
    try {
      const { data, error } = await supabase.from('obra_subempreiteiros').select('*, especialidades(nome, cor)').eq('obra_id', obraId).order('nome')
      if (error) throw error
      setSubs(data || [])
    } catch (err) { console.error('Erro subs:', err) }
    finally { setSubsLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'subempreiteiros' && obraId) {
      loadSubs()
      if (especialidades.length === 0) loadEspecialidades()
    }
  }, [activeSubtab, obraId, loadSubs, especialidades.length, loadEspecialidades])

  const handleSubSave = async () => {
    if (!subForm.nome) return
    setSubSaving(true)
    try {
      await supabase.from('obra_subempreiteiros').insert({
        obra_id: obraId, nome: subForm.nome, empresa: subForm.empresa || null,
        nif: subForm.nif || null, contacto: subForm.contacto || null,
        email: subForm.email || null, especialidade_id: subForm.especialidade_id || null,
        contrato_valor: subForm.contrato_valor ? parseFloat(subForm.contrato_valor) : null,
        contrato_inicio: subForm.contrato_inicio || null, contrato_fim: subForm.contrato_fim || null,
        notas: subForm.notas || null
      })
      setShowSubModal(false)
      setSubForm({ nome: '', empresa: '', nif: '', contacto: '', email: '', especialidade_id: '', contrato_valor: '', contrato_inicio: '', contrato_fim: '', notas: '' })
      loadSubs()
    } catch (err) { console.error('Erro:', err); alert('Erro: ' + err.message) }
    finally { setSubSaving(false) }
  }

  // ============================================
  // ZONAS
  // ============================================
  const [zonasObra, setZonasObra] = useState([])
  const [zonasObraLoading, setZonasObraLoading] = useState(false)
  const [showZonaModal, setShowZonaModal] = useState(false)
  const [zonaSaving, setZonaSaving] = useState(false)
  const [zonaForm, setZonaForm] = useState({ nome: '', piso: '', tipo: 'Divisao', area_m2: '', notas: '' })

  const loadZonasObra = useCallback(async () => {
    if (!obraId) return
    setZonasObraLoading(true)
    try {
      const { data, error } = await supabase.from('obra_zonas').select('*').eq('obra_id', obraId).order('ordem').order('nome')
      if (error) throw error
      setZonasObra(data || [])
    } catch (err) { console.error('Erro zonas:', err) }
    finally { setZonasObraLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'zonas' && obraId) loadZonasObra()
  }, [activeSubtab, obraId, loadZonasObra])

  const handleZonaSave = async () => {
    if (!zonaForm.nome) return
    setZonaSaving(true)
    try {
      await supabase.from('obra_zonas').insert({
        obra_id: obraId, nome: zonaForm.nome, piso: zonaForm.piso || null,
        tipo: zonaForm.tipo, area_m2: zonaForm.area_m2 ? parseFloat(zonaForm.area_m2) : null,
        notas: zonaForm.notas || null, ordem: zonasObra.length
      })
      setShowZonaModal(false)
      setZonaForm({ nome: '', piso: '', tipo: 'Divisao', area_m2: '', notas: '' })
      loadZonasObra()
    } catch (err) { console.error('Erro:', err); alert('Erro: ' + err.message) }
    finally { setZonaSaving(false) }
  }

  const handleDeleteZona = async (zona) => {
    if (!confirm(`Eliminar zona "${zona.nome}"?`)) return
    try {
      await supabase.from('obra_zonas').delete().eq('id', zona.id)
      loadZonasObra()
    } catch (err) { console.error('Erro:', err) }
  }

  // ============================================
  // RENDERS
  // ============================================

  const renderEquipaTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>{equipaMembers.length} membro{equipaMembers.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowAddMember(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><Plus size={16} /> Adicionar</button>
      </div>
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {equipaLoading ? <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        : equipaMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Users size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhum membro atribuido</p>
          </div>
        ) : equipaMembers.map((m, i) => (
          <div key={m.id} style={{ padding: '14px 20px', borderBottom: i < equipaMembers.length - 1 ? `1px solid ${colors.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: colors.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16 }}>
              {m.trabalhadores?.nome?.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{m.trabalhadores?.nome}</div>
              <div style={{ fontSize: 12, color: colors.textMuted }}>{m.trabalhadores?.cargo || 'Sem cargo'}{m.trabalhadores?.telefone ? ` - ${m.trabalhadores.telefone}` : ''}</div>
            </div>
            <button onClick={() => handleRemoveMember(m)} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#F44336' }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      {showAddMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>Adicionar Membro</h2>
              <button onClick={() => setShowAddMember(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <select value={addMemberTrab} onChange={e => setAddMemberTrab(e.target.value)} style={{ width: '100%', padding: '12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">Selecionar trabalhador...</option>
                {availableTrab.map(t => <option key={t.id} value={t.id}>{t.nome} {t.cargo ? `(${t.cargo})` : ''}</option>)}
              </select>
              {availableTrab.length === 0 && <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 8 }}>Todos os trabalhadores ja estao atribuidos</p>}
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowAddMember(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAddMember} disabled={!addMemberTrab} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !addMemberTrab ? 0.5 : 1 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderSubEmpreiteirosTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>{subs.length} subempreiteiro{subs.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowSubModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><Plus size={16} /> Novo SubEmpreiteiro</button>
      </div>
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {subsLoading ? <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        : subs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Truck size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhum subempreiteiro</p>
          </div>
        ) : subs.map((s, i) => (
          <div key={s.id} style={{ padding: '16px 20px', borderBottom: i < subs.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>{s.nome}</span>
              {s.especialidades && <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: s.especialidades.cor || '#eee', color: '#fff' }}>{s.especialidades.nome}</span>}
              <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: s.estado === 'ativo' ? '#4CAF50' : '#999', background: s.estado === 'ativo' ? '#E8F5E9' : '#f5f5f5' }}>{s.estado}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: colors.textMuted }}>
              {s.empresa && <span>{s.empresa}</span>}
              {s.contacto && <span>{s.contacto}</span>}
              {s.contrato_valor && <span>{parseFloat(s.contrato_valor).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>}
              {s.contrato_inicio && <span>{new Date(s.contrato_inicio).toLocaleDateString('pt-PT')} - {s.contrato_fim ? new Date(s.contrato_fim).toLocaleDateString('pt-PT') : '...'}</span>}
            </div>
          </div>
        ))}
      </div>
      {showSubModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>Novo SubEmpreiteiro</h2>
              <button onClick={() => setShowSubModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Nome *</label>
                <input type="text" value={subForm.nome} onChange={e => setSubForm({ ...subForm, nome: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Empresa</label>
                  <input type="text" value={subForm.empresa} onChange={e => setSubForm({ ...subForm, empresa: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>NIF</label>
                  <input type="text" value={subForm.nif} onChange={e => setSubForm({ ...subForm, nif: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Contacto</label>
                  <input type="text" value={subForm.contacto} onChange={e => setSubForm({ ...subForm, contacto: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Email</label>
                  <input type="email" value={subForm.email} onChange={e => setSubForm({ ...subForm, email: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Especialidade</label>
                <select value={subForm.especialidade_id} onChange={e => setSubForm({ ...subForm, especialidade_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                  <option value="">-</option>
                  {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Valor contrato</label>
                  <input type="number" value={subForm.contrato_valor} onChange={e => setSubForm({ ...subForm, contrato_valor: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Inicio</label>
                  <input type="date" value={subForm.contrato_inicio} onChange={e => setSubForm({ ...subForm, contrato_inicio: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Fim</label>
                  <input type="date" value={subForm.contrato_fim} onChange={e => setSubForm({ ...subForm, contrato_fim: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Notas</label>
                <textarea value={subForm.notas} onChange={e => setSubForm({ ...subForm, notas: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowSubModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSubSave} disabled={!subForm.nome || subSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !subForm.nome ? 0.5 : 1 }}>
                {subSaving ? 'A guardar...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderZonasTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>{zonasObra.length} zona{zonasObra.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowZonaModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><Plus size={16} /> Nova Zona</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {zonasObraLoading ? <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        : zonasObra.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}` }}>
            <Grid3X3 size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhuma zona definida</p>
          </div>
        ) : zonasObra.map(z => (
          <div key={z.id} style={{ background: colors.white, borderRadius: 10, padding: 16, border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>{z.nome}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {z.tipo}{z.piso ? ` - ${z.piso}` : ''}{z.area_m2 ? ` - ${z.area_m2}m2` : ''}
                </div>
              </div>
              <button onClick={() => handleDeleteZona(z)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#F44336' }}><Trash2 size={14} /></button>
            </div>
            {z.progresso > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                  <span>Progresso</span><span>{z.progresso}%</span>
                </div>
                <div style={{ height: 6, background: colors.progressBg, borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${z.progresso}%`, background: colors.success, borderRadius: 3 }} />
                </div>
              </div>
            )}
            {z.notas && <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.textMuted }}>{z.notas}</p>}
          </div>
        ))}
      </div>
      {showZonaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>Nova Zona</h2>
              <button onClick={() => setShowZonaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Nome *</label>
                <input type="text" value={zonaForm.nome} onChange={e => setZonaForm({ ...zonaForm, nome: e.target.value })} placeholder="Ex: Sala, Quarto 1, WC Suite" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Piso</label>
                  <input type="text" value={zonaForm.piso} onChange={e => setZonaForm({ ...zonaForm, piso: e.target.value })} placeholder="Ex: Piso 0, Piso 1" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Area (m2)</label>
                  <input type="number" value={zonaForm.area_m2} onChange={e => setZonaForm({ ...zonaForm, area_m2: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Tipo</label>
                <select value={zonaForm.tipo} onChange={e => setZonaForm({ ...zonaForm, tipo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                  <option value="Divisao">Divisao</option><option value="Exterior">Exterior</option><option value="Comum">Area Comum</option><option value="Tecnico">Espaco Tecnico</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Notas</label>
                <textarea value={zonaForm.notas} onChange={e => setZonaForm({ ...zonaForm, notas: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowZonaModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleZonaSave} disabled={!zonaForm.nome || zonaSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !zonaForm.nome ? 0.5 : 1 }}>
                {zonaSaving ? 'A guardar...' : 'Criar Zona'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {activeSubtab === 'equipa' && renderEquipaTab()}
      {activeSubtab === 'subempreiteiros' && renderSubEmpreiteirosTab()}
      {activeSubtab === 'zonas' && renderZonasTab()}
    </>
  )
}
