import assert from "node:assert/strict";
import test from "node:test";
import {
  HISTORICAL_MOUNIR_RECOVERY,
  KNOWN_COMPILED_MOUNIR_VALUES,
  MOUNIR_EXTERNAL_ID,
  MOUNIR_LOCALE,
  MOUNIR_MARKET,
  MOUNIR_SLUG,
  HISTORICAL_MOUNIR_SOURCE,
  HISTORICAL_PEOPLE_ROSTER,
  LEGACY_PEOPLE_RECOVERY_REQUEST_DIGEST,
  PEOPLE_RECOVERY_KEY,
  planHistoricalMounirMerge,
  recoverPeople,
  recoveryReceiptAuthorityStatus,
  recoveryRequestDigest,
  validateRecoveryRevisionLineage,
} from "./people-recovery.js";

function snapshot(content: Record<string, unknown>) {
  return {
    slug: MOUNIR_SLUG,
    title: "Mounir Ariss",
    summary: "Newer summary remains untouched.",
    content: {
      schemaVersion: 1,
      role: "founder",
      title: "Newer title remains untouched",
      biography: "A newer biography remains untouched.",
      profileLinks: [],
      visibility: "public",
      order: 0,
      sources: [{ label: "CMS editorial source", accessedAt: "2026-09-11" }],
      relatedIds: [],
      ...content,
    },
    mediaIds: [],
    markets: [MOUNIR_MARKET],
  };
}

test("recovery authority is the exact historical Mounir biography and contribution", () => {
  assert.equal(
    HISTORICAL_MOUNIR_RECOVERY.biography,
    "Three decades helping enterprises across the region and beyond turn technology shifts into operating advantage. A career built on framing the decision architecture that makes enterprise-scale change possible, now focused entirely on the agentic enterprise.",
  );
  assert.equal(
    HISTORICAL_MOUNIR_RECOVERY.contribution,
    "The conviction that AI is an operating discipline, not a science experiment — grounded in thirty years of framing consequential transformation for the region's largest enterprises.",
  );
  assert.equal(HISTORICAL_MOUNIR_SOURCE.commit.length, 40);
  assert.equal(MOUNIR_EXTERNAL_ID, "person:8a0e78e95b87db8e0acd");
  assert.equal(PEOPLE_RECOVERY_KEY, `cms-people-history-recovery-v1:${MOUNIR_EXTERNAL_ID}`);
  assert.equal(recoveryRequestDigest().length, 64);
});

test("read-only authority includes the complete historical six-person roster", () => {
  assert.deepEqual(
    HISTORICAL_PEOPLE_ROSTER.map((person) => person.slug),
    [
      "mounir-ariss",
      "bulent-egrilmez",
      "hisham-nofal-phd",
      "alexis-lecanuet",
      "rami-aslan",
      "fadi-mattar",
    ],
  );
  assert.equal(new Set(HISTORICAL_PEOPLE_ROSTER.map((person) => person.contribution)).size, 6);
});

test("merge replaces only omitted historical fields", () => {
  const input = snapshot({
    contribution: KNOWN_COMPILED_MOUNIR_VALUES.contribution,
    biography: "",
    focusAreas: [{ title: "Newer focus", detail: "Newer focus detail" }],
  });
  const result = planHistoricalMounirMerge(input);
  assert.equal(result.decision, "apply");
  assert.deepEqual(result.changedFields, ["content.contribution", "content.biography"]);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.payload.summary, "Newer summary remains untouched.");
  assert.equal((result.payload.content as Record<string, unknown>).title, "Newer title remains untouched");
  assert.equal(
    (result.payload.content as Record<string, unknown>).contribution,
    HISTORICAL_MOUNIR_RECOVERY.contribution,
  );
  assert.deepEqual(
    (result.payload.content as Record<string, unknown>).focusAreas,
    (input.content as Record<string, unknown>).focusAreas,
  );
  assert.equal(
    (result.payload.content as Record<string, unknown>).biography,
    HISTORICAL_MOUNIR_RECOVERY.biography,
  );
});

