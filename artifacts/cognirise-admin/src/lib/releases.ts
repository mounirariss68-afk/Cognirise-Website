import { customFetch } from "@workspace/api-client-react";

export type ReleaseScope = { market: string; locale: string };
export type ReleaseValidation = { ready: boolean; errors: string[]; warnings: string[] };
export type ReleaseManifest = {
  scope: ReleaseScope;
  registryVersion: string;
  generatedAt: string;
  revisions: Array<{ documentId: string; editionId: string; revisionId: string; route: string | null }>;
  availability: unknown[];
  navigation: { items?: unknown[]; pages?: unknown[]; published_version?: number };
  peopleSelections: unknown[];
  resolvedLinks: unknown[];
  mediaPins: unknown[];
  fallback: { candidates: unknown[]; canonicalMarketFallback: boolean };
};
export type ReleaseCandidate = {
  id: string;
  createdAt: string;
  manifest: ReleaseManifest;
  validation: ReleaseValidation;
  validationDigest: string;
  separationValid: boolean;
};
export type ReleaseReceipt = {
  id: string;
  releaseNumber: number;
  releasedAt: string;
  integrityDigest: string;
};
export type ActiveRelease = ReleaseReceipt & {
  registryVersion: string;
  manifest: ReleaseManifest;
  validationDigest: string;
};
export type ReleaseImpact = {
  scope: ReleaseScope;
  links: unknown[];
  media: unknown[];
  unavailableLinks: string[];
  orphanedMedia: unknown[];
};
export type ReleaseHistoryItem = ReleaseReceipt & {
  status: "released" | "rolled-back" | "withdrawn";
  registryVersion: string;
  validationDigest: string;
  previousReleaseId: string | null;
  publisherId: string;
  active: boolean;
};
export type ReleaseRegistry = {
  version: string;
  atomicity: "market-locale";
  routes: Array<{
    destinationId: string;
    path: string;
    kind: string | null;
    rendererKey: string;
    routeType: string;
    compiledOnly: boolean;
  }>;
};

export const releaseKey = (scope: ReleaseScope) => `${scope.market}:${scope.locale}`;

export const getReleaseRegistry = () =>
  customFetch<ReleaseRegistry>("/api/releases/registry");

export const getReleaseReadiness = (scope: ReleaseScope) =>
  customFetch<Omit<ReleaseCandidate, "id" | "createdAt">>(
    `/api/releases/readiness?market=${encodeURIComponent(scope.market)}&locale=${encodeURIComponent(scope.locale)}`,
  );

export const getReleaseImpact = (scope: ReleaseScope) =>
  customFetch<ReleaseImpact>(
    `/api/releases/impact?market=${encodeURIComponent(scope.market)}&locale=${encodeURIComponent(scope.locale)}`,
  );

export const getReleaseHistory = (scope: ReleaseScope) =>
  customFetch<{ scope: ReleaseScope; items: ReleaseHistoryItem[] }>(
    `/api/releases/history?market=${encodeURIComponent(scope.market)}&locale=${encodeURIComponent(scope.locale)}`,
  );

export const getActiveRelease = async (scope: ReleaseScope): Promise<ActiveRelease | null> => {
  try {
    return await customFetch<ActiveRelease>(
      `/api/public/releases/${encodeURIComponent(scope.market)}/${encodeURIComponent(scope.locale)}/manifest`,
    );
  } catch (error) {
    const status = (error as { status?: number; response?: { status?: number } }).status
      ?? (error as { response?: { status?: number } }).response?.status;
    if (status === 404) return null;
    throw error;
  }
};

export const createReleaseCandidate = (scope: ReleaseScope) =>
  customFetch<ReleaseCandidate>("/api/releases/candidates", {
    method: "POST",
    body: JSON.stringify(scope),
  });

export const publishReleaseCandidate = (candidateId: string, idempotencyKey: string) =>
  customFetch<ReleaseReceipt>("/api/releases/publish", {
    method: "POST",
    body: JSON.stringify({ candidateId, idempotencyKey }),
  });

export const rollbackRelease = (releaseId: string, idempotencyKey: string) =>
  customFetch<ReleaseReceipt>("/api/releases/rollback", {
    method: "POST",
    body: JSON.stringify({ releaseId, idempotencyKey }),
  });

export function releaseError(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as { data?: { error?: string } | string; message?: string };
  if (candidate.data && typeof candidate.data === "object" && candidate.data.error) return candidate.data.error;
  if (typeof candidate.data === "string") return candidate.data;
  return candidate.message || fallback;
}
