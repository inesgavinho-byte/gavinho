// =====================================================
// SEED INTELIGENTE COMPONENT
// Componente para importação inteligente com IA
// =====================================================

import { useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Sparkles,
  Upload,
  FileText,
  Loader,
  CheckCircle,
  AlertCircle,
  Play,
  X,
  Eye,
  Trash2,
  RefreshCw,
  Zap,
  Table,
  FileJson,
  FilePlus
} from 'lucide-react'
import { SeedPreview } from './SeedPreview'
import seedAI, {
  detectTargetTable,
  parseWithClaude,
  parseSimple,
  validateData,
  getSupportedTables
} from '../../services/seedAI'

const styles = {
  container: {
    background: 'white',
    borderRadius: '16px',
    border: '1px solid var(--stone)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    color: 'white'
  },
  iconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.9
  },
  content: {
    padding: '24px'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--brown)',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px'
  },
  tableOption: {
    padding: '12px 16px',
    border: '2px solid var(--stone)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'white',
    textAlign: 'left'
  },
  tableOptionSelected: {
    borderColor: '#8b5cf6',
    background: 'rgba(139, 92, 246, 0.05)'
  },
  tableOptionLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--brown)'
  },
  tableOptionFields: {
    fontSize: '11px',
    color: 'var(--brown-light)',
    marginTop: '4px'
  },
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '16px',
    border: '1px solid var(--stone)',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical',
    boxSizing: 'border-box',
    lineHeight: 1.5
  },
  dropZone: {
    border: '2px dashed var(--stone)',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'var(--cream)'
  },
  dropZoneActive: {
    borderColor: '#8b5cf6',
    background: 'rgba(139, 92, 246, 0.05)'
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px'
  },
  btn: {
    flex: 1,
    padding: '14px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    color: 'white',
    border: 'none'
  },
  btnOutline: {
    background: 'white',
    color: 'var(--brown)',
    border: '1px solid var(--stone)'
  },
  btnGhost: {
    background: 'transparent',
    color: 'var(--brown-light)',
    border: 'none'
  },
  detectionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6'
  },
  stats: {
    display: 'flex',
    gap: '24px',
    padding: '16px 20px',
    background: 'var(--cream)',
    borderRadius: '10px',
    marginBottom: '20px'
  },
  stat: {
    textAlign: 'center'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--brown)'
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--brown-light)'
  },
  apiKeyInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid var(--stone)',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'monospace'
  },
  toggle: {
    display: 'flex',
    background: 'var(--cream)',
    borderRadius: '10px',
    padding: '4px'
  },
  toggleOption: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--brown-light)',
    transition: 'all 0.2s'
  },
  toggleOptionActive: {
    background: 'white',
    color: 'var(--brown)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  logs: {
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '16px',
    background: '#1a1a1a',
    borderRadius: '10px',
    fontFamily: 'monospace',
    fontSize: '12px'
  },
  logLine: {
    marginBottom: '4px',
    display: 'flex',
    gap: '8px'
  },
  logTime: {
    color: '#666'
  },
  logSuccess: { color: '#4ade80' },
  logError: { color: '#f87171' },
  logInfo: { color: '#60a5fa' },
  logWarning: { color: '#facc15' }
}

