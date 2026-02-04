# Processamento Automatico de IA

Edge Function para processamento automatico de mensagens (WhatsApp e Email) com analise de IA.

## Funcionalidades

- Processa mensagens WhatsApp nao analisadas
- Processa emails nao analisados
- Gera sugestoes automaticas (requisicoes, tarefas, nao-conformidades, etc.)
- Suporta Claude (Anthropic) e OpenAI como backends de IA
- Fallback para analise por palavras-chave quando IA nao disponivel
- Logging de execucoes para monitorizacao

## Deploy

```bash
# Deploy da funcao
supabase functions deploy processar-mensagens-cron

# Definir secrets
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
supabase secrets set ANTHROPIC_API_KEY=your-key
# OU
supabase secrets set OPENAI_API_KEY=your-key
```

## Migracao SQL

Executar a migracao `20250119_ia_processamento_automatico.sql`:

```bash
supabase db push
```

## Configuracao do Cron

### Opcao 1: Servico Externo (Recomendado)

Usar um servico de cron externo para chamar a Edge Function:

**cron-job.org** (gratuito):
1. Criar conta em https://cron-job.org
2. Criar novo job com URL: `https://your-project.supabase.co/functions/v1/processar-mensagens-cron`
3. Headers:
   - `Authorization: Bearer YOUR_CRON_SECRET`
   - `Content-Type: application/json`
4. Intervalo: A cada 5 minutos (`*/5 * * * *`)

**GitHub Actions**:

```yaml
# .github/workflows/ia-cron.yml
name: IA Processing Cron

on:
  schedule:
    - cron: '*/5 * * * *'  # A cada 5 minutos
  workflow_dispatch:  # Permitir execucao manual

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger IA Processing
        run: |
          curl -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/processar-mensagens-cron" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

### Opcao 2: pg_cron (Se disponivel)

Se pg_cron estiver habilitado no Supabase:

1. Ir a Dashboard > Settings > Database > Extensions
2. Habilitar `pg_cron`
3. A migracao ja configura o job automaticamente

## Monitorizacao

### Ver estatisticas das ultimas 24h

```sql
SELECT * FROM v_ia_processamento_stats;
```

### Ver mensagens pendentes

```sql
SELECT * FROM v_ia_mensagens_pendentes;
```

### Ver logs de execucao

```sql
SELECT * FROM ia_processamento_log
ORDER BY created_at DESC
LIMIT 20;
```

### Configurar intervalo

```sql
UPDATE ia_cron_config SET intervalo_minutos = 10;
```

### Pausar/Retomar processamento

```sql
-- Pausar
UPDATE ia_cron_config SET ativo = false;

-- Retomar
UPDATE ia_cron_config SET ativo = true, execucoes_consecutivas_falhadas = 0;
```

## Teste Manual

```bash
# Testar localmente
supabase functions serve processar-mensagens-cron

# Chamar funcao
curl -X POST http://localhost:54321/functions/v1/processar-mensagens-cron \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Estrutura de Resposta

```json
{
  "success": true,
  "whatsapp": {
    "processed": 15,
    "suggestions": 8,
    "errors": 0
  },
  "email": {
    "processed": 5,
    "suggestions": 3,
    "errors": 0
  },
  "duration_ms": 2340,
  "message": "Processadas 15 mensagens WhatsApp e 5 emails"
}
```

## Tipos de Sugestoes Geradas

| Tipo | Descricao |
|------|-----------|
| `requisicao_material` | Pedidos de materiais |
| `registo_horas` | Registos de horas trabalhadas |
| `trabalho_executado` | Atualizacoes de progresso |
| `nova_tarefa` | Tarefas identificadas |
| `nao_conformidade` | Problemas/defeitos |

## Troubleshooting

### Funcao nao executa

1. Verificar se CRON_SECRET esta definido
2. Verificar logs: `supabase functions logs processar-mensagens-cron`
3. Verificar se ha mensagens pendentes: `SELECT * FROM v_ia_mensagens_pendentes`

### Sem sugestoes geradas

1. Verificar se API keys de IA estao definidas
2. Verificar conteudo das mensagens (podem nao ter info relevante)
3. Funcao usa fallback de palavras-chave se IA indisponivel

### Muitos erros

1. Verificar limites de API (rate limiting)
2. Aumentar intervalo: `UPDATE ia_cron_config SET intervalo_minutos = 10`
3. Reduzir batch size: `UPDATE ia_cron_config SET batch_size_whatsapp = 10`
