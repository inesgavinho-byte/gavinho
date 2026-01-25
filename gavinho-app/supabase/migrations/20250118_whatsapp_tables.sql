-- Migração: Tabelas para integração WhatsApp + IA
-- Data: 2025-01-18

-- Tabela de contactos WhatsApp (associa números de telefone a obras)
CREATE TABLE IF NOT EXISTS whatsapp_contactos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  cargo VARCHAR(100), -- Ex: Encarregado, Subempreiteiro, etc.
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para contactos
CREATE INDEX IF NOT EXISTS idx_whatsapp_contactos_telefone ON whatsapp_contactos(telefone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contactos_obra ON whatsapp_contactos(obra_id);

-- Tabela de mensagens WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twilio_sid VARCHAR(50) UNIQUE, -- SID único do Twilio
  telefone_origem VARCHAR(20) NOT NULL,
  telefone_destino VARCHAR(20) NOT NULL,
  conteudo TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recebida', 'enviada')),
  contacto_id UUID REFERENCES whatsapp_contactos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  autor_nome VARCHAR(255),
  anexos JSONB, -- Array de {url, tipo, nome}
  lida BOOLEAN DEFAULT false,
  processada_ia BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_obra ON whatsapp_mensagens(obra_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_contacto ON whatsapp_mensagens(contacto_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_created ON whatsapp_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_processada ON whatsapp_mensagens(processada_ia) WHERE processada_ia = false;

-- Tabela de sugestões da IA
CREATE TABLE IF NOT EXISTS ia_sugestoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id UUID REFERENCES whatsapp_mensagens(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'requisicao_material',
    'registo_horas',
    'trabalho_executado',
    'nova_tarefa',
    'nao_conformidade'
  )),
  dados JSONB NOT NULL, -- Dados extraídos pela IA (material, quantidade, etc.)
  texto_original TEXT, -- Texto da mensagem que originou a sugestão
  confianca DECIMAL(3,2), -- 0.00 a 1.00 - nível de confiança da IA
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceite', 'rejeitada')),
  processado_por UUID, -- ID do utilizador que processou
  processado_em TIMESTAMP WITH TIME ZONE,
  entidade_criada_id UUID, -- ID da entidade criada (requisição, tarefa, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para sugestões IA
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_obra ON ia_sugestoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_status ON ia_sugestoes(status) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_ia_sugestoes_tipo ON ia_sugestoes(tipo);

-- Tabela de configuração WhatsApp por empresa/utilizador
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twilio_account_sid VARCHAR(50),
  twilio_auth_token_encrypted VARCHAR(255), -- Token encriptado
  twilio_phone_number VARCHAR(20),
  webhook_url VARCHAR(255),
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_whatsapp_contactos_updated_at ON whatsapp_contactos;
CREATE TRIGGER update_whatsapp_contactos_updated_at
  BEFORE UPDATE ON whatsapp_contactos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON whatsapp_config;
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Ativar
ALTER TABLE whatsapp_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_sugestoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir tudo para utilizadores autenticados)
-- Nota: Ajustar conforme necessidades de segurança

CREATE POLICY "whatsapp_contactos_all" ON whatsapp_contactos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "whatsapp_mensagens_all" ON whatsapp_mensagens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "ia_sugestoes_all" ON ia_sugestoes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "whatsapp_config_all" ON whatsapp_config
  FOR ALL USING (true) WITH CHECK (true);

-- Comentários nas tabelas
COMMENT ON TABLE whatsapp_contactos IS 'Contactos WhatsApp associados a obras';
COMMENT ON TABLE whatsapp_mensagens IS 'Mensagens WhatsApp recebidas e enviadas via Twilio';
COMMENT ON TABLE ia_sugestoes IS 'Sugestões geradas pela IA a partir das mensagens';
COMMENT ON TABLE whatsapp_config IS 'Configuração da integração Twilio WhatsApp';
