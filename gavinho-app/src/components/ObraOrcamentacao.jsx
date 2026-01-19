import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus, Upload, Download, FileSpreadsheet, Edit2, Trash2, Save, X, Check,
  ChevronDown, ChevronRight, Search, Filter, Euro, Calculator, FileText,
  Send, Clock, CheckCircle, AlertCircle, Package, Loader2, Eye, Copy
} from 'lucide-react'
import * as XLSX from 'xlsx'

const STATUS_PROPOSTA = {
  em_elaboracao: { label: 'Em Elaboração', color: '#78716c', bg: '#f5f5f4' },
  pendente: { label: 'Pendente', color: '#d97706', bg: '#fef3c7' },
  enviada_cliente: { label: 'Enviada', color: '#2563eb', bg: '#dbeafe' },
  adjudicada: { label: 'Adjudicada', color: '#16a34a', bg: '#dcfce7' },
  concluida: { label: 'Concluída', color: '#065f46', bg: '#d1fae5' }
}

const STATUS_COMPRA = {
  por_encomendar: { label: 'Por Encomendar', color: '#78716c' },
  encomendado: { label: 'Encomendado', color: '#d97706' },
  parcial: { label: 'Parcial', color: '#2563eb' },
  recebido: { label: 'Recebido', color: '#16a34a' },
  na: { label: 'N/A', color: '#a8a29e' }
}

const UNIDADES = ['un', 'm2', 'ml', 'm3', 'vg', 'dias', 'kg', 'sacos', 'cx', 'pç']

