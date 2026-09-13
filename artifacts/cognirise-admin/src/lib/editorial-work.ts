import { customFetch } from "@workspace/api-client-react";

export type EditorialWorkStatus = "active" | "completed" | "blocked";
export type ReviewRequestStatus = "requested" | "approved" | "rejected" | "superseded" | "blocked";

export type EditorialUser = {
  id: string;
  name: string;
};

export type EditorialAssignee = EditorialUser & {
  role: "editor" | "publisher" | "administrator";
};

export type EditorialAssignment = {
  id: string;
  editionId: string;
  editor: EditorialUser | null;
  reviewer: EditorialUser | null;
  dueAt: string | null;
  status: EditorialWorkStatus;
};

export type EditorialWorkItem = {
  blockedReason?: string | null;
  id: string;
  editionId: string;
  documentId: string;
  documentTitle: string;
  documentKind: string;
  market: string;
  locale: string;
  editor: EditorialUser | null;
  reviewer: EditorialUser | null;
  dueAt: string | null;
  status: EditorialWorkStatus;
  currentRevisionId: string | null;
  currentRevisionNumber: number | null;
  workflowState: string | null;
  publishedRevisionId: string | null;
  link: string;
  reviewRequest?: EditorialReviewRequest | null;
  reviewRequestId?: string | null;
  reviewRevisionId?: string | null;
};

export type EditorialReviewRequest = {
  id: string;
  editionId: string;
  revisionId: string;
  requesterId: string;
  reviewerId: string;
  status: ReviewRequestStatus;
  note: string | null;
  decisionNote: string | null;
  requestedAt: string;
  decidedAt: string | null;
  supersededAt: string | null;
  blockedReason: string | null;
};

export type EditorialNotification = {
  id: string;
  type: "assignment" | "review-requested" | "review-approved" | "review-rejected" | "review-superseded" | "due-reminder" | "access-blocked" | string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
  deliveryStatus: string;
};

export type DigestStatus = {
  enabled: boolean;
  configured: boolean;
  status: string;
  lastSentAt: string | null;
  lastError: string | null;
};

export type QueueEmptyState = "no-work" | "no-access" | "load-failed";

export function editorialWorkUrl(path: string, params?: Record<string, string | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return `/api/editorial-work${path}${query.size ? `?${query.toString()}` : ""}`;
}

export function listEditionAssignments(editionId: string) {
  return customFetch<{ items: EditorialAssignment[] }>(
    editorialWorkUrl("/assignments", { editionId, mine: false, status: "active" }),
    { responseType: "json" },
  );
}

/** Active people already authorized for this exact edition, never the admin-only user directory. */
export function listEligibleEditorialAssignees(editionId: string) {
  return customFetch<{ items: EditorialAssignee[] }>(
    editorialWorkUrl(`/editions/${encodeURIComponent(editionId)}/assignees`),
    { responseType: "json" },
  );
}

export function saveEditionAssignment(
  editionId: string,
  input: { editorId?: string | null; reviewerId?: string | null; dueAt?: string | null },
) {
  return customFetch<{ assignment: EditorialAssignment }>(
    editorialWorkUrl(`/editions/${encodeURIComponent(editionId)}/assignment`),
    { method: "PUT", responseType: "json", body: JSON.stringify(input) },
  );
}

export function clearEditionAssignment(editionId: string) {
  return customFetch<void>(
    editorialWorkUrl(`/editions/${encodeURIComponent(editionId)}/assignment`),
    { method: "DELETE", responseType: "json" },
  );
}

export function requestRevisionReview(
  revisionId: string,
  input: { reviewerId?: string; note?: string },
) {
  return customFetch<{ reviewRequest: EditorialReviewRequest }>(
    editorialWorkUrl(`/revisions/${encodeURIComponent(revisionId)}/request-review`),
    { method: "POST", responseType: "json", body: JSON.stringify(input) },
  );
}

export function decideReviewRequest(
  reviewRequestId: string,
  input: { decision: "approved" | "rejected"; note?: string },
) {
  return customFetch<{ reviewRequest: EditorialReviewRequest }>(
    editorialWorkUrl(`/review-requests/${encodeURIComponent(reviewRequestId)}/decision`),
    { method: "POST", responseType: "json", body: JSON.stringify(input) },
  );
}

export function getMyEditorialWork(includeUnassigned = false) {
  return customFetch<{ items: EditorialWorkItem[]; emptyState: QueueEmptyState }>(
    editorialWorkUrl("/my", { includeUnassigned }),
    { responseType: "json" },
  );
}

export function getTeamEditorialWork(input: {
  market?: string;
  assigneeId?: string;
  status?: EditorialWorkStatus;
  includeUnassigned?: boolean;
}) {
  return customFetch<{ items: EditorialWorkItem[]; emptyState: QueueEmptyState }>(
    editorialWorkUrl("/team", { ...input, includeUnassigned: input.includeUnassigned ?? true }),
    { responseType: "json" },
  );
}

export function getEditorialNotifications(unreadOnly = false, limit = 50) {
  return customFetch<{ items: EditorialNotification[] }>(
    editorialWorkUrl("/notifications", { unreadOnly, limit: String(limit) }),
    { responseType: "json" },
  );
}

export function markEditorialNotificationRead(notificationId: string) {
  return customFetch<{ notification: EditorialNotification }>(
    editorialWorkUrl(`/notifications/${encodeURIComponent(notificationId)}/read`),
    { method: "POST", responseType: "json" },
  );
}

export function markEditorialNotificationUnread(notificationId: string) {
  return customFetch<{ notification: EditorialNotification }>(
    editorialWorkUrl(`/notifications/${encodeURIComponent(notificationId)}/unread`),
    { method: "POST", responseType: "json" },
  );
}

export function markAllEditorialNotificationsRead() {
  return customFetch<{ count: number }>(
    editorialWorkUrl("/notifications/read-all"),
    { method: "POST", responseType: "json" },
  );
}

export function getDigestStatus() {
  return customFetch<DigestStatus>(editorialWorkUrl("/digest-status"), { responseType: "json" });
}

export function saveDigestPreferences(enabled: boolean) {
  return customFetch<DigestStatus>(
    editorialWorkUrl("/digest-preferences"),
    { method: "PUT", responseType: "json", body: JSON.stringify({ enabled }) },
  );
}

export function editorialErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as { data?: { error?: unknown; detail?: unknown; code?: unknown } | string; message?: unknown };
  if (candidate.data && typeof candidate.data === "object") {
    if (candidate.data.code === "DIGEST_NOT_CONFIGURED") return "Digest delivery has not been configured by an administrator.";
    if (typeof candidate.data.error === "string") return candidate.data.error;
    if (typeof candidate.data.detail === "string") return candidate.data.detail;
  }
  if (typeof candidate.data === "string" && candidate.data.trim()) return candidate.data;
  if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message;
  return fallback;
}