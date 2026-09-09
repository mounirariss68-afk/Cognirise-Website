import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  ArchiveDocumentBody,
  type CmsDocumentKind,
  CreateDocumentBody,
  ListDocumentsQueryParams,
  PublishDocumentBody,
  RollbackDocumentBody,
  SubmitDocumentBody,
  UpdateDocumentBody,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import {
  authenticate,
  requireCsrf,
  requireEditor,
  requireAdministrator,
  requireMfa,
  requirePublisher,
  type AuthContext,
} from "../lib/auth";
import { audit, pageOf } from "../lib/cms";
import { asyncRoute } from "../lib/http";
import { hashToken, randomToken } from "../lib/security";
import { canChangeCanonicalSlug } from "../lib/policy";
import { downloadMediaObject } from "../lib/object-storage";

const router: IRouter = Router();
export const previewMediaDelivery = {
  download: downloadMediaObject,
};
router.use("/documents", authenticate, requireMfa);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function previewMediaIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const snapshot = payload as Record<string, unknown>;
  const content = snapshot.content && typeof snapshot.content === "object" && !Array.isArray(snapshot.content)
    ? snapshot.content as Record<string, unknown>
    : {};
  const social = content.social && typeof content.social === "object" && !Array.isArray(content.social)
    ? content.social as Record<string, unknown>
    : {};
  const candidates = [
    ...(Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : []),
    content.identityMediaId,
    content.logoMediaId,
    content.heroMediaId,
    content.pdfMediaId,
    social.imageMediaId,
  ];
  return [...new Set(candidates.filter((value): value is string => typeof value === "string" && UUID.test(value)))].slice(0, 50);
}

const documentSelect = `
  SELECT d.id,d.kind,d.canonical_slug,d.title,d.owner_id,d.status root_status,
    d.created_at,d.updated_at,
    ARRAY(SELECT DISTINCT market FROM cms_market_editions WHERE document_id=d.id) markets,
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

function mapDocument(row: Record<string, any>) {
  const payload = row.payload ?? {};
  const status =
    row.root_status === "archived"
      ? "archived"
      : ["draft", "in-review"].includes(row.workflow_state)
        ? row.workflow_state
      : row.publication_state === "published"
        ? "published"
        : row.publication_state === "scheduled"
          ? "scheduled"
          : row.workflow_state === "in-review"
            ? "in-review"
            : row.workflow_state === "approved"
              ? "approved"
              : "draft";
  return {
    id: String(row.id),
    kind: row.kind,
    slug: payload.slug ?? row.canonical_slug,
    title: payload.title ?? row.title,
    summary: payload.summary ?? null,
    status,
    content: payload.content ?? {},
    seo: payload.seo,
    mediaIds: payload.mediaIds ?? [],
    markets: row.markets ?? [],
    revisionNumber: row.revision_number ?? 1,
    currentRevisionId: row.revision_id ? String(row.revision_id) : null,
    publishedRevisionId: row.published_revision_id ? String(row.published_revision_id) : null,
    scheduledAt: row.publish_at,
    publishedAt: row.published_at,
    createdBy: row.owner_id ? String(row.owner_id) : undefined,
    updatedBy: row.owner_id ? String(row.owner_id) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function payload(input: Record<string, any>) {
  return {
    slug: input.slug,
    title: input.title,
    summary: input.summary ?? null,
    content: input.content ?? {},
    seo: input.seo,
    mediaIds: input.mediaIds ?? [],
    markets: input.markets ?? [],
  };
}

async function syncMediaReferences(
  client: { query: (sql: string, values?: unknown[]) => Promise<any> },
  documentId: string,
  revisionId: string,
  snapshot: Record<string, any>,
) {
  const exactVersions = new Map<string, string>();
  const hero = snapshot.content?.hero;
  if (hero && typeof hero === "object") {
    exactVersions.set(String(hero.posterMediaId), String(hero.posterMediaVersionId));
    for (const source of Array.isArray(hero.sources) ? hero.sources : []) {
      exactVersions.set(String(source.mediaId), String(source.mediaVersionId));
    }
  }
  for (const assetId of Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : []) {
    const exactVersionId = exactVersions.get(String(assetId)) ?? null;
    await client.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       SELECT asset.id,version.id,$3,$4
         FROM cms_media_assets asset
          JOIN LATERAL (SELECT id FROM cms_media_versions
             WHERE asset_id=asset.id AND ($2::uuid IS NULL OR id=$2)
             ORDER BY version_number DESC LIMIT 1) version ON true
         WHERE asset.id=$1 AND asset.status IN ('active','ready')
       ON CONFLICT DO NOTHING`,
      [assetId, exactVersionId, documentId, `revision:${revisionId}`],
    );
  }
}

