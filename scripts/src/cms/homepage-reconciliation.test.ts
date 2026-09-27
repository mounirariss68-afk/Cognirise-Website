import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCmsSnapshot, validateCmsSnapshotForDelivery } from "@workspace/api-zod";
import {
  HOMEPAGE_HEADLINE_TEXT,
  HOMEPAGE_LEGACY_HEADLINE,
  HOMEPAGE_NARRATIVE_FIELD,
  HOMEPAGE_OFFICE_CITIES_SLOT,
  HOMEPAGE_RECEIPT,
  HOMEPAGE_SERVICE_LABEL_TEXT,
  HOMEPAGE_PATH,
  HOMEPAGE_SOURCE_KEY,
  LEGACY_HOMEPAGE_RECEIPTS,
  ensureHomepageIdentity,
  loadCompiledHomepage,
  normalizeHomepageRevisionId,
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

test("generated homepage authority is the root page with its current CTA and office-list slots", async () => {
  const snapshot = await loadCompiledHomepage();
  assert.equal(snapshot.content.pagePath, HOMEPAGE_PATH);
  assert.equal(snapshot.content.narrative, HOMEPAGE_HEADLINE_TEXT);
  const sections = snapshot.content.sections as Array<Record<string, any>>;
  assert.ok(sections.length > 0);
  assert.deepEqual(
    sections
      .filter((section) => ["home-convergence-cta", "home-start-cta"].includes(section.id))
      .map((section) => section.id)
      .sort(),
    ["home-convergence-cta", "home-start-cta"],
  );
  assert.ok(sections.every((section) =>
    !["home-framework-authority-cta", "home-framework-idao-cta", "home-framework-portfolio-cta"].includes(section.id),
  ));
  const officeCities = sections.find((section) => section.id === HOMEPAGE_OFFICE_CITIES_SLOT);
  assert.equal(officeCities?.type, "narrative");
  assert.equal(officeCities?.body?.length, 1);
  assert.equal(officeCities?.body?.[0]?.type, "list");
  assert.ok(officeCities?.body?.[0]?.items.length > 0);
  assert.equal(HOMEPAGE_SOURCE_KEY, "compiled:/");
});

test("generated homepage carries the Task 338 headline and service label without retired families", async () => {
  const snapshot = await loadCompiledHomepage();
  const sections = snapshot.content.sections as Array<Record<string, any>>;
  assert.equal(
    sections.find((section) => section.id === "hero")?.heading,
    HOMEPAGE_HEADLINE_TEXT,
  );
  assert.equal(
    sections.find((section) => section.id === "home-service-label")?.body?.[0]?.text,
    HOMEPAGE_SERVICE_LABEL_TEXT,
  );
  assert.ok(sections.every((section) =>
    !String(section.id).startsWith("home-firm-")
    && !String(section.id).startsWith("home-clarity-"),
  ));
});

test("legacy published homepage delivery tolerates only a missing office list", async () => {
  const generated = await loadCompiledHomepage();
  const published = structuredClone(generated);
  const officeCities = published.content.sections.find(
    (section: Record<string, any>) => section.id === HOMEPAGE_OFFICE_CITIES_SLOT,
  );
  assert.ok(officeCities);
  published.content.sections = published.content.sections.filter(
    (section: Record<string, any>) => section.id !== HOMEPAGE_OFFICE_CITIES_SLOT,
  );

  const visual = published.content.sections.find(
    (section: Record<string, any>) => section.id === "home-convergence-visual",
  );
  assert.ok(visual);
  visual.type = "media";
  visual.references = [{
    mediaId: "00000000-0000-4000-8000-000000000001",
    mediaVersionId: "10000000-0000-4000-8000-000000000001",
    role: "background",
    altText: "Approved convergence visual",
  }];
  delete visual.sourcePath;
  delete visual.altText;
  delete visual.ownership;
  delete visual.resolution;
  published.mediaIds = ["00000000-0000-4000-8000-000000000001"];

  const legacyDelivery = validateCmsSnapshotForDelivery("landing-page", published, "publish");
  assert.equal(legacyDelivery.success, true, legacyDelivery.success ? undefined : legacyDelivery.errors.join("; "));

  const currentRevision = structuredClone(published);
  currentRevision.content.sections.push(structuredClone(officeCities));
  const currentDelivery = validateCmsSnapshotForDelivery("landing-page", currentRevision, "publish");
  assert.equal(currentDelivery.success, true, currentDelivery.success ? undefined : currentDelivery.errors.join("; "));
  if (currentDelivery.success) {
    const deliveredOfficeCities = currentDelivery.data.content.sections.find(
      (section: Record<string, any>) => section.id === HOMEPAGE_OFFICE_CITIES_SLOT,
    ) as Record<string, any> | undefined;
    assert.deepEqual(deliveredOfficeCities?.body?.[0]?.items, officeCities.body[0].items);
  }

  const wrongTypeRevision = structuredClone(currentRevision);
  const officeIndex = wrongTypeRevision.content.sections.findIndex(
    (section: Record<string, any>) => section.id === HOMEPAGE_OFFICE_CITIES_SLOT,
  );
  wrongTypeRevision.content.sections[officeIndex] = {
    type: "cta",
    id: HOMEPAGE_OFFICE_CITIES_SLOT,
    order: officeCities.order,
    label: "Office cities",
    href: "mailto:support@cognirise.ai",
    style: "primary",
  };
  const wrongTypeValidation = validateCmsSnapshotForDelivery("landing-page", wrongTypeRevision, "publish");
  if (wrongTypeValidation.success) assert.fail("The office-city slot must retain its narrative type when present.");
  assert.ok(wrongTypeValidation.errors.some((error) => error.includes("home-office-cities") && error.includes("narrative")));

  const missingOtherRequiredSlot = structuredClone(currentRevision);
  missingOtherRequiredSlot.content.sections = missingOtherRequiredSlot.content.sections.filter(
    (section: Record<string, any>) => section.id !== "home-proof-model",
  );
  const otherRequiredValidation = validateCmsSnapshotForDelivery("landing-page", missingOtherRequiredSlot, "publish");
  if (otherRequiredValidation.success) assert.fail("Other generated homepage slots must remain required.");
  assert.ok(otherRequiredValidation.errors.some((error) => error.includes("required slot \"home-proof-model\"")));
});

test("homepage reconciliation overlays an immutable published authority", async () => {
  const generated = await loadCompiledHomepage();
  const baseline = structuredClone(generated);
  baseline.summary = "A custom approved homepage summary.";
  baseline.mediaIds = ["00000000-0000-4000-8000-000000000001"];
  const media = baseline.content.sections.find((section: Record<string, any>) => section.id === "home-convergence-visual");
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
  const authority = baseline.content.sections.find((section: Record<string, any>) => section.id === "home-convergence-cta");
  assert.ok(authority);
  authority.label = "Custom convergence route";
  authority.order = 24;
  baseline.content.sections.push({
    type: "narrative",
    id: "home-framework-title",
    order: 100,
    body: [{ type: "paragraph", text: "Legacy banner copy" }],
  });
  for (const [index, id] of [
    "home-framework-authority-cta",
    "home-framework-idao-cta",
    "home-framework-portfolio-cta",
  ].entries()) {
    baseline.content.sections.push({
      type: "cta",
      id,
      order: 101 + index,
      label: `Legacy ${id}`,
      href: "/methodologies",
    });
  }
  const oldPublishedBaseline = structuredClone(baseline);
  const overlay = overlayHomepageSlots(baseline, generated);
  assert.deepEqual(baseline, oldPublishedBaseline);
  assert.equal(overlay.snapshot.summary, baseline.summary);
  assert.deepEqual(overlay.snapshot.mediaIds, ["00000000-0000-4000-8000-000000000001"]);
  assert.deepEqual(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "home-convergence-visual"),
    media,
  );
  assert.equal(
    overlay.snapshot.content.sections.some((section: Record<string, any>) => section.id === "home-framework-title"),
    false,
  );
  assert.ok(overlay.snapshot.content.sections.every((section: Record<string, any>) =>
    !["home-framework-authority-cta", "home-framework-idao-cta", "home-framework-portfolio-cta"].includes(section.id)
    && !["home-governance-visual", "home-people-visual", "home-platform-visual"].includes(section.id),
  ));
  assert.equal(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "home-convergence-cta")?.label,
    "Custom convergence route",
  );
  assert.ok(overlay.customizedSlots.includes("home-convergence-cta"));
  assert.ok(!overlay.addedSlots.some((id) => id.startsWith("home-framework-")));
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

test("homepage reconciliation preserves an already-current editorial baseline without an unnecessary draft", async () => {
  const generated = await loadCompiledHomepage();
  const baseline = structuredClone(generated);
  const serviceHeading = baseline.content.sections.find(
    (section: Record<string, any>) => section.id === "home-service-heading",
  );
  assert.ok(serviceHeading);
  serviceHeading.body = [{ type: "paragraph", text: "Current editorial heading." }];
  const plan = planHomepageDraftReconciliation({
    compiledPayload: { version: "old-generated" },
    generatedPayload: generated,
    latestPayload: baseline,
    latestRevisionId: "draft-revision",
    latestWorkflowState: "draft",
    publishedRevisionId: "published-revision",
  });
  assert.equal(plan.action, "update-authority");
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

test("Task 338 updates only the requested copy and retires all firm and clarity slots", async () => {
  const legacy = await loadCompiledHomepage();
  legacy.content.narrative = HOMEPAGE_LEGACY_HEADLINE;
  const generated = structuredClone(legacy);
  generated.content.narrative = HOMEPAGE_HEADLINE_TEXT;
  const generatedHero = generated.content.sections.find(
    (section: Record<string, any>) => section.id === "hero",
  );
  const generatedServiceLabel = generated.content.sections.find(
    (section: Record<string, any>) => section.id === "home-service-label",
  );
  assert.ok(generatedHero);
  assert.ok(generatedServiceLabel);
  generatedHero.heading = HOMEPAGE_HEADLINE_TEXT;
  generatedServiceLabel.body = [{ type: "paragraph", text: HOMEPAGE_SERVICE_LABEL_TEXT }];

  const baseline = structuredClone(legacy);
  const unrelated = baseline.content.sections.find(
    (section: Record<string, any>) => section.id === "home-convergence-heading",
  );
  assert.ok(unrelated);
  unrelated.body = [{ type: "paragraph", text: "An unrelated editorial revision." }];
  const media = baseline.content.sections.find(
    (section: Record<string, any>) => section.id === "home-convergence-visual",
  );
  assert.ok(media);
  baseline.mediaIds = ["00000000-0000-4000-8000-000000000001"];
  media.type = "media";
  media.references = [{
    mediaId: "00000000-0000-4000-8000-000000000001",
    mediaVersionId: "10000000-0000-4000-8000-000000000001",
    role: "background",
    altText: "Editorially approved governance visual",
  }];
  delete media.sourcePath;
  delete media.ownership;
  delete media.resolution;

  const overlay = overlayHomepageSlots(baseline, generated, legacy);
  assert.equal(
    overlay.snapshot.content.narrative,
    HOMEPAGE_HEADLINE_TEXT,
  );
  assert.equal(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "hero")?.heading,
    HOMEPAGE_HEADLINE_TEXT,
  );
  assert.equal(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "home-service-label")?.body?.[0]?.text,
    HOMEPAGE_SERVICE_LABEL_TEXT,
  );
  assert.equal(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "home-convergence-heading")?.body?.[0]?.text,
    "An unrelated editorial revision.",
  );
  assert.deepEqual(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "home-convergence-visual"),
    media,
  );
  assert.ok(
    overlay.snapshot.content.sections.every(
      (section: Record<string, any>) =>
        !String(section.id).startsWith("home-firm-")
        && !String(section.id).startsWith("home-clarity-"),
    ),
  );
});

