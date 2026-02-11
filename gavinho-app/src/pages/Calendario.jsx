import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, X, Edit, Trash2,
  Flag, Building2, RefreshCw, Link2, Palmtree
} from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'

const TIPOS_EVENTO = [
  { id: 'reuniao_cliente', label: 'Reunião Cliente', color: '#C9A882' },
  { id: 'reuniao_obra', label: 'Reunião Obra', color: '#7A9E7A' },
  { id: 'visita_obra', label: 'Visita Obra', color: '#5F5C59' },
  { id: 'call', label: 'Call', color: '#8A9EB8' },
  { id: 'interno', label: 'Interno', color: '#C3BAAF' },
  { id: 'entrega', label: 'Entrega', color: '#B88A8A' },
  { id: 'feriado', label: 'Feriado', color: '#dc2626' },
  { id: 'encerramento', label: 'Encerramento', color: '#7c3aed' },
  { id: 'ferias', label: 'Férias', color: '#0891b2' },
  { id: 'outro', label: 'Outro', color: '#999999' }
]

const DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
const DIAS_SEMANA_CURTO = ['SEG', 'TER', 'QUA', 'QUI', 'SEX']

// Horas para vista semanal (8:00 - 20:00)
const HORAS_DIA = Array.from({ length: 13 }, (_, i) => {
  const hora = i + 8
  return `${hora.toString().padStart(2, '0')}:00`
})

// Contas Outlook para sincronização
const OUTLOOK_ACCOUNTS = [
  { email: 'geral@gavinhogroup.com', label: 'Geral' },
  { email: 'equipa@gavinhogroup.com', label: 'Equipa' }
]

// Calcular Páscoa (algoritmo de Gauss)
const calcularPascoa = (ano) => {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes, dia)
}

