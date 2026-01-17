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
  Package
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminSeed() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }])
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

      // 7. PROCUREMENT
      addLog('📦 Criando itens de procurement...', 'info')
      const procurement = [
        { item: 'Contentor para obra', fornecedor: 'Máximo Entulhos', prazo: 'Esta semana', estado: 'Enviado' },
        { item: 'Instalação sanitária apoio obra', fornecedor: 'VENDAP', prazo: '—', estado: 'Aguarda' }
      ]

      for (const item of procurement) {
        const { error } = await supabase.from('tarefas').insert([{
          titulo: `[PROCUREMENT] ${item.item}`,
          descricao: `Fornecedor: ${item.fornecedor}\nPrazo: ${item.prazo}\nEstado: ${item.estado}`,
          projeto_id: projetoId,
          status: item.estado === 'Enviado' ? 'em_progresso' : 'pendente',
          prioridade: 'media',
          categoria: 'procurement',
          notas: `Fornecedor: ${item.fornecedor}`
        }])
        if (!error) addLog(`✅ Procurement: ${item.item}`, 'success')
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
                { icon: Users, label: '4 Utilizadores' },
                { icon: ListChecks, label: '10 Tarefas' },
                { icon: AlertTriangle, label: '2 Bloqueios' },
                { icon: Calendar, label: '1 Evento' },
                { icon: Package, label: '2 Procurement' }
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