test("Task 437 copy delta updates exact generated predecessors and retires removed copy", async () => {
  const generated = await loadCompiledHomepage();
  const previousGenerated = structuredClone(generated);
  const byId = (id: string) => previousGenerated.content.sections.find(
    (section: Record<string, any>) => section.id === id,
  );
  const setBody = (id: string, text: string) => {
    const section = byId(id);
    assert.ok(section, `Missing prior generated slot ${id}`);
    section.body = [{ type: "paragraph", text }];
  };
  setBody(
    "hero",
    "Cognirise is the AI-native advisory and engineering firm. Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.",
  );
  setBody("home-proof-model", "Advisory + Engineering");
  setBody("home-proof-focus", "Complex enterprise & government");
  setBody("home-proof-platform", "CogniOS (Four native engines)");
  setBody("home-proof-presence", "Middle East & Europe");
  setBody("home-start-heading", "Ready for operational reality?");
  const previousConvergenceCta = byId("home-convergence-cta");
  const previousStartCta = byId("home-start-cta");
  assert.ok(previousConvergenceCta);
  assert.ok(previousStartCta);
  previousConvergenceCta.label = "Meet the team";
  previousConvergenceCta.href = "/about";
  previousStartCta.label = "Book a consultation";
  previousStartCta.href = "/contact";

  const baseline = structuredClone(previousGenerated);
  const nextOrder = Math.max(...baseline.content.sections.map(
    (section: Record<string, any>) => section.order,
  )) + 1;
  baseline.content.sections.push(
    { type: "narrative", id: "home-convergence-body", order: nextOrder, body: [{ type: "paragraph", text: "Old convergence body." }] },
    { type: "narrative", id: "home-start-body", order: nextOrder + 1, body: [{ type: "paragraph", text: "Old start body." }] },
    ...[
      "home-proof-model-label",
      "home-proof-focus-label",
      "home-proof-platform-label",
      "home-proof-presence-label",
    ].map((id, index) => ({
      type: "narrative",
      id,
      order: nextOrder + 2 + index,
      body: [{ type: "paragraph", text: "Legacy label." }],
    })),
  );
  const originalBaseline = structuredClone(baseline);

  const overlay = overlayHomepageSlots(baseline, generated, previousGenerated);
  const resultSection = (id: string) => overlay.snapshot.content.sections.find(
    (section: Record<string, any>) => section.id === id,
  );
  const generatedSection = (id: string) => generated.content.sections.find(
    (section: Record<string, any>) => section.id === id,
  );
  assert.deepEqual(baseline, originalBaseline);
  for (const id of ["hero", "home-proof-model", "home-proof-focus", "home-proof-platform", "home-proof-presence", "home-start-heading"]) {
    assert.deepEqual(resultSection(id)?.body, generatedSection(id)?.body);
  }
  assert.equal(
    resultSection("hero")?.body?.[0]?.text,
    "Cognirise is the AI-native advisory and engineering firm. Senior experts, forward-deployed engineers and governed agents move priority work from strategy into production.",
  );
  assert.deepEqual(
    Object.fromEntries(["home-proof-model", "home-proof-focus", "home-proof-platform", "home-proof-presence"].map(
      (id) => [id, resultSection(id)?.body?.[0]?.text],
    )),
    {
      "home-proof-model": "No long pilots. Prototype in 48 hours.",
      "home-proof-focus": "We don’t bill mandays. We deliver outcomes.",
      "home-proof-platform": "We don’t build Power Points. We build working solutions",
      "home-proof-presence": "No vendor lock-in. You own the platform.",
    },
  );
  assert.equal(resultSection("home-start-heading")?.body?.[0]?.text, "Ready for a change?");
  for (const id of ["home-convergence-cta", "home-start-cta"]) {
    assert.equal(resultSection(id)?.label, generatedSection(id)?.label);
    assert.equal(resultSection(id)?.label, id === "home-convergence-cta" ? "Book a 48-hour prototype" : "Talk to us");
    assert.equal(resultSection(id)?.href, "mailto:support@cognirise.ai");
  }
  const retiredProofLabels = [
    "home-proof-model-label",
    "home-proof-focus-label",
    "home-proof-platform-label",
    "home-proof-presence-label",
  ];
  assert.ok(overlay.snapshot.content.sections.every((section: Record<string, any>) =>
    !["home-convergence-body", "home-start-body"].includes(section.id)
    && !retiredProofLabels.includes(section.id),
  ));
});

