import { cmsDocumentKinds, type CmsDocumentKind, validateCmsSnapshot } from "@workspace/api-zod";

export type DraftSeo = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  [key: string]: unknown;
};

export type DraftSaveIssue = { path: string; message: string };

export type DraftSaveSource = {
  slug: string;
  title: string;
  summary?: string | null;
  content: Record<string, unknown>;
  mediaIds?: string[];
  markets: string[];
};

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Blank SEO on a document which never had SEO remains absent. Clearing SEO
 * which did exist is represented by null in the update request. Unknown legacy
 * properties are intentionally retained so the strict shared contract reports
 * them rather than silently deleting data.
 */
export function normalizeDraftSeo(edited: DraftSeo, hadSeo: boolean): DraftSeo | null | undefined {
  const normalized: DraftSeo = { ...edited };
  const title = optionalText(edited.title);
  const description = optionalText(edited.description);
  const canonicalUrl = optionalText(edited.canonicalUrl);
  if (title === undefined) delete normalized.title;
  else normalized.title = title;
  if (description === undefined) delete normalized.description;
  else normalized.description = description;
  if (canonicalUrl === undefined) delete normalized.canonicalUrl;
  else normalized.canonicalUrl = canonicalUrl;
  if (!edited.noIndex) delete normalized.noIndex;
  else normalized.noIndex = true;

  if (Object.keys(normalized).length === 0) return hadSeo ? null : undefined;
  return normalized;
}

export function parseDraftIssues(errors: string[]): DraftSaveIssue[] {
  return errors.map((error) => {
    const separator = error.indexOf(":");
    return separator < 0
      ? { path: "document", message: error }
      : { path: error.slice(0, separator), message: error.slice(separator + 1).trim() };
  });
}

export function buildDraftSave(
  kind: CmsDocumentKind,
  source: DraftSaveSource,
  editedSeo: DraftSeo,
  hadSeo: boolean,
) {
  const seo = normalizeDraftSeo(editedSeo, hadSeo);
  const summary = optionalText(source.summary) ?? null;
  const snapshot = {
    slug: source.slug,
    title: source.title,
    summary,
    content: source.content,
    ...(seo && { seo }),
    mediaIds: source.mediaIds ?? [],
    markets: source.markets,
  };
  const validation = validateCmsSnapshot(kind, snapshot, "draft");
  if (!validation.success) {
    return { success: false as const, issues: parseDraftIssues(validation.errors), seo };
  }
  return {
    success: true as const,
    snapshot: validation.data,
    // null has update semantics ("clear"); it is omitted only from validation.
    seo,
  };
}

type ErrorRecord = Record<string, unknown>;

function safeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, 400) : undefined;
}

function serverDetail(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return safeText(data);
  const record = data as ErrorRecord;
  const direct = safeText(record.detail) ?? safeText(record.error) ?? safeText(record.message) ?? safeText(record.details);
  if (direct) return direct;
  if (Array.isArray(record.details)) {
    return record.details.map((item) => {
      if (typeof item === "string") return safeText(item);
      if (item && typeof item === "object") {
        const detail = item as ErrorRecord;
        const path = Array.isArray(detail.path) ? detail.path.join(".") : safeText(detail.path);
        const message = safeText(detail.message);
        return message ? `${path ? `${path}: ` : ""}${message}` : undefined;
      }
      return undefined;
    }).filter(Boolean).slice(0, 3).join("; ") || undefined;
  }
  if (record.details && typeof record.details === "object") {
    return Object.entries(record.details as ErrorRecord)
      .map(([path, message]) => {
        const text = safeText(message);
        return text ? `${path}: ${text}` : undefined;
      })
      .filter(Boolean).slice(0, 3).join("; ") || undefined;
  }
  return undefined;
}

export type SaveFailure = {
  title: string;
  description: string;
  action: "sign-in" | "review-fields" | "review-conflict" | "verify" | "reload-committed";
};

