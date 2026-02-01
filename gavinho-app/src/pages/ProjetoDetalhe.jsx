import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Building2,
  FileText,
  Euro,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Download,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Layers,
  Target,
  TrendingUp,
  Receipt,
  CreditCard,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Share,
  Upload,
  X,
  Plus,
  File,
  ListChecks,
  FileCheck,
  Lock,
  Image,
  Library,
  Settings,
  Eye,
  BookOpen,
  Package,
  Send,
  Users,
  ClipboardList,
  Lightbulb,
  Palette,
  ImagePlus,
  FolderOpen,
  UserCircle,
  Inbox,
  FileSearch,
  Bold,
  Italic,
  Underline,
  List,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  MessageSquare,
  Link2,
  Type
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { jsPDF } from 'jspdf'
import ProjetoEntregaveis from '../components/ProjetoEntregaveis'
import ProjetoDocumentos from '../components/ProjetoDocumentos'
import CentralEntregas from '../components/CentralEntregas'
import DiarioBordo from '../components/DiarioBordo'
import DuvidasLog from '../components/DuvidasLog'
import ProjetoDecisoes from '../components/decisoes/ProjetoDecisoes'
import DesignReview from '../components/DesignReview'
import RecebidosEspecialidades from '../components/RecebidosEspecialidades'
import ViabilidadeModule from '../components/viabilidade/ViabilidadeModule'
import Moleskine from '../components/Moleskine'
import MoleskineDigital from '../components/MoleskineDigital'
import ProjetoChatIA from '../components/projeto/ProjetoChatIA'

// Importar dados de amostra e constantes de ficheiros separados
import { sampleProjectData, projectsMap } from '../data/sampleProjects'
import {
  COMPARTIMENTOS,
  TIPOLOGIAS,
  SUBTIPOS,
  FASES,
  STATUS_OPTIONS
} from '../constants/projectConstants'

// NOTA: sampleProjectData é usado apenas para demonstração
// Em produção, todos os dados devem vir da base de dados
// Definir como false para desativar sample data completamente
const useSampleData = false