test("Task 437 copy delta preserves editorial overrides for all targeted values", async () => {
  const generated = await loadCompiledHomepage();
  const previousGenerated = structuredClone(generated);
  const previousById = (id: string) => previousGenerated.content.sections.find(
    (section: Record<string, any>) => section.id === id,
  );
  const setPriorBody = (id: string, text: string) => {
    const section = previousById(id);
    assert.ok(section);
    section.body = [{ type: "paragraph", text }];
  };
  setPriorBody(
    "hero",
    "Cognirise is the AI-native advisory and engineering firm. Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.",
  );
  setPriorBody("home-proof-model", "Advisory + Engineering");
  setPriorBody("home-proof-focus", "Complex enterprise & government");
  setPriorBody("home-proof-platform", "CogniOS (Four native engines)");
  setPriorBody("home-proof-presence", "Middle East & Europe");
  setPriorBody("home-start-heading", "Ready for operational reality?");
  for (const [id, label, href] of [
    ["home-convergence-cta", "Meet the team", "/about"],
    ["home-start-cta", "Book a consultation", "/contact"],
  ]) {
    const cta = previousById(id);
    assert.ok(cta);
    cta.label = label;
    cta.href = href;
  }

  const baseline = structuredClone(previousGenerated);
  const customText = new Map([
    ["hero", "A locally approved hero body."],
    ["home-proof-model", "A locally approved model proof."],
    ["home-proof-focus", "A locally approved focus proof."],
    ["home-proof-platform", "A locally approved platform proof."],
    ["home-proof-presence", "A locally approved presence proof."],
    ["home-start-heading", "A locally approved start heading."],
  ]);
  for (const [id, text] of customText) {
    const section = baseline.content.sections.find((item: Record<string, any>) => item.id === id);
    assert.ok(section);
    section.body = [{ type: "paragraph", text }];
  }
  const convergenceCta = baseline.content.sections.find(
    (item: Record<string, any>) => item.id === "home-convergence-cta",
  );
  const startCta = baseline.content.sections.find(
    (item: Record<string, any>) => item.id === "home-start-cta",
  );
  assert.ok(convergenceCta);
  assert.ok(startCta);
  convergenceCta.label = "Custom convergence label";
  startCta.href = "/custom-contact";

  const overlay = overlayHomepageSlots(baseline, generated, previousGenerated);
  for (const [id, text] of customText) {
    assert.equal(
      overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === id)?.body?.[0]?.text,
      text,
    );
    assert.ok(overlay.customizedSlots.includes(id));
  }
  const resultConvergenceCta = overlay.snapshot.content.sections.find(
    (section: Record<string, any>) => section.id === "home-convergence-cta",
  );
  const resultStartCta = overlay.snapshot.content.sections.find(
    (section: Record<string, any>) => section.id === "home-start-cta",
  );
  assert.equal(resultConvergenceCta?.label, "Custom convergence label");
  assert.equal(
    resultConvergenceCta?.href,
    generated.content.sections.find((section: Record<string, any>) => section.id === "home-convergence-cta")?.href,
  );
  assert.equal(
    resultStartCta?.label,
    generated.content.sections.find((section: Record<string, any>) => section.id === "home-start-cta")?.label,
  );
  assert.equal(resultStartCta?.href, "/custom-contact");
  assert.ok(overlay.customizedSlots.includes("home-convergence-cta"));
  assert.ok(overlay.customizedSlots.includes("home-start-cta"));
});

