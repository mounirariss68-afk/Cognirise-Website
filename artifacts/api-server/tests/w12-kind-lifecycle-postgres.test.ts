import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  cmsDocumentKinds,
  collectCmsMediaReferences,
  type CmsDocumentKind,
} from "@workspace/api-zod";

type PoolLike = {
  query<T = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
  end(): Promise<void>;
  options: { connectionString?: string };
};

type Fixture = {
  kind: CmsDocumentKind;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  publishable: boolean;
};

const source = {
  label: "W12 PostgreSQL lifecycle source",
  url: "https://example.com/w12-postgres-lifecycle",
  accessedAt: "2026-10-01",
};

const governance = {
  visibility: "public",
  order: 1,
  sources: [source],
  verificationDate: "2026-10-01",
  reviewDate: "2027-01-01",
  relatedIds: [],
};

const mediaReference = (
  mediaId: string,
  mediaVersionId: string,
  role: "identity" | "logo" | "hero" | "supporting",
  altText = "W12 PostgreSQL lifecycle media",
) => ({ mediaId, mediaVersionId, role, altText });

const block = { type: "paragraph", text: "A lifecycle-safe W12 paragraph." };
const mediaIds = Object.fromEntries(
  cmsDocumentKinds.flatMap((kind) => {
    if (kind === "office") return [];
    if (kind === "site-configuration") {
      return [
        ["site-poster", [randomUUID(), randomUUID()]],
        ["site-mp4", [randomUUID(), randomUUID()]],
        ["site-webm", [randomUUID(), randomUUID()]],
      ];
    }
    return [[kind, [randomUUID(), randomUUID()]]];
  }),
) as Record<string, [string, string]>;

