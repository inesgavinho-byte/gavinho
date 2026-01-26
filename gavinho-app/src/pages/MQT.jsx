import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Lock, Unlock, Copy, Download, Upload, Trash2, Check, ChevronDown } from 'lucide-react'

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
  gridHover: '#fafaf8',
  locked: '#f5f5f5',
  inherited: '#fafaf8'
}

const unidades = ['un', 'm²', 'm³', 'ml', 'vg', 'kg', 'ton', 'dia', 'hora', 'conj', 'pç']

export default function MQT() {
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState(null)
  const [versoes, setVersoes] = useState([])
  const [selectedVersao, setSelectedVersao] = useState(null)
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNewVersaoModal, setShowNewVersaoModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newVersaoNome, setNewVersaoNome] = useState('')
  const [baseVersaoId, setBaseVersaoId] = useState('')
  const [selectedCell, setSelectedCell] = useState({ row: null, col: null })
  const [editingCell, setEditingCell] = useState({ row: null, col: null })
  const [editValue, setEditValue] = useState('')
  const gridRef = useRef(null)
  const inputRef = useRef(null)

  // Colunas do grid MQT (sem preços - só quantidades)
  const columns = [
    { key: 'capitulo', label: 'CAP.', width: 70, type: 'number', editable: true },
    { key: 'referencia', label: 'REF.', width: 80, type: 'text', editable: true },
    { key: 'tipo_subtipo', label: 'TIPO/SUBTIPO', width: 160, type: 'text', editable: true },
    { key: 'zona', label: 'ZONA', width: 140, type: 'text', editable: true },
    { key: 'descricao', label: 'DESCRIÇÃO', width: 350, type: 'text', editable: true },
    { key: 'unidade', label: 'UN', width: 70, type: 'select', options: unidades, editable: true },
    { key: 'quantidade', label: 'QTD', width: 100, type: 'number', editable: true }
  ]

  useEffect(() => {
    loadObras()
  }, [])

  useEffect(() => {
    if (selectedObra) {
      loadVersoes(selectedObra)
    }
  }, [selectedObra])

  useEffect(() => {
    if (selectedVersao) {
      loadLinhas(selectedVersao)
    }
  }, [selectedVersao])

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

  const loadVersoes = async (obraId) => {
    const { data } = await supabase
      .from('mqt_versoes')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false })
    setVersoes(data || [])

    // Selecionar versão ativa ou primeira
    const ativa = data?.find(v => v.is_ativa) || data?.[0]
    if (ativa) {
      setSelectedVersao(ativa.id)
    } else {
      setSelectedVersao(null)
      setLinhas([])
    }
  }

  const loadLinhas = async (versaoId) => {
    setLoading(true)
    const { data } = await supabase
      .from('mqt_linhas')
      .select('*')
      .eq('mqt_versao_id', versaoId)
      .order('ordem')

    setLinhas(data || [])
    setLoading(false)
  }

  const getVersaoInfo = () => {
    return versoes.find(v => v.id === selectedVersao)
  }

  const isLocked = () => {
    const versao = getVersaoInfo()
    return versao?.is_congelada || false
  }

  const createVersao = async () => {
    if (!selectedObra) return

    // Determinar próxima versão
    const existingVersions = versoes.map(v => v.versao)
    let nextVersion = 'v1.0'
    if (existingVersions.length > 0) {
      const lastVersion = existingVersions[0]
      const [major, minor] = lastVersion.replace('v', '').split('.').map(Number)
      nextVersion = `v${major}.${minor + 1}`
    }

    const versaoId = `MQT_${selectedObra}_${nextVersion}`.replace(/-/g, '_')

    const { data: versaoData, error: versaoError } = await supabase.from('mqt_versoes').insert({
      id: versaoId,
      obra_id: selectedObra,
      versao: nextVersion,
      is_ativa: versoes.length === 0
    }).select().single()

    if (versaoError) {
      console.error('Erro ao criar versão:', versaoError)
      return
    }

    // Se baseado em versão existente, copiar linhas
    if (baseVersaoId) {
      const { data: linhasBase } = await supabase
        .from('mqt_linhas')
        .select('*')
        .eq('mqt_versao_id', baseVersaoId)

      if (linhasBase && linhasBase.length > 0) {
        const novasLinhas = linhasBase.map(l => ({
          mqt_versao_id: versaoId,
          ordem: l.ordem,
          capitulo: l.capitulo,
          referencia: l.referencia,
          tipo_subtipo: l.tipo_subtipo,
          zona: l.zona,
          descricao: l.descricao,
          unidade: l.unidade,
          quantidade: l.quantidade
        }))
        await supabase.from('mqt_linhas').insert(novasLinhas)
      }
    }

    setShowNewVersaoModal(false)
    setNewVersaoNome('')
    setBaseVersaoId('')
    loadVersoes(selectedObra)
  }

  const setVersaoAtiva = async (versaoId) => {
    // Desativar todas
    await supabase
      .from('mqt_versoes')
      .update({ is_ativa: false })
      .eq('obra_id', selectedObra)

    // Ativar selecionada
    await supabase
      .from('mqt_versoes')
      .update({ is_ativa: true })
      .eq('id', versaoId)

    loadVersoes(selectedObra)
  }

  const addNewRow = async () => {
    if (!selectedVersao || isLocked()) return

    const newRef = linhas.length > 0
      ? `${Math.floor(linhas[linhas.length - 1].capitulo || 1)}.${linhas.length + 1}`
      : '1.1'

    const { data, error } = await supabase.from('mqt_linhas').insert({
      mqt_versao_id: selectedVersao,
      ordem: linhas.length,
      capitulo: 1,
      referencia: newRef,
      descricao: 'Novo item',
      unidade: 'un',
      quantidade: 0
    }).select().single()

    if (!error && data) {
      setLinhas([...linhas, data])
      setSelectedCell({ row: linhas.length, col: 4 }) // Focar na descrição
    }
  }

  const deleteRow = async (index) => {
    if (isLocked()) return
    const item = linhas[index]
    if (!item?.id) return

    const { error } = await supabase.from('mqt_linhas').delete().eq('id', item.id)
    if (!error) {
      setLinhas(linhas.filter((_, i) => i !== index))
      setSelectedCell({ row: null, col: null })
      setEditingCell({ row: null, col: null })
    }
  }

  const handleCellClick = (rowIndex, colIndex) => {
    setSelectedCell({ row: rowIndex, col: colIndex })
    setEditingCell({ row: null, col: null })
  }

  const handleCellDoubleClick = (rowIndex, colIndex) => {
    if (isLocked()) return
    const col = columns[colIndex]
    if (!col.editable) return

    setEditingCell({ row: rowIndex, col: colIndex })
    const item = linhas[rowIndex]
    setEditValue(item[col.key]?.toString() || '')
  }

  const handleKeyDown = useCallback((e) => {
    if (isLocked()) return

    if (editingCell.row !== null) {
      if (e.key === 'Enter') {
        saveCell()
        if (selectedCell.row < linhas.length - 1) {
          setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col })
        }
      } else if (e.key === 'Escape') {
        setEditingCell({ row: null, col: null })
        setEditValue('')
      } else if (e.key === 'Tab') {
        e.preventDefault()
        saveCell()
        if (selectedCell.col < columns.length - 1) {
          setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 })
        } else if (selectedCell.row < linhas.length - 1) {
          setSelectedCell({ row: selectedCell.row + 1, col: 0 })
        }
      }
    } else if (selectedCell.row !== null) {
      if (e.key === 'Enter' || e.key === 'F2') {
        const col = columns[selectedCell.col]
        if (col.editable) {
          handleCellDoubleClick(selectedCell.row, selectedCell.col)
        }
      } else if (e.key === 'ArrowDown' && selectedCell.row < linhas.length - 1) {
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
        const col = columns[selectedCell.col]
        if (col.editable) {
          setEditingCell({ row: selectedCell.row, col: selectedCell.col })
          setEditValue(e.key)
        }
      }
    }
  }, [selectedCell, editingCell, linhas, columns])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const saveCell = async () => {
    if (editingCell.row === null || isLocked()) return

    const item = linhas[editingCell.row]
    const col = columns[editingCell.col]
    let value = editValue

    if (col.type === 'number') {
      value = parseFloat(value.replace(',', '.')) || 0
    }

    const updatedLinhas = [...linhas]
    updatedLinhas[editingCell.row] = { ...item, [col.key]: value }
    setLinhas(updatedLinhas)

    setSaving(true)
    await supabase.from('mqt_linhas').update({ [col.key]: value }).eq('id', item.id)
    setSaving(false)

    setEditingCell({ row: null, col: null })
    setEditValue('')
  }

  const formatValue = (value, type) => {
    if (value === null || value === undefined || value === '') return ''
    if (type === 'number') return parseFloat(value).toLocaleString('pt-PT', { minimumFractionDigits: 2 })
    return value
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedVersao || isLocked()) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(';').map(h => h.trim().toLowerCase())

      const headerMap = {
        'cap': 'capitulo', 'cap.': 'capitulo', 'capitulo': 'capitulo',
        'ref': 'referencia', 'ref.': 'referencia', 'referencia': 'referencia',
        'tipo': 'tipo_subtipo', 'tipo/subtipo': 'tipo_subtipo', 'subtipo': 'tipo_subtipo',
        'zona': 'zona',
        'descricao': 'descricao', 'descrição': 'descricao',
        'un': 'unidade', 'unidade': 'unidade',
        'qtd': 'quantidade', 'quantidade': 'quantidade'
      }

      const colIndexes = {}
      headers.forEach((h, i) => {
        const mapped = headerMap[h]
        if (mapped) colIndexes[mapped] = i
      })

      const newItems = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.trim())
        if (values.length < 3) continue

        const item = {
          mqt_versao_id: selectedVersao,
          ordem: linhas.length + i - 1,
          capitulo: parseFloat((values[colIndexes.capitulo] || '1').replace(',', '.')) || 1,
          referencia: values[colIndexes.referencia] || `1.${i}`,
          tipo_subtipo: values[colIndexes.tipo_subtipo] || '',
          zona: values[colIndexes.zona] || '',
          descricao: values[colIndexes.descricao] || 'Item importado',
          unidade: values[colIndexes.unidade] || 'un',
          quantidade: parseFloat((values[colIndexes.quantidade] || '0').replace(',', '.')) || 0
        }
        newItems.push(item)
      }

      if (newItems.length > 0) {
        const { error } = await supabase.from('mqt_linhas').insert(newItems)
        if (!error) {
          loadLinhas(selectedVersao)
        }
      }

      setShowImportModal(false)
    }
    reader.readAsText(file)
  }

  const exportCSV = () => {
    if (linhas.length === 0) return

    const headers = ['Cap.', 'Ref.', 'Tipo/Subtipo', 'Zona', 'Descrição', 'UN', 'QTD']
    const rows = linhas.map(item => [
      item.capitulo,
      item.referencia,
      item.tipo_subtipo || '',
      item.zona || '',
      item.descricao,
      item.unidade,
      item.quantidade
    ])

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const versaoInfo = getVersaoInfo()
    link.href = URL.createObjectURL(blob)
    link.download = `MQT_${versaoInfo?.versao || 'export'}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getCellStyle = (rowIndex, colIndex, col) => {
    const isSelected = selectedCell.row === rowIndex && selectedCell.col === colIndex
    const isEditing = editingCell.row === rowIndex && editingCell.col === colIndex
    const locked = isLocked()

    return {
      width: col.width,
      minWidth: col.width,
      padding: '8px 10px',
      borderRight: `1px solid ${colors.border}`,
      borderBottom: `1px solid ${colors.border}`,
      background: locked ? colors.locked : isEditing ? colors.white : isSelected ? colors.gridSelected : rowIndex % 2 === 0 ? colors.white : colors.gridHeader,
      cursor: locked ? 'not-allowed' : col.editable ? 'cell' : 'default',
      outline: isSelected ? `2px solid ${colors.primary}` : 'none',
      outlineOffset: '-2px',
      fontSize: '13px',
      textAlign: col.type === 'number' ? 'right' : 'left',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }

  const versaoInfo = getVersaoInfo()

  return (
    <div style={{ padding: '24px', background: colors.background, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: colors.text, margin: 0 }}>
            Mapa de Quantidades (MQT)
          </h1>
          <p style={{ fontSize: '14px', color: colors.textLight, marginTop: '4px' }}>
            Gerir quantidades e versões por obra
          </p>
        </div>
        {saving && (
          <span style={{ fontSize: '12px', color: colors.info, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.info, animation: 'pulse 1s infinite' }} />
            A guardar...
          </span>
        )}
      </div>

      {/* Seleção de Obra e Versão */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: '280px' }}>
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
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: colors.textLight, marginBottom: '6px' }}>
              Versão
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedVersao || ''}
                onChange={(e) => setSelectedVersao(e.target.value || null)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: colors.white
                }}
              >
                <option value="">Selecionar versão...</option>
                {versoes.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.versao} {v.is_ativa ? '(Ativa)' : ''} {v.is_congelada ? '🔒' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewVersaoModal(true)}
                style={{
                  padding: '10px 16px',
                  background: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> Nova
              </button>
            </div>
          </div>
        )}

        {versaoInfo && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {versaoInfo.is_congelada ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: colors.locked, borderRadius: '8px', fontSize: '12px', color: colors.textLight }}>
                <Lock size={14} /> Congelada
              </span>
            ) : (
              <>
                {!versaoInfo.is_ativa && (
                  <button
                    onClick={() => setVersaoAtiva(versaoInfo.id)}
                    style={{
                      padding: '8px 12px',
                      background: colors.success,
                      color: colors.white,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={14} /> Definir Ativa
                  </button>
                )}
                {versaoInfo.is_ativa && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#E8F5E9', borderRadius: '8px', fontSize: '12px', color: colors.success, fontWeight: 600 }}>
                    <Check size={14} /> Ativa
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      {selectedVersao && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          padding: '12px',
          background: colors.white,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <button
            onClick={addNewRow}
            disabled={isLocked()}
            style={{
              padding: '8px 16px',
              background: isLocked() ? colors.locked : colors.success,
              color: isLocked() ? colors.textLight : colors.white,
              border: 'none',
              borderRadius: '6px',
              cursor: isLocked() ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} /> Adicionar Linha
          </button>
          <button
            onClick={() => !isLocked() && setShowImportModal(true)}
            disabled={isLocked()}
            style={{
              padding: '8px 16px',
              background: isLocked() ? colors.locked : colors.info,
              color: isLocked() ? colors.textLight : colors.white,
              border: 'none',
              borderRadius: '6px',
              cursor: isLocked() ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Upload size={14} /> Importar CSV
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
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> Exportar CSV
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '13px', color: colors.textLight }}>
            Total Linhas: <strong style={{ color: colors.text }}>{linhas.length}</strong>
          </span>
        </div>
      )}

      {/* Grid Spreadsheet */}
      {selectedVersao && (
        <div
          ref={gridRef}
          style={{
            background: colors.white,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            overflow: 'auto',
            maxHeight: 'calc(100vh - 340px)'
          }}
        >
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1000px' }}>
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
                {columns.map((col) => (
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
                    textAlign: col.type === 'number' ? 'right' : 'left',
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
              {linhas.map((item, rowIndex) => (
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
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCell}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              fontSize: '13px',
                              textAlign: col.type === 'number' ? 'right' : 'left',
                              background: 'transparent'
                            }}
                          />
                        )
                      ) : (
                        <span>{formatValue(item[col.key], col.type)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: colors.textLight,
                    fontSize: '14px'
                  }}>
                    {isLocked()
                      ? 'Esta versão está congelada. Crie uma nova versão para editar.'
                      : 'Nenhum item. Clique em "Adicionar Linha" para começar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Instruções */}
      {selectedVersao && !isLocked() && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: colors.gridHeader,
          borderRadius: '8px',
          fontSize: '12px',
          color: colors.textLight
        }}>
          <strong>Atalhos:</strong> Enter/F2 para editar • Tab para próxima célula • Setas para navegar • Delete para eliminar linha
        </div>
      )}

      {/* Modal Nova Versão */}
      {showNewVersaoModal && (
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
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Nova Versão MQT</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Copiar de (opcional)
              </label>
              <select
                value={baseVersaoId}
                onChange={(e) => setBaseVersaoId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="">Começar do zero</option>
                {versoes.map(v => (
                  <option key={v.id} value={v.id}>{v.versao}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowNewVersaoModal(false); setBaseVersaoId('') }}
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
                onClick={createVersao}
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
                Criar Versão
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
              <strong>Colunas reconhecidas:</strong> Cap., Ref., Tipo/Subtipo, Zona, Descrição, UN, QTD
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
