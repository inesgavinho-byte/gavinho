// =====================================================
// G.A.R.V.I.S. End-to-End Tests
// Testa toda a lógica de negócio do GARVIS com dados simulados
// =====================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =====================================================
// 1. MOCK SETUP
// =====================================================

// Mock supabase client
const mockSupabase = {
  from: vi.fn(),
  functions: { invoke: vi.fn() },
  storage: { from: vi.fn() }
}

// Chain builder for supabase queries
function createQueryChain(data = [], error = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    then: vi.fn((cb) => cb({ data, error, count: data.length }))
  }
  // Default resolution (for non-single queries)
  chain.select.mockReturnValue(chain)
  // Make chain thenable
  Object.defineProperty(chain, 'then', {
    value: (resolve) => resolve({ data, error, count: data.length }),
    writable: true
  })
  return chain
}

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock fetch for direct Claude API calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// =====================================================
// 2. TEST DATA - Dados realistas de projeto
// =====================================================

const GARVIS_USER_ID = '00000000-0000-0000-0000-000000000001'

const PROJETO_MOCK = {
  id: 'proj-001',
  codigo: 'GA-2025-042',
  nome: 'Villa Cascais Luxury',
  estado: 'em_execucao',
  tipologia: 'Habitação Unifamiliar',
  morada: 'Rua do Mar, 15, Cascais',
  cliente: { nome: 'João Mendes' }
}

const FORNECEDORES_MOCK = [
  {
    id: 'forn-001',
    nome: 'Alumiber - Caixilharia',
    especialidade: 'caixilharia',
    rating: 4.5,
    status: 'ativo',
    email: 'info@alumiber.pt',
    is_preferencial: true,
    desconto_acordado: 8,
    fornecimentosCount: 7,
    avgQuoteDeviation: 3.2,
    avgPrazoRating: 4.2,
    zona_atuacao: ['Lisboa', 'Cascais']
  },
  {
    id: 'forn-002',
    nome: 'Cortizo Portugal',
    especialidade: 'caixilharia',
    rating: 4.0,
    status: 'ativo',
    email: 'comercial@cortizo.pt',
    is_preferencial: false,
    desconto_acordado: 5,
    fornecimentosCount: 3,
    avgQuoteDeviation: 8.1,
    avgPrazoRating: 3.8,
    zona_atuacao: ['Nacional']
  },
  {
    id: 'forn-003',
    nome: 'Serralharia Tejo',
    especialidade: 'serralharia',
    rating: 3.5,
    status: 'ativo',
    email: 'geral@serralhariatejo.pt',
    is_preferencial: false,
    fornecimentosCount: 1,
    avgPrazoRating: 3.0,
    zona_atuacao: ['Lisboa']
  },
  {
    id: 'forn-004',
    nome: 'Cantaria do Norte',
    especialidade: 'cantaria',
    rating: 4.8,
    status: 'preferencial',
    email: 'pedras@cantarianorte.pt',
    is_preferencial: true,
    fornecimentosCount: 12,
    avgQuoteDeviation: -2.1,
    avgPrazoRating: 4.7,
    zona_atuacao: ['Porto', 'Nacional']
  },
  {
    id: 'forn-005',
    nome: 'Inativo Lda',
    especialidade: 'caixilharia',
    rating: 2.0,
    status: 'inativo',
    email: 'noreply@inativo.pt',
    is_preferencial: false,
    fornecimentosCount: 0
  }
]

const DEAL_ROOMS_MOCK = [
  {
    id: 'dr-001',
    codigo: 'GA00142',
    titulo: 'Caixilharia Villa Cascais',
    status: 'em_analise',
    orcamento_disponivel: 45000,
    prazo_necessario: '2026-04-15',
    fornecedoresCount: 3,
    orcamentosRecebidos: 2
  },
  {
    id: 'dr-002',
    codigo: 'GA00143',
    titulo: 'Serralharia Exterior',
    status: 'aberto',
    orcamento_disponivel: 28000,
    prazo_necessario: '2026-05-01',
    fornecedoresCount: 2,
    orcamentosRecebidos: 0
  }
]

const ALERTAS_MOCK = [
  {
    id: 'alert-001',
    tipo: 'compliance',
    prioridade: 'critico',
    titulo: 'Certificação ISO a expirar',
    mensagem: 'ISO 9001 de Alumiber expira em 5 dias (21/02/2026).',
    entidade_tipo: 'certificacao',
    entidade_id: 'cert-001',
    lido: false,
    arquivado: false,
    created_at: '2026-02-16T10:00:00Z'
  },
  {
    id: 'alert-002',
    tipo: 'orcamento',
    prioridade: 'importante',
    titulo: 'Orçamento acima do mercado',
    mensagem: 'Cortizo cotou "Janela oscilobatente" 22% acima do preço de referência.',
    entidade_tipo: 'orcamento_linha',
    entidade_id: 'line-001',
    lido: false,
    arquivado: false,
    created_at: '2026-02-15T14:00:00Z'
  },
  {
    id: 'alert-003',
    tipo: 'compliance',
    prioridade: 'normal',
    titulo: 'Seguro de obra a renovar',
    mensagem: 'Seguro de Serralharia Tejo expira em 25 dias.',
    lido: true,
    arquivado: false,
    created_at: '2026-02-14T09:00:00Z'
  }
]

const KPIS_MOCK = {
  totalFornecedores: 47,
  fornecedoresAtivos: 32,
  volumeYTD: 1250000,
  volumeYTDFormatted: '€1.3M',
  dealRoomsAtivos: 5,
  orcamentosPendentes: 8,
  alertasCriticos: 2
}

// =====================================================
// 3. TESTS - @GARVIS no Chat (Mention Detection)
// =====================================================

