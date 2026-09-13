-- Additive only. This migration deliberately does not read, move, promote, or
-- publish legacy regional editions. Operations owns when it is applied.
CREATE TABLE cms_shared_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES cms_documents(id) ON DELETE CASCADE,
  locale text NOT NULL,
  active_revision_id uuid,
  created_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, locale)
);
CREATE INDEX cms_shared_baselines_active_revision_idx ON cms_shared_baselines(active_revision_id);

CREATE TABLE cms_shared_baseline_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id uuid NOT NULL REFERENCES cms_shared_baselines(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  media_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_digest text NOT NULL,
  source_revision_id uuid REFERENCES cms_revisions(id) ON DELETE SET NULL,
  created_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (baseline_id, revision_number)
);
ALTER TABLE cms_shared_baselines
  ADD CONSTRAINT cms_shared_baselines_active_revision_fk
  FOREIGN KEY (active_revision_id) REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL;
CREATE INDEX cms_shared_baseline_revisions_source_idx ON cms_shared_baseline_revisions(source_revision_id);

CREATE TABLE cms_market_edition_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES cms_documents(id) ON DELETE CASCADE,
  market_edition_id uuid NOT NULL REFERENCES market_editions(id) ON DELETE CASCADE,
  locale text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('shared','adapted','independent')),
  baseline_id uuid REFERENCES cms_shared_baselines(id) ON DELETE SET NULL,
  based_on_baseline_revision_id uuid REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL,
  override_operations jsonb NOT NULL DEFAULT '[]'::jsonb,
  held_baseline_revision_id uuid REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL,
  materialized_revision_id uuid REFERENCES cms_revisions(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  translation_state text NOT NULL DEFAULT 'current'
    CHECK (translation_state IN ('current','stale','not-applicable')),
  translation_source_revision_id uuid REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, market_edition_id, locale),
  CHECK (
    (mode='independent' AND baseline_id IS NULL)
    OR (mode IN ('shared','adapted') AND baseline_id IS NOT NULL)
  )
);
CREATE INDEX cms_market_edition_bindings_baseline_idx
  ON cms_market_edition_bindings(baseline_id, locale);
CREATE INDEX cms_market_edition_bindings_materialized_idx
  ON cms_market_edition_bindings(materialized_revision_id);

CREATE TABLE cms_resolved_market_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  binding_id uuid NOT NULL REFERENCES cms_market_edition_bindings(id) ON DELETE CASCADE,
  cms_revision_id uuid NOT NULL UNIQUE REFERENCES cms_revisions(id) ON DELETE CASCADE,
  baseline_revision_id uuid REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL,
  media_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cms_resolved_market_revisions_binding_idx
  ON cms_resolved_market_revisions(binding_id, created_at);

CREATE TABLE cms_shared_edition_migration_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES cms_documents(id) ON DELETE CASCADE,
  requested_by_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  dry_run boolean NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cms_shared_edition_migration_receipts_document_idx
  ON cms_shared_edition_migration_receipts(document_id, created_at);

-- Baseline and resolved history are append-only. Active baseline/binding
-- pointers are the mutable authoring boundary; snapshots themselves are not.
CREATE FUNCTION cms_reject_shared_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'shared edition history is immutable';
END;
$$;
CREATE TRIGGER cms_shared_baseline_revisions_immutable
  BEFORE UPDATE OR DELETE ON cms_shared_baseline_revisions
  FOR EACH ROW EXECUTE FUNCTION cms_reject_shared_history_mutation();
CREATE TRIGGER cms_resolved_market_revisions_immutable
  BEFORE UPDATE OR DELETE ON cms_resolved_market_revisions
  FOR EACH ROW EXECUTE FUNCTION cms_reject_shared_history_mutation();