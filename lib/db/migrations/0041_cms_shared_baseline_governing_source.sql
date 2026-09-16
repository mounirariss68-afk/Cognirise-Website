-- Preserve authorization lineage separately from exact payload-copy lineage.
-- A direct neutral successor may edit its snapshot while still being governed
-- by an earlier real-market source; it must not masquerade as that source.
-- Existing baseline history is append-only and protected by an immutable
-- trigger, so legacy exact-source provenance is deliberately not copied into
-- this new column. Runtime authority resolves it compatibly with COALESCE only
-- after validating the same-document real-market source. New inserts persist
-- the separate governing origin.
ALTER TABLE cms_shared_baseline_revisions
  ADD COLUMN IF NOT EXISTS governing_source_revision_id uuid
  REFERENCES cms_revisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cms_shared_baseline_revisions_governing_source_idx
  ON cms_shared_baseline_revisions(governing_source_revision_id);