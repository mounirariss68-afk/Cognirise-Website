import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";
import {
  assertPulsePlatformDraftStageSafety,
  canonicalJson,
  knownLegacyCogniAgentsSnapshot,
  planPulsePlatformTarget,
  PULSE_PLATFORM_DRAFT_STAGE_ACTION,
  PULSE_PLATFORM_DRAFT_STAGE_ACTOR_LABEL,
  PULSE_PLATFORM_DRAFT_STAGE_ACTOR_EMAIL,
  PULSE_PLATFORM_DRAFT_STAGE_REASON,
  PULSE_PLATFORM_DRAFT_TARGETS,
  pulsePlatformRequestId,
  pulsePlatformSnapshot,
  pulsePlatformSnapshotDigest,
  stagePulsePlatformDrafts,
  type DocumentState,
  type EditionState,
  type RevisionState,
} from "./pulse-platform-draft-staging.js";

const cognibase = PULSE_PLATFORM_DRAFT_TARGETS.find((target) => target.slug === "cognibase")!;
const cogniagents = PULSE_PLATFORM_DRAFT_TARGETS.find((target) => target.slug === "cogniagents")!;

function legacyRevision(overrides: Partial<RevisionState> = {}): RevisionState {
  return {
    id: "legacy-revision",
    revision_number: 1,
    payload: knownLegacyCogniAgentsSnapshot,
    content_digest: createHash("sha256").update(JSON.stringify(knownLegacyCogniAgentsSnapshot)).digest("hex"),
    workflow_state: "draft",
    created_by_email: PULSE_PLATFORM_DRAFT_STAGE_ACTOR_EMAIL,
    reason: "Inventory migration; pending editorial review.",
    approved_by_user_id: null,
    approved_at: null,
    source_revision_id: null,
    ...overrides,
  };
}

function documentFor(
  slug: "cognibase" | "cogniagents",
  editionOverrides: Partial<EditionState> = {},
  revision: RevisionState[] = [],
): DocumentState {
  const target = slug === "cognibase" ? cognibase : cogniagents;
  return {
    id: `${slug}-document`,
    kind: "platform",
    canonical_slug: slug,
    title: target.title,
    status: "active",
    editions: [{
      id: `${slug}-edition`,
      document_id: `${slug}-document`,
      market: "uae",
      locale: "en",
      localized_slug: slug,
      publication_state: "draft",
      published_revision_id: null,
      revisions: revision,
      ...editionOverrides,
    }],
  };
}

function stagedRevision(slug: "cognibase" | "cogniagents", overrides: Partial<RevisionState> = {}) {
  const target = slug === "cognibase" ? cognibase : cogniagents;
  const snapshot = pulsePlatformSnapshot(target);
  return {
    id: `${slug}-staged-revision`,
    revision_number: slug === "cogniagents" ? 2 : 1,
    payload: snapshot,
    content_digest: pulsePlatformSnapshotDigest(snapshot),
    workflow_state: "draft",
    created_by_email: PULSE_PLATFORM_DRAFT_STAGE_ACTOR_EMAIL,
    reason: PULSE_PLATFORM_DRAFT_STAGE_REASON,
    approved_by_user_id: null,
    approved_at: null,
    source_revision_id: null,
    ...overrides,
  } satisfies RevisionState;
}

test("owner-supplied Pulse defaults produce schema-valid UAE/en snapshots with stable digests", () => {
  for (const target of PULSE_PLATFORM_DRAFT_TARGETS) {
    const snapshot = pulsePlatformSnapshot(target);
    assert.equal(validateCmsSnapshot("platform", snapshot, "draft").success, true);
    assert.equal(snapshot.slug, target.slug);
    assert.equal(snapshot.title, target.title);
    assert.deepEqual(snapshot.markets, ["uae"]);
    assert.equal((snapshot.content as { pulsePage: { variant: string } }).pulsePage.variant, target.content.template);
    assert.equal(pulsePlatformSnapshotDigest(snapshot), pulsePlatformSnapshotDigest(JSON.parse(canonicalJson(snapshot))));
    assert.equal(snapshot.seo.noIndex, true);
  }
});

