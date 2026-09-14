import assert from "node:assert/strict";
import test from "node:test";
import { NAVIGATION_ITEM_REGISTRY, validateCmsSnapshot } from "@workspace/api-zod";

type NavigationResponse = {
  items: Array<{ id: string; visible: boolean }>;
  pages: Array<{ path: string; enabled: boolean }>;
};

const guardrailsPayload = {
  slug: "guardrails-framework",
  title: "The Guardrails Framework",
  summary: "A governed framework for enforcing AI guardrails.",
  content: {
    schemaVersion: 1,
    template: "agent-authority" as const,
    teaser: "Govern every handover according to its exposure.",
    handoverExplanation: "Approved evidence earns any increase in authority.",
    methodology: [{ type: "paragraph" as const, text: "Exposure sets the ceiling for a handover." }],
    workedExample: {
      sector: "Travel & hospitality",
      title: "Passenger re-accommodation",
      handover: "action" as const,
      reversibility: "R3" as const,
      reach: "H2" as const,
      exposureBand: "E2" as const,
      oversight: "On the loop, with a stated intervention window",
      detail: "The duty manager owns the handover.",
      requestedAuthority: "on-loop" as const,
      interventionWindow: "Before released-seat inventory expires.",
      accountableRole: "Duty Manager, Operations Control Centre",
      promotionEvidence: "An approved body of clean rebookings.",
      automaticDemotion: "Any involuntary downgrade.",
    },
    sectorExamples: [],
    heroMediaId: "00000000-0000-4000-8000-000000000001",
    visibility: "public" as const,
    order: 0,
    sources: [{ label: "Approved source", url: "https://example.com/source", accessedAt: "2026-09-06" }],
    verificationDate: "2026-09-06",
    reviewDate: "2027-03-06",
    relatedIds: [],
  },
  mediaIds: [],
  markets: ["uae"],
};

async function withPublicNavigation(
  t: { mock: { method: (...args: any[]) => unknown }; after: (fn: () => void | Promise<void>) => void },
  available: boolean,
) {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);
  const now = new Date("2026-01-01T00:00:00Z");
  const legacyRows = NAVIGATION_ITEM_REGISTRY.map((item) => ({
    id: item.id,
    visible: true,
    updated_at: now,
  }));
  const parsed = validateCmsSnapshot("framework", guardrailsPayload, "publish");
  if (!parsed.success) throw new Error(parsed.errors.join("; "));
  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae",
          default_locale: "en",
          fallback_market_code: null,
          fallback_locale: null,
          is_canonical: true,
        }],
      };
    }
    if (statement.includes("cms_navigation_published_policies")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("WITH represented_sources")) {
      return available
        ? {
          rowCount: 1,
          rows: [{
            kind: "framework",
            payload: guardrailsPayload,
            available: true,
            source_rank: 1,
            public_eligible: true,
          }],
        }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("FROM cms_navigation_items")) {
      return { rowCount: legacyRows.length, rows: legacyRows };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/public/navigation?market=uae&locale=en`,
  );
  assert.equal(response.status, 200);
  return await response.json() as NavigationResponse;
}

test("legacy public navigation hides unavailable Guardrails without a published policy", async (t) => {
  const body = await withPublicNavigation(t, false);
  assert.equal(body.items.find((item) => item.id === "what-we-do")?.visible, true);
  assert.equal(body.pages.find((page) => page.path === "/")?.enabled, true);
  assert.equal(body.items.find((item) => item.id === "methodologies.guardrails")?.visible, false);
  assert.equal(body.pages.find((page) => page.path === "/methodologies/guardrails-framework")?.enabled, false);
  assert.equal(body.items.some((item) => item.id === "work"), false);
  assert.equal(body.pages.some((page) => page.path === "/work"), false);
});

test("legacy public navigation retains available Guardrails without a published policy", async (t) => {
  const body = await withPublicNavigation(t, true);
  assert.equal(body.items.find((item) => item.id === "methodologies.guardrails")?.visible, true);
  assert.equal(body.pages.find((page) => page.path === "/methodologies/guardrails-framework")?.enabled, true);
});
