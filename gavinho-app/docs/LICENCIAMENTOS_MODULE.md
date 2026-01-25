# Módulo de Licenciamentos — Viabilidade Urbanística

## Visão Geral

O módulo de Licenciamentos permite analisar a viabilidade urbanística de operações imobiliárias em Portugal, com foco inicial no concelho de Sintra. Utiliza IA (Claude API) para análise automatizada baseada em matrizes de decisão e fluxos normalizados.

### Funcionalidades Principais

- Análise de viabilidade urbanística (viável / viável condicionado / inviável)
- Suporte multi-concelho (Sintra ativo, Lisboa planeado)
- Chat conversacional com assistente IA especializado
- Geração de relatórios DOCX (modo interno e cliente)
- Versionamento de relatórios e rastreabilidade de downloads
- Integração com módulo de Projetos

---

## Arquitetura

### Acesso na Plataforma

1. **Sidebar** → Gestão Projetos → **Viabilidade** (visão global de todas as análises)
2. **Projeto** → Tab **Viabilidade** (análises específicas do projeto)

### Permissões

- Apenas utilizadores com role `admin` ou `gp` (Gestor de Projeto) podem aceder
- RLS (Row Level Security) aplicado em todas as tabelas

---

## Base de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `concelhos` | Configuração de cada concelho suportado |
| `analises_viabilidade` | Análises de viabilidade (dados + resultado) |
| `analise_versoes` | Versões dos relatórios gerados |
| `analise_downloads` | Rastreabilidade de downloads |
| `concelho_matrizes` | Matrizes de decisão por concelho |
| `concelho_fluxo_decisao` | Árvore de decisão por concelho |
| `concelho_prompts` | Prompts de IA por concelho |

### View Principal

```sql
v_analises_completas
```
Junta análises com dados do concelho, projeto e utilizador.

### Código Automático

Cada análise recebe código automático: `VU-YYYY-XXX` (ex: VU-2025-001)

---

## Estrutura de Dados

### INPUT Normalizado (dados_entrada)

```json
{
  "localizacao": {
    "morada": "...",
    "freguesia": "...",
    "artigo_matricial": "...",
    "area_terreno": 500
  },
  "solo": {
    "tipo": "urbano | rustico",
    "categoria": "espacos_habitacionais | espacos_agricolas | ...",
    "subcategoria": "..."
  },
  "regimes": {
    "ren": true/false,
    "ran": true/false,
    "natura2000": true/false,
    "pnsc": true/false,
    "cheias": true/false,
    "incendio": true/false,
    "uopg": "...",
    "servidoes": ["..."]
  },
  "preexistencia": {
    "existe_edificacao": true/false,
    "licenciada": true/false,
    "ano_construcao": 1985,
    "area_implantacao": 100,
    "area_construcao": 200,
    "numero_pisos": 2,
    "uso_atual": "habitacao"
  },
  "operacao": {
    "tipo": "construcao_nova | ampliacao | legalizacao | alteracao | reconstrucao",
    "uso_pretendido": "habitacao | turismo | atividades_economicas | equipamentos",
    "area_construcao_pretendida": 300,
    "numero_pisos_pretendido": 2,
    "numero_fogos": 1,
    "descricao": "..."
  }
}
```

### OUTPUT (resultado)

```json
{
  "classificacao": "viavel | viavel_condicionado | inviavel",
  "fundamentacao": "Texto explicativo...",
  "enquadramento_legal": ["Artigo X do PDM", "..."],
  "condicionantes": ["Lista de condicionantes"],
  "recomendacoes": ["Recomendações técnicas"],
  "indicadores_urbanisticos": {
    "indice_ocupacao_calculado": null,
    "indice_construcao_calculado": null,
    "n_pisos_permitido": null
  }
}
```

---

## Matrizes de Decisão (Sintra)

### 1. Solo × Uso Urbano (3.1.A)

| Categoria | Habitação | Turismo | Ativ. Económicas | Equipamentos |
|-----------|-----------|---------|------------------|--------------|
| Espaços Centrais | Admissível | Admissível | Admissível | Admissível |
| Espaços Habitacionais | Admissível | Condicionado | Condicionado | Condicionado |
| Espaços Baixa Densidade | Condicionado | Condicionado | Inviável | Condicionado |
| Espaços Ativ. Económicas | Inviável | Excecional | Admissível | Condicionado |

### 2. Solo × Uso Rústico (3.1.B)

| Categoria | Edificação Nova | Habitação | Turismo | Equipamentos |
|-----------|-----------------|-----------|---------|--------------|
| Espaços Naturais | Inviável | Inviável | Inviável | Excecional |
| Espaços Florestais | Funcional | Inviável | Condicionado | Condicionado |
| Espaços Agrícolas | Funcional | Inviável | Condicionado | Condicionado |
| Espaços Ocup. Turística | Condicionado | Inviável | Admissível | Condicionado |
| Aglomerados Rurais | Limitado | Condicionado | Condicionado | Condicionado |

### 3. Regimes Ambientais Cumulativos (3.6)

| Regime | Construção Nova | Ampliação | Legalização | Turismo |
|--------|-----------------|-----------|-------------|---------|
| REN | Inviável | Condicionado | Condicionado | Condicionado |
| RAN | Inviável | Condicionado | Condicionado | Condicionado |
| PNSC | Inviável | Inviável | Inviável | Inviável |
| Natura 2000 | Condicionado | Condicionado | Condicionado | Condicionado |
| Zonas Cheias | Inviável | Condicionado | Condicionado | Inviável |

### 4. Preexistências × Ampliação × Legalização (3.4)

