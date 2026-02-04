import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function ValidacaoDecisoes({ projetoId, onClose, onUpdate }) {
  const [sugestoes, setSugestoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [processing, setProcessing] = useState({})

  useEffect(() => {
    fetchSugestoes()
  }, [projetoId])

  const fetchSugestoes = async () => {
    const { data } = await supabase
      .from('decisoes')
      .select('*')
      .eq('projeto_id', projetoId)
      .eq('estado', 'sugerida')
      .order('created_at', { ascending: false })
    setSugestoes(data || [])
    setLoading(false)
  }

  const aprovar = async (id) => {
    setProcessing(p => ({ ...p, [id]: true }))
    const user = (await supabase.auth.getUser()).data.user
    await supabase.from('decisoes').update({ estado: 'validada', aprovado_por: user?.id }).eq('id', id)
    setSugestoes(s => s.filter(x => x.id !== id))
    setProcessing(p => ({ ...p, [id]: false }))
    onUpdate?.()
  }

  const rejeitar = async (id) => {
    setProcessing(p => ({ ...p, [id]: true }))
    await supabase.from('decisoes').update({ estado: 'rejeitada' }).eq('id', id)
    setSugestoes(s => s.filter(x => x.id !== id))
    setProcessing(p => ({ ...p, [id]: false }))
    onUpdate?.()
  }

  const startEdit = (sug) => {
    setEditingId(sug.id)
    setEditForm({
      titulo: sug.titulo, tipo: sug.tipo, impacto: sug.impacto,
      descricao: sug.descricao, impacto_orcamento: sug.impacto_orcamento || '',
      impacto_prazo_dias: sug.impacto_prazo_dias || '', divisao: sug.divisao || '',
      decidido_por: sug.decidido_por, justificacao: sug.justificacao || ''
    })
  }

  const saveEdit = async (id) => {
    setProcessing(p => ({ ...p, [id]: true }))
    const user = (await supabase.auth.getUser()).data.user
    await supabase.from('decisoes').update({
      ...editForm,
      impacto_orcamento: editForm.impacto_orcamento ? parseFloat(editForm.impacto_orcamento) : null,
      impacto_prazo_dias: editForm.impacto_prazo_dias ? parseInt(editForm.impacto_prazo_dias) : null,
      estado: 'validada', aprovado_por: user?.id
    }).eq('id', id)
    setSugestoes(s => s.filter(x => x.id !== id))
    setEditingId(null)
    setProcessing(p => ({ ...p, [id]: false }))
    onUpdate?.()
  }

  const aprovarTodas = async () => {
    const user = (await supabase.auth.getUser()).data.user
    for (const sug of sugestoes) {
      await supabase.from('decisoes').update({ estado: 'validada', aprovado_por: user?.id }).eq('id', sug.id)
    }
    setSugestoes([])
    onUpdate?.()
  }

  const inputStyle = { padding: '8px 10px', border: '1px solid #E5E5E5', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#5F5C59', marginBottom: '4px', display: 'block' }

  return (
    <div style={{ backgroundColor: '#FFF', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #E5E5E5' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: 'Cormorant Garamond, serif' }}>⚠️ Validar Decisões</h2>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0' }}>{sugestoes.length} sugestões da IA aguardam validação</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9CA3AF' }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>A carregar...</div>
        ) : sugestoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <span style={{ fontSize: '48px' }}>✅</span>
            <p style={{ color: '#16A34A', margin: '16px 0', fontWeight: 500 }}>Todas as decisões estão validadas!</p>
            <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#8B8670', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Fechar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sugestoes.map(sug => (
              <div key={sug.id} style={{ backgroundColor: '#FFFBEB', borderRadius: '10px', border: '1px solid #FCD34D', overflow: 'hidden' }}>
                {/* Fonte Header */}
                <div style={{ padding: '10px 16px', backgroundColor: '#FEF3C7', borderBottom: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400E' }}>
                  <span>{sug.fonte === 'email' ? '📧' : sug.fonte === 'reuniao' ? '🎤' : '💬'}</span>
                  <span style={{ fontWeight: 500 }}>Detectado em {sug.fonte === 'email' ? 'email' : sug.fonte === 'reuniao' ? 'reunião' : 'chat'}</span>
                  <span style={{ marginLeft: 'auto', color: '#B45309' }}>{new Date(sug.created_at).toLocaleDateString('pt-PT')}</span>
                </div>

                {editingId === sug.id ? (
                  /* Edit Mode */
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={labelStyle}>Título</label>
                        <input value={editForm.titulo} onChange={e => setEditForm({ ...editForm, titulo: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Decidido por</label>
                        <input value={editForm.decidido_por} onChange={e => setEditForm({ ...editForm, decidido_por: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={labelStyle}>Tipo</label>
                        <select value={editForm.tipo} onChange={e => setEditForm({ ...editForm, tipo: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="design">🎨 Design</option>
                          <option value="material">🪨 Material</option>
                          <option value="tecnico">⚙️ Técnico</option>
                          <option value="financeiro">💰 Financeiro</option>
                          <option value="prazo">📅 Prazo</option>
                          <option value="fornecedor">🏭 Fornecedor</option>
                          <option value="alteracao">🔄 Alteração</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Impacto</label>
                        <select value={editForm.impacto} onChange={e => setEditForm({ ...editForm, impacto: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="critico">Crítico</option>
                          <option value="alto">Alto</option>
                          <option value="medio">Médio</option>
                          <option value="baixo">Baixo</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>€ Orçamento</label>
                        <input type="number" value={editForm.impacto_orcamento} onChange={e => setEditForm({ ...editForm, impacto_orcamento: e.target.value })} style={inputStyle} placeholder="3200" />
                      </div>
                      <div>
                        <label style={labelStyle}>Dias Prazo</label>
                        <input type="number" value={editForm.impacto_prazo_dias} onChange={e => setEditForm({ ...editForm, impacto_prazo_dias: e.target.value })} style={inputStyle} placeholder="15" />
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={labelStyle}>Descrição</label>
                      <textarea value={editForm.descricao} onChange={e => setEditForm({ ...editForm, descricao: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingId(null)} style={{ padding: '8px 14px', backgroundColor: '#FFF', color: '#5F5C59', border: '1px solid #E5E5E5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancelar</button>
                      <button onClick={() => saveEdit(sug.id)} disabled={processing[sug.id]} style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        {processing[sug.id] ? '⏳' : '✓ Guardar e Aprovar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px', color: '#1a1a1a' }}>{sug.titulo}</h3>
                    <p style={{ fontSize: '13px', color: '#5F5C59', margin: '0 0 12px', lineHeight: 1.5 }}>{sug.descricao}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#E0E7FF', color: '#4338CA' }}>
                        {sug.tipo === 'design' ? '🎨' : sug.tipo === 'material' ? '🪨' : sug.tipo === 'tecnico' ? '⚙️' : sug.tipo === 'financeiro' ? '💰' : sug.tipo === 'prazo' ? '📅' : sug.tipo === 'fornecedor' ? '🏭' : '🔄'} {sug.tipo}
                      </span>
                      <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: sug.impacto === 'critico' ? '#EF4444' : sug.impacto === 'alto' ? '#F59E0B' : '#8B8670', color: '#FFF' }}>
                        {sug.impacto}
                      </span>
                      {sug.impacto_orcamento && <span style={{ fontSize: '12px', fontWeight: 500, color: sug.impacto_orcamento > 0 ? '#DC2626' : '#16A34A' }}>{sug.impacto_orcamento > 0 ? '+' : ''}€{Math.abs(sug.impacto_orcamento).toLocaleString()}</span>}
                      {sug.impacto_prazo_dias && <span style={{ fontSize: '12px', fontWeight: 500, color: sug.impacto_prazo_dias > 0 ? '#DC2626' : '#16A34A' }}>{sug.impacto_prazo_dias > 0 ? '+' : ''}{sug.impacto_prazo_dias} dias</span>}
                    </div>

                    {sug.fonte_excerto && (
                      <div style={{ padding: '10px 12px', backgroundColor: '#FFF', borderRadius: '6px', border: '1px dashed #D97706', marginBottom: '12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Excerto Original</span>
                        <p style={{ fontSize: '12px', color: '#5F5C59', margin: '6px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>"{sug.fonte_excerto}"</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => rejeitar(sug.id)} disabled={processing[sug.id]} style={{ padding: '8px 14px', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        ✗ Não é decisão
                      </button>
                      <button onClick={() => startEdit(sug)} style={{ padding: '8px 14px', backgroundColor: '#FFF', color: '#5F5C59', border: '1px solid #E5E5E5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        ✎ Editar
                      </button>
                      <button onClick={() => aprovar(sug.id)} disabled={processing[sug.id]} style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        {processing[sug.id] ? '⏳' : '✓ Aprovar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {sugestoes.length > 1 && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E5E5', backgroundColor: '#F9F9F7', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={aprovarTodas} style={{ padding: '10px 20px', backgroundColor: '#16A34A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            ✓ Aprovar todas ({sugestoes.length})
          </button>
        </div>
      )}
    </div>
  )
}
