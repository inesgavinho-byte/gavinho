# Documento de Continuidade - Gavinho App

## Branch Atual
`claude/compartment-collapse-expand-ISGwu`

## Resumo do Projeto
Aplicação de gestão de workspace com sistema de notificações, compartimentos (seções colapsáveis) e comunicação em tempo real.

---

## O QUE FOI DESENVOLVIDO

### 1. Sistema de Notificações Unificado
**Ficheiros principais:**
- `gavinho-app/src/contexts/NotificationContext.jsx` - Context principal
- `gavinho-app/src/hooks/useUnifiedNotifications.js` - Hook unificado
- `gavinho-app/src/components/ui/NotificationPanel.jsx` - Painel UI
- `gavinho-app/src/components/ui/NotificationPanel.css`

**Funcionalidades:**
- Agrupamento de notificações por tipo/fonte
- Ações inline (marcar como lida, arquivar)
- Paginação
- Realtime com Supabase

### 2. Preferências de Notificação
**Ficheiros:**
- `gavinho-app/src/components/settings/NotificationPreferences.jsx`
- `gavinho-app/src/components/settings/NotificationPreferences.css`

**Funcionalidades:**
- Toggle por tipo de notificação
- Preferências de email digest
- Configurações granulares

### 3. Analytics de Notificações (Admin)
**Ficheiros:**
- `gavinho-app/src/components/admin/NotificationAnalytics.jsx`
- `gavinho-app/src/components/admin/NotificationAnalytics.css`

### 4. Email Digest
**Ficheiros:**
- `gavinho-app/supabase/functions/notification-digest/index.ts`

**Funcionalidade:**
- Envio de resumo diário/semanal de notificações

### 5. Migrações SQL Importantes
- `20250207_notificacoes_consolidadas.sql` - Schema base de notificações
- `20250207_notificacoes_nice_to_have.sql` - Features adicionais
- `20250207_email_config_gavinhogroup.sql` - Config de email
- `20250207_fix_notification_email_config.sql` - Correções

---

## TABELAS SUPABASE PRINCIPAIS

```sql
-- Notificações
app_notificacoes (id, user_id, tipo, titulo, mensagem, lida, ...)

-- Preferências
notification_preferences (user_id, tipo, enabled, email_enabled, ...)

-- Config do sistema
system_config (key, value, ...)
```

---

## PRÓXIMOS PASSOS (PENDENTES)

### Compartimentos Collapse/Expand
O branch original era para implementar:
- [ ] Colapsar/expandir secções (compartimentos) na UI
- [ ] Guardar estado de collapse no localStorage ou BD
- [ ] Animações suaves de transição

### Possíveis melhorias futuras:
- [ ] Testes unitários para notificações
- [ ] Modo offline para notificações
- [ ] Push notifications (browser)

---

## COMANDOS ÚTEIS

```bash
# Entrar no diretório
cd /home/user/gavinho/gavinho-app

# Instalar dependências
npm install

# Rodar dev server
npm run dev

# Ver estrutura de componentes
ls -la src/components/

# Ver hooks
ls -la src/hooks/
```

---

## ESTRUTURA PRINCIPAL

```
gavinho-app/
├── src/
│   ├── components/
│   │   ├── admin/          # Componentes admin
│   │   ├── settings/       # Preferências
│   │   ├── ui/             # Componentes UI (NotificationPanel, etc)
│   │   └── workspace/      # Componentes do workspace
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   └── pages/              # Páginas
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # SQL migrations
└── config.toml             # Config Supabase
```

---

## NOTAS IMPORTANTES

1. **Domain de email**: `gavinhogroup.com`
2. **Realtime**: Ativado na tabela `app_notificacoes`
3. **Permissões**: Usar tabela `system_config` (não `app.settings`)

---

## PARA CONTINUAR

1. Abrir nova sessão Claude
2. Navegar para `/home/user/gavinho`
3. Fazer checkout do branch: `git checkout claude/compartment-collapse-expand-ISGwu`
4. Continuar com a tarefa pretendida

**Último commit:** `347e7de Config: Add Supabase CLI config.toml for db pull support`
