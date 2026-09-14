import { validateCmsContent, type CmsDocumentKind } from "@workspace/api-zod";

export type ReadinessScope = "draft" | "publish" | "workflow" | "edition";
export type ReadinessSeverity = "blocker" | "warning";
export type ReadinessAction =
  | "focus-title"
  | "focus-content-field"
  | "focus-seo"
  | "open-editions"
  | "open-review-comments"
  | "focus-restore"
  | "focus-save"
  | "focus-submit-review"
  | "review-access";

export type ReadinessIssue = {
  id: string;
  scope: ReadinessScope;
  /** Every readiness gate that requires this single correction. */
  scopes: ReadinessScope[];
  severity: ReadinessSeverity;
  path: string;
  label: string;
  detail: string;
  action: ReadinessAction;
  actionLabel: string;
};

export type DocumentReadinessInput = {
  kind: CmsDocumentKind;
  title: string;
  content: Record<string, unknown>;
  mediaIds: string[];
  exact?: boolean;
  readinessErrors?: string[];
  readinessIssues?: Array<{
    category: "missing" | "validation" | "workflow";
    action: "create" | "edit" | "review";
    message: string;
  }>;
  workflowState?: string | null;
  publicationState?: string | null;
  hasUnsaved?: boolean;
  canEdit?: boolean;
  canPublish?: boolean;
  canRestore?: boolean;
  availabilityPending?: boolean;
  availableInMarket?: boolean | null;
};

function splitValidationError(error: string): { path: string; message: string } {
  const separator = error.indexOf(":");
  if (separator < 0) return { path: "content", message: error };
  return {
    path: error.slice(0, separator).trim() || "content",
    message: error.slice(separator + 1).trim() || "Needs attention.",
  };
}

function normalizePath(path: string): string {
  if (
    path === "title"
    || path.startsWith("seo.")
    || path.startsWith("workflow.")
    || path.startsWith("edition.")
    || path.startsWith("permissions.")
  ) return path;
  return path === "content" || path.startsWith("content.") ? path : `content.${path}`;
}

function pathLabel(path: string): string {
  return path
    .replace(/\[(\d+)\]/g, " item $1")
    .split(".")
    .filter(Boolean)
    .map((part) => part.replace(/([a-z])([A-Z])/g, "$1 $2"))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" → ");
}

function actionForPath(path: string): Pick<ReadinessIssue, "action" | "actionLabel"> {
  if (path === "title") return { action: "focus-title", actionLabel: "Focus display title" };
  if (path === "seo" || path.startsWith("seo.")) return { action: "focus-seo", actionLabel: "Open SEO field" };
  return { action: "focus-content-field", actionLabel: "Find content correction" };
}

function validationIssues(
  scope: "draft" | "publish" | "edition",
  errors: string[],
): ReadinessIssue[] {
  return errors.map((error) => {
    const parsed = splitValidationError(error);
    const path = normalizePath(parsed.path);
    const { message } = parsed;
    const action = actionForPath(path);
    return {
      id: `${scope}:blocker:${path}:${message}`,
      scope,
      scopes: [scope],
      severity: "blocker",
      path,
      label: `${pathLabel(path)} needs correction`,
      detail: message,
      ...action,
    };
  });
}