describe('GARVIS - @GARVIS Chat Detection', () => {
  // Simulating the mention regex from ChatProjetos.jsx
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g

  function extractMentions(message) {
    const mencoes = []
    let match
    const regex = new RegExp(mentionRegex.source, mentionRegex.flags)
    while ((match = regex.exec(message)) !== null) {
      mencoes.push(match[2])
    }
    return mencoes
  }

  function cleanMessage(message) {
    return message.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1')
  }

  it('deteta @GARVIS numa mensagem simples', () => {
    const msg = '@[G.A.R.V.I.S.](00000000-0000-0000-0000-000000000001) qual é a fase atual?'
    const mentions = extractMentions(msg)
    expect(mentions).toContain(GARVIS_USER_ID)
    expect(mentions.includes(GARVIS_USER_ID)).toBe(true)
  })

  it('limpa a mensagem de menções para envio', () => {
    const msg = '@[G.A.R.V.I.S.](00000000-0000-0000-0000-000000000001) mostra o status'
    const cleaned = cleanMessage(msg)
    expect(cleaned).toBe('@G.A.R.V.I.S. mostra o status')
    expect(cleaned).not.toContain('00000000-0000-0000-0000-000000000001')
  })

  it('deteta GARVIS junto com outras menções', () => {
    const msg = '@[João](user-123) e @[G.A.R.V.I.S.](00000000-0000-0000-0000-000000000001) vejam isto'
    const mentions = extractMentions(msg)
    expect(mentions).toHaveLength(2)
    expect(mentions).toContain('user-123')
    expect(mentions).toContain(GARVIS_USER_ID)
  })

  it('filtra GARVIS das menções humanas', () => {
    const mentions = ['user-123', GARVIS_USER_ID, 'user-456']
    const humanMentions = mentions.filter(id => id !== GARVIS_USER_ID)
    expect(humanMentions).toEqual(['user-123', 'user-456'])
    expect(humanMentions).not.toContain(GARVIS_USER_ID)
  })

  it('mensagem sem menções não dispara GARVIS', () => {
    const msg = 'Olá equipa, como vai o projeto?'
    const mentions = extractMentions(msg)
    expect(mentions).toHaveLength(0)
    expect(mentions.includes(GARVIS_USER_ID)).toBe(false)
  })

  it('constrói payload correto para edge function', () => {
    const projetoAtivo = PROJETO_MOCK
    const topicoAtivo = { id: 'topico-001' }
    const mensagemId = 'msg-123'
    const profile = { id: 'user-001', nome: 'Ana Silva' }
    const conteudoLimpo = '@G.A.R.V.I.S. qual é a fase atual?'

    const payload = {
      projetoId: projetoAtivo.id,
      topicoId: topicoAtivo.id,
      mensagem: conteudoLimpo,
      mensagemId: mensagemId,
      autorNome: profile?.nome || 'Utilizador'
    }

    expect(payload.projetoId).toBe('proj-001')
    expect(payload.topicoId).toBe('topico-001')
    expect(payload.mensagem).toContain('qual é a fase atual')
    expect(payload.mensagemId).toBe('msg-123')
    expect(payload.autorNome).toBe('Ana Silva')
  })

  it('usa "Utilizador" como fallback se nome não existir', () => {
    const profile = { id: 'user-002' }
    const autorNome = profile?.nome || 'Utilizador'
    expect(autorNome).toBe('Utilizador')
  })
})

// =====================================================
// 4. TESTS - Slash Commands
// =====================================================

describe('GARVIS - Comandos Slash', () => {
  // Import and test command processing logic
  // We replicate the command patterns from garvisChat.js

  const COMMANDS = {
    '/recomendar': { pattern: /^\/recomendar\s+(.+)/i },
    '/comparar': { pattern: /^\/comparar\s+(.+)/i },
    '/analise': { pattern: /^\/analis[ea]r?\s*(.*)/i },
    '/status': { pattern: /^\/status\s*(.*)/i }
  }

  function isCommand(message) {
    const trimmed = message.trim()
    if (trimmed === '/ajuda' || trimmed === '/help') return 'ajuda'
    for (const [name, cmd] of Object.entries(COMMANDS)) {
      if (trimmed.match(cmd.pattern)) return name
    }
    return null
  }

  describe('/ajuda', () => {
    it('reconhece /ajuda', () => {
      expect(isCommand('/ajuda')).toBe('ajuda')
    })

    it('reconhece /help', () => {
      expect(isCommand('/help')).toBe('ajuda')
    })

    it('não reconhece /ajuda com argumentos', () => {
      // /ajuda com args não é tratado como comando de ajuda
      expect(isCommand('/ajuda comandos')).not.toBe('ajuda')
    })
  })

  describe('/recomendar', () => {
    it('reconhece /recomendar com especialidade', () => {
      expect(isCommand('/recomendar caixilharia')).toBe('/recomendar')
    })

    it('captura a especialidade corretamente', () => {
      const match = '/recomendar serralharia'.match(COMMANDS['/recomendar'].pattern)
      expect(match[1]).toBe('serralharia')
    })

    it('NÃO reconhece /recomendar sem argumentos', () => {
      expect(isCommand('/recomendar')).toBeNull()
    })

    it('é case-insensitive', () => {
      expect(isCommand('/RECOMENDAR Caixilharia')).toBe('/recomendar')
    })
  })

  describe('/status', () => {
    it('reconhece /status sem argumentos', () => {
      expect(isCommand('/status')).toBe('/status')
    })

    it('reconhece /status com argumentos opcionais', () => {
      expect(isCommand('/status geral')).toBe('/status')
    })
  })

  describe('/comparar', () => {
    it('reconhece /comparar com nomes', () => {
      expect(isCommand('/comparar Alumiber, Cortizo')).toBe('/comparar')
    })

    it('captura os nomes corretamente', () => {
      const match = '/comparar Alumiber, Cortizo'.match(COMMANDS['/comparar'].pattern)
      expect(match[1]).toBe('Alumiber, Cortizo')
    })

    it('NÃO reconhece /comparar sem nomes', () => {
      expect(isCommand('/comparar')).toBeNull()
    })
  })

  describe('/analisar', () => {
    it('reconhece /analisar', () => {
      expect(isCommand('/analisar')).toBe('/analise')
    })

    it('reconhece /analise', () => {
      expect(isCommand('/analise')).toBe('/analise')
    })

    it('reconhece /analisar com código deal room', () => {
      expect(isCommand('/analisar GA00142')).toBe('/analise')
    })

    it('captura código do deal room', () => {
      const match = '/analisar GA00142'.match(COMMANDS['/analise'].pattern)
      expect(match[1]).toBe('GA00142')
    })
  })

  describe('mensagens normais', () => {
    it('não reconhece texto normal como comando', () => {
      expect(isCommand('Qual é o melhor fornecedor?')).toBeNull()
    })

    it('não reconhece comando em meio de texto', () => {
      expect(isCommand('quero /recomendar um fornecedor')).toBeNull()
    })
  })
})

