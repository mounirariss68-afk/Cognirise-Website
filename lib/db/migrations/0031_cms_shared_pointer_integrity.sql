-- The 0029 foreign keys establish existence only.  These deferred checks make
-- the shared-history lineage and mutable binding pointers describe the same
-- document, destination, and locale without constraining their write order.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM cms_shared_baselines b
     WHERE b.active_revision_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM cms_shared_baseline_revisions r
          WHERE r.id=b.active_revision_id AND r.baseline_id=b.id
       )
  ) THEN
    RAISE EXCEPTION 'cannot add shared pointer integrity: a baseline active revision belongs to another baseline';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cms_shared_baseline_revisions r
     WHERE r.source_revision_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
           FROM cms_shared_baselines b
           JOIN cms_revisions source_revision ON source_revision.id=r.source_revision_id
           JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
          WHERE b.id=r.baseline_id
            AND source_edition.document_id=b.document_id
            AND source_edition.locale=b.locale
            AND source_edition.market<>'shared-source'
            AND source_edition.locale<>'und'
       )
  ) THEN
    RAISE EXCEPTION 'cannot add shared pointer integrity: a baseline revision source is not an exact real-market revision';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cms_market_edition_bindings binding
     WHERE (binding.baseline_id IS NOT NULL AND NOT EXISTS (
              SELECT 1 FROM cms_shared_baselines baseline
               WHERE baseline.id=binding.baseline_id
                 AND baseline.document_id=binding.document_id
                 AND baseline.locale=binding.locale
            ))
        OR (binding.mode<>'independent' AND (
              binding.based_on_baseline_revision_id IS NULL OR NOT EXISTS (
                SELECT 1 FROM cms_shared_baseline_revisions revision
                 WHERE revision.id=binding.based_on_baseline_revision_id
                   AND revision.baseline_id=binding.baseline_id
              )
            ))
        OR (binding.mode='independent' AND binding.based_on_baseline_revision_id IS NOT NULL)
        OR (binding.held_baseline_revision_id IS NOT NULL AND NOT EXISTS (
              SELECT 1 FROM cms_shared_baseline_revisions revision
               WHERE revision.id=binding.held_baseline_revision_id
                 AND revision.baseline_id=binding.baseline_id
            ))
        OR (binding.translation_source_revision_id IS NOT NULL AND NOT EXISTS (
              SELECT 1
                FROM cms_shared_baseline_revisions revision
                JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
               WHERE revision.id=binding.translation_source_revision_id
                 AND baseline.document_id=binding.document_id
            ))
        OR binding.materialized_revision_id IS NULL
        OR NOT EXISTS (
          SELECT 1
            FROM cms_revisions materialized
            JOIN cms_market_editions destination ON destination.id=materialized.edition_id
            JOIN market_editions market ON market.id=binding.market_edition_id
           WHERE materialized.id=binding.materialized_revision_id
             AND destination.document_id=binding.document_id
             AND destination.market=market.code
             AND destination.locale=binding.locale
        )
        OR NOT EXISTS (
          SELECT 1 FROM cms_resolved_market_revisions resolved
           WHERE resolved.binding_id=binding.id
             AND resolved.cms_revision_id=binding.materialized_revision_id
        )
  ) THEN
    RAISE EXCEPTION 'cannot add shared pointer integrity: a binding pointer is incoherent';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cms_resolved_market_revisions resolved
      JOIN cms_market_edition_bindings binding ON binding.id=resolved.binding_id
     WHERE NOT EXISTS (
             SELECT 1
               FROM cms_revisions materialized
               JOIN cms_market_editions destination ON destination.id=materialized.edition_id
               JOIN market_editions market ON market.id=binding.market_edition_id
              WHERE materialized.id=resolved.cms_revision_id
                AND destination.document_id=binding.document_id
                AND destination.market=market.code
                AND destination.locale=binding.locale
           )
        OR (resolved.baseline_revision_id IS NOT NULL AND NOT EXISTS (
             SELECT 1
               FROM cms_shared_baseline_revisions baseline_revision
               JOIN cms_shared_baselines baseline ON baseline.id=baseline_revision.baseline_id
              WHERE baseline_revision.id=resolved.baseline_revision_id
                AND baseline.document_id=binding.document_id
                AND baseline.locale=binding.locale
           ))
  ) THEN
    RAISE EXCEPTION 'cannot add shared pointer integrity: resolved history does not match its binding';
  END IF;
