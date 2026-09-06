import assert from "node:assert/strict";
import test from "node:test";
import { requireSameOrigin } from "./auth";

function call(headers: Record<string, string | undefined>) {
  let statusCode: number | undefined;
  let body: unknown;
  const req = { get: (name: string) => headers[name.toLowerCase()], socket: { encrypted: headers["x-test-tls"] === "true" } };
  const res = {
    status: (code: number) => { statusCode = code; return res; },
    json: (value: unknown) => { body = value; return res; },
  };
  return { accepted: requireSameOrigin(req as never, res as never), statusCode, body };
}

test("same-origin guard responds and stops missing or cross-origin mutations", () => {
  for (const headers of [
    { host: "cms.example.test" },
    { host: "cms.example.test", origin: "https://other.example.test" },
  ]) {
    const result = call(headers);
    assert.equal(result.accepted, false);
    assert.equal(result.statusCode, 403);
    assert.deepEqual(result.body, { error: "Cross-origin CMS mutation rejected" });
  }
  assert.equal(call({ host: "cms.example.test", origin: "https://cms.example.test" }).accepted, true);
});

test("same-origin guard never trusts client forwarded headers", () => {
  const forged = call({
    host: "cms.example.test",
    origin: "https://attacker.example.test",
    "x-forwarded-host": "attacker.example.test",
    "x-forwarded-proto": "https",
  });
  assert.equal(forged.accepted, false);
});

test("production CMS mutations require direct HTTPS origin", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.equal(call({ host: "cms.example.test", origin: "http://cms.example.test" }).accepted, false);
    assert.equal(call({ host: "cms.example.test", origin: "https://cms.example.test" }).accepted, true);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("configured origins are exact exceptions only", () => {
  const previous = process.env.CMS_ALLOWED_ORIGINS;
  process.env.CMS_ALLOWED_ORIGINS = "https://review.example.test";
  try {
    assert.equal(call({ host: "cms.example.test", origin: "https://review.example.test" }).accepted, true);
    assert.equal(call({ host: "cms.example.test", origin: "https://review.example.test.attacker" }).accepted, false);
  } finally {
    if (previous === undefined) delete process.env.CMS_ALLOWED_ORIGINS;
    else process.env.CMS_ALLOWED_ORIGINS = previous;
  }
});