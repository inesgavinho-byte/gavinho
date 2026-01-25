# Integração Outlook - Diário de Bordo

## Passo 1: Criar App Registration no Azure AD

1. Aceda ao [Azure Portal](https://portal.azure.com)
2. Vá a **Azure Active Directory** → **App registrations** → **New registration**
3. Configure:
   - **Name**: `GAVINHO Diário de Bordo`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**:
     - Type: `Web`
     - URL: `https://vctcppuvqjstscbzdykn.supabase.co/functions/v1/outlook-callback`

4. Clique **Register**

## Passo 2: Configurar Permissões da API

1. Na app criada, vá a **API permissions** → **Add a permission**
2. Selecione **Microsoft Graph** → **Application permissions**
3. Adicione estas permissões:
   - `Mail.Read` - Ler emails
   - `Mail.ReadBasic` - Ler informação básica de emails
   - `User.Read.All` - Ler informação de utilizadores

4. Clique **Grant admin consent for [Organization]**

## Passo 3: Criar Client Secret

1. Vá a **Certificates & secrets** → **New client secret**
2. Adicione uma descrição: `GAVINHO Diario Bordo Secret`
3. Escolha expiração: `24 months`
4. **COPIE O VALUE** (só aparece uma vez!)

## Passo 4: Guardar Credenciais

Anote estes valores:
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Client Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Email a monitorizar**: `backup@gavinhogroup.com`

## Passo 5: Configurar Supabase Secrets

No Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**, adicione:

```
MICROSOFT_CLIENT_ID=<Application ID>
MICROSOFT_CLIENT_SECRET=<Client Secret>
MICROSOFT_TENANT_ID=<Tenant ID>
OUTLOOK_EMAIL=backup@gavinhogroup.com
```

## Passo 6: Deploy da Edge Function

Execute no terminal (com Supabase CLI):

```bash
cd gavinho-app
supabase functions deploy outlook-sync
```

## Passo 7: Configurar Cron Job (opcional)

Para sincronização automática a cada 15 minutos, adicione no Supabase:

```sql
SELECT cron.schedule(
  'sync-outlook-emails',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vctcppuvqjstscbzdykn.supabase.co/functions/v1/outlook-sync',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## Notas Importantes

1. **Permissões de Admin**: Precisa de ser Global Admin ou Application Administrator no Microsoft 365 para aprovar as permissões.

2. **Email específico**: A função vai buscar emails enviados PARA `backup@gavinhogroup.com` e associá-los a projetos pelo código (ex: GA00413 no assunto).

3. **Segurança**: O Client Secret deve ser mantido em segredo. Nunca o coloque no código.

4. **Rate Limits**: Microsoft Graph tem limites de 10,000 requests por 10 minutos. A função está preparada para isso.
