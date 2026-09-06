import assert from "node:assert/strict";
import test from "node:test";
import { canExchangePreviewSession, canReadPreviewSession, signPreviewToken, verifyPreviewToken } from "./security";

const secret = "a-secure-test-key-that-is-at-least-32-characters";

test("preview capability is bound, expires, and cannot be replayed as a wider claim", () => {
  const token = signPreviewToken({ market: "ksa", slug: "about-us", routeKind: "about" }, secret, 100, 60);
  const claims = verifyPreviewToken(token, [secret], 120);
  assert.deepEqual(claims && { market: claims.market, slug: claims.slug, routeKind: claims.routeKind }, {
    market: "ksa", slug: "about-us", routeKind: "about",
  });
  assert.equal(verifyPreviewToken(token, [secret], 160), undefined);
  assert.equal(verifyPreviewToken(token, ["different-secret-that-is-at-least-32"], 120), undefined);
});

test("exchange consumes only the capability while its exact session remains readable until expiry", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const session = { exchangedAt: null, revokedAt: null, expiresAt: new Date("2026-01-01T00:10:00Z") };
  assert.equal(canExchangePreviewSession(session, now), true);
  const exchanged = { ...session, exchangedAt: now };
  assert.equal(canExchangePreviewSession(exchanged, now), false);
  assert.equal(canReadPreviewSession(exchanged, now), true);
  assert.equal(canReadPreviewSession(exchanged, new Date("2026-01-01T00:10:00Z")), false);
});