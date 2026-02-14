# G.A.R.V.I.S. End-to-End Test Plan

**Date**: 2025-02-14
**Version**: 1.0
**Module**: GARVIS AI Assistant (Project Chat @mention triggered)

---

## Architecture Overview

```
User types @GARVIS in chat
        |
        v
ChatProjetos.jsx detects mention
        |
        v
supabase.functions.invoke('garvis-chat')
        |
        v
Edge Function: garvis-chat/index.ts
  1. Validates input (projetoId, topicoId, mensagem)
  2. Fetches project data (projetos, clientes)
  3. Fetches topic data (chat_topicos, chat_canais)
  4. Fetches chat history (last 10 messages)
  5. Builds project context (decisions, phases, team, stakeholders, renders)
  6. Builds system prompt (PT-PT, professional tone)
  7. Calls Claude Sonnet 4 (1024 max tokens)
  8. Ensures GARVIS bot user exists in utilizadores
  9. Inserts response into chat_mensagens
  10. Updates topic timestamp
  11. Logs to garvis_chat_logs
  12. Returns response + usage stats
        |
        v
Realtime subscription picks up new message
        |
        v
Frontend displays GARVIS response with special styling
```

---

## Pre-requisites

Before testing, ensure:

1. **Migration applied**: `20250214_garvis_bot_user.sql` is run in Supabase SQL editor
2. **Edge function deployed**: `supabase functions deploy garvis-chat`
3. **Environment variables set** on Supabase:
   - `ANTHROPIC_API_KEY` - Valid Anthropic API key
   - `SUPABASE_URL` - Auto-set by Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` - Auto-set by Supabase
4. **GARVIS bot user exists**: Row in `utilizadores` with id `00000000-0000-0000-0000-000000000001`
5. **At least one project** exists with chat channels and topics
6. **User is authenticated** and is a member of the project team

### Verification Queries

```sql
-- Check GARVIS bot user exists
SELECT id, nome, is_bot FROM utilizadores WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check garvis_chat_logs table exists
SELECT COUNT(*) FROM garvis_chat_logs;

-- Check edge function secrets
-- (Run via Supabase Dashboard > Edge Functions > garvis-chat > Secrets)
```

---

## Test Scenarios

### 1. Basic @GARVIS Mention in Project Chat

**Steps**:
1. Navigate to Chat (Comunicacoes > Chat)
2. Select a project with an existing channel and topic
3. In the message input, type `@` to trigger the mention picker
4. Select "G.A.R.V.I.S." from the dropdown
5. Complete the message: `@G.A.R.V.I.S. Ola, como estas?`
6. Press Enter to send

**Expected Results**:
- [ ] User message appears in chat immediately
- [ ] "G.A.R.V.I.S. a processar..." typing indicator appears below the chat
- [ ] After 2-5 seconds, GARVIS response appears as a new message
- [ ] GARVIS message has purple gradient background and "AI" avatar
- [ ] GARVIS message shows "BOT" badge next to the name
- [ ] GARVIS message shows "G.A.R.V.I.S." as author name
- [ ] GARVIS message is shown as a reply to the user's message (parent_id set)
- [ ] Typing indicator disappears after response arrives
- [ ] Response is in Portuguese (PT-PT)

**DB Verification**:
```sql
-- Check the GARVIS response was inserted
SELECT id, conteudo, autor_id, tipo, created_at
FROM chat_mensagens
WHERE autor_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC LIMIT 1;

