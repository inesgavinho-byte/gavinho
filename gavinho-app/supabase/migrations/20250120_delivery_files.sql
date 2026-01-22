-- =====================================================
-- CENTRAL DE ENTREGAS - Ficheiros de Entrega
-- Upload de ficheiros com versionamento e aprovação
-- =====================================================

-- Sequência para IDs dos ficheiros
CREATE SEQUENCE IF NOT EXISTS delivery_file_seq START 1;

-- Tabela principal de ficheiros de entrega
CREATE TABLE IF NOT EXISTS entrega_ficheiros (
  id TEXT PRIMARY KEY DEFAULT ('FILE-' || LPAD(nextval('delivery_file_seq')::TEXT, 6, '0')),
  entregavel_id UUID NOT NULL REFERENCES projeto_entregaveis(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Ficheiro
  nome_ficheiro TEXT NOT NULL,
  tipo_ficheiro TEXT NOT NULL CHECK (tipo_ficheiro IN ('pdf', 'jpeg', 'jpg', 'png', 'dwg', 'dwf')),
  ficheiro_url TEXT NOT NULL,
  tamanho_bytes BIGINT,

  -- Versão
  versao INTEGER NOT NULL DEFAULT 1,
  versao_atual BOOLEAN NOT NULL DEFAULT true,

  -- Bom para Construção
  aprovado_construcao BOOLEAN NOT NULL DEFAULT false,
  aprovado_em TIMESTAMPTZ,
  aprovado_por UUID REFERENCES utilizadores(id),
  aprovado_por_nome TEXT,

  -- Upload
  carregado_por UUID REFERENCES utilizadores(id),
  carregado_por_nome TEXT,
  carregado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_entregavel ON entrega_ficheiros(entregavel_id);
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_projeto ON entrega_ficheiros(projeto_id);
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_atual ON entrega_ficheiros(entregavel_id, versao_atual) WHERE versao_atual = true;
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_aprovado ON entrega_ficheiros(projeto_id, aprovado_construcao) WHERE aprovado_construcao = true;
CREATE INDEX IF NOT EXISTS idx_entrega_ficheiros_carregado ON entrega_ficheiros(carregado_em DESC);

-- RLS Policies
ALTER TABLE entrega_ficheiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON entrega_ficheiros FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_entrega_ficheiros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entrega_ficheiros_updated_at
  BEFORE UPDATE ON entrega_ficheiros
  FOR EACH ROW
  EXECUTE FUNCTION update_entrega_ficheiros_updated_at();

-- Trigger: Arquivar versão anterior ao fazer upload
CREATE OR REPLACE FUNCTION archive_previous_file_version()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  -- Obter versão máxima atual para este entregável
  SELECT COALESCE(MAX(versao), 0) INTO max_version
  FROM entrega_ficheiros
  WHERE entregavel_id = NEW.entregavel_id;

  -- Definir nova versão
  NEW.versao := max_version + 1;

  -- Marcar versões anteriores como não-atual
  UPDATE entrega_ficheiros
  SET versao_atual = false,
      updated_at = NOW()
  WHERE entregavel_id = NEW.entregavel_id
    AND versao_atual = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_entrega_ficheiro_insert
  BEFORE INSERT ON entrega_ficheiros
  FOR EACH ROW EXECUTE FUNCTION archive_previous_file_version();

-- Trigger: Registar no Diário quando marcado "Bom para Construção"
CREATE OR REPLACE FUNCTION log_construction_approval()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
  entregavel_codigo TEXT;
BEGIN
  IF NEW.aprovado_construcao = true AND (OLD.aprovado_construcao IS NULL OR OLD.aprovado_construcao = false) THEN
    -- Buscar categoria "Tarefa"
    SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Tarefa' LIMIT 1;

    -- Buscar código do entregável
    SELECT codigo INTO entregavel_codigo FROM projeto_entregaveis WHERE id = NEW.entregavel_id;

    INSERT INTO projeto_diario (
      projeto_id,
      categoria_id,
      titulo,
      descricao,
      tipo,
      fonte,
      data_evento
    ) VALUES (
      NEW.projeto_id,
      categoria_id,
      'Documento aprovado para Construção',
      'Ficheiro "' || NEW.nome_ficheiro || '" (' || COALESCE(entregavel_codigo, '') || ') marcado como Bom para Construção (v' || NEW.versao || ') por ' || COALESCE(NEW.aprovado_por_nome, 'Utilizador'),
      'auto',
      'central_entregas',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_construction_approval
  AFTER UPDATE ON entrega_ficheiros
  FOR EACH ROW EXECUTE FUNCTION log_construction_approval();

-- Trigger: Registar upload no Diário
CREATE OR REPLACE FUNCTION log_file_upload()
RETURNS TRIGGER AS $$
DECLARE
  categoria_id UUID;
  entregavel_codigo TEXT;
BEGIN
  -- Buscar categoria "Desenhos"
  SELECT id INTO categoria_id FROM diario_categorias WHERE nome = 'Desenhos' LIMIT 1;

  -- Buscar código do entregável
  SELECT codigo INTO entregavel_codigo FROM projeto_entregaveis WHERE id = NEW.entregavel_id;

  INSERT INTO projeto_diario (
    projeto_id,
    categoria_id,
    titulo,
    descricao,
    tipo,
    fonte,
    data_evento
  ) VALUES (
    NEW.projeto_id,
    categoria_id,
    CASE WHEN NEW.versao = 1 THEN 'Novo ficheiro carregado' ELSE 'Nova versão carregada' END,
    'Ficheiro "' || NEW.nome_ficheiro || '" (' || COALESCE(entregavel_codigo, '') || ') versão ' || NEW.versao || ' carregado por ' || COALESCE(NEW.carregado_por_nome, 'Utilizador'),
    'auto',
    'central_entregas',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_file_upload
  AFTER INSERT ON entrega_ficheiros
  FOR EACH ROW EXECUTE FUNCTION log_file_upload();

-- View: Documentos aprovados para Execução na Obra
CREATE OR REPLACE VIEW obra_documentos_execucao AS
SELECT
  ef.id,
  ef.nome_ficheiro,
  ef.tipo_ficheiro,
  ef.ficheiro_url,
  ef.versao,
  ef.tamanho_bytes,
  ef.aprovado_em,
  ef.aprovado_por,
  ef.aprovado_por_nome,
  ef.notas,
  pe.codigo AS entregavel_codigo,
  pe.descricao AS entregavel_descricao,
  pe.escala,
  pe.fase,
  p.id AS projeto_id,
  p.nome AS projeto_nome,
  o.id AS obra_id
FROM entrega_ficheiros ef
JOIN projeto_entregaveis pe ON ef.entregavel_id = pe.id
JOIN projetos p ON ef.projeto_id = p.id
LEFT JOIN obras o ON o.projeto_id = p.id
WHERE ef.aprovado_construcao = true
  AND ef.versao_atual = true
ORDER BY ef.aprovado_em DESC;

-- Storage Bucket para ficheiros de entrega (executar no Supabase Dashboard se necessário)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('delivery-files', 'delivery-files', true, 104857600)
-- ON CONFLICT (id) DO NOTHING;
