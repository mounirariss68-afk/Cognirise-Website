import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";
import {
  HOMEPAGE_PATH,
  HOMEPAGE_SOURCE_KEY,
  ensureHomepageIdentity,
  loadCompiledHomepage,
  overlayHomepageSlots,
  planHomepageDraftReconciliation,
} from "./homepage-reconciliation.js";

test("missing homepage identities are seeded as draft only and replay without writes", async () => {
  let exists = false;
  const writes: string[] = [];
  const client = { query: async (sql: string) => {
    if (sql.includes("pg_advisory")) return { rowCount: 1, rows: [{}] };
    if (sql.startsWith("SELECT id::text")) return { rowCount: exists ? 1 : 0, rows: exists ? [{ id: "home", kind: "landing-page", status: "active" }] : [] };
    if (sql.includes("INSERT INTO cms_documents")) {
      writes.push(sql);
      return { rowCount: 1, rows: [{ id: "home", kind: "landing-page", status: "active" }] };
    }
    if (sql.includes("SELECT document_id")) return { rowCount: exists ? 1 : 0, rows: exists ? [{ document_id: "home", localized_slug: "homepage" }] : [] };
    if (sql.includes("INSERT INTO cms_market_editions")) {
      writes.push(sql); exists = true;
      return { rowCount: 1, rows: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  } };
  await ensureHomepageIdentity(client);
  assert.equal(writes.length, 2);
  assert.match(writes[1], /'draft','none',false/);
  await ensureHomepageIdentity(client);
  assert.equal(writes.length, 2);
});

test("homepage identity seed refuses a route owned by another document", async () => {
  await assert.rejects(ensureHomepageIdentity({ query: async (sql) => {
    if (sql.includes("pg_advisory")) return { rowCount: 1, rows: [{}] };
    if (sql.startsWith("SELECT id::text")) return { rowCount: 1, rows: [{ id: "home", kind: "landing-page", status: "active" }] };
    if (sql.includes("SELECT document_id")) return { rowCount: 1, rows: [{ document_id: "other", localized_slug: "homepage" }] };
    throw new Error("Unexpected write");
  } }), /Conflicting UAE\/English homepage route/);
});

test("generated homepage authority is the root page and includes the Task 330 slots", async () => {
  const snapshot = await loadCompiledHomepage();
  assert.equal(snapshot.content.pagePath, HOMEPAGE_PATH);
  const sections = snapshot.content.sections as Array<Record<string, any>>;
  assert.equal(sections.length, 56);
  assert.deepEqual(
    sections
      .filter((section) => String(section.id).startsWith("home-framework-"))
      .map((section) => section.id),
    [
      "home-framework-authority-cta",
      "home-framework-idao-cta",
      "home-framework-portfolio-cta",
    ],
  );
  assert.deepEqual(
    sections
      .filter((section) => String(section.id).startsWith("home-image-ledger-") && String(section.id).endsWith("-cta"))
      .map((section) => section.id),
    [
      "home-image-ledger-first-cta",
      "home-image-ledger-second-cta",
      "home-image-ledger-third-cta",
    ],
  );
  assert.equal(
    sections.find((section) => section.id === "home-image-ledger-first-caption")?.body?.[0]?.text,
    "Boundaries you control.",
  );
  assert.equal(HOMEPAGE_SOURCE_KEY, "compiled:/");
});

test("homepage reconciliation overlays an immutable published authority", async () => {
  const generated = await loadCompiledHomepage();
  const baseline = structuredClone(generated);
  baseline.summary = "A custom approved homepage summary.";
  baseline.mediaIds = ["00000000-0000-4000-8000-000000000001"];
  const media = baseline.content.sections.find((section: Record<string, any>) => section.id === "home-governance-visual");
  assert.ok(media);
  media.type = "media";
  media.references = [{
    mediaId: "00000000-0000-4000-8000-000000000001",
    mediaVersionId: "10000000-0000-4000-8000-000000000001",
    role: "background",
    altText: "Approved regional governance visual",
  }];
  delete media.sourcePath;
  delete media.altText;
  delete media.ownership;
  delete media.resolution;
  const authority = baseline.content.sections.find((section: Record<string, any>) => section.id === "home-framework-authority-cta");
  assert.ok(authority);
  authority.label = "Custom authority route";
  authority.order = 24;
  baseline.content.sections = baseline.content.sections.filter(
    (section: Record<string, any>) => ![
      "home-framework-portfolio-cta",
      "home-image-ledger-first-cta",
      "home-image-ledger-second-cta",
      "home-image-ledger-third-cta",
    ].includes(section.id),
  );
  baseline.content.sections.push({
    type: "narrative",
    id: "home-framework-title",
    order: 100,
    body: [{ type: "paragraph", text: "Legacy banner copy" }],
  });
  const caption = baseline.content.sections.find((section: Record<string, any>) => section.id === "home-image-ledger-first-caption");
  assert.ok(caption);
  caption.body = [{ type: "paragraph", text: "Regional boundary language." }];

  const overlay = overlayHomepageSlots(baseline, generated);
  assert.equal(overlay.snapshot.summary, baseline.summary);
  assert.deepEqual(overlay.snapshot.mediaIds, ["00000000-0000-4000-8000-000000000001"]);
  assert.deepEqual(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "home-governance-visual"),
    media,
  );
  assert.equal(
    overlay.snapshot.content.sections.some((section: Record<string, any>) => section.id === "home-framework-title"),
    false,
  );
  assert.equal(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "home-framework-authority-cta")?.label,
    "Custom authority route",
  );
  assert.equal(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "home-image-ledger-first-caption")?.body?.[0]?.text,
    "Regional boundary language.",
  );
  assert.ok(overlay.customizedSlots.includes("home-framework-authority-cta"));
  assert.ok(overlay.customizedSlots.includes("home-image-ledger-first-caption"));
  assert.ok(overlay.addedSlots.includes("home-framework-portfolio-cta"));
  assert.ok(overlay.addedSlots.includes("home-image-ledger-third-cta"));
  assert.equal(
    new Set(overlay.snapshot.content.sections.map((section: Record<string, any>) => section.order)).size,
    overlay.snapshot.content.sections.length,
  );
  const validation = validateCmsSnapshot("landing-page", overlay.snapshot, "draft");
  assert.equal(validation.success, true, validation.success ? undefined : validation.errors.join("; "));

  const plan = planHomepageDraftReconciliation({
    compiledPayload: { version: "old-generated" },
    generatedPayload: generated,
    latestPayload: baseline,
    latestRevisionId: "published-revision",
    latestWorkflowState: "approved",
    publishedRevisionId: "published-revision",
  });
  assert.equal(plan.action, "append-draft");
});