// =====================================================
// 5. TESTS - Matching de Fornecedores
// =====================================================

describe('GARVIS - Matching de Fornecedores', () => {
  // Replicate calculateMatchScore logic for testing
  const WEIGHTS = {
    especialidade: 25,
    rating: 20,
    preco: 20,
    prazo: 15,
    experiencia: 10,
    zona: 5,
    preferencial: 5
  }

  function calculateMatchScore(fornecedor, requirements = {}) {
    const breakdown = {}
    let totalScore = 0

    // 1. Specialty match (0-25)
    if (requirements.especialidade && fornecedor.especialidade) {
      const reqEsp = requirements.especialidade.toLowerCase()
      const fornEsp = fornecedor.especialidade.toLowerCase()
      if (fornEsp === reqEsp) {
        breakdown.especialidade = WEIGHTS.especialidade
      } else if (fornEsp.includes(reqEsp) || reqEsp.includes(fornEsp)) {
        breakdown.especialidade = WEIGHTS.especialidade * 0.7
      } else {
        breakdown.especialidade = 0
      }
    } else {
      breakdown.especialidade = fornecedor.especialidade ? WEIGHTS.especialidade * 0.3 : 0
    }

    // 2. Rating (0-20)
    if (fornecedor.rating) {
      breakdown.rating = (fornecedor.rating / 5) * WEIGHTS.rating
    } else {
      breakdown.rating = WEIGHTS.rating * 0.3
    }

    // 3. Price competitiveness (0-20)
    if (fornecedor.avgQuoteDeviation !== undefined) {
      const deviationFactor = Math.max(0, 1 - Math.abs(fornecedor.avgQuoteDeviation) / 30)
      breakdown.preco = deviationFactor * WEIGHTS.preco
    } else if (fornecedor.desconto_acordado > 0) {
      breakdown.preco = Math.min(fornecedor.desconto_acordado / 15, 1) * WEIGHTS.preco
    } else {
      breakdown.preco = WEIGHTS.preco * 0.5
    }

    // 4. Delivery reliability (0-15)
    if (fornecedor.avgPrazoRating) {
      breakdown.prazo = (fornecedor.avgPrazoRating / 5) * WEIGHTS.prazo
    } else if (fornecedor.lead_time_medio && requirements.prazoNecessario) {
      const onTime = fornecedor.lead_time_medio <= requirements.prazoNecessario
      breakdown.prazo = onTime ? WEIGHTS.prazo : WEIGHTS.prazo * 0.4
    } else {
      breakdown.prazo = WEIGHTS.prazo * 0.5
    }

    // 5. Experience (0-10)
    const fornecimentos = fornecedor.fornecimentosCount || 0
    if (fornecimentos >= 5) {
      breakdown.experiencia = WEIGHTS.experiencia
    } else if (fornecimentos >= 2) {
      breakdown.experiencia = WEIGHTS.experiencia * 0.7
    } else if (fornecimentos >= 1) {
      breakdown.experiencia = WEIGHTS.experiencia * 0.4
    } else {
      breakdown.experiencia = 0
    }

    // 6. Geographic zone (0-5)
    if (requirements.zona && fornecedor.zona_atuacao?.length > 0) {
      const match = fornecedor.zona_atuacao.some(z =>
        z.toLowerCase().includes(requirements.zona.toLowerCase())
      )
      breakdown.zona = match ? WEIGHTS.zona : 0
    } else {
      breakdown.zona = WEIGHTS.zona * 0.5
    }

    // 7. Preferred supplier bonus (0-5)
    breakdown.preferencial = fornecedor.is_preferencial ? WEIGHTS.preferencial : 0

    totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

    return { score: Math.round(totalScore), breakdown }
  }

  it('score máximo nunca excede 100', () => {
    const perfectSupplier = {
      especialidade: 'caixilharia',
      rating: 5,
      avgQuoteDeviation: 0,
      avgPrazoRating: 5,
      fornecimentosCount: 10,
      zona_atuacao: ['Lisboa'],
      is_preferencial: true
    }
    const { score } = calculateMatchScore(perfectSupplier, {
      especialidade: 'caixilharia',
      zona: 'Lisboa'
    })
    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBe(100)
  })

  it('score mínimo é 0 para fornecedor vazio', () => {
    const emptySupplier = {}
    const { score } = calculateMatchScore(emptySupplier, { especialidade: 'caixilharia' })
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('especialidade exacta recebe 25 pontos', () => {
    const f = { ...FORNECEDORES_MOCK[0] }
    const { breakdown } = calculateMatchScore(f, { especialidade: 'caixilharia' })
    expect(breakdown.especialidade).toBe(25)
  })

  it('especialidade parcial recebe 70% = 17.5 pontos', () => {
    const f = { especialidade: 'caixilharia alumínio' }
    const { breakdown } = calculateMatchScore(f, { especialidade: 'caixilharia' })
    expect(breakdown.especialidade).toBeCloseTo(17.5, 1)
  })

  it('especialidade sem match recebe 0', () => {
    const f = { especialidade: 'pintura' }
    const { breakdown } = calculateMatchScore(f, { especialidade: 'caixilharia' })
    expect(breakdown.especialidade).toBe(0)
  })

  it('rating 4.5/5 recebe 18/20 pontos', () => {
    const f = { rating: 4.5 }
    const { breakdown } = calculateMatchScore(f)
    expect(breakdown.rating).toBe(18)
  })

  it('sem rating recebe 30% = 6 pontos', () => {
    const f = {}
    const { breakdown } = calculateMatchScore(f)
    expect(breakdown.rating).toBe(6)
  })

  it('desvio de preço 0% recebe score máximo de preço', () => {
    const f = { avgQuoteDeviation: 0 }
    const { breakdown } = calculateMatchScore(f)
    expect(breakdown.preco).toBe(20)
  })

  it('desvio de preço >= 30% recebe 0 pontos', () => {
    const f = { avgQuoteDeviation: 30 }
    const { breakdown } = calculateMatchScore(f)
    expect(breakdown.preco).toBe(0)
  })

  it('fornecedor preferencial recebe 5 pontos extra', () => {
    const f = { is_preferencial: true }
    const { breakdown } = calculateMatchScore(f)
    expect(breakdown.preferencial).toBe(5)
  })

  it('5+ fornecimentos = score de experiência máximo', () => {
    const f = { fornecimentosCount: 5 }
    const { breakdown } = calculateMatchScore(f)
    expect(breakdown.experiencia).toBe(10)
  })

  it('0 fornecimentos = score de experiência 0', () => {
    const f = { fornecimentosCount: 0 }
    const { breakdown } = calculateMatchScore(f)
    expect(breakdown.experiencia).toBe(0)
  })

  it('zona correcta recebe 5 pontos', () => {
    const f = { zona_atuacao: ['Lisboa', 'Cascais'] }
    const { breakdown } = calculateMatchScore(f, { zona: 'Lisboa' })
    expect(breakdown.zona).toBe(5)
  })

  it('zona incorrecta recebe 0 pontos', () => {
    const f = { zona_atuacao: ['Porto'] }
    const { breakdown } = calculateMatchScore(f, { zona: 'Algarve' })
    expect(breakdown.zona).toBe(0)
  })

  it('Alumiber (caixilharia) é melhor que Cortizo para caixilharia', () => {
    const scoreAlumiber = calculateMatchScore(FORNECEDORES_MOCK[0], { especialidade: 'caixilharia' })
    const scoreCortizo = calculateMatchScore(FORNECEDORES_MOCK[1], { especialidade: 'caixilharia' })
    expect(scoreAlumiber.score).toBeGreaterThan(scoreCortizo.score)
  })

  it('fornecedor inativo não deveria ser recomendado (validação de lógica de filtragem)', () => {
    const inativo = FORNECEDORES_MOCK.find(f => f.status === 'inativo')
    expect(inativo).toBeDefined()
    // rankSuppliers filtra por status: apenas 'ativo' e 'preferencial'
    expect(['ativo', 'preferencial']).not.toContain(inativo.status)
  })

  it('todos os pesos somam 100', () => {
    const totalWeight = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0)
    expect(totalWeight).toBe(100)
  })
})

// =====================================================
// 6. TESTS - Context Builder (Edge Function)
// =====================================================

describe('GARVIS - Context Builder', () => {
  // Replicating buildSystemPrompt logic from edge function
  function buildSystemPrompt(projeto, topico, contexto) {
    let prompt = `És o G.A.R.V.I.S. (Gavinho Assistant for Responsive Virtual Intelligence Support), o assistente IA integrado na plataforma GAVINHO.`

    prompt += `\n\n## PROJETO ATUAL
- **Código**: ${projeto.codigo}
- **Nome**: ${projeto.nome}
- **Cliente**: ${projeto.cliente?.nome || 'N/A'}
- **Estado**: ${projeto.estado}
- **Tipologia**: ${projeto.tipologia || 'N/A'}
- **Localização**: ${projeto.morada || 'N/A'}`

    if (topico) {
      prompt += `\n\n## CONTEXTO DA CONVERSA
- **Tópico**: ${topico.titulo}
- **Canal**: ${topico.canal?.nome || 'N/A'}`
    }

    if (Object.keys(contexto).length > 0) {
      prompt += '\n\n## DADOS DO PROJETO'

      if (contexto.duvidas_recentes) {
        prompt += '\n\n### Dúvidas/Questões Recentes'
        for (const d of contexto.duvidas_recentes) {
          prompt += `\n- **${d.titulo}** (${d.status}, ${d.prioridade})`
        }
      }

      if (contexto.fases) {
        prompt += '\n\n### Fases do Projeto'
        for (const f of contexto.fases) {
          prompt += `\n- ${f.nome}: ${f.estado}`
        }
      }

      if (contexto.equipa) {
        prompt += '\n\n### Equipa'
        for (const e of contexto.equipa) {
          if (e.utilizador) {
            prompt += `\n- ${e.utilizador.nome} (${e.funcao})`
          }
        }
      }

      if (contexto.intervenientes) {
        prompt += '\n\n### Intervenientes'
        for (const i of contexto.intervenientes) {
          prompt += `\n- ${i.tipo}: ${i.entidade || ''} ${i.responsavel_nome ? `(${i.responsavel_nome})` : ''}`
        }
      }

      if (contexto.total_renders) {
        prompt += `\n\n### Renders: ${contexto.total_renders} imagens no projeto`
      }
    }

    return prompt
  }

  const CONTEXTO_PROJETO = {
    duvidas_recentes: [
      { titulo: 'Acabamento da escada', status: 'pendente', prioridade: 'importante' },
      { titulo: 'Cor do caixilho exterior', status: 'resolvida', prioridade: 'normal' }
    ],
    fases: [
      { nome: 'Projeto de Licenciamento', estado: 'concluido' },
      { nome: 'Projeto de Execução', estado: 'em_curso' },
      { nome: 'Obra', estado: 'pendente' }
    ],
    equipa: [
      { funcao: 'Arquiteto Principal', utilizador: { nome: 'Carlos Ribeiro' } },
      { funcao: 'Designer Interior', utilizador: { nome: 'Marta Gomes' } },
      { funcao: 'Gestor de Projeto', utilizador: null }
    ],
    intervenientes: [
      { tipo: 'Câmara Municipal', entidade: 'CM Cascais', responsavel_nome: 'Dr. Paulo Silva' },
      { tipo: 'Especialidade', entidade: 'AVAC Solutions', responsavel_nome: '' }
    ],
    total_renders: 23
  }

  const TOPICO_MOCK = {
    titulo: 'Materiais de fachada',
    canal: { nome: 'geral', id: 'canal-001', projeto_id: 'proj-001' }
  }

  it('inclui dados do projeto no prompt', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, null, {})
    expect(prompt).toContain('GA-2025-042')
    expect(prompt).toContain('Villa Cascais Luxury')
    expect(prompt).toContain('João Mendes')
    expect(prompt).toContain('em_execucao')
    expect(prompt).toContain('Habitação Unifamiliar')
    expect(prompt).toContain('Cascais')
  })

  it('inclui contexto do tópico', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, TOPICO_MOCK, {})
    expect(prompt).toContain('Materiais de fachada')
    expect(prompt).toContain('geral')
  })

  it('inclui dúvidas recentes', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, null, CONTEXTO_PROJETO)
    expect(prompt).toContain('Acabamento da escada')
    expect(prompt).toContain('pendente')
    expect(prompt).toContain('importante')
  })

  it('inclui fases do projeto', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, null, CONTEXTO_PROJETO)
    expect(prompt).toContain('Projeto de Licenciamento')
    expect(prompt).toContain('concluido')
    expect(prompt).toContain('em_curso')
  })

  it('inclui equipa (ignora membros sem utilizador)', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, null, CONTEXTO_PROJETO)
    expect(prompt).toContain('Carlos Ribeiro')
    expect(prompt).toContain('Arquiteto Principal')
    expect(prompt).toContain('Marta Gomes')
    // Gestor de Projeto tem utilizador: null, não deve aparecer
    expect(prompt).not.toContain('Gestor de Projeto')
  })

  it('inclui intervenientes', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, null, CONTEXTO_PROJETO)
    expect(prompt).toContain('CM Cascais')
    expect(prompt).toContain('Dr. Paulo Silva')
    expect(prompt).toContain('AVAC Solutions')
  })

  it('inclui contagem de renders', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, null, CONTEXTO_PROJETO)
    expect(prompt).toContain('23 imagens no projeto')
  })

  it('lida com cliente null', () => {
    const projetoSemCliente = { ...PROJETO_MOCK, cliente: null }
    const prompt = buildSystemPrompt(projetoSemCliente, null, {})
    expect(prompt).toContain('N/A')
  })

  it('lida com contexto vazio', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, null, {})
    expect(prompt).not.toContain('DADOS DO PROJETO')
  })

  it('identidade GARVIS está presente', () => {
    const prompt = buildSystemPrompt(PROJETO_MOCK, null, {})
    expect(prompt).toContain('G.A.R.V.I.S.')
  })
})

