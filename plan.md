# Plano: Robustecer Offline Sync na PWA Obra App

## Diagnóstico Atual

### O que existe
- `useOfflineSync.js` (228 linhas) — fila de ações offline com **localStorage** (`obra_app_offline_queue`)
- 6 tipos de ação: `SEND_MESSAGE`, `CREATE_PRESENCA`, `UPDATE_PRESENCA`, `CREATE_REQUISICAO`, `UPDATE_TAREFA`, `CREATE_DIARIO`
- Retry até 3 tentativas, auto-sync ao voltar online
- Service worker (`sw.js`) com network-first caching e `syncMessages()` **vazia**
- Banner offline simples (amarelo) e banner de sync pendente (azul)

### Limitações identificadas
1. **localStorage** — limite ~5-10MB, não suporta dados binários, não é transacional
2. **Sem conflict resolution** — ações com retry simples, sem verificação de timestamps do servidor
3. **Background sync vazio** — `syncMessages()` é um stub no service worker
4. **Componentes não usam `queueAction`** — ObraChat, Tarefas, etc. fazem chamadas Supabase diretas
5. **Sem indicador visual granular** — não há feedback por item sobre estado de sync

---

## Plano de Implementação

### Fase 1: Camada IndexedDB (`offlineDb.js`)

**Ficheiro novo:** `src/pages/ObraApp/lib/offlineDb.js`

Criar wrapper leve para IndexedDB (sem dependência externa):

```
DB: 'gavinho_offline', versão 1
Object Stores:
  - offline_queue: { id, type, payload, metadata, createdAt, retries, status }
    keyPath: 'id'
    index: 'by_createdAt' em createdAt
  - sync_metadata: { key, value }
    keyPath: 'key'
```

API exposta:
- `openDb()` — abre/cria DB com upgrade handler
- `addToQueue(action)` — insere na fila
- `getQueue()` — retorna todas as ações pendentes, ordenadas por createdAt
- `removeFromQueue(id)` — remove ação processada
- `updateRetries(id, retries)` — incrementa retry counter
- `clearQueue()` — limpa tudo
- `getQueueCount()` — conta pendentes
- `getSyncMeta(key)` / `setSyncMeta(key, value)` — metadata de sync

Inclui **migração automática** do localStorage: ao iniciar, se `obra_app_offline_queue` existir no localStorage, lê, insere no IndexedDB, apaga do localStorage.

---

### Fase 2: Refactor `useOfflineSync.js` — IndexedDB + Conflict Resolution

**Ficheiro:** `src/pages/ObraApp/hooks/useOfflineSync.js`

Alterações:
1. Substituir `localStorage.getItem/setItem` por chamadas a `offlineDb`
2. **Manter a mesma API pública** — sem breaking changes
3. Adicionar **last-write-wins** conflict resolution nos handlers de UPDATE:
   - `UPDATE_PRESENCA`: antes de `update()`, faz `select('updated_at')` → se `updated_at` do servidor > `createdAt` da ação local → descarta (servidor ganha)
   - `UPDATE_TAREFA`: mesma lógica
   - `CREATE_DIARIO`: já faz upsert por `(obra_id, data)` — adiciona mesma verificação de `updated_at`
   - Os INSERTs (`SEND_MESSAGE`, `CREATE_PRESENCA`, `CREATE_REQUISICAO`) não têm conflito possível
4. Novo estado no hook: `conflictsResolved` (array de conflitos detetados no último sync)
5. Guardar `lastSyncAt` no `sync_metadata` do IndexedDB
6. Registar `navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-offline-queue'))` como fallback ao fazer `queueAction`

---

### Fase 3: Background Sync no Service Worker

**Ficheiro:** `public/sw.js`

Implementar o handler `sync` que já existe como stub:

1. Renomear tag de `send-messages` para `sync-offline-queue`
2. Em `syncMessages()` (renomeada para `syncOfflineQueue()`):
   - Abrir IndexedDB `gavinho_offline` diretamente (API nativa, sem wrapper React)
   - Ler itens da store `offline_queue`
   - Para cada item, executar `fetch()` ao Supabase REST API (inserir/atualizar)
   - Remover da fila os itens processados com sucesso
   - Se falhar, incrementar retries; desistir após 3
