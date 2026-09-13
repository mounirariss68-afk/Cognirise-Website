import { useEffect, useMemo, useState } from "react";
import type { CmsDocumentKind } from "@workspace/api-zod";
import type { SharedMarketBaseline } from "@workspace/api-client-react";
import { ContentEditor } from "./ContentEditor";
import { collectContentMediaIds } from "./authoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Snapshot = Record<string, any>;

export function buildSharedBaselineSnapshot(baselineSnapshot: Snapshot, draft: Snapshot): Record<string, unknown> {
  const content = draft.content && typeof draft.content === "object" ? draft.content : {};
  const sourceContent = baselineSnapshot.content && typeof baselineSnapshot.content === "object" ? baselineSnapshot.content : {};
  const sourceTypedMedia = new Set(collectContentMediaIds(sourceContent));
  const legacyRootMedia = Array.isArray(baselineSnapshot.mediaIds)
    ? baselineSnapshot.mediaIds.filter((id: unknown) => typeof id === "string" && !sourceTypedMedia.has(id))
    : [];
  const { seo, mediaIds: _mediaIds, ...metadata } = draft;
  return {
    ...metadata,
    slug: typeof draft.slug === "string" ? draft.slug : "",
    title: typeof draft.title === "string" ? draft.title : "",
    summary: typeof draft.summary === "string" ? draft.summary : null,
    content,
    ...(seo && typeof seo === "object" ? { seo } : {}),
    // Preserve non-content legacy attachment pins. Typed pins follow the
    // edited content so an explicitly removed reference is actually removed.
    mediaIds: [...new Set([...legacyRootMedia, ...collectContentMediaIds(content)])],
  };
}

export function SharedBaselineEditor({
  baseline,
  kind,
  open,
  busy,
  onOpenChange,
  onSave,
}: {
  baseline: SharedMarketBaseline | null;
  kind: CmsDocumentKind;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (baseline: SharedMarketBaseline, snapshot: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = useState<Snapshot>({});
  useEffect(() => {
    if (open && baseline) setDraft(structuredClone(baseline.snapshot) as Snapshot);
  }, [baseline, open]);
  const dirty = useMemo(() => Boolean(baseline) && JSON.stringify(draft) !== JSON.stringify(baseline?.snapshot), [baseline, draft]);
  const close = (nextOpen: boolean) => {
    if (!nextOpen && dirty && !window.confirm("Discard unsaved shared baseline edits?")) return;
    onOpenChange(nextOpen);
  };
  if (!baseline) return null;
  const content = draft.content && typeof draft.content === "object" ? draft.content : {};
  const save = () => {
    onSave(baseline, buildSharedBaselineSnapshot(baseline.snapshot as Snapshot, draft));
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit shared baseline · {baseline.locale}</DialogTitle>
          <DialogDescription>
            This edits an immutable successor of neutral baseline revision {baseline.revisionNumber}. Its source revision remains lineage only; no regional draft is changed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="shared-baseline-title">Title</Label><Input id="shared-baseline-title" value={draft.title ?? ""} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Slug (fixed source identity)</Label><Input value={draft.slug ?? ""} disabled /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="shared-baseline-summary">Summary</Label><Textarea id="shared-baseline-summary" value={draft.summary ?? ""} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value || null }))} /></div>
          <ContentEditor kind={kind} value={content} errors={[]} onChange={(next) => setDraft((current) => ({ ...current, content: next }))} />
          <section className="grid gap-3 border-t pt-4 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="shared-baseline-seo-title">SEO title</Label><Input id="shared-baseline-seo-title" value={draft.seo?.title ?? ""} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...(current.seo ?? {}), title: event.target.value || undefined } }))} /></div>
            <div className="space-y-1"><Label htmlFor="shared-baseline-seo-canonical">Canonical URL</Label><Input id="shared-baseline-seo-canonical" value={draft.seo?.canonicalUrl ?? ""} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...(current.seo ?? {}), canonicalUrl: event.target.value || undefined } }))} /></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="shared-baseline-seo-description">SEO description</Label><Textarea id="shared-baseline-seo-description" value={draft.seo?.description ?? ""} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...(current.seo ?? {}), description: event.target.value || undefined } }))} /></div>
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button type="button" disabled={!dirty || busy} onClick={save}>{busy ? "Saving shared baseline…" : "Save shared baseline"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}