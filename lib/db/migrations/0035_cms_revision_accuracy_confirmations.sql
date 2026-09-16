CREATE TABLE IF NOT EXISTS cms_revision_accuracy_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES cms_revisions(id) ON DELETE cascade,
  content_digest text NOT NULL,
  confirmed_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE restrict,
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_revision_accuracy_confirmation_actor_uidx
  ON cms_revision_accuracy_confirmations(revision_id, confirmed_by_user_id, content_digest);
CREATE INDEX IF NOT EXISTS cms_revision_accuracy_confirmation_latest_idx
  ON cms_revision_accuracy_confirmations(revision_id, confirmed_at DESC);