test("homepage reconciliation overlays an unpublished current editorial baseline", async () => {
  const generated = await loadCompiledHomepage();
  const baseline = structuredClone(generated);
  baseline.content.sections.find((section: Record<string, any>) => section.id === "home-image-ledger-first-caption").body = [
    { type: "paragraph", text: "Current editorial caption." },
  ];
  baseline.content.sections = baseline.content.sections.filter(
    (section: Record<string, any>) => section.id !== "home-image-ledger-third-cta",
  );
  const plan = planHomepageDraftReconciliation({
    compiledPayload: { version: "old-generated" },
    generatedPayload: generated,
    latestPayload: baseline,
    latestRevisionId: "draft-revision",
    latestWorkflowState: "draft",
    publishedRevisionId: "published-revision",
  });
  assert.equal(plan.action, "append-draft");
});

test("homepage reconciliation reports an in-review draft without blocking post-merge", async () => {
  const generated = await loadCompiledHomepage();
  const plan = planHomepageDraftReconciliation({
    compiledPayload: { version: "old-generated" },
    generatedPayload: generated,
    latestPayload: generated,
    latestRevisionId: "review-revision",
    latestWorkflowState: "in-review",
    publishedRevisionId: "published-revision",
  });
  assert.equal(plan.action, "report-conflict");
});

test("homepage reconciliation has no publication or regional broad-write path", async () => {
  const source = await readFile(new URL("./homepage-reconciliation.ts", import.meta.url), "utf8");
  assert.match(source, /market='uae' AND e\.locale='en'/);
  assert.match(source, /INSERT INTO cms_revisions/);
  assert.equal(source.match(/JSON\.stringify\(migrationVisualSources\(generated\)\)/g)?.length, 2);
  assert.match(source, /publishedRevisionId/);
  assert.doesNotMatch(source, /UPDATE cms_revisions|DELETE FROM cms_revisions/);
  assert.doesNotMatch(source, /SET[^;]*published_revision_id/);
  assert.doesNotMatch(source, /market=ANY|UPDATE cms_market_editions/);
  assert.doesNotMatch(source, /LEFT JOIN LATERAL/);
  const editionLock = source.indexOf("FOR UPDATE OF d,e");
  const latestRevisionQuery = source.indexOf("SELECT id::text latest_revision_id");
  assert.ok(editionLock !== -1 && latestRevisionQuery > editionLock, "latest revision is read after the edition lock");
});