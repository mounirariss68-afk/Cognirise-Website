-- Freeze the applicable accountable editor when a review is created. Existing
-- rows deliberately remain null: inferring a historical person would rewrite
-- audit facts. New review decisions never consult mutable assignments.
ALTER TABLE cms_review_requests
  ADD COLUMN IF NOT EXISTS accountable_editor_user_id uuid
  REFERENCES cms_users(id) ON DELETE SET NULL;

-- Preserve the then-applicable responsibility for open legacy work exactly
-- once. This is a compatibility snapshot, not a rewrite of assignment history:
-- requests with no accountable editor remain explicitly uncredited.
UPDATE cms_review_requests request
   SET accountable_editor_user_id = (
     SELECT assignment.editor_user_id
       FROM cms_market_editions edition
       JOIN cms_editorial_assignments assignment
         ON assignment.document_id=edition.document_id
        AND (assignment.edition_id=edition.id OR assignment.edition_id IS NULL)
      WHERE edition.id=request.edition_id
      ORDER BY (assignment.edition_id=edition.id) DESC
      LIMIT 1
   )
 WHERE request.status='requested'
   AND request.accountable_editor_user_id IS NULL;