export function isDraftSaveResponse(
  value: unknown,
  expected: {
    documentId: string;
    kind: CmsDocumentKind;
    slug: string;
    market: string;
    locale: string;
    previousRevision: number;
    snapshot: {
      title: string;
      summary?: string | null;
      content: unknown;
      seo?: unknown;
      mediaIds: string[];
    };
  },
): value is {
  id: string;
  kind: CmsDocumentKind;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  markets: string[];
  revisionNumber: number;
  currentRevisionId?: string | null;
} {
  if (!value || typeof value !== "object") return false;
  const response = value as ErrorRecord;
  const canonicalJson = (input: unknown): string => JSON.stringify(input, (_key, nested) => {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) return nested;
    return Object.fromEntries(Object.entries(nested as ErrorRecord).sort(([a], [b]) => a.localeCompare(b)));
  });
  return response.id === expected.documentId
    && response.kind === expected.kind
    && cmsDocumentKinds.includes(response.kind as CmsDocumentKind)
    && response.slug === expected.slug
    && response.title === expected.snapshot.title
    && (response.summary ?? null) === (expected.snapshot.summary ?? null)
    && Boolean(response.content) && typeof response.content === "object" && !Array.isArray(response.content)
    && canonicalJson(response.content) === canonicalJson(expected.snapshot.content)
    && canonicalJson(response.seo) === canonicalJson(expected.snapshot.seo)
    && canonicalJson(Array.isArray(response.mediaIds) ? response.mediaIds : []) === canonicalJson(expected.snapshot.mediaIds)
    && Array.isArray(response.markets) && response.markets.every((market) => typeof market === "string") && response.markets.includes(expected.market)
    && Number.isInteger(response.revisionNumber)
    && response.revisionNumber === expected.previousRevision + 1
    && typeof response.currentRevisionId === "string" && response.currentRevisionId.trim().length > 0
    && (!Object.hasOwn(response, "market") || response.market === expected.market)
    && (!Object.hasOwn(response, "locale") || response.locale === expected.locale);
}

export function serverValidationIssues(error: unknown): DraftSaveIssue[] {
  if (!error || typeof error !== "object") return [];
  const data = (error as ErrorRecord).data;
  if (!data || typeof data !== "object") return [];
  const record = data as ErrorRecord;
  const details = Array.isArray(record.details)
    ? record.details
    : Array.isArray(record.errors) ? record.errors : [];
  return details.flatMap((item): DraftSaveIssue[] => {
    if (typeof item === "string") return parseDraftIssues([item]);
    if (!item || typeof item !== "object") return [];
    const detail = item as ErrorRecord;
    const path = Array.isArray(detail.path)
      ? detail.path.join(".")
      : safeText(detail.path) ?? "document";
    const message = safeText(detail.message) ?? safeText(detail.error);
    return message ? [{ path, message }] : [];
  });
}

export function describeSaveFailure(error: unknown): SaveFailure {
  const candidate = error && typeof error === "object" ? error as ErrorRecord : {};
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const data = candidate.data && typeof candidate.data === "object" ? candidate.data as ErrorRecord : {};
  const detail = serverDetail(candidate.data);
  if (data.committed === true || data.code === "DOCUMENT_SAVE_COMMITTED"
    || candidate.committed === true || candidate.code === "DOCUMENT_SAVE_COMMITTED") {
    return {
      title: "Draft was saved, but confirmation was interrupted",
      description: detail ?? "The server reports that a new revision was committed. Reload the latest revision before making another save.",
      action: "reload-committed",
    };
  }
  if (status === 400 || status === 422) {
    return { title: "Draft has validation errors", description: detail ?? "Review the highlighted fields and try again.", action: "review-fields" };
  }
  if (status === 401) {
    return { title: "Your session has expired", description: "Sign in again. Your unsaved changes remain in this editor.", action: "sign-in" };
  }
  if (status === 403) {
    return { title: "You cannot save this edition", description: detail ?? "Ask an administrator for access. Your unsaved changes remain.", action: "review-fields" };
  }
  if (status === 409) {
    return { title: "A newer revision exists", description: detail ?? "Review your local changes, then reload the latest revision or copy your work before discarding it.", action: "review-conflict" };
  }
  if (candidate.name === "ResponseParseError" && status !== undefined && status >= 200 && status < 300) {
    return { title: "Save outcome is uncertain", description: "The server responded, but its confirmation could not be read. Verify the latest revision before retrying.", action: "verify" };
  }
  if (status !== undefined && status >= 500) {
    return { title: "Server could not confirm the save", description: detail ?? "Keep this editor open and retry. If the request reached the server, verify the latest revision first.", action: "verify" };
  }
  return { title: "Network interrupted the save", description: "Your changes remain here. Verify the latest revision before attempting another save.", action: "verify" };
}
