import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  FileSearch,
  Plus,
  Search,
  Filter,
  Building2,
  Calendar,
  ChevronRight,
  Loader,
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react'
import { ClassificacaoBadge, EstadoBadge } from '../components/viabilidade/ViabilidadeModule'

export default function Viabilidade() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [analises, setAnalises] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterConcelho, setFilterConcelho] = useState('todos')
  const [concelhos, setConcelhos] = useState([])

  useEffect(() => {
    loadAnalises()
    loadConcelhos()
  }, [])

  const loadConcelhos = async () => {
    try {
      const { data, error } = await supabase
        .from('concelhos')
        .select('id, nome')
        .eq('activo', true)
        .order('nome')

      if (!error && data) {
        setConcelhos(data)
      }
    } catch (error) {
      console.error('Erro ao carregar concelhos:', error)
    }
  }

  const loadAnalises = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_analises_completas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnalises(data || [])
    } catch (error) {
      console.error('Erro ao carregar análises:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAnalises = analises.filter(analise => {
    const matchesSearch =
      analise.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analise.projeto_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analise.concelho_nome?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEstado = filterEstado === 'todos' || analise.estado === filterEstado
    const matchesConcelho = filterConcelho === 'todos' || analise.concelho_id === filterConcelho

    return matchesSearch && matchesEstado && matchesConcelho
  })

  const stats = {
    total: analises.length,
    viaveis: analises.filter(a => a.classificacao === 'viavel').length,
    condicionados: analises.filter(a => a.classificacao === 'viavel_condicionado').length,
    inviaveis: analises.filter(a => a.classificacao === 'inviavel').length,
    pendentes: analises.filter(a => a.estado === 'rascunho' || a.estado === 'em_analise').length
  }

  const handleOpenAnalise = (analise) => {
    // Navigate to project detail with viabilidade tab
    navigate(`/projetos/${analise.projeto_id}/viabilidade?analise=${analise.id}`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>
          Viabilidade Urbanística
        </h1>
        <p style={{ margin: 0, color: 'var(--brown-light)', fontSize: '14px' }}>
          Análises de viabilidade de todos os projetos
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Total de Análises</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <CheckCircle size={20} color="#16a34a" />
            <span style={{ fontSize: '28px', fontWeight: 600, color: '#16a34a' }}>{stats.viaveis}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Viáveis</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <AlertTriangle size={20} color="#d97706" />
            <span style={{ fontSize: '28px', fontWeight: 600, color: '#d97706' }}>{stats.condicionados}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Condicionados</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <XCircle size={20} color="#dc2626" />
            <span style={{ fontSize: '28px', fontWeight: 600, color: '#dc2626' }}>{stats.inviaveis}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Inviáveis</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Clock size={20} color="#8B8670" />
            <span style={{ fontSize: '28px', fontWeight: 600, color: '#8B8670' }}>{stats.pendentes}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Pendentes</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--brown-light)'
          }} />
          <input
            type="text"
            placeholder="Pesquisar análises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid var(--stone)',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          style={{
            padding: '10px 12px',
            border: '1px solid var(--stone)',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="todos">Todos os estados</option>
          <option value="rascunho">Rascunho</option>
          <option value="em_analise">Em Análise</option>
          <option value="concluido">Concluído</option>
          <option value="validado">Validado</option>
        </select>

        <select
          value={filterConcelho}
          onChange={(e) => setFilterConcelho(e.target.value)}
          style={{
            padding: '10px 12px',
            border: '1px solid var(--stone)',
            borderRadius: '8px',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="todos">Todos os concelhos</option>
          {concelhos.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader size={32} className="spin" style={{ color: '#8B8670' }} />
            <p style={{ marginTop: '16px', color: 'var(--brown-light)' }}>A carregar análises...</p>
          </div>
        ) : filteredAnalises.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <FileSearch size={48} style={{ color: '#d6d3d1', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
              {searchTerm || filterEstado !== 'todos' || filterConcelho !== 'todos'
                ? 'Nenhuma análise encontrada'
                : 'Sem análises'}
            </h3>
            <p style={{ color: 'var(--brown-light)', fontSize: '14px' }}>
              {searchTerm || filterEstado !== 'todos' || filterConcelho !== 'todos'
                ? 'Tente ajustar os filtros de pesquisa.'
                : 'As análises de viabilidade são criadas dentro de cada projeto.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--stone)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>
                  Código
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>
                  Projeto
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>
                  Concelho
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>
                  Estado
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>
                  Classificação
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', textTransform: 'uppercase' }}>
                  Data
                </th>
                <th style={{ padding: '14px 16px', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAnalises.map(analise => (
                <tr
                  key={analise.id}
                  onClick={() => handleOpenAnalise(analise)}
                  style={{
                    borderBottom: '1px solid var(--stone)',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>
                      {analise.codigo}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={16} color="#78716c" />
                      <span style={{ fontSize: '14px', color: 'var(--brown)' }}>
                        {analise.projeto_nome || analise.projeto_codigo || '-'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} color="#78716c" />
                      <span style={{ fontSize: '14px', color: 'var(--brown)' }}>
                        {analise.concelho_nome || '-'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <EstadoBadge estado={analise.estado} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {analise.classificacao ? (
                      <ClassificacaoBadge classificacao={analise.classificacao} />
                    ) : (
                      <span style={{ color: '#a8a29e', fontSize: '13px' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#78716c" />
                      <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                        {formatDate(analise.created_at)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <ChevronRight size={18} color="#a8a29e" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
