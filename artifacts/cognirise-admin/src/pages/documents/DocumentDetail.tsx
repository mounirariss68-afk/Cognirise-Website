import { useState, useRef, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetDocument, 
  useUpdateDocument,
  useSubmitDocument,
  usePublishDocument,
  useArchiveDocument,
  useRestoreDocument,
  useDeleteDocument,
  useListDocumentRevisions,
  useRollbackDocument,
  usePreviewDocument,
  useGetSession,
  getGetDocumentQueryKey,
  getPreviewDocumentQueryKey,
  getListDocumentRevisionsQueryKey,
  DocumentStatus,
} from "@workspace/api-client-react";
import { getListMarketEditionsQueryKey, useListMarketEditions, getListDocumentEditionsQueryKey, useListDocumentEditions, useCreateDocumentEditionOverride, getListDocumentReviewCommentsQueryKey, useListDocumentReviewComments, useAddDocumentReviewComment, useRejectDocumentRevision } from "@workspace/api-client-react";
import { type CmsDocumentKind, validateCmsContent } from "@workspace/api-zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Globe, Archive, ChevronLeft, CheckCircle2, AlertTriangle, Eye, RotateCcw, Save, GitCompare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ContentEditor } from "./ContentEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { officeLifecycleAction } from "./office-lifecycle";
import { Check, Circle } from "lucide-react";
import { collectContentMediaIds, CONTENT_GUIDANCE, documentReadiness, editionAuthoringActions, selectInitialExactEdition } from "./authoring";
import { buildDraftSave, describeSaveFailure, isDraftSaveResponse, serverValidationIssues, type DraftSeo, type DraftSaveIssue } from "./draft-save";

