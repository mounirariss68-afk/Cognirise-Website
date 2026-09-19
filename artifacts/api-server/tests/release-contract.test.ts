import assert from "node:assert/strict";
import test from "node:test";
import {
  CMS_RELEASE_REGISTRY,
  destinationReferenceSchema,
  resourceScopedGrantSchema,
} from "@workspace/api-zod";
import { auditConfiguredReleaseMatrix, releaseInventory, validateReleaseManifestParity } from "../src/lib/release-contract";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("release registry represents every route with stable renderer and failure semantics", () => {
  const inventory = releaseInventory();
  assert.equal(inventory.parity.complete, true);
  assert.equal(inventory.unrepresented.length, 0);
  assert.equal(new Set(CMS_RELEASE_REGISTRY.routes.map((route) => route.destinationId)).size, CMS_RELEASE_REGISTRY.routes.length);
  const destinationIds = new Set(CMS_RELEASE_REGISTRY.routes.map((route) => route.destinationId));
  assert.deepEqual(
    CMS_RELEASE_REGISTRY.routes
      .filter((route) => route.destinationIdTarget)
      .filter((route) => !destinationIds.has(route.destinationIdTarget!)),
    [],
  );
  assert.ok(CMS_RELEASE_REGISTRY.routes.some((route) => route.path === "/platforms/:slug" && route.kind === "platform"));
  assert.deepEqual(
    CMS_RELEASE_REGISTRY.routes
      .filter((route) => route.routeType === "dynamic")
      .map((route) => route.path)
      .sort(),
    ["/insights/:slug", "/platforms/:slug", "/work/:slug"],
  );
  assert.equal(CMS_RELEASE_REGISTRY.fallbackPolicy.allowCanonicalMarketFallback, false);
});

test("manifest parity validates exact renderer identity, required slots, link closure, and immutable pins", () => {
  const manifest = {
    scope: { market: "uae", locale: "en" },
    registryVersion: CMS_RELEASE_REGISTRY.version,
    revisions: [{
      documentId: "platform-document",
      route: "/platforms/cognios",
      destinationId: "platform.cognios",
      rendererKey: "platform-detail",
      title: "CogniOS",
      content: { summary: "Exact released content" },
    }],
    resolvedLinks: [],
    mediaPins: [{ documentId: "platform-document", fieldPath: "content.hero", mediaVersionId: "version-1" }],
  };
  assert.deepEqual(validateReleaseManifestParity(manifest), { ready: true, errors: [] });
  const invalid = validateReleaseManifestParity({
    ...manifest,
    revisions: [{ ...manifest.revisions[0], rendererKey: "wrong", content: undefined }],
    resolvedLinks: [{ documentId: "platform-document", fieldPath: "content.cta", destinationId: "contact" }],
    mediaPins: [{ documentId: "platform-document", fieldPath: "content.hero", mediaVersionId: "" }],
  });
  assert.equal(invalid.ready, false);
  assert.match(invalid.errors.join("\n"), /renderer identity/);
  assert.match(invalid.errors.join("\n"), /required content slot content/);
  assert.match(invalid.errors.join("\n"), /unavailable destination contact/);
  assert.match(invalid.errors.join("\n"), /media pin is mutable/);
});

test("supporting release records remain valid while route-bearing records must resolve a renderer", () => {
  const base = {
    scope: { market: "uae", locale: "en" },
    registryVersion: CMS_RELEASE_REGISTRY.version,
    resolvedLinks: [],
    mediaPins: [],
  };
  const supporting = validateReleaseManifestParity({
    ...base,
    revisions: [
      { documentId: "person-1", kind: "person", route: null, snapshot: { title: "Leader", content: {} } },
      { documentId: "partner-1", kind: "partner", route: null, snapshot: { title: "Partner", content: {} } },
    ],
  });
  assert.deepEqual(supporting, { ready: true, errors: [] });
  const brokenPublic = validateReleaseManifestParity({
    ...base,
    revisions: [
      { documentId: "platform-1", kind: "platform", route: null, snapshot: { title: "Platform", content: {} } },
    ],
  });
  assert.equal(brokenPublic.ready, false);
  assert.match(brokenPublic.errors.join("\n"), /no public renderer registry record/);
});

