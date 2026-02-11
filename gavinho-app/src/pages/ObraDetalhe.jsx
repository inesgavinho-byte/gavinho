import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Plus, Trash2, Lock, Copy, X,
  FileText, Calculator, Receipt, ShoppingCart,
  TrendingUp, ClipboardList, MapPin, Users,
  AlertTriangle, Camera, BookOpen, Upload,
  Shield, Truck, Grid3X3, BarChart3, MessageSquare, Loader2,
  ChevronDown, Edit, Send, FileCheck, CheckSquare
} from 'lucide-react'
import ObraChat from '../components/ObraChat'
import ObraChecklist from '../components/ObraChecklist'
import ObraFotografias from '../components/ObraFotografias'
import ObraRelatorios from '../components/ObraRelatorios'
import ObraNaoConformidades from '../components/ObraNaoConformidades'
import { useToast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'

// ============================================
// CONFIGURAÇÃO DAS TABS PRINCIPAIS
// ============================================
const mainTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'tracking', label: 'Tracking', icon: ClipboardList, hasSubtabs: true },
  { id: 'acompanhamento', label: 'Acompanhamento', icon: Camera, hasSubtabs: true },
  { id: 'fiscalizacao', label: 'Fiscalização', icon: Shield, hasSubtabs: true },
  { id: 'equipas', label: 'Equipas', icon: Users, hasSubtabs: true },
  { id: 'projeto', label: 'Projeto', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
]

// Sub-tabs do Tracking (MQT → Orçamento → POPs → Compras → Execução → Autos)
const trackingSubtabs = [
  { id: 'mqt', label: 'MQT', icon: ClipboardList },
  { id: 'orcamento', label: 'Orçamento', icon: Calculator },
  { id: 'pops', label: 'POPs', icon: FileText },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'execucao', label: 'Execução', icon: TrendingUp },
  { id: 'autos', label: 'Autos', icon: Receipt },
]

// Sub-tabs de Acompanhamento
const acompanhamentoSubtabs = [
  { id: 'fotografias', label: 'Fotografias', icon: Camera },
  { id: 'diario', label: 'Diário de Obra', icon: BookOpen },
  { id: 'relatorios', label: 'Relatórios', icon: FileText },
  { id: 'nao-conformidades', label: 'Não Conformidades', icon: AlertTriangle },
]

