import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./import.ts", import.meta.url), "utf8");

test("availability conflicts become terminal audited reconciliation outcomes", () => {
  const branch = source.slice(
    source.indexOf("if (existingAvailability &&"),
    source.indexOf("if (!existingAvailability)"),
  );

  assert.match(branch, /availabilityConflicts\.push/);
  assert.match(branch, /cmsOperationReceiptsTable/);
  assert.match(branch, /person-market-availability-conflict-preserved/g);
  assert.match(branch, /preservedDecision: existingAvailability\.publishedDecision/);
  assert.match(branch, /requestDigest: operation\.requestDigest/);
});

test("controlled profile conflicts preserve editorial fields and still converge", () => {
  const branch = source.slice(
    source.indexOf("const preserveGovernanceConflict ="),
    source.indexOf("let revisionId = current.id"),
  );

  assert.match(branch, /governanceConflicts\.push/);
  assert.match(branch, /cmsOperationReceiptsTable/);
  assert.match(branch, /person-governance-conflict-preserved/g);
  assert.match(branch, /actual \?\? null/);
  assert.match(branch, /\n\s+preserved,/);
  assert.match(branch, /requestDigest: operation\.requestDigest/);
  assert.doesNotMatch(branch, /update\(cmsDocumentsTable\)|update\(cmsRevisionsTable\)/);
});