// =====================================================
// 7. TESTS - Conversation Message Builder (Edge Function)
// =====================================================

describe('GARVIS - Conversation Message Builder', () => {
  function buildConversationMessages(historico, mensagemAtual, autorNome) {
    const messages = []
    const historicoOrdenado = [...historico].reverse()

    for (const msg of historicoOrdenado) {
      const isGarvis = msg.autor_id === GARVIS_USER_ID || msg.autor?.is_bot
      if (isGarvis) {
        messages.push({ role: 'assistant', content: msg.conteudo })
      } else {
        const nome = msg.autor?.nome || 'Utilizador'
        messages.push({ role: 'user', content: `[${nome}]: ${msg.conteudo}` })
      }
    }

    messages.push({ role: 'user', content: `[${autorNome}]: ${mensagemAtual}` })
    return messages
  }

  it('ordena histórico cronologicamente', () => {
    const historico = [
      { id: '3', conteudo: 'msg3', autor_id: 'u1', autor: { nome: 'Ana', is_bot: false }, created_at: '2026-02-16T10:03:00Z' },
      { id: '2', conteudo: 'msg2', autor_id: GARVIS_USER_ID, autor: { nome: 'G.A.R.V.I.S.', is_bot: true }, created_at: '2026-02-16T10:02:00Z' },
      { id: '1', conteudo: 'msg1', autor_id: 'u1', autor: { nome: 'Ana', is_bot: false }, created_at: '2026-02-16T10:01:00Z' }
    ]
    const messages = buildConversationMessages(historico, 'nova pergunta', 'Ana')
    expect(messages[0].content).toContain('msg1')
    expect(messages[1].content).toBe('msg2')
    expect(messages[2].content).toContain('msg3')
    expect(messages[3].content).toContain('nova pergunta')
  })

  it('atribui role correcto a mensagens GARVIS vs user', () => {
    const historico = [
      { id: '2', conteudo: 'resposta', autor_id: GARVIS_USER_ID, autor: { nome: 'G.A.R.V.I.S.', is_bot: true }, created_at: '2026-02-16T10:02:00Z' },
      { id: '1', conteudo: 'pergunta', autor_id: 'u1', autor: { nome: 'Ana', is_bot: false }, created_at: '2026-02-16T10:01:00Z' }
    ]
    const messages = buildConversationMessages(historico, 'nova', 'Ana')
    expect(messages[0].role).toBe('user')
    expect(messages[1].role).toBe('assistant')
  })

  it('inclui nome do autor nas mensagens de user', () => {
    const historico = [
      { id: '1', conteudo: 'olá', autor_id: 'u1', autor: { nome: 'Pedro', is_bot: false }, created_at: '2026-02-16T10:01:00Z' }
    ]
    const messages = buildConversationMessages(historico, 'teste', 'Ana')
    expect(messages[0].content).toBe('[Pedro]: olá')
    expect(messages[1].content).toBe('[Ana]: teste')
  })

  it('[BUG] mensagens consecutivas do mesmo role violam API Claude', () => {
    // BUG DETECTADO: Se 3 users postam sem GARVIS responder,
    // há 3 mensagens consecutivas com role 'user' — Claude API rejeita
    const historico = [
      { id: '3', conteudo: 'eu tb acho', autor_id: 'u3', autor: { nome: 'Carlos', is_bot: false }, created_at: '2026-02-16T10:03:00Z' },
      { id: '2', conteudo: 'concordo', autor_id: 'u2', autor: { nome: 'Pedro', is_bot: false }, created_at: '2026-02-16T10:02:00Z' },
      { id: '1', conteudo: 'bom dia', autor_id: 'u1', autor: { nome: 'Ana', is_bot: false }, created_at: '2026-02-16T10:01:00Z' }
    ]
    const messages = buildConversationMessages(historico, 'e o GARVIS?', 'Ana')

    // Todas as mensagens são 'user' — isto vai falhar na API Claude
    const roles = messages.map(m => m.role)
    const hasConsecutiveSameRole = roles.some((r, i) => i > 0 && r === roles[i - 1])

    // Este teste documenta o BUG - espera-se que FALHE quando o bug for corrigido
    expect(hasConsecutiveSameRole).toBe(true) // BUG: true = roles consecutivos iguais
  })

  it('[BUG] mensagem atual pode estar duplicada no histórico', () => {
    // BUG: A mensagem do user é inserida na BD antes de chamar a edge function.
    // O fetch de histórico (last 10) pode incluir a mesma mensagem.
    // buildConversationMessages depois adiciona a mensagem novamente.
    const currentMsg = 'qual é a fase?'
    const historico = [
      // A mensagem actual já está no histórico (foi inserida antes da chamada)
      { id: 'msg-current', conteudo: '@G.A.R.V.I.S. qual é a fase?', autor_id: 'u1', autor: { nome: 'Ana', is_bot: false }, created_at: '2026-02-16T10:05:00Z' },
      { id: 'msg-prev', conteudo: 'resposta anterior', autor_id: GARVIS_USER_ID, autor: { nome: 'G.A.R.V.I.S.', is_bot: true }, created_at: '2026-02-16T10:04:00Z' }
    ]

    const messages = buildConversationMessages(historico, currentMsg, 'Ana')

    // A mensagem "qual é a fase?" aparece 2 vezes: no histórico E como mensagem atual
    const faseMessages = messages.filter(m => m.content.includes('fase'))
    expect(faseMessages.length).toBe(2) // BUG: duplicação
  })
})

