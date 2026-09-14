import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

function queryValues(value: unknown, seen = new WeakSet<object>()): unknown[] {
  if (!value || typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);
  if (value.constructor?.name === "Param" && "value" in value) {
    return [(value as { value: unknown }).value];
  }
  return Object.values(value).flatMap((child) => queryValues(child, seen));
}

test("retired readiness creation preserves legacy reopen, expiry, and token deletion", {
  concurrency: false,
}, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "readiness-assessment-test-session-secret";

  const [
    expressModule,
    { db },
    { default: readinessRouter },
    { hashToken },
  ] = await Promise.all([
    import("express"),
    import("@workspace/db"),
    import("../src/routes/readiness-assessments.ts"),
    import("../src/lib/security.ts"),
  ]);
  const database = db as unknown as {
    insert: (...args: unknown[]) => unknown;
    select: (...args: unknown[]) => unknown;
    delete: (...args: unknown[]) => unknown;
  };
  const id = "00000000-0000-4000-8000-000000000274";
  let stored: {
    id: string;
    answers: Record<string, string>;
    decision: string;
    unresolvedConditionIds: string[];
    deleteTokenHash: string;
    createdAt: Date;
    expiresAt: Date;
  } | null = null;

  const answers = {
    stability: "ready",
    access: "prepare",
    observability: "ready",
    fallback: "ready",
    exceptions: "stop",
    economics: "ready",
  };
  const deleteToken = "legacy-readiness-delete-token-with-valid-length";
  stored = {
    id,
    answers,
    decision: "stop",
    unresolvedConditionIds: ["access", "exceptions"],
    deleteTokenHash: hashToken(deleteToken),
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    expiresAt: new Date(Date.now() + 60_000),
  };
  const seededRecord = {
    ...stored,
    answers: { ...stored.answers },
    unresolvedConditionIds: [...stored.unresolvedConditionIds],
  };
  let insertCalls = 0;
  t.mock.method(database, "insert", () => {
    insertCalls += 1;
    throw new Error("Retired readiness creation must not write to the database");
  });
  t.mock.method(database, "select", () => ({
    from: () => ({
      where: (condition: unknown) => ({
        limit: async () => {
          const values = queryValues(condition);
          const appliesExpiryBoundary = values.some((value) => value instanceof Date);
          if (
            stored
            && values.includes(stored.id)
            && appliesExpiryBoundary
            && stored.expiresAt.getTime() > Date.now()
          ) {
            return [stored];
          }
          return [];
        },
      }),
    }),
  }));
  t.mock.method(database, "delete", () => ({
    where: (condition: unknown) => ({
      returning: async () => {
        if (!stored) return [];
        const values = queryValues(condition);
        if (!values.includes(stored.id) || !values.includes(stored.deleteTokenHash)) return [];
        const deleted = { id: stored.id };
        stored = null;
        return [deleted];
      },
    }),
  }));

  const app = expressModule.default();
  app.use(expressModule.default.json());
  app.use(readinessRouter);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Readiness test server did not open a port");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });

  const retiredResponse = await fetch(`${baseUrl}/public/readiness-assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answers,
      evidence: "must not be accepted or persisted",
    }),
  });
  assert.equal(retiredResponse.status, 410);
  assert.deepEqual(await retiredResponse.json(), {
    error: "Anonymous readiness saves are no longer available.",
  });
  assert.equal(insertCalls, 0);
  assert.deepEqual(stored, seededRecord);

  const reopenedResponse = await fetch(`${baseUrl}/public/readiness-assessments/${id}`);
  assert.equal(reopenedResponse.status, 200);
  const reopened = await reopenedResponse.json() as Record<string, unknown>;
  assert.deepEqual(reopened.answers, answers);
  assert.equal(reopened.decision, "stop");
  assert.equal("deleteToken" in reopened, false);
  assert.equal("deleteTokenHash" in reopened, false);

  if (!stored) throw new Error("The readiness record was not captured");
  stored.expiresAt = new Date("2000-01-01T00:00:00.000Z");
  assert.equal((await fetch(`${baseUrl}/public/readiness-assessments/${id}`)).status, 404);
  stored.expiresAt = new Date(Date.now() + 60_000);

  const wrongDelete = await fetch(`${baseUrl}/public/readiness-assessments/${id}`, {
    method: "DELETE",
    headers: { "X-Delete-Token": "wrong-token-with-valid-capability-length" },
  });
  assert.equal(wrongDelete.status, 403);
  const deleted = await fetch(`${baseUrl}/public/readiness-assessments/${id}`, {
    method: "DELETE",
    headers: { "X-Delete-Token": deleteToken },
  });
  assert.equal(deleted.status, 204);
  assert.equal((await fetch(`${baseUrl}/public/readiness-assessments/${id}`)).status, 404);
});