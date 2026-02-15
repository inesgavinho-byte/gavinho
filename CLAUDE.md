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
- **Integrações:** Microsoft Graph (Outlook), OpenAI, web-push

## Comandos

```bash
cd gavinho-app
npm install
npm run dev        # Dev server
npm run build      # Build de produção
```

## Base de Dados

Schema completo documentado em `docs/SUPABASE_DATABASE_SCHEMA.md`.

Tabelas principais: `projetos`, `obras`, `utilizadores`, `orcamento_capitulos`, `facturacao_cliente`, `obra_timeline`, `obra_acoes`, `obra_emails`.

## TODO

### Pendentes no código

_(Sem TODOs pendentes)_

### Resolvidos

1. ~~**Faturação no Finance.jsx**~~ — O TODO `faturado: 0, // TODO: implementar quando tiver tabela de faturação` existia em `gavinho-app 3/src/pages/Finance.jsx:184`. Já não existe na versão principal (`gavinho-app/`), e a tabela `facturacao_cliente` já foi criada na BD.

2. ~~**Progresso físico nos capítulos financeiros**~~ — O TODO `progresso: 0 // TODO: link to physical progress from obras` em `useFinanceiroDashboard.js` foi resolvido. O hook agora busca `obras.progresso` via Supabase, calcula a média ponderada das obras activas do projecto, e alimenta o motor de projecção ETC/EAC. O dashboard mostra KPI "Físico vs Financeiro" e alerta quando progresso financeiro > físico + 15pp.