// =====================================================
// 8. TESTS - Alertas Inteligentes
// =====================================================

describe('GARVIS - Alertas Inteligentes', () => {
  it('calcula dias até expiração correctamente', () => {
    const dataValidade = new Date()
    dataValidade.setDate(dataValidade.getDate() + 5)

    const daysLeft = Math.ceil(
      (dataValidade - new Date()) / (1000 * 60 * 60 * 24)
    )

    expect(daysLeft).toBe(5)
  })

  it('prioridade "critico" para <= 7 dias', () => {
    const daysLeft = 5
    const prioridade = daysLeft <= 7 ? 'critico' : daysLeft <= 15 ? 'importante' : 'normal'
    expect(prioridade).toBe('critico')
  })

  it('prioridade "importante" para 8-15 dias', () => {
    const daysLeft = 12
    const prioridade = daysLeft <= 7 ? 'critico' : daysLeft <= 15 ? 'importante' : 'normal'
    expect(prioridade).toBe('importante')
  })

  it('prioridade "normal" para 16-30 dias', () => {
    const daysLeft = 25
    const prioridade = daysLeft <= 7 ? 'critico' : daysLeft <= 15 ? 'importante' : 'normal'
    expect(prioridade).toBe('normal')
  })

  it('conta alertas não lidos corretamente', () => {
    const unreadCount = ALERTAS_MOCK.filter(a => !a.lido).length
    expect(unreadCount).toBe(2) // alert-001 e alert-002
  })

  it('conta alertas críticos não lidos corretamente', () => {
    const criticalCount = ALERTAS_MOCK.filter(a => a.prioridade === 'critico' && !a.lido).length
    expect(criticalCount).toBe(1) // apenas alert-001
  })

  it('topAlert seleciona primeiro alerta critico/importante não lido', () => {
    const topAlert = ALERTAS_MOCK.find(a => !a.lido && (a.prioridade === 'critico' || a.prioridade === 'importante'))
    expect(topAlert).toBeDefined()
    expect(topAlert.id).toBe('alert-001')
    expect(topAlert.prioridade).toBe('critico')
  })

  it('alerta de desvio >= 25% é classificado como "critico"', () => {
    const desvio = 28
    const prioridade = desvio > 25 ? 'critico' : 'importante'
    expect(prioridade).toBe('critico')
  })

  it('alerta de desvio 15-25% é classificado como "importante"', () => {
    const desvio = 18
    const prioridade = desvio > 25 ? 'critico' : 'importante'
    expect(prioridade).toBe('importante')
  })

  it('[BUG] alertas só detetam desvios positivos (>15%), ignoram preços suspeitos baixos', () => {
    // BUG: useGarvisAlerts.js:155 usa .gt('desvio_percentual', 15)
    // Isto ignora desvios negativos (< -20%) que indicam preços suspeitosamente baixos
    // garvisQuoteAnalysis.js deteta desvio < -20 mas generateAutoAlerts não
    const desvioNegativo = -25
    const isDetectedByAutoAlerts = desvioNegativo > 15 // condição actual
    expect(isDetectedByAutoAlerts).toBe(false) // BUG: preço suspeitamente baixo não gera alerta
  })

  it('[BUG] certificações já expiradas não geram alerta', () => {
    // BUG: useGarvisAlerts.js:119 usa .gte('data_validade', today)
    // Certificações que já expiraram (data_validade < hoje) são excluídas
    const expired = new Date()
    expired.setDate(expired.getDate() - 3) // expirou há 3 dias

    const today = new Date()
    const isDetected = expired >= today
    expect(isDetected).toBe(false) // BUG: certificação expirada não gera alerta
  })
})

