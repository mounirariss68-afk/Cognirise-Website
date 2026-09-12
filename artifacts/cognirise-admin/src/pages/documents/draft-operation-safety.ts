/**
 * Small, UI-only primitives for forms which must distinguish local work from
 * the outcome of an asynchronous mutation. The guard is intentionally scoped
 * to one editor/record: callers can create one guard per record and unrelated
 * editors remain usable while another request is in flight.
 */
export type DraftOperationState =
  | "clean"
  | "dirty"
  | "validating"
  | "saving"
  | "saved"
  | "rejected"
  | "conflict"
  | "confirmation-uncertain";

export type DraftOperationToken<T> = {
  key: string;
  sequence: number;
  snapshot: T;
};

export type DraftOperationStart<T> =
  | { accepted: true; token: DraftOperationToken<T> }
  | { accepted: false; reason: "pending"; token: DraftOperationToken<T> };

/**
 * Last-response-wins is not sufficient for an editor: an old response must
 * also be unable to mark a newer record/edition as saved. This guard binds a
 * request to both a stable editor key and the submitted snapshot. It does not
 * cancel network work; it simply makes late responses safe to ignore.
 */
export function createDraftOperationGuard<T>() {
  let sequence = 0;
  let pending: DraftOperationToken<T> | undefined;

  const isCurrent = (token: DraftOperationToken<T>, key = token.key): boolean =>
    pending?.sequence === token.sequence
    && pending.key === key;

  return {
    start(key: string, snapshot: T): DraftOperationStart<T> {
      if (pending) return { accepted: false, reason: "pending", token: pending };
      const token = { key, sequence: ++sequence, snapshot };
      pending = token;
      return { accepted: true, token };
    },

    isCurrent,

    finish(token: DraftOperationToken<T>): boolean {
      if (!isCurrent(token)) return false;
      pending = undefined;
      return true;
    },

    cancel(): void {
      sequence += 1;
      pending = undefined;
    },

    get pending(): DraftOperationToken<T> | undefined {
      return pending;
    },
  };
}

export type DraftRecoveryExport = {
  filename: string;
  mimeType: "application/json";
  body: string;
};

export type DraftRecoveryExportOptions = {
  editorKey: string;
  kind: string;
  market: string;
  locale: string;
  revisionId?: string | null;
  capturedAt?: string;
};

/**
 * Build an explicit, user-triggered recovery file. Nothing is persisted
 * automatically and the envelope deliberately contains only editor inputs:
 * never include credentials, tokens, submission notes, or provider payloads.
 */
export function createDraftRecoveryExport<T>(
  draft: T,
  options: DraftRecoveryExportOptions,
): DraftRecoveryExport {
  const capturedAt = options.capturedAt ?? new Date().toISOString();
  const safeKey = options.editorKey.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "cms-draft";
  return {
    filename: `${safeKey}-local-draft.json`,
    mimeType: "application/json",
    body: JSON.stringify({
      recoveryVersion: 1,
      capturedAt,
      editorKey: options.editorKey,
      kind: options.kind,
      market: options.market,
      locale: options.locale,
      revisionId: options.revisionId ?? null,
      draft,
    }, null, 2),
  };
}

/**
 * Download a recovery export without writing it to local storage. Returning a
 * boolean keeps quota/browser capability failures visible to the caller.
 */
export function downloadDraftRecovery(
  recovery: DraftRecoveryExport,
  environment: {
    document?: Pick<Document, "createElement" | "body">;
    URL?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
  } = globalThis,
): boolean {
  const document = environment.document;
  const URLApi = environment.URL;
  if (!document || !URLApi?.createObjectURL || !URLApi.revokeObjectURL) return false;

  const link = document.createElement("a");
  const blob = new Blob([recovery.body], { type: recovery.mimeType });
  const objectUrl = URLApi.createObjectURL(blob);
  link.href = objectUrl;
  link.download = recovery.filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Let the browser start the download before releasing the object URL.
  setTimeout(() => URLApi.revokeObjectURL(objectUrl), 0);
  return true;
}