-- Migration to add origem_entrega_id to design_reviews table
-- This allows tracking which entrega a design review was created from

ALTER TABLE design_reviews
ADD COLUMN IF NOT EXISTS origem_entrega_id UUID REFERENCES projeto_entregas(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_design_reviews_origem_entrega ON design_reviews(origem_entrega_id);

-- Add comment for documentation
COMMENT ON COLUMN design_reviews.origem_entrega_id IS 'Reference to the entrega from which this design review was created (if converted from a PDF)';