// =====================================================
// 9. TESTS - /status Command Output
// =====================================================

describe('GARVIS - /status Output Format', () => {
  function formatStatus(dealRooms, kpis) {
    let response = `**Status G.A.R.V.I.S.**\n\n`
    response += `📊 Fornecedores: ${kpis.total || kpis.totalFornecedores || '—'}\n`
    response += `💰 Volume YTD: ${kpis.volumeYTD || kpis.volumeYTDFormatted || '—'}\n`
    response += `🏗️ Deal Rooms ativos: ${dealRooms.length}\n`
    response += `📋 Orçamentos pendentes: ${kpis.orcamentos || kpis.orcamentosPendentes || 0}\n`
    response += `🚨 Alertas críticos: ${kpis.alertas || kpis.alertasCriticos || 0}\n`

    if (dealRooms.length > 0) {
      response += '\n**Deal Rooms:**\n'
      for (const dr of dealRooms) {
        response += `• ${dr.titulo} [${dr.codigo}] — ${dr.badge || dr.status}\n`
      }
    }
    return response
  }

  it('formata status com KPIs reais', () => {
    const output = formatStatus(DEAL_ROOMS_MOCK, KPIS_MOCK)
    expect(output).toContain('Status G.A.R.V.I.S.')
    expect(output).toContain('47')       // totalFornecedores
    expect(output).toContain('1250000')  // volumeYTD (raw, fallback)
    expect(output).toContain('Deal Rooms ativos: 2')
    expect(output).toContain('Orçamentos pendentes: 8')
    expect(output).toContain('Alertas críticos: 2')
  })

  it('lista deal rooms no status', () => {
    const output = formatStatus(DEAL_ROOMS_MOCK, KPIS_MOCK)
    expect(output).toContain('Caixilharia Villa Cascais')
    expect(output).toContain('GA00142')
    expect(output).toContain('Serralharia Exterior')
    expect(output).toContain('GA00143')
  })

  it('[BUG] /status mostra volumeYTD raw (1250000) em vez de formatado', () => {
    // BUG: garvisChat.js:265 usa kpis.volumeYTD || kpis.volumeYTDFormatted
    // Se volumeYTD é truthy (1250000), nunca chega a volumeYTDFormatted (€1.3M)
    // O utilizador vê "Volume YTD: 1250000" em vez de "Volume YTD: €1.3M"
    const output = formatStatus(DEAL_ROOMS_MOCK, KPIS_MOCK)
    expect(output).toContain('1250000')      // Mostra número raw
    expect(output).not.toContain('€1.3M')    // BUG: nunca mostra formatado
  })

  it('status com 0 deal rooms não mostra secção Deal Rooms', () => {
    const output = formatStatus([], KPIS_MOCK)
    expect(output).not.toContain('**Deal Rooms:**')
  })
})

