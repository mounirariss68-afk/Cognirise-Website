import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentPreview } from "@workspace/api-client-react";
import { belongsToIndustrySection, INDUSTRY_SECTION_OUTLINE, isIndustryPreviewStatusMessage, type IndustryPreviewStatus, type IndustrySectionId } from "@workspace/api-zod";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Laptop, Monitor, ShieldCheck, Smartphone, Tablet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentEditor } from "./ContentEditor";
import { createLatestPreviewRequestCoordinator, industryPreviewFocusMessage, INDUSTRY_PREVIEW_WIDTH_CLASSES, industryWorkspaceLayout, nextIndustryDisclosureState, type IndustryPreviewViewport } from "./industry-workspace-state";

type Section = {
  id: IndustrySectionId;
  number: string;
  title: string;
  component: string;
  description: string;
  expandable?: boolean;
};

const sectionPresentation: Record<IndustrySectionId, Omit<Section, "id" | "number" | "title">> = {
  hero: { component: "Industry split hero", description: "Proposition and approved cinematic raster artwork." },
  opportunity: { component: "Editorial statement panel", description: "Always-visible strategic shift." },
  pressures: { component: "Numbered pressure rows", description: "Visible problem statements with optional detail.", expandable: true },
  capabilities: { component: "IndustryPicker / SpatialDisclosure", description: "Bounded value-domain and capability cards.", expandable: true },
  applications: { component: "Evidence matrix", description: "Evidence status and human-control boundaries.", expandable: true },
  perspective: { component: "Perspective panels / stage strip", description: "Reversal, roadmap and starting-point guidance.", expandable: true },
  market: { component: "Two-column editorial block", description: "Selected edition’s governed market context." },
  sources: { component: "Linked source list", description: "Evidence labels and further evidence destination.", expandable: true },
  cta: { component: "CTA band / BrandButton", description: "Direct offer, primary next step and service destination." },
};
const sections: Section[] = INDUSTRY_SECTION_OUTLINE.map((section, index) => ({
  ...sectionPresentation[section.id],
  id: section.id,
  title: section.label,
  number: String(index + 1).padStart(2, "0"),
}));

type Viewport = IndustryPreviewViewport;
const widths: Readonly<Record<Viewport, string>> = INDUSTRY_PREVIEW_WIDTH_CLASSES;

function PreviewState({ preview, currentRevisionId, hasUnsaved, failed, frameStatus }: {
  preview: DocumentPreview | null;
  currentRevisionId?: string;
  hasUnsaved: boolean;
  failed: boolean;
  frameStatus?: IndustryPreviewStatus;
}) {
  if (hasUnsaved) return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700">Unsaved edits are not in preview</Badge>;
  if (frameStatus === "revoked") return <Badge variant="outline" className="border-destructive/40 text-destructive">Preview session revoked</Badge>;
  if (frameStatus === "expired") return <Badge variant="outline" className="border-destructive/40 text-destructive">Preview session expired</Badge>;
  if (frameStatus === "unavailable") return <Badge variant="outline" className="border-destructive/40 text-destructive">Preview unavailable</Badge>;
  if (failed) return <Badge variant="outline" className="border-destructive/40 text-destructive">Preview unavailable</Badge>;
  if (!preview) return <Badge variant="outline">Preparing saved revision…</Badge>;
  if (new Date(preview.expiresAt).getTime() <= Date.now()) return <Badge variant="outline" className="border-destructive/40 text-destructive">Preview session expired</Badge>;
  if (currentRevisionId && preview.revisionId !== currentRevisionId) return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700">Stale saved preview</Badge>;
  return <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700">Saved revision preview</Badge>;
}

