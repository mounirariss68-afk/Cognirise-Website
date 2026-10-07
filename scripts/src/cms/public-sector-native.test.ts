import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { publicSectorNativeSchema, PUBLIC_SECTOR_NATIVE_SECTION_IDS, projectIndustrySnapshotForMarket, industryContentSchema, validateCmsSnapshot } from "@workspace/api-zod";
import { NATIVE_MARKETS, nativeManuscripts, nativeDisposition, nativeSnapshot } from "./public-sector-native.js";
import { repositoryRoot } from "./common.js";
import type { PublicSectorNode } from "@workspace/api-zod";

function nodes(blocks: PublicSectorNode[]): PublicSectorNode[] {
  return blocks.flatMap(node => [node, ...(node.type === "panel" ? nodes(node.blocks)
    : node.type === "list" ? node.items.flatMap(nodes)
    : node.type === "table" ? [...node.headers, ...node.rows.flat()].flatMap(nodes) : [])]);
}
const base = {
  slug: "public-sector", title: "Public Sector", summary: "Existing predecessor", mediaIds: ["00000000-0000-4000-8000-000000000001"], markets: ["uae"],
  content: {
    legacyPath: "/industries/public-sector", name: "Public Sector", shortName: "Public Sector",
    thesis: "Existing predecessor", accent: "Public value", dek: "Predecessor",
    opportunity: "Existing opportunity", capabilities: [{ title: "A", body: "A" }, { title: "B", body: "B" }],
    selectedWork: { description: "Existing selected work" }, image: "/images/civic.png", imageAlt: "Approved civic atrium",
    variant: "factory", pressures: ["A", "B", "C"].map(title => ({ title, body: title })),
    reversal: { title: "Before", body: "Before" }, myth: { claim: "Before", verdict: "Before" },
    gcc: "Existing UAE copy", service: { label: "Contact", href: "/contact", firstMove: "Start" },
    uses: [{ use: "Before", evidence: "Before", boundary: "Before" }],
    sources: [{ label: "Predecessor source", publisher: "Official publisher", kind: "Official source", url: "https://example.gov/source" }],
    verificationDate: "2026-09-07", reviewDate: "2027-03-07", visibility: "public", order: 4, relatedIds: [],
    heroMedia: { mediaId: "00000000-0000-4000-8000-000000000001", mediaVersionId: "00000000-0000-4000-8000-000000000002", role: "hero", altText: "Approved civic atrium" },
  },
};