// Sub-tabs de Fiscalização
const fiscalizacaoSubtabs = [
  { id: 'hso', label: 'HSO', icon: Shield },
  { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
]

// Sub-tabs de Equipas
const equipasSubtabs = [
  { id: 'equipa', label: 'Equipa Gavinho', icon: Users },
  { id: 'subempreiteiros', label: 'SubEmpreiteiros', icon: Truck },
  { id: 'zonas', label: 'Zonas', icon: Grid3X3 },
]

// Unidades disponíveis
const unidades = ['m²', 'm³', 'ml', 'un', 'vg', 'kg', 'ton', 'dia', 'hora', 'conj', 'pç']

// Estados do POP
const popEstados = [
  { value: 'rascunho', label: 'Rascunho', color: '#6B7280' },
  { value: 'enviada', label: 'Enviada', color: '#F59E0B' },
  { value: 'contratada', label: 'Contratada', color: '#10B981' },
  { value: 'recusada', label: 'Recusada', color: '#EF4444' },
]

// Cores do design
const colors = {
  primary: '#5C4B3A',
  text: '#3D3326',
  textMuted: '#8B7355',
  background: '#F5F3EF',
  white: '#FFFFFF',
  border: '#E8E4DC',
  success: '#6B8F5E',
  warning: '#F5A623',
  error: '#DC2626',
  progressBg: '#E8E4DC',
}

export default function ObraDetalhe() {
  const { id, tab: urlTab } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  // Estados principais
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeMainTab, setActiveMainTab] = useState('tracking')
  const [activeTrackingSubtab, setActiveTrackingSubtab] = useState('mqt')
  const [activeAcompanhamentoSubtab, setActiveAcompanhamentoSubtab] = useState('fotografias')
  const [activeFiscalizacaoSubtab, setActiveFiscalizacaoSubtab] = useState('hso')
  const [activeEquipasSubtab, setActiveEquipasSubtab] = useState('equipa')
  const [saving, setSaving] = useState(false)
  const [tabLoading, setTabLoading] = useState(false)
  const [checklistCount, setChecklistCount] = useState(0)
  const [showChecklist, setShowChecklist] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  // Estados MQT
  const [mqtVersoes, setMqtVersoes] = useState([])
  const [selectedMqtVersao, setSelectedMqtVersao] = useState(null)
  const [mqtLinhas, setMqtLinhas] = useState([])
  const [editingCell, setEditingCell] = useState(null)
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

  // Refs para edição inline
  const cellInputRef = useRef(null)

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
    if (id) fetchObra()
    fetchCurrentUser()
  }, [id])

  useEffect(() => {
    if (obra?.id) {
      fetchChecklistCount()
    }
  }, [obra?.id])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUser(profile || { id: user.id, email: user.email, nome: user.email?.split('@')[0] })
    }
  }

  const fetchChecklistCount = async () => {
    const { count } = await supabase
      .from('checklist_items')
      .select('*', { count: 'exact', head: true })
      .eq('obra_id', obra.id)
      .eq('estado', 'aberto')
    setChecklistCount(count || 0)
  }

  useEffect(() => {
    if (urlTab) {
      // Check if urlTab is a main tab or a subtab
      const isMainTab = mainTabs.some(t => t.id === urlTab)
      const isTrackingSubtab = trackingSubtabs.some(t => t.id === urlTab)

      if (isMainTab) {
        setActiveMainTab(urlTab)
      } else if (isTrackingSubtab) {
        setActiveMainTab('tracking')
        setActiveTrackingSubtab(urlTab)
      }
    }
  }, [urlTab])

  useEffect(() => {
    if (obra?.id) {
      loadTabData()
    }
  }, [obra?.id, activeMainTab, activeTrackingSubtab])

  // ============================================
  // FUNÇÕES DE FETCH
  // ============================================

  const fetchObra = async () => {
    try {
      // Support both UUID (obra.id) and codigo in the URL
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const column = isUuid ? 'id' : 'codigo'
      const { data, error } = await supabase
        .from('obras')
        .select('*, projetos(id, codigo, nome, cliente_nome)')
        .eq(column, id)
        .single()

      if (error) throw error
      setObra(data)
    } catch (err) {
      console.error('Erro ao carregar obra:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTabData = async () => {
    setTabLoading(true)
    try {
      if (activeMainTab === 'tracking') {
        switch (activeTrackingSubtab) {
          case 'mqt':
            await fetchMqtVersoes()
            break
          case 'orcamento':
            await fetchOrcamentos()
            break
          case 'pops':
            await fetchPops()
            break
          case 'compras':
            await fetchCompras()
            break
          case 'execucao':
            await fetchExecucao()
            break
          case 'autos':
            await fetchAutos()
            break
        }
      }
    } finally {
      setTabLoading(false)
    }
  }

  // MQT Fetches
  const fetchMqtVersoes = async () => {
    try {
      const { data, error } = await supabase
        .from('mqt_versoes')
        .select('*')
        .eq('obra_id', obra.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMqtVersoes(data || [])

      // Select active version or first
      const activeVersion = data?.find(v => v.is_ativa) || data?.[0]
      if (activeVersion && (!selectedMqtVersao || selectedMqtVersao.id !== activeVersion.id)) {
        setSelectedMqtVersao(activeVersion)
        await fetchMqtLinhas(activeVersion.id)
      }
    } catch (err) {
      console.error('Erro ao carregar versões MQT:', err)
    }
  }

  const fetchMqtLinhas = async (versaoId) => {
    try {
      const { data, error } = await supabase
        .from('mqt_linhas')
        .select('*')
        .eq('mqt_versao_id', versaoId)
        .order('ordem')

      if (error) throw error
      setMqtLinhas(data || [])
    } catch (err) {
      console.error('Erro ao carregar linhas MQT:', err)
    }
  }

  // Orçamento Fetches
  const fetchOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos_internos')
        .select('*, mqt_versoes(versao, is_ativa)')
        .eq('obra_id', obra.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map(o => ({
        ...o,
        versao: o.mqt_versoes?.versao,
        is_ativo: o.mqt_versoes?.is_ativa
      }))
      setOrcamentos(mapped)

      const active = mapped.find(o => o.is_ativo) || mapped[0]
      if (active && (!selectedOrcamento || selectedOrcamento.id !== active.id)) {
        setSelectedOrcamento(active)
        await fetchOrcamentoLinhas(active.id)
      }
    } catch (err) {
      console.error('Erro ao carregar orçamentos:', err)
    }
  }

  const fetchOrcamentoLinhas = async (orcamentoId) => {
    try {
      const { data, error } = await supabase
        .from('orcamento_linhas')
        .select('*, mqt_linhas(ordem, capitulo, referencia, tipo_subtipo, zona, descricao, unidade, quantidade)')
        .eq('orcamento_id', orcamentoId)

      if (error) throw error

      const mapped = (data || []).map(l => ({
        ...l,
        ordem: l.mqt_linhas?.ordem || 0,
        capitulo: l.mqt_linhas?.capitulo,
        referencia: l.mqt_linhas?.referencia,
        descricao: l.mqt_linhas?.descricao,
        unidade: l.mqt_linhas?.unidade,
        quantidade: l.mqt_linhas?.quantidade || 0,
        custo_unitario: l.preco_custo_unitario,
        preco_venda: l.preco_custo_unitario * 1.25
      }))
      mapped.sort((a, b) => a.ordem - b.ordem)
      setOrcamentoLinhas(mapped)
    } catch (err) {
      console.error('Erro ao carregar linhas orçamento:', err)
    }
  }

  // POPs Fetches
  const fetchPops = async () => {
    try {
      const { data, error } = await supabase
        .from('pops')
        .select('*')
        .eq('obra_id', obra.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPops(data || [])

      if (data?.[0] && (!selectedPop || selectedPop.id !== data[0].id)) {
        setSelectedPop(data[0])
        await fetchPopLinhas(data[0].id)
        await fetchAdendas(data[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar POPs:', err)
    }
  }

  const fetchPopLinhas = async (popId) => {
    try {
      const { data, error } = await supabase
        .from('pop_linhas')
        .select('*')
        .eq('pop_id', popId)
        .order('ordem')

      if (error) throw error
      setPopLinhas(data || [])
    } catch (err) {
      console.error('Erro ao carregar linhas POP:', err)
    }
  }

  const fetchAdendas = async (popId) => {
    try {
      const { data, error } = await supabase
        .from('adendas')
        .select('*, adenda_linhas(*)')
        .eq('pop_id', popId)
        .order('numero')

      if (error) throw error
      setAdendas(data || [])
    } catch (err) {
      console.error('Erro ao carregar adendas:', err)
    }
  }

  // Compras Fetches
  const fetchCompras = async () => {
    try {
      const { data, error } = await supabase
        .from('obras_compras')
        .select('*, fornecedores(nome)')
        .eq('obra_id', obra.id)
        .order('data_compra', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map(c => ({
        ...c,
        data_pedido: c.data_compra,
        fornecedor: c.fornecedores?.nome || '-',
        descricao: c.notas || '-',
        valor: c.preco_comprado_total,
        estado: 'registado'
      }))
      setCompras(mapped)
    } catch (err) {
      console.error('Erro ao carregar compras:', err)
    }
  }

  // Execução Fetches
  const fetchExecucao = async () => {
    try {
      const { data, error } = await supabase
        .from('obras_execucao')
        .select('*, pop_linhas(orcamento_linha_id, orcamento_linhas:orcamento_linha_id(mqt_linha_id, mqt_linhas:mqt_linha_id(descricao)))')
        .eq('obra_id', obra.id)
        .order('data_registo', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map(r => ({
        ...r,
        descricao: r.pop_linhas?.orcamento_linhas?.mqt_linhas?.descricao || r.notas || '-',
        percentagem: r.percentagem_execucao
      }))
      setExecucao(mapped)
    } catch (err) {
      console.error('Erro ao carregar execução:', err)
    }
  }

  // Fetch POP linhas contratadas (para execução e autos)
  const fetchPopLinhasDisponiveis = async () => {
    try {
      const { data, error } = await supabase
        .from('pop_linhas')
        .select('*, pops!inner(estado, obra_id), orcamento_linhas:orcamento_linha_id(mqt_linha_id, mqt_linhas:mqt_linha_id(descricao, unidade, quantidade))')
        .eq('pops.obra_id', obra.id)
        .eq('pops.estado', 'contratada')

      if (error) throw error
      setPopLinhasDisponiveis((data || []).map(pl => ({
        ...pl,
        descricao: pl.orcamento_linhas?.mqt_linhas?.descricao || `Linha ${pl.id.slice(0, 8)}`,
        unidade: pl.orcamento_linhas?.mqt_linhas?.unidade,
        quantidade: pl.orcamento_linhas?.mqt_linhas?.quantidade
      })))
    } catch (err) {
      console.error('Erro ao carregar POP linhas:', err)
    }
  }

  // Autos Fetches
  const fetchAutos = async () => {
    try {
      const { data, error } = await supabase
        .from('autos')
        .select('*')
        .eq('obra_id', obra.id)
        .order('numero', { ascending: false })

      if (error) throw error
      setAutos(data || [])

      if (data?.[0] && (!selectedAuto || selectedAuto.id !== data[0].id)) {
        setSelectedAuto(data[0])
        await fetchAutoLinhas(data[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar autos:', err)
    }
  }

  const fetchAutoLinhas = async (autoId) => {
    try {
      const { data, error } = await supabase
        .from('auto_linhas')
        .select('*')
        .eq('auto_id', autoId)
        .order('ordem')

      if (error) throw error
      setAutoLinhas(data || [])
    } catch (err) {
      console.error('Erro ao carregar linhas auto:', err)
    }
  }

  // ============================================
  // FUNÇÕES MQT
  // ============================================

  const createNewMqtVersion = async (copyFrom = null) => {
    try {
      setSaving(true)

      // Determine next version number
      const existingVersions = mqtVersoes.map(v => parseFloat(v.versao.replace('v', '')))
      const maxVersion = existingVersions.length > 0 ? Math.max(...existingVersions) : 0
      const newVersionNum = copyFrom ? (maxVersion + 0.1).toFixed(1) : '1.0'
      const newVersionId = `${obra.id}_mqt_v${newVersionNum}`

      // Create new version
      const { error: versionError } = await supabase
        .from('mqt_versoes')
        .insert({
          id: newVersionId,
          obra_id: obra.id,
          versao: `v${newVersionNum}`,
          is_ativa: true,
          is_congelada: false,
          notas: copyFrom ? `Copiado de ${copyFrom.versao}` : 'Nova versão'
        })

      if (versionError) throw versionError

      // Mark other versions as not active
      await supabase
        .from('mqt_versoes')
        .update({ is_ativa: false })
        .eq('obra_id', obra.id)
        .neq('id', newVersionId)

      // Copy lines if copying from existing version
      if (copyFrom) {
        const { data: sourceLines } = await supabase
          .from('mqt_linhas')
          .select('*')
          .eq('mqt_versao_id', copyFrom.id)
          .order('ordem')

        if (sourceLines?.length > 0) {
          const newLines = sourceLines.map(line => ({
            mqt_versao_id: newVersionId,
            ordem: line.ordem,
            capitulo: line.capitulo,
            referencia: line.referencia,
            tipo_subtipo: line.tipo_subtipo,
            zona: line.zona,
            descricao: line.descricao,
            unidade: line.unidade,
            quantidade: line.quantidade,
            notas: line.notas
          }))

          await supabase.from('mqt_linhas').insert(newLines)
        }
      }

      await fetchMqtVersoes()
      setShowNewVersionModal(false)
    } catch (err) {
      console.error('Erro ao criar versão:', err)
      toast.error('Erro', 'Erro ao criar nova versão')
    } finally {
      setSaving(false)
    }
  }

  const addMqtLine = async () => {
    if (!selectedMqtVersao || selectedMqtVersao.is_congelada) return

    try {
      const newOrder = mqtLinhas.length > 0 ? Math.max(...mqtLinhas.map(l => l.ordem)) + 1 : 1

      const { data, error } = await supabase
        .from('mqt_linhas')
        .insert({
          mqt_versao_id: selectedMqtVersao.id,
          ordem: newOrder,
          descricao: '',
          unidade: 'un',
          quantidade: 0
        })
        .select()
        .single()

      if (error) throw error
      setMqtLinhas([...mqtLinhas, data])

      // Focus on new line
      setTimeout(() => {
        setEditingCell({ rowId: data.id, field: 'descricao' })
      }, 100)
    } catch (err) {
      console.error('Erro ao adicionar linha:', err)
    }
  }

  const updateMqtLine = async (lineId, field, value) => {
    try {
      const { error } = await supabase
        .from('mqt_linhas')
        .update({ [field]: value })
        .eq('id', lineId)

      if (error) throw error

      setMqtLinhas(mqtLinhas.map(l =>
        l.id === lineId ? { ...l, [field]: value } : l
      ))
    } catch (err) {
      console.error('Erro ao atualizar linha:', err)
    }
  }

  const deleteMqtLine = async (lineId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Linha',
      message: 'Eliminar esta linha do MQT?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('mqt_linhas')
            .delete()
            .eq('id', lineId)
          if (error) throw error
          setMqtLinhas(mqtLinhas.filter(l => l.id !== lineId))
        } catch (err) {
          console.error('Erro ao eliminar linha:', err)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  // ============================================
  // CRIAR ORÇAMENTO DO MQT
  // ============================================

  const createOrcamentoFromMqt = async () => {
    if (!selectedMqtVersao || mqtLinhas.length === 0) return

    try {
      setSaving(true)
      const orcamentoId = `${obra.id}_orc_${selectedMqtVersao.versao}`

      const { error: orcError } = await supabase
        .from('orcamentos_internos')
        .insert({
          id: orcamentoId,
          obra_id: obra.id,
          mqt_versao_id: selectedMqtVersao.id
        })

      if (orcError) throw orcError

      const orcLinhas = mqtLinhas.map(l => ({
        orcamento_id: orcamentoId,
        mqt_linha_id: l.id,
        preco_custo_unitario: 0
      }))

      const { error: linhasError } = await supabase
        .from('orcamento_linhas')
        .insert(orcLinhas)

      if (linhasError) throw linhasError

      await fetchOrcamentos()
      handleTrackingSubtabChange('orcamento')
    } catch (err) {
      console.error('Erro ao criar orçamento:', err)
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // CRIAR NOVA POP
  // ============================================

  const createNewPop = async () => {
    if (!selectedOrcamento) return

    try {
      setSaving(true)
      const nextNum = pops.length > 0 ? Math.max(...pops.map(p => p.numero)) + 1 : 1
      const popId = `${obra.id}_pop_${nextNum}`

      const { error: popError } = await supabase
        .from('pops')
        .insert({
          id: popId,
          obra_id: obra.id,
          orcamento_id: selectedOrcamento.id,
          numero: nextNum,
          estado: 'rascunho'
        })

      if (popError) throw popError

      // Buscar linhas do orçamento para criar linhas da POP
      const currentOrcLinhas = orcamentoLinhas.length > 0
        ? orcamentoLinhas
        : await supabase
            .from('orcamento_linhas')
            .select('id')
            .eq('orcamento_id', selectedOrcamento.id)
            .then(r => r.data || [])

      if (currentOrcLinhas.length > 0) {
        const popLs = currentOrcLinhas.map(l => ({
          pop_id: popId,
          orcamento_linha_id: l.id,
          margem_k: 1.25
        }))

        const { error: linhasError } = await supabase
          .from('pop_linhas')
          .insert(popLs)

        if (linhasError) throw linhasError
      }

      await fetchPops()
    } catch (err) {
      console.error('Erro ao criar POP:', err)
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // CRIAR NOVA COMPRA
  // ============================================

  const createNewCompra = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('obras_compras')
        .insert({
          obra_id: obra.id,
          data_compra: newCompraForm.data_compra || null,
          preco_comprado_total: parseFloat(newCompraForm.preco_comprado_total) || 0,
          preco_comprado_unitario: parseFloat(newCompraForm.preco_comprado_total) || 0,
          notas: newCompraForm.notas || null
        })

      if (error) throw error

      await fetchCompras()
      setShowNewCompraModal(false)
      setNewCompraForm({ notas: '', preco_comprado_total: '', data_compra: new Date().toISOString().split('T')[0] })
    } catch (err) {
      console.error('Erro ao criar compra:', err)
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // REGISTAR EXECUÇÃO
  // ============================================

  const createExecucaoRegisto = async () => {
    if (!newExecucaoForm.pop_linha_id) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('obras_execucao')
        .insert({
          obra_id: obra.id,
          pop_linha_id: newExecucaoForm.pop_linha_id,
          percentagem_execucao: parseFloat(newExecucaoForm.percentagem_execucao) || 0,
          quantidade_executada: parseFloat(newExecucaoForm.quantidade_executada) || 0,
          data_registo: newExecucaoForm.data_registo || new Date().toISOString().split('T')[0],
          notas: newExecucaoForm.notas || null
        })

      if (error) throw error

      await fetchExecucao()
      setShowNewExecucaoModal(false)
      setNewExecucaoForm({ pop_linha_id: '', percentagem_execucao: '', notas: '', data_registo: new Date().toISOString().split('T')[0] })
    } catch (err) {
      console.error('Erro ao registar execução:', err)
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // CRIAR NOVO AUTO
  // ============================================

  const createNewAuto = async () => {
    try {
      setSaving(true)
      const now = new Date()
      const ano = now.getFullYear()
      const mes = now.getMonth() + 1
      const nextNum = autos.length > 0 ? Math.max(...autos.map(a => a.numero || 0)) + 1 : 1
      const autoId = `${obra.id}_auto_${ano}_${mes}`

      const { error: autoError } = await supabase
        .from('autos')
        .insert({
          id: autoId,
          obra_id: obra.id,
          ano,
          mes,
          estado: 'rascunho'
        })

      if (autoError) throw autoError

      // Buscar linhas POP contratadas para criar linhas do auto
      if (popLinhasDisponiveis.length === 0) {
        await fetchPopLinhasDisponiveis()
      }

      const plDisponiveis = popLinhasDisponiveis.length > 0 ? popLinhasDisponiveis : []
      if (plDisponiveis.length > 0) {
        const autoLs = plDisponiveis.map(pl => ({
          auto_id: autoId,
          pop_linha_id: pl.id,
          percentagem_anterior: 0,
          percentagem_atual: 0,
          percentagem_periodo: 0,
          valor_periodo: 0
        }))

        const { error: linhasError } = await supabase
          .from('auto_linhas')
          .insert(autoLs)

        if (linhasError) throw linhasError
      }

      await fetchAutos()
    } catch (err) {
      console.error('Erro ao criar auto:', err)
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // NAVEGAÇÃO
  // ============================================

  const handleMainTabChange = (tabId) => {
    setActiveMainTab(tabId)
    navigate(`/obras/${id}/${tabId}`, { replace: true })
  }

  const handleTrackingSubtabChange = (subtabId) => {
    setActiveTrackingSubtab(subtabId)
    navigate(`/obras/${id}/${subtabId}`, { replace: true })
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-PT')
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0)
  }

  // ============================================
  // COMPONENTE SPREADSHEET REUTILIZÁVEL
  // ============================================

  const SpreadsheetTable = ({ columns, data, onUpdate, onDelete, onAdd, isLocked, emptyMessage }) => {
    const handleKeyDown = (e, rowId, field, rowIndex, colIndex) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        setEditingCell(null)

        // Move to next cell
        if (e.key === 'Tab' && !e.shiftKey) {
          const nextColIndex = colIndex + 1
          if (nextColIndex < columns.filter(c => c.editable).length) {
            const nextCol = columns.filter(c => c.editable)[nextColIndex]
            setEditingCell({ rowId, field: nextCol.key })
          } else if (rowIndex + 1 < data.length) {
            const firstEditableCol = columns.find(c => c.editable)
            setEditingCell({ rowId: data[rowIndex + 1].id, field: firstEditableCol.key })
          }
        } else if (e.key === 'Enter') {
          if (rowIndex + 1 < data.length) {
            setEditingCell({ rowId: data[rowIndex + 1].id, field })
          }
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null)
      }
    }

    return (
      <div style={{
        background: colors.white,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden'
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.background
        }}>
          <span style={{ fontSize: '13px', color: colors.textMuted }}>
            {data.length} {data.length === 1 ? 'linha' : 'linhas'}
          </span>
          {!isLocked && (
            <button
              onClick={onAdd}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Nova Linha
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: colors.background }}>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{
                      padding: '10px 12px',
                      textAlign: col.align || 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: `1px solid ${colors.border}`,
                      width: col.width || 'auto'
                    }}
                  >
                    {col.label}
                  </th>
                ))}
                {!isLocked && <th style={{ width: '50px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (isLocked ? 0 : 1)}
                    style={{
                      padding: '48px',
                      textAlign: 'center',
                      color: colors.textMuted
                    }}
                  >
                    {emptyMessage || 'Sem dados. Clique em "Nova Linha" para começar.'}
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = colors.background}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={col.key}
                        style={{
                          padding: editingCell?.rowId === row.id && editingCell?.field === col.key ? '4px' : '10px 12px',
                          textAlign: col.align || 'left',
                          fontSize: '13px',
                          color: colors.text,
                          cursor: col.editable && !isLocked ? 'text' : 'default'
                        }}
                        onClick={() => {
                          if (col.editable && !isLocked && editingCell?.rowId !== row.id) {
                            setEditingCell({ rowId: row.id, field: col.key })
                          }
                        }}
                      >
                        {editingCell?.rowId === row.id && editingCell?.field === col.key ? (
                          col.type === 'select' ? (
                            <select
                              autoFocus
                              value={row[col.key] || ''}
                              onChange={(e) => {
                                onUpdate(row.id, col.key, e.target.value)
                                setEditingCell(null)
                              }}
                              onBlur={() => setEditingCell(null)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: `2px solid ${colors.primary}`,
                                borderRadius: '4px',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            >
                              {col.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              ref={cellInputRef}
                              type={col.type === 'number' ? 'number' : 'text'}
                              autoFocus
                              defaultValue={row[col.key] || ''}
                              onBlur={(e) => {
                                const value = col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                if (value !== row[col.key]) {
                                  onUpdate(row.id, col.key, value)
                                }
                                setEditingCell(null)
                              }}
                              onKeyDown={(e) => handleKeyDown(e, row.id, col.key, rowIndex, colIndex)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: `2px solid ${colors.primary}`,
                                borderRadius: '4px',
                                fontSize: '13px',
                                outline: 'none',
                                textAlign: col.align || 'left'
                              }}
                            />
                          )
                        ) : col.render ? (
                          col.render(row[col.key], row)
                        ) : (
                          row[col.key] || '-'
                        )}
                      </td>
                    ))}
                    {!isLocked && (
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => onDelete(row.id)}
                          aria-label="Eliminar linha"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: colors.textMuted,
                            opacity: 0.5,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDERS DAS TABS
  // ============================================

  const renderMqtTab = () => {
    return (
      <div>
        {/* Version selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select
              aria-label="Selecionar versão MQT"
              value={selectedMqtVersao?.id || ''}
              onChange={async (e) => {
                const versao = mqtVersoes.find(v => v.id === e.target.value)
                setSelectedMqtVersao(versao)
                if (versao) await fetchMqtLinhas(versao.id)
              }}
              style={{
                padding: '8px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                background: colors.white
              }}
            >
              {mqtVersoes.map(v => (
                <option key={v.id} value={v.id}>
                  {v.versao} {v.is_ativa ? '(ativa)' : ''} {v.is_congelada ? '🔒' : ''}
                </option>
              ))}
            </select>

            {selectedMqtVersao?.is_congelada && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#FEF3C7',
                color: '#92400E',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500
              }}>
                <Lock size={14} />
                Versão congelada (POP contratada)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowNewVersionModal(true)}
              className="btn btn-secondary btn-sm"
            >
              <Copy size={14} /> Nova Versão
            </button>
          </div>
        </div>

        {/* Spreadsheet */}
        {mqtVersoes.length === 0 ? (
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <ClipboardList size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem MQT</h3>
            <p style={{ color: colors.textMuted, marginBottom: '16px' }}>Crie a primeira versão do Mapa de Quantidades</p>
            <button
              onClick={() => createNewMqtVersion()}
              className="btn btn-primary"
            >
              <Plus size={16} /> Criar MQT v1.0
            </button>
          </div>
        ) : (
          <SpreadsheetTable
            columns={mqtColumns}
            data={mqtLinhas}
            onUpdate={updateMqtLine}
            onDelete={deleteMqtLine}
            onAdd={addMqtLine}
            isLocked={selectedMqtVersao?.is_congelada}
            emptyMessage="MQT vazio. Adicione linhas para começar."
          />
        )}

        {/* New Version Modal */}
        {showNewVersionModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.white,
              borderRadius: '16px',
              padding: '24px',
              width: '400px',
              maxWidth: '90vw'
            }}>
              <h3 style={{ margin: '0 0 16px' }}>Nova Versão MQT</h3>
              <p style={{ color: colors.textMuted, marginBottom: '20px' }}>
                Escolha como criar a nova versão:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => createNewMqtVersion()}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                  disabled={saving}
                >
                  <Plus size={16} /> Começar do zero
                </button>
                {mqtVersoes.map(v => (
                  <button
                    key={v.id}
                    onClick={() => createNewMqtVersion(v)}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start' }}
                    disabled={saving}
                  >
                    <Copy size={16} /> Copiar de {v.versao}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowNewVersionModal(false)}
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: '16px' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderOrcamentoTab = () => {
    return (
      <div>
        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '16px',
            background: colors.white,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>CUSTO TOTAL</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>{formatCurrency(totalCusto)}</div>
          </div>
          <div style={{
            padding: '16px',
            background: colors.white,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>PREÇO VENDA</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>{formatCurrency(totalVenda)}</div>
          </div>
          <div style={{
            padding: '16px',
            background: colors.white,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>MARGEM</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: margem >= 20 ? colors.success : colors.warning }}>
              {margem.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Version selector and actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
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
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: colors.white
                }}
              >
                {orcamentos.map(o => (
                  <option key={o.id} value={o.id}>
                    Orçamento {o.versao} {o.is_ativo ? '(ativo)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {mqtVersoes.length > 0 && orcamentos.length === 0 && (
              <button
                onClick={createOrcamentoFromMqt}
                className="btn btn-primary btn-sm"
                disabled={saving || mqtLinhas.length === 0}
              >
                <Plus size={14} /> Criar Orçamento do MQT
              </button>
            )}
          </div>
        </div>

        {/* Spreadsheet */}
        {orcamentos.length === 0 ? (
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <Calculator size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem Orçamento Interno</h3>
            <p style={{ color: colors.textMuted, marginBottom: '16px' }}>
              {mqtVersoes.length === 0
                ? 'Primeiro crie o MQT na tab anterior'
                : 'Crie o orçamento a partir do MQT ativo'}
            </p>
          </div>
        ) : (
          <SpreadsheetTable
            columns={orcamentoColumns}
            data={orcamentoLinhas}
            onUpdate={async (id, field, value) => {
              // Mapear campos do UI para campos da BD
              const fieldMap = { custo_unitario: 'preco_custo_unitario' }
              const dbField = fieldMap[field] || field
              const { error } = await supabase
                .from('orcamento_linhas')
                .update({ [dbField]: value })
                .eq('id', id)
              if (!error) {
                setOrcamentoLinhas(orcamentoLinhas.map(l =>
                  l.id === id ? { ...l, [field]: value, ...(field === 'custo_unitario' ? { preco_venda: value * 1.25 } : {}) } : l
                ))
              }
            }}
            onDelete={async (id) => {
              setConfirmModal({
                isOpen: true,
                title: 'Eliminar Linha',
                message: 'Eliminar esta linha do orçamento?',
                type: 'danger',
                onConfirm: async () => {
                  const { error } = await supabase.from('orcamento_linhas').delete().eq('id', id)
                  if (!error) setOrcamentoLinhas(orcamentoLinhas.filter(l => l.id !== id))
                  setConfirmModal(prev => ({ ...prev, isOpen: false }))
                }
              })
            }}
            onAdd={async () => {
              const newOrder = orcamentoLinhas.length > 0 ? Math.max(...orcamentoLinhas.map(l => l.ordem)) + 1 : 1
              const { data, error } = await supabase
                .from('orcamento_linhas')
                .insert({
                  orcamento_id: selectedOrcamento.id,
                  ordem: newOrder,
                  descricao: '',
                  unidade: 'un',
                  quantidade: 0,
                  custo_unitario: 0,
                  preco_venda: 0
                })
                .select()
                .single()
              if (!error) setOrcamentoLinhas([...orcamentoLinhas, data])
            }}
            isLocked={false}
            emptyMessage="Orçamento vazio. Importe do MQT ou adicione linhas manualmente."
          />
        )}
      </div>
    )
  }

  const renderPopsTab = () => {
    return (
      <div>
        {/* POPs List */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Propostas de Orçamento</h2>
          <button
            onClick={createNewPop}
            className="btn btn-primary btn-sm"
            disabled={saving || orcamentos.length === 0}
            title={orcamentos.length === 0 ? 'Primeiro crie um orçamento interno' : ''}
          >
            <Plus size={14} /> Nova POP
          </button>
        </div>

        {pops.length === 0 ? (
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <FileText size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem POPs</h3>
            <p style={{ color: colors.textMuted, marginBottom: '16px' }}>
              Crie propostas de orçamento a partir do orçamento interno
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {pops.map(pop => {
              const estado = popEstados.find(e => e.value === pop.estado)
              return (
                <div
                  key={pop.id}
                  onClick={() => {
                    setSelectedPop(pop)
                    fetchPopLinhas(pop.id)
                    fetchAdendas(pop.id)
                  }}
                  style={{
                    padding: '16px',
                    background: colors.white,
                    borderRadius: '12px',
                    border: `1px solid ${selectedPop?.id === pop.id ? colors.primary : colors.border}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>POP #{pop.numero}</div>
                      <div style={{ fontSize: '13px', color: colors.textMuted }}>
                        {pop.cliente_nome || 'Cliente não definido'} • {formatDate(pop.data_envio)}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      background: `${estado?.color}15`,
                      color: estado?.color,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {estado?.label}
                    </span>
                  </div>
                  {pop.estado === 'contratada' && adendas.filter(a => a.pop_id === pop.id).length > 0 && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: `1px solid ${colors.border}`,
                      fontSize: '12px',
                      color: colors.textMuted
                    }}>
                      {adendas.filter(a => a.pop_id === pop.id).length} adenda(s)
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Selected POP Details */}
        {selectedPop && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>
              Linhas da POP #{selectedPop.numero}
              {selectedPop.estado === 'contratada' && (
                <span style={{
                  marginLeft: '12px',
                  padding: '4px 8px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}>
                  <Lock size={12} style={{ marginRight: '4px' }} />
                  Contratada - Apenas adendas
                </span>
              )}
            </h3>
            {/* POP lines table would go here */}
          </div>
        )}
      </div>
    )
  }

  const renderComprasTab = () => {
    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Compras da Obra</h2>
          <button
            onClick={() => setShowNewCompraModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Nova Compra
          </button>
        </div>

        {compras.length === 0 ? (
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <ShoppingCart size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem Compras</h3>
            <p style={{ color: colors.textMuted }}>Registe as compras associadas a esta obra</p>
          </div>
        ) : (
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden'
          }}>
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
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: compra.estado === 'pago' ? '#D1FAE5' : compra.estado === 'recebido' ? '#DBEAFE' : '#FEF3C7',
                        color: compra.estado === 'pago' ? '#065F46' : compra.estado === 'recebido' ? '#1E40AF' : '#92400E'
                      }}>
                        {compra.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const renderExecucaoTab = () => {
    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Controlo de Execução</h2>
          <button
            onClick={() => {
              fetchPopLinhasDisponiveis()
              setShowNewExecucaoModal(true)
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Registar Execução
          </button>
        </div>

        {execucao.length === 0 ? (
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <TrendingUp size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem Registos de Execução</h3>
            <p style={{ color: colors.textMuted }}>Registe o progresso da execução dos trabalhos</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {execucao.map(reg => (
              <div
                key={reg.id}
                style={{
                  padding: '16px',
                  background: colors.white,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{reg.descricao}</div>
                    <div style={{ fontSize: '13px', color: colors.textMuted }}>{formatDate(reg.data_registo)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '100px',
                      height: '8px',
                      background: colors.progressBg,
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${reg.percentagem || 0}%`,
                        height: '100%',
                        background: colors.success,
                        borderRadius: '4px'
                      }} />
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
  }

  const renderAutosTab = () => {
    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Autos de Medição</h2>
          <button
            onClick={createNewAuto}
            className="btn btn-primary btn-sm"
            disabled={saving}
          >
            <Plus size={14} /> Novo Auto
          </button>
        </div>

        {autos.length === 0 ? (
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <Receipt size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Sem Autos de Medição</h3>
            <p style={{ color: colors.textMuted }}>Crie autos para faturação mensal</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {autos.map(auto => (
              <div
                key={auto.id}
                onClick={() => {
                  setSelectedAuto(auto)
                  fetchAutoLinhas(auto.id)
                }}
                style={{
                  padding: '16px',
                  background: colors.white,
                  borderRadius: '12px',
                  border: `1px solid ${selectedAuto?.id === auto.id ? colors.primary : colors.border}`,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Auto #{auto.numero}</div>
                    <div style={{ fontSize: '13px', color: colors.textMuted }}>
                      {auto.mes_referencia} • {formatDate(auto.data_emissao)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: colors.text }}>{formatCurrency(auto.valor_total)}</div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: auto.estado === 'pago' ? '#D1FAE5' : auto.estado === 'emitido' ? '#DBEAFE' : '#FEF3C7',
                      color: auto.estado === 'pago' ? '#065F46' : auto.estado === 'emitido' ? '#1E40AF' : '#92400E'
                    }}>
                      {auto.estado}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // ACOMPANHAMENTO: FOTOGRAFIAS
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
  const [fotoPreview, setFotoPreview] = useState(null) // for lightbox
  const fotoInputRef = useRef(null)

  const loadFotos = useCallback(async () => {
    if (!id) return
    setFotosLoading(true)
    try {
      const [fotosRes, zonasRes, especRes] = await Promise.all([
        supabase.from('obra_fotografias').select('*, obra_zonas(nome), especialidades(nome, cor)').eq('obra_id', id).order('data_fotografia', { ascending: false }),
        supabase.from('obra_zonas').select('id, nome, piso').eq('obra_id', id).order('nome'),
        supabase.from('especialidades').select('id, nome, cor, categoria').eq('ativo', true).order('ordem')
      ])
      setFotos(fotosRes.data || [])
      setZonas(zonasRes.data || [])
      setEspecialidades(especRes.data || [])
    } catch (err) { console.error('Erro fotos:', err) }
    finally { setFotosLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'acompanhamento' && activeAcompanhamentoSubtab === 'fotografias' && id) loadFotos()
  }, [activeMainTab, activeAcompanhamentoSubtab, id, loadFotos])

  const handleFotoUpload = async () => {
    if (!fotoForm.files.length) return
    setFotoUploading(true)
    try {
      for (const file of fotoForm.files) {
        const ext = file.name.split('.').pop()
        const fileName = `${id}/fotos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('obras').upload(fileName, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('obras').getPublicUrl(fileName)

        await supabase.from('obra_fotografias').insert({
          obra_id: id,
          url: urlData.publicUrl,
          filename: file.name,
          tamanho_bytes: file.size,
          titulo: fotoForm.titulo || null,
          descricao: fotoForm.descricao || null,
          zona_id: fotoForm.zona_id || null,
          especialidade_id: fotoForm.especialidade_id || null,
          data_fotografia: new Date().toISOString().split('T')[0],
          autor: currentUser?.nome || null,
          created_by: currentUser?.id || null
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
        </span>
      </div>

      {/* Gallery Grid */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {filteredFotos.map(foto => (
            <div key={foto.id} style={{ background: colors.white, borderRadius: 10, overflow: 'hidden', border: `1px solid ${colors.border}`, cursor: 'pointer' }} onClick={() => setFotoPreview(foto)}>
              <div style={{ position: 'relative', paddingBottom: '75%', background: '#f0ede8' }}>
                <img src={foto.url} alt={foto.titulo || foto.filename} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                {foto.especialidades && (
                  <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: foto.especialidades.cor || colors.primary, color: '#fff' }}>
                    {foto.especialidades.nome}
                  </span>
                )}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {foto.titulo || foto.filename}
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {new Date(foto.data_fotografia).toLocaleDateString('pt-PT')}
                  {foto.obra_zonas && <> · {foto.obra_zonas.nome}</>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {fotoPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setFotoPreview(null)}>
          <div style={{ maxWidth: 900, width: '100%', background: colors.white, borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <img src={fotoPreview.url} alt={fotoPreview.titulo || ''} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', background: '#000' }} />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', color: colors.text }}>{fotoPreview.titulo || fotoPreview.filename}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>
                    {new Date(fotoPreview.data_fotografia).toLocaleDateString('pt-PT')}
                    {fotoPreview.autor && <> · {fotoPreview.autor}</>}
                    {fotoPreview.obra_zonas && <> · {fotoPreview.obra_zonas.nome}</>}
                    {fotoPreview.especialidades && <> · {fotoPreview.especialidades.nome}</>}
                  </p>
                  {fotoPreview.descricao && <p style={{ margin: '8px 0 0', fontSize: 13, color: colors.text }}>{fotoPreview.descricao}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleDeleteFoto(fotoPreview).then(() => setFotoPreview(null))} style={{ padding: '8px 14px', background: '#FFEBEE', color: '#F44336', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <Trash2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Eliminar
                  </button>
                  <button onClick={() => setFotoPreview(null)} style={{ padding: '8px 14px', background: colors.background, color: colors.text, border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Fechar</button>
                </div>
              </div>
            </div>
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
  // ACOMPANHAMENTO: NAO CONFORMIDADES
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

  const loadNcs = useCallback(async () => {
    if (!id) return
    setNcsLoading(true)
    try {
      const { data, error } = await supabase.from('nao_conformidades')
        .select('*, especialidades(nome, cor), obra_zonas(nome)')
        .eq('obra_id', id)
        .order('data_identificacao', { ascending: false })
      if (error) throw error
      setNcs(data || [])
    } catch (err) { console.error('Erro NCs:', err) }
    finally { setNcsLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'acompanhamento' && activeAcompanhamentoSubtab === 'nao-conformidades' && id) loadNcs()
  }, [activeMainTab, activeAcompanhamentoSubtab, id, loadNcs])

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
        obra_id: id, titulo: ncForm.titulo, descricao: ncForm.descricao,
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
  // ACOMPANHAMENTO: RELATORIOS
  // ============================================
  const [relatorios, setRelatorios] = useState([])
  const [relatoriosLoading, setRelatoriosLoading] = useState(false)
  const [showRelModal, setShowRelModal] = useState(false)
  const [editingRel, setEditingRel] = useState(null)
  const [relSaving, setRelSaving] = useState(false)
  const [relForm, setRelForm] = useState({ titulo: '', tipo: 'semanal', data_inicio: '', data_fim: '', resumo_executivo: '', trabalhos_realizados: '', trabalhos_proxima_semana: '', problemas_identificados: '', progresso_global: 0 })

  const loadRelatorios = useCallback(async () => {
    if (!id) return
    setRelatoriosLoading(true)
    try {
      const { data, error } = await supabase.from('obra_relatorios')
        .select('*')
        .eq('obra_id', id)
        .order('data_fim', { ascending: false })
      if (error) throw error
      setRelatorios(data || [])
    } catch (err) { console.error('Erro relatorios:', err) }
    finally { setRelatoriosLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'acompanhamento' && activeAcompanhamentoSubtab === 'relatorios' && id) loadRelatorios()
  }, [activeMainTab, activeAcompanhamentoSubtab, id, loadRelatorios])

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
        progresso_global: obra?.progresso || 0,
      })
    }
    setShowRelModal(true)
  }

  const handleRelSave = async () => {
    if (!relForm.titulo || !relForm.data_inicio || !relForm.data_fim) return
    setRelSaving(true)
    try {
      const data = {
        obra_id: id, titulo: relForm.titulo, tipo: relForm.tipo,
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
  // ACOMPANHAMENTO: DIARIO DE PROJETO
  // ============================================
  const [diarioEntradas, setDiarioEntradas] = useState([])
  const [diarioLoading, setDiarioLoading] = useState(false)
  const [showDiarioModal, setShowDiarioModal] = useState(false)
  const [diarioSaving, setDiarioSaving] = useState(false)
  const [diarioForm, setDiarioForm] = useState({ titulo: '', descricao: '', tipo: 'manual', impacto_prazo: 'nenhum', impacto_custo: 'nenhum', accoes_requeridas: '', responsavel_accao: '', data_limite: '' })

  const loadDiario = useCallback(async () => {
    if (!id) return
    setDiarioLoading(true)
    try {
      const { data, error } = await supabase.from('obra_diario_projeto').select('*').eq('obra_id', id).order('data_evento', { ascending: false })
      if (error) throw error
      setDiarioEntradas(data || [])
    } catch (err) { console.error('Erro diario:', err) }
    finally { setDiarioLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'acompanhamento' && activeAcompanhamentoSubtab === 'diario' && id) loadDiario()
  }, [activeMainTab, activeAcompanhamentoSubtab, id, loadDiario])

  const handleDiarioSave = async () => {
    if (!diarioForm.titulo) return
    setDiarioSaving(true)
    try {
      const maxNum = diarioEntradas.reduce((max, d) => { const n = parseInt(d.codigo?.replace('DP-', '')); return n > max ? n : max }, 0)
      await supabase.from('obra_diario_projeto').insert({
        obra_id: id, codigo: `DP-${String(maxNum + 1).padStart(3, '0')}`,
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
  // FISCALIZACAO: HSO
  // ============================================
  const [hsoItems, setHsoItems] = useState([])
  const [hsoLoading, setHsoLoading] = useState(false)
  const [showHsoModal, setShowHsoModal] = useState(false)
  const [hsoSaving, setHsoSaving] = useState(false)
  const [hsoForm, setHsoForm] = useState({ data_inspecao: new Date().toISOString().split('T')[0], tipo: 'rotina', inspector: '', area_inspecionada: '', conforme: true, observacoes: '', acoes_corretivas: '', prazo_resolucao: '', gravidade: 'baixa' })

  const loadHso = useCallback(async () => {
    if (!id) return
    setHsoLoading(true)
    try {
      const { data, error } = await supabase.from('obra_hso').select('*').eq('obra_id', id).order('data_inspecao', { ascending: false })
      if (error) throw error
      setHsoItems(data || [])
    } catch (err) { console.error('Erro HSO:', err) }
    finally { setHsoLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'fiscalizacao' && activeFiscalizacaoSubtab === 'hso' && id) loadHso()
  }, [activeMainTab, activeFiscalizacaoSubtab, id, loadHso])

  const handleHsoSave = async () => {
    setHsoSaving(true)
    try {
      const maxNum = hsoItems.reduce((max, h) => { const n = parseInt(h.codigo?.replace('HSO-', '')); return n > max ? n : max }, 0)
      await supabase.from('obra_hso').insert({
        obra_id: id, codigo: `HSO-${String(maxNum + 1).padStart(3, '0')}`,
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
  // FISCALIZACAO: OCORRENCIAS
  // ============================================
  const [ocorrencias, setOcorrencias] = useState([])
  const [ocorrenciasLoading, setOcorrenciasLoading] = useState(false)
  const [showOcorrModal, setShowOcorrModal] = useState(false)
  const [ocorrSaving, setOcorrSaving] = useState(false)
  const [ocorrForm, setOcorrForm] = useState({ titulo: '', descricao: '', tipo: 'incidente', gravidade: 'baixa', envolvidos: '', acao_imediata: '', acao_corretiva: '' })

  const loadOcorrencias = useCallback(async () => {
    if (!id) return
    setOcorrenciasLoading(true)
    try {
      const { data, error } = await supabase.from('obra_ocorrencias').select('*').eq('obra_id', id).order('data_ocorrencia', { ascending: false })
      if (error) throw error
      setOcorrencias(data || [])
    } catch (err) { console.error('Erro ocorrencias:', err) }
    finally { setOcorrenciasLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'fiscalizacao' && activeFiscalizacaoSubtab === 'ocorrencias' && id) loadOcorrencias()
  }, [activeMainTab, activeFiscalizacaoSubtab, id, loadOcorrencias])

  const handleOcorrSave = async () => {
    if (!ocorrForm.titulo || !ocorrForm.descricao) return
    setOcorrSaving(true)
    try {
      const maxNum = ocorrencias.reduce((max, o) => { const n = parseInt(o.codigo?.replace('OC-', '')); return n > max ? n : max }, 0)
      await supabase.from('obra_ocorrencias').insert({
        obra_id: id, codigo: `OC-${String(maxNum + 1).padStart(3, '0')}`,
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

  const ocorrGravColors = { baixa: { color: '#FF9800', bg: '#FFF3E0' }, media: { color: '#F44336', bg: '#FFEBEE' }, alta: { color: '#D32F2F', bg: '#FFCDD2' }, critica: { color: '#9C27B0', bg: '#F3E5F5' } }

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
  // EQUIPAS: EQUIPA GAVINHO
  // ============================================
  const [equipaMembers, setEquipaMembers] = useState([])
  const [equipaLoading, setEquipaLoading] = useState(false)
  const [allTrabalhadores, setAllTrabalhadores] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [addMemberTrab, setAddMemberTrab] = useState('')

  const loadEquipa = useCallback(async () => {
    if (!id) return
    setEquipaLoading(true)
    try {
      const [membersRes, trabRes] = await Promise.all([
        supabase.from('trabalhador_obras').select('*, trabalhadores(id, nome, cargo, telefone, ativo)').eq('obra_id', id),
        supabase.from('trabalhadores').select('id, nome, cargo').eq('ativo', true).order('nome')
      ])
      setEquipaMembers(membersRes.data || [])
      setAllTrabalhadores(trabRes.data || [])
    } catch (err) { console.error('Erro equipa:', err) }
    finally { setEquipaLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'equipas' && activeEquipasSubtab === 'equipa' && id) loadEquipa()
  }, [activeMainTab, activeEquipasSubtab, id, loadEquipa])

  const handleAddMember = async () => {
    if (!addMemberTrab) return
    try {
      await supabase.from('trabalhador_obras').insert({ trabalhador_id: addMemberTrab, obra_id: id })
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

  // ============================================
  // EQUIPAS: SUBEMPREITEIROS
  // ============================================
  const [subs, setSubs] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [subSaving, setSubSaving] = useState(false)
  const [subForm, setSubForm] = useState({ nome: '', empresa: '', nif: '', contacto: '', email: '', especialidade_id: '', contrato_valor: '', contrato_inicio: '', contrato_fim: '', notas: '' })

  const loadSubs = useCallback(async () => {
    if (!id) return
    setSubsLoading(true)
    try {
      const { data, error } = await supabase.from('obra_subempreiteiros').select('*, especialidades(nome, cor)').eq('obra_id', id).order('nome')
      if (error) throw error
      setSubs(data || [])
    } catch (err) { console.error('Erro subs:', err) }
    finally { setSubsLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'equipas' && activeEquipasSubtab === 'subempreiteiros' && id) loadSubs()
  }, [activeMainTab, activeEquipasSubtab, id, loadSubs])

  const handleSubSave = async () => {
    if (!subForm.nome) return
    setSubSaving(true)
    try {
      await supabase.from('obra_subempreiteiros').insert({
        obra_id: id, nome: subForm.nome, empresa: subForm.empresa || null,
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

  // ============================================
  // EQUIPAS: ZONAS
  // ============================================
  const [zonasObra, setZonasObra] = useState([])
  const [zonasObraLoading, setZonasObraLoading] = useState(false)
  const [showZonaModal, setShowZonaModal] = useState(false)
  const [zonaSaving, setZonaSaving] = useState(false)
  const [zonaForm, setZonaForm] = useState({ nome: '', piso: '', tipo: 'Divisao', area_m2: '', notas: '' })

  const loadZonasObra = useCallback(async () => {
    if (!id) return
    setZonasObraLoading(true)
    try {
      const { data, error } = await supabase.from('obra_zonas').select('*').eq('obra_id', id).order('ordem').order('nome')
      if (error) throw error
      setZonasObra(data || [])
    } catch (err) { console.error('Erro zonas:', err) }
    finally { setZonasObraLoading(false) }
  }, [id])

  useEffect(() => {
    if (activeMainTab === 'equipas' && activeEquipasSubtab === 'zonas' && id) loadZonasObra()
  }, [activeMainTab, activeEquipasSubtab, id, loadZonasObra])

  const handleZonaSave = async () => {
    if (!zonaForm.nome) return
    setZonaSaving(true)
    try {
      await supabase.from('obra_zonas').insert({
        obra_id: id, nome: zonaForm.nome, piso: zonaForm.piso || null,
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

  // ============================================
  // DASHBOARD
  // ============================================
  const renderDashboard = () => {
    const ncAbertas = ncs.filter(n => n.estado === 'aberta').length
    const hsoNaoConf = hsoItems.filter(h => !h.conforme && h.estado === 'pendente').length
    const totalSubs = subs.length
    const totalEquipa = equipaMembers.length
    return (
      <div>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Progresso', value: `${obra?.progresso || 0}%`, color: colors.success, bg: '#E8F5E9' },
            { label: 'NCs Abertas', value: ncAbertas, color: ncAbertas > 0 ? '#F44336' : '#4CAF50', bg: ncAbertas > 0 ? '#FFEBEE' : '#E8F5E9' },
            { label: 'HSO Pendentes', value: hsoNaoConf, color: hsoNaoConf > 0 ? '#FF9800' : '#4CAF50', bg: hsoNaoConf > 0 ? '#FFF3E0' : '#E8F5E9' },
            { label: 'SubEmpreiteiros', value: totalSubs, color: '#2196F3', bg: '#E3F2FD' },
            { label: 'Equipa', value: totalEquipa, color: colors.primary, bg: colors.background },
            { label: 'Fotografias', value: fotos.length, color: '#7B1FA2', bg: '#F3E5F5' },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: colors.white, borderRadius: 12, padding: 18, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{kpi.label}</div>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{ background: colors.white, borderRadius: 12, padding: 20, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Progresso Global</div>
          <div style={{ height: 12, background: colors.progressBg, borderRadius: 6 }}>
            <div style={{ height: '100%', width: `${obra?.progresso || 0}%`, background: colors.success, borderRadius: 6, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
            <span>Inicio: {obra?.data_inicio ? new Date(obra.data_inicio).toLocaleDateString('pt-PT') : '-'}</span>
            <span>{obra?.progresso || 0}%</span>
            <span>Previsao: {obra?.data_prevista_conclusao ? new Date(obra.data_prevista_conclusao).toLocaleDateString('pt-PT') : '-'}</span>
          </div>
        </div>
        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: colors.white, borderRadius: 12, padding: 18, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 10 }}>Informacao Geral</div>
            {[
              { label: 'Codigo', value: obra?.codigo },
              { label: 'Tipo', value: obra?.tipo },
              { label: 'Status', value: obra?.status?.replace('_', ' ') },
              { label: 'Localizacao', value: obra?.localizacao },
              { label: 'Encarregado', value: obra?.encarregado },
              { label: 'Orcamento', value: obra?.orcamento ? parseFloat(obra.orcamento).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '-' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
                <span style={{ color: colors.textMuted }}>{item.label}</span>
                <span style={{ fontWeight: 500, color: colors.text }}>{item.value || '-'}</span>
              </div>
            ))}
          </div>
          <div style={{ background: colors.white, borderRadius: 12, padding: 18, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 10 }}>Ultimos Relatorios</div>
            {relatorios.length === 0 ? <p style={{ fontSize: 13, color: colors.textMuted }}>Nenhum relatorio</p>
            : relatorios.slice(0, 4).map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
                <span style={{ color: colors.text }}>{r.codigo} - {r.titulo}</span>
                <span style={{ color: colors.textMuted }}>{new Date(r.data_fim).toLocaleDateString('pt-PT')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!obra) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <AlertTriangle size={48} style={{ color: colors.warning, marginBottom: '16px' }} />
        <h2>Obra não encontrada</h2>
        <button onClick={() => navigate('/obras')} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Voltar às Obras
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/obras')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '16px',
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          Voltar às Obras
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                color: colors.success,
                letterSpacing: '0.5px',
                fontFamily: 'monospace',
                background: '#EEF5EC',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                {obra.codigo}
              </span>
              {obra.projetos?.codigo && (
                <button
                  onClick={() => navigate(`/projetos/${obra.projetos.codigo}`)}
                  aria-label={`Ver projeto ${obra.projetos.codigo}`}
                  style={{
                    cursor: 'pointer',
                    background: colors.background,
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colors.text
                  }}
                >
                  {obra.projetos.codigo}
                </button>
              )}
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                background: obra.status === 'em_curso' ? '#E8F5E915' : '#F5A62315',
                color: obra.status === 'em_curso' ? '#2E7D32' : '#D97706'
              }}>
                {obra.status === 'em_curso' ? 'Em Curso' : obra.status}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px', color: colors.text }}>
              {obra.nome}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: colors.textMuted }}>
              {obra.localizacao && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} />
                  {obra.localizacao}
                </span>
              )}
              {obra.projetos?.cliente_nome && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} />
                  {obra.projetos.cliente_nome}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div
        role="tablist"
        aria-label="Separadores principais"
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '0',
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: '0'
        }}
      >
        {mainTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeMainTab === tab.id}
            onClick={() => handleMainTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: activeMainTab === tab.id ? colors.white : 'transparent',
              border: activeMainTab === tab.id ? `1px solid ${colors.border}` : '1px solid transparent',
              borderBottom: activeMainTab === tab.id ? `1px solid ${colors.white}` : '1px solid transparent',
              borderRadius: '8px 8px 0 0',
              marginBottom: '-1px',
              cursor: 'pointer',
              color: activeMainTab === tab.id ? colors.text : colors.textMuted,
              fontWeight: activeMainTab === tab.id ? 600 : 400,
              fontSize: '14px',
              transition: 'all 0.2s',
              position: 'relative'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.id === 'chat' && checklistCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                borderRadius: '9px',
                background: colors.warning,
                color: colors.white,
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {checklistCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tabs for Tracking */}
      {activeMainTab === 'tracking' && (
        <div
          role="tablist"
          aria-label="Sub-separadores tracking"
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 0',
            marginBottom: '20px',
            background: colors.white,
            borderBottom: `1px solid ${colors.border}`
          }}
        >
          {trackingSubtabs.map(subtab => (
            <button
              key={subtab.id}
              role="tab"
              aria-selected={activeTrackingSubtab === subtab.id}
              onClick={() => handleTrackingSubtabChange(subtab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: activeTrackingSubtab === subtab.id ? colors.primary : 'transparent',
                border: activeTrackingSubtab === subtab.id ? 'none' : `1px solid ${colors.border}`,
                borderRadius: '20px',
                cursor: 'pointer',
                color: activeTrackingSubtab === subtab.id ? colors.white : colors.textMuted,
                fontWeight: activeTrackingSubtab === subtab.id ? 600 : 400,
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              <subtab.icon size={14} />
              {subtab.label}
            </button>
          ))}
        </div>
      )}

      {/* Sub-tabs for Acompanhamento */}
      {activeMainTab === 'acompanhamento' && (
        <div
          role="tablist"
          aria-label="Sub-separadores acompanhamento"
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 0',
            marginBottom: '20px',
            background: colors.white,
            borderBottom: `1px solid ${colors.border}`
          }}
        >
          {acompanhamentoSubtabs.map(subtab => (
            <button
              key={subtab.id}
              role="tab"
              aria-selected={activeAcompanhamentoSubtab === subtab.id}
              onClick={() => setActiveAcompanhamentoSubtab(subtab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: activeAcompanhamentoSubtab === subtab.id ? colors.primary : 'transparent',
                border: activeAcompanhamentoSubtab === subtab.id ? 'none' : `1px solid ${colors.border}`,
                borderRadius: '20px',
                cursor: 'pointer',
                color: activeAcompanhamentoSubtab === subtab.id ? colors.white : colors.textMuted,
                fontWeight: activeAcompanhamentoSubtab === subtab.id ? 600 : 400,
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              <subtab.icon size={14} />
              {subtab.label}
            </button>
          ))}
        </div>
      )}

      {/* Sub-tabs for Fiscalização */}
      {activeMainTab === 'fiscalizacao' && (
        <div
          role="tablist"
          aria-label="Sub-separadores fiscalização"
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 0',
            marginBottom: '20px',
            background: colors.white,
            borderBottom: `1px solid ${colors.border}`
          }}
        >
          {fiscalizacaoSubtabs.map(subtab => (
            <button
              key={subtab.id}
              role="tab"
              aria-selected={activeFiscalizacaoSubtab === subtab.id}
              onClick={() => setActiveFiscalizacaoSubtab(subtab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: activeFiscalizacaoSubtab === subtab.id ? colors.primary : 'transparent',
                border: activeFiscalizacaoSubtab === subtab.id ? 'none' : `1px solid ${colors.border}`,
                borderRadius: '20px',
                cursor: 'pointer',
                color: activeFiscalizacaoSubtab === subtab.id ? colors.white : colors.textMuted,
                fontWeight: activeFiscalizacaoSubtab === subtab.id ? 600 : 400,
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              <subtab.icon size={14} />
              {subtab.label}
            </button>
          ))}
        </div>
      )}

      {/* Sub-tabs for Equipas */}
      {activeMainTab === 'equipas' && (
        <div
          role="tablist"
          aria-label="Sub-separadores equipas"
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 0',
            marginBottom: '20px',
            background: colors.white,
            borderBottom: `1px solid ${colors.border}`
          }}
        >
          {equipasSubtabs.map(subtab => (
            <button
              key={subtab.id}
              role="tab"
              aria-selected={activeEquipasSubtab === subtab.id}
              onClick={() => setActiveEquipasSubtab(subtab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: activeEquipasSubtab === subtab.id ? colors.primary : 'transparent',
                border: activeEquipasSubtab === subtab.id ? 'none' : `1px solid ${colors.border}`,
                borderRadius: '20px',
                cursor: 'pointer',
                color: activeEquipasSubtab === subtab.id ? colors.white : colors.textMuted,
                fontWeight: activeEquipasSubtab === subtab.id ? 600 : 400,
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              <subtab.icon size={14} />
              {subtab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div role="tabpanel" aria-label={`Conteúdo do separador ${activeMainTab}`} style={{ marginTop: activeMainTab === 'dashboard' || activeMainTab === 'projeto' ? '24px' : '0' }}>
        {/* Dashboard */}
        {activeMainTab === 'dashboard' && renderDashboard()}

        {/* Tracking Sub-tabs Content */}
        {activeMainTab === 'tracking' && tabLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px',
            color: colors.textMuted
          }}>
            <Loader2 size={24} className="spin" style={{ marginRight: '12px' }} />
            A carregar dados...
          </div>
        )}
        {activeMainTab === 'tracking' && !tabLoading && activeTrackingSubtab === 'mqt' && renderMqtTab()}
        {activeMainTab === 'tracking' && !tabLoading && activeTrackingSubtab === 'orcamento' && renderOrcamentoTab()}
        {activeMainTab === 'tracking' && !tabLoading && activeTrackingSubtab === 'pops' && renderPopsTab()}
        {activeMainTab === 'tracking' && !tabLoading && activeTrackingSubtab === 'compras' && renderComprasTab()}
        {activeMainTab === 'tracking' && !tabLoading && activeTrackingSubtab === 'execucao' && renderExecucaoTab()}
        {activeMainTab === 'tracking' && !tabLoading && activeTrackingSubtab === 'autos' && renderAutosTab()}

        {/* Acompanhamento */}
        {activeMainTab === 'acompanhamento' && activeAcompanhamentoSubtab === 'fotografias' && renderFotografiasTab()}
        {activeMainTab === 'acompanhamento' && activeAcompanhamentoSubtab === 'nao-conformidades' && renderNaoConformidadesTab()}
        {activeMainTab === 'acompanhamento' && activeAcompanhamentoSubtab === 'relatorios' && renderRelatoriosTab()}
        {activeMainTab === 'acompanhamento' && activeAcompanhamentoSubtab === 'diario' && renderDiarioTab()}

        {/* Fiscalização */}
        {activeMainTab === 'fiscalizacao' && activeFiscalizacaoSubtab === 'hso' && renderHsoTab()}
        {activeMainTab === 'fiscalizacao' && activeFiscalizacaoSubtab === 'ocorrencias' && renderOcorrenciasTab()}

        {/* Equipas */}
        {activeMainTab === 'equipas' && activeEquipasSubtab === 'equipa' && renderEquipaTab()}
        {activeMainTab === 'equipas' && activeEquipasSubtab === 'subempreiteiros' && renderSubEmpreiteirosTab()}
        {activeMainTab === 'equipas' && activeEquipasSubtab === 'zonas' && renderZonasTab()}

        {/* Projeto - Placeholder */}
        {activeMainTab === 'projeto' && (
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <FileText size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Projeto de Execução</h3>
            <p style={{ color: colors.textMuted, marginBottom: '16px' }}>Funcionalidades previstas:</p>
            <div style={{ display: 'inline-block', textAlign: 'left', color: colors.textMuted, fontSize: '13px', lineHeight: '1.8' }}>
              • Peças desenhadas e plantas<br/>
              • Documentação técnica e cadernos de encargos<br/>
              • Controlo de revisões e versões<br/>
              • Distribuição de documentos à equipa
            </div>
          </div>
        )}

        {/* Chat com J.A.R.V.I.S. */}
        {activeMainTab === 'chat' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
            <ObraChat
              obraId={obra.id}
              obraCodigo={obra.codigo}
              currentUser={currentUser}
            />
            <ObraChecklist obraId={obra.id} />
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Modal Nova Compra */}
      {showNewCompraModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => e.target === e.currentTarget && setShowNewCompraModal(false)}
        >
          <div style={{
            background: colors.white,
            borderRadius: '16px',
            padding: '24px',
            width: '440px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 20px' }}>Nova Compra</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>
                  Data da Compra
                </label>
                <input
                  type="date"
                  value={newCompraForm.data_compra}
                  onChange={(e) => setNewCompraForm({ ...newCompraForm, data_compra: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>
                  Descrição
                </label>
                <textarea
                  value={newCompraForm.notas}
                  onChange={(e) => setNewCompraForm({ ...newCompraForm, notas: e.target.value })}
                  placeholder="Descreva a compra..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>
                  Valor (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCompraForm.preco_comprado_total}
                  onChange={(e) => setNewCompraForm({ ...newCompraForm, preco_comprado_total: e.target.value })}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowNewCompraModal(false)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={createNewCompra}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={saving}
              >
                {saving ? 'A guardar...' : 'Criar Compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registar Execução */}
      {showNewExecucaoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => e.target === e.currentTarget && setShowNewExecucaoModal(false)}
        >
          <div style={{
            background: colors.white,
            borderRadius: '16px',
            padding: '24px',
            width: '480px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 20px' }}>Registar Execução</h3>

            {popLinhasDisponiveis.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <AlertTriangle size={32} style={{ color: colors.warning, marginBottom: '12px' }} />
                <p style={{ color: colors.textMuted, margin: 0 }}>
                  Sem POP contratada. Primeiro contrate uma POP para registar execução.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>
                    Linha da POP
                  </label>
                  <select
                    value={newExecucaoForm.pop_linha_id}
                    onChange={(e) => setNewExecucaoForm({ ...newExecucaoForm, pop_linha_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Selecione uma linha...</option>
                    {popLinhasDisponiveis.map(pl => (
                      <option key={pl.id} value={pl.id}>
                        {pl.descricao} ({pl.unidade})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>
                      Percentagem (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newExecucaoForm.percentagem_execucao}
                      onChange={(e) => setNewExecucaoForm({ ...newExecucaoForm, percentagem_execucao: e.target.value })}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>
                      Data
                    </label>
                    <input
                      type="date"
                      value={newExecucaoForm.data_registo}
                      onChange={(e) => setNewExecucaoForm({ ...newExecucaoForm, data_registo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.text }}>
                    Notas
                  </label>
                  <textarea
                    value={newExecucaoForm.notas}
                    onChange={(e) => setNewExecucaoForm({ ...newExecucaoForm, notas: e.target.value })}
                    placeholder="Observações..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowNewExecucaoModal(false)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              {popLinhasDisponiveis.length > 0 && (
                <button
                  onClick={createExecucaoRegisto}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={saving || !newExecucaoForm.pop_linha_id}
                >
                  {saving ? 'A guardar...' : 'Registar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
