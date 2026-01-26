import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// Design tokens
const colors = {
  primary: '#5a5f4e',
  primaryLight: '#7a7f6e',
  background: '#f5f3ef',
  white: '#ffffff',
  border: '#e0ddd5',
  text: '#3d3d3d',
  textLight: '#6b6b6b',
  success: '#4a7c4e',
  warning: '#c9a227',
  danger: '#c75050',
  info: '#4a6fa5',
  gridHeader: '#f8f7f5',
  gridSelected: '#e8f0e8',
  gridHover: '#fafaf8'
}

const unidades = ['m²', 'm³', 'ml', 'un', 'vg', 'kg', 'ton', 'dia', 'hora', 'conj', 'pç']

export default function MQT() {
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState(null)
  const [mapas, setMapas] = useState([])
  const [selectedMapa, setSelectedMapa] = useState(null)
  const [items, setItems] = useState([])
  const [capitulos, setCapitulos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNewMapaModal, setShowNewMapaModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newMapaNome, setNewMapaNome] = useState('')
  const [selectedCell, setSelectedCell] = useState({ row: null, col: null })
  const [editingCell, setEditingCell] = useState({ row: null, col: null })
  const [editValue, setEditValue] = useState('')
  const [totals, setTotals] = useState({ valor: 0, executado: 0 })
  const gridRef = useRef(null)
  const inputRef = useRef(null)

  // Colunas do grid
  const columns = [
    { key: 'capitulo', label: 'Cap.', width: 60, type: 'number', editable: true },
    { key: 'referencia', label: 'Ref.', width: 80, type: 'text', editable: true },
    { key: 'tipo', label: 'Tipo/Subtipo', width: 160, type: 'text', editable: true },
    { key: 'zona', label: 'Zona', width: 140, type: 'text', editable: true },
    { key: 'descricao', label: 'Descrição', width: 300, type: 'text', editable: true },
    { key: 'unidade', label: 'UN', width: 70, type: 'select', options: unidades, editable: true },
    { key: 'quantidade', label: 'QTD', width: 90, type: 'number', editable: true },
    { key: 'preco_unitario', label: 'Preço Un.', width: 100, type: 'currency', editable: true },
    { key: 'valor_total', label: 'Total', width: 110, type: 'currency', editable: false },
    { key: 'quantidade_executada', label: 'QTD Exec.', width: 100, type: 'number', editable: true },
    { key: 'percentagem', label: '% Exec.', width: 80, type: 'percent', editable: false }
  ]

  useEffect(() => {
    loadObras()
  }, [])

  useEffect(() => {
    if (selectedObra) {
      loadMapas(selectedObra)
    }
  }, [selectedObra])

  useEffect(() => {
    if (selectedMapa) {
      loadItems(selectedMapa)
    }
  }, [selectedMapa])

  useEffect(() => {
    // Calcular totais
    const valorTotal = items.reduce((acc, item) => acc + (item.quantidade || 0) * (item.preco_unitario || 0), 0)
    const valorExecutado = items.reduce((acc, item) => acc + (item.quantidade_executada || 0) * (item.preco_unitario || 0), 0)
    setTotals({ valor: valorTotal, executado: valorExecutado })
  }, [items])

  useEffect(() => {
    if (editingCell.row !== null && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  const loadObras = async () => {
    const { data } = await supabase.from('obras').select('id, nome, codigo').order('nome')
    setObras(data || [])
    setLoading(false)
  }

  const loadMapas = async (obraId) => {
    const { data } = await supabase
      .from('mqt_mapas')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false })
    setMapas(data || [])
    if (data && data.length > 0) {
      setSelectedMapa(data[0].id)
    } else {
      setSelectedMapa(null)
      setItems([])
    }
  }

  const loadItems = async (mapaId) => {
    setLoading(true)
    const { data } = await supabase
      .from('mqt_items')
      .select('*, mqt_capitulos(numero, nome)')
      .eq('mapa_id', mapaId)
      .order('ordem')

    const formattedItems = (data || []).map(item => ({
      ...item,
      capitulo: item.mqt_capitulos?.numero || 1,
      valor_total: (item.quantidade || 0) * (item.preco_unitario || 0),
      percentagem: item.quantidade > 0 ? Math.min((item.quantidade_executada / item.quantidade) * 100, 100) : 0
    }))

    setItems(formattedItems)
    setLoading(false)
  }

  const createMapa = async () => {
    if (!newMapaNome.trim() || !selectedObra) return

    const { data, error } = await supabase.from('mqt_mapas').insert({
      obra_id: selectedObra,
      nome: newMapaNome,
      status: 'rascunho'
    }).select().single()

    if (!error && data) {
      // Criar capítulo inicial
      await supabase.from('mqt_capitulos').insert({
        mapa_id: data.id,
        numero: 1,
        nome: 'Capítulo 1',
        ordem: 0
      })

      setMapas([data, ...mapas])
      setSelectedMapa(data.id)
      setShowNewMapaModal(false)
      setNewMapaNome('')
      // Adicionar linha inicial
      addNewRow(data.id)
    }
  }

  const addNewRow = async (mapaId = selectedMapa) => {
    if (!mapaId) return

    // Buscar ou criar capítulo 1
    let { data: cap } = await supabase
      .from('mqt_capitulos')
      .select('id')
      .eq('mapa_id', mapaId)
      .eq('numero', 1)
      .single()

    if (!cap) {
      const { data: newCap } = await supabase.from('mqt_capitulos').insert({
        mapa_id: mapaId,
        numero: 1,
        nome: 'Capítulo 1'
      }).select().single()
      cap = newCap
    }

    const newRef = `1.${items.length + 1}`
    const newItem = {
      mapa_id: mapaId,
      capitulo_id: cap.id,
      referencia: newRef,
      tipo: '',
      zona: '',
      descricao: 'Novo item',
      unidade: 'un',
      quantidade: 0,
      preco_unitario: 0,
      quantidade_executada: 0,
      ordem: items.length
    }

    const { data, error } = await supabase.from('mqt_items').insert(newItem).select().single()

    if (!error && data) {
      const formattedItem = {
        ...data,
        capitulo: 1,
        valor_total: 0,
        percentagem: 0
      }
      setItems([...items, formattedItem])
      // Selecionar a nova linha
      setSelectedCell({ row: items.length, col: 1 })
    }
  }

  const deleteRow = async (index) => {
    const item = items[index]
    if (!item?.id) return

    const { error } = await supabase.from('mqt_items').delete().eq('id', item.id)
    if (!error) {
      setItems(items.filter((_, i) => i !== index))
      setSelectedCell({ row: null, col: null })
      setEditingCell({ row: null, col: null })
    }
  }

  const handleCellClick = (rowIndex, colIndex) => {
    setSelectedCell({ row: rowIndex, col: colIndex })
    setEditingCell({ row: null, col: null })
  }

  const handleCellDoubleClick = (rowIndex, colIndex) => {
    const col = columns[colIndex]
    if (!col.editable) return

    setEditingCell({ row: rowIndex, col: colIndex })
    const item = items[rowIndex]
    setEditValue(item[col.key]?.toString() || '')
  }

  const handleKeyDown = useCallback((e) => {
    if (editingCell.row !== null) {
      if (e.key === 'Enter') {
        saveCell()
        // Mover para baixo
        if (selectedCell.row < items.length - 1) {
          setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col })
        }
      } else if (e.key === 'Escape') {
        setEditingCell({ row: null, col: null })
        setEditValue('')
      } else if (e.key === 'Tab') {
        e.preventDefault()
        saveCell()
        // Mover para próxima coluna
        if (selectedCell.col < columns.length - 1) {
          setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 })
        } else if (selectedCell.row < items.length - 1) {
          setSelectedCell({ row: selectedCell.row + 1, col: 0 })
        }
      }
    } else if (selectedCell.row !== null) {
      if (e.key === 'Enter' || e.key === 'F2') {
        const col = columns[selectedCell.col]
        if (col.editable) {
          handleCellDoubleClick(selectedCell.row, selectedCell.col)
        }
      } else if (e.key === 'ArrowDown' && selectedCell.row < items.length - 1) {
        e.preventDefault()
        setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col })
      } else if (e.key === 'ArrowUp' && selectedCell.row > 0) {
        e.preventDefault()
        setSelectedCell({ row: selectedCell.row - 1, col: selectedCell.col })
      } else if (e.key === 'ArrowRight' && selectedCell.col < columns.length - 1) {
        e.preventDefault()
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 })
      } else if (e.key === 'ArrowLeft' && selectedCell.col > 0) {
        e.preventDefault()
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 })
      } else if (e.key === 'Delete') {
        if (window.confirm('Eliminar esta linha?')) {
          deleteRow(selectedCell.row)
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        // Começar a editar ao digitar
        const col = columns[selectedCell.col]
        if (col.editable) {
          setEditingCell({ row: selectedCell.row, col: selectedCell.col })
          setEditValue(e.key)
        }
      }
    }
  }, [selectedCell, editingCell, items])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const saveCell = async () => {
    if (editingCell.row === null) return

    const item = items[editingCell.row]
    const col = columns[editingCell.col]
    let value = editValue

    // Converter tipos
    if (col.type === 'number' || col.type === 'currency') {
      value = parseFloat(value.replace(',', '.')) || 0
    }

    // Atualizar localmente
    const updatedItems = [...items]
    updatedItems[editingCell.row] = {
      ...item,
      [col.key]: value,
      valor_total: col.key === 'quantidade' || col.key === 'preco_unitario'
        ? (col.key === 'quantidade' ? value : item.quantidade) * (col.key === 'preco_unitario' ? value : item.preco_unitario)
        : item.valor_total,
      percentagem: col.key === 'quantidade' || col.key === 'quantidade_executada'
        ? ((col.key === 'quantidade_executada' ? value : item.quantidade_executada) / (col.key === 'quantidade' ? value : item.quantidade)) * 100
        : item.percentagem
    }
    setItems(updatedItems)

    // Salvar na BD
    setSaving(true)
    await supabase.from('mqt_items').update({ [col.key]: value }).eq('id', item.id)
    setSaving(false)

    setEditingCell({ row: null, col: null })
    setEditValue('')
  }

  const formatValue = (value, type) => {
    if (value === null || value === undefined || value === '') return ''
    if (type === 'currency') return `€ ${parseFloat(value).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`
    if (type === 'percent') return `${parseFloat(value).toFixed(1)}%`
    if (type === 'number') return parseFloat(value).toLocaleString('pt-PT', { minimumFractionDigits: 2 })
    return value
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedMapa) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(';').map(h => h.trim().toLowerCase())

      // Mapear headers
      const headerMap = {
        'cap': 'capitulo', 'cap.': 'capitulo', 'capitulo': 'capitulo',
        'ref': 'referencia', 'ref.': 'referencia', 'referencia': 'referencia',
        'tipo': 'tipo', 'tipo/subtipo': 'tipo', 'subtipo': 'subtipo',
        'zona': 'zona',
        'descricao': 'descricao', 'descrição': 'descricao',
        'un': 'unidade', 'unidade': 'unidade',
        'qtd': 'quantidade', 'quantidade': 'quantidade',
        'preco': 'preco_unitario', 'preço': 'preco_unitario', 'preco unitario': 'preco_unitario', 'preço unitário': 'preco_unitario'
      }

      const colIndexes = {}
      headers.forEach((h, i) => {
        const mapped = headerMap[h]
        if (mapped) colIndexes[mapped] = i
      })

      // Buscar ou criar capítulo 1
      let { data: cap } = await supabase
        .from('mqt_capitulos')
        .select('id')
        .eq('mapa_id', selectedMapa)
        .eq('numero', 1)
        .single()

      if (!cap) {
        const { data: newCap } = await supabase.from('mqt_capitulos').insert({
          mapa_id: selectedMapa,
          numero: 1,
          nome: 'Capítulo 1'
        }).select().single()
        cap = newCap
      }

      const newItems = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.trim())
        if (values.length < 3) continue

        const item = {
          mapa_id: selectedMapa,
          capitulo_id: cap.id,
          referencia: values[colIndexes.referencia] || `1.${i}`,
          tipo: values[colIndexes.tipo] || '',
          zona: values[colIndexes.zona] || '',
          descricao: values[colIndexes.descricao] || 'Item importado',
          unidade: values[colIndexes.unidade] || 'un',
          quantidade: parseFloat((values[colIndexes.quantidade] || '0').replace(',', '.')) || 0,
          preco_unitario: parseFloat((values[colIndexes.preco_unitario] || '0').replace(',', '.')) || 0,
          quantidade_executada: 0,
          ordem: items.length + i - 1
        }
        newItems.push(item)
      }

      if (newItems.length > 0) {
        const { data, error } = await supabase.from('mqt_items').insert(newItems).select()
        if (!error && data) {
          loadItems(selectedMapa)
        }
      }

      setShowImportModal(false)
    }
    reader.readAsText(file)
  }

  const exportCSV = () => {
    if (items.length === 0) return

    const headers = ['Cap.', 'Ref.', 'Tipo/Subtipo', 'Zona', 'Descrição', 'UN', 'QTD', 'Preço Un.', 'Total', 'QTD Exec.', '% Exec.']
    const rows = items.map(item => [
      item.capitulo,
      item.referencia,
      item.tipo || '',
      item.zona || '',
      item.descricao,
      item.unidade,
      item.quantidade,
      item.preco_unitario,
      item.valor_total,
      item.quantidade_executada,
      item.percentagem?.toFixed(1) || '0'
    ])

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `MQT_${selectedObra}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getCellStyle = (rowIndex, colIndex, col) => {
    const isSelected = selectedCell.row === rowIndex && selectedCell.col === colIndex
    const isEditing = editingCell.row === rowIndex && editingCell.col === colIndex

    return {
      width: col.width,
      minWidth: col.width,
      padding: '8px 10px',
      borderRight: `1px solid ${colors.border}`,
      borderBottom: `1px solid ${colors.border}`,
      background: isEditing ? colors.white : isSelected ? colors.gridSelected : rowIndex % 2 === 0 ? colors.white : colors.gridHeader,
      cursor: col.editable ? 'cell' : 'default',
      outline: isSelected ? `2px solid ${colors.primary}` : 'none',
      outlineOffset: '-2px',
      fontSize: '13px',
      textAlign: col.type === 'number' || col.type === 'currency' || col.type === 'percent' ? 'right' : 'left',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      position: 'relative'
    }
  }

  return (
    <div style={{ padding: '24px', background: colors.background, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: colors.text, margin: 0 }}>
            Mapa de Quantidades (MQT)
          </h1>
          <p style={{ fontSize: '14px', color: colors.textLight, marginTop: '4px' }}>
            Gerir quantidades e acompanhamento de obra
          </p>
        </div>
        {saving && (
          <span style={{ fontSize: '12px', color: colors.info, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.info, animation: 'pulse 1s infinite' }} />
            A guardar...
          </span>
        )}
      </div>

      {/* Seleção de Obra e Mapa */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '250px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: colors.textLight, marginBottom: '6px' }}>
            Obra
          </label>
          <select
            value={selectedObra || ''}
            onChange={(e) => setSelectedObra(e.target.value || null)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: colors.white
            }}
          >
            <option value="">Selecionar obra...</option>
            {obras.map(obra => (
              <option key={obra.id} value={obra.id}>{obra.codigo} - {obra.nome}</option>
            ))}
          </select>
        </div>

        {selectedObra && (
          <div style={{ minWidth: '250px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: colors.textLight, marginBottom: '6px' }}>
              Mapa
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedMapa || ''}
                onChange={(e) => setSelectedMapa(e.target.value || null)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: colors.white
                }}
              >
                <option value="">Selecionar mapa...</option>
                {mapas.map(mapa => (
                  <option key={mapa.id} value={mapa.id}>{mapa.nome} (v{mapa.versao})</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewMapaModal(true)}
                style={{
                  padding: '10px 16px',
                  background: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                + Novo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      {selectedMapa && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          padding: '12px',
          background: colors.white,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => addNewRow()}
            style={{
              padding: '8px 16px',
              background: colors.success,
              color: colors.white,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            + Adicionar Linha
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '8px 16px',
              background: colors.info,
              color: colors.white,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Importar CSV
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: '8px 16px',
              background: colors.white,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Exportar CSV
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: colors.textLight }}>
              Total: <strong style={{ color: colors.text }}>€ {totals.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span style={{ fontSize: '13px', color: colors.textLight }}>
              Executado: <strong style={{ color: colors.success }}>€ {totals.executado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span style={{ fontSize: '13px', color: colors.textLight }}>
              Progresso: <strong style={{ color: colors.info }}>{totals.valor > 0 ? ((totals.executado / totals.valor) * 100).toFixed(1) : 0}%</strong>
            </span>
          </div>
        </div>
      )}

      {/* Grid Spreadsheet */}
      {selectedMapa && (
        <div
          ref={gridRef}
          style={{
            background: colors.white,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            overflow: 'auto',
            maxHeight: 'calc(100vh - 320px)'
          }}
        >
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1200px' }}>
            <thead>
              <tr>
                <th style={{
                  width: 40,
                  padding: '10px',
                  background: colors.gridHeader,
                  borderRight: `1px solid ${colors.border}`,
                  borderBottom: `2px solid ${colors.border}`,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: colors.textLight,
                  textAlign: 'center',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}>
                  #
                </th>
                {columns.map((col, i) => (
                  <th key={col.key} style={{
                    width: col.width,
                    minWidth: col.width,
                    padding: '10px',
                    background: colors.gridHeader,
                    borderRight: `1px solid ${colors.border}`,
                    borderBottom: `2px solid ${colors.border}`,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: colors.textLight,
                    textAlign: col.type === 'number' || col.type === 'currency' || col.type === 'percent' ? 'right' : 'left',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, rowIndex) => (
                <tr key={item.id || rowIndex}>
                  <td style={{
                    padding: '8px',
                    background: colors.gridHeader,
                    borderRight: `1px solid ${colors.border}`,
                    borderBottom: `1px solid ${colors.border}`,
                    fontSize: '11px',
                    color: colors.textLight,
                    textAlign: 'center'
                  }}>
                    {rowIndex + 1}
                  </td>
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      style={getCellStyle(rowIndex, colIndex, col)}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    >
                      {editingCell.row === rowIndex && editingCell.col === colIndex ? (
                        col.type === 'select' ? (
                          <select
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => {
                              setEditValue(e.target.value)
                              setTimeout(saveCell, 0)
                            }}
                            onBlur={saveCell}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              fontSize: '13px',
                              background: 'transparent'
                            }}
                          >
                            {col.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            ref={inputRef}
                            type={col.type === 'number' || col.type === 'currency' ? 'text' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCell}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              fontSize: '13px',
                              textAlign: col.type === 'number' || col.type === 'currency' ? 'right' : 'left',
                              background: 'transparent'
                            }}
                          />
                        )
                      ) : (
                        <span style={{
                          color: col.key === 'percentagem'
                            ? item.percentagem >= 100 ? colors.success
                              : item.percentagem > 0 ? colors.info
                              : colors.textLight
                            : colors.text
                        }}>
                          {formatValue(item[col.key], col.type)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: colors.textLight,
                    fontSize: '14px'
                  }}>
                    Nenhum item. Clique em "Adicionar Linha" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Instruções */}
      {selectedMapa && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: colors.gridHeader,
          borderRadius: '8px',
          fontSize: '12px',
          color: colors.textLight
        }}>
          <strong>Atalhos:</strong> Enter/F2 para editar • Tab para próxima célula • Setas para navegar • Delete para eliminar linha • Duplo-clique para editar
        </div>
      )}

      {/* Modal Novo Mapa */}
      {showNewMapaModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Novo Mapa MQT</h3>
            <input
              type="text"
              value={newMapaNome}
              onChange={(e) => setNewMapaNome(e.target.value)}
              placeholder="Nome do mapa (ex: MQT Demolições)"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewMapaModal(false)}
                style={{
                  padding: '10px 20px',
                  background: colors.white,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={createMapa}
                style={{
                  padding: '10px 20px',
                  background: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Importar CSV</h3>
            <p style={{ fontSize: '13px', color: colors.textLight, marginBottom: '16px' }}>
              O ficheiro deve ter colunas separadas por ponto e vírgula (;) com headers na primeira linha.
              <br /><br />
              <strong>Colunas reconhecidas:</strong> Cap., Ref., Tipo/Subtipo, Zona, Descrição, UN, QTD, Preço Un.
            </p>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleImportCSV}
              style={{
                width: '100%',
                padding: '12px',
                border: `2px dashed ${colors.border}`,
                borderRadius: '8px',
                marginBottom: '16px',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '10px 20px',
                  background: colors.white,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem inicial */}
      {!selectedObra && (
        <div style={{
          background: colors.white,
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
            Selecione uma Obra
          </h2>
          <p style={{ fontSize: '14px', color: colors.textLight }}>
            Escolha uma obra para visualizar ou criar mapas de quantidades
          </p>
        </div>
      )}
    </div>
  )
}
