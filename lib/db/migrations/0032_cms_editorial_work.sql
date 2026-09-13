-- Edition-aware editorial responsibility, exact-revision review and a durable
-- in-app/outbound notification ledger.  Content is intentionally never copied
-- into notifications or jobs.
CREATE TABLE IF NOT EXISTS cms_editorial_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES cms_documents(id) ON DELETE CASCADE,
  edition_id uuid REFERENCES cms_market_editions(id) ON DELETE CASCADE,
  editor_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  reviewer_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  due_at timestamp with time zone,
  created_by_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cms_editorial_assignments_due_check CHECK (due_at IS NULL OR due_at > created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS cms_editorial_assignments_edition_uidx
  ON cms_editorial_assignments(edition_id) WHERE edition_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cms_editorial_assignments_document_uidx
  ON cms_editorial_assignments(document_id) WHERE edition_id IS NULL;
CREATE INDEX IF NOT EXISTS cms_editorial_assignments_editor_idx
  ON cms_editorial_assignments(editor_user_id,due_at);
CREATE INDEX IF NOT EXISTS cms_editorial_assignments_reviewer_idx
  ON cms_editorial_assignments(reviewer_user_id,due_at);

CREATE TABLE IF NOT EXISTS cms_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES cms_market_editions(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES cms_revisions(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE RESTRICT,
  reviewer_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'requested',
  note text,
  decision_note text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  decided_at timestamp with time zone,
  superseded_at timestamp with time zone,
  blocked_reason text,
  CONSTRAINT cms_review_requests_status_check
    CHECK (status IN ('requested','approved','rejected','superseded','blocked'))
);
CREATE UNIQUE INDEX IF NOT EXISTS cms_review_requests_open_revision_uidx
  ON cms_review_requests(revision_id) WHERE status='requested';
CREATE INDEX IF NOT EXISTS cms_review_requests_reviewer_idx
  ON cms_review_requests(reviewer_user_id,status,requested_at);
CREATE INDEX IF NOT EXISTS cms_review_requests_edition_idx
  ON cms_review_requests(edition_id,status,requested_at);

CREATE TABLE IF NOT EXISTS cms_editorial_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  type text NOT NULL,
  edition_id uuid REFERENCES cms_market_editions(id) ON DELETE CASCADE,
  document_id uuid REFERENCES cms_documents(id) ON DELETE CASCADE,
  revision_id uuid REFERENCES cms_revisions(id) ON DELETE CASCADE,
  review_request_id uuid REFERENCES cms_review_requests(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text NOT NULL,
  read_at timestamp with time zone,
  digest_delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cms_editorial_notifications_type_check CHECK (type IN
    ('assignment','review-requested','review-approved','review-rejected',
     'review-superseded','due-reminder','access-blocked','shared-update','shared-conflict'))
);
ALTER TABLE cms_editorial_notifications
  ADD COLUMN IF NOT EXISTS digest_delivered_at timestamp with time zone;
CREATE UNIQUE INDEX IF NOT EXISTS cms_editorial_notifications_event_uidx
  ON cms_editorial_notifications(user_id,event_key);
CREATE INDEX IF NOT EXISTS cms_editorial_notifications_user_idx
  ON cms_editorial_notifications(user_id,read_at,created_at DESC);

CREATE TABLE IF NOT EXISTS cms_editorial_digest_preferences (
  user_id uuid PRIMARY KEY REFERENCES cms_users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_editorial_digest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE CASCADE,
  digest_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamp with time zone NOT NULL DEFAULT now(),
  processing_lease uuid,
  last_attempt_at timestamp with time zone,
  sent_at timestamp with time zone,
  failed_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cms_editorial_digest_jobs_status_check CHECK (status IN ('pending','processing','sent','failed','blocked'))
);
CREATE UNIQUE INDEX IF NOT EXISTS cms_editorial_digest_jobs_user_date_uidx
  ON cms_editorial_digest_jobs(user_id,digest_date);
CREATE INDEX IF NOT EXISTS cms_editorial_digest_jobs_due_idx
  ON cms_editorial_digest_jobs(status,available_at);

-- A claimed digest owns an immutable notification selection. This prevents a
-- retry with the same idempotency key from collecting newer events.
CREATE TABLE IF NOT EXISTS cms_editorial_digest_job_notifications (
  job_id uuid NOT NULL REFERENCES cms_editorial_digest_jobs(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES cms_editorial_notifications(id) ON DELETE RESTRICT,
  PRIMARY KEY (job_id,notification_id),
  UNIQUE (notification_id)
);

-- Do not permit a direct SQL caller to point responsibility or a review at a
-- revision belonging to some other document/edition.
CREATE OR REPLACE FUNCTION cms_assert_editorial_assignment_target() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.edition_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM cms_market_editions
     WHERE id=NEW.edition_id AND document_id=NEW.document_id
  ) THEN
    RAISE EXCEPTION 'editorial assignment edition must belong to its document';
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
DROP TRIGGER IF EXISTS cms_editorial_assignment_target_integrity ON cms_editorial_assignments;
CREATE TRIGGER cms_editorial_assignment_target_integrity
  BEFORE INSERT OR UPDATE ON cms_editorial_assignments
  FOR EACH ROW EXECUTE FUNCTION cms_assert_editorial_assignment_target();

CREATE OR REPLACE FUNCTION cms_assert_review_request_target() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cms_revisions WHERE id=NEW.revision_id AND edition_id=NEW.edition_id
  ) THEN
    RAISE EXCEPTION 'review request revision must belong to its exact edition';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM cms_users
     WHERE id=NEW.reviewer_user_id AND status='active'
       AND role IN ('administrator','publisher')
  ) THEN
    RAISE EXCEPTION 'review request reviewer must be an active publisher or administrator';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS cms_review_request_target_integrity ON cms_review_requests;