-- Check the log was created
SELECT id, prompt_usuario, resposta_gerada, tokens_input, tokens_output, tempo_resposta_ms
FROM garvis_chat_logs
ORDER BY created_at DESC LIMIT 1;
```

---

### 2. @GARVIS with Project Context (Phases, Deadlines)

**Steps**:
1. Ensure the project has phases defined in `projeto_fases_contratuais`
2. Ask: `@G.A.R.V.I.S. Em que fase estamos no projeto? Quais sao os prazos?`

**Expected Results**:
- [ ] GARVIS responds with information about current project phases
- [ ] Response references actual phase names and dates from the DB
- [ ] If no phases exist, GARVIS says it doesn't have that information

**DB Verification**:
```sql
-- Verify context was passed
SELECT contexto_projeto->'fases' as fases
FROM garvis_chat_logs
ORDER BY created_at DESC LIMIT 1;
```

---

### 3. @GARVIS with Decision Context

**Steps**:
1. Ensure the project has decisions/duvidas in the `duvidas` table
2. Ask: `@G.A.R.V.I.S. Quais sao as decisoes pendentes neste projeto?`

**Expected Results**:
- [ ] GARVIS responds with recent decisions/questions
- [ ] Response includes decision titles, status, and priority
- [ ] Response is accurate to actual data

**DB Verification**:
```sql
-- Verify decisions context was passed
SELECT contexto_projeto->'duvidas_recentes' as duvidas
FROM garvis_chat_logs
ORDER BY created_at DESC LIMIT 1;
```

---

### 4. @GARVIS with Team Context

**Steps**:
1. Ensure the project has team members in `projeto_equipa`
2. Ask: `@G.A.R.V.I.S. Quem faz parte da equipa deste projeto?`

**Expected Results**:
- [ ] GARVIS lists team members with their roles
- [ ] Names and roles match the actual project team data

---

### 5. @GARVIS with Stakeholder Context

**Steps**:
1. Ensure the project has stakeholders in `projeto_intervenientes`
2. Ask: `@G.A.R.V.I.S. Quem sao os intervenientes neste projeto?`

**Expected Results**:
- [ ] GARVIS lists stakeholders by type (client, contractor, etc.)
- [ ] Entity names and contacts are accurate

---

### 6. @GARVIS Conversation History (Multi-turn)

**Steps**:
1. Send: `@G.A.R.V.I.S. O que sabes sobre este projeto?`
2. Wait for response
3. Send follow-up: `@G.A.R.V.I.S. Podes dar mais detalhes sobre o cliente?`

**Expected Results**:
- [ ] Second response references context from the first exchange
- [ ] GARVIS maintains conversational continuity
- [ ] Chat history (last 10 messages) is passed to the model

---

### 7. @GARVIS General Architecture Question

**Steps**:
1. Ask: `@G.A.R.V.I.S. Qual e a diferenca entre projeto de execucao e projeto de licenciamento?`

**Expected Results**:
- [ ] GARVIS provides a helpful, professional answer
- [ ] Response is in PT-PT
- [ ] Response is concise (within 1024 token limit)
- [ ] Response uses Markdown formatting where appropriate

---

### 8. @GARVIS in Reply Thread

**Steps**:
1. Send a normal message in the topic
2. Click "Reply" on that message
3. In the reply input, mention: `@G.A.R.V.I.S. O que achas desta questao?`

**Expected Results**:
- [ ] GARVIS response has `parent_id` set to the original message
- [ ] Response appears as a reply in the thread
- [ ] Context includes the message being replied to

---

## Error Scenarios

### 9. ANTHROPIC_API_KEY Not Set

**Steps**:
1. Temporarily remove `ANTHROPIC_API_KEY` from Supabase secrets
2. Send: `@G.A.R.V.I.S. Ola`

**Expected Results**:
- [ ] Edge function returns error (not crash)
- [ ] Frontend shows warning toast: "Erro ao processar o pedido"
- [ ] No GARVIS message is inserted in chat
- [ ] Error is logged to console

---

### 10. Invalid Project ID

**Steps**:
1. Manually call the edge function with a non-existent `projetoId`

**Expected Results**:
- [ ] Edge function returns `{ success: false, error: 'Projeto nao encontrado' }`
- [ ] Status code: 400

---

### 11. Network Timeout / Edge Function Slow Response

**Steps**:
1. Send a complex question to GARVIS that requires maximum tokens
2. Monitor the typing indicator behavior

**Expected Results**:
- [ ] Typing indicator shows for the full duration of processing
- [ ] If response takes > 30s, Supabase may timeout - verify graceful handling
- [ ] Fallback message reload at 2000ms picks up any missed messages

---

### 12. Empty Project (No Data)

**Steps**:
1. Create a new project with no phases, no decisions, no team members
2. Create a chat channel and topic in that project
3. Ask: `@G.A.R.V.I.S. Faz um resumo deste projeto`

**Expected Results**:
- [ ] GARVIS responds gracefully, noting limited data
- [ ] Does NOT hallucinate or invent project data
- [ ] Suggests adding more project information

---

### 13. GARVIS Bot User Missing from DB

**Steps**:
1. Delete the GARVIS bot user: `DELETE FROM utilizadores WHERE id = '00000000-0000-0000-0000-000000000001'`
2. Send: `@G.A.R.V.I.S. Ola`

**Expected Results**:
- [ ] Edge function auto-creates the GARVIS bot user
- [ ] Response is inserted successfully
- [ ] If auto-creation fails, fallback inserts message with `tipo: 'sistema'` and `autor_id: null`
- [ ] User still sees the response (possibly without GARVIS styling)

---

### 14. Rapid Multiple @GARVIS Mentions

**Steps**:
1. Send: `@G.A.R.V.I.S. Pergunta 1`
2. Immediately send: `@G.A.R.V.I.S. Pergunta 2`

**Expected Results**:
- [ ] Both questions receive responses
- [ ] Responses arrive in order (though not guaranteed)
- [ ] No race conditions in message loading
- [ ] Typing indicator handles both requests

---

### 15. @GARVIS with Very Long Message

**Steps**:
1. Send a message with @GARVIS mention containing 2000+ characters

**Expected Results**:
- [ ] Edge function handles the long message without error
- [ ] Response is generated successfully
- [ ] Tokens usage is logged correctly

---

## GarvisPanel (Procurement) Tests

The GarvisPanel is a separate GARVIS system for the Fornecedores module.
It uses direct Claude API calls from the browser, not the edge function.

### 16. GarvisPanel Basic Chat

**Steps**:
1. Navigate to Fornecedores page
2. Open the GARVIS panel (if available)
3. Type a question about procurement

**Expected Results**:
- [ ] Panel shows loading state while processing
- [ ] Response appears in the chat section
- [ ] Suggestion chips are shown when chat is empty

### 17. GarvisPanel Slash Commands

**Steps**:
1. Type `/ajuda` in the GARVIS panel

**Expected Results**:
- [ ] Help message with available commands is shown
- [ ] Commands: /recomendar, /comparar, /analisar, /status

### 18. GarvisPanel API Key Missing

**Steps**:
1. Ensure no `claude_api_key` in localStorage or `garvis_configuracao` table
2. Type a question in the GARVIS panel

**Expected Results**:
- [ ] Error message: "API key do Claude nao configurada"
- [ ] Suggestion to configure in Administration

---

## Realtime & Performance Tests

### 19. Realtime Message Delivery

**Steps**:
1. Open the same chat topic in two browser windows
2. In window 1, send: `@G.A.R.V.I.S. Ola`
3. Observe window 2

**Expected Results**:
- [ ] Window 2 receives the user message via Realtime
- [ ] Window 2 receives the GARVIS response via Realtime
- [ ] Notification sound plays in window 2 for the GARVIS message

### 20. Response Time

**Steps**:
1. Send several @GARVIS questions
2. Check `garvis_chat_logs.tempo_resposta_ms`

**Expected Results**:
- [ ] Average response time: 2-5 seconds
- [ ] Token usage is reasonable (< 500 input, < 1024 output)
- [ ] No responses exceed 30 seconds

---

## Data Integrity Tests

### 21. garvis_chat_logs Completeness

**Steps**:
1. After running several test scenarios, query the logs

```sql
SELECT
  id,
  projeto_id,
  topico_id,
  mensagem_utilizador_id,
  mensagem_resposta_id,
  LEFT(prompt_usuario, 50) as prompt,
  LEFT(resposta_gerada, 50) as resposta,
  modelo_usado,
  tokens_input,
  tokens_output,
  tempo_resposta_ms,
  created_at