test("Task 437 reconciliation uses a receipt namespace separate from Task 338", () => {
  assert.equal(HOMEPAGE_RECEIPT, "cms-homepage-task-437-v1:draft");
  assert.ok(LEGACY_HOMEPAGE_RECEIPTS.includes("cms-homepage-task-338-v2:draft"));
  assert.ok(!LEGACY_HOMEPAGE_RECEIPTS.some((receipt) => receipt === HOMEPAGE_RECEIPT));
});

test("Task 338 preserves a customized targeted value instead of overwriting it", async () => {
  const legacy = await loadCompiledHomepage();
  const generated = structuredClone(legacy);
  const baseline = structuredClone(legacy);
  baseline.content.narrative = "A customized editorial narrative.";
  generated.content.narrative = HOMEPAGE_HEADLINE_TEXT;
  generated.content.sections.find((section: Record<string, any>) => section.id === "hero").heading =
    HOMEPAGE_HEADLINE_TEXT;
  baseline.content.sections.find((section: Record<string, any>) => section.id === "hero").heading =
    "A customized editorial headline.";
  const overlay = overlayHomepageSlots(baseline, generated, legacy);
  assert.equal(overlay.snapshot.content.narrative, "A customized editorial narrative.");
  assert.equal(
    overlay.snapshot.content.sections.find((section: Record<string, any>) => section.id === "hero").heading,
    "A customized editorial headline.",
  );
  assert.ok(overlay.customizedSlots.includes("hero"));
  assert.ok(overlay.customizedSlots.includes(HOMEPAGE_NARRATIVE_FIELD));
});

