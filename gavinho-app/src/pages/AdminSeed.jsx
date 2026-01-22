import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Database,
  Play,
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowLeft,
  Building2,
  Users,
  ListChecks,
  Calendar,
  AlertTriangle,
  Package,
  HardHat,
  FileText,
  Send,
  ClipboardPaste,
  Table,
  X,
  Eye,
  Upload,
  Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Tabelas disponíveis para importação em massa
const IMPORT_TABLES = {
  utilizadores: {
    label: 'Colaboradores',
    icon: Users,
    fields: ['nome', 'email', 'cargo', 'departamento', 'telefone', 'data_entrada', 'tipo_contrato', 'regime'],
    required: ['nome', 'email'],
    example: 'nome,email,cargo,departamento,data_entrada\nJoão Silva,joao@gavinho.pt,Arquiteto,Projetos,2025-01-15\nMaria Costa,maria@gavinho.pt,Designer,Design,2025-02-01'
  },
  projetos: {
    label: 'Projetos',
    icon: Building2,
    fields: ['codigo', 'nome', 'tipologia', 'fase', 'cidade', 'cliente_nome', 'data_inicio', 'data_prevista'],
    required: ['codigo', 'nome'],
    example: 'codigo,nome,tipologia,fase,cidade,cliente_nome\nGA00500,Casa Nova,Residencial,Projeto Base,Lisboa,João Silva\nGA00501,Edifício Central,Comercial,Construção,Porto,Empresa ABC'
  },
  projeto_entregaveis: {
    label: 'Entregáveis',
    icon: FileText,
    fields: ['projeto_id', 'codigo', 'nome', 'fase', 'categoria', 'status', 'responsavel_id'],
    required: ['projeto_id', 'codigo', 'nome'],
    example: 'codigo,nome,fase,categoria,status\nARQ.01,Planta Piso 0,Projeto Base,Arquitetura,pendente\nARQ.02,Cortes,Projeto Base,Arquitetura,em_progresso'
  },
  tarefas: {
    label: 'Tarefas',
    icon: ListChecks,
    fields: ['projeto_id', 'titulo', 'descricao', 'status', 'prioridade', 'responsavel_id', 'data_inicio', 'data_fim'],
    required: ['titulo'],
    example: 'titulo,descricao,status,prioridade\nRever plantas,Verificar cotas e dimensões,pendente,alta\nAprovação cliente,Reunião de apresentação,pendente,media'
  }
}

