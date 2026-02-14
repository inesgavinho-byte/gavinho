import { useState, useEffect, lazy, Suspense } from 'react'
// react-router-dom navigate comes from useProjetoNavigation hook
import {
  ArrowLeft,
  MapPin,
  Building2,
  FileText,
  Download,
  Layers,
  Target,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Share,
  X,
  File,
  ListChecks,
  Image,
  Library,
  Settings,
  Eye,
  BookOpen,
  Package,
  Lightbulb,
  MessageSquare,
  HardHat,
  Calendar,
  Inbox
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { jsPDF } from 'jspdf'
import ProjetoEntregaveis from '../components/ProjetoEntregaveis'
import CentralEntregas from '../components/CentralEntregas'
import RecebidosEspecialidades from '../components/RecebidosEspecialidades'
import ProjetoAtas from '../components/ProjetoAtas'
import SubTabNav from '../components/projeto/SubTabNav'
import useProjetoNavigation from '../hooks/useProjetoNavigation'
import ProjetoFasesPrazo from '../components/projeto/tabs/ProjetoFasesPrazo'
import ProjetoArchviz from '../components/projeto/tabs/ProjetoArchviz'
import ProjetoBriefing from '../components/projeto/tabs/ProjetoBriefing'
import ProjetoGestao from '../components/projeto/tabs/ProjetoGestao'
import ProjetoAcompanhamento from '../components/projeto/tabs/ProjetoAcompanhamento'
import ProjetoBiblioteca from '../components/projeto/tabs/ProjetoBiblioteca'
import styles from './ProjetoDetalhe.module.css'

// Lazy-loaded heavy components
const DesignReview = lazy(() => import('../components/DesignReview'))
const ProjetoChatIA = lazy(() => import('../components/projeto/ProjetoChatIA'))

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

// Lazy loading fallback
const LazyFallback = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.loadingInner}>
      <div className={styles.spinner}></div>
      <p className={styles.loadingText}>A carregar...</p>
    </div>
  </div>
)

