import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  hashRecoveryCode,
  encryptTotpSecret,
  decryptTotpSecret,
  isExactSameOrigin,
  SlidingWindowThrottle,
  totp,
  verifyPassword,
  verifyRecoveryCode,
  verifyTotp,
  isStrongPassword,
} from "../src/lib/security.ts";
import {
  roleAtLeast,
  selectMarketWithUaeFallback,
  canChangeCanonicalSlug,
  isPublicContentVisible,
  isInitialSetupRequired,
} from "../src/lib/policy.ts";
import { detectMediaSignature } from "../src/lib/object-storage.ts";

test("scrypt password hashes are salted and verifiable", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword("anything", "malformed"), false);
});

test("password rotation enforces first-party credential strength", () => {
  assert.equal(isStrongPassword("all-lowercase-password"), false);
  assert.equal(isStrongPassword("Strong-Password-42!"), true);
});

test("TOTP accepts only the bounded clock window", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const now = 1_700_000_000_000;
  const code = totp(secret, now);
  assert.equal(verifyTotp(secret, code, now), true);
  assert.equal(verifyTotp(secret, code, now + 90_000), false);
  assert.equal(verifyTotp(secret, "123"), false);
});

test("TOTP enrollment secrets are encrypted at rest", () => {
  const prior = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "a-test-session-secret-that-is-longer-than-32-chars";
  try {
    const secret = "JBSWY3DPEHPK3PXP";
    const envelope = encryptTotpSecret(secret);
    assert.notEqual(envelope, secret);
    assert.equal(decryptTotpSecret(envelope), secret);
  } finally {
    if (prior === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = prior;
  }
});

test("recovery codes are normalized, hashed, and located safely", () => {
  const hashes = [hashRecoveryCode("ABCD-EFGH"), hashRecoveryCode("WXYZ-1234")];
  assert.equal(verifyRecoveryCode("abcd efgh", hashes), 0);
  assert.equal(verifyRecoveryCode("unknown", hashes), -1);
});

test("origin comparison is exact and rejects lookalikes", () => {
  assert.equal(isExactSameOrigin("https://cms.example", "https://cms.example"), true);
  assert.equal(isExactSameOrigin("https://cms.example.evil", "https://cms.example"), false);
  assert.equal(isExactSameOrigin(undefined, "https://cms.example"), false);
});

test("throttle closes after the configured number of attempts", () => {
  const limiter = new SlidingWindowThrottle(2, 1_000);
  assert.equal(limiter.consume("client", 1).allowed, true);
  assert.equal(limiter.consume("client", 2).allowed, true);
  assert.equal(limiter.consume("client", 3).allowed, false);
  assert.equal(limiter.consume("client", 1_002).allowed, true);
});

test("role hierarchy separates editing and publishing", () => {
  assert.equal(roleAtLeast("editor", "editor"), true);
  assert.equal(roleAtLeast("editor", "publisher"), false);
  assert.equal(roleAtLeast("publisher", "editor"), true);
  assert.equal(roleAtLeast("administrator", "publisher"), true);
  assert.equal(roleAtLeast("viewer", "editor"), false);
});

test("market selection prefers exact edition then UAE and never draft-like absence", () => {
  assert.equal(selectMarketWithUaeFallback("ksa", ["ksa", "uae"]), "ksa");
  assert.equal(selectMarketWithUaeFallback("ksa", ["uae"]), "uae");
  assert.equal(selectMarketWithUaeFallback("ksa", ["europe"]), null);
});

test("drafts and restricted case studies are isolated from public selection", () => {
  assert.equal(isPublicContentVisible("publication", { visibility: "restricted" }), false);
  assert.equal(isPublicContentVisible("case-study", { visibility: "restricted" }), false);
  assert.equal(isPublicContentVisible("case-study", { confidential: true }), false);
  assert.equal(isPublicContentVisible("case-study", { visibility: "public" }), true);
  assert.equal(isPublicContentVisible("person", { content: { confidential: true } }), false);
  assert.equal(isPublicContentVisible("partner", { content: { visibility: "restricted" } }), false);
  assert.equal(isPublicContentVisible("partner", { visibility: "public", content: { visibility: "restricted" } }), false);
  // A market without a published edition can only select an existing UAE edition.
  assert.equal(selectMarketWithUaeFallback("ksa", ["uae"]), "uae");
  assert.equal(selectMarketWithUaeFallback("ksa", []), null);
});

test("published slugs cannot be changed accidentally", () => {
  assert.equal(canChangeCanonicalSlug("stable-slug", "new-slug", "revision-id"), false);
  assert.equal(canChangeCanonicalSlug("stable-slug", "stable-slug", "revision-id"), true);
  assert.equal(canChangeCanonicalSlug("draft-slug", "new-slug", null), true);
});

test("editors cannot publish or administer", () => {
  assert.equal(roleAtLeast("editor", "publisher"), false);
  assert.equal(roleAtLeast("editor", "administrator"), false);
});

test("credentialless attribution users do not complete initial CMS setup", () => {
  assert.equal(isInitialSetupRequired(0), true);
  assert.equal(isInitialSetupRequired(1), false);
});

test("media type detection trusts magic bytes rather than claimed metadata", () => {
  assert.equal(detectMediaSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectMediaSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectMediaSignature(Buffer.from("RIFFxxxxWEBPVP8 ", "ascii")), "image/webp");
  assert.equal(detectMediaSignature(Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])), "image/avif");
  assert.equal(detectMediaSignature(Buffer.from("%PDF-1.7")), "application/pdf");
  assert.equal(detectMediaSignature(Buffer.from("not-an-image")), null);
});
