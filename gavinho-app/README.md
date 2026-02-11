# GAVINHO Platform

> Plataforma de gestão de projetos Design & Build para construção de luxo em Portugal.

## Stack Técnica

**Frontend:**
- React 18.2.0 com Vite
- React Router (navegação SPA)
- Lucide React (ícones)
- CSS separado por componente (NÃO usar Tailwind)

**Backend:**
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Edge Functions (Deno/TypeScript)
- Row Level Security (RLS) ativo em todas as tabelas

**Deploy:**
- Netlify (via ZIP drag-and-drop)
- URL: gavinhoplatform.netlify.app

## Estrutura do Projeto

```
gavinho-app/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── pages/          # Páginas da aplicação
│   ├── lib/            # Configuração Supabase
│   ├── utils/          # Utilitários (sanitize, etc.)
│   └── constants/      # Constantes (cores, etc.)
├── supabase/
│   ├── functions/      # Edge Functions
│   └── migrations/     # SQL migrations
└── docs/               # Documentação
```

## Comandos

```bash
npm run dev       # Servidor local (port 5173)
npm run build     # Build de produção
npm run preview   # Preview do build
```

## Regras de Código

### Estilos
- Usar **inline styles** ou ficheiros CSS separados
- **NÃO usar Tailwind** (causa conflitos)
- Usar as cores da marca (ver abaixo)

### Base de Dados
- IDs são sempre **TEXT** (não numéricos)
- Formato: prefixo + UUID (ex: `proj_abc123`)
- Usar **JSONB** para dados complexos
- RLS obrigatório em todas as tabelas

### Datas
- Formato português: DD/MM/AAAA
- Na BD: ISO 8601 (YYYY-MM-DD)
- Fuso horário: Europe/Lisbon

### Caracteres
- UTF-8 obrigatório
- Atenção aos acentos portugueses (ç, ã, õ, é, etc.)

## Cores da Marca

```css
/* Principais */
--verde-principal: #4a5d4a;
--warm-beige: #ADAA96;
--soft-cream: #F2F0E7;

/* UI */
--texto-principal: #1a1a1a;
--texto-secundario: #666666;
--border: #e5e5e5;
--background: #ffffff;

/* Estados */
--sucesso: #22c55e;
--erro: #ef4444;
--aviso: #f59e0b;
--info: #3b82f6;
```

## Tipografia

```css
/* Títulos */
font-family: 'Cormorant Garamond', serif;

/* UI e corpo de texto */
font-family: 'Quattrocento Sans', sans-serif;
```

## Convenções de Nomenclatura

### Ficheiros
- Componentes: `PascalCase.jsx` (ex: `ProjectCard.jsx`)
- Utilitários: `camelCase.js` (ex: `formatDate.js`)
- Estilos: `ComponentName.css`

### Variáveis
- React state: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Tabelas BD: `snake_case`

### Componentes
- Um componente por ficheiro
- Props documentadas com comentários
- Usar named exports (não default)

## Edge Functions Ativas

| Função | Descrição |
|--------|-----------|
| `projeto-chat` | Chat AI com contexto do projeto |
| `decisoes-detectar` | Deteta decisões automaticamente |
| `decisoes-embedding` | Embeddings vetoriais |
| `decisoes-search` | Pesquisa semântica |
| `email-processar` | Processa emails, cria tarefas |
| `email-classify` | Classifica emails por tipo |
| `email-suggest-reply` | Sugere respostas com AI |
| `enviar-notificacoes` | Envia notificações |
| `outlook-sync` | Sincroniza com Outlook |

## Integrações

### APIs Configuradas
- **Anthropic Claude** - AI para decisões e chat
- **OpenAI** - Embeddings
- **Microsoft Graph** - Outlook sync
- **SendGrid** - Envio de emails
- **Twilio** - WhatsApp

### Variáveis de Ambiente
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANTHROPIC_API_KEY=
VITE_OPENAI_API_KEY=
```

## Módulos da Plataforma

1. **Dashboard** - KPIs e visão geral
2. **Projetos** - Gestão de projetos com fases
3. **Obras** - Acompanhamento de construção
4. **Clientes** - CRM
5. **Equipa** - Gestão de colaboradores + Kanban
6. **Fornecedores** - Base de dados de fornecedores
7. **Gestão Financeira** - Propostas e orçamentos
8. **Viabilidade** - Análise urbanística
9. **Emails** - Inbox integrado

## Padrões Importantes

### Formulários
- Validação client-side antes de submit
- Mostrar loading state nos botões
- Feedback visual de sucesso/erro

### Tabelas
- Usar paginação (20 items por página)
- Permitir ordenação por colunas
- Incluir pesquisa/filtros

### Modais
- Fechar com ESC e click fora
- Botão cancelar sempre visível
- Confirmação para ações destrutivas

## Não Fazer

- ❌ Usar Tailwind CSS
- ❌ IDs numéricos auto-increment
- ❌ Commits de ficheiros .env
- ❌ Console.log em produção
- ❌ Dados mock hardcoded (usar BD)
- ❌ Ignorar erros de RLS

## Documentação Adicional

- `/docs/authentication.md` - Fluxo de autenticação
- `/docs/database-schema.md` - Schema da BD
- `/docs/api-endpoints.md` - Endpoints disponíveis

---

*Última atualização: Fevereiro 2025*