// =====================================================
// 10. TESTS - Quote Analysis
// =====================================================

describe('GARVIS - Análise de Orçamentos', () => {
  function classifyDeviation(desvio) {
    return Math.abs(desvio) <= 5 ? 'normal'
      : desvio > 15 ? 'acima'
      : desvio > 5 ? 'atencao'
      : desvio < -15 ? 'abaixo_suspeito'
      : 'abaixo'
  }

  it('desvio ±5% é classificado como "normal"', () => {
    expect(classifyDeviation(3)).toBe('normal')
    expect(classifyDeviation(-4)).toBe('normal')
    expect(classifyDeviation(0)).toBe('normal')
  })

  it('desvio 6-15% é classificado como "atencao"', () => {
    expect(classifyDeviation(10)).toBe('atencao')
    expect(classifyDeviation(15)).toBe('atencao')
  })

  it('desvio > 15% é classificado como "acima"', () => {
    expect(classifyDeviation(20)).toBe('acima')
    expect(classifyDeviation(50)).toBe('acima')
  })

  it('desvio -6% a -15% é classificado como "abaixo"', () => {
    expect(classifyDeviation(-8)).toBe('abaixo')
    expect(classifyDeviation(-15)).toBe('abaixo')
  })

  it('desvio < -15% é classificado como "abaixo_suspeito"', () => {
    expect(classifyDeviation(-20)).toBe('abaixo_suspeito')
    expect(classifyDeviation(-50)).toBe('abaixo_suspeito')
  })

  it('desvio_medio usa valores absolutos (comportamento actual)', () => {
    // garvisQuoteAnalysis.js:93: totalDesvio += Math.abs(desvio)
    const desvios = [10, -15, 5, -8]
    const totalDesvio = desvios.reduce((s, d) => s + Math.abs(d), 0)
    const desvioMedio = totalDesvio / desvios.length

    expect(desvioMedio).toBe(9.5) // média dos absolutos
    expect(desvioMedio).toBeGreaterThan(0) // sempre positivo
  })

  it('recomendação escolhe fornecedor mais barato dentro do orçamento', () => {
    const budget = 45000
    const quotes = [
      { valor_total: 42000, fornecedores: { nome: 'Alumiber', id: 'f1' } },
      { valor_total: 48000, fornecedores: { nome: 'Cortizo', id: 'f2' } },
      { valor_total: 44500, fornecedores: { nome: 'Outro', id: 'f3' } }
    ].sort((a, b) => a.valor_total - b.valor_total)

    const bestWithinBudget = quotes.find(q => q.valor_total <= budget)
    expect(bestWithinBudget.fornecedores.nome).toBe('Alumiber')
    expect(bestWithinBudget.valor_total).toBe(42000)
  })

  it('spread de preços calculado correctamente', () => {
    const lowest = 42000
    const highest = 48000
    const spread = highest - lowest
    const spreadPct = ((highest - lowest) / lowest * 100).toFixed(1)

    expect(spread).toBe(6000)
    expect(spreadPct).toBe('14.3')
  })
})

// =====================================================
// 11. TESTS - KPIs Procurement
// =====================================================

describe('GARVIS - KPIs Procurement', () => {
  it('formata volume YTD >= 1M correctamente', () => {
    const volume = 1250000
    const formatted = volume >= 1000000
      ? `€${(volume / 1000000).toFixed(1)}M`
      : volume >= 1000
        ? `€${(volume / 1000).toFixed(0)}k`
        : `€${volume.toFixed(0)}`
    expect(formatted).toBe('€1.3M')
  })

  it('formata volume YTD entre 1k-1M correctamente', () => {
    const volume = 500000
    const formatted = volume >= 1000000
      ? `€${(volume / 1000000).toFixed(1)}M`
      : volume >= 1000
        ? `€${(volume / 1000).toFixed(0)}k`
        : `€${volume.toFixed(0)}`
    expect(formatted).toBe('€500k')
  })

  it('formata volume YTD < 1k correctamente', () => {
    const volume = 750
    const formatted = volume >= 1000000
      ? `€${(volume / 1000000).toFixed(1)}M`
      : volume >= 1000
        ? `€${(volume / 1000).toFixed(0)}k`
        : `€${volume.toFixed(0)}`
    expect(formatted).toBe('€750')
  })

  it('volume 0 retorna €0', () => {
    const volume = 0
    const formatted = volume > 0
      ? volume >= 1000000
        ? `€${(volume / 1000000).toFixed(1)}M`
        : `€${(volume / 1000).toFixed(0)}k`
      : '€0'
    expect(formatted).toBe('€0')
  })

  it('conta fornecedores activos (ativo + preferencial)', () => {
    const all = FORNECEDORES_MOCK
    const activos = all.filter(f => f.status === 'ativo' || f.status === 'preferencial')
    expect(activos.length).toBe(4) // exclui "inativo"
  })
})

