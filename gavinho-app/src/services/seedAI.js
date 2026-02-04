// =====================================================
// SEED AI SERVICE
// Serviço para parsing inteligente de dados usando Claude API
// =====================================================

// Schemas das tabelas suportadas
const TABLE_SCHEMAS = {
  projeto_entregaveis: {
    label: 'Entregáveis',
    fields: {
      projeto_id: { type: 'uuid', required: true, description: 'ID do projeto (UUID)' },
      codigo: { type: 'string', required: true, description: 'Código do entregável (ex: ARQ.01)' },
      nome: { type: 'string', required: true, description: 'Nome do entregável' },
      fase: { type: 'string', required: false, description: 'Fase do projeto (Projeto Base, Execução, etc)' },
      categoria: { type: 'string', required: false, description: 'Categoria (Arquitetura, Estruturas, etc)' },
      status: { type: 'enum', values: ['pendente', 'em_progresso', 'concluido', 'cancelado'], required: false },
      prioridade: { type: 'enum', values: ['baixa', 'media', 'alta', 'urgente'], required: false },
      responsavel_id: { type: 'uuid', required: false },
      data_prevista: { type: 'date', required: false },
      notas: { type: 'text', required: false }
    },
    detectKeywords: ['entregável', 'entregáveis', 'deliverable', 'peça', 'desenho', 'planta', 'corte', 'alçado']
  },

  tarefas: {
    label: 'Tarefas',
    fields: {
      projeto_id: { type: 'uuid', required: false },
      titulo: { type: 'string', required: true, description: 'Título da tarefa' },
      descricao: { type: 'text', required: false },
      status: { type: 'enum', values: ['pendente', 'em_progresso', 'concluida', 'cancelada'], required: false },
      prioridade: { type: 'enum', values: ['baixa', 'media', 'alta', 'urgente'], required: false },
      responsavel_id: { type: 'uuid', required: false },
      data_inicio: { type: 'date', required: false },
      data_fim: { type: 'date', required: false }
    },
    detectKeywords: ['tarefa', 'tarefas', 'task', 'todo', 'fazer', 'pendente', 'ação']
  },

  utilizadores: {
    label: 'Colaboradores',
    fields: {
      nome: { type: 'string', required: true },
      email: { type: 'email', required: true },
      cargo: { type: 'string', required: false },
      departamento: { type: 'string', required: false },
      telefone: { type: 'string', required: false },
      data_entrada: { type: 'date', required: false },
      tipo_contrato: { type: 'string', required: false },
      regime: { type: 'string', required: false },
      ativo: { type: 'boolean', default: true }
    },
    detectKeywords: ['colaborador', 'colaboradores', 'funcionário', 'equipa', 'pessoa', 'employee', 'staff']
  },

  fornecedores: {
    label: 'Fornecedores',
    fields: {
      nome: { type: 'string', required: true },
      categoria: { type: 'string', required: false },
      contacto_nome: { type: 'string', required: false },
      email: { type: 'email', required: false },
      telefone: { type: 'string', required: false },
      morada: { type: 'text', required: false },
      nif: { type: 'string', required: false },
      notas: { type: 'text', required: false }
    },
    detectKeywords: ['fornecedor', 'fornecedores', 'supplier', 'empresa', 'subempreiteiro', 'prestador']
  },

  propostas: {
    label: 'Propostas',
    fields: {
      projeto_id: { type: 'uuid', required: false },
      fornecedor_id: { type: 'uuid', required: false },
      numero: { type: 'string', required: false },
      descricao: { type: 'text', required: false },
      valor: { type: 'number', required: false },
      data_proposta: { type: 'date', required: false },
      data_validade: { type: 'date', required: false },
      status: { type: 'enum', values: ['pendente', 'aprovada', 'rejeitada', 'expirada'], required: false }
    },
    detectKeywords: ['proposta', 'propostas', 'orçamento', 'cotação', 'quote', 'budget']
  },

  projeto_entregas: {
    label: 'Entregas ao Cliente',
    fields: {
      projeto_id: { type: 'uuid', required: true },
      numero: { type: 'number', required: false },
      titulo: { type: 'string', required: true },
      descricao: { type: 'text', required: false },
      data: { type: 'date', required: false },
      observacoes: { type: 'text', required: false },
      tipo_entrega: { type: 'enum', values: ['formal', 'mail', 'reuniao'], required: false }
    },
    detectKeywords: ['entrega', 'entregas', 'delivery', 'envio', 'cliente']
  }
}

/**
 * Deteta automaticamente a tabela de destino com base no conteúdo
 */
export function detectTargetTable(text) {
  const normalizedText = text.toLowerCase()

  let bestMatch = null
  let bestScore = 0

  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    let score = 0
    for (const keyword of schema.detectKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score++
      }
    }

    // Verificar também se há campos específicos mencionados
    for (const fieldName of Object.keys(schema.fields)) {
      if (normalizedText.includes(fieldName.replace('_', ' '))) {
        score += 0.5
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = tableName
    }
  }

  return {
    table: bestMatch || 'tarefas',
    confidence: bestScore > 0 ? Math.min(bestScore / 5, 1) : 0.3,
    schema: TABLE_SCHEMAS[bestMatch || 'tarefas']
  }
}

