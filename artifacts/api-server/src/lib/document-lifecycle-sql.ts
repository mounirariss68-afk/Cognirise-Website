export const DOCUMENT_SELECT_SQL = `
  SELECT d.id,d.kind,d.canonical_slug,d.title,d.owner_id,d.status root_status,
    d.created_at,d.updated_at,
    ARRAY(SELECT DISTINCT market FROM cms_market_editions WHERE document_id=d.id) markets,
    (
      NOT EXISTS (
        SELECT 1 FROM cms_market_editions deletion_edition
         WHERE deletion_edition.document_id=d.id
           AND deletion_edition.publication_state IN ('published','scheduled')
      )
      AND (
        d.kind<>'office'
        OR NOT EXISTS (
          SELECT 1 FROM cms_audit_events publication_event
           WHERE publication_event.target_type='document'
             AND publication_event.target_id=d.id::text
             AND publication_event.action='document.published'
        )
      )
    ) can_permanently_delete,
    x.edition_id,x.revision_id,x.revision_number,x.payload,x.workflow_state,
    x.publication_state,x.publish_at,x.published_at,x.published_revision_id
  FROM cms_documents d
  LEFT JOIN LATERAL (
    SELECT e.id edition_id,e.publication_state,e.publish_at,e.published_at,
      r.id revision_id,r.revision_number,r.payload,r.workflow_state,
      e.published_revision_id
    FROM cms_market_editions e
    LEFT JOIN cms_revisions r ON r.edition_id=e.id
    WHERE e.document_id=d.id
     ORDER BY CASE WHEN e.market='uae' THEN 0 ELSE 1 END,
       r.revision_number DESC NULLS LAST,e.created_at,e.id LIMIT 1
  ) x ON true`;

export const DELETE_DOCUMENT_SQL = `
  DELETE FROM cms_documents d
   WHERE d.id=$1
     AND NOT EXISTS(
       SELECT 1 FROM cms_market_editions e
        WHERE e.document_id=d.id
          AND e.publication_state IN ('published','scheduled')
     )
     AND (
       d.kind<>'office'
       OR NOT EXISTS(
         SELECT 1 FROM cms_audit_events publication_event
          WHERE publication_event.target_type='document'
            AND publication_event.target_id=d.id::text
            AND publication_event.action='document.published'
       )
     )
  RETURNING id`;

export const PUBLIC_KIND_CONFIGURATION_SQL = `
  SELECT EXISTS (
    SELECT 1
      FROM cms_audit_events publication_event
      JOIN cms_documents d
        ON d.id::text=publication_event.target_id
     WHERE d.kind=$1
       AND publication_event.target_type='document'
       AND publication_event.action='document.published'
       AND COALESCE(publication_event.metadata->>'scheduled','false')='false'
  ) AS is_configured`;