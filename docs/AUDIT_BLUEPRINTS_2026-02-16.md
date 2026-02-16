# AUDIT: 3 Blueprints vs Código Actual
**Data:** 2026-02-16

## RESUMO EXECUTIVO

| Blueprint | Itens Total | ✅ Feito | ⚠️ Parcial | 🔲 Não feito |
|---|---|---|---|---|
| **Transcrição Reuniões** | 19 | 3 | 4 | 12 |
| **Portal Cliente** | 23 | 14 | 4 | 5 |
| **Passaporte Edifício** | 19 | 0 | 0 | 19 |
| **TOTAL** | **61** | **17 (28%)** | **8 (13%)** | **36 (59%)** |

---

## 1. TRANSCRIÇÃO REUNIÕES

### FASE 1 — Upload + Transcrição

| Item | Status | Evidência |
|---|---|---|
| Schema `reunioes`, `reuniao_segmentos`, `reuniao_participantes` | ⚠️ Parcial | Tabelas blueprint não existem. Existe `projeto_atas` com participantes/decisões/acções em JSONB. **Ficheiro:** `gavinho-app/supabase/migrations/20250201_projeto_atas.sql:7-48` |
| UI upload áudio (mp3/m4a/wav) | 🔲 Não feito | Sem upload áudio para reuniões. `ObraChat.jsx` suporta anexos audio genéricos (`chat_anexos.tipo = 'audio'`). **Ficheiro:** `gavinho-app/supabase/migrations/20250127_jarvis_system.sql:10-42` |
| Edge function transcrição Whisper API | 🔲 Não feito | 0 edge functions com Whisper nas 24 em `supabase/functions/` |
| Player áudio com segmentos/timestamps | 🔲 Não feito | Sem componente player áudio com timestamp nav |
| Identificação manual de speakers | 🔲 Não feito | Sem UI speaker assignment |
| Storage bucket para áudios | ⚠️ Parcial | Bucket `'obras'` genérico (`ObraChat.jsx:138`), sem bucket dedicado áudios reuniões |

### FASE 2 — Análise IA + Integração

| Item | Status | Evidência |
|---|---|---|
| Edge function análise Claude (decisões, acções, NCs, questões) | 🔲 Não feito | `decisoes-detectar` existe mas só para emails. **Ficheiro:** `gavinho-app/supabase/functions/decisoes-detectar/index.ts` |
| UI painel validação com "ouvir excerto" | 🔲 Não feito | Sem componente validação com playback |
| Integração decisões → tabela `decisoes` | ✅ Feito | `fonte CHECK ('email', 'reuniao', 'chat', 'manual')` — `reuniao` previsto. **Ficheiro:** `gavinho-app/supabase/migrations/20250125_040_create_decisoes.sql:51` |
| Integração acções → tarefas Kanban | ⚠️ Parcial | `AcoesInline` nas atas (l.551-702) mas sem link ao Kanban `tarefas`. **Ficheiro:** `gavinho-app/src/components/ProjetoAtas.jsx:551-702` |
| Integração NCs → `nao_conformidades` | ✅ Feito | Tabela com `nc_fotografias` + `nc_historico`. **Ficheiro:** `gavinho-app/supabase/migrations/20250124_acompanhamento_obra.sql:166-235` |
| Embeddings transcrições pesquisa semântica | ⚠️ Parcial | `decisoes.embedding` (VECTOR 1536) + `decisoes-embedding` edge fn. Sem embeddings de transcrições. **Ficheiro:** `gavinho-app/supabase/migrations/20250125_040_create_decisoes.sql:48` |
| Diarização automática (speaker detection) | 🔲 Não feito | Sem implementação |

### FASE 3 — Ata + Distribuição

| Item | Status | Evidência |
|---|---|---|
| Geração automática ata DOCX | 🔲 Não feito | Export PDF existe (`ProjetoAtas.jsx:755-792` via jsPDF), sem DOCX |
| Envio ata por email (SendGrid) | 🔲 Não feito | SendGrid configurado (`notification-email/index.ts`, `email-send/index.ts`), sem workflow atas |
| Publicação no portal cliente | 🔲 Não feito | Portal existe mas sem secção atas |
| Integração Microsoft Teams Graph API | 🔲 Não feito | `graph-webhook/index.ts` para Outlook, sem transcrição Teams |
| Pesquisa semântica cross-reuniões | 🔲 Não feito | `decisoes-search` existe mas não abrange reuniões |
| Dashboard reuniões com filtros | ✅ Feito | Sidebar com secções (diario_bordo, reunioes_equipa/cliente/obra). **Ficheiro:** `gavinho-app/src/components/ProjetoAtas.jsx:1241-1334` + `gavinho-app/supabase/migrations/20250206_projeto_atas_secao.sql:6-14` |