END
$$;

-- Keep 0030's direct-mutation guard while permitting FK ON DELETE SET NULL
-- actions that occur during the same nested document lifecycle cascade.
CREATE OR REPLACE FUNCTION cms_reject_shared_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'shared edition history is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION cms_assert_shared_baseline_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  baseline cms_shared_baselines%ROWTYPE;
BEGIN
  -- A deferred event can outlive a create-then-delete sequence in one
  -- transaction. Cascading document cleanup is valid in that case.
  SELECT * INTO baseline FROM cms_shared_baselines WHERE id=NEW.id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF baseline.active_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM cms_shared_baseline_revisions revision
     WHERE revision.id=baseline.active_revision_id AND revision.baseline_id=baseline.id
  ) THEN
    RAISE EXCEPTION 'shared baseline active revision must belong to its baseline';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cms_shared_baseline_revisions revision
      LEFT JOIN cms_revisions source_revision ON source_revision.id=revision.source_revision_id
      LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
     WHERE revision.baseline_id=baseline.id
       AND revision.source_revision_id IS NOT NULL
       AND (source_edition.document_id IS DISTINCT FROM baseline.document_id
         OR source_edition.locale IS DISTINCT FROM baseline.locale
         OR source_edition.market='shared-source'
         OR source_edition.locale='und')
  ) THEN
    RAISE EXCEPTION 'shared baseline document and locale must continue to match its revision sources';
  END IF;

  IF EXISTS (
    SELECT 1 FROM cms_market_edition_bindings binding
     WHERE binding.baseline_id=baseline.id
       AND (binding.document_id IS DISTINCT FROM baseline.document_id
         OR binding.locale IS DISTINCT FROM baseline.locale)
  ) OR EXISTS (
    SELECT 1
      FROM cms_resolved_market_revisions resolved
      JOIN cms_shared_baseline_revisions revision ON revision.id=resolved.baseline_revision_id
      JOIN cms_market_edition_bindings binding ON binding.id=resolved.binding_id
     WHERE revision.baseline_id=baseline.id
       AND (binding.document_id IS DISTINCT FROM baseline.document_id
         OR binding.locale IS DISTINCT FROM baseline.locale)
  ) THEN
    RAISE EXCEPTION 'shared baseline document and locale must continue to match dependent bindings and history';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION cms_assert_shared_baseline_revision_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cms_shared_baseline_revisions WHERE id=NEW.id) THEN
    RETURN NULL;
  END IF;

  IF NEW.source_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM cms_shared_baselines baseline
      JOIN cms_revisions source_revision ON source_revision.id=NEW.source_revision_id
      JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
     WHERE baseline.id=NEW.baseline_id
       AND source_edition.document_id=baseline.document_id
       AND source_edition.locale=baseline.locale
       AND source_edition.market<>'shared-source'
       AND source_edition.locale<>'und'
  ) THEN
    RAISE EXCEPTION 'shared baseline revision source must be an exact real-market revision for its document and locale';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION cms_assert_shared_binding_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  binding cms_market_edition_bindings%ROWTYPE;
