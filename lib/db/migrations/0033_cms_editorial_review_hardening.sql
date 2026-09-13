-- Harden review separation of duties and emit a durable event for every
-- binding that remains based on a baseline revision replaced by a successor.

CREATE OR REPLACE FUNCTION cms_assert_editorial_assignment_target() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.edition_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM cms_market_editions
     WHERE id=NEW.edition_id AND document_id=NEW.document_id
  ) THEN
    RAISE EXCEPTION 'editorial assignment edition must belong to its document';
  END IF;
  IF NEW.editor_user_id IS NOT NULL
     AND NEW.editor_user_id=NEW.reviewer_user_id THEN
    RAISE EXCEPTION 'editorial assignment editor and reviewer must be different users';
  END IF;
  IF NEW.reviewer_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM cms_users
     WHERE id=NEW.reviewer_user_id AND status='active'
       AND role IN ('administrator','publisher')
  ) THEN
    RAISE EXCEPTION 'editorial assignment reviewer must be an active publisher or administrator';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cms_editorial_shared_conflict_notification() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  binding cms_market_edition_bindings%ROWTYPE;
  target cms_market_editions%ROWTYPE;
  recipient record;
BEGIN
  IF OLD.active_revision_id IS NULL
     OR NEW.active_revision_id IS NULL
     OR NEW.active_revision_id=OLD.active_revision_id THEN
    RETURN NEW;
  END IF;

  -- A successor never changes a destination pointer. It invalidates every
  -- shared/adapted destination still based on the replaced exact baseline
  -- revision, even if its translation acknowledgement points elsewhere.
  FOR binding IN
    UPDATE cms_market_edition_bindings
       SET translation_state='stale',updated_at=now()
     WHERE document_id=NEW.document_id
       AND baseline_id=NEW.id
       AND mode IN ('shared','adapted')
       AND based_on_baseline_revision_id=OLD.active_revision_id
     RETURNING *
  LOOP
    SELECT edition.* INTO target
      FROM market_editions market
      JOIN cms_market_editions edition
        ON edition.document_id=binding.document_id
       AND edition.market=market.code
       AND edition.locale=binding.locale
     WHERE market.id=binding.market_edition_id;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    FOR recipient IN
      SELECT DISTINCT user_id FROM (
        SELECT editor_user_id user_id FROM cms_editorial_assignments WHERE edition_id=target.id
        UNION
        SELECT reviewer_user_id user_id FROM cms_editorial_assignments WHERE edition_id=target.id
      ) assigned WHERE user_id IS NOT NULL
    LOOP
      INSERT INTO cms_editorial_notifications
        (user_id,event_key,type,edition_id,document_id,title,message,link)
      VALUES (
        recipient.user_id,
        'shared-conflict:' || binding.id::text || ':' || NEW.active_revision_id::text,
        'shared-conflict',target.id,binding.document_id,
        'Shared baseline needs attention',
        'An updated shared baseline may require an explicit resolution.',
        '/documents/' || binding.document_id::text || '?market=' || target.market || '&locale=' || target.locale
      ) ON CONFLICT (user_id,event_key) DO NOTHING;
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cms_editorial_shared_conflict_notification ON cms_market_edition_bindings;
DROP TRIGGER IF EXISTS cms_editorial_shared_conflict_notification ON cms_shared_baselines;
CREATE TRIGGER cms_editorial_shared_conflict_notification
  AFTER UPDATE OF active_revision_id ON cms_shared_baselines
  FOR EACH ROW EXECUTE FUNCTION cms_editorial_shared_conflict_notification();