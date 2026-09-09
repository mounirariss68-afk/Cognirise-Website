import assert from "node:assert/strict";
import test from "node:test";
import {
  ConsumeAccessTokenBody,
  InviteUserResponse,
  ResetUserPasswordResponse,
} from "@workspace/api-zod";
import { accessLink } from "../src/lib/access-delivery.ts";
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