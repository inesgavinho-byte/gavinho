# Gavinho Platform

Plataforma de gestão de projetos de arquitetura e construção civil (Gavin Ho Group).

## Estrutura do Repositório

```
gavinho/
├── gavinho-app/          # Aplicação web principal (React + Vite + Supabase)
│   ├── src/
│   │   ├── components/   # Componentes React (admin, settings, ui, workspace, ObraApp)
│   │   ├── contexts/     # React contexts (Auth, Notification, Theme, etc.)
│   │   ├── hooks/        # Custom hooks (useFinanceiro, useObras, etc.)
│   │   ├── pages/        # Páginas da aplicação
│   │   └── scripts/      # Scripts de seed/dados
│   └── supabase/
│       ├── functions/    # Edge Functions (Deno/TypeScript)
│       └── migrations/   # Migrações SQL
├── gavinho-app 3/        # Cópia antiga (não utilizar para desenvolvimento)
├── gavinho-mobile/       # App mobile (React Native - em desenvolvimento)
├── gavinho-encoding-fix-v7 (1)/ # Fix de encoding (utilitário)
└── docs/                 # Documentação (schema da BD)
```

## Stack Tecnológica

- **Frontend:** React 18, Vite, CSS Modules
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Edge Functions:** Deno/TypeScript
- **Deploy:** Netlify
- **Integrações:** Twilio (WhatsApp), Microsoft Graph (Outlook), OpenAI, web-push

## Comandos

```bash
cd gavinho-app
npm install
npm run dev        # Dev server
npm run build      # Build de produção
```

## Base de Dados

Schema completo documentado em `docs/SUPABASE_DATABASE_SCHEMA.md`.

Tabelas principais: `projetos`, `obras`, `utilizadores`, `orcamento_capitulos`, `facturacao_cliente`, `obra_timeline`, `obra_acoes`, `whatsapp_mensagens`, `obra_emails`.

## TODO

### Pendentes no código

1. **Progresso físico nos capítulos financeiros**
   - **Ficheiro:** `gavinho-app/src/hooks/useFinanceiroDashboard.js:199`
   - **Comentário:** `progresso: 0 // TODO: link to physical progress from obras`
   - **Contexto:** O hook `useFinanceiroDashboard` constrói dados por capítulo de orçamento para o painel financeiro. O campo `progresso` está hardcoded a `0`. Deveria obter o progresso físico real da tabela `obras` (campo `obras.progresso`, INTEGER 0-100).
   - **Complexidade:** Média — requer determinar a relação capítulo → obra (via orçamento/projeto), fazer query à tabela `obras`, e mapear o progresso para cada capítulo. Pode não ser um mapeamento 1:1 se um projeto tiver múltiplas obras.

### Resolvidos

1. ~~**Faturação no Finance.jsx**~~ — O TODO `faturado: 0, // TODO: implementar quando tiver tabela de faturação` existia em `gavinho-app 3/src/pages/Finance.jsx:184`. Já não existe na versão principal (`gavinho-app/`), e a tabela `facturacao_cliente` já foi criada na BD.
