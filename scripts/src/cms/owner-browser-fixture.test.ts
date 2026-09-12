import assert from "node:assert/strict";
import test from "node:test";
import { resolveFixtureDocuments } from "./owner-browser-fixture-helpers";

const state = {
  prefix: "fixture-cms-owner-test",
  documents: [{ id: "setup-document", slug: "fixture-cms-owner-test-setup" }],
};

test("fixture cleanup discovers browser-created owned documents", () => {
  assert.deepEqual(
    resolveFixtureDocuments(
      state,
      [{ id: "browser-document", canonical_slug: "fixture-cms-owner-test-browser" }],
      [
        { id: "setup-document", canonical_slug: "fixture-cms-owner-test-setup" },
        { id: "browser-document", canonical_slug: "fixture-cms-owner-test-browser" },
      ],
    ),
    [
      { id: "setup-document", slug: "fixture-cms-owner-test-setup" },
      { id: "browser-document", slug: "fixture-cms-owner-test-browser" },
    ],
  );
});

test("fixture cleanup refuses prefix-only or external document matches", () => {
  assert.throws(
    () => resolveFixtureDocuments(
      state,
      [],
      [{ id: "unowned-document", canonical_slug: "fixture-cms-owner-test-unowned" }],
    ),
    /not linked to this fixture/,
  );
  assert.throws(
    () => resolveFixtureDocuments(
      state,
      [{ id: "external-document", canonical_slug: "production-document" }],
      [],
    ),
    /non-fixture document/,
  );
});