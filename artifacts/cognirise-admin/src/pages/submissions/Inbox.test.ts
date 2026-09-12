import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../../", import.meta.url);

test("submission list and export use the same normalized text search", async () => {
  const page = await readFile(new URL("src/pages/submissions/Inbox.tsx", adminRoot), "utf8");

  assert.match(page, /search: search\.trim\(\) \|\| undefined/);
  assert.match(page, /buildSubmissionExportFilters\(search, status, kind\)/);
  assert.match(page, /search: search\.trim\(\) \|\| undefined/);
  assert.match(page, /export function buildSubmissionExportFilters[\s\S]+: SubmissionExportInput/);
  assert.doesNotMatch(page, /as SubmissionExportInput/);
});

test("export attempts use filter-scoped idempotency keys and retain uncertain retries", async () => {
  const page = await readFile(new URL("src/pages/submissions/Inbox.tsx", adminRoot), "utf8");

  assert.match(page, /buildSubmissionExportIdempotencyScope/);
  assert.match(page, /exportAttemptRef/);
  assert.match(page, /exportInFlightRef\.current \|\| exportSubmissions\.isPending/);
  assert.match(page, /exportSubmissionsRequest/);
  assert.match(page, /"Idempotency-Key"/);
  assert.match(page, /The export result is uncertain/);
  assert.match(page, /exportAttemptRef\.current = null/);
  assert.match(page, /New export/);
});

test("submission save retains the form on errors and sends explicit null clears", async () => {
  const page = await readFile(new URL("src/pages/submissions/Inbox.tsx", adminRoot), "utf8");

  assert.match(page, /if \(!selected \|\| updateSubmission\.isPending\) return/);
  assert.match(page, /ownerId: ownerDraft === "__unassigned" \? null : ownerDraft/);
  assert.match(page, /notes: notesDraft\.trim\(\) \|\| null/);
  assert.match(page, /catch \(error\)/);
  assert.match(page, /Your changes were not saved/);
  assert.match(page, /Saving workflow changes/);
  assert.match(page, /!updateSubmission\.isPending && setSelected\(null\)/);
});
