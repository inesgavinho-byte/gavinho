# Sistema de Notificações GAVINHO

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   pg_cron       │────▶│  gerar_          │────▶│  tabela         │
│   (8:00 diário) │     │  notificacoes_   │     │  notificacoes   │
│                 │     │  licencas()      │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Resend API    │◀────│  Edge Function   │◀────│  Cron/Webhook   │
│   (emails)      │     │  enviar-         │     │  (8:30 diário)  │
│                 │     │  notificacoes    │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Setup Passo a Passo

### 1. Executar Migrações SQL

No Supabase SQL Editor, executar:

```sql
-- Primeiro: tabelas e funções
-- Ficheiro: 20241228_licencas_calendario.sql

-- Depois: cron job
-- Ficheiro: 20241229_cron_notificacoes.sql
```

### 2. Configurar Resend

1. Criar conta em https://resend.com
2. Adicionar e verificar domínio `gavinho.pt`
3. Obter API Key

### 3. Configurar Secrets no Supabase

```bash
# Via CLI
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx

# Ou via Dashboard:
# Settings → Edge Functions → Manage Secrets
```

### 4. Deploy da Edge Function

```bash
cd gavinho-app
supabase functions deploy enviar-notificacoes
```

### 5. Configurar Cron para Edge Function

No Supabase Dashboard:
1. Ir a **Database → Extensions** → Ativar `pg_cron` e `pg_net`
2. Ir a **SQL Editor** e executar:

```sql
-- Habilitar pg_net para chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar chamada à Edge Function (8:30, após o pg_cron gerar notificações)
SELECT cron.schedule(
  'enviar-emails-notificacoes',
  '30 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://SEU-PROJECT.supabase.co/functions/v1/enviar-notificacoes',
    headers := '{"Authorization": "Bearer SEU_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

Substituir:
- `SEU-PROJECT` pelo ID do projeto Supabase
- `SEU_ANON_KEY` pela anon key do projeto

### 6. Testar

```bash
# Testar Edge Function manualmente
curl -X POST https://SEU-PROJECT.supabase.co/functions/v1/enviar-notificacoes \
  -H "Authorization: Bearer SEU_ANON_KEY"

# Verificar jobs agendados
SELECT * FROM cron.job;

# Ver histórico de execuções
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

# Ver notificações pendentes
SELECT * FROM get_notificacoes_pendentes_email();
```

## Troubleshooting

### Emails não estão a ser enviados

1. Verificar se RESEND_API_KEY está configurada:
   ```bash
   supabase secrets list
   ```

2. Verificar logs da Edge Function:
   ```bash
   supabase functions logs enviar-notificacoes
   ```

3. Verificar se domínio está verificado no Resend

### Cron não está a executar

1. Verificar se extensão pg_cron está ativa:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Verificar jobs:
   ```sql
   SELECT * FROM cron.job;
   ```

3. Ver erros recentes:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE status = 'failed' 
   ORDER BY start_time DESC LIMIT 10;
   ```

### Notificações duplicadas

A função `gerar_notificacoes_licencas()` já verifica se já existe notificação criada nas últimas 24h para evitar duplicados.

## Personalização

### Alterar horário do cron

```sql
-- Mudar para 9:00
SELECT cron.unschedule('verificar-licencas-diario');
SELECT cron.schedule('verificar-licencas-diario', '0 9 * * *', $$SELECT gerar_notificacoes_licencas()$$);
```

### Alterar destinatários

Editar a função `gerar_notificacoes_licencas()` na condição WHERE:
```sql
WHERE u.ativo = TRUE
  AND (u.cargo ILIKE '%diretor%' OR u.cargo ILIKE '%gestor%' OR u.cargo ILIKE '%admin%')
```

### Alterar template do email

Editar a função `gerarEmailHTML` em `supabase/functions/enviar-notificacoes/index.ts`

## Custos

- **Supabase pg_cron**: Incluído no plano Pro
- **Resend**: 3000 emails/mês grátis, depois $20/mês para 50k emails
