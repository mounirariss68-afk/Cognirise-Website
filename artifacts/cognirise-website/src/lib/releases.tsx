import { createContext, createElement, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch, type PublishedContent } from "@workspace/api-client-react";
import { CMS_RELEASE_REGISTRY, type CmsDocumentKind } from "@workspace/api-zod";

export type ReleaseRevision = {
  documentId: string;
  editionId: string;
  revisionId: string;
  contentDigest: string;
  route: string | null;
  kind: CmsDocumentKind;
  revision: number;
  publishedAt: string;
  updatedAt: string;
  snapshot: {
    slug: string;
    title: string;
    summary?: string | null;
    content: Record<string, unknown>;
    seo?: PublishedContent["seo"];
  };
  media: PublishedContent["media"];
};

export type ReleaseManifest = {
  scope: { market: string; locale: string };
  registryVersion: string;
  generatedAt: string;
  revisions: ReleaseRevision[];
  navigation: { items?: Array<Record<string, unknown>>; pages?: Array<Record<string, unknown>> };
  peopleSelections: Array<{ id: string; revision_id: string }>;
  resolvedLinks: unknown[];
  mediaPins: unknown[];
};

export type ActiveRelease = {
  id: string;
  releaseNumber: number;
  registryVersion: string;
  manifest: ReleaseManifest;
  validationDigest: string;
  integrityDigest: string;
  releasedAt: string;
};

type ReleaseContextValue = { release: ActiveRelease; preview: boolean };
const ReleaseContext = createContext<ReleaseContextValue | null>(null);

export function ReleaseProvider({
  release,
  preview = false,
  children,
}: {
  release: ActiveRelease;
  preview?: boolean;
  children: ReactNode;
}) {
  return createElement(ReleaseContext.Provider, { value: { release, preview } }, children);
}

export function useReleaseContext() {
  return useContext(ReleaseContext);
}

export function useActiveRelease(market: string, locale: string, enabled = true) {
  return useQuery({
    queryKey: ["active-release", market, locale],
    enabled,
    retry: false,
    queryFn: () => customFetch<ActiveRelease>(
      `/api/public/releases/${encodeURIComponent(market)}/${encodeURIComponent(locale)}/manifest`,
    ),
  });
}

export function releasePublishedContent(revision: ReleaseRevision, manifest: ReleaseManifest): PublishedContent {
  return {
    id: revision.documentId,
    kind: revision.kind,
    slug: revision.snapshot.slug,
    title: revision.snapshot.title,
    summary: revision.snapshot.summary ?? null,
    content: revision.snapshot.content,
    seo: revision.snapshot.seo,
    media: revision.media,
    market: manifest.scope.market,
    locale: manifest.scope.locale,
    requestedMarket: manifest.scope.market,
    usedFallback: false,
    revision: revision.revision,
    publishedAt: revision.publishedAt,
    updatedAt: revision.updatedAt,
  };
}

function normalizePath(path: string) {
  return path === "/" ? path : path.replace(/\/+$/, "");
}

export function registryRouteForPath(pathname: string) {
  const path = normalizePath(pathname);
  const exact = CMS_RELEASE_REGISTRY.routes.find((route) => route.path === path && route.routeType !== "dynamic");
  if (exact) return exact;
  return CMS_RELEASE_REGISTRY.routes.find((route) => {
    if (route.routeType !== "dynamic") return false;
    const prefix = route.path.replace("/:slug", "/");
    return path.startsWith(prefix) && path.length > prefix.length;
  });
}

export function releaseHasPath(manifest: ReleaseManifest, pathname: string): boolean {
  const path = normalizePath(pathname);
  return manifest.revisions.some((revision) => normalizePath(revision.route ?? "") === path);
}

export function releaseRedirectForPath(manifest: ReleaseManifest, pathname: string) {
  const route = registryRouteForPath(pathname);
  if (!route || (route.routeType !== "redirect" && route.routeType !== "alias") || !route.destinationIdTarget) return null;
  const target = CMS_RELEASE_REGISTRY.routes.find((candidate) => candidate.destinationId === route.destinationIdTarget);
  if (!target) return null;
  const targetAvailable = target.routeType === "redirect"
    || releaseHasPath(manifest, target.path)
    || Boolean(registryRouteForPath(target.path));
  if (!targetAvailable) return null;
  return { path: target.path, anchor: route.anchor };
}

export function releaseHrefAvailable(manifest: ReleaseManifest, href: string): boolean {
  if (!href.startsWith("/")) return true;
  const url = new URL(href, "https://release.invalid");
  return releaseHasPath(manifest, url.pathname)
    || Boolean(registryRouteForPath(url.pathname))
    || Boolean(releaseRedirectForPath(manifest, url.pathname));
}

export function useReleaseHrefAvailable(href: string): boolean {
  const context = useReleaseContext();
  return !context || releaseHrefAvailable(context.release.manifest, href);
}