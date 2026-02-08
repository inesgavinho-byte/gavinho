import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  FolderKanban, ClipboardList, Handshake, ShoppingCart, PieChart,
  FileCheck, Search, Filter, Loader2, ChevronRight, Building2,
  Calendar, ArrowRight, ExternalLink
} from 'lucide-react'

const TABS = [
  { key: 'procurement', label: 'Procurement', icon: Handshake },
  { key: 'compras', label: 'Compras', icon: ShoppingCart },
  { key: 'controlo', label: 'Controlo Executado', icon: PieChart },
  { key: 'autos', label: 'Autos', icon: FileCheck },
]

export default function ProjetosGestaoPage({ mode = 'em-curso' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isEmCurso = mode === 'em-curso'

  // Determine active tab from URL
  const pathParts = location.pathname.split('/')
  const activeTab = TABS.find(t => pathParts.includes(t.key))?.key || null

  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjetos()
  }, [mode])

  const fetchProjetos = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('projetos')
        .select('*')
        .order('codigo', { ascending: true })

      if (isEmCurso) {
        query = query.in('status', ['em_curso', 'ativo', 'Em Curso', 'Ativo', 'design', 'execução', 'construção', 'planeamento'])
      } else {
        query = query.in('status', ['concluido', 'Concluído', 'concluída', 'finalizado'])
      }

      const { data, error } = await query
      if (error) throw error
      setProjetos(data || [])
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
      setProjetos([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProjetos = projetos.filter(p =>
    !searchTerm ||
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTabClick = (tabKey) => {
    navigate(`/gestao-projeto/${mode}/${tabKey}`)
  }

  const autosLabel = isEmCurso ? 'Autos Projeto' : 'Autos Obra'

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
          <h1 className="page-title">
            {isEmCurso ? 'Projetos em Curso' : 'Projetos Concluídos'}
          </h1>
          <p className="page-subtitle">
            {isEmCurso
              ? `${projetos.length} projetos ativos — Procurement, Compras, Controlo e Autos`
              : `${projetos.length} projetos concluídos — Histórico e documentação`
            }
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--stone)',
        paddingBottom: '0'
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          const label = tab.key === 'autos' ? autosLabel : tab.label
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: isActive ? 'var(--accent-olive)' : 'transparent',
                color: isActive ? 'white' : 'var(--brown-light)',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
        <input
          type="text"
          placeholder="Pesquisar projetos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Tab Content */}
      {activeTab ? (
        <div>
          {/* Project cards for selected tab */}
          {filteredProjetos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredProjetos.map(projeto => (
                <div
                  key={projeto.id}
                  className="card"
                  style={{ padding: '16px', cursor: 'pointer' }}
                  onClick={() => navigate(`/projetos/${projeto.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'rgba(122, 139, 110, 0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Building2 size={18} style={{ color: 'var(--accent-olive)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)', fontWeight: 600, letterSpacing: '0.5px' }}>
                          {projeto.codigo}
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>
                          {projeto.nome}
                        </div>
                        {projeto.cliente_nome && (
                          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                            {projeto.cliente_nome}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                        background: isEmCurso ? 'rgba(217, 119, 6, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: isEmCurso ? '#D97706' : '#059669'
                      }}>
                        {projeto.fase || projeto.status}
                      </span>
                      <ChevronRight size={16} style={{ color: 'var(--brown-light)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                {activeTab === 'procurement' && <Handshake size={48} />}
                {activeTab === 'compras' && <ShoppingCart size={48} />}
                {activeTab === 'controlo' && <PieChart size={48} />}
                {activeTab === 'autos' && <FileCheck size={48} />}
                <h3>Sem dados de {TABS.find(t => t.key === activeTab)?.label}</h3>
                <p>Os dados serão apresentados aqui quando disponíveis.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Overview - no tab selected */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const label = tab.key === 'autos' ? autosLabel : tab.label
              return (
                <div
                  key={tab.key}
                  className="card"
                  onClick={() => handleTabClick(tab.key)}
                  style={{ padding: '24px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'rgba(122, 139, 110, 0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <Icon size={24} style={{ color: 'var(--accent-olive)' }} />
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '14px' }}>{label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>
                    {projetos.length} projetos
                  </div>
                </div>
              )
            })}
          </div>

          {/* Project list */}
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)', marginBottom: '12px' }}>
            {isEmCurso ? 'Projetos Ativos' : 'Projetos Concluídos'}
          </h3>
          {filteredProjetos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredProjetos.map(projeto => (
                <div
                  key={projeto.id}
                  className="card"
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onClick={() => navigate(`/projetos/${projeto.id}`)}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--brown-light)', fontWeight: 600 }}>{projeto.codigo}</span>
                    <span style={{ margin: '0 8px', color: 'var(--stone)' }}>|</span>
                    <span style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '13px' }}>{projeto.nome}</span>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--brown-light)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                {isEmCurso ? <FolderKanban size={48} /> : <ClipboardList size={48} />}
                <h3>Nenhum projeto {isEmCurso ? 'em curso' : 'concluído'}</h3>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
