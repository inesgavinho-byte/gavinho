# Blueprint: Relatórios Automáticos

Plano de implementação para geração, exportação e distribuição automática de relatórios na plataforma Gavinho.

---

## Fase 1 — Motor de Colecta + Geração IA

| # | Item | Estado | Notas |
|---|------|--------|-------|
| 1.1 | Tabela `obra_relatorios` (schema completo) | ✅ feito | Migração `20250124_acompanhamento_obra.sql`. Campos: tipo (semanal/quinzenal/mensal/milestone), resumo executivo, trabalhos, problemas, decisões, progresso global + por especialidade, fotos, tópicos JSONB. |
| 1.2 | UI de criação manual de relatórios | ✅ feito | `ObraRelatorios.jsx` (1190 linhas) — editor completo com modal, galeria de fotos, tópicos, progresso, publicação portal. |
| 1.3 | Página de Relatório Semanal | ✅ feito | `RelatorioSemanal.jsx` (738 linhas) — navegação por semana, versão cliente vs interna, resumo diário com meteorologia. |
| 1.4 | Cálculo de métricas de progresso | ✅ feito | `progresso_global` e `progresso_por_especialidade` já no schema; hook `useFinanceiroDashboard` calcula média ponderada e alimenta ETC/EAC. |
| 1.5 | Integração IA para classificação de emails | ✅ feito | Edge function `processar-mensagens-cron` usa Claude Sonnet para analisar emails e extrair sugestões (requisições, horas, trabalhos, não-conformidades). |
| 1.6 | Tabela `ia_sugestoes` + `ia_processamento_log` | ✅ feito | Guardam sugestões extraídas por IA e logs de processamento. |
| 1.7 | Edge function para geração automática de relatório via IA | 🔲 não feito | Falta: função que consulta diários de obra do período, invoca Claude para gerar resumo executivo + trabalhos + problemas, e grava em `obra_relatorios`. |
| 1.8 | Prompt engineering para qualidade de relatório | 🔲 não feito | Definir templates de prompt (semanal vs mensal), tom profissional, bilingue PT/EN, com dados estruturados de entrada. |
| 1.9 | Fallback sem IA (template estático) | 🔲 não feito | Geração básica a partir de dados recolhidos sem chamada IA, para resiliência. |

**Resumo Fase 1:** 6/9 ✅ — infraestrutura de dados e UI manual robustos; falta o motor de geração automática via IA.

---

## Fase 2 — DOCX/PDF Branded + Editor

| # | Item | Estado | Notas |
|---|------|--------|-------|
| 2.1 | Exportação DOCX com branding Gavinho | ✅ feito | `ObraRelatorios.jsx` + `RelatorioSemanal.jsx` usam biblioteca `docx`. Script `scripts/generate-report.js` (534 linhas) gera DOCX com cores Gavinho (olive, blush, cream, brown), tabelas, fotos embebidas, headers bilingues. |
| 2.2 | Exportação PDF | ✅ feito | `ObraRelatorios.jsx` usa `jsPDF`. CSS de impressão em `diario-obra-pdf.css` (543 linhas) com layout profissional. |
| 2.3 | Script de geração em batch | ✅ feito | `scripts/generate-report.js` — aceita JSON, gera DOCX cliente (8 fotos) e interno (16 fotos). |
| 2.4 | Editor de relatório (UI) | ✅ feito | Modal completo em `ObraRelatorios.jsx`: edição de todos os campos, gestão de tópicos (info/progress/problem/decision), galeria de fotos, toggle portal. |
| 2.5 | Versão cliente vs versão interna | ✅ feito | `RelatorioSemanal.jsx` alterna entre versões; versão cliente omite problemas, contagens de trabalhadores, previsão próxima semana. |
| 2.6 | Templates DOCX parametrizáveis (header/footer custom) | ⚠️ parcial | O script `generate-report.js` tem branding fixo. Falta: permitir ao utilizador customizar logótipo, cores, texto de rodapé por projecto. |
| 2.7 | Preview antes de exportar | 🔲 não feito | Falta: pré-visualização do DOCX/PDF no browser antes do download (ex.: renderização inline ou iframe). |

**Resumo Fase 2:** 5/7 ✅, 1 ⚠️ — geração DOCX/PDF e editor funcionais; falta customização de templates e preview.

---

## Fase 3 — Distribuição Email/Portal + Agendamento