test("dry run is the default; database writes require explicit development target and production always refuses", () => {
  assert.deepEqual(
    assertPulsePlatformDraftStageSafety([], { NODE_ENV: "development", DATABASE_URL: "postgres://development" }),
    { apply: false },
  );
  assert.deepEqual(
    assertPulsePlatformDraftStageSafety(["--target=development"], {
      NODE_ENV: "development",
      DATABASE_URL: "postgres://development",
    }),
    { apply: false },
  );
  assert.deepEqual(
    assertPulsePlatformDraftStageSafety(["--apply-db", "--target=development"], {
      NODE_ENV: "development",
      DATABASE_URL: "postgres://development",
    }),
    { apply: true },
  );
  assert.throws(
    () => assertPulsePlatformDraftStageSafety(["--apply-db", "--target=development"], {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://production",
    }),
    /disabled in production/,
  );
  assert.throws(
    () => assertPulsePlatformDraftStageSafety([], {
      NODE_ENV: "development",
      REPLIT_DEPLOYMENT: "1",
      DATABASE_URL: "postgres://production",
    }),
    /disabled in production/,
  );
  assert.throws(
    () => assertPulsePlatformDraftStageSafety(["--apply-db", "--target=production"], {
      NODE_ENV: "development",
      DATABASE_URL: "postgres://development",
    }),
    /only permits --target=development/,
  );
  assert.throws(
    () => assertPulsePlatformDraftStageSafety(["--apply-db"], {
      NODE_ENV: "development",
      DATABASE_URL: "postgres://development",
    }),
    /explicit --apply-db --target=development/,
  );
  assert.throws(
    () => assertPulsePlatformDraftStageSafety([], { NODE_ENV: "development" }),
    /DATABASE_URL is required/,
  );
  assert.throws(
    () => assertPulsePlatformDraftStageSafety(["--write"], {
      NODE_ENV: "development",
      DATABASE_URL: "postgres://development",
    }),
    /Unsupported argument/,
  );
});

test("only the exact one-revision legacy CogniAgents draft can receive a successor", () => {
  const legacy = documentFor("cogniagents", {}, [legacyRevision()]);
  const plan = planPulsePlatformTarget(cogniagents, [legacy]);
  assert.equal(plan.outcome, "replace-known-legacy-seed");
  if (plan.outcome === "replace-known-legacy-seed") {
    assert.equal(plan.revisionNumber, 2);
    assert.equal(plan.digest, pulsePlatformSnapshotDigest(plan.snapshot));
  }

  const modifiedPayload = structuredClone(knownLegacyCogniAgentsSnapshot);
  modifiedPayload.summary = "Editorially changed summary";
  assert.throws(
    () => planPulsePlatformTarget(cogniagents, [
      documentFor("cogniagents", {}, [legacyRevision({ payload: modifiedPayload })]),
    ]),
    /diverges/,
  );
  assert.throws(
    () => planPulsePlatformTarget(cogniagents, [
      documentFor("cogniagents", {}, [legacyRevision(), legacyRevision({
        id: "newer",
        revision_number: 2,
      })]),
    ]),
    /diverges/,
  );
  assert.throws(
    () => planPulsePlatformTarget(cogniagents, [
      documentFor("cogniagents", {
        publication_state: "published",
        published_revision_id: "legacy-revision",
      }, [legacyRevision()]),
    ]),
    /diverges/,
  );
});

test("absent targets stage, exact command replay is idempotent, and newer editorial work is preserved", () => {
  assert.equal(planPulsePlatformTarget(cognibase, []).outcome, "create-document-and-draft");
  const staged = stagedRevision("cognibase");
  const draft = documentFor("cognibase", {}, [staged]);
  const replay = planPulsePlatformTarget(cognibase, [draft]);
  assert.equal(replay.outcome, "replayed");
  if (replay.outcome === "replayed") assert.equal(replay.revisionId, staged.id);

  const publishedStage = documentFor("cognibase", {
    publication_state: "published",
    published_revision_id: staged.id,
  }, [stagedRevision("cognibase", {
    workflow_state: "approved",
    approved_by_user_id: "human-reviewer",
    approved_at: new Date("2026-09-01T00:00:00.000Z"),
  })]);
  assert.equal(planPulsePlatformTarget(cognibase, [publishedStage]).outcome, "replayed");

  const humanRevision = {
    ...stagedRevision("cognibase"),
    id: "human-successor",
    revision_number: 2,
    payload: { ...pulsePlatformSnapshot(cognibase), summary: "Human editorial work" },
    content_digest: "human-edited-digest",
    created_by_email: "editor@example.test",
    reason: "Human editorial update.",
  };
  const preserved = planPulsePlatformTarget(cognibase, [
    documentFor("cognibase", {}, [staged, humanRevision]),
  ]);
  assert.equal(preserved.outcome, "preserved");
  if (preserved.outcome === "preserved") assert.equal(preserved.revisionId, staged.id);
});

