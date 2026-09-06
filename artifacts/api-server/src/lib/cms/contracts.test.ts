import assert from "node:assert/strict";
import test from "node:test";
import { cmsEditionPayloadSchema } from "./contracts";
import { resolvePublicEdition } from "./adapter";

const payload = {
  schemaVersion: 1,
  documentId: "page.home",
  market: "uae",
  fallbackMode: "canonical",
  content: {
    kind: "page",
    title: "Home",
    routeKind: "home",
    canonicalSlug: "home",
    sections: [],
    ownership: { owner: { id: "person.owner" } },
  },
};

test("normalized edition payload accepts only the strict versioned contract", () => {
  assert.equal(cmsEditionPayloadSchema.safeParse(payload).success, true);
  assert.equal(cmsEditionPayloadSchema.safeParse({ ...payload, unexpected: true }).success, false);
  assert.equal(cmsEditionPayloadSchema.safeParse({ ...payload, documentId: "../page" }).success, false);
  assert.equal(cmsEditionPayloadSchema.safeParse({
    ...payload,
    content: { ...payload.content, canonicalSlug: "Not a slug" },
  }).success, false);
});

test("market fallback requires canonical UAE and permits explicit unavailability", () => {
  assert.equal(cmsEditionPayloadSchema.safeParse({ ...payload, market: "ksa", fallbackMode: "canonical" }).success, false);
  assert.equal(cmsEditionPayloadSchema.safeParse({ ...payload, market: "ksa", fallbackMode: "uaeFallback" }).success, true);
  assert.equal(cmsEditionPayloadSchema.safeParse({ ...payload, market: "ksa", fallbackMode: "unavailable" }).success, true);
});

test("public resolution never leaks drafts and only uses an explicit live UAE fallback", () => {
  const now = new Date("2026-01-02T00:00:00Z");
  const uae = { market: "uae", fallbackMode: "canonical", publicationState: "published", publishAt: null, expiresAt: null } as const;
  assert.equal(resolvePublicEdition(
    { market: "ksa", fallbackMode: "uaeFallback", publicationState: "draft", publishAt: null, expiresAt: null },
    uae, "ksa", now,
  ), "unavailable");
  assert.equal(resolvePublicEdition(
    { market: "ksa", fallbackMode: "uaeFallback", publicationState: "published", publishAt: null, expiresAt: null },
    uae, "ksa", now,
  ), "uae");
  assert.equal(resolvePublicEdition(
    { market: "ksa", fallbackMode: "unavailable", publicationState: "published", publishAt: null, expiresAt: null },
    uae, "ksa", now,
  ), "unavailable");
});