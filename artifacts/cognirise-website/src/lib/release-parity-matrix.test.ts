import assert from "node:assert/strict";
import test from "node:test";
import { CMS_RELEASE_REGISTRY } from "@workspace/api-zod";
import {
  registryRouteForPath,
  releaseHasPath,
  releaseHrefAvailable,
  releasePublishedContent,
  releaseRedirectForPath,
  type ReleaseManifest,
  type ReleaseRevision,
} from "./releases";

const scopes = [
  { market: "uae", locale: "en" },
  { market: "ksa", locale: "ar" },
] as const;

function revision(scope: typeof scopes[number], route: (typeof CMS_RELEASE_REGISTRY.routes)[number]): ReleaseRevision {
  return {
    documentId: `${scope.market}-${scope.locale}-${route.destinationId}`,
    editionId: `${scope.market}-${scope.locale}-edition-${route.destinationId}`,
    revisionId: `${scope.market}-${scope.locale}-revision-${route.destinationId}`,
    contentDigest: `${scope.market}-${scope.locale}-digest-${route.destinationId}`,
    route: route.path.replace(":slug", `${scope.market}-${scope.locale}-fixture`),
    kind: route.kind!,
    revision: 7,
    publishedAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    snapshot: {
      slug: `${scope.market}-${scope.locale}-${route.destinationId}`,
      title: `${scope.market}/${scope.locale} ${route.destinationId}`,
      content: { marker: `${scope.market}|${scope.locale}|${route.destinationId}` },
    },
    media: [],
  };
}

function manifest(scope: typeof scopes[number]): ReleaseManifest {
  const revisions = CMS_RELEASE_REGISTRY.routes
    .filter((route) => route.kind && route.routeType !== "preview")
    .map((route) => revision(scope, route));
  return {
    scope,
    registryVersion: CMS_RELEASE_REGISTRY.version,
    generatedAt: "2026-09-19T00:00:00.000Z",
    revisions,
    navigation: { items: [], pages: [] },
    peopleSelections: [],
    resolvedLinks: [],
    mediaPins: [],
  };
}

test("every configured scope and public registry route renders only its exact immutable revision", () => {
  for (const scope of scopes) {
    const release = manifest(scope);
    for (const item of release.revisions) {
      assert.equal(releaseHasPath(release, item.route!), true, `${scope.market}/${scope.locale}/${item.route}`);
      const rendered = releasePublishedContent(item, release);
      assert.equal(rendered.market, scope.market);
      assert.equal(rendered.locale, scope.locale);
      assert.equal(rendered.usedFallback, false);
      assert.equal(rendered.revision, item.revision);
      assert.equal(rendered.content.marker, `${scope.market}|${scope.locale}|${registryRouteForPath(item.route!)?.destinationId}`);
    }
  }
});

test("market and locale manifests remain isolated even when registry destinations match", () => {
  const uae = manifest(scopes[0]);
  const ksa = manifest(scopes[1]);
  const path = "/platforms/cognios";
  const uaeRevision = uae.revisions.find((item) => item.route === path)!;
  const ksaRevision = ksa.revisions.find((item) => item.route === path)!;
  assert.notEqual(uaeRevision.revisionId, ksaRevision.revisionId);
  assert.notEqual(uaeRevision.contentDigest, ksaRevision.contentDigest);
  assert.equal(releasePublishedContent(uaeRevision, uae).content.marker, "uae|en|platform.cognios");
  assert.equal(releasePublishedContent(ksaRevision, ksa).content.marker, "ksa|ar|platform.cognios");
});

test("unavailable destinations are removed before links render and redirects fail closed", () => {
  const release = manifest(scopes[0]);
  release.revisions = release.revisions.filter((item) => item.route !== "/platforms/lupitor");
  assert.equal(releaseHrefAvailable(release, "/platforms/lupitor"), false);
  assert.equal(releaseRedirectForPath(release, "/cognitalk"), null);
  assert.equal(releaseHrefAvailable(release, "/platforms/cognios"), true);
  assert.equal(releaseRedirectForPath(release, "/architecture")?.path, "/platforms/cognios");
});