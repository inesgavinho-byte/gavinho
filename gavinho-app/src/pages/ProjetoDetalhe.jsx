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
  Type,
  Camera
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
import ProjetoAtas from '../components/ProjetoAtas'
import ProjetoMoodboards from '../components/ProjetoMoodboards'
import ProjetoLevantamento from '../components/ProjetoLevantamento'
import ProjetoInspiracoes from '../components/ProjetoInspiracoes'

// Importar constantes de ficheiros separados
import {
  COMPARTIMENTOS,
  TIPOLOGIAS,
  SUBTIPOS,
  FASES,
  STATUS_OPTIONS,
  TIPOS_INTERVENIENTES
} from '../constants/projectConstants'

// Importar componentes de modais
import {
  DeleteConfirmModal,
  FaseContratualModal,
  EquipaModal,
  IntervenienteModal,
  RenderModal,
  ImageLightbox,
  EditProjectModal
} from '../components/projeto/modals'

// Importar componentes do dashboard
import { DashboardTab } from '../components/projeto/dashboard'

export default function ProjetoDetalhe() {
  const { id, tab: urlTab, subtab: urlSubtab } = useParams()
  const navigate = useNavigate()
  const { isAdmin, user } = useAuth()
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
  const [activeGestaoSection, setActiveGestaoSection] = useState(urlSubtab || 'decisoes')

  // Sub-tabs para Briefing & Conceito
  const [activeBriefingSection, setActiveBriefingSection] = useState(urlSubtab || 'moodboards')

  // Gestão de Renders/Archviz
  const [renders, setRenders] = useState([])
  const [showRenderModal, setShowRenderModal] = useState(false)
  const [editingRender, setEditingRender] = useState(null)
  const [lightboxImage, setLightboxImage] = useState(null) // Para lightbox
  const [lightboxImages, setLightboxImages] = useState([]) // Array de imagens para navegação no lightbox
  const [lightboxIndex, setLightboxIndex] = useState(0) // Índice atual no lightbox
  const [collapsedCompartimentos, setCollapsedCompartimentos] = useState({}) // Compartimentos colapsados
  const [moleskineRender, setMoleskineRender] = useState(null) // Para Moleskine (anotação de renders)
  const [renderAnnotations, setRenderAnnotations] = useState({}) // Mapa de render_id -> annotation count
  const [isDragging, setIsDragging] = useState(false) // Para drag & drop
  const [projetoCompartimentos, setProjetoCompartimentos] = useState([]) // Compartimentos do projeto
  const [renderForm, setRenderForm] = useState({
    compartimento: '',
    vista: '',
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
        .eq('id', project.id)

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

  // TIPOS_INTERVENIENTES agora importado de ../constants/projectConstants

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
        .order('vista')
        .order('versao', { ascending: false })

      if (error) throw error
      setRenders(data || [])

      // Carregar compartimentos do projeto
      const { data: compartimentosData } = await supabase
        .from('projeto_compartimentos')
        .select('nome')
        .eq('projeto_id', projetoId)
        .order('nome')

      if (compartimentosData) {
        setProjetoCompartimentos(compartimentosData.map(c => c.nome))
      }

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
      // Silent fail - renders will show as empty
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
    } else if (tabType === 'briefing') {
      setActiveBriefingSection(subtabId)
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
        .eq('id', project.id)

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
        
        // Buscar projeto do Supabase (por ID ou codigo)
        let projetoData = null
        let projetoError = null

        // Tentar buscar por ID (UUID)
        if (id.includes('-')) {
          const result = await supabase
            .from('projetos')
            .select('*')
            .eq('id', id)
            .single()
          projetoData = result.data
          projetoError = result.error
        } else {
          // Tentar buscar por codigo
          const result = await supabase
            .from('projetos')
            .select('*')
            .eq('codigo', id)
            .single()
          projetoData = result.data
          projetoError = result.error
        }

        if (projetoError || !projetoData) {
          console.error('Projeto nao encontrado:', id)
          setProject(null)
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
            cidade: projetoData.cidade || '',
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
          
          // Serviços com fases
          servicos: servicosData || [],

          // Pagamentos
          pagamentos: (pagamentosData || []).map(p => ({
            prestacao: p.prestacao_numero || p.prestacao,
            descricao: p.descricao,
            data: p.data_limite || p.data,
            valor: parseFloat(p.valor),
            estado: p.estado,
            data_pagamento: p.data_pagamento
          })),
          
          // Faturas
          faturas: (faturasData || []).map(f => ({
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
          
          // Documentos
          documentos: [],

          // Equipa
          equipa: {
            project_manager: null,
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
        setProject(null)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProject()

    // Supabase Realtime subscription para sincronizar alteracoes
    const channel = supabase
      .channel(`projeto-${id}-changes`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projetos' },
        (payload) => {
          // Verificar se e o projeto atual (por ID ou codigo)
          if (payload.new.id === id || payload.new.codigo === id) {
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
      case 'delayed': return 'var(--error)'
      case 'on_hold': return 'var(--info)'
      case 'completed': return 'var(--success)'
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
      case 'delayed': return 'Atrasado'
      case 'on_hold': return 'Em Espera'
      case 'completed': return 'Concluído'
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
  const getNextVersion = (compartimento, vista = '') => {
    // Filtrar renders pelo compartimento e vista
    const matchingRenders = renders.filter(r =>
      r.compartimento === compartimento &&
      (r.vista || '') === (vista || '')
    )
    return matchingRenders.length + 1
  }

  const openAddRenderModal = (compartimento = '', vista = '') => {
    setEditingRender(null)
    const versao = compartimento ? getNextVersion(compartimento, vista) : 1
    setRenderForm({
      compartimento: compartimento,
      vista: vista,
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
      vista: render.vista || '',
      versao: render.versao,
      descricao: render.descricao || '',
      is_final: render.is_final || false,
      imagem_url: render.imagem_url || '',
      data_upload: render.data_upload || render.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    })
    setShowRenderModal(true)
  }

  const handleRenderCompartimentoChange = (compartimento) => {
    const versao = getNextVersion(compartimento, renderForm.vista)
    setRenderForm(prev => ({ ...prev, compartimento, versao }))
  }

  const handleSaveRender = async () => {
    if (!renderForm.compartimento) {
      alert('Por favor selecione um compartimento')
      return
    }

    try {
      // Guardar compartimento do projeto se for novo
      const compartimentoNome = renderForm.compartimento.trim()
      if (compartimentoNome && !projetoCompartimentos.includes(compartimentoNome)) {
        const { error: compError } = await supabase
          .from('projeto_compartimentos')
          .insert([{
            projeto_id: project.id,
            nome: compartimentoNome,
            created_by: user?.id,
            created_by_name: user?.email?.split('@')[0] || 'Utilizador'
          }])
          .select()

        if (!compError) {
          setProjetoCompartimentos(prev => [...prev, compartimentoNome].sort())
        }
      }

      const renderData = {
        projeto_id: project.id,
        compartimento: compartimentoNome,
        vista: renderForm.vista || null,
        versao: editingRender ? renderForm.versao : getNextVersion(compartimentoNome, renderForm.vista),
        descricao: renderForm.descricao,
        is_final: renderForm.is_final,
        imagem_url: renderForm.imagem_url,
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
          alert('Erro ao guardar render: ' + error.message)
          return
        }
        setRenders(prev => [...prev, data])
      }

      setShowRenderModal(false)
      setEditingRender(null)
    } catch (err) {
      alert('Erro ao guardar render: ' + err.message)
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
      setRenders(prev => prev.filter(r => r.id !== render.id))
    } catch (err) {
      alert('Erro ao eliminar: ' + err.message)
    }
  }

  const toggleFinalImage = async (render) => {
    const newIsFinal = !render.is_final

    try {
      const { error } = await supabase
        .from('projeto_renders')
        .update({ is_final: newIsFinal })
        .eq('id', render.id)

      if (error) throw error
      setRenders(prev => prev.map(r =>
        r.id === render.id ? { ...r, is_final: newIsFinal } : r
      ))
    } catch (err) {
      alert('Erro ao atualizar: ' + err.message)
    }
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

  // Abrir lightbox com navegação
  const openLightbox = (render, imageArray = null) => {
    if (render.imagem_url) {
      setLightboxImage(render)
      if (imageArray && imageArray.length > 0) {
        // Filtrar apenas imagens com URL
        const imagesWithUrl = imageArray.filter(r => r.imagem_url)
        setLightboxImages(imagesWithUrl)
        const index = imagesWithUrl.findIndex(r => r.id === render.id)
        setLightboxIndex(index >= 0 ? index : 0)
      } else {
        setLightboxImages([render])
        setLightboxIndex(0)
      }
    }
  }

  // Navegar no lightbox
  const navigateLightbox = (direction) => {
    const newIndex = lightboxIndex + direction
    if (newIndex >= 0 && newIndex < lightboxImages.length) {
      setLightboxIndex(newIndex)
      setLightboxImage(lightboxImages[newIndex])
    }
  }

  // Toggle colapsar compartimento
  const toggleCompartimentoCollapse = (compartimento) => {
    setCollapsedCompartimentos(prev => ({
      ...prev,
      [compartimento]: !prev[compartimento]
    }))
  }

  // Renders agrupados por compartimento
  const rendersByCompartimento = renders.reduce((acc, render) => {
    if (!acc[render.compartimento]) {
      acc[render.compartimento] = []
    }
    acc[render.compartimento].push(render)
    return acc
  }, {})

  // Colapsar/Expandir todos os compartimentos
  const toggleAllCompartimentos = (collapse) => {
    const newState = {}
    Object.keys(rendersByCompartimento).forEach(comp => {
      newState[comp] = collapse
    })
    setCollapsedCompartimentos(newState)
  }

  // Imagens finais do projeto
  const imagensFinais = renders.filter(r => r.is_final)

  // Tabs principais
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'briefing', label: 'Briefing & Conceito', icon: Lightbulb, hasSubtabs: true },
    { id: 'fases', label: 'Fases & Entregas', icon: Target, hasSubtabs: true },
    { id: 'chat-ia', label: 'Chat IA', icon: MessageSquare },
    { id: 'archviz', label: 'Archviz', icon: Image, hasSubtabs: true },
    { id: 'biblioteca', label: 'Biblioteca', icon: Library },
    { id: 'gestao', label: 'Gestão de Projeto', icon: Settings, hasSubtabs: true }
  ]

  // Secções dentro de Briefing & Conceito
  const briefingSections = [
    { id: 'moodboards', label: 'Moodboards', icon: Lightbulb },
    { id: 'levantamento', label: 'Levantamento Fotografico', icon: Camera }
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
    { id: 'decisoes', label: 'Decisões', icon: ClipboardList },
    { id: 'viabilidade', label: 'Viabilidade', icon: FileSearch },
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
              {project.codigo_interno && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--info)',
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}>
                  {project.codigo_interno}
                </span>
              )}
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
        <DashboardTab
          project={project}
          equipaProjeto={equipaProjeto}
          intervenientes={intervenientes}
          onAddInterveniente={() => {
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
          onEditInterveniente={handleEditInterveniente}
          onRemoveInterveniente={handleRemoveInterveniente}
        />
      )}

      {/* Modal Adicionar/Editar Interveniente */}
      <IntervenienteModal
        isOpen={showIntervenienteModal}
        onClose={() => setShowIntervenienteModal(false)}
        onSave={handleSaveInterveniente}
        intervenienteForm={intervenienteForm}
        setIntervenienteForm={setIntervenienteForm}
        editingInterveniente={editingInterveniente}
      />

      {/* Modal Adicionar/Editar Fase Contratual */}
      <FaseContratualModal
        isOpen={showFaseModal}
        onClose={() => setShowFaseModal(false)}
        onSave={handleSaveFase}
        faseForm={faseForm}
        setFaseForm={setFaseForm}
        editingFase={editingFase}
      />

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
              <ProjetoAtas projeto={project} />
            )}
          </div>
        </div>
      )}

      {/* Tab Briefing & Conceito com subtabs */}
      {activeTab === 'briefing' && (
        <div>
          {/* Section navigation */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--stone)',
            paddingBottom: '12px'
          }}>
            {briefingSections.map(section => (
              <button
                key={section.id}
                onClick={() => handleSubtabChange(section.id, 'briefing')}
                style={{
                  padding: '8px 16px',
                  background: activeBriefingSection === section.id ? 'var(--brown)' : 'transparent',
                  color: activeBriefingSection === section.id ? 'white' : 'var(--brown-light)',
                  border: activeBriefingSection === section.id ? 'none' : '1px solid var(--stone)',
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

          {/* Moodboards */}
          {activeBriefingSection === 'moodboards' && (
            <ProjetoMoodboards
              projeto={project}
              userId={user?.id}
              userName={user?.email?.split('@')[0] || 'Utilizador'}
            />
          )}

          {/* Levantamento Fotografico */}
          {activeBriefingSection === 'levantamento' && (
            <ProjetoLevantamento
              projeto={project}
              userId={user?.id}
              userName={user?.email?.split('@')[0] || 'Utilizador'}
            />
          )}
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
            <div className="card">
              <ProjetoInspiracoes
                projeto={project}
                userId={user?.id}
                userName={user?.nome || user?.email}
                compartimentosProjeto={projetoCompartimentos}
              />
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
                {renders.length} render{renders.length !== 1 ? 's' : ''} • {imagensFinais.length} {imagensFinais.length !== 1 ? 'imagens finais' : 'imagem final'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Botões Colapsar/Expandir Tudo */}
              {Object.keys(rendersByCompartimento).length > 1 && (
                <>
                  <button
                    onClick={() => toggleAllCompartimentos(true)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: 'var(--brown-light)',
                      border: '1px solid var(--stone)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Colapsar todos os compartimentos"
                  >
                    <ChevronUp size={14} />
                    Colapsar
                  </button>
                  <button
                    onClick={() => toggleAllCompartimentos(false)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: 'var(--brown-light)',
                      border: '1px solid var(--stone)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Expandir todos os compartimentos"
                  >
                    <ChevronDown size={14} />
                    Expandir
                  </button>
                </>
              )}
              <button onClick={openAddRenderModal} className="btn btn-primary" style={{ padding: '10px 16px' }}>
                <Plus size={16} style={{ marginRight: '8px' }} />
                Adicionar Render
              </button>
            </div>
          </div>

          {/* Renders por Compartimento e Vista */}
          {Object.keys(rendersByCompartimento).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {Object.entries(rendersByCompartimento).map(([compartimento, compartimentoRenders]) => {
                // Agrupar renders por vista dentro do compartimento
                const rendersByVista = compartimentoRenders.reduce((acc, render) => {
                  const vista = render.vista || 'Vista Principal'
                  if (!acc[vista]) acc[vista] = []
                  acc[vista].push(render)
                  return acc
                }, {})

                const totalVersoes = compartimentoRenders.length
                const totalVistas = Object.keys(rendersByVista).length

                const isCollapsed = collapsedCompartimentos[compartimento]

                return (
                  <div key={compartimento} style={{
                    background: 'var(--white)',
                    border: '1px solid var(--stone)',
                    borderRadius: '12px',
                    padding: isCollapsed ? '12px 16px' : '16px',
                    transition: 'padding 0.2s ease'
                  }}>
                    {/* Cabeçalho do Compartimento */}
                    <div
                      className="flex items-center justify-between"
                      style={{
                        marginBottom: isCollapsed ? 0 : '16px',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleCompartimentoCollapse(compartimento)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCompartimentoCollapse(compartimento) }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: 'var(--brown-light)',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'transform 0.2s ease',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
                          }}
                          title={isCollapsed ? 'Expandir' : 'Colapsar'}
                        >
                          <ChevronDown size={18} />
                        </button>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
                          {compartimento}
                          <span style={{ fontWeight: 400, color: 'var(--brown-light)', marginLeft: '8px', fontSize: '13px' }}>
                            ({totalVistas} {totalVistas !== 1 ? 'vistas' : 'vista'} • {totalVersoes} {totalVersoes !== 1 ? 'versões' : 'versão'})
                          </span>
                        </h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Preview de imagens quando colapsado */}
                        {isCollapsed && compartimentoRenders.filter(r => r.imagem_url).slice(0, 4).map((render, idx) => (
                          <div
                            key={render.id}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '4px',
                              background: `url(${render.imagem_url}) center/cover`,
                              border: render.is_final ? '2px solid var(--success)' : '1px solid var(--stone)',
                              marginLeft: idx > 0 ? '-8px' : 0
                            }}
                            onClick={(e) => { e.stopPropagation(); openLightbox(render, compartimentoRenders) }}
                          />
                        ))}
                        <button
                          onClick={(e) => { e.stopPropagation(); openAddRenderModal(compartimento) }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Plus size={14} style={{ marginRight: '6px' }} />
                          Nova Vista
                        </button>
                      </div>
                    </div>

                    {/* Vistas dentro do Compartimento - só mostra se não colapsado */}
                    {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {Object.entries(rendersByVista).map(([vista, vistaRenders]) => (
                        <div key={vista} style={{
                          background: 'var(--cream)',
                          borderRadius: '8px',
                          padding: '12px'
                        }}>
                          {/* Cabeçalho da Vista */}
                          <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                              {vista}
                              <span style={{ fontWeight: 400, color: 'var(--brown-light)', marginLeft: '6px' }}>
                                ({vistaRenders.length} {vistaRenders.length !== 1 ? 'versões' : 'versão'})
                              </span>
                            </span>
                            <button
                              onClick={() => openAddRenderModal(compartimento, vista)}
                              style={{
                                padding: '4px 8px',
                                background: 'transparent',
                                color: 'var(--brown)',
                                border: '1px solid var(--stone)',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Plus size={12} />
                              Versão
                            </button>
                          </div>

                          {/* Grid de Renders da Vista */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px'
                          }}>
                            {vistaRenders
                              .sort((a, b) => (b.versao || 0) - (a.versao || 0))
                              .map((render) => (
                              <div
                                key={render.id}
                                style={{
                                  position: 'relative',
                                  aspectRatio: '16/10',
                                  background: render.imagem_url ? `url(${render.imagem_url}) center/cover` : 'var(--white)',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: render.is_final ? '3px solid var(--success)' : '1px solid var(--stone)',
                                  cursor: render.imagem_url ? 'pointer' : 'default'
                                }}
                                onClick={() => openLightbox(render, compartimentoRenders)}
                              >
                                {!render.imagem_url && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Image size={24} style={{ color: 'var(--brown-light)', opacity: 0.4 }} />
                                  </div>
                                )}

                                {/* Versão Badge */}
                                <div style={{
                                  position: 'absolute',
                                  top: '6px',
                                  left: '6px',
                                  padding: '3px 7px',
                                  background: 'rgba(0,0,0,0.7)',
                                  color: 'white',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600
                                }}>
                                  v{render.versao}
                                </div>

                                {/* Final Badge */}
                                {render.is_final && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    padding: '3px 6px',
                                    background: 'var(--success)',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    <CheckCircle size={10} />
                                    FINAL
                                  </div>
                                )}

                                {/* Hover Actions */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  padding: '6px',
                                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFinalImage(render) }}
                                    style={{
                                      padding: '3px 6px',
                                      background: render.is_final ? 'var(--error)' : 'var(--success)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '9px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {render.is_final ? 'Remover Final' : 'Marcar Final'}
                                  </button>
                                  <div style={{ display: 'flex', gap: '3px' }}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setMoleskineRender(render) }}
                                      style={{
                                        padding: '3px 6px',
                                        background: '#8B8670',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '9px',
                                        fontWeight: 500
                                      }}
                                      title="Moleskine - Anotar render"
                                    >
                                      <Pencil size={10} />
                                      Moleskine
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openEditRenderModal(render) }}
                                      style={{
                                        padding: '3px',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                      title="Editar"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteRender(render) }}
                                      style={{
                                        padding: '3px',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                )
              })}
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
                    border: '3px solid var(--success)',
                    cursor: render.imagem_url ? 'pointer' : 'default'
                  }}
                  onClick={() => render.imagem_url && openLightbox(render, imagensFinais)}
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
                    onClick={(e) => { e.stopPropagation(); toggleFinalImage(render) }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '6px',
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remover das imagens finais"
                  >
                    <X size={14} />
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

          {/* Sub-tab Moleskine - Abre diretamente o caderno */}
          {activeArchvizSection === 'moleskine' && (
            <MoleskineDigital
              projectId={project?.id}
              projectName={project?.nome}
              onClose={() => setActiveArchvizSection('inspiracoes')}
            />
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

          {/* Decisões */}
          {activeGestaoSection === 'decisoes' && (
            <ProjetoDecisoes projetoId={project?.id} />
          )}

          {/* Viabilidade Urbanística */}
          {activeGestaoSection === 'viabilidade' && (
            <ViabilidadeModule projetoId={project?.id} projeto={project} />
          )}

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
      <RenderModal
        isOpen={showRenderModal}
        onClose={() => setShowRenderModal(false)}
        onSave={handleSaveRender}
        renderForm={renderForm}
        setRenderForm={setRenderForm}
        editingRender={editingRender}
        isDragging={isDragging}
        getNextVersion={getNextVersion}
        onCompartimentoChange={handleRenderCompartimentoChange}
        onDragOver={handleRenderDragOver}
        onDragLeave={handleRenderDragLeave}
        onDrop={handleRenderDrop}
        onImageUpload={handleRenderImageUpload}
        projetoCompartimentos={projetoCompartimentos}
      />

      {/* MODAL: Editar Projeto */}
      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProject}
        editForm={editForm}
        setEditForm={setEditForm}
        clientes={clientes}
        equipaProjeto={equipaProjeto}
        saving={saving}
        onShowEquipaModal={() => setShowEquipaModal(true)}
        onRemoveMembro={handleRemoveMembro}
      />

      {/* Modal Adicionar Membro à Equipa */}
      <EquipaModal
        isOpen={showEquipaModal}
        onClose={() => setShowEquipaModal(false)}
        utilizadores={utilizadores}
        equipaProjeto={equipaProjeto}
        onAddMembro={handleAddMembro}
      />

      {/* Modal de confirmação de eliminação */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        projectName={project?.nome}
      />

      {/* Lightbox para visualizar imagens em grande */}
      <ImageLightbox
        image={lightboxImage}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onClose={() => { setLightboxImage(null); setLightboxImages([]); setLightboxIndex(0) }}
        onNavigate={navigateLightbox}
        onEditRender={(img) => { openEditRenderModal(img); setLightboxImage(null); setLightboxImages([]); setLightboxIndex(0) }}
        onOpenMoleskine={(img) => { setMoleskineRender(img); setLightboxImage(null); setLightboxImages([]); setLightboxIndex(0) }}
      />

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

    </div>
  )
}
