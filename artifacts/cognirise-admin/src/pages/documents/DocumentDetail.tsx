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
  SeoMetadataInput
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
  const [seo, setSeo] = useState<SeoMetadataInput>({ title: "", description: "", canonicalUrl: "", noIndex: false });
  const canEditSelectedMarket = isAdministrator
    || session?.user?.role === "publisher"
    || Boolean(session?.user?.marketCodes?.includes(selectedMarket));
  const [previewRevisionId, setPreviewRevisionId] = useState<string | undefined>();
  const [selectedRevisionNumber, setSelectedRevisionNumber] = useState<number | undefined>();
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
  const lastSaved = useRef({ title: "", summary: "", content: {} as Record<string, any>, seo: {} as any });

  const [hasUnsaved, setHasUnsaved] = useState(false);
  
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
    if (doc && selectedMarket && selectedLocale) {
      const responseKey = `${selectedMarket}:${selectedLocale}`;
      setTitle(doc.title);
      setSummary(doc.summary || "");
      const nextContent = (doc.content || {}) as Record<string, any>;
      setContent(nextContent);
      const formattedSeo = doc.seo ? {
        title: doc.seo.title || "",
        description: doc.seo.description || "",
        canonicalUrl: doc.seo.canonicalUrl || "",
        noIndex: doc.seo.noIndex || false
      } : { title: "", description: "", canonicalUrl: "", noIndex: false };
      
      setSeo(formattedSeo);
      lastSaved.current = { title: doc.title, summary: doc.summary || "", content: nextContent, seo: formattedSeo };
      hydratedEditionKey.current = responseKey;
      setHasUnsaved(false);
    }
  }, [doc, selectedLocale, selectedMarket]);

  // Check for unsaved changes against lastSaved ref
  useEffect(() => {
    if (hydratedEditionKey.current !== `${selectedMarket}:${selectedLocale}`) return;
    const isDirty = title !== lastSaved.current.title || 
                    summary !== lastSaved.current.summary || 
                    JSON.stringify(content) !== JSON.stringify(lastSaved.current.content) ||
                    JSON.stringify(seo) !== JSON.stringify(lastSaved.current.seo);
    setHasUnsaved(isDirty);
  }, [title, summary, content, seo, selectedLocale, selectedMarket]);

  // Before unload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsaved]);

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
    setSelectedRevisionNumber(selectedEdition?.revisionNumber ?? undefined);
  }, [selectedEdition?.revisionId, selectedEdition?.revisionNumber]);
  const mediaIds = useMemo(() => collectContentMediaIds(content), [content]);
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

  const handleSave = () => {
    if (!doc) return;
    const targetParams = { market: selectedMarket, locale: selectedLocale };
    
    if (!contentValidation.success) {
      toast({ title: "Structured content is incomplete", description: contentValidation.errors[0], variant: "destructive" });
      return;
    }

    updateDoc.mutate({
      documentId: id!,
      data: {
        title,
        summary: summary || null,
        content: contentValidation.data,
        mediaIds,
        market: selectedMarket,
        locale: selectedLocale,
        seo,
        revisionNumber: selectedRevisionNumber ?? selectedEdition?.revisionNumber ?? editionRevisions[0]?.number ?? doc.revisionNumber
      }
    }, {
      onSuccess: (updated) => {
        setSelectedRevisionNumber(updated.revisionNumber);
        if (updated.currentRevisionId) setPreviewRevisionId(updated.currentRevisionId);
        lastSaved.current = { title, summary, content: contentValidation.data as Record<string, any>, seo };
        setHasUnsaved(false);
        queryClient.setQueryData(getGetDocumentQueryKey(id!, targetParams), updated);
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("documents") || String(query.queryKey[0]).includes("published") });
        toast({ title: `${selectedMarket.toUpperCase()} edition saved successfully` });
      },
      onError: (err) => {
        toast({ title: "Save failed", description: (err as any).error, variant: "destructive" });
      }
    });
  };

  const handleSeoChange = (field: keyof SeoMetadataInput, value: any) => {
    setSeo(prev => ({ ...prev, [field]: value }));
  };

  const selectEdition = (market: string, locale: string) => {
    if (hasUnsaved && !window.confirm("Discard unsaved changes and switch editions?")) return;
    const target = editionMatrix?.items.find((item) => item.market === market && item.locale === locale);
    if (!target) return;
    hydratedEditionKey.current = "";
    setHasUnsaved(false);
    setSelectedMarket(market);
    setSelectedLocale(locale);
    setPreviewRevisionId(target.exact ? target.revisionId ?? undefined : undefined);
    setSelectedRevisionNumber(target.exact ? target.revisionNumber ?? undefined : undefined);
  };

  const createOverride = () => {
    if (!selectedEdition || selectedEdition.exact) return;
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
        setSelectedRevisionNumber(revision.number);
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        toast({ title: `${targetMarket.toUpperCase()} · ${targetLocale} override created` });
      },
      onError: (error: any) => toast({ title: "Edition creation failed", description: error.error || error.message, variant: "destructive" }),
    });
  };

  const navigationOnlyState = (message: string, loading = false) => (
    <div className="h-full p-8">
      <Button variant="ghost" onClick={() => setLocation("/content")} className="mb-8">
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
        <Button variant="ghost" onClick={() => setLocation("/content")} className="mb-8">
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
                <Button key={`${edition.market}-${edition.locale}`} type="button" variant="outline" onClick={() => selectEdition(edition.market, edition.locale)}>
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
    if (!doc || doc.kind !== "office") return;
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
           <Button variant="ghost" size="icon" onClick={() => setLocation(doc.kind === "case-study" ? "/case-studies" : doc.kind === "industry" ? "/industries" : doc.kind === "framework" ? "/frameworks" : doc.kind === "site-configuration" ? "/contact-settings" : `/${doc.kind}s`)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
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
            disabled={updateDoc.isPending || !contentValidation.success || !authoringActions.canSave}
            size="sm" 
            variant="default" 
            className="font-mono uppercase tracking-wider text-xs"
          >
            {updateDoc.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin"/> : <Save className="w-3.5 h-3.5 mr-2" />}
            {selectedEdition?.workflowState === "approved" ? "Start New Draft" : "Save Draft"}
          </Button>

          {authoringActions.canSubmit && (
             <Button variant="outline" size="sm" onClick={() => handleAction("submit")} disabled={submitDoc.isPending || !contentValidation.success} className="font-mono uppercase tracking-wider text-xs">
              <Send className="w-3.5 h-3.5 mr-2" /> Submit Review
            </Button>
          )}
           {authoringActions.canPublish && (
              <Button size="sm" onClick={() => { setPublishRevisionId(selectedEdition?.revisionId ?? null); setPublishOpen(true); }} disabled={!contentValidation.success} className="font-mono uppercase tracking-wider text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Globe className="w-3.5 h-3.5 mr-2" /> Publish...
            </Button>
          )}
          {isAdministrator && doc.kind === "office" && doc.status !== "archived" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemoveOfficeOpen(true)}
              disabled={archiveDoc.isPending || deleteDoc.isPending}
              className="font-mono uppercase tracking-wider text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove office
            </Button>
          )}
          {canPublish && doc.status === "archived" ? (
            <Button variant="outline" size="sm" onClick={() => handleAction("restore")} disabled={restoreDoc.isPending} className="font-mono uppercase tracking-wider text-xs">
              <RotateCcw className="mr-2 h-4 w-4" /> Restore as draft
            </Button>
          ) : canPublish && doc.kind !== "office" ? (
               <Button variant="ghost" size="sm" onClick={() => handleAction("archive")} className="text-muted-foreground hover:text-destructive" title="Archive Document">
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
            <section className="rounded-lg border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{doc.kind.replace("-", " ")} authoring guide</p>
              <p className="mt-1 text-sm text-muted-foreground">{CONTENT_GUIDANCE[doc.kind as CmsDocumentKind]}</p>
              <p className="mt-3 text-xs font-medium">Selected edition: <strong>{selectedMarketConfig?.displayName ?? selectedMarket} · {selectedLocale}</strong> ({selectedEdition?.exact ? "exact override" : "inherited effective content"})</p>
              {authoringActions.immutable && <p className="mt-2 text-xs text-amber-600">This edition is in review and cannot be edited until it is approved or rejected.</p>}
              {doc.status === "draft" && doc.publishedRevisionId && (
                <p className="mt-2 text-xs text-amber-600">This draft is not publicly visible. Submit it for review and publish it to return this edition to the website.</p>
              )}
            </section>
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Display Title <span className="text-destructive">(required)</span></label>
              <Input 
                value={title}
                onChange={(e) => { setTitle(e.target.value); }}
                 disabled={authoringActions.immutable || !canEditSelectedMarket}
                className="text-3xl font-bold tracking-tight h-auto py-3 px-4 bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
              />
            </div>
            
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Summary / Deck <span>(optional)</span></label>
              <Textarea 
                value={summary}
                onChange={(e) => { setSummary(e.target.value); }}
                 disabled={authoringActions.immutable || !canEditSelectedMarket}
                className="text-lg leading-relaxed min-h-[100px] resize-y bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                placeholder="Brief summary appearing in cards and lists..."
              />
            </div>

            <ContentEditor
              kind={doc.kind as CmsDocumentKind}
              value={content}
              onChange={authoringActions.immutable || !canEditSelectedMarket ? () => {} : setContent}
              errors={contentValidation.success ? [] : contentValidation.errors}
            />
            <details className="rounded-md border bg-muted/20 p-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider">Advanced structured view (read only)</summary>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(content, null, 2)}</pre>
            </details>
          </div>
        </div>

        {/* Right Column: Metadata & Sidepanes */}
        <div className="w-[320px] bg-card flex flex-col h-full border-l border-border">
          <Tabs defaultValue="metadata" className="flex flex-col h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-12">
              <TabsTrigger value="metadata" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Metadata</TabsTrigger>
              <TabsTrigger value="seo" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">SEO</TabsTrigger>
              <TabsTrigger value="revisions" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Revisions</TabsTrigger>
              <TabsTrigger value="editions" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Editions</TabsTrigger>
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
                   <button type="button" key={`${edition.market}-${edition.locale}`} onClick={() => selectEdition(edition.market, edition.locale)} className={`w-full rounded-md border p-3 text-left ${active ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`} data-testid={`button-edition-${edition.market}-${edition.locale}`}>
                    <div className="flex items-center justify-between gap-2">
                       <span className="text-sm font-medium">{market?.displayName ?? edition.market} · {edition.locale}</span>
                       <Badge variant={edition.exact ? "secondary" : "outline"}>{edition.exact ? `Rev ${edition.revisionNumber}` : "Inherited"}</Badge>
                    </div>
                     <p className="mt-1 text-xs text-muted-foreground">{edition.workflowState ?? "no workflow"} · {edition.publicationState ?? "unpublished"}</p>
                     <p className="mt-1 text-[10px] text-muted-foreground">{edition.exact ? "Own override" : `Effective from ${edition.effectiveMarket ?? "none"} / ${edition.effectiveLocale ?? "none"}${edition.fallbackReason ? ` · ${edition.fallbackReason}` : ""}`}</p>
                  </button>
                );
              })}
               {selectedEdition && !selectedEdition.exact && <Button type="button" className="w-full" onClick={createOverride} disabled={!canEditSelectedMarket || createEditionOverride.isPending} data-testid="button-create-edition-override">Create editable override from effective content</Button>}
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
                  value={seo.title} 
                  onChange={(e) => handleSeoChange("title", e.target.value)}
                  disabled={authoringActions.immutable || !canEditSelectedMarket}
                  placeholder="Defaults to display title"
                  className="font-mono text-xs"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SEO Description</Label>
                <Textarea 
                  value={seo.description} 
                  onChange={(e) => handleSeoChange("description", e.target.value)}
                  disabled={authoringActions.immutable || !canEditSelectedMarket}
                  placeholder="Meta description for search engines..."
                  className="font-mono text-xs resize-none min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Canonical URL</Label>
                <Input 
                  value={seo.canonicalUrl || ""} 
                  onChange={(e) => handleSeoChange("canonicalUrl", e.target.value)}
                  disabled={authoringActions.immutable || !canEditSelectedMarket}
                  placeholder="https://..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  checked={seo.noIndex}
                  onCheckedChange={(c) => handleSeoChange("noIndex", c)}
                  disabled={authoringActions.immutable || !canEditSelectedMarket}
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
