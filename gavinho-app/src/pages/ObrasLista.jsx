import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Search, HardHat, MapPin, Calendar, Users,
  Eye, Filter, Building2, ChevronDown, Loader2
} from 'lucide-react'

const statusOptions = ['Todos', 'Planeamento', 'Em Curso', 'Pausada', 'Concluída', 'Cancelada']
const tipoOptions = ['Todos', 'Construção Nova', 'Remodelação', 'Ampliação', 'Fit-out']

const statusColors = {
  'planeamento': { bg: 'rgba(122, 139, 110, 0.12)', text: '#7A8B6E' },
  'em_curso': { bg: 'rgba(217, 119, 6, 0.12)', text: '#D97706' },
  'pausada': { bg: 'rgba(107, 114, 128, 0.12)', text: '#6B7280' },
  'concluida': { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669' },
  'cancelada': { bg: 'rgba(220, 38, 38, 0.12)', text: '#DC2626' },
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
      obra.status?.toLowerCase().replace(' ', '_') === selectedStatus.toLowerCase().replace(' ', '_')

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

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Obras</h1>
          <p className="page-subtitle">Lista de todas as obras</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar obras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '160px' }}
        >
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={selectedTipo}
          onChange={(e) => setSelectedTipo(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '160px' }}
        >
          {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Obras Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filteredObras.map(obra => {
          const statusKey = obra.status?.toLowerCase().replace(' ', '_')
          const colors = statusColors[statusKey] || statusColors['planeamento']

          return (
            <div
              key={obra.id}
              className="card"
              onClick={() => navigate(`/obras/${obra.id}`)}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    {obra.codigo}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>{obra.nome}</h3>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: colors.bg,
                  color: colors.text,
                  textTransform: 'capitalize'
                }}>
                  {obra.status?.replace('_', ' ')}
                </span>
              </div>

              {obra.projetos && (
                <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '8px' }}>
                  Projeto: {obra.projetos.codigo} - {obra.projetos.nome}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                {obra.localizacao && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> {obra.localizacao}
                  </div>
                )}
                {obra.tipo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={12} /> {obra.tipo}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {obra.progresso > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--brown-light)' }}>Progresso</span>
                    <span style={{ fontWeight: 600, color: 'var(--brown)' }}>{obra.progresso}%</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'var(--stone)' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '2px',
                      width: `${obra.progresso}%`,
                      background: 'var(--accent-olive)',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredObras.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <HardHat size={48} />
            <h3>Nenhuma obra encontrada</h3>
            <p>Ajuste os filtros ou crie uma nova obra a partir do Dashboard Obras.</p>
          </div>
        </div>
      )}
    </div>
  )
}
