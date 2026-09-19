-- Release evidence is append-only. Active pointers provide the only mutable
-- projection and may reference only an existing immutable receipt.
CREATE OR REPLACE FUNCTION cms_reject_immutable_release_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
END $$;

DROP TRIGGER IF EXISTS cms_release_candidates_immutable_update ON cms_release_candidates;
CREATE TRIGGER cms_release_candidates_immutable_update
BEFORE UPDATE OR DELETE ON cms_release_candidates
FOR EACH ROW EXECUTE FUNCTION cms_reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS cms_release_receipts_immutable_update ON cms_release_receipts;
CREATE TRIGGER cms_release_receipts_immutable_update
BEFORE UPDATE OR DELETE ON cms_release_receipts
FOR EACH ROW EXECUTE FUNCTION cms_reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS cms_withdrawal_receipts_immutable_update ON cms_withdrawal_receipts;
CREATE TRIGGER cms_withdrawal_receipts_immutable_update
BEFORE UPDATE OR DELETE ON cms_withdrawal_receipts
FOR EACH ROW EXECUTE FUNCTION cms_reject_immutable_release_mutation();

ALTER TABLE cms_release_candidates
  ADD CONSTRAINT cms_release_candidates_required_actors_check
  CHECK (
    submitted_by_user_id IS NOT NULL
    AND reviewer_user_id IS NOT NULL
    AND approver_user_id IS NOT NULL
    AND submitted_by_user_id<>reviewer_user_id
    AND submitted_by_user_id<>approver_user_id
    AND reviewer_user_id<>approver_user_id
  ) NOT VALID;

ALTER TABLE cms_release_receipts
  ADD CONSTRAINT cms_release_receipts_required_actors_check
  CHECK (
    submitter_user_id IS NOT NULL
    AND reviewer_user_id IS NOT NULL
    AND approver_user_id IS NOT NULL
    AND publisher_user_id IS NOT NULL
    AND submitter_user_id<>reviewer_user_id
    AND submitter_user_id<>approver_user_id
    AND submitter_user_id<>publisher_user_id
    AND reviewer_user_id<>approver_user_id
    AND reviewer_user_id<>publisher_user_id
    AND approver_user_id<>publisher_user_id
  ) NOT VALID;