function validateSnapshot(kind: string, snapshot: unknown, mode: "draft" | "publish") {
  return validateCmsSnapshot(kind as CmsDocumentKind, snapshot, mode);
}

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("base64url");

async function getDocument(id: string) {
  const result = await pool.query(`${documentSelect} WHERE d.id=$1`, [id]);
  return result.rows[0] ? mapDocument(result.rows[0]) : null;
}

router.get(
  "/documents",
  asyncRoute(async (req, res) => {
    const parsed = ListDocumentsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document filters." });
      return;
    }
    const q = parsed.data;
    const result = await pool.query(
      `${documentSelect}
       WHERE ($1::text IS NULL OR d.title ILIKE '%'||$1||'%' OR d.canonical_slug ILIKE '%'||$1||'%')
         AND ($2::text IS NULL OR d.kind=$2)
         AND ($3::text IS NULL OR EXISTS(SELECT 1 FROM cms_market_editions me
              WHERE me.document_id=d.id AND me.market=$3))
       ORDER BY d.updated_at DESC`,
      [q.search ?? null, q.kind ?? null, q.market ?? null],
    );
    let items = result.rows.map(mapDocument);
    if (q.status) items = items.filter((item) => item.status === q.status);
    const total = items.length;
    items = items.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    res.json(pageOf(items, total, q.page, q.pageSize));
  }),
);