FROM garvis_chat_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results**:
- [ ] Every @GARVIS interaction has a log entry
- [ ] `projeto_id` and `topico_id` are always set
- [ ] `mensagem_resposta_id` references the actual chat message
- [ ] `tokens_input` and `tokens_output` are populated
- [ ] `tempo_resposta_ms` is realistic (> 500, < 30000)
- [ ] `modelo_usado` is `claude-sonnet-4-20250514`
- [ ] `contexto_projeto` JSON contains relevant project data

### 22. Message Parent-Child Relationship

**Steps**:
1. After a GARVIS response, check the parent_id

```sql
SELECT m1.id, m1.conteudo as garvis_response, m1.parent_id,
       m2.conteudo as original_message
FROM chat_mensagens m1
LEFT JOIN chat_mensagens m2 ON m1.parent_id = m2.id
WHERE m1.autor_id = '00000000-0000-0000-0000-000000000001'
ORDER BY m1.created_at DESC LIMIT 5;
```

**Expected Results**:
- [ ] GARVIS responses have `parent_id` pointing to the triggering message
- [ ] The parent message contains the @GARVIS mention

---

## Deployment Checklist

- [ ] Run migration: `20250214_garvis_bot_user.sql`
- [ ] Deploy edge function: `supabase functions deploy garvis-chat`
- [ ] Set secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
- [ ] Verify GARVIS bot user exists in `utilizadores`
- [ ] Verify Realtime is enabled on `chat_mensagens` table
- [ ] Test basic @GARVIS mention flow end-to-end
- [ ] Monitor edge function logs for errors: `supabase functions logs garvis-chat`

---

## Known Limitations

1. **No streaming**: GARVIS responses are not streamed - the user waits for the full response
2. **No image/file analysis**: GARVIS can only process text messages
3. **1024 token limit**: Responses are capped at ~750 words
4. **No actions**: GARVIS can only inform, not execute actions in the platform
5. **Context window**: Only last 10 messages + project context are passed to the model
6. **Single model**: Uses Claude Sonnet 4 only (no model selection)
7. **No feedback loop**: The `feedback_positivo` column in garvis_chat_logs is not yet wired up in the UI
