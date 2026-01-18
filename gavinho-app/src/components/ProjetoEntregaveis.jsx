import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Plus, Upload, FileText, ChevronRight, ChevronDown, Edit2, Trash2, Save, X,
  Calendar, User, CheckCircle, Clock, AlertCircle, Download, FileSpreadsheet,
  Loader2, MoreVertical, Eye
} from 'lucide-react'
import * as XLSX from 'xlsx'

const statusConfig = {
  'pendente': { label: 'Pendente', color: 'var(--brown-light)', bg: 'var(--stone)' },
  'em_progresso': { label: 'Em Progresso', color: 'var(--info)', bg: 'rgba(138, 158, 184, 0.15)' },
  'concluido': { label: 'Concluído', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  'aprovado': { label: 'Aprovado', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.15)' }
}

export default function ProjetoEntregaveis({ projeto }) {
  const [entregaveis, setEntregaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  // Estado para edição inline
  const [editingCell, setEditingCell] = useState(null) // { id: itemId, field: 'status' | 'executante' }

  // Lista de utilizadores (Recursos Humanos)
  const [utilizadores, setUtilizadores] = useState([])

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    escala: '',
    data_inicio: '',
    data_conclusao: '',
    status: 'pendente',
    executante: '',
    notas: ''
  })

  // Estado para controlar visualização por fase
  const [viewMode, setViewMode] = useState('fase') // 'fase' ou 'codigo'
  const [expandedFases, setExpandedFases] = useState({})

  useEffect(() => {
    if (projeto?.id) {
      loadEntregaveis()
      loadUtilizadores()
    }
  }, [projeto?.id])

  // Carregar utilizadores (Recursos Humanos)
  const loadUtilizadores = async () => {
    try {
      const { data, error } = await supabase
        .from('utilizadores')
        .select('id, nome, cargo, departamento')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setUtilizadores(data || [])
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err)
    }
  }

  const loadEntregaveis = async (resetExpanded = true) => {
    try {
      const { data, error } = await supabase
        .from('projeto_entregaveis')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('codigo', { ascending: true })

      if (error) throw error
      setEntregaveis(data || [])
      
      // Só resetar expansão na primeira carga
      if (resetExpanded) {
        setExpandedGroups({})
        setExpandedFases({})
      }
    } catch (err) {
      console.error('Erro ao carregar entregáveis:', err)
    } finally {
      setLoading(false)
    }
  }

  // Expandir/Colapsar tudo
  const expandAll = () => {
    const groups = {}
    const fases = {}
    entregaveis.forEach(item => {
      // Por código
      const parts = (item.codigo || '').split('.')
      if (parts.length > 1) {
        groups[parts[0]] = true
        if (parts.length > 2) {
          groups[`${parts[0]}.${parts[1]}`] = true
        }
      }
      // Por fase
      if (item.fase) {
        fases[item.fase] = true
      }
      if (item.categoria) {
        fases[`${item.fase}__${item.categoria}`] = true
      }
    })
    setExpandedGroups(groups)
    setExpandedFases(fases)
  }

  const collapseAll = () => {
    setExpandedGroups({})
    setExpandedFases({})
  }

  // Toggle fase
  const toggleFase = (key) => {
    setExpandedFases(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    if (!formData.codigo.trim() || !formData.nome.trim()) {
      alert('Código e Nome são obrigatórios')
      return
    }

    setSaving(true)
    try {
      const itemData = {
        projeto_id: projeto.id,
        codigo: formData.codigo.trim(),
        nome: formData.nome.trim(),
        escala: formData.escala || null,
        data_inicio: formData.data_inicio || null,
        data_conclusao: formData.data_conclusao || null,
        status: formData.status,
        executante: formData.executante || null,
        notas: formData.notas || null
      }

      if (editingItem) {
        const { error } = await supabase
          .from('projeto_entregaveis')
          .update(itemData)
          .eq('id', editingItem.id)
        if (error) throw error

        // Se adicionou executante e tem datas (e não tinha antes), criar tarefa
        if (itemData.executante && itemData.data_inicio && !editingItem.executante) {
          await criarTarefaEntregavel(itemData, itemData.executante)
        }
      } else {
        const { error } = await supabase
          .from('projeto_entregaveis')
          .insert([itemData])
        if (error) throw error

        // Se criou com executante e datas, criar tarefa
        if (itemData.executante && itemData.data_inicio) {
          await criarTarefaEntregavel(itemData, itemData.executante)
        }
      }

      setShowModal(false)
      setEditingItem(null)
      resetForm()
      loadEntregaveis(false) // Preservar expansão
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Eliminar "${item.codigo} - ${item.nome}"?`)) return

    try {
      const { error } = await supabase
        .from('projeto_entregaveis')
        .delete()
        .eq('id', item.id)
      if (error) throw error
      loadEntregaveis(false) // Preservar expansão
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert('Erro ao eliminar')
    }
  }

  // Atualização inline de um campo específico
  const handleInlineUpdate = async (itemId, field, value) => {
    try {
      const { error } = await supabase
        .from('projeto_entregaveis')
        .update({ [field]: value })
        .eq('id', itemId)

      if (error) throw error

      // Buscar item atualizado para verificar se deve criar tarefa
      const item = entregaveis.find(e => e.id === itemId)
      const updatedItem = { ...item, [field]: value }

      // Se atribuiu executante e tem datas, criar tarefa
      if (field === 'executante' && value && updatedItem.data_inicio) {
        await criarTarefaEntregavel(updatedItem, value)
      }

      // Atualizar estado local imediatamente
      setEntregaveis(prev => prev.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      ))
      setEditingCell(null)
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      alert('Erro ao atualizar')
    }
  }

  // Criar tarefa automaticamente ao atribuir executante com datas
  const criarTarefaEntregavel = async (entregavel, executanteNome) => {
    try {
      // Encontrar o utilizador pelo nome
      const utilizador = utilizadores.find(u => u.nome === executanteNome)

      const { error } = await supabase.from('tarefas').insert([{
        titulo: `[ENTREGÁVEL] ${entregavel.codigo} - ${entregavel.nome}`,
        descricao: `Entregável do projeto: ${entregavel.nome}\nEscala: ${entregavel.escala || '-'}\nFase: ${entregavel.fase || '-'}`,
        projeto_id: projeto.id,
        responsavel_id: utilizador?.id || null,
        responsavel_nome: executanteNome,
        status: 'pendente',
        prioridade: 'media',
        data_limite: entregavel.data_conclusao || entregavel.data_inicio,
        categoria: 'entregavel'
      }])

      if (error) throw error
      console.log('Tarefa criada para entregável:', entregavel.codigo)
    } catch (err) {
      console.error('Erro ao criar tarefa:', err)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      codigo: item.codigo,
      nome: item.nome,
      escala: item.escala || '',
      data_inicio: item.data_inicio || '',
      data_conclusao: item.data_conclusao || '',
      status: item.status || 'pendente',
      executante: item.executante || '',
      notas: item.notas || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      escala: '',
      data_inicio: '',
      data_conclusao: '',
      status: 'pendente',
      executante: '',
      notas: ''
    })
  }

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      // Encontrar header
      let headerRow = -1
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i]
        if (row && row.some(cell => 
          cell && typeof cell === 'string' && 
          (cell.toUpperCase().includes('COD') || cell.toUpperCase().includes('DESENHO'))
        )) {
          headerRow = i
          break
        }
      }

      if (headerRow === -1) {
        alert('Não foi possível encontrar o cabeçalho da tabela')
        return
      }

      const headers = rows[headerRow].map(h => (h || '').toString().toUpperCase().trim())
      const codigoIdx = headers.findIndex(h => h.includes('COD'))
      const nomeIdx = headers.findIndex(h => h.includes('DESENHO') && !h.includes('ESCALA'))
      const escalaIdx = headers.findIndex(h => h.includes('ESCALA'))
      const dataInicioIdx = headers.findIndex(h => h.includes('INÀCIO') || h.includes('INICIO'))
      const dataConclusaoIdx = headers.findIndex(h => h.includes('CONCLUS'))
      const estadoIdx = headers.findIndex(h => h.includes('ESTADO') || h.includes('STATUS'))
      const executanteIdx = headers.findIndex(h => h.includes('EXECUTANTE') || h.includes('PESSOA'))

      if (codigoIdx === -1 || nomeIdx === -1) {
        alert('Colunas COD. DESENHO e DESENHO são obrigatórias')
        return
      }

      const items = []
      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row[codigoIdx] || !row[nomeIdx]) continue

        const codigo = row[codigoIdx]?.toString().trim()
        const nome = row[nomeIdx]?.toString().trim()
        if (!codigo || !nome) continue

        items.push({
          projeto_id: projeto.id,
          codigo,
          nome,
          escala: escalaIdx >= 0 ? row[escalaIdx]?.toString().trim() || null : null,
          data_inicio: dataInicioIdx >= 0 ? parseExcelDate(row[dataInicioIdx]) : null,
          data_conclusao: dataConclusaoIdx >= 0 ? parseExcelDate(row[dataConclusaoIdx]) : null,
          status: estadoIdx >= 0 ? parseStatus(row[estadoIdx]) : 'pendente',
          executante: executanteIdx >= 0 ? row[executanteIdx]?.toString().trim() || null : null
        })
      }

      if (items.length === 0) {
        alert('Nenhum item válido encontrado')
        return
      }

      // Inserir em batch
      const { error } = await supabase
        .from('projeto_entregaveis')
        .upsert(items, { onConflict: 'projeto_id,codigo' })

      if (error) throw error

      alert(`âœ“ Importados ${items.length} entregáveis`)
      loadEntregaveis()
    } catch (err) {
      console.error('Erro ao importar:', err)
      alert('Erro ao importar: ' + err.message)
    }

    e.target.value = ''
  }

  const parseExcelDate = (value) => {
    if (!value) return null
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000)
      return date.toISOString().split('T')[0]
    }
    if (typeof value === 'string') {
      if (value.toLowerCase().includes('data')) return null
      const match = value.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
      if (match) {
        const [, d, m, y] = match
        const year = y.length === 2 ? `20${y}` : y
        return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
      // Formato "8 de jul. de 2025"
      const ptMatch = value.match(/(\d{1,2})\s+de\s+(\w+)\.?\s+de\s+(\d{4})/)
      if (ptMatch) {
        const [, d, monthStr, y] = ptMatch
        const months = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', 
                        jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' }
        const m = months[monthStr.toLowerCase().substring(0, 3)]
        if (m) return `${y}-${m}-${d.padStart(2, '0')}`
      }
    }
    return null
  }

  const parseStatus = (value) => {
    if (!value) return 'pendente'
    const s = value.toString().toLowerCase()
    if (s.includes('conclu') || s.includes('done') || s.includes('feito')) return 'concluido'
    if (s.includes('progres') || s.includes('andamento') || s.includes('curso')) return 'em_progresso'
    if (s.includes('aprov')) return 'aprovado'
    return 'pendente'
  }

  const toggleGroup = (codigo) => {
    setExpandedGroups(prev => ({ ...prev, [codigo]: !prev[codigo] }))
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  // Organizar em hierarquia
  const organizeHierarchy = () => {
    const grouped = {}
    entregaveis.forEach(item => {
      const parts = item.codigo.split('.')
      const level = parts.length
      
      if (level === 1) {
        if (!grouped[item.codigo]) grouped[item.codigo] = { item, children: {} }
        else grouped[item.codigo].item = item
      } else if (level === 2) {
        const parent = parts[0]
        if (!grouped[parent]) grouped[parent] = { item: null, children: {} }
        if (!grouped[parent].children[item.codigo]) {
          grouped[parent].children[item.codigo] = { item, children: [] }
        } else {
          grouped[parent].children[item.codigo].item = item
        }
      } else if (level >= 3) {
        const parent = parts[0]
        const subParent = `${parts[0]}.${parts[1]}`
        if (!grouped[parent]) grouped[parent] = { item: null, children: {} }
        if (!grouped[parent].children[subParent]) {
          grouped[parent].children[subParent] = { item: null, children: [] }
        }
        grouped[parent].children[subParent].children.push(item)
      }
    })
    return grouped
  }

  const hierarchy = organizeHierarchy()

  // Calcular estatísticas
  const stats = {
    total: entregaveis.length,
    pendentes: entregaveis.filter(e => e.status === 'pendente').length,
    emProgresso: entregaveis.filter(e => e.status === 'em_progresso').length,
    concluidos: entregaveis.filter(e => e.status === 'concluido' || e.status === 'aprovado').length
  }
  const progressPercent = stats.total > 0 ? Math.round((stats.concluidos / stats.total) * 100) : 0

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header com Stats */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Lista de Entregáveis</h3>
            <p style={{ fontSize: '12px', color: 'var(--brown-light)', margin: '4px 0 0' }}>
              {stats.total} entregáveis  –  {progressPercent}% concluído
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-outline"
              style={{ fontSize: '12px', padding: '8px 12px' }}
            >
              <FileSpreadsheet size={14} /> Importar Excel
            </button>
            <button 
              onClick={() => { resetForm(); setEditingItem(null); setShowModal(true) }}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '8px 12px' }}
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '4px', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--stone)' }}>
          <div style={{ width: `${(stats.concluidos / Math.max(stats.total, 1)) * 100}%`, background: 'var(--success)', transition: 'width 0.3s' }} />
          <div style={{ width: `${(stats.emProgresso / Math.max(stats.total, 1)) * 100}%`, background: 'var(--info)', transition: 'width 0.3s' }} />
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--stone)' }} />
            Pendentes: {stats.pendentes}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--info)' }} />
            Em Progresso: {stats.emProgresso}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }} />
            Concluídos: {stats.concluidos}
          </span>
        </div>

        {/* Controlos de Visualização */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--stone)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('fase')}
              className={viewMode === 'fase' ? 'btn btn-secondary' : 'btn btn-outline'}
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              Por Fase
            </button>
            <button
              onClick={() => setViewMode('codigo')}
              className={viewMode === 'codigo' ? 'btn btn-secondary' : 'btn btn-outline'}
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              Por Código
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={expandAll}
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              <ChevronDown size={12} /> Expandir Tudo
            </button>
            <button
              onClick={collapseAll}
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              <ChevronRight size={12} /> Colapsar Tudo
            </button>
          </div>
        </div>
      </div>

      {/* Lista por Fases */}
      {entregaveis.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <FileText size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Sem entregáveis definidos</p>
          <p style={{ fontSize: '12px', margin: '8px 0 0' }}>Importe um Excel ou adicione manualmente</p>
        </div>
      ) : viewMode === 'fase' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Agrupar por Fase */}
          {(() => {
            const fases = {}
            entregaveis.forEach(item => {
              const faseKey = item.fase || 'Sem Fase'
              if (!fases[faseKey]) fases[faseKey] = {}
              const catKey = item.categoria || 'Geral'
              if (!fases[faseKey][catKey]) fases[faseKey][catKey] = []
              fases[faseKey][catKey].push(item)
            })
            
            return Object.entries(fases).map(([faseNome, categorias]) => {
              const faseItems = Object.values(categorias).flat()
              const faseConcluidos = faseItems.filter(i => i.status === 'concluido' || i.status === 'aprovado').length
              const fasePercent = Math.round((faseConcluidos / faseItems.length) * 100)
              
              return (
                <div key={faseNome} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Header da Fase */}
                  <div 
                    onClick={() => toggleFase(faseNome)}
                    style={{ 
                      padding: '16px 20px', 
                      background: 'linear-gradient(135deg, var(--blush-dark) 0%, var(--warning) 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {expandedFases[faseNome] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{faseNome}</h4>
                        <span style={{ fontSize: '11px', opacity: 0.9 }}>
                          {faseItems.length} entregáveis  –  {faseConcluidos} concluídos
                        </span>
                      </div>
                    </div>
                    <div style={{ 
                      background: 'rgba(255,255,255,0.2)', 
                      padding: '6px 12px', 
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 600
                    }}>
                      {fasePercent}%
                    </div>
                  </div>
                  
                  {/* Conteúdo da Fase (colapsável) */}
                  {expandedFases[faseNome] && (
                    <div style={{ padding: '12px' }}>
                      {Object.entries(categorias).map(([catNome, items]) => (
                        <div key={catNome} style={{ marginBottom: '12px' }}>
                          {/* Header da Categoria */}
                          <div 
                            onClick={() => toggleFase(`${faseNome}__${catNome}`)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              padding: '10px 12px',
                              background: 'var(--cream)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              marginBottom: expandedFases[`${faseNome}__${catNome}`] ? '8px' : 0
                            }}
                          >
                            {expandedFases[`${faseNome}__${catNome}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span style={{ fontWeight: 600, fontSize: '13px', flex: 1 }}>{catNome}</span>
                            <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                              {items.length} itens  –  {items.filter(i => i.status === 'concluido' || i.status === 'aprovado').length} âœ“
                            </span>
                          </div>
                          
                          {/* Lista de Items */}
                          {expandedFases[`${faseNome}__${catNome}`] && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px' }}>
                              {/* Cabeçalho das colunas */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '80px 1fr 70px 110px 110px 80px 80px 60px',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                fontSize: '10px',
                                fontWeight: 600,
                                color: 'var(--brown-light)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                <span>Código</span>
                                <span>Descrição</span>
                                <span style={{ textAlign: 'center' }}>Escala</span>
                                <span style={{ textAlign: 'center' }}>Estado</span>
                                <span style={{ textAlign: 'center' }}>Executante</span>
                                <span style={{ textAlign: 'center' }}>Início</span>
                                <span style={{ textAlign: 'center' }}>Conclusão</span>
                                <span></span>
                              </div>
                              {items.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true })).map(item => (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '80px 1fr 70px 110px 110px 80px 80px 60px',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 12px',
                                    background: 'var(--white)',
                                    border: '1px solid var(--stone)',
                                    borderRadius: '6px',
                                    fontSize: '13px'
                                  }}
                                >
                                  {/* Código */}
                                  <span style={{ fontWeight: 500, fontSize: '11px', color: 'var(--brown-light)' }}>
                                    {item.codigo}
                                  </span>
                                  {/* Descrição */}
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</span>
                                  {/* Escala */}
                                  <span style={{ fontSize: '11px', color: 'var(--brown-light)', background: item.escala ? 'var(--stone)' : 'transparent', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                                    {item.escala || '-'}
                                  </span>
                                  {/* Estado - Edição Inline */}
                                  {editingCell?.id === item.id && editingCell?.field === 'status' ? (
                                    <select
                                      autoFocus
                                      value={item.status}
                                      onChange={(e) => handleInlineUpdate(item.id, 'status', e.target.value)}
                                      onBlur={() => setEditingCell(null)}
                                      style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '11px',
                                        border: '1px solid var(--info)',
                                        borderRadius: '6px',
                                        background: 'var(--white)',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {Object.entries(statusConfig).map(([key, val]) => (
                                        <option key={key} value={key}>{val.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span
                                      onClick={() => setEditingCell({ id: item.id, field: 'status' })}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '10px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        background: statusConfig[item.status]?.bg,
                                        color: statusConfig[item.status]?.color,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                      title="Clique para alterar"
                                    >
                                      {statusConfig[item.status]?.label}
                                    </span>
                                  )}
                                  {/* Executante - Edição Inline (Dropdown de Recursos Humanos) */}
                                  {editingCell?.id === item.id && editingCell?.field === 'executante' ? (
                                    <select
                                      autoFocus
                                      value={item.executante || ''}
                                      onChange={(e) => handleInlineUpdate(item.id, 'executante', e.target.value || null)}
                                      onBlur={() => setEditingCell(null)}
                                      style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '11px',
                                        border: '1px solid var(--info)',
                                        borderRadius: '6px',
                                        background: 'var(--white)',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="">— Selecionar —</option>
                                      {utilizadores.map(u => (
                                        <option key={u.id} value={u.nome}>{u.nome}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span
                                      onClick={() => setEditingCell({ id: item.id, field: 'executante' })}
                                      style={{
                                        fontSize: '11px',
                                        color: item.executante ? 'var(--info)' : 'var(--brown-light)',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        padding: '4px 6px',
                                        borderRadius: '6px',
                                        background: item.executante ? 'rgba(138, 158, 184, 0.1)' : 'transparent',
                                        transition: 'all 0.2s'
                                      }}
                                      title="Clique para alterar"
                                    >
                                      {item.executante || '—'}
                                    </span>
                                  )}
                                  {/* Início */}
                                  <span style={{ fontSize: '11px', color: 'var(--brown-light)', textAlign: 'center' }}>
                                    {item.data_inicio ? new Date(item.data_inicio).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) : '-'}
                                  </span>
                                  {/* Conclusão */}
                                  <span style={{ fontSize: '11px', color: 'var(--brown-light)', textAlign: 'center' }}>
                                    {item.data_conclusao ? new Date(item.data_conclusao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) : '-'}
                                  </span>
                                  {/* Ações */}
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <button onClick={() => handleEdit(item)} className="btn btn-ghost btn-icon" style={{ padding: '4px' }}>
                                      <Edit2 size={12} />
                                    </button>
                                    <button onClick={() => handleDelete(item)} className="btn btn-ghost btn-icon" style={{ padding: '4px', color: 'var(--error)' }}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '2px solid var(--stone)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, width: '120px' }}>Código</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Descrição</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, width: '80px' }}>Escala</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, width: '100px' }}>Início</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, width: '100px' }}>Conclusão</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, width: '100px' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, width: '100px' }}>Executante</th>
                <th style={{ padding: '12px 8px', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(hierarchy).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([groupCode, group]) => (
                <>
                  {/* Grupo Principal (01, 02, etc.) */}
                  {group.item && (
                    <tr key={group.item.id} style={{ background: 'rgba(201, 168, 130, 0.08)', borderBottom: '1px solid var(--stone)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {Object.keys(group.children).length > 0 && (
                            <button onClick={() => toggleGroup(groupCode)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--brown)' }}>
                              {expandedGroups[groupCode] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                          <span style={{ fontWeight: 700, fontWeight: 500, color: 'var(--warning)' }}>{group.item.codigo}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{group.item.nome}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--brown-light)' }}>{group.item.escala || '-'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px' }}>{formatDate(group.item.data_inicio)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px' }}>{formatDate(group.item.data_conclusao)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusConfig[group.item.status]?.bg, color: statusConfig[group.item.status]?.color }}>
                          {statusConfig[group.item.status]?.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--brown-light)' }}>{group.item.executante || '-'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleEdit(group.item)} className="btn btn-ghost btn-icon" style={{ padding: '4px' }}><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(group.item)} className="btn btn-ghost btn-icon" style={{ padding: '4px', color: 'var(--error)' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Subgrupos (01.01, 01.02, etc.) */}
                  {expandedGroups[groupCode] && Object.entries(group.children).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([subCode, subGroup]) => (
                    <>
                      {subGroup.item && (
                        <tr key={subGroup.item.id} style={{ background: 'rgba(138, 158, 184, 0.05)', borderBottom: '1px solid var(--stone)' }}>
                          <td style={{ padding: '12px 16px', paddingLeft: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {subGroup.children.length > 0 && (
                                <button onClick={() => toggleGroup(subCode)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--brown)' }}>
                                  {expandedGroups[subCode] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                              )}
                              <span style={{ fontWeight: 600, fontWeight: 500, color: 'var(--info)' }}>{subGroup.item.codigo}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>{subGroup.item.nome}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--brown-light)' }}>{subGroup.item.escala || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px' }}>{formatDate(subGroup.item.data_inicio)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px' }}>{formatDate(subGroup.item.data_conclusao)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusConfig[subGroup.item.status]?.bg, color: statusConfig[subGroup.item.status]?.color }}>
                              {statusConfig[subGroup.item.status]?.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--brown-light)' }}>{subGroup.item.executante || '-'}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => handleEdit(subGroup.item)} className="btn btn-ghost btn-icon" style={{ padding: '4px' }}><Edit2 size={14} /></button>
                              <button onClick={() => handleDelete(subGroup.item)} className="btn btn-ghost btn-icon" style={{ padding: '4px', color: 'var(--error)' }}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Itens (01.01.01, 01.01.02, etc.) */}
                      {expandedGroups[subCode] && subGroup.children.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true })).map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--stone)' }}>
                          <td style={{ padding: '12px 16px', paddingLeft: '64px' }}>
                            <span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--brown-light)' }}>{item.codigo}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>{item.nome}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '12px' }}>{item.escala || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px' }}>{formatDate(item.data_inicio)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px' }}>{formatDate(item.data_conclusao)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusConfig[item.status]?.bg, color: statusConfig[item.status]?.color }}>
                              {statusConfig[item.status]?.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--brown-light)' }}>{item.executante || '-'}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => handleEdit(item)} className="btn btn-ghost btn-icon" style={{ padding: '4px' }}><Edit2 size={14} /></button>
                              <button onClick={() => handleDelete(item)} className="btn btn-ghost btn-icon" style={{ padding: '4px', color: 'var(--error)' }}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '500px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{editingItem ? 'Editar Entregável' : 'Novo Entregável'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Código *</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="01.01.01"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Nome *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Planta Piso 0"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Escala</label>
                  <input
                    type="text"
                    value={formData.escala}
                    onChange={e => setFormData({ ...formData, escala: e.target.value })}
                    placeholder="1/100"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Data Início</label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Data Conclusão</label>
                  <input
                    type="date"
                    value={formData.data_conclusao}
                    onChange={e => setFormData({ ...formData, data_conclusao: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Estado</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_progresso">Em Progresso</option>
                    <option value="concluido">Concluído</option>
                    <option value="aprovado">Aprovado</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Executante</label>
                  <select
                    value={formData.executante}
                    onChange={e => setFormData({ ...formData, executante: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">— Selecionar Executante —</option>
                    {utilizadores.map(u => (
                      <option key={u.id} value={u.nome}>{u.nome} {u.cargo ? `(${u.cargo})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={e => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                  placeholder="Observações..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--stone)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving || !formData.codigo.trim() || !formData.nome.trim()}>
                {saving ? <Loader2 size={16} className="spin" /> : <><Save size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
