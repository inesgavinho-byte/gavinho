import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ChevronLeft, ChevronRight, Calendar, Clock, Shield, Users, 
  FileText, AlertTriangle, MapPin, HardHat, FolderOpen
} from 'lucide-react'

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const DIAS_SEMANA_CURTO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// Tipos de eventos com cores e ícones
const TIPOS_EVENTO = {
  licenca: { label: 'Licença', cor: '#EF4444', icon: Shield },
  reuniao: { label: 'Reunião', cor: '#3B82F6', icon: Users },
  entrega: { label: 'Entrega', cor: '#10B981', icon: FileText },
  inspecao: { label: 'Inspeção', cor: '#F59E0B', icon: AlertTriangle },
  outro: { label: 'Outro', cor: '#6B7280', icon: Calendar }
}

// Obter início da semana (segunda-feira)
const getInicioSemana = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// Formatar data
const formatDate = (date) => {
  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

export default function CalendarioSemanal({ tipo = 'obras', height = '320px' }) {
  const navigate = useNavigate()
  const [eventos, setEventos] = useState([])
  const [licencas, setLicencas] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(getInicioSemana(new Date()))

  useEffect(() => {
    loadEventos()
    if (tipo === 'obras') {
      loadLicencas()
    }
  }, [currentWeek, tipo])

  const loadEventos = async () => {
    try {
      setLoading(true)
      const inicioSemana = new Date(currentWeek)
      const fimSemana = new Date(currentWeek)
      fimSemana.setDate(fimSemana.getDate() + 6)
      fimSemana.setHours(23, 59, 59)

      let query = supabase
        .from('calendario_eventos')
        .select('*, obras(codigo, nome), projetos(codigo, nome)')
        .gte('data_inicio', inicioSemana.toISOString())
        .lte('data_inicio', fimSemana.toISOString())
        .order('data_inicio', { ascending: true })

      // Filtrar por tipo
      if (tipo === 'obras') {
        query = query.not('obra_id', 'is', null)
      } else if (tipo === 'projetos') {
        query = query.not('projeto_id', 'is', null)
      }

      const { data, error } = await query
      if (error) throw error
      setEventos(data || [])
    } catch (err) {
      console.error('Erro ao carregar eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLicencas = async () => {
    try {
      const inicioSemana = new Date(currentWeek)
      const fimSemana = new Date(currentWeek)
      fimSemana.setDate(fimSemana.getDate() + 6)

      const { data } = await supabase
        .from('obra_licencas')
        .select('*, obras(codigo, nome)')
        .gte('data_expiracao', inicioSemana.toISOString().split('T')[0])
        .lte('data_expiracao', fimSemana.toISOString().split('T')[0])

      setLicencas(data || [])
    } catch (err) {
      console.error('Erro ao carregar licenças:', err)
    }
  }

  // Gerar dias da semana
  const diasSemana = useMemo(() => {
    const dias = []
    for (let i = 0; i < 7; i++) {
      const dia = new Date(currentWeek)
      dia.setDate(dia.getDate() + i)
      dias.push(dia)
    }
    return dias
  }, [currentWeek])

  // Combinar eventos e licenças
  const todosEventos = useMemo(() => {
    const eventosLicencas = licencas.map(l => ({
      id: `licenca-${l.id}`,
      titulo: `${l.tipo_nome}`,
      data_inicio: l.data_expiracao,
      tipo: 'licenca',
      cor: '#EF4444',
      obra_id: l.obra_id,
      obras: l.obras,
      isLicenca: true,
      licencaId: l.id
    }))

    return [...eventos, ...eventosLicencas]
  }, [eventos, licencas])

  // Eventos por dia
  const eventosPorDia = useMemo(() => {
    const porDia = {}
    diasSemana.forEach(dia => {
      const dateStr = dia.toISOString().split('T')[0]
      porDia[dateStr] = todosEventos.filter(e => {
        const eventoDate = e.data_inicio?.split('T')[0]
        return eventoDate === dateStr
      })
    })
    return porDia
  }, [diasSemana, todosEventos])

  const navegarSemana = (direcao) => {
    const novaSemana = new Date(currentWeek)
    novaSemana.setDate(novaSemana.getDate() + (direcao * 7))
    setCurrentWeek(novaSemana)
  }

  const irParaHoje = () => {
    setCurrentWeek(getInicioSemana(new Date()))
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Calcular número da semana
  const getNumeroSemana = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const handleEventoClick = (evento) => {
    if (evento.isLicenca && evento.obras?.codigo) {
      navigate(`/obras/${evento.obras.codigo}/licencas`)
    } else if (evento.obras?.codigo) {
      navigate(`/obras/${evento.obras.codigo}/calendario`)
    } else if (evento.projetos?.codigo) {
      navigate(`/projetos/${evento.projetos.codigo}`)
    }
  }

  return (
    <div className="card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid var(--stone)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--cream)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={18} style={{ color: 'var(--brown)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--brown)' }}>
              Calendário {tipo === 'obras' ? 'das Obras' : 'dos Projetos'}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
              Semana {getNumeroSemana(currentWeek)}  –  {formatDate(diasSemana[0])} - {formatDate(diasSemana[6])}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={irParaHoje}
            style={{
              padding: '6px 12px',
              background: 'var(--white)',
              border: '1px solid var(--stone)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--brown)',
              cursor: 'pointer'
            }}
          >
            Hoje
          </button>
          <div style={{ display: 'flex', background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--stone)' }}>
            <button
              onClick={() => navegarSemana(-1)}
              style={{ 
                padding: '6px 10px', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                color: 'var(--brown)',
                borderRight: '1px solid var(--stone)'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => navegarSemana(1)}
              style={{ 
                padding: '6px 10px', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                color: 'var(--brown)'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendário Semanal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: height }}>
        {diasSemana.map((dia, idx) => {
          const dateStr = dia.toISOString().split('T')[0]
          const eventosHoje = eventosPorDia[dateStr] || []
          const isHoje = dia.toDateString() === hoje.toDateString()
          const isWeekend = idx >= 5

          return (
            <div
              key={dateStr}
              style={{
                borderRight: idx < 6 ? '1px solid var(--stone)' : 'none',
                background: isHoje ? 'rgba(201, 168, 130, 0.08)' : isWeekend ? 'var(--cream)' : 'var(--white)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header do dia */}
              <div style={{
                padding: '10px 8px',
                borderBottom: '1px solid var(--stone)',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: isHoje ? 'var(--warning)' : 'var(--brown-light)',
                  textTransform: 'uppercase',
                  marginBottom: '2px'
                }}>
                  {DIAS_SEMANA_CURTO[idx]}
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: isHoje ? 700 : 500,
                  color: isHoje ? 'var(--brown)' : 'var(--brown)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isHoje ? '32px' : 'auto',
                  height: isHoje ? '32px' : 'auto',
                  borderRadius: '50%',
                  background: isHoje ? 'var(--warning)' : 'transparent',
                  color: isHoje ? 'white' : 'var(--brown)'
                }}>
                  {dia.getDate()}
                </div>
              </div>

              {/* Eventos do dia */}
              <div style={{ 
                flex: 1, 
                padding: '6px', 
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {eventosHoje.length === 0 ? (
                  <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--stone-dark)',
                    fontSize: '11px'
                  }}>
                    "”
                  </div>
                ) : (
                  eventosHoje.map(evento => {
                    const TipoIcon = TIPOS_EVENTO[evento.tipo]?.icon || Calendar
                    return (
                      <div
                        key={evento.id}
                        onClick={() => handleEventoClick(evento)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: `${evento.cor || TIPOS_EVENTO[evento.tipo]?.cor || '#6B7280'}15`,
                          borderLeft: `3px solid ${evento.cor || TIPOS_EVENTO[evento.tipo]?.cor || '#6B7280'}`,
                          cursor: 'pointer',
                          transition: 'transform 0.1s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <div style={{ 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: evento.cor || TIPOS_EVENTO[evento.tipo]?.cor,
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {evento.titulo}
                        </div>
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'var(--brown-light)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {tipo === 'obras' && evento.obras && (
                            <>
                              <HardHat size={10} />
                              {evento.obras.codigo}
                            </>
                          )}
                          {tipo === 'projetos' && evento.projetos && (
                            <>
                              <FolderOpen size={10} />
                              {evento.projetos.codigo}
                            </>
                          )}
                          {evento.data_inicio?.includes('T') && (
                            <span style={{ marginLeft: '4px' }}>
                              {evento.data_inicio.split('T')[1]?.substring(0, 5)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ 
        padding: '10px 16px', 
        borderTop: '1px solid var(--stone)',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        background: 'var(--cream)'
      }}>
        {Object.entries(TIPOS_EVENTO).map(([key, value]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '2px', 
              background: value.cor 
            }} />
            <span style={{ color: 'var(--brown-light)' }}>{value.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
