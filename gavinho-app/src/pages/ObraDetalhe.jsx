import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, MapPin, Calendar, Users, HardHat, BookOpen, Grid3X3, Camera, AlertTriangle,
  Plus, Sun, Cloud, CloudRain, Wind, Thermometer, Clock, CheckCircle2, Edit, X, Building2,
  ChevronRight, ChevronDown, Trash2, UserPlus, Phone, Mail, Briefcase, ClipboardList, Receipt,
  Upload, Image, FileText, Download, Loader2, Calculator, Euro, MessageSquare,
  ShoppingCart, TrendingUp, Shield, Truck, Wrench
} from 'lucide-react'
import ObraTracking from '../components/ObraTracking'
import ObraAutos from '../components/ObraAutos'
import ObraOrcamentacao from '../components/ObraOrcamentacao'
import ObraProjetoExecucao from '../components/ObraProjetoExecucao'
import DiarioObraProjeto from '../components/DiarioObraProjeto'
import ObraFotografias from '../components/ObraFotografias'
import ObraRelatorios from '../components/ObraRelatorios'
import ObraNaoConformidades from '../components/ObraNaoConformidades'
import { exportDiarioToPDF } from '../utils/exportDiarioToPDF'

// Tab Groups
const tabGroups = [
  {
    id: 'financeira',
    label: 'Gestão Financeira',
    icon: Euro,
    tabs: [
      { id: 'tracking', label: 'MQT / Tracking', icon: ClipboardList },
      { id: 'orcamentacao', label: 'Orçamentação', icon: Calculator },
      { id: 'compras', label: 'Compras', icon: ShoppingCart },
      { id: 'controle-executado', label: 'Controle Executado', icon: TrendingUp },
      { id: 'componentes', label: 'Contratos', icon: Building2 },
    ]
  },
  {
    id: 'acompanhamento',
    label: 'Acompanhamento Obra',
    icon: HardHat,
    tabs: [
      { id: 'fotografias', label: 'Fotografias', icon: Camera },
      { id: 'relatorios', label: 'Relatórios Obra', icon: FileText },
      { id: 'nao-conformidades', label: 'Não Conformidades', icon: AlertTriangle },
      { id: 'diario', label: 'Diário de Obra', icon: BookOpen },
      { id: 'diario-projeto', label: 'Diário de Projeto', icon: FileText },
    ]
  },
  {
    id: 'fiscalizacao',
    label: 'Fiscalização',
    icon: Shield,
    tabs: [
      { id: 'autos', label: 'Autos Medição', icon: Receipt },
      { id: 'hso', label: 'HSO', icon: Shield },
      { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
    ]
  },
  {
    id: 'equipas',
    label: 'Equipas e SubEmpreiteiros',
    icon: Users,
    tabs: [
      { id: 'equipa', label: 'Equipa em Obra', icon: Users },
      { id: 'subempreiteiros', label: 'SubEmpreiteiros', icon: Truck },
      { id: 'zonas', label: 'Zonas', icon: Grid3X3 },
    ]
  },
  {
    id: 'projeto',
    label: 'Projeto',
    icon: FileText,
    tabs: [
      { id: 'projeto-execucao', label: 'Projeto em Execução', icon: FileText },
    ]
  }
]

// Flatten tabs for easy access
const allTabs = tabGroups.flatMap(group => group.tabs)

// Tipos de componentes de obra
const TIPOS_COMPONENTE = [
  { value: 'construcao', label: 'Construção', entidade: 'Gavinho & Associados' },
  { value: 'design_interiores', label: 'Design de Interiores / Fit-Out', entidade: 'Gavinho Arquitetura e Interiores LDA' }
]

const CONDICOES_METEO = ['Bom', 'Nublado', 'Chuva', 'Vento', 'Frio']
const TIPOS_ZONA = ['Divisão', 'Área Exterior', 'Área Técnica', 'Comum']
const TIPOS_OCORRENCIA = ['Problema', 'Incidente', 'Não Conformidade', 'Atraso']
const GRAVIDADES = ['Baixa', 'Média', 'Alta', 'Crítica']
const FUNCOES_OBRA = ['Encarregado', 'Pedreiro', 'Carpinteiro', 'Eletricista', 'Canalizador', 'Pintor', 'Servente', 'Serralheiro', 'Outro']

export default function ObraDetalhe() {
  const { id, tab: urlTab } = useParams()
  const navigate = useNavigate()
  
  const [obra, setObra] = useState(null)
  const [zonas, setZonas] = useState([])
  const [diarios, setDiarios] = useState([])
  const [ocorrencias, setOcorrencias] = useState([])
  const [equipa, setEquipa] = useState([])
  const [componentes, setComponentes] = useState([])
  const [entidadesFaturacao, setEntidadesFaturacao] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(urlTab || 'tracking')
  const [expandedGroups, setExpandedGroups] = useState(['financeira', 'acompanhamento'])

  // Sincronizar tab da URL
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
  }, [urlTab])

  // Navegar para tab
  const handleTabChange = (tabId) => {
    navigate(`/obras/${id}/${tabId}`, { replace: true })
    setActiveTab(tabId)
  }
  
  // Modals
  const [showDiarioModal, setShowDiarioModal] = useState(false)
  const [showZonaModal, setShowZonaModal] = useState(false)
  const [showOcorrenciaModal, setShowOcorrenciaModal] = useState(false)
  const [showEquipaModal, setShowEquipaModal] = useState(false)
  const [showComponenteModal, setShowComponenteModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  
  // Edit states
  const [editingDiario, setEditingDiario] = useState(null)
  const [editingZona, setEditingZona] = useState(null)
  const [editingOcorrencia, setEditingOcorrencia] = useState(null)
  const [editingMembro, setEditingMembro] = useState(null)
  const [editingComponente, setEditingComponente] = useState(null)
  
  // Componente form
  const [componenteForm, setComponenteForm] = useState({
    tipo: 'construcao',
    nome: 'Construção',
    entidade_faturacao_id: '',
    valor_contrato: '',
    percentagem_adiantamento: 20,
    percentagem_retencao: 5,
    notas: ''
  })
  
  // Form data
  const [diarioForm, setDiarioForm] = useState({
    condicoes_meteo: 'Bom',
    trabalhadores_gavinho: '', trabalhadores_subempreiteiros: '',
    horas_trabalhadas: '8', resumo: '', trabalhos_realizados: '',
    trabalhos_previstos_amanha: '', problemas: '', fotos: []
  })
  const [uploadingFotos, setUploadingFotos] = useState(false)
  
  const [zonaForm, setZonaForm] = useState({
    nome: '', piso: '', tipo: 'Divisão', area_m2: '', progresso: 0, notas: ''
  })
  
  const [ocorrenciaForm, setOcorrenciaForm] = useState({
    titulo: '', descricao: '', tipo: 'Problema', gravidade: 'Média',
    responsavel: '', data_limite: '', status: 'aberta'
  })
  
  const [equipaForm, setEquipaForm] = useState({
    nome: '', funcao: '', empresa: '', telefone: '', email: '',
    tipo: 'subempreiteiro', ativo: true
  })

  // Fetch data
  useEffect(() => {
    if (id) fetchObra()
  }, [id])
  
  useEffect(() => {
    if (obra?.id) {
      fetchZonas()
      fetchDiarios()
      fetchOcorrencias()
      fetchEquipa()
      fetchComponentes()
    }
  }, [obra?.id])
  
  // Carregar entidades de faturação
  useEffect(() => {
    fetchEntidadesFaturacao()
  }, [])

  const fetchObra = async () => {
    try {
      const { data, error } = await supabase
        .from('obras')
        .select('*, projetos(id, codigo, nome, cliente_nome)')
        .eq('codigo', id)
        .single()

      if (error) throw error
      setObra(data)
    } catch (err) {
      console.error('Erro ao carregar obra:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchZonas = async () => {
    try {
      const { data } = await supabase
        .from('obra_zonas')
        .select('*')
        .eq('obra_id', obra.id)
        .order('ordem')
      setZonas(data || [])
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const fetchDiarios = async () => {
    try {
      const { data } = await supabase
        .from('obra_diario')
        .select('*')
        .eq('obra_id', obra.id)
        .order('data', { ascending: false })
      setDiarios(data || [])
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const fetchOcorrencias = async () => {
    try {
      const { data } = await supabase
        .from('obra_ocorrencias')
        .select('*')
        .eq('obra_id', obra.id)
        .order('data_identificacao', { ascending: false })
      setOcorrencias(data || [])
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const fetchEquipa = async () => {
    try {
      const { data } = await supabase
        .from('obra_equipa')
        .select('*')
        .eq('obra_id', obra.id)
        .order('nome')
      setEquipa(data || [])
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const fetchComponentes = async () => {
    try {
      const { data } = await supabase
        .from('obra_componentes')
        .select('*, entidades_faturacao(id, nome)')
        .eq('obra_id', obra.id)
        .order('created_at')
      setComponentes(data || [])
    } catch (err) {
      console.error('Erro ao carregar componentes:', err)
    }
  }

  const fetchEntidadesFaturacao = async () => {
    try {
      const { data } = await supabase
        .from('entidades_faturacao')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      setEntidadesFaturacao(data || [])
    } catch (err) {
      console.error('Erro ao carregar entidades:', err)
    }
  }

  // CRUD Componentes
  const handleSaveComponente = async () => {
    try {
      const tipoInfo = TIPOS_COMPONENTE.find(t => t.value === componenteForm.tipo)
      const data = {
        obra_id: obra.id,
        tipo: componenteForm.tipo,
        nome: componenteForm.nome || tipoInfo?.label,
        entidade_faturacao_id: componenteForm.entidade_faturacao_id || null,
        valor_contrato: parseFloat(componenteForm.valor_contrato) || 0,
        percentagem_adiantamento: parseFloat(componenteForm.percentagem_adiantamento) || 20,
        percentagem_retencao: parseFloat(componenteForm.percentagem_retencao) || 5,
        notas: componenteForm.notas || null
      }

      if (editingComponente) {
        const { error } = await supabase
          .from('obra_componentes')
          .update(data)
          .eq('id', editingComponente.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('obra_componentes')
          .insert(data)
        if (error) throw error
      }

      fetchComponentes()
      setShowComponenteModal(false)
      setEditingComponente(null)
      setComponenteForm({
        tipo: 'construcao',
        nome: 'Construção',
        entidade_faturacao_id: '',
        valor_contrato: '',
        percentagem_adiantamento: 20,
        percentagem_retencao: 5,
        notas: ''
      })
    } catch (err) {
      console.error('Erro ao guardar componente:', err)
      alert(`Erro ao guardar: ${err.message}`)
    }
  }

  const handleEditComponente = (componente) => {
    setEditingComponente(componente)
    setComponenteForm({
      tipo: componente.tipo,
      nome: componente.nome,
      entidade_faturacao_id: componente.entidade_faturacao_id || '',
      valor_contrato: componente.valor_contrato || '',
      percentagem_adiantamento: componente.percentagem_adiantamento || 20,
      percentagem_retencao: componente.percentagem_retencao || 5,
      notas: componente.notas || ''
    })
    setShowComponenteModal(true)
  }

  const handleDeleteComponente = async (id) => {
    if (!confirm('Tem a certeza que deseja eliminar este contrato?')) return
    try {
      const { error } = await supabase.from('obra_componentes').delete().eq('id', id)
      if (error) throw error
      fetchComponentes()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao eliminar contrato')
    }
  }

  // CRUD Diário
  const handleSaveDiario = async () => {
    try {
      const data = {
        obra_id: obra.id,
        data: new Date().toISOString().split('T')[0],
        condicoes_meteo: diarioForm.condicoes_meteo,
        trabalhadores_gavinho: parseInt(diarioForm.trabalhadores_gavinho) || 0,
        trabalhadores_subempreiteiros: parseInt(diarioForm.trabalhadores_subempreiteiros) || 0,
        horas_trabalhadas: parseFloat(diarioForm.horas_trabalhadas) || 8,
        resumo: diarioForm.resumo,
        trabalhos_realizados: diarioForm.trabalhos_realizados,
        trabalhos_previstos_amanha: diarioForm.trabalhos_previstos_amanha,
        problemas: diarioForm.problemas || null,
        fotos: diarioForm.fotos || []
      }

      if (editingDiario) {
        await supabase.from('obra_diario').update(data).eq('id', editingDiario.id)
      } else {
        await supabase.from('obra_diario').insert([data])
      }

      setShowDiarioModal(false)
      resetDiarioForm()
      fetchDiarios()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar diário')
    }
  }

  // Upload de fotos para o diário
  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingFotos(true)
    const newFotos = [...(diarioForm.fotos || [])]

    for (const file of files) {
      try {
        const fileName = `${obra.codigo}/diario/${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('obras').upload(fileName, file)
        if (error) throw error

        const { data: { publicUrl } } = supabase.storage.from('obras').getPublicUrl(fileName)
        newFotos.push({ url: publicUrl, nome: file.name, data: new Date().toISOString() })
      } catch (err) {
        console.error('Erro ao fazer upload:', err)
      }
    }

    setDiarioForm({ ...diarioForm, fotos: newFotos })
    setUploadingFotos(false)
    e.target.value = ''
  }

  const removeFoto = (index) => {
    const newFotos = diarioForm.fotos.filter((_, i) => i !== index)
    setDiarioForm({ ...diarioForm, fotos: newFotos })
  }

  const handleDeleteDiario = async (diario) => {
    try {
      await supabase.from('obra_diario').delete().eq('id', diario.id)
      setShowDeleteConfirm(null)
      fetchDiarios()
    } catch (err) {
      alert('Erro ao eliminar')
    }
  }

  // CRUD Zonas
  const handleSaveZona = async () => {
    try {
      const data = {
        obra_id: obra.id,
        nome: zonaForm.nome,
        piso: zonaForm.piso,
        tipo: zonaForm.tipo,
        area_m2: zonaForm.area_m2 ? parseFloat(zonaForm.area_m2) : null,
        progresso: parseInt(zonaForm.progresso) || 0,
        notas: zonaForm.notas || null,
        ordem: zonas.length + 1
      }

      if (editingZona) {
        await supabase.from('obra_zonas').update(data).eq('id', editingZona.id)
      } else {
        await supabase.from('obra_zonas').insert([data])
      }

      setShowZonaModal(false)
      resetZonaForm()
      fetchZonas()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar zona')
    }
  }

  const handleDeleteZona = async (zona) => {
    try {
      await supabase.from('obra_zonas').delete().eq('id', zona.id)
      setShowDeleteConfirm(null)
      fetchZonas()
    } catch (err) {
      alert('Erro ao eliminar')
    }
  }

  // CRUD Ocorrências
  const handleSaveOcorrencia = async () => {
    try {
      const data = {
        obra_id: obra.id,
        titulo: ocorrenciaForm.titulo,
        descricao: ocorrenciaForm.descricao,
        tipo: ocorrenciaForm.tipo,
        gravidade: ocorrenciaForm.gravidade,
        responsavel: ocorrenciaForm.responsavel || null,
        data_limite: ocorrenciaForm.data_limite || null,
        status: ocorrenciaForm.status,
        data_identificacao: new Date().toISOString()
      }

      if (editingOcorrencia) {
        await supabase.from('obra_ocorrencias').update(data).eq('id', editingOcorrencia.id)
      } else {
        await supabase.from('obra_ocorrencias').insert([data])
      }

      setShowOcorrenciaModal(false)
      resetOcorrenciaForm()
      fetchOcorrencias()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar ocorrência')
    }
  }

  const handleResolverOcorrencia = async (ocorrencia) => {
    try {
      await supabase.from('obra_ocorrencias')
        .update({ status: 'resolvida', data_resolucao: new Date().toISOString() })
        .eq('id', ocorrencia.id)
      fetchOcorrencias()
    } catch (err) {
      alert('Erro ao resolver')
    }
  }

  // CRUD Equipa
  const handleSaveEquipa = async () => {
    try {
      const data = {
        obra_id: obra.id,
        nome: equipaForm.nome,
        funcao: equipaForm.funcao,
        empresa: equipaForm.empresa || null,
        telefone: equipaForm.telefone || null,
        email: equipaForm.email || null,
        tipo: equipaForm.tipo,
        ativo: equipaForm.ativo
      }

      if (editingMembro) {
        await supabase.from('obra_equipa').update(data).eq('id', editingMembro.id)
      } else {
        await supabase.from('obra_equipa').insert([data])
      }

      setShowEquipaModal(false)
      resetEquipaForm()
      fetchEquipa()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar membro')
    }
  }

  const handleRemoveMembro = async (membro) => {
    try {
      await supabase.from('obra_equipa').update({ ativo: false }).eq('id', membro.id)
      setShowDeleteConfirm(null)
      fetchEquipa()
    } catch (err) {
      alert('Erro ao remover')
    }
  }

  // Reset forms
  const resetDiarioForm = () => {
    setDiarioForm({ condicoes_meteo: 'Bom', trabalhadores_gavinho: '', trabalhadores_subempreiteiros: '', horas_trabalhadas: '8', resumo: '', trabalhos_realizados: '', trabalhos_previstos_amanha: '', problemas: '', fotos: [] })
    setEditingDiario(null)
  }

  const resetZonaForm = () => {
    setZonaForm({ nome: '', piso: '', tipo: 'Divisão', area_m2: '', progresso: 0, notas: '' })
    setEditingZona(null)
  }

  const resetOcorrenciaForm = () => {
    setOcorrenciaForm({ titulo: '', descricao: '', tipo: 'Problema', gravidade: 'Média', responsavel: '', data_limite: '', status: 'aberta' })
    setEditingOcorrencia(null)
  }

  const resetEquipaForm = () => {
    setEquipaForm({ nome: '', funcao: '', empresa: '', telefone: '', email: '', tipo: 'subempreiteiro', ativo: true })
    setEditingMembro(null)
  }

  // Edit handlers
  const handleEditDiario = (d) => {
    setEditingDiario(d)
    setDiarioForm({ condicoes_meteo: d.condicoes_meteo || 'Bom', trabalhadores_gavinho: d.trabalhadores_gavinho || '', trabalhadores_subempreiteiros: d.trabalhadores_subempreiteiros || '', horas_trabalhadas: d.horas_trabalhadas || '8', resumo: d.resumo || '', trabalhos_realizados: d.trabalhos_realizados || '', trabalhos_previstos_amanha: d.trabalhos_previstos_amanha || '', problemas: d.problemas || '', fotos: d.fotos || [] })
    setShowDiarioModal(true)
  }

  const handleEditZona = (z) => {
    setEditingZona(z)
    setZonaForm({ nome: z.nome || '', piso: z.piso || '', tipo: z.tipo || 'Divisão', area_m2: z.area_m2 || '', progresso: z.progresso || 0, notas: z.notas || '' })
    setShowZonaModal(true)
  }

  const handleEditOcorrencia = (o) => {
    setEditingOcorrencia(o)
    setOcorrenciaForm({ titulo: o.titulo || '', descricao: o.descricao || '', tipo: o.tipo || 'Problema', gravidade: o.gravidade || 'Média', responsavel: o.responsavel || '', data_limite: o.data_limite || '', status: o.status || 'aberta' })
    setShowOcorrenciaModal(true)
  }

  const handleEditMembro = (m) => {
    setEditingMembro(m)
    setEquipaForm({ nome: m.nome || '', funcao: m.funcao || '', empresa: m.empresa || '', telefone: m.telefone || '', email: m.email || '', tipo: m.tipo || 'subempreiteiro', ativo: m.ativo })
    setShowEquipaModal(true)
  }

  // Helpers
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const formatShortDate = (d) => d ? new Date(d).toLocaleDateString('pt-PT') : '-'
  
  const getWeatherIcon = (w) => {
    switch (w) {
      case 'Bom': return <Sun size={14} style={{ color: '#C9A882' }} />
      case 'Nublado': return <Cloud size={14} style={{ color: '#8A9EB8' }} />
      case 'Chuva': return <CloudRain size={14} style={{ color: '#6B8CAE' }} />
      case 'Vento': return <Wind size={14} style={{ color: '#7A9E7A' }} />
      default: return <Thermometer size={14} />
    }
  }

  const getGravidadeColor = (g) => {
    switch (g) {
      case 'Baixa': return 'var(--info)'
      case 'Média': return 'var(--warning)'
      case 'Alta': return 'var(--error)'
      case 'Crítica': return '#8B0000'
      default: return 'var(--brown-light)'
    }
  }

  const getStatusColor = (s) => {
    switch (s) {
      case 'ativo': return 'success'
      case 'planeamento': return 'info'
      case 'pausado': return 'warning'
      case 'concluido': return 'beige'
      default: return 'beige'
    }
  }

  // Stats
  const progressoMedioZonas = zonas.length > 0 ? Math.round(zonas.reduce((sum, z) => sum + (z.progresso || 0), 0) / zonas.length) : 0
  const ocorrenciasAbertas = ocorrencias.filter(o => o.status !== 'resolvida').length
  const equipaAtiva = equipa.filter(e => e.ativo).length

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!obra) {
    return (
      <div className="fade-in">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <AlertTriangle size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
          <h2>Obra não encontrada</h2>
          <p style={{ color: 'var(--brown-light)' }}>O código "{id}" não existe.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/obras')}>
            <ArrowLeft size={16} /> Voltar às Obras
          </button>
        </div>
      </div>
    )
  }

  // Design tokens
  const colors = {
    primary: '#8B8670',
    primaryLight: '#ADAA96',
    background: '#F2F0E7',
    white: '#FFFFFF',
    text: '#3D3D3D',
    textMuted: '#6B6B6B',
    border: '#E5E5E5',
    success: '#7A8B6E',
    warning: '#C9A86C',
    progressBg: '#E8E6DE'
  }

  return (
    <div style={{
      fontFamily: "'Quattrocento Sans', -apple-system, sans-serif",
      minHeight: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '20px',
        marginBottom: '28px',
        padding: '24px',
        background: colors.white,
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <button
          onClick={() => navigate(-1)}
          title="Voltar"
          style={{
            padding: '10px',
            background: colors.background,
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              fontWeight: 700,
              color: colors.success,
              fontSize: '13px',
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
                style={{
                  cursor: 'pointer',
                  background: colors.background,
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: colors.primary
                }}
              >
                {obra.projetos.codigo}
              </button>
            )}
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: obra.status === 'ativo' || obra.status === 'em_curso' ? '#E8F5E9' :
                         obra.status === 'planeamento' ? '#FFF8E1' :
                         obra.status === 'pausado' ? '#FFEBEE' : '#E3F2FD',
              color: obra.status === 'ativo' || obra.status === 'em_curso' ? '#2E7D32' :
                    obra.status === 'planeamento' ? '#F57F17' :
                    obra.status === 'pausado' ? '#C62828' : '#1565C0'
            }}>
              {obra.status === 'ativo' || obra.status === 'em_curso' ? 'Em Curso' :
               obra.status === 'planeamento' ? 'Planeamento' :
               obra.status === 'pausado' ? 'Pausada' :
               obra.status === 'concluido' ? 'Concluída' : obra.status}
            </span>
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            color: colors.text,
            margin: '0 0 4px 0',
            fontFamily: "'Cormorant Garamond', serif"
          }}>
            {obra.nome}
          </h1>
          {obra.projetos?.cliente_nome && (
            <p style={{
              color: colors.textMuted,
              fontSize: '14px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Users size={14} />
              {obra.projetos.cliente_nome}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(`/obras/${obra.id}/comunicacoes`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: colors.white,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            color: colors.text,
            cursor: 'pointer'
          }}
        >
          <MessageSquare size={16} />
          Comunicações
        </button>
      </div>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Localização */}
        <div style={{
          padding: '20px',
          background: colors.white,
          borderRadius: '14px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <div style={{
              padding: '8px',
              background: colors.background,
              borderRadius: '8px'
            }}>
              <MapPin size={16} style={{ color: colors.primary }} />
            </div>
            <span style={{
              fontSize: '12px',
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 500
            }}>
              Localização
            </span>
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: colors.text
          }}>
            {obra.localizacao || 'Não definida'}
          </div>
        </div>

        {/* Prazo */}
        <div style={{
          padding: '20px',
          background: colors.white,
          borderRadius: '14px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <div style={{
              padding: '8px',
              background: colors.background,
              borderRadius: '8px'
            }}>
              <Calendar size={16} style={{ color: colors.primary }} />
            </div>
            <span style={{
              fontSize: '12px',
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 500
            }}>
              Prazo
            </span>
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: colors.text
          }}>
            {formatShortDate(obra.data_prevista) || '-'}
          </div>
        </div>

        {/* Equipa */}
        <div style={{
          padding: '20px',
          background: colors.white,
          borderRadius: '14px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <div style={{
              padding: '8px',
              background: colors.background,
              borderRadius: '8px'
            }}>
              <Users size={16} style={{ color: colors.primary }} />
            </div>
            <span style={{
              fontSize: '12px',
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 500
            }}>
              Equipa
            </span>
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: colors.text
          }}>
            {equipaAtiva} membros ativos
          </div>
        </div>

        {/* Progresso */}
        <div style={{
          padding: '20px',
          background: colors.white,
          borderRadius: '14px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <div style={{
              padding: '8px',
              background: colors.background,
              borderRadius: '8px'
            }}>
              <Building2 size={16} style={{ color: colors.primary }} />
            </div>
            <span style={{
              fontSize: '12px',
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 500
            }}>
              Progresso
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              flex: 1,
              height: '8px',
              background: colors.progressBg,
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${obra.progresso || 0}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.success} 0%, #9CB88F 100%)`,
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: colors.success
            }}>
              {obra.progresso || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Grouped Tabs */}
      <div style={{ marginBottom: '28px' }}>
        {tabGroups.map((group) => {
          const GroupIcon = group.icon
          const isExpanded = expandedGroups.includes(group.id)
          const hasActiveTab = group.tabs.some(t => t.id === activeTab)

          return (
            <div key={group.id} style={{ marginBottom: '12px' }}>
              {/* Group Header */}
              <button
                onClick={() => setExpandedGroups(prev =>
                  prev.includes(group.id)
                    ? prev.filter(g => g !== group.id)
                    : [...prev, group.id]
                )}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '14px 16px',
                  background: hasActiveTab ? colors.white : colors.background,
                  border: hasActiveTab ? `1px solid ${colors.border}` : 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: hasActiveTab ? colors.text : colors.textMuted,
                  transition: 'all 0.2s'
                }}
              >
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <GroupIcon size={18} />
                <span style={{ flex: 1, textAlign: 'left' }}>{group.label}</span>
                {hasActiveTab && (
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colors.success
                  }} />
                )}
              </button>

              {/* Group Tabs */}
              {isExpanded && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '12px',
                  paddingLeft: '28px'
                }}>
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    const count = tab.id === 'zonas' ? zonas.length :
                                  tab.id === 'diario' ? diarios.length :
                                  tab.id === 'ocorrencias' ? ocorrenciasAbertas :
                                  tab.id === 'equipa' ? equipaAtiva : 0

                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          background: isActive ? colors.primary : colors.white,
                          border: `1px solid ${isActive ? colors.primary : colors.border}`,
                          borderRadius: '10px',
                          color: isActive ? colors.white : colors.textMuted,
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 2px 8px rgba(139,134,112,0.25)' : 'none'
                        }}
                      >
                        <Icon size={15} />
                        {tab.label}
                        {count > 0 && (
                          <span style={{
                            background: isActive ? 'rgba(255,255,255,0.25)' : colors.background,
                            color: isActive ? colors.white : colors.text,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* TAB: Tracking */}
      {activeTab === 'tracking' && (
        <ObraTracking obra={obra} />
      )}

      {/* TAB: Projeto em Execução */}
      {activeTab === 'projeto-execucao' && (
        <ObraProjetoExecucao obra={obra} />
      )}

      {/* TAB: Orçamentação */}
      {activeTab === 'orcamentacao' && (
        <ObraOrcamentacao obra={obra} />
      )}

      {/* TAB: Compras (placeholder) */}
      {activeTab === 'compras' && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <ShoppingCart size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Compras</h3>
          <p style={{ color: 'var(--brown-light)', margin: 0 }}>Módulo de gestão de compras em desenvolvimento</p>
        </div>
      )}

      {/* TAB: Controle Executado (placeholder) */}
      {activeTab === 'controle-executado' && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <TrendingUp size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Controle Executado</h3>
          <p style={{ color: 'var(--brown-light)', margin: 0 }}>Módulo de controle de execução em desenvolvimento</p>
        </div>
      )}

      {/* TAB: Contratos/Componentes */}
      {activeTab === 'componentes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Contratos de Obra</h2>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
                Componentes de faturação separados por entidade
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => {
              setEditingComponente(null)
              setComponenteForm({
                tipo: 'construcao',
                nome: 'Construção',
                entidade_faturacao_id: '',
                valor_contrato: '',
                percentagem_adiantamento: 20,
                percentagem_retencao: 5,
                notas: ''
              })
              setShowComponenteModal(true)
            }}>
              <Plus size={16} /> Novo Contrato
            </button>
          </div>

          {componentes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <Building2 size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ color: 'var(--brown-light)', marginBottom: '16px' }}>Sem contratos definidos</p>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', maxWidth: '400px', margin: '0 auto' }}>
                Adicione os componentes de obra: Construção (Gavinho & Associados) e Design de Interiores (Gavinho Arquitetura e Interiores)
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {componentes.map((comp) => (
                <div key={comp.id} className="card" style={{ 
                  borderLeft: `4px solid ${comp.tipo === 'construcao' ? '#f59e0b' : '#8b5cf6'}`,
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: comp.tipo === 'construcao' ? '#fef3c7' : '#ede9fe',
                        color: comp.tipo === 'construcao' ? '#92400e' : '#6d28d9',
                        marginBottom: '8px'
                      }}>
                        {comp.tipo === 'construcao' ? 'CONSTRUÇÃO' : 'DESIGN INTERIORES'}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px' }}>{comp.nome}</h3>
                      <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: 0 }}>
                        {comp.entidades_faturacao?.nome || 'Entidade não definida'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleEditComponente(comp)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" style={{ color: '#dc2626' }} onClick={() => handleDeleteComponente(comp.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>Valor Contrato</div>
                      <div style={{ fontSize: '18px', fontWeight: 600 }}>
                        {comp.valor_contrato?.toLocaleString('pt-PT')} €
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>Adiantamento</div>
                      <div style={{ fontSize: '18px', fontWeight: 600 }}>{comp.percentagem_adiantamento}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>Retenção</div>
                      <div style={{ fontSize: '18px', fontWeight: 600 }}>{comp.percentagem_retencao}%</div>
                    </div>
                  </div>

                  {comp.notas && (
                    <div style={{ fontSize: '13px', color: 'var(--brown-light)', padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
                      {comp.notas}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Resumo total */}
          {componentes.length > 0 && (
            <div className="card" style={{ marginTop: '24px', background: 'var(--cream)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Valor Total da Obra</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>
                    {componentes.reduce((sum, c) => sum + (c.valor_contrato || 0), 0).toLocaleString('pt-PT')} €
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>{componentes.length} contratos</div>
                  <div style={{ fontSize: '13px' }}>
                    {componentes.filter(c => c.tipo === 'construcao').length} construção • {componentes.filter(c => c.tipo === 'design_interiores').length} design
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Autos de Medição */}
      {activeTab === 'autos' && (
        <ObraAutos obra={obra} />
      )}

      {/* TAB: Diário */}
      {activeTab === 'diario' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Diário de Obra</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => navigate(`/obras/${obra.codigo}/relatorio-semanal`)}>
                <FileText size={16} /> Relatório Semanal
              </button>
              <button className="btn btn-primary" onClick={() => navigate(`/obras/${obra.id}/diario`)}>
                <Plus size={16} /> Novo Registo
              </button>
            </div>
          </div>

          {diarios.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <BookOpen size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ color: 'var(--brown-light)' }}>Sem registos no diário</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {diarios.map((d) => (
                <div key={d.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{formatDate(d.data)}</div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{getWeatherIcon(d.condicoes_meteo)} {d.condicoes_meteo}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {(d.trabalhadores_gavinho || 0) + (d.trabalhadores_subempreiteiros || 0)} pessoas</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {d.horas_trabalhadas || 8}h</span>
                        {d.fotos && d.fotos.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Camera size={12} /> {d.fotos.length} fotos</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-icon" title="Exportar PDF" onClick={() => exportDiarioToPDF(d, obra, { equipa })}><Download size={14} /></button>
                      <button className="btn btn-ghost btn-icon" onClick={() => navigate(`/obras/${obra.id}/diario?data=${d.data}`)}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteConfirm({ type: 'diario', item: d })}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {d.resumo && <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>{d.resumo}</p>}
                  
                  {/* Fotos do dia */}
                  {d.fotos && d.fotos.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '12px' }}>
                      {d.fotos.slice(0, 6).map((foto, idx) => (
                        <div key={idx} style={{ paddingTop: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden', background: 'var(--stone)' }}>
                          <img src={foto.url} alt={foto.nome} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          {idx === 5 && d.fotos.length > 6 && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                              +{d.fotos.length - 6}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {d.trabalhos_realizados && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Trabalhos Realizados</div>
                        <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{d.trabalhos_realizados}</div>
                      </div>
                    )}
                    {d.trabalhos_previstos_amanha && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Previstos Amanhã</div>
                        <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{d.trabalhos_previstos_amanha}</div>
                      </div>
                    )}
                  </div>
                  {d.problemas && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(184, 138, 138, 0.1)', borderRadius: '8px', borderLeft: '3px solid var(--error)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--error)', marginBottom: '4px' }}><AlertTriangle size={12} /> PROBLEMAS</div>
                      <div style={{ fontSize: '13px' }}>{d.problemas}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Diário de Projeto */}
      {activeTab === 'diario-projeto' && (
        <DiarioObraProjeto obra={obra} />
      )}

      {/* TAB: Fotografias */}
      {activeTab === 'fotografias' && (
        <ObraFotografias obra={obra} />
      )}

      {/* TAB: Relatórios Obra */}
      {activeTab === 'relatorios' && (
        <ObraRelatorios obra={obra} />
      )}

      {/* TAB: Não Conformidades */}
      {activeTab === 'nao-conformidades' && (
        <ObraNaoConformidades obra={obra} />
      )}

      {/* TAB: HSO (placeholder) */}
      {activeTab === 'hso' && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>HSO - Higiene e Segurança</h3>
          <p style={{ color: 'var(--brown-light)', margin: 0 }}>Módulo de HSO em desenvolvimento</p>
        </div>
      )}

      {/* TAB: SubEmpreiteiros (placeholder) */}
      {activeTab === 'subempreiteiros' && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Truck size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>SubEmpreiteiros</h3>
          <p style={{ color: 'var(--brown-light)', margin: 0 }}>Módulo de gestão de subempreiteiros em desenvolvimento</p>
        </div>
      )}

      {/* TAB: Zonas */}
      {activeTab === 'zonas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Zonas da Obra</h2>
              <p style={{ color: 'var(--brown-light)', fontSize: '13px', margin: 0 }}>Progresso médio: {progressoMedioZonas}%</p>
            </div>
            <button className="btn btn-primary" onClick={() => { resetZonaForm(); setShowZonaModal(true) }}>
              <Plus size={16} /> Nova Zona
            </button>
          </div>

          {zonas.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <Grid3X3 size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ color: 'var(--brown-light)' }}>Sem zonas definidas</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {zonas.map((z) => (
                <div key={z.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{z.nome}</div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{z.piso && `${z.piso} • `}{z.tipo}{z.area_m2 && ` • ${z.area_m2}m²`}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleEditZona(z)}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteConfirm({ type: 'zona', item: z })}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, height: '8px', background: 'var(--stone)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${z.progresso || 0}%`, height: '100%', background: z.progresso >= 100 ? 'var(--success)' : 'var(--warning)', borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{z.progresso || 0}%</span>
                  </div>
                  {z.notas && <p style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '8px', marginBottom: 0 }}>{z.notas}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Equipa */}
      {activeTab === 'equipa' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Equipa em Obra</h2>
              <p style={{ color: 'var(--brown-light)', fontSize: '13px', margin: 0 }}>{equipaAtiva} membros ativos</p>
            </div>
            <button className="btn btn-primary" onClick={() => { resetEquipaForm(); setShowEquipaModal(true) }}>
              <UserPlus size={16} /> Adicionar Membro
            </button>
          </div>

          {equipa.filter(e => e.ativo).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <Users size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ color: 'var(--brown-light)' }}>Sem membros na equipa</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {equipa.filter(e => e.ativo).map((m) => (
                <div key={m.id} className="card" style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: m.tipo === 'interno' ? 'linear-gradient(135deg, var(--warning), #B8956E)' : 'linear-gradient(135deg, var(--blush), var(--blush-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '16px', flexShrink: 0 }}>
                    {m.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{m.nome}</div>
                        <div style={{ fontSize: '13px', color: 'var(--warning)' }}>{m.funcao}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleEditMembro(m)}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteConfirm({ type: 'equipa', item: m })}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--brown-light)' }}>
                      {m.empresa && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={12} /> {m.empresa}</div>}
                      {m.telefone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {m.telefone}</div>}
                      {m.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {m.email}</div>}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: m.tipo === 'interno' ? 'rgba(201, 168, 130, 0.2)' : 'var(--stone)', color: m.tipo === 'interno' ? 'var(--warning)' : 'var(--brown)' }}>
                        {m.tipo === 'interno' ? 'GAVINHO' : 'Subempreiteiro'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Ocorrências */}
      {activeTab === 'ocorrencias' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Ocorrências</h2>
              <p style={{ color: 'var(--brown-light)', fontSize: '13px', margin: 0 }}>{ocorrenciasAbertas} abertas</p>
            </div>
            <button className="btn btn-primary" onClick={() => { resetOcorrenciaForm(); setShowOcorrenciaModal(true) }}>
              <Plus size={16} /> Nova Ocorrência
            </button>
          </div>

          {ocorrencias.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <AlertTriangle size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ color: 'var(--brown-light)' }}>Sem ocorrências registadas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ocorrencias.map((o) => (
                <div key={o.id} className="card" style={{ borderLeft: `4px solid ${getGravidadeColor(o.gravidade)}`, opacity: o.status === 'resolvida' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{o.titulo}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: `${getGravidadeColor(o.gravidade)}20`, color: getGravidadeColor(o.gravidade) }}>{o.gravidade}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: o.status === 'resolvida' ? 'rgba(122, 158, 122, 0.2)' : 'var(--stone)', color: o.status === 'resolvida' ? 'var(--success)' : 'var(--brown)' }}>{o.status === 'resolvida' ? 'Resolvida' : 'Aberta'}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '8px 0' }}>{o.descricao}</p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                        <span>{o.tipo}</span>
                        {o.responsavel && <span>Resp: {o.responsavel}</span>}
                        {o.data_limite && <span>Prazo: {formatShortDate(o.data_limite)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {o.status !== 'resolvida' && (
                        <button className="btn btn-ghost btn-icon" onClick={() => handleResolverOcorrencia(o)} title="Marcar como resolvida"><CheckCircle2 size={14} /></button>
                      )}
                      <button className="btn btn-ghost btn-icon" onClick={() => handleEditOcorrencia(o)}><Edit size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Diário */}
      {showDiarioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDiarioModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{editingDiario ? 'Editar Registo' : 'Novo Registo de Obra'}</h2>
              <button onClick={() => setShowDiarioModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Condições Meteo</label>
                  <select value={diarioForm.condicoes_meteo} onChange={e => setDiarioForm({...diarioForm, condicoes_meteo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}>
                    {CONDICOES_METEO.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Trab. GAVINHO</label>
                  <input type="number" value={diarioForm.trabalhadores_gavinho} onChange={e => setDiarioForm({...diarioForm, trabalhadores_gavinho: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Subempreiteiros</label>
                  <input type="number" value={diarioForm.trabalhadores_subempreiteiros} onChange={e => setDiarioForm({...diarioForm, trabalhadores_subempreiteiros: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Horas Trab.</label>
                  <input type="number" value={diarioForm.horas_trabalhadas} onChange={e => setDiarioForm({...diarioForm, horas_trabalhadas: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Resumo do Dia</label>
                <input type="text" value={diarioForm.resumo} onChange={e => setDiarioForm({...diarioForm, resumo: e.target.value})} placeholder="Breve resumo..." style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Trabalhos Realizados</label>
                <textarea value={diarioForm.trabalhos_realizados} onChange={e => setDiarioForm({...diarioForm, trabalhos_realizados: e.target.value})} rows={3} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Trabalhos Previstos Amanhã</label>
                <textarea value={diarioForm.trabalhos_previstos_amanha} onChange={e => setDiarioForm({...diarioForm, trabalhos_previstos_amanha: e.target.value})} rows={2} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Problemas / Incidentes</label>
                <textarea value={diarioForm.problemas} onChange={e => setDiarioForm({...diarioForm, problemas: e.target.value})} rows={2} placeholder="Se houve problemas..." style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              
              {/* Upload de Fotografias */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Fotografias</label>
                <div style={{ border: '2px dashed var(--stone)', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'var(--cream)' }} onClick={() => document.getElementById('foto-upload')?.click()}>
                  {uploadingFotos ? (
                    <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
                  ) : (
                    <>
                      <Camera size={24} style={{ color: 'var(--brown-light)', marginBottom: '8px' }} />
                      <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Clique para adicionar fotos</div>
                    </>
                  )}
                  <input id="foto-upload" type="file" accept="image/*" multiple onChange={handleFotoUpload} style={{ display: 'none' }} />
                </div>
                
                {/* Preview das fotos */}
                {diarioForm.fotos && diarioForm.fotos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
                    {diarioForm.fotos.map((foto, idx) => (
                      <div key={idx} style={{ position: 'relative', paddingTop: '100%', borderRadius: '8px', overflow: 'hidden', background: 'var(--stone)' }}>
                        <img src={foto.url} alt={foto.nome} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => removeFoto(idx)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <X size={14} style={{ color: 'white' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowDiarioModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveDiario} className="btn btn-primary">{editingDiario ? 'Guardar' : 'Criar Registo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Zona */}
      {showZonaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowZonaModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '450px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{editingZona ? 'Editar Zona' : 'Nova Zona'}</h2>
              <button onClick={() => setShowZonaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nome *</label>
                <input type="text" value={zonaForm.nome} onChange={e => setZonaForm({...zonaForm, nome: e.target.value})} placeholder="Ex: Sala de Estar" style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Piso</label>
                  <input type="text" value={zonaForm.piso} onChange={e => setZonaForm({...zonaForm, piso: e.target.value})} placeholder="Ex: Piso 0" style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tipo</label>
                  <select value={zonaForm.tipo} onChange={e => setZonaForm({...zonaForm, tipo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}>
                    {TIPOS_ZONA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Área (m²)</label>
                  <input type="number" value={zonaForm.area_m2} onChange={e => setZonaForm({...zonaForm, area_m2: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Progresso (%)</label>
                  <input type="number" min="0" max="100" value={zonaForm.progresso} onChange={e => setZonaForm({...zonaForm, progresso: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Notas</label>
                <textarea value={zonaForm.notas} onChange={e => setZonaForm({...zonaForm, notas: e.target.value})} rows={2} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowZonaModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveZona} className="btn btn-primary" disabled={!zonaForm.nome}>{editingZona ? 'Guardar' : 'Criar Zona'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Equipa */}
      {showEquipaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowEquipaModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '450px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{editingMembro ? 'Editar Membro' : 'Adicionar à Equipa'}</h2>
              <button onClick={() => setShowEquipaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nome *</label>
                <input type="text" value={equipaForm.nome} onChange={e => setEquipaForm({...equipaForm, nome: e.target.value})} placeholder="Nome completo" style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Função</label>
                  <select value={equipaForm.funcao} onChange={e => setEquipaForm({...equipaForm, funcao: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}>
                    <option value="">Selecionar...</option>
                    {FUNCOES_OBRA.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tipo</label>
                  <select value={equipaForm.tipo} onChange={e => setEquipaForm({...equipaForm, tipo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}>
                    <option value="interno">GAVINHO (Interno)</option>
                    <option value="subempreiteiro">Subempreiteiro</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Empresa</label>
                <input type="text" value={equipaForm.empresa} onChange={e => setEquipaForm({...equipaForm, empresa: e.target.value})} placeholder="Nome da empresa (se subempreiteiro)" style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Telefone</label>
                  <input type="tel" value={equipaForm.telefone} onChange={e => setEquipaForm({...equipaForm, telefone: e.target.value})} placeholder="+351..." style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
                  <input type="email" value={equipaForm.email} onChange={e => setEquipaForm({...equipaForm, email: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowEquipaModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveEquipa} className="btn btn-primary" disabled={!equipaForm.nome}>{editingMembro ? 'Guardar' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ocorrência */}
      {showOcorrenciaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowOcorrenciaModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '500px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{editingOcorrencia ? 'Editar Ocorrência' : 'Nova Ocorrência'}</h2>
              <button onClick={() => setShowOcorrenciaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Título *</label>
                <input type="text" value={ocorrenciaForm.titulo} onChange={e => setOcorrenciaForm({...ocorrenciaForm, titulo: e.target.value})} placeholder="Título da ocorrência" style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tipo</label>
                  <select value={ocorrenciaForm.tipo} onChange={e => setOcorrenciaForm({...ocorrenciaForm, tipo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}>
                    {TIPOS_OCORRENCIA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Gravidade</label>
                  <select value={ocorrenciaForm.gravidade} onChange={e => setOcorrenciaForm({...ocorrenciaForm, gravidade: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}>
                    {GRAVIDADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição</label>
                <textarea value={ocorrenciaForm.descricao} onChange={e => setOcorrenciaForm({...ocorrenciaForm, descricao: e.target.value})} rows={3} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Responsável</label>
                  <input type="text" value={ocorrenciaForm.responsavel} onChange={e => setOcorrenciaForm({...ocorrenciaForm, responsavel: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Data Limite</label>
                  <input type="date" value={ocorrenciaForm.data_limite} onChange={e => setOcorrenciaForm({...ocorrenciaForm, data_limite: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowOcorrenciaModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveOcorrencia} className="btn btn-primary" disabled={!ocorrenciaForm.titulo}>{editingOcorrencia ? 'Guardar' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Componente/Contrato */}
      {showComponenteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowComponenteModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                {editingComponente ? 'Editar Contrato' : 'Novo Contrato de Obra'}
              </h2>
              <button onClick={() => setShowComponenteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Tipo de Contrato</label>
                <select 
                  value={componenteForm.tipo} 
                  onChange={e => {
                    const tipo = e.target.value
                    const tipoInfo = TIPOS_COMPONENTE.find(t => t.value === tipo)
                    setComponenteForm({
                      ...componenteForm, 
                      tipo,
                      nome: tipoInfo?.label || componenteForm.nome
                    })
                  }} 
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}
                >
                  {TIPOS_COMPONENTE.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>
                  {TIPOS_COMPONENTE.find(t => t.value === componenteForm.tipo)?.entidade}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Nome do Contrato</label>
                <input 
                  type="text" 
                  value={componenteForm.nome} 
                  onChange={e => setComponenteForm({...componenteForm, nome: e.target.value})} 
                  placeholder="Ex: Construção Civil, Fit-Out Interiores..."
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Entidade de Faturação</label>
                <select 
                  value={componenteForm.entidade_faturacao_id} 
                  onChange={e => setComponenteForm({...componenteForm, entidade_faturacao_id: e.target.value})} 
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px' }}
                >
                  <option value="">Selecionar entidade...</option>
                  {entidadesFaturacao.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Valor do Contrato (€)</label>
                <input 
                  type="number" 
                  value={componenteForm.valor_contrato} 
                  onChange={e => setComponenteForm({...componenteForm, valor_contrato: e.target.value})} 
                  placeholder="0"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Adiantamento (%)</label>
                  <input 
                    type="number" 
                    value={componenteForm.percentagem_adiantamento} 
                    onChange={e => setComponenteForm({...componenteForm, percentagem_adiantamento: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Retenção (%)</label>
                  <input 
                    type="number" 
                    value={componenteForm.percentagem_retencao} 
                    onChange={e => setComponenteForm({...componenteForm, percentagem_retencao: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Notas</label>
                <textarea 
                  value={componenteForm.notas} 
                  onChange={e => setComponenteForm({...componenteForm, notas: e.target.value})} 
                  placeholder="Observações sobre o contrato..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--stone)', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical' }} 
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowComponenteModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveComponente} className="btn btn-primary">
                {editingComponente ? 'Guardar' : 'Criar Contrato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminação */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
              {showDeleteConfirm.type === 'equipa' ? 'Remover Membro' : 'Eliminar'}
            </h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '24px' }}>
              {showDeleteConfirm.type === 'equipa' 
                ? `Tem a certeza que deseja remover ${showDeleteConfirm.item.nome} da equipa?`
                : `Tem a certeza que deseja eliminar este registo?`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={() => {
                if (showDeleteConfirm.type === 'diario') handleDeleteDiario(showDeleteConfirm.item)
                else if (showDeleteConfirm.type === 'zona') handleDeleteZona(showDeleteConfirm.item)
                else if (showDeleteConfirm.type === 'equipa') handleRemoveMembro(showDeleteConfirm.item)
              }} style={{ padding: '10px 20px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                {showDeleteConfirm.type === 'equipa' ? 'Remover' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
