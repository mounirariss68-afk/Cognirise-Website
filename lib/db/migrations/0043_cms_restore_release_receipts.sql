-- Restore-release authority is an exact, durable, single-use receipt rather
-- than process-local workflow state.
CREATE TABLE IF NOT EXISTS cms_restore_release_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES cms_documents(id) ON DELETE cascade,
  edition_id uuid NOT NULL REFERENCES cms_market_editions(id) ON DELETE cascade,
  revision_id uuid NOT NULL REFERENCES cms_revisions(id) ON DELETE cascade,
  content_digest text NOT NULL,
  authorized_actor_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE restrict,
  authorized_transition text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  consumed_by_user_id uuid REFERENCES cms_users(id) ON DELETE set null,
  CONSTRAINT cms_restore_release_receipts_transition_check
    CHECK (authorized_transition = 'restore-successor-release')
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_restore_release_receipts_revision_transition_uidx
  ON cms_restore_release_receipts(revision_id, authorized_transition);
CREATE INDEX IF NOT EXISTS cms_restore_release_receipts_actor_pending_idx
  ON cms_restore_release_receipts(authorized_actor_user_id, consumed_at);