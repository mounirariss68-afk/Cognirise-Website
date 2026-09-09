import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { CASE_STUDY_TAXONOMY_COUNTS, caseStudyRecords } from "./case-studies.js";
import { websiteRoot } from "./common.js";
import { migrationOperations } from "./migration.js";

test("the source-owned case-study baseline has exactly 21 governed records", () => {
  const records = caseStudyRecords();
  assert.equal(records.length, 21);
  assert.equal(new Set(records.map((record) => record.externalId)).size, 21);
  assert.equal(new Set(records.map((record) => record.fields.slug)).size, 21);
  assert.deepEqual(
    Object.fromEntries(Object.keys(CASE_STUDY_TAXONOMY_COUNTS).map((sector) => [
      sector,
      records.filter((record) => (record.fields.content as Record<string, unknown>).sector === sector).length,
    ])),
    CASE_STUDY_TAXONOMY_COUNTS,
  );
});

test("every baseline summary satisfies the public contract and carries slide-only provenance", () => {
  for (const record of caseStudyRecords()) {
    assert.match(record.sourceFile, /Cognirise-Case-Studies-Azure-Deployments.*\.pptx$/);
    assert.match(
      JSON.stringify((record.fields.content as Record<string, any>).sources),
      /slide (?:[1-9]|1\d|2[01])/,
    );
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

test("case studies carry distinct approved-safe visual fixtures and deterministic perceptual signatures", async () => {
  const records = caseStudyRecords();
  const mediaPaths = records.map((record) => (record.fields.mediaPaths as string[])[0]);
  assert.equal(new Set(mediaPaths).size, 21);
  const labels = records.flatMap((record) => {
    const visual = (record.fields.content as Record<string, any>).visual;
    assert.match(visual.caption, /→/);
    assert.ok(visual.altText.length > 20);
    assert.equal(visual.fixtureLabels.length, 3);
    return visual.fixtureLabels;
  });
  assert.equal(new Set(labels).size, 63);
  assert.doesNotMatch(JSON.stringify(records), /\b(?:Türkiye|Turkey|UAE|Netherlands|Nepal|Istanbul)\b/i);
  
  const sizes = new Set();
  for (const mediaPath of mediaPaths) {
    const bytes = await readFile(path.join(websiteRoot, "public", mediaPath));
    assert.equal(bytes.toString("ascii", 1, 4), "PNG");
    assert.equal(bytes.readUInt32BE(16), 1600);
    assert.equal(bytes.readUInt32BE(20), 1000);
    sizes.add(bytes.length);
  }
  assert.ok(sizes.size > 15, "Expected distinct layout file sizes to vary significantly as a perceptual signature");
});

test("case-study migrations use a versioned receipt and remain idempotent", () => {
  const first = migrationOperations(caseStudyRecords());
  const second = migrationOperations(caseStudyRecords());
  assert.deepEqual(first, second);
  assert.equal(first.length, 21);
  assert.ok(first.every((operation) => operation.kind === "case-study"));
  assert.ok(first.every((operation) => operation.idempotencyKey.startsWith("cms-case-study-baseline-v2:")));
});