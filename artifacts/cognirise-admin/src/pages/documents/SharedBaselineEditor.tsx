import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { validateCmsContent, type CmsDocumentKind } from "@workspace/api-zod";
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
  embedded = false,
  readOnly = false,
  footerActions,
  onDirtyChange,
  resetToken,
  onRegisterSave,
  onOpenChange,
  onSave,
}: {
  baseline: SharedMarketBaseline | null;
  kind: CmsDocumentKind;
  open: boolean;
  busy?: boolean;
  /** Render the neutral snapshot as an effective preview without edit controls. */
  readOnly?: boolean;
  /** Actions for a read-only regional effective preview. */
  footerActions?: ReactNode;
  embedded?: boolean;
  /** Notify the owning editor so its navigation/recovery guards include this draft. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Reset the captured baseline after the owning mutation has committed. */
  resetToken?: number;
  /** Allow the owning editor to expose the same save action in its top bar. */
  onRegisterSave?: (save: (() => void) | null) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (baseline: SharedMarketBaseline, snapshot: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = useState<Snapshot>(() => (
    baseline ? structuredClone(baseline.snapshot) as Snapshot : {}
  ));
  const dirtyRef = useRef(false);
  const capturedBaselineRef = useRef<SharedMarketBaseline | null>(null);
  const loadedBaselineKeyRef = useRef("");
  const resetTokenRef = useRef(resetToken);
  const setDraftFromBaseline = useCallback((nextBaseline: SharedMarketBaseline) => {
    setDraft(structuredClone(nextBaseline.snapshot) as Snapshot);
    capturedBaselineRef.current = nextBaseline;
    loadedBaselineKeyRef.current = `${nextBaseline.id}:${nextBaseline.revisionId}`;
    dirtyRef.current = false;
    onDirtyChange?.(false);
  }, [onDirtyChange]);
  useEffect(() => {
    if (!open || !baseline) return;
    const baselineKey = `${baseline.id}:${baseline.revisionId}`;
    const resetRequested = resetTokenRef.current !== resetToken;
    if (resetRequested || (!dirtyRef.current && loadedBaselineKeyRef.current !== baselineKey)) {
      resetTokenRef.current = resetToken;
      setDraftFromBaseline(baseline);
    }
  }, [baseline, open, resetToken, setDraftFromBaseline]);
  const content = draft.content && typeof draft.content === "object" ? draft.content : {};
  const dirty = useMemo(() => Boolean(baseline) && JSON.stringify(draft) !== JSON.stringify(baseline?.snapshot), [baseline, draft]);
  const draftValidation = useMemo(
    () => readOnly
      ? { success: true as const, data: content }
      : validateCmsContent(kind, content, "draft"),
    [content, kind, readOnly],
  );
  const titleError = typeof draft.title === "string" && draft.title.trim()
    ? undefined
    : "Add a display title before saving this shared baseline.";
  useEffect(() => {
    if (!open) return;
    const effectiveDirty = readOnly ? false : dirty;
    dirtyRef.current = effectiveDirty;
    onDirtyChange?.(effectiveDirty);
  }, [dirty, onDirtyChange, open, readOnly]);
  const save = useCallback(() => {
    if (!baseline || readOnly || busy || !dirtyRef.current) return;
    // Keep the revision that was actually loaded when editing began. A
    // background matrix refetch must not retarget a dirty save to a successor.
    const capturedBaseline = capturedBaselineRef.current ?? baseline;
    onSave(capturedBaseline, buildSharedBaselineSnapshot(capturedBaseline.snapshot as Snapshot, draft));
  }, [baseline, busy, draft, onSave, readOnly]);
  useEffect(() => {
    if (!open) return;
    onRegisterSave?.(readOnly ? null : save);
    return () => onRegisterSave?.(null);
  }, [onRegisterSave, open, readOnly, save]);
  const close = (nextOpen: boolean) => {
    if (!nextOpen && !readOnly && dirty && !window.confirm("Discard unsaved shared baseline edits?")) return;
    if (!nextOpen) {
      dirtyRef.current = false;
      setDraft(baseline ? structuredClone(baseline.snapshot) as Snapshot : {});
      capturedBaselineRef.current = null;
      loadedBaselineKeyRef.current = "";
      onDirtyChange?.(false);
    }
    onOpenChange(nextOpen);
  };
  if (!baseline) return null;
  const editorFields = (
    <fieldset disabled={busy || readOnly} className="contents">
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/[0.025] p-3 text-xs">
        <div>
          <p className="font-semibold">Shared source · {baseline.locale}</p>
          <p className="mt-1 text-muted-foreground">Neutral wording is separate from market selection. A market adopts a successor only through an explicit review decision.</p>
        </div>
        <span className="rounded border bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground">Source revision {baseline.revisionNumber}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="shared-baseline-title">Title</Label><Input id="shared-baseline-title" aria-invalid={Boolean(titleError)} disabled={busy || readOnly} value={draft.title ?? ""} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />{titleError && <p role="alert" className="text-xs text-destructive">{titleError}</p>}</div>
        <div className="space-y-2"><Label>Slug (fixed source identity)</Label><Input value={draft.slug ?? ""} disabled /></div>
      </div>
       <div className="space-y-2"><Label htmlFor="shared-baseline-summary">Summary</Label><Textarea id="shared-baseline-summary" disabled={busy || readOnly} value={draft.summary ?? ""} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value || null }))} /></div>
       {readOnly ? (
         <div className="space-y-2">
           <Label>Effective shared fields</Label>
           <pre className="max-h-96 overflow-auto rounded border bg-muted/20 p-3 text-xs">{JSON.stringify(content, null, 2)}</pre>
         </div>
       ) : (
         <ContentEditor
           kind={kind}
           value={content}
           errors={draftValidation.success ? [] : draftValidation.errors}
           publicationErrors={[]}
           onChange={(next) => setDraft((current) => ({ ...current, content: next }))}
         />
       )}
      <section className="grid gap-3 border-t pt-4 sm:grid-cols-2">
         <div className="space-y-1"><Label htmlFor="shared-baseline-seo-title">SEO title</Label><Input id="shared-baseline-seo-title" disabled={busy || readOnly} value={draft.seo?.title ?? ""} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...(current.seo ?? {}), title: event.target.value || undefined } }))} /></div>
         <div className="space-y-1"><Label htmlFor="shared-baseline-seo-canonical">Canonical URL</Label><Input id="shared-baseline-seo-canonical" disabled={busy || readOnly} value={draft.seo?.canonicalUrl ?? ""} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...(current.seo ?? {}), canonicalUrl: event.target.value || undefined } }))} /></div>
         <div className="space-y-1 sm:col-span-2"><Label htmlFor="shared-baseline-seo-description">SEO description</Label><Textarea id="shared-baseline-seo-description" disabled={busy || readOnly} value={draft.seo?.description ?? ""} onChange={(event) => setDraft((current) => ({ ...current, seo: { ...(current.seo ?? {}), description: event.target.value || undefined } }))} /></div>
      </section>
      </div>
    </fieldset>
  );
  if (embedded) {
    return (
      <section className="space-y-4 rounded-lg border bg-card p-4" aria-label={`Shared content editor for ${baseline.locale}`} data-testid="shared-baseline-inline-editor">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Shared content · {baseline.locale}</p>
          <h2 className="mt-1 text-lg font-semibold">Neutral source fields</h2>
          <p className="mt-1 text-xs text-muted-foreground">Saving creates a new source baseline only. No regional draft or live market changes until a target explicitly adopts the successor.</p>
        </header>
        {editorFields}
         <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
           <Button type="button" variant="outline" onClick={() => close(false)} disabled={busy}>{readOnly ? "Close preview" : "Exit shared content"}</Button>
           {footerActions}
           {!readOnly && <Button type="button" data-testid="shared-baseline-save" disabled={!dirty || busy} onClick={save}>{busy ? "Saving shared content…" : "Save shared content"}</Button>}
        </div>
      </section>
    );
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit shared content · {baseline.locale}</DialogTitle>
          <DialogDescription>
            Edit the neutral source for this locale in the same governed field editor. Saving creates an immutable successor of baseline revision {baseline.revisionNumber}; no regional draft or live market changes.
          </DialogDescription>
        </DialogHeader>
        {editorFields /* shared fields are identical in modal and inline contexts */}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
           {!readOnly && <Button type="button" data-testid="shared-baseline-save" disabled={!dirty || busy} onClick={save}>{busy ? "Saving shared baseline…" : "Save shared baseline"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}