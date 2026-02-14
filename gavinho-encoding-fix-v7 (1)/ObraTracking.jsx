import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Upload, FileText, Plus, ChevronDown, ChevronRight, Edit, Trash2, 
  CheckCircle, Clock, PlayCircle, Search, Filter, X, Loader2,
  Package, MapPin, Euro, Calendar, User, MoreVertical, AlertCircle,
  Sparkles, FileSpreadsheet, Eye, CheckSquare, Square, AlertTriangle,
  FileType
} from 'lucide-react'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// Especialidades comuns em construção
const ESPECIALIDADES_DEFAULT = [
  'Demolições', 'Alvenarias', 'Rebocos', 'Pavimentos', 'Revestimentos',
  'Carpintarias', 'Serralharias', 'Canalização', 'Eletricidade', 'AVAC',
  'Pinturas', 'Vidros', 'Equipamentos', 'Limpezas', 'Outros'
]

export default function ObraTracking({ obra, onStatsUpdate }) {
  const [propostas, setPropostas] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [zonas, setZonas] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  
  // UI States
  const [expandedEspecialidades, setExpandedEspecialidades] = useState({})
  const [expandedZonas, setExpandedZonas] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [activeMenu, setActiveMenu] = useState(null)
  
  // Seleção múltipla
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [propostaToDelete, setPropostaToDelete] = useState(null)
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showExtractedPreview, setShowExtractedPreview] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  
  // Form
  const [itemForm, setItemForm] = useState({
    especialidade_id: '', zona_id: '', descricao: '', quantidade: '',
    unidade: 'un', valor_unitario: '', estado: 'pendente',
    percentagem: 0, data_prevista: '', executor: '', notas: ''
  })
  
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (obra?.id) fetchData()
  }, [obra?.id])

  const fetchData = async () => {
    try {
      const [propostasRes, espRes, zonasRes, itemsRes] = await Promise.all([
        supabase.from('obra_propostas').select('*').eq('obra_id', obra.id).order('created_at', { ascending: false }),
        supabase.from('obra_especialidades').select('*').eq('obra_id', obra.id).order('ordem'),
        supabase.from('obra_zonas').select('*').eq('obra_id', obra.id).order('ordem'),
        supabase.from('obra_items').select('*').eq('obra_id', obra.id).order('ordem')
      ])
      
      setPropostas(propostasRes.data || [])
      setEspecialidades(espRes.data || [])
      setZonas(zonasRes.data || [])
      setItems(itemsRes.data || [])
      
      // Expandir todas as especialidades por defeito
      const expanded = {}
      espRes.data?.forEach(e => expanded[e.id] = true)
      setExpandedEspecialidades(expanded)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Upload e extração de ficheiro
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    try {
      // Ler conteúdo do ficheiro
      let content = ''
      let extractedItems = []
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Processar Excel
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        content = data.map(row => row.join(' | ')).join('\n')
        
        // Tentar extrair estrutura do Excel
        extractedItems = extractItemsFromExcel(data)
      } else if (file.name.endsWith('.pdf')) {
        // Processar PDF
        const buffer = await file.arrayBuffer()
        const pdfData = await extractTextFromPDF(buffer)
        content = pdfData.text
        
        // Tentar extrair items do texto do PDF
        extractedItems = extractItemsFromPDFText(pdfData.lines)
      } else if (file.name.endsWith('.csv')) {
        content = await file.text()
        const lines = content.split('\n').map(l => l.split(','))
        extractedItems = extractItemsFromExcel(lines)
      }

      // Criar registo da proposta
      const { data: proposta, error: propError } = await supabase
        .from('obra_propostas')
        .insert([{
          obra_id: obra.id,
          nome: file.name.replace(/\.[^/.]+$/, ''),
          ficheiro_nome: file.name,
          data_adjudicacao: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single()

      if (propError) throw propError

      // Se extraímos items, mostrar preview
      if (extractedItems.length > 0) {
        setShowExtractedPreview({
          proposta,
          items: extractedItems,
          rawContent: content
        })
      } else {
        // Sem items extraídos
        alert('Não foi possível extrair items automaticamente. Verifique o formato do ficheiro.')
        fetchData()
      }

      setShowUploadModal(false)
    } catch (err) {
      console.error('Erro no upload:', err)
      alert('Erro ao processar ficheiro: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Extrair texto de PDF
  const extractTextFromPDF = async (buffer) => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const lines = []
      let fullText = ''
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        // Organizar texto por posição Y (linhas)
        const textItems = textContent.items
        const lineMap = {}
        
        textItems.forEach(item => {
          const y = Math.round(item.transform[5]) // Posição Y
          if (!lineMap[y]) lineMap[y] = []
          lineMap[y].push({ x: item.transform[4], text: item.str })
        })
        
        // Ordenar linhas por Y (descendente) e items por X
        const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a)
        sortedYs.forEach(y => {
          const lineItems = lineMap[y].sort((a, b) => a.x - b.x)
          const lineText = lineItems.map(i => i.text).join(' ').trim()
          if (lineText) {
            lines.push(lineText)
            fullText += lineText + '\n'
          }
        })
      }
      
      return { text: fullText, lines }
    } catch (err) {
      console.error('Erro ao ler PDF:', err)
      throw new Error('Não foi possível ler o PDF: ' + err.message)
    }
  }

  // Extrair items do texto do PDF
  const extractItemsFromPDFText = (lines) => {
    const items = []
    let currentEspecialidade = 'Geral'
    let currentZona = 'Geral'
    
    // Função para parse de valor
    const parseValor = (str) => {
      if (!str) return 0
      let valorStr = String(str).replace(/[â‚¬\s]/g, '').trim()
      if (!valorStr) return 0
      
      const hasComma = valorStr.includes(',')
      const hasDot = valorStr.includes('.')
      
      if (hasComma && hasDot) {
        if (valorStr.lastIndexOf(',') < valorStr.lastIndexOf('.')) {
          valorStr = valorStr.replace(/,/g, '')
        } else {
          valorStr = valorStr.replace(/\./g, '').replace(',', '.')
        }
      } else if (hasDot && !hasComma) {
        const parts = valorStr.split('.')
        const lastPart = parts[parts.length - 1]
        if (!(parts.length === 2 && lastPart.length <= 2)) {
          if (lastPart.length === 3 && parts.length > 1) {
            valorStr = valorStr.replace(/\./g, '')
          }
        }
      } else if (hasComma && !hasDot) {
        const parts = valorStr.split(',')
        const lastPart = parts[parts.length - 1]
        if (parts.length === 2 && lastPart.length <= 2) {
          valorStr = valorStr.replace(',', '.')
        } else if (lastPart.length === 3 && parts.length > 1) {
          valorStr = valorStr.replace(/,/g, '')
        }
      }
      
      return parseFloat(valorStr) || 0
    }
    
    // Padrões para identificar items
    // Formato típico: "1.1 Descrição do item vg 1 1.500,00 â‚¬ 1.500,00 â‚¬"
    const itemPattern = /^(\d+(?:\.\d+)?)\s+(.+?)\s+(un|vg|m2|m3|ml|kg|h|cj|conj|pç|pc)?\s*(\d+(?:[.,]\d+)?)\s*(?:â‚¬?\s*(\d+(?:[.,]\d+)*(?:[.,]\d{2})?)\s*â‚¬?)?\s*(?:â‚¬?\s*(\d+(?:[.,]\d+)*(?:[.,]\d{2})?)\s*â‚¬?)?$/i
    
    // Padrão para categorias (números inteiros como 1, 2, 3 seguidos de texto em maiúsculas)
    const categoryPattern = /^(\d+)\s+([A-ZÀÀ‰ÀÀ“ÀšÀ‚ÀŠÀ”ÀƒÀ•À‡][A-ZÀÀ‰ÀÀ“ÀšÀ‚ÀŠÀ”ÀƒÀ•À‡\s]+)$/
    
    lines.forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.length < 3) return
      
      // Verificar se é categoria
      const catMatch = trimmed.match(categoryPattern)
      if (catMatch) {
        currentEspecialidade = catMatch[2].trim()
        return
      }
      
      // Tentar extrair item
      const itemMatch = trimmed.match(itemPattern)
      if (itemMatch) {
        const codigo = itemMatch[1]
        const descricao = itemMatch[2].trim()
        const unidade = itemMatch[3] || 'un'
        const quantidade = parseFloat((itemMatch[4] || '1').replace(',', '.')) || 1
        const valorUnit = parseValor(itemMatch[5])
        const valorTotal = parseValor(itemMatch[6]) || (valorUnit * quantidade)
        
        if (descricao.length > 5) {
          items.push({
            codigo,
            especialidade: currentEspecialidade,
            zona: currentZona,
            descricao,
            quantidade,
            unidade,
            valor_unitario: valorUnit,
            valor_total: valorTotal,
            percentagem: 0,
            estado: 'pendente'
          })
        }
        return
      }
      
      // Tentar padrão mais simples: "código descrição valor"
      const simpleMatch = trimmed.match(/^(\d+\.\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)*(?:[.,]\d{2})?)\s*â‚¬?$/)
      if (simpleMatch) {
        const codigo = simpleMatch[1]
        const descricao = simpleMatch[2].trim()
        const valor = parseValor(simpleMatch[3])
        
        if (descricao.length > 5 && valor > 0) {
          items.push({
            codigo,
            especialidade: currentEspecialidade,
            zona: currentZona,
            descricao,
            quantidade: 1,
            unidade: 'vg',
            valor_unitario: valor,
            valor_total: valor,
            percentagem: 0,
            estado: 'pendente'
          })
        }
      }
    })
    
    return items
  }

  // Extrair items de Excel baseado na estrutura GAVINHO
  const extractItemsFromExcel = (data) => {
    const items = []
    
    // Identificar headers - procurar linha com "Item", "Tipo", "Descrição"
    const headerRow = data.find(row => 
      row.some(cell => String(cell || '').toLowerCase() === 'item') &&
      row.some(cell => String(cell || '').toLowerCase().includes('descri'))
    )
    
    if (!headerRow) {
      return extractItemsGeneric(data)
    }

    const headerIndex = data.indexOf(headerRow)
    const headers = headerRow.map(h => String(h || '').toLowerCase().trim())
    
    // Mapear colunas baseado nos headers GAVINHO
    const colMap = {
      item: headers.findIndex(h => h === 'item'),
      tipo: headers.findIndex(h => h === 'tipo'),
      subtipo: headers.findIndex(h => h === 'subtipo'),
      zona: headers.findIndex(h => h === 'zona'),
      descricao: headers.findIndex(h => h.includes('descri')),
      unidade: headers.findIndex(h => h === 'un' || h === 'und' || h.includes('unid')),
      quantidade: headers.findIndex(h => h === 'qt' || h === 'qtd' || h.includes('quant')),
      valorUnit: headers.findIndex(h => h.includes('unit') || h.includes('preço u')),
      valorTotal: headers.findIndex(h => h.includes('total') && h.includes('preço')),
      percentagem: headers.findIndex(h => h.includes('%') || h.includes('exec')),
      status: headers.findIndex(h => h === 'status' || h.includes('estado'))
    }

    
    let currentEspecialidade = 'Geral'
    
    // Processar linhas após headers
    for (let i = headerIndex + 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.every(c => !c && c !== 0)) continue
      
      const itemCode = String(row[colMap.item] || '').trim()
      const tipo = String(row[colMap.tipo] || '').trim()
      const descricao = colMap.descricao >= 0 ? String(row[colMap.descricao] || '').trim() : ''
      
      // Linhas sem ponto no código são headers de categoria (1, 2, 3...)
      // Linhas com ponto são items (1.1, 1.2, 2.1...)
      if (itemCode && !itemCode.includes('.') && tipo) {
        // À‰ header de especialidade
        currentEspecialidade = tipo
        continue
      }
      
      // Verificar se é item válido (tem código com ponto ou tem descrição)
      if (!itemCode.includes('.') && !descricao) continue
      if (descricao.length < 2) continue
      
      // Extrair zona
      const zona = colMap.zona >= 0 ? String(row[colMap.zona] || 'Geral').trim() : 'Geral'
      
      // Extrair quantidade
      let quantidade = 1
      if (colMap.quantidade >= 0) {
        const qtVal = row[colMap.quantidade]
        quantidade = parseFloat(String(qtVal).replace(',', '.')) || 1
      }
      
      // Extrair unidade
      const unidade = colMap.unidade >= 0 ? String(row[colMap.unidade] || 'un').trim() : 'un'
      
      // Função para parse de valor (suporta formato americano e europeu)
      const parseValor = (str) => {
        if (!str) return 0
        let valorStr = String(str).replace(/[â‚¬\s]/g, '').trim()
        if (!valorStr) return 0
        
        // Detectar formato baseado na estrutura
        const hasComma = valorStr.includes(',')
        const hasDot = valorStr.includes('.')
        
        // Caso 1: Tem vírgula e ponto - determinar qual é separador de milhares
        if (hasComma && hasDot) {
          // Se vírgula vem antes do ponto (ex: 23,750.00) â†’ formato americano
          // Se ponto vem antes da vírgula (ex: 23.750,00) â†’ formato europeu
          if (valorStr.lastIndexOf(',') < valorStr.lastIndexOf('.')) {
            // Americano: remover vírgulas
            valorStr = valorStr.replace(/,/g, '')
          } else {
            // Europeu: remover pontos, trocar vírgula por ponto
            valorStr = valorStr.replace(/\./g, '').replace(',', '.')
          }
        }
        // Caso 2: Só tem ponto (ex: 55.00 ou 1500.00)
        else if (hasDot && !hasComma) {
          // Se termina com .XX (2 dígitos após ponto), é decimal
          // Se tem .XXX (3+ dígitos após ponto no meio), pode ser milhares
          const parts = valorStr.split('.')
          const lastPart = parts[parts.length - 1]
          if (parts.length === 2 && lastPart.length <= 2) {
            // À‰ decimal, manter como está (ex: 55.00, 1500.00)
          } else if (lastPart.length === 3 && parts.length > 1) {
            // Pode ser milhares europeu (ex: 1.500), remover pontos
            valorStr = valorStr.replace(/\./g, '')
          }
          // else manter como está
        }
        // Caso 3: Só tem vírgula (ex: 55,00 ou 1500,00)
        else if (hasComma && !hasDot) {
          // Se termina com ,XX (2 dígitos após vírgula), é decimal europeu
          const parts = valorStr.split(',')
          const lastPart = parts[parts.length - 1]
          if (parts.length === 2 && lastPart.length <= 2) {
            // Decimal europeu, trocar vírgula por ponto
            valorStr = valorStr.replace(',', '.')
          } else if (lastPart.length === 3 && parts.length > 1) {
            // Pode ser milhares americano, remover vírgulas
            valorStr = valorStr.replace(/,/g, '')
          }
        }
        
        return parseFloat(valorStr) || 0
      }
      
      // Extrair valor unitário
      let valorUnitario = 0
      if (colMap.valorUnit >= 0) {
        valorUnitario = parseValor(row[colMap.valorUnit])
      }
      
      // Extrair valor total
      let valorTotal = 0
      if (colMap.valorTotal >= 0) {
        valorTotal = parseValor(row[colMap.valorTotal])
      } else if (valorUnitario && quantidade) {
        valorTotal = valorUnitario * quantidade
      }
      
      // Se não temos valor unitário mas temos total, calcular
      if (!valorUnitario && valorTotal && quantidade) {
        valorUnitario = valorTotal / quantidade
      }
      
      // Extrair percentagem
      let percentagem = 0
      if (colMap.percentagem >= 0) {
        const percStr = String(row[colMap.percentagem] || '0').replace('%', '')
        percentagem = parseInt(percStr) || 0
      }
      
      // Extrair status
      let estado = 'pendente'
      if (colMap.status >= 0) {
        const statusVal = String(row[colMap.status] || '').toLowerCase()
        if (statusVal.includes('conclu') || statusVal.includes('feito') || statusVal.includes('done')) {
          estado = 'concluido'
        } else if (statusVal.includes('curso') || statusVal.includes('progress') || statusVal.includes('andamento')) {
          estado = 'em_curso'
        }
      } else if (percentagem >= 100) {
        estado = 'concluido'
      } else if (percentagem > 0) {
        estado = 'em_curso'
      }
      
      items.push({
        codigo: itemCode,
        especialidade: currentEspecialidade || tipo || 'Geral',
        subtipo: colMap.subtipo >= 0 ? String(row[colMap.subtipo] || '').trim() : '',
        zona: zona || 'Geral',
        descricao: descricao || `Item ${itemCode}`,
        quantidade,
        unidade,
        valor_unitario: valorUnitario,
        valor_total: valorTotal,
        percentagem,
        estado
      })
    }
    
    return items
  }
  
  // Extração genérica para formatos não reconhecidos
  const extractItemsGeneric = (data) => {
    const items = []
    let currentEspecialidade = 'Geral'
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (!row || row.every(c => !c)) continue
      
      const firstCell = String(row[0] || '').trim()
      
      // Detectar especialidade
      if (firstCell.match(/^\d+\.?\s*[A-Z]/) || ESPECIALIDADES_DEFAULT.some(e => firstCell.toUpperCase().includes(e.toUpperCase()))) {
        currentEspecialidade = firstCell.replace(/^\d+\.?\s*/, '')
        continue
      }
      
      // Tentar extrair item
      const descricao = row.find(c => typeof c === 'string' && c.length > 10)
      if (!descricao) continue
      
      items.push({
        especialidade: currentEspecialidade,
        zona: 'Geral',
        descricao: String(descricao).trim(),
        quantidade: 1,
        unidade: 'un',
        valor_total: 0,
        percentagem: 0,
        estado: 'pendente'
      })
    }
    
    return items
  }

  // Extração com IA (placeholder - vai usar Claude API)
  const extractWithAI = async (proposta, content) => {
    setExtracting(true)
    try {
      // Por agora, criar especialidades default se não existirem
      if (especialidades.length === 0) {
        const defaultEsp = ESPECIALIDADES_DEFAULT.slice(0, 5).map((nome, idx) => ({
          obra_id: obra.id,
          proposta_id: proposta.id,
          nome,
          ordem: idx
        }))
        await supabase.from('obra_especialidades').insert(defaultEsp)
      }
      
      // Recarregar dados
      fetchData()
    } catch (err) {
      console.error('Erro na extração:', err)
    } finally {
      setExtracting(false)
    }
  }

  // Importar items extraídos
  const handleImportExtracted = async () => {
    if (!showExtractedPreview) return
    
    setExtracting(true)
    try {
      const { proposta, items: extractedItems } = showExtractedPreview
      
      // Criar especialidades únicas
      const uniqueEsp = [...new Set(extractedItems.map(i => i.especialidade))]
      const espMap = {}
      
      for (let i = 0; i < uniqueEsp.length; i++) {
        const nome = uniqueEsp[i]
        let esp = especialidades.find(e => e.nome.toLowerCase() === nome.toLowerCase())
        
        if (!esp) {
          const { data } = await supabase
            .from('obra_especialidades')
            .insert([{ obra_id: obra.id, proposta_id: proposta.id, nome, ordem: i }])
            .select()
            .single()
          esp = data
        }
        espMap[nome] = esp?.id
      }
      
      // Criar zonas únicas
      const uniqueZonas = [...new Set(extractedItems.map(i => i.zona))]
      const zonaMap = {}
      
      for (let i = 0; i < uniqueZonas.length; i++) {
        const nome = uniqueZonas[i]
        let zona = zonas.find(z => z.nome.toLowerCase() === nome.toLowerCase())
        
        if (!zona) {
          const { data } = await supabase
            .from('obra_zonas')
            .insert([{ obra_id: obra.id, nome, ordem: i }])
            .select()
            .single()
          zona = data
        }
        zonaMap[nome] = zona?.id
      }
      
      // Criar items
      const itemsToInsert = extractedItems.map((item, idx) => ({
        obra_id: obra.id,
        proposta_id: proposta.id,
        especialidade_id: espMap[item.especialidade] || null,
        zona_id: zonaMap[item.zona] || null,
        codigo: item.codigo || null,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor_unitario: item.valor_unitario || null,
        valor_total: item.valor_total,
        estado: item.estado || 'pendente',
        percentagem: item.percentagem || 0,
        ordem: idx
      }))
      
      await supabase.from('obra_items').insert(itemsToInsert)
      
      // Atualizar valor total da proposta
      const total = extractedItems.reduce((sum, i) => sum + (i.valor_total || 0), 0)
      await supabase.from('obra_propostas').update({ valor_total: total }).eq('id', proposta.id)
      
      setShowExtractedPreview(null)
      fetchData()
    } catch (err) {
      console.error('Erro ao importar:', err)
      alert('Erro ao importar items')
    } finally {
      setExtracting(false)
    }
  }

  // CRUD Items
  const handleSaveItem = async () => {
    if (!itemForm.descricao.trim()) {
      alert('Descrição é obrigatória')
      return
    }
    
    try {
      const data = {
        obra_id: obra.id,
        especialidade_id: itemForm.especialidade_id || null,
        zona_id: itemForm.zona_id || null,
        descricao: itemForm.descricao,
        quantidade: parseFloat(itemForm.quantidade) || 1,
        unidade: itemForm.unidade || 'un',
        valor_unitario: parseFloat(itemForm.valor_unitario) || null,
        valor_total: itemForm.valor_unitario && itemForm.quantidade 
          ? parseFloat(itemForm.valor_unitario) * parseFloat(itemForm.quantidade) 
          : null,
        estado: itemForm.estado,
        percentagem: parseInt(itemForm.percentagem) || 0,
        data_prevista: itemForm.data_prevista || null,
        executor: itemForm.executor || null,
        notas: itemForm.notas || null
      }
      
      if (editingItem) {
        await supabase.from('obra_items').update(data).eq('id', editingItem.id)
      } else {
        data.ordem = items.length
        await supabase.from('obra_items').insert([data])
      }
      
      setShowItemModal(false)
      resetItemForm()
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao guardar item')
    }
  }

  const handleDeleteItem = async (item) => {
    if (!confirm('Eliminar este item?')) return
    try {
      await supabase.from('obra_items').delete().eq('id', item.id)
      fetchData()
    } catch (err) {
      alert('Erro ao eliminar')
    }
  }

  // Funções de seleção múltipla
  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    setSelectedItems(new Set())
  }

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const selectAllFiltered = () => {
    const allIds = new Set(filteredItems.map(i => i.id))
    setSelectedItems(allIds)
  }

  const deselectAll = () => {
    setSelectedItems(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    setDeleting(true)
    
    try {
      const idsToDelete = Array.from(selectedItems)
      const { error } = await supabase
        .from('obra_items')
        .delete()
        .in('id', idsToDelete)
      
      if (error) throw error
      
      setSelectedItems(new Set())
      setShowDeleteConfirm(false)
      setSelectMode(false)
      fetchData()
    } catch (err) {
      console.error('Erro ao eliminar items:', err)
      alert('Erro ao eliminar items: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Eliminar proposta e items associados
  const handleDeleteProposta = async () => {
    if (!propostaToDelete) return
    setDeleting(true)
    
    try {
      // Primeiro eliminar items associados À  proposta
      await supabase
        .from('obra_items')
        .delete()
        .eq('proposta_id', propostaToDelete.id)
      
      // Eliminar especialidades associadas À  proposta
      await supabase
        .from('obra_especialidades')
        .delete()
        .eq('proposta_id', propostaToDelete.id)
      
      // Eliminar a proposta
      const { error } = await supabase
        .from('obra_propostas')
        .delete()
        .eq('id', propostaToDelete.id)
      
      if (error) throw error
      
      setPropostaToDelete(null)
      fetchData()
    } catch (err) {
      console.error('Erro ao eliminar proposta:', err)
      alert('Erro ao eliminar proposta: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleUpdateItemStatus = async (item, estado, percentagem) => {
    try {
      await supabase.from('obra_items').update({ estado, percentagem }).eq('id', item.id)
      setActiveMenu(null)
      fetchData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const resetItemForm = () => {
    setItemForm({
      especialidade_id: '', zona_id: '', descricao: '', quantidade: '',
      unidade: 'un', valor_unitario: '', estado: 'pendente',
      percentagem: 0, data_prevista: '', executor: '', notas: ''
    })
    setEditingItem(null)
  }

  const openEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      especialidade_id: item.especialidade_id || '',
      zona_id: item.zona_id || '',
      descricao: item.descricao,
      quantidade: item.quantidade || '',
      unidade: item.unidade || 'un',
      valor_unitario: item.valor_unitario || '',
      estado: item.estado || 'pendente',
      percentagem: item.percentagem || 0,
      data_prevista: item.data_prevista || '',
      executor: item.executor || '',
      notas: item.notas || ''
    })
    setShowItemModal(true)
    setActiveMenu(null)
  }

  // Filtros
  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.executor?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchEstado = filterEstado === 'todos' || item.estado === filterEstado
    return matchSearch && matchEstado
  })

  // Agrupar por especialidade > zona
  const groupedItems = {}
  filteredItems.forEach(item => {
    const espId = item.especialidade_id || 'sem_especialidade'
    const zonaId = item.zona_id || 'sem_zona'
    
    if (!groupedItems[espId]) groupedItems[espId] = {}
    if (!groupedItems[espId][zonaId]) groupedItems[espId][zonaId] = []
    groupedItems[espId][zonaId].push(item)
  })

  // KPIs
  const totalItems = items.length
  const itemsConcluidos = items.filter(i => i.estado === 'concluido').length
  const itemsEmCurso = items.filter(i => i.estado === 'em_curso').length
  
  // Valor total contratado
  const valorTotal = items.reduce((sum, i) => sum + (i.valor_total || 0), 0)
  
  // Valor executado (baseado na percentagem de cada item)
  const valorExecutado = items.reduce((sum, i) => {
    const valorItem = i.valor_total || 0
    const percentagem = i.percentagem || 0
    return sum + (valorItem * percentagem / 100)
  }, 0)
  
  // Progresso = itens concluídos / total itens
  const progressoGeral = totalItems > 0 
    ? Math.round((itemsConcluidos / totalItems) * 100)
    : 0

  // Notificar componente pai sobre alterações nos stats
  useEffect(() => {
    if (onStatsUpdate && !loading) {
      onStatsUpdate({
        totalItems,
        itemsConcluidos,
        itemsEmCurso,
        progressoGeral,
        valorTotal,
        valorExecutado
      })
    }
  }, [totalItems, itemsConcluidos, itemsEmCurso, progressoGeral, valorTotal, valorExecutado, loading])

  const formatCurrency = (value) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const getEstadoBadge = (estado) => {
    const config = {
      'pendente': { label: 'Pendente', bg: 'var(--stone)', color: 'var(--brown)' },
      'em_curso': { label: 'Em Curso', bg: 'rgba(138, 158, 184, 0.15)', color: 'var(--info)' },
      'concluido': { label: 'Concluído', bg: 'rgba(122, 158, 122, 0.15)', color: 'var(--success)' }
    }
    return config[estado] || config.pendente
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={24} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--stone)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Total Items</div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{totalItems}</div>
        </div>
        <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--stone)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Concluídos</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{itemsConcluidos}</div>
        </div>
        <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--stone)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Em Curso</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--info)' }}>{itemsEmCurso}</div>
        </div>
        <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--stone)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Progresso</div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{progressoGeral}%</div>
        </div>
        <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--stone)' }}>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>Valor Executado</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(valorExecutado)}</div>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>de {formatCurrency(valorTotal)}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {!selectMode ? (
          <>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} />
              Carregar Proposta
            </button>
            <button 
              onClick={() => { resetItemForm(); setShowItemModal(true) }}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              Adicionar Item
            </button>
            {items.length > 0 && (
              <button 
                onClick={toggleSelectMode}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckSquare size={16} />
                Selecionar
              </button>
            )}
          </>
        ) : (
          <>
            <button 
              onClick={selectAllFiltered}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CheckSquare size={16} />
              Selecionar Todos ({filteredItems.length})
            </button>
            {selectedItems.size > 0 && (
              <button 
                onClick={deselectAll}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Square size={16} />
                Desmarcar
              </button>
            )}
            <button 
              onClick={toggleSelectMode}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <X size={16} />
              Cancelar
            </button>
            {selectedItems.size > 0 && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 16px', background: 'var(--error)', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
                }}
              >
                <Trash2 size={16} />
                Eliminar {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}
              </button>
            )}
          </>
        )}
        
        {/* Filtros */}
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 36px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px' }}
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', background: 'var(--white)' }}
        >
          <option value="todos">Todos os estados</option>
          <option value="pendente">Pendente</option>
          <option value="em_curso">Em Curso</option>
          <option value="concluido">Concluído</option>
        </select>
      </div>

      {/* Barra de seleção ativa */}
      {selectMode && selectedItems.size > 0 && (
        <div style={{ 
          marginBottom: '16px', padding: '12px 16px', 
          background: 'rgba(138, 158, 184, 0.15)', 
          borderRadius: '10px', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--info)' }}>
            {selectedItems.size} {selectedItems.size === 1 ? 'item selecionado' : 'items selecionados'}
          </span>
        </div>
      )}

      {/* Propostas carregadas */}
      {propostas.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'var(--cream)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <FileSpreadsheet size={18} style={{ color: 'var(--brown-light)' }} />
            <span style={{ fontSize: '13px', color: 'var(--brown-light)', fontWeight: 500 }}>Propostas Carregadas:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {propostas.map(p => {
              const itemCount = items.filter(i => i.proposta_id === p.id).length
              return (
                <div 
                  key={p.id} 
                  style={{ 
                    padding: '8px 12px', background: 'var(--white)', borderRadius: '8px', 
                    fontSize: '12px', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    border: '1px solid var(--stone)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.nome}</div>
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>
                      {itemCount} items  –  {p.valor_total ? formatCurrency(p.valor_total) : '-'}
                    </div>
                  </div>
                  <button
                    onClick={() => setPropostaToDelete(p)}
                    style={{ 
                      background: 'none', border: 'none', cursor: 'pointer', 
                      padding: '4px', color: 'var(--brown-light)',
                      borderRadius: '4px', display: 'flex', alignItems: 'center'
                    }}
                    title="Eliminar proposta"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabela tipo Excel */}
      {Object.keys(groupedItems).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--stone)' }}>
          <Package size={48} style={{ color: 'var(--brown-light)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>Sem items de tracking</h3>
          <p style={{ color: 'var(--brown-light)', marginBottom: '20px' }}>
            Carrega uma proposta adjudicada ou adiciona items manualmente
          </p>
          <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
            <Upload size={16} /> Carregar Proposta
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--stone)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '2px solid var(--stone)' }}>
                  {selectMode && (
                    <th style={{ padding: '12px 8px', width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                        onChange={(e) => e.target.checked ? selectAllFiltered() : deselectAll()}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--brown)', width: '70px' }}>Item</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--brown)' }}>Descrição</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--brown)', width: '60px' }}>Qtd</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--brown)', width: '50px' }}>Un</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--brown)', width: '100px' }}>P. Unit.</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--brown)', width: '100px' }}>P. Total</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--brown)', width: '70px' }}>%</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--brown)', width: '90px' }}>Estado</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--brown)', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedItems).map(([espId, zonaGroups]) => {
                  const esp = especialidades.find(e => e.id === espId) || { nome: 'Sem Especialidade' }
                  const isExpanded = expandedEspecialidades[espId] !== false
                  const espItems = Object.values(zonaGroups).flat()
                  const espProgress = espItems.length > 0 
                    ? Math.round(espItems.reduce((sum, i) => sum + (i.percentagem || 0), 0) / espItems.length)
                    : 0
                  const espValor = espItems.reduce((sum, i) => sum + (i.valor_total || 0), 0)
                  
                  return (
                    <React.Fragment key={espId}>
                      {/* Linha Especialidade */}
                      <tr 
                        onClick={() => setExpandedEspecialidades(prev => ({ ...prev, [espId]: !isExpanded }))}
                        style={{ background: 'var(--stone)', cursor: 'pointer' }}
                      >
                        {selectMode && <td></td>}
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--brown)' }}></td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--brown)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Package size={14} style={{ color: 'var(--warning)' }} />
                            {esp.nome}
                            <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--brown-light)', marginLeft: '8px' }}>
                              ({espItems.length} items)
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}></td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}></td>
                        <td style={{ padding: '10px 8px' }}></td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, fontSize: '12px' }}>{formatCurrency(espValor)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>{espProgress}%</td>
                        <td style={{ padding: '10px 8px' }}></td>
                        <td style={{ padding: '10px 8px' }}></td>
                      </tr>
                      
                      {/* Zonas e Items */}
                      {isExpanded && Object.entries(zonaGroups).map(([zonaId, zonaItems]) => {
                        const zona = zonas.find(z => z.id === zonaId) || { nome: 'Geral' }
                        const isZonaExpanded = expandedZonas[`${espId}-${zonaId}`] !== false
                        const zonaValor = zonaItems.reduce((sum, i) => sum + (i.valor_total || 0), 0)
                        
                        return (
                          <React.Fragment key={zonaId}>
                            {/* Linha Zona */}
                            <tr 
                              onClick={() => setExpandedZonas(prev => ({ ...prev, [`${espId}-${zonaId}`]: !isZonaExpanded }))}
                              style={{ background: 'rgba(0,0,0,0.02)', cursor: 'pointer' }}
                            >
                              {selectMode && <td></td>}
                              <td style={{ padding: '8px', textAlign: 'center' }}></td>
                              <td style={{ padding: '8px 16px 8px 24px', fontWeight: 600, fontSize: '12px', color: 'var(--brown)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {isZonaExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  <MapPin size={12} style={{ color: 'var(--info)' }} />
                                  {zona.nome}
                                  <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--brown-light)' }}>
                                    ({zonaItems.length})
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '8px' }}></td>
                              <td style={{ padding: '8px' }}></td>
                              <td style={{ padding: '8px' }}></td>
                              <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--brown-light)' }}>{formatCurrency(zonaValor)}</td>
                              <td style={{ padding: '8px' }}></td>
                              <td style={{ padding: '8px' }}></td>
                              <td style={{ padding: '8px' }}></td>
                            </tr>
                            
                            {/* Items */}
                            {isZonaExpanded && zonaItems.map(item => {
                              const badge = getEstadoBadge(item.estado)
                              const isSelected = selectedItems.has(item.id)
                              
                              return (
                                <tr 
                                  key={item.id}
                                  style={{ 
                                    borderBottom: '1px solid var(--stone)',
                                    background: isSelected ? 'rgba(138, 158, 184, 0.1)' : 'var(--white)'
                                  }}
                                >
                                  {selectMode && (
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={() => toggleItemSelection(item.id)}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                      />
                                    </td>
                                  )}
                                  <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', fontWeight: 500, color: 'var(--brown-light)' }}>
                                    {item.codigo || '-'}
                                  </td>
                                  <td style={{ padding: '10px 16px' }}>
                                    <div style={{ 
                                      fontWeight: 500, 
                                      color: item.estado === 'concluido' ? 'var(--brown-light)' : 'var(--brown)',
                                      textDecoration: item.estado === 'concluido' ? 'line-through' : 'none'
                                    }}>
                                      {item.descricao}
                                    </div>
                                    {item.executor && (
                                      <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>
                                        <User size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                        {item.executor}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px' }}>
                                    {item.quantidade || 1}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--brown-light)' }}>
                                    {item.unidade || 'un'}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: 'var(--brown-light)' }}>
                                    {formatCurrency(item.valor_unitario || (item.valor_total && item.quantidade ? item.valor_total / item.quantidade : null))}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                                    {formatCurrency(item.valor_total)}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                      <div style={{ width: '30px', height: '4px', background: 'var(--stone)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ 
                                          width: `${item.percentagem || 0}%`, 
                                          height: '100%', 
                                          background: item.estado === 'concluido' ? 'var(--success)' : 'var(--info)' 
                                        }} />
                                      </div>
                                      <span style={{ fontSize: '11px', fontWeight: 500, minWidth: '28px' }}>{item.percentagem || 0}%</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <span style={{ 
                                      padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                                      background: badge.bg, color: badge.color, whiteSpace: 'nowrap'
                                    }}>
                                      {badge.label}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center', position: 'relative' }}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item.id ? null : item.id) }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)' }}
                                    >
                                      <MoreVertical size={16} />
                                    </button>
                                    
                                    {activeMenu === item.id && (
                                      <div style={{ position: 'absolute', right: '16px', top: '100%', background: 'var(--white)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '140px', zIndex: 100, overflow: 'hidden' }}>
                                        <button onClick={() => openEditItem(item)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', textAlign: 'left' }}>
                                          <Edit size={12} /> Editar
                                        </button>
                                        <button onClick={() => handleUpdateItemStatus(item, 'em_curso', 50)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--info)', textAlign: 'left' }}>
                                          <PlayCircle size={12} /> Em Curso
                                        </button>
                                        <button onClick={() => handleUpdateItemStatus(item, 'concluido', 100)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--success)', textAlign: 'left' }}>
                                          <CheckCircle size={12} /> Concluir
                                        </button>
                                        <div style={{ borderTop: '1px solid var(--stone)', margin: '4px 0' }} />
                                        <button onClick={() => { handleDeleteItem(item); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--error)', textAlign: 'left' }}>
                                          <Trash2 size={12} /> Eliminar
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
              {/* Footer com totais */}
              <tfoot>
                <tr style={{ background: 'var(--cream)', borderTop: '2px solid var(--stone)' }}>
                  {selectMode && <td></td>}
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}></td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px' }}>TOTAL</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>{totalItems}</td>
                  <td style={{ padding: '12px 8px' }}></td>
                  <td style={{ padding: '12px 8px' }}></td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>{formatCurrency(valorTotal)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700 }}>{progressoGeral}%</td>
                  <td style={{ padding: '12px 8px' }}></td>
                  <td style={{ padding: '12px 8px' }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal Upload */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowUploadModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '500px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Carregar Proposta</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed var(--stone)', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)', marginBottom: '12px' }} />
                    <p style={{ color: 'var(--brown-light)' }}>A processar ficheiro...</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} style={{ color: 'var(--brown-light)', marginBottom: '12px' }} />
                    <p style={{ fontWeight: 500, marginBottom: '4px' }}>Clica para selecionar ficheiro</p>
                    <p style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Excel (.xlsx, .xls) ou CSV</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--cream)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Sparkles size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '12px', color: 'var(--brown-light)', lineHeight: 1.5 }}>
                  O sistema irá extrair automaticamente os items da proposta, organizando por especialidade e zona.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Extração */}
      {showExtractedPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowExtractedPreview(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', margin: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--stone)' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Items Extraídos</h2>
                <p style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{showExtractedPreview.items.length} items encontrados</p>
              </div>
              <button onClick={() => setShowExtractedPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Código</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Especialidade</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Zona</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, maxWidth: '250px' }}>Descrição</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>Qtd</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>Valor</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>%</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {showExtractedPreview.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--stone)' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--warning)' }}>{item.codigo || '-'}</td>
                      <td style={{ padding: '8px' }}>{item.especialidade}</td>
                      <td style={{ padding: '8px' }}>{item.zona}</td>
                      <td style={{ padding: '8px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.descricao}>{item.descricao}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantidade} {item.unidade}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.valor_total)}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 500 }}>{item.percentagem}%</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '2px 6px', 
                          borderRadius: '8px', 
                          fontSize: '10px',
                          fontWeight: 600,
                          background: item.estado === 'concluido' ? 'rgba(122, 158, 122, 0.15)' : item.estado === 'em_curso' ? 'rgba(138, 158, 184, 0.15)' : 'var(--stone)',
                          color: item.estado === 'concluido' ? 'var(--success)' : item.estado === 'em_curso' ? 'var(--info)' : 'var(--brown)'
                        }}>
                          {item.estado === 'concluido' ? 'Concluído' : item.estado === 'em_curso' ? 'Em Curso' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowExtractedPreview(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleImportExtracted} className="btn btn-primary" disabled={extracting}>
                {extracting ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                Importar {showExtractedPreview.items.length} Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Item */}
      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowItemModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', margin: '20px', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setShowItemModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição *</label>
                  <input type="text" value={itemForm.descricao} onChange={e => setItemForm({...itemForm, descricao: e.target.value})} placeholder="Descrição do trabalho" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Especialidade</label>
                  <select value={itemForm.especialidade_id} onChange={e => setItemForm({...itemForm, especialidade_id: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    <option value="">Selecionar...</option>
                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Zona</label>
                  <select value={itemForm.zona_id} onChange={e => setItemForm({...itemForm, zona_id: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    <option value="">Selecionar...</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Quantidade</label>
                  <input type="number" value={itemForm.quantidade} onChange={e => setItemForm({...itemForm, quantidade: e.target.value})} placeholder="1" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Unidade</label>
                  <select value={itemForm.unidade} onChange={e => setItemForm({...itemForm, unidade: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    <option value="un">un</option>
                    <option value="m²">m²</option>
                    <option value="m">m</option>
                    <option value="ml">ml</option>
                    <option value="kg">kg</option>
                    <option value="vg">vg</option>
                    <option value="cj">cj</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Valor Unitário (â‚¬)</label>
                  <input type="number" step="0.01" value={itemForm.valor_unitario} onChange={e => setItemForm({...itemForm, valor_unitario: e.target.value})} placeholder="0.00" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Estado</label>
                  <select value={itemForm.estado} onChange={e => setItemForm({...itemForm, estado: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                    <option value="pendente">Pendente</option>
                    <option value="em_curso">Em Curso</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Progresso (%)</label>
                  <input type="number" min="0" max="100" value={itemForm.percentagem} onChange={e => setItemForm({...itemForm, percentagem: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Data Prevista</label>
                  <input type="date" value={itemForm.data_prevista} onChange={e => setItemForm({...itemForm, data_prevista: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Executor/Fornecedor</label>
                  <input type="text" value={itemForm.executor} onChange={e => setItemForm({...itemForm, executor: e.target.value})} placeholder="Nome" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Notas</label>
                  <textarea value={itemForm.notas} onChange={e => setItemForm({...itemForm, notas: e.target.value})} rows={2} placeholder="Observações..." style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowItemModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveItem} className="btn btn-primary" disabled={!itemForm.descricao.trim()}>
                {editingItem ? 'Guardar' : 'Criar Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay menu */}
      {activeMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setActiveMenu(null)} />}

      {/* Modal Confirmação Eliminação em Massa */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '450px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(220, 38, 38, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={28} style={{ color: 'var(--error)' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Eliminar {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}?</h2>
              <p style={{ color: 'var(--brown-light)', fontSize: '14px', marginBottom: '24px' }}>
                Esta ação não pode ser desfeita. Todos os items selecionados serão permanentemente eliminados.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  className="btn btn-outline"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', background: 'var(--error)', color: 'white',
                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
                  }}
                >
                  {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                  {deleting ? 'A eliminar...' : 'Sim, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação Eliminar Proposta */}
      {propostaToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setPropostaToDelete(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '450px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: 'rgba(220, 38, 38, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={28} style={{ color: 'var(--error)' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Eliminar proposta?</h2>
              <p style={{ fontWeight: 500, marginBottom: '8px' }}>{propostaToDelete.nome}</p>
              <p style={{ color: 'var(--brown-light)', fontSize: '14px', marginBottom: '24px' }}>
                Esta ação irá eliminar a proposta e todos os {items.filter(i => i.proposta_id === propostaToDelete.id).length} items associados. Não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => setPropostaToDelete(null)} 
                  className="btn btn-outline"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteProposta}
                  disabled={deleting}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', background: 'var(--error)', color: 'white',
                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
                  }}
                >
                  {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                  {deleting ? 'A eliminar...' : 'Sim, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
