// =====================================================
// REGISTO PRESENCA COMPONENT
// Check-in/Check-out attendance tracking
// Features: GPS geofencing, Weekly summary, >12h warning
// =====================================================

import { useState, useEffect, useMemo } from 'react'
import {
  Clock, CalendarDays, LogIn, LogOut as LogOutIcon,
  Check, CheckCheck, Loader2, AlertTriangle, TrendingUp,
  BarChart3, MapPin, Navigation, Shield, XCircle, RefreshCw
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
    marginBottom: 16
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
    padding: '20px 16px',
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
  },
  // GPS Geofence styles
  gpsCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 12,
    marginBottom: 16,
    transition: 'all 0.3s'
  },
  gpsCardLoading: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0'
  },
  gpsCardOk: {
    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    border: '1px solid #86efac'
  },
  gpsCardFar: {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    border: '1px solid #fca5a5'
  },
  gpsCardNoCoords: {
    background: '#fffbeb',
    border: '1px solid #fde68a'
  },
  gpsIcon: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  gpsIconLoading: {
    background: '#e2e8f0',
    color: '#64748b'
  },
  gpsIconOk: {
    background: '#22c55e',
    color: 'white'
  },
  gpsIconFar: {
    background: '#ef4444',
    color: 'white'
  },
  gpsIconNoCoords: {
    background: '#f59e0b',
    color: 'white'
  },
  gpsText: {
    flex: 1
  },
  gpsTitle: {
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 2
  },
  gpsDesc: {
    fontSize: 12
  },
  gpsRefresh: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}

const DEFAULT_GEOFENCE_RADIUS = 50 // meters - default if obra has no raio_geofence

