import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  User, Mail, Phone, Briefcase, Calendar, FolderOpen, Clock,
  ArrowLeft, Loader2, Building2, CheckSquare, AlertCircle,
  TrendingUp, BarChart3, Users, MapPin
} from 'lucide-react'

export default function EquipaMembro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [membro, setMembro] = useState(null)
  const [projetos, setProjetos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [stats, setStats] = useState({
    projetosAtivos: 0,
    tarefasPendentes: 0,
    tarefasConcluidas: 0
  })

  useEffect(() => {
    if (id) {
      loadMembro()
    }
  }, [id])

  const loadMembro = async () => {
    try {
      setLoading(true)

      // Buscar dados do membro
      const { data: membroData, error: membroError } = await supabase
        .from('utilizadores')
        .select('*')
        .eq('id', id)
        .single()

      if (membroError) throw membroError
      setMembro(membroData)

      // Buscar projetos onde o membro participa
      const { data: projetosData } = await supabase
        .from('projeto_equipa')
        .select(`
          projeto_id,
          funcao,
          data_entrada,
          projetos:projeto_id (
            id,
            codigo,
            nome,
            status,
            fase
          )
        `)
        .eq('utilizador_id', id)
        .is('data_saida', null)

      const projetosAtivos = projetosData?.filter(p => p.projetos).map(p => ({
        ...p.projetos,
        funcao: p.funcao,
        dataEntrada: p.data_entrada
      })) || []
      setProjetos(projetosAtivos)

      // Buscar tarefas do membro
      const { data: tarefasData } = await supabase
        .from('tarefas')
        .select('id, titulo, status, prioridade, data_limite, projeto_id')
        .eq('responsavel_id', id)
        .order('created_at', { ascending: false })
        .limit(10)

      setTarefas(tarefasData || [])

      // Calcular estatisticas
      const tarefasPendentes = tarefasData?.filter(t => t.status === 'pendente' || t.status === 'em_progresso').length || 0
      const tarefasConcluidas = tarefasData?.filter(t => t.status === 'concluida').length || 0

      setStats({
        projetosAtivos: projetosAtivos.length,
        tarefasPendentes,
        tarefasConcluidas
      })

    } catch (err) {
      console.error('Erro ao carregar membro:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'em_curso': return { bg: 'rgba(138, 158, 184, 0.15)', color: 'var(--info)' }
      case 'concluido': return { bg: 'rgba(122, 158, 122, 0.15)', color: 'var(--success)' }
      case 'on_hold': return { bg: 'rgba(201, 168, 130, 0.2)', color: 'var(--warning)' }
      default: return { bg: 'var(--stone)', color: 'var(--brown-light)' }
    }
  }

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'urgente': return 'var(--error)'
      case 'alta': return 'var(--warning)'
      case 'media': return 'var(--info)'
      default: return 'var(--brown-light)'
    }
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ color: 'var(--gold)', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>A carregar perfil...</p>
        </div>
      </div>
    )
  }

  if (!membro) {
    return (
      <div className="fade-in">
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--error)', marginBottom: '16px' }} />
          <h3>Colaborador nao encontrado</h3>
          <p className="text-muted">O colaborador que procuras nao existe ou foi removido.</p>
          <button className="btn btn-primary" onClick={() => navigate('/equipa')} style={{ marginTop: '16px' }}>
            <ArrowLeft size={16} />
            Voltar a Equipa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate('/equipa')}
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{membro.nome}</h1>
            <p className="page-subtitle">{membro.funcao || 'Colaborador'}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-lg)' }}>
        {/* Sidebar - Info do Membro */}
        <div className="flex flex-col gap-lg">
          {/* Card de Perfil */}
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blush) 0%, var(--blush-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '36px',
              fontWeight: 700,
              color: 'var(--brown-dark)'
            }}>
              {membro.avatar_url ? (
                <img
                  src={membro.avatar_url}
                  alt={membro.nome}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                membro.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              )}
            </div>

            <h2 style={{ marginBottom: '4px' }}>{membro.nome}</h2>
            <p className="text-muted">{membro.funcao || 'Colaborador'}</p>

            {membro.role && (
              <span className="badge" style={{
                marginTop: '8px',
                background: membro.role === 'admin' ? 'rgba(201, 168, 130, 0.2)' : 'var(--stone)',
                color: membro.role === 'admin' ? 'var(--gold)' : 'var(--brown-light)'
              }}>
                {membro.role === 'admin' ? 'Administrador' : membro.role === 'gp' ? 'Gestor de Projeto' : 'Colaborador'}
              </span>
            )}
          </div>

          {/* Contactos */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Contactos</h3>

            <div className="flex flex-col gap-md">
              {membro.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Mail size={16} style={{ color: 'var(--brown-light)' }} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>Email</div>
                    <a href={`mailto:${membro.email}`} style={{ color: 'var(--info)', fontSize: '14px' }}>
                      {membro.email}
                    </a>
                  </div>
                </div>
              )}

              {membro.telefone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Phone size={16} style={{ color: 'var(--brown-light)' }} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>Telefone</div>
                    <a href={`tel:${membro.telefone}`} style={{ color: 'var(--info)', fontSize: '14px' }}>
                      {membro.telefone}
                    </a>
                  </div>
                </div>
              )}

              {membro.created_at && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar size={16} style={{ color: 'var(--brown-light)' }} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>Na equipa desde</div>
                    <span style={{ fontSize: '14px' }}>
                      {new Date(membro.created_at).toLocaleDateString('pt-PT', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estatisticas */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Estatisticas</h3>

            <div className="flex flex-col gap-sm">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--cream)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderOpen size={16} style={{ color: 'var(--info)' }} />
                  <span>Projetos Ativos</span>
                </div>
                <span style={{ fontWeight: 700 }}>{stats.projetosAtivos}</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--cream)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: 'var(--warning)' }} />
                  <span>Tarefas Pendentes</span>
                </div>
                <span style={{ fontWeight: 700 }}>{stats.tarefasPendentes}</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--cream)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={16} style={{ color: 'var(--success)' }} />
                  <span>Tarefas Concluidas</span>
                </div>
                <span style={{ fontWeight: 700 }}>{stats.tarefasConcluidas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-lg">
          {/* Projetos */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 600 }}>Projetos Alocados</h3>
              <span className="text-muted" style={{ fontSize: '13px' }}>{projetos.length} projeto{projetos.length !== 1 ? 's' : ''}</span>
            </div>

            {projetos.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--brown-light)' }}>
                <FolderOpen size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p>Sem projetos atribuidos</p>
              </div>
            ) : (
              <div className="flex flex-col gap-sm">
                {projetos.map(projeto => (
                  <Link
                    key={projeto.id}
                    to={`/projetos/${projeto.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'var(--cream)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'var(--blush)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Building2 size={18} style={{ color: 'var(--brown-dark)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{projeto.nome}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        {projeto.codigo} • {projeto.funcao || 'Equipa'}
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: getStatusColor(projeto.status).bg,
                        color: getStatusColor(projeto.status).color
                      }}
                    >
                      {projeto.fase || projeto.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Tarefas Recentes */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 600 }}>Tarefas Recentes</h3>
              <Link to="/tarefas" className="text-muted" style={{ fontSize: '13px' }}>Ver todas</Link>
            </div>

            {tarefas.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--brown-light)' }}>
                <CheckSquare size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p>Sem tarefas atribuidas</p>
              </div>
            ) : (
              <div className="flex flex-col gap-sm">
                {tarefas.map(tarefa => (
                  <div
                    key={tarefa.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'var(--cream)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getPrioridadeColor(tarefa.prioridade),
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 500,
                        textDecoration: tarefa.status === 'concluida' ? 'line-through' : 'none',
                        opacity: tarefa.status === 'concluida' ? 0.6 : 1
                      }}>
                        {tarefa.titulo}
                      </div>
                      {tarefa.data_limite && (
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          Prazo: {new Date(tarefa.data_limite).toLocaleDateString('pt-PT')}
                        </div>
                      )}
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: tarefa.status === 'concluida'
                          ? 'rgba(122, 158, 122, 0.15)'
                          : tarefa.status === 'em_progresso'
                            ? 'rgba(138, 158, 184, 0.15)'
                            : 'var(--stone)',
                        color: tarefa.status === 'concluida'
                          ? 'var(--success)'
                          : tarefa.status === 'em_progresso'
                            ? 'var(--info)'
                            : 'var(--brown-light)',
                        fontSize: '11px'
                      }}
                    >
                      {tarefa.status === 'concluida' ? 'Concluida' :
                       tarefa.status === 'em_progresso' ? 'Em Progresso' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
