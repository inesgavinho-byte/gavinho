-- Add data_saida column to utilizadores table if it doesn't exist
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS data_saida DATE;

-- Update employee start dates (data_entrada)
-- Luciana Ortega - 14/02/2025
UPDATE utilizadores SET data_entrada = '2025-02-14' WHERE nome ILIKE '%Luciana Ortega%';

-- Leonardo Ribeiro - 10/03/2025
UPDATE utilizadores SET data_entrada = '2025-03-10' WHERE nome ILIKE '%Leonardo Ribeiro%';

-- Caroline Roda - 24/03/2025
UPDATE utilizadores SET data_entrada = '2025-03-24' WHERE nome ILIKE '%Caroline Roda%';

-- Giovana Martins - 01/04/2025
UPDATE utilizadores SET data_entrada = '2025-04-01' WHERE nome ILIKE '%Giovana Martins%';

-- Carolina Cipriano - 23/06/2025
UPDATE utilizadores SET data_entrada = '2025-06-23' WHERE nome ILIKE '%Carolina Cipriano%';

-- Laís Silva - 14/07/2025
UPDATE utilizadores SET data_entrada = '2025-07-14' WHERE nome ILIKE '%La%s Silva%';

-- Alana Oliveira - 22/09/2025
UPDATE utilizadores SET data_entrada = '2025-09-22' WHERE nome ILIKE '%Alana Oliveira%';

-- Ana Miranda - 10/11/2025
UPDATE utilizadores SET data_entrada = '2025-11-10' WHERE nome ILIKE '%Ana Miranda%';

-- Patrícia Morais - 17/11/2025
UPDATE utilizadores SET data_entrada = '2025-11-17' WHERE nome ILIKE '%Patr%cia Morais%';

-- Add comment explaining the column
COMMENT ON COLUMN utilizadores.data_saida IS 'Data de término da colaboração na empresa. NULL se ainda está em atividade.';
