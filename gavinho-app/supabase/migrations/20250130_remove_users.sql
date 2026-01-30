-- =====================================================
-- Remover utilizadores especificos
-- =====================================================

-- Primeiro, remover de tabelas relacionadas (para evitar erros de FK)
DELETE FROM projeto_equipa WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_presenca se existir
DELETE FROM chat_presenca WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_leituras se existir
DELETE FROM chat_leituras WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_mencoes se existir
DELETE FROM chat_mencoes WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_notificacoes se existir
DELETE FROM chat_notificacoes WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_subscricoes se existir
DELETE FROM chat_subscricoes WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Remover de chat_push_subscriptions se existir
DELETE FROM chat_push_subscriptions WHERE utilizador_id IN (
    SELECT id FROM utilizadores WHERE email IN (
        'alana.oliveira@by-gavinho.com',
        'nathalia.bampi@by-gavinho.com',
        'raquel.sonobe@by-gavinho.com',
        'leonardo.ribeiro@by-gavinho.com',
        'patricia.morais@by-gavinho.com'
    )
);

-- Marcar utilizadores como inativos (soft delete - mais seguro)
UPDATE utilizadores
SET ativo = false,
    updated_at = NOW()
WHERE email IN (
    'alana.oliveira@by-gavinho.com',
    'nathalia.bampi@by-gavinho.com',
    'raquel.sonobe@by-gavinho.com',
    'leonardo.ribeiro@by-gavinho.com',
    'patricia.morais@by-gavinho.com'
);

-- Se preferires eliminar completamente (descomentar se necessario):
-- DELETE FROM utilizadores WHERE email IN (
--     'alana.oliveira@by-gavinho.com',
--     'nathalia.bampi@by-gavinho.com',
--     'raquel.sonobe@by-gavinho.com',
--     'leonardo.ribeiro@by-gavinho.com',
--     'patricia.morais@by-gavinho.com'
-- );

-- Remover tambem do Supabase Auth (tem de ser feito via dashboard ou API admin)
-- Os utilizadores ficam inativos na tabela utilizadores mas mantem a conta auth
