# Gavinho Platform - Setup Guide

## Environment Variables Setup

### Frontend (.env)

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials from [Supabase Dashboard](https://supabase.com/dashboard):
   - Go to Project Settings > API
   - Copy the **Project URL** to `VITE_SUPABASE_URL`
   - Copy the **anon public** key to `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Functions Secrets

Edge Functions use Supabase Secrets (not .env files). Set them using the CLI or Dashboard.

#### Using Supabase CLI:

```bash
# Twilio (WhatsApp)
supabase secrets set TWILIO_ACCOUNT_SID=your-account-sid
supabase secrets set TWILIO_AUTH_TOKEN=your-auth-token
supabase secrets set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Email (SendGrid)
supabase secrets set SENDGRID_API_KEY=your-sendgrid-api-key

# AI (Anthropic)
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-api-key
```

#### Using Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** > **Edge Functions**
4. Click **Manage Secrets**
5. Add each secret with its name and value

### Required Secrets by Function

| Function | Required Secrets |
|----------|-----------------|
| `analisar-mensagens` | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| `email-send` | `SENDGRID_API_KEY` or `RESEND_API_KEY` |
| `email-webhook` | (uses SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - automatic) |
| `twilio-send` | (uses `whatsapp_config` table - see below) |
| `twilio-webhook` | (uses SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - automatic) |
| `twilio-conversations` | (uses SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - automatic) |
| `obra-acoes` | (uses SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - automatic) |

### Twilio Configuration (Database)

Twilio credentials are stored in the `whatsapp_config` table, not as environment variables.

To configure Twilio, insert a record into the `whatsapp_config` table:

```sql
INSERT INTO whatsapp_config (
  twilio_account_sid,
  twilio_auth_token_encrypted,
  twilio_phone_number,
  ativo
) VALUES (
  'your-account-sid',
  'your-auth-token',
  '+14155238886',
  true
);
```

**Note:** Consider using [Supabase Vault](https://supabase.com/docs/guides/database/vault) for encrypting the auth token.

### Where to Get API Keys

| Service | URL |
|---------|-----|
| Supabase | https://supabase.com/dashboard |
| Twilio | https://console.twilio.com |
| SendGrid | https://app.sendgrid.com/settings/api_keys |
| Resend | https://resend.com/api-keys |
| Anthropic | https://console.anthropic.com/settings/keys |
| OpenAI | https://platform.openai.com/api-keys |

## Security Best Practices

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Rotate compromised keys immediately** - If you accidentally expose a key, regenerate it
3. **Use different keys per environment** - Separate development, staging, and production
4. **Limit key permissions** - Use the minimum required permissions for each key
