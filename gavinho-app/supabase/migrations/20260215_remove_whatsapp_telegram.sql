-- Migração: Remover integrações WhatsApp/Twilio e Telegram
-- Data: 2026-02-15
-- Descrição: Remove todas as tabelas, triggers, views e referências
--            relacionadas com WhatsApp (Twilio) e Telegram da plataforma.

-- =====================================================
-- 1. DROP TRIGGERS (antes de dropar funções/tabelas)
-- =====================================================

DROP TRIGGER IF EXISTS trg_whatsapp_to_timeline ON whatsapp_mensagens;
DROP TRIGGER IF EXISTS update_whatsapp_contactos_updated_at ON whatsapp_contactos;
DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON whatsapp_config;

-- =====================================================
-- 2. DROP FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS trigger_whatsapp_to_timeline();

-- =====================================================
-- 3. RECRIAR VIEW sem referências a WhatsApp
-- =====================================================

CREATE OR REPLACE VIEW v_obra_comunicacoes_stats AS
SELECT
  o.id as obra_id,
  o.codigo,
  o.codigo_canonico,
  o.nome,
  COUNT(DISTINCT e.id) as total_emails,
  COUNT(DISTINCT e.id) FILTER (WHERE e.tipo = 'recebido') as emails_recebidos,
  COUNT(DISTINCT e.id) FILTER (WHERE e.tipo = 'enviado') as emails_enviados,
  COUNT(DISTINCT a.id) as total_acoes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'pendente') as acoes_pendentes,
  COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'concluida') as acoes_concluidas,
  COUNT(DISTINCT c.id) as total_canais
FROM obras o
LEFT JOIN obra_emails e ON o.id = e.obra_id
LEFT JOIN obra_acoes a ON o.id = a.obra_id
LEFT JOIN obra_canais c ON o.id = c.id AND c.ativo = true
GROUP BY o.id, o.codigo, o.codigo_canonico, o.nome;

-- =====================================================
-- 4. DROP RLS POLICIES (antes de dropar tabelas)
-- =====================================================

DROP POLICY IF EXISTS "whatsapp_contactos_all" ON whatsapp_contactos;
DROP POLICY IF EXISTS "whatsapp_mensagens_all" ON whatsapp_mensagens;
DROP POLICY IF EXISTS "ia_sugestoes_all" ON ia_sugestoes;
DROP POLICY IF EXISTS "whatsapp_config_all" ON whatsapp_config;

-- =====================================================
-- 5. REMOVER COLUNAS Twilio de obra_canais
-- =====================================================

ALTER TABLE obra_canais DROP COLUMN IF EXISTS twilio_conversation_sid;
ALTER TABLE obra_canais DROP COLUMN IF EXISTS twilio_friendly_name;

-- =====================================================
-- 6. LIMPAR FKs antes de dropar tabelas referenciadas
-- =====================================================

-- obra_canal_participantes.contacto_id referencia whatsapp_contactos
ALTER TABLE obra_canal_participantes DROP COLUMN IF EXISTS contacto_id;

-- ia_sugestoes.mensagem_id referencia whatsapp_mensagens
ALTER TABLE ia_sugestoes DROP COLUMN IF EXISTS mensagem_id;

-- =====================================================
-- 7. DROP TABELAS WhatsApp
-- =====================================================

DROP TABLE IF EXISTS whatsapp_mensagens CASCADE;
DROP TABLE IF EXISTS whatsapp_contactos CASCADE;
DROP TABLE IF EXISTS whatsapp_config CASCADE;

-- =====================================================
-- 8. DROP TABELAS Telegram
-- =====================================================

DROP TABLE IF EXISTS telegram_mensagens CASCADE;
DROP TABLE IF EXISTS telegram_contactos CASCADE;
DROP TABLE IF EXISTS telegram_grupos CASCADE;
DROP TABLE IF EXISTS telegram_config CASCADE;

-- =====================================================
-- 9. ACTUALIZAR CHECK CONSTRAINTS
-- =====================================================

-- obra_timeline.tipo_item: remover 'whatsapp_mensagem'
ALTER TABLE obra_timeline DROP CONSTRAINT IF EXISTS obra_timeline_tipo_item_check;
ALTER TABLE obra_timeline ADD CONSTRAINT obra_timeline_tipo_item_check
  CHECK (tipo_item IN (
    'email',
    'acao_tarefa',
    'acao_incidente',
    'acao_confirmacao',
    'acao_evento',
    'acao_evidencia',
    'nota_interna',
    'sistema'
  ));

-- obra_acoes.origem_tipo: remover 'whatsapp'
ALTER TABLE obra_acoes DROP CONSTRAINT IF EXISTS obra_acoes_origem_tipo_check;
ALTER TABLE obra_acoes ADD CONSTRAINT obra_acoes_origem_tipo_check
  CHECK (origem_tipo IN (
    'email',
    'manual',
    'ia_sugestao',
    'sistema'
  ));

-- =====================================================
-- 10. LIMPAR dados órfãos da timeline
-- =====================================================

DELETE FROM obra_timeline WHERE tipo_item = 'whatsapp_mensagem';

-- =====================================================
-- 11. COMENTÁRIOS actualizados
-- =====================================================

COMMENT ON VIEW v_obra_comunicacoes_stats IS 'Estatísticas de comunicação por obra (email + ações)';