function lifecycleFixtures(): Record<CmsDocumentKind, Fixture> {
  const ref = (kind: CmsDocumentKind, role: "identity" | "logo" | "hero" | "supporting" = "hero") => {
    const pair = mediaIds[kind];
    assert.ok(pair, `${kind} must have a lifecycle media pin`);
    return mediaReference(pair[0], pair[1], role);
  };
  return {
    person: {
      kind: "person",
      slug: "w12-postgres-person",
      title: "W12 PostgreSQL Person",
      publishable: true,
      content: {
        schemaVersion: 1,
        role: "leader",
        title: "Practice Lead",
        biography: "A complete lifecycle biography.",
        contribution: "A lifecycle contribution.",
        focusAreas: [{ title: "Governance", detail: "Build bounded capability." }],
        profileLinks: [{ label: "Profile", url: "https://example.com/w12-person" }],
        identityMedia: ref("person", "identity"),
        approvedFallback: "initials",
        ...governance,
      },
    },
    partner: {
      kind: "partner",
      slug: "w12-postgres-partner",
      title: "W12 PostgreSQL Partner",
      publishable: true,
      content: {
        schemaVersion: 1,
        allianceCategory: "Delivery partner",
        positioning: "A partner that strengthens governed delivery.",
        facts: [{ value: "Regional", label: "Delivery coverage" }],
        evidence: [{ statement: "The partner claim was reviewed.", source, approved: true }],
        coverage: ["UAE"],
        contribution: "A lifecycle contribution.",
        website: "https://example.com/w12-partner",
        logoMedia: ref("partner", "logo"),
        relationshipStatus: "active",
        ...governance,
      },
    },
    platform: {
      kind: "platform",
      slug: "w12-postgres-platform",
      title: "W12 PostgreSQL Platform",
      publishable: true,
      content: {
        schemaVersion: 1,
        category: "Specialist",
        summary: "A governed platform summary.",
        heroMedia: ref("platform"),
        template: "standard",
        sections: [{ heading: "Platform section", body: [block] }],
        capabilities: ["Bounded automation", "Evidence capture"],
        differentiators: ["Human approval", "Versioned delivery"],
        cta: { label: "Explore", href: "/platforms/w12-postgres-platform" },
        ...governance,
      },
    },
    publication: {
      kind: "publication",
      slug: "w12-postgres-publication",
      title: "W12 PostgreSQL Publication",
      publishable: true,
      content: {
        schemaVersion: 1,
        variant: "article",
        teaser: "A lifecycle publication teaser.",
        body: [block],
        author: "Editorial practice",
        publicationDate: "2026-10-01",
        updatedDate: "2026-10-02",
        readingTimeMinutes: 3,
        topics: ["governance"],
        sectors: ["Public Sector"],
        platformIds: [],
        heroMedia: ref("publication"),
        social: {},
        ...governance,
      },
    },
    "case-study": {
      kind: "case-study",
      slug: "w12-postgres-case-study",
      title: "W12 PostgreSQL Case Study",
      publishable: true,
      content: {
        schemaVersion: 1,
        variant: "full",
        disclosure: "anonymized",
        sector: "Manufacturing & Industrial",
        organizationDescriptor: "An industrial operator",
        engagementType: "client-delivery",
        deliveryStage: "production",
        impactClassification: "observed",
        impactStatement: "The governed workflow improved the operating path.",
        disclosureNote: "Identity is withheld.",
        publicEvidenceStatus: "approved",
        relatedIndustries: ["energy-resources"],
        visual: {
          kind: "illustrative-interface-reconstruction",
          caption: "Illustrative reconstruction.",
          altText: "An anonymized operations console.",
          textEquivalent: "A workflow with a human approval gate.",
          template: "operations-console",
          fixtureLabels: ["Example site"],
        },
        mandate: "Demonstrate a governed workflow.",
        context: "Representative lifecycle context.",
        constraints: ["Human approval required"],
        work: [block],
        controls: ["Approval gate"],
        outcomes: ["Documented outcome"],
        evidence: [{ statement: "The workflow was reviewed.", source, approved: true }],
        quote: { text: "A representative quote.", attribution: "Operations lead" },
        heroMedia: ref("case-study"),
        cta: { label: "Discuss", href: "/contact" },
        ...governance,
      },
    },
    industry: {
      kind: "industry",
      slug: "w12-postgres-industry",
      title: "W12 PostgreSQL Industry",
      publishable: true,
      content: {
        schemaVersion: 1,
        legacyPath: "/industries/w12-postgres-industry",
        name: "W12 Industry",
        shortName: "W12",
        thesis: "A governed industry thesis.",
        accent: "Governed momentum.",
        dek: "A concise industry summary.",
        opportunity: "Create value from a priority constraint.",
        capabilities: [
          { title: "Agentic platform", body: "Build bounded agents." },
          { title: "Responsible delivery", body: "Embed evidence and controls." },
        ],
        selectedWork: { description: "Show the mandate and evidenced outcome." },
        image: "/images/w12-postgres-industry.png",
        imageAlt: "A representative industry scene.",
        variant: "ledger",
        pressures: [
          { title: "One", body: "First operating pressure." },
          { title: "Two", body: "Second operating pressure." },
          { title: "Three", body: "Third operating pressure." },
        ],
        reversal: { title: "A reversal", body: "A documented consequence." },
        myth: { claim: "A claim", verdict: "A governed verdict." },
        gcc: "A regional context.",
        service: { label: "AI Platforms", href: "/what-we-do", firstMove: "Map one decision." },
        uses: [{
          use: "Priority workflow",
          evidence: "Measured evidence",
          boundary: "Human approval",
          sourceUrls: [source.url],
        }],
        sources: [{
          label: "Official guidance",
          publisher: "Public authority",
          kind: "Official source",
          url: source.url,
          accessedAt: source.accessedAt,
        }],
        heroMedia: ref("industry"),
        verificationDate: "2026-10-01",
        reviewDate: "2027-01-01",
        visibility: "public",
        order: 1,
        relatedIds: [],
      },
    },
    framework: {
      kind: "framework",
      slug: "w12-postgres-framework",
      title: "W12 PostgreSQL Framework",
      publishable: true,
      content: {
        schemaVersion: 1,
        template: "agent-authority",
        teaser: "Govern each handover according to its exposure.",
        handoverExplanation: "Knowledge, Decision and Action describe individual handovers.",
        methodology: [block],
        workedExample: {
          sector: "Travel & hospitality",
          title: "Passenger re-accommodation",
          handover: "action",
          reversibility: "R3",
          reach: "H2",
          exposureBand: "E2",
          oversight: "On the loop, with a stated intervention window",
          detail: "The duty manager owns the handover.",
          requestedAuthority: "on-loop",
          interventionWindow: "Before released-seat inventory expires.",
          accountableRole: "Duty Manager",
          promotionEvidence: "An approved body of clean rebookings.",
          automaticDemotion: "Any involuntary downgrade.",
        },
        sectorExamples: [],
        heroMedia: ref("framework"),
        cta: { label: "Apply", href: "/contact" },
        ...governance,
      },
    },
    office: {
      kind: "office",
      slug: "w12-postgres-office",
      title: "W12 PostgreSQL Office",
      publishable: true,
      content: {
        schemaVersion: 1,
        city: "Dubai",
        address: "Office 1914, Business Bay, Dubai, UAE",
        phone: "+971 4 123 4567",
        ...governance,
      },
    },
    "site-configuration": {
      kind: "site-configuration",
      slug: "site-homepage-hero",
      title: "W12 PostgreSQL Site Hero",
      publishable: true,
      content: {
        schemaVersion: 1,
        page: "homepage",
        hero: {
          posterMediaId: mediaIds["site-poster"][0],
          posterMediaVersionId: mediaIds["site-poster"][1],
          sources: [
            { mediaId: mediaIds["site-mp4"][0], mediaVersionId: mediaIds["site-mp4"][1], mimeType: "video/mp4" },
            { mediaId: mediaIds["site-webm"][0], mediaVersionId: mediaIds["site-webm"][1], mimeType: "video/webm" },
          ],
        },
      },
    },
    "landing-page": {
      kind: "landing-page",
      slug: "w12-postgres-methodologies",
      title: "W12 PostgreSQL Methodologies",
      publishable: true,
      content: {
        schemaVersion: 1,
        pagePath: "/methodologies",
        template: "landing",
        narrative: "A governed lifecycle landing page.",
        sections: [
          { type: "narrative", id: "hero", order: 0, body: [block] },
          {
            type: "media",
            id: "methodologies-hero-media",
            order: 1,
            references: [ref("landing-page", "supporting")],
          },
          { type: "cta", id: "primary-action", order: 2, label: "Contact", href: "/contact", style: "primary" },
        ],
        cta: { label: "Contact", href: "/contact", style: "secondary" },
        seo: { title: "W12 Methodologies", description: "Lifecycle fixture", noIndex: false },
        legal: {},
        visualReferences: [ref("landing-page", "supporting")],
        ...governance,
      },
    },
  };
}

