-- Fix: design_review_annotations RLS policies reference non-existent columns
-- Bug: policies used `review_id` (doesn't exist) instead of joining via `version_id` → `design_review_versions`
-- Bug: delete policy used `criado_por` (doesn't exist) instead of `autor_id`

-- Drop broken policies
DROP POLICY IF EXISTS "design_review_annotations_select" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_insert" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_update" ON design_review_annotations;
DROP POLICY IF EXISTS "design_review_annotations_delete" ON design_review_annotations;

-- Recreate with correct join: annotations → versions → reviews → projeto_id
CREATE POLICY "design_review_annotations_select" ON design_review_annotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM design_review_versions drv
    JOIN design_reviews dr ON dr.id = drv.review_id
    WHERE drv.id = design_review_annotations.version_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_insert" ON design_review_annotations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM design_review_versions drv
    JOIN design_reviews dr ON dr.id = drv.review_id
    WHERE drv.id = design_review_annotations.version_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_update" ON design_review_annotations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM design_review_versions drv
    JOIN design_reviews dr ON dr.id = drv.review_id
    WHERE drv.id = design_review_annotations.version_id
      AND gavinho_can_access_project(dr.projeto_id)
  ));

CREATE POLICY "design_review_annotations_delete" ON design_review_annotations FOR DELETE
  USING (
    auth.uid() = autor_id  -- author can delete own
    OR gavinho_is_gestor_or_above()
  );
