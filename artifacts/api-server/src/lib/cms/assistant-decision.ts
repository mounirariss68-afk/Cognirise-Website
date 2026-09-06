import { AssistantFailure, assistantDecisionGuard } from "./editorial-assistant";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function valueAt(content: Record<string, unknown>, fieldPath: string): string | undefined {
  let value: unknown = content;
  for (const key of fieldPath.split(".")) { if (!record(value)) return; value = value[key]; }
  return typeof value === "string" ? value : undefined;
}

export function setValue(content: Record<string, unknown>, path: string, value: string): Record<string, unknown> {
  const next = structuredClone(content);
  const keys = path.split(".");
  let target: Record<string, unknown> = next;
  for (const key of keys.slice(0, -1)) {
    if (!record(target[key])) throw new AssistantFailure("target_revision_mismatch");
    target = target[key] as Record<string, unknown>;
  }
  if (typeof target[keys.at(-1)!] !== "string") throw new AssistantFailure("target_revision_mismatch");
  target[keys.at(-1)!] = value;
  return next;
}

/** Shared route decision boundary, deliberately independent of persistence. */
export function applyAssistantDecision(
  runActor: string, decider: string, currentRevisionId: string | null,
  targetRevisionId: string, expectedRevisionId: string | undefined,
  decision: "accepted" | "rejected", content?: Record<string, unknown>, fieldPath?: string, suggestion?: string,
) {
  if (runActor === decider) throw new AssistantFailure("self_decision");
  if (decision === "rejected") return { wasEdited: false, content };
  const guard = assistantDecisionGuard(runActor, decider, currentRevisionId, targetRevisionId, expectedRevisionId ?? "");
  if (guard) throw new AssistantFailure(guard);
  if (!content || !fieldPath || suggestion === undefined || valueAt(content, fieldPath) === undefined) {
    throw new AssistantFailure("resulting_revision_mismatch");
  }
  const updated = setValue(content, fieldPath, suggestion);
  return { wasEdited: valueAt(content, fieldPath) !== suggestion, content: updated };
}