export function IndustryVisualWorkspace({
  content, onChange, errors, disabled, revisionId, currentRevisionId, revisionNumber, market, locale, hasUnsaved, requestPreview,
}: {
  content: Record<string, any>;
  onChange: (content: Record<string, any>) => void;
  errors: string[];
  disabled: boolean;
  /** Current exact edition revision; can advance remotely while a capability stays pinned. */
  currentRevisionId?: string;
  revisionId?: string;
  revisionNumber?: number;
  market: string;
  locale: string;
  hasUnsaved: boolean;
  requestPreview: () => Promise<DocumentPreview | undefined>;
}) {
  const [selected, setSelected] = useState<IndustrySectionId>("hero");
  const [governance, setGovernance] = useState(false);
  const [disclosure, setDisclosure] = useState<"expanded" | "collapsed" | undefined>(undefined);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reviewMode, setReviewMode] = useState(false);
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [frameStatus, setFrameStatus] = useState<IndustryPreviewStatus>();
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const [, setPreviewClock] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const terminalFrameStatus = useRef<Extract<IndustryPreviewStatus, "expired" | "revoked"> | undefined>(undefined);
  const previewRequestCoordinator = useRef(createLatestPreviewRequestCoordinator<DocumentPreview | undefined>(
    (next) => {
      if (!next) {
        setPreview(null);
        setPreviewFailed(true);
        return;
      }
      // This is a newly issued capability. A terminal state from its predecessor
      // must not make the replacement iframe unavailable before it can load.
      terminalFrameStatus.current = undefined;
      setFrameStatus(undefined);
      setPreviewFailed(false);
      setPreview(next);
    },
    () => {
      setPreview(null);
      setPreviewFailed(true);
    },
  ));
  const selectedDefinition = sections.find((item) => item.id === selected)!;

  const focusPreview = useCallback(() => {
    if (!preview || !frameRef.current?.contentWindow) return;
    const previewOrigin = new URL(preview.previewUrl, window.location.origin).origin;
    // The capability URL is issued by the protected preview endpoint. Do not
    // broadcast this message or send it to any public-page window.
    frameRef.current.contentWindow.postMessage(
      industryPreviewFocusMessage(selected, Boolean(selectedDefinition.expandable), disclosure),
      previewOrigin,
    );
  }, [disclosure, preview, selected, selectedDefinition.expandable]);

  const issuePreview = useCallback(async () => {
    // Do not remount an expired/revoked iframe while a replacement capability
    // is pending. Its eventual terminal message belongs only to the old token.
    setPreview(null);
    terminalFrameStatus.current = undefined;
    setPreviewFailed(false);
    setFrameStatus(undefined);
    await previewRequestCoordinator.current.issue(requestPreview);
  }, [requestPreview]);

  useEffect(() => {
    if (!revisionId) {
      previewRequestCoordinator.current.cancel();
      setPreview(null);
      setFrameStatus(undefined);
      return;
    }
    void issuePreview();
  }, [issuePreview, revisionId]);
  useEffect(() => () => { previewRequestCoordinator.current.cancel(); }, []);
  useEffect(() => {
    const element = workspaceRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWorkspaceWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const receivePreviewStatus = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin
        || event.source !== frameRef.current?.contentWindow
        || !isIndustryPreviewStatusMessage(event.data)
      ) return;
      // A revocation/expiry is terminal for this iframe capability. A later
      // ready signal cannot revive it, but successful issuance resets this ref.
      if (terminalFrameStatus.current) return;
      if (event.data.status === "revoked" || event.data.status === "expired") {
        terminalFrameStatus.current = event.data.status;
        setFrameStatus(event.data.status);
        setPreviewFailed(true);
        return;
      }
      setFrameStatus(event.data.status);
      setPreviewFailed(event.data.status !== "ready");
    };
    window.addEventListener("message", receivePreviewStatus);
    return () => window.removeEventListener("message", receivePreviewStatus);
  }, []);

  useEffect(() => { focusPreview(); }, [focusPreview]);
  useEffect(() => {
    const interval = window.setInterval(() => setPreviewClock((value) => value + 1), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectSection = (section: Section) => {
    setGovernance(false);
    setSelected(section.id);
    setDisclosure(section.expandable ? "expanded" : undefined);
  };
  const issueCount = (section: IndustrySectionId) => {
    return errors.filter((error) => belongsToIndustrySection(error.split(":")[0].trim(), section)).length;
  };
  const refreshPreview = () => { void issuePreview(); };
  const previewUrl = preview ? new URL(preview.previewUrl, window.location.origin).toString() : "";
  const expires = preview && new Date(preview.expiresAt);
  const isExpired = Boolean(expires && expires.getTime() <= Date.now());
  const previewExpired = isExpired || frameStatus === "expired";
  const previewUnavailable = previewFailed || frameStatus === "unavailable" || frameStatus === "revoked";
  const workspaceLayout = industryWorkspaceLayout(workspaceWidth);

  return (
    <section ref={workspaceRef} className="rounded-lg border bg-card" aria-label="Industry visual authoring workspace" data-testid="industry-visual-workspace" data-layout={workspaceLayout}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">Fixed industry template</p>
          <h2 className="mt-1 text-base font-semibold">Visual page workspace</h2>
          <p className="mt-1 text-xs text-muted-foreground">Edit one governed section at a time. The preview contains a saved, exact revision only.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PreviewState preview={preview} currentRevisionId={currentRevisionId} hasUnsaved={hasUnsaved} failed={previewFailed} frameStatus={frameStatus} />
          <Button type="button" variant={reviewMode ? "default" : "outline"} size="sm" onClick={() => setReviewMode((value) => !value)}>
            <Monitor className="mr-1.5 h-3.5 w-3.5" /> {reviewMode ? "Exit review" : "Review"}
          </Button>
        </div>
      </div>
      <div className={reviewMode ? "block" : workspaceLayout === "three-column" ? "grid min-h-[680px] grid-cols-[230px_minmax(350px,1fr)_minmax(420px,0.9fr)]" : workspaceLayout === "preview-row" ? "grid min-h-[680px] grid-cols-[230px_minmax(350px,1fr)]" : "block"}>
        {!reviewMode && <nav className={`border-b p-3 ${workspaceLayout === "three-column" ? "border-r border-b-0" : ""}`} aria-label="Industry section outline">
          <p className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Section outline</p>
          <div className="space-y-1">
            {sections.map((section) => {
              const active = !governance && selected === section.id;
              const issues = issueCount(section.id);
              return <button key={section.id} type="button" onClick={() => selectSection(section)} aria-current={active ? "step" : undefined} className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60"}`} data-testid={`industry-outline-${section.id}`}>
                <span className="flex items-start justify-between gap-2"><span><span className="mr-2 font-mono text-[10px] text-muted-foreground">{section.number}</span><span className="text-xs font-medium">{section.title}</span></span>{issues > 0 && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label={`${issues} validation issues`} />}</span>
                <span className="mt-1 block pl-5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">{section.component}</span>
              </button>;
            })}
            <div className="my-3 border-t" />
            <button type="button" onClick={() => setGovernance(true)} className={`w-full rounded-md border px-2.5 py-2 text-left ${governance ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60"}`}><span className="flex items-center gap-2 text-xs font-medium"><ShieldCheck className="h-3.5 w-3.5" /> Governance</span><span className="mt-1 block pl-5 text-[10px] text-muted-foreground">Visibility, ordering and review dates</span></button>
          </div>
        </nav>}
        <div className={reviewMode ? "p-4" : `min-w-[350px] border-b p-4 ${workspaceLayout === "three-column" ? "border-r border-b-0" : ""}`} data-testid="industry-inspector">
          {!reviewMode && <div className="mb-4 flex items-start justify-between gap-3">
            <div><p className="font-mono text-[10px] uppercase tracking-wider text-primary">{governance ? "Separate controls" : selectedDefinition.component}</p><h3 className="mt-1 font-semibold">{governance ? "Governance" : selectedDefinition.title}</h3><p className="mt-1 text-xs text-muted-foreground">{governance ? "These controls do not change template order or section identities." : selectedDefinition.description}</p></div>
            {!governance && selectedDefinition.expandable && <Button type="button" variant="outline" size="sm" onClick={() => setDisclosure(nextIndustryDisclosureState)}><>{disclosure === "expanded" ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}{disclosure === "expanded" ? "Expanded" : "Collapsed"}</></Button>}
          </div>}
          {!reviewMode && <fieldset disabled={disabled} className="contents"><ContentEditor kind="industry" value={content} onChange={onChange} errors={errors} industrySection={governance ? "governance" : selected} /></fieldset>}
          {reviewMode && <PreviewPane preview={preview} previewUrl={previewUrl} frameRef={frameRef} viewport={viewport} setViewport={setViewport} revisionNumber={revisionNumber} market={market} locale={locale} expires={expires} expired={previewExpired} failed={previewUnavailable} refresh={refreshPreview} onLoad={focusPreview} />}
        </div>
        {!reviewMode && <PreviewPane className={workspaceLayout === "three-column" ? "" : workspaceLayout === "preview-row" ? "col-span-2" : ""} preview={preview} previewUrl={previewUrl} frameRef={frameRef} viewport={viewport} setViewport={setViewport} revisionNumber={revisionNumber} market={market} locale={locale} expires={expires} expired={previewExpired} failed={previewUnavailable} refresh={refreshPreview} onLoad={focusPreview} />}
      </div>
    </section>
  );
}

function PreviewPane({ className = "", preview, previewUrl, frameRef, viewport, setViewport, revisionNumber, market, locale, expires, expired, failed, refresh, onLoad }: {
  className?: string; preview: DocumentPreview | null; previewUrl: string; frameRef: React.RefObject<HTMLIFrameElement | null>; viewport: Viewport; setViewport: (value: Viewport) => void;
  revisionNumber?: number; market: string; locale: string; expires: Date | null; expired: boolean; failed: boolean; refresh: () => void; onLoad: () => void;
}) {
  return <aside className={`min-w-0 bg-muted/20 p-4 ${className}`} aria-label="Saved revision preview" data-testid="industry-preview-pane">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Protected preview</p><p className="mt-1 text-xs font-medium">{market.toUpperCase()} · {locale} · Revision {preview?.revisionNumber ?? revisionNumber ?? "—"}</p></div>
      <div className="flex items-center gap-1" role="group" aria-label="Preview viewport">
        {([["desktop", Laptop], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([value, Icon]) => <Button key={value} type="button" variant={viewport === value ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewport(value)} aria-label={`${value} preview`}><Icon className="h-3.5 w-3.5" /></Button>)}
      </div>
    </div>
    <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
      {expired ? <span className="text-destructive">Expired preview capability</span> : expires ? <span>Expires {expires.toLocaleString()}</span> : null}
      {preview?.usedFallback && <span>Requested edition uses {preview.market.toUpperCase()} fallback</span>}
      {preview?.warnings.length ? <span className="text-amber-700">{preview.warnings.length} saved-revision warning{preview.warnings.length === 1 ? "" : "s"}</span> : null}
    </div>
    {(failed || expired || !previewUrl) ? <div className="flex min-h-80 flex-col items-center justify-center rounded-md border border-dashed bg-background p-6 text-center"><AlertTriangle className="mb-3 h-5 w-5 text-amber-600" /><p className="text-sm font-medium">{expired ? "This preview session has expired" : "Saved preview unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">Create a fresh protected preview of this exact saved revision. Unsaved inputs are never sent.</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={refresh}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh preview</Button></div>
      : <><div className="flex min-h-[480px] justify-center overflow-auto rounded-md border bg-muted p-3"><iframe ref={frameRef} src={previewUrl} title={`Saved revision ${preview?.revisionNumber} preview`} className={`${widths[viewport]} min-h-[720px] shrink-0 bg-white shadow-sm`} onLoad={onLoad} /></div><div className="mt-3 flex flex-wrap items-center gap-3"><a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-primary underline">Open protected preview in a new tab <ExternalLink className="ml-1 h-3 w-3" /></a><Button type="button" variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh preview</Button></div></>}
  </aside>;
}