export default function DocumentDetail() {
  const [, params] = useRoute("/content/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading: isSessionLoading, isError: isSessionError } = useGetSession();
  const isAdministrator = session?.user?.role === "administrator";
  const canPublish = isAdministrator || session?.user?.role === "publisher";
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedLocale, setSelectedLocale] = useState("");

  const {
    data: editionMatrix,
    isLoading: isEditionMatrixLoading,
    isError: isEditionMatrixError,
  } = useListDocumentEditions(id!, {
    query: { enabled: Boolean(id && session), queryKey: getListDocumentEditionsQueryKey(id!) },
  });
  const selectedEdition = editionMatrix?.items.find((edition) => edition.market === selectedMarket && edition.locale === selectedLocale);
  const documentParams = { market: selectedMarket, locale: selectedLocale };
  const { data: doc, isLoading: isDocumentLoading, isError: isDocumentError, error: documentError } = useGetDocument(id!, documentParams, {
    query: {
      enabled: Boolean(id && selectedEdition?.exact && selectedEdition.revisionId),
      queryKey: getGetDocumentQueryKey(id!, documentParams),
    },
  });
  
  const updateDoc = useUpdateDocument();
  const submitDoc = useSubmitDocument();
  const publishDoc = usePublishDocument();
  const archiveDoc = useArchiveDocument();
  const restoreDoc = useRestoreDocument();
  const deleteDoc = useDeleteDocument();
  const rollbackDoc = useRollbackDocument();
  const createEditionOverride = useCreateDocumentEditionOverride();

  // Revisions data
  const { data: revisionsData } = useListDocumentRevisions(id!, { query: { enabled: Boolean(id && selectedEdition?.exact), queryKey: getListDocumentRevisionsQueryKey(id!) } });

  // Local state for editor fields
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState<Record<string, any>>({});
  const [seo, setSeo] = useState<DraftSeo>({});
  const [seoOriginallyPresent, setSeoOriginallyPresent] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState("metadata");
  const [saveIssues, setSaveIssues] = useState<DraftSaveIssue[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [saveRecovery, setSaveRecovery] = useState<"uncertain" | "committed" | null>(null);
  const [saveBlocked, setSaveBlocked] = useState(false);
  const [blockedRecovery, setBlockedRecovery] = useState<"conflict" | "uncertain" | "committed" | null>(null);
  const canEditSelectedMarket = isAdministrator
    || session?.user?.role === "publisher"
    || Boolean(session?.user?.marketCodes?.includes(selectedMarket));
  const [previewRevisionId, setPreviewRevisionId] = useState<string | undefined>();
  const [reviewComment, setReviewComment] = useState("");
  const previewParams = { market: selectedMarket, locale: selectedLocale, revisionId: previewRevisionId };
  const { refetch: createPreview } = usePreviewDocument(id!, previewParams, {
    query: { enabled: false, queryKey: getPreviewDocumentQueryKey(id!, previewParams) },
  });
  const reviewCommentsParams = { revisionId: previewRevisionId };
  const { data: reviewComments } = useListDocumentReviewComments(id!, reviewCommentsParams, {
    query: { enabled: Boolean(previewRevisionId), queryKey: getListDocumentReviewCommentsQueryKey(id!, reviewCommentsParams) },
  });
  const addReviewComment = useAddDocumentReviewComment();
  const rejectRevision = useRejectDocumentRevision();
  
  const hydratedEditionKey = useRef("");
  const hydratedRevision = useRef<number | undefined>(undefined);
  const currentEditorKey = useRef("");
  const lastSaved = useRef({ title: "", summary: "", content: {} as Record<string, any>, seo: {} as DraftSeo });
  const hasUnsavedRef = useRef(false);
  const preserveAfterFailedSave = useRef(false);
  const mountedRef = useRef(true);
  const saveSequence = useRef(0);

  const [hasUnsaved, setHasUnsaved] = useState(false);
  currentEditorKey.current = `${id}:${selectedMarket}:${selectedLocale}`;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      saveSequence.current += 1;
    };
  }, []);
  
  // Dialog states
  const [publishOpen, setPublishOpen] = useState(false);
  const [removeOfficeOpen, setRemoveOfficeOpen] = useState(false);
  const [publishRevisionId, setPublishRevisionId] = useState<string | null>(null);

  // Comparison states
  const [selectedRevs, setSelectedRevs] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedMarket && session && editionMatrix) {
      const initial = selectInitialExactEdition(editionMatrix.items, session.user.role, session.user.marketCodes);
      if (initial) {
        setSelectedMarket(initial.market);
        setSelectedLocale(initial.locale);
      }
    }
  }, [editionMatrix, selectedMarket, session]);

  useEffect(() => {
    if (doc && id && selectedMarket && selectedLocale && !updateDoc.isPending) {
      const responseKey = `${id}:${selectedMarket}:${selectedLocale}`;
      if (hydratedEditionKey.current === responseKey && (hasUnsavedRef.current || preserveAfterFailedSave.current)) return;
      setTitle(doc.title);
      setSummary(doc.summary || "");
      const nextContent = (doc.content || {}) as Record<string, any>;
      setContent(nextContent);
      const formattedSeo: DraftSeo = doc.seo ? { ...doc.seo } : {};
      
      setSeo(formattedSeo);
      setSeoOriginallyPresent(Boolean(doc.seo));
      lastSaved.current = { title: doc.title, summary: doc.summary || "", content: nextContent, seo: formattedSeo };
      hydratedEditionKey.current = responseKey;
      hydratedRevision.current = doc.revisionNumber;
      hasUnsavedRef.current = false;
      preserveAfterFailedSave.current = false;
      setSaveBlocked(false);
      setBlockedRecovery(null);
      setHasUnsaved(false);
      setSaveIssues([]);
    }
  }, [doc, id, selectedLocale, selectedMarket, updateDoc.isPending]);

  // Check for unsaved changes against lastSaved ref
  useEffect(() => {
    if (hydratedEditionKey.current !== `${id}:${selectedMarket}:${selectedLocale}`) return;
    const isDirty = title !== lastSaved.current.title || 
                    summary !== lastSaved.current.summary || 
                    JSON.stringify(content) !== JSON.stringify(lastSaved.current.content) ||
                    JSON.stringify(seo) !== JSON.stringify(lastSaved.current.seo);
    setHasUnsaved(isDirty);
    hasUnsavedRef.current = isDirty;
  }, [title, summary, content, seo, id, selectedLocale, selectedMarket]);

  // Before unload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current || preserveAfterFailedSave.current || saveBlocked) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsaved, saveBlocked]);

  useEffect(() => {
    const protectInternalNavigation = (event: MouseEvent) => {
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      if (updateDoc.isPending) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if ((hasUnsavedRef.current || preserveAfterFailedSave.current) && !window.confirm("Discard unsaved changes and leave this editor?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", protectInternalNavigation, true);
    return () => document.removeEventListener("click", protectInternalNavigation, true);
  }, [updateDoc.isPending]);

  const mediaIds = useMemo(() => collectContentMediaIds(content), [content]);
  const contentValidation = useMemo(
    () => doc ? validateCmsContent(doc.kind as CmsDocumentKind, content, "draft") : { success: false as const, errors: [] },
    [content, doc],
  );
  const marketParams = { page: 1, pageSize: 100 };
  const { data: marketData } = useListMarketEditions(marketParams, {
    query: { queryKey: getListMarketEditionsQueryKey(marketParams) },
  });
  const sortedRevisions = [...(revisionsData?.items ?? [])].sort((a, b) => b.number - a.number || String(b.createdAt).localeCompare(String(a.createdAt)));
  const editionRevisions = sortedRevisions.filter((revision) => revision.market === selectedMarket && revision.locale === selectedLocale);
  const selectedMarketConfig = marketData?.items.find((market) => market.code === selectedMarket);
  useEffect(() => {
    setPreviewRevisionId(selectedEdition?.revisionId ?? undefined);
  }, [selectedEdition?.revisionId, selectedEdition?.revisionNumber]);
  const readiness = useMemo(
    () => doc ? documentReadiness(doc.kind as CmsDocumentKind, title, content, mediaIds) : [],
    [content, doc, mediaIds, title],
  );
  const editionIsArchived = doc?.status === "archived";
  const authoringActions = editionAuthoringActions(
    selectedEdition,
    canEditSelectedMarket && !editionIsArchived,
    canPublish && !editionIsArchived,
    hasUnsaved,
  );
  const fieldIssue = (path: string) => saveIssues.find((issue) => issue.path === path)?.message;
  const editorHydrated = hydratedEditionKey.current === currentEditorKey.current && hydratedRevision.current !== undefined;
  const editorLocked = !editorHydrated || updateDoc.isPending || authoringActions.immutable || !canEditSelectedMarket;

  const handleSave = () => {
    if (!doc || updateDoc.isPending || !editorHydrated || saveBlocked) return;
    const editorKey = `${id}:${selectedMarket}:${selectedLocale}`;
    const targetParams = { market: selectedMarket, locale: selectedLocale };
    const prepared = buildDraftSave(doc.kind as CmsDocumentKind, {
      slug: doc.slug, title, summary, content, mediaIds, markets: doc.markets,
    }, seo, seoOriginallyPresent);
    if (!prepared.success) {
      setSaveIssues(prepared.issues);
      if (prepared.issues.some((issue) => issue.path === "seo" || issue.path.startsWith("seo."))) setActiveSideTab("seo");
      toast({ title: "Draft has validation errors", description: prepared.issues[0]?.message, variant: "destructive" });
      return;
    }
    setSaveIssues([]);
    const operation = ++saveSequence.current;
    preserveAfterFailedSave.current = true;
    const submittedRevision = hydratedRevision.current;
    const submitted = { title, summary, content: prepared.snapshot.content as Record<string, any>, seo: prepared.seo };
    updateDoc.mutate({
      documentId: id!,
      data: {
        title: prepared.snapshot.title,
        summary: prepared.snapshot.summary ?? null,
        content: prepared.snapshot.content,
        mediaIds: prepared.snapshot.mediaIds,
        market: selectedMarket,
        locale: selectedLocale,
        seo: prepared.seo as any,
        revisionNumber: submittedRevision ?? doc.revisionNumber
      }
    }, {
      onSuccess: (updated) => {
        if (!mountedRef.current || operation !== saveSequence.current || editorKey !== currentEditorKey.current || hydratedRevision.current !== submittedRevision) return;
        if (!isDraftSaveResponse(updated, {
          documentId: id!,
          kind: doc.kind as CmsDocumentKind,
          slug: doc.slug,
          market: targetParams.market,
          locale: targetParams.locale,
          previousRevision: submittedRevision!,
          snapshot: prepared.snapshot,
        })) {
          const failure = describeSaveFailure({ name: "ResponseParseError", status: 200 });
          setSaveRecovery("uncertain");
          setSaveBlocked(true);
          setBlockedRecovery("uncertain");
          toast({ title: failure.title, description: failure.description, variant: "destructive" });
          queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
          queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
          return;
        }
        hydratedRevision.current = updated.revisionNumber;
        preserveAfterFailedSave.current = false;
        setSaveBlocked(false);
        setBlockedRecovery(null);
        if (updated.currentRevisionId) setPreviewRevisionId(updated.currentRevisionId);
        lastSaved.current = { ...submitted, seo: submitted.seo ?? {} };
        setSeoOriginallyPresent(Boolean(submitted.seo));
        hasUnsavedRef.current = false;
        setHasUnsaved(false);
        queryClient.setQueryData(getGetDocumentQueryKey(id!, targetParams), updated);
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("documents") || String(query.queryKey[0]).includes("published") });
        toast({ title: `${selectedMarket.toUpperCase()} edition saved successfully` });
      },
      onError: (err) => {
        if (!mountedRef.current || operation !== saveSequence.current || editorKey !== currentEditorKey.current) return;
        const failure = describeSaveFailure(err);
        const serverIssues = serverValidationIssues(err);
        if (serverIssues.length) {
          setSaveIssues(serverIssues);
          if (serverIssues.some((issue) => issue.path === "seo" || issue.path.startsWith("seo."))) setActiveSideTab("seo");
        }
        if (failure.action === "review-conflict") { setConflictOpen(true); setBlockedRecovery("conflict"); }
        if (failure.action === "verify") { setSaveRecovery("uncertain"); setBlockedRecovery("uncertain"); }
        if (failure.action === "reload-committed") { setSaveRecovery("committed"); setBlockedRecovery("committed"); }
        if (["review-conflict", "verify", "reload-committed"].includes(failure.action)) setSaveBlocked(true);
        toast({ title: failure.title, description: failure.description, variant: "destructive" });
      }
    });
  };

  const handleSeoChange = (field: keyof DraftSeo, value: any) => {
    hasUnsavedRef.current = true;
    setSeo(prev => ({ ...prev, [field]: value }));
  };

  const handleContentChange = (next: Record<string, any>) => {
    hasUnsavedRef.current = true;
    setContent(next);
  };

  const selectEdition = (market: string, locale: string) => {
    if (updateDoc.isPending) return;
    if (market === selectedMarket && locale === selectedLocale) return;
    if ((hasUnsavedRef.current || saveBlocked || preserveAfterFailedSave.current) && !window.confirm("Discard local changes and switch editions?")) return;
    const target = editionMatrix?.items.find((item) => item.market === market && item.locale === locale);
    if (!target) return;
    hydratedEditionKey.current = "";
    hydratedRevision.current = undefined;
    preserveAfterFailedSave.current = false;
    setSaveBlocked(false);
    setBlockedRecovery(null);
    saveSequence.current += 1;
    hasUnsavedRef.current = false;
    setHasUnsaved(false);
    setSelectedMarket(market);
    setSelectedLocale(locale);
    setPreviewRevisionId(target.exact ? target.revisionId ?? undefined : undefined);
  };

  const createOverride = () => {
    if (!selectedEdition || selectedEdition.exact || updateDoc.isPending) return;
    const targetMarket = selectedEdition.market;
    const targetLocale = selectedEdition.locale;
    createEditionOverride.mutate({ documentId: id!, data: {
      market: targetMarket,
      locale: targetLocale,
      sourceRevisionId: selectedEdition.effectiveRevisionId ?? undefined,
    } }, {
      onSuccess: (revision) => {
        hydratedEditionKey.current = "";
        setSelectedMarket(targetMarket);
        setSelectedLocale(targetLocale);
        setPreviewRevisionId(revision.id);
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        toast({ title: `${targetMarket.toUpperCase()} · ${targetLocale} override created` });
      },
      onError: (error: any) => toast({ title: "Edition creation failed", description: error.error || error.message, variant: "destructive" }),
    });
  };

  const leaveEditor = (destination: string) => {
    if (updateDoc.isPending) return;
    if ((hasUnsavedRef.current || saveBlocked || preserveAfterFailedSave.current) && !window.confirm("Discard local changes and leave this editor?")) return;
    setLocation(destination);
  };

  const discardAndReloadLatest = () => {
    setConflictOpen(false);
    setSaveRecovery(null);
    saveSequence.current += 1;
    hydratedEditionKey.current = "";
    hydratedRevision.current = undefined;
    hasUnsavedRef.current = false;
    preserveAfterFailedSave.current = false;
    setSaveBlocked(false);
    setBlockedRecovery(null);
    setHasUnsaved(false);
    queryClient.resetQueries({ queryKey: getGetDocumentQueryKey(id!, documentParams), exact: true });
  };

  const navigationOnlyState = (message: string, loading = false) => (
    <div className="h-full p-8">
      <Button variant="ghost" onClick={() => leaveEditor("/content")} disabled={updateDoc.isPending} className="mb-8">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to content
      </Button>
      <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center">
        {loading && <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">{message}</p>
        {!!editionMatrix?.items.length && (
          <div className="mt-6 space-y-2 border-t pt-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider">Accessible editions</p>
            {editionMatrix.items.map((edition) => (
              <div key={`${edition.market}-${edition.locale}`} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                <span>{edition.market.toUpperCase()} · {edition.locale}</span>
                <Badge variant={edition.exact ? "secondary" : "outline"}>
                  {edition.exact ? `Rev ${edition.revisionNumber}` : "No exact edition"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!id) {
    return navigationOnlyState("This document URL is invalid.");
  }
  if (isSessionLoading || (session && isEditionMatrixLoading)) {
    return navigationOnlyState("Loading your accessible document editions…", true);
  }
  if (isSessionError || isEditionMatrixError) {
    return navigationOnlyState("We could not load the editions you can access. Please return to content and try again.");
  }
  if (selectedEdition && !selectedEdition.exact) {
    return (
      <div className="h-full p-8">
        <Button variant="ghost" onClick={() => leaveEditor("/content")} disabled={updateDoc.isPending} className="mb-8">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to content
        </Button>
        <div className="mx-auto max-w-2xl space-y-5 rounded-lg border bg-card p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Inherited edition</p>
            <h1 className="mt-2 text-xl font-semibold">{selectedMarket.toUpperCase()} · {selectedLocale}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This market and locale has no exact editorial revision. No fallback draft content is loaded into the editor.
            </p>
          </div>
          <div className="rounded border bg-muted/20 p-4 text-sm">
            <p className="font-medium">Public effective source</p>
            <p className="mt-1 text-muted-foreground">
              {selectedEdition.effectiveMarket && selectedEdition.effectiveLocale
                ? `${selectedEdition.effectiveMarket.toUpperCase()} · ${selectedEdition.effectiveLocale} · Revision ${selectedEdition.effectiveRevisionNumber ?? "unknown"}`
                : "No published effective source is available."}
            </p>
            {selectedEdition.fallbackReason && <p className="mt-1 text-xs text-muted-foreground">Fallback: {selectedEdition.fallbackReason}</p>}
          </div>
          <Button
            type="button"
            onClick={createOverride}
            disabled={!canEditSelectedMarket || createEditionOverride.isPending || !selectedEdition.effectiveRevisionId}
            data-testid="button-create-edition-override"
          >
            {createEditionOverride.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create editable override
          </Button>
          <div className="border-t pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider">Accessible editions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {editionMatrix?.items.map((edition) => (
                  <Button key={`${edition.market}-${edition.locale}`} type="button" variant="outline" disabled={updateDoc.isPending} onClick={() => selectEdition(edition.market, edition.locale)}>
                  {edition.market.toUpperCase()} · {edition.locale} · {edition.exact ? `Rev ${edition.revisionNumber}` : "Inherited"}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (selectedMarket && isDocumentLoading) {
    return navigationOnlyState(`Loading ${selectedMarket.toUpperCase()} · ${selectedLocale}…`, true);
  }
  if (isDocumentError) {
    return navigationOnlyState(`This edition could not be loaded. ${(documentError as any)?.error ?? (documentError as Error)?.message ?? ""}`);
  }
  if (!doc) {
    return navigationOnlyState("No accessible document edition was found.");
  }

  const getStatusColor = (s: DocumentStatus) => {
    switch (s) {
      case "published": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "draft": return "bg-muted text-muted-foreground border-border";
      case "in-review": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "scheduled": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleAction = (action: "submit" | "publish" | "archive" | "restore") => {
    if (updateDoc.isPending) return;
    const targetParams = { market: selectedMarket, locale: selectedLocale };
    const opts = {
      onSuccess: (updated: any) => {
        queryClient.setQueryData(getGetDocumentQueryKey(id!, targetParams), updated);
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("documents") || String(query.queryKey[0]).includes("published") || String(query.queryKey[0]).includes("preview") });
        toast({
          title: action === "publish" ? "Selected market and locale revision published" : action === "submit" ? "Latest edition revisions submitted for review" : action === "restore" ? "Document restored as a draft" : "Document archived",
          description: action === "restore"
            ? "This edition is not public. Its restored draft must pass review before it can be published again."
            : undefined,
        });
        if (action === "publish") setPublishOpen(false);
      },
      onError: (err: any) => toast({ title: "Action failed", description: err.error, variant: "destructive" })
    };

    if (action === "submit" && selectedEdition?.revisionId) submitDoc.mutate({ documentId: id!, data: { revisionId: selectedEdition.revisionId } }, opts);
    if (action === "archive") archiveDoc.mutate({ documentId: id!, data: { market: selectedMarket, locale: selectedLocale } }, opts);
    if (action === "restore") restoreDoc.mutate({ documentId: id!, data: { market: selectedMarket, locale: selectedLocale } }, opts);
    if (action === "publish" && publishRevisionId) {
      publishDoc.mutate({ documentId: id!, data: { revisionId: publishRevisionId } }, opts);
    }
  };

  const handleRollback = (revisionId: string) => {
    if (updateDoc.isPending) return;
    rollbackDoc.mutate({ documentId: id!, data: { revisionId } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetDocumentQueryKey(id!, documentParams), updated);
        toast({ title: "Rollback successful" });
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
      },
      onError: (err: any) => toast({ title: "Rollback failed", description: err.error, variant: "destructive" })
    });
  };

  const handleRemoveOffice = () => {
    if (!doc || doc.kind !== "office" || updateDoc.isPending) return;
    const requiresArchive = officeLifecycleAction(doc) === "archive";
    const options = {
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (query) => String(query.queryKey[0]).includes("documents")
            || String(query.queryKey[0]).includes("published"),
        });
        toast({
          title: requiresArchive ? "Office removed from the website" : "Office deleted",
          description: requiresArchive
            ? "The published record was archived so its audit history can be recovered."
            : "The unpublished office record was permanently deleted.",
        });
        setRemoveOfficeOpen(false);
        setLocation("/offices");
      },
      onError: (err: any) => {
        toast({
          title: "Office removal failed",
          description: err.error || err.message,
          variant: "destructive",
        });
      },
    };
    if (requiresArchive) {
      archiveDoc.mutate({ documentId: id!, data: { market: selectedMarket, locale: selectedLocale } }, options);
    } else {
      deleteDoc.mutate({ documentId: id! }, options);
    }
  };

  const handleRevCheckbox = (checked: boolean, revId: string) => {
    if (checked) {
      if (selectedRevs.length >= 2) {
        setSelectedRevs([selectedRevs[1], revId]);
      } else {
        setSelectedRevs([...selectedRevs, revId]);
      }
    } else {
      setSelectedRevs(selectedRevs.filter(r => r !== revId));
    }
  };

  const openPreview = async () => {
    const result = await createPreview();
    if (!result.data?.previewUrl) {
      toast({ title: "Preview unavailable", description: "Save a valid edition revision first.", variant: "destructive" });
      return;
    }
    window.open(result.data.previewUrl, "_blank", "noopener,noreferrer");
  };
  
  // Data for comparison
  const compareRev1 = revisionsData?.items.find(r => r.id === selectedRevs[0]);
  const compareRev2 = revisionsData?.items.find(r => r.id === selectedRevs[1]);
  const [baseRev, targetRev] = [compareRev1, compareRev2].sort((a, b) => (a?.number || 0) - (b?.number || 0));

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Top Bar */}
      <header className="flex-none h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" disabled={updateDoc.isPending} onClick={() => leaveEditor(doc.kind === "case-study" ? "/case-studies" : doc.kind === "industry" ? "/industries" : doc.kind === "framework" ? "/frameworks" : doc.kind === "site-configuration" ? "/contact-settings" : `/${doc.kind}s`)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border"></div>
          <div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider rounded-sm ${getStatusColor(doc.status)}`}>
                {doc.status.replace('-', ' ')}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">Rev {doc.revisionNumber}</span>
              
              {hasUnsaved && (
                <span className="font-mono text-[10px] text-amber-500 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPreview} disabled={hasUnsaved} className="font-mono uppercase tracking-wider text-xs mr-2">
            <Eye className="w-3.5 h-3.5 mr-2" /> {doc.kind === "framework" ? "Preview buyer view" : doc.kind === "office" ? "Preview contact card" : "Preview"}
          </Button>

          <Button 
            onClick={handleSave} 
            disabled={!editorHydrated || updateDoc.isPending || saveBlocked || !authoringActions.canSave}
            size="sm" 
            variant="default" 
            className="font-mono uppercase tracking-wider text-xs"
          >
            {updateDoc.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin"/> : <Save className="w-3.5 h-3.5 mr-2" />}
            {selectedEdition?.workflowState === "approved" ? "Start New Draft" : "Save Draft"}
          </Button>

          {authoringActions.canSubmit && (
             <Button variant="outline" size="sm" onClick={() => handleAction("submit")} disabled={updateDoc.isPending || submitDoc.isPending || !contentValidation.success} className="font-mono uppercase tracking-wider text-xs">
              <Send className="w-3.5 h-3.5 mr-2" /> Submit Review
            </Button>
          )}
           {authoringActions.canPublish && (
              <Button size="sm" onClick={() => { setPublishRevisionId(selectedEdition?.revisionId ?? null); setPublishOpen(true); }} disabled={updateDoc.isPending || !contentValidation.success} className="font-mono uppercase tracking-wider text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Globe className="w-3.5 h-3.5 mr-2" /> Publish...
            </Button>
          )}
          {isAdministrator && doc.kind === "office" && doc.status !== "archived" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemoveOfficeOpen(true)}
               disabled={updateDoc.isPending || archiveDoc.isPending || deleteDoc.isPending}
              className="font-mono uppercase tracking-wider text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove office
            </Button>
          )}
          {canPublish && doc.status === "archived" ? (
            <Button variant="outline" size="sm" onClick={() => handleAction("restore")} disabled={updateDoc.isPending || restoreDoc.isPending} className="font-mono uppercase tracking-wider text-xs">
              <RotateCcw className="mr-2 h-4 w-4" /> Restore as draft
            </Button>
          ) : canPublish && doc.kind !== "office" ? (
               <Button variant="ghost" size="sm" disabled={updateDoc.isPending} onClick={() => handleAction("archive")} className="text-muted-foreground hover:text-destructive" title="Archive Document">
                 <Archive className="w-4 h-4" />
               </Button>
          ) : null}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column: Editor */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar border-r border-border">
          <div className="max-w-3xl mx-auto space-y-8">
            {!!saveIssues.length && (
              <div role="alert" aria-labelledby="draft-error-title" className="rounded-md border border-destructive/40 bg-destructive/5 p-4" data-testid="draft-error-summary">
                <p id="draft-error-title" className="text-sm font-semibold text-destructive">Fix these issues before saving</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {saveIssues.map((issue, index) => (
                    <li key={`${issue.path}-${index}`}>
                      {issue.path.startsWith("seo") ? (
                        <button type="button" className="underline" onClick={() => setActiveSideTab("seo")}>SEO: {issue.message}</button>
                      ) : <><strong>{issue.path}</strong>: {issue.message}</>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <section className="rounded-lg border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{doc.kind.replace("-", " ")} authoring guide</p>
              <p className="mt-1 text-sm text-muted-foreground">{CONTENT_GUIDANCE[doc.kind as CmsDocumentKind]}</p>
              <p className="mt-3 text-xs font-medium">Selected edition: <strong>{selectedMarketConfig?.displayName ?? selectedMarket} · {selectedLocale}</strong> ({selectedEdition?.exact ? "exact override" : "inherited effective content"})</p>
              {authoringActions.immutable && <p className="mt-2 text-xs text-amber-600">This edition is in review and cannot be edited until it is approved or rejected.</p>}
              {doc.status === "draft" && doc.publishedRevisionId && (
                <p className="mt-2 text-xs text-amber-600">This draft is not publicly visible. Submit it for review and publish it to return this edition to the website.</p>
              )}
              {saveBlocked && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded border border-destructive/30 p-2">
                  <p className="text-xs text-destructive">Saving is paused until you deliberately reload the latest revision. Your local inputs remain available to review or copy.</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    if (blockedRecovery === "conflict") setConflictOpen(true);
                    else setSaveRecovery(blockedRecovery === "committed" ? "committed" : "uncertain");
                  }}>Review recovery options</Button>
                </div>
              )}
            </section>
            <div>
              <label htmlFor="document-title" className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Display Title <span className="text-destructive">(required)</span></label>
              <Input 
                id="document-title"
                value={title}
                onChange={(e) => { hasUnsavedRef.current = true; setTitle(e.target.value); }}
                disabled={editorLocked}
                maxLength={240}
                aria-invalid={Boolean(fieldIssue("title"))}
                aria-describedby={fieldIssue("title") ? "document-title-error" : "document-title-help"}
                className="text-3xl font-bold tracking-tight h-auto py-3 px-4 bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
              />
              <p id="document-title-help" className="mt-1 text-xs text-muted-foreground">{title.length}/240 characters</p>
              {fieldIssue("title") && <p id="document-title-error" className="mt-1 text-xs text-destructive">{fieldIssue("title")}</p>}
            </div>
            
            <div>
              <label htmlFor="document-summary" className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Summary / Deck <span>(optional)</span></label>
              <Textarea 
                id="document-summary"
                value={summary}
                onChange={(e) => { hasUnsavedRef.current = true; setSummary(e.target.value); }}
                disabled={editorLocked}
                maxLength={2000}
                aria-invalid={Boolean(fieldIssue("summary"))}
                aria-describedby={fieldIssue("summary") ? "document-summary-error" : "document-summary-help"}
                className="text-lg leading-relaxed min-h-[100px] resize-y bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                placeholder="Brief summary appearing in cards and lists..."
              />
              <p id="document-summary-help" className="mt-1 text-xs text-muted-foreground">{summary.length}/2000 characters</p>
              {fieldIssue("summary") && <p id="document-summary-error" className="mt-1 text-xs text-destructive">{fieldIssue("summary")}</p>}
            </div>

            <fieldset disabled={editorLocked} className="contents">
              <ContentEditor
                kind={doc.kind as CmsDocumentKind}
                value={content}
                onChange={editorLocked ? () => {} : handleContentChange}
                errors={contentValidation.success ? [] : contentValidation.errors}
              />
            </fieldset>
            <details className="rounded-md border bg-muted/20 p-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider">Advanced structured view (read only)</summary>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(content, null, 2)}</pre>
            </details>
          </div>
        </div>

        {/* Right Column: Metadata & Sidepanes */}
        <div className="w-[320px] bg-card flex flex-col h-full border-l border-border">
          <Tabs value={activeSideTab} onValueChange={setActiveSideTab} className="flex flex-col h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-12">
              <TabsTrigger value="metadata" disabled={updateDoc.isPending} className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Metadata</TabsTrigger>
              <TabsTrigger value="seo" disabled={updateDoc.isPending} className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">SEO{saveIssues.some((issue) => issue.path.startsWith("seo")) ? " !" : ""}</TabsTrigger>
              <TabsTrigger value="revisions" disabled={updateDoc.isPending} className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Revisions</TabsTrigger>
              <TabsTrigger value="editions" disabled={updateDoc.isPending} className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Editions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="metadata" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">URL Slug</label>
                <div className="font-mono text-sm text-foreground bg-muted/30 p-2 rounded border border-border/50 break-all">{doc.slug}</div>
              </div>
              
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Market Targeting</label>
                <div className="flex flex-wrap gap-2">
                  {doc.markets.map(m => (
                    <Badge key={m} variant="secondary" className="font-mono text-[10px] uppercase rounded-sm bg-accent/10 text-accent border border-accent/20">
                      {m}
                    </Badge>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-muted-foreground mt-2 leading-relaxed opacity-80">
                  Visible in explicit markets. Unselected markets will inherit the <strong>uae</strong> global base fallback automatically unless overridden.
                </p>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Timeline</label>
                <div className="space-y-2 text-[11px] font-mono border border-border/50 rounded p-3 bg-muted/10">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(doc.createdAt), "dd MMM yy HH:mm")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{format(new Date(doc.updatedAt), "dd MMM yy HH:mm")}</span>
                  </div>
                  {doc.publishedAt && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Published</span>
                      <span>{format(new Date(doc.publishedAt), "dd MMM yy HH:mm")}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Review comments</label>
                  <p className="mt-1 text-xs text-muted-foreground">Comments attach to the selected {selectedMarket.toUpperCase()} revision.</p>
                </div>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {(reviewComments ?? []).map((comment) => <p key={comment.id} className="rounded border bg-muted/20 p-2 text-xs">{comment.body}</p>)}
                </div>
                <Textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Leave reviewer guidance…" rows={3} data-testid="textarea-review-comment" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={!reviewComment.trim() || addReviewComment.isPending || !selectedEdition?.revisionId} onClick={() => addReviewComment.mutate({ documentId: id!, data: { revisionId: selectedEdition!.revisionId!, body: reviewComment.trim() } }, { onSuccess: () => { setReviewComment(""); queryClient.invalidateQueries({ queryKey: getListDocumentReviewCommentsQueryKey(id!, reviewCommentsParams) }); } })} data-testid="button-add-review-comment">Add comment</Button>
                  {selectedEdition?.workflowState === "in-review" && canPublish && <Button type="button" size="sm" variant="destructive" disabled={!reviewComment.trim() || rejectRevision.isPending || !selectedEdition.revisionId} onClick={() => {
                    const targetParams = { market: selectedMarket, locale: selectedLocale };
                    rejectRevision.mutate({ documentId: id!, data: { revisionId: selectedEdition.revisionId!, body: reviewComment.trim() } }, { onSuccess: () => {
                      setReviewComment("");
                      queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(id!, targetParams) });
                      queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
                      queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
                    } });
                  }} data-testid="button-reject-revision">Reject revision</Button>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="editions" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
              <div>
                <h3 className="text-sm font-semibold">Market + locale matrix</h3>
                <p className="mt-1 text-xs text-muted-foreground">Select the exact edition to edit. Publishing a selected revision changes only that market and locale.</p>
              </div>
               {(editionMatrix?.items ?? []).map((edition) => {
                 const market = marketData?.items.find((item) => item.code === edition.market);
                 const active = selectedMarket === edition.market && selectedLocale === edition.locale;
                return (
                   <button type="button" key={`${edition.market}-${edition.locale}`} disabled={updateDoc.isPending} onClick={() => selectEdition(edition.market, edition.locale)} className={`w-full rounded-md border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`} data-testid={`button-edition-${edition.market}-${edition.locale}`}>
                    <div className="flex items-center justify-between gap-2">
                       <span className="text-sm font-medium">{market?.displayName ?? edition.market} · {edition.locale}</span>
                       <Badge variant={edition.exact ? "secondary" : "outline"}>{edition.exact ? `Rev ${edition.revisionNumber}` : "Inherited"}</Badge>
                    </div>
                     <p className="mt-1 text-xs text-muted-foreground">{edition.workflowState ?? "no workflow"} · {edition.publicationState ?? "unpublished"}</p>
                     <p className="mt-1 text-[10px] text-muted-foreground">{edition.exact ? "Own override" : `Effective from ${edition.effectiveMarket ?? "none"} / ${edition.effectiveLocale ?? "none"}${edition.fallbackReason ? ` · ${edition.fallbackReason}` : ""}`}</p>
                  </button>
                );
              })}
               {selectedEdition && !selectedEdition.exact && <Button type="button" className="w-full" onClick={createOverride} disabled={updateDoc.isPending || !canEditSelectedMarket || createEditionOverride.isPending} data-testid="button-create-edition-override">Create editable override from effective content</Button>}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold">Readiness checklist</h3>
                <div className="mt-3 space-y-3">
                  {readiness.map((item) => (
                    <div key={item.label} className="flex gap-2" data-testid={`status-readiness-${item.label.toLowerCase().replaceAll(" ", "-")}`}>
                      {item.ready ? <Check className="mt-0.5 h-4 w-4 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 text-amber-500" />}
                      <div><p className="text-xs font-medium">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.detail}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="seo" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SEO Title</Label>
                <Input 
                  id="seo-title"
                  value={typeof seo.title === "string" ? seo.title : ""}
                  onChange={(e) => handleSeoChange("title", e.target.value)}
                  disabled={editorLocked}
                  maxLength={70}
                  aria-invalid={Boolean(fieldIssue("seo.title") || fieldIssue("seo"))}
                  aria-describedby={fieldIssue("seo.title") ? "seo-title-error" : "seo-title-help"}
                  placeholder="Defaults to display title"
                  className="font-mono text-xs"
                />
                <p id="seo-title-help" className="text-[10px] text-muted-foreground">{typeof seo.title === "string" ? seo.title.length : 0}/70 characters. Leave all SEO fields blank to omit SEO.</p>
                {fieldIssue("seo.title") && <p id="seo-title-error" className="text-xs text-destructive">{fieldIssue("seo.title")}</p>}
              </div>
              
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SEO Description</Label>
                <Textarea 
                  id="seo-description"
                  value={typeof seo.description === "string" ? seo.description : ""}
                  onChange={(e) => handleSeoChange("description", e.target.value)}
                  disabled={editorLocked}
                  maxLength={180}
                  aria-invalid={Boolean(fieldIssue("seo.description"))}
                  aria-describedby={fieldIssue("seo.description") ? "seo-description-error" : "seo-description-help"}
                  placeholder="Meta description for search engines..."
                  className="font-mono text-xs resize-none min-h-[80px]"
                />
                <p id="seo-description-help" className="text-[10px] text-muted-foreground">{typeof seo.description === "string" ? seo.description.length : 0}/180 characters</p>
                {fieldIssue("seo.description") && <p id="seo-description-error" className="text-xs text-destructive">{fieldIssue("seo.description")}</p>}
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Canonical URL</Label>
                <Input 
                  id="seo-canonical-url"
                  value={typeof seo.canonicalUrl === "string" ? seo.canonicalUrl : ""}
                  onChange={(e) => handleSeoChange("canonicalUrl", e.target.value)}
                  disabled={editorLocked}
                  aria-invalid={Boolean(fieldIssue("seo.canonicalUrl"))}
                  aria-describedby={fieldIssue("seo.canonicalUrl") ? "seo-canonical-error" : undefined}
                  placeholder="https://..."
                  className="font-mono text-xs"
                />
                {fieldIssue("seo.canonicalUrl") && <p id="seo-canonical-error" className="text-xs text-destructive">{fieldIssue("seo.canonicalUrl")}</p>}
                {fieldIssue("seo") && <p className="text-xs text-destructive">{fieldIssue("seo")}</p>}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  checked={Boolean(seo.noIndex)}
                  onCheckedChange={(c) => handleSeoChange("noIndex", c)}
                  disabled={editorLocked}
                  id="noIndex"
                />
                <Label htmlFor="noIndex" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">No Index (Hide from Search)</Label>
              </div>
            </TabsContent>

            <TabsContent value="revisions" className="flex-1 overflow-y-auto p-0 mt-0 flex flex-col">
               <div className="p-3 bg-muted/20 border-b border-border sticky top-0 z-10 flex justify-between items-center">
                 <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Select 2 to Compare</span>
                 <Button 
                   size="sm" 
                   variant="outline" 
                   disabled={selectedRevs.length !== 2}
                   onClick={() => setCompareModalOpen(true)}
                   className="h-7 text-[10px] uppercase tracking-wider font-mono px-2"
                 >
                   <GitCompare className="w-3 h-3 mr-1" /> Compare
                 </Button>
               </div>
                {editionRevisions.map(rev => (
                 <div key={rev.id} className="p-4 border-b border-border/50 hover:bg-muted/30 transition-colors group flex gap-3">
                    <Checkbox 
                      checked={selectedRevs.includes(rev.id)}
                      onCheckedChange={(c) => handleRevCheckbox(!!c, rev.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono text-xs font-semibold">Revision {rev.number}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(rev.createdAt), "MMM d HH:mm")}</span>
                      </div>
                      {rev.note && <p className="text-[10px] text-muted-foreground font-mono mb-2">{rev.note}</p>}
                      
                      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {isAdministrator && doc.revisionNumber !== rev.number && (
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 font-mono uppercase tracking-wider" onClick={() => handleRollback(rev.id)}>
                             <RotateCcw className="w-3 h-3 mr-1" /> Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                 </div>
               ))}
                {!editionRevisions.length && (
                 <div className="p-4 text-center text-xs font-mono text-muted-foreground">No revisions saved yet.</div>
               )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review the revision conflict</AlertDialogTitle>
            <AlertDialogDescription>
              Another editor saved a newer revision. Your local inputs are still here. Copy or review them before choosing to discard them and reload.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing local changes</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndReloadLatest}>Discard and reload latest</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={saveRecovery !== null} onOpenChange={(open) => { if (!open) setSaveRecovery(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {saveRecovery === "committed" ? "The server reports a committed revision" : "Verify the latest revision before saving again"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {saveRecovery === "committed"
                ? "A revision was committed, but its confirmation did not complete normally. Your local inputs remain visible as evidence. Reload the latest server revision before making another save."
                : "The request outcome could not be confirmed. Your local inputs remain unchanged. Review or copy them, then deliberately reload the latest server revision; do not retry against the old revision token."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing local changes</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndReloadLatest}>Discard and reload latest</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Content</DialogTitle>
            <DialogDescription className="font-mono text-xs mt-2">
               Select the exact revision to publish. Its market and locale are shown; every other edition remains unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-2">
               <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Target Revision</Label>
               <select 
                  className="w-full font-mono text-sm p-2 bg-background border border-border rounded-md focus-visible:ring-1 focus-visible:ring-primary outline-none"
                  value={publishRevisionId || ""}
                  onChange={(e) => setPublishRevisionId(e.target.value)}
               >
                 <option value="" disabled>Select a revision...</option>
                   {editionRevisions.map(rev => (
                   <option key={rev.id} value={rev.id}>
                      {rev.market.toUpperCase()} · {rev.locale} · Revision {rev.number} ({format(new Date(rev.createdAt), "MMM d, HH:mm")})
                   </option>
                 ))}
               </select>
             </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleAction("publish")} 
              disabled={publishDoc.isPending || !publishRevisionId} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono uppercase tracking-wider text-xs"
            >
              {publishDoc.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
              Confirm Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeOfficeOpen} onOpenChange={setRemoveOfficeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {content.city || doc.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {!doc.canPermanentlyDelete
                ? "This office will disappear from the public website. Its published history will be archived so an administrator can restore it later."
                : "This unpublished office and its revision history will be permanently deleted. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveOffice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiveDoc.isPending || deleteDoc.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove office
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border flex-none">
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              Compare Revisions
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Comparing Revision {baseRev?.number} (Base) with Revision {targetRev?.number} (Target)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex bg-muted/10">
            {/* Left: Base Rev */}
            <div className="flex-1 overflow-y-auto border-r border-border p-6 space-y-6 custom-scrollbar">
               <div>
                  <Badge variant="outline" className="mb-4 font-mono text-[10px] uppercase tracking-wider bg-background">
                    Revision {baseRev?.number}
                  </Badge>
                  <div className="space-y-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</div>
                      <div className="font-medium">{baseRev?.snapshot.title}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Summary</div>
                      <div className="text-sm">{baseRev?.snapshot.summary || <span className="text-muted-foreground italic">None</span>}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">JSON Content</div>
                      <pre className="text-xs font-mono bg-muted/30 p-4 rounded-md border border-border overflow-x-auto">
                        {JSON.stringify(baseRev?.snapshot.content, null, 2)}
                      </pre>
                    </div>
                  </div>
               </div>
            </div>

            {/* Right: Target Rev */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
               <div>
                  <Badge variant="outline" className="mb-4 font-mono text-[10px] uppercase tracking-wider bg-background border-primary text-primary">
                    Revision {targetRev?.number}
                  </Badge>
                  <div className="space-y-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</div>
                      <div className={`font-medium ${baseRev?.snapshot.title !== targetRev?.snapshot.title ? 'bg-emerald-500/10 text-emerald-600 px-1 -mx-1 rounded' : ''}`}>
                        {targetRev?.snapshot.title}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Summary</div>
                      <div className={`text-sm ${baseRev?.snapshot.summary !== targetRev?.snapshot.summary ? 'bg-emerald-500/10 text-emerald-600 px-1 -mx-1 rounded' : ''}`}>
                        {targetRev?.snapshot.summary || <span className="text-muted-foreground italic">None</span>}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">JSON Content</div>
                      <pre className="text-xs font-mono bg-muted/30 p-4 rounded-md border border-border overflow-x-auto">
                        {JSON.stringify(targetRev?.snapshot.content, null, 2)}
                      </pre>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