// Haversine formula: calculates distance between two GPS points in meters
function calculateGpsDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function RegistoPresenca({ obra, user, isOnline, queueAction }) {
  const [presencaHoje, setPresencaHoje] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [notas, setNotas] = useState('')
  const [showWeeklySummary, setShowWeeklySummary] = useState(true)

  // GPS geofencing state
  const [obraCoords, setObraCoords] = useState(null) // { latitude, longitude, raio_geofence }
  const [userLocation, setUserLocation] = useState(null) // { latitude, longitude, accuracy }
  const [gpsLoading, setGpsLoading] = useState(true)
  const [gpsError, setGpsError] = useState(null)
  const [distance, setDistance] = useState(null) // meters from obra

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
    loadObraCoords()
  }, [obra, user])

  // Request GPS when component mounts or obra changes
  useEffect(() => {
    requestGpsLocation()
  }, [obra])

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

  const loadObraCoords = async () => {
    try {
      const { data } = await supabase
        .from('obras')
        .select('latitude, longitude, raio_geofence')
        .eq('id', obra.id)
        .single()

      if (data && data.latitude && data.longitude) {
        setObraCoords(data)
      } else {
        setObraCoords(null)
      }
    } catch (err) {
      console.error('Erro ao carregar coordenadas da obra:', err)
    }
  }

  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada neste dispositivo')
      setGpsLoading(false)
      return
    }

    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        setUserLocation(loc)
        setGpsLoading(false)

        // Calculate distance if obra has coordinates
        if (obraCoords) {
          const dist = calculateGpsDistance(
            loc.latitude, loc.longitude,
            obraCoords.latitude, obraCoords.longitude
          )
          setDistance(Math.round(dist))
        }
      },
      (error) => {
        console.error('GPS error:', error)
        setGpsError(
          error.code === 1 ? 'Permissão de localização negada. Ativa nas definições.' :
          error.code === 2 ? 'Localização indisponível. Tenta ao ar livre.' :
          error.code === 3 ? 'Tempo esgotado. Tenta novamente.' :
          'Erro ao obter localização'
        )
        setGpsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    )
  }

  // Recalculate distance when obraCoords or userLocation changes
  useEffect(() => {
    if (obraCoords && userLocation) {
      const dist = calculateGpsDistance(
        userLocation.latitude, userLocation.longitude,
        obraCoords.latitude, obraCoords.longitude
      )
      setDistance(Math.round(dist))
    }
  }, [obraCoords, userLocation])

  // Geofence check
  const geofenceRadius = obraCoords?.raio_geofence || DEFAULT_GEOFENCE_RADIUS
  const isWithinGeofence = obraCoords && distance !== null ? distance <= geofenceRadius : null
  const canDoAction = !obraCoords || isWithinGeofence === true // Allow if no coords configured

  const handleCheckIn = async () => {
    if (!canDoAction) {
      alert(`Estás a ${distance}m da obra. Precisas de estar a menos de ${geofenceRadius}m para fazer check-in.`)
      return
    }

    setActionLoading(true)
    try {
      const agora = new Date().toISOString()

      const insertData = {
        trabalhador_id: user.id,
        obra_id: obra.id,
        data: hoje,
        hora_entrada: agora,
        notas: notas || null,
        metodo: userLocation ? 'gps' : 'manual',
        dispositivo: navigator.userAgent?.substring(0, 100) || null
      }

      // Add GPS data if available
      if (userLocation) {
        insertData.latitude_entrada = userLocation.latitude
        insertData.longitude_entrada = userLocation.longitude
        insertData.precisao_entrada = userLocation.accuracy
        insertData.distancia_entrada = distance
        insertData.dentro_geofence_entrada = isWithinGeofence
      }

      // Offline: queue check-in
      if (!isOnline && queueAction) {
        await queueAction('CREATE_PRESENCA', insertData)
        setPresencaHoje({ ...insertData, id: `temp_${Date.now()}`, queued: true })
        setNotas('')
        setActionLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('presencas')
        .insert(insertData)
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

    if (!canDoAction) {
      alert(`Estás a ${distance}m da obra. Precisas de estar a menos de ${geofenceRadius}m para fazer check-out.`)
      return
    }

    setActionLoading(true)
    try {
      const agora = new Date().toISOString()

      const updateData = {
        hora_saida: agora,
        notas: notas || presencaHoje.notas
      }

      // Add GPS data if available
      if (userLocation) {
        updateData.latitude_saida = userLocation.latitude
        updateData.longitude_saida = userLocation.longitude
        updateData.precisao_saida = userLocation.accuracy
        updateData.distancia_saida = distance
        updateData.dentro_geofence_saida = isWithinGeofence
      }

      // Offline: queue check-out
      if (!isOnline && queueAction && presencaHoje.id) {
        await queueAction('UPDATE_PRESENCA', { id: presencaHoje.id, ...updateData })
        setPresencaHoje({ ...presencaHoje, ...updateData, queued: true })
        setNotas('')
        setActionLoading(false)
        return
      }

      const { error } = await supabase
        .from('presencas')
        .update(updateData)
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

      {/* GPS Location Status */}
      {!jaFezCheckOut && (
        <div style={{
          ...localStyles.gpsCard,
          ...(gpsLoading ? localStyles.gpsCardLoading :
              gpsError ? localStyles.gpsCardFar :
              !obraCoords ? localStyles.gpsCardNoCoords :
              isWithinGeofence ? localStyles.gpsCardOk :
              localStyles.gpsCardFar)
        }}>
          <div style={{
            ...localStyles.gpsIcon,
            ...(gpsLoading ? localStyles.gpsIconLoading :
                gpsError ? localStyles.gpsIconFar :
                !obraCoords ? localStyles.gpsIconNoCoords :
                isWithinGeofence ? localStyles.gpsIconOk :
                localStyles.gpsIconFar)
          }}>
            {gpsLoading ? (
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            ) : gpsError ? (
              <XCircle size={20} />
            ) : !obraCoords ? (
              <MapPin size={20} />
            ) : isWithinGeofence ? (
              <Shield size={20} />
            ) : (
              <Navigation size={20} />
            )}
          </div>
          <div style={localStyles.gpsText}>
            <div style={{
              ...localStyles.gpsTitle,
              color: gpsLoading ? '#64748b' :
                     gpsError ? '#dc2626' :
                     !obraCoords ? '#d97706' :
                     isWithinGeofence ? '#16a34a' :
                     '#dc2626'
            }}>
              {gpsLoading ? 'A obter localização...' :
               gpsError ? 'Localização indisponível' :
               !obraCoords ? 'Obra sem coordenadas GPS' :
               isWithinGeofence ? `Na obra (${distance}m)` :
               `Fora da obra (${distance}m)`}
            </div>
            <div style={{
              ...localStyles.gpsDesc,
              color: gpsLoading ? '#94a3b8' :
                     gpsError ? '#f87171' :
                     !obraCoords ? '#f59e0b' :
                     isWithinGeofence ? '#22c55e' :
                     '#f87171'
            }}>
              {gpsLoading ? 'GPS de alta precisão ativado' :
               gpsError ? gpsError :
               !obraCoords ? 'Check-in/out permitido sem validação GPS' :
               isWithinGeofence ? `Dentro do raio de ${geofenceRadius}m ✓` :
               `Precisas estar a menos de ${geofenceRadius}m da obra`}
            </div>
            {userLocation && !gpsLoading && (
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                Precisão: ±{Math.round(userLocation.accuracy)}m
              </div>
            )}
          </div>
          {!gpsLoading && (
            <button
              onClick={requestGpsLocation}
              style={localStyles.gpsRefresh}
              title="Atualizar localização"
            >
              <RefreshCw size={16} color="#64748b" />
            </button>
          )}
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
                disabled={actionLoading || gpsLoading || !canDoAction}
                style={{
                  ...localStyles.checkInButton,
                  opacity: (actionLoading || gpsLoading || !canDoAction) ? 0.5 : 1,
                  cursor: (actionLoading || gpsLoading || !canDoAction) ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? (
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                ) : gpsLoading ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    A verificar localização...
                  </>
                ) : !canDoAction ? (
                  <>
                    <XCircle size={20} />
                    Fora da zona ({distance}m)
                  </>
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
                disabled={actionLoading || gpsLoading || !canDoAction}
                style={{
                  ...localStyles.checkOutButton,
                  opacity: (actionLoading || gpsLoading || !canDoAction) ? 0.5 : 1,
                  cursor: (actionLoading || gpsLoading || !canDoAction) ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? (
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                ) : gpsLoading ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    A verificar localização...
                  </>
                ) : !canDoAction ? (
                  <>
                    <XCircle size={20} />
                    Fora da zona ({distance}m)
                  </>
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
