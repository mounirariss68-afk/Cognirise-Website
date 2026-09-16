import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";
import {
  CASE_CINEMATIC_VISUALS,
  CASE_STUDY_TAXONOMY_COUNTS,
  caseStudyMarketInventory,
  caseStudyRecords,
} from "./case-studies.js";
import { websiteRoot } from "./common.js";
import { migrationOperations } from "./migration.js";

test("the source-owned case-study baseline has exactly 22 governed records", () => {
  const records = caseStudyRecords();
  assert.equal(records.length, 22);
  assert.equal(new Set(records.map((record) => record.externalId)).size, 22);
  assert.equal(new Set(records.map((record) => record.fields.slug)).size, 22);
  assert.deepEqual(
    Object.fromEntries(Object.keys(CASE_STUDY_TAXONOMY_COUNTS).map((sector) => [
      sector,
      records.filter((record) => (record.fields.content as Record<string, unknown>).sector === sector).length,
    ])),
    CASE_STUDY_TAXONOMY_COUNTS,
  );
});

test("the market inventory reports configured UAE fallback delivery per case", () => {
  const report = caseStudyMarketInventory();
  assert.equal(report.length, 22);
  assert.ok(report.every((entry) =>
    entry.directPublishedMarket === "uae"
    && entry.fallbackDelivery.length === 3
    && entry.fallbackDelivery.every((delivery) =>
      ["europe", "ksa", "turkiye"].includes(delivery.requestedMarket)
      && delivery.effectiveMarket === "uae"
      && delivery.effectiveLocale === "en"
      && delivery.usedFallback
    )
    && entry.unavailableRequests.includes("disabled or unconfigured")
    && entry.approvedMediaPath.startsWith("/images/cognirise/cases/cinematic/")
  ));
});

test("every baseline case satisfies the public contract and carries governed provenance", () => {
  for (const record of caseStudyRecords()) {
    if (record.externalId === "case-study:slide-22") {
      assert.equal(record.sourceFile, "attached_assets/clinic-network-case-study-brief.md");
      assert.match(JSON.stringify((record.fields.content as Record<string, any>).sources), /Clinic Network editorial brief/);
    } else {
      assert.match(record.sourceFile, /Cognirise-Case-Studies-Azure-Deployments.*\.pptx$/);
      assert.match(
        JSON.stringify((record.fields.content as Record<string, any>).sources),
        /slide (?:[1-9]|1\d|2[01])/,
      );
    }
    assert.equal(record.route, undefined);
    const result = validateCmsSnapshot("case-study", {
      slug: record.fields.slug,
      title: record.name,
      summary: record.fields.summary,
      content: record.fields.content,
      mediaIds: [],
      markets: ["uae"],
    }, "publish");
    assert.equal(result.success, true, result.success ? undefined : result.errors.join("; "));
    const serializedPublicFields = JSON.stringify({
      name: record.name,
      fields: record.fields,
    });
    assert.doesNotMatch(serializedPublicFields, /\b(?:Türkiye|Turkey|UAE|Netherlands|Nepal|Istanbul)\b/i);
    const content = record.fields.content as Record<string, any>;
    const publicExplanation = [record.fields.summary, content.mandate, content.work, content.outcomes].join(" ");
    assert.doesNotMatch(publicExplanation, /\b(?:pilot|poc|proof[- ]of[- ]concept|production[- ]status|demo(?:nstration)?|unverified|not observed|not claimed)\b/i);
    assert.ok(String(record.fields.summary).length > 140);
  }
});

function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions could not be read.");
}

test("case studies carry distinct approved cinematic artwork and creative briefs", async () => {
  const records = caseStudyRecords();
  const mediaPaths = records.map((record) => (record.fields.mediaPaths as string[])[0]);
  assert.equal(new Set(mediaPaths).size, 22);
  assert.equal(CASE_CINEMATIC_VISUALS.length, 22);
  for (const record of records) {
    const visual = (record.fields.content as Record<string, any>).visual;
    assert.ok(visual.altText.length > 20);
    assert.equal(visual.fixtureLabels.length, 3);
    assert.match((record.fields.mediaPaths as string[])[0], /\/cases\/cinematic\/.+\.jpg$/);
  }
  assert.doesNotMatch(JSON.stringify(records), /\b(?:Türkiye|Turkey|UAE|Netherlands|Nepal|Istanbul)\b/i);
  
  const sizes = new Set();
  for (const mediaPath of mediaPaths) {
    const bytes = await readFile(path.join(websiteRoot, "public", mediaPath));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    assert.deepEqual(jpegDimensions(bytes), { width: 1600, height: 1000 });
    sizes.add(bytes.length);
  }
  assert.ok(sizes.size > 15, "Expected distinct layout file sizes to vary significantly as a perceptual signature");
});

test("case-study migrations use a versioned receipt and remain idempotent", () => {
  const first = migrationOperations(caseStudyRecords());
  const second = migrationOperations(caseStudyRecords());
  assert.deepEqual(first, second);
  assert.equal(first.length, 22);
  assert.ok(first.every((operation) => operation.kind === "case-study"));
  assert.ok(first.every((operation) => operation.idempotencyKey.startsWith("cms-case-study-baseline-v2:")));
});