// Feriados portugueses para um ano
const getFeriadosPortugal = (ano) => {
  const pascoa = calcularPascoa(ano)
  const sextaSanta = new Date(pascoa)
  sextaSanta.setDate(pascoa.getDate() - 2)
  const corpusChristi = new Date(pascoa)
  corpusChristi.setDate(pascoa.getDate() + 60)
  
  return [
    { data: `${ano}-01-01`, nome: 'Ano Novo' },
    { data: sextaSanta.toISOString().split('T')[0], nome: 'Sexta-feira Santa' },
    { data: pascoa.toISOString().split('T')[0], nome: 'Páscoa' },
    { data: `${ano}-04-25`, nome: 'Dia da Liberdade' },
    { data: `${ano}-05-01`, nome: 'Dia do Trabalhador' },
    { data: corpusChristi.toISOString().split('T')[0], nome: 'Corpo de Deus' },
    { data: `${ano}-06-10`, nome: 'Dia de Portugal' },
    { data: `${ano}-06-13`, nome: 'Santo António (Lisboa)' },
    { data: `${ano}-08-15`, nome: 'Assunção de Nossa Senhora' },
    { data: `${ano}-10-05`, nome: 'Implantação da República' },
    { data: `${ano}-11-01`, nome: 'Todos os Santos' },
    { data: `${ano}-12-01`, nome: 'Restauração da Independência' },
    { data: `${ano}-12-08`, nome: 'Imaculada Conceição' },
    { data: `${ano}-12-25`, nome: 'Natal' }
  ]
}

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('mes')
  const [eventos, setEventos] = useState([])
  const [projetos, setProjetos] = useState([])
  const [encerramentos, setEncerramentos] = useState([])
  const [ferias, setFerias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvento, setEditingEvento] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showEventDetail, setShowEventDetail] = useState(null)
  const [showFeriados, setShowFeriados] = useState(true)
  const [showEncerramentos, setShowEncerramentos] = useState(true)
  const [showFerias, setShowFerias] = useState(true)
  
  const [form, setForm] = useState({
    titulo: '', tipo: 'reuniao_cliente', projeto_id: '', data: '',
    hora_inicio: '09:00', hora_fim: '10:00', local: '', descricao: ''
  })

  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [eventosRes, projetosRes, encRes, feriasRes] = await Promise.all([
        supabase.from('eventos').select('*').order('data', { ascending: true }),
        supabase.from('projetos').select('id, codigo, nome').eq('arquivado', false).order('codigo', { ascending: false }),
        supabase.from('encerramentos_empresa').select('*').order('data'),
        supabase.from('ausencias').select(`
          *,
          utilizador:utilizadores(id, nome)
        `).eq('tipo', 'ferias').order('data_inicio')
      ])

      setEventos(eventosRes.data || [])
      setProjetos(projetosRes.data || [])
      setEncerramentos(encRes.data || [])
      setFerias(feriasRes.data || [])
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // Obter feriados do ano atual e adjacentes
  const getFeriados = () => {
    const ano = currentDate.getFullYear()
    return [
      ...getFeriadosPortugal(ano - 1),
      ...getFeriadosPortugal(ano),
      ...getFeriadosPortugal(ano + 1)
    ]
  }

  // Verificar se uma data é feriado
  const getFeriadoForDate = (date) => {
    if (!showFeriados) return null
    const dateStr = date.toISOString().split('T')[0]
    const feriados = getFeriados()
    return feriados.find(f => f.data === dateStr)
  }

  // Verificar se uma data é encerramento
  const getEncerramentoForDate = (date) => {
    if (!showEncerramentos) return null
    const dateStr = date.toISOString().split('T')[0]
    return encerramentos.find(enc => enc.data === dateStr)
  }

  // Obter férias para uma data (pode haver múltiplas pessoas)
  const getFeriasForDate = (date) => {
    if (!showFerias) return []
    const dateStr = date.toISOString().split('T')[0]
    return ferias.filter(f => {
      const inicio = f.data_inicio
      const fim = f.data_fim || f.data_inicio
      return dateStr >= inicio && dateStr <= fim
    })
  }

  // Navegação
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    if (viewMode === 'mes') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7))
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => setCurrentDate(new Date())

  // Gerar dias do mês
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Ajustar para começar na segunda-feira
    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6
    
    const days = []
    
    // Dias do mês anterior
    const prevMonth = new Date(year, month, 0)
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      })
    }
    
    // Dias do mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }
    
    // Dias do próximo mês
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }
    
    return days
  }

  // Gerar dias da semana (apenas segunda a sexta)
  const generateWeekDays = () => {
    const days = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    // Apenas 5 dias (segunda a sexta)
    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push({ date, isCurrentMonth: true })
    }
    return days
  }

  // Obter eventos para uma hora específica de um dia
  const getEventsForHour = (date, hora) => {
    const dateStr = date.toISOString().split('T')[0]
    return eventos.filter(e => {
      if (e.data !== dateStr) return false
      if (!e.hora_inicio) return false
      const eventHour = parseInt(e.hora_inicio.split(':')[0])
      const slotHour = parseInt(hora.split(':')[0])
      return eventHour === slotHour
    })
  }

  // Calcular posição e altura do evento na grelha
  const getEventPosition = (evento) => {
    if (!evento.hora_inicio) return { top: 0, height: 60 }
    const [startHour, startMin] = evento.hora_inicio.split(':').map(Number)
    const [endHour, endMin] = (evento.hora_fim || evento.hora_inicio).split(':').map(Number)

    const top = startMin // minutos dentro da hora
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    const height = Math.max(durationMinutes, 30) // mínimo 30 min

    return { top: (top / 60) * 60, height: (height / 60) * 60 }
  }

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayEvents = eventos.filter(e => e.data === dateStr)

    // Adicionar feriado se existir
    const feriado = getFeriadoForDate(date)
    if (feriado) {
      dayEvents.unshift({
        id: `feriado-${dateStr}`,
        titulo: feriado.nome,
        tipo: 'feriado',
        data: dateStr,
        isFeriado: true
      })
    }

    // Adicionar encerramento se existir
    const encerramento = getEncerramentoForDate(date)
    if (encerramento) {
      dayEvents.unshift({
        id: `enc-${encerramento.id}`,
        titulo: encerramento.descricao || 'Encerramento',
        tipo: 'encerramento',
        data: dateStr,
        isEncerramento: true
      })
    }

    // Adicionar férias da equipa
    const feriasHoje = getFeriasForDate(date)
    feriasHoje.forEach(f => {
      const nomeUtilizador = f.utilizador?.nome || 'Colaborador'
      dayEvents.push({
        id: `ferias-${f.id}-${dateStr}`,
        titulo: `Férias ${nomeUtilizador}`,
        tipo: 'ferias',
        data: dateStr,
        isFerias: true,
        utilizador: f.utilizador
      })
    })

    return dayEvents
  }

  const getTipoConfig = (tipo) => TIPOS_EVENTO.find(t => t.id === tipo) || TIPOS_EVENTO[TIPOS_EVENTO.length - 1]
  const getProjetoInfo = (id) => projetos.find(p => p.id === id)

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // CRUD
  const handleSave = async () => {
    if (!form.titulo.trim() || !form.data) return

    try {
      const data = {
        titulo: form.titulo,
        tipo: form.tipo,
        projeto_id: form.projeto_id || null,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        local: form.local || null,
        descricao: form.descricao || null
      }

      if (editingEvento) {
        await supabase.from('eventos').update(data).eq('id', editingEvento.id)
      } else {
        await supabase.from('eventos').insert([data])
      }

      setShowModal(false)
      resetForm()
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
      toast.error('Erro', 'Erro ao guardar evento')
    }
  }

  const handleDelete = async (evento) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Evento',
      message: 'Eliminar este evento?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await supabase.from('eventos').delete().eq('id', evento.id)
          setShowEventDetail(null)
          fetchData()
          toast.success('Sucesso', 'Evento eliminado')
        } catch (err) {
          toast.error('Erro', 'Erro ao eliminar')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
    return
  }

  const resetForm = () => {
    setForm({ titulo: '', tipo: 'reuniao_cliente', projeto_id: '', data: '', hora_inicio: '09:00', hora_fim: '10:00', local: '', descricao: '' })
    setEditingEvento(null)
    setSelectedDate(null)
  }

  const handleAddEvent = (date) => {
    resetForm()
    setForm(prev => ({ ...prev, data: date.toISOString().split('T')[0] }))
    setShowModal(true)
  }

  const handleEditEvent = (evento) => {
    setEditingEvento(evento)
    setForm({
      titulo: evento.titulo || '',
      tipo: evento.tipo || 'outro',
      projeto_id: evento.projeto_id || '',
      data: evento.data || '',
      hora_inicio: evento.hora_inicio || '09:00',
      hora_fim: evento.hora_fim || '10:00',
      local: evento.local || '',
      descricao: evento.descricao || ''
    })
    setShowEventDetail(null)
    setShowModal(true)
  }

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
  }

  const formatWeekRange = (date) => {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const calendarDays = viewMode === 'mes' ? generateCalendarDays() : generateWeekDays()

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="page-title">Calendário</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Outlook Sync */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {OUTLOOK_ACCOUNTS.map(account => (
              <button
                key={account.email}
                onClick={() => toast.info('Info', `Configurar sincronização com ${account.email}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  background: 'var(--white)',
                  border: '1px solid var(--stone)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--brown-light)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title={`Sincronizar com ${account.email}`}
              >
                <Link2 size={12} />
                {account.label}
              </button>
            ))}
            <button
              onClick={() => toast.success('Sucesso', 'Calendários sincronizados com sucesso')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                background: 'var(--accent-olive)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: 'white',
                cursor: 'pointer'
              }}
              title="Sincronizar agora"
            >
              <RefreshCw size={12} />
              Sync
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }} style={{ fontSize: '13px', padding: '8px 14px' }}>
            <Plus size={14} /> Novo Evento
          </button>
        </div>
      </div>

      {/* Controlos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        {/* Toggle Mês/Semana */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--stone)', padding: '3px', borderRadius: '8px' }}>
            <button onClick={() => setViewMode('mes')} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: viewMode === 'mes' ? 'var(--white)' : 'transparent', color: viewMode === 'mes' ? 'var(--brown)' : 'var(--brown-light)' }}>
              Mês
            </button>
            <button onClick={() => setViewMode('semana')} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: viewMode === 'semana' ? 'var(--white)' : 'transparent', color: viewMode === 'semana' ? 'var(--brown)' : 'var(--brown-light)' }}>
              Semana
            </button>
          </div>
          
          {/* Toggles Feriados/Encerramentos */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
            <button
              onClick={() => setShowFeriados(!showFeriados)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', border: 'none', borderRadius: '6px',
                fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                background: showFeriados ? '#fee2e2' : 'var(--stone)',
                color: showFeriados ? '#dc2626' : 'var(--brown-light)'
              }}
            >
              <Flag size={12} /> Feriados
            </button>
            <button
              onClick={() => setShowEncerramentos(!showEncerramentos)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', border: 'none', borderRadius: '6px',
                fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                background: showEncerramentos ? '#ede9fe' : 'var(--stone)',
                color: showEncerramentos ? '#7c3aed' : 'var(--brown-light)'
              }}
            >
              <Building2 size={12} /> Encerramentos
            </button>
            <button
              onClick={() => setShowFerias(!showFerias)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', border: 'none', borderRadius: '6px',
                fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                background: showFerias ? '#cffafe' : 'var(--stone)',
                color: showFerias ? '#0891b2' : 'var(--brown-light)'
              }}
            >
              <Palmtree size={12} /> Férias
            </button>
          </div>
        </div>

        {/* Navegação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigateMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--brown-light)' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: 600, fontSize: '16px', minWidth: '200px', textAlign: 'center', textTransform: 'capitalize' }}>
            {viewMode === 'mes' ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
          </span>
          <button onClick={() => navigateMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--brown-light)' }}>
            <ChevronRight size={20} />
          </button>
          <button onClick={goToToday} style={{ padding: '6px 12px', border: '1px solid var(--stone)', borderRadius: '6px', fontSize: '12px', background: 'var(--white)', cursor: 'pointer' }}>
            Hoje
          </button>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {TIPOS_EVENTO.slice(0, 5).map(tipo => (
            <div key={tipo.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--brown-light)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: tipo.color }} />
              {tipo.label}
            </div>
          ))}
        </div>
      </div>

      {/* Calendário */}
      {viewMode === 'mes' ? (
        /* VISTA MENSAL */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--cream)', borderBottom: '1px solid var(--stone)' }}>
            {DIAS_SEMANA.map(dia => (
              <div key={dia} style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)' }}>
                {dia}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day.date)
              const today = isToday(day.date)
              const feriado = getFeriadoForDate(day.date)
              const encerramento = getEncerramentoForDate(day.date)
              const feriasHoje = getFeriasForDate(day.date)

              let bgColor = day.isCurrentMonth ? 'var(--white)' : 'var(--cream)'
              if (today) bgColor = 'rgba(201, 168, 130, 0.08)'
              if (feriado && showFeriados) bgColor = 'rgba(220, 38, 38, 0.06)'
              if (encerramento && showEncerramentos) bgColor = 'rgba(124, 58, 237, 0.06)'
              if (feriasHoje.length > 0 && showFerias) bgColor = 'rgba(8, 145, 178, 0.04)'

              return (
                <div
                  key={index}
                  onClick={() => handleAddEvent(day.date)}
                  style={{
                    minHeight: '100px',
                    padding: '6px',
                    borderRight: (index + 1) % 7 !== 0 ? '1px solid var(--stone)' : 'none',
                    borderBottom: '1px solid var(--stone)',
                    background: bgColor,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                    <span style={{
                      width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%', fontSize: '12px', fontWeight: today ? 600 : 400,
                      color: today ? 'white' : day.isCurrentMonth ? 'var(--brown)' : 'var(--brown-light)',
                      background: today ? 'var(--brown)' : 'transparent'
                    }}>
                      {day.date.getDate()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayEvents.slice(0, 3).map(evento => {
                      const tipoConfig = getTipoConfig(evento.tipo)
                      const isSpecialEvent = evento.isFeriado || evento.isEncerramento || evento.isFerias
                      return (
                        <div
                          key={evento.id}
                          onClick={(e) => { e.stopPropagation(); if (!isSpecialEvent) setShowEventDetail(evento) }}
                          style={{
                            padding: '2px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 500,
                            background: tipoConfig.color, color: 'white', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            cursor: isSpecialEvent ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          {evento.isFeriado && <Flag size={10} />}
                          {evento.isEncerramento && <Building2 size={10} />}
                          {evento.isFerias && <Palmtree size={10} />}
                          {evento.titulo}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '9px', color: 'var(--brown-light)', textAlign: 'center' }}>+{dayEvents.length - 3} mais</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* VISTA SEMANAL COM HORAS (8:00 - 20:00) */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header com dias da semana (segunda a sexta) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px repeat(5, 1fr)',
            background: 'var(--cream)',
            borderBottom: '1px solid var(--stone)'
          }}>
            {/* Canto vazio para coluna de horas */}
            <div style={{ padding: '12px 8px', borderRight: '1px solid var(--stone)' }} />

            {/* Dias da semana */}
            {calendarDays.map((day, idx) => {
              const today = isToday(day.date)
              return (
                <div
                  key={idx}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderRight: idx < 4 ? '1px solid var(--stone)' : 'none'
                  }}
                >
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: today ? 'var(--accent-olive-dark)' : 'var(--brown-light)',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                  }}>
                    {DIAS_SEMANA_CURTO[idx]}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: today ? 700 : 500,
                    width: today ? '32px' : 'auto',
                    height: today ? '32px' : 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: today ? 'var(--accent-olive-dark)' : 'transparent',
                    color: today ? 'white' : 'var(--brown)'
                  }}>
                    {day.date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grid de horas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px repeat(5, 1fr)',
            maxHeight: 'calc(100vh - 280px)',
            minHeight: '600px',
            overflowY: 'auto'
          }}>
            {HORAS_DIA.map((hora, horaIdx) => (
              <div key={hora} style={{ display: 'contents' }}>
                {/* Coluna de hora */}
                <div style={{
                  padding: '8px 4px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--brown-light)',
                  textAlign: 'right',
                  paddingRight: '8px',
                  borderRight: '1px solid var(--stone)',
                  borderBottom: '1px solid var(--stone-dark)',
                  background: 'var(--cream)',
                  height: '60px',
                  boxSizing: 'border-box'
                }}>
                  {hora}
                </div>

                {/* Células para cada dia */}
                {calendarDays.map((day, dayIdx) => {
                  const eventsAtHour = getEventsForHour(day.date, hora)
                  const today = isToday(day.date)

                  return (
                    <div
                      key={`${hora}-${dayIdx}`}
                      onClick={() => {
                        const dateStr = day.date.toISOString().split('T')[0]
                        resetForm()
                        setForm(prev => ({ ...prev, data: dateStr, hora_inicio: hora, hora_fim: `${parseInt(hora) + 1}:00` }))
                        setShowModal(true)
                      }}
                      style={{
                        position: 'relative',
                        borderRight: dayIdx < 4 ? '1px solid var(--stone)' : 'none',
                        borderBottom: '1px solid var(--stone-dark)',
                        background: today ? 'rgba(139, 154, 125, 0.04)' : 'var(--white)',
                        height: '60px',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = today ? 'rgba(139, 154, 125, 0.08)' : 'var(--cream)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = today ? 'rgba(139, 154, 125, 0.04)' : 'var(--white)'}
                    >
                      {/* Eventos nesta hora */}
                      {eventsAtHour.map((evento, evtIdx) => {
                        const tipoConfig = getTipoConfig(evento.tipo)
                        const position = getEventPosition(evento)
                        return (
                          <div
                            key={evento.id}
                            onClick={(e) => { e.stopPropagation(); setShowEventDetail(evento) }}
                            style={{
                              position: 'absolute',
                              top: `${position.top}px`,
                              left: '2px',
                              right: '2px',
                              minHeight: `${Math.min(position.height, 58)}px`,
                              padding: '4px 6px',
                              borderRadius: '4px',
                              background: tipoConfig.color,
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: 500,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              zIndex: evtIdx + 1,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ opacity: 0.9, fontSize: '10px' }}>{evento.hora_inicio}</span>
                              <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {evento.titulo}
                              </span>
                            </div>
                            {position.height > 40 && evento.local && (
                              <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <MapPin size={8} /> {evento.local}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Detalhe do Evento */}
      {showEventDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowEventDetail(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '380px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            {(() => {
              const evento = showEventDetail
              const tipoConfig = getTipoConfig(evento.tipo)
              const projeto = getProjetoInfo(evento.projeto_id)
              
              return (
                <>
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--stone)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: tipoConfig.color, color: 'white' }}>
                        {tipoConfig.label}
                      </span>
                      <button onClick={() => setShowEventDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                    </div>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{evento.titulo}</h2>
                    {projeto && <p style={{ fontSize: '12px', color: 'var(--warning)', margin: '4px 0 0' }}>{projeto.codigo} - {projeto.nome}</p>}
                  </div>
                  
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px' }}>
                      <Clock size={14} style={{ color: 'var(--brown-light)' }} />
                      <span>{new Date(evento.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      {evento.hora_inicio && <span style={{ color: 'var(--brown-light)' }}>• {evento.hora_inicio} - {evento.hora_fim}</span>}
                    </div>
                    
                    {evento.local && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px' }}>
                        <MapPin size={14} style={{ color: 'var(--brown-light)' }} />
                        <span>{evento.local}</span>
                      </div>
                    )}
                    
                    {evento.descricao && (
                      <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: '12px 0 0', lineHeight: 1.5 }}>{evento.descricao}</p>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
                    <button onClick={() => handleEditEvent(evento)} className="btn btn-outline" style={{ flex: 1, fontSize: '12px', padding: '8px' }}>
                      <Edit size={14} /> Editar
                    </button>
                    <button onClick={() => handleDelete(evento)} style={{ flex: 1, padding: '8px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Criar/Editar Evento */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '420px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{editingEvento ? 'Editar Evento' : 'Novo Evento'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            
            <div style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Nome do evento"
                  style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px' }}>
                    {TIPOS_EVENTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Projeto</label>
                  <select value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})} style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px' }}>
                    <option value="">Sem projeto</option>
                    {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Data *</label>
                <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})}
                  style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Hora Início</label>
                  <input type="time" value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})}
                    style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Hora Fim</label>
                  <input type="time" value={form.hora_fim} onChange={e => setForm({...form, hora_fim: e.target.value})}
                    style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Local</label>
                <input type="text" value={form.local} onChange={e => setForm({...form, local: e.target.value})} placeholder="Morada ou link"
                  style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>Notas</label>
                <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={2}
                  style={{ width: '100%', padding: '9px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ fontSize: '12px', padding: '8px 14px' }}>Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={!form.titulo.trim() || !form.data} style={{ fontSize: '12px', padding: '8px 14px' }}>
                {editingEvento ? 'Guardar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}