export default function ProjetoDetalhe() {
  const { id, tab: urlTab, subtab: urlSubtab } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState(urlTab || 'dashboard')
  const [showActions, setShowActions] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [documents, setDocuments] = useState(null)
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  
  // Estados para edição de cliente e equipa
  const [clientes, setClientes] = useState([])
  const [utilizadores, setUtilizadores] = useState([])
  const [equipaProjeto, setEquipaProjeto] = useState([])
  const [intervenientes, setIntervenientes] = useState([])
  const [showEquipaModal, setShowEquipaModal] = useState(false)
  const [showIntervenienteModal, setShowIntervenienteModal] = useState(false)
  const [editingInterveniente, setEditingInterveniente] = useState(null)
  const [intervenienteForm, setIntervenienteForm] = useState({
    tipo: '',
    entidade: '',
    contacto_geral: '',
    responsavel_nome: '',
    responsavel_email: '',
    responsavel_secundario_nome: '',
    responsavel_secundario_email: ''
  })

  // Fases Contratuais
  const [fasesContratuais, setFasesContratuais] = useState([])
  const [showFaseModal, setShowFaseModal] = useState(false)
  const [editingFase, setEditingFase] = useState(null)
  const [faseForm, setFaseForm] = useState({
    numero: '',
    nome: '',
    data_inicio: '',
    num_dias: '',
    conclusao_prevista: '',
    data_entrega: '',
    estado: 'nao_iniciado',
    avaliacao: ''
  })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Escopo de Trabalho
  const [escopoTrabalho, setEscopoTrabalho] = useState('')
  const [editingEscopo, setEditingEscopo] = useState(false)
  const [savingEscopo, setSavingEscopo] = useState(false)
  const escopoEditorRef = useRef(null)

  // Sugestões IA do Escopo
  const [analisandoEscopo, setAnalisandoEscopo] = useState(false)
  const [sugestoesEscopo, setSugestoesEscopo] = useState(null)
  const [showSugestoesPanel, setShowSugestoesPanel] = useState(false)

  // Sub-tabs para Fases & Entregas
  const [activeFaseSection, setActiveFaseSection] = useState(urlSubtab || 'entregaveis')

  // Sub-tabs para Archviz
  const [activeArchvizSection, setActiveArchvizSection] = useState(urlSubtab || 'inspiracoes')

  // Sub-tabs para Gestão de Projeto
  const [activeGestaoSection, setActiveGestaoSection] = useState(urlSubtab || 'contratos')

  // Gestão de Renders/Archviz
  const [renders, setRenders] = useState([])
  const [showRenderModal, setShowRenderModal] = useState(false)
  const [editingRender, setEditingRender] = useState(null)
  const [lightboxImage, setLightboxImage] = useState(null) // Para lightbox
  const [moleskineRender, setMoleskineRender] = useState(null) // Para Moleskine (anotação de renders)
  const [showMoleskineDigital, setShowMoleskineDigital] = useState(false) // Para Moleskine Digital (caderno independente)
  const [renderAnnotations, setRenderAnnotations] = useState({}) // Mapa de render_id -> annotation count
  const [isDragging, setIsDragging] = useState(false) // Para drag & drop
  const [renderForm, setRenderForm] = useState({
    compartimento: '',
    versao: 1,
    descricao: '',
    is_final: false,
    imagem_url: '',
    data_upload: new Date().toISOString().split('T')[0]
  })

  // CONSTANTES agora importadas de ../constants/projectConstants.js:
  // COMPARTIMENTOS, TIPOLOGIAS, SUBTIPOS, FASES, STATUS_OPTIONS

  // Abrir modal de edição
  const openEditModal = () => {
    if (!project) return
    setEditForm({
      nome: project.nome || '',
      tipologia: project.tipologia || 'Residencial',
      subtipo: project.subtipo || '',
      fase: project.fase || 'Conceito',
      status: project.status || 'on_track',
      progresso: project.progresso || 0,
      cliente_id: project.cliente_id || '',
      localizacao: typeof project.localizacao === 'string' 
        ? project.localizacao 
        : (project.localizacao?.morada || project.morada || ''),
      cidade: project.localizacao?.cidade || project.cidade || '',
      pais: project.localizacao?.pais || project.pais || 'Portugal',
      area_bruta: project.area_bruta || '',
      area_exterior: project.area_exterior || '',
      data_inicio: project.datas?.data_inicio || project.data_inicio || '',
      data_prevista: project.datas?.data_prevista || project.data_prevista || '',
      orcamento_atual: project.orcamento?.valor_total || project.orcamento_atual || '',
      notas: project.notas || ''
    })
    if (project.id) fetchEquipaProjeto(project.id)
    setShowEditModal(true)
  }

  // Guardar alterações
  const handleSaveProject = async () => {
    if (!project) return
    setSaving(true)
    
    try {
      const updateData = {
        nome: editForm.nome,
        tipologia: editForm.tipologia,
        subtipo: editForm.subtipo,
        fase: editForm.fase,
        status: editForm.status,
        cliente_id: editForm.cliente_id || null,
        morada: editForm.localizacao || null,
        cidade: editForm.cidade || null,
        pais: editForm.pais || null,
        area_bruta: parseFloat(editForm.area_bruta) || null,
        area_exterior: parseFloat(editForm.area_exterior) || null,
        data_inicio: editForm.data_inicio || null,
        data_prevista: editForm.data_prevista || null,
        orcamento_atual: parseFloat(editForm.orcamento_atual) || null,
        notas: editForm.notas || null
      }

      const { error } = await supabase
        .from('projetos')
        .update(updateData)
        .eq('codigo', project.codigo)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Buscar dados do novo cliente se mudou
      let clienteAtualizado = project.cliente
      if (editForm.cliente_id && editForm.cliente_id !== project.cliente_id) {
        const clienteSelecionado = clientes.find(c => c.id === editForm.cliente_id)
        if (clienteSelecionado) {
          clienteAtualizado = {
            codigo: clienteSelecionado.codigo,
            nome: clienteSelecionado.nome
          }
        }
      }

      // Atualizar estado local
      setProject(prev => ({
        ...prev,
        ...updateData,
        cliente_id: editForm.cliente_id,
        cliente: clienteAtualizado,
        localizacao: {
          ...prev.localizacao,
          morada: editForm.localizacao,
          cidade: editForm.cidade,
          pais: editForm.pais
        },
        datas: {
          ...prev.datas,
          data_inicio: editForm.data_inicio,
          data_prevista: editForm.data_prevista
        }
      }))

      setShowEditModal(false)
      alert('Projeto atualizado com sucesso!')
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert(`Erro ao guardar: ${err.message || JSON.stringify(err)}`)
    }
    
    setSaving(false)
  }

  // Sincronizar tab e subtab da URL com estado
  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab)
    }
    if (urlSubtab) {
      // Definir o subtab correto baseado no tab ativo
      if (urlTab === 'fases') {
        setActiveFaseSection(urlSubtab)
      } else if (urlTab === 'archviz') {
        setActiveArchvizSection(urlSubtab)
      } else if (urlTab === 'gestao') {
        setActiveGestaoSection(urlSubtab)
      }
    }
  }, [urlTab, urlSubtab])

  // Carregar clientes e utilizadores para edição
  useEffect(() => {
    const fetchClientesUtilizadores = async () => {
      try {
        const [clientesRes, utilizadoresRes] = await Promise.all([
          supabase.from('clientes').select('id, nome, codigo').eq('ativo', true).order('nome'),
          supabase.from('utilizadores').select('id, nome, cargo, departamento, avatar_url').eq('ativo', true).order('nome')
        ])
        setClientes(clientesRes.data || [])
        setUtilizadores(utilizadoresRes.data || [])
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      }
    }
    fetchClientesUtilizadores()
  }, [])

  // Carregar equipa do projeto
  const fetchEquipaProjeto = async (projetoId) => {
    try {
      const { data } = await supabase
        .from('projeto_equipa')
        .select('*, utilizadores(id, nome, cargo, departamento, avatar_url)')
        .eq('projeto_id', projetoId)
      setEquipaProjeto(data || [])
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
    }
  }

  // Adicionar membro à equipa
  const handleAddMembro = async (utilizadorId, funcao) => {
    if (!project?.id) return
    try {
      const { error } = await supabase
        .from('projeto_equipa')
        .insert({
          projeto_id: project.id,
          utilizador_id: utilizadorId,
          funcao: funcao || 'Membro'
        })
      if (error) throw error
      fetchEquipaProjeto(project.id)
    } catch (err) {
      console.error('Erro ao adicionar membro:', err)
      alert(`Erro: ${err.message}`)
    }
  }

  // Remover membro da equipa
  const handleRemoveMembro = async (membroId) => {
    if (!confirm('Remover este membro da equipa?')) return
    try {
      const { error } = await supabase
        .from('projeto_equipa')
        .delete()
        .eq('id', membroId)
      if (error) throw error
      fetchEquipaProjeto(project.id)
    } catch (err) {
      console.error('Erro ao remover:', err)
    }
  }

  // Tipos de intervenientes
  const TIPOS_INTERVENIENTES = [
    'Dono de Obra',
    'Cliente',
    'Representante Dono de Obra',
    'Autor Licenciamento Arquitectura',
    'Arquitectura Paisagista',
    'Especialidade Estruturas',
    'Especialidades',
    'Especialidade Acústica',
    'Especialidade Térmica',
    'Especialidade Segurança',
    'Outro'
  ]

  // Carregar intervenientes do projeto
  const fetchIntervenientes = async (projetoId) => {
    try {
      const { data } = await supabase
        .from('projeto_intervenientes')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('created_at')
      setIntervenientes(data || [])
    } catch (err) {
      console.error('Erro ao carregar intervenientes:', err)
    }
  }

  // Adicionar/Editar interveniente
  const handleSaveInterveniente = async () => {
    if (!project?.id || !intervenienteForm.tipo) return
    try {
      if (editingInterveniente) {
        const { error } = await supabase
          .from('projeto_intervenientes')
          .update({
            tipo: intervenienteForm.tipo,
            entidade: intervenienteForm.entidade,
            contacto_geral: intervenienteForm.contacto_geral,
            responsavel_nome: intervenienteForm.responsavel_nome,
            responsavel_email: intervenienteForm.responsavel_email,
            responsavel_secundario_nome: intervenienteForm.responsavel_secundario_nome,
            responsavel_secundario_email: intervenienteForm.responsavel_secundario_email
          })
          .eq('id', editingInterveniente.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projeto_intervenientes')
          .insert({
            projeto_id: project.id,
            tipo: intervenienteForm.tipo,
            entidade: intervenienteForm.entidade,
            contacto_geral: intervenienteForm.contacto_geral,
            responsavel_nome: intervenienteForm.responsavel_nome,
            responsavel_email: intervenienteForm.responsavel_email,
            responsavel_secundario_nome: intervenienteForm.responsavel_secundario_nome,
            responsavel_secundario_email: intervenienteForm.responsavel_secundario_email
          })
        if (error) throw error
      }
      fetchIntervenientes(project.id)
      setShowIntervenienteModal(false)
      setEditingInterveniente(null)
      setIntervenienteForm({
        tipo: '',
        entidade: '',
        contacto_geral: '',
        responsavel_nome: '',
        responsavel_email: '',
        responsavel_secundario_nome: '',
        responsavel_secundario_email: ''
      })
    } catch (err) {
      console.error('Erro ao salvar interveniente:', err)
      alert(`Erro: ${err.message}`)
    }
  }

  // Editar interveniente
  const handleEditInterveniente = (interveniente) => {
    setEditingInterveniente(interveniente)
    setIntervenienteForm({
      tipo: interveniente.tipo || '',
      entidade: interveniente.entidade || '',
      contacto_geral: interveniente.contacto_geral || '',
      responsavel_nome: interveniente.responsavel_nome || '',
      responsavel_email: interveniente.responsavel_email || '',
      responsavel_secundario_nome: interveniente.responsavel_secundario_nome || '',
      responsavel_secundario_email: interveniente.responsavel_secundario_email || ''
    })
    setShowIntervenienteModal(true)
  }

  // Remover interveniente
  const handleRemoveInterveniente = async (id) => {
    if (!confirm('Remover este interveniente?')) return
    try {
      const { error } = await supabase
        .from('projeto_intervenientes')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchIntervenientes(project.id)
    } catch (err) {
      console.error('Erro ao remover interveniente:', err)
    }
  }

  // Carregar fases contratuais
  const fetchFasesContratuais = async (projetoId) => {
    try {
      const { data } = await supabase
        .from('projeto_fases_contratuais')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('numero')
      setFasesContratuais(data || [])
    } catch (err) {
      console.error('Erro ao carregar fases:', err)
    }
  }

  // Salvar fase contratual
  const handleSaveFase = async () => {
    if (!project?.id || !faseForm.nome) return
    try {
      const faseData = {
        projeto_id: project.id,
        numero: parseInt(faseForm.numero) || 1,
        nome: faseForm.nome,
        data_inicio: faseForm.data_inicio || null,
        num_dias: faseForm.num_dias || null,
        conclusao_prevista: faseForm.conclusao_prevista || null,
        data_entrega: faseForm.data_entrega || null,
        estado: faseForm.estado,
        avaliacao: faseForm.avaliacao || null
      }

      if (editingFase) {
        const { error } = await supabase
          .from('projeto_fases_contratuais')
          .update(faseData)
          .eq('id', editingFase.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projeto_fases_contratuais')
          .insert(faseData)
        if (error) throw error
      }

      fetchFasesContratuais(project.id)
      setShowFaseModal(false)
      setEditingFase(null)
      setFaseForm({
        numero: '',
        nome: '',
        data_inicio: '',
        num_dias: '',
        conclusao_prevista: '',
        data_entrega: '',
        estado: 'nao_iniciado',
        avaliacao: ''
      })
    } catch (err) {
      console.error('Erro ao salvar fase:', err)
      alert(`Erro: ${err.message}`)
    }
  }

  // Editar fase
  const handleEditFase = (fase) => {
    setEditingFase(fase)
    setFaseForm({
      numero: fase.numero || '',
      nome: fase.nome || '',
      data_inicio: fase.data_inicio || '',
      num_dias: fase.num_dias || '',
      conclusao_prevista: fase.conclusao_prevista || '',
      data_entrega: fase.data_entrega || '',
      estado: fase.estado || 'nao_iniciado',
      avaliacao: fase.avaliacao || ''
    })
    setShowFaseModal(true)
  }

  // Atualizar estado da fase inline
  const handleUpdateFaseEstado = async (faseId, novoEstado) => {
    try {
      const { error } = await supabase
        .from('projeto_fases_contratuais')
        .update({ estado: novoEstado })
        .eq('id', faseId)
      if (error) throw error
      fetchFasesContratuais(project.id)
    } catch (err) {
      console.error('Erro ao atualizar estado:', err)
    }
  }

  // Atualizar avaliação inline
  const handleUpdateFaseAvaliacao = async (faseId, novaAvaliacao) => {
    try {
      const { error } = await supabase
        .from('projeto_fases_contratuais')
        .update({ avaliacao: novaAvaliacao })
        .eq('id', faseId)
      if (error) throw error
      fetchFasesContratuais(project.id)
    } catch (err) {
      console.error('Erro ao atualizar avaliação:', err)
    }
  }

  // Remover fase
  const handleRemoveFase = async (id) => {
    if (!confirm('Remover esta fase?')) return
    try {
      const { error } = await supabase
        .from('projeto_fases_contratuais')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchFasesContratuais(project.id)
    } catch (err) {
      console.error('Erro ao remover fase:', err)
    }
  }

  // Guardar escopo de trabalho
  const handleSaveEscopo = async () => {
    if (!project?.id) return
    setSavingEscopo(true)
    try {
      const content = escopoEditorRef.current?.innerHTML || escopoTrabalho
      const { error } = await supabase
        .from('projetos')
        .update({ escopo_trabalho: content })
        .eq('id', project.id)
      if (error) throw error
      setEscopoTrabalho(content)
      setProject(prev => ({ ...prev, escopo_trabalho: content }))
      setEditingEscopo(false)
    } catch (err) {
      console.error('Erro ao guardar escopo:', err)
      alert('Erro ao guardar escopo: ' + err.message)
    } finally {
      setSavingEscopo(false)
    }
  }

  // Funções de formatação do editor de escopo
  const formatEscopo = (command, value = null) => {
    document.execCommand(command, false, value)
    escopoEditorRef.current?.focus()
  }

  // Analisar escopo com IA
  const handleAnalisarEscopo = async () => {
    if (!escopoTrabalho || analisandoEscopo) return
    setAnalisandoEscopo(true)
    setSugestoesEscopo(null)

    try {
      // Extrair texto puro do HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = escopoTrabalho
      const textoPlano = tempDiv.textContent || tempDiv.innerText || ''

      const { data, error } = await supabase.functions.invoke('analisar-escopo', {
        body: {
          escopo_texto: textoPlano,
          projeto_nome: project?.nome || project?.codigo
        }
      })

      if (error) throw error

      if (data?.success && data?.sugestoes) {
        setSugestoesEscopo(data.sugestoes)
        setShowSugestoesPanel(true)
      } else {
        throw new Error(data?.error || 'Erro ao analisar escopo')
      }
    } catch (err) {
      console.error('Erro ao analisar escopo:', err)
      alert('Erro ao analisar escopo: ' + err.message)
    } finally {
      setAnalisandoEscopo(false)
    }
  }

  // Adicionar fase sugerida
  const handleAddSuggestedFase = async (fase) => {
    try {
      const { error } = await supabase
        .from('projeto_fases_contratuais')
        .insert({
          projeto_id: project.id,
          numero: fase.numero?.toString() || (fasesContratuais.length + 1).toString(),
          nome: fase.nome,
          estado: fase.estado_sugerido || 'nao_iniciado'
        })
      if (error) throw error
      fetchFasesContratuais(project.id)
      // Remover da lista de sugestões
      setSugestoesEscopo(prev => ({
        ...prev,
        fases: prev.fases.filter(f => f.nome !== fase.nome)
      }))
    } catch (err) {
      console.error('Erro ao adicionar fase:', err)
      alert('Erro ao adicionar fase: ' + err.message)
    }
  }

  // Carregar renders do projeto
  const fetchRenders = async (projetoId) => {
    try {
      const { data, error } = await supabase
        .from('projeto_renders')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('compartimento')
        .order('versao', { ascending: false })
      if (error) throw error
      setRenders(data || [])

      // Carregar anotações existentes
      const { data: annotationsData } = await supabase
        .from('render_annotations')
        .select('render_id, annotations')
        .eq('projeto_id', projetoId)

      if (annotationsData) {
        const annotationsMap = {}
        annotationsData.forEach(a => {
          annotationsMap[a.render_id] = a.annotations?.length || 0
        })
        setRenderAnnotations(annotationsMap)
      }
    } catch (err) {
      console.error('Erro ao carregar renders:', err)
    }
  }

  // Navegar para tab
  const handleTabChange = (tabId, subtab = null) => {
    const path = subtab ? `/projetos/${id}/${tabId}/${subtab}` : `/projetos/${id}/${tabId}`
    navigate(path)
    setActiveTab(tabId)
    if (subtab) {
      setActiveFaseSection(subtab)
    }
  }

  // Navegar para sub-tab (genérico para todos os tabs com subtabs)
  const handleSubtabChange = (subtabId, tabType = activeTab) => {
    navigate(`/projetos/${id}/${tabType}/${subtabId}`)
    if (tabType === 'fases') {
      setActiveFaseSection(subtabId)
    } else if (tabType === 'archviz') {
      setActiveArchvizSection(subtabId)
    } else if (tabType === 'gestao') {
      setActiveGestaoSection(subtabId)
    }
  }

  // Duplicar projeto
  const handleDuplicate = async () => {
    if (!project) return
    if (!confirm('Deseja duplicar este projeto?')) return

    try {
      // Gerar novo código
      const { data: lastProject } = await supabase
        .from('projetos')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(1)

      let nextNum = 1
      if (lastProject && lastProject.length > 0) {
        const match = lastProject[0].codigo.match(/GA(\d+)/)
        if (match) nextNum = parseInt(match[1]) + 1
      }
      const newCode = `GA${String(nextNum).padStart(5, '0')}`

      // Criar cópia do projeto
      const { error } = await supabase
        .from('projetos')
        .insert({
          codigo: newCode,
          nome: `${project.nome} (cópia)`,
          tipologia: project.tipologia,
          subtipo: project.subtipo,
          fase: 'Conceito',
          status: 'on_track',
          progresso: 0,
          cliente_id: project.cliente_id,
          morada: project.morada,
          cidade: project.cidade,
          pais: project.pais || 'Portugal',
          data_inicio: new Date().toISOString().split('T')[0]
        })

      if (error) throw error

      alert(`Projeto duplicado com sucesso! Novo código: ${newCode}`)
      navigate(`/projetos/${newCode}`)
    } catch (err) {
      console.error('Erro ao duplicar:', err)
      alert(`Erro ao duplicar: ${err.message}`)
    }
    setShowActions(false)
  }

  // Partilhar projeto
  const handleShare = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({
        title: `Projeto ${project?.codigo} - ${project?.nome}`,
        url: url
      })
    } else {
      navigator.clipboard.writeText(url)
      alert('Link copiado para a área de transferência!')
    }
    setShowActions(false)
  }

  // Exportar PDF
  const handleExportPDF = () => {
    if (!project) return

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 20

      // Cores
      const brown = [44, 44, 44]
      const brownLight = [139, 119, 101]
      const gray = [128, 128, 128]

      // Header
      doc.setFontSize(24)
      doc.setTextColor(...brown)
      doc.text('GAVINHO', 20, y)

      y += 15
      doc.setFontSize(10)
      doc.setTextColor(...gray)
      doc.text('Ficha de Projeto', 20, y)

      // Linha separadora
      y += 10
      doc.setDrawColor(...brownLight)
      doc.line(20, y, pageWidth - 20, y)

      // Informações principais
      y += 15
      doc.setFontSize(18)
      doc.setTextColor(...brown)
      doc.text(project.nome || 'Sem nome', 20, y)

      y += 8
      doc.setFontSize(11)
      doc.setTextColor(...brownLight)
      doc.text(`${project.codigo} | ${project.tipologia || ''} | ${project.fase || ''}`, 20, y)

      // Seção: Detalhes
      y += 20
      doc.setFontSize(12)
      doc.setTextColor(...brown)
      doc.text('DETALHES DO PROJETO', 20, y)

      y += 10
      doc.setFontSize(10)
      doc.setTextColor(...gray)

      const details = [
        ['Cliente:', project.cliente?.nome || project.cliente_nome || '-'],
        ['Localização:', `${project.cidade || ''}, ${project.pais || 'Portugal'}`],
        ['Morada:', project.morada || project.localizacao || '-'],
        ['Área Bruta:', project.area_bruta ? `${project.area_bruta} m²` : '-'],
        ['Área Exterior:', project.area_exterior ? `${project.area_exterior} m²` : '-'],
        ['Status:', project.status === 'on_track' ? 'No Prazo' : project.status === 'at_risk' ? 'Em Risco' : project.status || '-'],
        ['Progresso:', `${project.progresso || 0}%`]
      ]

      details.forEach(([label, value]) => {
        doc.setTextColor(...brown)
        doc.text(label, 20, y)
        doc.setTextColor(...gray)
        doc.text(String(value), 70, y)
        y += 7
      })

      // Seção: Datas
      y += 10
      doc.setFontSize(12)
      doc.setTextColor(...brown)
      doc.text('DATAS', 20, y)

      y += 10
      doc.setFontSize(10)

      const datas = [
        ['Data Início:', project.data_inicio || project.datas?.data_inicio || '-'],
        ['Previsão Conclusão:', project.data_prevista || project.datas?.data_prevista || '-']
      ]

      datas.forEach(([label, value]) => {
        doc.setTextColor(...brown)
        doc.text(label, 20, y)
        doc.setTextColor(...gray)
        doc.text(String(value), 70, y)
        y += 7
      })

      // Seção: Financeiro
      if (project.orcamento_atual || project.valor_contratado) {
        y += 10
        doc.setFontSize(12)
        doc.setTextColor(...brown)
        doc.text('FINANCEIRO', 20, y)

        y += 10
        doc.setFontSize(10)

        const formatCurrency = (val) => {
          if (!val) return '-'
          return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val)
        }

        const financeiro = [
          ['Orçamento:', formatCurrency(project.orcamento_atual)],
          ['Valor Contratado:', formatCurrency(project.valor_contratado)]
        ]

        financeiro.forEach(([label, value]) => {
          doc.setTextColor(...brown)
          doc.text(label, 20, y)
          doc.setTextColor(...gray)
          doc.text(String(value), 70, y)
          y += 7
        })
      }

      // Footer
      y = doc.internal.pageSize.getHeight() - 20
      doc.setFontSize(8)
      doc.setTextColor(...gray)
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-PT')} | GAVINHO Group`, 20, y)

      // Download
      doc.save(`Projeto_${project.codigo}_${project.nome?.replace(/\s+/g, '_') || 'export'}.pdf`)

    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar PDF: ' + err.message)
    }
    setShowActions(false)
  }

  // Eliminar projeto
  const handleDelete = async () => {
    setShowDeleteConfirm(true)
    setShowActions(false)
  }

  const confirmDelete = async () => {
    if (!project) return

    try {
      const { error } = await supabase
        .from('projetos')
        .delete()
        .eq('codigo', project.codigo)

      if (error) throw error

      alert('Projeto eliminado com sucesso!')
      navigate('/projetos')
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert(`Erro ao eliminar: ${err.message}. Verifique se não existem dados associados.`)
    }
    setShowDeleteConfirm(false)
  }

  // Buscar projeto do Supabase com dados relacionados
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        
        // Determinar código do projeto
        const projectCode = projectsMap[id] || id
        
        // Buscar projeto do Supabase
        const { data: projetoData, error: projetoError } = await supabase
          .from('projetos')
          .select('*')
          .eq('codigo', projectCode)
          .single()
        
        if (projetoError || !projetoData) {
          // Fallback para dados locais
          const localProject = sampleProjectData[projectCode] || sampleProjectData['GA00492']
          setProject(localProject)
          setLoading(false)
          return
        }
        
        // Buscar cliente
        let clienteData = null
        if (projetoData.cliente_id) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', projetoData.cliente_id)
            .single()
          clienteData = cliente
        }
        
        // Buscar dados relacionados com tratamento de erro (tabelas podem não existir)
        let servicosData = []
        let pagamentosData = []
        let faturasData = []
        let projetoEntregaveis = []
        let equipaData = []

        // Tentar buscar serviços do projeto (silenciar erro se tabela não existir)
        try {
          const { data, error } = await supabase
            .from('projeto_servicos')
            .select('*')
            .eq('projeto_id', projetoData.id)
            .order('ordem')
          if (!error) servicosData = data || []
        } catch (e) { /* tabela não existe */ }

        // Tentar buscar pagamentos
        try {
          const { data, error } = await supabase
            .from('projeto_pagamentos')
            .select('*')
            .eq('projeto_id', projetoData.id)
            .order('prestacao_numero')
          if (!error) pagamentosData = data || []
        } catch (e) { /* tabela não existe */ }

        // Tentar buscar faturas
        try {
          const { data, error } = await supabase
            .from('faturas')
            .select('*')
            .eq('projeto_id', projetoData.id)
            .order('data_emissao')
          if (!error) faturasData = data || []
        } catch (e) { /* tabela não existe */ }

        // Tentar buscar entregáveis do projeto
        try {
          const { data, error } = await supabase
            .from('projeto_entregaveis')
            .select('status')
            .eq('projeto_id', projetoData.id)
          if (!error) projetoEntregaveis = data || []
        } catch (e) { /* tabela não existe */ }

        // Tentar buscar equipa do projeto
        try {
          const { data, error } = await supabase
            .from('projeto_equipa')
            .select('*, utilizadores(id, nome, cargo, departamento, avatar_url)')
            .eq('projeto_id', projetoData.id)
          if (!error) equipaData = data || []
        } catch (e) { /* tabela não existe */ }

        setEquipaProjeto(equipaData)
        
        // Calcular progresso baseado nos entregáveis
        let progressoCalculado = projetoData.progresso || 0
        if (projetoEntregaveis && projetoEntregaveis.length > 0) {
          const total = projetoEntregaveis.length
          const concluidos = projetoEntregaveis.filter(e => 
            e.status === 'concluido' || e.status === 'aprovado'
          ).length
          progressoCalculado = Math.round((concluidos / total) * 100)
        }
        
        // Calcular financeiro
        const totalContratado = parseFloat(projetoData.orcamento_atual) || 0
        const totalPago = (pagamentosData || [])
          .filter(p => p.estado === 'pago')
          .reduce((sum, p) => sum + parseFloat(p.valor), 0)
        const totalFaturado = (faturasData || [])
          .filter(f => f.estado !== 'anulada')
          .reduce((sum, f) => sum + parseFloat(f.total), 0)
        const totalPendente = totalContratado - totalPago
        
        // Verificar se temos dados locais para complementar
        const localData = sampleProjectData[projectCode]
        
        // Construir objeto do projeto
        const fullProject = {
          // Dados base do Supabase
          ...projetoData,
          codigo: projetoData.codigo,
          nome: projetoData.nome,
          tipologia: projetoData.tipologia || 'Residencial',
          subtipo: projetoData.subtipo || 'Apartamento',
          tipo_apartamento: projetoData.tipo_apartamento,
          area_bruta: projetoData.area_bruta,
          area_exterior: projetoData.area_exterior,
          unidade_area: projetoData.unidade_area || 'm²',
          fase: projetoData.fase || 'Conceito',
          status: projetoData.status || 'on_track',
          progresso: progressoCalculado,
          
          // Localização
          localizacao: {
            morada: projetoData.morada || projetoData.localizacao,
            cidade: projetoData.localizacao,
            estado: projetoData.estado,
            codigo_postal: projetoData.codigo_postal,
            pais: projetoData.pais || 'Portugal'
          },
          
          // Datas
          datas: {
            data_proposta: projetoData.data_proposta,
            data_assinatura: projetoData.data_assinatura_contrato,
            data_inicio: projetoData.data_inicio,
            data_prevista: projetoData.data_prevista
          },
          
          // Cliente
          cliente: clienteData ? {
            codigo: clienteData.codigo,
            nome: clienteData.nome,
            titulo: '',
            tipo: clienteData.tipo || 'Particular',
            documento: clienteData.nif ? `NIF: ${clienteData.nif}` : '',
            email: clienteData.email,
            telefone: clienteData.telefone,
            morada: `${clienteData.morada || ''}, ${clienteData.codigo_postal || ''} ${clienteData.cidade || ''}`,
            segmento: clienteData.segmento || 'Nacional',
            idioma: clienteData.idioma || 'Português'
          } : {
            codigo: 'N/D',
            nome: projetoData.cliente_nome || 'Cliente',
            tipo: 'Particular'
          },
          
          // Serviços com fases (do Supabase ou fallback local)
          servicos: servicosData && servicosData.length > 0 ? servicosData : (localData?.servicos || []),
          
          // Pagamentos (do Supabase ou fallback local)
          pagamentos: (pagamentosData && pagamentosData.length > 0 ? pagamentosData : (localData?.pagamentos || [])).map(p => ({
            prestacao: p.prestacao_numero || p.prestacao,
            descricao: p.descricao,
            data: p.data_limite || p.data,
            valor: parseFloat(p.valor),
            estado: p.estado,
            data_pagamento: p.data_pagamento
          })),
          
          // Faturas (do Supabase ou fallback local)
          faturas: (faturasData && faturasData.length > 0 ? faturasData : (localData?.faturas || [])).map(f => ({
            numero: f.codigo || f.numero,
            descricao: f.descricao || f.referencia_cliente,
            data: f.data_emissao || f.data,
            valor_base: parseFloat(f.subtotal) || parseFloat(f.valor_base),
            iva: parseFloat(f.iva_valor) || parseFloat(f.iva),
            total: parseFloat(f.total),
            estado: f.estado
          })),
          
          // Financeiro calculado
          financeiro: {
            total_contratado: totalContratado,
            total_faturado: totalFaturado,
            total_pago: totalPago,
            total_pendente: totalPendente
          },
          
          // Orçamento
          orcamento: {
            valor_total: totalContratado,
            moeda: projetoData.orcamento_moeda || 'EUR',
            iva: !projetoData.orcamento_iva_isento,
            taxa_iva: 23
          },
          
          // Documentos (fallback local por agora)
          documentos: localData?.documentos || [],
          
          // Equipa (fallback local por agora)
          equipa: localData?.equipa || {
            project_manager: 'Maria Gavinho',
            designer: null,
            arquiteto: null
          }
        }
        
        setProject(fullProject)
        setEscopoTrabalho(projetoData.escopo_trabalho || '')

        // Carregar equipa, intervenientes, fases e renders
        fetchEquipaProjeto(projetoData.id)
        fetchIntervenientes(projetoData.id)
        fetchFasesContratuais(projetoData.id)
        fetchRenders(projetoData.id)

      } catch (err) {
        console.error('Erro ao buscar projeto:', err)
        // Fallback para dados locais
        const projectCode = projectsMap[id] || id
        setProject(sampleProjectData[projectCode] || sampleProjectData['GA00492'])
      } finally {
        setLoading(false)
      }
    }
    
    fetchProject()

    // Supabase Realtime subscription para sincronizar alterações
    const channel = supabase
      .channel(`projeto-${id}-changes`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projetos' },
        (payload) => {
          // Verificar se é o projeto atual
          const projectCode = projectsMap[id] || id
          if (payload.new.codigo === projectCode) {
            console.log('Projeto atualizado:', payload.new)
            setProject(prev => prev ? { ...prev, ...payload.new } : payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  // Loading state
  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid var(--stone)', 
            borderTopColor: 'var(--gold)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>A carregar projeto...</p>
        </div>
      </div>
    )
  }
  
  // Projeto não encontrado
  if (!project) {
    return (
      <div className="fade-in" style={{ padding: '48px', textAlign: 'center' }}>
        <h2>Projeto não encontrado</h2>
        <button className="btn btn-secondary mt-lg" onClick={() => navigate('/projetos')}>
          Voltar aos Projetos
        </button>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return 'var(--success)'
      case 'at_risk': return 'var(--warning)'
      case 'blocked': return 'var(--error)'
      case 'pago': return 'var(--success)'
      case 'pendente': return 'var(--warning)'
      case 'em_progresso': return 'var(--info)'
      default: return 'var(--brown-light)'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'on_track': return 'No Prazo'
      case 'at_risk': return 'Em Risco'
      case 'blocked': return 'Bloqueado'
      case 'pago': return 'Pago'
      case 'pendente': return 'Pendente'
      case 'em_progresso': return 'Em Progresso'
      default: return status
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Inicializar documentos com os do projeto se ainda não foram carregados
  const projectDocs = documents || project.documentos

  // Função para abrir modal de upload (novo documento ou anexar versão assinada)
  const openUploadModal = (doc = null) => {
    setUploadingDoc(doc) // se doc != null, é para anexar versão assinada
    setShowUploadModal(true)
  }

  // Função para processar upload de ficheiro
  const handleFileUpload = (file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Por favor selecione um ficheiro PDF.')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    
    if (uploadingDoc) {
      // Anexar versão assinada a documento existente
      const updatedDocs = projectDocs.map(doc => {
        if (doc.nome === uploadingDoc.nome) {
          return {
            ...doc,
            estado: 'assinado',
            ficheiro_assinado: file.name,
            data_assinatura: today
          }
        }
        return doc
      })
      setDocuments(updatedDocs)
    } else {
      // Novo documento
      const newDoc = {
        tipo: 'Documento',
        nome: file.name,
        data: today,
        estado: 'emitido',
        tamanho: file.size
      }
      setDocuments([...projectDocs, newDoc])
    }

    setShowUploadModal(false)
    setUploadingDoc(null)
    setDragOver(false)
  }

  // Handlers de drag & drop
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    handleFileUpload(file)
  }

  // Funções de gestão de renders
  const getNextVersion = (compartimento) => {
    const compartimentoRenders = renders.filter(r => r.compartimento === compartimento)
    return compartimentoRenders.length + 1
  }

  const openAddRenderModal = (compartimento = '') => {
    setEditingRender(null)
    const versao = compartimento ? getNextVersion(compartimento) : 1
    setRenderForm({
      compartimento: compartimento,
      versao: versao,
      descricao: '',
      is_final: false,
      imagem_url: '',
      data_upload: new Date().toISOString().split('T')[0]
    })
    setShowRenderModal(true)
  }

  const openEditRenderModal = (render) => {
    setEditingRender(render)
    setRenderForm({
      compartimento: render.compartimento,
      versao: render.versao,
      descricao: render.descricao || '',
      is_final: render.is_final || false,
      imagem_url: render.imagem_url || '',
      data_upload: render.data_upload || render.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    })
    setShowRenderModal(true)
  }

  const handleRenderCompartimentoChange = (compartimento) => {
    const versao = getNextVersion(compartimento)
    setRenderForm(prev => ({ ...prev, compartimento, versao }))
  }

  const handleSaveRender = async () => {
    if (!renderForm.compartimento) {
      alert('Por favor selecione um compartimento')
      return
    }

    try {
      const renderData = {
        projeto_id: project.id,
        compartimento: renderForm.compartimento,
        versao: editingRender ? renderForm.versao : getNextVersion(renderForm.compartimento),
        descricao: renderForm.descricao,
        is_final: renderForm.is_final,
        imagem_url: renderForm.imagem_url,
        data_upload: renderForm.data_upload,
        created_at: new Date().toISOString()
      }

      if (editingRender) {
        // Atualizar render existente
        const { error } = await supabase
          .from('projeto_renders')
          .update(renderData)
          .eq('id', editingRender.id)

        if (error) throw error

        setRenders(prev => prev.map(r =>
          r.id === editingRender.id ? { ...r, ...renderData } : r
        ))
      } else {
        // Criar novo render
        const { data, error } = await supabase
          .from('projeto_renders')
          .insert([renderData])
          .select()
          .single()

        if (error) {
          // Se tabela não existe, guardar localmente
          console.warn('Tabela projeto_renders não existe, guardando localmente')
          const newRender = { ...renderData, id: Date.now() }
          setRenders(prev => [...prev, newRender])
        } else {
          setRenders(prev => [...prev, data])
        }
      }

      setShowRenderModal(false)
      setEditingRender(null)
    } catch (err) {
      console.error('Erro ao guardar render:', err)
      // Fallback para armazenamento local
      const newRender = {
        ...renderForm,
        id: Date.now(),
        versao: getNextVersion(renderForm.compartimento)
      }
      setRenders(prev => editingRender
        ? prev.map(r => r.id === editingRender.id ? { ...r, ...renderForm } : r)
        : [...prev, newRender]
      )
      setShowRenderModal(false)
      setEditingRender(null)
    }
  }

  const handleDeleteRender = async (render) => {
    if (!confirm('Tem certeza que deseja eliminar este render?')) return

    try {
      const { error } = await supabase
        .from('projeto_renders')
        .delete()
        .eq('id', render.id)

      if (error) throw error
    } catch (err) {
      console.error('Erro ao eliminar:', err)
    }

    setRenders(prev => prev.filter(r => r.id !== render.id))
  }

  const toggleFinalImage = async (render) => {
    const newIsFinal = !render.is_final

    try {
      await supabase
        .from('projeto_renders')
        .update({ is_final: newIsFinal })
        .eq('id', render.id)
    } catch (err) {
      console.error('Erro ao atualizar:', err)
    }

    setRenders(prev => prev.map(r =>
      r.id === render.id ? { ...r, is_final: newIsFinal } : r
    ))
  }

  const handleRenderImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    processImageFile(file)
  }

  const processImageFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um ficheiro de imagem válido')
      return
    }
    // Simular upload - em produção, fazer upload para Supabase Storage
    const reader = new FileReader()
    reader.onload = (event) => {
      setRenderForm(prev => ({ ...prev, imagem_url: event.target?.result }))
    }
    reader.readAsDataURL(file)
  }

  // Drag & Drop handlers para Archviz
  const handleRenderDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleRenderDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleRenderDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImageFile(file)
  }

  // Abrir lightbox
  const openLightbox = (render) => {
    if (render.imagem_url) {
      setLightboxImage(render)
    }
  }

  // Renders agrupados por compartimento
  const rendersByCompartimento = renders.reduce((acc, render) => {
    if (!acc[render.compartimento]) {
      acc[render.compartimento] = []
    }
    acc[render.compartimento].push(render)
    return acc
  }, {})

  // Imagens finais do projeto
  const imagensFinais = renders.filter(r => r.is_final)

  // Tabs principais
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'briefing', label: 'Briefing & Conceito', icon: Lightbulb },
    { id: 'fases', label: 'Fases & Entregas', icon: Target, hasSubtabs: true },
    { id: 'decisoes', label: 'Decisões', icon: ClipboardList },
    { id: 'viabilidade', label: 'Viabilidade', icon: FileSearch },
    { id: 'chat-ia', label: 'Chat IA', icon: MessageSquare },
    { id: 'archviz', label: 'Archviz', icon: Image, hasSubtabs: true },
    { id: 'biblioteca', label: 'Biblioteca', icon: Library },
    { id: 'gestao', label: 'Gestão de Projeto', icon: Settings, hasSubtabs: true }
  ]

  // Secções dentro de Fases & Entregas
  const faseSections = [
    { id: 'prazo', label: 'Prazo Contratual & Escopo', icon: Calendar },
    { id: 'entregaveis', label: 'Entregáveis', icon: ListChecks },
    { id: 'recebidos', label: 'Recebidos', icon: Inbox },
    { id: 'entregas', label: 'Central Entregas', icon: Package },
    { id: 'design-review', label: 'Design Review', icon: Eye },
    { id: 'atas', label: 'Atas', icon: FileText }
  ]

  // Secções dentro de Archviz
  const archvizSections = [
    { id: 'inspiracoes', label: 'Inspirações & Referências', icon: Palette },
    { id: 'processo', label: 'Imagens Processo', icon: ImagePlus },
    { id: 'finais', label: 'Imagens Finais', icon: CheckCircle },
    { id: 'moleskine', label: 'Moleskine', icon: Pencil }
  ]

  // Secções dentro de Gestão de Projeto
  const gestaoSections = [
    { id: 'contratos', label: 'Contratos', icon: FileText },
    { id: 'diario-projeto', label: 'Diário de Projeto', icon: BookOpen },
    { id: 'faturacao', label: 'Faturação', icon: Euro },
    { id: 'ficha-cliente', label: 'Ficha de Cliente', icon: UserCircle }
  ]

  const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin())

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--brown-light)',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '16px',
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-md mb-sm">
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 700, 
                color: 'var(--blush-dark)',
                letterSpacing: '0.5px'
              }}>
                {project.codigo}
              </span>
              <span className="badge badge-gold">{project.fase}</span>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: `${getStatusColor(project.status)}15`,
                  color: getStatusColor(project.status),
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: getStatusColor(project.status)
                }} />
                {getStatusLabel(project.status)}
              </div>
            </div>
            <h1 className="page-title" style={{ marginBottom: '8px' }}>{project.nome}</h1>
            <div className="flex items-center gap-lg text-muted" style={{ fontSize: '13px' }}>
              <span className="flex items-center gap-xs">
                <Building2 size={14} />
                {project.tipologia} • {project.subtipo} {project.tipo_apartamento}
              </span>
              <span className="flex items-center gap-xs">
                <MapPin size={14} />
                {project.localizacao.cidade}, {project.localizacao.pais}
              </span>
              <span className="flex items-center gap-xs">
                <Layers size={14} />
                {project.area_bruta} {project.unidade_area}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-sm">
            <button className="btn btn-secondary" onClick={openEditModal}>
              <Edit size={16} />
              Editar
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowActions(!showActions)}
                style={{ padding: '10px' }}
              >
                <MoreVertical size={18} />
              </button>
              {showActions && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--white)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--stone)',
                    minWidth: '180px',
                    zIndex: 100,
                    overflow: 'hidden'
                  }}
                >
                  {[
                    { icon: Copy, label: 'Duplicar Projeto', onClick: handleDuplicate },
                    { icon: Share, label: 'Partilhar', onClick: handleShare },
                    { icon: Download, label: 'Exportar PDF', onClick: handleExportPDF },
                    { icon: Trash2, label: 'Eliminar', danger: true, onClick: handleDelete }
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={action.onClick}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        fontSize: '13px',
                        color: action.danger ? 'var(--error)' : 'var(--brown)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <action.icon size={16} />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div 
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          background: 'var(--cream)',
          padding: '4px',
          borderRadius: '12px',
          width: 'fit-content'
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--white)' : 'transparent',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
              color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-2" style={{ gap: '24px' }}>
          {/* Cliente */}
          <div className="card">
            <div className="flex items-center justify-between mb-lg">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Cliente
              </h3>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Ver Ficha
              </button>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              padding: '16px',
              background: 'var(--cream)',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--blush), var(--blush-dark))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--white)',
                fontWeight: 600,
                fontSize: '16px'
              }}>
                {(project.cliente?.nome || 'Cliente').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                  {project.cliente?.titulo} {project.cliente?.nome || 'Cliente'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                  {project.cliente?.codigo || 'N/D'} • {project.cliente?.tipo || 'Particular'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {project.cliente?.email && (
                <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
                  <Mail size={14} />
                  {project.cliente.email}
                </div>
              )}
              {project.cliente?.telefone && (
                <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
                  <Phone size={14} />
                  {project.cliente.telefone}
                </div>
              )}
              {(project.cliente?.segmento || project.cliente?.idioma) && (
                <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
                  <Globe size={14} />
                  {[project.cliente?.segmento, project.cliente?.idioma].filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
              Localização
            </h3>
            
            <div style={{
              padding: '16px',
              background: 'var(--cream)',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brown)', marginBottom: '8px' }}>
                {project.localizacao?.morada || project.morada || '—'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                {[project.localizacao?.codigo_postal, project.localizacao?.cidade || project.cidade].filter(Boolean).join(' ')}
                {project.localizacao?.estado && `, ${project.localizacao.estado}`}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                {project.localizacao?.pais || project.pais || 'Portugal'}
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                  Área Bruta
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                  {project.area_bruta} {project.unidade_area}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                  Área Exterior
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                  {project.area_exterior} {project.unidade_area}
                </div>
              </div>
            </div>
          </div>

          {/* Serviços Contratados */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
              Serviços Contratados
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(!project.servicos || project.servicos.length === 0) ? (
                <p style={{ fontSize: '13px', color: 'var(--brown-light)', textAlign: 'center', padding: '24px', background: 'var(--cream)', borderRadius: '12px' }}>
                  Nenhum serviço contratado.
                </p>
              ) : project.servicos.map((servico, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '20px',
                    background: 'var(--cream)',
                    borderRadius: '12px'
                  }}
                >
                  <div className="flex items-center justify-between mb-sm">
                    <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                      {servico.tipo}
                    </div>
                    {servico.data_fim && (
                      <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                        Até {formatDate(servico.data_fim)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '12px' }}>
                    {servico.descricao}
                  </div>
                  
                  {servico.inclui && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {servico.inclui.map((item, i) => (
                        <span 
                          key={i}
                          style={{
                            padding: '4px 10px',
                            background: 'var(--white)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: 'var(--brown)'
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Equipa */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
              Equipa do Projeto
            </h3>

            {equipaProjeto.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', textAlign: 'center', padding: '24px', background: 'var(--cream)', borderRadius: '12px' }}>
                Nenhum membro atribuído. Clique em Editar para adicionar membros.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {equipaProjeto.map((membro) => (
                  <div
                    key={membro.id}
                    style={{
                      padding: '16px',
                      background: 'var(--cream)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minWidth: '200px'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--brown)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600
                    }}>
                      {membro.utilizadores?.nome?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--brown)', fontSize: '14px' }}>
                        {membro.utilizadores?.nome || 'Sem nome'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                        {membro.funcao || membro.utilizadores?.cargo || 'Membro'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intervenientes do Projeto */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="flex items-center justify-between mb-lg">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Intervenientes do Projeto
              </h3>
              <button
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => {
                  setEditingInterveniente(null)
                  setIntervenienteForm({
                    tipo: '',
                    entidade: '',
                    contacto_geral: '',
                    responsavel_nome: '',
                    responsavel_email: '',
                    responsavel_secundario_nome: '',
                    responsavel_secundario_email: ''
                  })
                  setShowIntervenienteModal(true)
                }}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {intervenientes.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', textAlign: 'center', padding: '24px', background: 'var(--cream)', borderRadius: '12px' }}>
                Nenhum interveniente registado.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--stone)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--brown)', fontWeight: 600 }}>Tipo</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--brown)', fontWeight: 600 }}>Entidade</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--brown)', fontWeight: 600 }}>Responsável</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--brown)', fontWeight: 600 }}>Responsável Secundário</th>
                      <th style={{ width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {intervenientes.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--cream)' }}>
                        <td style={{ padding: '12px 8px', color: 'var(--brown)', fontWeight: 500 }}>
                          {item.tipo}
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--brown-light)' }}>
                          <div>{item.entidade || '—'}</div>
                          {item.contacto_geral && (
                            <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{item.contacto_geral}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ color: 'var(--brown)' }}>{item.responsavel_nome || '—'}</div>
                          {item.responsavel_email && (
                            <a href={`mailto:${item.responsavel_email}`} style={{ fontSize: '11px', color: 'var(--gold-dark)' }}>
                              {item.responsavel_email}
                            </a>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ color: 'var(--brown)' }}>{item.responsavel_secundario_nome || '—'}</div>
                          {item.responsavel_secundario_email && (
                            <a href={`mailto:${item.responsavel_secundario_email}`} style={{ fontSize: '11px', color: 'var(--gold-dark)' }}>
                              {item.responsavel_secundario_email}
                            </a>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleEditInterveniente(item)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: 'var(--brown-light)'
                              }}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleRemoveInterveniente(item.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: 'var(--danger)'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Interveniente */}
      {showIntervenienteModal && (
        <div className="modal-overlay" onClick={() => setShowIntervenienteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--stone)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                  {editingInterveniente ? 'Editar Interveniente' : 'Adicionar Interveniente'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--brown-light)' }}>
                  Registe os intervenientes externos do projeto
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowIntervenienteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Tipo e Entidade */}
              <div style={{
                background: 'var(--cream)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Identificação
                </h4>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                    Tipo de Interveniente *
                  </label>
                  <select
                    value={intervenienteForm.tipo}
                    onChange={(e) => setIntervenienteForm(prev => ({ ...prev, tipo: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid var(--stone)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'var(--white)',
                      color: 'var(--brown)'
                    }}
                  >
                    <option value="">Selecionar tipo...</option>
                    {TIPOS_INTERVENIENTES.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                      Entidade / Empresa
                    </label>
                    <input
                      type="text"
                      value={intervenienteForm.entidade}
                      onChange={(e) => setIntervenienteForm(prev => ({ ...prev, entidade: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid var(--stone)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                      placeholder="Nome da empresa ou entidade"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                      Contacto Geral
                    </label>
                    <input
                      type="text"
                      value={intervenienteForm.contacto_geral}
                      onChange={(e) => setIntervenienteForm(prev => ({ ...prev, contacto_geral: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid var(--stone)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                      placeholder="email@empresa.pt ou telefone"
                    />
                  </div>
                </div>
              </div>

              {/* Responsável Principal */}
              <div style={{
                background: 'var(--cream)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Responsável Principal
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                      Nome
                    </label>
                    <input
                      type="text"
                      value={intervenienteForm.responsavel_nome}
                      onChange={(e) => setIntervenienteForm(prev => ({ ...prev, responsavel_nome: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid var(--stone)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={intervenienteForm.responsavel_email}
                      onChange={(e) => setIntervenienteForm(prev => ({ ...prev, responsavel_email: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid var(--stone)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                      placeholder="email@exemplo.pt"
                    />
                  </div>
                </div>
              </div>

              {/* Responsável Secundário */}
              <div style={{
                background: 'var(--cream)',
                padding: '20px',
                borderRadius: '12px'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Responsável Secundário <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                      Nome
                    </label>
                    <input
                      type="text"
                      value={intervenienteForm.responsavel_secundario_nome}
                      onChange={(e) => setIntervenienteForm(prev => ({ ...prev, responsavel_secundario_nome: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid var(--stone)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '6px', display: 'block' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={intervenienteForm.responsavel_secundario_email}
                      onChange={(e) => setIntervenienteForm(prev => ({ ...prev, responsavel_secundario_email: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid var(--stone)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                      placeholder="email@exemplo.pt"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--stone)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowIntervenienteModal(false)}
                style={{ padding: '10px 20px' }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveInterveniente}
                disabled={!intervenienteForm.tipo}
                style={{ padding: '10px 24px' }}
              >
                {editingInterveniente ? 'Guardar Alterações' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Fase Contratual */}
      {showFaseModal && (
        <div className="modal-overlay" onClick={() => setShowFaseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingFase ? 'Editar Fase' : 'Adicionar Fase Contratual'}</h3>
              <button className="modal-close" onClick={() => setShowFaseModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Nº Fase *</label>
                  <input
                    type="number"
                    value={faseForm.numero}
                    onChange={(e) => setFaseForm(prev => ({ ...prev, numero: e.target.value }))}
                    className="form-control"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Nome da Fase *</label>
                  <input
                    type="text"
                    value={faseForm.nome}
                    onChange={(e) => setFaseForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="form-control"
                    placeholder="Ex: Estudos de Layout/Revisão do Projeto de Arquitetura"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Data Início</label>
                  <input
                    type="date"
                    value={faseForm.data_inicio}
                    onChange={(e) => setFaseForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Nº Dias da Fase</label>
                  <input
                    type="text"
                    value={faseForm.num_dias}
                    onChange={(e) => setFaseForm(prev => ({ ...prev, num_dias: e.target.value }))}
                    className="form-control"
                    placeholder="Ex: 40 ou 60 dias úteis após entrega do PB"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Conclusão Prevista</label>
                  <input
                    type="text"
                    value={faseForm.conclusao_prevista}
                    onChange={(e) => setFaseForm(prev => ({ ...prev, conclusao_prevista: e.target.value }))}
                    className="form-control"
                    placeholder="Ex: Março 2025 ou Final de Outubro 2025"
                  />
                </div>
                <div className="form-group">
                  <label>Data Entrega</label>
                  <input
                    type="date"
                    value={faseForm.data_entrega}
                    onChange={(e) => setFaseForm(prev => ({ ...prev, data_entrega: e.target.value }))}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Estado</label>
                  <select
                    value={faseForm.estado}
                    onChange={(e) => setFaseForm(prev => ({ ...prev, estado: e.target.value }))}
                    className="form-control"
                  >
                    <option value="nao_iniciado">Não iniciado</option>
                    <option value="em_curso">Em curso</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Avaliação Performance</label>
                  <select
                    value={faseForm.avaliacao}
                    onChange={(e) => setFaseForm(prev => ({ ...prev, avaliacao: e.target.value }))}
                    className="form-control"
                  >
                    <option value="">—</option>
                    <option value="on_time">On Time</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFaseModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveFase}
                disabled={!faseForm.nome}
              >
                {editingFase ? 'Guardar Alterações' : 'Adicionar Fase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Fases & Entregas */}
      {activeTab === 'fases' && (
        <div>
          {/* Section navigation */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--stone)',
            paddingBottom: '12px'
          }}>
            {faseSections.map(section => (
              <button
                key={section.id}
                onClick={() => handleSubtabChange(section.id)}
                style={{
                  padding: '8px 16px',
                  background: activeFaseSection === section.id ? 'var(--brown)' : 'transparent',
                  color: activeFaseSection === section.id ? 'white' : 'var(--brown-light)',
                  border: activeFaseSection === section.id ? 'none' : '1px solid var(--stone)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <section.icon size={14} />
                {section.label}
              </button>
            ))}
          </div>

          {/* Content based on active section */}
          <div className="card">
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--brown)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {faseSections.find(s => s.id === activeFaseSection)?.label}
              <span className="badge badge-gold" style={{ fontSize: '11px' }}>
                {project.fase || 'Fase não definida'}
              </span>
            </h3>

            {/* Prazo Contratual */}
            {activeFaseSection === 'prazo' && (
              <div>
                {/* Resumo do projeto */}
                <div className="grid grid-3" style={{ gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Data Início Projeto</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                      {project.data_inicio ? new Date(project.data_inicio).toLocaleDateString('pt-PT') : 'A definir'}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Data Fim Prevista</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                      {project.data_fim_prevista ? new Date(project.data_fim_prevista).toLocaleDateString('pt-PT') : 'A definir'}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Duração Total</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                      {project.prazo_execucao || '—'} {project.prazo_execucao ? 'dias' : ''}
                    </div>
                  </div>
                </div>

                {/* Tabela de Fases */}
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Fases e Prazos Contratuais</h4>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => {
                      setEditingFase(null)
                      setFaseForm({
                        numero: (fasesContratuais.length + 1).toString(),
                        nome: '',
                        data_inicio: '',
                        num_dias: '',
                        conclusao_prevista: '',
                        data_entrega: '',
                        estado: 'nao_iniciado',
                        avaliacao: ''
                      })
                      setShowFaseModal(true)
                    }}
                  >
                    <Plus size={14} /> Adicionar Fase
                  </button>
                </div>

                {fasesContratuais.length === 0 ? (
                  <div style={{
                    padding: '32px',
                    background: 'var(--cream)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: 'var(--brown-light)'
                  }}>
                    <Calendar size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>Nenhuma fase contratual definida.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--stone)', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'var(--cream)' }}>
                          <th style={{ textAlign: 'left', padding: '12px 10px', color: 'var(--brown)', fontWeight: 600, borderBottom: '2px solid var(--stone)' }}>FASE</th>
                          <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--brown)', fontWeight: 600, borderBottom: '2px solid var(--stone)', width: '100px' }}>INÍCIO</th>
                          <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--brown)', fontWeight: 600, borderBottom: '2px solid var(--stone)', width: '100px' }}>Nº DIAS FASE</th>
                          <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--brown)', fontWeight: 600, borderBottom: '2px solid var(--stone)', width: '120px' }}>CONCLUSÃO PREVISTA</th>
                          <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--brown)', fontWeight: 600, borderBottom: '2px solid var(--stone)', width: '100px' }}>DATA ENTREGA</th>
                          <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--brown)', fontWeight: 600, borderBottom: '2px solid var(--stone)', width: '120px' }}>ESTADO</th>
                          <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--brown)', fontWeight: 600, borderBottom: '2px solid var(--stone)', width: '120px' }}>AVALIAÇÃO PERFORMANCE</th>
                          <th style={{ width: '50px', borderBottom: '2px solid var(--stone)' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fasesContratuais.map((fase) => (
                          <tr key={fase.id} style={{ borderBottom: '1px solid var(--cream)' }}>
                            <td style={{ padding: '12px 10px', color: 'var(--brown)' }}>
                              <span style={{ fontWeight: 500 }}>{fase.numero}ª Fase – </span>
                              {fase.nome}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--brown-light)' }}>
                              {fase.data_inicio ? new Date(fase.data_inicio).toLocaleDateString('pt-PT') : '—'}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--brown-light)' }}>
                              {fase.num_dias || '—'}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--brown-light)' }}>
                              {fase.conclusao_prevista || '—'}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--brown-light)' }}>
                              {fase.data_entrega ? new Date(fase.data_entrega).toLocaleDateString('pt-PT') : '—'}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <select
                                value={fase.estado}
                                onChange={(e) => handleUpdateFaseEstado(fase.id, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  border: 'none',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  background: fase.estado === 'concluido' ? '#dcfce7' :
                                              fase.estado === 'em_curso' ? '#fef9c3' : '#f3f4f6',
                                  color: fase.estado === 'concluido' ? '#166534' :
                                         fase.estado === 'em_curso' ? '#854d0e' : '#6b7280'
                                }}
                              >
                                <option value="nao_iniciado">Não iniciado</option>
                                <option value="em_curso">Em curso</option>
                                <option value="concluido">Concluído</option>
                              </select>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <select
                                value={fase.avaliacao || ''}
                                onChange={(e) => handleUpdateFaseAvaliacao(fase.id, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  border: 'none',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  background: fase.avaliacao === 'on_time' ? '#dcfce7' :
                                              fase.avaliacao === 'delayed' ? '#fee2e2' : '#f3f4f6',
                                  color: fase.avaliacao === 'on_time' ? '#166534' :
                                         fase.avaliacao === 'delayed' ? '#dc2626' : '#6b7280'
                                }}
                              >
                                <option value="">—</option>
                                <option value="on_time">On Time</option>
                                <option value="delayed">Delayed</option>
                              </select>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => handleEditFase(fase)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)' }}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleRemoveFase(fase.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--danger)' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Escopo de Trabalho */}
                <div style={{ marginTop: '32px' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Escopo de Trabalho</h4>
                    {!editingEscopo ? (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setEditingEscopo(true)}
                      >
                        <Edit size={14} style={{ marginRight: '4px' }} /> Editar
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setEditingEscopo(false)
                            setEscopoTrabalho(project?.escopo_trabalho || '')
                          }}
                          disabled={savingEscopo}
                        >
                          Cancelar
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={handleSaveEscopo}
                          disabled={savingEscopo}
                        >
                          {savingEscopo ? 'A guardar...' : 'Guardar'}
                        </button>
                      </div>
                    )}
                  </div>

                  {editingEscopo ? (
                    <div style={{ border: '1px solid var(--stone)', borderRadius: '12px', overflow: 'hidden' }}>
                      {/* Toolbar de formatação */}
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '8px 12px',
                        background: 'var(--cream)',
                        borderBottom: '1px solid var(--stone)'
                      }}>
                        <button
                          type="button"
                          onClick={() => formatEscopo('bold')}
                          title="Negrito (Ctrl+B)"
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--stone)',
                            borderRadius: '6px',
                            background: 'var(--white)',
                            cursor: 'pointer',
                            color: 'var(--brown)'
                          }}
                        >
                          <Bold size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => formatEscopo('italic')}
                          title="Itálico (Ctrl+I)"
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--stone)',
                            borderRadius: '6px',
                            background: 'var(--white)',
                            cursor: 'pointer',
                            color: 'var(--brown)'
                          }}
                        >
                          <Italic size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => formatEscopo('underline')}
                          title="Sublinhado (Ctrl+U)"
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--stone)',
                            borderRadius: '6px',
                            background: 'var(--white)',
                            cursor: 'pointer',
                            color: 'var(--brown)'
                          }}
                        >
                          <Underline size={16} />
                        </button>
                        <div style={{ width: '1px', background: 'var(--stone)', margin: '0 4px' }} />
                        <button
                          type="button"
                          onClick={() => formatEscopo('insertUnorderedList')}
                          title="Lista com marcadores"
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--stone)',
                            borderRadius: '6px',
                            background: 'var(--white)',
                            cursor: 'pointer',
                            color: 'var(--brown)'
                          }}
                        >
                          <List size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => formatEscopo('insertOrderedList')}
                          title="Lista numerada"
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--stone)',
                            borderRadius: '6px',
                            background: 'var(--white)',
                            cursor: 'pointer',
                            color: 'var(--brown)',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          1.
                        </button>
                      </div>
                      {/* Editor contentEditable */}
                      <div
                        ref={escopoEditorRef}
                        contentEditable
                        suppressContentEditableWarning
                        dangerouslySetInnerHTML={{ __html: escopoTrabalho }}
                        style={{
                          minHeight: '400px',
                          padding: '16px',
                          fontSize: '13px',
                          lineHeight: '1.8',
                          outline: 'none',
                          color: 'var(--brown)',
                          background: 'var(--white)'
                        }}
                      />
                    </div>
                  ) : escopoTrabalho ? (
                    <div
                      style={{
                        padding: '20px',
                        background: 'var(--cream)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        lineHeight: '1.8',
                        color: 'var(--brown)'
                      }}
                      dangerouslySetInnerHTML={{ __html: escopoTrabalho }}
                    />
                  ) : (
                    <div style={{
                      padding: '32px',
                      background: 'var(--cream)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: 'var(--brown-light)'
                    }}>
                      <FileText size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p>Nenhum escopo de trabalho definido.</p>
                      <button
                        className="btn btn-primary"
                        style={{ marginTop: '12px', padding: '8px 16px', fontSize: '12px' }}
                        onClick={() => setEditingEscopo(true)}
                      >
                        Adicionar Escopo
                      </button>
                    </div>
                  )}

                  {/* Botão Analisar com IA */}
                  {escopoTrabalho && !editingEscopo && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{
                          padding: '10px 16px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onClick={handleAnalisarEscopo}
                        disabled={analisandoEscopo}
                      >
                        {analisandoEscopo ? (
                          <>
                            <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                            A analisar...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Analisar com IA
                          </>
                        )}
                      </button>
                      {sugestoesEscopo && (
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--brown)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => setShowSugestoesPanel(!showSugestoesPanel)}
                        >
                          {showSugestoesPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          {showSugestoesPanel ? 'Ocultar sugestões' : 'Ver sugestões'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Painel de Sugestões IA */}
                  {showSugestoesPanel && sugestoesEscopo && (
                    <div style={{
                      marginTop: '20px',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #f8f6f3 0%, #f0ede8 100%)',
                      borderRadius: '12px',
                      border: '1px solid var(--stone)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Sparkles size={18} style={{ color: 'var(--gold)' }} />
                        <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                          Sugestões da IA
                        </h5>
                      </div>

                      {/* Fases Sugeridas */}
                      {sugestoesEscopo.fases?.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h6 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '10px', textTransform: 'uppercase' }}>
                            Fases Contratuais ({sugestoesEscopo.fases.length})
                          </h6>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sugestoesEscopo.fases.map((fase, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '12px',
                                  background: 'var(--white)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--stone)'
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--brown)' }}>
                                    {fase.numero}ª Fase – {fase.nome}
                                  </div>
                                  {fase.descricao && (
                                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>
                                      {fase.descricao}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                                    {fase.duracao_estimada && (
                                      <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                                        ⏱ {fase.duracao_estimada}
                                      </span>
                                    )}
                                    {fase.estado_sugerido && (
                                      <span style={{
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: fase.estado_sugerido === 'concluido' ? '#dcfce7' :
                                                    fase.estado_sugerido === 'em_curso' ? '#fef9c3' : '#f3f4f6',
                                        color: fase.estado_sugerido === 'concluido' ? '#166534' :
                                               fase.estado_sugerido === 'em_curso' ? '#854d0e' : '#6b7280'
                                      }}>
                                        {fase.estado_sugerido === 'concluido' ? 'Concluído' :
                                         fase.estado_sugerido === 'em_curso' ? 'Em curso' : 'Não iniciado'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '11px' }}
                                  onClick={() => handleAddSuggestedFase(fase)}
                                >
                                  <Plus size={14} style={{ marginRight: '4px' }} />
                                  Adicionar
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Entregáveis Sugeridos */}
                      {sugestoesEscopo.entregaveis?.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h6 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '10px', textTransform: 'uppercase' }}>
                            Entregáveis ({sugestoesEscopo.entregaveis.length})
                          </h6>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {sugestoesEscopo.entregaveis.map((entregavel, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '8px 12px',
                                  background: 'var(--white)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--stone)',
                                  fontSize: '12px'
                                }}
                              >
                                <div style={{ fontWeight: 500, color: 'var(--brown)' }}>
                                  {entregavel.descricao}
                                </div>
                                {entregavel.fase && (
                                  <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>
                                    Fase: {entregavel.fase}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notas */}
                      {sugestoesEscopo.notas?.length > 0 && (
                        <div>
                          <h6 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '10px', textTransform: 'uppercase' }}>
                            Notas
                          </h6>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--brown-light)' }}>
                            {sugestoesEscopo.notas.map((nota, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{nota}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Entregáveis */}
            {activeFaseSection === 'entregaveis' && (
              <ProjetoEntregaveis projeto={project} />
            )}

            {/* Recebidos - Desenhos de Especialidades */}
            {activeFaseSection === 'recebidos' && (
              <RecebidosEspecialidades projeto={project} />
            )}

            {/* Central de Entregas */}
            {activeFaseSection === 'entregas' && (
              <CentralEntregas projeto={project} />
            )}

            {/* Design Review */}
            {activeFaseSection === 'design-review' && (
              <DesignReview projeto={project} />
            )}

            {/* Atas */}
            {activeFaseSection === 'atas' && (
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                    Atas de reunião desta fase
                  </span>
                  <button className="btn btn-primary" style={{ padding: '8px 16px' }}>
                    <Plus size={16} style={{ marginRight: '8px' }} />
                    Nova Ata
                  </button>
                </div>
                <div style={{
                  padding: '48px',
                  background: 'var(--cream)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: 'var(--brown-light)'
                }}>
                  <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p>Nenhuma ata registada para esta fase.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Briefing & Conceito */}
      {activeTab === 'briefing' && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Lightbulb size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Briefing & Conceito</h3>
          <p style={{ color: 'var(--brown-light)', margin: 0 }}>Módulo de briefing e conceito em desenvolvimento</p>
        </div>
      )}

      {/* Tab Archviz com subtabs */}
      {activeTab === 'archviz' && (
        <div>
          {/* Section navigation */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--stone)',
            paddingBottom: '12px'
          }}>
            {archvizSections.map(section => (
              <button
                key={section.id}
                onClick={() => handleSubtabChange(section.id, 'archviz')}
                style={{
                  padding: '8px 16px',
                  background: activeArchvizSection === section.id ? 'var(--brown)' : 'transparent',
                  color: activeArchvizSection === section.id ? 'white' : 'var(--brown-light)',
                  border: activeArchvizSection === section.id ? 'none' : '1px solid var(--stone)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <section.icon size={14} />
                {section.label}
              </button>
            ))}
          </div>

          {/* Inspirações & Referências */}
          {activeArchvizSection === 'inspiracoes' && (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <Palette size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Inspirações & Referências</h3>
              <p style={{ color: 'var(--brown-light)', margin: 0 }}>Galeria de inspirações e referências visuais em desenvolvimento</p>
            </div>
          )}

          {/* Imagens Processo */}
          {activeArchvizSection === 'processo' && (
            <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Visualizações 3D & Renders
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginTop: '4px' }}>
                {renders.length} render{renders.length !== 1 ? 's' : ''} • {imagensFinais.length} imagem{imagensFinais.length !== 1 ? 'ns' : ''} final{imagensFinais.length !== 1 ? 'is' : ''}
              </p>
            </div>
            <button onClick={openAddRenderModal} className="btn btn-primary" style={{ padding: '10px 16px' }}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              Adicionar Render
            </button>
          </div>

          {/* Renders por Compartimento */}
          {Object.keys(rendersByCompartimento).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(rendersByCompartimento).map(([compartimento, compartimentoRenders]) => (
                <div key={compartimento}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>
                      {compartimento}
                      <span style={{ fontWeight: 400, color: 'var(--brown-light)', marginLeft: '8px' }}>
                        ({compartimentoRenders.length} versão{compartimentoRenders.length !== 1 ? 'ões' : ''})
                      </span>
                    </h4>
                    <button
                      onClick={() => openAddRenderModal(compartimento)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <Plus size={14} style={{ marginRight: '6px' }} />
                      Adicionar Versão
                    </button>
                  </div>
                  <div className="grid grid-3" style={{ gap: '16px' }}>
                    {compartimentoRenders.sort((a, b) => new Date(b.data_upload || b.created_at || 0) - new Date(a.data_upload || a.created_at || 0)).map((render) => (
                      <div
                        key={render.id}
                        style={{
                          position: 'relative',
                          aspectRatio: '16/10',
                          background: render.imagem_url ? `url(${render.imagem_url}) center/cover` : 'var(--cream)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: render.is_final ? '3px solid var(--success)' : '1px solid var(--stone)',
                          cursor: render.imagem_url ? 'pointer' : 'default'
                        }}
                        onClick={() => openLightbox(render)}
                      >
                        {!render.imagem_url && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Image size={24} style={{ color: 'var(--brown-light)', opacity: 0.4 }} />
                          </div>
                        )}

                        {/* Versão & Data Badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{
                            padding: '4px 8px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            v{render.versao}
                          </div>
                          {render.data_upload && (
                            <div style={{
                              padding: '3px 6px',
                              background: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '9px'
                            }}>
                              {new Date(render.data_upload).toLocaleDateString('pt-PT')}
                            </div>
                          )}
                        </div>

                        {/* Final Badge */}
                        {render.is_final && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            padding: '4px 8px',
                            background: 'var(--success)',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle size={12} />
                            FINAL
                          </div>
                        )}

                        {/* Hover Actions */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '8px',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFinalImage(render) }}
                            style={{
                              padding: '4px 8px',
                              background: render.is_final ? 'var(--error)' : 'var(--success)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            {render.is_final ? 'Remover Final' : 'Marcar Final'}
                          </button>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMoleskineRender(render) }}
                              style={{
                                padding: '4px 8px',
                                background: '#8B8670',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10px',
                                fontWeight: 500
                              }}
                              title="Moleskine - Anotar render"
                            >
                              <Pencil size={12} />
                              Moleskine
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditRenderModal(render) }}
                              style={{
                                padding: '4px',
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteRender(render) }}
                              style={{
                                padding: '4px',
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '48px',
              background: 'var(--cream)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <Image size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <h4 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Galeria Archviz Vazia</h4>
              <p style={{ color: 'var(--brown-light)', fontSize: '13px', marginBottom: '16px' }}>
                Adicione renders e visualizações 3D organizados por compartimento.
              </p>
              <button onClick={openAddRenderModal} className="btn btn-secondary">
                <Plus size={16} style={{ marginRight: '8px' }} />
                Adicionar Primeiro Render
              </button>
            </div>
          )}
        </div>
          )}

          {/* Imagens Finais */}
          {activeArchvizSection === 'finais' && (
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                    Imagens Finais do Projeto
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginTop: '4px' }}>
                    Imagens aprovadas para entrega ao cliente
                  </p>
                </div>
            <span style={{
              padding: '8px 16px',
              background: 'var(--success)',
              color: 'white',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600
            }}>
              {imagensFinais.length} imagem{imagensFinais.length !== 1 ? 'ns' : ''}
            </span>
          </div>

          {imagensFinais.length > 0 ? (
            <div className="grid grid-3" style={{ gap: '16px' }}>
              {imagensFinais.map((render) => (
                <div
                  key={render.id}
                  style={{
                    position: 'relative',
                    aspectRatio: '16/10',
                    background: render.imagem_url ? `url(${render.imagem_url}) center/cover` : 'var(--cream)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '3px solid var(--success)'
                  }}
                >
                  {!render.imagem_url && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Image size={32} style={{ color: 'var(--brown-light)', opacity: 0.4 }} />
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    color: 'white'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{render.compartimento}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>Versão {render.versao}</div>
                  </div>

                  <button
                    onClick={() => toggleFinalImage(render)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px 10px',
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <X size={12} />
                    Remover
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '48px',
              background: 'var(--cream)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <CheckCircle size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <h4 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Nenhuma Imagem Final</h4>
              <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>
                Vá a "Imagens Processo" e marque as imagens que devem aparecer nas entregas ao cliente.
              </p>
            </div>
          )}
            </div>
          )}

          {/* Sub-tab Moleskine - Caderno Digital */}
          {activeArchvizSection === 'moleskine' && (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #8B8670 0%, #5F5C59 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <BookOpen size={40} style={{ color: 'white' }} />
              </div>

              <h3 style={{
                fontSize: '24px',
                fontWeight: 600,
                color: 'var(--brown)',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                marginBottom: '12px'
              }}>
                Moleskine Digital
              </h3>

              <p style={{
                fontSize: '14px',
                color: 'var(--brown-light)',
                maxWidth: '500px',
                margin: '0 auto 32px',
                lineHeight: 1.6
              }}>
                O seu caderno digital para o projeto. Desenhe, escreva, adicione imagens e links livremente.
                Importe renders do projeto ou carregue qualquer imagem como referência.
              </p>

              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '32px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'var(--cream)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  color: 'var(--brown)'
                }}>
                  <Pencil size={16} />
                  Desenho livre
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'var(--cream)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  color: 'var(--brown)'
                }}>
                  <Image size={16} />
                  Upload de imagens
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'var(--cream)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  color: 'var(--brown)'
                }}>
                  <Type size={16} />
                  Texto e notas
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'var(--cream)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  color: 'var(--brown)'
                }}>
                  <Link2 size={16} />
                  Links
                </div>
              </div>

              <button
                onClick={() => setShowMoleskineDigital(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 32px',
                  background: 'var(--olive-gray)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <BookOpen size={20} />
                Abrir Moleskine
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab Biblioteca do Projeto */}
      {activeTab === 'biblioteca' && (
        <div>
          <div className="grid grid-3" style={{ gap: '16px', marginBottom: '24px' }}>
            {/* KPI Cards */}
            {[
              { label: 'Materiais', count: 12, icon: '🎨' },
              { label: 'Objetos 3D', count: 8, icon: '📦' },
              { label: 'Texturas', count: 24, icon: '🖼️' }
            ].map((item, idx) => (
              <div key={idx} className="card" style={{ padding: '20px' }}>
                <div className="flex items-center gap-md">
                  <span style={{ fontSize: '32px' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>
                      {item.count}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                      {item.label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Biblioteca do Projeto
              </h3>
              <div className="flex gap-sm">
                <button className="btn btn-secondary" style={{ padding: '8px 14px' }}>
                  Importar da Biblioteca Global
                </button>
                <button className="btn btn-primary" style={{ padding: '8px 14px' }}>
                  <Plus size={16} style={{ marginRight: '8px' }} />
                  Adicionar Item
                </button>
              </div>
            </div>

            {/* Tabs de categorias */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['Todos', 'Materiais', 'Objetos 3D', 'Texturas'].map((cat, idx) => (
                <button
                  key={idx}
                  style={{
                    padding: '8px 16px',
                    background: idx === 0 ? 'var(--brown)' : 'transparent',
                    color: idx === 0 ? 'white' : 'var(--brown-light)',
                    border: idx === 0 ? 'none' : '1px solid var(--stone)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{
              padding: '48px',
              background: 'var(--cream)',
              borderRadius: '12px',
              textAlign: 'center',
              color: 'var(--brown-light)'
            }}>
              <Library size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h4 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Biblioteca Vazia</h4>
              <p>Adicione materiais, objetos 3D e texturas específicos deste projeto.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Decisões */}
      {activeTab === 'decisoes' && (
        <ProjetoDecisoes projetoId={project?.id} />
      )}

      {/* Tab Viabilidade Urbanística */}
      {activeTab === 'viabilidade' && (
        <ViabilidadeModule projetoId={project?.id} projeto={project} />
      )}

      {/* Tab Chat IA */}
      {activeTab === 'chat-ia' && (
        <ProjetoChatIA projetoId={project?.id} projeto={project} />
      )}

      {/* Tab Gestão de Projeto com subtabs */}
      {activeTab === 'gestao' && (
        <div>
          {/* Section navigation */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--stone)',
            paddingBottom: '12px'
          }}>
            {gestaoSections.map(section => (
              <button
                key={section.id}
                onClick={() => handleSubtabChange(section.id, 'gestao')}
                style={{
                  padding: '8px 16px',
                  background: activeGestaoSection === section.id ? 'var(--brown)' : 'transparent',
                  color: activeGestaoSection === section.id ? 'white' : 'var(--brown-light)',
                  border: activeGestaoSection === section.id ? 'none' : '1px solid var(--stone)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <section.icon size={14} />
                {section.label}
              </button>
            ))}
          </div>

          {/* Contratos */}
          {activeGestaoSection === 'contratos' && (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <FileText size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Contratos & Documentos</h3>
              <p style={{ color: 'var(--brown-light)', margin: 0 }}>Propostas, contratos e documentação legal</p>
            </div>
          )}

          {/* Diário de Projeto */}
          {activeGestaoSection === 'diario-projeto' && (
            <div className="card" style={{ padding: '20px' }}>
              <DiarioBordo projeto={project} />
            </div>
          )}

          {/* Faturação */}
          {activeGestaoSection === 'faturacao' && (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <Euro size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Faturação</h3>
              <p style={{ color: 'var(--brown-light)', margin: 0 }}>Gestão de faturação e pagamentos</p>
            </div>
          )}

          {/* Ficha de Cliente */}
          {activeGestaoSection === 'ficha-cliente' && (
            <div className="card">
              <div className="flex items-center gap-md" style={{ marginBottom: '24px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCircle size={24} style={{ color: 'var(--brown)' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
                    {project.cliente_nome || 'Cliente'}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: 0 }}>
                    Dados e histórico do cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/clientes/${project.cliente?.id}`)}
                className="btn btn-primary"
              >
                Ver Ficha Completa
              </button>
            </div>
          )}
        </div>
      )}


      {/* Modal de Upload */}
      {showUploadModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setShowUploadModal(false)
            setUploadingDoc(null)
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--white)',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div className="flex items-center justify-between mb-lg">
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                {uploadingDoc ? 'Anexar Proposta Assinada' : 'Adicionar Documento'}
              </h3>
              <button 
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadingDoc(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brown-light)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {uploadingDoc && (
              <div style={{
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                  Documento original:
                </div>
                <div style={{ fontWeight: 500, color: 'var(--brown)' }}>
                  {uploadingDoc.nome}
                </div>
              </div>
            )}

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                padding: '48px 32px',
                border: `2px dashed ${dragOver ? 'var(--blush)' : 'var(--stone)'}`,
                borderRadius: '16px',
                background: dragOver ? 'rgba(195, 186, 175, 0.1)' : 'var(--cream)',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <File size={28} style={{ color: 'var(--blush-dark)' }} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--brown)', marginBottom: '8px' }}>
                {uploadingDoc ? 'Selecione o PDF assinado' : 'Selecione um ficheiro PDF'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Arraste o ficheiro para aqui ou clique para selecionar
              </div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '8px' }}>
                Apenas ficheiros PDF
              </div>
            </div>

            <div className="flex items-center justify-end gap-sm" style={{ marginTop: '24px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadingDoc(null)
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar/Editar Render */}
      {showRenderModal && (
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
          onClick={() => setShowRenderModal(false)}
        >
          <div
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
              margin: '20px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--stone)'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                {editingRender ? 'Editar Render' : 'Adicionar Render'}
              </h2>
              <button
                onClick={() => setShowRenderModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: '24px' }}>
              {/* Compartimento */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                  Compartimento *
                </label>
                <input
                  type="text"
                  list="compartimentos-list"
                  value={renderForm.compartimento}
                  onChange={(e) => handleRenderCompartimentoChange(e.target.value)}
                  placeholder="Selecionar ou escrever nome..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'var(--white)',
                    color: 'var(--brown)'
                  }}
                />
                <datalist id="compartimentos-list">
                  {COMPARTIMENTOS.map(comp => (
                    <option key={comp} value={comp} />
                  ))}
                </datalist>
                <p style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '6px' }}>
                  Selecione da lista ou escreva um nome personalizado
                </p>
              </div>

              {/* Versão (auto) */}
              {renderForm.compartimento && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  background: 'var(--cream)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                    Versão automática
                  </span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--brown)',
                    background: 'var(--white)',
                    padding: '4px 12px',
                    borderRadius: '6px'
                  }}>
                    v{editingRender ? renderForm.versao : getNextVersion(renderForm.compartimento)}
                  </span>
                </div>
              )}

              {/* Imagem Upload com Drag & Drop */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                  Imagem do Render
                </label>
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '16/10',
                    background: renderForm.imagem_url ? `url(${renderForm.imagem_url}) center/cover` : 'var(--cream)',
                    borderRadius: '12px',
                    border: isDragging ? '3px dashed var(--info)' : '2px dashed var(--stone)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)'
                  }}
                  onClick={() => document.getElementById('render-image-input').click()}
                  onDragOver={handleRenderDragOver}
                  onDragLeave={handleRenderDragLeave}
                  onDrop={handleRenderDrop}
                >
                  {!renderForm.imagem_url && (
                    <>
                      <Upload size={32} style={{ color: isDragging ? 'var(--info)' : 'var(--brown-light)', opacity: isDragging ? 1 : 0.5, marginBottom: '8px' }} />
                      <span style={{ fontSize: '13px', color: isDragging ? 'var(--info)' : 'var(--brown-light)', fontWeight: isDragging ? 600 : 400 }}>
                        {isDragging ? 'Largue a imagem aqui' : 'Arraste ou clique para fazer upload'}
                      </span>
                    </>
                  )}
                  {renderForm.imagem_url && (
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      padding: '6px 12px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '11px'
                    }}>
                      Arraste ou clique para alterar
                    </div>
                  )}
                </div>
                <input
                  id="render-image-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleRenderImageUpload}
                />
              </div>

              {/* Data de Carregamento */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                  Data de Carregamento
                </label>
                <input
                  type="date"
                  value={renderForm.data_upload}
                  onChange={(e) => setRenderForm(prev => ({ ...prev, data_upload: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'var(--white)',
                    color: 'var(--brown)'
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '6px' }}>
                  Altere a data para registar histórico de imagens anteriores
                </p>
              </div>

              {/* Descrição */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--brown)' }}>
                  Descrição (opcional)
                </label>
                <textarea
                  value={renderForm.descricao}
                  onChange={(e) => setRenderForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Notas sobre este render..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Marcar como Final */}
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: renderForm.is_final ? 'rgba(var(--success-rgb), 0.1)' : 'var(--cream)',
                borderRadius: '12px',
                border: renderForm.is_final ? '2px solid var(--success)' : '1px solid var(--stone)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={renderForm.is_final}
                    onChange={(e) => setRenderForm(prev => ({ ...prev, is_final: e.target.checked }))}
                    style={{
                      width: '20px',
                      height: '20px',
                      accentColor: 'var(--success)'
                    }}
                  />
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brown)', display: 'block' }}>
                      Marcar como Imagem Final
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                      Esta imagem aparecerá nas entregas ao cliente
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              padding: '16px 24px',
              borderTop: '1px solid var(--stone)',
              background: 'var(--cream)'
            }}>
              <button onClick={() => setShowRenderModal(false)} className="btn btn-outline">
                Cancelar
              </button>
              <button
                onClick={handleSaveRender}
                className="btn btn-primary"
                disabled={!renderForm.compartimento}
              >
                {editingRender ? 'Guardar Alterações' : 'Adicionar Render'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Projeto */}
      {showEditModal && (
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
          onClick={() => setShowEditModal(false)}
        >
          <div 
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflow: 'auto',
              margin: '20px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '20px 24px', 
              borderBottom: '1px solid var(--stone)' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Editar Projeto</h2>
              <button 
                onClick={() => setShowEditModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {/* Nome */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Nome do Projeto *
                </label>
                <input 
                  type="text" 
                  value={editForm.nome || ''} 
                  onChange={e => setEditForm({...editForm, nome: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid var(--stone)', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              {/* Cliente */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Cliente
                </label>
                <select 
                  value={editForm.cliente_id || ''} 
                  onChange={e => setEditForm({...editForm, cliente_id: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid var(--stone)', 
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                >
                  <option value="">Selecionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} {c.codigo ? `(${c.codigo})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Tipologia e Subtipo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Tipologia
                  </label>
                  <select 
                    value={editForm.tipologia || ''} 
                    onChange={e => setEditForm({...editForm, tipologia: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Subtipo
                  </label>
                  <select 
                    value={editForm.subtipo || ''} 
                    onChange={e => setEditForm({...editForm, subtipo: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    <option value="">Selecionar...</option>
                    {SUBTIPOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Fase e Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Fase
                  </label>
                  <select 
                    value={editForm.fase || ''} 
                    onChange={e => setEditForm({...editForm, fase: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    {FASES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Status
                  </label>
                  <select 
                    value={editForm.status || ''} 
                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Progresso */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Progresso: {editForm.progresso || 0}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={editForm.progresso || 0} 
                  onChange={e => setEditForm({...editForm, progresso: e.target.value})}
                  style={{ width: '100%' }} 
                />
              </div>

              {/* Localização */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Morada
                  </label>
                  <input 
                    type="text" 
                    value={editForm.localizacao || ''} 
                    onChange={e => setEditForm({...editForm, localizacao: e.target.value})}
                    placeholder="Rua, número..."
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Cidade
                  </label>
                  <input 
                    type="text" 
                    value={editForm.cidade || ''} 
                    onChange={e => setEditForm({...editForm, cidade: e.target.value})}
                    placeholder="Lisboa"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    País
                  </label>
                  <input 
                    type="text" 
                    value={editForm.pais || ''} 
                    onChange={e => setEditForm({...editForm, pais: e.target.value})}
                    placeholder="Portugal"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              </div>

              {/* Áreas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Área Bruta (m²)
                  </label>
                  <input 
                    type="number" 
                    value={editForm.area_bruta || ''} 
                    onChange={e => setEditForm({...editForm, area_bruta: e.target.value})}
                    placeholder="0"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Área Exterior (m²)
                  </label>
                  <input 
                    type="number" 
                    value={editForm.area_exterior || ''} 
                    onChange={e => setEditForm({...editForm, area_exterior: e.target.value})}
                    placeholder="0"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              </div>

              {/* Datas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Data de Início
                  </label>
                  <input 
                    type="date" 
                    value={editForm.data_inicio || ''} 
                    onChange={e => setEditForm({...editForm, data_inicio: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Data Prevista de Conclusão
                  </label>
                  <input 
                    type="date" 
                    value={editForm.data_prevista || ''} 
                    onChange={e => setEditForm({...editForm, data_prevista: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              </div>

              {/* Orçamento */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Orçamento (€)
                </label>
                <input 
                  type="number" 
                  value={editForm.orcamento_atual || ''} 
                  onChange={e => setEditForm({...editForm, orcamento_atual: e.target.value})}
                  placeholder="0"
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid var(--stone)', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              {/* Notas */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Notas
                </label>
                <textarea 
                  value={editForm.notas || ''} 
                  onChange={e => setEditForm({...editForm, notas: e.target.value})}
                  rows={3}
                  placeholder="Notas adicionais sobre o projeto..."
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid var(--stone)', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }} 
                />
              </div>

              {/* Equipa do Projeto */}
              <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: '1px solid var(--stone)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500 }}>
                    Equipa do Projeto
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowEquipaModal(true)}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--brown)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                
                {equipaProjeto.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--brown-light)', textAlign: 'center', padding: '16px', background: 'var(--cream)', borderRadius: '8px' }}>
                    Sem membros atribuídos
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {equipaProjeto.map(m => (
                      <div key={m.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'var(--cream)',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'var(--brown)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          {m.utilizadores?.nome?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{m.utilizadores?.nome}</div>
                          <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{m.funcao}</div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveMembro(m.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            padding: '4px',
                            color: 'var(--brown-light)'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              padding: '16px 24px', 
              borderTop: '1px solid var(--stone)', 
              background: 'var(--cream)' 
            }}>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="btn btn-outline"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveProject} 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Membro à Equipa */}
      {showEquipaModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
          onClick={() => setShowEquipaModal(false)}
        >
          <div 
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto',
              margin: '20px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '20px 24px', 
              borderBottom: '1px solid var(--stone)' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Adicionar à Equipa</h2>
              <button 
                onClick={() => setShowEquipaModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '16px 24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '16px' }}>
                Selecione um colaborador para adicionar ao projeto
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
                {utilizadores
                  .filter(u => !equipaProjeto.some(e => e.utilizador_id === u.id))
                  .map(u => (
                    <div 
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'var(--cream)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--brown)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {u.nome?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '14px' }}>{u.nome}</div>
                          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                            {u.cargo || 'Sem cargo'} • {u.departamento || 'Sem departamento'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const funcao = prompt('Função no projeto:', u.cargo || 'Membro')
                          if (funcao !== null) {
                            handleAddMembro(u.id, funcao || 'Membro')
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--brown)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Adicionar
                      </button>
                    </div>
                  ))}
                  
                {utilizadores.filter(u => !equipaProjeto.some(e => e.utilizador_id === u.id)).length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--brown-light)', padding: '24px' }}>
                    Todos os colaboradores já estão na equipa
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de eliminação */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--brown)' }}>Eliminar Projeto</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--brown-light)', fontSize: '14px' }}>
              Tem a certeza que deseja eliminar o projeto <strong>{project?.nome}</strong>? Esta ação não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '10px 20px',
                  background: 'var(--stone)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--brown)'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  background: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para visualizar imagens em grande */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            cursor: 'zoom-out'
          }}
          onClick={() => setLightboxImage(null)}
        >
          {/* Header */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(rgba(0,0,0,0.8), transparent)'
          }}>
            <div style={{ color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{lightboxImage.compartimento}</h3>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>
                v{lightboxImage.versao} • {lightboxImage.data_upload ? new Date(lightboxImage.data_upload).toLocaleDateString('pt-PT') : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setMoleskineRender(lightboxImage); setLightboxImage(null) }}
                style={{
                  padding: '8px 16px',
                  background: '#8B8670',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Pencil size={14} /> Moleskine
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openEditRenderModal(lightboxImage); setLightboxImage(null) }}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Edit size={14} /> Editar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxImage(null) }}
                style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Imagem */}
          <img
            src={lightboxImage.imagem_url}
            alt={lightboxImage.compartimento}
            style={{
              maxWidth: '95vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Descrição (se existir) */}
          {lightboxImage.descricao && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              borderRadius: '8px',
              maxWidth: '80vw',
              textAlign: 'center',
              fontSize: '13px'
            }}>
              {lightboxImage.descricao}
            </div>
          )}

          {/* Badge Final */}
          {lightboxImage.is_final && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              padding: '8px 16px',
              background: 'var(--success)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle size={14} /> Imagem Final
            </div>
          )}
        </div>
      )}

      {/* Moleskine - Ferramenta de anotação de renders */}
      {moleskineRender && (
        <Moleskine
          projectId={project?.id}
          renderId={moleskineRender.id}
          renderImageUrl={moleskineRender.imagem_url}
          renderName={`${moleskineRender.compartimento} v${moleskineRender.versao}`}
          onClose={() => setMoleskineRender(null)}
          onSave={async () => {
            // Atualizar contagem de anotações
            if (project?.id) {
              const { data: annotationsData } = await supabase
                .from('render_annotations')
                .select('render_id, annotations')
                .eq('projeto_id', project.id)
              if (annotationsData) {
                const annotationsMap = {}
                annotationsData.forEach(a => {
                  annotationsMap[a.render_id] = a.annotations?.length || 0
                })
                setRenderAnnotations(annotationsMap)
              }
            }
          }}
        />
      )}

      {/* Moleskine Digital - Caderno digital independente */}
      {showMoleskineDigital && (
        <MoleskineDigital
          projectId={project?.id}
          projectName={project?.nome}
          onClose={() => setShowMoleskineDigital(false)}
        />
      )}
    </div>
  )
}
