import assert from "node:assert/strict";
import test from "node:test";
import {
  ConsumeAccessTokenBody,
  InviteUserResponse,
  ResetUserPasswordResponse,
} from "@workspace/api-zod";
import {
  accessDeliveryCiphertext,
  accessLink,
  deliverAccessLink,
} from "../src/lib/access-delivery.ts";
import { canAccessAssignedMarket } from "../src/lib/policy.ts";

test("access links carry the one-time token only to the configured admin origin", () => {
  const previous = process.env.ADMIN_PUBLIC_URL;
  process.env.ADMIN_PUBLIC_URL = "https://cms.example/admin/";
  try {
    const link = new URL(accessLink("secret-token"));
    assert.equal(link.origin, "https://cms.example");
    assert.equal(link.pathname, "/admin/password-setup");
    assert.equal(link.searchParams.get("token"), "secret-token");
  } finally {
    if (previous === undefined) delete process.env.ADMIN_PUBLIC_URL;
    else process.env.ADMIN_PUBLIC_URL = previous;
  }
});

test("administrator delivery responses never expose credentials or access tokens", () => {
  const invitation = InviteUserResponse.parse({
    id: "user-1",
    user: {
      id: "user-1",
      name: "Editor",
      email: "editor@example.com",
      role: "editor",
      status: "invited",
      marketCodes: ["uae"],
       legacyAdministratorMarketCodes: [],
       capabilityMatrixConfigured: false,
      capabilityGrants: [],
      mfaEnabled: false,
      mustRotate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    delivery: "email",
    expiresAt: new Date(),
    createdAt: new Date(),
  });
  const reset = ResetUserPasswordResponse.parse({
    id: "user-1",
    delivery: "email",
    expiresAt: new Date(),
  });
  assert.equal("temporaryPassword" in invitation, false);
  assert.equal("token" in invitation, false);
  assert.equal("temporaryPassword" in reset, false);
  assert.equal("token" in reset, false);
});

test("token consumption requires a strong password and opaque token", () => {
  assert.equal(ConsumeAccessTokenBody.safeParse({
    token: "x".repeat(32),
    newPassword: "Strong-Password-42!",
  }).success, true);
  assert.equal(ConsumeAccessTokenBody.safeParse({
    token: "short",
    newPassword: "Strong-Password-42!",
  }).success, false);
});

test("empty market assignments deny non-administrators but not administrators", () => {
  assert.equal(canAccessAssignedMarket("administrator", [], "ksa"), true);
  assert.equal(canAccessAssignedMarket("editor", [], "ksa"), false);
  assert.equal(canAccessAssignedMarket("publisher", ["uae"], "uae"), true);
});

test("durable delivery payloads do not persist the raw access token", () => {
  const previousKey = process.env.ACCESS_DELIVERY_ENCRYPTION_KEY;
  process.env.ACCESS_DELIVERY_ENCRYPTION_KEY = "test-only-delivery-key";
  try {
    const token = "opaque-token-that-must-not-be-stored";
    const ciphertext = accessDeliveryCiphertext({
      email: "editor@example.com",
      name: "Editor",
      purpose: "invitation",
      token,
      expiresAt: new Date("2026-09-12T00:00:00Z"),
    });
    assert.match(ciphertext, /^v1:/);
    assert.equal(ciphertext.includes(token), false);
  } finally {
    if (previousKey === undefined) delete process.env.ACCESS_DELIVERY_ENCRYPTION_KEY;
    else process.env.ACCESS_DELIVERY_ENCRYPTION_KEY = previousKey;
  }
});

test("provider delivery carries a stable idempotency key", async () => {
  const previousEndpoint = process.env.ACCESS_EMAIL_WEBHOOK_URL;
  const previousOrigin = process.env.ADMIN_PUBLIC_URL;
  process.env.ACCESS_EMAIL_WEBHOOK_URL = "https://mailer.example.test/send";
  process.env.ADMIN_PUBLIC_URL = "https://cms.example.test/admin/";
  const previousFetch = globalThis.fetch;
  let request: Request | undefined;
  globalThis.fetch = async (input, init) => {
    request = new Request(input, init);
    return new Response(null, { status: 202, headers: { "x-message-id": "provider-1" } });
  };
  try {
    const result = await deliverAccessLink({
      email: "editor@example.com",
      name: "Editor",
      purpose: "password-reset",
      token: "opaque-token",
      expiresAt: new Date("2026-09-12T00:00:00Z"),
    }, "delivery-job-1");
    assert.equal(result.providerMessageId, "provider-1");
    assert.equal(request?.headers.get("idempotency-key"), "delivery-job-1");
    assert.match(String(await request?.text()), /password-setup/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousEndpoint === undefined) delete process.env.ACCESS_EMAIL_WEBHOOK_URL;
    else process.env.ACCESS_EMAIL_WEBHOOK_URL = previousEndpoint;
    if (previousOrigin === undefined) delete process.env.ADMIN_PUBLIC_URL;
    else process.env.ADMIN_PUBLIC_URL = previousOrigin;
  }
});