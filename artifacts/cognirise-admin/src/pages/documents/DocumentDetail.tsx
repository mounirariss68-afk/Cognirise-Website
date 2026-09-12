import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from "react";
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
import { getListMarketEditionsQueryKey, useListMarketEditions, getListDocumentEditionsQueryKey, useListDocumentEditions, useCreateDocumentEditionOverride as useCreateDocumentCustomization, getDocumentAvailability, getGetDocumentAvailabilityQueryKey, useGetDocumentAvailability, useReviewDocumentAvailability, useSelectDocumentAvailabilitySource, getListDocumentReviewCommentsQueryKey, useListDocumentReviewComments, useAddDocumentReviewComment, useRejectDocumentRevision } from "@workspace/api-client-react";
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
import { collectContentMediaIds, CONTENT_GUIDANCE, documentReadiness, editionAuthoringActions } from "./authoring";
import { buildDraftSave, describeSaveFailure, isDraftSaveResponse, serverValidationIssues, type DraftSeo, type DraftSaveIssue } from "./draft-save";
import { describeActionError } from "./action-error";
import { MarketAvailabilityChecklist, type AvailabilityDestination, type AvailabilitySelectionDraft } from "./MarketAvailabilityChecklist";
import { IndustryVisualWorkspace } from "./IndustryVisualWorkspace";