test("merge is idempotent after exact recovery", () => {
  const input = snapshot({
    contribution: HISTORICAL_MOUNIR_RECOVERY.contribution,
    biography: HISTORICAL_MOUNIR_RECOVERY.biography,
  });
  const result = planHistoricalMounirMerge(input);
  assert.equal(result.decision, "already-current");
  assert.deepEqual(result.changedFields, []);
  assert.deepEqual(result.conflicts, []);
});

test("a normal successor remains valid when publication and availability evolve", () => {
  const revisions = [
    {
      id: "prior",
      editionId: "uae-en",
      sourceRevisionId: null,
      payload: snapshot({ contribution: KNOWN_COMPILED_MOUNIR_VALUES.contribution }),
    },
    {
      id: "recovery",
      editionId: "uae-en",
      sourceRevisionId: "prior",
      payload: snapshot({ contribution: HISTORICAL_MOUNIR_RECOVERY.contribution }),
    },
    {
      id: "successor",
      editionId: "uae-en",
      sourceRevisionId: "recovery",
      payload: snapshot({
        contribution: HISTORICAL_MOUNIR_RECOVERY.contribution,
        biography: "A normal newer CMS biography.",
      }),
    },
  ];
  const evolvedPublicationAndAvailability = {
    publicationState: "published",
    publishedRevisionId: "successor",
    publishedSourceRevisionId: "successor",
    availabilityDigest: "normal-post-recovery-evolution",
  };
  assert.equal(evolvedPublicationAndAvailability.publishedRevisionId, "successor");
  assert.deepEqual(
    validateRecoveryRevisionLineage(revisions, "uae-en", "recovery", "successor"),
    { valid: true, errors: [] },
  );
  const successorPlan = planHistoricalMounirMerge(revisions[2]!.payload);
  assert.equal(successorPlan.decision, "conflict");
  assert.deepEqual(successorPlan.conflicts.map((conflict) => conflict.field), ["content.biography"]);
  assert.equal(
    (revisions[2]!.payload.content as Record<string, unknown>).contribution,
    HISTORICAL_MOUNIR_RECOVERY.contribution,
  );
});

test("successor lineage and contribution changes remain blocking", () => {
  const recovered = {
    id: "recovery",
    editionId: "uae-en",
    sourceRevisionId: "prior",
    payload: snapshot({ contribution: HISTORICAL_MOUNIR_RECOVERY.contribution }),
  };
  const changedSuccessor = {
    id: "successor",
    editionId: "uae-en",
    sourceRevisionId: "recovery",
    payload: snapshot({ contribution: "A changed contribution must block recovery replay." }),
  };
  const changedPlan = planHistoricalMounirMerge(changedSuccessor.payload);
  assert.equal(changedPlan.decision, "conflict");
  assert.equal(changedPlan.conflicts.some((conflict) => conflict.field === "content.contribution"), true);
  assert.equal(
    validateRecoveryRevisionLineage([recovered, changedSuccessor], "uae-en", "recovery", "successor").valid,
    false,
  );
  assert.equal(
    validateRecoveryRevisionLineage([recovered, {
      ...changedSuccessor,
      sourceRevisionId: "missing-parent",
    }], "uae-en", "recovery", "successor").valid,
    false,
  );
});

test("newer contribution and biography edits are preserved as auditable conflicts", () => {
  const input = snapshot({
    contribution: "A newer editor contribution that must not be overwritten.",
    biography: "A newer editor biography that must not be overwritten.",
  });
  const result = planHistoricalMounirMerge(input);
  assert.equal(result.decision, "conflict");
  assert.deepEqual(result.changedFields, []);
  assert.equal(result.conflicts.length, 2);
  assert.equal(
    (result.payload.content as Record<string, unknown>).contribution,
    (input.content as Record<string, unknown>).contribution,
  );
  assert.deepEqual(
    (result.payload.content as Record<string, unknown>).focusAreas,
    (input.content as Record<string, unknown>).focusAreas,
  );
});

