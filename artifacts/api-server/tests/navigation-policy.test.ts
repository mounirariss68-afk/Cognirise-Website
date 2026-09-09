import assert from "node:assert/strict";
import test from "node:test";
import { UpdateNavigationSettingsSchema } from "@workspace/api-zod";
import { isPublishedPageAvailable, publishedNavigationPolicy } from "../src/lib/navigation-policy";
import { pool } from "@workspace/db";

const base = {
  market: "ksa",
  locale: "en",
  pages: [
    { path: "/platforms", enabled: true },
    { path: "/platforms/cognios", enabled: false },
  ],
  items: [
    {
      id: "platforms",
      label: "Platforms",
      parentId: null,
      order: 0,
      destination: "/platforms",
      visible: true,
    },
    {
      id: "platforms.cognios",
      label: "CogniOS",
      parentId: "platforms",
      order: 1,
      destination: "/platforms/cognios",
      visible: false,
    },
  ],
};

test("navigation policy accepts a hidden link to an unavailable page", () => {
  assert.equal(UpdateNavigationSettingsSchema.safeParse(base).success, true);
});

test("navigation policy rejects visible unavailable destinations", () => {
  const value = {
    ...base,
    items: base.items.map((item) => item.id === "platforms.cognios" ? { ...item, visible: true } : item),
  };
  const result = UpdateNavigationSettingsSchema.safeParse(value);
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.issues[0]?.message ?? "", /unavailable page/);
});

test("navigation policy rejects dangling parents and external destinations", () => {
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    ...base,
    items: base.items.map((item) => item.id === "platforms" ? { ...item, destination: "https://example.com" } : item),
  }).success, false);
});

test("navigation parent omission inherits the registry while explicit null promotes to top level", () => {
  const omitted = {
    ...base,
    items: base.items.map((item) => item.id === "platforms.cognios"
      ? {
          id: item.id,
          label: item.label,
          order: item.order,
          destination: item.destination,
          visible: item.visible,
        }
      : item),
  };
  const inherited = UpdateNavigationSettingsSchema.parse(omitted);
  assert.equal(Object.prototype.hasOwnProperty.call(
    inherited.items.find((item) => item.id === "platforms.cognios")!,
    "parentId",
  ), false);

  const promoted = UpdateNavigationSettingsSchema.parse({
    ...base,
    items: base.items.map((item) => item.id === "platforms.cognios"
      ? { ...item, parentId: null }
      : item),
  });
  assert.equal(promoted.items.find((item) => item.id === "platforms.cognios")?.parentId, null);
});

test("navigation patch accepts hierarchy fields for authoritative edition validation", () => {
  const value = {
    ...base,
    items: [
      ...base.items,
      {
        id: "methodologies",
        label: "How we do it",
        parentId: "platforms",
        order: 2,
        destination: "/methodologies/idao",
        visible: true,
      },
      {
        id: "methodologies.idao",
        label: "IDAO",
        order: 3,
        destination: "/methodologies/idao",
        visible: true,
      },
    ],
  };
  const result = UpdateNavigationSettingsSchema.safeParse(value);
  assert.equal(result.success, true);
});

test("fallback market and locale policies suppress the same page everywhere", async (t) => {
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions")) {
      return {
        rowCount: 2,
        rows: [
          { code: "ksa", default_locale: "ar", fallback_market_code: "uae", fallback_locale: "en", is_canonical: false },
          { code: "uae", default_locale: "en", fallback_market_code: null, fallback_locale: null, is_canonical: true },
        ],
      };
    }
    if (values?.[1] !== "en") return { rowCount: 0, rows: [] };
    return {
      rowCount: 1,
      rows: [{ items: [], pages: [{ path: "/platforms", enabled: false }], published_at: new Date() }],
    };
  });
  const policy = await publishedNavigationPolicy("ksa", "ar");
  assert.equal(policy?.market, "uae");
  assert.equal(policy?.locale, "en");
  assert.equal(policy?.usedFallback, true);
  assert.equal(await isPublishedPageAvailable("/platforms", "ksa", "ar"), false);
});

test("an unsupported published grandchild is surfaced instead of silently flattened", async (t) => {
  t.mock.method(pool, "query", async (sql: unknown) => {
    if (String(sql).includes("FROM market_editions")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae", default_locale: "en", fallback_market_code: null,
          fallback_locale: null, is_canonical: true,
        }],
      };
    }
    return {
      rowCount: 1,
      rows: [{
        items: [
          { id: "platforms", label: "Platforms", parentId: null, order: 0, destination: "/platforms", visible: true },
          { id: "platforms.cognios", label: "CogniOS", parentId: "platforms", order: 1, destination: "/platforms/cognios", visible: true },
          { id: "methodologies.idao", label: "IDAO", parentId: "platforms.cognios", order: 2, destination: "/methodologies/idao", visible: true },
        ],
        pages: [],
        published_at: new Date(),
      }],
    };
  });
  await assert.rejects(
    publishedNavigationPolicy("uae", "en"),
    /submenu cannot be nested/i,
  );
});