BEGIN
  SELECT * INTO binding FROM cms_market_edition_bindings WHERE id=NEW.id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF binding.baseline_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM cms_shared_baselines baseline
     WHERE baseline.id=binding.baseline_id
       AND baseline.document_id=binding.document_id
       AND baseline.locale=binding.locale
  ) THEN
    RAISE EXCEPTION 'shared binding baseline must match its document and locale';
  END IF;

  IF binding.mode<>'independent' AND (
    binding.based_on_baseline_revision_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM cms_shared_baseline_revisions revision
       WHERE revision.id=binding.based_on_baseline_revision_id
         AND revision.baseline_id=binding.baseline_id
    )
  ) THEN
    RAISE EXCEPTION 'shared binding adopted baseline revision must belong to its baseline';
  END IF;

  IF binding.mode='independent' AND binding.based_on_baseline_revision_id IS NOT NULL THEN
    RAISE EXCEPTION 'independent binding cannot retain an adopted baseline revision';
  END IF;

  IF binding.held_baseline_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM cms_shared_baseline_revisions revision
     WHERE revision.id=binding.held_baseline_revision_id
       AND revision.baseline_id=binding.baseline_id
  ) THEN
    RAISE EXCEPTION 'shared binding held baseline revision must belong to its baseline';
  END IF;

  IF binding.translation_source_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM cms_shared_baseline_revisions revision
      JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
     WHERE revision.id=binding.translation_source_revision_id
       AND baseline.document_id=binding.document_id
  ) THEN
    RAISE EXCEPTION 'shared binding translation source must belong to its document';
  END IF;

  IF binding.materialized_revision_id IS NULL OR NOT EXISTS (
    SELECT 1
      FROM cms_revisions materialized
      JOIN cms_market_editions destination ON destination.id=materialized.edition_id
      JOIN market_editions market ON market.id=binding.market_edition_id
     WHERE materialized.id=binding.materialized_revision_id
       AND destination.document_id=binding.document_id
       AND destination.market=market.code
       AND destination.locale=binding.locale
  ) THEN
    RAISE EXCEPTION 'shared binding materialized revision must match its exact destination';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cms_resolved_market_revisions resolved
     WHERE resolved.binding_id=binding.id
       AND resolved.cms_revision_id=binding.materialized_revision_id
  ) THEN
    RAISE EXCEPTION 'shared binding materialized revision must have matching resolved history';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cms_resolved_market_revisions resolved
      JOIN cms_revisions materialized ON materialized.id=resolved.cms_revision_id
      JOIN cms_market_editions destination ON destination.id=materialized.edition_id
      JOIN market_editions market ON market.id=binding.market_edition_id
      LEFT JOIN cms_shared_baseline_revisions baseline_revision ON baseline_revision.id=resolved.baseline_revision_id
      LEFT JOIN cms_shared_baselines baseline ON baseline.id=baseline_revision.baseline_id
     WHERE resolved.binding_id=binding.id
       AND (destination.document_id IS DISTINCT FROM binding.document_id
         OR destination.market IS DISTINCT FROM market.code
         OR destination.locale IS DISTINCT FROM binding.locale
         OR (resolved.baseline_revision_id IS NOT NULL
           AND (baseline.document_id IS DISTINCT FROM binding.document_id
             OR baseline.locale IS DISTINCT FROM binding.locale)))
  ) THEN
    RAISE EXCEPTION 'shared binding must continue to match all resolved history';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION cms_assert_resolved_market_revision_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cms_resolved_market_revisions WHERE id=NEW.id) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM cms_market_edition_bindings binding
      JOIN cms_revisions materialized ON materialized.id=NEW.cms_revision_id
      JOIN cms_market_editions destination ON destination.id=materialized.edition_id
      JOIN market_editions market ON market.id=binding.market_edition_id
     WHERE binding.id=NEW.binding_id
       AND destination.document_id=binding.document_id
       AND destination.market=market.code
       AND destination.locale=binding.locale
  ) THEN
    RAISE EXCEPTION 'resolved market revision must match its binding document, destination, and locale';
  END IF;

  -- This intentionally compares only historical ownership, not the binding's
  -- mutable baseline pointer. A detached binding retains valid prior history.
  IF NEW.baseline_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM cms_market_edition_bindings binding
      JOIN cms_shared_baseline_revisions baseline_revision ON baseline_revision.id=NEW.baseline_revision_id
      JOIN cms_shared_baselines baseline ON baseline.id=baseline_revision.baseline_id
     WHERE binding.id=NEW.binding_id
       AND baseline.document_id=binding.document_id
       AND baseline.locale=binding.locale
  ) THEN
    RAISE EXCEPTION 'resolved market revision baseline must match its binding document and locale';
  END IF;
  RETURN NULL;