// hint: Logic changed on both sides. Requires understanding intent of each change.
import { applyLocalSuccessorToEditionMatrix, previewPinForEditionRevision } from "./preview-revision-lifecycle";
// hint: Logic changed on both sides. Requires understanding intent of each change.
export default function DocumentDetail() {
  const [, params] = useRoute("/content/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<ReturnType<typeof describeActionError> | null>(null);

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
  const matrixSelectedEdition = editionMatrix?.items.find((edition) => edition.market === selectedMarket && edition.locale === selectedLocale);
  const documentParams = { market: selectedMarket, locale: selectedLocale };
  const { data: doc, isLoading: isDocumentLoading, isError: isDocumentError, error: documentError } = useGetDocument(id!, documentParams, {
    query: {
      enabled: Boolean(id && (
        (matrixSelectedEdition?.exact && matrixSelectedEdition.revisionId)
        || (selectedMarket === "shared-source" && selectedLocale === "und")
      )),
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
  const createCustomizationMutation = useCreateDocumentCustomization();
  const reviewAvailability = useReviewDocumentAvailability();
  const selectAvailabilitySource = useSelectDocumentAvailabilitySource();

  // Revisions data
  const { data: revisionsData } = useListDocumentRevisions(id!, { query: { enabled: Boolean(id && session), queryKey: getListDocumentRevisionsQueryKey(id!) } });

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
  const hasAuthorRole = ["editor", "publisher", "administrator"].includes(session?.user?.role ?? "");
  const canEditSelectedMarket = hasAuthorRole && (
    isAdministrator || Boolean(session?.user?.marketCodes?.includes(selectedMarket))
  );
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
  // Preview issuance always targets the already-saved exact revision. The
  // visual workspace never receives local draft state.
  const requestIndustryPreview = useCallback(async () => {
    const result = await createPreview();
    if (result.isError || !result.data?.previewUrl) {
      throw result.error ?? new Error("The protected preview capability could not be issued.");
    }
    return result.data;
  }, [createPreview]);
  
  const hydratedEditionKey = useRef("");
  const hydratedRevision = useRef<number | undefined>(undefined);
  const currentEditorKey = useRef("");
  const lastSaved = useRef({ title: "", summary: "", content: {} as Record<string, any>, seo: {} as DraftSeo });
  const hasUnsavedRef = useRef(false);
  const preserveAfterFailedSave = useRef(false);
  const mountedRef = useRef(true);
  const saveSequence = useRef(0);

  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [availabilitySelectionDraft, setAvailabilitySelectionDraft] = useState<AvailabilitySelectionDraft>({
    selections: {},
    saveFailed: false,
  });
  const availabilitySelectionActive = Object.keys(availabilitySelectionDraft.selections).length > 0
    || availabilitySelectionDraft.saveFailed;
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
  const [publishAvailabilityVersion, setPublishAvailabilityVersion] = useState<number | null>(null);
  const [submittingSharedReview, setSubmittingSharedReview] = useState(false);
  const [legacySourceRevisionId, setLegacySourceRevisionId] = useState("");

  // Comparison states
  const [selectedRevs, setSelectedRevs] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

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
      if (hasUnsavedRef.current || preserveAfterFailedSave.current || saveBlocked || availabilitySelectionActive) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [availabilitySelectionActive, hasUnsaved, saveBlocked]);

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
      if ((hasUnsavedRef.current || preserveAfterFailedSave.current || availabilitySelectionActive)
        && !window.confirm("Discard unsaved changes or a destination selection and leave this editor?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", protectInternalNavigation, true);
    return () => document.removeEventListener("click", protectInternalNavigation, true);
  }, [availabilitySelectionActive, updateDoc.isPending]);

  const mediaIds = useMemo(() => collectContentMediaIds(content), [content]);
  const contentValidation = useMemo(
    () => doc ? validateCmsContent(doc.kind as CmsDocumentKind, content, "draft") : { success: false as const, errors: [] },
    [content, doc],
  );
  const marketParams = { page: 1, pageSize: 100 };
  const { data: marketData } = useListMarketEditions(marketParams, {
    query: { queryKey: getListMarketEditionsQueryKey(marketParams) },
  });
  const {
    data: availabilityForReview,
    isLoading: isAvailabilityLoading,
    isError: isAvailabilityError,
  } = useGetDocumentAvailability(id!, {
    query: { enabled: Boolean(id && session), queryKey: getGetDocumentAvailabilityQueryKey(id!) },
  });
  const sortedRevisions = [...(revisionsData?.items ?? [])].sort((a, b) => b.number - a.number || String(b.createdAt).localeCompare(String(a.createdAt)));
  const editionRevisions = sortedRevisions.filter((revision) => revision.market === selectedMarket && revision.locale === selectedLocale);
  const selectedMarketConfig = marketData?.items.find((market) => market.code === selectedMarket);
  const destinations = useMemo<AvailabilityDestination[]>(
    () => (marketData?.items ?? [])
      .filter((market) => market.enabled)
      .map((market) => {
        const editionsForMarket = (editionMatrix?.items ?? []).filter((edition) => edition.market === market.code);
        return {
          market: market.code,
          displayName: market.displayName,
          locale: editionsForMarket.length === 1 ? editionsForMarket[0]?.locale : undefined,
        };
      }),
    [editionMatrix?.items, marketData?.items],
  );
  const sharedSource = availabilityForReview?.sharedSource;
  const selectedIsSharedSource = Boolean(
    sharedSource
    && selectedMarket === sharedSource.market
    && selectedLocale === sharedSource.locale,
  );
  const selectedEditionBase = matrixSelectedEdition ?? (selectedIsSharedSource ? {
    market: sharedSource!.market,
    locale: sharedSource!.locale,
    exact: true,
    revisionId: sharedSource!.revisionId,
    revisionNumber: doc?.revisionNumber ?? null,
    workflowState: doc?.status ?? "draft",
    publicationState: doc?.status === "published" ? "published" : "draft",
  } as any : undefined);
  // The matrix and availability state are cached independently from the exact
  // document response. On initial load either can still point at the prior
  // revision while the editor has already loaded the latest saved draft. Use
  // the loaded exact response as the authority for the active edition; once a
  // preview/history pin exists, previewPinForEditionRevision deliberately
  // keeps that immutable selection.
  const loadedLatestRevisionId = !isDocumentLoading && doc?.currentRevisionId
    ? doc.currentRevisionId
    : undefined;
  const selectedEdition = selectedEditionBase && loadedLatestRevisionId
    ? {
        ...selectedEditionBase,
        revisionId: loadedLatestRevisionId,
        revisionNumber: doc?.revisionNumber ?? selectedEditionBase.revisionNumber,
        workflowState: ["draft", "in-review", "approved"].includes(String(doc?.status))
          ? doc?.status
          : selectedEditionBase.workflowState,
      }
    : selectedEditionBase;
  const selectedIsCustomization = Boolean(
    selectedEdition
    && selectedEdition.exact
    && !selectedIsSharedSource,
  );
  const pendingDestinationChanges = useMemo(
    () => (availabilityForReview?.items ?? []).filter((item) => item.pending),
    [availabilityForReview?.items],
  );
  const legacyCustomizations = useMemo(
    () => (availabilityForReview?.items ?? []).flatMap((destination) => {
      if (!destination.customized) return [];
      const edition = editionMatrix?.items.find((candidate) => (
        candidate.exact
        && candidate.market === destination.market
        && candidate.locale === destination.locale
      ));
      return edition ? [edition] : [];
    }),
    [availabilityForReview?.items, editionMatrix?.items],
  );
  const legacySourceCandidates = useMemo(
    () => sortedRevisions.filter((revision) => (
      (editionMatrix?.items ?? []).some((edition) => (
        edition.exact && edition.market === revision.market && edition.locale === revision.locale
      ))
    )),
    [editionMatrix?.items, sortedRevisions],
  );
  const canManageSharedDestinations = hasAuthorRole && (
    isAdministrator
    || Boolean(destinations.length)
      && destinations.every((destination) => session?.user?.marketCodes?.includes(destination.market))
  );
  useEffect(() => {
    if (selectedMarket) return;
    // A legacy document has no authoritative shared address yet. Keep an
    // administrator on the explicit source-selection screen rather than
    // silently opening a historical customization first.
    if (!sharedSource) {
      if (!isAdministrator) {
        const existingCustomization = legacyCustomizations[0];
        if (existingCustomization) {
          setSelectedMarket(existingCustomization.market);
          setSelectedLocale(existingCustomization.locale);
        }
      }
      return;
    }
    // Full-destination authority opens the canonical shared content before
    // any customization. Restricted editors retain their accessible target
    // customization-first path because they cannot open shared content.
    if (canManageSharedDestinations) {
      setSelectedMarket(sharedSource.market);
      setSelectedLocale(sharedSource.locale);
      return;
    }
    const existingCustomization = legacyCustomizations[0];
    if (existingCustomization) {
      setSelectedMarket(existingCustomization.market);
      setSelectedLocale(existingCustomization.locale);
    }
  }, [canManageSharedDestinations, isAdministrator, legacyCustomizations, selectedMarket, sharedSource]);
  // An internal shared-source edition deliberately has no assignable market
  // code. Its authority is the complete set of destinations it controls, not
  // the synthetic `shared-source` market identity.
  const canEditSelectedEdition = selectedIsSharedSource
    ? canManageSharedDestinations
    : canEditSelectedMarket;
  const canPublishSelectedEdition = canPublish && (
    !selectedIsSharedSource || canManageSharedDestinations
  );
  useEffect(() => {
    // A matrix refresh caused by another editor must not silently exchange a
    // capability the reviewer already has open. A local save/action explicitly
    // advances this pin in its success handler.
    if (isDocumentLoading || !doc?.currentRevisionId) return;
    setPreviewRevisionId((pinned) =>
      previewPinForEditionRevision(
        pinned,
        selectedEdition?.revisionId,
        false,
        doc.currentRevisionId,
      ));
  }, [doc?.currentRevisionId, isDocumentLoading, previewRevisionId, selectedEdition?.revisionId, selectedEdition?.revisionNumber]);
  const readiness = useMemo(
    () => doc ? documentReadiness(doc.kind as CmsDocumentKind, title, content, mediaIds) : [],
    [content, doc, mediaIds, title],
  );
  const editionIsArchived = doc?.status === "archived";
  const authoringActions = editionAuthoringActions(
    selectedEdition,
    canEditSelectedEdition && !editionIsArchived,
    canPublishSelectedEdition && !editionIsArchived,
    hasUnsaved,
    isAdministrator,
  );
  const fieldIssue = (path: string) => saveIssues.find((issue) => issue.path === path)?.message;
  const editorHydrated = hydratedEditionKey.current === currentEditorKey.current && hydratedRevision.current !== undefined;
  const editorLocked = !editorHydrated || updateDoc.isPending || authoringActions.immutable
    || !canEditSelectedEdition;

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
        revisionNumber: submittedRevision ?? doc.revisionNumber,
        // Number protects ordinary concurrent edits; exact identity protects
        // a source address which may have been relocated into a custom draft.
        expectedRevisionId: doc.currentRevisionId ?? undefined,
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
        if (updated.currentRevisionId) {
          setPreviewRevisionId((pinned) =>
            previewPinForEditionRevision(pinned, updated.currentRevisionId, true));
          queryClient.setQueryData(getListDocumentEditionsQueryKey(id!), (matrix: any) =>
            applyLocalSuccessorToEditionMatrix(matrix, targetParams, updated));
        }
        lastSaved.current = { ...submitted, seo: submitted.seo ?? {} };
        setSeoOriginallyPresent(Boolean(submitted.seo));
        hasUnsavedRef.current = false;
        setHasUnsaved(false);
        queryClient.setQueryData(getGetDocumentQueryKey(id!, targetParams), updated);
        if (selectedIsSharedSource) {
          queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(id!) });
        }
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
    if ((hasUnsavedRef.current || saveBlocked || preserveAfterFailedSave.current || availabilitySelectionActive)
      && !window.confirm("Discard local changes or a destination selection and switch editions?")) return;
    const target = editionMatrix?.items.find((item) => item.market === market && item.locale === locale);
    const isSharedTarget = Boolean(sharedSource && market === sharedSource.market && locale === sharedSource.locale);
    if (!target && !isSharedTarget) return;
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
    // Wait for the newly selected exact document response to establish the
    // latest saved revision. Reusing the matrix/source pointer here can pin a
    // just-opened editor to the prior draft when either cache is stale.
    setPreviewRevisionId(undefined);
  };

  const createCustomization = (targetMarket: string, targetLocale: string) => {
    const sourceRevisionId = availabilityForReview?.sharedSource?.revisionId;
    if (!sourceRevisionId || updateDoc.isPending || hasUnsavedRef.current) return;
    createCustomizationMutation.mutate({ documentId: id!, data: {
      market: targetMarket,
      locale: targetLocale,
      sourceRevisionId,
    } }, {
      onSuccess: (revision) => {
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        // A customization of the former source destination can cause the API
        // to relocate that source internally. Refresh its authoritative
        // identity before selecting the new target draft so it is never
        // mistaken for shared content during the transition.
        void getDocumentAvailability(id!).then((updatedAvailability) => {
          queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(id!), updatedAvailability);
        }).catch(() => {
          queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(id!) });
        }).finally(() => {
          hydratedEditionKey.current = "";
          setSelectedMarket(targetMarket);
          setSelectedLocale(targetLocale);
          setPreviewRevisionId(revision.id);
          toast({ title: `Customization created for ${targetMarket.toUpperCase()}${targetLocale ? ` · ${targetLocale}` : ""}` });
        });
      },
      onError: (error: any) => toast({ title: "Customization was not created", description: error.error || error.message || "Your saved shared content remains unchanged.", variant: "destructive" }),
    });
  };

  const selectLegacySharedSource = () => {
    if (!legacySourceRevisionId || !availabilityForReview || selectAvailabilitySource.isPending) return;
    selectAvailabilitySource.mutate({
      documentId: id!,
      data: {
        version: availabilityForReview.draftVersion,
        sourceRevisionId: legacySourceRevisionId,
      },
    }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(id!), updated);
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        setLegacySourceRevisionId("");
        toast({
          title: "Shared source selected",
          description: "A new unpublished shared source was created from the selected historical revision. Existing customizations were not changed.",
        });
      },
      onError: (error: any) => toast({
        title: "Shared source was not selected",
        description: error?.data?.error || error?.error || error?.message || "Reload the destination selection and choose an exact historical revision again.",
        variant: "destructive",
      }),
    });
  };

  const leaveEditor = (destination: string) => {
    if (updateDoc.isPending) return;
    if ((hasUnsavedRef.current || saveBlocked || preserveAfterFailedSave.current || availabilitySelectionActive)
      && !window.confirm("Discard local changes or a destination selection and leave this editor?")) return;
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

  const navigationOnlyState = (message: string, loading = false, detail?: ReactNode) => (
    <div className="h-full p-8">
      <Button variant="ghost" onClick={() => leaveEditor("/content")} disabled={updateDoc.isPending} className="mb-8">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to content
      </Button>
      <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center">
        {loading && <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">{message}</p>
        {detail}
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
  if (isSessionLoading || (session && (isEditionMatrixLoading || isAvailabilityLoading))) {
    return navigationOnlyState("Loading your accessible document editions…", true);
  }
  if (isSessionError || isEditionMatrixError || isAvailabilityError) {
    return navigationOnlyState("We could not load the editions you can access. Please return to content and try again.");
  }
  if (selectedMarket && isDocumentLoading) {
    return navigationOnlyState(`Loading ${selectedMarket.toUpperCase()} · ${selectedLocale}…`, true);
  }
  if (isDocumentError) {
    return navigationOnlyState(`This edition could not be loaded. ${(documentError as any)?.error ?? (documentError as Error)?.message ?? ""}`);
  }
  if (!doc) {
    if (!sharedSource && (isAdministrator || legacyCustomizations.length)) {
      return navigationOnlyState(
        "No shared source is configured for this legacy document. Existing customizations remain editable; an administrator must choose a shared source before shared content or destinations can be changed.",
        false,
        <div className="mt-6 space-y-2 border-t pt-4 text-left">
          {isAdministrator && (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
              <Label htmlFor="legacy-shared-source" className="text-xs font-semibold">Create a shared source from an exact historical revision</Label>
              <select
                id="legacy-shared-source"
                className="w-full rounded border bg-background p-2 text-xs"
                value={legacySourceRevisionId}
                onChange={(event) => setLegacySourceRevisionId(event.target.value)}
                disabled={selectAvailabilitySource.isPending}
              >
                <option value="">Choose a historical revision…</option>
                {legacySourceCandidates.map((revision) => (
                  <option key={revision.id} value={revision.id}>
                    {revision.market.toUpperCase()} · {revision.locale} · Revision {revision.number}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!legacySourceRevisionId || selectAvailabilitySource.isPending}
                onClick={selectLegacySharedSource}
              >
                {selectAvailabilitySource.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Create shared source
              </Button>
            </div>
          )}
          {legacyCustomizations.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider">Editable customizations</p>
              {legacyCustomizations.map((edition) => (
                <Button
                  key={`${edition.market}-${edition.locale}`}
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => selectEdition(edition.market, edition.locale)}
                >
                  Edit {edition.market.toUpperCase()} · {edition.locale}
                </Button>
              ))}
            </>
          )}
        </div>,
      );
    }
    if (sharedSource && !canManageSharedDestinations) {
      return navigationOnlyState(
        "Shared content is read-only because it affects destinations outside your assignment. You can still create or edit content customized for your assigned destinations.",
        false,
        <div className="mt-6 space-y-3 border-t pt-4 text-left">
          <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Shared source revision {sharedSource.revisionId ?? "unavailable"} is read-only for your assignment.
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider">Your destinations</p>
          <MarketAvailabilityChecklist
            documentId={id}
            destinations={destinations}
            isAdministrator={isAdministrator}
            canManageMarket={(market) => hasAuthorRole && (
              isAdministrator || Boolean(session?.user?.marketCodes?.includes(market))
            )}
            onDestinationSelected={(destination) => {
              const destinationAvailability = availabilityForReview?.items.find((item) => (
                item.market === destination.market && item.locale === destination.locale
              ));
              const destinationEdition = editionMatrix?.items.find((edition) => (
                edition.market === destination.market && edition.locale === destination.locale
              ));
              const canCustomizeDestination = hasAuthorRole && (
                isAdministrator || Boolean(session?.user?.marketCodes?.includes(destination.market))
              );
              if (destinationAvailability?.customized && destinationEdition?.exact) {
                return (
                  <Button type="button" variant="link" size="sm" className="ml-7 mt-2 h-auto px-0 text-xs" onClick={() => selectEdition(destinationEdition.market, destinationEdition.locale)}>
                    Edit customization
                  </Button>
                );
              }
              return (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="ml-7 mt-2 h-auto px-0 text-xs"
                  disabled={!canCustomizeDestination || createCustomizationMutation.isPending || !sharedSource.revisionId}
                  onClick={() => createCustomization(destination.market, destination.locale!)}
                >
                  {createCustomizationMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Customize for this edition
                </Button>
              );
            }}
          />
        </div>,
      );
    }
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
    if (updateDoc.isPending || reviewAvailability.isPending || submittingSharedReview || availabilitySelectionActive) return;
    setActionError(null);
    const targetParams = { market: selectedMarket, locale: selectedLocale };
    const opts = {
      onSuccess: (updated: any) => {
        queryClient.setQueryData(getGetDocumentQueryKey(id!, targetParams), updated);
        if (action === "restore" && updated.currentRevisionId) {
          setPreviewRevisionId((pinned) =>
            previewPinForEditionRevision(pinned, updated.currentRevisionId, true));
          queryClient.setQueryData(getListDocumentEditionsQueryKey(id!), (matrix: any) =>
            applyLocalSuccessorToEditionMatrix(matrix, targetParams, updated));
        }
        // Restore can promote a replacement shared-source revision. The
        // availability response owns that pointer and its destination state;
        // never retain its pre-restore cache beside the local matrix successor.
        if (action === "restore" && selectedIsSharedSource) {
          queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(id!) });
        }
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("documents") || String(query.queryKey[0]).includes("published") || String(query.queryKey[0]).includes("preview") });
        toast({
           title: action === "publish" && selectedEdition?.workflowState !== "in-review"
             ? "Saved draft published directly"
             : action === "publish" && selectedIsSharedSource
               ? "Shared content and reviewed destinations published"
               : action === "publish"
                 ? "Selected customization published"
              : action === "submit"
                ? "Latest edition revisions submitted for review"
                : action === "restore"
                  ? "Document restored as a draft"
                  : "Document archived",
          description: action === "restore"
            ? "This edition is not public. Its restored draft must pass review before it can be published again."
             : action === "publish" && selectedEdition?.workflowState !== "in-review"
               ? "The server released this exact saved revision after rechecking publication governance."
               : action === "publish" && selectedIsSharedSource
                 ? "The server released this exact reviewed source revision and its reviewed destination selection together."
                 : action === "publish"
                   ? "Only this customization revision was published. Destination choices remain pending until shared content is published."
            : undefined,
        });
        if (action === "publish") setPublishOpen(false);
      },
      onError: (err: unknown) => {
        const failure = describeActionError(err);
        setActionError(failure);
        toast({ title: "Action could not be completed", description: failure.message, variant: "destructive" });
      }
    };

    const submitCurrentRevision = () => {
      if (!selectedEdition?.revisionId) return;
      submitDoc.mutate({ documentId: id!, data: { revisionId: selectedEdition.revisionId } }, opts);
    };
    if (action === "submit" && selectedEdition?.revisionId) {
      if (!selectedIsSharedSource) {
        submitCurrentRevision();
        return;
      }
      if (!availabilityForReview) {
        setActionError({
          message: "Destination state is still loading. Wait for it before sending this shared document for review.",
          issues: [],
          mediaBlocked: false,
        });
        return;
      }
      if (!availabilityForReview.sharedSource?.revisionId) {
        setActionError({
          message: "Choose and save the shared content source before sending this document for review.",
          issues: [],
          mediaBlocked: false,
        });
        return;
      }
      setSubmittingSharedReview(true);
      // A source save advances availability's version. Read that latest
      // server state before reviewing so one click always freezes the same
      // saved source revision and destination selection that is submitted.
      void getDocumentAvailability(id!).then((currentAvailability) => {
        queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(id!), currentAvailability);
        if (currentAvailability.sharedSource?.revisionId !== selectedEdition.revisionId) {
          setSubmittingSharedReview(false);
          setActionError({
            message: "The shared source changed on the server. Reload this source before sending it for review.",
            issues: [],
            mediaBlocked: false,
          });
          return;
        }
        if (currentAvailability.reviewedVersion === currentAvailability.draftVersion) {
          setSubmittingSharedReview(false);
          submitCurrentRevision();
          return;
        }
        reviewAvailability.mutate({ documentId: id!, data: { version: currentAvailability.draftVersion } }, {
          onSuccess: (reviewed) => {
            queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(id!), reviewed);
            setSubmittingSharedReview(false);
            submitCurrentRevision();
          },
          onError: (error: unknown) => {
            setSubmittingSharedReview(false);
            const failure = describeActionError(error);
            setActionError(failure);
            toast({
              title: "Destinations could not be sent for review",
              description: failure.message,
              variant: "destructive",
            });
          },
        });
      }).catch((error: unknown) => {
        setSubmittingSharedReview(false);
        const failure = describeActionError(error);
        setActionError(failure);
        toast({
          title: "Destination state could not be loaded",
          description: failure.message,
          variant: "destructive",
        });
      });
      return;
    }
    if (action === "archive") archiveDoc.mutate({ documentId: id!, data: { market: selectedMarket, locale: selectedLocale } }, opts);
    if (action === "restore") restoreDoc.mutate({ documentId: id!, data: { market: selectedMarket, locale: selectedLocale } }, opts);
    if (action === "publish" && publishRevisionId) {
      publishDoc.mutate({
        documentId: id!,
        data: {
          revisionId: publishRevisionId,
          ...(publishAvailabilityVersion === null ? {} : { availabilityVersion: publishAvailabilityVersion }),
        },
      }, opts);
    }
  };

  const handleRollback = (revisionId: string) => {
    if (updateDoc.isPending) return;
    rollbackDoc.mutate({ documentId: id!, data: { revisionId } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetDocumentQueryKey(id!, documentParams), updated);
        if (updated.currentRevisionId) {
          setPreviewRevisionId((pinned) =>
            previewPinForEditionRevision(pinned, updated.currentRevisionId, true));
          queryClient.setQueryData(getListDocumentEditionsQueryKey(id!), (matrix: any) =>
            applyLocalSuccessorToEditionMatrix(matrix, documentParams, updated));
        }
        // Rollback may replace the availability source pointer even though its
        // destination decisions are unchanged. Refetch that authoritative
        // state while retaining the successor selected in the edition matrix.
        if (selectedIsSharedSource) {
          queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(id!) });
        }
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
             <Button variant="outline" size="sm" onClick={() => handleAction("submit")} disabled={updateDoc.isPending || submitDoc.isPending || reviewAvailability.isPending || submittingSharedReview || !contentValidation.success} className="font-mono uppercase tracking-wider text-xs">
              <Send className="w-3.5 h-3.5 mr-2" /> Submit Review
            </Button>
          )}
          {authoringActions.canPublish && (
              <Button size="sm" onClick={() => {
                setPublishRevisionId(selectedEdition?.revisionId ?? null);
                setPublishAvailabilityVersion(selectedIsSharedSource ? availabilityForReview?.draftVersion ?? null : null);
                setPublishOpen(true);
              }} disabled={updateDoc.isPending || reviewAvailability.isPending || submittingSharedReview || !contentValidation.success} className="font-mono uppercase tracking-wider text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
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
      <div className={`flex-1 ${doc.kind === "industry" ? "overflow-y-auto flex flex-col" : "overflow-hidden flex"}`}>
        {/* Left Column: Editor */}
        <div className={`flex-1 ${doc.kind === "industry" ? "w-full p-4 lg:p-8" : "overflow-y-auto p-8 custom-scrollbar border-r border-border"}`}>
          <div className={`${doc.kind === "industry" ? "w-full max-w-none" : "max-w-3xl mx-auto"} space-y-8`}>
            {actionError && (
              <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-4" data-testid="action-error-summary">
                <p className="text-sm font-semibold text-destructive">{actionError.message}</p>
                {actionError.committed && (
                  <p className="mt-2 text-sm">
                    The server reports that this action was committed. Reload the selected edition before retrying so you do not submit or publish against an old revision.
                  </p>
                )}
                {actionError.mediaBlocked && (
                  <p className="mt-2 text-sm">
                    Referenced images must be approved before submitting this page for review.
                    Open the <a href={`${import.meta.env.BASE_URL}media`} target="_blank" rel="noopener noreferrer" className="underline font-medium">Media Library (new tab)</a>,
                    review the pending assets and confirm their rights and accessibility checks. Then return here and submit again.
                  </p>
                )}
                {!!actionError.issues.length && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {actionError.issues.map((issue, index) => (
                      <li key={`${issue.path}-${index}`}><strong>{issue.path}</strong>: {issue.message}</li>
                    ))}
                  </ul>
                )}
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setActionError(null)}>Dismiss</Button>
              </div>
            )}
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
              <p className="mt-3 text-xs font-medium">
                Editing: <strong>{selectedIsCustomization ? `Customization for ${selectedMarketConfig?.displayName ?? selectedMarket}` : "Shared content"}</strong>
                {selectedIsCustomization && <Button type="button" variant="link" size="sm" className="ml-1 h-auto px-1 text-xs" onClick={() => sharedSource && selectEdition(sharedSource.market, sharedSource.locale)}>Return to shared content</Button>}
              </p>
              {authoringActions.immutable && <p className="mt-2 text-xs text-amber-600">This edition is in review and cannot be edited until it is approved or rejected.</p>}
              {doc.status === "draft" && doc.publishedRevisionId && (
                 <p className="mt-2 text-xs text-amber-600">This draft is not publicly visible. An administrator can publish this saved revision directly, or submit it for optional review first.</p>
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

            {doc.kind === "industry" ? (
              <IndustryVisualWorkspace
                content={content}
                onChange={editorLocked ? () => {} : handleContentChange}
                errors={contentValidation.success ? [] : contentValidation.errors}
                disabled={editorLocked}
                revisionId={previewRevisionId}
                currentRevisionId={selectedEdition?.revisionId ?? undefined}
                revisionNumber={selectedEdition?.revisionNumber ?? doc.revisionNumber}
                market={selectedMarket}
                locale={selectedLocale}
                hasUnsaved={hasUnsaved}
                requestPreview={requestIndustryPreview}
              />
            ) : (
              <fieldset disabled={editorLocked} className="contents"><ContentEditor
                kind={doc.kind as CmsDocumentKind}
                value={content}
                onChange={editorLocked ? () => {} : handleContentChange}
                errors={contentValidation.success ? [] : contentValidation.errors}
              /></fieldset>
            )}
            {doc.kind !== "industry" && <details className="rounded-md border bg-muted/20 p-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider">Advanced structured view (read only)</summary>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(content, null, 2)}</pre>
            </details>}
          </div>
        </div>

        {/* Right Column: Metadata & Sidepanes */}
        <div className={doc.kind === "industry" ? "w-full shrink-0 border-t bg-card" : "w-[320px] bg-card flex flex-col h-full border-l border-border"}>
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
                  Destination availability is managed under “Show this content in”. Saved changes remain pending until the reviewed snapshot is published.
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
                  <Button type="button" size="sm" variant="outline" disabled={!reviewComment.trim() || addReviewComment.isPending || !selectedEdition?.revisionId} onClick={() => {
                    if (!selectedEdition?.revisionId) return;
                    const revisionId = selectedEdition.revisionId;
                    const body = reviewComment.trim();
                    setActionError(null);
                    addReviewComment.mutate({ documentId: id!, data: { revisionId, body } }, {
                      onSuccess: () => {
                        setReviewComment("");
                        queryClient.invalidateQueries({
                          queryKey: getListDocumentReviewCommentsQueryKey(id!, { revisionId }),
                        });
                        toast({ title: "Review comment added" });
                      },
                      onError: (error: unknown) => {
                        const failure = describeActionError(error);
                        setActionError(failure);
                        toast({ title: "Review comment could not be added", description: failure.message, variant: "destructive" });
                      },
                    });
                  }} data-testid="button-add-review-comment">Add comment</Button>
                  {selectedEdition?.workflowState === "in-review" && canPublish && <Button type="button" size="sm" variant="destructive" disabled={!reviewComment.trim() || rejectRevision.isPending || !selectedEdition.revisionId} onClick={() => {
                    const targetParams = { market: selectedMarket, locale: selectedLocale };
                    const revisionId = selectedEdition.revisionId!;
                    const body = reviewComment.trim();
                    setActionError(null);
                    rejectRevision.mutate({ documentId: id!, data: { revisionId, body } }, {
                      onSuccess: (updated) => {
                        setReviewComment("");
                        setActionError(null);
                        queryClient.setQueryData(getGetDocumentQueryKey(id!, targetParams), updated);
                        queryClient.invalidateQueries({
                          queryKey: getListDocumentReviewCommentsQueryKey(id!, { revisionId }),
                        });
                        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
                        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
                        toast({ title: "Revision rejected", description: "The revision was returned to draft with your review comment." });
                      },
                      onError: (error: unknown) => {
                        const failure = describeActionError(error);
                        setActionError(failure);
                        toast({ title: "Revision could not be rejected", description: failure.message, variant: "destructive" });
                      },
                    });
                  }} data-testid="button-reject-revision">Reject revision</Button>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="editions" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
              <div>
                <h3 className="text-sm font-semibold">Show this content in</h3>
                <p className="mt-1 text-xs text-muted-foreground">Destination changes are saved for review. They do not change the live website until the reviewed snapshot is published.</p>
                {!canManageSharedDestinations && <p className="mt-2 text-xs text-amber-700">Shared destinations affect every selected market. Your assigned markets do not cover this shared selection.</p>}
              </div>
              <MarketAvailabilityChecklist
                documentId={id!}
                destinations={destinations}
                canManageMarket={() => canManageSharedDestinations}
                isAdministrator={isAdministrator}
                selectionDraft={availabilitySelectionDraft}
                onSelectionDraftChange={setAvailabilitySelectionDraft}
                onDestinationSelected={(destination) => {
                  const destinationAvailability = availabilityForReview?.items.find((item) => (
                    item.market === destination.market && item.locale === destination.locale
                  ));
                  const destinationEdition = (editionMatrix?.items ?? []).find((edition) => (
                    edition.market === destination.market
                    && edition.locale === destination.locale
                  ));
                  const canCustomizeDestination = hasAuthorRole && (
                    isAdministrator || Boolean(session?.user?.marketCodes?.includes(destination.market))
                  );
                  if (destinationAvailability?.customized && destinationEdition?.exact) {
                    return (
                      <Button type="button" variant="link" size="sm" className="ml-7 mt-2 h-auto px-0 text-xs" disabled={updateDoc.isPending} onClick={() => selectEdition(destinationEdition.market, destinationEdition.locale)}>
                        Edit customization
                      </Button>
                    );
                  }
                  return (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="ml-7 mt-2 h-auto px-0 text-xs"
                      disabled={
                        !canCustomizeDestination
                        || updateDoc.isPending
                        || createCustomizationMutation.isPending
                        || hasUnsaved
                        || !sharedSource?.revisionId
                      }
                      onClick={() => createCustomization(destination.market, destination.locale!)}
                      data-testid={`button-customize-${destination.market}-${destination.locale}`}
                    >
                      {createCustomizationMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Customize for this edition
                    </Button>
                  );
                }}
              />
              {availabilityForReview && availabilityForReview.reviewedVersion !== availabilityForReview.draftVersion && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!canManageSharedDestinations || reviewAvailability.isPending || availabilitySelectionActive}
                  onClick={() => {
                    if (!availabilityForReview) return;
                    reviewAvailability.mutate({ documentId: id!, data: { version: availabilityForReview.draftVersion } }, {
                      onSuccess: (reviewed) => {
                        queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(id!), reviewed);
                        toast({ title: "Destinations sent for review", description: "The selected destination snapshot is now frozen for publication." });
                      },
                      onError: (error: any) => toast({
                        title: "Destination review was not started",
                        description: error?.data?.error || error?.error || error?.message || "Your local editor inputs are unchanged. Reload destinations before trying again.",
                        variant: "destructive",
                      }),
                    });
                  }}
                >
                  {reviewAvailability.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Send destinations for review
                </Button>
              )}
              {hasUnsaved && <p className="text-xs text-amber-700">Save shared content before creating a customization so it starts from this saved revision.</p>}
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
             <DialogTitle>
               {selectedEdition?.workflowState !== "in-review"
                 ? "Publish Saved Draft"
                 : selectedIsSharedSource ? "Publish Shared Content" : "Publish Customization"}
             </DialogTitle>
            <DialogDescription className="font-mono text-xs mt-2">
                 {selectedEdition?.workflowState !== "in-review"
                   ? "Confirm direct administrator publication of this exact saved revision. The server will recheck content, media clearance, immutable version pins, and destination governance before releasing it."
                   : selectedIsSharedSource
                  ? "Confirm the reviewed snapshot. The selected content and destination choices below are released together; saving or review alone never changes the live website."
                  : "Confirm this selected customization revision. Destination choices are not released by customization publication and remain pending until shared content is published."}
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
              {selectedIsSharedSource ? (
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs font-semibold">Destination impact</p>
                  {pendingDestinationChanges.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {pendingDestinationChanges.map((item) => (
                        <li key={`${item.marketEditionId}-${item.locale}`}>
                          <strong>{item.displayName}{(availabilityForReview?.items.filter((candidate) => candidate.market === item.market).length ?? 0) > 1 ? ` · ${item.locale}` : ""}</strong>: {item.stagedDecision !== "off" ? "shown" : "excluded"}
                          {" "}(<span>live: {!availabilityForReview?.sharedSource?.publishedRevisionId
                            ? "Not published yet"
                            : item.publishedEffectiveAvailable ? "shown" : "excluded"}</span>)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {!availabilityForReview?.sharedSource?.publishedRevisionId
                         ? selectedEdition?.workflowState !== "in-review" && isAdministrator
                           ? "Not published yet. This saved source and current destination snapshot will establish the first live content."
                           : "Not published yet. This reviewed source and destination snapshot will establish the first live content."
                        : "No pending destination changes. Only the selected content revision is affected."}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs font-semibold">Customization impact</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only this selected edition will publish. Any destination changes remain pending and are not released here.
                  </p>
                </div>
              )}
              {selectedIsSharedSource && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                   {selectedEdition?.workflowState !== "in-review" && isAdministrator
                     ? "Direct administrator publishing captures this exact saved source revision and the current saved destination choices atomically. No separate destination-review action is required."
                     : "Shared publishing requires this exact saved source revision and its reviewed destination selection. Send destinations for review again whenever the source or a destination changes."}
                </p>
              )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleAction("publish")}
              disabled={
                publishDoc.isPending
                || availabilitySelectionActive
                || !publishRevisionId
                || (selectedIsSharedSource && (
                   availabilityForReview?.sharedSource?.revisionId !== publishRevisionId
                   || (publishAvailabilityVersion === null
                     || publishAvailabilityVersion !== availabilityForReview?.draftVersion)
                   || (selectedEdition?.workflowState === "in-review"
                     && availabilityForReview?.reviewedVersion !== availabilityForReview?.draftVersion)
                ))
              }
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
