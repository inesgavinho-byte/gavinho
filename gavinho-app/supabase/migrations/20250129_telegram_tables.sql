-- Migração: Tabelas para integração Telegram
-- Data: 2025-01-29

-- Tabela de configuração do bot Telegram
CREATE TABLE IF NOT EXISTS telegram_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_token VARCHAR(100) NOT NULL,
  bot_username VARCHAR(50),
  webhook_url VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE telegram_config DISABLE ROW LEVEL SECURITY;

-- Tabela de grupos Telegram associados a obras
CREATE TABLE IF NOT EXISTS telegram_grupos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id VARCHAR(50) NOT NULL UNIQUE,
  chat_title VARCHAR(255),
  chat_type VARCHAR(20) DEFAULT 'group',
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE telegram_grupos DISABLE ROW LEVEL SECURITY;

-- Índices para grupos
CREATE INDEX IF NOT EXISTS idx_telegram_grupos_chat_id ON telegram_grupos(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_grupos_obra ON telegram_grupos(obra_id);

-- Tabela de contactos Telegram
CREATE TABLE IF NOT EXISTS telegram_contactos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id VARCHAR(50) NOT NULL,
  username VARCHAR(100),
  nome VARCHAR(255) NOT NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  cargo VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE telegram_contactos DISABLE ROW LEVEL SECURITY;

-- Índices para contactos
CREATE INDEX IF NOT EXISTS idx_telegram_contactos_telegram_id ON telegram_contactos(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_contactos_obra ON telegram_contactos(obra_id);

-- Tabela de mensagens Telegram
CREATE TABLE IF NOT EXISTS telegram_mensagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_message_id BIGINT,
  chat_id VARCHAR(50) NOT NULL,
  chat_title VARCHAR(255),
  chat_type VARCHAR(20),
  autor_telegram_id VARCHAR(50),
  autor_nome VARCHAR(255),
  autor_username VARCHAR(100),
  conteudo TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'recebida',
  contacto_id UUID REFERENCES telegram_contactos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  anexos JSONB,
  lida BOOLEAN DEFAULT false,
  processada_ia BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE telegram_mensagens DISABLE ROW LEVEL SECURITY;

-- Índices para mensagens
CREATE INDEX IF NOT EXISTS idx_telegram_mensagens_chat_id ON telegram_mensagens(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_mensagens_obra ON telegram_mensagens(obra_id);
CREATE INDEX IF NOT EXISTS idx_telegram_mensagens_created ON telegram_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_mensagens_processada ON telegram_mensagens(processada_ia) WHERE processada_ia = false;

-- Comentários
COMMENT ON TABLE telegram_config IS 'Configuração do bot Telegram';
COMMENT ON TABLE telegram_grupos IS 'Grupos Telegram associados a obras';
COMMENT ON TABLE telegram_contactos IS 'Contactos Telegram (membros dos grupos)';
COMMENT ON TABLE telegram_mensagens IS 'Mensagens recebidas via Telegram';
