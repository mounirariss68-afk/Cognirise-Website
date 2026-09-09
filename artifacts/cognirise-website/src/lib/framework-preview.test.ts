import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFrameworkPreviewContent } from "./framework-preview";

test("malformed framework draft fields normalize into render-safe buyer content", () => {
  const normalized = normalizeFrameworkPreviewContent({
    template: "agent-authority",
    teaser: { unsafe: true },
    methodology: [
      { type: "heading", level: "huge", text: { unsafe: true } },
      { type: "list", items: { not: "an array" } },
      { type: "paragraph", text: "Visible draft copy" },
    ],
    workedExample: {
      reversibility: 4,
      reach: {},
      requestedAuthority: "unknown",
      title: { unsafe: true },
    },
    sectorExamples: [
      null,
      { reversibility: {}, reach: 2, handover: [], title: { unsafe: true } },
    ],
    sources: [{ label: { unsafe: true } }, { label: "Valid citation", url: 42 }],
    mediaIds: "not-an-array",
  });

  assert.ok(normalized);
  assert.equal(normalized.teaser, "");
  assert.deepEqual(normalized.methodology, [
    { type: "list", style: "bullet", items: [] },
    { type: "paragraph", text: "Visible draft copy" },
  ]);
  assert.equal(normalized.workedExample.reversibility, "R1");
  assert.equal(normalized.workedExample.reach, "H1");
  assert.equal(normalized.workedExample.requestedAuthority, "out-of-loop");
  assert.equal(normalized.sectorExamples[0].title, "Untitled handover");
  assert.deepEqual(normalized.sources, [{ label: "Valid citation", url: undefined, accessedAt: undefined }]);
});