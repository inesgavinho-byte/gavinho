# CLAUDE.md — GAVINHO Platform

## Identity

Architecture/construction luxury firm management platform. Portugal-based, bilingual (PT/EN).
Repo: `inesgavinho-byte/gavinho` | App: `/home/user/gavinho/gavinho-app/`
Deploy: Netlify → `gavinhoplatform.netlify.app` | Supabase ID: `vctcppuvqjstscbzdykn`

## Hard Rules — ALWAYS

1. **NO Tailwind** — CSS Modules + inline styles only. Every component gets its own `.module.css`
2. **Portuguese UI** — All labels, buttons, placeholders, toasts in Portuguese (PT-PT, not BR)
3. **Dates:** PT format `DD/MM/YYYY` on UI, ISO 8601 in database
4. **IDs:** TEXT with prefixes (`proj_`, `obra_`, `req_`) — NEVER numeric/serial
5. **UUIDs:** Always `gen_random_uuid()` for PKs
6. **Brand colors:** verde `#4a5d4a`, beige `#ADAA96`, cream `#F2F0E7`, gold `#C9A882`
7. **Fonts:** Cormorant Garamond (títulos), Quattrocento Sans (corpo)
8. **SQL migrations:** Ready for copy-paste into Supabase SQL editor. Always idempotent
9. **Commits:** Push to feature branch → create PR → provide PR URL and merge link
10. **Named exports only.** One component per file. PascalCase filenames

## Hard Rules — NEVER

1. Never `CREATE POLICY` without `DROP POLICY IF EXISTS` first
2. Never `INSERT INTO` tracking tables without checking column names exist
3. Never `CREATE TABLE IF NOT EXISTS` assuming columns match — use `ALTER TABLE ADD COLUMN IF NOT EXISTS`
4. Never add `NOT NULL` columns in migrations without providing defaults or checking existing data
5. Never leave `console.log` in production code (use only in dev/debug)
6. Never create components larger than 500 lines — extract into sub-components
7. Never import from `@supabase/supabase-js` directly — use `src/lib/supabase.js`

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 7 + React Router 7 |
| Styling | CSS Modules + inline (NO Tailwind) |
| Backend | Supabase (Postgres 15, Auth, Storage, Realtime, Edge Functions) |
| AI | Anthropic Claude Sonnet 4 (GARVIS) + OpenAI embeddings |
| Export | jspdf, docx, xlsx, react-pdf, html2canvas |
| Comms | Twilio (WhatsApp), Outlook (email), Telegram |
| Testing | Vitest + Testing Library |
| Deploy | Netlify (frontend) + Supabase (backend) |

## Component Patterns

```jsx
// Standard component template
import styles from './NomeComponente.module.css';

export function NomeComponente({ projId, ...props }) {
  // 1. Hooks first (useState, useEffect, custom hooks)
  // 2. Handlers
  // 3. Derived data
  // 4. Return JSX
}
```

## File Structure

```
src/
├── components/
│   └── projeto/
│       ├── tabs/          # Tab content components
│       ├── modals/        # Modal components
│       └── dashboard/     # Dashboard cards
├── hooks/                 # Custom hooks (useXxx.js)
├── pages/                 # Route-level pages
├── lib/
│   └── supabase.js        # Single Supabase client instance
└── styles/                # Global CSS + variables
```

## Hook Pattern for Data Fetching

```jsx
export function useNomeFeature(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    // fetch from supabase...
  }, [id]);

  return { data, loading, error, refresh };
}
```

## SQL Migration Template

```sql
-- Migration: YYYYMMDD_descricao.sql
-- Description: [what this does]

-- 1. Tables
CREATE TABLE IF NOT EXISTS nome_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ensure columns exist (for existing tables)
ALTER TABLE nome_tabela ADD COLUMN IF NOT EXISTS nova_coluna TEXT;

-- 3. RLS
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nome_policy" ON nome_tabela;
CREATE POLICY "nome_policy" ON nome_tabela FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. Triggers
CREATE OR REPLACE FUNCTION update_nome_tabela_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_nome ON nome_tabela;
CREATE TRIGGER trigger_nome BEFORE UPDATE ON nome_tabela
FOR EACH ROW EXECUTE FUNCTION update_nome_tabela_updated_at();

-- 5. Seeds (if needed — always include ALL NOT NULL columns)
INSERT INTO seeds_executados (seed_key, nome, executado_em)
VALUES ('seed_name', 'seed_name', now())
ON CONFLICT (seed_key) DO NOTHING;
```

## Module Map (14 modules, 84 pages)

| Module | Key Tables | Status |
|--------|-----------|--------|
| Projetos | projetos, projeto_fases, projeto_entregaveis | ✅ Active |
| Obras | obras, obra_diario, obra_tarefas, obra_presencas | ✅ Active |
| Finance | orcamentos, capitulos, itens, requisicoes, facturacao_cliente, extras | ✅ Active |
| Communications | chat_mensagens, chat_canais, chat_push_subscriptions | ✅ Active |
| GARVIS AI | garvis_chat_logs (trigger: @GARVIS → edge function) | ✅ Active |
| Design Review | projeto_desenhos, projeto_anotacoes | ✅ Active |
| Decisions | projeto_decisoes (with semantic search) | ✅ Active |
| Notifications | notificacoes, notification_preferences | ✅ Active |
| Licensing | licenciamentos | ✅ Active |
| Library | biblioteca_materiais | ✅ Active |
| Moleskine | moleskine_pages (iPad + Apple Pencil) | ✅ Active |
| PWA | Service Worker, push, install prompt | ✅ Active |
| Portal | Cliente (magic link auth) | 🔲 Planned |
| Leads | Pipeline (frontend UI) | 🔲 Planned |

## Known Large Files (refactor candidates)

- `DesignReview.jsx` (105KB) — needs component extraction
- `ProjetoEntregaveis.jsx` (101KB) — needs component extraction
- `MoleskineDigital.jsx` (101KB) — needs component extraction
- `ObraTracking.jsx` (78KB) — needs component extraction

## Bundle Splits

`vendor-react`, `vendor-supabase`, `vendor-docs`, `vendor-pdf`, `vendor-icons`

## Edge Functions (30 total)

- `garvis-chat` — AI assistant (Claude Sonnet 4)
- `send-push` — Web push notifications (web-push)
- `recalcular-alertas-financeiros` — Financial alerts engine
- See `supabase/functions/` for full list

## TODO

- [ ] Restrict RLS policies by user role/team
- [ ] Test GARVIS end-to-end with real data
- [ ] Portal Cliente: magic link auth flow
- [ ] Leads pipeline: build frontend UI
- [ ] Refactor large files (DesignReview, ProjetoEntregaveis, Moleskine, ObraTracking)
- [ ] Deploy: run 20250214_financeiro_phase2_4.sql + deploy edge function

## Reference Files

- `MEMORY.md` — Development history, commits, migration log
- `database-tables.md` — Full schema reference (80+ tables)
- `garvis-architecture.md` — GARVIS AI system details
