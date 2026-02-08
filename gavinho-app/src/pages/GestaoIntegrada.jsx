import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Layers, Handshake, ShoppingCart, PieChart, FileCheck,
  Building2, FolderKanban, ChevronRight, Loader2,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Search
} from 'lucide-react'

const MODULES = [
  { key: 'procurement', label: 'Procurement', icon: Handshake, color: '#8B5CF6' },
  { key: 'compras', label: 'Compras', icon: ShoppingCart, color: '#3B82F6' },
  { key: 'controlo', label: 'Controlo Executado', icon: PieChart, color: '#D97706' },
  { key: 'autos', label: 'Autos', icon: FileCheck, color: '#059669' },
]

export default function GestaoIntegrada() {
  const navigate = useNavigate()
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState(null)

  useEffect(() => {
    fetchProjetos()
  }, [])

  const fetchProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .order('codigo', { ascending: true })

      if (error) throw error
      setProjetos(data || [])
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
    } finally {
      setLoading(false)
    }
  }

  const projetosEmCurso = projetos.filter(p =>
    ['em_curso', 'ativo', 'Em Curso', 'Ativo', 'design', 'execução', 'construção', 'planeamento'].includes(p.status)
  )
  const projetosConcluidos = projetos.filter(p =>
    ['concluido', 'Concluído', 'concluída', 'finalizado'].includes(p.status)
  )

  const filteredProjetos = projetos.filter(p =>
    !searchTerm ||
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="page-title">Gestão Integrada</h1>
          <p className="page-subtitle">Visão global de Procurement, Compras, Controlo Executado e Autos — todos os projetos</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-olive)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FolderKanban size={24} style={{ color: 'var(--accent-olive)' }} />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brown)' }}>{projetos.length}</div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Total Projetos</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={24} style={{ color: '#D97706' }} />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brown)' }}>{projetosEmCurso.length}</div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Em Curso</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} style={{ color: '#059669' }} />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brown)' }}>{projetosConcluidos.length}</div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Concluídos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>Módulos</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {MODULES.map(mod => {
          const Icon = mod.icon
          const isSelected = selectedModule === mod.key
          return (
            <div
              key={mod.key}
              className="card"
              onClick={() => setSelectedModule(isSelected ? null : mod.key)}
              style={{
                padding: '20px',
                cursor: 'pointer',
                borderLeft: `4px solid ${mod.color}`,
                background: isSelected ? `${mod.color}08` : undefined,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: `${mod.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={22} style={{ color: mod.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>{mod.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    {projetos.length} projetos
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cross-project view */}
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>
        Todos os Projetos {selectedModule && `— ${MODULES.find(m => m.key === selectedModule)?.label}`}
      </h3>

      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
        <input
          type="text"
          placeholder="Pesquisar projetos..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Project Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--stone)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projeto</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--brown-light)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredProjetos.map(projeto => (
              <tr
                key={projeto.id}
                style={{ borderBottom: '1px solid var(--stone)', cursor: 'pointer' }}
                onClick={() => navigate(`/projetos/${projeto.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-olive)' }}>{projeto.codigo}</td>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--brown)' }}>{projeto.nome}</td>
                <td style={{ padding: '12px 16px', color: 'var(--brown-light)' }}>{projeto.cliente_nome || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                    background: 'rgba(122, 139, 110, 0.12)', color: 'var(--accent-olive)',
                    textTransform: 'capitalize'
                  }}>
                    {projeto.status?.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--brown-light)', fontSize: '12px' }}>
                  {projeto.tipologia || projeto.tipo || '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <ChevronRight size={16} style={{ color: 'var(--brown-light)' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProjetos.length === 0 && (
          <div className="empty-state" style={{ padding: '40px' }}>
            <Layers size={48} />
            <h3>Nenhum projeto encontrado</h3>
          </div>
        )}
      </div>
    </div>
  )
}
