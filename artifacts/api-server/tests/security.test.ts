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
import {
  classifyMfaFailure,
  EnrollmentStore,
  LoginChallengeStore,
} from "../src/lib/mfa-lifecycle.ts";

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

test("TOTP matches independent RFC 6238 SHA-1 vectors at six digits", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(totp(secret, 59_000), "287082");
  assert.equal(totp(secret, 1_111_111_109_000), "081804");
  assert.equal(totp(secret, 1_234_567_890_000), "005924");
});

test("MFA enrollment stays stable for a session until it expires", () => {
  const store = new EnrollmentStore();
  let issued = 0;
  const create = () => ({
    secret: `SECRET${++issued}`,
    expiresAt: new Date(20_000),
  });
  assert.equal(store.getOrCreate("session", create, new Date(1_000)).secret, "SECRET1");
  assert.equal(store.getOrCreate("session", create, new Date(10_000)).secret, "SECRET1");
  assert.equal(store.getOrCreate("session", create, new Date(20_000)).secret, "SECRET2");
});

test("MFA lifecycle rejects expired codes and consumes successful login challenges", () => {
  const challenges = new LoginChallengeStore();
  const challenge = { userId: "user", secret: "SECRET", expiresAt: new Date(20_000) };
  challenges.set("challenge", challenge);
  assert.equal(classifyMfaFailure(challenges.get("missing"), false, new Date(1_000)), "not_found");
  assert.equal(classifyMfaFailure(challenge, false, new Date(1_000)), "code_mismatch");
  assert.equal(classifyMfaFailure(challenge, true, new Date(20_000)), "expired");
  assert.equal(classifyMfaFailure(challenge, true, new Date(1_000)), null);
  assert.equal(challenges.consume("challenge")?.userId, "user");
  assert.equal(challenges.consume("challenge"), undefined);
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

test("MFA endpoints preserve enrollment and complete a later skewed login challenge", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "endpoint-test-session-secret-that-is-longer-than-32-chars";

  const [{ default: app }, { pool }, { csrfForSession, SESSION_COOKIE, CSRF_COOKIE }, security] =
    await Promise.all([
      import("../src/app.ts"),
      import("@workspace/db"),
      import("../src/lib/auth.ts"),
      import("../src/lib/security.ts"),
    ]);

  const passwordHash = await security.hashPassword("Strong-Password-42!");
  let encryptedSecret = "";
  const userRow = {
    id: "user-1",
    user_id: "user-1",
    name: "Administrator",
    display_name: "Administrator",
    email: "admin@example.com",
    role: "administrator",
    status: "active",
    must_rotate: false,
    last_login_at: null,
    created_at: new Date(),
    user_created_at: new Date(),
    updated_at: new Date(),
    user_updated_at: new Date(),
  };

  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return { rowCount: 1, rows: [{ ...userRow, token_digest: security.hashToken("session-token"), mfa_satisfied_at: null, expires_at: new Date(Date.now() + 60_000) }] };
    }
    if (statement.includes("mfa_secret") && statement.includes("FROM cms_users u")) {
      return { rowCount: 1, rows: [{ ...userRow, password_hash: passwordHash, temporary_expires_at: null, mfa_enabled: true, mfa_secret: encryptedSecret }] };
    }
    if (statement.includes("INSERT INTO cms_sessions")) {
      return { rowCount: 1, rows: [{ id: "verified-session", created_at: new Date() }] };
    }
    if (statement.includes("SELECT u.id,u.display_name name")) {
      return { rowCount: 1, rows: [{ ...userRow, mfa_enabled: true }] };
    }
    return { rowCount: 1, rows: [] };
  });

  t.mock.method(pool, "connect", async () => ({
    query: async (sql: unknown, values?: unknown[]) => {
      const statement = String(sql);
      if (statement.includes("INSERT INTO cms_totp_credentials")) {
        encryptedSecret = String(values?.[1]);
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  }));

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const tokenHash = security.hashToken("session-token");
  const csrf = csrfForSession(tokenHash);
  const authenticatedHeaders = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${SESSION_COOKIE}=session-token; ${CSRF_COOKIE}=${csrf}`,
  };

  const firstSetupResponse = await fetch(`${origin}/api/auth/mfa/setup`, {
    method: "POST",
    headers: authenticatedHeaders,
    body: "{}",
  });
  assert.equal(firstSetupResponse.status, 200);
  const firstSetup = await firstSetupResponse.json() as { secret: string; provisioningUri: string };

  const repeatedSetupResponse = await fetch(`${origin}/api/auth/mfa/setup`, {
    method: "POST",
    headers: authenticatedHeaders,
    body: "{}",
  });
  assert.equal(repeatedSetupResponse.status, 200);
  const repeatedSetup = await repeatedSetupResponse.json() as { secret: string; provisioningUri: string };
  assert.deepEqual(repeatedSetup, firstSetup);

  const invalidConfirmResponse = await fetch(`${origin}/api/auth/mfa/confirm`, {
    method: "POST",
    headers: authenticatedHeaders,
    body: JSON.stringify({ code: "000000" }),
  });
  assert.equal(invalidConfirmResponse.status, 401);
  assert.deepEqual(await invalidConfirmResponse.json(), {
    error: "The authenticator code is invalid or the setup has expired.",
  });

  const confirmResponse = await fetch(`${origin}/api/auth/mfa/confirm`, {
    method: "POST",
    headers: authenticatedHeaders,
    body: JSON.stringify({ code: security.totp(firstSetup.secret) }),
  });
  assert.equal(confirmResponse.status, 200);
  assert.notEqual(encryptedSecret, firstSetup.secret);
  assert.equal(security.decryptTotpSecret(encryptedSecret), firstSetup.secret);

  const loginResponse = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email: "admin@example.com", password: "Strong-Password-42!" }),
  });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json() as { mfaChallenge: { id: string } };

  const verifyResponse = await fetch(`${origin}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      challengeId: login.mfaChallenge.id,
      code: security.totp(firstSetup.secret, Date.now() - 30_000),
    }),
  });
  assert.equal(verifyResponse.status, 200);
  const verified = await verifyResponse.json() as { authenticated: boolean; session: { mfaVerified: boolean } };
  assert.equal(verified.authenticated, true);
  assert.equal(verified.session.mfaVerified, true);

  const replayResponse = await fetch(`${origin}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      challengeId: login.mfaChallenge.id,
      code: security.totp(firstSetup.secret),
    }),
  });
  assert.equal(replayResponse.status, 401);
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