test("applying an exact audited replay performs no CMS writes and keeps published pointers untouched", async () => {
  const revisionsBySlug = new Map(
    PULSE_PLATFORM_DRAFT_TARGETS.map((target) => {
      const approved = target.slug === "cognibase";
      const revision = stagedRevision(target.slug, approved ? {
        workflow_state: "approved",
        approved_by_user_id: "human-reviewer",
        approved_at: new Date("2026-09-01T00:00:00.000Z"),
      } : {});
      return [target.slug, revision] as const;
    }),
  );
  const writes: string[] = [];
  const client = {
    async query(text: string, values: unknown[] = []) {
      if (/^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(text)) writes.push(text);
      if (text.includes("SELECT pg_advisory_xact_lock")) return { rowCount: 1, rows: [] };
      if (text.includes("FROM market_editions")) {
        return { rowCount: 1, rows: [{ code: "uae", default_locale: "en", enabled: true }] };
      }
      if (text.includes("FROM cms_documents")) {
        const slug = String(values[0]);
        const target = PULSE_PLATFORM_DRAFT_TARGETS.find((item) => item.slug === slug)!;
        return {
          rowCount: 1,
          rows: [{
            id: `${slug}-document`,
            kind: "platform",
            canonical_slug: slug,
            title: target.title,
            status: "active",
          }],
        };
      }
      if (text.includes("FROM cms_market_editions")) {
        const documentId = String(values[0]);
        const slug = documentId.replace(/-document$/, "");
        const revision = revisionsBySlug.get(slug as "cognibase" | "cogniagents")!;
        return {
          rowCount: 1,
          rows: [{
            id: `${slug}-edition`,
            document_id: documentId,
            market: "uae",
            locale: "en",
            localized_slug: slug,
            publication_state: slug === "cognibase" ? "published" : "draft",
            published_revision_id: slug === "cognibase" ? revision.id : null,
          }],
        };
      }
      if (text.includes("FROM cms_revisions")) {
        const editionId = String(values[0]);
        const slug = editionId.replace(/-edition$/, "") as "cognibase" | "cogniagents";
        return {
          rowCount: 1,
          rows: [{
            ...revisionsBySlug.get(slug)!,
          }],
        };
      }
      if (text.includes("FROM cms_audit_events")) {
        const requestId = String(values[0]);
        const target = PULSE_PLATFORM_DRAFT_TARGETS.find((item) => requestId.includes(`:${item.slug}:`))!;
        const revision = revisionsBySlug.get(target.slug)!;
        return {
          rowCount: 1,
          rows: [{
            actor_label: PULSE_PLATFORM_DRAFT_STAGE_ACTOR_LABEL,
            action: PULSE_PLATFORM_DRAFT_STAGE_ACTION,
            target_type: "platform",
            target_id: `${target.slug}-document`,
            metadata: {
              revisionId: revision.id,
              editionId: `${target.slug}-edition`,
              contentDigest: pulsePlatformSnapshotDigest(pulsePlatformSnapshot(target)),
              reason: PULSE_PLATFORM_DRAFT_STAGE_REASON,
              importType: "system-draft-import",
            },
          }],
        };
      }
      throw new Error(`Unexpected SQL query: ${text}`);
    },
  };
  const plans = await stagePulsePlatformDrafts(client, true);
  assert.deepEqual(plans.map((plan) => plan.outcome), ["replayed", "replayed"]);
  assert.deepEqual(writes, []);
  for (const target of PULSE_PLATFORM_DRAFT_TARGETS) {
    assert.equal(
      pulsePlatformRequestId(target, pulsePlatformSnapshot(target)).includes(target.slug),
      true,
    );
  }
});

test("CLI source documents editor work and never writes review or publication state", () => {
  const source = readFileSync(new URL("./pulse-platform-draft-staging.ts", import.meta.url), "utf8");
  const cli = readFileSync(new URL("./pulse-platform-draft-staging-cli.ts", import.meta.url), "utf8");
  const packageJson = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
  assert.match(source, /workflow_state,\s*created_by_user_id,reason/);
  assert.match(source, /approvalPerformed: false/);
  assert.match(source, /publicationPerformed: false/);
  assert.doesNotMatch(source, /UPDATE cms_market_editions|UPDATE cms_revisions|approvedByUserId:\s*actor/i);
  assert.match(cli, /Human work still required/);
  assert.match(cli, /An authorized human must complete the normal review\/MFA and publish flow/);
  assert.match(packageJson, /cms:stage-pulse-platform-drafts/);
});