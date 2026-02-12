import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Search, HardHat, MapPin, Calendar, Building2, ChevronDown, Loader2,
  Play, Clock, CheckCircle, Pause, XCircle, Briefcase, TrendingUp
} from 'lucide-react'

const statusOptions = ['Todos', 'Planeamento', 'Em Curso', 'Pausada', 'Concluída', 'Cancelada']
const tipoOptions = ['Todos', 'Construção Nova', 'Remodelação', 'Ampliação', 'Fit-out']

const statusConfig = {
  'planeamento': { color: 'var(--info)', label: 'Planeamento', icon: Clock },
  'em_curso': { color: 'var(--success)', label: 'Em Curso', icon: Play },
  'pausada': { color: 'var(--warning)', label: 'Pausada', icon: Pause },
  'concluida': { color: 'var(--accent-olive)', label: 'Concluída', icon: CheckCircle },
  'cancelada': { color: 'var(--error)', label: 'Cancelada', icon: XCircle },
}

const getStatusValue = (label) => {
  const values = {
    'Planeamento': 'planeamento',
    'Em Curso': 'em_curso',
    'Pausada': 'pausada',
    'Concluída': 'concluida',
    'Cancelada': 'cancelada'
  }
  return values[label] || null
}

const formatDateRange = (dataInicio, dataFim) => {
  const format = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }
  const inicio = format(dataInicio)
  const fim = format(dataFim)
  if (inicio && fim) return `${inicio} — ${fim}`
  if (inicio) return inicio
  if (fim) return `até ${fim}`
  return '—'
}

