// =====================================================
// REGISTO PRESENCA COMPONENT
// Check-in/Check-out attendance tracking
// Features: Weekly summary, >12h warning
// =====================================================

import { useState, useEffect, useMemo } from 'react'
import {
  Clock, CalendarDays, LogIn, LogOut as LogOutIcon,
  Check, CheckCheck, Loader2, AlertTriangle, TrendingUp,
  BarChart3
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { styles } from '../styles'
import { formatTime as formatTimeUtil, calculateDuration } from '../utils'

const OVERTIME_THRESHOLD = 12 // Hours threshold for warning

// Component-specific styles
const localStyles = {
  statusCard: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: 24
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: '#3d4349',
    color: 'white',
    fontSize: 14
  },
  statusBody: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  statusIconActive: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#4CAF50',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)'
  },
  statusIconDone: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#2196F3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  statusText: {
    color: '#666',
    marginBottom: 16,
    fontSize: 15
  },
  statusTextActive: {
    color: '#4CAF50',
    marginBottom: 16,
    fontSize: 15,
    fontWeight: 500
  },
  statusTextDone: {
    color: '#2196F3',
    marginBottom: 16,
    fontSize: 15,
    fontWeight: 500
  },
  timeDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    padding: '12px 20px',
    background: '#f8f8f8',
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center'
  },
  timeItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4
  },
  timeLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase'
  },
  timeValue: {
    fontSize: 20,
    fontWeight: 600,
    color: '#3d4349'
  },
  timeSeparator: {
    color: '#999',
    fontSize: 18
  },
  horasTrabalhadas: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#E3F2FD',
    borderRadius: 20,
    color: '#1976D2',
    fontSize: 14
  },
  notasText: {
    marginTop: 12,
    padding: '8px 12px',
    background: '#FFF9C4',
    borderRadius: 8,
    fontSize: 13,
    color: '#666',
    width: '100%',
    textAlign: 'center'
  },
  checkInButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '16px',
    background: '#4CAF50',
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  checkOutButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '16px',
    background: '#F44336',
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  historicoSection: {
    marginTop: 8
  },
  historicoTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#666',
    marginBottom: 12
  },
  historicoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  historicoItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'white',
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  historicoDate: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: '#333'
  },
  historicoTimes: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#666'
  },
  historicoHoras: {
    marginLeft: 16,
    padding: '4px 10px',
    background: '#f0f0f0',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    color: '#3d4349'
  },
  // Weekly summary styles
  weeklySummary: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: 24
  },
  weeklySummaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    fontSize: 14,
    fontWeight: 500
  },
  weeklySummaryBody: {
    padding: 16
  },
  summaryStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    textAlign: 'center',
    padding: 12,
    background: '#f8fafc',
    borderRadius: 12
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b'
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 4
  },
  weekBar: {
    display: 'flex',
    gap: 4,
    alignItems: 'flex-end',
    height: 60,
    marginBottom: 8
  },
  dayBar: {
    flex: 1,
    borderRadius: '4px 4px 0 0',
    minHeight: 4,
    transition: 'all 0.3s ease'
  },
  dayLabels: {
    display: 'flex',
    gap: 4
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: '#94a3b8'
  },
  // Overtime warning styles
  overtimeWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    borderRadius: 12,
    marginBottom: 16
  },
  overtimeWarningIcon: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#f59e0b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0
  },
  overtimeWarningText: {
    flex: 1
  },
  overtimeWarningTitle: {
    fontWeight: 600,
    color: '#92400e',
    fontSize: 14,
    marginBottom: 2
  },
  overtimeWarningDesc: {
    fontSize: 12,
    color: '#b45309'
  }
}