test("configured release matrix audits every enabled market and configured locale against active receipts", async () => {
  const manifests = new Map([
    ["ksa|ar", {
      scope: { market: "ksa", locale: "ar" },
      registryVersion: CMS_RELEASE_REGISTRY.version,
      revisions: [],
      resolvedLinks: [],
      mediaPins: [],
    }],
    ["ksa|en", {
      scope: { market: "ksa", locale: "en" },
      registryVersion: CMS_RELEASE_REGISTRY.version,
      revisions: [],
      resolvedLinks: [],
      mediaPins: [],
    }],
    ["uae|en", {
      scope: { market: "uae", locale: "en" },
      registryVersion: CMS_RELEASE_REGISTRY.version,
      revisions: [],
      resolvedLinks: [],
      mediaPins: [],
    }],
  ]);
  const matrix = await auditConfiguredReleaseMatrix({
    query: async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM market_editions")) {
        return {
          rowCount: 2,
          rows: [
            { code: "ksa", default_locale: "ar", fallback_locale: "en" },
            { code: "uae", default_locale: "en", fallback_locale: null },
          ],
        };
      }
      const key = `${values?.[0]}|${values?.[1]}`;
      const manifest = manifests.get(key);
      return manifest
        ? { rowCount: 1, rows: [{ id: `release-${key}`, manifest }] }
        : { rowCount: 0, rows: [] };
    },
  });
  assert.equal(matrix.ready, true);
  assert.deepEqual(matrix.scopes.map(({ market, locale }) => `${market}|${locale}`), ["ksa|ar", "ksa|en", "uae|en"]);
});

test("configured release matrix rejects missing receipts and manifests from another scope", async () => {
  const matrix = await auditConfiguredReleaseMatrix({
    query: async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM market_editions")) {
        return {
          rowCount: 1,
          rows: [{ code: "ksa", default_locale: "ar", fallback_locale: "en" }],
        };
      }
      if (values?.[1] === "en") return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{
          id: "wrong-scope",
          manifest: {
            scope: { market: "uae", locale: "en" },
            registryVersion: CMS_RELEASE_REGISTRY.version,
            revisions: [],
            resolvedLinks: [],
            mediaPins: [],
          },
        }],
      };
    },
  });
  assert.equal(matrix.ready, false);
  assert.match(matrix.scopes.flatMap((scope) => scope.errors).join("\n"), /does not match active scope ksa\/ar/);
  assert.match(matrix.scopes.flatMap((scope) => scope.errors).join("\n"), /ksa\/en: no active immutable release/);
});

test("typed destinations preserve anchor and query metadata but reject free-form URLs", () => {
  assert.deepEqual(destinationReferenceSchema.parse({
    destinationId: "platform.cognios",
    anchor: "architecture",
    query: { market: "ksa" },
  }), {
    destinationId: "platform.cognios",
    anchor: "architecture",
    query: { market: "ksa" },
  });
  assert.equal(destinationReferenceSchema.safeParse({ href: "/platforms/cognios" }).success, false);
});

test("external resource grants are exact, versioned, expiring, and revocable", () => {
  const result = resourceScopedGrantSchema.safeParse({
    id: "grant", userId: "user", resourceType: "partner-case-studies",
    resourceId: "lupitor", ownerId: "partner", market: "uae", locale: "en",
    actions: ["view", "create", "edit", "delete-draft", "preview", "submit", "propose-withdrawal"],
    version: 3, expiresAt: "2027-01-01T00:00:00Z", revokedAt: null,
  });
  assert.equal(result.success, true);
  assert.equal(resourceScopedGrantSchema.safeParse({
    ...(result.success ? result.data : {}), actions: ["publish"],
  }).success, false);
});

test("release evidence is database-enforced append-only", async () => {
  const migration = await readFile(
    resolve(process.cwd(), "../../lib/db/migrations/0046_cms_release_contract_hardening.sql"),
    "utf8",
  );
  assert.match(migration, /BEFORE UPDATE OR DELETE ON cms_release_candidates/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON cms_release_receipts/);
  assert.match(migration, /cms_release_receipts_required_actors_check/);
});

test("external submission, preview, and media binding use distinct grant actions", async () => {
  const source = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  assert.match(source, /"edit",\s*"submit"/);
  assert.match(source, /"edit", "preview"/);
  assert.match(source, /action: "bind-media"/);
});