router.post(
  "/documents",
  requireCsrf,
  requireEditor,
  asyncRoute(async (req, res) => {
    const parsed = CreateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document.", details: parsed.error.issues });
      return;
    }
    const validated = validateSnapshot(parsed.data.kind, payload(parsed.data), "draft");
    if (!validated.success) {
      res.status(422).json({ error: "Content contract validation failed.", details: validated.errors });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const root = await client.query(
        `INSERT INTO cms_documents(kind,canonical_slug,title,owner_id,status)
         VALUES ($1,$2,$3,$4,'active') RETURNING id`,
        [parsed.data.kind, parsed.data.slug, parsed.data.title, auth.user.id],
      );
       const snapshot = validated.data;
      for (const market of parsed.data.markets) {
        const edition = await client.query(
          `INSERT INTO cms_market_editions
           (document_id,market,locale,localized_slug,publication_state)
           VALUES ($1,$2,'en',$3,'draft') RETURNING id`,
          [root.rows[0].id, market, parsed.data.slug],
        );
        const revision = await client.query(
          `INSERT INTO cms_revisions
           (edition_id,revision_number,payload,content_digest,workflow_state,
            created_by_user_id,reason)
            VALUES ($1,1,$2,$3,'draft',$4,'Initial draft') RETURNING id`,
          [edition.rows[0].id, snapshot, digest(snapshot), auth.user.id],
        );
        await syncMediaReferences(
          client,
          String(root.rows[0].id),
          String(revision.rows[0].id),
          snapshot,
        );
      }
      await client.query("COMMIT");
      const document = await getDocument(String(root.rows[0].id));
      await audit(auth, "document.created", "document", String(root.rows[0].id));
      res.status(201).json(document);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.get(
  "/documents/:documentId",
  asyncRoute(async (req, res) => {
    const document = await getDocument(String(req.params.documentId));
    if (!document) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    res.json(document);
  }),
);

router.get(
  "/documents/:documentId/market-availability",
  asyncRoute(async (req, res) => {
    const id = String(req.params.documentId);
    const document = await pool.query(
      "SELECT kind FROM cms_documents WHERE id=$1",
      [id],
    );
    if (!document.rowCount) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    if (document.rows[0].kind !== "person") {
      res.status(409).json({ error: "Market availability is only supported for people." });
      return;
    }
    const result = await pool.query(
      `SELECT m.id market_edition_id,m.code market,m.display_name,m.enabled,
              COALESCE(a.published_decision,'inherit') published_decision,
              a.draft_decision,
              EXISTS(SELECT 1 FROM cms_market_editions e
                WHERE e.document_id=$1 AND e.market=m.code) has_edition,
              COALESCE(a.published_decision,'inherit')<>'off' published_effective_available,
              COALESCE(a.draft_decision,a.published_decision,'inherit')<>'off' preview_effective_available,
              a.updated_at,a.published_at
         FROM market_editions m
         LEFT JOIN cms_person_market_availability a
           ON a.document_id=$1 AND a.market_edition_id=m.id
        ORDER BY m.is_canonical DESC,m.display_name,m.code`,
      [id],
    );
    res.json({
      documentId: id,
      items: result.rows.map((row) => ({
        marketEditionId: String(row.market_edition_id),
        market: row.market,
        displayName: row.display_name,
        enabled: row.enabled,
        publishedDecision: row.published_decision,
        publishedEffectiveAvailable: row.published_effective_available,
        pendingDecision: row.draft_decision ?? null,
        previewEffectiveAvailable: row.preview_effective_available,
        hasEdition: row.has_edition,
        updatedAt: row.updated_at ?? null,
        publishedAt: row.published_at ?? null,
      })),
    });
  }),
);

router.put(
  "/documents/:documentId/market-availability/:marketEditionId",
  requireCsrf,
  requireEditor,
  asyncRoute(async (req, res) => {
    const decision = req.body?.decision;
    if (!["inherit", "show", "off"].includes(decision)) {
      res.status(400).json({ error: "Invalid market availability decision." });
      return;
    }
    const documentId = String(req.params.documentId);
    const marketEditionId = String(req.params.marketEditionId);
    const auth = res.locals.auth as AuthContext;
    const target = await pool.query(
      `SELECT d.kind,m.code market
         FROM cms_documents d CROSS JOIN market_editions m
        WHERE d.id=$1 AND m.id=$2`,
      [documentId, marketEditionId],
    );
    if (!target.rowCount) {
      res.status(404).json({ error: "Person or market edition not found." });
      return;
    }
    if (target.rows[0].kind !== "person") {
      res.status(409).json({ error: "Market availability is only supported for people." });
      return;
    }
    await pool.query(
      `INSERT INTO cms_person_market_availability
         (document_id,market_edition_id,draft_decision,updated_by_user_id)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (document_id,market_edition_id) DO UPDATE
         SET draft_decision=EXCLUDED.draft_decision,updated_by_user_id=EXCLUDED.updated_by_user_id,
             updated_at=now()`,
      [documentId, marketEditionId, decision, auth.user.id],
    );
    await audit(auth, "person.market_availability.staged", "document", documentId, {
      marketEditionId,
      market: target.rows[0].market,
      decision,
    });
    const updated = await pool.query(
      `SELECT m.id market_edition_id,m.code market,m.display_name,m.enabled,
              a.published_decision,a.draft_decision,
              a.published_decision<>'off' published_effective_available,
              COALESCE(a.draft_decision,a.published_decision)<>'off' preview_effective_available,
              EXISTS(SELECT 1 FROM cms_market_editions e
                WHERE e.document_id=$1 AND e.market=m.code) has_edition,
              a.updated_at,a.published_at
         FROM market_editions m JOIN cms_person_market_availability a
           ON a.market_edition_id=m.id AND a.document_id=$1
        WHERE m.id=$2`,
      [documentId, marketEditionId],
    );
    const row = updated.rows[0];
    res.json({
      marketEditionId: String(row.market_edition_id),
      market: row.market,
      displayName: row.display_name,
      enabled: row.enabled,
      publishedDecision: row.published_decision,
      publishedEffectiveAvailable: row.published_effective_available,
      pendingDecision: row.draft_decision ?? null,
      previewEffectiveAvailable: row.preview_effective_available,
      hasEdition: row.has_edition,
      updatedAt: row.updated_at,
      publishedAt: row.published_at ?? null,
    });
  }),
);

router.post(
  "/documents/:documentId/market-availability/:marketEditionId/publish",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const documentId = String(req.params.documentId);
    const marketEditionId = String(req.params.marketEditionId);
    const auth = res.locals.auth as AuthContext;
    const published = await pool.query(
      `UPDATE cms_person_market_availability a
          SET published_decision=a.draft_decision,draft_decision=NULL,
              published_by_user_id=$3,published_at=now(),updated_at=now()
         FROM cms_documents d,market_editions m
        WHERE a.document_id=$1 AND a.market_edition_id=$2
          AND d.id=a.document_id AND d.kind='person' AND m.id=a.market_edition_id
          AND a.draft_decision IS NOT NULL
      RETURNING m.code market,a.published_decision,a.published_at`,
      [documentId, marketEditionId, auth.user.id],
    );
    if (!published.rowCount) {
      res.status(409).json({ error: "No pending person market availability decision exists." });
      return;
    }
    const row = published.rows[0];
    await audit(auth, "person.market_availability.published", "document", documentId, {
      marketEditionId,
      market: row.market,
      decision: row.published_decision,
    });
    res.status(204).end();
  }),
);

router.patch(
  "/documents/:documentId",
  requireCsrf,
  requireEditor,
  asyncRoute(async (req, res) => {
    const parsed = UpdateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document update.", details: parsed.error.issues });
      return;
    }
    const id = String(req.params.documentId);
    const current = await getDocument(id);
    if (!current || !["draft", "in-review", "approved", "published"].includes(current.status)) {
      res.status(409).json({ error: "Only an editable document can be updated." });
      return;
    }
    if (current.revisionNumber !== parsed.data.revisionNumber) {
      res.status(409).json({ error: "The document has been changed by another user." });
      return;
    }
    if (!canChangeCanonicalSlug(current.slug, parsed.data.slug, current.publishedRevisionId)) {
      res.status(409).json({
        error: "Published document slugs are immutable without an explicit redirect.",
      });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const next = { ...current, ...parsed.data };
    const validated = validateSnapshot(current.kind, payload(next), "draft");
    if (!validated.success) {
      res.status(422).json({ error: "Content contract validation failed.", details: validated.errors });
      return;
    }
    const snapshot = validated.data;
    const requestedMarket = parsed.data.markets?.[0] ?? "uae";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const edition = await client.query(
        `SELECT id FROM cms_market_editions WHERE document_id=$1 AND market=$2
         ORDER BY created_at,id LIMIT 1`,
        [id, requestedMarket],
      );
      if (!edition.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: `The ${requestedMarket} edition does not exist.` });
        return;
      }
      const revision = await client.query(
        `INSERT INTO cms_revisions
         (edition_id,revision_number,payload,content_digest,workflow_state,
          created_by_user_id,reason)
          SELECT $1,COALESCE(max(revision_number),0)+1,$2,$3,'draft',$4,'Edited'
          FROM cms_revisions WHERE edition_id=$1 RETURNING id`,
        [edition.rows[0].id, snapshot, digest(snapshot), auth.user.id],
      );
       await syncMediaReferences(client, id, String(revision.rows[0].id), snapshot);
      await client.query(
        `UPDATE cms_documents SET canonical_slug=$2,title=$3,updated_at=now() WHERE id=$1`,
        [id, next.slug, next.title],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await audit(auth, "document.updated", "document", id);
    res.json(await getDocument(id));
  }),
);

