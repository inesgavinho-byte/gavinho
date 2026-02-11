import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import {
  Plus, FileText, Calendar, Euro, CheckCircle, Clock, Send,
  ChevronDown, ChevronRight, Edit, Trash2, X, Loader2,
  AlertCircle, Download, Eye, Calculator, Percent, Lock, Upload,
  FileSpreadsheet, Printer
} from 'lucide-react'
import * as XLSX from 'xlsx'

const STATUS_AUTO = {
  rascunho: { label: 'Rascunho', color: '#78716c', bg: '#f5f5f4' },
  emitido: { label: 'Emitido', color: '#2563eb', bg: '#dbeafe' },
  aprovado: { label: 'Aprovado', color: '#16a34a', bg: '#dcfce7' },
  pago: { label: 'Pago', color: '#065f46', bg: '#d1fae5' }
}

export default function ObraAutos({ obra }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null })
  const [autos, setAutos] = useState([])
  const [orcamentoItems, setOrcamentoItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showNovoAutoModal, setShowNovoAutoModal] = useState(false)
  const [showAutoDetalhe, setShowAutoDetalhe] = useState(null)
  const [editingAuto, setEditingAuto] = useState(null)
  
  const percentAdiantamento = obra?.percentagem_adiantamento || 0
  const percentRetencao = obra?.percentagem_retencao || 5
  
  const [autoForm, setAutoForm] = useState({
    mes_referencia: new Date().toISOString().slice(0, 7),
    notas: '',
    is_final: false
  })
  
  const [autoItems, setAutoItems] = useState([])
  const [expandedAreas, setExpandedAreas] = useState({})

  useEffect(() => {
    if (obra?.id) loadData()
  }, [obra?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: autosData } = await supabase
        .from('obra_autos')
        .select('*')
        .eq('obra_id', obra.id)
        .order('numero')
      
      setAutos(autosData || [])
      
      const { data: itemsData } = await supabase
        .from('obra_orcamento_items')
        .select(`*, proposta:obra_propostas(codigo, nome, status)`)
        .eq('obra_id', obra.id)
        .eq('status', 'ativo')
        .order('area')
        .order('ref')
      
      const adjudicados = (itemsData || []).filter(item => 
        item.proposta?.status === 'adjudicada' || 
        item.proposta?.status === 'concluida' ||
        !item.proposta_id
      )
      
      setOrcamentoItems(adjudicados)
    } catch (err) {
      console.error('Erro ao carregar autos:', err)
    } finally {
      setLoading(false)
    }
  }

  const getNextNumero = () => {
    if (autos.length === 0) return 1
    return Math.max(...autos.map(a => a.numero || 0)) + 1
  }

  const getPercentagemAnterior = async (itemId, autoNumero = null) => {
    const autosAnteriores = autos
      .filter(a => a.status !== 'rascunho' && (autoNumero === null || a.numero < autoNumero))
      .sort((a, b) => b.numero - a.numero)
    
    if (autosAnteriores.length === 0) return 0
    
    const { data } = await supabase
      .from('obra_auto_items')
      .select('percentagem_atual')
      .eq('auto_id', autosAnteriores[0].id)
      .eq('orcamento_item_id', itemId)
      .single()
    
    return data?.percentagem_atual || 0
  }

  const initAutoItems = async () => {
    const autoNumero = getNextNumero()
    const itemsComPercent = []
    
    for (const item of orcamentoItems) {
      const percAnterior = await getPercentagemAnterior(item.id, autoNumero)
      itemsComPercent.push({
        orcamento_item_id: item.id,
        item: item,
        percentagem_anterior: percAnterior,
        percentagem_atual: percAnterior,
        quantidade_total: item.quantidade || 0,
        preco_venda_unit: item.preco_venda_unit || 0,
        preco_venda_total: item.preco_venda_total || 0
      })
    }
    
    return itemsComPercent
  }

  const calcularValores = (itemsList) => {
    let valorAcumuladoAnterior = 0
    let valorAcumuladoAtual = 0
    
    itemsList.forEach(ai => {
      const valorTotal = (ai.quantidade_total || 0) * (ai.preco_venda_unit || 0)
      valorAcumuladoAnterior += (valorTotal * (ai.percentagem_anterior || 0) / 100)
      valorAcumuladoAtual += (valorTotal * (ai.percentagem_atual || 0) / 100)
    })
    
    const valorPeriodo = valorAcumuladoAtual - valorAcumuladoAnterior
    const deducaoAdiantamento = valorPeriodo * (percentAdiantamento / 100)
    const retencaoGarantia = valorPeriodo * (percentRetencao / 100)
    const valorAFaturar = valorPeriodo - deducaoAdiantamento - retencaoGarantia
    
    return { valorAcumuladoAnterior, valorAcumuladoAtual, valorPeriodo, deducaoAdiantamento, retencaoGarantia, valorAFaturar }
  }

  const handleNovoAuto = async () => {
    const items = await initAutoItems()
    setAutoItems(items)
    setAutoForm({ mes_referencia: new Date().toISOString().slice(0, 7), notas: '', is_final: false })
    setEditingAuto(null)
    setShowNovoAutoModal(true)
  }

  const handleEditAuto = async (auto) => {
    const { data: autoItemsData } = await supabase
      .from('obra_auto_items')
      .select('*')
      .eq('auto_id', auto.id)
    
    const itemsComDados = orcamentoItems.map(item => {
      const autoItem = autoItemsData?.find(ai => ai.orcamento_item_id === item.id)
      return {
        orcamento_item_id: item.id,
        item: item,
        percentagem_anterior: autoItem?.percentagem_anterior || 0,
        percentagem_atual: autoItem?.percentagem_atual || 0,
        quantidade_total: item.quantidade || 0,
        preco_venda_unit: item.preco_venda_unit || 0,
        preco_venda_total: item.preco_venda_total || 0
      }
    })
    
    setAutoItems(itemsComDados)
    setAutoForm({ mes_referencia: auto.mes_referencia?.slice(0, 7) || new Date().toISOString().slice(0, 7), notas: auto.notas || '', is_final: auto.is_final || false })
    setEditingAuto(auto)
    setShowNovoAutoModal(true)
  }

  const handleSaveAuto = async (status = 'rascunho') => {
    setSaving(true)
    try {
      const valores = calcularValores(autoItems)
      const numero = editingAuto?.numero || getNextNumero()
      
      const autoData = {
        obra_id: obra.id,
        numero,
        mes_referencia: autoForm.mes_referencia + '-01',
        status,
        is_final: autoForm.is_final,
        notas: autoForm.notas,
        valor_acumulado_anterior: valores.valorAcumuladoAnterior,
        valor_acumulado_atual: valores.valorAcumuladoAtual,
        valor_periodo: valores.valorPeriodo,
        deducao_adiantamento: valores.deducaoAdiantamento,
        retencao_garantia: valores.retencaoGarantia,
        valor_a_faturar: valores.valorAFaturar,
        created_by: profile?.id,
        updated_at: new Date().toISOString()
      }
      
      let autoId = editingAuto?.id
      
      if (editingAuto) {
        await supabase.from('obra_autos').update(autoData).eq('id', editingAuto.id)
      } else {
        const { data } = await supabase.from('obra_autos').insert(autoData).select().single()
        autoId = data.id
      }
      
      await supabase.from('obra_auto_items').delete().eq('auto_id', autoId)
      
      const itemsToInsert = autoItems
        .filter(ai => ai.percentagem_atual > 0 || ai.percentagem_anterior > 0)
        .map(ai => {
          const valorTotal = (ai.quantidade_total || 0) * (ai.preco_venda_unit || 0)
          const quantidadeMedida = (ai.quantidade_total || 0) * (ai.percentagem_atual / 100)
          return {
            auto_id: autoId,
            orcamento_item_id: ai.orcamento_item_id,
            percentagem_anterior: ai.percentagem_anterior,
            percentagem_atual: ai.percentagem_atual,
            quantidade_medida: quantidadeMedida,
            valor_acumulado_anterior: valorTotal * (ai.percentagem_anterior / 100),
            valor_acumulado_atual: valorTotal * (ai.percentagem_atual / 100),
            valor_periodo: valorTotal * ((ai.percentagem_atual - ai.percentagem_anterior) / 100)
          }
        })
      
      if (itemsToInsert.length > 0) {
        await supabase.from('obra_auto_items').insert(itemsToInsert)
      }
      
      for (const ai of autoItems) {
        if (ai.percentagem_atual !== ai.percentagem_anterior) {
          await supabase
            .from('obra_orcamento_items')
            .update({ percentagem_execucao: ai.percentagem_atual, quantidade_executada: (ai.quantidade_total || 0) * (ai.percentagem_atual / 100) })
            .eq('id', ai.orcamento_item_id)
        }
      }
      
      setShowNovoAutoModal(false)
      loadData()
    } catch (err) {
      console.error('Erro ao guardar auto:', err)
      toast.error('Erro', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePercentagem = (itemId, novaPercent) => {
    const percent = Math.min(100, Math.max(0, parseFloat(novaPercent) || 0))
    setAutoItems(prev => prev.map(ai => ai.orcamento_item_id === itemId ? { ...ai, percentagem_atual: percent } : ai))
  }

  const handleAplicarPercentArea = (area, percent) => {
    setAutoItems(prev => prev.map(ai => ai.item.area === area ? { ...ai, percentagem_atual: Math.min(100, Math.max(ai.percentagem_anterior, percent)) } : ai))
  }

  const exportarAutoExcel = (auto) => {
    supabase
      .from('obra_auto_items')
      .select(`*, orcamento_item:obra_orcamento_items(ref, area, descricao, unidade, quantidade, preco_venda_unit)`)
      .eq('auto_id', auto.id)
      .then(({ data }) => {
        const rows = (data || []).map(ai => ({
          'Ref.': ai.orcamento_item?.ref || '',
          'Àrea': ai.orcamento_item?.area || '',
          'Descrição': ai.orcamento_item?.descricao || '',
          'UN': ai.orcamento_item?.unidade || '',
          'Quant. Total': ai.orcamento_item?.quantidade || 0,
          'P. Unit. â‚¬': ai.orcamento_item?.preco_venda_unit?.toFixed(2) || '0.00',
          'P. Total â‚¬': ((ai.orcamento_item?.quantidade || 0) * (ai.orcamento_item?.preco_venda_unit || 0)).toFixed(2),
          '% Anterior': ai.percentagem_anterior?.toFixed(2) || '0.00',
          '% Atual': ai.percentagem_atual?.toFixed(2) || '0.00',
          'Quant. Medida': ai.quantidade_medida?.toFixed(2) || '0.00',
          'Valor Período â‚¬': ai.valor_periodo?.toFixed(2) || '0.00'
        }))
        
        rows.push({})
        rows.push({ 'Descrição': 'RESUMO DO AUTO' })
        rows.push({ 'Descrição': 'Valor Acumulado Anterior', 'Valor Período â‚¬': auto.valor_acumulado_anterior?.toFixed(2) })
        rows.push({ 'Descrição': 'Valor Acumulado Atual', 'Valor Período â‚¬': auto.valor_acumulado_atual?.toFixed(2) })
        rows.push({ 'Descrição': 'Valor do Período', 'Valor Período â‚¬': auto.valor_periodo?.toFixed(2) })
        rows.push({ 'Descrição': `Dedução Adiantamento (${percentAdiantamento}%)`, 'Valor Período â‚¬': (-auto.deducao_adiantamento || 0).toFixed(2) })
        rows.push({ 'Descrição': `Retenção Garantia (${percentRetencao}%)`, 'Valor Período â‚¬': (-auto.retencao_garantia || 0).toFixed(2) })
        rows.push({ 'Descrição': 'VALOR A FATURAR', 'Valor Período â‚¬': auto.valor_a_faturar?.toFixed(2) })
        
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, `Auto ${auto.numero}`)
        XLSX.writeFile(wb, `${obra.codigo}_Auto_${auto.numero}_${auto.mes_referencia?.slice(0,7)}.xlsx`)
      })
  }

  const handleDeleteAuto = async (auto) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Auto',
      message: `Eliminar Auto nº ${auto.numero}?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await supabase.from('obra_auto_items').delete().eq('auto_id', auto.id)
          await supabase.from('obra_autos').delete().eq('id', auto.id)
          loadData()
        } catch (err) {
          toast.error('Erro', err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const areasUnicas = [...new Set(orcamentoItems.map(i => i.area).filter(Boolean))]
  const valoresCalculados = calcularValores(autoItems)
  const totalContrato = orcamentoItems.reduce((sum, i) => sum + (i.preco_venda_total || 0), 0)
  const totalExecutado = autos.filter(a => a.status !== 'rascunho').reduce((sum, a) => sum + (a.valor_periodo || 0), 0)
  const percentExecutado = totalContrato > 0 ? (totalExecutado / totalContrato * 100) : 0

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} /></div>
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{autos.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Autos</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--info)' }}>{totalContrato.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Valor Contrato</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{totalExecutado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Faturado</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warning)' }}>{percentExecutado.toFixed(1)}%</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Execução</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#78716c' }}>{(totalContrato - totalExecutado).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Por Faturar</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Autos de Medição</h3>
          <button onClick={handleNovoAuto} className="btn btn-primary" disabled={orcamentoItems.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Novo Auto
          </button>
        </div>
        {orcamentoItems.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginTop: '12px' }}>âš ï¸ Adicione artigos adjudicados na tab Orçamentação para criar autos.</p>
        )}
      </div>

      {/* Lista de Autos */}
      {autos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <FileText size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ color: 'var(--brown-light)' }}>Sem autos de medição</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {autos.map(auto => {
            const statusConf = STATUS_AUTO[auto.status] || STATUS_AUTO.rascunho
            return (
              <div key={auto.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>Auto nº {auto.numero}</span>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusConf.bg, color: statusConf.color }}>{statusConf.label}</span>
                      {auto.is_final && <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>FINAL</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                      <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      {auto.mes_referencia ? new Date(auto.mes_referencia).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) : '-'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Valor do Período</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>{(auto.valor_periodo || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div>
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>A Faturar: {(auto.valor_a_faturar || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowAutoDetalhe(auto)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}><Eye size={14} /> Ver</button>
                  <button onClick={() => exportarAutoExcel(auto)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}><Download size={14} /> Excel</button>
                  {auto.status === 'rascunho' && (
                    <>
                      <button onClick={() => handleEditAuto(auto)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}><Edit size={14} /> Editar</button>
                      <button onClick={() => handleDeleteAuto(auto)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Novo/Editar Auto */}
      {showNovoAutoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflow: 'auto', padding: '40px 20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '1200px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{editingAuto ? `Editar Auto nº ${editingAuto.numero}` : `Novo Auto nº ${getNextNumero()}`}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--brown-light)' }}>{orcamentoItems.length} artigos adjudicados</p>
              </div>
              <button onClick={() => setShowNovoAutoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Mês de Referência</label>
                  <input type="month" value={autoForm.mes_referencia} onChange={e => setAutoForm({ ...autoForm, mes_referencia: e.target.value })} style={{ padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '6px' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoForm.is_final} onChange={e => setAutoForm({ ...autoForm, is_final: e.target.checked })} />
                  <span style={{ fontSize: '13px' }}>Auto Final</span>
                </label>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Notas</label>
                  <input type="text" value={autoForm.notas} onChange={e => setAutoForm({ ...autoForm, notas: e.target.value })} placeholder="Notas..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--stone)', background: '#f0fdf4' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', fontSize: '13px' }}>
                <div><div style={{ color: 'var(--brown-light)', marginBottom: '2px' }}>Acumulado Anterior</div><div style={{ fontWeight: 600 }}>{valoresCalculados.valorAcumuladoAnterior.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
                <div><div style={{ color: 'var(--brown-light)', marginBottom: '2px' }}>Acumulado Atual</div><div style={{ fontWeight: 600 }}>{valoresCalculados.valorAcumuladoAtual.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
                <div><div style={{ color: 'var(--brown-light)', marginBottom: '2px' }}>Valor Período</div><div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '16px' }}>{valoresCalculados.valorPeriodo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
                <div><div style={{ color: 'var(--brown-light)', marginBottom: '2px' }}>Adiantamento ({percentAdiantamento}%)</div><div style={{ fontWeight: 600, color: '#dc2626' }}>-{valoresCalculados.deducaoAdiantamento.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
                <div><div style={{ color: 'var(--brown-light)', marginBottom: '2px' }}>Retenção ({percentRetencao}%)</div><div style={{ fontWeight: 600, color: '#d97706' }}>-{valoresCalculados.retencaoGarantia.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
                <div><div style={{ color: 'var(--brown-light)', marginBottom: '2px' }}>A Faturar</div><div style={{ fontWeight: 700, color: 'var(--info)', fontSize: '16px' }}>{valoresCalculados.valorAFaturar.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
              </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--cream)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '60px' }}>Ref.</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '120px' }}>Àrea</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Descrição</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: '40px' }}>UN</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '70px' }}>Quant.</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '80px' }}>P.Unit â‚¬</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '90px' }}>Total â‚¬</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: '70px' }}>% Ant.</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: '80px', background: '#fef3c7' }}>% Atual</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '90px' }}>Valor Per.</th>
                  </tr>
                </thead>
                <tbody>
                  {areasUnicas.map(area => {
                    const areaItems = autoItems.filter(ai => ai.item.area === area)
                    const isExpanded = expandedAreas[area] !== false
                    return (
                      <Fragment key={area}>
                        <tr style={{ background: 'var(--stone)', cursor: 'pointer' }} onClick={() => setExpandedAreas(prev => ({ ...prev, [area]: !isExpanded }))}>
                          <td colSpan={8} style={{ padding: '8px 12px', fontWeight: 600 }}>
                            {isExpanded ? <ChevronDown size={14} style={{ verticalAlign: 'middle' }} /> : <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />}
                            {' '}{area} ({areaItems.length})
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input type="number" placeholder="%" min="0" max="100" onClick={e => e.stopPropagation()} onChange={e => handleAplicarPercentArea(area, parseFloat(e.target.value) || 0)} style={{ width: '50px', padding: '4px', textAlign: 'center', border: '1px solid var(--brown-light)', borderRadius: '4px', fontSize: '11px' }} />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {areaItems.reduce((sum, ai) => { const v = (ai.quantidade_total || 0) * (ai.preco_venda_unit || 0); return sum + v * ((ai.percentagem_atual - ai.percentagem_anterior) / 100) }, 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
                          </td>
                        </tr>
                        {isExpanded && areaItems.map(ai => {
                          const valorTotal = (ai.quantidade_total || 0) * (ai.preco_venda_unit || 0)
                          const valorPeriodo = valorTotal * ((ai.percentagem_atual - ai.percentagem_anterior) / 100)
                          return (
                            <tr key={ai.orcamento_item_id} style={{ borderBottom: '1px solid var(--stone)' }}>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brown-light)' }}>{ai.item.ref || '-'}</td>
                              <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--brown-light)' }}>{ai.item.area}</td>
                              <td style={{ padding: '8px 12px' }}>{ai.item.descricao}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--brown-light)' }}>{ai.item.unidade}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{ai.quantidade_total?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{ai.preco_venda_unit?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>{valorTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--brown-light)' }}>{ai.percentagem_anterior.toFixed(0)}%</td>
                              <td style={{ padding: '8px', textAlign: 'center', background: '#fffbeb' }}>
                                <input type="number" value={ai.percentagem_atual} onChange={e => handleUpdatePercentagem(ai.orcamento_item_id, e.target.value)} min={ai.percentagem_anterior} max="100" step="5" style={{ width: '55px', padding: '4px', textAlign: 'center', border: '1px solid var(--stone)', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }} />
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: valorPeriodo > 0 ? 'var(--success)' : 'var(--brown-light)' }}>{valorPeriodo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                  {autoItems.filter(ai => !ai.item.area).length > 0 && (
                    <>
                      <tr style={{ background: 'var(--stone)' }}><td colSpan={10} style={{ padding: '8px 12px', fontWeight: 600 }}>Sem Àrea ({autoItems.filter(ai => !ai.item.area).length})</td></tr>
                      {autoItems.filter(ai => !ai.item.area).map(ai => {
                        const valorTotal = (ai.quantidade_total || 0) * (ai.preco_venda_unit || 0)
                        const valorPeriodo = valorTotal * ((ai.percentagem_atual - ai.percentagem_anterior) / 100)
                        return (
                          <tr key={ai.orcamento_item_id} style={{ borderBottom: '1px solid var(--stone)' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px' }}>{ai.item.ref || '-'}</td>
                            <td style={{ padding: '8px 12px' }}>-</td>
                            <td style={{ padding: '8px 12px' }}>{ai.item.descricao}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{ai.item.unidade}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{ai.quantidade_total?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{ai.preco_venda_unit?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{valorTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{ai.percentagem_anterior.toFixed(0)}%</td>
                            <td style={{ padding: '8px', textAlign: 'center', background: '#fffbeb' }}>
                              <input type="number" value={ai.percentagem_atual} onChange={e => handleUpdatePercentagem(ai.orcamento_item_id, e.target.value)} min={ai.percentagem_anterior} max="100" style={{ width: '55px', padding: '4px', textAlign: 'center', border: '1px solid var(--stone)', borderRadius: '4px' }} />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: valorPeriodo > 0 ? 'var(--success)' : 'inherit' }}>{valorPeriodo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</td>
                          </tr>
                        )
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-outline" onClick={() => setShowNovoAutoModal(false)}>Cancelar</button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" onClick={() => handleSaveAuto('rascunho')} disabled={saving}>{saving && <Loader2 size={16} className="spin" />} Guardar Rascunho</button>
                <button className="btn btn-primary" onClick={() => handleSaveAuto('emitido')} disabled={saving || valoresCalculados.valorPeriodo <= 0} style={{ background: '#16a34a' }}>{saving && <Loader2 size={16} className="spin" />}<Send size={16} /> Emitir Auto</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Auto */}
      {showAutoDetalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAutoDetalhe(null)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Auto nº {showAutoDetalhe.numero}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--brown-light)' }}>{showAutoDetalhe.mes_referencia ? new Date(showAutoDetalhe.mes_referencia).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) : '-'}</p>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div><div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Valor Acumulado Anterior</div><div style={{ fontSize: '16px', fontWeight: 600 }}>{(showAutoDetalhe.valor_acumulado_anterior || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
                <div><div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Valor Acumulado Atual</div><div style={{ fontSize: '16px', fontWeight: 600 }}>{(showAutoDetalhe.valor_acumulado_atual || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
                <div><div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Valor do Período</div><div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>{(showAutoDetalhe.valor_periodo || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
                <div><div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Valor a Faturar</div><div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--info)' }}>{(showAutoDetalhe.valor_a_faturar || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</div></div>
              </div>
              <div style={{ background: 'var(--cream)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Dedução Adiantamento ({percentAdiantamento}%)</span><span style={{ color: '#dc2626' }}>-{(showAutoDetalhe.deducao_adiantamento || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Retenção Garantia ({percentRetencao}%)</span><span style={{ color: '#d97706' }}>-{(showAutoDetalhe.retencao_garantia || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬</span></div>
              </div>
              {showAutoDetalhe.notas && <div style={{ background: 'var(--stone)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}><strong>Notas:</strong> {showAutoDetalhe.notas}</div>}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-outline" onClick={() => setShowAutoDetalhe(null)}>Fechar</button>
              <button className="btn btn-primary" onClick={() => exportarAutoExcel(showAutoDetalhe)}><Download size={16} /> Exportar Excel</button>
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
        type={confirmModal.type}
      />
    </div>
  )
}
