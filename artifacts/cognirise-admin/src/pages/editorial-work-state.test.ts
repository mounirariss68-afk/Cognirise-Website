import assert from "node:assert/strict";
import test from "node:test";
import { editorialAdminHref, isOverdue, revisionStateLabel } from "./editorial-work-state";

test("editorial queue links preserve an exact shared-source address", () => {
  assert.equal(
    editorialAdminHref("/documents/doc-1?market=shared-source&locale=und"),
    "/content/doc-1?market=shared-source&locale=und",
  );
});

test("editorial queue link fallback includes exact document market and locale", () => {
  assert.equal(
    editorialAdminHref(null, { documentId: "doc one", market: "uae", locale: "en-US" }),
    "/content/doc%20one?market=uae&locale=en-US",
  );
});

test("queue state separates a live revision from its successor draft", () => {
  assert.equal(
    revisionStateLabel({
      publishedRevisionId: "published-1",
      currentRevisionId: "draft-2",
      currentRevisionNumber: 2,
      workflowState: "draft",
    }),
    "Live revision remains published · successor draft r2",
  );
  assert.equal(isOverdue("2026-01-01T00:00:00.000Z", Date.parse("2026-01-02T00:00:00.000Z")), true);
});