router.delete(
  "/documents/:documentId",
  requireCsrf,
  requirePublisher,
  asyncRoute(async (req, res) => {
    const id = String(req.params.documentId);
    const result = await pool.query(
      `DELETE FROM cms_documents d WHERE d.id=$1 AND NOT EXISTS(
       SELECT 1 FROM cms_market_editions e WHERE e.document_id=d.id
       AND e.publication_state IN ('published','scheduled')) RETURNING id`,
      [id],
    );
    if (!result.rowCount) {
      res.status(409).json({ error: "This document cannot be deleted." });
      return;
    }
    await audit(res.locals.auth as AuthContext, "document.deleted", "document", id);
    res.status(204).end();
  }),
);

router.get(
  "/documents/:documentId/revisions",
  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT r.*,e.document_id,e.market,e.locale FROM cms_revisions r JOIN cms_market_editions e
       ON e.id=r.edition_id WHERE e.document_id=$1
       ORDER BY CASE WHEN e.market='uae' THEN 0 ELSE 1 END,
         r.revision_number DESC,r.created_at DESC,r.id DESC`,
      [req.params.documentId],
    );
    const items = result.rows.map((row) => ({
      id: String(row.id),
      documentId: String(row.document_id),
      number: row.revision_number,
      market: row.market,
      locale: row.locale,
      snapshot: row.payload,
      note: row.reason,
      createdBy: String(row.created_by_user_id),
      createdAt: row.created_at,
    }));
    res.json(pageOf(items, items.length, 1, Math.max(items.length, 1)));
  }),
);

router.get(
  "/documents/:documentId/revisions/:revisionId",
  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT r.*,e.document_id,e.market,e.locale FROM cms_revisions r JOIN cms_market_editions e
       ON e.id=r.edition_id WHERE r.id=$1 AND e.document_id=$2`,
      [req.params.revisionId, req.params.documentId],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Revision not found." });
      return;
    }
    const row = result.rows[0];
    res.json({
      id: String(row.id),
      documentId: String(row.document_id),
      number: row.revision_number,
      market: row.market,
      locale: row.locale,
      snapshot: row.payload,
      note: row.reason,
      createdBy: String(row.created_by_user_id),
      createdAt: row.created_at,
    });
  }),
);

