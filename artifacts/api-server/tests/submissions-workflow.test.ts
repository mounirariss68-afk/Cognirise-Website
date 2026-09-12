import assert from "node:assert/strict";
import test from "node:test";
import {
  ExportSubmissionsResponse,
  UpdateSubmissionBody,
} from "@workspace/api-zod";

test("submission updates support independent workflow fields and explicit clearing", () => {
  assert.equal(UpdateSubmissionBody.safeParse({ status: "contacted" }).success, true);
  assert.equal(UpdateSubmissionBody.safeParse({ ownerId: null }).success, true);
  assert.equal(UpdateSubmissionBody.safeParse({ notes: null }).success, true);
  assert.equal(UpdateSubmissionBody.safeParse({
    status: "resolved",
    ownerId: "00000000-0000-4000-8000-000000000001",
    notes: "Followed up with the contact.",
  }).success, true);
});

test("submission update contract rejects invalid workflow values and oversized notes", () => {
  assert.equal(UpdateSubmissionBody.safeParse({ status: "waiting" }).success, false);
  assert.equal(UpdateSubmissionBody.safeParse({ notes: "x".repeat(4001) }).success, false);
});

test("export contract distinguishes queued exports from ready downloads", () => {
  assert.equal(ExportSubmissionsResponse.safeParse({
    id: "export-1",
    status: "queued",
    downloadUrl: null,
    expiresAt: new Date().toISOString(),
  }).success, true);
  assert.equal(ExportSubmissionsResponse.safeParse({
    id: "export-2",
    status: "ready",
    downloadUrl: "data:text/csv;charset=utf-8,id%2Cstatus",
    expiresAt: new Date().toISOString(),
  }).success, true);
});