**Regras Críticas:**
- Ampliação máxima: 20% da área de construção existente
- Construção ilegal posterior a 1999: NÃO LEGALIZÁVEL
- PNSC/Natura: Ampliação não admitida
- Anexos não são ampliáveis
- Não somar ampliações sucessivas

---

## Princípios de Inferência

1. **Hierarquia normativa**: Lei > PDM > Regulamentos > Interpretação
2. **Regime mais restritivo prevalece** sempre que existam múltiplos regimes
3. **Cumulatividade absoluta**: nenhum regime elimina outro
4. **Ausência de proibição ≠ permissão**
5. **Índices máximos NÃO geram direitos adquiridos**
6. **Contexto territorial > conveniência programática**

---

## Edge Functions

### 1. analisar-viabilidade

Executa análise completa de viabilidade.

**Endpoint:** `POST /functions/v1/analisar-viabilidade`

**Body:**
```json
{
  "analise_id": "uuid",
  "modo": "interno | cliente"
}
```

**Processo:**
1. Carrega dados da análise
2. Carrega matrizes e prompts do concelho
3. Constrói system prompt contextualizado
4. Chama Claude API (Sonnet)
5. Guarda resultado na análise

### 2. viabilidade-chat

Chat conversacional com assistente IA.

**Endpoint:** `POST /functions/v1/viabilidade-chat`

**Body:**
```json
{
  "analise_id": "uuid",
  "message": "pergunta do utilizador",
  "history": [{"role": "user|assistant", "content": "..."}]
}
```

**Usa:** Claude Haiku para respostas rápidas

---

## Componentes Frontend

### Estrutura de Ficheiros

```
src/
├── components/viabilidade/
│   ├── ViabilidadeModule.jsx      # Lista de análises (dentro do projeto)
│   ├── AnaliseDetalhe.jsx         # Detalhe com tabs (Dados, Chat, Análise, Relatório)
│   └── ChatViabilidade/
│       └── index.jsx              # Interface de chat com IA
├── hooks/viabilidade/
│   ├── useAnalise.js              # CRUD de análises
│   └── useConcelhos.js            # Carrega concelhos
└── pages/
    └── Viabilidade.jsx            # Página global (sidebar)
```

### Estados da Análise

| Estado | Descrição |
|--------|-----------|
| `rascunho` | Em preparação, dados incompletos |
| `em_analise` | A executar análise IA |
| `concluido` | Análise concluída |
| `validado` | Validado por GP/Admin |

### Classificações

| Valor | Badge | Cor |
|-------|-------|-----|
| `viavel` | Viável | Verde (#16a34a) |
| `viavel_condicionado` | Condicionado | Amarelo (#d97706) |
| `inviavel` | Inviável | Vermelho (#dc2626) |

---

## Prompts Disponíveis (Sintra)

### Análise
- `viabilidade_geral_interno` — Análise técnica completa
- `viabilidade_geral_cliente` — Resumo executivo para cliente
- `posso_construir` — Verificação rápida de admissibilidade
- `posso_ampliar` — Avaliação de ampliação
- `posso_legalizar` — Avaliação de legalização
- `uso_turistico` — Análise específica para turismo
- `impacto_ambiental` — Verificação de regimes ambientais
- `texto_relatorio` — Geração de texto para relatório

---

## Configuração

### Variáveis de Ambiente (Supabase)

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Deploy Edge Functions

```bash
supabase functions deploy analisar-viabilidade
supabase functions deploy viabilidade-chat
```

---

## Fluxo de Uso

1. **Criar análise** no contexto de um projeto
2. **Selecionar concelho** (Sintra)
3. **Preencher dados** na tab "Dados":
   - Localização
   - Classificação do solo
   - Regimes aplicáveis
   - Preexistência (se existir)
   - Operação pretendida
4. **Executar análise** na tab "Chat IA":
   - Modo Técnico (interno)
   - Modo Executivo (cliente)
5. **Consultar resultado** na tab "Análise"
6. **Gerar relatório** na tab "Relatório" (futuro)

---

## Roadmap

### Fase 1 — Base ✅
- [x] Schema de base de dados
- [x] Edge Functions básicas
- [x] Frontend (lista, detalhe, chat)
- [x] Seed de Sintra

### Fase 2 — IA
- [x] Integração Claude API
- [x] System prompts contextualizados
- [ ] Validação cruzada automática
- [ ] Nível de confiança

### Fase 3 — Relatórios
- [ ] Geração DOCX
- [ ] Templates por modo (interno/cliente)
- [ ] Versionamento automático

### Fase 4 — Expansão
- [ ] Concelho de Lisboa
- [ ] Upload de plantas (OCR)
- [ ] Histórico de decisões similares

---

## Notas Técnicas

### Tipos UUID vs TEXT

Todas as FKs usam `UUID` para compatibilidade com tabelas existentes (`projetos`, `utilizadores`).

### RLS Policies

- Leitura: `admin` e `gp`
- Escrita: `admin` e `gp`
- Downloads: utilizador próprio

### Índices

```sql
idx_analises_projeto (projeto_id)
idx_analises_concelho (concelho_id)
idx_analises_estado (estado)
idx_matrizes_concelho_tipo_activo (concelho_id, tipo) WHERE activo
idx_prompts_concelho_codigo_activo (concelho_id, codigo) WHERE activo
```

---

## Referências

- PDM de Sintra (1999, com alterações)
- RJUE — Regime Jurídico da Urbanização e Edificação
- RJIGT — Regime Jurídico dos Instrumentos de Gestão Territorial
- RGEU — Regulamento Geral das Edificações Urbanas