---

## 2. PORTAL CLIENTE

### FASE 1 — Auth + Layout + Home

| Item | Status | Evidência |
|---|---|---|
| Schema `portal_config` (por projecto) | ✅ Feito | Tabela com email, idioma, flags notificação, acessos. **Ficheiro:** `gavinho-app/supabase/migrations/20250208_portal_cliente.sql:12-41` |
| Auth magic link Supabase | ✅ Feito | `supabase.auth.signInWithOtp()`. **Ficheiro:** `gavinho-app/src/portal/PortalLogin.jsx:17-22` |
| Layout portal separado (sem sidebar interna) | ✅ Feito | Nav desktop, hamburger mobile, bottom nav. **Ficheiro:** `gavinho-app/src/portal/PortalLayout.jsx:64-321` |
| Rotas `/portal/*` isoladas | ✅ Feito | 8 rotas lazy-loaded. **Ficheiro:** `gavinho-app/src/App.jsx:77-86` |
| Home progresso global, contadores, marcos | ✅ Feito | Barra progresso, stats, 5 próximos marcos. **Ficheiro:** `gavinho-app/src/portal/PortalHome.jsx:101-200` |
| RLS policies cliente (só vê seu projecto) | ⚠️ Parcial | RLS em 5 tabelas mas policies permissivas `USING (true)`. **Ficheiro:** `gavinho-app/supabase/migrations/20250208_portal_cliente.sql:46-48` |

### FASE 2 — Conteúdo

| Item | Status | Evidência |
|---|---|---|
| Galeria fotos com filtro zona + lightbox | ✅ Feito | Filtro zona, tipo, lightbox com keyboard nav. **Ficheiro:** `gavinho-app/src/portal/PortalGaleria.jsx:80-229` |
| Modo antes/depois com slider | ⚠️ Parcial | `FotoComparador.jsx` com antes/depois por compartimento (grelha lado-a-lado, não slider overlay). Migration `compartimento` criada. **Ficheiro:** `gavinho-app/src/components/FotoComparador.jsx:1-30` + `gavinho-app/supabase/migrations/20260215_foto_comparador.sql:1-11` |
| Timeline marcos + progresso especialidade | ✅ Feito | Marcos com estados, badges, progress summary. **Ficheiro:** `gavinho-app/src/portal/PortalTimeline.jsx:98-233` |
| Relatórios viewer + download PDF | ⚠️ Parcial | Lista expandível com badge. Sem download PDF. **Ficheiro:** `gavinho-app/src/portal/PortalRelatorios.jsx:70-112` |
| Flag `publicar_no_portal` (admin) | ✅ Feito | Colunas em 4 tabelas + `PortalToggle.jsx` reutilizável. **Ficheiro:** `gavinho-app/supabase/migrations/20250208_portal_cliente.sql:54-75` + `gavinho-app/src/components/PortalToggle.jsx:1-68` |

### FASE 3 — Interacção

| Item | Status | Evidência |
|---|---|---|
| Decisões opções + resposta cliente | ✅ Feito | Tabs filtro, botões opção `opcoes_cliente` JSONB, textarea, prazo overdue. **Ficheiro:** `gavinho-app/src/portal/PortalDecisoes.jsx:43-240` |
| Pesquisa decisões | ✅ Feito | View `v_portal_decisoes` + `decisoes-search` edge fn. **Ficheiro:** `gavinho-app/supabase/migrations/20250208_portal_cliente.sql:206-218` |
| Documentos categorias + download | ✅ Feito | 6 categorias, ícones, versão, link download. **Ficheiro:** `gavinho-app/src/portal/PortalDocumentos.jsx:82-159` |
| Mensagens portal (chat cliente ↔ equipa) | ✅ Feito | Realtime, bolhas, agrupamento data. **Ficheiro:** `gavinho-app/src/portal/PortalMensagens.jsx:23-193` |
| Schema `portal_mensagens` | ✅ Feito | `autor_tipo` (cliente/equipa), read receipts. **Ficheiro:** `gavinho-app/supabase/migrations/20250208_portal_cliente.sql:110-133` |
| Notificações email SendGrid | 🔲 Não feito | Flags em `portal_config:33-36`, sem edge function trigger |
| Publicação em lote (admin) | 🔲 Não feito | Só toggle individual via `PortalToggle.jsx` |

### FASE 4 — Refinamento