3. Isto garante sync mesmo que a app esteja fechada quando volta a ligação

---

### Fase 4: Indicador Visual de Estado Offline

**Ficheiro novo:** `src/pages/ObraApp/components/OfflineIndicator.jsx`

Componente que centraliza toda a UI de estado de conectividade:

| Estado | Visual |
|---|---|
| Online, tudo sync | Sem indicador visível |
| Online, sync pendente | Banner azul: "X ações pendentes — toca para sincronizar" |
| A sincronizar | Banner azul com spinner: "A sincronizar..." |
| Sync completa | Toast verde (3s): "Tudo sincronizado ✓" |
| Conflito resolvido | Toast laranja (5s): "Algumas alterações foram atualizadas pelo servidor" |
| Offline | Banner amarelo fixo: "Sem ligação — alterações guardadas localmente" |
| Erro de sync | Banner vermelho: "Falha ao sincronizar — toca para tentar" |

Também adiciona um **ponto colorido no header** junto ao nome da obra:
- Verde = online + sync completo
- Amarelo/pulsante = online + sync pendente
- Vermelho = offline

Props: `{ isOnline, pendingCount, syncing, lastSyncError, conflictsResolved, onRetry }`

**Ficheiro:** `src/pages/ObraApp/index.jsx`
- Remover os banners inline (`offlineBanner`, `syncBanner`)
- Substituir por `<OfflineIndicator />`
- Passar `queueAction` e `isOnline` como props para os componentes tab

---

### Fase 5: Integração nos Componentes Filhos

**Ficheiros:** ObraChat.jsx, Tarefas.jsx, RegistoPresenca.jsx, PedirMateriais.jsx, DiarioObra.jsx

Em cada componente, nas funções de submit:
- Receber `queueAction` e `isOnline` via props
- Se `!isOnline`: chamar `queueAction(ACTION_TYPE, payload)` + otimistic update no state local
- Se online: manter comportamento atual (Supabase direto) para menor latência
- Adicionar indicador visual inline para itens enviados offline (ícone de relógio/cloud)

---

## Ficheiros a criar/modificar

| Ficheiro | Ação | Descrição |
|---|---|---|
| `src/pages/ObraApp/lib/offlineDb.js` | **CRIAR** | Wrapper IndexedDB |
| `src/pages/ObraApp/hooks/useOfflineSync.js` | **MODIFICAR** | IndexedDB + conflict resolution |
| `public/sw.js` | **MODIFICAR** | Implementar background sync |
| `src/pages/ObraApp/components/OfflineIndicator.jsx` | **CRIAR** | Componente visual de estado offline |
| `src/pages/ObraApp/index.jsx` | **MODIFICAR** | Integrar OfflineIndicator, props aos tabs |
| `src/pages/ObraApp/components/ObraChat.jsx` | **MODIFICAR** | queueAction quando offline |
| `src/pages/ObraApp/components/Tarefas.jsx` | **MODIFICAR** | queueAction quando offline |
| `src/pages/ObraApp/components/RegistoPresenca.jsx` | **MODIFICAR** | queueAction quando offline |
| `src/pages/ObraApp/components/PedirMateriais.jsx` | **MODIFICAR** | queueAction quando offline |
| `src/pages/ObraApp/components/DiarioObra.jsx` | **MODIFICAR** | queueAction quando offline |

---

## Notas Técnicas

- **Zero dependências externas** — IndexedDB wrapper vanilla JS
- **Migração transparente** — localStorage → IndexedDB automática, com limpeza
- **API do hook inalterada** — `queueAction`, `processQueue`, `isOnline`, `pendingCount` mantêm-se
- **Last-write-wins** — timestamp do servidor ganha nos UPDATEs; INSERTs sem conflito
- **Background sync** — complementar; sync principal continua pelo hook React
- **Sem alteração de schema SQL** — usa campos `updated_at` já existentes nas tabelas
- **Inline styles** — seguindo padrão existente do ObraApp (sem CSS Modules)