export default function AdminSeed() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)

  // Estados para importação em massa
  const [showImportModal, setShowImportModal] = useState(false)
  const [importTable, setImportTable] = useState('utilizadores')
  const [importText, setImportText] = useState('')
  const [parsedData, setParsedData] = useState([])
  const [importFormat, setImportFormat] = useState('csv') // 'csv', 'json', 'lines'
  const [importing, setImporting] = useState(false)
  const [linkedProjectId, setLinkedProjectId] = useState('') // Para entregáveis e tarefas

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }])
  }

  // Funções de importação em massa
  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length === headers.length) {
        const row = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] || null
        })
        data.push(row)
      }
    }
    return data
  }

  const parseJSON = (text) => {
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return []
    }
  }

  const parseLines = (text) => {
    // Formato simples: uma linha por item, campos separados por |
    // Ex: João Silva | joao@email.com | Arquiteto
    const tableConfig = IMPORT_TABLES[importTable]
    const lines = text.trim().split('\n').filter(l => l.trim())

    return lines.map(line => {
      const values = line.split('|').map(v => v.trim())
      const row = {}
      tableConfig.fields.forEach((field, idx) => {
        if (values[idx]) row[field] = values[idx]
      })
      return row
    })
  }

  const handleParseText = () => {
    let data = []

    switch (importFormat) {
      case 'csv':
        data = parseCSV(importText)
        break
      case 'json':
        data = parseJSON(importText)
        break
      case 'lines':
        data = parseLines(importText)
        break
    }

    // Adicionar projeto_id se necessário
    if ((importTable === 'projeto_entregaveis' || importTable === 'tarefas') && linkedProjectId) {
      data = data.map(row => ({ ...row, projeto_id: linkedProjectId }))
    }

    setParsedData(data)
  }

  const handleBulkImport = async () => {
    if (parsedData.length === 0) {
      alert('Nenhum dado para importar. Parse os dados primeiro.')
      return
    }

    setImporting(true)
    setLogs([])
    setResult(null)

    addLog(`🚀 Iniciando importação de ${parsedData.length} registos para ${IMPORT_TABLES[importTable].label}...`, 'info')

    let successCount = 0
    let errorCount = 0

    for (const row of parsedData) {
      try {
        // Validar campos obrigatórios
        const tableConfig = IMPORT_TABLES[importTable]
        const missingFields = tableConfig.required.filter(f => !row[f])

        if (missingFields.length > 0) {
          addLog(`⚠️ Campos obrigatórios em falta: ${missingFields.join(', ')} - ${JSON.stringify(row).substring(0, 50)}...`, 'warning')
          errorCount++
          continue
        }

        // Preparar dados para inserção
        const insertData = { ...row }

        // Tratamentos especiais por tabela
        if (importTable === 'utilizadores') {
          insertData.ativo = true
          insertData.role = insertData.role || 'user'
        }

        const { error } = await supabase
          .from(importTable)
          .insert([insertData])

        if (error) {
          addLog(`❌ Erro: ${error.message} - ${row.nome || row.codigo || row.titulo || JSON.stringify(row).substring(0, 30)}`, 'error')
          errorCount++
        } else {
          addLog(`✅ ${row.nome || row.codigo || row.titulo || 'Registo'} inserido`, 'success')
          successCount++
        }
      } catch (err) {
        addLog(`💥 Erro inesperado: ${err.message}`, 'error')
        errorCount++
      }
    }

    addLog(`📊 Importação concluída: ${successCount} sucesso, ${errorCount} erros`, 'info')
    setResult({ success: errorCount === 0, error: errorCount > 0 ? `${errorCount} erros` : null })
    setImporting(false)
  }

  const loadExampleData = () => {
    const tableConfig = IMPORT_TABLES[importTable]
    setImportText(tableConfig.example)
    setImportFormat('csv')
  }

  const seedMariaResidences = async () => {
    setLoading(true)
    setLogs([])
    setResult(null)

    addLog('🚀 Iniciando seed do projeto Maria Residences...', 'info')

    try {
      // 1. CRIAR/ATUALIZAR PROJETO
      const projetoData = {
        codigo: 'GA00402',
        nome: 'Maria Residences',
        tipologia: 'Residencial',
        subtipo: 'Edifício',
        morada: 'Rua Maria nº 1 a 7',
        cidade: 'Lisboa',
        localizacao: 'Lisboa',
        pais: 'Portugal',
        fase: 'Construção',
        status: 'at_risk',
        progresso: 45,
        notas: 'Obra em fase de construção.\nEncarregado: Sr. Edgard Borges\nContacto obra: +351 937 263 804',
        data_inicio: '2024-06-01',
        data_prevista: '2025-06-30',
        orcamento_atual: 850000
      }

      // Verificar se projeto existe
      const { data: existingProject } = await supabase
        .from('projetos')
        .select('id')
        .eq('codigo', 'GA00402')
        .single()

      let projetoId

      if (existingProject) {
        const { data, error } = await supabase
          .from('projetos')
          .update(projetoData)
          .eq('codigo', 'GA00402')
          .select()
          .single()

        if (error) throw error
        projetoId = data.id
        addLog('✅ Projeto GA00402 atualizado', 'success')
      } else {
        const { data, error } = await supabase
          .from('projetos')
          .insert([projetoData])
          .select()
          .single()

        if (error) throw error
        projetoId = data.id
        addLog('✅ Projeto GA00402 criado', 'success')
      }

      // 2. CRIAR UTILIZADORES
      addLog('👥 Criando utilizadores...', 'info')
      const utilizadores = [
        { nome: 'João Umbelino', cargo: 'Arquiteto', departamento: 'Projetos', email: 'joao.umbelino@gavinho.pt' },
        { nome: 'Valentina Gatica', cargo: 'Arquiteta', departamento: 'Projetos', email: 'valentina.gatica@gavinho.pt' },
        { nome: 'Isabel Jardim', cargo: 'Arquiteta', departamento: 'Projetos', email: 'isabel.jardim@gavinho.pt' },
        { nome: 'Edgard Borges', cargo: 'Encarregado de Obra', departamento: 'Obras', email: 'edgard.borges@gavinho.pt' }
      ]

      const utilizadorIds = {}

      for (const util of utilizadores) {
        const { data: existing } = await supabase
          .from('utilizadores')
          .select('id')
          .eq('nome', util.nome)
          .single()

        if (existing) {
          utilizadorIds[util.nome] = existing.id
        } else {
          const { data, error } = await supabase
            .from('utilizadores')
            .insert([{ ...util, ativo: true }])
            .select()
            .single()

          if (!error && data) {
            utilizadorIds[util.nome] = data.id
            addLog(`✅ Utilizador criado: ${util.nome}`, 'success')
          }
        }
      }

      // 3. TAREFAS CONCLUÍDAS
      addLog('📋 Criando tarefas concluídas...', 'info')
      const tarefasConcluidas = [
        { titulo: 'Localização desenhos Samuel', responsavel: 'João Umbelino', data: '2024-11-21' },
        { titulo: 'Envio pré-certificados energéticos à Inês', responsavel: 'João Umbelino', data: '2024-11-21' },
        { titulo: 'Compatibilização projeto águas/esgotos AW Eng.', responsavel: 'Valentina Gatica', data: '2024-11-24' },
        { titulo: 'Guardar PDF e DWF projetos originais AW', responsavel: 'Valentina Gatica', data: '2024-11-25' },
        { titulo: 'Reunião eng. Ricardo — agendada visita obra', responsavel: 'Valentina Gatica', data: '2024-11-27' }
      ]

      for (const tarefa of tarefasConcluidas) {
        const { error } = await supabase.from('tarefas').insert([{
          titulo: tarefa.titulo,
          descricao: 'Tarefa do projeto Maria Residences',
          projeto_id: projetoId,
          responsavel_id: utilizadorIds[tarefa.responsavel] || null,
          responsavel_nome: tarefa.responsavel,
          status: 'concluido',
          prioridade: 'media',
          data_limite: tarefa.data,
          data_conclusao: tarefa.data
        }])
        if (!error) addLog(`✅ Tarefa concluída: ${tarefa.titulo}`, 'success')
      }

      // 4. TAREFAS EM PROGRESSO
      addLog('🔄 Criando tarefas em progresso...', 'info')
      const tarefasEmProgresso = [
        { titulo: 'Atualizar quantidades equipamento sanitário', responsavel: 'Valentina Gatica', estado: 'Aguarda mapas', prioridade: 'media' },
        { titulo: 'Pormenores IS e Cozinha', responsavel: 'Valentina Gatica', estado: 'Aguarda AW Eng.', prioridade: 'media' },
        { titulo: 'Planta cores convencionais último piso', responsavel: 'Valentina Gatica', estado: 'NÃO ENTREGUE', prioridade: 'alta' }
      ]

      for (const tarefa of tarefasEmProgresso) {
        const { error } = await supabase.from('tarefas').insert([{
          titulo: tarefa.titulo,
          descricao: `Estado: ${tarefa.estado}`,
          projeto_id: projetoId,
          responsavel_id: utilizadorIds[tarefa.responsavel] || null,
          responsavel_nome: tarefa.responsavel,
          status: 'em_progresso',
          prioridade: tarefa.prioridade,
          notas: tarefa.estado
        }])
        if (!error) addLog(`✅ Tarefa em progresso: ${tarefa.titulo}`, 'success')
      }

      // 5. BLOQUEIOS
      addLog('⚠️ Criando bloqueios...', 'info')
      const bloqueios = [
        { titulo: 'Compatibilização cortes e mapas gerais', dependencia: 'AW Engenharia', impacto: 'Atrasa Valentina', prioridade: 'alta' },
        { titulo: 'Planta cores último piso (parede gesso)', dependencia: 'Valentina — não entregue', impacto: 'BLOQUEIA MEDIDAS', prioridade: 'urgente' }
      ]

      for (const bloqueio of bloqueios) {
        const { error } = await supabase.from('decisoes').insert([{
          titulo: bloqueio.titulo,
          descricao: `Dependência: ${bloqueio.dependencia}\nImpacto: ${bloqueio.impacto}`,
          projeto_id: projetoId,
          tipo: 'blocker',
          status: 'pendente',
          prioridade: bloqueio.prioridade,
          responsavel: bloqueio.dependencia
        }])
        if (!error) addLog(`✅ Bloqueio criado: ${bloqueio.titulo}`, 'success')
      }

      // 6. EVENTO - VISITA OBRA
      addLog('📅 Criando evento visita obra...', 'info')
      const { error: eventoError } = await supabase.from('eventos').insert([{
        titulo: 'Visita obra Maria Residences (pedras + medidas janelas)',
        descricao: 'Participantes: Valentina Gatica + Arq. Isabel Jardim',
        projeto_id: projetoId,
        data: '2024-12-03',
        hora_inicio: '12:00',
        hora_fim: '14:00',
        tipo: 'visita_obra',
        local: 'Rua Maria nº 1 a 7, Lisboa',
        participantes: 'Valentina Gatica, Isabel Jardim'
      }])
      if (!eventoError) addLog('✅ Evento visita obra criado', 'success')

      // 7. PROCUREMENT - Logística Obra
      addLog('📦 Criando itens de procurement...', 'info')
      const procurement = [
        { item: 'Contentor para obra', fornecedor: 'Máximo Entulhos', prazo: 'Esta semana', estado: 'Enviado', prioridade: 'alta' },
        { item: 'Instalação sanitária apoio obra', fornecedor: 'VENDAP', prazo: '06/12', estado: 'Aguarda', prioridade: 'media' }
      ]

      for (const item of procurement) {
        const { error } = await supabase.from('tarefas').insert([{
          titulo: `[PROCUREMENT] ${item.item}`,
          descricao: `Fornecedor: ${item.fornecedor}\nPrazo: ${item.prazo}\nEstado: ${item.estado}`,
          projeto_id: projetoId,
          status: item.estado === 'Enviado' ? 'em_progresso' : 'pendente',
          prioridade: item.prioridade,
          categoria: 'procurement',
          notas: `Fornecedor: ${item.fornecedor}`
        }])
        if (!error) addLog(`✅ Procurement: ${item.item}`, 'success')
      }

      // 8. PROCUREMENT - Azulejos Fachada
      addLog('🏠 Criando procurement azulejos fachada...', 'info')
      const azulejosSpec = 'Azulejo 15x15cm, padrão geométrico tradicional (módulo 4 peças), ~111 m² (~5.217 un)'
      const fornecedoresAzulejos = [
        { nome: 'Taile Decor', preco: '€61,00/m²', prazo: 'A confirmar', estado: 'Reconfirmação enviada', estimativa: '~€7.787' },
        { nome: 'Cergam', preco: '~€152,75/m²', prazo: '90 dias', estado: 'Proposta recebida', estimativa: '~€17.205 + IVA' },
        { nome: 'Viúva Lamego', preco: '—', prazo: '—', estado: 'Aguarda resposta', estimativa: '—' }
      ]

      const { error: azulejosError } = await supabase.from('tarefas').insert([{
        titulo: '[PROCUREMENT] Azulejos Fachada - Comparação Fornecedores',
        descricao: `Especificação: ${azulejosSpec}\n\n` +
          fornecedoresAzulejos.map(f =>
            `${f.nome}: ${f.preco} | Prazo: ${f.prazo} | ${f.estado} | Est: ${f.estimativa}`
          ).join('\n'),
        projeto_id: projetoId,
        status: 'em_progresso',
        prioridade: 'alta',
        categoria: 'procurement',
        notas: 'Aguardar propostas finais até 06/12'
      }])
      if (!azulejosError) addLog('✅ Procurement azulejos criado', 'success')

      // 9. AUSÊNCIAS REGISTADAS
      addLog('🏥 Registando ausências...', 'info')
      const ausencias = [
        { nome: 'João Umbelino', data: '2024-12-02', motivo: 'Doença' },
        { nome: 'Valentina Gatica', data: '2024-11-28', motivo: 'Doença' }
      ]

      for (const ausencia of ausencias) {
        const { error } = await supabase.from('eventos').insert([{
          titulo: `[AUSÊNCIA] ${ausencia.nome} - ${ausencia.motivo}`,
          descricao: `Colaborador: ${ausencia.nome}\nMotivo: ${ausencia.motivo}`,
          projeto_id: projetoId,
          data: ausencia.data,
          tipo: 'ausencia',
          participantes: ausencia.nome
        }])
        if (!error) addLog(`✅ Ausência registada: ${ausencia.nome}`, 'success')
      }

      // 10. NOTAS IMPORTANTES
      addLog('📝 Adicionando notas críticas...', 'info')
      const notas = [
        { titulo: 'Reunião 02/12 - Planta cores não entregue', descricao: 'Acordado envio planta cores convencionais, não foi entregue', tipo: 'nota', prioridade: 'alta' },
        { titulo: 'PONTO CRÍTICO: Dependência AW Engenharia', descricao: 'Vários dias sem resposta da AW Engenharia - bloqueio ativo', tipo: 'blocker', prioridade: 'urgente' },
        { titulo: 'RISCO: Visita obra pode ficar comprometida', descricao: 'Visita de amanhã pode ficar comprometida sem planta do último piso', tipo: 'risco', prioridade: 'urgente' }
      ]

      for (const nota of notas) {
        if (nota.tipo === 'blocker' || nota.tipo === 'risco') {
          const { error } = await supabase.from('decisoes').insert([{
            titulo: nota.titulo,
            descricao: nota.descricao,
            projeto_id: projetoId,
            tipo: nota.tipo === 'blocker' ? 'blocker' : 'decision',
            status: 'pendente',
            prioridade: nota.prioridade
          }])
          if (!error) addLog(`✅ ${nota.tipo === 'blocker' ? 'Bloqueio' : 'Risco'}: ${nota.titulo}`, 'success')
        }
      }

      // 11. FOLLOW-UPS
      addLog('📞 Criando follow-ups...', 'info')
      const followups = [
        { acao: 'Contactar Valentina', prazo: '2024-12-02', motivo: 'Planta urgente', prioridade: 'urgente' },
        { acao: 'Ligar Máximo Entulhos', prazo: '2024-12-03', motivo: 'Contentor urgente', prioridade: 'alta' },
        { acao: 'Contactar AW Engenharia', prazo: '2024-12-02', motivo: 'Bloqueio ativo', prioridade: 'urgente' },
        { acao: 'Follow-up VENDAP', prazo: '2024-12-06', motivo: 'Sanitários obra', prioridade: 'media' },
        { acao: 'Follow-up Taile Decor', prazo: '2024-12-06', motivo: 'Proposta azulejos', prioridade: 'media' },
        { acao: 'Follow-up Viúva Lamego', prazo: '2024-12-06', motivo: 'Proposta azulejos', prioridade: 'media' }
      ]

      for (const followup of followups) {
        const { error } = await supabase.from('tarefas').insert([{
          titulo: `[FOLLOW-UP] ${followup.acao}`,
          descricao: followup.motivo,
          projeto_id: projetoId,
          status: 'pendente',
          prioridade: followup.prioridade,
          data_limite: followup.prazo,
          categoria: 'followup',
          notas: `Motivo: ${followup.motivo}`
        }])
        if (!error) addLog(`✅ Follow-up: ${followup.acao}`, 'success')
      }

      // 12. CRIAR OBRA
      addLog('🏗️ Criando obra Maria Residences...', 'info')
      const obraData = {
        nome: 'Maria Residences',
        projeto_id: projetoId,
        localizacao: 'Rua Maria nº 1 a 7, Lisboa',
        tipo: 'Construção Nova',
        status: 'em_curso',
        progresso: 35,
        data_inicio: '2024-06-01',
        data_prevista_conclusao: '2025-06-30',
        encarregado: 'Sr. Edgard Borges',
        contacto_obra: '+351 937 263 804',
        orcamento: 850000,
        notas: 'Obra em fase de construção.\nEncarregado: Sr. Edgard Borges\nContacto: +351 937 263 804'
      }

      // Verificar se obra já existe
      const { data: existingObra } = await supabase
        .from('obras')
        .select('id')
        .eq('nome', 'Maria Residences')
        .single()

      if (existingObra) {
        const { error } = await supabase
          .from('obras')
          .update(obraData)
          .eq('id', existingObra.id)
        if (!error) addLog('✅ Obra atualizada: Maria Residences', 'success')
      } else {
        const { error } = await supabase
          .from('obras')
          .insert([obraData])
        if (!error) addLog('✅ Obra criada: Maria Residences', 'success')
        else addLog(`⚠️ Erro ao criar obra: ${error.message}`, 'error')
      }

      addLog('🎉 Seed concluído com sucesso!', 'success')
      setResult({ success: true, projetoId })

    } catch (error) {
      console.error('Erro:', error)
      addLog(`❌ Erro: ${error.message}`, 'error')
      setResult({ success: false, error: error.message })
    }

    setLoading(false)
  }

  // ========== SEED ENTREGÁVEIS GA00489 ==========
  const seedEntregaveisGA00489 = async () => {
    setLoading(true)
    setLogs([])
    setResult(null)

    addLog('🚀 Iniciando seed de entregáveis GA00489 - AS House Mora...', 'info')

    try {
      // Verificar se projeto GA00489 existe
      const { data: projeto } = await supabase
        .from('projetos')
        .select('id')
        .eq('codigo', 'GA00489')
        .single()

      let projetoId
      if (!projeto) {
        // Criar projeto se não existir
        const { data: novoProjeto, error } = await supabase
          .from('projetos')
          .insert([{
            codigo: 'GA00489',
            nome: 'AS House - Mora',
            tipologia: 'Residencial',
            subtipo: 'Moradia',
            fase: 'Projeto Base',
            status: 'in_progress',
            progresso: 25
          }])
          .select()
          .single()

        if (error) throw error
        projetoId = novoProjeto.id
        addLog('✅ Projeto GA00489 criado', 'success')
      } else {
        projetoId = projeto.id
        addLog('✅ Projeto GA00489 encontrado', 'success')
      }

      // Limpar entregáveis existentes deste projeto
      await supabase
        .from('projeto_entregaveis')
        .delete()
        .eq('projeto_id', projetoId)

      addLog('🗑️ Entregáveis existentes removidos', 'info')

      // ========== PROJETO BASE ==========
      addLog('📐 Criando entregáveis do Projeto Base...', 'info')

      const entregaveisProjetoBase = [
        // 01 DESENHOS GERAIS
        // 01.01 Existente - Projeto Licenciado
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.01', desenho: 'Planta Piso -1', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.02', desenho: 'Planta Piso 0', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.03', desenho: 'Planta Piso 1', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.04', desenho: 'Planta Piso 2', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.05', desenho: 'Planta Cobertura', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.06', desenho: 'Corte AA', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.07', desenho: 'Corte BB', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.08', desenho: 'Alçado Norte', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.09', desenho: 'Alçado Sul', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.10', desenho: 'Alçado Este', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.11', desenho: 'Alçado Oeste', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        // 01.02 Cores Convencionais
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.01', desenho: 'Planta Piso -1', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.02', desenho: 'Planta Piso 0', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.03', desenho: 'Planta Piso 1', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.04', desenho: 'Planta Piso 2', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.05', desenho: 'Planta Cobertura', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.06', desenho: 'Corte AA', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.07', desenho: 'Corte BB', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.08', desenho: 'Alçado Norte', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.09', desenho: 'Alçado Sul', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.10', desenho: 'Alçado Este', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.11', desenho: 'Alçado Oeste', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        // 01.03 Proposta
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.01', desenho: 'Planta Piso -1', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.02', desenho: 'Planta Piso 0', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.03', desenho: 'Planta Piso 1', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.04', desenho: 'Planta Piso 2', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.05', desenho: 'Planta Cobertura', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.06', desenho: 'Corte AA', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.07', desenho: 'Corte BB', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.08', desenho: 'Alçado Norte', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.09', desenho: 'Alçado Sul', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.10', desenho: 'Alçado Este', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.11', desenho: 'Alçado Oeste', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        // 01.04 Proposta com Mobiliário
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.04', subNome: 'Proposta com Mobiliário', cod: '01.04.01', desenho: 'Planta Piso -1', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.04', subNome: 'Proposta com Mobiliário', cod: '01.04.02', desenho: 'Planta Piso 0', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.04', subNome: 'Proposta com Mobiliário', cod: '01.04.03', desenho: 'Planta Piso 1', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.04', subNome: 'Proposta com Mobiliário', cod: '01.04.04', desenho: 'Planta Piso 2', escala: '1/100', dataInicio: '2025-07-08', estado: 'para_revisao' },
        // 02 MAPAS GERAIS
        // 02.01 Mapa de Pavimentos
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Pavimentos', cod: '02.01.01', desenho: 'Planta Piso -1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Pavimentos', cod: '02.01.02', desenho: 'Planta Piso 0', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Pavimentos', cod: '02.01.03', desenho: 'Planta Piso 1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Pavimentos', cod: '02.01.04', desenho: 'Planta Piso 2', escala: '1/100', estado: 'nao_iniciado' },
        // 02.02 Mapa de Revestimento de Paredes
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.02', subNome: 'Mapa de Revestimento de Paredes', cod: '02.02.01', desenho: 'Planta Piso -1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.02', subNome: 'Mapa de Revestimento de Paredes', cod: '02.02.02', desenho: 'Planta Piso 0', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.02', subNome: 'Mapa de Revestimento de Paredes', cod: '02.02.03', desenho: 'Planta Piso 1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.02', subNome: 'Mapa de Revestimento de Paredes', cod: '02.02.04', desenho: 'Planta Piso 2', escala: '1/100', estado: 'nao_iniciado' },
        // 02.03 Mapa de Tetos
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.03', subNome: 'Mapa de Tetos', cod: '02.03.01', desenho: 'Planta Piso -1', escala: '1/100', estado: 'para_revisao' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.03', subNome: 'Mapa de Tetos', cod: '02.03.02', desenho: 'Planta Piso 0', escala: '1/100', estado: 'para_revisao' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.03', subNome: 'Mapa de Tetos', cod: '02.03.03', desenho: 'Planta Piso 1', escala: '1/100', estado: 'para_revisao' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.03', subNome: 'Mapa de Tetos', cod: '02.03.04', desenho: 'Planta Piso 2', escala: '1/100', estado: 'para_revisao' },
        // 02.04 Layout Elétrico
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Layout Elétrico', cod: '02.04.01', desenho: 'Planta Piso -1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Layout Elétrico', cod: '02.04.02', desenho: 'Planta Piso 0', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Layout Elétrico', cod: '02.04.03', desenho: 'Planta Piso 1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Layout Elétrico', cod: '02.04.04', desenho: 'Planta Piso 2', escala: '1/100', estado: 'nao_iniciado' },
        // Mapa de Acabamentos
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.05', subNome: 'Mapa de Acabamentos', cod: '02.05.01', desenho: 'Mapa de Acabamentos', escala: '-', estado: 'nao_iniciado' }
      ]

      // Inserir entregáveis do Projeto Base
      // Mapear status: 'para_revisao' -> 'em_progresso', 'nao_iniciado' -> 'pendente'
      const mapStatus = (estado) => {
        if (estado === 'para_revisao') return 'em_progresso'
        if (estado === 'nao_iniciado') return 'pendente'
        return 'pendente'
      }

      for (const ent of entregaveisProjetoBase) {
        const { error } = await supabase.from('projeto_entregaveis').insert([{
          projeto_id: projetoId,
          fase: 'Projeto Base',
          categoria: ent.catNome,
          codigo: ent.cod,
          nome: ent.desenho,
          escala: ent.escala,
          data_inicio: ent.dataInicio || null,
          data_conclusao: null,
          status: mapStatus(ent.estado),
          executante: null
        }])
        if (error) console.error('Erro ao inserir entregável:', error)
      }
      addLog(`✅ ${entregaveisProjetoBase.length} entregáveis do Projeto Base criados`, 'success')

      // ========== PROJETO DE EXECUÇÃO ==========
      addLog('📐 Criando entregáveis do Projeto de Execução...', 'info')

      const entregaveisProjetoExecucao = [
        // 01 DESENHOS GERAIS
        // 01.01 Existente - Projeto Licenciado
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.01', desenho: 'Planta Piso -1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.02', desenho: 'Planta Piso 0', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.03', desenho: 'Planta Piso 1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.04', desenho: 'Planta Piso 2', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.05', desenho: 'Planta Cobertura', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.06', desenho: 'Corte AA', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.07', desenho: 'Corte BB', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.08', desenho: 'Alçado Norte', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.09', desenho: 'Alçado Sul', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.10', desenho: 'Alçado Este', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.01', subNome: 'Existente - Projeto Licenciado', cod: '01.01.11', desenho: 'Alçado Oeste', escala: '1/100', estado: 'nao_iniciado' },
        // 01.02 Cores Convencionais
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.01', desenho: 'Planta Piso -1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.02', desenho: 'Planta Piso 0', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.03', desenho: 'Planta Piso 1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.04', desenho: 'Planta Piso 2', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.05', desenho: 'Planta Cobertura', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.06', desenho: 'Corte AA', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.07', desenho: 'Corte BB', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.08', desenho: 'Alçado Norte', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.09', desenho: 'Alçado Sul', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.10', desenho: 'Alçado Este', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.02', subNome: 'Cores Convencionais', cod: '01.02.11', desenho: 'Alçado Oeste', escala: '1/100', estado: 'nao_iniciado' },
        // 01.03 Proposta (escala 1/50)
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.01', desenho: 'Planta Piso -1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.02', desenho: 'Planta Piso 0', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.03', desenho: 'Planta Piso 1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.04', desenho: 'Planta Piso 2', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.05', desenho: 'Planta Cobertura', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.06', desenho: 'Corte AA', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.07', desenho: 'Corte BB', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.08', desenho: 'Alçado Norte', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.09', desenho: 'Alçado Sul', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.10', desenho: 'Alçado Este', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.03', subNome: 'Proposta', cod: '01.03.11', desenho: 'Alçado Oeste', escala: '1/50', estado: 'nao_iniciado' },
        // 01.04 Proposta com Mobiliário (escala 1/50)
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.04', subNome: 'Proposta com Mobiliário', cod: '01.04.01', desenho: 'Planta Piso -1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.04', subNome: 'Proposta com Mobiliário', cod: '01.04.02', desenho: 'Planta Piso 0', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.04', subNome: 'Proposta com Mobiliário', cod: '01.04.03', desenho: 'Planta Piso 1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '01', catNome: 'DESENHOS GERAIS', sub: '01.04', subNome: 'Proposta com Mobiliário', cod: '01.04.04', desenho: 'Planta Piso 2', escala: '1/50', estado: 'nao_iniciado' },
        // 02 MAPAS GERAIS
        // 02.01 Mapa de Paredes
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Paredes', cod: '02.01.01', desenho: 'Planta Piso -1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Paredes', cod: '02.01.02', desenho: 'Planta Piso 0', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Paredes', cod: '02.01.03', desenho: 'Planta Piso 1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Paredes', cod: '02.01.04', desenho: 'Planta Piso 2', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.01', subNome: 'Mapa de Paredes', cod: '02.01.05', desenho: 'Pormenores de Tipos de Paredes', escala: '1/10', estado: 'nao_iniciado' },
        // 02.02 Mapa de Pavimentos
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.02', subNome: 'Mapa de Pavimentos', cod: '02.02.01', desenho: 'Planta Piso -1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.02', subNome: 'Mapa de Pavimentos', cod: '02.02.02', desenho: 'Planta Piso 0', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.02', subNome: 'Mapa de Pavimentos', cod: '02.02.03', desenho: 'Planta Piso 1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.02', subNome: 'Mapa de Pavimentos', cod: '02.02.04', desenho: 'Planta Piso 2', escala: '1/50', estado: 'nao_iniciado' },
        // 02.03 Mapa de Revestimento de Paredes
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.03', subNome: 'Mapa de Revestimento de Paredes', cod: '02.03.01', desenho: 'Planta Piso -1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.03', subNome: 'Mapa de Revestimento de Paredes', cod: '02.03.02', desenho: 'Planta Piso 0', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.03', subNome: 'Mapa de Revestimento de Paredes', cod: '02.03.03', desenho: 'Planta Piso 1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.03', subNome: 'Mapa de Revestimento de Paredes', cod: '02.03.04', desenho: 'Planta Piso 2', escala: '1/50', estado: 'nao_iniciado' },
        // 02.04 Mapa de Tetos
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Mapa de Tetos', cod: '02.04.01', desenho: 'Planta Piso -1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Mapa de Tetos', cod: '02.04.02', desenho: 'Planta Piso 0', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Mapa de Tetos', cod: '02.04.03', desenho: 'Planta Piso 1', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Mapa de Tetos', cod: '02.04.04', desenho: 'Planta Piso 2', escala: '1/50', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.04', subNome: 'Mapa de Tetos', cod: '02.04.05', desenho: 'Pormenores de Tetos', escala: '1/10', estado: 'nao_iniciado' },
        // 02.05 Layout Elétrico
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.05', subNome: 'Layout Elétrico', cod: '02.05.01', desenho: 'Planta Piso -1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.05', subNome: 'Layout Elétrico', cod: '02.05.02', desenho: 'Planta Piso 0', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.05', subNome: 'Layout Elétrico', cod: '02.05.03', desenho: 'Planta Piso 1', escala: '1/100', estado: 'nao_iniciado' },
        { cat: '02', catNome: 'MAPAS GERAIS', sub: '02.05', subNome: 'Layout Elétrico', cod: '02.05.04', desenho: 'Planta Piso 2', escala: '1/100', estado: 'nao_iniciado' },
        // 03 MAPAS DE PORMENORES
        // 03.01 Mapa de Vãos Exteriores
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.01', subNome: 'Mapa de Vãos Exteriores', cod: '03.01.01', desenho: 'VE.01', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.01', subNome: 'Mapa de Vãos Exteriores', cod: '03.01.02', desenho: 'VE.02', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.01', subNome: 'Mapa de Vãos Exteriores', cod: '03.01.03', desenho: '...', escala: '1/20', estado: 'nao_iniciado' },
        // 03.02 Mapa de Vãos Interiores
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.02', subNome: 'Mapa de Vãos Interiores', cod: '03.02.01', desenho: 'VI.01', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.02', subNome: 'Mapa de Vãos Interiores', cod: '03.02.02', desenho: 'VI.02', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.02', subNome: 'Mapa de Vãos Interiores', cod: '03.02.03', desenho: '...', escala: '1/20', estado: 'nao_iniciado' },
        // 03.03 Mapa de Zonas Húmidas
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.03', subNome: 'Mapa de Zonas Húmidas', cod: '03.03.01', desenho: 'IS.01', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.03', subNome: 'Mapa de Zonas Húmidas', cod: '03.03.02', desenho: 'IS.02', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.03', subNome: 'Mapa de Zonas Húmidas', cod: '03.03.03', desenho: '...', escala: '1/20', estado: 'nao_iniciado' },
        // 03.04 Mapa de Pedras
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.04', subNome: 'Mapa de Pedras', cod: '03.04.01', desenho: 'Cantarias', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.04', subNome: 'Mapa de Pedras', cod: '03.04.02', desenho: 'Instalações Sanitárias', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.04', subNome: 'Mapa de Pedras', cod: '03.04.03', desenho: 'Tampos, backsplash e outros', escala: '1/20', estado: 'nao_iniciado' },
        // 03.05 Mapa de Marcenarias
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.05', subNome: 'Mapa de Marcenarias', cod: '03.05.01', desenho: 'MF.01', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.05', subNome: 'Mapa de Marcenarias', cod: '03.05.02', desenho: 'MF.02', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.05', subNome: 'Mapa de Marcenarias', cod: '03.05.03', desenho: 'MF.03', escala: '1/20', estado: 'nao_iniciado' },
        // 03.06 Mapa de Escadas e Rampas
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.06', subNome: 'Mapa de Escadas e Rampas', cod: '03.06.01', desenho: 'Escada Interior', escala: '1/20', estado: 'nao_iniciado' },
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.06', subNome: 'Mapa de Escadas e Rampas', cod: '03.06.02', desenho: 'Escada Exterior', escala: '1/20', estado: 'nao_iniciado' },
        // 03.07 Mapa de Guarda-Corpos
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.07', subNome: 'Mapa de Guarda-Corpos', cod: '03.07.01', desenho: 'Guarda-corpos', escala: '1/20', estado: 'nao_iniciado' },
        // 03.08 Outros Pormenores
        { cat: '03', catNome: 'MAPAS DE PORMENORES', sub: '03.08', subNome: 'Outros Pormenores', cod: '03.08.01', desenho: 'Pormenor 01', escala: '1/20', estado: 'nao_iniciado' }
      ]

      // Inserir entregáveis do Projeto de Execução
      for (const ent of entregaveisProjetoExecucao) {
        const { error } = await supabase.from('projeto_entregaveis').insert([{
          projeto_id: projetoId,
          fase: 'Projeto de Execução',
          categoria: ent.catNome,
          codigo: ent.cod,
          nome: ent.desenho,
          escala: ent.escala,
          data_inicio: null,
          data_conclusao: null,
          status: mapStatus(ent.estado),
          executante: null
        }])
        if (error) console.error('Erro ao inserir entregável:', error)
      }
      addLog(`✅ ${entregaveisProjetoExecucao.length} entregáveis do Projeto de Execução criados`, 'success')

      const totalEntregaveis = entregaveisProjetoBase.length + entregaveisProjetoExecucao.length
      addLog(`🎉 Seed concluído! Total: ${totalEntregaveis} entregáveis`, 'success')
      setResult({ success: true, projetoId, total: totalEntregaveis })

    } catch (error) {
      console.error('Erro:', error)
      addLog(`❌ Erro: ${error.message}`, 'error')
      setResult({ success: false, error: error.message })
    }

    setLoading(false)
  }

  // ============================================
  // SEED: Entregas Cliente MYRYAD (GA00469)
  // ============================================
  // Atualizar datas de entrada dos colaboradores
  const updateEmployeeDates = async () => {
    setLoading(true)
    setLogs([])
    setResult(null)

    addLog('👥 Atualizando datas de entrada dos colaboradores...', 'info')

    const employeeDates = [
      { nome: 'Luciana Ortega', data_entrada: '2025-02-14' },
      { nome: 'Leonardo Ribeiro', data_entrada: '2025-03-10' },
      { nome: 'Caroline Roda', data_entrada: '2025-03-24' },
      { nome: 'Giovana Martins', data_entrada: '2025-04-01' },
      { nome: 'Carolina Cipriano', data_entrada: '2025-06-23' },
      { nome: 'Laís Silva', data_entrada: '2025-07-14' },
      { nome: 'Alana Oliveira', data_entrada: '2025-09-22' },
      { nome: 'Ana Miranda', data_entrada: '2025-11-10' },
      { nome: 'Patrícia Morais', data_entrada: '2025-11-17' }
    ]

    try {
      let updated = 0
      let notFound = 0

      for (const employee of employeeDates) {
        const { data, error } = await supabase
          .from('utilizadores')
          .update({ data_entrada: employee.data_entrada })
          .ilike('nome', `%${employee.nome}%`)
          .select()

        if (error) {
          addLog(`❌ Erro ao atualizar ${employee.nome}: ${error.message}`, 'error')
        } else if (data && data.length > 0) {
          addLog(`✅ ${employee.nome} → ${employee.data_entrada}`, 'success')
          updated++
        } else {
          addLog(`⚠️ ${employee.nome} não encontrado`, 'warning')
          notFound++
        }
      }

      addLog(`📊 Resumo: ${updated} atualizados, ${notFound} não encontrados`, 'info')
      setResult({ success: true })
    } catch (err) {
      addLog(`💥 Erro: ${err.message}`, 'error')
      setResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const seedEntregasMYRYAD = async () => {
    setLoading(true)
    setLogs([])
    setResult(null)

    const addLog = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString('pt-PT')
      setLogs(prev => [...prev, { message, type, timestamp }])
    }

    try {
      addLog('🚀 Iniciando seed de Entregas MYRYAD...', 'info')

      // Verificar se projeto GA00469 existe
      addLog('🔍 Procurando projeto GA00469 - MYRYAD...', 'info')
      const { data: projetos, error: projError } = await supabase
        .from('projetos')
        .select('id, codigo, nome')
        .ilike('codigo', '%GA00469%')

      if (projError) throw projError

      let projetoId
      if (!projetos || projetos.length === 0) {
        addLog('⚠️ Projeto GA00469 não encontrado. A criar...', 'info')
        const { data: novoProjeto, error: createError } = await supabase
          .from('projetos')
          .insert([{
            codigo: 'GA00469',
            nome: 'MYRYAD Hotel',
            fase: 'Projeto de Execução',
            status: 'em_progresso',
            tipologia: 'Hotel',
            subtipo: 'Hotel 5 Estrelas'
          }])
          .select()
          .single()

        if (createError) throw createError
        projetoId = novoProjeto.id
        addLog(`✅ Projeto GA00469 criado: ${novoProjeto.id}`, 'success')
      } else {
        projetoId = projetos[0].id
        addLog(`✅ Projeto encontrado: ${projetos[0].nome} (${projetoId})`, 'success')
      }

      // Limpar entregas existentes
      addLog('🧹 Limpando entregas anteriores...', 'info')
      await supabase.from('projeto_entregas').delete().eq('projeto_id', projetoId)

      // Dados das entregas ao cliente
      const entregasCliente = [
        {
          numero: 1,
          data: '2024-08-02',
          titulo: 'Entrega 01 - Plantas e Projetos Iniciais',
          descricao: 'Planta Piso 0 Myriad + MCC - PDF +TIFF; Projeto Suite 1909 - PDF; Projeto Quarto Standard 1910 - PDF; MQT Suite 1909- PDF; MQT Quarto Standard 1910',
          observacoes: 'Piso 19 - Quarto 1910 - Suite 1909'
        },
        {
          numero: 2,
          data: '2024-09-05',
          titulo: 'Entrega 02 - Projeto Execução Arquitetura',
          descricao: 'Projeto Execução Arquitetura Suite 1909 PDF + DWG; Projeto Execução Arquitetura Quarto Standard 1910 - PDF + DWG; MQT Suite 1909 + Quarto 1910 - PDF',
          observacoes: 'Piso 19 - Quarto 1910 - Suite 1909'
        },
        {
          numero: 3,
          data: '2024-11-11',
          titulo: 'Entrega 03 - Artigos Marcenaria + Mobiliário',
          descricao: 'Artigos Marcenaria + Mobiliário- Quarto Standard 1910 - PDF; Artigos Marcenaria + Mobiliário - Suite 1909 - PDF',
          observacoes: 'Piso 19 - Quarto 1910 - Suite 1909'
        },
        {
          numero: 4,
          data: '2024-11-27',
          titulo: 'Entrega 04 - Proposta Plantas',
          descricao: 'Proposta Planta Piso 0- PDF; Planta Piso Tipo - PDF',
          observacoes: ''
        },
        {
          numero: 0,
          data: '2024-12-12',
          titulo: 'Entrega Mail - Revestimentos IS',
          descricao: 'Revestimentos e Material Bancadas IS - Resumo dos Materiais a Utilizar - PDF',
          observacoes: '',
          tipo_entrega: 'mail'
        },
        {
          numero: 5,
          data: '2025-01-17',
          titulo: 'Entrega 05 - Layout Elétrico v1',
          descricao: 'Layout Elétrico Quarto Standard 1910, v1 - PDF + DWG',
          observacoes: 'Piso 19 - Quarto 1910'
        },
        {
          numero: 6,
          data: '2025-01-22',
          titulo: 'Entrega 06 - Layout Elétrico v2',
          descricao: 'Layout Elétrico Quarto Standard 1910, v2 - PDF',
          observacoes: 'Piso 19 - Quarto 1910'
        },
        {
          numero: 7,
          data: '2025-01-27',
          titulo: 'Entrega 07 - Layout Elétrico v3',
          descricao: 'Layout Elétrico Quarto Standard 1910 v3 - PDF',
          observacoes: 'Piso 19 - Quarto 1910'
        },
        {
          numero: 0,
          data: '2025-02-04',
          titulo: 'Entrega Mail - Ficha Técnica Pavimento',
          descricao: 'Ficha Técnica - Pavimento SurPlus_TF_EN_10-2023 (1) - PDF',
          observacoes: '',
          tipo_entrega: 'mail'
        },
        {
          numero: 8,
          data: '2025-02-10',
          titulo: 'Entrega 08 - Pérgola MCC v2',
          descricao: 'Pérgola - Planta e Alçado MCC v2 - PDF',
          observacoes: ''
        },
        {
          numero: 9,
          data: '2025-02-25',
          titulo: 'Entrega 09 - Imagens 3D Pérgola + Mapa Acabamentos',
          descricao: 'Apresentação Imagens 3d Pérgola + Quarto Standard 1910 Mapa de acabamentos - PDF',
          observacoes: 'Piso 19 - Quarto 1910'
        },
        {
          numero: 10,
          data: '2025-03-03',
          titulo: 'Entrega 10 - Pérgola v3',
          descricao: 'Pérgola Planta e Alçado v3 - PDF; Pérgola Corte v3 - PDF; Pérgola MCC - DWG',
          observacoes: ''
        },
        {
          numero: 11,
          data: '2025-03-11',
          titulo: 'Entrega 11 - Pacote Completo',
          descricao: 'Apresentação Myriad Imagens e Mapa de Acabamentos - PDF; Proposta Crystal Center Piso 0, 1 e 2 - PDF; Pormenor Aro de Pedra Corredores + Imagens 3D - PDF; Listagem de Equipamentos Decoração - PDF; Planta Piso 0 Proposta 1 e 2 + Imagens 3D - PDF; Planta Piso 1 Proposta 1 e 2 + Imagens 3D - PDF; Pacote Projeto Quarto Premium + Imagens 3D - PDF; Pacote Projeto Quarto Standard 1910 - PDF; Quarto Standard 1910 Apainelados - PDF; Detalhes Serralharia - PDF; Planta e Corte Spa + Imagens 3D - PDF; Pacote Projeto Suite 1909 - PDF',
          observacoes: 'Piso 19 - Quarto 1910 - Suite 1909 - Premium'
        },
        {
          numero: 0,
          data: '2025-03-20',
          titulo: 'Entrega Mail - Tapete Quartos',
          descricao: 'Desenho Técnico Tapete Quartos - PDF + DWG; Imagem com textura do Tapete; Abstract_designs - PDF',
          observacoes: '',
          tipo_entrega: 'mail'
        },
        {
          numero: 0,
          data: '2025-03-28',
          titulo: 'Entrega Mail - Detalhe Pérgola',
          descricao: 'Print com detalhe do revestimento ripado da pérgola. Fachada em tubos - PDF',
          observacoes: '',
          tipo_entrega: 'mail'
        },
        {
          numero: 0,
          data: '2025-04-21',
          titulo: 'Entrega Mail - Mapa Tipologias',
          descricao: '230pa015q_01 - Mapa de Tipologías - PDF',
          observacoes: '',
          tipo_entrega: 'mail'
        },
        {
          numero: 0,
          data: '2025-05-13',
          titulo: 'Entrega Mail - DWG Quarto Modelo',
          descricao: 'Quarto Modelo Standard 1910 - DWG; Tampos em Pedra - DWG',
          observacoes: '',
          tipo_entrega: 'mail'
        },
        {
          numero: 12,
          data: '2025-06-05',
          titulo: 'Entrega 12 - PEXA Quartos',
          descricao: 'Informação Marca Argile - PDF; Imagens Referência Aparelhagem; PEXA Quarto Standard 1910 - PDF + DWG; PEXA Quarto Premium - PDF + DWG',
          observacoes: 'Piso 19 - Quarto 1910 - Premium'
        },
        {
          numero: 0,
          data: '2025-06-30',
          titulo: 'Entrega Mail - Tintas Argile',
          descricao: 'Aplicação das Tintas Argile nos Quartos Mock-up - PDF',
          observacoes: '',
          tipo_entrega: 'mail'
        },
        {
          numero: 0,
          data: '2025-07-03',
          titulo: 'Entrega Mail - Aparelhagem e Iluminação',
          descricao: 'Envio da referência da Aparelhagem Elétrica; PEXI Candeeiro de Pé - Quarto Standard - PDF; Tabela de iluminação - Quarto Standard - PDF; Explicação de Aplicação Cerâmico nos Corredores - PDF',
          observacoes: 'Piso 19 - Quarto 1910',
          tipo_entrega: 'mail'
        },
        {
          numero: 0,
          data: '2025-07-14',
          titulo: 'Entrega Mail - PEXA Premium Obra',
          descricao: 'PEXA Quarto Premium para Obra - PDF + DWF',
          observacoes: 'Piso 19 - Premium',
          tipo_entrega: 'mail'
        },
        {
          numero: 0,
          data: '2025-08-11',
          titulo: 'Entrega Mail - Mockup Bedrooms',
          descricao: 'GA00469_Myriad_Mockup Bedrooms_ Desenhos Técnicos e Imagens tridimensionais alteradas',
          observacoes: '',
          tipo_entrega: 'mail'
        }
      ]

      // Inserir entregas
      addLog('📦 Criando entregas ao cliente...', 'info')
      let countEntregas = 0
      let countMails = 0

      for (const entrega of entregasCliente) {
        const isMail = entrega.tipo_entrega === 'mail'
        const { error } = await supabase.from('projeto_entregas').insert([{
          projeto_id: projetoId,
          tipo: 'cliente',
          titulo: entrega.titulo,
          descricao: entrega.descricao,
          destinatario: 'Cliente MYRYAD',
          data_prevista: entrega.data,
          data_entrega: entrega.data,
          status: 'concluido',
          observacoes: entrega.observacoes || null,
          documentos: isMail ? 'Via Email' : 'Via Link'
        }])

        if (error) {
          addLog(`⚠️ Erro ao criar ${entrega.titulo}: ${error.message}`, 'error')
        } else {
          if (isMail) {
            countMails++
          } else {
            countEntregas++
          }
        }
      }

      addLog(`✅ ${countEntregas} entregas formais criadas`, 'success')
      addLog(`✅ ${countMails} entregas por email criadas`, 'success')

      const total = countEntregas + countMails
      addLog(`🎉 Seed concluído! Total: ${total} entregas`, 'success')
      setResult({ success: true, projetoId, total })

    } catch (error) {
      console.error('Erro:', error)
      addLog(`❌ Erro: ${error.message}`, 'error')
      setResult({ success: false, error: error.message })
    }

    setLoading(false)
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-md">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-icon"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Seed de Dados</h1>
            <p className="page-subtitle">Carregar dados reais para a plataforma</p>
          </div>
        </div>
      </div>

      {/* Seed Cards */}
      <div className="grid grid-2" style={{ gap: '24px', marginBottom: '32px' }}>
        {/* GA00489 Entregáveis Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-md" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent-olive), #5a6b50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FileText size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                GA00489 - AS House Mora
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Lista de Entregáveis (Projeto Base + Execução)
              </p>
            </div>
          </div>

          {/* O que será criado */}
          <div style={{
            background: 'var(--cream)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>
              O que será criado:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { icon: FileText, label: '57 Projeto Base' },
                { icon: FileText, label: '86 Projeto Execução' },
                { icon: ListChecks, label: 'Desenhos Gerais' },
                { icon: ListChecks, label: 'Mapas Gerais' },
                { icon: ListChecks, label: 'Mapas Pormenores' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-sm" style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                  <item.icon size={14} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={seedEntregaveisGA00489}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
          >
            {loading ? (
              <>
                <Loader size={18} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                A processar...
              </>
            ) : (
              <>
                <Play size={18} style={{ marginRight: '8px' }} />
                Executar Seed Entregáveis
              </>
            )}
          </button>
        </div>

        {/* MYRYAD Entregas Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-md" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--info), #5a7a9e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Send size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                GA00469 - MYRYAD
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Entregas ao Cliente (Ago 2024 - Ago 2025)
              </p>
            </div>
          </div>

          {/* O que será criado */}
          <div style={{
            background: 'var(--cream)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>
              O que será criado:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { icon: Send, label: '12 Entregas Formais' },
                { icon: FileText, label: '10 Entregas Email' },
                { icon: Package, label: 'Projetos Suite 1909' },
                { icon: Package, label: 'Quarto Standard 1910' },
                { icon: Building2, label: 'Pérgola & Spa' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-sm" style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                  <item.icon size={14} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={seedEntregasMYRYAD}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
          >
            {loading ? (
              <>
                <Loader size={18} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                A processar...
              </>
            ) : (
              <>
                <Play size={18} style={{ marginRight: '8px' }} />
                Executar Seed Entregas
              </>
            )}
          </button>
        </div>

        {/* Maria Residences Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-md" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Building2 size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                GA00402 - Maria Residences
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Rua Maria nº 1 a 7, Lisboa
              </p>
            </div>
          </div>

          {/* O que será criado */}
          <div style={{
            background: 'var(--cream)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>
              O que será criado:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { icon: Building2, label: '1 Projeto' },
                { icon: HardHat, label: '1 Obra' },
                { icon: Users, label: '4 Utilizadores' },
                { icon: ListChecks, label: '17 Tarefas' },
                { icon: AlertTriangle, label: '4 Bloqueios' },
                { icon: Calendar, label: '3 Eventos' },
                { icon: Package, label: '4 Procurement' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-sm" style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                  <item.icon size={14} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={seedMariaResidences}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
          >
            {loading ? (
              <>
                <Loader size={18} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                A processar...
              </>
            ) : (
              <>
                <Play size={18} style={{ marginRight: '8px' }} />
                Executar Seed
              </>
            )}
          </button>
        </div>

        {/* Employee Dates Update Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-md" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Users size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                Datas de Colaboração
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Atualizar datas de entrada dos colaboradores
              </p>
            </div>
          </div>

          {/* Lista de colaboradores */}
          <div style={{
            background: 'var(--cream)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>
              Colaboradores a atualizar:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--brown-light)' }}>
              <div>Luciana Ortega → 14/02/2025</div>
              <div>Leonardo Ribeiro → 10/03/2025</div>
              <div>Caroline Roda → 24/03/2025</div>
              <div>Giovana Martins → 01/04/2025</div>
              <div>Carolina Cipriano → 23/06/2025</div>
              <div>Laís Silva → 14/07/2025</div>
              <div>Alana Oliveira → 22/09/2025</div>
              <div>Ana Miranda → 10/11/2025</div>
              <div>Patrícia Morais → 17/11/2025</div>
            </div>
          </div>

          <button
            onClick={updateEmployeeDates}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
          >
            {loading ? (
              <>
                <Loader size={18} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                A processar...
              </>
            ) : (
              <>
                <Play size={18} style={{ marginRight: '8px' }} />
                Atualizar Datas de Entrada
              </>
            )}
          </button>
        </div>

        {/* Importação em Massa Card */}
        <div className="card" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <div className="flex items-center gap-md" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <ClipboardPaste size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                Importação em Massa
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Cole texto CSV, JSON ou linhas separadas para inserir múltiplos registos
              </p>
            </div>
          </div>

          {/* Seleção de tabela e formato */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown-light)' }}>
                Tabela de Destino
              </label>
              <select
                value={importTable}
                onChange={(e) => { setImportTable(e.target.value); setParsedData([]) }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                {Object.entries(IMPORT_TABLES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown-light)' }}>
                Formato dos Dados
              </label>
              <select
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="csv">CSV (vírgulas)</option>
                <option value="json">JSON</option>
                <option value="lines">Linhas (separador |)</option>
              </select>
            </div>

            {(importTable === 'projeto_entregaveis' || importTable === 'tarefas') && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown-light)' }}>
                  ID do Projeto (UUID)
                </label>
                <input
                  type="text"
                  value={linkedProjectId}
                  onChange={(e) => setLinkedProjectId(e.target.value)}
                  placeholder="Cole o UUID do projeto"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>

          {/* Campos disponíveis */}
          <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brown)', marginBottom: '8px' }}>
              Campos disponíveis para {IMPORT_TABLES[importTable].label}:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {IMPORT_TABLES[importTable].fields.map(field => (
                <span
                  key={field}
                  style={{
                    padding: '4px 10px',
                    background: IMPORT_TABLES[importTable].required.includes(field) ? 'var(--warning)' : 'white',
                    color: IMPORT_TABLES[importTable].required.includes(field) ? 'white' : 'var(--brown-light)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    border: '1px solid var(--stone)'
                  }}
                >
                  {field}{IMPORT_TABLES[importTable].required.includes(field) ? ' *' : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Área de texto para colar dados */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brown-light)' }}>
                Cole os dados aqui:
              </label>
              <button
                onClick={loadExampleData}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--info)',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                Carregar exemplo
              </button>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Cole aqui os dados em formato ${importFormat.toUpperCase()}...\n\nExemplo CSV:\nnome,email,cargo\nJoão Silva,joao@email.com,Arquiteto`}
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Botões de ação */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={handleParseText}
              disabled={!importText.trim()}
              className="btn btn-outline"
              style={{ flex: 1, padding: '12px' }}
            >
              <Eye size={16} style={{ marginRight: '8px' }} />
              Pré-visualizar Dados
            </button>
            <button
              onClick={() => { setImportText(''); setParsedData([]) }}
              className="btn btn-ghost"
              style={{ padding: '12px' }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Preview dos dados parseados */}
          {parsedData.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)', marginBottom: '8px' }}>
                Pré-visualização ({parsedData.length} registos):
              </div>
              <div style={{
                maxHeight: '200px',
                overflow: 'auto',
                border: '1px solid var(--stone)',
                borderRadius: '8px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)' }}>
                      {Object.keys(parsedData[0]).map(key => (
                        <th key={key} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--stone)', fontWeight: 600 }}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : 'var(--cream)' }}>
                        {Object.values(row).map((val, vIdx) => (
                          <td key={vIdx} style={{ padding: '8px 12px', borderBottom: '1px solid var(--stone)' }}>
                            {val || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div style={{ padding: '8px 12px', background: 'var(--cream)', fontSize: '11px', color: 'var(--brown-light)', textAlign: 'center' }}>
                    ... e mais {parsedData.length - 10} registos
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão de importar */}
          <button
            onClick={handleBulkImport}
            disabled={importing || parsedData.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
          >
            {importing ? (
              <>
                <Loader size={18} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                A importar {parsedData.length} registos...
              </>
            ) : (
              <>
                <Upload size={18} style={{ marginRight: '8px' }} />
                Importar {parsedData.length > 0 ? `${parsedData.length} Registos` : 'Dados'}
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
            Log de Execução
          </h3>

          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '16px',
            height: '300px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', paddingTop: '100px' }}>
                Clique em "Executar Seed" para iniciar...
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    color: log.type === 'success' ? '#4ade80' : log.type === 'error' ? '#f87171' : '#94a3b8',
                    marginBottom: '4px'
                  }}
                >
                  <span style={{ color: '#666' }}>[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>

          {result && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: result.success ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
              border: `1px solid ${result.success ? '#4ade80' : '#f87171'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {result.success ? (
                <>
                  <CheckCircle size={18} style={{ color: '#4ade80' }} />
                  <span style={{ color: '#4ade80', fontWeight: 500 }}>Seed concluído com sucesso!</span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} style={{ color: '#f87171' }} />
                  <span style={{ color: '#f87171', fontWeight: 500 }}>Erro: {result.error}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="card" style={{ padding: '24px', background: 'var(--cream)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>
          Dados da Obra Maria Residences
        </h4>
        <div style={{ fontSize: '13px', color: 'var(--brown-light)', lineHeight: 1.6 }}>
          <p><strong>Encarregado:</strong> Sr. Edgard Borges | <strong>Contacto:</strong> +351 937 263 804</p>
          <p style={{ marginTop: '8px' }}>
            Este seed cria o projeto GA00402 com todas as tarefas, bloqueios e eventos associados.
            Os dados podem ser editados posteriormente nas respetivas páginas da plataforma.
          </p>
        </div>
      </div>
    </div>
  )
}
