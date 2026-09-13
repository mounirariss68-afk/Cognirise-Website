import assert from "node:assert/strict";
import test from "node:test";

type Revision = {
  id: string;
  number: number;
  workflow: "draft" | "in-review" | "approved" | "rejected";
  payload: Record<string, unknown>;
};

type Edition = {
  id: string;
  market: "ksa" | "europe" | "uae";
  locale: string;
  publicationState: "draft" | "in-review" | "published";
  publishedRevisionId: string | null;
  revisions: Revision[];
};

test("authenticated exact-edition lifecycle remains market isolated", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "edition-lifecycle-session-secret-long-enough";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);

  const now = new Date("2026-10-01T12:00:00Z");
  let role: "editor" | "publisher" | "administrator" = "editor";
  const draftDocumentId = "00000000-0000-4000-8000-000000000101";
  const approvedDocumentId = "00000000-0000-4000-8000-000000000102";
  const inheritedDocumentId = "00000000-0000-4000-8000-000000000103";
  const contactDocumentId = "00000000-0000-4000-8000-000000000104";
  const mediaAssetId = "00000000-0000-4000-8000-000000000501";
  const mediaVersionA = "00000000-0000-4000-8000-000000000502";
  const mediaVersionB = "00000000-0000-4000-8000-000000000503";
  const content = {
    schemaVersion: 1,
    variant: "article",
    teaser: "A governed edition lifecycle fixture.",
    body: [{ type: "paragraph", text: "Complete publication copy." }],
    author: "Editorial practice",
    publicationDate: "2026-10-01",
    readingTimeMinutes: 1,
    topics: ["governance"],
    sectors: [],
    platformIds: [],
    visibility: "public",
    order: 0,
    sources: [{ label: "Editorial source", url: "https://example.com/source", accessedAt: "2026-10-01" }],
    verificationDate: "2026-10-01",
    reviewDate: "2026-10-01",
    relatedIds: [],
  };
  const snapshot = (slug: string, title: string) => ({
    slug,
    title,
    summary: null,
    content,
    mediaIds: [],
    markets: ["ksa"],
  });
  const documents = new Map([
    [draftDocumentId, {
      kind: "publication",
      slug: "ksa-first-publication",
      title: "KSA first publication",
      editions: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          market: "ksa",
          locale: "en",
          publicationState: "draft",
          publishedRevisionId: null,
          revisions: [{
            id: "00000000-0000-4000-8000-000000000301",
            number: 1,
            workflow: "draft",
            payload: snapshot("ksa-first-publication", "KSA first publication"),
          }],
        },
        {
          id: "00000000-0000-4000-8000-000000000207",
          market: "ksa",
          locale: "ar",
          publicationState: "published",
          publishedRevisionId: "00000000-0000-4000-8000-000000000307",
          revisions: [{
            id: "00000000-0000-4000-8000-000000000307",
            number: 1,
            workflow: "approved",
            payload: snapshot("ksa-first-publication-ar", "KSA Arabic published"),
          }],
        },
        {
          id: "00000000-0000-4000-8000-000000000202",
          market: "uae",
          locale: "en",
          publicationState: "draft",
          publishedRevisionId: null,
          revisions: [{
            id: "00000000-0000-4000-8000-000000000302",
            number: 1,
            workflow: "draft",
            payload: snapshot("uae-secret", "UAE UNPUBLISHED SECRET"),
          }],
        },
      ] satisfies Edition[],
    }],
    [approvedDocumentId, {
      kind: "publication",
      slug: "ksa-approved",
      title: "KSA approved",
      editions: [
        {
          id: "00000000-0000-4000-8000-000000000203",
          market: "ksa",
          locale: "en",
          publicationState: "published",
          publishedRevisionId: "00000000-0000-4000-8000-000000000303",
          revisions: [{
            id: "00000000-0000-4000-8000-000000000303",
            number: 1,
            workflow: "approved",
            payload: snapshot("ksa-approved", "KSA approved"),
          }],
        },
        {
          id: "00000000-0000-4000-8000-000000000204",
          market: "uae",
          locale: "en",
          publicationState: "draft",
          publishedRevisionId: null,
          revisions: [{
            id: "00000000-0000-4000-8000-000000000304",
            number: 1,
            workflow: "draft",
            payload: snapshot("uae-secret-approved-root", "UAE SECOND SECRET"),
          }],
        },
      ] satisfies Edition[],
    }],
    [inheritedDocumentId, {
      kind: "publication",
      slug: "uae-published-fallback",
      title: "UAE root title must not select drafts",
      editions: [{
        id: "00000000-0000-4000-8000-000000000205",
        market: "uae",
        locale: "en",
        publicationState: "published",
        publishedRevisionId: "00000000-0000-4000-8000-000000000305",
        revisions: [
          {
            id: "00000000-0000-4000-8000-000000000305",
            number: 1,
            workflow: "approved",
            payload: {
              ...snapshot("uae-published-fallback", "Approved UAE fallback"),
              mediaIds: [mediaAssetId],
            },
          },
          {
            id: "00000000-0000-4000-8000-000000000306",
            number: 2,
            workflow: "draft",
            payload: snapshot("uae-unpublished-newer", "UAE FALLBACK DRAFT SECRET"),
          },
        ],
      }] satisfies Edition[],
    }],
    [contactDocumentId, {
      kind: "site-configuration",
      slug: "site-contact-email",
      title: "Public contact email",
      editions: [{
        id: "00000000-0000-4000-8000-000000000208",
        market: "ksa",
        locale: "en",
        publicationState: "published",
        publishedRevisionId: "00000000-0000-4000-8000-000000000308",
        revisions: [{
          id: "00000000-0000-4000-8000-000000000308",
          number: 1,
          workflow: "approved",
          payload: {
            slug: "site-contact-email",
            title: "Public contact email",
            summary: null,
            content: {
              schemaVersion: 1,
              configuration: "contact-email",
              contactEmail: "approved@cognirise.ai",
            },
            mediaIds: [],
            markets: ["ksa"],
          },
        }],
      }] satisfies Edition[],
    }],
  ]);
  const queriedStatements: string[] = [];
  const observedCandidateChains: string[][] = [];
  let explicitSourceSelected = false;
  const frozenPreviewSnapshots: Array<Record<string, unknown>> = [];
  const mediaReferences = new Map<string, string>([
    [`${inheritedDocumentId}:00000000-0000-4000-8000-000000000305:${mediaAssetId}`, mediaVersionA],
  ]);
  const previewSessions: Array<unknown[]> = [];
  let failNextAudit = false;
  let insertedRevisionSequence = 400;

  const findEdition = (documentId: string, market: unknown, locale: unknown) =>
    documents.get(documentId)?.editions.find(
      (edition) => edition.market === market && edition.locale === locale,
    );
  const latest = (edition: Edition) => edition.revisions.at(-1)!;
  const documentRow = (documentId: string, edition: Edition) => {
    const document = documents.get(documentId)!;
    const revision = latest(edition);
    return {
      id: documentId,
      kind: document.kind,
      canonical_slug: document.slug,
      title: document.title,
      owner_id: "user-id",
      root_status: "active",
      created_at: now,
      updated_at: now,
      markets: ["ksa"],
      edition_id: edition.id,
      revision_id: revision.id,
      revision_number: revision.number,
      payload: revision.payload,
      workflow_state: revision.workflow,
      publication_state: edition.publicationState,
      publish_at: null,
      published_at: edition.publicationState === "published" ? now : null,
      published_revision_id: edition.publishedRevisionId,
      can_permanently_delete: false,
    };
  };

  const query = async (sql: unknown, values: unknown[] = []) => {
    const statement = String(sql);
    queriedStatements.push(statement);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: values[0] ?? security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "KSA editor",
          email: "ksa-editor@example.com",
          role,
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          market_codes: ["ksa"],
        }],
      };
    }
    if (statement === "SELECT kind FROM cms_documents WHERE id=$1") {
      const document = documents.get(String(values[0]));
      return document
        ? { rowCount: 1, rows: [{ kind: document.kind }] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 3,
        rows: [
          { code: "uae", default_locale: "en", fallback_market_code: null, fallback_locale: null },
          { code: "europe", default_locale: "en", fallback_market_code: "uae", fallback_locale: "en" },
          { code: "ksa", default_locale: "en", fallback_market_code: "europe", fallback_locale: "en" },
        ],
      };
    }
    if (statement === "SELECT default_locale FROM market_editions WHERE code=$1 AND enabled=true") {
      return { rowCount: 1, rows: [{ default_locale: "en" }] };
    }
    if (statement.includes("SELECT DISTINCT e.market,e.locale")) {
      const editions = documents.get(String(values[0]))?.editions ?? [];
      const rows = editions.map((edition) => ({ market: edition.market, locale: edition.locale }));
      return { rowCount: rows.length, rows };
    }
    if (statement.includes("FROM cms_navigation_published_policies")) {
      if (values[0] !== "uae") return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{
          items: [{
            id: "platforms",
            label: "Published fallback menu",
            parentId: null,
            order: 0,
            destination: "/platforms",
            visible: true,
          }],
          pages: [{ path: "/platforms", enabled: true }],
          published_at: now,
        }],
      };
    }
    if (statement.includes("d.canonical_slug=$1")) {
      const document = documents.get(contactDocumentId)!;
      const edition = document.editions[0];
      const revision = edition.revisions.find(
        (candidate) => candidate.id === edition.publishedRevisionId,
      );
      return revision
        ? {
            rowCount: 1,
            rows: [{
              id: contactDocumentId,
              market: edition.market,
              locale: edition.locale,
              published_at: now,
              updated_at: now,
              revision_id: revision.id,
              revision_number: revision.number,
              payload: revision.payload,
            }],
          }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("WITH selected AS")) {
      const edition = findEdition(approvedDocumentId, "ksa", "en");
      const revision = edition?.revisions.find(
        (candidate) => candidate.id === edition.publishedRevisionId,
      );
      if (!edition || edition.publicationState !== "published" || !revision) {
        return { rowCount: 0, rows: [] };
      }
      return {
        rowCount: 1,
        rows: [{
          id: approvedDocumentId,
          kind: "publication",
          market: "ksa",
          locale: "en",
          published_at: now,
          updated_at: now,
          localized_slug: revision.payload.slug,
          revision_id: revision.id,
          revision_number: revision.number,
          payload: revision.payload,
          total_count: 1,
          requested_market: "ksa",
          requested_locale: "en",
        }],
      };
    }
    if (statement.includes("AS is_configured")) {
      return { rowCount: 1, rows: [{ is_configured: true, configured_page_paths: [] }] };
    }
    if (statement.includes("SELECT e.id,e.market,e.locale,NULL::text fallback_reason")) {
      const edition = findEdition(String(values[0]), values[1], values[2]);
      return edition
        ? {
            rowCount: 1,
            rows: [{
              id: edition.id,
              market: edition.market,
              locale: edition.locale,
              fallback_reason: null,
              used_fallback: false,
            }],
          }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT id,payload,revision_number FROM cms_revisions")) {
      const edition = [...documents.values()].flatMap((document) => document.editions)
        .find((candidate) => candidate.id === values[0]);
      if (!edition) return { rowCount: 0, rows: [] };
      const revision = latest(edition);
      return {
        rowCount: 1,
        rows: [{ id: revision.id, payload: revision.payload, revision_number: revision.number }],
      };
    }
    if (statement.includes("INSERT INTO cms_preview_sessions")) {
      frozenPreviewSnapshots.push(values[9] as Record<string, unknown>);
      previewSessions.push(values);
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("FROM cms_preview_sessions p")) {
      const session = previewSessions.at(-1);
      if (!session) return { rowCount: 0, rows: [] };
      const edition = [...documents.values()].flatMap((document) => document.editions)
        .find((candidate) => candidate.id === session[1]);
      const revision = edition?.revisions.find((candidate) => candidate.id === session[2]);
      if (!edition || !revision) return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{
          document_id: inheritedDocumentId,
          kind: "publication",
          market: edition.market,
          locale: edition.locale,
          revision_id: revision.id,
          payload: revision.payload,
          revision_number: revision.number,
          requested_market: session[5],
          requested_locale: session[6],
          fallback_reason: session[7],
          navigation_policy_digest: session[8],
          navigation_snapshot: session[9],
        }],
      };
    }
    if (statement.includes("FROM cms_media_references ref")) {
      const documentId = String(statement.includes("a.id::text id") ? values[1] : values[0]);
      const fieldPath = String(statement.includes("a.id::text id") ? values[2] : values[1]);
      const revisionId = fieldPath.replace("revision:", "");
      const versionId = mediaReferences.get(`${documentId}:${revisionId}:${mediaAssetId}`);
      return versionId
        ? {
            rowCount: 1,
            rows: [{
              id: mediaAssetId,
              status: "active",
              media_type: "image/png",
              alt_text: "Governed image",
              version_id: versionId,
              width: 100,
              height: 100,
              metadata: { rightsStatus: "approved" },
            }],
          }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("COALESCE(pinned.id,latest.id)")) {
      const documentId = String(values[1]);
      const revisionId = String(values[2]).replace("revision:", "");
      const versionId = mediaReferences.get(`${documentId}:${revisionId}:${mediaAssetId}`);
      return versionId
        ? {
            rowCount: 1,
            rows: [{
              id: mediaAssetId,
              status: "active",
              media_type: "image/png",
              alt_text: "Governed image",
              version_id: versionId,
              width: 100,
              height: 100,
              metadata: { rightsStatus: "approved" },
            }],
          }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT e.publication_state,e.published_revision_id")) {
      const edition = findEdition(String(values[0]), values[1], values[2]);
      if (!edition) return { rowCount: 0, rows: [] };
      const revision = latest(edition);
      return {
        rowCount: 1,
        rows: [{
          publication_state: edition.publicationState,
          published_revision_id: edition.publishedRevisionId,
          revision_id: revision.id,
          revision_number: revision.number,
          workflow_state: revision.workflow,
          payload: revision.payload,
        }],
      };
    }
    if (statement.includes("published.id revision_id")) {
      const edition = findEdition(String(values[0]), values[1], values[2]);
      if (!edition?.publishedRevisionId || edition.publicationState !== "published") {
        return { rowCount: 0, rows: [] };
      }
      const revision = edition.revisions.find((item) => item.id === edition.publishedRevisionId)!;
      return {
        rowCount: 1,
        rows: [{
          market: edition.market,
          locale: edition.locale,
          publication_state: edition.publicationState,
          revision_id: revision.id,
          revision_number: revision.number,
          workflow_state: revision.workflow,
          payload: revision.payload,
        }],
      };
    }
    if (statement.includes("SELECT r.id,r.payload,r.workflow_state,d.kind")) {
      const documentId = String(values[0]);
      const revisionId = String(values[1]);
      const edition = documents.get(documentId)?.editions.find((candidate) =>
        candidate.revisions.some((revision) => revision.id === revisionId)
      );
      const revision = edition?.revisions.find((candidate) => candidate.id === revisionId);
      if (!edition || !revision || revision !== latest(edition)) return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{
          id: revision.id,
          payload: revision.payload,
          workflow_state: revision.workflow,
          kind: "publication",
          canonical_slug: documents.get(documentId)!.slug,
          market: edition.market,
          locale: edition.locale,
        }],
      };
    }
    if (statement.includes("UPDATE cms_revisions SET workflow_state='in-review'")) {
      for (const document of documents.values()) {
        for (const edition of document.editions) {
          const revision = edition.revisions.find((candidate) => candidate.id === values[0]);
          if (revision) {
            revision.workflow = "in-review";
            if (edition.publicationState !== "published") edition.publicationState = "in-review";
          }
        }
      }
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("EXISTS(SELECT 1 FROM cms_market_editions visible")) {
      const requestedMarket = values[3] as string | null;
      const requestedLocale = values[4] as string | null;
      const allowed = values[5] as string[];
      const rows = [...documents.entries()].flatMap(([id, document]) => {
        const edition = document.editions.find((candidate) =>
          (!requestedMarket || candidate.market === requestedMarket) &&
          (!requestedLocale || candidate.locale === requestedLocale) &&
          allowed.includes(candidate.market)
        );
        return edition ? [documentRow(id, edition)] : [];
      });
      return { rowCount: rows.length, rows };
    }
    if (statement.includes("WITH inherited AS") && statement.includes("true inherited")) {
      const candidateMarkets = values[2] as string[];
      observedCandidateChains.push(candidateMarkets);
      if (!candidateMarkets.includes("uae")) return { rowCount: 0, rows: [] };
      const rows = [...documents.entries()].flatMap(([id, document]) => {
        const exactKsa = document.editions.some((edition) => edition.market === "ksa");
        const uae = document.editions.find((edition) =>
          edition.market === "uae" && edition.publicationState === "published" &&
          edition.publishedRevisionId
        );
        if (exactKsa || !uae) return [];
        const revision = uae.revisions.find((candidate) => candidate.id === uae.publishedRevisionId)!;
        return [{
          ...documentRow(id, uae),
          revision_id: revision.id,
          revision_number: revision.number,
          payload: revision.payload,
          workflow_state: revision.workflow,
          markets: ["ksa"],
          inherited: true,
          effective_market: "uae",
          effective_locale: "en",
        }];
      });
      return { rowCount: rows.length, rows };
    }
    if (statement.includes("LEFT JOIN LATERAL") && statement.endsWith("WHERE d.id=$1")) {
      const edition = findEdition(String(values[0]), values[1], values[2]);
      return edition
        ? { rowCount: 1, rows: [documentRow(String(values[0]), edition)] }
        : { rowCount: 0, rows: [] };
    }
    if (
      statement.includes("INSERT INTO cms_media_references") &&
      statement.includes("COALESCE(requested.id,prior.media_version_id,latest.id)")
    ) {
      const [assetId, exactVersionId, documentId, fieldPath, sourceRevisionId] = values.map(String);
      const revisionId = fieldPath.replace("revision:", "");
      const key = `${documentId}:${revisionId}:${assetId}`;
      if (!mediaReferences.has(key)) {
        mediaReferences.set(
          key,
          exactVersionId !== "null"
            ? exactVersionId
            : mediaReferences.get(`${documentId}:${sourceRevisionId}:${assetId}`) ?? mediaVersionB,
        );
      }
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_media_references")) {
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_audit_events")) {
      if (failNextAudit) {
        failNextAudit = false;
        throw new Error("simulated post-commit audit response failure");
      }
      return { rowCount: 1, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  };

  t.mock.method(pool, "query", query as never);
  const editionLockTails = new Map<string, Promise<void>>();
  t.mock.method(pool, "connect", async () => {
    let releaseEditionLock: (() => void) | undefined;
    return ({
    async query(sql: unknown, values: unknown[] = []) {
      const statement = String(sql);
      if (statement === "BEGIN") {
        return { rowCount: 0, rows: [] };
      }
      if (statement === "COMMIT" || statement === "ROLLBACK") {
        releaseEditionLock?.();
        releaseEditionLock = undefined;
        return { rowCount: 0, rows: [] };
      }
      if (statement === "SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE") {
        return documents.has(String(values[0]))
          ? { rowCount: 1, rows: [{ id: values[0] }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("LOCK TABLE cms_user_market_assignments IN SHARE MODE")) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT role,status") && statement.includes("FROM cms_users")) {
        return {
          rowCount: 1,
          rows: [{ role, status: "active" }],
        };
      }
      if (statement.includes("SELECT market_code") && statement.includes("FROM cms_user_market_assignments")) {
        return {
          rowCount: 1,
          rows: [{ market_code: "ksa" }],
        };
      }
      if (statement.includes("SELECT id FROM cms_market_editions") && statement.includes("FOR UPDATE")) {
        const lockKey = `${values[0]}:${values[1]}:${values[2]}`;
        const predecessor = editionLockTails.get(lockKey) ?? Promise.resolve();
        let unlock!: () => void;
        editionLockTails.set(lockKey, new Promise<void>((resolve) => {
          unlock = resolve;
        }));
        await predecessor;
        releaseEditionLock = unlock;
        const edition = findEdition(String(values[0]), values[1], values[2]);
        return edition
          ? { rowCount: 1, rows: [{ id: edition.id }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT e.id,e.published_revision_id,e.content_mode,d.kind")) {
        const edition = findEdition(String(values[0]), values[1], values[2]);
        const document = documents.get(String(values[0]));
        if (!edition) return { rowCount: 0, rows: [] };
        const revision = latest(edition);
        return {
          rowCount: 1,
          rows: [{
            id: edition.id,
            published_revision_id: edition.publishedRevisionId,
            content_mode: "custom",
            kind: document?.kind ?? "publication",
            revision_id: revision.id,
            payload: revision.payload,
            revision_number: revision.number,
            workflow_state: revision.workflow,
          }],
        };
      }
      if (
        statement.includes("FOR UPDATE OF e")
        && statement.includes("JOIN cms_market_editions e ON e.id=r.edition_id")
        && !statement.includes("FOR UPDATE OF e,r")
        && (
          statement.includes("WHERE r.id=$2 AND e.document_id=$1")
          || statement.includes("WHERE r.id=$1 AND e.document_id=$2")
        )
      ) {
        const revisionId = String(statement.includes("r.id=$2") ? values[1] : values[0]);
        const revisionEdition = [...documents.values()].flatMap((document) => document.editions)
          .find((candidate) => candidate.revisions.some((revision) => revision.id === revisionId));
        return revisionEdition
          ? {
              rowCount: 1,
              rows: [{
                id: revisionEdition.id,
                edition_id: revisionEdition.id,
                market: revisionEdition.market,
                locale: revisionEdition.locale,
              }],
            }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("WITH config AS") && statement.includes("effective published revision")) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("JOIN cms_document_availability_states state")
        && statement.includes("shared_source_edition_id")) {
        explicitSourceSelected = true;
        const documentId = String(values[0]);
        const source = findEdition(documentId, "uae", "en");
        const sourceRevision = source?.revisions.find(
          (revision) => revision.id === "00000000-0000-4000-8000-000000000305",
        );
        if (!source || !sourceRevision || (values[1] && values[1] !== sourceRevision.id)) {
          return { rowCount: 0, rows: [] };
        }
        return {
          rowCount: 1,
          rows: [{
            kind: "publication",
            id: sourceRevision.id,
            payload: sourceRevision.payload,
            market: "uae",
            locale: "en",
          }],
        };
      }
      if (statement.includes("WITH candidates AS") && statement.includes("JOIN candidates c")) {
        const candidateMarkets = values[1] as string[];
        observedCandidateChains.push(candidateMarkets);
        if (!candidateMarkets.includes("uae")) return { rowCount: 0, rows: [] };
        const documentId = String(values[0]);
        const uae = findEdition(documentId, "uae", "en");
        const revision = uae?.revisions.find((candidate) => candidate.id === uae.publishedRevisionId);
        return uae && revision
          ? {
              rowCount: 1,
              rows: [{
                kind: "publication",
                id: revision.id,
                payload: revision.payload,
                market: "uae",
                locale: "en",
              }],
            }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("INSERT INTO cms_market_editions")) {
        const documentId = String(values[0]);
        const edition: Edition = {
          id: "00000000-0000-4000-8000-000000000206",
          market: String(values[1]) as "ksa",
          locale: String(values[2]) as "en",
          publicationState: "draft",
          publishedRevisionId: null,
          revisions: [],
        };
        documents.get(documentId)!.editions.push(edition);
        return { rowCount: 1, rows: [{ id: edition.id }] };
      }
      if (statement.includes("SELECT r.id,r.edition_id,r.payload,d.kind")) {
        const revisionId = String(values[0]);
        const documentId = String(values[1]);
        const edition = documents.get(documentId)?.editions.find((candidate) =>
          candidate.revisions.some((revision) => revision.id === revisionId)
        );
        const revision = edition?.revisions.find((candidate) => candidate.id === revisionId);
        if (!edition || !revision) return { rowCount: 0, rows: [] };
        return {
          rowCount: 1,
          rows: [{
            id: revision.id,
            edition_id: edition.id,
            payload: revision.payload,
            kind: "publication",
            canonical_slug: documents.get(documentId)!.slug,
            workflow_state: revision.workflow,
            publication_state: edition.publicationState,
            market: edition.market,
            locale: edition.locale,
          }],
        };
      }
      if (statement.includes("WITH submitted AS") && statement.includes("workflow_state='in-review'")) {
        const edition = [...documents.values()].flatMap((document) => document.editions)
          .find((candidate) => candidate.revisions.some((revision) => revision.id === String(values[0])));
        const revision = edition?.revisions.find((candidate) => candidate.id === String(values[0]));
        if (!edition || !revision || !["draft", "rejected"].includes(revision.workflow)) {
          return { rowCount: 0, rows: [] };
        }
        revision.workflow = "in-review";
        if (edition.publicationState !== "published") edition.publicationState = "in-review";
        return { rowCount: 1, rows: [{ id: revision.id }] };
      }
      if (statement.includes("INSERT INTO cms_revisions")) {
        const edition = [...documents.values()].flatMap((document) => document.editions)
          .find((candidate) => candidate.id === values[0])!;
        const number = edition.revisions.length ? latest(edition).number + 1 : 1;
        const revision = {
          id: `00000000-0000-4000-8000-${String(++insertedRevisionSequence).padStart(12, "0")}`,
          number,
          workflow: "draft" as const,
          payload: values[1] as Record<string, unknown>,
        };
        edition.revisions.push(revision);
        return { rowCount: 1, rows: [{ id: revision.id, revision_number: number, created_at: now }] };
      }
      if (
        statement.includes("UPDATE cms_revisions SET workflow_state='approved'")
        && !statement.includes("IN ('draft','rejected')")
      ) {
        const revisionId = String(values[0]);
        const revision = [...documents.values()].flatMap((document) => document.editions)
          .flatMap((edition) => edition.revisions)
          .find((candidate) => candidate.id === revisionId);
        if (!revision || revision.workflow !== "in-review") return { rowCount: 0, rows: [] };
        revision.workflow = "approved";
        return { rowCount: 1, rows: [] };
      }
      if (
        statement.includes("UPDATE cms_revisions SET workflow_state='approved'")
        && statement.includes("IN ('draft','rejected')")
      ) {
        const revisionId = String(values[0]);
        const revision = [...documents.values()].flatMap((document) => document.editions)
          .flatMap((edition) => edition.revisions)
          .find((candidate) => candidate.id === revisionId);
        if (!revision || !["draft", "rejected"].includes(revision.workflow)) return { rowCount: 0, rows: [] };
        revision.workflow = "approved";
        return { rowCount: 1, rows: [] };
      }
      if (statement.includes("UPDATE cms_revisions SET workflow_state='rejected'")) {
        const revisionId = String(values[0]);
        const edition = [...documents.values()].flatMap((document) => document.editions)
          .find((candidate) => candidate.revisions.some((revision) => revision.id === revisionId));
        const revision = edition?.revisions.find((candidate) => candidate.id === revisionId);
        if (!edition || !revision || revision.workflow !== "in-review") {
          return { rowCount: 0, rows: [] };
        }
        revision.workflow = "rejected";
        return {
          rowCount: 1,
          rows: [{
            id: revision.id,
            edition_id: edition.id,
            market: edition.market,
            locale: edition.locale,
          }],
        };
      }
      if (statement.includes("WHEN publication_state='published' THEN 'published'")) {
        return { rowCount: 1, rows: [] };
      }
      if (statement.includes("UPDATE cms_market_editions SET publication_state")) {
        const edition = [...documents.values()].flatMap((document) => document.editions)
          .find((candidate) => candidate.id === values[0])!;
        edition.publicationState = "published";
        edition.publishedRevisionId = String(values[3]);
        return { rowCount: 1, rows: [] };
      }
      return query(sql, values);
    },
    release() {},
    }) as never;
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };

  const matrixResponse = await fetch(`${origin}/api/documents/${draftDocumentId}/editions`, { headers });
  assert.equal(matrixResponse.status, 200);
  const matrix = await matrixResponse.json() as {
    items: Array<{ market: string; locale: string; exact: boolean; workflowState: string; revisionId: string }>;
  };
  const ksaMatrix = matrix.items.find((item) => item.market === "ksa" && item.locale === "en")!;
  assert.equal(ksaMatrix.exact, true);
  assert.equal(ksaMatrix.workflowState, "draft");
  assert.equal(ksaMatrix.revisionId, "00000000-0000-4000-8000-000000000301");
  const ksaArabicMatrix = matrix.items.find(
    (item) => item.market === "ksa" && item.locale === "ar",
  )!;
  assert.equal(ksaArabicMatrix.exact, true);
  assert.equal(ksaArabicMatrix.workflowState, "approved");
  assert.equal(ksaArabicMatrix.revisionId, "00000000-0000-4000-8000-000000000307");
  assert.equal(
    matrix.items.filter((item) => item.market === "ksa" && item.locale === "en").length,
    1,
  );

  const firstDetail = await fetch(
    `${origin}/api/documents/${draftDocumentId}?market=ksa&locale=en`,
    { headers },
  );
  assert.equal(firstDetail.status, 200);
  assert.equal((await firstDetail.json() as { title: string }).title, "KSA first publication");
  const arabicDetail = await fetch(
    `${origin}/api/documents/${draftDocumentId}?market=ksa&locale=ar`,
    { headers },
  );
  assert.equal(arabicDetail.status, 200);
  assert.equal((await arabicDetail.json() as { title: string }).title, "KSA Arabic published");

  const firstSave = await fetch(`${origin}/api/documents/${draftDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ market: "ksa", locale: "en", revisionNumber: 1, title: "KSA saved draft" }),
  });
  assert.equal(firstSave.status, 200);
  const firstSaved = await firstSave.json() as {
    title: string; currentRevisionId: string; revisionNumber: number; status: string;
  };
  assert.equal(firstSaved.title, "KSA saved draft");
  assert.equal(firstSaved.revisionNumber, 2);
  assert.equal(firstSaved.status, "draft");

  const submitted = await fetch(`${origin}/api/documents/${draftDocumentId}/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: firstSaved.currentRevisionId }),
  });
  const submittedBody = await submitted.json() as { status?: string; error?: string; details?: string[] };
  assert.equal(submitted.status, 200, JSON.stringify(submittedBody));
  assert.equal(submittedBody.status, "in-review");
  const submittedRevisionId = firstSaved.currentRevisionId;
  const firstEdition = findEdition(draftDocumentId, "ksa", "en")!;
  assert.equal(latest(firstEdition).workflow, "in-review");
  assert.equal(firstEdition.publishedRevisionId, null);

  role = "publisher";
  const published = await fetch(`${origin}/api/documents/${draftDocumentId}/publish`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: submittedRevisionId }),
  });
  const publishedBody = await published.json() as {
    status?: string; currentRevisionId?: string; publishedRevisionId?: string; error?: string;
  };
  assert.equal(published.status, 200, JSON.stringify(publishedBody));
  assert.equal(publishedBody.status, "published");
  assert.equal(publishedBody.currentRevisionId, submittedRevisionId);
  assert.equal(publishedBody.publishedRevisionId, submittedRevisionId);
  assert.equal(latest(firstEdition).workflow, "approved");
  assert.equal(firstEdition.publishedRevisionId, submittedRevisionId);

  const preview = await fetch(
    `${origin}/api/documents/${draftDocumentId}/preview?market=ksa&locale=en`,
    { headers },
  );
  assert.equal(preview.status, 200);
  const previewBody = await preview.json() as {
    navigation: { market: string; requestedMarket: string; usedFallback: boolean; items: Array<{ label: string }> };
  };
  assert.equal(previewBody.navigation.market, "uae");
  assert.equal(previewBody.navigation.requestedMarket, "ksa");
  assert.equal(previewBody.navigation.usedFallback, true);
  assert.equal(previewBody.navigation.items[0]?.label, "Published fallback menu");
  assert.equal(frozenPreviewSnapshots[0]?.market, "uae");
  assert.equal(
    queriedStatements.some((statement) =>
      statement.includes("cms_navigation_editions") || statement.includes("cms_page_availability")
    ),
    false,
  );

  const cannotRepublishApproved = await fetch(
    `${origin}/api/documents/${draftDocumentId}/publish`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ revisionId: submittedRevisionId }),
    },
  );
  assert.equal(cannotRepublishApproved.status, 409);

  role = "editor";
  const concurrentSave = (title: string) => fetch(`${origin}/api/documents/${draftDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      market: "ksa",
      locale: "en",
      revisionNumber: 2,
      title,
    }),
  });
  const concurrentResponses = await Promise.all([
    concurrentSave("Concurrent writer A"),
    concurrentSave("Concurrent writer B"),
  ]);
  assert.deepEqual(
    concurrentResponses.map((response) => response.status).sort(),
    [200, 409],
    "the edition lock must make a waiting writer observe the winner's committed revision",
  );
  assert.equal(
    latest(findEdition(draftDocumentId, "ksa", "en")!).number,
    3,
    "concurrent requests with one revision token create exactly one successor",
  );

  const approvedEdition = findEdition(approvedDocumentId, "ksa", "en")!;
  const approvedPointer = approvedEdition.publishedRevisionId;
  const approvedRevision = approvedEdition.revisions[0];
  const rejectedLegacySeo = await fetch(`${origin}/api/documents/${approvedDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      market: "ksa",
      locale: "en",
      revisionNumber: 1,
      seo: { imageId: mediaAssetId },
    }),
  });
  assert.equal(rejectedLegacySeo.status, 400);
  const legacySeoError = await rejectedLegacySeo.json() as { error: string; details: { path: string[] }[] };
  assert.match(legacySeoError.error, /SEO metadata/i);
  assert.deepEqual(legacySeoError.details[0].path, ["seo"]);
  assert.equal(latest(approvedEdition).number, 1, "unknown SEO must be rejected rather than stripped");
  const invalidCanonical = await fetch(`${origin}/api/documents/${approvedDocumentId}`, {
    method: "PATCH", headers,
    body: JSON.stringify({
      market: "ksa", locale: "en", revisionNumber: 1,
      seo: { canonicalUrl: "ftp://example.com" },
    }),
  });
  assert.equal(invalidCanonical.status, 400);
  const canonicalError = await invalidCanonical.json() as { details: { path: string[] }[] };
  assert.deepEqual(canonicalError.details[0].path, ["seo", "canonicalUrl"]);
  assert.equal(latest(approvedEdition).number, 1);

  const successor = await fetch(`${origin}/api/documents/${approvedDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      market: "ksa",
      locale: "en",
      revisionNumber: 1,
      title: "KSA successor one",
      seo: { title: "Partial search title" },
    }),
  });
  assert.equal(successor.status, 200);
  const successorBody = await successor.json() as {
    title: string; currentRevisionId: string; publishedRevisionId: string; revisionNumber: number;
  };
  assert.equal(successorBody.revisionNumber, 2);
  assert.equal(successorBody.publishedRevisionId, approvedPointer);
  assert.notEqual(successorBody.currentRevisionId, approvedPointer);
  assert.equal(approvedRevision.workflow, "approved");
  assert.equal(approvedEdition.publishedRevisionId, approvedPointer);

  const secondSave = await fetch(`${origin}/api/documents/${approvedDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      market: "ksa",
      locale: "en",
      revisionNumber: 2,
      title: "KSA successor two",
      seo: { title: "", description: "", canonicalUrl: "" },
    }),
  });
  assert.equal(secondSave.status, 200);
  const secondBody = await secondSave.json() as {
    title: string; currentRevisionId: string; revisionNumber: number;
  };
  assert.equal(secondBody.revisionNumber, 3);
  assert.notEqual(secondBody.currentRevisionId, successorBody.currentRevisionId);
  assert.equal(secondBody.title, "KSA successor two");
  const savedSeo = (latest(approvedEdition).payload as {
    seo?: { title?: string; description?: string; canonicalUrl?: string; noIndex?: boolean };
  }).seo;
  assert.equal(savedSeo?.title, "");
  assert.equal(savedSeo?.description, "");
  assert.equal(savedSeo?.canonicalUrl, undefined, "blank canonical URL is normalized away");
  assert.equal(savedSeo?.noIndex, false);

  const staleIdentitySave = await fetch(`${origin}/api/documents/${approvedDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      market: "ksa",
      locale: "en",
      revisionNumber: 3,
      expectedRevisionId: approvedPointer,
      title: "STALE RELOCATED ADDRESS OVERWRITE",
    }),
  });
  assert.equal(staleIdentitySave.status, 409);
  assert.match(
    (await staleIdentitySave.json() as { error: string }).error,
    /reopen.*saving/i,
  );
  assert.equal(latest(approvedEdition).number, 3);
  assert.equal(latest(approvedEdition).payload.title, "KSA successor two");

  const staleSave = await fetch(`${origin}/api/documents/${approvedDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      market: "ksa",
      locale: "en",
      revisionNumber: 2,
      title: "STALE OVERWRITE",
    }),
  });
  assert.equal(staleSave.status, 409);
  assert.match(
    (await staleSave.json() as { error: string }).error,
    /changed by another user/i,
  );
  assert.equal(latest(approvedEdition).number, 3);
  assert.equal(latest(approvedEdition).payload.title, "KSA successor two");

  const listed = await fetch(`${origin}/api/documents?market=ksa&locale=en`, { headers });
  assert.equal(listed.status, 200);
  const listedText = JSON.stringify(await listed.json());
  assert.doesNotMatch(listedText, /UAE .*SECRET/);
  assert.match(listedText, /KSA successor two/);

  const isolatedDetail = await fetch(
    `${origin}/api/documents/${approvedDocumentId}?market=ksa&locale=en`,
    { headers },
  );
  assert.equal(isolatedDetail.status, 200);
  assert.doesNotMatch(JSON.stringify(await isolatedDetail.json()), /UAE .*SECRET/);

  const deniedList = await fetch(`${origin}/api/documents?market=uae&locale=en`, { headers });
  assert.equal(deniedList.status, 403);
  const deniedDetail = await fetch(
    `${origin}/api/documents/${approvedDocumentId}?market=uae&locale=en`,
    { headers },
  );
  assert.equal(deniedDetail.status, 403);

  const liveContent = async () => {
    const response = await fetch(
      `${origin}/api/public/content?market=ksa&locale=en&kind=publication`,
    );
    assert.equal(response.status, 200);
    return (await response.json() as {
      items: Array<{ id: string; revision: number; title: string }>;
    }).items.find((item) => item.id === approvedDocumentId);
  };
  const submittedSuccessor = await fetch(`${origin}/api/documents/${approvedDocumentId}/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: secondBody.currentRevisionId }),
  });
  assert.equal(submittedSuccessor.status, 200, await submittedSuccessor.text());
  assert.equal(approvedEdition.publicationState, "published");
  assert.equal((await liveContent())?.revision, 1);
  assert.equal((await liveContent())?.title, "KSA approved");

  role = "publisher";
  const rejectedSuccessor = await fetch(`${origin}/api/documents/${approvedDocumentId}/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      revisionId: secondBody.currentRevisionId,
      body: "Revise the successor before replacing live content.",
    }),
  });
  assert.equal(rejectedSuccessor.status, 200, await rejectedSuccessor.text());
  assert.equal(approvedEdition.publicationState, "published");
  assert.equal((await liveContent())?.revision, 1);

  role = "editor";
  const revisedSuccessor = await fetch(`${origin}/api/documents/${approvedDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      market: "ksa",
      locale: "en",
      revisionNumber: 3,
      title: "KSA reviewed successor",
      seo: null,
    }),
  });
  const revisedSuccessorBody = await revisedSuccessor.json() as {
    currentRevisionId?: string;
    revisionNumber?: number;
    error?: string;
  };
  assert.equal(revisedSuccessor.status, 200, JSON.stringify(revisedSuccessorBody));
  assert.equal(revisedSuccessorBody.revisionNumber, 4);
  assert.equal(
    "seo" in latest(approvedEdition).payload,
    false,
    "null explicitly clears SEO instead of storing an invalid null snapshot",
  );
  const resubmittedSuccessor = await fetch(`${origin}/api/documents/${approvedDocumentId}/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: revisedSuccessorBody.currentRevisionId }),
  });
  assert.equal(resubmittedSuccessor.status, 200, await resubmittedSuccessor.text());
  assert.equal(approvedEdition.publicationState, "published");
  assert.equal((await liveContent())?.revision, 1);

  role = "publisher";
  const republishedSuccessor = await fetch(`${origin}/api/documents/${approvedDocumentId}/publish`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: revisedSuccessorBody.currentRevisionId }),
  });
  assert.equal(republishedSuccessor.status, 200, await republishedSuccessor.text());
  assert.equal((await liveContent())?.revision, 4);
  assert.equal((await liveContent())?.title, "KSA reviewed successor");
  role = "editor";

  const inheritedList = await fetch(`${origin}/api/documents?market=ksa&locale=en`, { headers });
  assert.equal(inheritedList.status, 200);
  const inheritedItems = (await inheritedList.json() as {
    items: Array<Record<string, unknown>>;
  }).items;
  const inherited = inheritedItems.find((item) => item.id === inheritedDocumentId)!;
  assert.equal(inherited.inherited, true);
  assert.equal(inherited.effectiveMarket, "uae");
  assert.equal(inherited.title, "Approved UAE fallback");
  assert.equal(inherited.currentRevisionId, "00000000-0000-4000-8000-000000000305");
  assert.doesNotMatch(JSON.stringify(inherited), /FALLBACK DRAFT SECRET|uae-unpublished-newer/);
  assert.ok(
    queriedStatements.some((statement) =>
      statement.includes("unnest($3::text[],$4::text[]) WITH ORDINALITY")
    ),
  );
  assert.deepEqual(observedCandidateChains[0], ["ksa", "europe", "uae"]);

  const inheritedMatrix = await fetch(
    `${origin}/api/documents/${inheritedDocumentId}/editions`,
    { headers },
  );
  assert.equal(inheritedMatrix.status, 200);
  const inheritedKsa = (await inheritedMatrix.json() as {
    items: Array<Record<string, unknown>>;
  }).items.find((item) => item.market === "ksa")!;
  assert.equal(inheritedKsa.exact, false);
  assert.equal(inheritedKsa.effectiveRevisionId, "00000000-0000-4000-8000-000000000305");

  const override = await fetch(`${origin}/api/documents/${inheritedDocumentId}/editions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ market: "ksa", locale: "en" }),
  });
  const overrideBody = await override.json() as {
    id?: string;
    snapshot?: { title?: string; slug?: string; mediaIds?: string[] };
    error?: string;
  };
  assert.equal(override.status, 201, JSON.stringify(overrideBody));
  assert.ok(
    explicitSourceSelected,
    "customization must use the explicit saved shared source, not navigation fallback candidates",
  );
  assert.equal(overrideBody.snapshot?.title, "Approved UAE fallback");
  assert.equal(overrideBody.snapshot?.slug, "uae-published-fallback");
  assert.doesNotMatch(JSON.stringify(overrideBody.snapshot), /FALLBACK DRAFT SECRET|uae-unpublished-newer/);
  assert.deepEqual(overrideBody.snapshot?.mediaIds, [mediaAssetId]);
  assert.ok(overrideBody.id);
  assert.equal(
    mediaReferences.get(`${inheritedDocumentId}:${overrideBody.id}:${mediaAssetId}`),
    mediaVersionA,
    "override must copy the source revision's pinned version, not library latest B",
  );

  const overridePreview = await fetch(
    `${origin}/api/documents/${inheritedDocumentId}/preview?market=ksa&locale=en&revisionId=${overrideBody.id}`,
    { headers },
  );
  const overridePreviewBody = await overridePreview.json() as { previewUrl?: string; error?: string };
  assert.equal(overridePreview.status, 200, JSON.stringify(overridePreviewBody));
  const resolvedPreview = await fetch(`${origin}/api${overridePreviewBody.previewUrl}`, { headers });
  const resolvedPreviewBody = await resolvedPreview.json() as {
    media?: Array<{ id: string; versionId: string }>;
    error?: string;
  };
  assert.equal(resolvedPreview.status, 200, JSON.stringify(resolvedPreviewBody));
  assert.equal(resolvedPreviewBody.media?.length, 1);
  assert.equal(resolvedPreviewBody.media?.[0]?.id, mediaAssetId);
  assert.equal(resolvedPreviewBody.media?.[0]?.versionId, mediaVersionA);

  const overrideSubmitted = await fetch(`${origin}/api/documents/${inheritedDocumentId}/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: overrideBody.id }),
  });
  assert.equal(overrideSubmitted.status, 200, await overrideSubmitted.text());
  role = "publisher";
  const overridePublished = await fetch(`${origin}/api/documents/${inheritedDocumentId}/publish`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: overrideBody.id }),
  });
  assert.equal(overridePublished.status, 200, await overridePublished.text());
  assert.equal(
    mediaReferences.get(`${inheritedDocumentId}:${overrideBody.id}:${mediaAssetId}`),
    mediaVersionA,
    "submission and publication must retain the inherited source pin",
  );

  role = "administrator";
  const directDraftPublish = await fetch(`${origin}/api/documents/${draftDocumentId}/publish`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: "00000000-0000-4000-8000-000000000302" }),
  });
  const directDraftPublishBody = await directDraftPublish.json() as {
    status?: string;
    publishedRevisionId?: string;
    error?: string;
  };
  assert.equal(directDraftPublish.status, 200, JSON.stringify(directDraftPublishBody));
  assert.equal(directDraftPublishBody.status, "published");
  assert.equal(
    directDraftPublishBody.publishedRevisionId,
    "00000000-0000-4000-8000-000000000302",
    "an administrator can publish an eligible saved draft without a mandatory review transition",
  );
  assert.equal(latest(findEdition(draftDocumentId, "uae", "en")!).workflow, "approved");

  role = "editor";
  const openedContact = await fetch(
    `${origin}/api/documents/${contactDocumentId}?market=ksa&locale=en`,
    { headers },
  );
  const openedContactBody = await openedContact.json() as {
    content?: { contactEmail?: string };
    seo?: unknown;
    revisionNumber?: number;
    publishedRevisionId?: string;
  };
  assert.equal(openedContact.status, 200);
  assert.equal(openedContactBody.content?.contactEmail, "approved@cognirise.ai");
  assert.equal(openedContactBody.seo, undefined, "initializer-shaped contact content has no SEO");

  const saveContact = async (revisionNumber: number, contactEmail: string) => {
    const response = await fetch(`${origin}/api/documents/${contactDocumentId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        market: "ksa",
        locale: "en",
        revisionNumber,
        content: {
          schemaVersion: 1,
          configuration: "contact-email",
          contactEmail,
        },
      }),
    });
    const body = await response.json() as {
      content?: { contactEmail?: string };
      revisionNumber?: number;
      publishedRevisionId?: string;
      error?: string;
    };
    assert.equal(response.status, 200, JSON.stringify(body));
    return body;
  };
  const firstContactSave = await saveContact(1, "first-draft@cognirise.ai");
  assert.equal(firstContactSave.revisionNumber, 2);
  assert.equal(firstContactSave.content?.contactEmail, "first-draft@cognirise.ai");
  assert.equal(firstContactSave.publishedRevisionId, openedContactBody.publishedRevisionId);

  const reloadedContact = await fetch(
    `${origin}/api/documents/${contactDocumentId}?market=ksa&locale=en`,
    { headers },
  );
  assert.equal(reloadedContact.status, 200);
  assert.equal(
    (await reloadedContact.json() as { content: { contactEmail: string } }).content.contactEmail,
    "first-draft@cognirise.ai",
  );
  const secondContactSave = await saveContact(2, "second-draft@cognirise.ai");
  assert.equal(secondContactSave.revisionNumber, 3);
  assert.equal(secondContactSave.content?.contactEmail, "second-draft@cognirise.ai");

  const publicContact = await fetch(
    `${origin}/api/public/contact-configuration?market=ksa&locale=en`,
  );
  const publicContactBody = await publicContact.json() as {
    contactEmail?: string;
    revision?: number;
  };
  assert.equal(publicContact.status, 200);
  assert.equal(publicContactBody.contactEmail, "approved@cognirise.ai");
  assert.equal(publicContactBody.revision, 1);
  assert.equal(
    findEdition(contactDocumentId, "ksa", "en")!.publishedRevisionId,
    openedContactBody.publishedRevisionId,
    "successive contact draft saves must retain the approved predecessor",
  );

  failNextAudit = true;
  const uncertainConfirmation = await fetch(`${origin}/api/documents/${approvedDocumentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      market: "ksa",
      locale: "en",
      revisionNumber: 4,
      title: "Committed despite response failure",
    }),
  });
  const uncertainBody = await uncertainConfirmation.json() as {
    code?: string;
    committed?: boolean;
    error?: string;
  };
  assert.equal(uncertainConfirmation.status, 500);
  assert.equal(uncertainBody.code, "DOCUMENT_SAVE_COMMITTED");
  assert.equal(uncertainBody.committed, true);
  assert.match(uncertainBody.error ?? "", /saved.*reload/i);
  assert.equal(latest(approvedEdition).number, 5);
  assert.equal(latest(approvedEdition).payload.title, "Committed despite response failure");
  assert.equal(
    approvedEdition.publishedRevisionId,
    revisedSuccessorBody.currentRevisionId,
    "a committed successor save must not change the published pointer",
  );
});