export default function ProjetoDetalhe() {
  const {
    id, activeTab, activeFaseSection, activeArchvizSection,
    activeGestaoSection, activeAcompSection, activeBriefingSection,
    setActiveArchvizSection, handleTabChange, handleSubtabChange, navigate
  } = useProjetoNavigation()
  const { isAdmin, user } = useAuth()
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

  // Escopo/Cliente state moved to extracted components (ProjetoFasesPrazo, ProjetoFichaCliente)
  // Archviz/Render state moved to useArchvizRenders hook (ProjetoArchviz component)

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

  // URL sync moved to useProjetoNavigation hook

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

  // handleUpdateFaseEstado/Avaliacao moved to ProjetoFasesPrazo

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

  // Escopo handlers moved to ProjetoFasesPrazo component

  // Navigation handlers moved to useProjetoNavigation hook
  // Ficha de cliente moved to ProjetoFichaCliente component
  // Render handlers moved to useArchvizRenders hook

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
            id: clienteData.id,
            codigo: clienteData.codigo,
            nome: clienteData.nome,
            titulo: '',
            tipo: clienteData.tipo || 'Particular',
            empresa: clienteData.empresa || '',
            documento: clienteData.nif ? `NIF: ${clienteData.nif}` : '',
            nif: clienteData.nif || '',
            email: clienteData.email,
            telefone: clienteData.telefone,
            morada: `${clienteData.morada || ''}, ${clienteData.codigo_postal || ''} ${clienteData.cidade || ''}`,
            morada_raw: clienteData.morada || '',
            codigo_postal: clienteData.codigo_postal || '',
            cidade: clienteData.cidade || '',
            notas: clienteData.notas || '',
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

        // Carregar equipa, intervenientes e fases (renders handled by ProjetoArchviz)
        fetchEquipaProjeto(projetoData.id)
        fetchIntervenientes(projetoData.id)
        fetchFasesContratuais(projetoData.id)

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
      <div className={`fade-in ${styles.loadingContainer}`}>
        <div className={styles.loadingInner}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>A carregar projeto...</p>
        </div>
      </div>
    )
  }
  
  // Projeto não encontrado
  if (!project) {
    return (
      <div className={`fade-in ${styles.notFound}`}>
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

  // Tabs principais
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'briefing', label: 'Briefing & Conceito', icon: Lightbulb, hasSubtabs: true },
    { id: 'fases', label: 'Fases & Entregas', icon: Target, hasSubtabs: true },
    { id: 'notebook', label: 'Notebook', icon: BookOpen },
    { id: 'chat-ia', label: 'Chat IA', icon: MessageSquare },
    { id: 'archviz', label: 'Archviz', icon: Image, hasSubtabs: true },
    { id: 'acompanhamento', label: 'Acompanhamento', icon: HardHat, hasSubtabs: true },
    { id: 'biblioteca', label: 'Biblioteca', icon: Library },
    { id: 'gestao', label: 'Gestão de Projeto', icon: Settings, hasSubtabs: true }
  ]

  // Secções dentro de Fases & Entregas
  const faseSections = [
    { id: 'prazo', label: 'Prazo Contratual & Escopo', icon: Calendar },
    { id: 'entregaveis', label: 'Entregáveis', icon: ListChecks },
    { id: 'recebidos', label: 'Recebidos', icon: Inbox },
    { id: 'entregas', label: 'Central Entregas', icon: Package },
    { id: 'design-review', label: 'Design Review', icon: Eye }
  ]

  // Section definitions moved to extracted tab components
  const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin())

  return (
    <div className="fade-in">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTopRow}>
            <button onClick={() => navigate(-1)} className={styles.backButton}>
              <ArrowLeft size={16} />
            </button>

            <h1 className={styles.projectTitle}>{project.nome}</h1>

            <span className={styles.projectCode}>{project.codigo}</span>
            {project.codigo_interno && (
              <span className={styles.internalCode}>{project.codigo_interno}</span>
            )}
          </div>

          <div className={styles.headerMetaRow}>
            <span className={styles.phaseBadge}>{project.fase}</span>

            <div
              className={styles.statusBadge}
              style={{
                background: `${getStatusColor(project.status)}12`,
                color: getStatusColor(project.status)
              }}
            >
              <div className={styles.statusDot} style={{ background: getStatusColor(project.status) }} />
              {getStatusLabel(project.status)}
            </div>

            <div className={styles.separator} />

            <span className={styles.metaItem}>
              <Building2 size={13} />
              {project.tipologia} · {project.subtipo}
            </span>
            <span className={styles.metaItem}>
              <MapPin size={13} />
              {project.localizacao.cidade}, {project.localizacao.pais}
            </span>
            <span className={styles.metaItem}>
              <Layers size={13} />
              {project.area_bruta} {project.unidade_area}
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className="btn btn-secondary" onClick={openEditModal}>
            <Edit size={16} />
            Editar
          </button>
          <div className={styles.actionsDropdown}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowActions(!showActions)}
              style={{ padding: '10px' }}
            >
              <MoreVertical size={18} />
            </button>
            {showActions && (
              <div className={styles.actionsMenu}>
                {[
                  { icon: Copy, label: 'Duplicar Projeto', onClick: handleDuplicate },
                  { icon: Share, label: 'Partilhar', onClick: handleShare },
                  { icon: Download, label: 'Exportar PDF', onClick: handleExportPDF },
                  { icon: Trash2, label: 'Eliminar', danger: true, onClick: handleDelete }
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    className={action.danger ? styles.actionsMenuItemDanger : styles.actionsMenuItem}
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

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
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
          <SubTabNav sections={faseSections} activeSection={activeFaseSection} onSectionChange={(id) => handleSubtabChange(id)} />

          {/* Content based on active section */}
          <div className="card">
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                {faseSections.find(s => s.id === activeFaseSection)?.label}
              </h3>
              <span className={styles.phaseBadge}>{project.fase || 'Fase não definida'}</span>
            </div>

            {/* Prazo Contratual */}
            {activeFaseSection === 'prazo' && (
              <ProjetoFasesPrazo
                project={project}
                setProject={setProject}
                fasesContratuais={fasesContratuais}
                refreshFases={() => fetchFasesContratuais(project.id)}
                onEditFase={handleEditFase}
                onRemoveFase={handleRemoveFase}
                onOpenFaseModal={() => {
                  setEditingFase(null)
                  setFaseForm({
                    nome: '',
                    descricao: '',
                    numero: (fasesContratuais.length + 1).toString(),
                    data_inicio: '',
                    data_fim: '',
                    estado: 'pendente'
                  })
                  setShowFaseModal(true)
                }}
              />
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
              <Suspense fallback={<LazyFallback />}>
                <DesignReview projeto={project} />
              </Suspense>
            )}

          </div>
        </div>
      )}

      {/* Tab Notebook (Atas) */}
      {activeTab === 'notebook' && (
        <ProjetoAtas projeto={project} />
      )}

      {/* Tab Briefing & Conceito */}
      {activeTab === 'briefing' && (
        <ProjetoBriefing
          project={project}
          user={user}
          activeBriefingSection={activeBriefingSection}
          onSectionChange={(id) => handleSubtabChange(id, 'briefing')}
        />
      )}

      {/* Tab Archviz */}
      {activeTab === 'archviz' && (
        <ProjetoArchviz
          project={project}
          user={user}
          activeArchvizSection={activeArchvizSection}
          onSectionChange={(id) => handleSubtabChange(id, 'archviz')}
        />
      )}

      {/* Tab Acompanhamento */}
      {activeTab === 'acompanhamento' && (
        <ProjetoAcompanhamento
          project={project}
          user={user}
          activeAcompSection={activeAcompSection}
          onSectionChange={(id) => handleSubtabChange(id, 'acompanhamento')}
        />
      )}

      {/* Tab Biblioteca do Projeto */}
      {activeTab === 'biblioteca' && (
        <ProjetoBiblioteca />
      )}

      {/* Tab Chat IA */}
      {activeTab === 'chat-ia' && (
        <Suspense fallback={<LazyFallback />}>
          <ProjetoChatIA projetoId={project?.id} projeto={project} />
        </Suspense>
      )}

      {/* Tab Gestão de Projeto */}
      {activeTab === 'gestao' && (
        <ProjetoGestao
          project={project}
          setProject={setProject}
          activeGestaoSection={activeGestaoSection}
          onSectionChange={(id) => handleSubtabChange(id, 'gestao')}
          projectId={id}
        />
      )}


      {/* Modal de Upload */}
      {showUploadModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowUploadModal(false); setUploadingDoc(null) }}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-lg">
              <h3 className={styles.modalTitle}>
                {uploadingDoc ? 'Anexar Proposta Assinada' : 'Adicionar Documento'}
              </h3>
              <button className={styles.modalClose} onClick={() => { setShowUploadModal(false); setUploadingDoc(null) }}>
                <X size={20} />
              </button>
            </div>

            {uploadingDoc && (
              <div className={styles.docInfo}>
                <div className={styles.docInfoLabel}>Documento original:</div>
                <div className={styles.docInfoName}>{uploadingDoc.nome}</div>
              </div>
            )}

            <div
              className={dragOver ? styles.dropZoneActive : styles.dropZone}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} className={styles.dropZoneInput} />
              <div className={styles.dropZoneIcon}>
                <File size={24} style={{ color: 'var(--blush-dark)' }} />
              </div>
              <div className={styles.dropZoneTitle}>
                {uploadingDoc ? 'Selecione o PDF assinado' : 'Selecione um ficheiro PDF'}
              </div>
              <div className={styles.dropZoneSubtitle}>Arraste o ficheiro para aqui ou clique para selecionar</div>
              <div className={styles.dropZoneHint}>Apenas ficheiros PDF</div>
            </div>

            <div className="flex items-center justify-end gap-sm" style={{ marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowUploadModal(false); setUploadingDoc(null) }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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

    </div>
  )
}