test("homepage reconciliation retires removed sections in drafts and preserves published snapshots", async () => {
  const generated = await loadCompiledHomepage();
  const baseline = structuredClone(generated);
  const nextOrder = Math.max(...baseline.content.sections.map((section: Record<string, any>) => section.order)) + 1;
  const legacyRetiredSections = [
    { type: "narrative", id: "home-service-body", body: [{ type: "paragraph", text: "Legacy service introduction." }] },
    { type: "narrative", id: "home-image-ledger-heading", body: [{ type: "paragraph", text: "Legacy image-ledger heading." }] },
    ...["home-framework-authority-cta", "home-framework-idao-cta", "home-framework-portfolio-cta"].map((id) => ({
      type: "cta",
      id,
      label: `Legacy ${id}`,
      href: "/methodologies",
    })),
    ...["home-governance-visual", "home-people-visual", "home-platform-visual"].map((id) => ({
      type: "media",
      id,
      references: [{
        mediaId: "00000000-0000-4000-8000-000000000001",
        mediaVersionId: "10000000-0000-4000-8000-000000000001",
        role: "supporting",
      }],
    })),
  ];
  const existingIds = new Set(baseline.content.sections.map((section: Record<string, any>) => section.id));
  for (const section of legacyRetiredSections) {
    if (!existingIds.has(section.id)) {
      baseline.content.sections.push({ ...section, order: nextOrder + baseline.content.sections.length });
    }
  }
  const original = structuredClone(baseline);
  const overlay = overlayHomepageSlots(baseline, generated);

  assert.deepEqual(baseline, original);
  assert.ok(overlay.snapshot.content.sections.every((section: Record<string, any>) =>
    section.id !== "home-service-body"
    && !String(section.id).startsWith("home-image-ledger-")
    && !["home-framework-authority-cta", "home-framework-idao-cta", "home-framework-portfolio-cta"].includes(section.id)
    && !["home-governance-visual", "home-people-visual", "home-platform-visual"].includes(section.id),
  ));
  const plan = planHomepageDraftReconciliation({
    generatedPayload: generated,
    latestPayload: baseline,
    latestRevisionId: "published-revision",
    latestWorkflowState: "approved",
    publishedRevisionId: "published-revision",
  });
  assert.equal(plan.action, "append-draft");
});

