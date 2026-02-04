-- Seed: Email de teste para testar detecção de decisões
-- Data: 2025-01-25
-- Descrição: Insere um email de teste com decisões claras para validar a funcionalidade

-- Primeiro, obter um projeto/obra válido para associar o email
DO $$
DECLARE
  v_obra_id UUID;
  v_projeto_id UUID;
BEGIN
  -- Tentar obter uma obra existente
  SELECT id INTO v_obra_id FROM obras WHERE estado = 'em_curso' LIMIT 1;

  -- Se não houver obra, tentar obter um projeto
  IF v_obra_id IS NULL THEN
    SELECT id INTO v_projeto_id FROM projetos WHERE arquivado = false LIMIT 1;
  END IF;

  -- Inserir email de teste (usando obra_id se disponível)
  INSERT INTO obra_emails (
    obra_id,
    de_email,
    de_nome,
    para_emails,
    assunto,
    corpo_texto,
    tipo,
    data_envio,
    data_recebido,
    lido,
    importante,
    codigo_obra_detectado
  ) VALUES (
    COALESCE(v_obra_id, v_projeto_id),
    'joao.silva@cliente.com',
    'João Silva',
    '[{"email": "ines@gavinhogroup.com", "nome": "Inês Gavinho"}]'::jsonb,
    'RE: Confirmação materiais WC Suite - Maria Residences',
    'Olá Inês,

Após a reunião de ontem com a equipa, venho confirmar as seguintes decisões:

1. BANCADA WC SUITE
Confirmamos que queremos avançar com o mármore Calacatta Gold para a bancada do WC Suite principal, conforme a amostra que nos mostraram na visita à pedreira.

2. TORNEIRA WC
Aprovamos a torneira Fantini série Lamè em dourado escovado. Por favor encomendem 2 unidades (uma para o WC suite e outra para o WC social).

3. ORÇAMENTO ADICIONAL
O orçamento adicional de €3.200 para os acabamentos premium está aprovado. Podem avançar com a encomenda.

4. PRAZO DE ENTREGA
Precisamos que a instalação esteja concluída até 15 de Março, conforme acordado.

Por favor confirmem a recepção deste email e a data de entrega prevista dos materiais.

Cumprimentos,
João Silva
Cliente - Maria Residences
Telemóvel: +351 912 345 678',
    'recebido',
    NOW(),
    NOW(),
    false,
    true,
    'GA00402'
  );

  RAISE NOTICE 'Email de teste inserido com sucesso!';
END $$;

-- Verificar inserção
SELECT id, assunto, de_nome, corpo_texto, created_at
FROM obra_emails
WHERE assunto LIKE '%Confirmação materiais WC Suite%'
ORDER BY created_at DESC
LIMIT 1;
