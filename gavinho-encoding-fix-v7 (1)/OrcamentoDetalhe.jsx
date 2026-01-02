import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, Plus, Edit, Trash2, X, ChevronDown, ChevronRight, Euro, Percent,
  CheckCircle2, XCircle, Send, Copy, Download, AlertCircle, Save, Calculator
} from 'lucide-react'

const statusConfig = {
  rascunho: { label: 'Rascunho', color: 'var(--brown-light)', bg: 'var(--stone)' },
  em_revisao: { label: 'Em Revisão', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  enviado: { label: 'Enviado', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.2)' },
  aprovado: { label: 'Aprovado', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  rejeitado: { label: 'Rejeitado', color: 'var(--error)', bg: 'rgba(184, 138, 138, 0.15)' },
  expirado: { label: 'Expirado', color: 'var(--brown-light)', bg: 'var(--stone)' }
}

const UNIDADES = ['vg', 'un', 'm²', 'ml', 'm³', 'kg', 'h', 'dia', 'mês']

export default function OrcamentoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [orcamento, setOrcamento] = useState(null)
  const [capitulos, setCapitulos] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCapitulos, setExpandedCapitulos] = useState({})
  
  // Modals
  const [showCapituloModal, setShowCapituloModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showAprovarModal, setShowAprovarModal] = useState(false)
  
  // Edit states
  const [editingCapitulo, setEditingCapitulo] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [currentCapituloId, setCurrentCapituloId] = useState(null)
  
  // Forms
  const [capituloForm, setCapituloForm] = useState({ nome: '', descricao: '' })
  const [itemForm, setItemForm] = useState({
    descricao: '', unidade: 'vg', quantidade: 1, custo_unitario: 0, margem_percentagem: 28, notas: ''
  })

  useEffect(() => {
    if (id) fetchOrcamento()
  }, [id])

  const fetchOrcamento = async () => {
    try {
      // Buscar orçamento
      const { data: orc, error: orcError } = await supabase
        .from('orcamentos')
        .select('*, projetos(codigo, nome, cliente_nome)')
        .eq('id', id)
        .single()

      if (orcError) throw orcError
      setOrcamento(orc)

      // Buscar capítulos com itens
      const { data: caps, error: capsError } = await supabase
        .from('orcamento_capitulos')
        .select('*, orcamento_itens(*)')
        .eq('orcamento_id', id)
        .order('ordem')

      if (capsError) throw capsError
      
      // Ordenar itens dentro de cada capítulo
      const capsOrdered = (caps || []).map(cap => ({
        ...cap,
        orcamento_itens: (cap.orcamento_itens || []).sort((a, b) => a.ordem - b.ordem)
      }))
      
      setCapitulos(capsOrdered)
      
      // Expandir primeiro capítulo por padrão
      if (capsOrdered.length > 0) {
        setExpandedCapitulos({ [capsOrdered[0].id]: true })
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calcular totais
  const calcularTotais = () => {
    let subtotal = 0
    capitulos.forEach(cap => {
      (cap.orcamento_itens || []).forEach(item => {
        subtotal += parseFloat(item.preco_total || 0)
      })
    })
    
    const desconto = subtotal * (parseFloat(orcamento?.desconto_percentagem || 0) / 100)
    const totalSemIva = subtotal - desconto
    const iva = totalSemIva * (parseFloat(orcamento?.iva_percentagem || 23) / 100)
    const totalComIva = totalSemIva + iva
    
    return { subtotal, desconto, totalSemIva, iva, totalComIva }
  }

  // Toggle capítulo expandido
  const toggleCapitulo = (capId) => {
    setExpandedCapitulos(prev => ({ ...prev, [capId]: !prev[capId] }))
  }

  // CRUD Capítulos
  const handleSaveCapitulo = async () => {
    if (!capituloForm.nome.trim()) return

    try {
      if (editingCapitulo) {
        await supabase
          .from('orcamento_capitulos')
          .update({ nome: capituloForm.nome, descricao: capituloForm.descricao || null })
          .eq('id', editingCapitulo.id)
      } else {
        const codigo = String(capitulos.length + 1).padStart(2, '0')
        await supabase
          .from('orcamento_capitulos')
          .insert([{
            orcamento_id: id,
            codigo,
            nome: capituloForm.nome,
            descricao: capituloForm.descricao || null,
            ordem: capitulos.length,
            subtotal: 0
          }])
      }

      setShowCapituloModal(false)
      setCapituloForm({ nome: '', descricao: '' })
      setEditingCapitulo(null)
      fetchOrcamento()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar capítulo')
    }
  }

  const handleDeleteCapitulo = async (cap) => {
    try {
      await supabase.from('orcamento_capitulos').delete().eq('id', cap.id)
      setShowDeleteConfirm(null)
      fetchOrcamento()
      recalcularOrcamento()
    } catch (err) {
      alert('Erro ao eliminar capítulo')
    }
  }

  // CRUD Itens
  const handleSaveItem = async () => {
    if (!itemForm.descricao.trim()) return

    try {
      const quantidade = parseFloat(itemForm.quantidade) || 1
      const custoUnitario = parseFloat(itemForm.custo_unitario) || 0
      const custoTotal = quantidade * custoUnitario
      const margem = parseFloat(itemForm.margem_percentagem) || 28
      const precoUnitario = custoUnitario * (1 + margem / 100)
      const precoTotal = quantidade * precoUnitario

      const itemData = {
        descricao: itemForm.descricao,
        unidade: itemForm.unidade,
        quantidade,
        custo_unitario: custoUnitario,
        custo_total: custoTotal,
        margem_percentagem: margem,
        preco_unitario: precoUnitario,
        preco_total: precoTotal,
        notas: itemForm.notas || null
      }

      if (editingItem) {
        await supabase
          .from('orcamento_itens')
          .update(itemData)
          .eq('id', editingItem.id)
      } else {
        const cap = capitulos.find(c => c.id === currentCapituloId)
        const numItens = cap?.orcamento_itens?.length || 0
        const codigo = `${cap?.codigo || '01'}.${String(numItens + 1).padStart(2, '0')}`
        
        await supabase
          .from('orcamento_itens')
          .insert([{
            capitulo_id: currentCapituloId,
            codigo,
            ...itemData,
            ordem: numItens
          }])
      }

      setShowItemModal(false)
      resetItemForm()
      fetchOrcamento()
      recalcularOrcamento()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar item')
    }
  }

  const handleDeleteItem = async (item) => {
    try {
      await supabase.from('orcamento_itens').delete().eq('id', item.id)
      setShowDeleteConfirm(null)
      fetchOrcamento()
      recalcularOrcamento()
    } catch (err) {
      alert('Erro ao eliminar item')
    }
  }

  // Recalcular totais do orçamento
  const recalcularOrcamento = async () => {
    const totais = calcularTotais()
    
    // Calcular custo total
    let custoTotal = 0
    capitulos.forEach(cap => {
      (cap.orcamento_itens || []).forEach(item => {
        custoTotal += parseFloat(item.custo_total || 0)
      })
    })

    const margemValor = totais.totalSemIva - custoTotal
    const margemPercentagem = totais.totalSemIva > 0 ? (margemValor / totais.totalSemIva * 100) : 0

    await supabase
      .from('orcamentos')
      .update({
        subtotal: totais.subtotal,
        total_sem_iva: totais.totalSemIva,
        iva_valor: totais.iva,
        total_com_iva: totais.totalComIva,
        custo_total: custoTotal,
        margem_valor: margemValor,
        margem_percentagem: margemPercentagem,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
  }

  // Aprovar/Rejeitar
  const handleAprovar = async () => {
    try {
      await supabase
        .from('orcamentos')
        .update({ 
          status: 'aprovado', 
          data_aprovacao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      setShowAprovarModal(false)
      fetchOrcamento()
    } catch (err) {
      alert('Erro ao aprovar')
    }
  }

  const handleEnviar = async () => {
    try {
      await supabase
        .from('orcamentos')
        .update({ 
          status: 'enviado', 
          data_envio: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      fetchOrcamento()
    } catch (err) {
      alert('Erro ao enviar')
    }
  }

  // Reset forms
  const resetItemForm = () => {
    setItemForm({ descricao: '', unidade: 'vg', quantidade: 1, custo_unitario: 0, margem_percentagem: 28, notas: '' })
    setEditingItem(null)
    setCurrentCapituloId(null)
  }

  // Edit handlers
  const handleEditCapitulo = (cap) => {
    setEditingCapitulo(cap)
    setCapituloForm({ nome: cap.nome || '', descricao: cap.descricao || '' })
    setShowCapituloModal(true)
  }

  const handleEditItem = (item, capId) => {
    setEditingItem(item)
    setCurrentCapituloId(capId)
    setItemForm({
      descricao: item.descricao || '',
      unidade: item.unidade || 'vg',
      quantidade: item.quantidade || 1,
      custo_unitario: item.custo_unitario || 0,
      margem_percentagem: item.margem_percentagem || 28,
      notas: item.notas || ''
    })
    setShowItemModal(true)
  }

  const handleAddItem = (capId) => {
    resetItemForm()
    setCurrentCapituloId(capId)
    setShowItemModal(true)
  }

  // Helpers
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0)
  }

  const totais = orcamento ? calcularTotais() : { subtotal: 0, desconto: 0, totalSemIva: 0, iva: 0, totalComIva: 0 }
  const isAprovado = orcamento?.status === 'aprovado'
  const isEditavel = !isAprovado && orcamento?.status !== 'rejeitado'

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!orcamento) {
    return (
      <div className="fade-in">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <AlertCircle size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
          <h2>Orçamento não encontrado</h2>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/orcamentos')}>
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
      </div>
    )
  }

  const status = statusConfig[orcamento.status] || statusConfig.rascunho

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/orcamentos')}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '12px', fontFamily: 'monospace' }}>{orcamento.codigo}</span>
            {orcamento.projetos?.codigo && (
              <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '11px', background: 'var(--stone)', color: 'var(--brown)' }}>
                {orcamento.projetos.codigo}
              </span>
            )}
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: status.bg, color: status.color }}>
              {status.label}
            </span>
          </div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>{orcamento.titulo}</h1>
          <p style={{ color: 'var(--brown-light)', fontSize: '14px', margin: 0 }}>
            {orcamento.projetos?.nome || 'Sem projeto'}  –  {orcamento.projetos?.cliente_nome || 'Sem cliente'}
          </p>
        </div>
        
        {/* Ações */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isEditavel && orcamento.status === 'rascunho' && (
            <button className="btn btn-outline" onClick={handleEnviar}>
              <Send size={16} /> Enviar
            </button>
          )}
          {isEditavel && orcamento.status === 'enviado' && (
            <button className="btn btn-primary" onClick={() => setShowAprovarModal(true)}>
              <CheckCircle2 size={16} /> Aprovar
            </button>
          )}
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-4 mb-lg" style={{ gap: '16px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Subtotal</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency(totais.subtotal)}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px' }}>IVA ({orcamento.iva_percentagem || 23}%)</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency(totais.iva)}</div>
        </div>
        <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, var(--warning), #B8956E)', color: 'white' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.9 }}>Total</div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(totais.totalComIva)}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Margem</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>
            {(orcamento.margem_percentagem || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Capítulos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Capítulos ({capitulos.length})</h2>
        {isEditavel && (
          <button className="btn btn-primary" onClick={() => { setEditingCapitulo(null); setCapituloForm({ nome: '', descricao: '' }); setShowCapituloModal(true) }}>
            <Plus size={16} /> Adicionar Capítulo
          </button>
        )}
      </div>

      {capitulos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--brown-light)' }}>
          <Calculator size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>Sem capítulos. Adicione o primeiro capítulo ao orçamento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {capitulos.map((cap, capIndex) => {
            const isExpanded = expandedCapitulos[cap.id]
            const capTotal = (cap.orcamento_itens || []).reduce((sum, item) => sum + parseFloat(item.preco_total || 0), 0)
            
            return (
              <div key={cap.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Capítulo Header */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px 20px', 
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--cream)' : 'transparent'
                  }}
                  onClick={() => toggleCapitulo(cap.id)}
                >
                  <div style={{ marginRight: '12px', color: 'var(--brown-light)' }}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--warning)', fontFamily: 'monospace' }}>{cap.codigo}</span>
                      <span style={{ fontWeight: 600 }}>{cap.nome}</span>
                      <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                        ({(cap.orcamento_itens || []).length} itens)
                      </span>
                    </div>
                    {cap.descricao && <p style={{ fontSize: '12px', color: 'var(--brown-light)', margin: '4px 0 0' }}>{cap.descricao}</p>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px', marginRight: '16px' }}>{formatCurrency(capTotal)}</div>
                  {isEditavel && (
                    <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleEditCapitulo(cap)}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteConfirm({ type: 'capitulo', item: cap })}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                {/* Itens do Capítulo */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--stone)' }}>
                    {(cap.orcamento_itens || []).length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--brown-light)' }}>
                        Sem itens neste capítulo
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--stone)' }}>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>Código</th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>Descrição</th>
                            <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>Qtd</th>
                            <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>Un</th>
                            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>P. Unit.</th>
                            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>Total</th>
                            {isEditavel && <th style={{ width: '80px' }}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {(cap.orcamento_itens || []).map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--stone)' }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--brown-light)' }}>{item.codigo}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 500 }}>{item.descricao}</div>
                                {item.notas && <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>{item.notas}</div>}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>{item.quantidade}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--brown-light)' }}>{item.unidade}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(item.preco_unitario)}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.preco_total)}</td>
                              {isEditavel && (
                                <td style={{ padding: '12px 8px' }}>
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-ghost btn-icon" onClick={() => handleEditItem(item, cap.id)}><Edit size={14} /></button>
                                    <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteConfirm({ type: 'item', item })}><Trash2 size={14} /></button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    
                    {isEditavel && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--stone)' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '13px' }}
                          onClick={() => handleAddItem(cap.id)}
                        >
                          <Plus size={14} /> Adicionar Item
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: Capítulo */}
      {showCapituloModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCapituloModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '450px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{editingCapitulo ? 'Editar Capítulo' : 'Novo Capítulo'}</h2>
              <button onClick={() => setShowCapituloModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nome *</label>
                <input type="text" value={capituloForm.nome} onChange={e => setCapituloForm({...capituloForm, nome: e.target.value})} placeholder="Ex: Construção Civil" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição</label>
                <textarea value={capituloForm.descricao} onChange={e => setCapituloForm({...capituloForm, descricao: e.target.value})} rows={2} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowCapituloModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveCapitulo} className="btn btn-primary" disabled={!capituloForm.nome.trim()}>{editingCapitulo ? 'Guardar' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Item */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '550px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setShowItemModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição *</label>
                <textarea value={itemForm.descricao} onChange={e => setItemForm({...itemForm, descricao: e.target.value})} rows={2} placeholder="Descrição do item..." style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Quantidade</label>
                  <input type="number" step="0.01" min="0" value={itemForm.quantidade} onChange={e => setItemForm({...itemForm, quantidade: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Unidade</label>
                  <select value={itemForm.unidade} onChange={e => setItemForm({...itemForm, unidade: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px' }}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Margem (%)</label>
                  <input type="number" step="0.1" min="0" value={itemForm.margem_percentagem} onChange={e => setItemForm({...itemForm, margem_percentagem: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Custo Unitário (â‚¬)</label>
                <input type="number" step="0.01" min="0" value={itemForm.custo_unitario} onChange={e => setItemForm({...itemForm, custo_unitario: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>

              {/* Preview de cálculos */}
              <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '8px' }}>Pré-visualização</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div>Preço Unitário: <strong>{formatCurrency(parseFloat(itemForm.custo_unitario || 0) * (1 + parseFloat(itemForm.margem_percentagem || 28) / 100))}</strong></div>
                  <div>Total: <strong>{formatCurrency(parseFloat(itemForm.quantidade || 1) * parseFloat(itemForm.custo_unitario || 0) * (1 + parseFloat(itemForm.margem_percentagem || 28) / 100))}</strong></div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Notas</label>
                <input type="text" value={itemForm.notas} onChange={e => setItemForm({...itemForm, notas: e.target.value})} placeholder="Notas adicionais..." style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowItemModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveItem} className="btn btn-primary" disabled={!itemForm.descricao.trim()}>{editingItem ? 'Guardar' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Aprovar */}
      {showAprovarModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAprovarModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Aprovar Orçamento</h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '16px' }}>
              Confirma a aprovação do orçamento <strong>{orcamento.codigo}</strong> no valor de <strong>{formatCurrency(totais.totalComIva)}</strong>?
            </p>
            <p style={{ fontSize: '12px', color: 'var(--warning)', marginBottom: '24px' }}>
              Após aprovação, o orçamento fica bloqueado para edição.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAprovarModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleAprovar} className="btn btn-primary"><CheckCircle2 size={16} /> Aprovar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminação */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Eliminar {showDeleteConfirm.type === 'capitulo' ? 'Capítulo' : 'Item'}</h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '24px' }}>
              Tem a certeza que deseja eliminar? {showDeleteConfirm.type === 'capitulo' && 'Todos os itens serão eliminados.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={() => showDeleteConfirm.type === 'capitulo' ? handleDeleteCapitulo(showDeleteConfirm.item) : handleDeleteItem(showDeleteConfirm.item)} style={{ padding: '10px 20px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