| # | Item | Estado | Notas |
|---|------|--------|-------|
| 3.1 | Infraestrutura de email (Resend/SendGrid) | ✅ feito | Tabela `email_config` com provider configurável + chave API encriptada. Edge functions `notification-email` e `email-send`. |
| 3.2 | Notificações por email (individuais) | ✅ feito | `notification-email/index.ts` (362 linhas) — trigger automático ao inserir notificação, templates HTML branded, suporta múltiplos tipos. |
| 3.3 | Digest email (diário/semanal) | ✅ feito | `notification-digest/index.ts` (344 linhas) — agrupa notificações por tipo, template HTML profissional. |
| 3.4 | Preferências de email por utilizador | ✅ feito | Tabela `preferencias_notificacao_email` — frequência (realtime/hourly/daily/weekly/never), tipos granulares via JSONB, hora de digest. |
| 3.5 | Portal cliente (exibição de relatórios) | ✅ feito | `PortalRelatorios.jsx` — lista relatórios publicados (`publicar_no_portal = true`), expansível, resumo portal dedicado. |
| 3.6 | Cron para processamento de emails | ✅ feito | pg_cron a cada 5 min para `process_pending_notification_emails()`. Edge function `processar-mensagens-cron` para análise IA. |
| 3.7 | Envio automático de relatório por email (DOCX/PDF anexo) | 🔲 não feito | Falta: edge function que gera DOCX/PDF server-side, anexa ao email, e envia aos destinatários configurados. |
| 3.8 | Configuração de destinatários por obra/projecto | 🔲 não feito | Falta: tabela/UI para gerir lista de distribuição (cliente, fiscalização, equipa) por obra. |
| 3.9 | Agendamento de geração de relatórios (cron) | 🔲 não feito | Falta: cron job que dispara geração automática (ex.: toda sexta-feira para semanal, dia 1 para mensal). |
| 3.10 | Notificação push/in-app ao publicar relatório | ⚠️ parcial | Infraestrutura web-push existe; falta trigger específico para publicação de relatório. |

**Resumo Fase 3:** 6/10 ✅, 1 ⚠️ — email e portal sólidos; falta distribuição automática de relatórios e agendamento.

---

## Fase 4 — Relatório Mensal Consolidado + Refinamento

| # | Item | Estado | Notas |
|---|------|--------|-------|
| 4.1 | Tipo "mensal" no schema | ✅ feito | Campo `tipo` em `obra_relatorios` já inclui valor `mensal`. |
| 4.2 | Geração de relatório mensal consolidado (agrega semanais) | 🔲 não feito | Falta: lógica que agrega relatórios semanais do mês, compara progresso, gera análise de tendências. |
| 4.3 | Dashboard de relatórios gerados/enviados | 🔲 não feito | Falta: vista admin com contagens, estado de envio, taxa de abertura (se provider suportar). |
| 4.4 | Feedback loop — cliente pode comentar/aprovar | 🔲 não feito | Falta: funcionalidade no portal para o cliente marcar relatório como "visto" ou adicionar comentários. |
| 4.5 | Arquivo e versionamento de relatórios | ⚠️ parcial | Relatórios ficam em `obra_relatorios` com `estado` (rascunho/em_revisao/publicado); falta versionamento (histórico de edições). |
| 4.6 | Métricas de qualidade IA (avaliação de relatórios gerados) | 🔲 não feito | Falta: scoring automático de completude/qualidade do relatório gerado, com sugestões de melhoria. |
| 4.7 | Refinamento de prompts baseado em feedback | 🔲 não feito | Falta: ciclo de melhoria contínua dos prompts IA com base em edições manuais feitas pelo utilizador. |

**Resumo Fase 4:** 1/7 ✅, 1 ⚠️ — apenas o schema suporta mensal; toda a lógica de consolidação, dashboard e refinamento está por fazer.

---

## Resumo Global

| Fase | Descrição | ✅ | ⚠️ | 🔲 | Total | Progresso |
|------|-----------|-----|-----|-----|-------|-----------|
| 1 | Motor colecta + geração IA | 6 | 0 | 3 | 9 | 67% |
| 2 | DOCX/PDF branded + editor | 5 | 1 | 1 | 7 | 79% |
| 3 | Distribuição email/portal + agendamento | 6 | 1 | 3 | 10 | 65% |
| 4 | Relatório mensal + refinamento | 1 | 1 | 5 | 7 | 21% |
| **Total** | | **18** | **3** | **12** | **33** | **59%** |

## Próximos Passos Prioritários

1. **Fase 1.7** — Criar edge function `generate-report-auto` que consulta diários de obra e invoca Claude para gerar relatório
2. **Fase 1.8** — Desenvolver prompts optimizados para geração semanal e mensal
3. **Fase 3.9** — Configurar cron job para disparar geração automática
4. **Fase 3.7** — Implementar envio de relatório por email com DOCX/PDF anexo
5. **Fase 3.8** — Criar tabela e UI de destinatários por obra
6. **Fase 4.2** — Lógica de consolidação mensal a partir de semanais

## Ficheiros Relevantes

| Ficheiro | Descrição |
|----------|-----------|
| `gavinho-app/src/components/ObraRelatorios.jsx` | UI principal de relatórios (criação, edição, exportação) |
| `gavinho-app/src/pages/RelatorioSemanal.jsx` | Página de relatório semanal por obra |
| `gavinho-app/src/portal/PortalRelatorios.jsx` | Exibição no portal do cliente |
| `gavinho-app/scripts/generate-report.js` | Script de geração DOCX em batch |
| `gavinho-app/src/styles/diario-obra-pdf.css` | Estilos CSS para impressão/PDF |
| `gavinho-app/supabase/functions/notification-email/index.ts` | Envio de emails individuais |
| `gavinho-app/supabase/functions/notification-digest/index.ts` | Digest de notificações |
| `gavinho-app/supabase/functions/processar-mensagens-cron/index.ts` | Processamento IA de emails (cron) |
| `gavinho-app/supabase/migrations/20250124_acompanhamento_obra.sql` | Schema `obra_relatorios` |
| `gavinho-app/supabase/migrations/20250206_notification_email_trigger.sql` | Triggers e cron de emails |
