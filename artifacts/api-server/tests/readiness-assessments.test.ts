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

test("anonymous readiness records save, reopen, expire, and require the deletion token", {
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
  ] = await Promise.all([
    import("express"),
    import("@workspace/db"),
    import("../src/routes/readiness-assessments.ts"),
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

  t.mock.method(database, "insert", () => ({
    values(values: Omit<NonNullable<typeof stored>, "id" | "createdAt">) {
      stored = {
        id,
        createdAt: new Date("2026-09-10T00:00:00.000Z"),
        ...values,
      };
      return {
        returning: async () => [stored],
      };
    },
  }));
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

  const answers = {
    stability: "ready",
    access: "prepare",
    observability: "ready",
    fallback: "ready",
    exceptions: "stop",
    economics: "ready",
  };
  const createdResponse = await fetch(`${baseUrl}/public/readiness-assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answers,
      evidence: "must not be accepted or persisted",
    }),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json() as Record<string, unknown>;
  assert.equal(created.id, id);
  assert.equal(created.decision, "stop");
  assert.deepEqual(created.unresolvedConditionIds, ["access", "exceptions"]);
  assert.equal(typeof created.deleteToken, "string");
  assert.equal("deleteTokenHash" in created, false);
  assert.deepEqual(stored?.answers, answers);
  assert.equal("evidence" in (stored?.answers ?? {}), false);

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
    headers: { "X-Delete-Token": String(created.deleteToken) },
  });
  assert.equal(deleted.status, 204);
  assert.equal((await fetch(`${baseUrl}/public/readiness-assessments/${id}`)).status, 404);
});