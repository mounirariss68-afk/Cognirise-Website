import assert from "node:assert/strict";
import test from "node:test";
import {
  audit,
  existingOperationReceipt,
  operationDigest,
  requestDigest,
  redactAuditMetadata,
} from "../src/lib/cms.ts";

const auth = {
  id: "session-1",
  tokenHash: "session-hash",
  user: {
    id: "actor-1",
    name: "Administrator",
    email: "admin@example.com",
    role: "administrator" as const,
    status: "active" as const,
    marketCodes: [],
    mfaEnabled: true,
    mustRotate: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  mfaVerified: true,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 60_000),
};

test("audit writes through the governing transaction executor", async () => {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const executor = {
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      return { rows: [], rowCount: 1 };
    },
  };
  await audit(auth, "fixture.updated", "fixture", "fixture-1", {
    token: "must-not-be-stored",
    delivery: { accessLink: "https://cms.invalid/?token=secret" },
    changed: true,
  }, executor);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].values?.[5] && JSON.stringify(calls[0].values[5]).includes("secret"), false);
  assert.equal(calls[0].values?.[5] && JSON.stringify(calls[0].values[5]).includes("redacted"), true);
});

test("audit failure rejects before a caller can commit", async () => {
  const executor = {
    query: async () => {
      throw new Error("fault-injected audit failure");
    },
  };
  await assert.rejects(
    audit(auth, "fixture.updated", "fixture", "fixture-1", {}, executor),
    /fault-injected audit failure/,
  );
});

test("operation identity binds actor, subject and exact request", () => {
  const first = operationDigest("actor-1", "users.invite", "editor@example.com", "retry-1");
  assert.equal(first, operationDigest("actor-1", "users.invite", "editor@example.com", "retry-1"));
  assert.notEqual(first, operationDigest("actor-2", "users.invite", "editor@example.com", "retry-1"));
  assert.notEqual(first, operationDigest("actor-1", "users.invite", "editor@example.com", "retry-2"));
  assert.notEqual(requestDigest({ a: 1, b: 2 }), requestDigest({ a: 1, b: 3 }));
});

test("conflicting operation receipts are rejected", async () => {
  const executor = {
    query: async () => ({
      rows: [{
        idempotency_key: "receipt",
        operation: "users.invite",
        subject_id: "editor@example.com",
        request_digest: "different",
        actor_user_id: "actor-1",
        response: null,
        status_code: 201,
      }],
    }),
  };
  await assert.rejects(
    existingOperationReceipt(
      executor,
      "receipt",
      "users.invite",
      "editor@example.com",
      "expected",
      "actor-1",
    ),
    /already associated/,
  );
});

test("redaction handles nested sensitive fields without changing safe metadata", () => {
  assert.deepEqual(redactAuditMetadata({
    count: 2,
    tokenDigest: "digest",
    nested: { password: "secret", status: "pending" },
  }), {
    count: 2,
    tokenDigest: "[redacted]",
    nested: { password: "[redacted]", status: "pending" },
  });
});