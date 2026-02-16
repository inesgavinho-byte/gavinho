# Plano de Teste E2E - GARVIS

## Contexto

GARVIS (Gavinho Assistant for Responsive Virtual Intelligence Support) opera em dois modos:
- **Chat Mode**: @GARVIS em chat de projetos (edge function + Claude Sonnet 4)
- **Procurement Mode**: GarvisPanel com alertas, matching de fornecedores e deal rooms

## Abordagem

Como não temos acesso a um Supabase live nem API keys configuradas, os testes E2E serão **code-level tests** que validam toda a lógica de negócio com dados simulados realistas. Também faremos **revisão estática detalhada** de cada ficheiro para detetar bugs.

---

## Passos do Plano

### 1. Verificar que @GARVIS funciona no chat
- **Revisar** `ChatProjetos.jsx` (linhas 744-833): lógica de deteção de menções, regex, invocação da edge function
- **Revisar** `supabase/functions/garvis-chat/index.ts`: context-builder, system prompt, chamada à API Claude, inserção de resposta
- **Escrever teste** que valida: deteção de `@GARVIS` na mensagem, extração de menções, limpeza de texto, payload correto
- **Documentar** bugs encontrados

### 2. Testar comandos: /recomendar, /status, /ajuda
- **Revisar** `src/services/garvisChat.js`: parsing de comandos, respostas formatadas
- **Escrever testes** para cada comando com dados mock:
  - `/recomendar [especialidade]` — retorna fornecedores ordenados por score
  - `/status` — KPIs formatados (€, contagens)
  - `/ajuda` — lista completa de comandos
  - `/comparar Nome1, Nome2` — comparação lado-a-lado
  - `/analisar [code]` — análise de deal room
- **Documentar** edge cases e bugs

### 3. Verificar context-builder com projeto real
- **Revisar** edge function `garvis-chat/index.ts`: queries ao Supabase para fases, equipa, decisões, stakeholders
- **Escrever teste** que valida construção do system prompt com dados simulados
- **Verificar** que o contexto inclui: código, nome, cliente, estado, tipologia, dúvidas, fases, equipa, stakeholders, renders
- **Documentar** dados em falta ou erros de formatação

### 4. Testar alertas inteligentes
- **Revisar** `src/hooks/useGarvisAlerts.js`: geração automática de alertas
- **Escrever testes** para:
  - Certificações a expirar (< 30 dias)
  - Desvios de orçamento (> 15%)
  - Prioridades: critico, importante, normal, info
  - Marcar como lido / arquivar
- **Documentar** bugs

### 5. Testar matching de fornecedores
- **Revisar** `src/services/garvisMatching.js`: algoritmo de scoring (0-100)
- **Escrever testes** para:
  - `calculateMatchScore()` com pesos (especialidade 25%, rating 20%, preço 20%, entrega 15%, experiência 10%, zona 5%, preferencial 5%)
  - `rankSuppliers()` — ordenação correta
  - `compareSuppliers()` — tabela de comparação
  - Edge cases: fornecedor sem dados, scores extremos
- **Documentar** bugs no algoritmo

### 6. Compilar e validar build
- Executar `npm run build` em `gavinho-app/` para detetar erros de compilação
- Verificar imports e dependências do GARVIS

### 7. Documentar bugs encontrados
- Criar `gavinho-app/docs/GARVIS_E2E_BUGS.md` com todos os bugs
- Classificar: Critical, High, Medium, Low
- Incluir localização (ficheiro:linha) e sugestão de fix
- Commit e push para branch `claude/test-garvis-e2e-iifJR`

---

## Ficheiros a criar

| Ficheiro | Ação |
|----------|------|
| `gavinho-app/src/__tests__/garvis-e2e.test.js` | Testes E2E completos |
| `gavinho-app/docs/GARVIS_E2E_BUGS.md` | Relatório de bugs |

## Ficheiros a revisar em detalhe

| Ficheiro | Foco |
|----------|------|
| `src/pages/ChatProjetos.jsx` | @GARVIS mention detection |
| `supabase/functions/garvis-chat/index.ts` | Edge function + context-builder |
| `src/services/garvisChat.js` | Comandos slash |
| `src/services/garvisMatching.js` | Algoritmo de matching |
| `src/services/garvisQuoteAnalysis.js` | Análise de orçamentos |
| `src/hooks/useGarvisAlerts.js` | Alertas inteligentes |
| `src/hooks/useGarvisKPIs.js` | KPIs procurement |
| `src/components/GarvisPanel.jsx` | Painel procurement |