router.post(
  "/documents/:documentId/submit",
  requireCsrf,
  requireEditor,
  asyncRoute(async (req, res) => {
    const parsed = SubmitDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review submission." });
      return;
    }
    const id = String(req.params.documentId);
    const candidate = await pool.query(
      `SELECT r.id,r.payload,d.kind FROM cms_revisions r
       JOIN cms_market_editions e ON e.id=r.edition_id
       JOIN cms_documents d ON d.id=e.document_id
       WHERE e.document_id=$1
       AND r.revision_number=(SELECT max(x.revision_number) FROM cms_revisions x
                              WHERE x.edition_id=r.edition_id)`,
      [id],
    );
    if (!candidate.rowCount) {
      res.status(409).json({ error: "Document has no draft revision." });
      return;
    }
    for (const row of candidate.rows) {
      const validation = validateSnapshot(row.kind, row.payload, "draft");
      if (!validation.success) {
        res.status(422).json({ error: "Review governance validation failed.", details: validation.errors });
        return;
      }
    }
    await pool.query(
      `UPDATE cms_revisions SET workflow_state='in-review'
       WHERE id::text=ANY($1::text[])`,
      [candidate.rows.map((row) => String(row.id))],
    );
    await audit(res.locals.auth as AuthContext, "document.submitted", "document", id, parsed.data);
    res.json(await getDocument(id));
  }),
);

