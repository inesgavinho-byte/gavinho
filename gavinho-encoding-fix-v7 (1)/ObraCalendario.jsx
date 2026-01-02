import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { 
  ChevronLeft, ChevronRight, Plus, X, Calendar, Clock, 
  Shield, AlertTriangle, Users, FileText, Edit, Trash2
} from 'lucide-react'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// Tipos de eventos com cores
const TIPOS_EVENTO = {
  licenca: { label: 'Licença', cor: '#EF4444', icon: Shield },
  reuniao: { label: 'Reunião', cor: '#3B82F6', icon: Users },
  entrega: { label: 'Entrega', cor: '#10B981', icon: FileText },
  inspecao: { label: 'Inspeção', cor: '#F59E0B', icon: AlertTriangle },
  outro: { label: 'Outro', cor: '#6B7280', icon: Calendar }
}

export default function ObraCalendario({ obraId, obraCodigo, obraNome }) {
  const [eventos, setEventos] = useState([])
  const [licencas, setLicencas] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingEvento, setEditingEvento] = useState(null)
  const [view, setView] = useState('month') // 'month' ou 'list'
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
    tipo: 'reuniao',
    cor: '#3B82F6',
    local: '',
    participantes: ''
  })

  useEffect(() => {
    if (obraId) {
      loadEventos()
      loadLicencas()
    }
  }, [obraId, currentDate])

  const loadEventos = async () => {
    try {
      setLoading(true)
      
      // Buscar eventos da obra
      const { data: eventosData, error } = await supabase
        .from('calendario_eventos')
        .select('*')
        .eq('obra_id', obraId)
        .order('data_inicio', { ascending: true })
      
      if (error) throw error
      setEventos(eventosData || [])
    } catch (err) {
      console.error('Erro ao carregar eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLicencas = async () => {
    try {
      const { data, error } = await supabase
        .from('obra_licencas')
        .select('*')
        .eq('obra_id', obraId)
        .not('data_expiracao', 'is', null)
      
      if (error) throw error
      setLicencas(data || [])
    } catch (err) {
      console.error('Erro ao carregar licenças:', err)
    }
  }

  // Combinar eventos e licenças para o calendário
  const todosEventos = useMemo(() => {
    const eventosLicencas = licencas.map(l => ({
      id: `licenca-${l.id}`,
      titulo: `${l.tipo_nome} - Expiração`,
      data_inicio: l.data_expiracao,
      data_fim: l.data_expiracao,
      tipo: 'licenca',
      cor: l.tipo_cor || '#EF4444',
      descricao: `Licença ${l.numero || ''} expira`,
      isLicenca: true,
      licencaId: l.id
    }))
    
    return [...eventos, ...eventosLicencas].sort((a, b) => 
      new Date(a.data_inicio) - new Date(b.data_inicio)
    )
  }, [eventos, licencas])

  // Gerar dias do mês
  const diasDoMes = useMemo(() => {
    const ano = currentDate.getFullYear()
    const mes = currentDate.getMonth()
    const primeiroDia = new Date(ano, mes, 1)
    const ultimoDia = new Date(ano, mes + 1, 0)
    
    const dias = []
    
    // Dias do mês anterior para completar a semana
    const diasAnteriores = primeiroDia.getDay()
    for (let i = diasAnteriores - 1; i >= 0; i--) {
      const dia = new Date(ano, mes, -i)
      dias.push({ date: dia, isCurrentMonth: false })
    }
    
    // Dias do mês atual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push({ date: new Date(ano, mes, i), isCurrentMonth: true })
    }
    
    // Dias do próximo mês
    const diasRestantes = 42 - dias.length
    for (let i = 1; i <= diasRestantes; i++) {
      dias.push({ date: new Date(ano, mes + 1, i), isCurrentMonth: false })
    }
    
    return dias
  }, [currentDate])

  // Eventos de um dia específico
  const getEventosDia = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return todosEventos.filter(e => {
      const inicio = e.data_inicio?.split('T')[0]
      const fim = e.data_fim?.split('T')[0] || inicio
      return dateStr >= inicio && dateStr <= fim
    })
  }

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.data_inicio) return
    
    try {
      const eventoData = {
        obra_id: obraId,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        data_inicio: formData.hora_inicio 
          ? `${formData.data_inicio}T${formData.hora_inicio}` 
          : formData.data_inicio,
        data_fim: formData.data_fim 
          ? (formData.hora_fim ? `${formData.data_fim}T${formData.hora_fim}` : formData.data_fim)
          : null,
        tipo: formData.tipo,
        cor: TIPOS_EVENTO[formData.tipo]?.cor || formData.cor,
        local: formData.local || null,
        participantes: formData.participantes ? formData.participantes.split(',').map(p => p.trim()) : null
      }
      
      if (editingEvento) {
        const { error } = await supabase
          .from('calendario_eventos')
          .update(eventoData)
          .eq('id', editingEvento.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('calendario_eventos')
          .insert(eventoData)
        if (error) throw error
      }
      
      await loadEventos()
      handleCloseModal()
    } catch (err) {
      console.error('Erro ao guardar evento:', err)
      alert('Erro: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar este evento?')) return
    
    try {
      const { error } = await supabase
        .from('calendario_eventos')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadEventos()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
    }
  }

  const handleEdit = (evento) => {
    if (evento.isLicenca) return // Não permitir editar eventos de licença
    
    setEditingEvento(evento)
    const dataInicio = evento.data_inicio?.split('T')
    const dataFim = evento.data_fim?.split('T')
    
    setFormData({
      titulo: evento.titulo || '',
      descricao: evento.descricao || '',
      data_inicio: dataInicio?.[0] || '',
      hora_inicio: dataInicio?.[1]?.substring(0, 5) || '',
      data_fim: dataFim?.[0] || '',
      hora_fim: dataFim?.[1]?.substring(0, 5) || '',
      tipo: evento.tipo || 'outro',
      cor: evento.cor || '#6B7280',
      local: evento.local || '',
      participantes: evento.participantes?.join(', ') || ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingEvento(null)
    setFormData({
      titulo: '',
      descricao: '',
      data_inicio: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      hora_inicio: '',
      data_fim: '',
      hora_fim: '',
      tipo: 'reuniao',
      cor: '#3B82F6',
      local: '',
      participantes: ''
    })
  }

  const handleAddEvento = (date) => {
    setSelectedDate(date)
    setFormData(prev => ({
      ...prev,
      data_inicio: date.toISOString().split('T')[0]
    }))
    setShowModal(true)
  }

  const navegarMes = (direcao) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direcao, 1))
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Próximos eventos (lista)
  const proximosEventos = todosEventos.filter(e => new Date(e.data_inicio) >= hoje).slice(0, 10)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
            Calendário da Obra
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginTop: '4px' }}>
            {obraCodigo}  –  {obraNome}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ 
            display: 'flex', 
            background: 'var(--cream)', 
            borderRadius: '8px', 
            padding: '4px'
          }}>
            <button
              onClick={() => setView('month')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                background: view === 'month' ? 'var(--white)' : 'transparent',
                color: view === 'month' ? 'var(--brown)' : 'var(--brown-light)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: view === 'month' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              Mês
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                background: view === 'list' ? 'var(--white)' : 'transparent',
                color: view === 'list' ? 'var(--brown)' : 'var(--brown-light)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: view === 'list' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              Lista
            </button>
          </div>
          <button
            onClick={() => handleAddEvento(new Date())}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Novo Evento
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <>
          {/* Navegação do mês */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'var(--cream)',
            borderRadius: '10px'
          }}>
            <button
              onClick={() => navegarMes(-1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--brown)' }}
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--brown)' }}>
              {MESES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={() => navegarMes(1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--brown)' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendário */}
          <div style={{ 
            background: 'var(--white)', 
            borderRadius: '12px', 
            border: '1px solid var(--stone)',
            overflow: 'hidden'
          }}>
            {/* Cabeçalho dias da semana */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              borderBottom: '1px solid var(--stone)',
              background: 'var(--cream)'
            }}>
              {DIAS_SEMANA.map(dia => (
                <div key={dia} style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: 'var(--brown-light)',
                  textTransform: 'uppercase'
                }}>
                  {dia}
                </div>
              ))}
            </div>
            
            {/* Grid de dias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {diasDoMes.map((dia, idx) => {
                const eventosDia = getEventosDia(dia.date)
                const isHoje = dia.date.toDateString() === hoje.toDateString()
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleAddEvento(dia.date)}
                    style={{
                      minHeight: '90px',
                      padding: '8px',
                      borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--stone)' : 'none',
                      borderBottom: idx < 35 ? '1px solid var(--stone)' : 'none',
                      background: isHoje ? 'rgba(201, 168, 130, 0.1)' : dia.isCurrentMonth ? 'var(--white)' : 'var(--cream)',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isHoje ? 'rgba(201, 168, 130, 0.1)' : dia.isCurrentMonth ? 'var(--white)' : 'var(--cream)'}
                  >
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: isHoje ? 700 : 500,
                      color: dia.isCurrentMonth ? (isHoje ? 'var(--brown)' : 'var(--brown)') : 'var(--brown-light)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isHoje && (
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--blush)'
                        }} />
                      )}
                      {dia.date.getDate()}
                    </div>
                    
                    {/* Eventos do dia */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {eventosDia.slice(0, 3).map(evento => (
                        <div
                          key={evento.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(evento)
                          }}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: `${evento.cor}20`,
                            color: evento.cor,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {evento.titulo}
                        </div>
                      ))}
                      {eventosDia.length > 3 && (
                        <span style={{ fontSize: '10px', color: 'var(--brown-light)' }}>
                          +{eventosDia.length - 3} mais
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        /* Vista Lista */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {proximosEventos.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px', 
              background: 'var(--cream)', 
              borderRadius: '12px' 
            }}>
              <Calendar size={48} style={{ color: 'var(--brown-light)', marginBottom: '16px', opacity: 0.4 }} />
              <p style={{ color: 'var(--brown-light)' }}>Sem eventos agendados</p>
            </div>
          ) : (
            proximosEventos.map(evento => {
              const TipoIcon = TIPOS_EVENTO[evento.tipo]?.icon || Calendar
              return (
                <div
                  key={evento.id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderLeft: `4px solid ${evento.cor}`
                  }}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: `${evento.cor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TipoIcon size={22} style={{ color: evento.cor }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)', marginBottom: '4px' }}>
                      {evento.titulo}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {new Date(evento.data_inicio).toLocaleDateString('pt-PT')}
                      </span>
                      {evento.data_inicio?.includes('T') && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {evento.data_inicio.split('T')[1]?.substring(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!evento.isLicenca && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(evento)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '6px' }}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(evento.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Legenda */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginTop: '20px',
        padding: '12px 16px',
        background: 'var(--cream)',
        borderRadius: '8px',
        flexWrap: 'wrap'
      }}>
        {Object.entries(TIPOS_EVENTO).map(([key, value]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '3px', 
              background: value.cor 
            }} />
            <span style={{ color: 'var(--brown-light)' }}>{value.label}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingEvento ? 'Editar Evento' : 'Novo Evento'}</h3>
              <button onClick={handleCloseModal} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="form-input"
                  placeholder="Nome do evento"
                />
              </div>
              
              <div>
                <label className="form-label">Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="form-input"
                >
                  {Object.entries(TIPOS_EVENTO).filter(([k]) => k !== 'licenca').map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Data Início *</label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Hora</label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Data Fim</label>
                  <input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Hora Fim</label>
                  <input
                    type="time"
                    value={formData.hora_fim}
                    onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              
              <div>
                <label className="form-label">Local</label>
                <input
                  type="text"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  className="form-input"
                  placeholder="Localização do evento"
                />
              </div>
              
              <div>
                <label className="form-label">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="form-input"
                  rows={3}
                  placeholder="Detalhes do evento..."
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={handleCloseModal} className="btn btn-secondary">
                Cancelar
              </button>
              <button 
                onClick={handleSubmit} 
                className="btn btn-primary"
                disabled={!formData.titulo || !formData.data_inicio}
              >
                {editingEvento ? 'Guardar' : 'Criar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