export function SeedInteligente({ onSuccess, linkedProjectId }) {
  // Estados
  const [inputText, setInputText] = useState('')
  const [selectedTable, setSelectedTable] = useState(null)
  const [useAI, setUseAI] = useState(true)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') || '')
  const [isDragging, setIsDragging] = useState(false)

  // Estados de processo
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState([])
  const [invalidData, setInvalidData] = useState([])
  const [detectedTable, setDetectedTable] = useState(null)
  const [logs, setLogs] = useState([])
  const [isInserting, setIsInserting] = useState(false)
  const [insertResult, setInsertResult] = useState(null)

  // Tabelas suportadas
  const supportedTables = useMemo(() => getSupportedTables(), [])

  // Adicionar log
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('pt-PT')
    setLogs(prev => [...prev, { message, type, timestamp }])
  }, [])

  // Guardar API key (localStorage + Supabase para persistência)
  const saveApiKey = useCallback((key) => {
    setApiKey(key)
    if (key) {
      localStorage.setItem('claude_api_key', key)
      // Also persist to Supabase for cross-session persistence
      supabase.from('garvis_configuracao')
        .upsert({ chave: 'claude_api_key', valor: key }, { onConflict: 'chave' })
        .then(() => {})
        .catch(() => {})
    }
  }, [])

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer?.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setInputText(event.target.result)
      addLog(`Ficheiro carregado: ${file.name}`, 'success')
    }

    if (file.type === 'application/pdf') {
      addLog('PDFs requerem extração manual por agora', 'warning')
    } else {
      reader.readAsText(file)
    }
  }, [addLog])

  // Parse data
  const handleParse = useCallback(async () => {
    if (!inputText.trim()) {
      addLog('Nenhum texto para processar', 'warning')
      return
    }

    setIsProcessing(true)
    setLogs([])
    setParsedData([])
    setInvalidData([])
    setInsertResult(null)

    try {
      // Detectar tabela se não selecionada
      let tableName = selectedTable
      if (!tableName) {
        addLog('A detetar tipo de dados...', 'info')
        const detection = detectTargetTable(inputText)
        tableName = detection.table
        setDetectedTable(detection)
        addLog(`Tabela detetada: ${detection.schema.label} (${Math.round(detection.confidence * 100)}% confiança)`, 'success')
      }

      let result
      if (useAI && apiKey) {
        addLog('A processar com Claude AI...', 'info')
        result = await parseWithClaude(inputText, tableName, apiKey)

        if (result.success) {
          addLog(`Claude extraiu ${result.data.length} registos (${result.tokensUsed?.input || 0} tokens input, ${result.tokensUsed?.output || 0} tokens output)`, 'success')
        } else {
          addLog(`Erro Claude: ${result.error}`, 'error')
          addLog('A tentar parsing local...', 'info')
          result = { success: true, data: parseSimple(inputText, tableName, 'auto') }
        }
      } else {
        addLog('A processar localmente...', 'info')
        result = { success: true, data: parseSimple(inputText, tableName, 'auto') }
      }

      if (result.data.length === 0) {
        addLog('Nenhum dado extraído. Verifique o formato.', 'warning')
        return
      }

      // Adicionar projeto_id se necessário
      if (linkedProjectId && (tableName === 'projeto_entregaveis' || tableName === 'tarefas' || tableName === 'projeto_entregas')) {
        result.data = result.data.map(row => ({
          ...row,
          projeto_id: row.projeto_id || linkedProjectId
        }))
      }

      // Validar dados
      addLog('A validar dados...', 'info')
      const validation = validateData(result.data, tableName)

      setParsedData(validation.valid)
      setInvalidData(validation.invalid)

      addLog(`Validação: ${validation.valid.length} válidos, ${validation.invalid.length} com erros`, validation.invalid.length > 0 ? 'warning' : 'success')

    } catch (err) {
      addLog(`Erro: ${err.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [inputText, selectedTable, useAI, apiKey, linkedProjectId, addLog])

  // Insert data
  const handleInsert = useCallback(async () => {
    if (parsedData.length === 0) {
      addLog('Nenhum dado válido para inserir', 'warning')
      return
    }

    const tableName = selectedTable || detectedTable?.table
    if (!tableName) {
      addLog('Selecione uma tabela de destino', 'warning')
      return
    }

    setIsInserting(true)
    addLog(`A inserir ${parsedData.length} registos em ${tableName}...`, 'info')

    let successCount = 0
    let errorCount = 0

    for (const row of parsedData) {
      try {
        const { error } = await supabase.from(tableName).insert([row])

        if (error) {
          addLog(`Erro: ${error.message}`, 'error')
          errorCount++
        } else {
          successCount++
        }
      } catch (err) {
        addLog(`Erro: ${err.message}`, 'error')
        errorCount++
      }
    }

    const result = { success: errorCount === 0, successCount, errorCount }
    setInsertResult(result)

    addLog(`Concluído: ${successCount} inseridos, ${errorCount} erros`, errorCount === 0 ? 'success' : 'warning')

    if (errorCount === 0 && onSuccess) {
      onSuccess(result)
    }

    setIsInserting(false)
  }, [parsedData, selectedTable, detectedTable, addLog, onSuccess])

  // Reset
  const handleReset = useCallback(() => {
    setInputText('')
    setParsedData([])
    setInvalidData([])
    setDetectedTable(null)
    setLogs([])
    setInsertResult(null)
  }, [])

  // Delete row from preview
  const handleDeleteRow = useCallback((idx) => {
    setParsedData(prev => prev.filter((_, i) => i !== idx))
  }, [])

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.iconBox}>
          <Sparkles size={28} />
        </div>
        <div>
          <h3 style={styles.title}>Seed Inteligente com IA</h3>
          <p style={styles.subtitle}>
            Cole texto, email ou CSV - a IA extrai e estrutura os dados automaticamente
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Toggle AI/Manual */}
        <div style={{ ...styles.section, ...styles.grid, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div style={styles.sectionTitle}>
              <Zap size={16} />
              Modo de Processamento
            </div>
            <div style={styles.toggle}>
              <button
                style={{
                  ...styles.toggleOption,
                  ...(useAI ? styles.toggleOptionActive : {})
                }}
                onClick={() => setUseAI(true)}
              >
                <Sparkles size={14} style={{ marginRight: '6px' }} />
                Com IA (Claude)
              </button>
              <button
                style={{
                  ...styles.toggleOption,
                  ...(!useAI ? styles.toggleOptionActive : {})
                }}
                onClick={() => setUseAI(false)}
              >
                <Table size={14} style={{ marginRight: '6px' }} />
                Parsing Local
              </button>
            </div>
          </div>

          {useAI && (
            <div>
              <div style={styles.sectionTitle}>
                <FileJson size={16} />
                API Key Claude
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => saveApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={styles.apiKeyInput}
              />
            </div>
          )}
        </div>

        {/* Table Selection */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <Table size={16} />
            Tabela de Destino
            {detectedTable && !selectedTable && (
              <span style={styles.detectionBadge}>
                <Sparkles size={12} />
                Auto-detetado: {detectedTable.schema.label}
              </span>
            )}
          </div>
          <div style={styles.grid}>
            {supportedTables.map(table => (
              <div
                key={table.key}
                style={{
                  ...styles.tableOption,
                  ...(selectedTable === table.key ? styles.tableOptionSelected : {})
                }}
                onClick={() => setSelectedTable(table.key === selectedTable ? null : table.key)}
              >
                <div style={styles.tableOptionLabel}>{table.label}</div>
                <div style={styles.tableOptionFields}>
                  {table.required.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <FileText size={16} />
            Dados de Entrada
          </div>

          {/* Drop Zone */}
          <div
            style={{
              ...styles.dropZone,
              ...(isDragging ? styles.dropZoneActive : {}),
              marginBottom: '12px'
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', color: 'var(--brown)' }}>
              Arraste ficheiros aqui ou cole texto abaixo
            </div>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>
              CSV, TXT, JSON suportados
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Cole aqui o texto a processar...\n\nExemplos:\n- Lista de emails com nomes e cargos\n- Tabela CSV copiada do Excel\n- Texto de email com lista de tarefas\n- JSON exportado de outra ferramenta`}
            style={styles.textarea}
          />

          {/* Action Buttons */}
          <div style={styles.buttons}>
            <button
              onClick={handleParse}
              disabled={isProcessing || !inputText.trim()}
              style={{ ...styles.btn, ...styles.btnPrimary }}
            >
              {isProcessing ? (
                <>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  A processar...
                </>
              ) : (
                <>
                  <Eye size={18} />
                  Analisar e Pré-visualizar
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              style={{ ...styles.btn, ...styles.btnGhost, flex: 'none', padding: '14px' }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <FileText size={16} />
              Log de Processamento
            </div>
            <div style={styles.logs}>
              {logs.map((log, idx) => (
                <div key={idx} style={styles.logLine}>
                  <span style={styles.logTime}>[{log.timestamp}]</span>
                  <span style={styles[`log${log.type.charAt(0).toUpperCase() + log.type.slice(1)}`] || styles.logInfo}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {(parsedData.length > 0 || invalidData.length > 0) && (
          <div style={styles.section}>
            <SeedPreview
              data={parsedData}
              invalidData={invalidData}
              schema={seedAI.TABLE_SCHEMAS[selectedTable || detectedTable?.table]}
              tableName={selectedTable || detectedTable?.table}
              onDelete={handleDeleteRow}
            />

            {/* Insert Button */}
            {parsedData.length > 0 && !insertResult && (
              <div style={{ ...styles.buttons, marginTop: '20px' }}>
                <button
                  onClick={handleInsert}
                  disabled={isInserting}
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                >
                  {isInserting ? (
                    <>
                      <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      A inserir...
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      Inserir {parsedData.length} Registos
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Result */}
            {insertResult && (
              <div
                style={{
                  ...styles.stats,
                  marginTop: '20px',
                  background: insertResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                }}
              >
                <div style={styles.stat}>
                  <div style={{ ...styles.statValue, color: 'var(--success)' }}>
                    {insertResult.successCount}
                  </div>
                  <div style={styles.statLabel}>Inseridos</div>
                </div>
                {insertResult.errorCount > 0 && (
                  <div style={styles.stat}>
                    <div style={{ ...styles.statValue, color: 'var(--error)' }}>
                      {insertResult.errorCount}
                    </div>
                    <div style={styles.statLabel}>Erros</div>
                  </div>
                )}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {insertResult.success ? (
                    <CheckCircle size={32} color="var(--success)" />
                  ) : (
                    <AlertCircle size={32} color="var(--error)" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SeedInteligente
