import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Clock, CheckCircle2, AlertCircle,
  AlertTriangle, MessageCircle, ChevronRight, Calendar,
  Database, RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import TeamWorkloadGantt from '../components/TeamWorkloadGantt'

export default function DashboardProjetos() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    emAndamento: 0,
    concluidos: 0,
    decisoesPendentes: 0,
    urgente: 0,
    alta: 0,
    media: 0,
    baixa: 0
  })
  const [alertas, setAlertas] = useState([])
  const [projetosRecentes, setProjetosRecentes] = useState([])
  const [milestones, setMilestones] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Buscar projetos - sem join para evitar erros se clientes não existir
      const { data: projetos, error: projetosError } = await supabase
        .from('projetos')
        .select('*')
        .order('created_at', { ascending: false })

      if (projetosError) {
        console.error('Erro ao buscar projetos:', projetosError)
        throw projetosError
      }

      console.log('Projetos carregados:', projetos?.length || 0, projetos)

      // Buscar tarefas/decisões pendentes
      const { data: tarefas } = await supabase
        .from('tarefas')
        .select('*, projetos(codigo, nome)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(10)

      // Buscar milestones
      const { data: marcos } = await supabase
        .from('tarefas')
        .select('*, projetos(codigo, nome)')
        .eq('marco', true)
        .gte('data_fim', new Date().toISOString().split('T')[0])
        .order('data_fim', { ascending: true })
        .limit(5)

      if (projetos && projetos.length > 0) {
        const emAndamento = projetos.filter(p =>
          !p.arquivado && p.fase !== 'Entrega' && p.fase !== 'Casa Viva'
        ).length

        const concluidos = projetos.filter(p =>
          p.fase === 'Entrega' || p.fase === 'Casa Viva'
        ).length

        // Contar por prioridade baseada no orçamento
        let urgente = 0, alta = 0, media = 0, baixa = 0
        projetos.filter(p => !p.arquivado).forEach(p => {
          const orc = parseFloat(p.orcamento_atual) || 0
          if (orc >= 500000) urgente++
          else if (orc >= 300000) alta++
          else if (orc >= 100000) media++
          else baixa++
        })

        setStats({
          total: projetos.length,
          emAndamento,
          concluidos,
          decisoesPendentes: tarefas?.length || 0,
          urgente,
          alta,
          media,
          baixa
        })

        setProjetosRecentes(projetos.slice(0, 5).map(p => ({
          ...p,
          cliente_nome: p.cliente_nome || 'Cliente não definido'
        })))
      }

      // Gerar alertas baseados em dados reais ou mock
      const alertasData = []

      if (tarefas && tarefas.length > 0) {
        tarefas.slice(0, 4).forEach(t => {
          const diasPassados = Math.floor((new Date() - new Date(t.created_at)) / (1000 * 60 * 60 * 24))
          alertasData.push({
            id: t.id,
            tipo: t.tipo === 'aprovacao' ? 'warning' : 'info',
            titulo: t.titulo,
            projeto: t.projetos?.codigo || '',
            descricao: t.descricao?.substring(0, 50) || '',
            tempo: `há ${diasPassados}d`
          })
        })
      }

      // Se não houver alertas reais, usar mock
      if (alertasData.length === 0) {
        alertasData.push(
          { id: 1, tipo: 'warning', titulo: 'Aprovação de materiais pendente', projeto: 'GA00489', descricao: 'Escolha de pedra para bancadas', tempo: 'há 5d' },
          { id: 2, tipo: 'warning', titulo: 'Projeto sem atividade há 10 dias', projeto: 'GA00473', descricao: 'Ourique — Última atualização: 07/01', tempo: 'há 10d' },
          { id: 3, tipo: 'info', titulo: 'Decisão de layout aguarda resposta', projeto: 'GA00492', descricao: 'Configuração da suíte principal', tempo: 'há 3d' },
          { id: 4, tipo: 'info', titulo: 'Feedback do cliente pendente', projeto: 'GA00466', descricao: 'Proposta de iluminação enviada', tempo: 'há 2d' }
        )
      }
      setAlertas(alertasData)

      // Milestones
      if (marcos && marcos.length > 0) {
        setMilestones(marcos.map(m => ({
          id: m.id,
          data: new Date(m.data_fim),
          titulo: m.titulo,
          projeto: m.projetos?.codigo || '',
          nome: m.projetos?.nome || ''
        })))
      } else {
        // Mock milestones
        const hoje = new Date()
        setMilestones([
          { id: 1, data: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000), titulo: 'Entrega Projeto Execução', projeto: 'GA00489', nome: 'AS House' },
          { id: 2, data: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000), titulo: 'Reunião Aprovação', projeto: 'GA00492', nome: 'Villa Mar' }
        ])
      }

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return { dia: date.getDate(), mes: date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '') }
  }

  const getDiasRestantes = (date) => {
    const hoje = new Date()
    const diff = Math.ceil((date - hoje) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Projetos</h1>
          <p className="page-subtitle">Visão geral de todos os projetos</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Aviso se não há projetos */}
      {stats.total === 0 && (
        <div className="card" style={{
          padding: '32px',
          textAlign: 'center',
          marginBottom: '24px',
          background: 'var(--alert-warning-bg)',
          border: '1px solid var(--warning)'
        }}>
          <Database size={48} style={{ color: 'var(--warning)', marginBottom: '16px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px' }}>
            Nenhum projeto encontrado
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--brown-light)', marginBottom: '16px' }}>
            A base de dados não tem projetos. Execute o seed para criar dados de exemplo.
          </p>
          <button
            onClick={() => navigate('/admin/seed')}
            className="btn btn-primary"
          >
            Ir para Seed de Dados
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Total de Projetos</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.total}</div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} style={{ color: 'var(--brown-light)' }} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Em Andamento</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.emAndamento}</div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={22} style={{ color: 'var(--brown-light)' }} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Concluídos</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.concluidos}</div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={22} style={{ color: 'var(--brown-light)' }} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '8px' }}>Decisões Pendentes</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{stats.decisoesPendentes}</div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={22} style={{ color: 'var(--brown-light)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Por Prioridade */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>Por Prioridade</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}>
          <div style={{
            padding: '24px 16px',
            borderRadius: '12px',
            border: '1px solid #EEB6B2',
            background: 'rgba(238, 182, 178, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#C76A65', marginBottom: '4px' }}>{stats.urgente}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#C76A65', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Urgente</div>
          </div>

          <div style={{
            padding: '24px 16px',
            borderRadius: '12px',
            border: '1px solid #E5D5A0',
            background: 'rgba(229, 213, 160, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#C9A840', marginBottom: '4px' }}>{stats.alta}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#C9A840', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alta</div>
          </div>

          <div style={{
            padding: '24px 16px',
            borderRadius: '12px',
            border: '1px solid #B8C9E0',
            background: 'rgba(184, 201, 224, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#5B7BA3', marginBottom: '4px' }}>{stats.media}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#5B7BA3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Média</div>
          </div>

          <div style={{
            padding: '24px 16px',
            borderRadius: '12px',
            border: '1px solid #B5D4B5',
            background: 'rgba(181, 212, 181, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#5A8C5A', marginBottom: '4px' }}>{stats.baixa}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#5A8C5A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Baixa</div>
          </div>
        </div>
      </div>

      {/* Alertas & Decisões Pendentes */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Alertas & Decisões Pendentes</h3>
          <button
            onClick={() => navigate('/bloqueios')}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px', color: 'var(--accent-olive)' }}
          >
            Ver todos
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          {alertas.map(alerta => (
            <div
              key={alerta.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/bloqueios')}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: alerta.tipo === 'warning' ? 'rgba(201, 168, 130, 0.2)' : 'rgba(138, 158, 184, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {alerta.tipo === 'warning' ? (
                  <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                ) : (
                  <MessageCircle size={18} style={{ color: 'var(--info)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--brown)',
                  marginBottom: '4px'
                }}>
                  {alerta.titulo}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--brown-light)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {alerta.projeto} · {alerta.descricao}
                </div>
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--brown-light)',
                whiteSpace: 'nowrap'
              }}>
                {alerta.tempo}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projetos Recentes e Milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Projetos Recentes */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Projetos Recentes</h3>
            <button
              onClick={() => navigate('/projetos')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '12px', color: 'var(--accent-olive)' }}
            >
              Ver todos
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projetosRecentes.map(projeto => (
              <div
                key={projeto.id}
                onClick={() => navigate(`/projetos/${projeto.codigo}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--cream)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--stone)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={18} style={{ color: 'var(--brown-light)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--brown)',
                    marginBottom: '2px'
                  }}>
                    {projeto.codigo}_{(projeto.nome || '').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    {projeto.cliente_nome}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '60px',
                    height: '6px',
                    background: 'var(--stone)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${projeto.progresso || 0}%`,
                      height: '100%',
                      background: 'var(--accent-olive)',
                      borderRadius: '3px'
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brown)', minWidth: '32px' }}>
                    {projeto.progresso || 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximos Milestones */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Próximos Milestones</h3>
            <button
              onClick={() => navigate('/planning')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '12px', color: 'var(--accent-olive)' }}
            >
              Ver todos
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {milestones.map(milestone => {
              const { dia, mes } = formatDate(milestone.data)
              const diasRestantes = getDiasRestantes(milestone.data)
              return (
                <div
                  key={milestone.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px',
                    background: 'var(--cream)',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{
                    textAlign: 'center',
                    minWidth: '44px'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1 }}>{dia}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>{mes}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--brown)',
                      marginBottom: '2px'
                    }}>
                      {milestone.titulo}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                      {milestone.projeto} · {milestone.nome}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: diasRestantes <= 3 ? 'var(--warning)' : 'var(--accent-olive)',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'white',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap'
                  }}>
                    Em {diasRestantes} dias
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cronograma da Equipa */}
      <div style={{ marginTop: '24px' }}>
        <TeamWorkloadGantt />
      </div>
    </div>
  )
}
