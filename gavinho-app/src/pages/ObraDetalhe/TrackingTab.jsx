import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, Lock, Copy, X,
  FileText, Calculator, Receipt, ShoppingCart,
  TrendingUp, ClipboardList, AlertTriangle, Loader2
} from 'lucide-react'
import SpreadsheetTable from './SpreadsheetTable'
import { colors, unidades, popEstados } from './constants'
import { formatDate, formatCurrency } from './utils'

export default function TrackingTab({ obra, activeSubtab, onSubtabChange, toast, setConfirmModal }) {
  const [saving, setSaving] = useState(false)
  const [tabLoading, setTabLoading] = useState(false)

  // Estados MQT
  const [mqtVersoes, setMqtVersoes] = useState([])
  const [selectedMqtVersao, setSelectedMqtVersao] = useState(null)
  const [mqtLinhas, setMqtLinhas] = useState([])
  const [showNewVersionModal, setShowNewVersionModal] = useState(false)

  // Estados Orçamento
  const [orcamentos, setOrcamentos] = useState([])
  const [selectedOrcamento, setSelectedOrcamento] = useState(null)
  const [orcamentoLinhas, setOrcamentoLinhas] = useState([])

  // Estados POPs
  const [pops, setPops] = useState([])
  const [selectedPop, setSelectedPop] = useState(null)
  const [popLinhas, setPopLinhas] = useState([])
  const [adendas, setAdendas] = useState([])

  // Estados Compras
  const [compras, setCompras] = useState([])

  // Estados Execução
  const [execucao, setExecucao] = useState([])

  // Estados Autos
  const [autos, setAutos] = useState([])
  const [selectedAuto, setSelectedAuto] = useState(null)
  const [autoLinhas, setAutoLinhas] = useState([])

  // Estados Modais
  const [showNewCompraModal, setShowNewCompraModal] = useState(false)
  const [showNewExecucaoModal, setShowNewExecucaoModal] = useState(false)
  const [newCompraForm, setNewCompraForm] = useState({ notas: '', preco_comprado_total: '', data_compra: new Date().toISOString().split('T')[0] })
  const [newExecucaoForm, setNewExecucaoForm] = useState({ pop_linha_id: '', percentagem_execucao: '', notas: '', data_registo: new Date().toISOString().split('T')[0] })
  const [popLinhasDisponiveis, setPopLinhasDisponiveis] = useState([])

  // ============================================
  // MEMOIZED VALUES
  // ============================================

  const mqtColumns = useMemo(() => [
    { key: 'capitulo', label: 'CAP.', width: 70, type: 'number', editable: true, align: 'center' },
    { key: 'referencia', label: 'REF.', width: 80, type: 'text', editable: true },
    { key: 'tipo_subtipo', label: 'TIPO/SUBTIPO', width: 160, type: 'text', editable: true },
    { key: 'zona', label: 'ZONA', width: 140, type: 'text', editable: true },
    { key: 'descricao', label: 'DESCRIÇÃO', width: 350, type: 'text', editable: true },
    { key: 'unidade', label: 'UN', width: 70, type: 'select', options: unidades, editable: true },
    { key: 'quantidade', label: 'QTD', width: 100, type: 'number', editable: true, align: 'right' },
  ], [])

  const orcamentoColumns = useMemo(() => [
    { key: 'capitulo', label: 'CAP.', width: 70, type: 'number', editable: true, align: 'center' },
    { key: 'referencia', label: 'REF.', width: 80, type: 'text', editable: true },
    { key: 'descricao', label: 'DESCRIÇÃO', width: 300, type: 'text', editable: true },
    { key: 'unidade', label: 'UN', width: 70, type: 'select', options: unidades, editable: true },
    { key: 'quantidade', label: 'QTD', width: 90, type: 'number', editable: true, align: 'right' },
    { key: 'custo_unitario', label: 'CUSTO/UN', width: 100, type: 'number', editable: true, align: 'right',
      render: (val) => formatCurrency(val) },
    { key: 'preco_venda', label: 'PREÇO/UN', width: 100, type: 'number', editable: true, align: 'right',
      render: (val) => formatCurrency(val) },
    { key: 'total_custo', label: 'TOTAL CUSTO', width: 110, editable: false, align: 'right',
      render: (val, row) => formatCurrency((row.quantidade || 0) * (row.custo_unitario || 0)) },
    { key: 'total_venda', label: 'TOTAL VENDA', width: 110, editable: false, align: 'right',
      render: (val, row) => formatCurrency((row.quantidade || 0) * (row.preco_venda || 0)) },
  ], [])

  const { totalCusto, totalVenda, margem } = useMemo(() => {
    const tc = orcamentoLinhas.reduce((sum, l) => sum + (l.quantidade || 0) * (l.custo_unitario || 0), 0)
    const tv = orcamentoLinhas.reduce((sum, l) => sum + (l.quantidade || 0) * (l.preco_venda || 0), 0)
    const m = tv > 0 ? ((tv - tc) / tv * 100) : 0
    return { totalCusto: tc, totalVenda: tv, margem: m }
  }, [orcamentoLinhas])

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    if (obra?.id) loadTabData()
  }, [obra?.id, activeSubtab])

  const loadTabData = async () => {
    setTabLoading(true)
    try {
      switch (activeSubtab) {
        case 'mqt': await fetchMqtVersoes(); break
        case 'orcamento': await fetchOrcamentos(); break
        case 'pops': await fetchPops(); break
        case 'compras': await fetchCompras(); break
        case 'execucao': await fetchExecucao(); break
        case 'autos': await fetchAutos(); break
      }
    } finally {
      setTabLoading(false)
    }
  }

  // ============================================
  // FUNÇÕES DE FETCH
  // ============================================

  const fetchMqtVersoes = async () => {
    try {
      const { data, error } = await supabase
        .from('mqt_versoes').select('*').eq('obra_id', obra.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setMqtVersoes(data || [])
      const activeVersion = data?.find(v => v.is_ativa) || data?.[0]
      if (activeVersion && (!selectedMqtVersao || selectedMqtVersao.id !== activeVersion.id)) {
        setSelectedMqtVersao(activeVersion)
        await fetchMqtLinhas(activeVersion.id)
      }
    } catch (err) { console.error('Erro ao carregar versões MQT:', err) }
  }

  const fetchMqtLinhas = async (versaoId) => {
    try {
      const { data, error } = await supabase
        .from('mqt_linhas').select('*').eq('mqt_versao_id', versaoId).order('ordem')
      if (error) throw error
      setMqtLinhas(data || [])
    } catch (err) { console.error('Erro ao carregar linhas MQT:', err) }
  }

  const fetchOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos_internos').select('*, mqt_versoes(versao, is_ativa)')
        .eq('obra_id', obra.id).order('created_at', { ascending: false })
      if (error) throw error
      const mapped = (data || []).map(o => ({ ...o, versao: o.mqt_versoes?.versao, is_ativo: o.mqt_versoes?.is_ativa }))
      setOrcamentos(mapped)
      const active = mapped.find(o => o.is_ativo) || mapped[0]
      if (active && (!selectedOrcamento || selectedOrcamento.id !== active.id)) {
        setSelectedOrcamento(active)
        await fetchOrcamentoLinhas(active.id)
      }
    } catch (err) { console.error('Erro ao carregar orçamentos:', err) }
  }

  const fetchOrcamentoLinhas = async (orcamentoId) => {
    try {
      const { data, error } = await supabase
        .from('orcamento_linhas')
        .select('*, mqt_linhas(ordem, capitulo, referencia, tipo_subtipo, zona, descricao, unidade, quantidade)')
        .eq('orcamento_id', orcamentoId)
      if (error) throw error
      const mapped = (data || []).map(l => ({
        ...l, ordem: l.mqt_linhas?.ordem || 0, capitulo: l.mqt_linhas?.capitulo,
        referencia: l.mqt_linhas?.referencia, descricao: l.mqt_linhas?.descricao,
        unidade: l.mqt_linhas?.unidade, quantidade: l.mqt_linhas?.quantidade || 0,
        custo_unitario: l.preco_custo_unitario, preco_venda: l.preco_custo_unitario * 1.25
      }))
      mapped.sort((a, b) => a.ordem - b.ordem)
      setOrcamentoLinhas(mapped)
    } catch (err) { console.error('Erro ao carregar linhas orçamento:', err) }
  }

  const fetchPops = async () => {
    try {
      const { data, error } = await supabase
        .from('pops').select('*').eq('obra_id', obra.id).order('created_at', { ascending: false })
      if (error) throw error
      setPops(data || [])
      if (data?.[0] && (!selectedPop || selectedPop.id !== data[0].id)) {
        setSelectedPop(data[0])
        await fetchPopLinhas(data[0].id)
        await fetchAdendas(data[0].id)
      }
    } catch (err) { console.error('Erro ao carregar POPs:', err) }
  }

  const fetchPopLinhas = async (popId) => {
    try {
      const { data, error } = await supabase.from('pop_linhas').select('*').eq('pop_id', popId).order('ordem')
      if (error) throw error
      setPopLinhas(data || [])
    } catch (err) { console.error('Erro ao carregar linhas POP:', err) }
  }

  const fetchAdendas = async (popId) => {
    try {
      const { data, error } = await supabase
        .from('adendas').select('*, adenda_linhas(*)').eq('pop_id', popId).order('numero')
      if (error) throw error
      setAdendas(data || [])
    } catch (err) { console.error('Erro ao carregar adendas:', err) }
  }

  const fetchCompras = async () => {
    try {
      const { data, error } = await supabase
        .from('obras_compras').select('*, fornecedores(nome)')
        .eq('obra_id', obra.id).order('data_compra', { ascending: false })
      if (error) throw error
      const mapped = (data || []).map(c => ({
        ...c, data_pedido: c.data_compra, fornecedor: c.fornecedores?.nome || '-',
        descricao: c.notas || '-', valor: c.preco_comprado_total, estado: 'registado'
      }))
      setCompras(mapped)
    } catch (err) { console.error('Erro ao carregar compras:', err) }
  }

  const fetchExecucao = async () => {
    try {
      const { data, error } = await supabase
        .from('obras_execucao')
        .select('*, pop_linhas(orcamento_linha_id, orcamento_linhas:orcamento_linha_id(mqt_linha_id, mqt_linhas:mqt_linha_id(descricao)))')
        .eq('obra_id', obra.id).order('data_registo', { ascending: false })
      if (error) throw error
      const mapped = (data || []).map(r => ({
        ...r, descricao: r.pop_linhas?.orcamento_linhas?.mqt_linhas?.descricao || r.notas || '-',
        percentagem: r.percentagem_execucao
      }))
      setExecucao(mapped)
    } catch (err) { console.error('Erro ao carregar execução:', err) }
  }

  const fetchPopLinhasDisponiveis = async () => {
    try {
      const { data, error } = await supabase
        .from('pop_linhas')
        .select('*, pops!inner(estado, obra_id), orcamento_linhas:orcamento_linha_id(mqt_linha_id, mqt_linhas:mqt_linha_id(descricao, unidade, quantidade))')
        .eq('pops.obra_id', obra.id).eq('pops.estado', 'contratada')
      if (error) throw error
      setPopLinhasDisponiveis((data || []).map(pl => ({
        ...pl, descricao: pl.orcamento_linhas?.mqt_linhas?.descricao || `Linha ${pl.id.slice(0, 8)}`,
        unidade: pl.orcamento_linhas?.mqt_linhas?.unidade, quantidade: pl.orcamento_linhas?.mqt_linhas?.quantidade
      })))
    } catch (err) { console.error('Erro ao carregar POP linhas:', err) }
  }

  const fetchAutos = async () => {
    try {
      const { data, error } = await supabase
        .from('autos').select('*').eq('obra_id', obra.id).order('numero', { ascending: false })
      if (error) throw error
      setAutos(data || [])
      if (data?.[0] && (!selectedAuto || selectedAuto.id !== data[0].id)) {
        setSelectedAuto(data[0])
        await fetchAutoLinhas(data[0].id)
      }
    } catch (err) { console.error('Erro ao carregar autos:', err) }
  }

  const fetchAutoLinhas = async (autoId) => {
    try {
      const { data, error } = await supabase.from('auto_linhas').select('*').eq('auto_id', autoId).order('ordem')
      if (error) throw error
      setAutoLinhas(data || [])
    } catch (err) { console.error('Erro ao carregar linhas auto:', err) }
  }

  // ============================================
  // FUNÇÕES MQT
  // ============================================

  const createNewMqtVersion = async (copyFrom = null) => {
    try {
      setSaving(true)
      const existingVersions = mqtVersoes.map(v => parseFloat(v.versao.replace('v', '')))
      const maxVersion = existingVersions.length > 0 ? Math.max(...existingVersions) : 0
      const newVersionNum = copyFrom ? (maxVersion + 0.1).toFixed(1) : '1.0'
      const newVersionId = `${obra.id}_mqt_v${newVersionNum}`
      const { error: versionError } = await supabase.from('mqt_versoes').insert({
        id: newVersionId, obra_id: obra.id, versao: `v${newVersionNum}`,
        is_ativa: true, is_congelada: false, notas: copyFrom ? `Copiado de ${copyFrom.versao}` : 'Nova versão'
      })
      if (versionError) throw versionError
      await supabase.from('mqt_versoes').update({ is_ativa: false }).eq('obra_id', obra.id).neq('id', newVersionId)
      if (copyFrom) {
        const { data: sourceLines } = await supabase.from('mqt_linhas').select('*').eq('mqt_versao_id', copyFrom.id).order('ordem')
        if (sourceLines?.length > 0) {
          const newLines = sourceLines.map(line => ({
            mqt_versao_id: newVersionId, ordem: line.ordem, capitulo: line.capitulo,
            referencia: line.referencia, tipo_subtipo: line.tipo_subtipo, zona: line.zona,
            descricao: line.descricao, unidade: line.unidade, quantidade: line.quantidade, notas: line.notas
          }))
          await supabase.from('mqt_linhas').insert(newLines)
        }
      }
      await fetchMqtVersoes()
      setShowNewVersionModal(false)
    } catch (err) {
      console.error('Erro ao criar versão:', err)
      toast.error('Erro', 'Erro ao criar nova versão')
    } finally { setSaving(false) }
  }

  const addMqtLine = async () => {
    if (!selectedMqtVersao || selectedMqtVersao.is_congelada) return
    try {
      const newOrder = mqtLinhas.length > 0 ? Math.max(...mqtLinhas.map(l => l.ordem)) + 1 : 1
      const { data, error } = await supabase.from('mqt_linhas')
        .insert({ mqt_versao_id: selectedMqtVersao.id, ordem: newOrder, descricao: '', unidade: 'un', quantidade: 0 })
        .select().single()
      if (error) throw error
      setMqtLinhas([...mqtLinhas, data])
    } catch (err) { console.error('Erro ao adicionar linha:', err) }
  }

  const updateMqtLine = async (lineId, field, value) => {
    try {
      const { error } = await supabase.from('mqt_linhas').update({ [field]: value }).eq('id', lineId)
      if (error) throw error
      setMqtLinhas(mqtLinhas.map(l => l.id === lineId ? { ...l, [field]: value } : l))
    } catch (err) { console.error('Erro ao atualizar linha:', err) }
  }

  const deleteMqtLine = async (lineId) => {
    setConfirmModal({
      isOpen: true, title: 'Eliminar Linha', message: 'Eliminar esta linha do MQT?', type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('mqt_linhas').delete().eq('id', lineId)
          if (error) throw error
          setMqtLinhas(mqtLinhas.filter(l => l.id !== lineId))
        } catch (err) { console.error('Erro ao eliminar linha:', err) }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const createOrcamentoFromMqt = async () => {
    if (!selectedMqtVersao || mqtLinhas.length === 0) return
    try {
      setSaving(true)
      const orcamentoId = `${obra.id}_orc_${selectedMqtVersao.versao}`
      const { error: orcError } = await supabase.from('orcamentos_internos')
        .insert({ id: orcamentoId, obra_id: obra.id, mqt_versao_id: selectedMqtVersao.id })
      if (orcError) throw orcError
      const orcLinhas = mqtLinhas.map(l => ({ orcamento_id: orcamentoId, mqt_linha_id: l.id, preco_custo_unitario: 0 }))
      const { error: linhasError } = await supabase.from('orcamento_linhas').insert(orcLinhas)
      if (linhasError) throw linhasError
      await fetchOrcamentos()
      onSubtabChange('orcamento')
    } catch (err) { console.error('Erro ao criar orçamento:', err) }
    finally { setSaving(false) }
  }

  const createNewPop = async () => {
    if (!selectedOrcamento) return
    try {
      setSaving(true)
      const nextNum = pops.length > 0 ? Math.max(...pops.map(p => p.numero)) + 1 : 1
      const popId = `${obra.id}_pop_${nextNum}`
      const { error: popError } = await supabase.from('pops')
        .insert({ id: popId, obra_id: obra.id, orcamento_id: selectedOrcamento.id, numero: nextNum, estado: 'rascunho' })
      if (popError) throw popError
      const currentOrcLinhas = orcamentoLinhas.length > 0
        ? orcamentoLinhas
        : await supabase.from('orcamento_linhas').select('id').eq('orcamento_id', selectedOrcamento.id).then(r => r.data || [])
      if (currentOrcLinhas.length > 0) {
        const popLs = currentOrcLinhas.map(l => ({ pop_id: popId, orcamento_linha_id: l.id, margem_k: 1.25 }))
        const { error: linhasError } = await supabase.from('pop_linhas').insert(popLs)
        if (linhasError) throw linhasError
      }
      await fetchPops()
    } catch (err) { console.error('Erro ao criar POP:', err) }
    finally { setSaving(false) }
  }

  const createNewCompra = async () => {
    try {
      setSaving(true)
      const { error } = await supabase.from('obras_compras').insert({
        obra_id: obra.id, data_compra: newCompraForm.data_compra || null,
        preco_comprado_total: parseFloat(newCompraForm.preco_comprado_total) || 0,
        preco_comprado_unitario: parseFloat(newCompraForm.preco_comprado_total) || 0,
        notas: newCompraForm.notas || null
      })
      if (error) throw error
      await fetchCompras()
      setShowNewCompraModal(false)
      setNewCompraForm({ notas: '', preco_comprado_total: '', data_compra: new Date().toISOString().split('T')[0] })
    } catch (err) { console.error('Erro ao criar compra:', err) }
    finally { setSaving(false) }
  }

  const createExecucaoRegisto = async () => {
    if (!newExecucaoForm.pop_linha_id) return
    try {
      setSaving(true)
      const { error } = await supabase.from('obras_execucao').insert({
        obra_id: obra.id, pop_linha_id: newExecucaoForm.pop_linha_id,
        percentagem_execucao: parseFloat(newExecucaoForm.percentagem_execucao) || 0,
        quantidade_executada: parseFloat(newExecucaoForm.quantidade_executada) || 0,
        data_registo: newExecucaoForm.data_registo || new Date().toISOString().split('T')[0],
        notas: newExecucaoForm.notas || null
      })
      if (error) throw error
      await fetchExecucao()
      setShowNewExecucaoModal(false)
      setNewExecucaoForm({ pop_linha_id: '', percentagem_execucao: '', notas: '', data_registo: new Date().toISOString().split('T')[0] })
    } catch (err) { console.error('Erro ao registar execução:', err) }
    finally { setSaving(false) }
  }

  const createNewAuto = async () => {
    try {
      setSaving(true)
      const now = new Date()
      const ano = now.getFullYear()
      const mes = now.getMonth() + 1
      const nextNum = autos.length > 0 ? Math.max(...autos.map(a => a.numero || 0)) + 1 : 1
      const autoId = `${obra.id}_auto_${ano}_${mes}`
      const { error: autoError } = await supabase.from('autos')
        .insert({ id: autoId, obra_id: obra.id, ano, mes, estado: 'rascunho' })
      if (autoError) throw autoError
      if (popLinhasDisponiveis.length === 0) await fetchPopLinhasDisponiveis()
      const plDisponiveis = popLinhasDisponiveis.length > 0 ? popLinhasDisponiveis : []
      if (plDisponiveis.length > 0) {
        const autoLs = plDisponiveis.map(pl => ({
          auto_id: autoId, pop_linha_id: pl.id, percentagem_anterior: 0,
          percentagem_atual: 0, percentagem_periodo: 0, valor_periodo: 0
        }))
        const { error: linhasError } = await supabase.from('auto_linhas').insert(autoLs)
        if (linhasError) throw linhasError
      }
      await fetchAutos()
    } catch (err) { console.error('Erro ao criar auto:', err) }
    finally { setSaving(false) }
  }

  // ============================================
  // RENDERS
  // ============================================

  if (tabLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: colors.textMuted }}>
        <Loader2 size={24} className="spin" style={{ marginRight: '12px' }} />
        A carregar dados...
      </div>
    )
  }

  const renderMqtTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            aria-label="Selecionar versão MQT"
            value={selectedMqtVersao?.id || ''}
            onChange={async (e) => {
              const versao = mqtVersoes.find(v => v.id === e.target.value)
              setSelectedMqtVersao(versao)
              if (versao) await fetchMqtLinhas(versao.id)
            }}
            style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: colors.white }}
          >
            {mqtVersoes.map(v => (
              <option key={v.id} value={v.id}>
                {v.versao} {v.is_ativa ? '(ativa)' : ''} {v.is_congelada ? '🔒' : ''}
              </option>
            ))}
          </select>
          {selectedMqtVersao?.is_congelada && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#FEF3C7', color: '#92400E', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
              <Lock size={14} /> Versão congelada (POP contratada)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowNewVersionModal(true)} className="btn btn-secondary btn-sm">
            <Copy size={14} /> Nova Versão
          </button>
        </div>
      </div>
      {mqtVersoes.length === 0 ? (
        <div style={{ background: colors.white, borderRadius: '12px', padding: '48px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
          <ClipboardList size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem MQT</h3>
          <p style={{ color: colors.textMuted, marginBottom: '16px' }}>Crie a primeira versão do Mapa de Quantidades</p>
          <button onClick={() => createNewMqtVersion()} className="btn btn-primary">
            <Plus size={16} /> Criar MQT v1.0
          </button>
        </div>
      ) : (
        <SpreadsheetTable columns={mqtColumns} data={mqtLinhas} onUpdate={updateMqtLine} onDelete={deleteMqtLine} onAdd={addMqtLine} isLocked={selectedMqtVersao?.is_congelada} emptyMessage="MQT vazio. Adicione linhas para começar." />
      )}
      {showNewVersionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.white, borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px' }}>Nova Versão MQT</h3>
            <p style={{ color: colors.textMuted, marginBottom: '20px' }}>Escolha como criar a nova versão:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => createNewMqtVersion()} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} disabled={saving}>
                <Plus size={16} /> Começar do zero
              </button>
              {mqtVersoes.map(v => (
                <button key={v.id} onClick={() => createNewMqtVersion(v)} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} disabled={saving}>
                  <Copy size={16} /> Copiar de {v.versao}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNewVersionModal(false)} className="btn btn-ghost" style={{ width: '100%', marginTop: '16px' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )

  const renderOrcamentoTab = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ padding: '16px', background: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>CUSTO TOTAL</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>{formatCurrency(totalCusto)}</div>
        </div>
        <div style={{ padding: '16px', background: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>PREÇO VENDA</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>{formatCurrency(totalVenda)}</div>
        </div>
        <div style={{ padding: '16px', background: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>MARGEM</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: margem >= 20 ? colors.success : colors.warning }}>{margem.toFixed(1)}%</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {orcamentos.length > 0 && (
            <select
              aria-label="Selecionar orçamento"
              value={selectedOrcamento?.id || ''}
              onChange={async (e) => {
                const orc = orcamentos.find(o => o.id === e.target.value)
                setSelectedOrcamento(orc)
                if (orc) await fetchOrcamentoLinhas(orc.id)
              }}
              style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: colors.white }}
            >
              {orcamentos.map(o => (<option key={o.id} value={o.id}>Orçamento {o.versao} {o.is_ativo ? '(ativo)' : ''}</option>))}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {mqtVersoes.length > 0 && orcamentos.length === 0 && (
            <button onClick={createOrcamentoFromMqt} className="btn btn-primary btn-sm" disabled={saving || mqtLinhas.length === 0}>
              <Plus size={14} /> Criar Orçamento do MQT
            </button>
          )}
        </div>
      </div>
      {orcamentos.length === 0 ? (
        <div style={{ background: colors.white, borderRadius: '12px', padding: '48px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
          <Calculator size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem Orçamento Interno</h3>
          <p style={{ color: colors.textMuted, marginBottom: '16px' }}>
            {mqtVersoes.length === 0 ? 'Primeiro crie o MQT na tab anterior' : 'Crie o orçamento a partir do MQT ativo'}
          </p>
        </div>
      ) : (
        <SpreadsheetTable
          columns={orcamentoColumns} data={orcamentoLinhas}
          onUpdate={async (id, field, value) => {
            const fieldMap = { custo_unitario: 'preco_custo_unitario' }
            const dbField = fieldMap[field] || field
            const { error } = await supabase.from('orcamento_linhas').update({ [dbField]: value }).eq('id', id)
            if (!error) {
              setOrcamentoLinhas(orcamentoLinhas.map(l =>
                l.id === id ? { ...l, [field]: value, ...(field === 'custo_unitario' ? { preco_venda: value * 1.25 } : {}) } : l
              ))
            }
          }}
          onDelete={async (id) => {
            setConfirmModal({
              isOpen: true, title: 'Eliminar Linha', message: 'Eliminar esta linha do orçamento?', type: 'danger',
              onConfirm: async () => {
                const { error } = await supabase.from('orcamento_linhas').delete().eq('id', id)
                if (!error) setOrcamentoLinhas(orcamentoLinhas.filter(l => l.id !== id))
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
              }
            })
          }}
          onAdd={async () => {
            const newOrder = orcamentoLinhas.length > 0 ? Math.max(...orcamentoLinhas.map(l => l.ordem)) + 1 : 1
            const { data, error } = await supabase.from('orcamento_linhas')
              .insert({ orcamento_id: selectedOrcamento.id, ordem: newOrder, descricao: '', unidade: 'un', quantidade: 0, custo_unitario: 0, preco_venda: 0 })
              .select().single()
            if (!error) setOrcamentoLinhas([...orcamentoLinhas, data])
          }}
          isLocked={false}
          emptyMessage="Orçamento vazio. Importe do MQT ou adicione linhas manualmente."
        />
      )}
    </div>
  )

  const renderPopsTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Propostas de Orçamento</h2>
        <button onClick={createNewPop} className="btn btn-primary btn-sm" disabled={saving || orcamentos.length === 0} title={orcamentos.length === 0 ? 'Primeiro crie um orçamento interno' : ''}>
          <Plus size={14} /> Nova POP
        </button>
      </div>
      {pops.length === 0 ? (
        <div style={{ background: colors.white, borderRadius: '12px', padding: '48px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
          <FileText size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem POPs</h3>
          <p style={{ color: colors.textMuted, marginBottom: '16px' }}>Crie propostas de orçamento a partir do orçamento interno</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {pops.map(pop => {
            const estado = popEstados.find(e => e.value === pop.estado)
            return (
              <div key={pop.id} onClick={() => { setSelectedPop(pop); fetchPopLinhas(pop.id); fetchAdendas(pop.id) }}
                style={{ padding: '16px', background: colors.white, borderRadius: '12px', border: `1px solid ${selectedPop?.id === pop.id ? colors.primary : colors.border}`, cursor: 'pointer', transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>POP #{pop.numero}</div>
                    <div style={{ fontSize: '13px', color: colors.textMuted }}>{pop.cliente_nome || 'Cliente não definido'} • {formatDate(pop.data_envio)}</div>
                  </div>
                  <span style={{ padding: '4px 10px', background: `${estado?.color}15`, color: estado?.color, borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>{estado?.label}</span>
                </div>
                {pop.estado === 'contratada' && adendas.filter(a => a.pop_id === pop.id).length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}`, fontSize: '12px', color: colors.textMuted }}>
                    {adendas.filter(a => a.pop_id === pop.id).length} adenda(s)
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {selectedPop && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>
            Linhas da POP #{selectedPop.numero}
            {selectedPop.estado === 'contratada' && (
              <span style={{ marginLeft: '12px', padding: '4px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: '4px', fontSize: '11px' }}>
                <Lock size={12} style={{ marginRight: '4px' }} /> Contratada - Apenas adendas
              </span>
            )}
          </h3>
        </div>
      )}
    </div>
  )

  const renderComprasTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Compras da Obra</h2>
        <button onClick={() => setShowNewCompraModal(true)} className="btn btn-primary btn-sm">
          <Plus size={14} /> Nova Compra
        </button>
      </div>
      {compras.length === 0 ? (
        <div style={{ background: colors.white, borderRadius: '12px', padding: '48px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
          <ShoppingCart size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem Compras</h3>
          <p style={{ color: colors.textMuted }}>Registe as compras associadas a esta obra</p>
        </div>
      ) : (
        <div style={{ background: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.background }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Data</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Fornecedor</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Descrição</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Valor</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {compras.map(compra => (
                <tr key={compra.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{formatDate(compra.data_pedido)}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{compra.fornecedor || '-'}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{compra.descricao}</td>
                  <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>{formatCurrency(compra.valor)}</td>
                  <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: compra.estado === 'pago' ? '#D1FAE5' : compra.estado === 'recebido' ? '#DBEAFE' : '#FEF3C7',
                      color: compra.estado === 'pago' ? '#065F46' : compra.estado === 'recebido' ? '#1E40AF' : '#92400E'
                    }}>{compra.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderExecucaoTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Controlo de Execução</h2>
        <button onClick={() => { fetchPopLinhasDisponiveis(); setShowNewExecucaoModal(true) }} className="btn btn-primary btn-sm">
          <Plus size={14} /> Registar Execução
        </button>
      </div>
      {execucao.length === 0 ? (
        <div style={{ background: colors.white, borderRadius: '12px', padding: '48px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
          <TrendingUp size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem Registos de Execução</h3>
          <p style={{ color: colors.textMuted }}>Registe o progresso da execução dos trabalhos</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {execucao.map(reg => (
            <div key={reg.id} style={{ padding: '16px', background: colors.white, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{reg.descricao}</div>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>{formatDate(reg.data_registo)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '100px', height: '8px', background: colors.progressBg, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${reg.percentagem || 0}%`, height: '100%', background: colors.success, borderRadius: '4px' }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{reg.percentagem || 0}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAutosTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Autos de Medição</h2>
        <button onClick={createNewAuto} className="btn btn-primary btn-sm" disabled={saving}>
          <Plus size={14} /> Novo Auto
        </button>
      </div>
      {autos.length === 0 ? (
        <div style={{ background: colors.white, borderRadius: '12px', padding: '48px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
          <Receipt size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem Autos de Medição</h3>
          <p style={{ color: colors.textMuted }}>Crie autos para faturação mensal</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {autos.map(auto => (
            <div key={auto.id} onClick={() => { setSelectedAuto(auto); fetchAutoLinhas(auto.id) }}
              style={{ padding: '16px', background: colors.white, borderRadius: '12px', border: `1px solid ${selectedAuto?.id === auto.id ? colors.primary : colors.border}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Auto #{auto.numero}</div>
                  <div style={{ fontSize: '13px', color: colors.textMuted }}>{auto.mes_referencia} • {formatDate(auto.data_emissao)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: colors.text }}>{formatCurrency(auto.valor_total)}</div>
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: auto.estado === 'pago' ? '#D1FAE5' : auto.estado === 'emitido' ? '#DBEAFE' : '#FEF3C7',
                    color: auto.estado === 'pago' ? '#065F46' : auto.estado === 'emitido' ? '#1E40AF' : '#92400E'
                  }}>{auto.estado}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      {activeSubtab === 'mqt' && renderMqtTab()}
      {activeSubtab === 'orcamento' && renderOrcamentoTab()}
      {activeSubtab === 'pops' && renderPopsTab()}
      {activeSubtab === 'compras' && renderComprasTab()}
      {activeSubtab === 'execucao' && renderExecucaoTab()}
      {activeSubtab === 'autos' && renderAutosTab()}

      {/* Modal Nova Compra */}
      {showNewCompraModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => e.target === e.currentTarget && setShowNewCompraModal(false)}>
          <div style={{ background: colors.white, borderRadius: '16px', padding: '24px', width: '440px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 20px' }}>Nova Compra</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>Data da Compra</label>
                <input type="date" value={newCompraForm.data_compra} onChange={(e) => setNewCompraForm({ ...newCompraForm, data_compra: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>Descrição</label>
                <textarea value={newCompraForm.notas} onChange={(e) => setNewCompraForm({ ...newCompraForm, notas: e.target.value })} placeholder="Descreva a compra..." rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>Valor (€)</label>
                <input type="number" step="0.01" min="0" value={newCompraForm.preco_comprado_total} onChange={(e) => setNewCompraForm({ ...newCompraForm, preco_comprado_total: e.target.value })} placeholder="0.00"
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowNewCompraModal(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={createNewCompra} className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'A guardar...' : 'Criar Compra'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registar Execução */}
      {showNewExecucaoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => e.target === e.currentTarget && setShowNewExecucaoModal(false)}>
          <div style={{ background: colors.white, borderRadius: '16px', padding: '24px', width: '480px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 20px' }}>Registar Execução</h3>
            {popLinhasDisponiveis.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <AlertTriangle size={32} style={{ color: colors.warning, marginBottom: '12px' }} />
                <p style={{ color: colors.textMuted, margin: 0 }}>Sem POP contratada. Primeiro contrate uma POP para registar execução.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>Linha da POP</label>
                  <select value={newExecucaoForm.pop_linha_id} onChange={(e) => setNewExecucaoForm({ ...newExecucaoForm, pop_linha_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }}>
                    <option value="">Selecione uma linha...</option>
                    {popLinhasDisponiveis.map(pl => (<option key={pl.id} value={pl.id}>{pl.descricao} ({pl.unidade})</option>))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>Percentagem (%)</label>
                    <input type="number" step="0.01" min="0" max="100" value={newExecucaoForm.percentagem_execucao}
                      onChange={(e) => setNewExecucaoForm({ ...newExecucaoForm, percentagem_execucao: e.target.value })} placeholder="0"
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>Data</label>
                    <input type="date" value={newExecucaoForm.data_registo} onChange={(e) => setNewExecucaoForm({ ...newExecucaoForm, data_registo: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>Notas</label>
                  <textarea value={newExecucaoForm.notas} onChange={(e) => setNewExecucaoForm({ ...newExecucaoForm, notas: e.target.value })} placeholder="Observações..." rows={2}
                    style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowNewExecucaoModal(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              {popLinhasDisponiveis.length > 0 && (
                <button onClick={createExecucaoRegisto} className="btn btn-primary" style={{ flex: 1 }} disabled={saving || !newExecucaoForm.pop_linha_id}>
                  {saving ? 'A guardar...' : 'Registar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