CREATE TRIGGER cms_review_request_target_integrity
  BEFORE INSERT OR UPDATE ON cms_review_requests
  FOR EACH ROW EXECUTE FUNCTION cms_assert_review_request_target();

-- Any later revision invalidates an outstanding request for the previous exact
-- revision.  This is a database trigger because revisions are created by more
-- than one lifecycle path.
CREATE OR REPLACE FUNCTION cms_editorial_supersede_reviews() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  request cms_review_requests%ROWTYPE;
  edition cms_market_editions%ROWTYPE;
BEGIN
  SELECT * INTO edition FROM cms_market_editions WHERE id=NEW.edition_id;
  FOR request IN
    UPDATE cms_review_requests
       SET status='superseded',superseded_at=now(),blocked_reason='A newer revision was saved.'
     WHERE edition_id=NEW.edition_id AND revision_id<>NEW.id AND status='requested'
     RETURNING *
  LOOP
    INSERT INTO cms_editorial_notifications
      (user_id,event_key,type,edition_id,revision_id,review_request_id,title,message,link)
    VALUES (
      request.reviewer_user_id,
      'review-superseded:' || request.id::text || ':' || NEW.id::text,
      'review-superseded',request.edition_id,request.revision_id,request.id,
      'Review request superseded','A newer revision was saved before this review was decided.',
      '/documents/' || edition.document_id::text || '?market=' || edition.market || '&locale=' || edition.locale
    ) ON CONFLICT (user_id,event_key) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS cms_editorial_revision_supersedes_review ON cms_revisions;
CREATE TRIGGER cms_editorial_revision_supersedes_review
  AFTER INSERT ON cms_revisions
  FOR EACH ROW EXECUTE FUNCTION cms_editorial_supersede_reviews();

CREATE OR REPLACE FUNCTION cms_editorial_review_transition_notification() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  request cms_review_requests%ROWTYPE;
  edition cms_market_editions%ROWTYPE;
  recipient uuid;
  notification_type text;
BEGIN
  IF NEW.workflow_state NOT IN ('approved','rejected')
     OR OLD.workflow_state=NEW.workflow_state THEN RETURN NEW; END IF;
  SELECT * INTO request FROM cms_review_requests
    WHERE revision_id=NEW.id AND status='requested' FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT * INTO edition FROM cms_market_editions WHERE id=request.edition_id;
  IF NEW.workflow_state='approved' THEN
    notification_type := 'review-approved';
  ELSE
    notification_type := 'review-rejected';
  END IF;
  UPDATE cms_review_requests SET status=CASE WHEN NEW.workflow_state='approved' THEN 'approved' ELSE 'rejected' END,
    decided_at=now() WHERE id=request.id;
  recipient := request.requester_user_id;
  INSERT INTO cms_editorial_notifications
    (user_id,event_key,type,edition_id,revision_id,review_request_id,title,message,link)
  VALUES (recipient,notification_type || ':' || request.id::text,notification_type,
          request.edition_id,NEW.id,request.id,
          CASE WHEN NEW.workflow_state='approved' THEN 'Review approved' ELSE 'Review changes requested' END,
          CASE WHEN NEW.workflow_state='approved' THEN 'The requested revision was approved.' ELSE 'The requested revision was rejected.' END,
          '/documents/' || edition.document_id::text || '?market=' || edition.market || '&locale=' || edition.locale)
  ON CONFLICT (user_id,event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS cms_editorial_review_transition_notification ON cms_revisions;
CREATE TRIGGER cms_editorial_review_transition_notification
  AFTER UPDATE OF workflow_state ON cms_revisions
  FOR EACH ROW EXECUTE FUNCTION cms_editorial_review_transition_notification();

-- A baseline successor does not overwrite a localized edition.  It marks the
-- binding stale; emit an opaque, durable conflict event for exact assignees in
-- that same transaction so no out-of-band worker can observe half a change.
CREATE OR REPLACE FUNCTION cms_editorial_shared_conflict_notification() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  target cms_market_editions%ROWTYPE;
  recipient record;
BEGIN
  IF NEW.translation_state <> 'stale' OR OLD.translation_state='stale' THEN
    RETURN NEW;
  END IF;
  SELECT edition.* INTO target
    FROM market_editions market
    JOIN cms_market_editions edition
      ON edition.document_id=NEW.document_id
     AND edition.market=market.code AND edition.locale=NEW.locale
   WHERE market.id=NEW.market_edition_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  FOR recipient IN
    SELECT DISTINCT user_id FROM (
      SELECT editor_user_id user_id FROM cms_editorial_assignments WHERE edition_id=target.id
      UNION
      SELECT reviewer_user_id user_id FROM cms_editorial_assignments WHERE edition_id=target.id
    ) assigned WHERE user_id IS NOT NULL
  LOOP
    INSERT INTO cms_editorial_notifications
      (user_id,event_key,type,edition_id,document_id,title,message,link)
    VALUES (recipient.user_id,
      'shared-conflict:' || NEW.id::text || ':' || NEW.based_on_baseline_revision_id::text,
      'shared-conflict',target.id,NEW.document_id,
      'Shared baseline needs attention',
      'An updated shared baseline may require an explicit resolution.',
      '/documents/' || NEW.document_id::text || '?market=' || target.market || '&locale=' || target.locale)
    ON CONFLICT (user_id,event_key) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS cms_editorial_shared_conflict_notification ON cms_market_edition_bindings;
CREATE TRIGGER cms_editorial_shared_conflict_notification
  AFTER UPDATE OF translation_state ON cms_market_edition_bindings
  FOR EACH ROW EXECUTE FUNCTION cms_editorial_shared_conflict_notification();