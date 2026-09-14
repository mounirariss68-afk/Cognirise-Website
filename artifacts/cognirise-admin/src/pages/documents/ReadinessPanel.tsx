import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReadinessIssue } from "./document-readiness";

const scopeLabel: Record<ReadinessIssue["scope"], string> = {
  draft: "Draft",
  publish: "Publish",
  workflow: "Workflow",
  edition: "Edition",
};

export function ReadinessPanel({
  id,
  issues,
  onAction,
}: {
  id: string;
  issues: ReadinessIssue[];
  onAction: (issue: ReadinessIssue) => void;
}) {
  const blockers = issues.filter((issue) => issue.severity === "blocker").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;

  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-lg border bg-card p-4" data-testid="publication-readiness">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="text-sm font-semibold">Readiness</h2>
          <p className="mt-1 text-xs text-muted-foreground">Each issue applies to this selected exact edition.</p>
        </div>
        <span className={`text-xs font-medium ${blockers ? "text-destructive" : warnings ? "text-amber-700" : "text-emerald-700"}`}>
          {blockers ? `${blockers} blocker${blockers === 1 ? "" : "s"}` : warnings ? `${warnings} warning${warnings === 1 ? "" : "s"}` : "Ready for the next workflow step"}
        </span>
      </div>
      {issues.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded border border-emerald-300 bg-emerald-50/60 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Draft, publish, workflow, and edition checks are clear for this selection.
        </div>
      ) : (
        <ul className="mt-3 space-y-2" aria-label="Actionable readiness issues">
          {issues.map((issue) => (
            <li id={`${id}-${issue.id}`} key={issue.id} tabIndex={-1} data-readiness-issue={issue.id} className="flex items-start gap-2 rounded border bg-muted/10 p-3">
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${issue.severity === "blocker" ? "text-destructive" : "text-amber-600"}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium">{issue.label}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${issue.severity === "blocker" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}>{issue.severity}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {issue.scopes.map((scope) => scopeLabel[scope]).join(" + ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">Path: {issue.path}</p>
                <Button type="button" variant="link" size="sm" className="mt-1 h-auto px-0 text-xs" onClick={() => onAction(issue)}>
                  {issue.actionLabel}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}