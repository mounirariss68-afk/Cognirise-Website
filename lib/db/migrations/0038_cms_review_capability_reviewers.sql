-- Reviewer eligibility is policy-capability based. Legacy roles remain a
-- compatibility projection only, so the database integrity trigger must not
-- reject an active user solely for having the viewer role.
CREATE OR REPLACE FUNCTION cms_assert_review_request_target() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE revision_edition uuid;
BEGIN
  SELECT edition_id INTO revision_edition FROM cms_revisions WHERE id=NEW.revision_id;
  IF revision_edition IS NULL OR revision_edition<>NEW.edition_id THEN
    RAISE EXCEPTION 'review request revision must belong to its edition';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM cms_users WHERE id=NEW.reviewer_user_id AND status='active'
  ) THEN
    RAISE EXCEPTION 'review request reviewer must be active';
  END IF;
  RETURN NEW;
END;
$$;