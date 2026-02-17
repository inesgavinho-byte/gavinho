import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Sun, Cloud, CloudRain, Wind, CloudFog,
  Plus, Trash2, Edit2, Check, X, Upload, ChevronRight,
  Save, Send, Clock, Users, AlertTriangle, Camera, ArrowRight,
  Loader2
} from 'lucide-react'

const WEATHER_OPTIONS = [
  { id: 'sol', label: 'Sol', icon: Sun },
  { id: 'nublado', label: 'Nublado', icon: Cloud },
  { id: 'chuva', label: 'Chuva', icon: CloudRain },
  { id: 'vento', label: 'Vento', icon: Wind },
  { id: 'neblina', label: 'Neblina', icon: CloudFog },
]

const FUNCOES = [
  'Encarregado de Obra',
  'Diretor de Obra',
  'Engenheiro',
  'Técnico de Segurança',
  'Fiscal de Obra'
]

const SEVERIDADES = ['Baixa', 'Média', 'Alta']
const SEVERIDADES_NC = ['MENOR', 'MAIOR', 'CRÍTICA']

export default function DiarioObra() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dataParam = searchParams.get('data')

  // State principal
  const [obra, setObra] = useState(null)
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [diarioId, setDiarioId] = useState(null)

  // Form state
  const [selectedObra, setSelectedObra] = useState(id || '')
  const [data, setData] = useState(dataParam || new Date().toISOString().split('T')[0])
  const [funcao, setFuncao] = useState('Encarregado de Obra')

  // Secção 1: Condições Meteorológicas
  const [condicaoMeteo, setCondicaoMeteo] = useState('sol')
  const [temperatura, setTemperatura] = useState('')
  const [observacoesMeteo, setObservacoesMeteo] = useState('')

  // Secção 2: Trabalhadores
  const [trabalhadores, setTrabalhadores] = useState([])
  const [showAddTrabalhador, setShowAddTrabalhador] = useState(false)
  const [novoTrabalhador, setNovoTrabalhador] = useState({ nome: '', funcao: '', tipo: 'Equipa', estado: 'PRESENTE' })

  // Secção 3: Tarefas Executadas
  const [tarefas, setTarefas] = useState([])
  const [showAddTarefa, setShowAddTarefa] = useState(false)
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', descricao: '', percentagem: '0', concluida: false })

  // Secção 4: Ocorrências
  const [ocorrencias, setOcorrencias] = useState([])
  const [novaOcorrencia, setNovaOcorrencia] = useState({ severidade: 'Baixa', descricao: '' })

  // Secção 5: Não Conformidades
  const [naoConformidades, setNaoConformidades] = useState([])
  const [showAddNC, setShowAddNC] = useState(false)
  const [novaNC, setNovaNC] = useState({ severidade: 'MAIOR', descricao: '', acaoCorretiva: '' })
  const [editingNC, setEditingNC] = useState(null)

  // Secção 6: Fotos
  const [fotos, setFotos] = useState([])
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const fileInputRef = useRef(null)

  // Secção 7: Próximos Passos
  const [proximosPassos, setProximosPassos] = useState([])
  const [showAddPasso, setShowAddPasso] = useState(false)
  const [novoPasso, setNovoPasso] = useState('')

  // Carregar dados iniciais
  useEffect(() => {
    fetchObras()
  }, [])

  useEffect(() => {
    if (selectedObra) {
      fetchObraDetails()
      fetchExistingDiario()
    }
  }, [selectedObra, data])

  const fetchObras = async () => {
    const { data } = await supabase
      .from('obras')
      .select('id, codigo, nome')
      .order('codigo')
    if (data) setObras(data)
  }

  const fetchObraDetails = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('obras')
      .select('*')
      .eq('id', selectedObra)
      .single()
    if (data) setObra(data)
    setLoading(false)
  }

  const fetchExistingDiario = async () => {
    const { data: diario } = await supabase
      .from('obra_diario')
      .select('*')
      .eq('obra_id', selectedObra)
      .eq('data', data)
      .single()

    if (diario) {
      setDiarioId(diario.id)
      setFuncao(diario.funcao || 'Encarregado de Obra')
      setCondicaoMeteo(diario.condicoes_meteo?.toLowerCase() || 'sol')
      setTemperatura(diario.temperatura || '')
      setObservacoesMeteo(diario.observacoes_meteo || '')
      setTrabalhadores(diario.trabalhadores || [])
      setTarefas(diario.tarefas || [])
      setOcorrencias(diario.ocorrencias || [])
      setNaoConformidades(diario.nao_conformidades || [])
      setFotos(diario.fotos || [])
      setProximosPassos(diario.proximos_passos || [])
      setLastSaved(diario.updated_at ? new Date(diario.updated_at) : null)
    } else {
      resetForm()
    }
  }

  const resetForm = () => {
    setDiarioId(null)
    setCondicaoMeteo('sol')
    setTemperatura('')
    setObservacoesMeteo('')
    setTrabalhadores([])
    setTarefas([])
    setOcorrencias([])
    setNaoConformidades([])
    setFotos([])
    setProximosPassos([])
    setLastSaved(null)
  }

  // Calcular estatísticas de trabalhadores
  const trabPresentes = trabalhadores.filter(t => t.estado === 'PRESENTE').length
  const trabAusentes = trabalhadores.filter(t => t.estado === 'AUSENTE').length
  const trabSubempreiteiros = trabalhadores.filter(t => t.tipo === 'Subempreiteiro' && t.estado === 'PRESENTE').length

  // Handlers de Trabalhadores
  const handleAddTrabalhador = () => {
    if (!novoTrabalhador.nome || !novoTrabalhador.funcao) return
    setTrabalhadores([...trabalhadores, { ...novoTrabalhador, id: Date.now() }])
    setNovoTrabalhador({ nome: '', funcao: '', tipo: 'Equipa', estado: 'PRESENTE' })
    setShowAddTrabalhador(false)
  }

  const handleRemoveTrabalhador = (id) => {
    setTrabalhadores(trabalhadores.filter(t => t.id !== id))
  }

  const handleToggleTrabalhadorEstado = (id) => {
    setTrabalhadores(trabalhadores.map(t =>
      t.id === id ? { ...t, estado: t.estado === 'PRESENTE' ? 'AUSENTE' : 'PRESENTE' } : t
    ))
  }

  // Handlers de Tarefas
  const handleAddTarefa = () => {
    if (!novaTarefa.titulo) return
    setTarefas([...tarefas, { ...novaTarefa, id: Date.now() }])
    setNovaTarefa({ titulo: '', descricao: '', percentagem: '0', concluida: false })
    setShowAddTarefa(false)
  }

  const handleToggleTarefa = (id) => {
    setTarefas(tarefas.map(t =>
      t.id === id ? { ...t, concluida: !t.concluida } : t
    ))
  }

  const handleTarefaPercentagem = (id, percentagem) => {
    setTarefas(tarefas.map(t =>
      t.id === id ? { ...t, percentagem } : t
    ))
  }

  const handleRemoveTarefa = (id) => {
    setTarefas(tarefas.filter(t => t.id !== id))
  }

  // Handlers de Ocorrências
  const handleAddOcorrencia = () => {
    if (!novaOcorrencia.descricao) return
    setOcorrencias([...ocorrencias, { ...novaOcorrencia, id: Date.now() }])
    setNovaOcorrencia({ severidade: 'Baixa', descricao: '' })
  }

  const handleRemoveOcorrencia = (id) => {
    setOcorrencias(ocorrencias.filter(o => o.id !== id))
  }

  // Handlers de Não Conformidades
  const handleAddNC = () => {
    if (!novaNC.descricao) return
    if (editingNC) {
      setNaoConformidades(naoConformidades.map(nc =>
        nc.id === editingNC.id ? { ...novaNC, id: nc.id } : nc
      ))
      setEditingNC(null)
    } else {
      setNaoConformidades([...naoConformidades, { ...novaNC, id: Date.now() }])
    }
    setNovaNC({ severidade: 'MAIOR', descricao: '', acaoCorretiva: '' })
    setShowAddNC(false)
  }

  const handleEditNC = (nc) => {
    setNovaNC({ severidade: nc.severidade, descricao: nc.descricao, acaoCorretiva: nc.acaoCorretiva })
    setEditingNC(nc)
    setShowAddNC(true)
  }

  const handleRemoveNC = (id) => {
    setNaoConformidades(naoConformidades.filter(nc => nc.id !== id))
  }

  // Handlers de Fotos — upload para Supabase Storage (bucket: obra-fotos)
  const handleAddFoto = async (e) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > 10 * 1024 * 1024) return false
      return true
    })
    if (validFiles.length < files.length) {
      alert('Algumas imagens foram ignoradas (formato inválido ou > 10MB)')
    }
    setPhotoFiles(prev => [...prev, ...validFiles])
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotoPreviews(prev => [...prev, ev.target.result])
      }
      reader.readAsDataURL(file)
    })
    if (e.target) e.target.value = ''
  }

  const uploadPendingPhotos = async () => {
    const urls = []
    for (const file of photoFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `diario/${selectedObra}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const { error } = await supabase.storage
        .from('obra-fotos')
        .upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('obra-fotos')
        .getPublicUrl(fileName)
      urls.push(publicUrl)
    }
    return urls
  }

  const removeNewPhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleFotoDescricao = (id, descricao) => {
    setFotos(fotos.map(f => f.id === id ? { ...f, descricao } : f))
  }

  const handleRemoveFoto = (id) => {
    setFotos(fotos.filter(f => f.id !== id))
  }

  // Handlers de Próximos Passos
  const handleAddPasso = () => {
    if (!novoPasso) return
    setProximosPassos([...proximosPassos, { id: Date.now(), texto: novoPasso }])
    setNovoPasso('')
    setShowAddPasso(false)
  }

  const handleRemovePasso = (id) => {
    setProximosPassos(proximosPassos.filter(p => p.id !== id))
  }

  // Helper: build diario payload + upload pending photos
  const buildDiarioPayload = async (status) => {
    let allFotos = [...fotos]
    if (photoFiles.length > 0) {
      setUploadingPhotos(true)
      const newUrls = await uploadPendingPhotos()
      allFotos = [...allFotos, ...newUrls.map((url, i) => ({ id: Date.now() + i, url, descricao: '' }))]
      setPhotoFiles([])
      setPhotoPreviews([])
      setUploadingPhotos(false)
    }
    setFotos(allFotos)

    return {
      obra_id: selectedObra,
      data,
      funcao,
      condicoes_meteo: condicaoMeteo,
      temperatura: temperatura ? parseFloat(temperatura) : null,
      observacoes_meteo: observacoesMeteo,
      trabalhadores,
      trabalhadores_gavinho: trabalhadores.filter(t => t.tipo === 'Equipa' && t.estado === 'PRESENTE').length,
      trabalhadores_subempreiteiros: trabSubempreiteiros,
      tarefas,
      ocorrencias,
      nao_conformidades: naoConformidades,
      fotos: allFotos,
      proximos_passos: proximosPassos,
      status,
      updated_at: new Date().toISOString()
    }
  }

  // Guardar Rascunho
  const handleSaveRascunho = async () => {
    if (!selectedObra) return
    setSaving(true)
    try {
      const diarioData = await buildDiarioPayload('rascunho')
      if (diarioId) {
        const { error } = await supabase.from('obra_diario').update(diarioData).eq('id', diarioId)
        if (error) throw error
      } else {
        const { data: newDiario, error } = await supabase.from('obra_diario').insert([diarioData]).select().single()
        if (error) throw error
        if (newDiario) setDiarioId(newDiario.id)
      }
      setLastSaved(new Date())
    } catch (err) {
      console.error('Erro ao guardar rascunho:', err)
      alert('Erro ao guardar: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  // Submeter Registo
  const handleSubmit = async () => {
    if (!selectedObra) return
    setSaving(true)
    try {
      const diarioData = await buildDiarioPayload('submetido')
      if (diarioId) {
        const { error } = await supabase.from('obra_diario').update(diarioData).eq('id', diarioId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('obra_diario').insert([diarioData])
        if (error) throw error
      }
      navigate(`/obras/${selectedObra}`)
    } catch (err) {
      console.error('Erro ao submeter:', err)
      alert('Erro ao submeter: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  // Apagar Registo
  const handleDelete = async () => {
    if (!diarioId) return
    if (!window.confirm('Tem a certeza que deseja apagar este registo? Esta ação não pode ser revertida.')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('obra_diario').delete().eq('id', diarioId)
      if (error) throw error
      resetForm()
      setLastSaved(null)
    } catch (err) {
      console.error('Erro ao apagar:', err)
      alert('Erro ao apagar: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  if (loading && selectedObra) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="chat-spinner" style={{ width: 32, height: 32, border: '3px solid var(--stone)', borderTopColor: 'var(--blush)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ marginBottom: 8 }}>
        <Link to="/obras" style={{ color: 'var(--brown-light)', textDecoration: 'none' }}>Obras</Link>
        <span style={{ margin: '0 8px', color: 'var(--brown-light)' }}>›</span>
        {obra && (
          <>
            <Link to={`/obras/${obra.id}`} style={{ color: 'var(--brown-light)', textDecoration: 'none' }}>{obra.codigo}</Link>
            <span style={{ margin: '0 8px', color: 'var(--brown-light)' }}>›</span>
          </>
        )}
        <span style={{ color: 'var(--brown)' }}>Diário de Obra</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--brown)', marginBottom: 4 }}>Diário de Obra</h1>
        <p style={{ color: 'var(--brown-light)', fontSize: 14 }}>Registo diário de atividades, recursos e ocorrências</p>
      </div>

      {/* Meta Info Card */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8, display: 'block' }}>OBRA</label>
            <select
              value={selectedObra}
              onChange={(e) => setSelectedObra(e.target.value)}
              className="select"
              style={{ width: '100%' }}
            >
              <option value="">Selecionar obra...</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8, display: 'block' }}>DATA</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8, display: 'block' }}>FUNÇÃO</label>
            <select
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              className="select"
              style={{ width: '100%' }}
            >
              {FUNCOES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Secção 1: Condições Meteorológicas */}
      <SectionCard number={1} title="Condições Meteorológicas" subtitle="Selecione as condições observadas durante o dia">
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {WEATHER_OPTIONS.map(w => {
            const Icon = w.icon
            const isSelected = condicaoMeteo === w.id
            return (
              <button
                key={w.id}
                onClick={() => setCondicaoMeteo(w.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '16px 24px',
                  background: isSelected ? 'var(--cream)' : 'var(--white)',
                  border: isSelected ? '2px solid var(--olive-gray)' : '2px solid var(--stone)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={28} strokeWidth={1.5} color={isSelected ? 'var(--olive-gray)' : 'var(--brown-light)'} />
                <span style={{ fontSize: 13, color: isSelected ? 'var(--brown)' : 'var(--brown-light)' }}>{w.label}</span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8, display: 'block' }}>TEMPERATURA (°C)</label>
            <input
              type="number"
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
              placeholder="Ex: 14"
              className="input"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8, display: 'block' }}>OBSERVAÇÕES</label>
            <input
              type="text"
              value={observacoesMeteo}
              onChange={(e) => setObservacoesMeteo(e.target.value)}
              placeholder="Ex: Manhã com nevoeiro, tarde limpa"
              className="input"
            />
          </div>
        </div>
      </SectionCard>

      {/* Secção 2: Trabalhadores */}
      <SectionCard number={2} title="Trabalhadores / Subempreiteiros Presentes" subtitle="Registo de presenças da equipa em obra">
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--cream)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brown)' }}>{trabPresentes}</div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)' }}>PRESENTES</div>
          </div>
          <div style={{ background: 'var(--cream)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brown)' }}>{trabAusentes}</div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)' }}>AUSENTES</div>
          </div>
          <div style={{ background: 'var(--cream)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brown)' }}>{trabSubempreiteiros}</div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)' }}>SUBEMPREITEIROS</div>
          </div>
        </div>

        {/* Table */}
        {trabalhadores.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 60px', gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--stone)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)' }}>
              <span>NOME</span>
              <span>FUNÇÃO</span>
              <span>TIPO</span>
              <span>ESTADO</span>
              <span></span>
            </div>
            {trabalhadores.map(t => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 60px', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--stone)', alignItems: 'center' }}>
                <span style={{ color: 'var(--brown)' }}>{t.nome}</span>
                <span style={{ color: 'var(--brown-light)' }}>{t.funcao}</span>
                <span style={{ color: 'var(--brown-light)' }}>{t.tipo}</span>
                <span>
                  <button
                    onClick={() => handleToggleTrabalhadorEstado(t.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: t.estado === 'PRESENTE' ? 'var(--success-bg)' : 'var(--error-bg)',
                      color: t.estado === 'PRESENTE' ? 'var(--success)' : 'var(--error)'
                    }}
                  >
                    {t.estado}
                  </button>
                </span>
                <button onClick={() => handleRemoveTrabalhador(t.id)} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Trabalhador */}
        {showAddTrabalhador ? (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr auto', gap: 12, alignItems: 'end', padding: 16, background: 'var(--cream)', borderRadius: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>Nome</label>
              <input
                type="text"
                value={novoTrabalhador.nome}
                onChange={(e) => setNovoTrabalhador({...novoTrabalhador, nome: e.target.value})}
                className="input"
                placeholder="Nome do trabalhador"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>Função</label>
              <input
                type="text"
                value={novoTrabalhador.funcao}
                onChange={(e) => setNovoTrabalhador({...novoTrabalhador, funcao: e.target.value})}
                className="input"
                placeholder="Ex: Pedreiro"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>Tipo</label>
              <select
                value={novoTrabalhador.tipo}
                onChange={(e) => setNovoTrabalhador({...novoTrabalhador, tipo: e.target.value})}
                className="select"
              >
                <option value="Equipa">Equipa</option>
                <option value="Subempreiteiro">Subempreiteiro</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>Estado</label>
              <select
                value={novoTrabalhador.estado}
                onChange={(e) => setNovoTrabalhador({...novoTrabalhador, estado: e.target.value})}
                className="select"
              >
                <option value="PRESENTE">Presente</option>
                <option value="AUSENTE">Ausente</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddTrabalhador} className="btn btn-primary" style={{ padding: '10px 16px' }}>
                <Check size={16} />
              </button>
              <button onClick={() => setShowAddTrabalhador(false)} className="btn btn-ghost" style={{ padding: '10px 16px' }}>
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddTrabalhador(true)} className="btn btn-outline" style={{ gap: 8 }}>
            <Plus size={16} /> Adicionar Trabalhador
          </button>
        )}
      </SectionCard>

      {/* Secção 3: Tarefas Executadas */}
      <SectionCard number={3} title="Tarefas Executadas" subtitle="Trabalhos realizados durante o dia">
        {tarefas.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 0', borderBottom: '1px solid var(--stone)' }}>
            <button
              onClick={() => handleToggleTarefa(t.id)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: t.concluida ? 'none' : '2px solid var(--stone-dark)',
                background: t.concluida ? 'var(--olive-gray)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2
              }}
            >
              {t.concluida && <Check size={14} color="white" />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--brown)', marginBottom: 4 }}>{t.titulo}</div>
              {t.descricao && <div style={{ fontSize: 13, color: 'var(--brown-light)' }}>{t.descricao}</div>}
            </div>
            <select
              value={t.percentagem}
              onChange={(e) => handleTarefaPercentagem(t.id, e.target.value)}
              className="select"
              style={{ width: 100, padding: '8px 12px' }}
            >
              <option value="0">0%</option>
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
            </select>
            <button onClick={() => handleRemoveTarefa(t.id)} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {showAddTarefa ? (
          <div style={{ padding: 16, background: 'var(--cream)', borderRadius: 12, marginTop: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>Título da Tarefa</label>
              <input
                type="text"
                value={novaTarefa.titulo}
                onChange={(e) => setNovaTarefa({...novaTarefa, titulo: e.target.value})}
                className="input"
                placeholder="Ex: Demolição de parede divisória — Suite"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>Descrição (opcional)</label>
              <input
                type="text"
                value={novaTarefa.descricao}
                onChange={(e) => setNovaTarefa({...novaTarefa, descricao: e.target.value})}
                className="input"
                placeholder="Ex: Remoção completa da parede entre quarto e WC conforme projeto"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddTarefa} className="btn btn-primary">Adicionar</button>
              <button onClick={() => setShowAddTarefa(false)} className="btn btn-ghost">Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddTarefa(true)} className="btn btn-outline" style={{ gap: 8, marginTop: 16 }}>
            <Plus size={16} /> Adicionar Tarefa
          </button>
        )}
      </SectionCard>

      {/* Secção 4: Ocorrências / Incidentes */}
      <SectionCard number={4} title="Ocorrências / Incidentes" subtitle="Registe situações relevantes ou problemas identificados">
        {/* Severidade Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--brown)', marginBottom: 12, display: 'block' }}>Severidade</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {SEVERIDADES.map(s => (
              <button
                key={s}
                onClick={() => setNovaOcorrencia({...novaOcorrencia, severidade: s})}
                style={{
                  padding: '14px 20px',
                  borderRadius: 8,
                  border: novaOcorrencia.severidade === s ? '2px solid var(--olive-gray)' : '2px solid var(--stone)',
                  background: novaOcorrencia.severidade === s ? 'var(--cream)' : 'var(--white)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--brown)'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--brown)', marginBottom: 8, display: 'block' }}>Descrição da Ocorrência</label>
          <textarea
            value={novaOcorrencia.descricao}
            onChange={(e) => setNovaOcorrencia({...novaOcorrencia, descricao: e.target.value})}
            className="textarea"
            rows={3}
            placeholder="Descreva a ocorrência ou incidente..."
          />
        </div>

        {novaOcorrencia.descricao && (
          <button onClick={handleAddOcorrencia} className="btn btn-outline" style={{ gap: 8, marginBottom: 16 }}>
            <Plus size={16} /> Adicionar Outra Ocorrência
          </button>
        )}

        {/* Lista de Ocorrências */}
        {ocorrencias.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brown)', marginBottom: 12 }}>Ocorrências Registadas</div>
            {ocorrencias.map(o => (
              <div key={o.id} style={{ display: 'flex', gap: 12, padding: 16, background: 'var(--cream)', borderRadius: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: o.severidade === 'Alta' ? 'var(--error-bg)' : o.severidade === 'Média' ? 'var(--warning-bg)' : 'var(--success-bg)',
                  color: o.severidade === 'Alta' ? 'var(--error)' : o.severidade === 'Média' ? 'var(--warning)' : 'var(--success)'
                }}>
                  {o.severidade}
                </span>
                <p style={{ flex: 1, margin: 0, fontSize: 14, color: 'var(--brown)' }}>{o.descricao}</p>
                <button onClick={() => handleRemoveOcorrencia(o.id)} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Secção 5: Não Conformidades */}
      <SectionCard number={5} title="Não Conformidades" subtitle="Desvios ao projeto, especificações ou normas">
        {/* Lista de NC */}
        {naoConformidades.map(nc => (
          <div key={nc.id} style={{ padding: 20, background: 'var(--cream)', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: nc.severidade === 'CRÍTICA' ? 'var(--error)' : nc.severidade === 'MAIOR' ? 'var(--error-bg)' : 'var(--warning-bg)',
                color: nc.severidade === 'CRÍTICA' ? 'white' : nc.severidade === 'MAIOR' ? 'var(--error)' : 'var(--warning)'
              }}>
                {nc.severidade}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleEditNC(nc)} className="btn btn-outline btn-sm">Editar</button>
                <button onClick={() => handleRemoveNC(nc.id)} className="btn btn-outline btn-sm">Remover</button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>Descrição</label>
              <p style={{ margin: 0, color: 'var(--brown)', fontSize: 14, lineHeight: 1.5 }}>{nc.descricao}</p>
            </div>
            {nc.acaoCorretiva && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>Ação Corretiva Proposta</label>
                <p style={{ margin: 0, color: 'var(--brown)', fontSize: 14, lineHeight: 1.5 }}>{nc.acaoCorretiva}</p>
              </div>
            )}
          </div>
        ))}

        {/* Add NC Form */}
        {showAddNC ? (
          <div style={{ padding: 20, background: 'var(--cream)', borderRadius: 12 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--brown)', marginBottom: 8, display: 'block' }}>Severidade</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {SEVERIDADES_NC.map(s => (
                  <button
                    key={s}
                    onClick={() => setNovaNC({...novaNC, severidade: s})}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: novaNC.severidade === s ? 'none' : '2px solid var(--stone)',
                      background: novaNC.severidade === s ? (s === 'CRÍTICA' ? 'var(--error)' : s === 'MAIOR' ? 'var(--error-bg)' : 'var(--warning-bg)') : 'var(--white)',
                      color: novaNC.severidade === s ? (s === 'CRÍTICA' ? 'white' : s === 'MAIOR' ? 'var(--error)' : 'var(--warning)') : 'var(--brown)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8, display: 'block' }}>Descrição</label>
              <textarea
                value={novaNC.descricao}
                onChange={(e) => setNovaNC({...novaNC, descricao: e.target.value})}
                className="textarea"
                rows={3}
                placeholder="Descreva a não conformidade identificada..."
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 8, display: 'block' }}>Ação Corretiva Proposta</label>
              <textarea
                value={novaNC.acaoCorretiva}
                onChange={(e) => setNovaNC({...novaNC, acaoCorretiva: e.target.value})}
                className="textarea"
                rows={2}
                placeholder="Proponha uma ação corretiva..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddNC} className="btn btn-primary">{editingNC ? 'Guardar' : 'Adicionar'}</button>
              <button onClick={() => { setShowAddNC(false); setEditingNC(null); setNovaNC({ severidade: 'MAIOR', descricao: '', acaoCorretiva: '' }) }} className="btn btn-ghost">Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddNC(true)} className="btn btn-outline" style={{ gap: 8 }}>
            <Plus size={16} /> Adicionar Não Conformidade
          </button>
        )}
      </SectionCard>

      {/* Secção 6: Registo Fotográfico */}
      <SectionCard number={6} title="Registo Fotográfico" subtitle="Fotografias dos trabalhos e situações relevantes">
        {uploadingPhotos && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--cream)', borderRadius: 8, marginBottom: 16 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--brown)' }}>A carregar fotos...</span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {/* Existing uploaded photos */}
          {fotos.map(f => (
            <div key={f.id || f.url} style={{ position: 'relative' }}>
              <div style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
                <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => handleRemoveFoto(f.id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 4, display: 'block' }}>DESCRIÇÃO</label>
                <textarea
                  value={f.descricao || ''}
                  onChange={(e) => handleFotoDescricao(f.id, e.target.value)}
                  className="textarea"
                  rows={3}
                  placeholder="Descreva a foto..."
                  style={{ fontSize: 13 }}
                />
              </div>
            </div>
          ))}

          {/* Pending new photo previews (not yet uploaded) */}
          {photoPreviews.map((preview, idx) => (
            <div key={`new-${idx}`} style={{ position: 'relative' }}>
              <div style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', marginBottom: 8, border: '2px solid var(--olive-gray)' }}>
                <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => removeNewPhoto(idx)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  fontSize: 11,
                  textAlign: 'center',
                  padding: '4px 0'
                }}>
                  Pendente
                </div>
              </div>
            </div>
          ))}

          {/* Upload Area */}
          <label style={{
            aspectRatio: '4/3',
            border: '2px dashed var(--stone-dark)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            background: 'var(--white)',
            transition: 'all 0.2s ease'
          }}>
            <input type="file" accept="image/*" multiple onChange={handleAddFoto} style={{ display: 'none' }} ref={fileInputRef} />
            <Upload size={24} color="var(--brown-light)" />
            <span style={{ fontSize: 13, color: 'var(--brown-light)' }}>Adicionar foto</span>
          </label>
        </div>
      </SectionCard>

      {/* Secção 7: Próximos Passos Sugeridos */}
      <SectionCard number={7} title="Próximos Passos Sugeridos" subtitle="Recomendações para o dia seguinte">
        {proximosPassos.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--stone)' }}>
            <ArrowRight size={16} color="var(--olive-gray)" />
            <span style={{ flex: 1, color: 'var(--brown)' }}>{p.texto}</span>
            <button onClick={() => handleRemovePasso(p.id)} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {showAddPasso ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={novoPasso}
                onChange={(e) => setNovoPasso(e.target.value)}
                className="input"
                placeholder="Descreva o próximo passo..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddPasso()}
              />
            </div>
            <button onClick={handleAddPasso} className="btn btn-primary">Adicionar</button>
            <button onClick={() => setShowAddPasso(false)} className="btn btn-ghost">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setShowAddPasso(true)} className="btn btn-outline" style={{ gap: 8, marginTop: 16 }}>
            <Plus size={16} /> Adicionar Passo
          </button>
        )}
      </SectionCard>

      {/* Footer */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: 'var(--sandy-beach)',
        padding: '16px 0',
        marginTop: 32,
        borderTop: '1px solid var(--stone)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--brown-light)' }}>
            Última gravação: {lastSaved ? (
              <strong style={{ color: 'var(--brown)' }}>Rascunho às {lastSaved.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</strong>
            ) : (
              <span>Não guardado</span>
            )}
          </div>
          {diarioId && (
            <button onClick={handleDelete} disabled={saving} className="btn btn-ghost" style={{ gap: 6, color: 'var(--error)', fontSize: 13 }}>
              <Trash2 size={14} /> Apagar
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleSaveRascunho} disabled={saving || !selectedObra} className="btn btn-outline" style={{ gap: 8 }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {saving ? 'A guardar...' : 'Guardar Rascunho'}
          </button>
          <button onClick={handleSubmit} disabled={saving || !selectedObra} className="btn btn-primary" style={{ gap: 8, background: 'var(--olive-gray)' }}>
            <Send size={16} /> Submeter Registo
          </button>
        </div>
      </div>
    </div>
  )
}

// Section Card Component
function SectionCard({ number, title, subtitle, children }) {
  return (
    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--olive-gray)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          flexShrink: 0
        }}>
          {number}
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--brown)', marginBottom: 2 }}>{title}</h3>
          <p style={{ fontSize: 13, color: 'var(--brown-light)', margin: 0 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--stone)', paddingTop: 20 }}>
        {children}
      </div>
    </div>
  )
}
