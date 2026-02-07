// =====================================================
// NOTIFICATION ANALYTICS DASHBOARD
// Dashboard para visualizar métricas de notificações
// Apenas para administradores
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Bell,
  Eye,
  MousePointer,
  Clock,
  Mail,
  Loader2,
  Calendar,
  RefreshCw
} from 'lucide-react'
import './NotificationAnalytics.css'

// Formatação de números
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num?.toString() || '0'
}

// Formatação de tempo em segundos para legível
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '-'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}

// Componente de Card de Métrica
function MetricCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue' }) {
  const colorClasses = {
    blue: 'metric-blue',
    green: 'metric-green',
    purple: 'metric-purple',
    orange: 'metric-orange'
  }

  return (
    <div className={`metric-card ${colorClasses[color]}`}>
      <div className="metric-header">
        <div className="metric-icon">
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`metric-trend ${trend}`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-title">{title}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  )
}

// Componente de Barra de Progresso
function ProgressBar({ label, value, max, color = '#8ba962' }) {
  const percentage = max > 0 ? (value / max) * 100 : 0

  return (
    <div className="progress-item">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{formatNumber(value)}</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function NotificationAnalytics() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [periodo, setPeriodo] = useState(30)
  const [data, setData] = useState(null)

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true)
      const { data: analytics, error: fetchError } = await supabase.rpc('get_analytics_dashboard', {
        p_dias: periodo
      })

      if (fetchError) throw fetchError

      setData(analytics)
      setError(null)
    } catch (err) {
      console.error('Erro ao carregar analytics:', err)
      setError('Não foi possível carregar os dados de analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [periodo])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="analytics-loading">
        <Loader2 size={32} className="spinner" />
        <span>A carregar analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="analytics-error">
        <p>{error}</p>
        <button onClick={loadData}>Tentar novamente</button>
      </div>
    )
  }

  const resumo = data?.resumo || {}
  const porTipo = data?.por_tipo || []
  const porDia = data?.por_dia || []
  const engagementHora = data?.engagement_por_hora || []

  // Encontrar máximos para barras de progresso
  const maxTipo = Math.max(...porTipo.map(t => t.criadas || 0), 1)
  const maxHora = Math.max(...engagementHora.map(h => h.leituras || 0), 1)

  // Cores por tipo
  const tipoColors = {
    mention: '#3b82f6',
    message: '#6366f1',
    tarefa_atribuida: '#f59e0b',
    tarefa_concluida: '#10b981',
    requisicao_nova: '#8b5cf6',
    material_aprovado: '#10b981',
    aprovacao_pendente: '#f59e0b'
  }

  return (
    <div className="notification-analytics">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-title">
          <BarChart3 size={28} />
          <div>
            <h1>Analytics de Notificações</h1>
            <p>Métricas de engagement e desempenho</p>
          </div>
        </div>

        <div className="header-actions">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(parseInt(e.target.value))}
            className="period-select"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>

          <button
            className="refresh-btn"
            onClick={loadData}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Criadas"
          value={formatNumber(resumo.total_criadas || 0)}
          subtitle={`Últimos ${periodo} dias`}
          icon={Bell}
          color="blue"
        />
        <MetricCard
          title="Total Lidas"
          value={formatNumber(resumo.total_lidas || 0)}
          subtitle={`${resumo.taxa_leitura_media || 0}% taxa de leitura`}
          icon={Eye}
          color="green"
        />
        <MetricCard
          title="Ações Executadas"
          value={formatNumber(resumo.total_acoes || 0)}
          subtitle="Cliques em ações inline"
          icon={MousePointer}
          color="purple"
        />
        <MetricCard
          title="Tempo Médio Leitura"
          value={formatDuration(resumo.tempo_medio_leitura)}
          subtitle="Desde criação até leitura"
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Por Tipo */}
        <div className="chart-card">
          <h3>
            <Bell size={18} />
            Por Tipo de Notificação
          </h3>
          <div className="chart-content">
            {porTipo.length > 0 ? (
              porTipo.map((tipo, idx) => (
                <ProgressBar
                  key={idx}
                  label={tipo.tipo || 'Outros'}
                  value={tipo.criadas || 0}
                  max={maxTipo}
                  color={tipoColors[tipo.tipo] || '#6b7280'}
                />
              ))
            ) : (
              <p className="no-data">Sem dados disponíveis</p>
            )}
          </div>
        </div>

        {/* Por Hora */}
        <div className="chart-card">
          <h3>
            <Clock size={18} />
            Engagement por Hora
          </h3>
          <div className="chart-content hours-chart">
            {engagementHora.length > 0 ? (
              <div className="hours-grid">
                {engagementHora.map((hora, idx) => {
                  const height = maxHora > 0 ? (hora.leituras / maxHora) * 100 : 0
                  return (
                    <div key={idx} className="hour-bar-container">
                      <div
                        className="hour-bar"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${hora.hora}h: ${hora.leituras} leituras`}
                      />
                      <span className="hour-label">
                        {hora.hora.toString().padStart(2, '0')}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="no-data">Sem dados disponíveis</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="chart-card wide">
          <h3>
            <Calendar size={18} />
            Timeline (Últimos {Math.min(periodo, porDia.length)} dias)
          </h3>
          <div className="chart-content">
            {porDia.length > 0 ? (
              <div className="timeline-chart">
                {porDia.slice(0, 14).reverse().map((dia, idx) => {
                  const maxDia = Math.max(...porDia.map(d => d.criadas || 0), 1)
                  const heightCriadas = ((dia.criadas || 0) / maxDia) * 100
                  const heightLidas = ((dia.lidas || 0) / maxDia) * 100

                  return (
                    <div key={idx} className="day-column">
                      <div className="day-bars">
                        <div
                          className="day-bar criadas"
                          style={{ height: `${heightCriadas}%` }}
                          title={`Criadas: ${dia.criadas}`}
                        />
                        <div
                          className="day-bar lidas"
                          style={{ height: `${heightLidas}%` }}
                          title={`Lidas: ${dia.lidas}`}
                        />
                      </div>
                      <span className="day-label">
                        {new Date(dia.dia).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="no-data">Sem dados disponíveis</p>
            )}
            <div className="chart-legend">
              <span className="legend-item"><span className="dot criadas"></span> Criadas</span>
              <span className="legend-item"><span className="dot lidas"></span> Lidas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Taxa de Leitura por Tipo */}
      {porTipo.length > 0 && (
        <div className="stats-table">
          <h3>Detalhes por Tipo</h3>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Criadas</th>
                <th>Lidas</th>
                <th>Taxa Leitura</th>
              </tr>
            </thead>
            <tbody>
              {porTipo.map((tipo, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="tipo-badge" style={{ backgroundColor: tipoColors[tipo.tipo] || '#6b7280' }}>
                      {tipo.tipo || 'Outros'}
                    </span>
                  </td>
                  <td>{formatNumber(tipo.criadas || 0)}</td>
                  <td>{formatNumber(tipo.lidas || 0)}</td>
                  <td>
                    <span className={`rate ${(tipo.taxa_leitura || 0) >= 50 ? 'good' : 'low'}`}>
                      {tipo.taxa_leitura || 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