export default function RegistoPresenca({ obra, user }) {
  const [presencaHoje, setPresencaHoje] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [notas, setNotas] = useState('')
  const [showWeeklySummary, setShowWeeklySummary] = useState(true)

  const hoje = new Date().toISOString().split('T')[0]

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
    startOfWeek.setHours(0, 0, 0, 0)

    // Get this week's records
    const weekRecords = historico.filter(h => {
      const recordDate = new Date(h.data)
      return recordDate >= startOfWeek
    })

    // Calculate daily hours for bar chart
    const dailyHours = []
    const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      const dayStr = day.toISOString().split('T')[0]

      const record = weekRecords.find(r => r.data === dayStr)
      let hours = 0
      if (record && record.hora_entrada && record.hora_saida) {
        hours = (new Date(record.hora_saida) - new Date(record.hora_entrada)) / (1000 * 60 * 60)
      }

      dailyHours.push({
        day: dayNames[i],
        hours: parseFloat(hours.toFixed(1)),
        date: dayStr,
        isToday: dayStr === hoje,
        isPast: day < now && dayStr !== hoje
      })
    }

    // Total hours this week
    const totalHours = dailyHours.reduce((sum, d) => sum + d.hours, 0)

    // Days worked this week
    const daysWorked = dailyHours.filter(d => d.hours > 0).length

    // Average hours per day worked
    const avgHours = daysWorked > 0 ? totalHours / daysWorked : 0

    // Max hours for scaling bar chart
    const maxHours = Math.max(...dailyHours.map(d => d.hours), 8)

    return {
      dailyHours,
      totalHours: parseFloat(totalHours.toFixed(1)),
      daysWorked,
      avgHours: parseFloat(avgHours.toFixed(1)),
      maxHours
    }
  }, [historico, hoje])

  // Check if today's shift is over threshold
  const todayOvertime = useMemo(() => {
    if (!presencaHoje || !presencaHoje.hora_entrada) return null

    const entrada = new Date(presencaHoje.hora_entrada)
    const saida = presencaHoje.hora_saida ? new Date(presencaHoje.hora_saida) : new Date()
    const hoursWorked = (saida - entrada) / (1000 * 60 * 60)

    if (hoursWorked >= OVERTIME_THRESHOLD) {
      return parseFloat(hoursWorked.toFixed(1))
    }
    return null
  }, [presencaHoje])

  useEffect(() => {
    loadPresencas()
  }, [obra, user])

  const loadPresencas = async () => {
    setLoading(true)
    try {
      // Load today's attendance
      const { data: hojeData } = await supabase
        .from('presencas')
        .select('*')
        .eq('trabalhador_id', user.id)
        .eq('obra_id', obra.id)
        .eq('data', hoje)
        .single()

      setPresencaHoje(hojeData || null)

      // Load last week's history
      const semanaAtras = new Date()
      semanaAtras.setDate(semanaAtras.getDate() - 7)

      const { data: historicoData } = await supabase
        .from('presencas')
        .select('*')
        .eq('trabalhador_id', user.id)
        .eq('obra_id', obra.id)
        .gte('data', semanaAtras.toISOString().split('T')[0])
        .order('data', { ascending: false })
        .limit(7)

      setHistorico(historicoData || [])
    } catch (err) {
      console.error('Erro ao carregar presenças:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    setActionLoading(true)
    try {
      const agora = new Date().toISOString()

      const { data, error } = await supabase
        .from('presencas')
        .insert({
          trabalhador_id: user.id,
          obra_id: obra.id,
          data: hoje,
          hora_entrada: agora,
          notas: notas || null
        })
        .select()
        .single()

      if (error) throw error

      setPresencaHoje(data)
      setNotas('')

      // Send chat notification
      await supabase.from('obra_mensagens').insert({
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: `✅ ${user.nome} fez check-in às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
        tipo: 'presenca'
      })

      loadPresencas()
    } catch (err) {
      console.error('Erro ao fazer check-in:', err)
      alert('Erro ao fazer check-in: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!presencaHoje) return

    setActionLoading(true)
    try {
      const agora = new Date().toISOString()

      const { error } = await supabase
        .from('presencas')
        .update({
          hora_saida: agora,
          notas: notas || presencaHoje.notas
        })
        .eq('id', presencaHoje.id)

      if (error) throw error

      // Calculate hours worked
      const entrada = new Date(presencaHoje.hora_entrada)
      const saida = new Date()
      const horasTrabalhadas = ((saida - entrada) / (1000 * 60 * 60)).toFixed(1)

      // Send chat notification
      await supabase.from('obra_mensagens').insert({
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: `🏁 ${user.nome} fez check-out às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} (${horasTrabalhadas}h trabalhadas)`,
        tipo: 'presenca'
      })

      setNotas('')
      loadPresencas()
    } catch (err) {
      console.error('Erro ao fazer check-out:', err)
      alert('Erro ao fazer check-out')
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--'
    return new Date(timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }

  const calcularHoras = (entrada, saida) => {
    if (!entrada || !saida) return null
    const diff = new Date(saida) - new Date(entrada)
    return (diff / (1000 * 60 * 60)).toFixed(1)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return `${diasSemana[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}`
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const jaFezCheckIn = presencaHoje && presencaHoje.hora_entrada
  const jaFezCheckOut = presencaHoje && presencaHoje.hora_saida

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>
        <Clock size={24} /> Registo de Presença
      </h2>

      {/* Overtime Warning */}
      {todayOvertime && (
        <div style={localStyles.overtimeWarning}>
          <div style={localStyles.overtimeWarningIcon}>
            <AlertTriangle size={20} />
          </div>
          <div style={localStyles.overtimeWarningText}>
            <div style={localStyles.overtimeWarningTitle}>
              Atenção: Já trabalhas há {todayOvertime}h hoje
            </div>
            <div style={localStyles.overtimeWarningDesc}>
              Turnos superiores a {OVERTIME_THRESHOLD}h podem afetar a saúde e segurança
            </div>
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      {showWeeklySummary && historico.length > 0 && (
        <div style={localStyles.weeklySummary}>
          <div style={localStyles.weeklySummaryHeader}>
            <BarChart3 size={18} />
            <span>Resumo Semanal</span>
          </div>
          <div style={localStyles.weeklySummaryBody}>
            {/* Stats cards */}
            <div style={localStyles.summaryStats}>
              <div style={localStyles.statCard}>
                <div style={localStyles.statValue}>{weeklyStats.totalHours}h</div>
                <div style={localStyles.statLabel}>Total</div>
              </div>
              <div style={localStyles.statCard}>
                <div style={localStyles.statValue}>{weeklyStats.daysWorked}</div>
                <div style={localStyles.statLabel}>Dias</div>
              </div>
              <div style={localStyles.statCard}>
                <div style={localStyles.statValue}>{weeklyStats.avgHours}h</div>
                <div style={localStyles.statLabel}>Média/Dia</div>
              </div>
            </div>

            {/* Bar chart */}
            <div style={localStyles.weekBar}>
              {weeklyStats.dailyHours.map((d, i) => {
                const height = d.hours > 0
                  ? Math.max(8, (d.hours / weeklyStats.maxHours) * 60)
                  : 4
                const isOvertime = d.hours >= OVERTIME_THRESHOLD

                return (
                  <div
                    key={i}
                    style={{
                      ...localStyles.dayBar,
                      height,
                      background: d.hours === 0
                        ? '#e5e7eb'
                        : isOvertime
                          ? '#f59e0b'
                          : d.isToday
                            ? '#10b981'
                            : '#3b82f6'
                    }}
                    title={`${d.day}: ${d.hours}h`}
                  />
                )
              })}
            </div>
            <div style={localStyles.dayLabels}>
              {weeklyStats.dailyHours.map((d, i) => (
                <div
                  key={i}
                  style={{
                    ...localStyles.dayLabel,
                    fontWeight: d.isToday ? 600 : 400,
                    color: d.isToday ? '#1e293b' : '#94a3b8'
                  }}
                >
                  {d.day}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div style={localStyles.statusCard}>
        <div style={localStyles.statusHeader}>
          <CalendarDays size={20} />
          <span>Hoje, {new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}</span>
        </div>

        <div style={localStyles.statusBody}>
          {!jaFezCheckIn ? (
            <>
              <div style={localStyles.statusIcon}>
                <LogIn size={48} style={{ color: '#3d4349' }} />
              </div>
              <p style={localStyles.statusText}>Ainda não fizeste check-in hoje</p>

              <div style={{ width: '100%', marginBottom: 12 }}>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas (opcional)"
                  style={styles.formInput}
                />
              </div>

              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                style={localStyles.checkInButton}
              >
                {actionLoading ? (
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <LogIn size={20} />
                    Fazer Check-in
                  </>
                )}
              </button>
            </>
          ) : !jaFezCheckOut ? (
            <>
              <div style={localStyles.statusIconActive}>
                <Check size={32} style={{ color: 'white' }} />
              </div>
              <p style={localStyles.statusTextActive}>Em trabalho desde as {formatTime(presencaHoje.hora_entrada)}</p>

              <div style={localStyles.timeDisplay}>
                <div style={localStyles.timeItem}>
                  <span style={localStyles.timeLabel}>Entrada</span>
                  <span style={localStyles.timeValue}>{formatTime(presencaHoje.hora_entrada)}</span>
                </div>
                <div style={localStyles.timeSeparator}>→</div>
                <div style={localStyles.timeItem}>
                  <span style={localStyles.timeLabel}>Saída</span>
                  <span style={{ ...localStyles.timeValue, color: '#999' }}>--:--</span>
                </div>
              </div>

              <div style={{ width: '100%', marginBottom: 12 }}>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas do dia (opcional)"
                  style={styles.formInput}
                />
              </div>

              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                style={localStyles.checkOutButton}
              >
                {actionLoading ? (
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <LogOutIcon size={20} />
                    Fazer Check-out
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div style={localStyles.statusIconDone}>
                <CheckCheck size={32} style={{ color: 'white' }} />
              </div>
              <p style={localStyles.statusTextDone}>Dia completo!</p>

              <div style={localStyles.timeDisplay}>
                <div style={localStyles.timeItem}>
                  <span style={localStyles.timeLabel}>Entrada</span>
                  <span style={localStyles.timeValue}>{formatTime(presencaHoje.hora_entrada)}</span>
                </div>
                <div style={localStyles.timeSeparator}>→</div>
                <div style={localStyles.timeItem}>
                  <span style={localStyles.timeLabel}>Saída</span>
                  <span style={localStyles.timeValue}>{formatTime(presencaHoje.hora_saida)}</span>
                </div>
              </div>

              <div style={localStyles.horasTrabalhadas}>
                <Clock size={16} />
                <strong>{calcularHoras(presencaHoje.hora_entrada, presencaHoje.hora_saida)}h</strong> trabalhadas
              </div>

              {presencaHoje.notas && (
                <p style={localStyles.notasText}>📝 {presencaHoje.notas}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* History */}
      <div style={localStyles.historicoSection}>
        <h3 style={localStyles.historicoTitle}>Últimos 7 dias</h3>

        {historico.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>Sem registos anteriores</p>
        ) : (
          <div style={localStyles.historicoList}>
            {historico.filter(h => h.data !== hoje).map(h => (
              <div key={h.id} style={localStyles.historicoItem}>
                <div style={localStyles.historicoDate}>
                  {formatDate(h.data)}
                </div>
                <div style={localStyles.historicoTimes}>
                  <span>{formatTime(h.hora_entrada)}</span>
                  <span style={{ color: '#999' }}>→</span>
                  <span>{formatTime(h.hora_saida)}</span>
                </div>
                <div style={localStyles.historicoHoras}>
                  {h.hora_saida ? `${calcularHoras(h.hora_entrada, h.hora_saida)}h` : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
