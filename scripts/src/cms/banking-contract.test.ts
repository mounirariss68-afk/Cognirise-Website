import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { bankingPovSchema, collectCmsMediaReferences, industryContentSchema, projectIndustrySnapshotForMarket, validateCmsSnapshot } from "@workspace/api-zod";
import { bankingSuccessorReceiptKey } from "./banking-successor.js";

const media = (index: number) => ({
  mediaId: `00000000-0000-4000-8000-00000000000${index}`,
  mediaVersionId: `10000000-0000-4000-8000-00000000000${index}`,
  role: "supporting" as const,
  altText: `Banking artwork ${index}`,
});

test("a changed generated candidate cannot bypass the competing-draft guard", async () => {
  const source = await readFile(new URL("./banking-successor.ts", import.meta.url), "utf8");
  const guard = source.slice(source.indexOf('if (latest.rows[0].id !== page.published_revision_id'), source.indexOf("const liveCases ="));
  assert.match(guard, /throw new Error\("Financial Services has a newer draft\/review revision/);
  assert.doesNotMatch(guard, /knownGeneratedDraft|pool\.query/);
  assert.ok(source.indexOf('disposition: "replayed"') < source.indexOf('if (latest.rows[0].id !== page.published_revision_id'));
});
const domains = ["credit-lending", "risk-fraud", "operations-process", "customer-sales", "engineering-it", "compliance-regulation"];
const points = ["core-banking-operations", "contact-centre", "software-delivery", "marketing-intelligence"];
const journeys = ["accounts-cards", "payments-transfers", "loans-deposits", "fraud-card-security", "digital-channel-support", "collections-reminders", "campaigns-outbound"];

function bankingPov() {
  const source = { label: "Central Bank evidence", publisher: "Central Bank", kind: "Official source" as const, url: "https://example.com/evidence", accessedAt: "2026-01-01", publicationPeriod: "2025", jurisdiction: "UAE", statement: "A qualified observation.", qualification: "Illustrative and subject to bank baseline validation." };
  return {
    version: 1 as const, market: "uae" as const, descriptor: "Governed bank transformation.",
    hero: { eyebrow: "Banking POV", heading: "One bank. Three levels of AI value.", body: "A deliberate path from contained work to accountable operating change.", startingPointsAnchorLabel: "Explore starting points", selectedWorkAnchorLabel: "See selected work" },
    evidenceSignals: [source],
    valueOutcomes: [1, 2, 3].map((index) => ({ title: `Outcome ${index}`, body: "Observable value with an explicit baseline.", measures: ["Cycle time"] })),
    adoptionLevels: [1, 2, 3].map((level) => ({ level: level as 1 | 2 | 3, title: `Level ${level}`, value: "Bounded operational value.", illustrativeWork: ["A governed workflow"], owner: "Named accountable executive", readiness: ["Approved data boundary"], measures: ["Exception rate"], decisionBoundary: "A human owner retains consequential decisions." })),
    valueDomains: domains.map((id) => ({ id, title: id, purpose: "A decision domain with measurable operating outcomes.", examples: ["A bounded example"], measures: ["Quality"] })),
    startingPoints: points.map((id, index) => ({ id, title: id, valueProposition: "A governed first move.", problem: "A material operational constraint.", cogniriseRole: "Design, measurement, and operating governance.", requiredInputs: ["Named process owner"], firstDeliverable: "A tested operating blueprint.", measures: ["Cycle time"], decisionBoundary: "Human approval for consequential actions.", action: { label: "Discuss this workflow", href: "/value-scan" }, image: media(index + 1), focalPoint: { x: 50, y: 50 } })),
    voiceBanking: { platform: { name: "Lupitor" as const, contribution: "Voice interaction capability.", href: "https://www.lupitor.com/industries/banking", qualification: "Platform capability is subject to joint discovery." }, cogniriseContribution: "Cognirise defines use-case, controls, integration, and measurable operation.", journeys: journeys.map((id) => ({ id, title: id, scope: "A narrowly governed voice journey.", measures: ["Containment rate"], controlBoundary: "Escalate exceptions to an accountable human." })) },
    productionReadiness: { eyebrow: "Production readiness", heading: "From permission to action.", body: "Production requires operating controls, not only model access.", practices: ["Named owner"], image: media(5), focalPoint: { x: 50, y: 50 }, annotation: "Controls progress alongside workflow scope." },
    deliveryPath: { stages: ["Discover", "Design", "Pilot", "Scale"].map((stage) => ({ stage, owner: "Joint accountable team", outcome: "A reviewed operating decision." })), practices: ["Review measures with owners"] },
    partners: [{ name: "Lupitor" as const, contribution: "Voice platform contribution.", qualification: "Capability qualified during discovery.", href: "https://www.lupitor.com/" }, { name: "Ekimetrics" as const, contribution: "Measurement contribution.", qualification: "Engagement scope qualified during discovery.", href: "https://www.ekimetrics.com/en-us/industries/financial-services" }],
    cta: { heading: "Start with a bounded decision.", body: "Use the existing Value Scan to choose a first workflow.", label: "Start a Value Scan", href: "/value-scan" },
    caseMembershipSnapshot: [{ slug: "governed-banking-case", title: "A preserved published case", order: 1, digest: "a".repeat(64) }],
  };
}

function industry(content: Record<string, unknown>) {
  return {
    schemaVersion: 1, legacyPath: "/industries/financial-services", name: "Financial Services", shortName: "Financial Services", thesis: "Governed AI for accountable banking operations.", accent: "violet", dek: "A governed path to measurable outcomes.", opportunity: "Move important work through explicit controls.",
    capabilities: [{ title: "Discover", body: "Find decision points." }, { title: "Operate", body: "Measure accountable change." }],
    selectedWork: { description: "The existing selected-work rail remains authoritative." }, image: "/images/cognirise/site-financial.jpg", imageAlt: "Financial services architecture", variant: "ledger",
    pressures: [{ title: "Pressure one", body: "Material operating constraint." }, { title: "Pressure two", body: "Material operating constraint." }, { title: "Pressure three", body: "Material operating constraint." }],
    reversal: { title: "Reverse the sequence", body: "Start from accountable decisions." }, myth: { claim: "Technology alone transforms operations.", verdict: "Operating ownership and measures determine value." }, gcc: "UAE banking work stays market-specific.", service: { label: "Value Scan", href: "/value-scan", firstMove: "Identify a bounded workflow." }, uses: [{ use: "Operations", evidence: "Measured operational baseline", boundary: "Human approval for consequential action." }],
    sources: [{ label: "Central Bank evidence", publisher: "Central Bank", kind: "Official source", url: "https://example.com/evidence", accessedAt: "2026-01-01", market: "uae" }],
    verificationDate: "2026-01-01", reviewDate: "2026-06-01", visibility: "public", order: 1, relatedIds: [], ...content,
  };
}

test("Banking POV requires the complete prescribed sets and five immutable media pins", () => {
  const pov = bankingPov();
  assert.equal(bankingPovSchema.safeParse(pov).success, true);
  assert.equal(collectCmsMediaReferences("industry", { bankingPov: pov }).length, 5);
  assert.equal(bankingPovSchema.safeParse({ ...pov, startingPoints: [...pov.startingPoints.slice(0, 3), pov.startingPoints[0]] }).success, false);
});

test("Banking POV is Financial Services-only and evidence must be on the industry source trail", () => {
  const pov = bankingPov();
  assert.equal(industryContentSchema.safeParse(industry({ bankingPov: pov })).success, true);
  assert.equal(industryContentSchema.safeParse(industry({ name: "Education", bankingPov: pov })).success, false);
  assert.equal(industryContentSchema.safeParse(industry({ sources: [], bankingPov: pov })).success, false);
});

test("UAE delivery rejects Saudi leakage", () => {
  const pov = bankingPov();
  const leaked = { ...pov, hero: { ...pov.hero, body: `${pov.hero.body} Saudi delivery context.` } };
  const result = validateCmsSnapshot("industry", {
    slug: "financial-services", title: "Financial Services", summary: "Governed banking.", content: industry({ bankingPov: leaked }),
    mediaIds: [1, 2, 3, 4, 5].map((index) => media(index).mediaId), markets: ["uae"],
  }, "publish");
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.errors.some((error) => error.includes("UAE Banking POV")));
});

test("Banking cannot use a UAE edition as a KSA fallback", () => {
  const snapshot = {
    slug: "financial-services", title: "Financial Services", content: industry({ bankingPov: bankingPov() }),
    mediaIds: [1, 2, 3, 4, 5].map((index) => media(index).mediaId), markets: ["uae"],
  };
  assert.throws(() => projectIndustrySnapshotForMarket(snapshot, "ksa", "uae"), /cannot fall back/);
});

test("Banking successor receipt identity excludes volatile snapshot capture time", () => {
  const published = {
    edition_id: "00000000-0000-4000-8000-000000000001",
    published_revision_id: "00000000-0000-4000-8000-000000000002",
    content_digest: "a".repeat(64),
  };
  const candidate = "b".repeat(64);
  assert.equal(
    bankingSuccessorReceiptKey(published, candidate),
    bankingSuccessorReceiptKey({ ...published }, candidate),
  );
});