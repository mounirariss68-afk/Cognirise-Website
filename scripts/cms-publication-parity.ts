import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { CMS_RELEASE_REGISTRY } from "@workspace/api-zod";
// The public website owns its route table. Run this script from the website
// package (pnpm --workspace-root run audit:cms-publication-parity) so the
// package's tsconfig paths resolve the "@/" imports inside these modules.
import { PUBLIC_PATHS, redirectFor } from "../artifacts/cognirise-website/src/site/routes";
import { INDUSTRY_PAGES } from "../artifacts/cognirise-website/src/site/content/industries";

const execFileAsync = promisify(execFile);
const digest = (value: unknown) => createHash("sha256")
  .update(JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item))
  .digest("hex");
const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const websiteRoot = resolve(root, "artifacts/cognirise-website/src");
const appPath = resolve(websiteRoot, "App.tsx");
const releaseClientPath = resolve(websiteRoot, "lib/releases.tsx");
const methodLayoutPath = resolve(websiteRoot, "components/MethodologyCmsLayout.tsx");
const agentAuthorityPath = resolve(websiteRoot, "pages/AgentAuthorityModel.tsx");
const guardrailsPath = resolve(websiteRoot, "pages/GuardrailsFramework.tsx");
const releaseServerPath = resolve(root, "artifacts/api-server/src/lib/release-contract.ts");
const releaseRoutesPath = resolve(root, "artifacts/api-server/src/routes/releases.ts");
const outputPath = resolve(root, ".local/reports/cms-publication-parity.json");
const releaseOutputPath = resolve(root, "artifacts/api-server/src/generated/cms-publication-parity.json");

const [app, releaseClient, methodLayout, agentAuthority, guardrails, releaseServer, releaseRoutes] = await Promise.all([
  readFile(appPath, "utf8"),
  readFile(releaseClientPath, "utf8"),
  readFile(methodLayoutPath, "utf8"),
  readFile(agentAuthorityPath, "utf8"),
  readFile(guardrailsPath, "utf8"),
  readFile(releaseServerPath, "utf8"),
  readFile(releaseRoutesPath, "utf8"),
]);

const errors: string[] = [];
const routeIds = new Set(CMS_RELEASE_REGISTRY.routes.map((route) => route.destinationId));
const SAMPLE_SLUG = "example";
const previewDispatch = app.includes('startsWith("/preview/")') && app.includes("<CmsPreview />");

/**
 * Where the website sends a registry route today. Since the October 2026
 * redesign the public pages are code-owned: App.tsx consults the redirect
 * table in src/site/routes.ts, then the launch policy, then its own routes.
 * CMS compositions render only at /preview/:token.
 */
function websiteDispatch(route: (typeof CMS_RELEASE_REGISTRY.routes)[number]) {
  if (route.routeType === "preview") {
    return previewDispatch ? "App.tsx renders CmsPreview for /preview/:token" : null;
  }
  const path = route.path.replace("/:slug", `/${SAMPLE_SLUG}`);
  const moved = redirectFor(path);
  if (moved) return `src/site/routes.ts redirect to ${moved}`;
  if (!PUBLIC_PATHS.includes(path)) return null;
  if (app.includes(`path="${path}"`)) return `App.tsx Route ${path} (compiled page)`;
  if (INDUSTRY_PAGES.some((page) => page.path === path) && app.includes("INDUSTRY_PAGES.map")) {
    return `App.tsx industry Route ${path} (compiled page via INDUSTRY_PAGES)`;
  }
  return null;
}

const routeEvidence = CMS_RELEASE_REGISTRY.routes.map((route) => {
  const dispatchEvidence = websiteDispatch(route);

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
    websiteAuthority: route.routeType === "preview"
      ? "cms-preview"
      : dispatchEvidence?.startsWith("src/site/routes.ts redirect")
        ? "redirect"
        : "compiled",
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
  ["release client fetches only the active release manifest for route authority", releaseClient.includes("/api/public/releases/")],
  ["release client does not retry a failed manifest as absent content", releaseClient.includes("retry: false")],
  ["public routes are code-owned: the router consults the redirect table and the launch policy, never a release", app.includes("redirectFor(path)") && app.includes("launchHrefAllowed(path)") && !app.includes("useActiveRelease") && !app.includes("ReleaseProvider")],
  ["method pages render their compiled content without a release", methodLayout.includes("preferCompiled: true") && agentAuthority.includes("preferCompiled: true") && guardrails.includes("preferCompiled: true")],
  ["CMS compositions render only at /preview/:token", previewDispatch],
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

let sourceCommit = "";
try {
  sourceCommit = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
} catch {
  errors.push("Unable to identify the source commit for release evidence.");
}

const unsignedReport = {
  formatVersion: 2,
  generatedBy: "pnpm run audit:cms-publication-parity",
  generatedAt: new Date().toISOString(),
  sourceCommit,
  registryVersion: CMS_RELEASE_REGISTRY.version,
  status: errors.length === 0 ? "pass" : "fail",
  summary: {
    routes: routeEvidence.length,
    kinds: CMS_RELEASE_REGISTRY.kinds.length,
    compiledPublicationAuthority: routeEvidence.filter((route) => route.compiledPublicationAuthority).length,
    redirected: routeEvidence.filter((route) => route.websiteAuthority === "redirect").length,
    unexplained: errors.length,
  },
  authority: {
    publication: "cms_release_receipts.manifest selected by cms_active_releases",
    website: "code-owned content in artifacts/cognirise-website/src/site; releases are read only by /preview/:token",
    rendererShellsMayBeCompiled: true,
    compiledContentMayBePublicAuthority: true,
    note: "Since the October 2026 content redesign the public website renders its own compiled content and does not read CMS releases. The registry keeps the CMS routes for preview compositions and for any later cutover; retired addresses redirect to the public page that replaced them.",
  },
  routeAndSlotAudit: routeEvidence,
  acceptanceEvidence: Object.fromEntries(requiredEvidence),
  errors,
};
const reportDigest = digest(unsignedReport);
const report = { ...unsignedReport, reportDigest };

await mkdir(resolve(root, ".local/reports"), { recursive: true });
await mkdir(resolve(root, "artifacts/api-server/src/generated"), { recursive: true });
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`),
  writeFile(releaseOutputPath, `${JSON.stringify(report, null, 2)}\n`),
]);
console.log(`CMS publication parity audit: ${report.status}; ${routeEvidence.length} routes; ${errors.length} unexplained.`);
console.log(`Report: ${outputPath}`);
console.log(`Release evidence: ${releaseOutputPath}`);
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
}
