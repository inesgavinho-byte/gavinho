import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Shield, AlertTriangle, CheckSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { colors } from './constants'

export default function FiscalizacaoTab({ obraId, activeSubtab, currentUser }) {
  // ============================================
  // HSO STATE
  // ============================================
  const [hsoItems, setHsoItems] = useState([])
  const [hsoLoading, setHsoLoading] = useState(false)
  const [showHsoModal, setShowHsoModal] = useState(false)
  const [hsoSaving, setHsoSaving] = useState(false)
  const [hsoForm, setHsoForm] = useState({ data_inspecao: new Date().toISOString().split('T')[0], tipo: 'rotina', inspector: '', area_inspecionada: '', conforme: true, observacoes: '', acoes_corretivas: '', prazo_resolucao: '', gravidade: 'baixa' })

  // ============================================
  // HSO LOGIC
  // ============================================
  const loadHso = useCallback(async () => {
    if (!obraId) return
    setHsoLoading(true)
    try {
      const { data, error } = await supabase.from('obra_hso').select('*').eq('obra_id', obraId).order('data_inspecao', { ascending: false })
      if (error) throw error
      setHsoItems(data || [])
    } catch (err) { console.error('Erro HSO:', err) }
    finally { setHsoLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'hso' && obraId) loadHso()
  }, [activeSubtab, obraId, loadHso])

  const handleHsoSave = async () => {
    setHsoSaving(true)
    try {
      const maxNum = hsoItems.reduce((max, h) => { const n = parseInt(h.codigo?.replace('HSO-', '')); return n > max ? n : max }, 0)
      await supabase.from('obra_hso').insert({
        obra_id: obraId, codigo: `HSO-${String(maxNum + 1).padStart(3, '0')}`,
        data_inspecao: hsoForm.data_inspecao, tipo: hsoForm.tipo,
        inspector: hsoForm.inspector || null, area_inspecionada: hsoForm.area_inspecionada || null,
        conforme: hsoForm.conforme, observacoes: hsoForm.observacoes || null,
        acoes_corretivas: hsoForm.acoes_corretivas || null,
        prazo_resolucao: hsoForm.prazo_resolucao || null,
        gravidade: hsoForm.gravidade, estado: hsoForm.conforme ? 'conforme' : 'pendente',
        created_by: currentUser?.id || null
      })
      setShowHsoModal(false)
      setHsoForm({ data_inspecao: new Date().toISOString().split('T')[0], tipo: 'rotina', inspector: '', area_inspecionada: '', conforme: true, observacoes: '', acoes_corretivas: '', prazo_resolucao: '', gravidade: 'baixa' })
      loadHso()
    } catch (err) { console.error('Erro HSO:', err); alert('Erro: ' + err.message) }
    finally { setHsoSaving(false) }
  }

  const handleHsoResolve = async (item) => {
    try {
      await supabase.from('obra_hso').update({ estado: 'resolvido', resolvido_em: new Date().toISOString().split('T')[0] }).eq('id', item.id)
      loadHso()
    } catch (err) { console.error('Erro:', err) }
  }

  // ============================================
  // OCORRENCIAS STATE
  // ============================================
  const [ocorrencias, setOcorrencias] = useState([])
  const [ocorrenciasLoading, setOcorrenciasLoading] = useState(false)
  const [showOcorrModal, setShowOcorrModal] = useState(false)
  const [ocorrSaving, setOcorrSaving] = useState(false)
  const [ocorrForm, setOcorrForm] = useState({ titulo: '', descricao: '', tipo: 'incidente', gravidade: 'baixa', envolvidos: '', acao_imediata: '', acao_corretiva: '' })

  const ocorrGravColors = { baixa: { color: '#FF9800', bg: '#FFF3E0' }, media: { color: '#F44336', bg: '#FFEBEE' }, alta: { color: '#D32F2F', bg: '#FFCDD2' }, critica: { color: '#9C27B0', bg: '#F3E5F5' } }

  // ============================================
  // OCORRENCIAS LOGIC
  // ============================================
  const loadOcorrencias = useCallback(async () => {
    if (!obraId) return
    setOcorrenciasLoading(true)
    try {
      const { data, error } = await supabase.from('obra_ocorrencias').select('*').eq('obra_id', obraId).order('data_ocorrencia', { ascending: false })
      if (error) throw error
      setOcorrencias(data || [])
    } catch (err) { console.error('Erro ocorrencias:', err) }
    finally { setOcorrenciasLoading(false) }
  }, [obraId])

  useEffect(() => {
    if (activeSubtab === 'ocorrencias' && obraId) loadOcorrencias()
  }, [activeSubtab, obraId, loadOcorrencias])

  const handleOcorrSave = async () => {
    if (!ocorrForm.titulo || !ocorrForm.descricao) return
    setOcorrSaving(true)
    try {
      const maxNum = ocorrencias.reduce((max, o) => { const n = parseInt(o.codigo?.replace('OC-', '')); return n > max ? n : max }, 0)
      await supabase.from('obra_ocorrencias').insert({
        obra_id: obraId, codigo: `OC-${String(maxNum + 1).padStart(3, '0')}`,
        titulo: ocorrForm.titulo, descricao: ocorrForm.descricao,
        tipo: ocorrForm.tipo, gravidade: ocorrForm.gravidade,
        envolvidos: ocorrForm.envolvidos || null,
        acao_imediata: ocorrForm.acao_imediata || null,
        acao_corretiva: ocorrForm.acao_corretiva || null,
        reportado_por: currentUser?.id || null
      })
      setShowOcorrModal(false)
      setOcorrForm({ titulo: '', descricao: '', tipo: 'incidente', gravidade: 'baixa', envolvidos: '', acao_imediata: '', acao_corretiva: '' })
      loadOcorrencias()
    } catch (err) { console.error('Erro:', err); alert('Erro: ' + err.message) }
    finally { setOcorrSaving(false) }
  }

  const handleOcorrResolve = async (oc) => {
    try {
      await supabase.from('obra_ocorrencias').update({ estado: 'resolvida', resolvido_em: new Date().toISOString() }).eq('id', oc.id)
      loadOcorrencias()
    } catch (err) { console.error('Erro:', err) }
  }

  // ============================================
  // RENDER HSO
  // ============================================
  const renderHsoTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ padding: '6px 14px', background: '#E8F5E9', borderRadius: 8, fontSize: 13, color: '#2e7d32' }}>Conformes: {hsoItems.filter(h => h.conforme).length}</span>
          <span style={{ padding: '6px 14px', background: '#FFEBEE', borderRadius: 8, fontSize: 13, color: '#F44336' }}>Pendentes: {hsoItems.filter(h => !h.conforme && h.estado === 'pendente').length}</span>
        </div>
        <button onClick={() => setShowHsoModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><Plus size={16} /> Nova Inspecao</button>
      </div>
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {hsoLoading ? <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        : hsoItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Shield size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhuma inspecao registada</p>
          </div>
        ) : hsoItems.map((h, i) => (
          <div key={h.id} style={{ padding: '14px 20px', borderBottom: i < hsoItems.length - 1 ? `1px solid ${colors.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: h.conforme ? '#E8F5E9' : '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {h.conforme ? <CheckSquare size={20} style={{ color: '#4CAF50' }} /> : <AlertTriangle size={20} style={{ color: '#F44336' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>{h.codigo}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{h.area_inspecionada || h.tipo}</span>
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {new Date(h.data_inspecao).toLocaleDateString('pt-PT')} {h.inspector && ` - ${h.inspector}`}
                {h.observacoes && <span> - {h.observacoes.substring(0, 80)}{h.observacoes.length > 80 ? '...' : ''}</span>}
              </div>
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: h.conforme ? '#4CAF50' : h.estado === 'resolvido' ? '#2196F3' : '#F44336', background: h.conforme ? '#E8F5E9' : h.estado === 'resolvido' ? '#E3F2FD' : '#FFEBEE' }}>
              {h.conforme ? 'Conforme' : h.estado === 'resolvido' ? 'Resolvido' : 'Pendente'}
            </span>
            {!h.conforme && h.estado === 'pendente' && (
              <button onClick={() => handleHsoResolve(h)} style={{ padding: '6px 12px', background: '#E8F5E9', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#4CAF50' }}>Resolver</button>
            )}
          </div>
        ))}
      </div>
      {showHsoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>Nova Inspecao HSO</h2>
              <button onClick={() => setShowHsoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Data</label>
                  <input type="date" value={hsoForm.data_inspecao} onChange={e => setHsoForm({ ...hsoForm, data_inspecao: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Tipo</label>
                  <select value={hsoForm.tipo} onChange={e => setHsoForm({ ...hsoForm, tipo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="rotina">Rotina</option><option value="planeada">Planeada</option><option value="incidente">Pos-incidente</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Inspector</label>
                <input type="text" value={hsoForm.inspector} onChange={e => setHsoForm({ ...hsoForm, inspector: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Area inspecionada</label>
                <input type="text" value={hsoForm.area_inspecionada} onChange={e => setHsoForm({ ...hsoForm, area_inspecionada: e.target.value })} placeholder="Ex: Andaimes piso 3, EPIs equipa estruturas" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={hsoForm.conforme} onChange={e => setHsoForm({ ...hsoForm, conforme: e.target.checked })} style={{ width: 18, height: 18, accentColor: '#4CAF50' }} />
                  Conforme
                </label>
              </div>
              {!hsoForm.conforme && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Gravidade</label>
                    <select value={hsoForm.gravidade} onChange={e => setHsoForm({ ...hsoForm, gravidade: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                      <option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Critica</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Acoes corretivas</label>
                    <textarea value={hsoForm.acoes_corretivas} onChange={e => setHsoForm({ ...hsoForm, acoes_corretivas: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Prazo resolucao</label>
                    <input type="date" value={hsoForm.prazo_resolucao} onChange={e => setHsoForm({ ...hsoForm, prazo_resolucao: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                </>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Observacoes</label>
                <textarea value={hsoForm.observacoes} onChange={e => setHsoForm({ ...hsoForm, observacoes: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowHsoModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleHsoSave} disabled={hsoSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {hsoSaving ? 'A guardar...' : 'Registar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // RENDER OCORRENCIAS
  // ============================================
  const renderOcorrenciasTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ padding: '6px 14px', background: colors.background, borderRadius: 8, fontSize: 13, color: colors.textMuted }}>{ocorrencias.length} ocorrencia{ocorrencias.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowOcorrModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><Plus size={16} /> Nova Ocorrencia</button>
      </div>
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        {ocorrenciasLoading ? <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>A carregar...</div>
        : ocorrencias.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <AlertTriangle size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: colors.textMuted }}>Nenhuma ocorrencia registada</p>
          </div>
        ) : ocorrencias.map((oc, i) => {
          const grav = ocorrGravColors[oc.gravidade] || ocorrGravColors.baixa
          return (
            <div key={oc.id} style={{ padding: '14px 20px', borderBottom: i < ocorrencias.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>{oc.codigo}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{oc.titulo}</span>
                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: grav.color, background: grav.bg }}>{oc.gravidade}</span>
                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: oc.estado === 'resolvida' ? '#4CAF50' : '#FF9800', background: oc.estado === 'resolvida' ? '#E8F5E9' : '#FFF3E0' }}>{oc.estado}</span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: colors.textMuted }}>{oc.descricao}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: colors.textMuted, alignItems: 'center' }}>
                <span>{new Date(oc.data_ocorrencia).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span>{oc.tipo}</span>
                {oc.envolvidos && <span>Envolvidos: {oc.envolvidos}</span>}
                {oc.estado === 'registada' && (
                  <button onClick={() => handleOcorrResolve(oc)} style={{ marginLeft: 'auto', padding: '4px 12px', background: '#E8F5E9', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#4CAF50' }}>Resolver</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {showOcorrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: colors.white, borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: colors.text }}>Nova Ocorrencia</h2>
              <button onClick={() => setShowOcorrModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Titulo *</label>
                <input type="text" value={ocorrForm.titulo} onChange={e => setOcorrForm({ ...ocorrForm, titulo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Descricao *</label>
                <textarea value={ocorrForm.descricao} onChange={e => setOcorrForm({ ...ocorrForm, descricao: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Tipo</label>
                  <select value={ocorrForm.tipo} onChange={e => setOcorrForm({ ...ocorrForm, tipo: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="incidente">Incidente</option><option value="acidente">Acidente</option><option value="quase_acidente">Quase-acidente</option><option value="dano_material">Dano material</option><option value="ambiental">Ambiental</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Gravidade</label>
                  <select value={ocorrForm.gravidade} onChange={e => setOcorrForm({ ...ocorrForm, gravidade: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Critica</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Envolvidos</label>
                <input type="text" value={ocorrForm.envolvidos} onChange={e => setOcorrForm({ ...ocorrForm, envolvidos: e.target.value })} placeholder="Nomes das pessoas envolvidas" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Acao imediata</label>
                <textarea value={ocorrForm.acao_imediata} onChange={e => setOcorrForm({ ...ocorrForm, acao_imediata: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.text }}>Acao corretiva</label>
                <textarea value={ocorrForm.acao_corretiva} onChange={e => setOcorrForm({ ...ocorrForm, acao_corretiva: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: 20, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 12 }}>
              <button onClick={() => setShowOcorrModal(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleOcorrSave} disabled={!ocorrForm.titulo || !ocorrForm.descricao || ocorrSaving} style={{ flex: 1, padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!ocorrForm.titulo) ? 0.5 : 1 }}>
                {ocorrSaving ? 'A guardar...' : 'Registar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <>
      {activeSubtab === 'hso' && renderHsoTab()}
      {activeSubtab === 'ocorrencias' && renderOcorrenciasTab()}
    </>
  )
}
