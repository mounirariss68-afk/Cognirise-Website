import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { CMS_RELEASE_REGISTRY } from "@workspace/api-zod";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const appPath = resolve(root, "artifacts/cognirise-website/src/App.tsx");
const releaseClientPath = resolve(root, "artifacts/cognirise-website/src/lib/releases.tsx");
const releaseServerPath = resolve(root, "artifacts/api-server/src/lib/release-contract.ts");
const releaseRoutesPath = resolve(root, "artifacts/api-server/src/routes/releases.ts");
const outputPath = resolve(root, ".local/reports/cms-publication-parity.json");

const [app, releaseClient, releaseServer, releaseRoutes] = await Promise.all([
  readFile(appPath, "utf8"),
  readFile(releaseClientPath, "utf8"),
  readFile(releaseServerPath, "utf8"),
  readFile(releaseRoutesPath, "utf8"),
]);

const errors: string[] = [];
const routeIds = new Set(CMS_RELEASE_REGISTRY.routes.map((route) => route.destinationId));
const routeEvidence = CMS_RELEASE_REGISTRY.routes.map((route) => {
  const routeMarker = `path="${route.path}"`;
  const dynamicPrefix = route.path.replace("/:slug", "/");
  const dispatchEvidence = route.routeType === "redirect"
    ? releaseClient.includes("releaseRedirectForPath") && releaseClient.includes("destinationIdTarget")
      ? "manifest destinationIdTarget resolved by releaseRedirectForPath"
      : null
    : app.includes(routeMarker)
      ? `App.tsx Route ${route.path}`
      : route.routeType === "dynamic" && app.includes(`path="${dynamicPrefix}:slug"`)
        ? `App.tsx dynamic Route ${route.path}`
        : null;

  if (!dispatchEvidence) errors.push(`${route.destinationId} (${route.path}): no website route dispatch evidence.`);
  if (route.compiledOnly) errors.push(`${route.destinationId} (${route.path}): unexplained compiled-only authority.`);
  if (route.destinationIdTarget && !routeIds.has(route.destinationIdTarget)) {
    errors.push(`${route.destinationId} (${route.path}): unresolved target ${route.destinationIdTarget}.`);
  }

  return {
    destinationId: route.destinationId,
    path: route.path,
    routeType: route.routeType,
    registryRecord: `${CMS_RELEASE_REGISTRY.version}:${route.destinationId}`,
    cmsSource: route.kind
      ? `immutable manifest.revisions[kind=${route.kind}]`
      : route.routeType === "preview"
        ? "resource-scoped immutable preview composition"
        : "registry redirect target",
    renderer: route.rendererKey,
    dispatchEvidence: dispatchEvidence ?? "missing",
    marketLocalePolicy: {
      atomicity: CMS_RELEASE_REGISTRY.atomicity,
      canonicalMarketFallback: CMS_RELEASE_REGISTRY.fallbackPolicy.allowCanonicalMarketFallback,
      exactRequiredLocale: CMS_RELEASE_REGISTRY.fallbackPolicy.requireExactLocaleForRequiredFields,
    },
    slots: {
      content: route.requiredContentSlots,
      links: route.requiredLinkSlots,
      media: route.requiredMediaSlots,
    },
    closureEvidence: {
      links: "manifest.resolvedLinks contains typed destination IDs resolved against the candidate",
      media: "manifest.mediaPins contains immutable media version IDs for released revisions",
      unavailable: CMS_RELEASE_REGISTRY.fallbackPolicy.unavailableDestinationBehavior,
    },
    failureSemantics: route.failureSemantics,
    compiledRendererShell: route.kind !== null,
    compiledPublicationAuthority: route.compiledOnly,
  };
});

const requiredEvidence: Array<[string, boolean]> = [
  ["website fetches only the active release manifest for route authority", releaseClient.includes("/api/public/releases/")],
  ["website does not retry a failed manifest as absent content", releaseClient.includes("retry: false")],
  ["website distinguishes unavailable release from service failure", app.includes("release.isError") && app.includes("ServiceError") && app.includes("NotFound")],
  ["website gates route dispatch before rendering", app.includes("const unavailable = !releaseHasPath")],
  ["candidate records typed link closure", releaseServer.includes("resolvedLinks.push") && releaseServer.includes("unknown destination")],
  ["candidate records immutable media closure", releaseServer.includes("mediaPins") && releaseServer.includes("every released media reference must pin an immutable version")],
  ["candidate records exact revision identity", releaseServer.includes("revisionId: row.published_revision_id")],
  ["candidate validates manifest slots and renderer identity", releaseServer.includes("validateReleaseManifestParity(manifest)")],
  ["public delivery reads active immutable receipts", releaseServer.includes("JOIN cms_release_receipts receipt ON receipt.id=active.release_id")],
  ["public endpoint distinguishes absent from failed delivery", releaseRoutes.includes("RELEASE_ABSENT") && releaseRoutes.includes("RELEASE_SERVICE_FAILURE")],
  ["release receipts support idempotent publish and rollback", releaseRoutes.includes("existingOperationReceipt") && releaseRoutes.includes("/releases/rollback")],
  ["registry contains no compiled publication authority", routeEvidence.every((route) => !route.compiledPublicationAuthority)],
];
for (const [label, present] of requiredEvidence) if (!present) errors.push(`Missing evidence: ${label}.`);

const report = {
  generatedBy: "pnpm run audit:cms-publication-parity",
  registryVersion: CMS_RELEASE_REGISTRY.version,
  status: errors.length === 0 ? "pass" : "fail",
  summary: {
    routes: routeEvidence.length,
    kinds: CMS_RELEASE_REGISTRY.kinds.length,
    compiledPublicationAuthority: routeEvidence.filter((route) => route.compiledPublicationAuthority).length,
    unexplained: errors.length,
  },
  authority: {
    publication: "cms_release_receipts.manifest selected by cms_active_releases",
    website: "ActiveRelease.manifest",
    rendererShellsMayBeCompiled: true,
    compiledContentMayBePublicAuthority: false,
  },
  routeAndSlotAudit: routeEvidence,
  acceptanceEvidence: Object.fromEntries(requiredEvidence),
  errors,
};

await mkdir(resolve(root, ".local/reports"), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`CMS publication parity audit: ${report.status}; ${routeEvidence.length} routes; ${errors.length} unexplained.`);
console.log(`Report: ${outputPath}`);
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
}