END;
$$;

-- Revision and edition addresses are mutable outside the shared tables. Watch
-- those parents too, so a later move cannot invalidate already sealed history.
CREATE OR REPLACE FUNCTION cms_assert_shared_pointer_dependency_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM cms_shared_baseline_revisions revision
      JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
      LEFT JOIN cms_revisions source_revision ON source_revision.id=revision.source_revision_id
      LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
     WHERE revision.source_revision_id IS NOT NULL
       AND (source_edition.document_id IS DISTINCT FROM baseline.document_id
         OR source_edition.locale IS DISTINCT FROM baseline.locale
         OR source_edition.market='shared-source'
         OR source_edition.locale='und')
  ) THEN
    RAISE EXCEPTION 'shared baseline revision source must remain an exact real-market revision for its document and locale';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cms_resolved_market_revisions resolved
      JOIN cms_market_edition_bindings binding ON binding.id=resolved.binding_id
      JOIN cms_revisions materialized ON materialized.id=resolved.cms_revision_id
      JOIN cms_market_editions destination ON destination.id=materialized.edition_id
      JOIN market_editions market ON market.id=binding.market_edition_id
     WHERE destination.document_id IS DISTINCT FROM binding.document_id
        OR destination.market IS DISTINCT FROM market.code
        OR destination.locale IS DISTINCT FROM binding.locale
  ) THEN
    RAISE EXCEPTION 'resolved market revision must remain at its binding document, destination, and locale';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cms_market_edition_bindings binding
     WHERE binding.materialized_revision_id IS NULL
        OR NOT EXISTS (
             SELECT 1
               FROM cms_revisions materialized
               JOIN cms_market_editions destination ON destination.id=materialized.edition_id
               JOIN market_editions market ON market.id=binding.market_edition_id
              WHERE materialized.id=binding.materialized_revision_id
                AND destination.document_id=binding.document_id
                AND destination.market=market.code
                AND destination.locale=binding.locale
           )
        OR NOT EXISTS (
             SELECT 1 FROM cms_resolved_market_revisions resolved
              WHERE resolved.binding_id=binding.id
                AND resolved.cms_revision_id=binding.materialized_revision_id
           )
  ) THEN
    RAISE EXCEPTION 'shared binding materialized revision must remain coherent';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER cms_shared_baselines_integrity
  AFTER INSERT OR UPDATE ON cms_shared_baselines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_baseline_integrity();

CREATE CONSTRAINT TRIGGER cms_shared_baseline_revisions_integrity
  AFTER INSERT OR UPDATE ON cms_shared_baseline_revisions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_baseline_revision_integrity();

CREATE CONSTRAINT TRIGGER cms_market_edition_bindings_integrity
  AFTER INSERT OR UPDATE ON cms_market_edition_bindings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_binding_integrity();

CREATE CONSTRAINT TRIGGER cms_resolved_market_revisions_integrity
  AFTER INSERT OR UPDATE ON cms_resolved_market_revisions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION cms_assert_resolved_market_revision_integrity();

CREATE CONSTRAINT TRIGGER cms_revisions_shared_pointer_integrity
  AFTER UPDATE ON cms_revisions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_pointer_dependency_integrity();

CREATE CONSTRAINT TRIGGER cms_market_editions_shared_pointer_integrity
  AFTER UPDATE ON cms_market_editions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_pointer_dependency_integrity();

CREATE CONSTRAINT TRIGGER market_editions_shared_pointer_integrity
  AFTER UPDATE ON market_editions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_pointer_dependency_integrity();