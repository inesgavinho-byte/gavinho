import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Filter, LayoutGrid, List, MoreVertical, MapPin, Calendar, X,
  Edit, Trash2, Eye, FolderKanban
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const fases = ['Todas', 'Proposta', 'Conceito', 'Projeto', 'Licenciamento', 'Construção', 'Fit-out', 'Entrega']
const tipologias = ['Residencial', 'Hospitalidade', 'Comercial', 'Misto']
const statusOptions = ['on_track', 'at_risk', 'blocked']

export default function Projetos() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFase, setSelectedFase] = useState('Todas')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    tipologia: 'Residencial',
    localizacao: '',
    morada: '',
    cidade: '',
    cliente_id: '',
    cliente_nome: '',
    fase: 'Conceito',
    status: 'on_track',
    progresso: 0,
    descricao: '',
    data_inicio: '',
    data_prevista_conclusao: '',
    orcamento_atual: ''
  })

  // Carregar projetos e clientes
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projRes, cliRes] = await Promise.all([
          supabase.from('projetos').select('*').order('codigo', { ascending: true }),
          supabase.from('clientes').select('id, nome').order('nome')
        ])
        
        setProjects(projRes.data || [])
        setClientes(cliRes.data || [])
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Gerar código do projeto
  const generateProjectCode = async () => {
    const { data } = await supabase
      .from('projetos')
      .select('codigo')
      .order('codigo', { ascending: false })
      .limit(1)

    let nextNum = 1
    if (data && data.length > 0 && data[0].codigo) {
      const match = data[0].codigo.match(/GA(\d+)/)
      if (match) nextNum = parseInt(match[1]) + 1
    }
    return `GA${String(nextNum).padStart(5, '0')}`
  }

  // Filtrar projetos
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFase = selectedFase === 'Todas' || p.fase === selectedFase
    return matchesSearch && matchesFase
  })

  // Abrir modal para criar
  const handleNewProject = () => {
    setEditingProject(null)
    setFormData({
      nome: '', tipologia: 'Residencial', localizacao: '', morada: '', cidade: '',
      cliente_id: '', cliente_nome: '', fase: 'Conceito', status: 'on_track',
      progresso: 0, descricao: '', data_inicio: new Date().toISOString().split('T')[0],
      data_prevista_conclusao: '', orcamento_atual: ''
    })
    setShowModal(true)
  }

  // Abrir modal para editar
  const handleEditProject = (project) => {
    setEditingProject(project)
    setFormData({
      nome: project.nome || '',
      tipologia: project.tipologia || 'Residencial',
      localizacao: project.localizacao || '',
      morada: project.morada || '',
      cidade: project.cidade || '',
      cliente_id: project.cliente_id || '',
      cliente_nome: project.cliente_nome || '',
      fase: project.fase || 'Conceito',
      status: project.status || 'on_track',
      progresso: project.progresso || 0,
      descricao: project.descricao || '',
      data_inicio: project.data_inicio || '',
      data_prevista_conclusao: project.data_prevista_conclusao || '',
      orcamento_atual: project.orcamento_atual || ''
    })
    setShowModal(true)
    setActiveMenu(null)
  }

  // Guardar projeto (criar ou atualizar)
  const handleSaveProject = async () => {
    if (!formData.nome.trim()) {
      alert('O nome do projeto é obrigatório')
      return
    }

    try {
      // Buscar nome do cliente se selecionado
      let clienteNome = formData.cliente_nome
      if (formData.cliente_id) {
        const cliente = clientes.find(c => c.id === formData.cliente_id)
        if (cliente) clienteNome = cliente.nome
      }

      const projectData = {
        nome: formData.nome,
        tipologia: formData.tipologia || 'Residencial',
        localizacao: formData.localizacao || null,
        morada: formData.morada || null,
        cidade: formData.cidade || null,
        cliente_id: formData.cliente_id || null,
        cliente_nome: clienteNome || null,
        fase: formData.fase || 'Conceito',
        status: formData.status || 'on_track',
        progresso: parseInt(formData.progresso) || 0,
        descricao: formData.descricao || null,
        data_inicio: formData.data_inicio || null,
        data_prevista_conclusao: formData.data_prevista_conclusao || null,
        orcamento_atual: formData.orcamento_atual ? parseFloat(formData.orcamento_atual) : null,
        updated_at: new Date().toISOString()
      }

      console.log('A guardar projeto:', projectData)

      if (editingProject) {
        // Atualizar
        const { data, error } = await supabase
          .from('projetos')
          .update(projectData)
          .eq('id', editingProject.id)
          .select()

        if (error) {
          console.error('Erro Supabase:', error)
          throw error
        }
        console.log('Projeto atualizado:', data)
      } else {
        // Criar novo
        const codigo = await generateProjectCode()
        console.log('Código gerado:', codigo)
        
        const { data, error } = await supabase
          .from('projetos')
          .insert([{ ...projectData, codigo }])
          .select()

        if (error) {
          console.error('Erro Supabase:', error)
          throw error
        }
        console.log('Projeto criado:', data)
      }

      setShowModal(false)
      setEditingProject(null)
      // Recarregar dados
      const { data } = await supabase.from('projetos').select('*').eq('arquivado', false).order('codigo', { ascending: true })
      setProjects(data || [])
    } catch (err) {
      console.error('Erro ao guardar projeto:', err)
      alert('Erro ao guardar projeto: ' + (err.message || JSON.stringify(err)))
    }
  }

  // Eliminar projeto
  const handleDeleteProject = async (project) => {
    try {
      const { error } = await supabase.from('projetos').delete().eq('id', project.id)
      if (error) throw error
      
      setShowDeleteConfirm(null)
      setProjects(projects.filter(p => p.id !== project.id))
    } catch (err) {
      console.error('Erro ao eliminar projeto:', err)
      alert('Erro ao eliminar projeto. Verifique se não tem dados associados.')
    }
  }

  // Helpers
  const getStatusColor = (status) => {
    const colors = { on_track: 'var(--success)', at_risk: 'var(--warning)', blocked: 'var(--error)' }
    return colors[status] || 'var(--info)'
  }

  const getStatusLabel = (status) => {
    const labels = { on_track: 'No prazo', at_risk: 'Em risco', blocked: 'Bloqueado' }
    return labels[status] || 'N/D'
  }

  const getFaseColor = (fase) => {
    const colors = { 'Proposta': '#8A9EB8', 'Conceito': '#C9A882', 'Projeto': '#C3BAAF', 'Licenciamento': '#B0A599', 'Construção': '#7A9E7A', 'Fit-out': '#5F5C59', 'Entrega': '#4A4845' }
    return colors[fase] || '#C3BAAF'
  }

  const formatCurrency = (value) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-subtitle">{filteredProjects.length} projetos</p>
        </div>
        <button className="btn btn-primary" onClick={handleNewProject}>
          <Plus size={18} />
          Novo Projeto
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-lg">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
            <input type="text" placeholder="Pesquisar projetos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px' }} />
          </div>
          <select value={selectedFase} onChange={(e) => setSelectedFase(e.target.value)}
            style={{ padding: '12px 16px', border: '1px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', minWidth: '150px' }}>
            {fases.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--stone)', padding: '4px', borderRadius: '10px' }}>
            <button onClick={() => setViewMode('grid')} style={{ padding: '8px', background: viewMode === 'grid' ? 'var(--white)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px', background: viewMode === 'list' ? 'var(--white)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><List size={18} /></button>
          </div>
        </div>
      </div>

      {/* Lista/Grid de Projetos */}
      {filteredProjects.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <FolderKanban size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>Nenhum projeto encontrado</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleNewProject}>Criar Primeiro Projeto</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredProjects.map((p) => (
            <div key={p.id} className="card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => navigate(`/projetos/${p.codigo}`)}>
              <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === p.id ? null : p.id) }} className="btn btn-ghost btn-icon"><MoreVertical size={16} /></button>
                {activeMenu === p.id && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--white)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', minWidth: '150px', zIndex: 100, overflow: 'hidden' }}>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/projetos/${p.codigo}`) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}><Eye size={14} />Ver Detalhe</button>
                    <button onClick={(e) => { e.stopPropagation(); handleEditProject(p) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}><Edit size={14} />Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(p); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}><Trash2 size={14} />Eliminar</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--warning)' }}>{p.codigo}</span>
                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: `${getFaseColor(p.fase)}20`, color: getFaseColor(p.fase) }}>{p.fase}</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>{p.nome}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1, height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${p.progresso || 0}%`, height: '100%', background: getStatusColor(p.status), borderRadius: '3px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>{p.progresso || 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--brown-light)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} />{p.cidade || p.localizacao || '-'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(p.status) }} />{getStatusLabel(p.status)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Código</th><th>Nome</th><th>Fase</th><th>Status</th><th>Progresso</th><th></th></tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/projetos/${p.codigo}`)} style={{ cursor: 'pointer' }}>
                    <td><span style={{ fontWeight: 600, color: 'var(--warning)', fontFamily: 'monospace' }}>{p.codigo}</span></td>
                    <td style={{ fontWeight: 500 }}>{p.nome}</td>
                    <td><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: `${getFaseColor(p.fase)}20`, color: getFaseColor(p.fase) }}>{p.fase}</span></td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(p.status) }} />{getStatusLabel(p.status)}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${p.progresso || 0}%`, height: '100%', background: getStatusColor(p.status), borderRadius: '3px' }} /></div>
                        <span style={{ fontSize: '12px' }}>{p.progresso || 0}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === p.id ? null : p.id) }} className="btn btn-ghost btn-icon"><MoreVertical size={16} /></button>
                        {activeMenu === p.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--white)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', minWidth: '150px', zIndex: 100, overflow: 'hidden' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleEditProject(p) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}><Edit size={14} />Editar</button>
                            <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(p); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}><Trash2 size={14} />Eliminar</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Nome do Projeto *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Casa Silva" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Tipologia</label>
                  <select value={formData.tipologia} onChange={(e) => setFormData({...formData, tipologia: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    {tipologias.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Cliente</label>
                  <select value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    <option value="">Selecionar cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Fase</label>
                  <select value={formData.fase} onChange={(e) => setFormData({...formData, fase: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    {fases.filter(f => f !== 'Todas').map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    <option value="on_track">No Prazo</option>
                    <option value="at_risk">Em Risco</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Progresso (%)</label>
                <input type="number" min="0" max="100" value={formData.progresso} onChange={(e) => setFormData({...formData, progresso: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Localização</label>
                  <input type="text" value={formData.localizacao} onChange={(e) => setFormData({...formData, localizacao: e.target.value})} placeholder="Ex: Restelo, Lisboa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Cidade</label>
                  <input type="text" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} placeholder="Lisboa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Data Início</label>
                  <input type="date" value={formData.data_inicio} onChange={(e) => setFormData({...formData, data_inicio: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Previsão Conclusão</label>
                  <input type="date" value={formData.data_prevista_conclusao} onChange={(e) => setFormData({...formData, data_prevista_conclusao: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Orçamento (€)</label>
                <input type="number" value={formData.orcamento_atual} onChange={(e) => setFormData({...formData, orcamento_atual: e.target.value})} placeholder="50000" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Descrição</label>
                <textarea value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Descrição do projeto..." rows={3} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveProject} className="btn btn-primary" disabled={!formData.nome.trim()}>{editingProject ? 'Guardar Alterações' : 'Criar Projeto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Eliminar Projeto</h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '24px', lineHeight: 1.5 }}>
              Tem a certeza que deseja eliminar <strong>{showDeleteConfirm.nome}</strong> ({showDeleteConfirm.codigo})? Esta ação não pode ser revertida.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={() => handleDeleteProject(showDeleteConfirm)} style={{ padding: '10px 20px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {activeMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setActiveMenu(null)} />}
    </div>
  )
}
