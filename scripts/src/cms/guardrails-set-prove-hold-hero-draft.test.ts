import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";
import {
  guardrailsSetProveHoldSnapshot,
  guardrailsSetProveHoldSnapshotDigest,
} from "./guardrails-set-prove-hold-reconciliation.js";
import {
  GUARDRAILS_SET_PROVE_HOLD_HERO_OPERATION,
  GUARDRAILS_SET_PROVE_HOLD_HERO_RECEIPT,
  guardrailsSetProveHoldHeroRequestDigest,
  guardrailsSetProveHoldHeroResultDigest,
  guardrailsSetProveHoldHeroSnapshot,
  guardrailsSetProveHoldHeroSnapshotDigest,
  stageGuardrailsSetProveHoldHero,
} from "./guardrails-set-prove-hold-hero-draft.js";

const documentId = "00000000-0000-4000-8000-000000000001";
const editionId = "00000000-0000-4000-8000-000000000002";
const baselineRevisionId = "00000000-0000-4000-8000-000000000003";
const stagedRevisionId = "00000000-0000-4000-8000-000000000004";
const laterRevisionId = "00000000-0000-4000-8000-000000000005";
const hero = {
  mediaId: "00000000-0000-4000-8000-000000000006",
  mediaVersionId: "00000000-0000-4000-8000-000000000007",
  storageKey: "private/cms-media/guardrails-boundaries-hero-verified",
};

function exactReceipt() {
  return {
    operation: GUARDRAILS_SET_PROVE_HOLD_HERO_OPERATION,
    subject_id: stagedRevisionId,
    request_digest: guardrailsSetProveHoldHeroRequestDigest(baselineRevisionId, hero),
    result_digest: guardrailsSetProveHoldHeroResultDigest(stagedRevisionId, hero),
    response: {
      baselineRevisionId,
      publicationPointerPreserved: "00000000-0000-4000-8000-000000000008",
    },
  };
}

function stagedRevision() {
  return {
    revision_id: stagedRevisionId,
    edition_id: editionId,
    payload: guardrailsSetProveHoldHeroSnapshot(hero),
    content_digest: guardrailsSetProveHoldHeroSnapshotDigest(hero),
    workflow_state: "draft",
    document_id: documentId,
    market: "uae",
    locale: "en",
    localized_slug: "guardrails-framework",
    publication_state: "published",
    published_revision_id: "00000000-0000-4000-8000-000000000008",
    kind: "framework",
    canonical_slug: "guardrails-framework",
    document_status: "active",
  };
}

function replayClient(latestId = stagedRevisionId) {
  const statements: string[] = [];
  return {
    statements,
    async query(text: string) {
      statements.push(text);
      if (text.includes("FROM cms_operation_receipts")) {
        return { rowCount: 1, rows: [exactReceipt()] };
      }
      if (text.includes("FROM cms_revisions r")) {
        return { rowCount: 1, rows: [stagedRevision()] };
      }
      if (text.includes("FROM cms_media_references")) {
        return {
          rowCount: 1,
          rows: [{ asset_id: hero.mediaId, media_version_id: hero.mediaVersionId }],
        };
      }
      if (text.includes("ORDER BY revision_number DESC,created_at DESC,id DESC")) {
        return { rowCount: 1, rows: [{ id: latestId }] };
      }
      throw new Error(`Unexpected SQL: ${text.slice(0, 100)}`);
    },
  };
}

function hasWrite(statements: string[]) {
  return statements.some((statement) => /^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(statement));
}

test("the hero successor preserves the complete Set, Prove & Hold payload", () => {
  const snapshot = guardrailsSetProveHoldHeroSnapshot(hero);
  assert.equal(validateCmsSnapshot("framework", snapshot, "draft").success, true);
  const contentWithoutHero = { ...snapshot.content };
  delete contentWithoutHero.heroMedia;
  const seoWithoutHero = { ...snapshot.seo };
  delete seoWithoutHero.ogImageMedia;
  assert.deepEqual(contentWithoutHero, guardrailsSetProveHoldSnapshot.content);
  assert.deepEqual(seoWithoutHero, guardrailsSetProveHoldSnapshot.seo);
  assert.deepEqual(snapshot.mediaIds, [hero.mediaId]);
  assert.deepEqual(snapshot.content.heroMedia, {
    mediaId: hero.mediaId,
    mediaVersionId: hero.mediaVersionId,
    role: "hero",
    altText: "Violet and coral light passes through four ivory architectural gates with navy frames and glass boundaries.",
  });
  assert.deepEqual(snapshot.seo?.ogImageMedia, {
    mediaId: hero.mediaId,
    mediaVersionId: hero.mediaVersionId,
    role: "og-image",
    altText: "Violet and coral light passes through four ivory architectural gates with navy frames and glass boundaries.",
  });
});

test("an exact hero receipt replays idempotently without changing CMS rows", async () => {
  const client = replayClient();
  const result = await stageGuardrailsSetProveHoldHero(client, hero, true);
  assert.deepEqual(result, {
    documentId,
    editionId,
    revisionId: stagedRevisionId,
    outcome: "replayed",
  });
  assert.equal(hasWrite(client.statements), false);
  assert.equal(client.statements.some((statement) => /published_revision_id\s*=/i.test(statement)), false);
});

test("a later editorial successor wins over hero receipt replay", async () => {
  const client = replayClient(laterRevisionId);
  const result = await stageGuardrailsSetProveHoldHero(client, hero, true);
  assert.deepEqual(result, {
    documentId,
    editionId,
    revisionId: stagedRevisionId,
    outcome: "preserved",
  });
  assert.equal(hasWrite(client.statements), false);
});

test("the one-shot command is development-only and never approves or publishes", () => {
  const source = readFileSync(
    new URL("./guardrails-set-prove-hold-hero-draft.ts", import.meta.url),
    "utf8",
  );
  const packageJson = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
  assert.match(source, /--target=development/);
  assert.match(source, /NODE_ENV === "production"/);
  assert.match(source, /REPLIT_DEPLOYMENT === "1"/);
  assert.match(source, /object\.download\(\)/);
  assert.match(source, /pending-review/);
  assert.match(source, /cms_media_references/);
  assert.match(source, /workflow_state[\s\S]*'draft'/);
  assert.match(source, /cms_preview_sessions|\/documents\/\$\{documentId\}\/preview/);
  assert.doesNotMatch(source, /UPDATE\s+cms_market_editions\s+SET/i);
  assert.doesNotMatch(source, /UPDATE\s+cms_revisions\s+SET/i);
  assert.match(packageJson, /cms:stage-guardrails-set-prove-hold-hero/);
  assert.equal(guardrailsSetProveHoldSnapshotDigest.length, 64);
});