export default function ObrasLista() {
  const navigate = useNavigate()
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('Todos')
  const [selectedTipo, setSelectedTipo] = useState('Todos')

  useEffect(() => {
    fetchObras()
  }, [])

  const fetchObras = async () => {
    try {
      const { data, error } = await supabase
        .from('obras')
        .select(`*, projetos (codigo, nome, cliente_nome)`)
        .order('codigo', { ascending: true })

      if (error) throw error
      setObras(data || [])
    } catch (error) {
      console.error('Erro ao carregar obras:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredObras = obras.filter(obra => {
    const matchesSearch = !searchTerm ||
      obra.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.localizacao?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === 'Todos' ||
      obra.status === getStatusValue(selectedStatus)

    const matchesTipo = selectedTipo === 'Todos' || obra.tipo === selectedTipo

    return matchesSearch && matchesStatus && matchesTipo
  })

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-olive)' }} />
      </div>
    )
  }

  const avgProgresso = obras.length > 0
    ? Math.round(obras.reduce((sum, o) => sum + (o.progresso || 0), 0) / obras.length)
    : 0

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Obras</h1>
          <p className="page-subtitle">
            {obras.length} obra{obras.length !== 1 ? 's' : ''} registada{obras.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total', value: obras.length, icon: HardHat, color: 'var(--brown)' },
          { label: 'Em Curso', value: obras.filter(o => o.status === 'em_curso').length, icon: Play, color: 'var(--success)' },
          { label: 'Planeamento', value: obras.filter(o => o.status === 'planeamento').length, icon: Clock, color: 'var(--info)' },
          { label: 'Concluídas', value: obras.filter(o => o.status === 'concluida').length, icon: CheckCircle, color: 'var(--accent-olive)' },
          { label: 'Progresso Médio', value: `${avgProgresso}%`, icon: TrendingUp, color: 'var(--warning)' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--white)',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--stone)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <stat.icon size={16} style={{ color: stat.color }} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brown)', lineHeight: 1.1 }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '1px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar por nome, código ou localização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--brown)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-olive)'}
            onBlur={e => e.target.style.borderColor = 'var(--stone)'}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '12px 36px 12px 16px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '13px',
              background: 'var(--white)',
              color: 'var(--brown)',
              appearance: 'none',
              cursor: 'pointer',
              minWidth: '170px',
              outline: 'none'
            }}
          >
            <option value="Todos">Todos os estados</option>
            {statusOptions.filter(s => s !== 'Todos').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', pointerEvents: 'none' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            style={{
              padding: '12px 36px 12px 16px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '13px',
              background: 'var(--white)',
              color: 'var(--brown)',
              appearance: 'none',
              cursor: 'pointer',
              minWidth: '170px',
              outline: 'none'
            }}
          >
            <option value="Todos">Todos os tipos</option>
            {tipoOptions.filter(t => t !== 'Todos').map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', pointerEvents: 'none' }} />
        </div>

        {(selectedStatus !== 'Todos' || selectedTipo !== 'Todos' || searchTerm) && (
          <button
            onClick={() => { setSelectedStatus('Todos'); setSelectedTipo('Todos'); setSearchTerm('') }}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '20px',
              background: 'var(--stone)',
              color: 'var(--brown)',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--stone-dark)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--stone)'}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Results count */}
      {(selectedStatus !== 'Todos' || selectedTipo !== 'Todos' || searchTerm) && (
        <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '16px' }}>
          {filteredObras.length} resultado{filteredObras.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Obras Grid */}
      {filteredObras.length === 0 ? (
        <div style={{
          padding: '64px 24px',
          textAlign: 'center',
          color: 'var(--brown-light)',
          background: 'var(--white)',
          borderRadius: '16px',
          border: '2px dashed var(--stone)'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--cream)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <HardHat size={32} style={{ color: 'var(--brown-light)', opacity: 0.5 }} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px' }}>Nenhuma obra encontrada</h3>
          <p style={{ fontSize: '14px', color: 'var(--brown-light)' }}>Ajuste os filtros ou crie uma nova obra a partir do Dashboard Obras.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {filteredObras.map(obra => {
            const st = statusConfig[obra.status] || statusConfig['planeamento']
            const progresso = obra.progresso || 0
            const StatusIcon = st.icon

            return (
              <div
                key={obra.id}
                onClick={() => navigate(`/obras/${obra.codigo || obra.id}`)}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  background: 'var(--white)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--stone)',
                  transition: 'transform 0.2s ease, box-shadow 0.25s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                }}
              >
                {/* Status accent bar */}
                <div style={{ height: '4px', background: st.color, width: '100%' }} />

                <div style={{ padding: '18px 20px 16px' }}>
                  {/* Code + Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-olive)',
                      letterSpacing: '0.8px',
                      fontFamily: 'monospace'
                    }}>
                      {obra.codigo}
                    </span>
                    <span style={{
                      padding: '4px 11px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '20px',
                      background: `${st.color}15`,
                      color: st.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <StatusIcon size={11} />
                      {st.label}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--brown)',
                    margin: '0 0 4px',
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {obra.nome}
                  </h3>

                  {/* Project reference */}
                  {obra.projetos && (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--brown-light)',
                      margin: '0 0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Briefcase size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                      {obra.projetos.codigo} — {obra.projetos.nome}
                    </p>
                  )}

                  {/* Meta row */}
                  <div style={{
                    display: 'flex',
                    gap: '14px',
                    fontSize: '12px',
                    color: 'var(--brown-light)',
                    marginBottom: '14px',
                    flexWrap: 'wrap'
                  }}>
                    {obra.localizacao && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={12} style={{ color: 'var(--accent-olive)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {obra.localizacao}
                        </span>
                      </div>
                    )}
                    {obra.tipo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={12} style={{ color: 'var(--accent-olive)', flexShrink: 0 }} />
                        <span>{obra.tipo}</span>
                      </div>
                    )}
                    {(obra.data_inicio || obra.data_prevista_conclusao) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={12} style={{ color: 'var(--accent-olive)', flexShrink: 0 }} />
                        <span>{formatDateRange(obra.data_inicio, obra.data_prevista_conclusao)}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress section */}
                  <div style={{
                    background: 'var(--cream)',
                    borderRadius: '10px',
                    padding: '10px 12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Progresso
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brown)' }}>
                        {progresso}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '5px',
                      background: 'var(--stone)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progresso}%`,
                        height: '100%',
                        background: progresso >= 80 ? 'var(--accent-olive)' : progresso >= 40 ? 'var(--warning)' : st.color,
                        borderRadius: '3px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
