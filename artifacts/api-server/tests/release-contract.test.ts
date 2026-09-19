import assert from "node:assert/strict";
import test from "node:test";
import {
  CMS_RELEASE_REGISTRY,
  destinationReferenceSchema,
  resourceScopedGrantSchema,
} from "@workspace/api-zod";
import { releaseInventory } from "../src/lib/release-contract";
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
  assert.equal(CMS_RELEASE_REGISTRY.fallbackPolicy.allowCanonicalMarketFallback, false);
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