test("homepage publication pointer normalization treats missing and null values equally", () => {
  assert.equal(normalizeHomepageRevisionId(undefined), null);
  assert.equal(normalizeHomepageRevisionId(null), null);
  assert.equal(normalizeHomepageRevisionId(""), null);
  assert.equal(normalizeHomepageRevisionId("published-revision"), "published-revision");
});

test("homepage reconciliation has no publication or regional broad-write path", async () => {
  const source = await readFile(new URL("./homepage-reconciliation.ts", import.meta.url), "utf8");
  assert.match(source, /market='uae' AND e\.locale='en'/);
  assert.match(source, /INSERT INTO cms_revisions/);
  assert.equal(source.match(/JSON\.stringify\(migrationVisualSources\(generated\)\)/g)?.length, 1);
  assert.match(source, /publishedRevisionId/);
  assert.match(source, /BEGIN READ ONLY/);
  assert.match(source, /Task 338/);
  assert.match(source, /normal editorial review and publication remain required/);
  assert.doesNotMatch(source, /UPDATE cms_revisions|DELETE FROM cms_revisions/);
  assert.doesNotMatch(source, /UPDATE cms_landing_page_reconciliation/);
  assert.doesNotMatch(source, /SET[^;]*published_revision_id/);
  assert.doesNotMatch(source, /market=ANY|UPDATE cms_market_editions/);
  assert.doesNotMatch(source, /LEFT JOIN LATERAL/);
  const editionLock = source.indexOf("FOR UPDATE OF d,e");
  const latestRevisionQuery = source.indexOf("SELECT id::text latest_revision_id", editionLock);
  assert.ok(editionLock !== -1 && latestRevisionQuery > editionLock, "latest revision is read after the edition lock");
});