/**
 * Gera o prompt para o Claude API baseado no schema da tabela
 */
function generateParsingPrompt(tableName, schema) {
  const fieldDescriptions = Object.entries(schema.fields)
    .map(([name, config]) => {
      let desc = `  - ${name}: ${config.type}`
      if (config.required) desc += ' (OBRIGATÓRIO)'
      if (config.values) desc += ` - valores: ${config.values.join(', ')}`
      if (config.description) desc += ` - ${config.description}`
      return desc
    })
    .join('\n')

  return `Analisa o seguinte texto e extrai dados estruturados para a tabela "${schema.label}".

SCHEMA DA TABELA:
${fieldDescriptions}

REGRAS:
1. Retorna APENAS um array JSON válido com os dados extraídos
2. Cada objeto no array deve ter os campos do schema
3. Converte datas para formato YYYY-MM-DD
4. Valores vazios devem ser null
5. Normaliza status para os valores permitidos
6. Se não conseguires extrair um campo obrigatório, omite o registo
7. Não incluas explicações, apenas o JSON

RESPOSTA ESPERADA (exemplo):
[
  { "campo1": "valor1", "campo2": "valor2" },
  { "campo1": "valor3", "campo2": "valor4" }
]`
}

/**
 * Chama a API do Claude para parsing inteligente
 */
export async function parseWithClaude(text, tableName, apiKey) {
  const schema = TABLE_SCHEMAS[tableName]
  if (!schema) {
    throw new Error(`Tabela não suportada: ${tableName}`)
  }

  const systemPrompt = generateParsingPrompt(tableName, schema)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Extrai os dados do seguinte texto:\n\n${text}`
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Erro na API Claude')
    }

    const data = await response.json()
    const content = data.content[0]?.text || '[]'

    // Extrair JSON da resposta (pode estar envolvido em markdown)
    let jsonStr = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    // Tentar encontrar array JSON
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      jsonStr = arrayMatch[0]
    }

    const parsed = JSON.parse(jsonStr)

    return {
      success: true,
      data: Array.isArray(parsed) ? parsed : [parsed],
      tokensUsed: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0
      }
    }
  } catch (err) {
    console.error('Erro no parsing com Claude:', err)
    return {
      success: false,
      error: err.message,
      data: []
    }
  }
}

/**
 * Parsing local simples (fallback sem IA)
 */
export function parseSimple(text, tableName, format = 'auto') {
  const lines = text.trim().split('\n').filter(l => l.trim())

  if (lines.length === 0) return []

  // Detectar formato
  if (format === 'auto') {
    if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
      format = 'json'
    } else if (lines[0].includes(',') && lines.length > 1) {
      format = 'csv'
    } else if (lines[0].includes('|')) {
      format = 'pipe'
    } else {
      format = 'lines'
    }
  }

  switch (format) {
    case 'json':
      try {
        const parsed = JSON.parse(text)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return []
      }

    case 'csv': {
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj = {}
        headers.forEach((h, i) => {
          if (values[i]) obj[h] = values[i]
        })
        return obj
      }).filter(obj => Object.keys(obj).length > 0)
    }

    case 'pipe': {
      const schema = TABLE_SCHEMAS[tableName]
      const fields = schema ? Object.keys(schema.fields) : []
      return lines.map(line => {
        const values = line.split('|').map(v => v.trim())
        const obj = {}
        fields.forEach((f, i) => {
          if (values[i]) obj[f] = values[i]
        })
        return obj
      }).filter(obj => Object.keys(obj).length > 0)
    }

    default:
      return []
  }
}

/**
 * Valida dados contra o schema da tabela
 */
export function validateData(data, tableName) {
  const schema = TABLE_SCHEMAS[tableName]
  if (!schema) return { valid: [], invalid: [] }

  const valid = []
  const invalid = []

  for (const row of data) {
    const errors = []

    // Verificar campos obrigatórios
    for (const [field, config] of Object.entries(schema.fields)) {
      if (config.required && !row[field]) {
        errors.push(`Campo obrigatório em falta: ${field}`)
      }

      // Validar enums
      if (config.values && row[field] && !config.values.includes(row[field])) {
        errors.push(`Valor inválido para ${field}: ${row[field]}`)
      }
    }

    if (errors.length > 0) {
      invalid.push({ row, errors })
    } else {
      valid.push(row)
    }
  }

  return { valid, invalid }
}

/**
 * Obtém o schema de uma tabela
 */
export function getTableSchema(tableName) {
  return TABLE_SCHEMAS[tableName] || null
}

/**
 * Lista todas as tabelas suportadas
 */
export function getSupportedTables() {
  return Object.entries(TABLE_SCHEMAS).map(([key, schema]) => ({
    key,
    label: schema.label,
    fields: Object.keys(schema.fields),
    required: Object.entries(schema.fields)
      .filter(([, config]) => config.required)
      .map(([name]) => name)
  }))
}

export default {
  detectTargetTable,
  parseWithClaude,
  parseSimple,
  validateData,
  getTableSchema,
  getSupportedTables,
  TABLE_SCHEMAS
}