| Item | Status | Evidência |
|---|---|---|
| Traduções bilingue PT/EN | ✅ Feito | Objecto `translations`, `t()`, toggle DB. **Ficheiro:** `gavinho-app/src/portal/PortalLayout.jsx:23-58` |
| Dashboard analytics `portal_acessos` | ⚠️ Parcial | Tabela + logging activo, sem UI dashboard. **Ficheiro:** `gavinho-app/supabase/migrations/20250208_portal_cliente.sql:139-156` |
| Lembretes automáticos decisões pendentes | 🔲 Não feito | `prazo_resposta_cliente` existe, sem cron |
| PWA (add to home screen) | 🔲 Não feito | Manifests app principal existem, sem PWA portal. **Ficheiro:** `gavinho-app/src/main.jsx` |
| Sugestões automáticas agentes publicação | 🔲 Não feito | Sem implementação |

---

## 3. PASSAPORTE DO EDIFÍCIO

**Status global: 0% implementado. Zero ficheiros com "passaporte" ou "passport" no codebase.**

### FASE 1 — Schema + Materiais

| Item | Status | Evidência |
|---|---|---|
| Schema `passaportes`, `passaporte_materiais`, `passaporte_artesaos`, `passaporte_manutencao` | 🔲 Não feito | 0 tabelas, 0 migrations |
| Edge function agregar dados POs/decisões/fornecedores | 🔲 Não feito | 0 das 24 edge functions para passaporte |
| UI painel curadoria (checklist + progresso) | 🔲 Não feito | Sem componente |
| Editor materiais (auto + editorial) | 🔲 Não feito | `Biblioteca.jsx` + `MaterialForm.jsx` existem como infra base |
| Botão "Gerar texto editorial IA" | 🔲 Não feito | AI disponível via `garvis-chat` mas sem workflow passaporte |

### FASE 2 — Artesãos + Espaços + Evolução

| Item | Status | Evidência |
|---|---|---|
| Editor artesãos (bio, retrato, citação) | 🔲 Não feito | Sem tabela nem componente |
| Vista por espaço | 🔲 Não feito | `projeto_compartimentos` existe como infra base |
| Timeline evolução | 🔲 Não feito | `projeto_marcos` e `obra_timeline` existem mas sem curadoria passaporte |
| Geração editorial Claude | 🔲 Não feito | Claude API disponível, sem prompt passaporte |
| Pré-visualização passaporte | 🔲 Não feito | Sem componente |

### FASE 3 — Exportação + Manutenção

| Item | Status | Evidência |
|---|---|---|
| Geração PDF premium | 🔲 Não feito | `jspdf`, `react-pdf`, `html2canvas` disponíveis |
| CRUD tarefas manutenção | 🔲 Não feito | `tarefas` genérica existe, sem `passaporte_manutencao` |
| Calendário manutenção visual | 🔲 Não feito | `Calendario.jsx` existe como infra base |
| Tabela garantias | 🔲 Não feito | `fornecedor_certificacoes` + `purchase_orders` como infra base |
| QR codes materiais | 🔲 Não feito | 0 library QR codes instalada |

### FASE 4 — Portal Digital + Lembretes

| Item | Status | Evidência |
|---|---|---|
| Secção Passaporte `/portal/passaporte/*` | 🔲 Não feito | Rotas portal sem `/portal/passaporte`. **Ficheiro:** `gavinho-app/src/App.jsx:77-86` |
| Navegação interactiva capítulo/divisão | 🔲 Não feito | Sem componente |
| QR codes páginas individuais material | 🔲 Não feito | Sem implementação |
| Lembretes manutenção (pg_cron + SendGrid) | 🔲 Não feito | SendGrid disponível, sem cron manutenção |

---

## INFRAESTRUTURA REUTILIZÁVEL

| Componente | Reutilizável para | Ficheiro |
|---|---|---|
| Claude API (Sonnet 4 + Haiku) | Reuniões F2, Passaporte F1-2 | `supabase/functions/garvis-chat/index.ts` |
| SendGrid email | Reuniões F3, Portal F3, Passaporte F4 | `supabase/functions/email-send/index.ts` |
| Vector embeddings (1536) | Reuniões F2 | `supabase/functions/decisoes-embedding/index.ts` |
| Microsoft Graph | Reuniões F3 | `supabase/functions/graph-webhook/index.ts` |
| PDF/DOCX export libs | Reuniões F3, Passaporte F3 | `jspdf`, `docx`, `react-pdf` |
| `FotoComparador.jsx` | Portal F2 (slider) | `gavinho-app/src/components/FotoComparador.jsx` |
| Biblioteca materiais | Passaporte F1 | `gavinho-app/src/pages/Biblioteca.jsx` |
| Portal completo (9 componentes) | Passaporte F4 | `gavinho-app/src/portal/` |
| Service worker / PWA | Portal F4 | `gavinho-app/src/main.jsx` |
| `projeto_compartimentos` | Passaporte F2 | `gavinho-app/supabase/migrations/20250202_projeto_compartimentos.sql` |
| Calendário | Passaporte F3 | `gavinho-app/src/pages/Calendario.jsx` |