function structuredEditionIssues(input: DocumentReadinessInput): ReadinessIssue[] {
  return (input.readinessIssues ?? []).flatMap((issue, index) => {
    if (issue.category === "validation") return validationIssues("edition", [issue.message]);
    if (issue.action === "create") {
      const permitted = Boolean(input.canEdit);
      return [{
        id: `edition:blocker:create:${index}`,
        scope: "edition" as const,
        scopes: ["edition"] as ReadinessScope[],
        severity: "blocker" as const,
        path: "edition.create",
        label: "Exact edition needs creation",
        detail: issue.message,
        action: (permitted ? "open-editions" : "review-access") as ReadinessAction,
        actionLabel: permitted ? "Open editions" : "Review required access",
      }];
    }

    const awaitingDecision = input.workflowState === "in-review";
    const permitted = awaitingDecision ? Boolean(input.canPublish) : Boolean(input.canEdit);
    return [{
      id: `workflow:blocker:review:${index}`,
      scope: "workflow" as const,
      scopes: ["workflow"] as ReadinessScope[],
      severity: "blocker" as const,
      path: "workflow.review",
      label: awaitingDecision ? "Review decision required" : "Review submission required",
      detail: issue.message,
      action: (permitted
        ? (awaitingDecision ? "open-review-comments" : "focus-submit-review")
        : "review-access") as ReadinessAction,
      actionLabel: permitted
        ? (awaitingDecision ? "Open review comments" : "Focus Submit Review")
        : "Review required access",
    }];
  });
}

/** Merges one field correction across every gate that reports its canonical path. */
export function dedupeReadinessIssues(issues: ReadinessIssue[]): ReadinessIssue[] {
  const deduped = new Map<string, ReadinessIssue>();
  for (const issue of issues) {
    const path = normalizePath(issue.path);
    const normalized = path === issue.path ? issue : { ...issue, path };
    const validationField = normalized.path.startsWith("content.") || normalized.path === "seo" || normalized.path.startsWith("seo.");
    const identity = validationField
      ? `${normalized.severity}:${normalized.path}`
      : `${normalized.severity}:${normalized.path}:${normalized.detail}`;
    const existing = deduped.get(identity);
    if (!existing) {
      deduped.set(identity, { ...normalized, scopes: [...(normalized.scopes ?? [normalized.scope])] });
      continue;
    }
    for (const scope of normalized.scopes ?? [normalized.scope]) {
      if (!existing.scopes.includes(scope)) existing.scopes.push(scope);
    }
    if (normalized.detail !== existing.detail && !existing.detail.includes(normalized.detail)) {
      existing.detail = `${existing.detail} Also reported: ${normalized.detail}`;
    }
  }
  return [...deduped.values()];
}

/**
 * Builds the editor's local readiness report. A shared correction is shown
 * once and names every gate that still requires it.
 */