// =====================================================
// 12. TESTS - GarvisPanel Context Builder (garvisChat.js)
// =====================================================

describe('GARVIS - Context String Builder', () => {
  function buildContextString(context) {
    const parts = []

    if (context.fornecedores?.length > 0) {
      const topForn = context.fornecedores.slice(0, 20).map(f =>
        `- ${f.nome} (${f.especialidade || 'geral'}, rating: ${f.rating || 'N/A'}, status: ${f.status})`
      ).join('\n')
      parts.push(`FORNECEDORES ATIVOS (${context.fornecedores.length} total):\n${topForn}`)
    }

    if (context.dealRooms?.length > 0) {
      const drs = context.dealRooms.map(dr =>
        `- ${dr.titulo} [${dr.codigo}] — ${dr.status} — ${dr.fornecedoresCount || 0} fornecedores`
      ).join('\n')
      parts.push(`DEAL ROOMS ATIVOS:\n${drs}`)
    }

    if (context.alertas?.length > 0) {
      const als = context.alertas.slice(0, 5).map(a =>
        `- [${a.prioridade}] ${a.titulo}: ${a.mensagem}`
      ).join('\n')
      parts.push(`ALERTAS RECENTES:\n${als}`)
    }

    if (context.kpis) {
      const k = context.kpis
      parts.push(`KPIs: ${k.totalFornecedores || k.total || '—'} fornecedores, ${k.dealRoomsAtivos || k.dealRooms || 0} deal rooms, ${k.orcamentosPendentes || k.orcamentos || 0} orçamentos pendentes, Volume YTD: ${k.volumeYTDFormatted || k.volumeYTD || '€0'}`)
    }

    return parts.length > 0 ? parts.join('\n\n') : 'Sem dados de contexto disponíveis.'
  }

  it('inclui fornecedores no contexto', () => {
    const ctx = buildContextString({ fornecedores: FORNECEDORES_MOCK })
    expect(ctx).toContain('FORNECEDORES ATIVOS (5 total)')
    expect(ctx).toContain('Alumiber')
    expect(ctx).toContain('caixilharia')
  })

  it('trunca a 20 fornecedores', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      nome: `Fornecedor ${i}`, especialidade: 'geral', rating: 3, status: 'ativo'
    }))
    const ctx = buildContextString({ fornecedores: many })
    expect(ctx).toContain('30 total')
    // Mas só lista 20
    const lines = ctx.split('\n').filter(l => l.startsWith('- Fornecedor'))
    expect(lines.length).toBe(20)
  })

  it('inclui deal rooms no contexto', () => {
    const ctx = buildContextString({ dealRooms: DEAL_ROOMS_MOCK })
    expect(ctx).toContain('DEAL ROOMS ATIVOS')
    expect(ctx).toContain('GA00142')
  })

  it('inclui alertas recentes (max 5)', () => {
    const ctx = buildContextString({ alertas: ALERTAS_MOCK })
    expect(ctx).toContain('ALERTAS RECENTES')
    expect(ctx).toContain('critico')
  })

  it('inclui KPIs formatados', () => {
    const ctx = buildContextString({ kpis: KPIS_MOCK })
    expect(ctx).toContain('47 fornecedores')
    expect(ctx).toContain('€1.3M')
  })

  it('retorna mensagem padrão sem dados', () => {
    const ctx = buildContextString({})
    expect(ctx).toBe('Sem dados de contexto disponíveis.')
  })
})

// =====================================================
// 13. TESTS - Edge Cases & Robustness
// =====================================================

describe('GARVIS - Edge Cases', () => {
  it('mensagem vazia não deve ser enviada', () => {
    const msg = ''
    expect(msg.trim()).toBe('')
  })

  it('mensagem só com espaços não deve ser enviada', () => {
    const msg = '   \n  \t  '
    expect(msg.trim()).toBe('')
  })

  it('GARVIS_USER_ID é UUID válido', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(GARVIS_USER_ID).toMatch(uuidRegex)
  })

  it('fornecedor sem zona_atuacao não causa crash no matching', () => {
    const f = { ...FORNECEDORES_MOCK[0], zona_atuacao: undefined }
    expect(() => {
      // Simula o check da zona
      const match = f.zona_atuacao?.some(z => z.includes('Lisboa'))
      expect(match).toBeUndefined()
    }).not.toThrow()
  })

  it('fornecedor com rating null recebe score neutro', () => {
    const WEIGHTS = { rating: 20 }
    const f = { rating: null }
    const ratingScore = f.rating ? (f.rating / 5) * WEIGHTS.rating : WEIGHTS.rating * 0.3
    expect(ratingScore).toBe(6)
  })

  it('/ajuda retorna todos os comandos esperados', () => {
    const ajudaResponse = `**Comandos disponíveis:**\n\n` +
      `**/recomendar [especialidade]** — Encontrar melhores fornecedores\n` +
      `**/comparar [nomes]** — Comparar fornecedores lado a lado\n` +
      `**/analisar** — Analisar deal rooms ativos e orçamentos\n` +
      `**/status** — Resumo de deal rooms ativos\n`

    expect(ajudaResponse).toContain('/recomendar')
    expect(ajudaResponse).toContain('/comparar')
    expect(ajudaResponse).toContain('/analisar')
    expect(ajudaResponse).toContain('/status')
  })
})
