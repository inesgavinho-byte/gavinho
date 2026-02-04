-- Tabela de anexos
CREATE TABLE IF NOT EXISTS decisoes_anexos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decisao_id UUID NOT NULL REFERENCES decisoes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    nome_storage TEXT,
    tipo TEXT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'decisoes',
    tamanho_bytes INTEGER,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES utilizadores(id)
);

CREATE INDEX idx_decisoes_anexos_decisao ON decisoes_anexos(decisao_id);
