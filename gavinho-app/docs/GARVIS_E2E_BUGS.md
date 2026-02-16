# GARVIS E2E — Relatório de Bugs

**Data:** 2026-02-16
**Branch:** `claude/test-garvis-e2e-iifJR`
**Testes executados:** 80 testes (todos passam, bugs documentados como assertions explícitas)

---

## Resumo

| Severidade | Quantidade |
|------------|-----------|
| Critical   | 1         |
| High       | 2         |
| Medium     | 2         |
| Low        | 3         |
| **Total**  | **8**     |

---

## BUG-001 — [CRITICAL] Mensagens consecutivas do mesmo role violam API Claude

**Ficheiro:** `supabase/functions/garvis-chat/index.ts:451-467`
**Teste:** `garvis-e2e.test.js` → "GARVIS - Conversation Message Builder" → "[BUG] mensagens consecutivas do mesmo role violam API Claude"

**Descrição:** A função `buildConversationMessages` constrói o array de mensagens a partir do histórico do chat, atribuindo `role: 'user'` a todas as mensagens humanas e `role: 'assistant'` às mensagens GARVIS. Se múltiplos utilizadores postam sem GARVIS responder (cenário normal num chat de equipa), a API Claude recebe mensagens consecutivas com o mesmo role e **rejeita o pedido com erro**.

**Exemplo:**
```
[
  { role: 'user', content: '[Ana]: bom dia' },
  { role: 'user', content: '[Pedro]: concordo' },     // ← ERRO: consecutivo
  { role: 'user', content: '[Carlos]: eu tb acho' },   // ← ERRO: consecutivo
  { role: 'user', content: '[Ana]: @GARVIS opina' }
]
```

**Impacto:** GARVIS falha completamente em tópicos com múltiplos participantes quando não há respostas GARVIS intermédias. A API Claude retorna erro 400.

**Sugestão de fix:**
```typescript
// Consolidar mensagens consecutivas do mesmo role
function buildConversationMessages(historico, mensagemAtual, autorNome) {
  const raw = []
  const historicoOrdenado = [...historico].reverse()

  for (const msg of historicoOrdenado) {
    const isGarvis = msg.autor_id === GARVIS_USER_ID || msg.autor?.is_bot
    const role = isGarvis ? 'assistant' : 'user'
    const nome = msg.autor?.nome || 'Utilizador'
    const content = isGarvis ? msg.conteudo : `[${nome}]: ${msg.conteudo}`
    raw.push({ role, content })
  }
  raw.push({ role: 'user', content: `[${autorNome}]: ${mensagemAtual}` })

  // Merge consecutive same-role messages
  const messages = []
  for (const msg of raw) {
    if (messages.length > 0 && messages[messages.length - 1].role === msg.role) {
      messages[messages.length - 1].content += '\n' + msg.content
    } else {
      messages.push({ ...msg })
    }
  }
  return messages
}
```

---

## BUG-002 — [HIGH] Mensagem do utilizador duplicada no contexto

**Ficheiro:** `supabase/functions/garvis-chat/index.ts:94-106` e `:470-473`
**Teste:** `garvis-e2e.test.js` → "GARVIS - Conversation Message Builder" → "[BUG] mensagem atual pode estar duplicada no histórico"

**Descrição:** O fluxo é:
1. `ChatProjetos.jsx` insere a mensagem na BD (linha 765-776)
2. `ChatProjetos.jsx` chama a edge function com `mensagemId`
3. Edge function busca os últimos 10 mensagens do tópico (que já inclui a mensagem recém-inserida)
4. Edge function adiciona a mensagem novamente como "mensagem atual" (linha 470-473)

**Impacto:** A mensagem do utilizador aparece duplicada no contexto enviado à Claude, podendo confundir a resposta e desperdiçar tokens.

**Sugestão de fix:**
```typescript
// Filtrar a mensagem atual do histórico
const historicoFiltrado = (historico || []).filter(m => m.id !== mensagemId)
```

---

## BUG-003 — [HIGH] /status mostra volumeYTD como número raw em vez de formatado

**Ficheiro:** `src/services/garvisChat.js:265`
**Teste:** `garvis-e2e.test.js` → "GARVIS - /status Output Format" → "[BUG] /status mostra volumeYTD raw (1250000) em vez de formatado"

**Descrição:** Na linha 265:
```javascript
response += `💰 Volume YTD: ${kpis.volumeYTD || kpis.volumeYTDFormatted || '—'}\n`
```
O operador `||` avalia `kpis.volumeYTD` primeiro. Se este é `1250000` (truthy), nunca chega a `kpis.volumeYTDFormatted` (`€1.3M`). O utilizador vê "Volume YTD: 1250000" em vez de "Volume YTD: €1.3M".

**Impacto:** Má experiência de utilizador — número raw sem formatação EUR.

**Sugestão de fix:**
```javascript
response += `💰 Volume YTD: ${kpis.volumeYTDFormatted || kpis.volumeYTD || '—'}\n`
```
Trocar a ordem: preferir o valor formatado.

---

## BUG-004 — [MEDIUM] Auto-alertas ignoram orçamentos suspeitamente baixos

