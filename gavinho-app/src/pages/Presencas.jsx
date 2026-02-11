import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Clock, Calendar, Users, Building2, Search, Filter,
  ChevronLeft, ChevronRight, Download, Loader2, LogIn, LogOut,
  CalendarDays, TrendingUp, AlertCircle, FileText
} from 'lucide-react'
import jsPDF from 'jspdf'

export default function Presencas() {
  const [presencas, setPresencas] = useState([])
  const [trabalhadores, setTrabalhadores] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, horasTotal: 0, mediaHoras: 0 })

  // Filtros
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroTrabalhador, setFiltroTrabalhador] = useState('')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (trabalhadores.length > 0 && obras.length > 0) {
      loadPresencas()
    }
  }, [filtroObra, filtroTrabalhador, dataInicio, dataFim, trabalhadores, obras])

  const loadData = async () => {
    try {
      const [trabRes, obrasRes] = await Promise.all([
        supabase.from('trabalhadores').select('id, nome, cargo').order('nome'),
        supabase.from('obras').select('id, codigo, nome').order('codigo', { ascending: false })
      ])

      setTrabalhadores(trabRes.data || [])
      setObras(obrasRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    }
  }

  const loadPresencas = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('presencas')
        .select(`
          *,
          trabalhadores(id, nome, cargo),
          obras(id, codigo, nome)
        `)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false })
        .order('hora_entrada', { ascending: false })

      if (filtroObra) {
        query = query.eq('obra_id', filtroObra)
      }

      if (filtroTrabalhador) {
        query = query.eq('trabalhador_id', filtroTrabalhador)
      }

      const { data, error } = await query

      if (error) throw error

      setPresencas(data || [])

      // Calcular estatísticas
      const total = data?.length || 0
      let horasTotal = 0

      data?.forEach(p => {
        if (p.hora_entrada && p.hora_saida) {
          const diff = new Date(p.hora_saida) - new Date(p.hora_entrada)
          horasTotal += diff / (1000 * 60 * 60)
        }
      })

      setStats({
        total,
        horasTotal: horasTotal.toFixed(1),
        mediaHoras: total > 0 ? (horasTotal / total).toFixed(1) : 0
      })
    } catch (err) {
      console.error('Erro ao carregar presenças:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--'
    return new Date(timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const calcularHoras = (entrada, saida) => {
    if (!entrada || !saida) return null
    const diff = new Date(saida) - new Date(entrada)
    return (diff / (1000 * 60 * 60)).toFixed(1)
  }

  const getStatusBadge = (presenca) => {
    if (!presenca.hora_entrada) {
      return { text: 'Sem entrada', color: '#F44336', bg: '#FFEBEE' }
    }
    if (!presenca.hora_saida) {
      return { text: 'Em trabalho', color: '#4CAF50', bg: '#E8F5E9' }
    }
    return { text: 'Completo', color: '#2196F3', bg: '#E3F2FD' }
  }

  const exportCSV = () => {
    const headers = ['Data', 'Trabalhador', 'Cargo', 'Obra', 'Entrada', 'Saida', 'Horas', 'Notas']
    const rows = presencas.map(p => [
      p.data,
      p.trabalhadores?.nome || '',
      p.trabalhadores?.cargo || '',
      p.obras?.codigo || '',
      formatTime(p.hora_entrada),
      formatTime(p.hora_saida),
      calcularHoras(p.hora_entrada, p.hora_saida) || '',
      p.notas || ''
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `presencas_${dataInicio}_${dataFim}.csv`
    link.click()
  }

  const exportPDF = () => {
    const pdf = new jsPDF()
    let y = 15

    // Titulo
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Relatorio de Presencas', 105, y, { align: 'center' })
    y += 8

    // Periodo
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100)
    pdf.text(`Periodo: ${dataInicio} a ${dataFim}`, 105, y, { align: 'center' })
    y += 6

    // Filtros aplicados
    const obraSelecionada = obras.find(o => o.id === filtroObra)
    const trabSelecionado = trabalhadores.find(t => t.id === filtroTrabalhador)
    if (obraSelecionada || trabSelecionado) {
      const filtros = []
      if (obraSelecionada) filtros.push(`Obra: ${obraSelecionada.codigo}`)
      if (trabSelecionado) filtros.push(`Trabalhador: ${trabSelecionado.nome}`)
      pdf.text(filtros.join(' | '), 105, y, { align: 'center' })
      y += 6
    }

    y += 5

    // Estatisticas
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0)
    pdf.text(`Total: ${stats.total} registos | ${stats.horasTotal}h trabalhadas | Media: ${stats.mediaHoras}h/dia`, 15, y)
    y += 10

    // Linha separadora
    pdf.setDrawColor(200)
    pdf.line(15, y, 195, y)
    y += 5

    // Cabecalho da tabela
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setFillColor(245, 245, 245)
    pdf.rect(15, y - 3, 180, 8, 'F')
    pdf.text('Data', 17, y + 2)
    pdf.text('Trabalhador', 42, y + 2)
    pdf.text('Cargo', 87, y + 2)
    pdf.text('Obra', 117, y + 2)
    pdf.text('Entrada', 140, y + 2)
    pdf.text('Saida', 160, y + 2)
    pdf.text('Horas', 180, y + 2)
    y += 10

    // Dados
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)

    // Agrupar por trabalhador para resumo
    const horasPorTrabalhador = {}

    presencas.forEach((p, index) => {
      // Nova pagina se necessario
      if (y > 275) {
        pdf.addPage()
        y = 15
        // Repetir cabecalho
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setFillColor(245, 245, 245)
        pdf.rect(15, y - 3, 180, 8, 'F')
        pdf.text('Data', 17, y + 2)
        pdf.text('Trabalhador', 42, y + 2)
        pdf.text('Cargo', 87, y + 2)
        pdf.text('Obra', 117, y + 2)
        pdf.text('Entrada', 140, y + 2)
        pdf.text('Saida', 160, y + 2)
        pdf.text('Horas', 180, y + 2)
        y += 10
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
      }

      const horas = calcularHoras(p.hora_entrada, p.hora_saida)

      // Acumular horas por trabalhador
      const trabNome = p.trabalhadores?.nome || 'Desconhecido'
      if (!horasPorTrabalhador[trabNome]) {
        horasPorTrabalhador[trabNome] = { horas: 0, dias: 0 }
      }
      if (horas) {
        horasPorTrabalhador[trabNome].horas += parseFloat(horas)
        horasPorTrabalhador[trabNome].dias += 1
      }

      // Alternar cor de fundo
      if (index % 2 === 0) {
        pdf.setFillColor(252, 252, 252)
        pdf.rect(15, y - 3, 180, 6, 'F')
      }

      pdf.setTextColor(60)
      pdf.text(p.data || '', 17, y)
      pdf.text((p.trabalhadores?.nome || '').substring(0, 20), 42, y)
      pdf.text((p.trabalhadores?.cargo || '').substring(0, 12), 87, y)
      pdf.text(p.obras?.codigo || '', 117, y)
      pdf.text(formatTime(p.hora_entrada), 140, y)
      pdf.text(formatTime(p.hora_saida), 160, y)
      pdf.setTextColor(0)
      pdf.text(horas ? `${horas}h` : '-', 180, y)
      y += 6
    })

    // Resumo por trabalhador
    if (Object.keys(horasPorTrabalhador).length > 0) {
      y += 10
      if (y > 250) {
        pdf.addPage()
        y = 15
      }

      pdf.setDrawColor(200)
      pdf.line(15, y, 195, y)
      y += 8

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Resumo por Trabalhador', 15, y)
      y += 8

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setFillColor(240, 240, 240)
      pdf.rect(15, y - 3, 180, 7, 'F')
      pdf.text('Trabalhador', 17, y + 2)
      pdf.text('Dias Trabalhados', 90, y + 2)
      pdf.text('Total Horas', 140, y + 2)
      y += 9

      pdf.setFont('helvetica', 'normal')
      Object.entries(horasPorTrabalhador)
        .sort((a, b) => b[1].horas - a[1].horas)
        .forEach(([nome, dados], index) => {
          if (y > 280) {
            pdf.addPage()
            y = 15
          }
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(15, y - 3, 180, 6, 'F')
          }
          pdf.text(nome, 17, y)
          pdf.text(`${dados.dias} dia(s)`, 90, y)
          pdf.setFont('helvetica', 'bold')
          pdf.text(`${dados.horas.toFixed(1)}h`, 140, y)
          pdf.setFont('helvetica', 'normal')
          y += 6
        })
    }

    // Rodape
    pdf.setFontSize(8)
    pdf.setTextColor(150)
    pdf.text(`Gerado em ${new Date().toLocaleString('pt-PT')}`, 195, 290, { align: 'right' })

    pdf.save(`presencas_${dataInicio}_${dataFim}.pdf`)
  }

  // Agrupar presenças por data
  const presencasPorData = presencas.reduce((acc, p) => {
    if (!acc[p.data]) acc[p.data] = []
    acc[p.data].push(p)
    return acc
  }, {})

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Clock size={28} style={{ color: 'var(--brown)' }} />
            Registo de Presenças
          </h1>
          <p style={styles.subtitle}>Acompanhar presenças dos trabalhadores</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportPDF} style={{ ...styles.exportButton, background: 'var(--gold)' }}>
            <FileText size={18} />
            PDF
          </button>
          <button onClick={exportCSV} style={styles.exportButton}>
            <Download size={18} />
            CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <CalendarDays size={24} style={{ color: 'var(--brown)' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Registos no período</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#E8F5E9' }}>
            <Clock size={24} style={{ color: '#2e7d32' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.horasTotal}h</div>
            <div style={styles.statLabel}>Total de horas</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: '#E3F2FD' }}>
            <TrendingUp size={24} style={{ color: '#1976d2' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.mediaHoras}h</div>
            <div style={styles.statLabel}>Média por dia</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={styles.filterInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={styles.filterInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Obra</label>
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">Todas as obras</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Trabalhador</label>
            <select
              value={filtroTrabalhador}
              onChange={(e) => setFiltroTrabalhador(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">Todos</option>
              {trabalhadores.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Presenças */}
      <div style={styles.listCard}>
        {loading ? (
          <div style={styles.loadingState}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brown-light)' }} />
          </div>
        ) : presencas.length === 0 ? (
          <div style={styles.emptyState}>
            <Clock size={48} style={{ color: 'var(--stone)', marginBottom: 12 }} />
            <p style={{ color: 'var(--brown-light)', margin: 0 }}>Nenhum registo encontrado</p>
            <p style={{ color: 'var(--brown-light)', fontSize: 13, marginTop: 4 }}>Ajusta os filtros ou aguarda novos registos</p>
          </div>
        ) : (
          Object.entries(presencasPorData).map(([data, registos]) => (
            <div key={data} style={styles.dateGroup}>
              <div style={styles.dateHeader}>
                <Calendar size={16} />
                {formatDate(data)}
                <span style={styles.dateCount}>{registos.length} registo(s)</span>
              </div>
              {registos.map(p => {
                const status = getStatusBadge(p)
                return (
                  <div key={p.id} style={styles.presencaRow}>
                    <div style={styles.presencaAvatar}>
                      {p.trabalhadores?.nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={styles.presencaInfo}>
                      <div style={styles.presencaNome}>{p.trabalhadores?.nome}</div>
                      <div style={styles.presencaMeta}>
                        <span style={styles.metaItem}>
                          <Building2 size={12} />
                          {p.obras?.codigo}
                        </span>
                        {p.trabalhadores?.cargo && (
                          <span style={styles.metaItem}>{p.trabalhadores.cargo}</span>
                        )}
                      </div>
                    </div>
                    <div style={styles.presencaTimes}>
                      <div style={styles.timeBlock}>
                        <LogIn size={14} style={{ color: '#4CAF50' }} />
                        <span>{formatTime(p.hora_entrada)}</span>
                      </div>
                      <div style={styles.timeBlock}>
                        <LogOut size={14} style={{ color: p.hora_saida ? '#F44336' : '#ccc' }} />
                        <span style={{ color: p.hora_saida ? 'inherit' : '#ccc' }}>
                          {formatTime(p.hora_saida)}
                        </span>
                      </div>
                    </div>
                    <div style={styles.presencaHoras}>
                      {p.hora_saida ? (
                        <span style={styles.horasValue}>{calcularHoras(p.hora_entrada, p.hora_saida)}h</span>
                      ) : (
                        <span style={{ ...styles.statusBadge, color: status.color, background: status.bg }}>
                          {status.text}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
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

const styles = {
  container: {
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--brown)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: 0
  },
  subtitle: {
    color: 'var(--brown-light)',
    marginTop: 4,
    marginBottom: 0,
    fontSize: 14
  },
  exportButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    background: 'var(--brown)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24
  },
  statCard: {
    background: 'var(--white)',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)'
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'var(--cream)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--brown)'
  },
  statLabel: {
    fontSize: 13,
    color: 'var(--brown-light)'
  },
  filtersCard: {
    background: 'var(--white)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--brown)'
  },
  filterInput: {
    padding: '10px 12px',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: 'white'
  },
  listCard: {
    background: 'var(--white)',
    borderRadius: 16,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)',
    overflow: 'hidden'
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48
  },
  emptyState: {
    padding: 48,
    textAlign: 'center'
  },
  dateGroup: {
    borderBottom: '1px solid var(--stone)'
  },
  dateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    background: 'var(--cream)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brown)'
  },
  dateCount: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: 400,
    color: 'var(--brown-light)'
  },
  presencaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 20px',
    borderBottom: '1px solid var(--stone)'
  },
  presencaAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--brown)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 16
  },
  presencaInfo: {
    flex: 1,
    minWidth: 0
  },
  presencaNome: {
    fontWeight: 600,
    color: 'var(--brown)',
    fontSize: 14
  },
  presencaMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
    fontSize: 12,
    color: 'var(--brown-light)'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  presencaTimes: {
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  timeBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: 'var(--brown)'
  },
  presencaHoras: {
    minWidth: 70,
    textAlign: 'right'
  },
  horasValue: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--brown)',
    background: 'var(--cream)',
    padding: '4px 10px',
    borderRadius: 12
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 12
  }
}