test("four October HTML manuscripts retain every substantive body leaf and deterministic source mapping", () => {
  const result = execFileSync("python", ["scripts/extract-public-sector-native.py", "--check"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.match(result, /complete prose/);
});

test("all editions preserve the full sequence, their own card examples and tables, without controls or old source claims", async () => {
  const manuscripts = await nativeManuscripts();
  const mapping = JSON.parse(await readFile(`${repositoryRoot}/docs/public-sector-native-source-mapping.json`, "utf8"));
  const exampleTitles = {
    uae: ["Birth certificate", "Trade licence renewal", "Social support"],
    ksa: ["Birth certificate", "Annual confirmation of commercial registration", "Citizen Account"],
    turkiye: ["Nüfus kayıt örneği", "İşyeri ruhsatı — change of activity", "Sosyal yardım başvurusu"],
    europe: ["Proof of registration of birth", "Notification of business activity", "Claiming pension benefits"],
  };
  for (const market of NATIVE_MARKETS) {
    const manuscript = manuscripts[market];
    assert.equal(manuscript.thesis, "The state takes the first step. A person confirms the outcome.");
    const native = publicSectorNativeSchema.parse(manuscript.publicSectorNative);
    assert.equal(native.market, market);
    assert.deepEqual(native.sections.map(section => section.id), [...PUBLIC_SECTOR_NATIVE_SECTION_IDS]);
    const all = native.sections.flatMap(section => nodes(section.blocks));
    assert.equal(all.filter(node => node.type === "table").length, mapping[market].tables);
    const cards = all.filter(node => node.type === "action-card");
    assert.equal(cards.length, 3);
    assert.deepEqual(cards.map(card => card.title), exampleTitles[market]);
    for (const card of cards) {
      assert.ok(card.fields.every(field => field.label && field.value && typeof field.editableExample === "boolean"));
      assert.ok(card.consequence && card.declaration && card.actionLabel);
    }
    assert.doesNotMatch(JSON.stringify(native), /<script|<iframe|<form|onClick|suspensive.appeal/i);
    assert.match(native.researchDateQualification, /not a new verification/);
    const links = all.filter(node => node.type === "copy" || node.type === "heading").flatMap(node => node.runs.flatMap(run => run.href ? [run.href] : []));
    for (const url of mapping[market].researchLinks) assert.ok(links.includes(url), `${market}: research link ${url}`);
  }
  assert.match(JSON.stringify(manuscripts.uae.publicSectorNative), /federal readiness assessment/);
  assert.doesNotMatch(JSON.stringify(manuscripts.ksa.publicSectorNative), /United Arab Emirates|Dubai|Abu Dhabi/);
  assert.doesNotMatch(JSON.stringify(manuscripts.uae.publicSectorNative), /Saudi Arabia|Kingdom of Saudi/);
});

test("native snapshots preserve immutable media and inherited dates; exact market projection cannot append another edition", async () => {
  for (const market of NATIVE_MARKETS) {
    const snapshot = await nativeSnapshot(base, market);
    assert.deepEqual(snapshot.content.heroMedia, base.content.heroMedia);
    assert.equal(snapshot.content.verificationDate, "2026-09-07");
    assert.equal(snapshot.content.reviewDate, "2027-03-07");
    assert.equal(snapshot.content.publicSectorPov, undefined);
    assert.equal(snapshot.content.publicSectorNative?.market, market);
    assert.equal(validateCmsSnapshot("industry", snapshot, "publish").success, true);
    assert.deepEqual(projectIndustrySnapshotForMarket(snapshot, market, market), snapshot);
    for (const other of NATIVE_MARKETS.filter(value => value !== market)) {
      assert.throws(() => projectIndustrySnapshotForMarket(snapshot, other, market), /cannot fall back/);
    }
    assert.equal(validateCmsSnapshot("industry", { ...snapshot, markets: ["uae", "ksa"] }, "publish").success, false);
  }
});

test("legacy revision contract remains compatible; v2 prevents duplicate topology and current blockers prevent publication", async () => {
  assert.equal(industryContentSchema.safeParse(base.content).success, true);
  const snapshot = await nativeSnapshot(base, "uae");
  const duplicate = structuredClone(snapshot.content.publicSectorNative!);
  duplicate.sections[1].id = "distinction";
  assert.equal(publicSectorNativeSchema.safeParse(duplicate).success, false);
  const blocked = structuredClone(snapshot);
  blocked.content.publicSectorNative!.reviewBlockers = ["Current unresolved assertion"];
  assert.equal(validateCmsSnapshot("industry", blocked, "draft").success, true);
  assert.equal(validateCmsSnapshot("industry", blocked, "publish").success, false);
  const unsafe = structuredClone(snapshot.content.publicSectorNative!);
  unsafe.sections[0].blocks.push({ type: "copy", style: "body", runs: [{ text: "Unsafe", href: "javascript:alert(1)" }] });
  assert.equal(publicSectorNativeSchema.safeParse(unsafe).success, false);
});

test("reconciliation replays exact drafts and publications, but preserves newer edits and mismatched receipt evidence", () => {
  const state = { latestId: "known", publishedId: null, latestDigest: "digest", latestState: "draft", predecessorKnown: true };
  assert.equal(nativeDisposition(state), "stage");
  assert.equal(nativeDisposition({ ...state, predecessorKnown: false }), "preserve-conflict");
  const receipt = { revisionId: "known", candidateDigest: "digest" };
  assert.equal(nativeDisposition({ ...state, receipt }), "replay");
  assert.equal(nativeDisposition({ ...state, receipt, publishedId: "known", latestState: "approved" }), "replay");
  assert.equal(nativeDisposition({ ...state, receipt, latestId: "editor-successor" }), "preserve-conflict");
  assert.equal(nativeDisposition({ ...state, receipt, latestDigest: "tampered" }), "preserve-conflict");
});