export default function ObraOrcamentacao({ obra, activeSubTab = 'custo' }) {
  const { profile } = useAuth()
  const fileInputRef = useRef(null)
  
  // Estados principais
  const [propostas, setPropostas] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subTab, setSubTab] = useState(activeSubTab)
  
  // Filtros
  const [filtros, setFiltros] = useState({
    proposta: '',
    area: '',
    search: '',
    status: ''
  })
  const [areasUnicas, setAreasUnicas] = useState([])
  
  // Modais
  const [showPropostaModal, setShowPropostaModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingProposta, setEditingProposta] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  
  // Forms
  const [propostaForm, setPropostaForm] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    status: 'em_elaboracao'
  })
  
  const [itemForm, setItemForm] = useState({
    proposta_id: '',
    ref: '',
    area: '',
    descricao: '',
    unidade: 'un',
    quantidade: 0,
    preco_custo_unit: 0,
    margem_k: 1.20
  })
  
  // Expandidos (para vista hierárquica)
  const [expandedPropostas, setExpandedPropostas] = useState({})
  const [expandedAreas, setExpandedAreas] = useState({})

  useEffect(() => {
    if (obra?.id) {
      loadData()
    }
  }, [obra?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar propostas
      const { data: propostasData, error: propError } = await supabase
        .from('obra_propostas')
        .select('*')
        .eq('obra_id', obra.id)
        .order('codigo')
      
      if (propError) throw propError
      setPropostas(propostasData || [])
      
      // Carregar items
      const { data: itemsData, error: itemsError } = await supabase
        .from('obra_orcamento_items')
        .select('*, proposta:obra_propostas(codigo, nome, status)')
        .eq('obra_id', obra.id)
        .order('ordem')
        .order('ref')
      
      if (itemsError) throw itemsError
      setItems(itemsData || [])
      
      // Extrair áreas únicas
      const areas = [...new Set((itemsData || []).map(i => i.area).filter(Boolean))]
      setAreasUnicas(areas.sort())
      
    } catch (err) {
      console.error('Erro ao carregar orçamentação:', err)
    } finally {
      setLoading(false)
    }
  }

  // ==================== PROPOSTAS ====================
  
  const handleSaveProposta = async () => {
    if (!propostaForm.codigo) {
      alert('Insira o código da proposta')
      return
    }
    
    setSaving(true)
    try {
      if (editingProposta) {
        const { error } = await supabase
          .from('obra_propostas')
          .update({
            codigo: propostaForm.codigo,
            nome: propostaForm.nome,
            descricao: propostaForm.descricao,
            status: propostaForm.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProposta.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('obra_propostas')
          .insert({
            obra_id: obra.id,
            codigo: propostaForm.codigo,
            nome: propostaForm.nome,
            descricao: propostaForm.descricao,
            status: propostaForm.status,
            created_by: profile?.id
          })
        
        if (error) throw error
      }
      
      setShowPropostaModal(false)
      setEditingProposta(null)
      setPropostaForm({ codigo: '', nome: '', descricao: '', status: 'em_elaboracao' })
      loadData()
    } catch (err) {
      alert(`Erro: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProposta = async (proposta) => {
    if (!confirm(`Eliminar proposta "${proposta.codigo}"? Os artigos associados perderão a ligação.`)) return
    
    try {
      await supabase.from('obra_propostas').delete().eq('id', proposta.id)
      loadData()
    } catch (err) {
      alert(`Erro: ${err.message}`)
    }
  }

  const openEditProposta = (proposta) => {
    setPropostaForm({
      codigo: proposta.codigo,
      nome: proposta.nome || '',
      descricao: proposta.descricao || '',
      status: proposta.status
    })
    setEditingProposta(proposta)
    setShowPropostaModal(true)
  }

  // ==================== ITEMS ====================
  
  const calcularPrecos = (item) => {
    const custTotal = (item.quantidade || 0) * (item.preco_custo_unit || 0)
    const vendaUnit = (item.preco_custo_unit || 0) * (item.margem_k || 1)
    const vendaTotal = (item.quantidade || 0) * vendaUnit
    return { custTotal, vendaUnit, vendaTotal }
  }

  const handleSaveItem = async () => {
    if (!itemForm.descricao) {
      alert('Insira a descrição do artigo')
      return
    }
    
    const precos = calcularPrecos(itemForm)
    
    setSaving(true)
    try {
      const itemData = {
        obra_id: obra.id,
        proposta_id: itemForm.proposta_id || null,
        ref: itemForm.ref,
        area: itemForm.area,
        descricao: itemForm.descricao,
        unidade: itemForm.unidade,
        quantidade: parseFloat(itemForm.quantidade) || 0,
        preco_custo_unit: parseFloat(itemForm.preco_custo_unit) || 0,
        preco_custo_total: precos.custTotal,
        margem_k: parseFloat(itemForm.margem_k) || 1.20,
        preco_venda_unit: precos.vendaUnit,
        preco_venda_total: precos.vendaTotal,
        updated_at: new Date().toISOString()
      }
      
      if (editingItem) {
        const { error } = await supabase
          .from('obra_orcamento_items')
          .update(itemData)
          .eq('id', editingItem.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('obra_orcamento_items')
          .insert(itemData)
        
        if (error) throw error
      }
      
      setShowItemModal(false)
      setEditingItem(null)
      resetItemForm()
      loadData()
    } catch (err) {
      alert(`Erro: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const resetItemForm = () => {
    setItemForm({
      proposta_id: '',
      ref: '',
      area: '',
      descricao: '',
      unidade: 'un',
      quantidade: 0,
      preco_custo_unit: 0,
      margem_k: 1.20
    })
  }

  const openEditItem = (item) => {
    setItemForm({
      proposta_id: item.proposta_id || '',
      ref: item.ref || '',
      area: item.area || '',
      descricao: item.descricao,
      unidade: item.unidade || 'un',
      quantidade: item.quantidade || 0,
      preco_custo_unit: item.preco_custo_unit || 0,
      margem_k: item.margem_k || 1.20
    })
    setEditingItem(item)
    setShowItemModal(true)
  }

  const handleDeleteItem = async (item) => {
    if (!confirm(`Eliminar artigo "${item.descricao}"?`)) return
    
    try {
      await supabase.from('obra_orcamento_items').delete().eq('id', item.id)
      loadData()
    } catch (err) {
      alert(`Erro: ${err.message}`)
    }
  }

  // Marcar como eliminado (para nota de crédito)
  const handleMarcarEliminado = async (item) => {
    const motivo = prompt('Motivo da eliminação (para nota de crédito):')
    if (motivo === null) return
    
    try {
      await supabase
        .from('obra_orcamento_items')
        .update({
          status: 'eliminado',
          eliminado_em: new Date().toISOString().split('T')[0],
          motivo_eliminacao: motivo
        })
        .eq('id', item.id)
      
      loadData()
    } catch (err) {
      alert(`Erro: ${err.message}`)
    }
  }

  // Atualizar margem inline
  const handleUpdateMargem = async (item, novaMargem) => {
    const k = parseFloat(novaMargem)
    if (isNaN(k) || k <= 0) return
    
    const vendaUnit = (item.preco_custo_unit || 0) * k
    const vendaTotal = (item.quantidade || 0) * vendaUnit
    
    try {
      await supabase
        .from('obra_orcamento_items')
        .update({
          margem_k: k,
          preco_venda_unit: vendaUnit,
          preco_venda_total: vendaTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
      
      loadData()
    } catch (err) {
      console.error('Erro ao atualizar margem:', err)
    }
  }

  // ==================== IMPORTAÀ‡ÀƒO EXCEL ====================
  
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]] || workbook.Sheets[workbook.SheetNames[1]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
      
      // Encontrar header (linha com "Proposta" ou "Ref.")
      let headerIndex = 0
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i]
        if (row && (String(row[1] || '').includes('Proposta') || String(row[2] || '').includes('Ref'))) {
          headerIndex = i
          break
        }
      }
      
      // Filtrar linhas válidas (com proposta na coluna 1)
      const dataRows = rows.slice(headerIndex + 1).filter(row => {
        if (!row || row.length < 4) return false
        const proposta = row[1]
        // Ignorar linhas de seção (sem proposta ou com título de seção)
        if (!proposta || proposta === '' || proposta === null) return false
        return true
      })
      
      // Mapear propostas únicas (coluna 1)
      const propostasUnicas = [...new Set(dataRows.map(r => String(r[1] || '').trim()).filter(Boolean))]
      
      console.log('Propostas encontradas:', propostasUnicas)
      
      // Criar propostas que não existem
      for (const codigo of propostasUnicas) {
        const existe = propostas.find(p => p.codigo === codigo)
        if (!existe) {
          await supabase.from('obra_propostas').insert({
            obra_id: obra.id,
            codigo: codigo,
            nome: codigo,
            status: 'adjudicada',
            created_by: profile?.id
          })
        }
      }
      
      // Recarregar propostas
      const { data: novasPropostas } = await supabase
        .from('obra_propostas')
        .select('*')
        .eq('obra_id', obra.id)
      
      // Inserir items com colunas corretas:
      // 0: Àrea, 1: Proposta, 2: Ref, 3: Descrição, 4: UN, 5: Quant, 6: P.Unit, 7: P.Total
      const itemsToInsert = dataRows.map((row, idx) => {
        const propostaCodigo = String(row[1] || '').trim()
        const proposta = novasPropostas?.find(p => p.codigo === propostaCodigo)
        
        const quantidade = parseFloat(row[5]) || 0
        const precoUnit = parseFloat(row[6]) || 0
        const precoTotal = parseFloat(row[7]) || quantidade * precoUnit
        
        return {
          obra_id: obra.id,
          proposta_id: proposta?.id || null,
          area: String(row[0] || '').trim(),
          ref: String(row[2] || '').trim(),
          descricao: String(row[3] || '').trim() || 'Sem descrição',
          unidade: String(row[4] || 'un').trim().toLowerCase(),
          quantidade: quantidade,
          preco_custo_unit: precoUnit,
          preco_custo_total: precoTotal,
          margem_k: 1.20,
          preco_venda_unit: precoUnit * 1.20,
          preco_venda_total: precoTotal * 1.20,
          ordem: idx
        }
      }).filter(item => item.descricao && item.descricao !== 'Sem descrição')
      
      // Inserir em batches
      const batchSize = 100
      for (let i = 0; i < itemsToInsert.length; i += batchSize) {
        const batch = itemsToInsert.slice(i, i + batchSize)
        await supabase.from('obra_orcamento_items').insert(batch)
      }
      
      alert(`Importados ${itemsToInsert.length} artigos de ${propostasUnicas.length} propostas`)
      loadData()
      
    } catch (err) {
      console.error('Erro na importação:', err)
      alert(`Erro na importação: ${err.message}`)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ==================== EXPORTAÀ‡ÀƒO ====================
  
  const exportarPropostaExcel = (proposta) => {
    const propostaItems = items.filter(i => i.proposta_id === proposta.id && i.status === 'ativo')
    
    const data = propostaItems.map(item => ({
      'Ref.': item.ref,
      'Àrea': item.area,
      'Descrição': item.descricao,
      'UN': item.unidade,
      'Quant.': item.quantidade,
      'P. Unit. â‚¬': item.preco_venda_unit?.toFixed(2),
      'P. Total â‚¬': item.preco_venda_total?.toFixed(2)
    }))
    
    // Adicionar total
    const total = propostaItems.reduce((sum, i) => sum + (i.preco_venda_total || 0), 0)
    data.push({
      'Ref.': '',
      'Àrea': '',
      'Descrição': 'TOTAL',
      'UN': '',
      'Quant.': '',
      'P. Unit. â‚¬': '',
      'P. Total â‚¬': total.toFixed(2)
    })
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, proposta.codigo)
    XLSX.writeFile(wb, `${obra.codigo}_${proposta.codigo}_proposta.xlsx`)
  }

  // ==================== FILTROS ====================
  
  const itemsFiltrados = items.filter(item => {
    if (filtros.proposta && item.proposta_id !== filtros.proposta) return false
    if (filtros.area && item.area !== filtros.area) return false
    if (filtros.status && item.status !== filtros.status) return false
    if (filtros.search) {
      const search = filtros.search.toLowerCase()
      if (!item.descricao?.toLowerCase().includes(search) && 
          !item.ref?.toLowerCase().includes(search)) return false
    }
    return true
  })

  // ==================== CÀLCULOS ====================
  
  const calcularTotais = (itemsList) => {
    const ativos = itemsList.filter(i => i.status === 'ativo')
    return {
      totalCusto: ativos.reduce((sum, i) => sum + (i.preco_custo_total || 0), 0),
      totalVenda: ativos.reduce((sum, i) => sum + (i.preco_venda_total || 0), 0),
      totalArtigos: ativos.length,
      margemMedia: ativos.length > 0 
        ? ativos.reduce((sum, i) => sum + (i.margem_k || 1), 0) / ativos.length 
        : 1
    }
  }

  // Totais GERAIS (para KPIs - todos os items)
  const totaisGerais = calcularTotais(items)
  const margemPercentagem = ((totaisGerais.margemMedia - 1) * 100).toFixed(1)
  
  // Totais FILTRADOS (para tabela)
  const totaisFiltrados = calcularTotais(itemsFiltrados)

  // ==================== RENDER ====================
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        marginBottom: '20px',
        background: 'var(--stone)',
        padding: '4px',
        borderRadius: '10px',
        width: 'fit-content'
      }}>
        {[
          { id: 'custo', label: 'Orçamentação Custo', icon: Calculator },
          { id: 'proposta', label: 'Proposta Cliente', icon: Euro },
          { id: 'compras', label: 'Controlo Compras', icon: Package }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              background: subTab === tab.id ? 'white' : 'transparent',
              color: subTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              fontWeight: subTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>
            {totaisGerais.totalArtigos}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Artigos</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--info)' }}>
            {totaisGerais.totalCusto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Total Custo</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>
            {totaisGerais.totalVenda.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Total Venda</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warning)' }}>
            {margemPercentagem}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Margem Média</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={filtros.search}
                onChange={e => setFiltros({ ...filtros, search: e.target.value })}
                style={{ padding: '8px 8px 8px 32px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '13px', width: '200px' }}
              />
            </div>
            <select
              value={filtros.proposta}
              onChange={e => setFiltros({ ...filtros, proposta: e.target.value })}
              style={{ padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '13px' }}
            >
              <option value="">Todas Propostas</option>
              {propostas.map(p => (
                <option key={p.id} value={p.id}>{p.nome && p.nome !== p.codigo ? `${p.codigo} - ${p.nome}` : p.codigo}</option>
              ))}
            </select>
            <select
              value={filtros.area}
              onChange={e => setFiltros({ ...filtros, area: e.target.value })}
              style={{ padding: '8px 12px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '13px' }}
            >
              <option value="">Todas Àreas</option>
              {areasUnicas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          
          {/* Ações */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={16} /> Importar Excel
            </button>
            <button
              onClick={() => { setEditingProposta(null); setPropostaForm({ codigo: '', nome: '', descricao: '', status: 'em_elaboracao' }); setShowPropostaModal(true) }}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={16} /> Nova Proposta
            </button>
            <button
              onClick={() => { setEditingItem(null); resetItemForm(); setShowItemModal(true) }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Novo Artigo
            </button>
          </div>
        </div>
      </div>

      {/* Propostas Summary - Compacto */}
      {propostas.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)' }}>
              Propostas ({propostas.length})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {propostas.map(p => {
              const pItems = items.filter(i => i.proposta_id === p.id && i.status === 'ativo')
              const pTotal = pItems.reduce((sum, i) => sum + (i.preco_venda_total || 0), 0)
              const statusConf = STATUS_PROPOSTA[p.status] || STATUS_PROPOSTA.em_elaboracao
              const isSelected = filtros.proposta === p.id
              
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    background: isSelected ? statusConf.bg : 'white',
                    border: `1px solid ${isSelected ? statusConf.color : 'var(--stone)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => setFiltros({ ...filtros, proposta: isSelected ? '' : p.id })}
                >
                  <span style={{ fontWeight: 600 }}>{p.codigo}</span>
                  <span style={{ color: 'var(--brown-light)' }}>({pItems.length})</span>
                  <span style={{ fontWeight: 500, color: 'var(--success)' }}>
                    {(pTotal / 1000).toFixed(0)}kâ‚¬
                  </span>
                  <span style={{ 
                    padding: '1px 6px', 
                    borderRadius: '8px', 
                    fontSize: '9px', 
                    fontWeight: 600,
                    background: statusConf.bg,
                    color: statusConf.color
                  }}>
                    {p.status === 'adjudicada' ? 'ADJ' : p.status === 'em_elaboracao' ? 'ELAB' : statusConf.label.slice(0,3).toUpperCase()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditProposta(p) }}
                    style={{ padding: '2px', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5 }}
                  >
                    <Edit2 size={10} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportarPropostaExcel(p) }}
                    style={{ padding: '2px', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5 }}
                  >
                    <Download size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabela de Items */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--cream)', borderBottom: '2px solid var(--stone)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '80px' }}>Proposta</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '60px' }}>Ref.</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '120px' }}>Àrea</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Descrição</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: '40px' }}>UN</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '60px' }}>Quant.</th>
              {subTab === 'custo' && (
                <>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '80px' }}>P.Unit Custo</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '90px' }}>Total Custo</th>
                </>
              )}
              {subTab === 'proposta' && (
                <>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: '60px' }}>K</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '80px' }}>P.Unit Venda</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, width: '90px' }}>Total Venda</th>
                </>
              )}
              {subTab === 'compras' && (
                <>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: '100px' }}>Estado</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '150px' }}>Fornecedor</th>
                </>
              )}
              <th style={{ padding: '10px 8px', width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {itemsFiltrados.length === 0 ? (
              <tr>
                <td colSpan={subTab === 'custo' ? 9 : 10} style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
                  {items.length === 0 ? 'Sem artigos. Importe um Excel ou adicione manualmente.' : 'Nenhum artigo corresponde aos filtros.'}
                </td>
              </tr>
            ) : itemsFiltrados.map(item => {
              const isEliminado = item.status === 'eliminado'
              return (
                <tr 
                  key={item.id} 
                  style={{ 
                    borderBottom: '1px solid var(--stone)',
                    background: isEliminado ? '#fee2e2' : 'white',
                    opacity: isEliminado ? 0.6 : 1
                  }}
                >
                  <td style={{ padding: '10px 12px', fontSize: '11px' }}>
                    <span style={{ 
                      padding: '2px 6px', 
                      background: 'var(--stone)', 
                      borderRadius: '4px',
                      fontWeight: 500
                    }}>
                      {item.proposta?.codigo || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brown-light)' }}>
                    {item.ref || '-'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--brown-light)' }}>
                    {item.area || '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {item.descricao}
                    {isEliminado && (
                      <span style={{ marginLeft: '8px', color: '#dc2626', fontSize: '10px' }}>
                        (ELIMINADO)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--brown-light)' }}>
                    {item.unidade}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {item.quantidade?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                  </td>
                  
                  {subTab === 'custo' && (
                    <>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {item.preco_custo_unit?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {item.preco_custo_total?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
                      </td>
                    </>
                  )}
                  
                  {subTab === 'proposta' && (
                    <>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={item.margem_k || 1.20}
                          onChange={(e) => handleUpdateMargem(item, e.target.value)}
                          step="0.01"
                          min="1"
                          style={{ 
                            width: '50px', 
                            padding: '4px', 
                            textAlign: 'center',
                            border: '1px solid var(--stone)',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {item.preco_venda_unit?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                        {item.preco_venda_total?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
                      </td>
                    </>
                  )}
                  
                  {subTab === 'compras' && (
                    <>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <select
                          value={item.estado_compra || 'por_encomendar'}
                          onChange={async (e) => {
                            await supabase.from('obra_orcamento_items').update({ estado_compra: e.target.value }).eq('id', item.id)
                            loadData()
                          }}
                          style={{ 
                            padding: '4px 8px', 
                            border: '1px solid var(--stone)', 
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: STATUS_COMPRA[item.estado_compra]?.color || '#78716c'
                          }}
                        >
                          {Object.entries(STATUS_COMPRA).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <input
                          type="text"
                          value={item.fornecedor || ''}
                          onChange={async (e) => {
                            await supabase.from('obra_orcamento_items').update({ fornecedor: e.target.value }).eq('id', item.id)
                          }}
                          onBlur={loadData}
                          placeholder="Fornecedor..."
                          style={{ 
                            width: '100%', 
                            padding: '4px 8px', 
                            border: '1px solid var(--stone)', 
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        />
                      </td>
                    </>
                  )}
                  
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        onClick={() => openEditItem(item)}
                        style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      {!isEliminado && item.proposta?.status === 'adjudicada' ? (
                        <button
                          onClick={() => handleMarcarEliminado(item)}
                          title="Marcar como eliminado (nota de crédito)"
                          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#d97706' }}
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteItem(item)}
                          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {itemsFiltrados.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--cream)', borderTop: '2px solid var(--stone)', fontWeight: 600 }}>
                <td colSpan={6} style={{ padding: '12px', textAlign: 'right' }}>
                  TOTAL ({itemsFiltrados.filter(i => i.status === 'ativo').length} artigos)
                </td>
                {subTab === 'custo' && (
                  <>
                    <td style={{ padding: '12px', textAlign: 'right' }}></td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                      {totaisFiltrados.totalCusto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
                    </td>
                  </>
                )}
                {subTab === 'proposta' && (
                  <>
                    <td style={{ padding: '12px', textAlign: 'center' }}></td>
                    <td style={{ padding: '12px', textAlign: 'right' }}></td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: 'var(--success)' }}>
                      {totaisFiltrados.totalVenda.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬
                    </td>
                  </>
                )}
                {subTab === 'compras' && (
                  <>
                    <td colSpan={2}></td>
                  </>
                )}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal Nova/Editar Proposta */}
      {showPropostaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowPropostaModal(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '450px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {editingProposta ? 'Editar Proposta' : 'Nova Proposta'}
              </h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Código *</label>
                <input
                  type="text"
                  value={propostaForm.codigo}
                  onChange={e => setPropostaForm({ ...propostaForm, codigo: e.target.value })}
                  placeholder="POP.001, Ad.10..."
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nome</label>
                <input
                  type="text"
                  value={propostaForm.nome}
                  onChange={e => setPropostaForm({ ...propostaForm, nome: e.target.value })}
                  placeholder="Proposta Cozinha, Adenda Extras..."
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Estado</label>
                <select
                  value={propostaForm.status}
                  onChange={e => setPropostaForm({ ...propostaForm, status: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}
                >
                  {Object.entries(STATUS_PROPOSTA).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição</label>
                <textarea
                  value={propostaForm.descricao}
                  onChange={e => setPropostaForm({ ...propostaForm, descricao: e.target.value })}
                  rows={3}
                  placeholder="Notas sobre esta proposta..."
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-outline" onClick={() => setShowPropostaModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveProposta} disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {editingProposta ? 'Guardar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar Item */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemModal(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '550px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {editingItem ? 'Editar Artigo' : 'Novo Artigo'}
              </h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Proposta</label>
                  <select
                    value={itemForm.proposta_id}
                    onChange={e => setItemForm({ ...itemForm, proposta_id: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}
                  >
                    <option value="">Sem proposta</option>
                    {propostas.map(p => (
                      <option key={p.id} value={p.id}>{p.codigo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Referência</label>
                  <input
                    type="text"
                    value={itemForm.ref}
                    onChange={e => setItemForm({ ...itemForm, ref: e.target.value })}
                    placeholder="1.1.1"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Àrea/Piso</label>
                <input
                  type="text"
                  value={itemForm.area}
                  onChange={e => setItemForm({ ...itemForm, area: e.target.value })}
                  placeholder="Piso 0 - Cozinha"
                  list="areas-list"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                />
                <datalist id="areas-list">
                  {areasUnicas.map(a => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição *</label>
                <textarea
                  value={itemForm.descricao}
                  onChange={e => setItemForm({ ...itemForm, descricao: e.target.value })}
                  rows={2}
                  placeholder="Descrição do artigo..."
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Unidade</label>
                  <select
                    value={itemForm.unidade}
                    onChange={e => setItemForm({ ...itemForm, unidade: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Quantidade</label>
                  <input
                    type="number"
                    value={itemForm.quantidade}
                    onChange={e => setItemForm({ ...itemForm, quantidade: e.target.value })}
                    step="0.01"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>P. Unit. Custo (â‚¬)</label>
                  <input
                    type="number"
                    value={itemForm.preco_custo_unit}
                    onChange={e => setItemForm({ ...itemForm, preco_custo_unit: e.target.value })}
                    step="0.01"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Margem K</label>
                  <input
                    type="number"
                    value={itemForm.margem_k}
                    onChange={e => setItemForm({ ...itemForm, margem_k: e.target.value })}
                    step="0.01"
                    min="1"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px' }}>
                    K=1.20 = 20% margem
                  </div>
                </div>
                <div style={{ background: 'var(--cream)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>Preço Venda Calculado</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>
                    {(() => {
                      const precos = calcularPrecos(itemForm)
                      return `${precos.vendaTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} â‚¬`
                    })()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                    ({((itemForm.preco_custo_unit || 0) * (itemForm.margem_k || 1)).toFixed(2)} â‚¬/un)
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-outline" onClick={() => setShowItemModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveItem} disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {editingItem ? 'Guardar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
