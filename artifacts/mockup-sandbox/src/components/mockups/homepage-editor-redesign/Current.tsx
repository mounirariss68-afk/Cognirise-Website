import "./_group.css";
import { AlertTriangle, ArrowLeft, Eye, Globe, Save, Send } from "lucide-react";
import { useState } from "react";

type ReadinessIssue = {
  id: string;
  label: string;
  detail: string;
  path: string;
  severity: "blocker" | "warning";
  scopes: string[];
  actionLabel: string;
};

const issues: ReadinessIssue[] = [
  {
    id: "opening-narrative",
    label: "Opening narrative needs review",
    detail: "Clarify the public-facing promise before this homepage is submitted for review.",
    path: "content.narrative",
    severity: "blocker",
    scopes: ["Draft", "Publish"],
    actionLabel: "Review opening narrative",
  },
];

export function Current() {
  const [title, setTitle] = useState("Homepage");
  const [template, setTemplate] = useState("landing");
  const [pagePath, setPagePath] = useState("/");
  const [narrative, setNarrative] = useState(
    "We help ambitious organizations turn AI potential into measurable business impact—with the strategy, operating model, and technology to make it real.",
  );
  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="homepage-editor-redesign flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-muted/10">
      <header className="sticky top-0 z-20 flex min-h-16 flex-none flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-3 sm:flex-nowrap sm:justify-between sm:px-6 sm:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <button type="button" aria-label="Back to website pages" className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="rounded-sm border border-amber-400/50 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-800">Draft</span>
              <span className="font-mono text-xs text-muted-foreground">Rev 12</span>
              <span className="flex items-center font-mono text-[10px] text-amber-600"><AlertTriangle className="mr-1 h-3 w-3" /> Unsaved changes</span>
            </div>
          </div>
        </div>
        <div className="grid w-full min-w-0 max-w-full grid-cols-2 items-stretch gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
          <button type="button" aria-controls="readiness" aria-live="polite" onClick={() => jumpTo("readiness")} className="hidden rounded border border-destructive/40 bg-destructive/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-destructive hover:underline sm:block">
            1 blocker
          </button>
          <button type="button" className="flex min-h-8 items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider sm:px-3 sm:text-xs">
            <Eye className="mr-2 h-3.5 w-3.5" /> Preview saved page
          </button>
          <button type="button" className="flex min-h-8 items-center justify-center rounded-md bg-primary px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider text-primary-foreground sm:px-3 sm:text-xs">
            <Save className="mr-2 h-3.5 w-3.5" /> Save Draft
          </button>
          <button type="button" className="flex min-h-8 items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider sm:px-3 sm:text-xs">
            <Eye className="mr-2 h-3.5 w-3.5" /> Save and preview
          </button>
          <button type="button" className="flex min-h-8 items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider sm:px-3 sm:text-xs">
            <Send className="mr-2 h-3.5 w-3.5" /> Submit for review
          </button>
          <button type="button" className="flex min-h-8 items-center justify-center rounded-md bg-emerald-600 px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider text-white sm:px-3 sm:text-xs">
            <Globe className="mr-2 h-3.5 w-3.5" /> Publish...
          </button>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto md:flex md:overflow-hidden">
        <section className="min-w-0 flex-1 overflow-visible border-b border-border p-4 sm:p-6 md:overflow-y-auto md:border-b-0 md:border-r md:p-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <section className="rounded-lg border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">landing page authoring guide</p>
              <p className="mt-1 text-sm text-muted-foreground">Compose a governed landing page from reusable narrative sections, calls to action, SEO, and approved imagery.</p>
              <p className="mt-3 text-xs font-medium">Editing: <strong>Independent content for United Arab Emirates</strong></p>
              <div className="mt-3 rounded border bg-muted/10 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium">Saved preview and section navigator</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Preview always opens the selected saved page, never unsaved typing.</p>
                  </div>
                  <button type="button" className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"> <Eye className="mr-1 inline h-3.5 w-3.5" />Preview saved</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Content sections">
                  {["Title", "Template", "Page path", "Opening narrative", "Sections", "CTA label", "SEO title"].map((label) => (
                    <button key={label} type="button" className="h-7 rounded px-2 text-[11px] hover:bg-muted">{label}</button>
                  ))}
                </div>
              </div>
            </section>

            <section id="readiness" tabIndex={-1} aria-labelledby="readiness-title" className="scroll-mt-24 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 id="readiness-title" className="text-sm font-semibold">Readiness</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Each issue applies to this selected exact edition.</p>
                </div>
                <span className="text-xs font-medium text-destructive">1 blocker</span>
              </div>
              <ul className="mt-3 space-y-2" aria-label="Actionable readiness issues">
                {issues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-2 rounded border bg-muted/10 p-3">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${issue.severity === "blocker" ? "text-destructive" : "text-amber-600"}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium">{issue.label}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${issue.severity === "blocker" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}>{issue.severity}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{issue.scopes.join(" + ")}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">Path: {issue.path}</p>
                      <button type="button" className="mt-1 h-auto px-0 text-xs text-primary underline-offset-4 hover:underline" onClick={() => jumpTo("content-opening-narrative")}>{issue.actionLabel}</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <div>
              <label htmlFor="document-title" className="mb-2 block text-sm font-medium">Display Title (required)</label>
              <input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} className="h-auto min-w-0 max-w-full rounded-md border border-border/50 bg-background px-4 py-3 text-xl font-bold tracking-tight shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary sm:text-3xl" />
              <p className="mt-1 text-xs text-muted-foreground">{title.length}/240 characters</p>
            </div>

            <div id="document-content" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="content-template" className="text-sm font-medium">Governed template <span className="text-destructive">(required before publishing)</span></label>
                  <select id="content-template" value={template} onChange={(event) => setTemplate(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="landing">landing</option><option value="collection">collection</option><option value="campaign">campaign</option><option value="legal">legal</option><option value="methodologies">methodologies</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="content-page-path" className="text-sm font-medium">Public page path <span className="text-destructive">(required before publishing)</span></label>
                  <input id="content-page-path" value={pagePath} onChange={(event) => setPagePath(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="content-opening-narrative" className="text-sm font-medium">Opening narrative <span className="text-destructive">(required before publishing)</span></label>
                <textarea id="content-opening-narrative" rows={5} value={narrative} onChange={(event) => setNarrative(event.target.value)} className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}