export function buildDocumentReadiness(input: DocumentReadinessInput): ReadinessIssue[] {
  const draft = validateCmsContent(input.kind, input.content, "draft");
  const publish = validateCmsContent(input.kind, input.content, "publish");
  const structuredIssues = structuredEditionIssues(input);
  const hasStructuredWorkflowIssue = input.readinessIssues?.some((issue) => issue.category === "workflow") ?? false;
  const referencesMedia = ["person", "partner", "platform", "publication", "case-study", "industry", "framework", "site-configuration"].includes(input.kind);
  const issues: ReadinessIssue[] = [
    ...(input.title.trim() ? [] : [{
      id: "draft:blocker:title:missing",
      scope: "draft" as const,
      scopes: ["draft"] as ReadinessScope[],
      severity: "blocker" as const,
      path: "title",
      label: "Display title needs correction",
      detail: "Add a public display title before saving this draft.",
      action: "focus-title" as const,
      actionLabel: "Focus display title",
    }]),
    ...(draft.success ? [] : validationIssues("draft", draft.errors)),
    ...(publish.success ? [] : validationIssues("publish", publish.errors)),
    ...(!referencesMedia || input.mediaIds.length > 0 ? [] : [{
      id: "publish:warning:content.media",
      scope: "publish" as const,
      scopes: ["publish"] as ReadinessScope[],
      severity: "warning" as const,
      path: "content.media",
      label: "Approved media needs attention",
      detail: "Choose approved media where this public presentation requires it.",
       action: "focus-content-field" as const,
       actionLabel: "Focus content field",
    }]),
    ...(input.exact === false ? [{
      id: "edition:blocker:edition",
      scope: "edition" as const,
      scopes: ["edition"] as ReadinessScope[],
      severity: "blocker" as const,
      path: "edition",
      label: "No exact edition is available",
      detail: "Create or select an exact market and locale edition before publishing.",
      action: "open-editions" as const,
      actionLabel: "Open editions",
    }] : []),
    ...(input.readinessIssues?.length ? structuredIssues : validationIssues("edition", input.readinessErrors ?? [])),
    ...(input.hasUnsaved ? [{
      id: "workflow:warning:unsaved",
      scope: "workflow" as const,
      scopes: ["workflow"] as ReadinessScope[],
      severity: "warning" as const,
      path: "workflow.unsaved",
      label: "Unsaved changes",
      detail: "Save this exact edition before submitting it for review or publishing it.",
      action: "focus-save" as const,
      actionLabel: "Focus Save draft",
    }] : []),
    ...(input.workflowState === "archived" ? [{
      id: "workflow:blocker:archived",
      scope: "workflow" as const,
      scopes: ["workflow"] as ReadinessScope[],
      severity: "blocker" as const,
      path: "workflow.state",
      label: "Archived edition",
      detail: input.canRestore
        ? "Restore this edition as a draft before it can move through workflow."
        : "A publisher or administrator must restore this archived edition as a draft.",
      action: (input.canRestore ? "focus-restore" : "review-access") as ReadinessAction,
      actionLabel: input.canRestore ? "Focus Restore as draft" : "Review required access",
    }] : []),
    ...(input.workflowState === "in-review" && !hasStructuredWorkflowIssue ? [{
      id: "workflow:warning:review",
      scope: "workflow" as const,
      scopes: ["workflow"] as ReadinessScope[],
      severity: "warning" as const,
      path: "workflow.state",
      label: "Review decision pending",
      detail: "This exact revision is locked while it is in review. A publisher can approve or reject it.",
      action: "open-review-comments" as const,
      actionLabel: "Open review comments",
    }] : []),
    ...(!input.canEdit && input.workflowState !== "in-review" && input.workflowState !== "archived" ? [{
      id: "workflow:blocker:edit-permission",
      scope: "workflow" as const,
      scopes: ["workflow"] as ReadinessScope[],
      severity: "blocker" as const,
      path: "permissions.edit",
      label: "Editing permission required",
      detail: "Your assigned markets do not allow you to correct this selected edition.",
      action: "review-access" as const,
      actionLabel: "Review required access",
    }] : []),
    ...(input.canPublish === false && input.workflowState !== "archived" && input.publicationState !== "published" ? [{
      id: "workflow:warning:publish-permission",
      scope: "workflow" as const,
      scopes: ["workflow"] as ReadinessScope[],
      severity: "warning" as const,
      path: "permissions.publish",
      label: "Publisher approval required",
      detail: "A publisher or administrator must release this exact edition after its checks pass.",
      action: "review-access" as const,
      actionLabel: "Review required access",
    }] : []),
    ...(input.availabilityPending ? [{
      id: "edition:warning:availability-pending",
      scope: "edition" as const,
      scopes: ["edition"] as ReadinessScope[],
      severity: "warning" as const,
      path: "edition.availability",
      label: "Destination availability is pending",
      detail: "Review and publish the destination snapshot separately from this content revision.",
      action: "open-editions" as const,
      actionLabel: "Open editions",
    }] : []),
    ...(input.availableInMarket === false ? [{
      id: "edition:warning:not-available",
      scope: "edition" as const,
      scopes: ["edition"] as ReadinessScope[],
      severity: "warning" as const,
      path: "edition.availability",
      label: "Edition is not available in this market",
      detail: "Choose to show this content in the selected market, then review the destination change.",
      action: "open-editions" as const,
      actionLabel: "Open editions",
    }] : []),
  ];

  return dedupeReadinessIssues(issues);
}

export function readinessCounts(issues: ReadinessIssue[]) {
  return {
    blockers: issues.filter((issue) => issue.severity === "blocker").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
  };
}