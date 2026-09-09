import assert from "node:assert/strict";
import test from "node:test";
import { hashToken } from "../src/lib/security.ts";

const baseEvent = {
  sessionId: "session-1",
  occurredAt: "2026-09-08T18:00:00.000Z",
  page: "/",
  referrer: null,
  market: "uae",
  consentVersion: "1",
};

test("service-interest events persist fixed dimensions only with analytics consent", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";

  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);

  const consentedDigest = hashToken("consented-visitor");
  const inserts: unknown[][] = [];
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_analytics_consents")) {
      return values?.[0] === consentedDigest
        ? { rowCount: 1, rows: [{ id: "consent-1", analytics_allowed: true }] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_analytics_events")) {
      inserts.push(values ?? []);
      return { rowCount: 1, rows: [{ id: `event-${inserts.length}` }] };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const endpoint = `http://127.0.0.1:${address.port}/api/analytics/events`;
  const send = (body: Record<string, unknown>) =>
    fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: new URL(endpoint).origin,
        "user-agent": "analytics-route-test",
      },
      body: JSON.stringify(body),
    });

  const activation = await send({
    ...baseEvent,
    visitorId: "consented-visitor",
    name: "service_card_activated",
    properties: {
      service_line: "consulting-engineering",
      source: "homepage",
      ignored_free_form: "must not persist",
    },
  });
  assert.equal(activation.status, 202);
  assert.deepEqual(await activation.json(), { accepted: true, id: "event-1" });

  const navigation = await send({
    ...baseEvent,
    visitorId: "consented-visitor",
    name: "service_destination_clicked",
    properties: {
      service_line: "ai-platforms",
      destination: "/platforms/lupitor",
      source: "services_overview",
    },
  });
  assert.equal(navigation.status, 202);
  assert.deepEqual(await navigation.json(), { accepted: true, id: "event-2" });

  const noConsent = await send({
    ...baseEvent,
    visitorId: "visitor-without-consent",
    name: "service_destination_clicked",
    properties: {
      service_line: "ai-platforms",
      destination: "/platforms",
      source: "homepage",
    },
  });
  assert.equal(noConsent.status, 202);
  assert.deepEqual(await noConsent.json(), { accepted: false, id: null });

  const caseEvents = [
    ["case_card_open", {
      case_id: "00000000-0000-4000-8000-000000000001",
      case_slug: "governed-case",
      sector: "Travel & Hospitality",
      stage: "pilot",
      mandate: "confidential content must never persist",
    }],
    ["case_sector_filter", { sector: "Financial Services", action: "apply", stage: "pilot" }],
    ["case_visual_enlarge", {
      case_id: "00000000-0000-4000-8000-000000000001",
      case_slug: "governed-case",
      stage: "pilot",
    }],
    ["case_detail_visit", { case_slug: "governed-case", sector: "Travel & Hospitality", stage: "pilot" }],
    ["case_cta", { case_slug: "governed-case", stage: "pilot", action: "contact" }],
  ] as const;
  for (const [name, properties] of caseEvents) {
    const response = await send({
      ...baseEvent,
      visitorId: "consented-visitor",
      name,
      properties,
    });
    assert.deepEqual(await response.json(), {
      accepted: true,
      id: `event-${inserts.length}`,
    });
  }
  const contentLeak = await send({
    ...baseEvent,
    visitorId: "consented-visitor",
    name: "case_cta",
    properties: { case_slug: "governed-case", action: "Contact us about £4.2m!" },
  });
  assert.deepEqual(await contentLeak.json(), { accepted: false, id: null });

  assert.equal(inserts.length, 7);
  assert.deepEqual(inserts[0]?.[7], {
    service_line: "consulting-engineering",
    source: "homepage",
  });
  assert.deepEqual(inserts[1]?.[7], {
    service_line: "ai-platforms",
    destination: "/platforms/lupitor",
    source: "services_overview",
  });
  assert.deepEqual(inserts[2]?.[7], {
    case_id: "00000000-0000-4000-8000-000000000001",
    case_slug: "governed-case",
    sector: "Travel & Hospitality",
    stage: "pilot",
  });
  assert.deepEqual(inserts[6]?.[7], {
    case_slug: "governed-case",
    stage: "pilot",
    action: "contact",
  });
});