router.post(
  "/documents/:documentId/publish",
  requireCsrf,
  requirePublisher,
  asyncRoute(async (req, res) => {
    const parsed = PublishDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid publication request.", details: parsed.error.issues });
      return;
    }
    const id = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
    await client.query("BEGIN");
    const revision = await client.query(
      `SELECT r.id,r.edition_id,r.payload,d.kind FROM cms_revisions r JOIN cms_market_editions e
        ON e.id=r.edition_id JOIN cms_documents d ON d.id=e.document_id WHERE r.id=$1 AND e.document_id=$2`,
      [parsed.data.revisionId, id],
    );
    if (!revision.rowCount) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "The selected revision does not exist." });
      return;
    }
    const validation = validateSnapshot(revision.rows[0].kind, revision.rows[0].payload, "publish");
    if (!validation.success) {
      await client.query("ROLLBACK");
      res.status(422).json({ error: "Publication governance validation failed.", details: validation.errors });
      return;
    }
    const mediaIds = validation.data.mediaIds;
    const hero = revision.rows[0].kind === "site-configuration"
      ? (validation.data.content as Record<string, any>).hero as Record<string, any>
      : null;
    const expectedVersions = new Map<string, string>(hero ? [
      [hero.posterMediaId, hero.posterMediaVersionId] as [string, string],
      ...hero.sources.map((source: { mediaId: string; mediaVersionId: string }) =>
        [source.mediaId, source.mediaVersionId] as [string, string]),
    ] : []);
    const expectedMediaTypes = new Map<string, readonly string[]>(hero ? [
      [hero.posterMediaId, ["image/jpeg", "image/png", "image/webp", "image/avif"]],
      ...hero.sources.map((source: { mediaId: string; mimeType: string }) =>
        [source.mediaId, [source.mimeType]] as [string, string[]]),
    ] : []);
    if (mediaIds.length) {
      await client.query(
        `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
          SELECT asset.id,version.id,$2,$3
           FROM cms_media_assets asset
           JOIN LATERAL (
             SELECT id FROM cms_media_versions
               WHERE asset_id=asset.id
                 AND ($4::jsonb->>asset.id::text IS NULL OR id::text=$4::jsonb->>asset.id::text)
               ORDER BY version_number DESC LIMIT 1
           ) version ON true
          WHERE asset.id::text=ANY($1::text[])
            AND asset.status IN ('active','ready')
         ON CONFLICT DO NOTHING`,
         [mediaIds, id, `revision:${parsed.data.revisionId}`, Object.fromEntries(expectedVersions)],
      );
    }
    const readyMedia = mediaIds.length
      ? await client.query(
           `SELECT a.id::text id,COALESCE(pinned.id,latest.id)::text version_id,
                   a.media_type
             FROM cms_media_assets a
             JOIN cms_media_references ref ON ref.asset_id=a.id
               AND ref.document_id=$2 AND ref.field_path=$3
             LEFT JOIN cms_media_versions pinned
               ON pinned.id=ref.media_version_id AND pinned.asset_id=a.id
             LEFT JOIN LATERAL (
               SELECT id FROM cms_media_versions
                WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
             ) latest ON ref.media_version_id IS NULL
            WHERE a.id::text=ANY($1::text[]) AND a.status IN ('active','ready')
              AND COALESCE(pinned.id,latest.id) IS NOT NULL`,
          [mediaIds, id, `revision:${parsed.data.revisionId}`],
        )
      : { rows: [] };
    const readyIds = new Set(readyMedia.rows.map((row: { id: string }) => row.id));
    const unavailable = mediaIds.filter((mediaId) => !readyIds.has(mediaId));
    for (const row of readyMedia.rows) {
      const expected = expectedVersions.get(String(row.id));
      if (expected && expected !== String(row.version_id)) unavailable.push(String(row.id));
      const expectedTypes = expectedMediaTypes.get(String(row.id));
      if (expectedTypes && !expectedTypes.includes(String(row.media_type))) {
        unavailable.push(String(row.id));
      }
    }
    if (unavailable.length) {
      await client.query("ROLLBACK");
      res.status(422).json({ error: "Publication references unavailable media.", details: unavailable });
      return;
    }
    if (mediaIds.length) {
      const selectedVersionIds = readyMedia.rows.map(
        (row: { version_id: string }) => row.version_id,
      );
      await client.query(
        `UPDATE cms_media_references ref
            SET media_version_id=selected.id
           FROM cms_media_versions selected
          WHERE selected.id::text=ANY($1::text[])
            AND ref.asset_id=selected.asset_id
            AND ref.document_id=$2
            AND ref.field_path=$3
            AND ref.media_version_id IS NULL`,
        [selectedVersionIds, id, `revision:${parsed.data.revisionId}`],
      );
    }
    await client.query(
      `UPDATE cms_revisions SET workflow_state='approved',approved_by_user_id=$2,
       approved_at=now() WHERE id=$1`,
      [parsed.data.revisionId, auth.user.id],
    );
    await client.query(
      `UPDATE cms_market_editions SET publication_state=$2,publish_at=$3,
        published_revision_id=$4,published_at=CASE WHEN $2='published' THEN now() ELSE published_at END,
       updated_at=now() WHERE id=$1`,
       [revision.rows[0].edition_id, "published", null, parsed.data.revisionId],
    );
    await client.query(
      `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,metadata)
       VALUES ($1,$2,'document.published','document',$3,$4)`,
       [auth.user.id, auth.user.email, id, {
         scheduled: false,
         editionId: String(revision.rows[0].edition_id),
         revisionId: parsed.data.revisionId,
       }],
    );
    await client.query("COMMIT");
    res.json(await getDocument(id));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/documents/:documentId/rollback",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = RollbackDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid rollback request." });
      return;
    }
    const id = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const old = await pool.query(
      `SELECT r.payload,r.edition_id FROM cms_revisions r JOIN cms_market_editions e
       ON e.id=r.edition_id WHERE r.id=$1 AND e.document_id=$2`,
      [parsed.data.revisionId, id],
    );
    if (!old.rowCount) {
      res.status(409).json({ error: "The selected revision does not exist." });
      return;
    }
    const revision = await pool.query(
      `INSERT INTO cms_revisions
       (edition_id,revision_number,payload,content_digest,workflow_state,
        created_by_user_id,reason)
       SELECT $1,max(revision_number)+1,$2,$3,'draft',$4,$5
        FROM cms_revisions WHERE edition_id=$1 RETURNING id`,
      [old.rows[0].edition_id, old.rows[0].payload, digest(old.rows[0].payload), auth.user.id, parsed.data.note],
    );
    await pool.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       SELECT ref.asset_id,COALESCE(ref.media_version_id,latest.id),ref.document_id,$3
         FROM cms_media_references ref
         LEFT JOIN LATERAL (
           SELECT id FROM cms_media_versions
            WHERE asset_id=ref.asset_id ORDER BY version_number DESC LIMIT 1
         ) latest ON ref.media_version_id IS NULL
        WHERE ref.document_id=$1 AND ref.field_path=$2
       ON CONFLICT DO NOTHING`,
      [
        id,
        `revision:${parsed.data.revisionId}`,
        `revision:${String(revision.rows[0].id)}`,
      ],
    );
    await syncMediaReferences(
      pool,
      id,
      String(revision.rows[0].id),
      old.rows[0].payload,
    );
    await audit(auth, "document.rolled_back", "document", id);
    res.json(await getDocument(id));
  }),
);

router.post(
  "/documents/:documentId/archive",
  requireCsrf,
  requirePublisher,
  asyncRoute(async (req, res) => {
    const parsed = ArchiveDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid archive request." });
      return;
    }
    const id = String(req.params.documentId);
    const result = await pool.query(
      "UPDATE cms_documents SET status='archived',archived_at=now(),updated_at=now() WHERE id=$1 RETURNING id",
      [id],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    await pool.query(
      "UPDATE cms_market_editions SET publication_state='archived',updated_at=now() WHERE document_id=$1",
      [id],
    );
    await audit(res.locals.auth as AuthContext, "document.archived", "document", id, parsed.data);
    res.json(await getDocument(id));
  }),
);

router.post(
  "/documents/:documentId/restore",
  requireCsrf,
  requirePublisher,
  asyncRoute(async (req, res) => {
    const parsed = ArchiveDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid restore request." });
      return;
    }
    const id = String(req.params.documentId);
    const restored = await pool.query(
      `UPDATE cms_documents SET status='active',archived_at=NULL,updated_at=now()
       WHERE id=$1 AND status='archived' RETURNING id`,
      [id],
    );
    if (!restored.rowCount) {
      res.status(409).json({ error: "Only archived documents can be restored." });
      return;
    }
    await pool.query(
      `UPDATE cms_market_editions
       SET publication_state='draft',publish_at=NULL,published_at=NULL,published_revision_id=NULL,updated_at=now()
       WHERE document_id=$1 AND publication_state='archived'`,
      [id],
    );
    await audit(res.locals.auth as AuthContext, "document.restored", "document", id, parsed.data);
    res.json(await getDocument(id));
  }),
);

router.get(
  "/documents/:documentId/preview",
  requireEditor,
  asyncRoute(async (req, res) => {
    const id = String(req.params.documentId);
    const document = await getDocument(id);
    if (!document) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    const market = typeof req.query.market === "string" ? req.query.market : "uae";
    const edition = await pool.query(
      `SELECT e.id,e.market,e.locale,
         CASE WHEN e.market=$2 THEN false ELSE true END used_fallback
       FROM cms_market_editions e
       WHERE e.document_id=$1 AND e.market IN ($2,'uae')
       ORDER BY CASE WHEN e.market=$2 THEN 0 WHEN e.market='uae' THEN 1 ELSE 2 END,
         e.created_at,e.id LIMIT 1`,
      [id, market],
    );
    if (!edition.rowCount) {
      res.status(404).json({ error: "Document has no market edition." });
      return;
    }
    const revision = await pool.query(
      `SELECT id,payload,revision_number FROM cms_revisions
        WHERE edition_id=$1
        ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1`,
      [edition.rows[0].id],
    );
    if (!revision.rowCount) {
      res.status(404).json({ error: "Document has no revision." });
      return;
    }
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await pool.query(
      `INSERT INTO cms_preview_sessions(token_digest,edition_id,revision_id,created_by_user_id,expires_at)
        VALUES ($1,$2,$3,$4,$5)`,
      [
        hashToken(token),
        edition.rows[0].id,
        revision.rows[0].id,
        (res.locals.auth as AuthContext).user.id,
        expiresAt,
      ],
    );
    const validation = validateSnapshot(document.kind, revision.rows[0].payload, "draft");
    res.set({
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    res.json({
      document: revision.rows[0].payload,
      previewUrl: `/preview/${token}`,
      expiresAt,
      market: edition.rows[0].market,
      locale: edition.rows[0].locale,
      revisionNumber: revision.rows[0].revision_number,
      usedFallback: edition.rows[0].used_fallback,
      warnings: validation.success ? [] : validation.errors,
    });
  }),
);

router.get(
  "/preview/:token",
  authenticate,
  requireMfa,
  asyncRoute(async (req, res) => {
    const preview = await pool.query(
      `SELECT d.id document_id,d.kind,e.market,e.locale,r.id revision_id,r.payload,r.revision_number
         FROM cms_preview_sessions p
         JOIN cms_market_editions e ON e.id=p.edition_id
         JOIN cms_documents d ON d.id=e.document_id
         JOIN cms_revisions r ON r.id=p.revision_id AND r.edition_id=e.id
        WHERE p.token_digest=$1 AND p.expires_at>now() AND p.revoked_at IS NULL`,
      [hashToken(String(req.params.token))],
    );
    if (!preview.rowCount) {
      res.status(404).json({ error: "Preview not found or expired." });
      return;
    }
    res.set({
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    const row = preview.rows[0];
    const validation = validateSnapshot(row.kind, row.payload, "draft");
    const mediaIds = validation.success ? validation.data.mediaIds : previewMediaIds(row.payload);
    const availableMedia = mediaIds.length ? await pool.query(
      `SELECT a.id,v.id version_id,v.width,v.height,v.metadata,
          a.media_type,a.alt_text,a.credit
         FROM cms_media_references ref
         JOIN cms_media_assets a ON a.id=ref.asset_id
         JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
        WHERE ref.document_id=$1
          AND ref.field_path=$2
          AND a.id::text=ANY($3::text[])
          AND a.status IN ('active','ready')`,
      [
        String(row.document_id),
        `revision:${String(row.revision_id)}`,
        mediaIds,
      ],
    ) : { rows: [] };
    const availableIds = new Set(availableMedia.rows.map((asset) => String(asset.id)));
    res.json({
      kind: row.kind,
      document: row.payload,
      market: row.market,
      locale: row.locale,
      revisionId: String(row.revision_id),
      revisionNumber: row.revision_number,
      usedFallback: false,
      media: availableMedia.rows.map((asset) => ({
        id: String(asset.id),
        versionId: String(asset.version_id),
        url: `/api/preview/${encodeURIComponent(String(req.params.token))}/media/${String(asset.id)}/${String(asset.version_id)}`,
        mimeType: asset.media_type,
        width: asset.width ?? null,
        height: asset.height ?? null,
        altText: asset.alt_text ?? null,
        caption: asset.metadata?.caption ?? null,
        credit: asset.credit ?? null,
      })),
      missingMediaIds: mediaIds.filter((id) => !availableIds.has(id)),
      validationWarnings: validation.success ? [] : validation.errors,
    });
  }),
);

router.get(
  "/preview/:token/media/:mediaId/:versionId",
  authenticate,
  requireMfa,
  asyncRoute(async (req, res) => {
    const asset = await pool.query(
      `SELECT v.storage_key,r.payload,
          CASE WHEN v.metadata->>'rendition'='webp-1600' THEN 'image/webp' ELSE a.media_type END media_type
         FROM cms_preview_sessions p
         JOIN cms_market_editions e ON e.id=p.edition_id
         JOIN cms_documents d ON d.id=e.document_id
         JOIN cms_revisions r ON r.id=p.revision_id AND r.edition_id=e.id
         JOIN cms_media_references ref ON ref.document_id=d.id
           AND ref.field_path='revision:'||r.id::text
         JOIN cms_media_assets a ON a.id=ref.asset_id
         JOIN cms_media_versions v ON v.asset_id=a.id AND v.id=ref.media_version_id
        WHERE p.token_digest=$1 AND p.expires_at>now()
          AND p.revoked_at IS NULL
          AND a.id=$2 AND v.id=$3 AND a.status IN ('active','ready')
        LIMIT 1`,
      [
        hashToken(String(req.params.token)),
        req.params.mediaId,
        req.params.versionId,
      ],
    );
    if (!asset.rowCount || !previewMediaIds(asset.rows[0].payload).includes(String(req.params.mediaId))) {
      res.status(404).json({ error: "Preview media not found or expired." });
      return;
    }
    res.set({
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    res.type(asset.rows[0].media_type);
    const stream = await previewMediaDelivery.download(asset.rows[0].storage_key);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  }),
);

export default router;