test("a safe contribution recovery proceeds while preserving newer biography copy", () => {
  const input = snapshot({
    contribution: KNOWN_COMPILED_MOUNIR_VALUES.contribution,
    biography: "A newer editor biography that must not be overwritten.",
  });
  const result = planHistoricalMounirMerge(input);
  assert.equal(result.decision, "apply-with-conflicts");
  assert.deepEqual(result.changedFields, ["content.contribution"]);
  assert.equal(result.conflicts[0]?.field, "content.biography");
  assert.equal(
    (result.payload.content as Record<string, unknown>).contribution,
    HISTORICAL_MOUNIR_RECOVERY.contribution,
  );
  assert.deepEqual(
    (result.payload.content as Record<string, unknown>).biography,
    (input.content as Record<string, unknown>).biography,
  );
});

test("empty contribution is recoverable but non-empty unrelated copy is not", () => {
  const result = planHistoricalMounirMerge(snapshot({ contribution: "", biography: undefined }));
  assert.equal(result.decision, "apply");
  assert.deepEqual(result.changedFields, ["content.contribution", "content.biography"]);
});

test("target stays pinned to the UAE English edition", () => {
  assert.equal(MOUNIR_MARKET, "uae");
  assert.equal(MOUNIR_LOCALE, "en");
});

test("receipt identity accepts only current authority or the one explicit legacy digest", () => {
  const source = {
    commit: HISTORICAL_MOUNIR_SOURCE.commit,
    file: HISTORICAL_MOUNIR_SOURCE.file,
    lines: HISTORICAL_MOUNIR_SOURCE.lines,
  };
  const current = {
    operation: "cms.people.history-recovery.reconciled",
    subjectId: "document-id",
    requestDigest: recoveryRequestDigest(),
  };
  assert.equal(recoveryReceiptAuthorityStatus(current, {}, "document-id"), true);
  assert.equal(recoveryReceiptAuthorityStatus({ ...current, subjectId: "other-document" }, {}, "document-id"), false);
  assert.equal(
    recoveryReceiptAuthorityStatus(
      { ...current, requestDigest: "not-a-receipt-digest" },
      { source },
      "document-id",
    ),
    false,
  );
  assert.equal(
    recoveryReceiptAuthorityStatus(
      { ...current, requestDigest: LEGACY_PEOPLE_RECOVERY_REQUEST_DIGEST },
      { source },
      "document-id",
    ),
    true,
  );
  assert.equal(
    recoveryReceiptAuthorityStatus(
      { ...current, requestDigest: LEGACY_PEOPLE_RECOVERY_REQUEST_DIGEST },
      { source: { ...source, lines: "other-lines" } },
      "document-id",
    ),
    false,
  );
});

test("development database comparison resolves the immutable inventory target", {
  skip: !process.env.DATABASE_URL
    || process.env.NODE_ENV === "production"
    || process.env.REPLIT_DEPLOYMENT === "1",
}, async () => {
  const report = await recoverPeople({ applyDatabase: false });
  assert.equal(report.target.externalId, MOUNIR_EXTERNAL_ID);
  assert.equal(report.target.market, MOUNIR_MARKET);
  assert.equal(report.target.locale, MOUNIR_LOCALE);
  assert.equal(report.state.documentId != null, true);
  assert.equal(report.state.editionId != null, true);
  assert.equal(report.receipt.recovery, "cms.people.history-recovery.reconciled");
  assert.equal(report.pinnedMediaReferences >= 0, true);
  assert.equal(report.validationErrors.length, 0);
  assert.equal(report.historicalRoster.summary.historicalCount, 6);
});