function withSearchPath(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-csearch_path=${schema},public`);
  return url.toString();
}

async function clonePublicTables(admin: PoolLike, schema: string) {
  const tables = await admin.query<{ tablename: string }>(
    `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'`,
  );
  for (const table of tables.rows) {
    const name = table.tablename.replace(/"/g, "\"\"");
    await admin.query(
      `CREATE TABLE "${schema}"."${name}" (LIKE public."${name}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES)`,
    );
  }
}

async function applyTask345Migrations(admin: PoolLike) {
  const migration = async (name: string) =>
    readFile(resolve(process.cwd(), "../../lib/db/migrations", name), "utf8");
  const hasTable = async (name: string) => Boolean((await admin.query<{ exists: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS exists", [name],
  )).rows[0]?.exists);
  const hasColumn = async (table: string, column: string) => Boolean((await admin.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1
         FROM pg_catalog.pg_attribute attribute
         JOIN pg_catalog.pg_class relation ON relation.oid=attribute.attrelid
        WHERE relation.relnamespace=current_schema()::regnamespace
          AND relation.relname=$1
          AND attribute.attname=$2
          AND attribute.attnum>0
          AND NOT attribute.attisdropped
     ) AS exists`,
    [table, column],
  )).rows[0]?.exists);
  if (!await hasTable("cms_revision_accuracy_confirmations")) {
    await admin.query(await migration("0035_cms_revision_accuracy_confirmations.sql"));
  }
  if (await hasTable("cms_review_requests") && !await hasColumn("cms_review_requests", "accountable_editor_user_id")) {
    await admin.query(await migration("0036_cms_review_request_accountability_snapshot.sql"));
  }
  if (!await hasTable("cms_user_capability_grants")) {
    await admin.query(await migration("0037_cms_capability_matrix_access_projection.sql"));
  }
  if (await hasTable("cms_review_requests")) {
    await admin.query(await migration("0038_cms_review_capability_reviewers.sql"));
  }
  if (await hasTable("cms_user_capability_grants") && !await hasTable("cms_user_capability_configurations")) {
    await admin.query(await migration("0039_cms_capability_matrix_configuration.sql"));
  }
  if (!await hasTable("cms_legacy_administrator_market_snapshots")) {
    await admin.query(await migration("0040_cms_legacy_administrator_market_snapshots.sql"));
  }
}

async function installIsolatedTriggers(admin: PoolLike, schema: string) {
  const triggers = await admin.query<{ table_name: string; definition: string }>(
    `SELECT relation.relname table_name,pg_get_triggerdef(trigger_row.oid,true) definition
       FROM pg_catalog.pg_trigger trigger_row
       JOIN pg_catalog.pg_class relation ON relation.oid=trigger_row.tgrelid
       JOIN pg_catalog.pg_namespace namespace ON namespace.oid=relation.relnamespace
      WHERE namespace.nspname='public' AND NOT trigger_row.tgisinternal
      ORDER BY relation.relname,trigger_row.tgname`,
  );
  for (const trigger of triggers.rows) {
    const target = trigger.table_name.replace(/"/g, "\"\"");
    let definition = trigger.definition.replace(
      new RegExp(`\\bON\\s+(?:ONLY\\s+)?(?:(?:"?public"?\\.)?)"?${target}"?`, "i"),
      `ON "${schema}"."${target}"`,
    );
    definition = definition.replace(
      /\b(?:"?public"?\.)?cms_assert_review_request_target\s*\(/gi,
      "cms_assert_review_request_target(",
    );
    await admin.query(definition);
  }
}

async function seedLifecycleMedia(
  admin: PoolLike,
  userId: string,
  fixtures: Record<CmsDocumentKind, Fixture>,
) {
  const media = new Map<string, string>();
  for (const fixture of Object.values(fixtures)) {
    for (const reference of collectCmsMediaReferences(fixture.kind, fixture.content)) {
      if (!reference.mediaVersionId) continue;
      const prior = media.get(reference.mediaId);
      if (prior && prior !== reference.mediaVersionId) {
        throw new Error(
          `W12 fixture media asset ${reference.mediaId} has conflicting versions ${prior} and ${reference.mediaVersionId}.`,
        );
      }
      media.set(reference.mediaId, reference.mediaVersionId);
    }
  }
  for (const [assetId, versionId] of media) {
    const mediaType = assetId === mediaIds["site-mp4"]?.[0]
      ? "video/mp4"
      : assetId === mediaIds["site-webm"]?.[0] ? "video/webm" : "image/png";
    await admin.query(
      `INSERT INTO cms_media_assets
         (id,storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,
          collection,status,uploaded_by_user_id)
       VALUES ($1,$2,$3,$3,$4,4,$5,'W12 approved lifecycle media','website','active',$6)`,
      [assetId, `w12/${assetId}`, `${assetId}.bin`, mediaType, `w12-checksum-${assetId}`, userId],
    );
    await admin.query(
      `INSERT INTO cms_media_versions
         (id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,$2,1,$3,$4,4,1200,800,
               '{"altText":"W12 approved lifecycle media","rightsStatus":"approved","accessibilityStatus":"approved"}'::jsonb)`,
      [versionId, assetId, `w12/${versionId}`, `w12-version-checksum-${versionId}`],
    );
  }
}

test("W12 parameterized PostgreSQL lifecycle is isolated and preserves published pins", {
  concurrency: false,
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async (t) => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSessionSecret = process.env.SESSION_SECRET;
  assert.ok(originalDatabaseUrl);
  const fixtures = lifecycleFixtures();
  assert.deepEqual(Object.keys(fixtures).sort(), [...cmsDocumentKinds].sort());
  const schema = `w12_lifecycle_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const { pool: routePoolInstance } = await import("@workspace/db") as { pool: PoolLike };
  const PoolConstructor = routePoolInstance.constructor as unknown as new (options: {
    connectionString: string;
  }) => PoolLike;
  const admin = new PoolConstructor({ connectionString: originalDatabaseUrl });
  let routePool: PoolLike | undefined;
  let server: ReturnType<Awaited<typeof import("../src/app.ts")>["default"]["listen"]> | undefined;
  const userId = randomUUID();
    const reviewerId = randomUUID();
  const token = randomUUID();
    const reviewerToken = randomUUID();
  const now = new Date();

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await clonePublicTables(admin, schema);
    await admin.query(`SET search_path TO "${schema}", public`);
    const schemaReady = await admin.query<{ ready: boolean }>(
      `SELECT to_regclass('cms_documents') IS NOT NULL
         AND to_regclass('cms_revisions') IS NOT NULL
         AND to_regclass('cms_media_versions') IS NOT NULL AS ready`,
    );
    if (!schemaReady.rows[0]?.ready) {
      t.skip("DATABASE_URL does not contain the CMS lifecycle tables");
      return;
    }
    await applyTask345Migrations(admin);
    await installIsolatedTriggers(admin, schema);
    const completeSchema = await admin.query<{ ready: boolean }>(
      `SELECT to_regclass('cms_review_requests') IS NOT NULL
         AND to_regclass('cms_revision_accuracy_confirmations') IS NOT NULL
         AND to_regclass('cms_user_capability_grants') IS NOT NULL
          AND to_regclass('cms_user_capability_configurations') IS NOT NULL
          AND to_regclass('cms_legacy_administrator_market_snapshots') IS NOT NULL AS ready`,
    );
    if (!completeSchema.rows[0]?.ready) {
      t.skip("DATABASE_URL does not contain the complete Task 345 review/capability schema");
      return;
    }
    await admin.query(
      `INSERT INTO market_editions
         (id,code,display_name,default_locale,fallback_market_code,fallback_locale,enabled,is_canonical)
       VALUES ($1,'uae','United Arab Emirates','en',NULL,NULL,true,true)`,
      [randomUUID()],
    );
    await admin.query(
      `INSERT INTO cms_users(id,email,display_name,role,status)
       VALUES ($1,$2,'W12 PostgreSQL lifecycle administrator','administrator','active')`,
      [userId, `${schema}@example.com`],
    );
    await admin.query(
      `INSERT INTO cms_users(id,email,display_name,role,status)
       VALUES ($1,$2,'W12 PostgreSQL lifecycle reviewer','publisher','active')`,
      [reviewerId, `${schema}.reviewer@example.com`],
    );
    await admin.query(
      `INSERT INTO cms_user_market_assignments(user_id,market_code)
       VALUES ($1,'uae')`,
      [reviewerId],
    );
    await admin.query(
      `INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at)
       VALUES ($1,'w12-fixture',1,now()),($2,'w12-fixture',1,now())`,
      [userId, reviewerId],
    );
    await admin.query(
      `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
       VALUES ($1,$2,now(),now()+interval '1 hour')`,
      [userId, (await import("../src/lib/security.ts")).hashToken(token)],
    );
    await admin.query(
      `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
       VALUES ($1,$2,now(),now()+interval '1 hour')`,
      [reviewerId, (await import("../src/lib/security.ts")).hashToken(reviewerToken)],
    );
    await seedLifecycleMedia(admin, userId, fixtures);

    routePoolInstance.options.connectionString = withSearchPath(originalDatabaseUrl, schema);
    process.env.DATABASE_URL = routePoolInstance.options.connectionString;
    process.env.SESSION_SECRET = "w12-postgres-lifecycle-session-secret";
    const [{ default: app }, auth, security] = await Promise.all([
      import("../src/app.ts"),
      import("../src/lib/auth.ts"),
      import("../src/lib/security.ts"),
    ]);
    routePool = routePoolInstance;
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const sessionHeaders = (sessionToken: string) => {
      const csrf = auth.csrfForSession(security.hashToken(sessionToken));
      return {
        "content-type": "application/json",
        origin,
        "x-csrf-token": csrf,
        cookie: `${auth.SESSION_COOKIE}=${sessionToken}; ${auth.CSRF_COOKIE}=${csrf}`,
      };
    };
    const requestAs = (
      sessionToken: string,
      path: string,
      method: "GET" | "POST" | "PATCH" | "DELETE",
      body?: Record<string, unknown>,
    ) =>
      fetch(`${origin}${path}`, {
        method,
        headers: sessionHeaders(sessionToken),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const request = (path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>) =>
      requestAs(token, path, method, body);
    const reviewerRequest = (
      path: string,
      method: "GET" | "POST" | "PATCH" | "DELETE",
      body?: Record<string, unknown>,
    ) => requestAs(reviewerToken, path, method, body);
    const expectStatus = async (response: Response, expected: number, label: string) => {
      const text = await response.text();
      assert.equal(response.status, expected, `${label}: ${text}`);
      return text;
    };
    const expectJson = async <T>(response: Response, expected: number, label: string): Promise<T> => {
      const text = await expectStatus(response, expected, label);
      return JSON.parse(text) as T;
    };

    for (const kind of cmsDocumentKinds) {
      const fixture = fixtures[kind];
      const eligibleCreate = await request("/api/documents", "POST", {
        kind,
        slug: `${fixture.slug}-eligible`,
        title: `${fixture.title} eligible`,
        content: fixture.content,
        markets: ["uae"],
      });
      const eligible = await expectJson<{ id: string }>(eligibleCreate, 201, `${kind} eligible create`);
      const eligibleDelete = await request(`/api/documents/${eligible.id}`, "DELETE");
      await expectStatus(eligibleDelete, 204, `${kind} never-published documents should be deletable`);

      const create = await request("/api/documents", "POST", {
        kind,
        slug: fixture.slug,
        title: fixture.title,
        content: fixture.content,
        markets: ["uae"],
      });
      const created = await expectJson<{ id: string; currentRevisionId: string; revisionNumber: number }>(
        create,
        201,
        `${kind} create`,
      );
      const documentId = created.id;
      const revisionId = created.currentRevisionId;
      assert.equal(created.revisionNumber, 1);

      const accuracy = await request(
        `/api/documents/${documentId}/revisions/${revisionId}/accuracy-confirmation`,
        "POST",
      );
      await expectStatus(accuracy, 200, `${kind} exact revision accuracy confirmation`);
      const submit = await request(`/api/documents/${documentId}/submit`, "POST", {
        revisionId,
      });
      await expectStatus(submit, 200, `${kind} submit`);
      const requestedReview = await admin.query<{ id: string; reviewer_user_id: string; status: string }>(
        `SELECT id::text id,reviewer_user_id::text,status
           FROM cms_review_requests
          WHERE revision_id=$1
          ORDER BY requested_at DESC,id DESC
          LIMIT 1`,
        [revisionId],
      );
      assert.equal(requestedReview.rows[0]?.reviewer_user_id, reviewerId);
      assert.equal(requestedReview.rows[0]?.status, "requested");
      const rejected = await reviewerRequest(
        `/api/editorial-work/review-requests/${requestedReview.rows[0]!.id}/decision`,
        "POST",
        { decision: "rejected", note: "W12 rejection round trip" },
      );
      await expectStatus(rejected, 200, `${kind} reject`);
      const rejectedState = await admin.query<{ workflow_state: string }>(
        `SELECT workflow_state FROM cms_revisions WHERE id=$1`,
        [revisionId],
      );
      assert.equal(rejectedState.rows[0]?.workflow_state, "rejected");
      const reviewComment = await admin.query<{ count: string }>(
        `SELECT count(*)::text count FROM cms_review_comments WHERE revision_id=$1`,
        [revisionId],
      );
      assert.equal(reviewComment.rows[0]?.count, "1");

      const resubmit = await request(`/api/documents/${documentId}/submit`, "POST", { revisionId });
      await expectStatus(resubmit, 200, `${kind} resubmit`);
      const approvedReview = await admin.query<{ id: string; reviewer_user_id: string; status: string }>(
        `SELECT id::text id,reviewer_user_id::text,status
           FROM cms_review_requests
          WHERE revision_id=$1
          ORDER BY requested_at DESC,id DESC
          LIMIT 1`,
        [revisionId],
      );
      assert.equal(approvedReview.rows[0]?.reviewer_user_id, reviewerId);
      assert.equal(approvedReview.rows[0]?.status, "requested");
      const approval = await reviewerRequest(
        `/api/editorial-work/review-requests/${approvedReview.rows[0]!.id}/decision`,
        "POST",
        { decision: "approved" },
      );
      await expectStatus(approval, 200, `${kind} approve`);
      const availabilityReview = await reviewerRequest(`/api/documents/${documentId}/availability/review`, "POST", {
        version: 1,
      });
      await expectStatus(availabilityReview, 200, `${kind} destination review`);
      const reviewedState = await admin.query<{
        reviewed_version: number | null;
        reviewed_source_revision_id: string | null;
      }>(
        `SELECT reviewed_version,reviewed_source_revision_id::text
           FROM cms_document_availability_states WHERE document_id=$1`,
        [documentId],
      );
      assert.equal(reviewedState.rows[0]?.reviewed_version, 1);
      assert.equal(reviewedState.rows[0]?.reviewed_source_revision_id, revisionId);
      const publish = await request(`/api/documents/${documentId}/publish`, "POST", {
        revisionId,
        availabilityVersion: 1,
      });
      await expectStatus(publish, 200, `${kind} publish`);

      const published = await admin.query<{
        published_revision_id: string;
        workflow_state: string;
        public_title: string;
        public_payload: Record<string, unknown>;
        media_version_id: string | null;
        field_path: string | null;
      }>(
        `SELECT e.published_revision_id::text,r.workflow_state,r.payload public_payload,
                r.payload->>'title' public_title,
                ref.media_version_id::text,ref.field_path
           FROM cms_market_editions e
           JOIN cms_revisions r ON r.id=e.published_revision_id
           LEFT JOIN cms_media_references ref
             ON ref.document_id=e.document_id AND ref.field_path=$2
          WHERE e.document_id=$1 AND e.market='uae' AND e.locale='en'`,
        [documentId, `revision:${revisionId}`],
      );
      assert.equal(published.rows[0]?.published_revision_id, revisionId);
      assert.equal(published.rows[0]?.workflow_state, "approved");
      assert.equal(published.rows[0]?.public_title, fixture.title);
      const initialPins = published.rows
        .filter((row) => row.field_path)
        .map((row) => row.media_version_id)
        .sort();
      const fixturePins = [...new Set(collectCmsMediaReferences(kind, fixture.content)
        .map((reference) => reference.mediaVersionId)
        .filter((version): version is string => Boolean(version)))]
        .sort();
      assert.deepEqual(initialPins, fixturePins, `${kind} publish must pin every selected media version`);

      const successor = await request(`/api/documents/${documentId}`, "PATCH", {
        market: "uae",
        locale: "en",
        revisionNumber: 1,
        expectedRevisionId: revisionId,
        title: `${fixture.title} successor`,
        content: fixture.content,
      });
      const savedSuccessor = await expectJson<{ currentRevisionId: string; revisionNumber: number }>(
        successor,
        200,
        `${kind} successor save`,
      );
      assert.equal(savedSuccessor.revisionNumber, 2);
      assert.notEqual(savedSuccessor.currentRevisionId, revisionId);
      const publicAfterSave = await admin.query<{
        published_revision_id: string;
        publication_state: string;
        public_title: string;
        public_media_version_id: string | null;
      }>(
        `SELECT e.published_revision_id::text,e.publication_state,
                public_revision.payload->>'title' public_title,
                ref.media_version_id::text public_media_version_id
           FROM cms_market_editions e
           JOIN cms_revisions public_revision ON public_revision.id=e.published_revision_id
           LEFT JOIN cms_media_references ref
             ON ref.document_id=e.document_id AND ref.field_path=$2
          WHERE e.document_id=$1 AND e.market='uae' AND e.locale='en'`,
        [documentId, `revision:${revisionId}`],
      );
      assert.equal(publicAfterSave.rows[0]?.published_revision_id, revisionId);
      assert.equal(publicAfterSave.rows[0]?.publication_state, "published");
      assert.equal(publicAfterSave.rows[0]?.public_title, fixture.title);
      assert.deepEqual(
        publicAfterSave.rows.map((row) => row.public_media_version_id).filter(Boolean).sort(),
        fixturePins,
        `${kind} successor draft must not replace public immutable media pins`,
      );

      const archive = await request(`/api/documents/${documentId}/archive`, "POST", {
        market: "uae",
        locale: "en",
        reason: "W12 archive",
      });
      await expectStatus(archive, 200, `${kind} archive`);
      const archivedState = await admin.query<{ publication_state: string }>(
        `SELECT publication_state FROM cms_market_editions WHERE document_id=$1`,
        [documentId],
      );
      assert.equal(archivedState.rows[0]?.publication_state, "archived");

      const restore = await request(`/api/documents/${documentId}/restore`, "POST", {
        market: "uae",
        locale: "en",
      });
      await expectStatus(restore, 200, `${kind} restore`);
      const restoredState = await admin.query<{
        publication_state: string; published_revision_id: string; restored_revision_id: string;
        restored_payload: Record<string, unknown>; restored_workflow_state: string;
      }>(
        `SELECT e.publication_state,e.published_revision_id::text,
                restored.id::text restored_revision_id,restored.payload restored_payload,
                restored.workflow_state restored_workflow_state
           FROM cms_market_editions e
           JOIN LATERAL (
             SELECT id,payload,workflow_state FROM cms_revisions
              WHERE edition_id=e.id ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
           ) restored ON true
          WHERE e.document_id=$1`,
        [documentId],
      );
      assert.equal(restoredState.rows[0]?.publication_state, "draft");
      assert.equal(restoredState.rows[0]?.published_revision_id, revisionId);
      assert.notEqual(restoredState.rows[0]?.restored_revision_id, revisionId);
      assert.equal(restoredState.rows[0]?.restored_workflow_state, "draft");
      assert.deepEqual(
        restoredState.rows[0]?.restored_payload,
        published.rows[0]?.public_payload,
        `${kind} restore must clone the exact approved public snapshot, not the newer successor draft`,
      );
      const restoredPins = await admin.query<{ media_version_id: string }>(
        `SELECT media_version_id::text FROM cms_media_references
          WHERE document_id=$1 AND field_path=$2 ORDER BY media_version_id`,
        [documentId, `revision:${restoredState.rows[0]?.restored_revision_id}`],
      );
      assert.deepEqual(
        restoredPins.rows.map((row) => row.media_version_id),
        fixturePins,
        `${kind} restored draft must copy the exact approved immutable media pins`,
      );
      const publicAfterRestore = await expectJson<{ items: Array<{ id: string }> }>(await request(
        `/api/public/content?market=uae&locale=en&kind=${encodeURIComponent(kind)}`,
        "GET",
      ), 200, `${kind} archived restore public response`);
      assert.equal(
        publicAfterRestore.items.some((item) => item.id === documentId),
        false,
        `${kind} archived restore must not reactivate public eligibility`,
      );

      const rollback = await request(`/api/documents/${documentId}/rollback`, "POST", {
        revisionId,
        note: "W12 rollback",
      });
      const rolledBack = await expectJson<{
        revisionNumber: number;
        content: Record<string, unknown>;
        currentRevisionId: string;
      }>(rollback, 200, `${kind} rollback`);
      assert.equal(
        rolledBack.revisionNumber,
        4,
        `${kind} rollback follows the explicit restore draft rather than treating restore as a no-op`,
      );
      assert.deepEqual(rolledBack.content, fixture.content);
      assert.notEqual(rolledBack.currentRevisionId, revisionId);

      const protectedDelete = await request(`/api/documents/${documentId}`, "DELETE");
      await expectStatus(protectedDelete, 409, `${kind} publication history must prevent deletion`);
      const survivor = await admin.query<{ count: string }>(
        "SELECT count(*)::text count FROM cms_documents WHERE id=$1",
        [documentId],
      );
      assert.equal(survivor.rows[0]?.count, "1");
    }
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()),
      );
    }
    if (routePool) await routePool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSessionSecret;
  }
});