**Ficheiro:** `src/hooks/useGarvisAlerts.js:155-156`
**Teste:** `garvis-e2e.test.js` → "GARVIS - Alertas Inteligentes" → "[BUG] alertas só detetam desvios positivos (>15%), ignoram preços suspeitos baixos"

**Descrição:** A query de auto-geração de alertas usa:
```javascript
.gt('desvio_percentual', 15)
```
Isto só detecta orçamentos **acima** do mercado. Orçamentos com desvio < -20% (suspeitamente baixos, que podem indicar problemas de qualidade) são ignorados.

Note-se que `garvisQuoteAnalysis.js:115` já detecta `desvio < -20` durante a análise individual, mas a auto-geração periódica de alertas não cobre este caso.

**Impacto:** Fornecedores com preços suspeitamente baixos passam sem alerta automático.

**Sugestão de fix:**
```javascript
// Adicionar segunda query para desvios negativos
const { data: lowQuotes } = await supabase
  .from('orcamento_recebido_linhas')
  .select('*, orcamentos_recebidos!inner(fornecedor_id, fornecedores!inner(nome))')
  .lt('desvio_percentual', -20)
  .order('created_at', { ascending: false })
  .limit(10)

if (lowQuotes?.length > 0) {
  for (const line of lowQuotes) {
    // ... criar alerta tipo 'preco_suspeito'
  }
}
```

---

## BUG-005 — [MEDIUM] Edge function não valida ANTHROPIC_API_KEY

**Ficheiro:** `supabase/functions/garvis-chat/index.ts:58`

**Descrição:**
```typescript
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!
```
O non-null assertion (`!`) suprime o erro TypeScript, mas em runtime se a env var não estiver definida, `anthropicKey` será `undefined`. A instanciação do cliente Anthropic não falha imediatamente — o erro só aparece quando tenta chamar a API, com mensagem críptica.

**Impacto:** Erro difícil de diagnosticar quando a API key não está configurada.

**Sugestão de fix:**
```typescript
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
if (!anthropicKey) {
  return new Response(
    JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY não configurada no Supabase' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
  )
}
```

---

## BUG-006 — [LOW] Certificações já expiradas não geram alerta

**Ficheiro:** `src/hooks/useGarvisAlerts.js:119`
**Teste:** `garvis-e2e.test.js` → "GARVIS - Alertas Inteligentes" → "[BUG] certificações já expiradas não geram alerta"

**Descrição:**
```javascript
.lte('data_validade', thirtyDaysFromNow.toISOString().split('T')[0])
.gte('data_validade', new Date().toISOString().split('T')[0])
```
A condição `gte(today)` exclui certificações que já expiraram. Se uma certificação expirou ontem sem ter gerado alerta (ex: sistema offline), nunca será alertada.

**Sugestão de fix:** Usar um range mais amplo, ex: `gte(today - 7 days)`, para cobrir certificações recém-expiradas.

---

## BUG-007 — [LOW] /status usa campo `kpis.total` que não existe

**Ficheiro:** `src/services/garvisChat.js:264`

**Descrição:**
```javascript
response += `📊 Fornecedores: ${kpis.total || kpis.totalFornecedores || '—'}\n`
```
O objecto KPIs de `useGarvisKPIs.js` nunca tem `kpis.total` — usa `kpis.totalFornecedores`. O fallback funciona (chega a `totalFornecedores`), mas o código é desnecessariamente confuso. Isto repete-se nas linhas 267-268 com `kpis.orcamentos` e `kpis.alertas`.

**Impacto:** Nenhum impacto funcional, mas código morto/confuso.

---

## BUG-008 — [LOW] GarvisPanel só carrega histórico quando chat está vazio

**Ficheiro:** `src/components/GarvisPanel.jsx:62-70`

**Descrição:**
```javascript
setChatMessages(prev => {
  if (prev.length === 0 && history.length > 0) {
    return history.flatMap(h => [...])
  }
  return prev
})
```
Se o utilizador já enviou mensagens na sessão e depois muda para o tab "Histórico", o histórico da BD não é carregado. O utilizador não consegue ver conversas anteriores.

**Sugestão de fix:** Separar mensagens de chat e histórico em states diferentes, ou mostrar o histórico num componente separado independente do chat actual.

---

## Notas Adicionais

### Segurança — API Key no Browser
`garvisChat.js:284` armazena a API key Anthropic em `localStorage` e faz chamadas directas do browser (`anthropic-dangerous-direct-browser-access: true`). Isto é inerente ao design (sem backend custom), mas expõe a chave no browser. Considerar mover para uma edge function (como já é feito no chat de projecto).

### Performance — N+1 Queries no Matching
`garvisMatching.js:204-208` chama `enrichSupplierData` para cada fornecedor sequencialmente, executando 4 queries Supabase por fornecedor. Com 50 fornecedores, são 200 queries. Considerar batch queries.

### Modelo Claude
- Edge function usa `claude-sonnet-4-20250514`
- GarvisPanel usa `claude-sonnet-4-5-20250929`
- Modelos diferentes podem dar respostas com qualidades/estilos diferentes. Considerar unificar.
