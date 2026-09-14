import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
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
  previewDocument,
  useGetSession,
  getGetDocumentQueryKey,
  getListDocumentRevisionsQueryKey,
  DocumentStatus,
} from "@workspace/api-client-react";
import { getListMarketEditionsQueryKey, useListMarketEditions, getListDocumentEditionsQueryKey, useListDocumentEditions, useCreateDocumentEditionOverride as useCreateDocumentCustomization, getDocumentAvailability, getGetDocumentAvailabilityQueryKey, useGetDocumentAvailability, useReviewDocumentAvailability, usePublishDocumentAvailability, useSelectDocumentAvailabilitySource, getListDocumentReviewCommentsQueryKey, useListDocumentReviewComments, useAddDocumentReviewComment, useRejectDocumentRevision, getGetSharedMarketEditionMatrixQueryKey, useGetSharedMarketEditionMatrix, getCompareSharedMarketBaselineQueryKey, useEstablishSharedMarketBaseline, useBindSharedMarketEdition, useSaveSharedMarketOverrides, useCompareSharedMarketBaseline, useResolveSharedMarketBaselineUpdate, type SharedMarketBinding, type SharedMarketOverride } from "@workspace/api-client-react";
import { DocumentEditorContext } from "./DocumentEditorContext";
import { DocumentCompareModal } from "./DocumentCompareModal";
import { FieldOverrideIndicator } from "./FieldOverrideIndicator";
import { readSharedOverridePath, resetSharedOverridePath } from "@workspace/api-zod";
import { compareSharedMarketBaseline } from "@workspace/api-client-react";
import { OverridesContext } from "./OverridesContext";
import { type CmsDocumentKind, validateCmsContent } from "@workspace/api-zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Globe, Archive, ChevronLeft, CheckCircle2, AlertTriangle, Eye, RotateCcw, Save, GitCompare, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { buildDraftSave, describeSaveFailure, isDraftSaveResponse, serverValidationIssues, type DraftSeo, type DraftSaveIssue } from "./draft-save";
import { describeActionError } from "./action-error";
import { MarketAvailabilityChecklist, type AvailabilityDestination, type AvailabilitySelectionDraft } from "./MarketAvailabilityChecklist";
import { IndustryVisualWorkspace } from "./IndustryVisualWorkspace";
import { SharedEditionPanel } from "./SharedEditionPanel";
import { SharedBaselineEditor } from "./SharedBaselineEditor";

// hint: Logic changed on both sides. Requires understanding intent of each change.
import { applyLocalSuccessorToEditionMatrix, previewPinForEditionRevision, previewResponseMatchesTarget, type PreviewTarget } from "./preview-revision-lifecycle";
import { createDraftRecoveryExport, downloadDraftRecovery } from "./draft-operation-safety";
import { EditionAssignmentControl } from "./EditionAssignmentControl";
import { ContentEditor, contentFieldId } from "./ContentEditor";
import { buildDocumentReadiness as documentReadiness, collectContentMediaIds, CONTENT_GUIDANCE, editionAuthoringActions, readinessCounts, type ReadinessIssue } from "./authoring";
import { reuseFailureOutcome } from "./edition-reuse";
import { ReadinessPanel } from "./ReadinessPanel";

function documentListPath(kind: CmsDocumentKind): string {
  switch (kind) {
    case "person": return "/people";
    case "partner": return "/partners";
    case "platform": return "/platforms";
    case "publication": return "/publications";
    case "case-study": return "/case-studies";
    case "industry": return "/industries";
    case "framework": return "/frameworks";
    case "office": return "/offices";
    case "site-configuration": return "/contact-settings";
    case "landing-page": return "/dashboard";
  }
}

const PREVIEW_SAVE_PENDING = "__save-preview-pending__";

type PreviewFallback = {
  previewUrl: string;
  target: PreviewTarget;
  revisionNumber: number;
};

type PreviewFailure = {
  target: PreviewTarget;
  wasSaved: boolean;
  detail: string;
  sharedDestinationAuthority: boolean;
};

type PreviewOperation = {
  sequence: number;
  placeholder: Window | null;
  wasSaved: boolean;
  target: {
    market: string;
    locale: string;
    revisionId?: string;
  };
};

function isClosedPreviewWindow(target: Window | null | undefined) {
  if (!target) return true;
  try {
    return target.closed;
  } catch {
    return true;
  }
}

/**
 * Reserve the tab while the click still has a user gesture. The API request
 * can take long enough for a normal async window.open call to be blocked.
 */
function reservePreviewWindow(): Window | null {
  try {
    // Do not pass `noopener` here. Chromium/WebKit may return null for a
    // successful popup when that feature is requested, leaving us unable to
    // navigate the reserved tab. Isolate the real WindowProxy immediately
    // instead, while this click still owns the user gesture.
    const target = window.open("about:blank", "_blank");
    if (!target) return null;
    try {
      // This must happen before a capability URL is assigned.
      target.opener = null;
      if (target.opener !== null) {
        closePreviewPlaceholder(target);
        return null;
      }
    } catch {
      // A hostile/browser-managed WindowProxy can reject the assignment. Do
      // not leave an opener-bearing placeholder behind.
      closePreviewPlaceholder(target);
      return null;
    }
    try {
      const head = target.document.head || target.document.documentElement;
      if (!head) throw new Error("The preview placeholder has no document head.");
      const referrer = target.document.createElement("meta");
      referrer.name = "referrer";
      referrer.content = "no-referrer";
      head.appendChild(referrer);
      const installed = target.document.querySelector(
        'meta[name="referrer"][content="no-referrer"]',
      );
      if (installed !== referrer && (
        !installed
        || installed.getAttribute("name") !== "referrer"
        || installed.getAttribute("content") !== "no-referrer"
      )) {
        throw new Error("The preview placeholder could not install its referrer policy.");
      }
      if (!target.document.body) throw new Error("The preview placeholder has no document body.");
      target.document.body.textContent = "Preparing the protected preview…";
    } catch {
      // Fail closed: a placeholder without a verified policy must not receive
      // a capability URL. The caller will retain the URL as a safe fallback
      // link after issuance.
      closePreviewPlaceholder(target);
      return null;
    }
    return target;
  } catch {
    // Popup blocking is recoverable: the issued capability is retained as a
    // regular link once the API responds.
    return null;
  }
}

function closePreviewPlaceholder(target: Window | null | undefined) {
  if (!target) return;
  try {
    if (target.closed) return;
    target.close();
  } catch {
    // A cross-window proxy can reject reading `closed`; still attempt a close
    // so an opener-bearing or otherwise unsafe placeholder is not abandoned.
    try {
      target.close();
    } catch {
      // Closing is best effort; a blocked or already navigated tab is harmless.
    }
  }
}

function navigateReservedPreview(target: Window | null, previewUrl: string) {
  if (!target || isClosedPreviewWindow(target)) return false;
  try {
    const body = target.document.body;
    if (!body) throw new Error("The preview placeholder has no document body.");
    const anchor = target.document.createElement("a");
    anchor.href = previewUrl;
    anchor.target = "_self";
    anchor.rel = "noreferrer";
    anchor.referrerPolicy = "no-referrer";
    anchor.setAttribute("referrerpolicy", "no-referrer");
    anchor.textContent = "Open protected preview";
    if (
      anchor.target !== "_self"
      || anchor.getAttribute("rel") !== "noreferrer"
      || anchor.getAttribute("referrerpolicy") !== "no-referrer"
    ) {
      throw new Error("The preview navigation could not verify its no-referrer policy.");
    }
    body.replaceChildren(anchor);
    anchor.click();
    return !isClosedPreviewWindow(target);
  } catch {
    closePreviewPlaceholder(target);
    return false;
  }
}

// hint: Logic changed on both sides. Requires understanding intent of each change.
// hint: Logic changed on both sides. Requires understanding intent of each change.
export default function DocumentDetail() {
  const [, params] = useRoute("/content/:id");
  const id = params?.id;
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<ReturnType<typeof describeActionError> | null>(null);

  const { data: session, isLoading: isSessionLoading, isError: isSessionError } = useGetSession();
  const isAdministrator = session?.user?.role === "administrator";
  const canPublish = isAdministrator || session?.user?.role === "publisher";
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedLocale, setSelectedLocale] = useState("");
  const [pendingOverridePaths, setPendingOverridePaths] = useState<string[]>([]);
  const [resettingSharedField, setResettingSharedField] = useState(false);
  const [sharedCompareOpen, setSharedCompareOpen] = useState(false);
  // Compare/resolve can be launched from a reuse source while a different
  // frozen destination is selected in the editor. Keep the launched binding
  // explicit so query, mutation, and labels never drift back to the source.
  const [sharedCompareBinding, setSharedCompareBinding] = useState<SharedMarketBinding | null>(null);
  const [compareConflicts, setCompareConflicts] = useState<any[]>([]);
  const [isApplyingDecisions, setIsApplyingDecisions] = useState(false);
  const [baselineEditorOpen, setBaselineEditorOpen] = useState(false);
  const [baselineBeingEdited, setBaselineBeingEdited] = useState<any>(null);

  const {
    data: editionMatrix,
    isLoading: isEditionMatrixLoading,
    isError: isEditionMatrixError,
  } = useListDocumentEditions(id!, {
    query: { enabled: Boolean(id && session), queryKey: getListDocumentEditionsQueryKey(id!) },
  });
  const {
    data: sharedMatrix
  } = useGetSharedMarketEditionMatrix(id!, {
    query: { enabled: Boolean(id && session), queryKey: getGetSharedMarketEditionMatrixQueryKey(id!) },
  });
  const establishSharedBaseline = useEstablishSharedMarketBaseline();
  const bindSharedEdition = useBindSharedMarketEdition();
  const saveSharedOverrides = useSaveSharedMarketOverrides();
  const resolveSharedBaseline = useResolveSharedMarketBaselineUpdate();
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
  const publishAvailability = usePublishDocumentAvailability();
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
  const [previewingRevisionId, setPreviewingRevisionId] = useState<string | null>(null);
  const hasAuthorRole = ["editor", "publisher", "administrator"].includes(session?.user?.role ?? "");
  const canEditSelectedMarket = hasAuthorRole && (
    isAdministrator || Boolean(session?.user?.marketCodes?.includes(selectedMarket))
  );
  const [previewRevisionId, setPreviewRevisionId] = useState<string | undefined>();
  const [previewFallback, setPreviewFallback] = useState<PreviewFallback | null>(null);
  const [previewFailure, setPreviewFailure] = useState<PreviewFailure | null>(null);
  const [reviewComment, setReviewComment] = useState("");
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
  const previewSequence = useRef(0);
  const previewOperationRef = useRef<PreviewOperation | null>(null);

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
      const pendingPreview = previewOperationRef.current;
      if (pendingPreview) {
        closePreviewPlaceholder(pendingPreview.placeholder);
        previewOperationRef.current = null;
      }
    };
  }, []);

  const capturePreviewTarget = useCallback((): PreviewTarget | undefined => {
    const revisionId = previewRevisionId ?? matrixSelectedEdition?.revisionId ?? doc?.currentRevisionId;
    if (!revisionId || !selectedMarket || !selectedLocale) return undefined;
    return { market: selectedMarket, locale: selectedLocale, revisionId };
  }, [doc?.currentRevisionId, matrixSelectedEdition?.revisionId, previewRevisionId, selectedLocale, selectedMarket]);

  const beginPreviewOperation = useCallback((
    target: { market: string; locale: string; revisionId?: string },
    placeholder: Window | null,
    wasSaved = false,
  ) => {
    // This ref is the synchronous guard. React state alone would allow two
    // rapid clicks before the disabled button is rendered.
    if (previewOperationRef.current || previewingRevisionId !== null) {
      closePreviewPlaceholder(placeholder);
      return undefined;
    }
    const operation: PreviewOperation = {
      sequence: ++previewSequence.current,
      placeholder,
      wasSaved,
      target: { ...target },
    };
    previewOperationRef.current = operation;
    setPreviewFallback(null);
    setPreviewFailure(null);
    setPreviewingRevisionId(target.revisionId ?? PREVIEW_SAVE_PENDING);
    return operation;
  }, [previewingRevisionId]);

  const finishPreviewOperation = useCallback((operation: PreviewOperation) => {
    if (previewOperationRef.current !== operation) {
      closePreviewPlaceholder(operation.placeholder);
      return;
    }
    previewOperationRef.current = null;
    setPreviewingRevisionId(null);
  }, []);

  const abortPreviewOperation = useCallback((operation: PreviewOperation | undefined) => {
    if (!operation) return;
    closePreviewPlaceholder(operation.placeholder);
    if (previewOperationRef.current === operation) {
      previewOperationRef.current = null;
      if (mountedRef.current) setPreviewingRevisionId(null);
    }
  }, []);

  // Dialog states
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAvailabilityOpen, setPublishAvailabilityOpen] = useState(false);
  const [removeOfficeOpen, setRemoveOfficeOpen] = useState(false);
  const [removeDocumentOpen, setRemoveDocumentOpen] = useState(false);
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
      setPendingOverridePaths([]);
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
       if (hasUnsavedRef.current || preserveAfterFailedSave.current || saveBlocked || availabilitySelectionActive || previewingRevisionId !== null) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [availabilitySelectionActive, hasUnsaved, previewingRevisionId, saveBlocked]);

  useEffect(() => {
    const protectInternalNavigation = (event: MouseEvent) => {
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
       if (updateDoc.isPending || previewingRevisionId !== null) {
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
  }, [availabilitySelectionActive, previewingRevisionId, updateDoc.isPending]);

  const mediaIds = useMemo(() => collectContentMediaIds(content), [content]);
  const contentValidation = useMemo(
    () => doc ? validateCmsContent(doc.kind as CmsDocumentKind, content, "draft") : { success: false as const, errors: [] },
    [content, doc],
  );
  const marketParams = { page: 1, pageSize: 100 };
  const { data: marketData, isLoading: isMarketDataLoading } = useListMarketEditions(marketParams, {
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
  const selectedSharedBinding = sharedMatrix?.bindings.find((binding) => (
    binding.marketEditionId === selectedMarketConfig?.id && binding.locale === selectedLocale
  ));
  const comparedSharedBinding = sharedCompareBinding && (
    sharedMatrix?.bindings.find((binding) => binding.id === sharedCompareBinding.id)
    ?? sharedCompareBinding
  );
  const comparedMarket = marketData?.items.find((market) => market.id === comparedSharedBinding?.marketEditionId);
  const canResolveComparedBinding = Boolean(comparedSharedBinding && hasAuthorRole && (
    isAdministrator || Boolean(comparedMarket && session?.user?.marketCodes?.includes(comparedMarket.code))
  ));
  const selectedIsManagedMaterializedEdition = Boolean(selectedSharedBinding?.materializedRevisionId);
  const selectedBindingMode = selectedSharedBinding?.mode ?? "unbound";
  const tracksSharedOverrides = selectedBindingMode === "shared" || selectedBindingMode === "adapted";
  const { data: sharedComparison, isFetching: isSharedComparisonLoading } = useCompareSharedMarketBaseline(
    id!,
    comparedSharedBinding?.id ?? "",
    { query: {
      enabled: Boolean(id && comparedSharedBinding?.id && sharedCompareOpen),
      queryKey: getCompareSharedMarketBaselineQueryKey(id!, comparedSharedBinding?.id ?? ""),
    } },
  );
  const sharedSource = availabilityForReview?.sharedSource;
  // A URL target is an explicit instruction, not a hint. Keep it pending until
  // both independent catalogues have settled; availability often arrives
  // earlier and must never win the initial-selection race.
  const requestedUrlTarget = useMemo(() => {
    const query = new URLSearchParams(search);
    const marketParam = query.get("market");
    const localeParam = query.get("locale");
    if (!marketParam || !localeParam) return undefined;
    return { marketParam, localeParam };
  }, [search]);
  const requestedSharedSource = requestedUrlTarget?.marketParam === "shared-source"
    && requestedUrlTarget.localeParam === "und";
  const requestedFocus = useMemo<"editor" | "review" | "editions" | undefined>(() => {
    const focus = new URLSearchParams(search).get("focus");
    return focus === "editor" || focus === "review" || focus === "editions" ? focus : undefined;
  }, [search]);
  const urlTargetAwaitingCatalogues = Boolean(requestedUrlTarget && !requestedSharedSource && (
    isMarketDataLoading || !marketData || isEditionMatrixLoading || !editionMatrix
  ));
  const requestedExactEdition = useMemo(() => {
    if (requestedSharedSource) {
      if (!sharedSource?.revisionId) return undefined;
      return {
        market: sharedSource.market,
        locale: sharedSource.locale,
        exact: true,
        revisionId: sharedSource.revisionId,
        revisionNumber: null,
        workflowState: null,
      };
    }
    if (!requestedUrlTarget || urlTargetAwaitingCatalogues) return undefined;
    const { marketParam, localeParam } = requestedUrlTarget;
    // Links may contain a catalog UUID while document APIs use its code.
    const directExactMarket = editionMatrix?.items.some((edition) => edition.exact && edition.market === marketParam);
    const marketCode = marketData?.items.find((market) => market.id === marketParam || market.code === marketParam)?.code
      ?? (directExactMarket ? marketParam : undefined);
    if (!marketCode) return undefined;
    return editionMatrix?.items.find((edition) => edition.exact && edition.market === marketCode && edition.locale === localeParam);
  }, [editionMatrix?.items, marketData?.items, requestedSharedSource, requestedUrlTarget, sharedSource, urlTargetAwaitingCatalogues]);
  const requestedUrlTargetInvalid = Boolean(
    requestedUrlTarget && !urlTargetAwaitingCatalogues && !requestedExactEdition,
  );
  useEffect(() => {
    if (selectedMarket || !requestedExactEdition) return;
    setSelectedMarket(requestedExactEdition.market);
    setSelectedLocale(requestedExactEdition.locale);
  }, [requestedExactEdition, selectedMarket]);
  useEffect(() => {
    // Matrix deep links are explicit workflow instructions. Do not select a
    // tab until both catalogues verified the market address and the exact
    // document has loaded; otherwise a stale shared/default response could
    // put the reviewer in controls for another edition.
    if (!requestedFocus || urlTargetAwaitingCatalogues || !requestedExactEdition || !doc
      || selectedMarket !== requestedExactEdition.market || selectedLocale !== requestedExactEdition.locale) return;
    const targetId = requestedFocus === "review" ? "review-controls"
      : requestedFocus === "editions" ? "edition-controls"
        : "document-title";
    setActiveSideTab(requestedFocus === "editions" ? "editions" : "metadata");
    requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest" });
    });
  }, [doc, requestedExactEdition, requestedFocus, selectedLocale, selectedMarket, urlTargetAwaitingCatalogues]);
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
  // The legacy availability pointer identifies the internal shared-source
  // edition only when the selected address has no managed materialization.
  // Shared/Adapted bindings materialize their own exact revisions (and can
  // intentionally share the source market/locale), so their submit/publish
  // actions must use that exact revision rather than the legacy source token.
  const selectedIsSharedSource = Boolean(
    sharedSource
    && selectedMarket === sharedSource.market
    && selectedLocale === sharedSource.locale
    && !selectedIsManagedMaterializedEdition,
  );
  const issuePreviewForOperation = useCallback((operation: PreviewOperation, target: PreviewTarget) => {
    if (previewOperationRef.current !== operation || !mountedRef.current) {
      closePreviewPlaceholder(operation.placeholder);
      return;
    }
    operation.target = { ...target };
    setPreviewingRevisionId(target.revisionId);
    let request: ReturnType<typeof previewDocument>;
    try {
      request = previewDocument(id!, target);
    } catch (error) {
      request = Promise.reject(error);
    }
    void request
      .then((result) => {
        if (previewOperationRef.current !== operation || !mountedRef.current) {
          closePreviewPlaceholder(operation.placeholder);
          return;
        }
        if (!result?.previewUrl) {
          throw new Error("The protected preview capability did not include a preview URL.");
        }
        if (!previewResponseMatchesTarget(result, target)) {
          throw new Error("The protected preview did not return the requested saved market, locale, and revision.");
        }
        setPreviewFailure(null);
        const opened = navigateReservedPreview(operation.placeholder, result.previewUrl);
        if (!opened) {
          setPreviewFallback({
            previewUrl: result.previewUrl,
            target,
            revisionNumber: result.revisionNumber,
          });
          toast({
            title: "Preview is ready",
            description: "The preview tab was blocked or closed. Use the persistent link below to open this saved revision.",
          });
        } else {
          toast({
            title: "Saved revision preview opened",
            description: `Revision ${result.revisionNumber} · ${target.market.toUpperCase()} · ${target.locale}`,
          });
        }
      })
      .catch((error: unknown) => {
        if (previewOperationRef.current !== operation || !mountedRef.current) {
          closePreviewPlaceholder(operation.placeholder);
          return;
        }
        closePreviewPlaceholder(operation.placeholder);
        setPreviewFallback(null);
        const actionFailure = describeActionError(error);
        const status = error && typeof error === "object" && typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : undefined;
        const detail = error instanceof Error ? error.message : actionFailure.message;
        setPreviewFailure({
          target,
          wasSaved: operation.wasSaved,
          detail,
          sharedDestinationAuthority: status === 403
            && selectedIsSharedSource
            && selectedBindingMode === "unbound",
        });
        toast({
          title: "Preview could not be issued",
          description: detail,
          variant: "destructive",
        });
      })
      .finally(() => finishPreviewOperation(operation));
  }, [finishPreviewOperation, id, selectedBindingMode, selectedIsSharedSource, toast]);

  // The visual workspace previews the same immutable saved target, but does
  // not need a second popup reservation because it renders into its iframe.
  const requestIndustryPreview = useCallback(async () => {
    const target = capturePreviewTarget();
    if (!target) throw new Error("Save a valid exact edition revision before previewing.");
    const result = await previewDocument(id!, target);
    if (!result?.previewUrl || !previewResponseMatchesTarget(result, target)) {
      throw new Error("The protected preview did not return the requested saved market, locale, and revision.");
    }
    return result;
  }, [capturePreviewTarget, id]);

  const selectedEditionBase = matrixSelectedEdition ?? (selectedIsSharedSource ? {
    market: sharedSource!.market,
    locale: sharedSource!.locale,
    exact: true,
    revisionId: sharedSource!.revisionId,
    revisionNumber: doc?.revisionNumber ?? null,
    workflowState: doc?.status ?? "draft",
    publicationState: doc?.status === "published" ? "published" : "draft",
  } as any : undefined);
  // The immutable target identity is returned by the exact document response.
  // Do not substitute a market catalogue ID: it is not an assignment target.
  const responseEditionId = (doc as (typeof doc & { editionId?: string | null }) | undefined)?.editionId;
  const selectedEditionId = selectedIsSharedSource
    ? sharedSource?.editionId
    : responseEditionId ?? null;
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
    && (selectedBindingMode === "adapted" || (!selectedSharedBinding && !selectedIsSharedSource)),
  );
  const pendingDestinationChanges = useMemo(
    () => (availabilityForReview?.items ?? []).filter((item) => item.pending),
    [availabilityForReview?.items],
  );
  const reviewedDestinationReleaseItems = useMemo(
    () => (availabilityForReview?.items ?? []).filter((item) => (
      item.reviewedDecision !== null && item.reviewedDecision !== item.publishedDecision
    )),
    [availabilityForReview?.items],
  );
  // Availability publication is independent from content/source publication.
  // In particular, an adapted target can have a live availability receipt
  // while the legacy shared-source pointer is null or points at another
  // revision.
  const hasPublishedAvailability = (availabilityForReview?.publishedVersion ?? 0) > 0;
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
    // A valid explicit deep link always wins over default/shared-source
    // selection. Deferring here prevents two initial effects racing in one
    // render and silently opening a different market.
    // An invalid explicit target must be shown as unavailable rather than
    // silently falling back to a different market.
    if (requestedExactEdition || urlTargetAwaitingCatalogues || requestedUrlTargetInvalid) return;
    // A legacy document has no authoritative shared address yet. Keep an
    // administrator on the explicit source-selection screen rather than
    // silently opening a historical customization first.
    if (!sharedSource) {
      // Shared-market baselines are optional for legacy content. Opening an
      // exact edition must not require an administrator to promote anything.
      const exact = editionMatrix?.items.find((item) => item.exact && item.revisionId);
      if (exact) {
        setSelectedMarket(exact.market);
        setSelectedLocale(exact.locale);
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
  }, [canManageSharedDestinations, editionMatrix?.items, legacyCustomizations, requestedExactEdition, requestedUrlTargetInvalid, selectedMarket, sharedSource, urlTargetAwaitingCatalogues]);
  // An internal shared-source edition deliberately has no assignable market
  // code. Its authority is the complete set of destinations it controls, not
  // the synthetic `shared-source` market identity.
  const canEditSelectedEdition = selectedIsSharedSource
    ? canManageSharedDestinations
    : canEditSelectedMarket;
  const canPublishSelectedEdition = canPublish && (
    !selectedIsSharedSource || canManageSharedDestinations
  );
  const selectedEditionIsPublished = selectedEdition?.publicationState === "published"
    || selectedEdition?.effectivePublicationState === "published";
  const selectedEditionIsApprovedPublished = selectedEditionIsPublished
    && (
      selectedEdition?.workflowState === "approved"
      || selectedEdition?.effectiveWorkflowState === "approved"
    );
  const reviewedDestinationReleaseCandidate = Boolean(
    selectedIsManagedMaterializedEdition
    && !selectedIsSharedSource
    && availabilityForReview?.reviewedVersion !== null
    && availabilityForReview?.reviewedVersion !== undefined
    && availabilityForReview.reviewedVersion !== availabilityForReview.publishedVersion,
  );
  const canPublishReviewedDestinations = reviewedDestinationReleaseCandidate
    && canPublish
    && canManageSharedDestinations
    && selectedEditionIsApprovedPublished
    && availabilityForReview?.reviewedVersion === availabilityForReview?.draftVersion
    && reviewedDestinationReleaseItems.length > 0
    && !availabilitySelectionActive;
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
  const editionIsArchived = doc?.status === "archived";
  const authoringActions = editionAuthoringActions(
    selectedEdition,
    canEditSelectedEdition && !editionIsArchived,
    canPublishSelectedEdition && !editionIsArchived,
    hasUnsaved,
    isAdministrator,
  );
  const selectedAvailability = availabilityForReview?.items.find((item) => (
    item.market === selectedMarket && item.locale === selectedLocale
  ));
  const readiness = useMemo(
    () => doc ? documentReadiness({
      kind: doc.kind as CmsDocumentKind,
      title,
      content,
      mediaIds,
      exact: Boolean(selectedEdition?.exact && selectedEdition.revisionId),
      readinessErrors: selectedEdition?.readinessErrors,
      readinessIssues: selectedEdition?.readinessIssues,
      workflowState: doc.status === "archived" ? "archived" : selectedEdition?.workflowState ?? doc.status,
      publicationState: selectedEdition?.effectivePublicationState ?? selectedEdition?.publicationState,
      hasUnsaved,
      canEdit: canEditSelectedEdition && !editionIsArchived,
      canPublish: canPublishSelectedEdition && !editionIsArchived,
      canRestore: canPublishSelectedEdition,
      availabilityPending: Boolean(selectedAvailability?.pending),
      availableInMarket: selectedAvailability?.publishedEffectiveAvailable,
    }) : [],
    [canEditSelectedEdition, canPublishSelectedEdition, content, doc, editionIsArchived, hasUnsaved, mediaIds, selectedAvailability?.pending, selectedAvailability?.publishedEffectiveAvailable, selectedEdition?.exact, selectedEdition?.readinessErrors, selectedEdition?.readinessIssues, selectedEdition?.revisionId, selectedEdition?.workflowState, selectedEdition?.publicationState, selectedEdition?.effectivePublicationState, title],
  );
  const { blockers: readinessBlockers, warnings: readinessWarnings } = readinessCounts(readiness);
  const readinessLabel = readinessBlockers
    ? `${readinessBlockers} readiness blocker${readinessBlockers === 1 ? "" : "s"}`
    : readinessWarnings
      ? `${readinessWarnings} readiness warning${readinessWarnings === 1 ? "" : "s"}`
      : "Ready for the next workflow step";
  const readinessHasIssues = readinessBlockers > 0 || readinessWarnings > 0;
  const readinessPanelId = "document-readiness-panel";
  const focusReadinessPanel = useCallback(() => {
    const panel = document.getElementById(readinessPanelId);
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    panel?.focus({ preventScroll: true });
  }, []);
  const focusReadinessTarget = useCallback((target: string, fallbackTarget?: string) => {
    window.setTimeout(() => {
      const element = document.getElementById(target) ?? (fallbackTarget ? document.getElementById(fallbackTarget) : null);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus({ preventScroll: true });
    }, 0);
  }, []);
  const handleReadinessAction = useCallback((issue: ReadinessIssue) => {
    switch (issue.action) {
      case "focus-title":
        focusReadinessTarget("document-title");
        return;
      case "focus-content-field":
        focusReadinessTarget(contentFieldId(issue.path), `${readinessPanelId}-${issue.id}`);
        return;
      case "focus-seo":
        setActiveSideTab("seo");
        focusReadinessTarget(issue.path === "seo.description"
          ? "seo-description"
          : issue.path === "seo.canonicalUrl"
            ? "seo-canonical-url"
            : "seo-title");
        return;
      case "open-editions":
        setActiveSideTab("editions");
        focusReadinessTarget("editions-readiness-anchor");
        return;
      case "open-review-comments":
        setActiveSideTab("metadata");
        focusReadinessTarget("review-comment");
        return;
      case "focus-restore":
        focusReadinessTarget("restore-draft");
        return;
      case "focus-save":
        focusReadinessTarget("save-draft");
        return;
      case "focus-submit-review":
        focusReadinessTarget("submit-review");
        return;
      case "review-access":
        focusReadinessTarget(`${readinessPanelId}-${issue.id}`);
        return;
    }
  }, [focusReadinessTarget]);
  const fieldIssue = (path: string) => saveIssues.find((issue) => issue.path === path)?.message;
  const editorHydrated = hydratedEditionKey.current === currentEditorKey.current && hydratedRevision.current !== undefined;
  const editorLocked = !editorHydrated || updateDoc.isPending || resettingSharedField || saveSharedOverrides.isPending || previewingRevisionId !== null || authoringActions.immutable
    || !canEditSelectedEdition;

  const handleSave = (intent: "save" | "save-preview" = "save") => {
    if (!doc || editorLocked || !editorHydrated || saveBlocked || previewOperationRef.current || previewingRevisionId !== null) return;
    if (intent === "save-preview" && !hasUnsaved) {
      void openPreview();
      return;
    }
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
    setPreviewFallback(null);
    setPreviewFailure(null);
    let pendingPreviewOperation: PreviewOperation | undefined;
    if (intent === "save-preview") {
      const placeholder = reservePreviewWindow();
      pendingPreviewOperation = beginPreviewOperation({ market: selectedMarket, locale: selectedLocale }, placeholder);
    }
    if (intent === "save-preview" && !pendingPreviewOperation) return;
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
        if (!mountedRef.current || operation !== saveSequence.current || editorKey !== currentEditorKey.current || hydratedRevision.current !== submittedRevision) {
          abortPreviewOperation(pendingPreviewOperation);
          return;
        }
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
          abortPreviewOperation(pendingPreviewOperation);
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
        setPendingOverridePaths([]);
        queryClient.setQueryData(getGetDocumentQueryKey(id!, targetParams), updated);
        if (selectedIsSharedSource) {
          queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(id!) });
        }
        queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
        // The API derives sparse adapted overrides from this ordinary PATCH.
        // Refresh lineage without routing this save through the shared endpoint.
        queryClient.invalidateQueries({ queryKey: getGetSharedMarketEditionMatrixQueryKey(id!) });
        queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("documents") || String(query.queryKey[0]).includes("published") });
        toast({ title: `${selectedMarket.toUpperCase()} edition saved successfully` });
         if (intent === "save-preview" && updated.currentRevisionId && pendingPreviewOperation) {
           pendingPreviewOperation.wasSaved = true;
           setPreviewRevisionId(updated.currentRevisionId);
           issuePreviewForOperation(pendingPreviewOperation, {
             market: targetParams.market,
             locale: targetParams.locale,
             revisionId: updated.currentRevisionId,
           });
         } else {
           abortPreviewOperation(pendingPreviewOperation);
         }
      },
      onError: (err) => {
        abortPreviewOperation(pendingPreviewOperation);
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

  const invalidateSharedEdition = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetSharedMarketEditionMatrixQueryKey(id!) });
    queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) });
    queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) });
    queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(id!, documentParams) });
  }, [documentParams, id, queryClient]);

  const snapshotForSharedBaseline = () => {
    if (!doc) return undefined;
    const prepared = buildDraftSave(doc.kind as CmsDocumentKind, {
      slug: doc.slug, title, summary, content, mediaIds, markets: doc.markets,
    }, seo, seoOriginallyPresent);
    if (!prepared.success) {
      setSaveIssues(prepared.issues);
      toast({ title: "Cannot create baseline", description: prepared.issues[0]?.message ?? "Fix the current draft fields first.", variant: "destructive" });
      return undefined;
    }
    return prepared.snapshot as Record<string, unknown>;
  };

  const resetSharedField = async (path: string) => {
    if (!doc || !selectedSharedBinding?.id || !selectedSharedBinding.baselineRevisionId) return;
    if (editorLocked || hasUnsavedRef.current || hasUnsaved || saveBlocked
      || preserveAfterFailedSave.current || availabilitySelectionActive) {
      toast({ title: "Save your changes before resetting a field", description: "A reset creates a saved revision. Save or discard your other edits first so they cannot be overwritten.", variant: "destructive" });
      return;
    }
    setResettingSharedField(true);
    let operations: SharedMarketOverride[];
    try {
      const comparison = await compareSharedMarketBaseline(id!, selectedSharedBinding.id);
      if (comparison.binding.version !== selectedSharedBinding.version
        || comparison.binding.baselineRevisionId !== selectedSharedBinding.baselineRevisionId) {
        throw new Error("This market edition changed. Reload it before resetting a field.");
      }
      operations = resetSharedOverridePath(
        comparison.previousSnapshot,
        selectedSharedBinding.operations as SharedMarketOverride[],
        path,
        doc.kind as CmsDocumentKind,
      ) as SharedMarketOverride[];
    } catch (error) {
      setResettingSharedField(false);
      toast({ title: "Could not reset shared field", description: error instanceof Error ? error.message : "The adopted baseline could not be loaded.", variant: "destructive" });
      return;
    }
    saveSharedOverrides.mutate({
      documentId: id!,
      bindingId: selectedSharedBinding.id,
      data: { version: selectedSharedBinding.version, baselineRevisionId: selectedSharedBinding.baselineRevisionId, operations },
    }, {
      onSuccess: async () => {
        // Rehydrate the exact server materialization, including stable-ID
        // nested fields. Never clear unrelated dirty state in this callback.
        setPendingOverridePaths([]);
        try {
          await queryClient.invalidateQueries(
            { queryKey: getGetDocumentQueryKey(id!, documentParams), exact: true },
            { throwOnError: true },
          );
          invalidateSharedEdition();
          toast({ title: "Field reset to its frozen shared baseline" });
        } catch {
          setSaveBlocked(true);
          toast({ title: "Reset saved; reload the edition before editing", description: "The saved revision could not be reloaded. Your editor has not been treated as the new saved snapshot.", variant: "destructive" });
        } finally {
          setResettingSharedField(false);
        }
      },
      onError: (error: any) => {
        setResettingSharedField(false);
        toast({ title: "Could not reset shared field", description: error?.data?.error || error?.error || error?.message, variant: "destructive" });
      },
    });
  };

  useEffect(() => {
    if (!sharedComparison) return;
    const read = (snapshot: Record<string, unknown>, path: string) => {
      try { return readSharedOverridePath(snapshot, path); } catch { return undefined; }
    };
    const byConflictId = new Map<string, { conflictId: string; path: string; message: string }>();
    for (const conflict of sharedComparison.conflicts) {
      const previous = byConflictId.get(conflict.conflictId);
      byConflictId.set(conflict.conflictId, {
        conflictId: conflict.conflictId,
        path: conflict.path,
        message: previous ? `${previous.message} ${conflict.message}` : conflict.message,
      });
    }
    setCompareConflicts([...byConflictId.values()].map((conflict) => ({
      conflictId: conflict.conflictId,
      path: conflict.path,
      previouslyAdopted: read(sharedComparison.previousSnapshot, conflict.path),
      newShared: read(sharedComparison.currentSnapshot, conflict.path),
      localOverride: read(sharedComparison.localSnapshot, conflict.path),
      message: conflict.message,
    })));
  }, [sharedComparison]);

  const selectEdition = (market: string, locale: string) => {
    if (updateDoc.isPending || resettingSharedField || saveSharedOverrides.isPending || previewingRevisionId !== null) return;
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
    setPendingOverridePaths([]);
    setSelectedMarket(market);
    setSelectedLocale(locale);
    setPreviewingRevisionId(null);
    setPreviewFallback(null);
    setPreviewFailure(null);
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
    if (updateDoc.isPending || previewingRevisionId !== null) return;
    if ((hasUnsavedRef.current || saveBlocked || preserveAfterFailedSave.current || availabilitySelectionActive)
      && !window.confirm("Discard local changes or a destination selection and leave this editor?")) return;
    setLocation(destination);
  };

  const downloadLocalDraft = () => {
    if (!doc || !id) return;
    const recovery = createDraftRecoveryExport(
      {
        slug: doc.slug,
        title,
        summary,
        content,
        seo,
        mediaIds,
        markets: doc.markets,
      },
      {
        editorKey: `${id}:${selectedMarket}:${selectedLocale}`,
        kind: doc.kind,
        market: selectedMarket,
        locale: selectedLocale,
        revisionId: doc.currentRevisionId,
      },
    );
    if (!downloadDraftRecovery(recovery)) {
      toast({
        title: "Local draft download unavailable",
        description: "Your local inputs remain in this editor. Use a browser that permits downloads and try again.",
        variant: "destructive",
      });
    }
  };

  const publishReviewedDestinations = () => {
    const version = availabilityForReview?.reviewedVersion;
    if (
      !canPublishReviewedDestinations
      || !availabilityForReview
      || version === null
      || version === undefined
    ) return;
    publishAvailability.mutate({ documentId: id!, data: { version } }, {
      onSuccess: (released) => {
        queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(id!), released);
        setPublishAvailabilityOpen(false);
        toast({
          title: "Reviewed destinations published",
          description: "The reviewed destination snapshot is now live. Content publication was not changed.",
        });
      },
      onError: (error: unknown) => {
        const failure = describeActionError(error);
        setActionError(failure);
        toast({
          title: "Reviewed destinations could not be published",
          description: failure.message,
          variant: "destructive",
        });
      },
    });
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
    setPendingOverridePaths([]);
    abortPreviewOperation(previewOperationRef.current ?? undefined);
    setPreviewingRevisionId(null);
    setPreviewFallback(null);
    setPreviewFailure(null);
    queryClient.resetQueries({ queryKey: getGetDocumentQueryKey(id!, documentParams), exact: true });
  };

  const navigationOnlyState = (message: string, loading = false, detail?: ReactNode) => (
    <div className="h-full p-8">
       <Button variant="ghost" onClick={() => leaveEditor("/content")} disabled={updateDoc.isPending || previewingRevisionId !== null} className="mb-8">
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
  if (requestedUrlTargetInvalid) {
    return navigationOnlyState(
      `The requested ${requestedUrlTarget!.marketParam.toUpperCase()} · ${requestedUrlTarget!.localeParam} edition is unavailable or has no exact revision. No other market was opened.`,
    );
  }
  if (selectedMarket && isDocumentLoading) {
    return navigationOnlyState(`Loading ${selectedMarket.toUpperCase()} · ${selectedLocale}…`, true);
  }
  if (isDocumentError) {
    const status = (documentError as { status?: number })?.status;
    return navigationOnlyState(
      status === 403
        ? "You do not have permission to open this edition. No other market was opened; return to content to choose an edition assigned to you."
        : `This edition could not be loaded. ${(documentError as any)?.error ?? (documentError as Error)?.message ?? ""}`,
    );
  }
  if (!doc) {
    if (!sharedSource && (isAdministrator || legacyCustomizations.length)) {
      return navigationOnlyState(
        "No explicit shared source is configured. This does not make independent market editions legacy: existing exact editions remain valid and editable. An administrator may select a historical source only when shared content or shared destinations are needed.",
        false,
        <div className="mt-6 space-y-2 border-t pt-4 text-left">
          {isAdministrator && (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
              <Label htmlFor="legacy-shared-source" className="text-xs font-semibold">Explicitly select a shared source from a historical revision</Label>
              <p className="text-[10px] text-amber-900">This is source selection, not neutral-baseline setup. Open any exact edition and use Shared edition → Save neutral baseline when a baseline is deliberately required.</p>
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
                Create a shared source from an exact historical revision
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
    if (updateDoc.isPending || previewingRevisionId !== null || reviewAvailability.isPending || submittingSharedReview || availabilitySelectionActive) return;
    setPreviewFallback(null);
    setPreviewFailure(null);
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
           title: action === "publish" && !["in-review", "approved"].includes(selectedEdition?.workflowState ?? "")
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
             : action === "publish" && !["in-review", "approved"].includes(selectedEdition?.workflowState ?? "")
               ? "The server released this exact saved revision after rechecking publication governance."
               : action === "publish" && selectedIsSharedSource
                 ? "The server released this exact reviewed source revision and its reviewed destination selection together."
                : action === "publish"
                    ? "Only this customization revision was published. Reviewed destination choices can be released separately from the Editions tab."
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
    setPreviewFallback(null);
    setPreviewFailure(null);
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

  const handleDeleteDocument = () => {
    // canPermanentlyDelete is projected by the API from publication/history
    // state. Do not infer eligibility from the visible workflow label.
    if (!doc || doc.kind === "office" || !doc.canPermanentlyDelete || !canPublish || updateDoc.isPending || deleteDoc.isPending) return;
    deleteDoc.mutate({ documentId: id! }, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (query) => String(query.queryKey[0]).includes("documents")
            || String(query.queryKey[0]).includes("published"),
        });
        toast({
          title: "Document deleted",
          description: "The eligible unpublished document and its draft history were permanently deleted.",
        });
        setRemoveDocumentOpen(false);
        setLocation(documentListPath(doc.kind as CmsDocumentKind));
      },
      onError: (error: any) => {
        toast({
          title: "Document deletion failed",
          description: error?.data?.error || error?.error || error?.message || "The server did not allow permanent deletion. Published or history-bearing content was not changed.",
          variant: "destructive",
        });
      },
    });
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

  const openPreview = () => {
    if (previewOperationRef.current || previewingRevisionId !== null) return;
    const target = capturePreviewTarget();
    if (!target) {
      toast({ title: "Preview unavailable", description: "Save a valid edition revision first.", variant: "destructive" });
      return;
    }
    const operation = beginPreviewOperation(target, reservePreviewWindow());
    if (!operation) return;
    setPreviewRevisionId(target.revisionId);
    issuePreviewForOperation(operation, target);
  };

  const retrySavedPreview = () => {
    const failure = previewFailure;
    if (!failure || saveBlocked || updateDoc.isPending || previewOperationRef.current || previewingRevisionId !== null) return;
    const target = { ...failure.target };
    const operation = beginPreviewOperation(target, reservePreviewWindow(), failure.wasSaved);
    if (!operation) return;
    issuePreviewForOperation(operation, target);
  };

  // Data for comparison
  const compareRev1 = revisionsData?.items.find(r => r.id === selectedRevs[0]);
  const compareRev2 = revisionsData?.items.find(r => r.id === selectedRevs[1]);
  const [baseRev, targetRev] = [compareRev1, compareRev2].sort((a, b) => (a?.number || 0) - (b?.number || 0));

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden bg-muted/10">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 flex min-h-16 flex-none flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-3 sm:flex-nowrap sm:justify-between sm:px-6 sm:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
           <Button variant="ghost" size="icon" disabled={updateDoc.isPending || previewingRevisionId !== null} onClick={() => leaveEditor(doc.kind === "case-study" ? "/case-studies" : doc.kind === "industry" ? "/industries" : doc.kind === "framework" ? "/frameworks" : doc.kind === "site-configuration" ? "/contact-settings" : `/${doc.kind}s`)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border"></div>
           <div className="min-w-0">
             <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
         <div className="grid w-full min-w-0 max-w-full grid-cols-2 items-stretch gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
            <button
              type="button"
              aria-controls={readinessPanelId}
              onClick={focusReadinessPanel}
             aria-live="polite"
             data-testid="readiness-summary"
              className={`hidden rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-wider underline-offset-2 hover:underline sm:block ${readinessBlockers ? "border-destructive/40 bg-destructive/5 text-destructive" : readinessHasIssues ? "border-amber-400/50 bg-amber-50 text-amber-800" : "border-emerald-400/50 bg-emerald-50 text-emerald-800"}`}
           >
             {readinessLabel}
            </button>
             <Button variant="outline" size="sm" onClick={openPreview} disabled={hasUnsaved || previewingRevisionId !== null} className="h-auto min-h-8 w-full min-w-0 max-w-full whitespace-normal px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider sm:w-auto sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-xs">
             {previewingRevisionId ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Eye className="w-3.5 h-3.5 mr-2" />} {doc.kind === "framework" ? "Preview buyer view" : doc.kind === "office" ? "Preview contact card" : "Preview"}
          </Button>

          <Button
              id="save-draft"
             onClick={() => handleSave()}
             disabled={!editorHydrated || updateDoc.isPending || previewingRevisionId !== null || saveBlocked || !authoringActions.canSave}
            size="sm"
            variant="default"
             className="h-auto min-h-8 w-full min-w-0 max-w-full whitespace-normal px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider sm:w-auto sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-xs"
          >
            {updateDoc.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin"/> : <Save className="w-3.5 h-3.5 mr-2" />}
            {selectedEdition?.workflowState === "approved" ? "Start New Draft" : "Save Draft"}
          </Button>
           <Button
             type="button"
             variant="outline"
             size="sm"
             onClick={() => handleSave("save-preview")}
             disabled={!editorHydrated || updateDoc.isPending || previewingRevisionId !== null || saveBlocked || (!authoringActions.canSave && hasUnsaved)}
               className="h-auto min-h-8 w-full min-w-0 max-w-full whitespace-normal px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider sm:w-auto sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-xs"
             title="Save the current inputs, then open the protected preview for the exact returned revision"
           >
             {previewingRevisionId ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Eye className="w-3.5 h-3.5 mr-2" />}
             Save and preview
           </Button>

          {authoringActions.canSubmit && (
                <Button id="submit-review" variant="outline" size="sm" onClick={() => handleAction("submit")} disabled={updateDoc.isPending || previewingRevisionId !== null || submitDoc.isPending || reviewAvailability.isPending || submittingSharedReview || !contentValidation.success} className="h-auto min-h-8 w-full min-w-0 max-w-full whitespace-normal px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider sm:w-auto sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-xs">
              <Send className="w-3.5 h-3.5 mr-2" /> Submit Review
            </Button>
          )}
          {authoringActions.canPublish && (
               <Button size="sm" onClick={() => {
                setPublishRevisionId(selectedEdition?.revisionId ?? null);
                setPublishAvailabilityVersion(selectedIsSharedSource ? availabilityForReview?.draftVersion ?? null : null);
                setPublishOpen(true);
                 }} disabled={updateDoc.isPending || previewingRevisionId !== null || reviewAvailability.isPending || submittingSharedReview || !contentValidation.success} className="h-auto min-h-8 w-full min-w-0 max-w-full whitespace-normal bg-emerald-600 px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider text-white hover:bg-emerald-700 sm:w-auto sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-xs">
              <Globe className="w-3.5 h-3.5 mr-2" /> Publish...
            </Button>
          )}
           {isAdministrator && doc.kind === "office" && doc.status !== "archived" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemoveOfficeOpen(true)}
                disabled={updateDoc.isPending || previewingRevisionId !== null || archiveDoc.isPending || deleteDoc.isPending}
              className="h-auto min-h-8 w-full min-w-0 max-w-full whitespace-normal px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider text-destructive hover:text-destructive sm:w-auto sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-xs"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove office
            </Button>
          )}
           {canPublish && doc.kind !== "office" && doc.canPermanentlyDelete && (
             <Button
               variant="outline"
               size="sm"
               onClick={() => setRemoveDocumentOpen(true)}
               disabled={updateDoc.isPending || previewingRevisionId !== null || deleteDoc.isPending}
                 className="h-auto min-h-8 w-full min-w-0 max-w-full whitespace-normal px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider text-destructive hover:text-destructive sm:w-auto sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-xs"
               title="Permanently delete this document because the server marked it eligible"
             >
               <Trash2 className="mr-2 h-4 w-4" /> Delete draft
             </Button>
           )}
          {canPublish && doc.status === "archived" ? (
                <Button id="restore-draft" variant="outline" size="sm" onClick={() => handleAction("restore")} disabled={updateDoc.isPending || previewingRevisionId !== null || restoreDoc.isPending} className="h-auto min-h-8 w-full min-w-0 max-w-full whitespace-normal px-2 py-1 text-center font-mono text-[11px] uppercase leading-tight tracking-wider sm:w-auto sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-xs">
              <RotateCcw className="mr-2 h-4 w-4" /> Restore as draft
            </Button>
          ) : canPublish && doc.kind !== "office" ? (
                  <Button variant="ghost" size="sm" disabled={updateDoc.isPending || previewingRevisionId !== null} onClick={() => handleAction("archive")} className="w-full min-w-0 max-w-full text-muted-foreground hover:text-destructive sm:w-auto sm:flex-none" title="Archive Document">
                 <Archive className="w-4 h-4" />
               </Button>
          ) : null}
        </div>
         {previewFallback && (
           <div
             role="status"
             aria-live="polite"
             data-testid="preview-fallback"
             className="basis-full rounded border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:basis-auto"
           >
             <span>
               Preview ready for revision {previewFallback.revisionNumber} · {previewFallback.target.market.toUpperCase()} · {previewFallback.target.locale}.
             </span>{" "}
             <a
               href={previewFallback.previewUrl}
               target="_blank"
               rel="noopener noreferrer"
               referrerPolicy="no-referrer"
               data-testid="preview-fallback-link"
               className="font-medium underline"
             >
               Open saved revision preview
             </a>
           </div>
         )}
         {previewFailure && (
           <div
             role="alert"
             aria-live="assertive"
             data-testid="preview-failure"
             className="basis-full rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:basis-auto"
           >
             <p className="font-semibold">
               {previewFailure.wasSaved
                 ? "Saved successfully, but preview could not be issued."
                 : "Saved revision preview unavailable."}
             </p>
             <p className="mt-1">
               Target: {previewFailure.target.market.toUpperCase()} · {previewFailure.target.locale} · revision {previewFailure.target.revisionId}
             </p>
             <p className="mt-1">{previewFailure.detail}</p>
             {previewFailure.sharedDestinationAuthority && (
               <p className="mt-1">
                 This unbound shared source requires access to every enabled destination; individual market access cannot widen that authority.
               </p>
             )}
             <Button
               type="button"
               size="sm"
               variant="outline"
               className="mt-2 border-destructive/40 text-destructive hover:text-destructive"
               disabled={previewOperationRef.current !== null || previewingRevisionId !== null || saveBlocked || updateDoc.isPending}
               onClick={retrySavedPreview}
             >
               Retry saved revision preview
             </Button>
           </div>
         )}
      </header>

      {/* Main Content Area */}
       <div className={`min-h-0 min-w-0 flex-1 ${doc.kind === "industry" ? "overflow-y-auto flex flex-col" : "flex flex-col overflow-y-auto md:flex-row md:overflow-hidden"}`}>
        {/* Left Column: Editor */}
         <div className={`min-w-0 ${doc.kind === "industry" ? "w-full p-4 lg:p-8" : "flex-1 overflow-visible border-b border-border p-4 sm:p-6 md:overflow-y-auto md:border-b-0 md:border-r md:p-8 custom-scrollbar"}`}>
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
                Editing: <strong data-testid="editing-context">{!selectedMarket
                  ? "Awaiting exact edition"
                  : selectedIsCustomization
                    ? `Customization for ${selectedMarketConfig?.displayName ?? selectedMarket}`
                    : "Shared content"}</strong>
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
             <ReadinessPanel id={readinessPanelId} issues={readiness} onAction={handleReadinessAction} />
            <div>

              <FieldOverrideIndicator
                label="Display Title (required)"
                isOverride={Boolean(tracksSharedOverrides && (
                  selectedSharedBinding?.operations.some((operation) => operation.path === "title" || operation.path.startsWith("title."))
                  || pendingOverridePaths.includes("title")
                ))}
                canEdit={!editorLocked}
                onResetToShared={() => resetSharedField("title")}
              />
              <Input
                id="document-title"
                value={title}
                onChange={(e) => { hasUnsavedRef.current = true; if (tracksSharedOverrides) setPendingOverridePaths((paths) => paths.includes("title") ? paths : [...paths, "title"]); setTitle(e.target.value); }}
                disabled={editorLocked}
                maxLength={240}
                aria-invalid={Boolean(fieldIssue("title"))}
                aria-describedby={fieldIssue("title") ? "document-title-error" : "document-title-help"}
                className="min-w-0 max-w-full text-xl font-bold tracking-tight h-auto py-3 px-4 bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-sm sm:text-3xl"
              />
              <p id="document-title-help" className="mt-1 text-xs text-muted-foreground">{title.length}/240 characters</p>
              {fieldIssue("title") && <p id="document-title-error" className="mt-1 text-xs text-destructive">{fieldIssue("title")}</p>}
            </div>

            <div>

              <FieldOverrideIndicator
                label="Summary / Deck (optional)"
                isOverride={Boolean(tracksSharedOverrides && (
                  selectedSharedBinding?.operations.some((operation) => operation.path === "summary" || operation.path.startsWith("summary."))
                  || pendingOverridePaths.includes("summary")
                ))}
                canEdit={!editorLocked}
                onResetToShared={() => resetSharedField("summary")}
              />
              <Textarea
                id="document-summary"
                value={summary}
                onChange={(e) => { hasUnsavedRef.current = true; if (tracksSharedOverrides) setPendingOverridePaths((paths) => paths.includes("summary") ? paths : [...paths, "summary"]); setSummary(e.target.value); }}
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
              <div id="document-content" tabIndex={-1} className="outline-none">
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
              </div>
            ) : (
                      <div className="space-y-4"><DocumentEditorContext
          selectedMarket={selectedMarket}
          selectedLocale={selectedLocale}
          markets={(editionMatrix?.items ?? [])
            .filter((edition) => edition.exact && edition.revisionId)
            .map((edition) => ({
              market: edition.market,
              locale: edition.locale,
              displayName: marketData?.items.find((market) => market.code === edition.market)?.displayName ?? edition.market.toUpperCase(),
            }))}
          onSelectEdition={selectEdition}
          mode={selectedBindingMode}
          isPending={updateDoc.isPending || previewingRevisionId !== null}
          onCompare={() => {
            if (!selectedSharedBinding) return;
            setSharedCompareBinding(selectedSharedBinding);
            setSharedCompareOpen(true);
          }}
          readinessIssues={readiness}
          readinessPanelId={readinessPanelId}
          onOpenReadiness={focusReadinessPanel}
          workflowState={selectedEdition?.workflowState ?? doc.status}
          publicationState={selectedEdition?.effectivePublicationState ?? selectedEdition?.publicationState}
          availabilityPending={Boolean(availabilityForReview?.items.find((item) => item.market === selectedMarket && item.locale === selectedLocale)?.pending)}
          availableInMarket={availabilityForReview?.items.find((item) => item.market === selectedMarket && item.locale === selectedLocale)?.publishedEffectiveAvailable}
        />
        <SharedEditionPanel
          documentId={id!}
          matrix={sharedMatrix}
          markets={(marketData?.items ?? []).map((market) => ({
            id: market.id,
            code: market.code,
            displayName: market.displayName,
            defaultLocale: market.defaultLocale,
            fallbackLocale: market.fallbackLocale,
          }))}
          exactEditions={(editionMatrix?.items ?? []).filter((edition) => edition.exact).map((edition) => ({
            market: edition.market,
            locale: edition.locale,
            revisionId: edition.revisionId,
            revisionNumber: edition.revisionNumber,
          }))}
          selectedMarket={selectedMarket}
          selectedLocale={selectedLocale}
          currentRevisionId={doc.currentRevisionId}
          currentRevisionNumber={doc.revisionNumber}
          canEdit={canEditSelectedEdition}
          canManageBaselines={isAdministrator}
          hasUnsaved={hasUnsaved}
          busy={establishSharedBaseline.isPending || bindSharedEdition.isPending || saveSharedOverrides.isPending || resolveSharedBaseline.isPending}
          onSelectEdition={selectEdition}
          onEstablishBaseline={(sourceRevisionId, locale, expectedRevisionNumber) => {
            if (sourceRevisionId !== doc.currentRevisionId) {
              toast({ title: "Open the selected exact source first", description: "A neutral baseline is copied only from the exact revision currently displayed.", variant: "destructive" });
              return;
            }
            const snapshot = snapshotForSharedBaseline();
            if (!snapshot) return;
            establishSharedBaseline.mutate({ documentId: id!, data: { locale, sourceRevisionId, snapshot, expectedRevisionNumber } }, {
              onSuccess: () => { invalidateSharedEdition(); toast({ title: "Neutral baseline saved", description: "It is pinned to the selected exact source revision." }); },
              onError: (error: any) => toast({ title: "Baseline was not saved", description: error?.data?.error || error?.error || error?.message, variant: "destructive" }),
            });
          }}
          onEditBaseline={(baseline) => {
            setBaselineBeingEdited(baseline);
            setBaselineEditorOpen(true);
          }}
          onBind={({ marketEditionId, locale, mode, baseline, bindingBaselineId, bindingBaselineRevisionId, independentRevisionId, expectedDestinationRevisionId, expectedActiveBaselineRevisionId, translationSourceRevisionId, version }) => {
            bindSharedEdition.mutate({ documentId: id!, data: {
              marketEditionId, locale, mode, version,
              ...(mode === "independent" ? { independentRevisionId } : {
                baselineId: bindingBaselineId ?? baseline?.id ?? selectedSharedBinding?.baselineId ?? undefined,
                baselineRevisionId: bindingBaselineRevisionId ?? baseline?.revisionId ?? selectedSharedBinding?.baselineRevisionId ?? undefined,
                translationSourceRevisionId,
                expectedDestinationRevisionId,
                expectedActiveBaselineRevisionId,
              }),
            } }, {
              onSuccess: () => { invalidateSharedEdition(); toast({ title: `${mode} binding saved`, description: "The selected revision and lineage are frozen until explicitly changed." }); },
              onError: (error: any) => toast({ title: "Binding was not saved", description: error?.data?.error || error?.error || error?.message, variant: "destructive" }),
            });
          }}
          onCompare={(binding) => {
            setSharedCompareBinding(binding);
            setSharedCompareOpen(true);
          }}
          onResetOverride={resetSharedField}
          canEditDestination={(market) => hasAuthorRole && (
            isAdministrator || Boolean(session?.user?.marketCodes?.includes(market))
          )}
          onApplyReuse={async (baseline, requests) => {
            const outcomes = await Promise.all(requests.map(async (request) => {
              try {
                await bindSharedEdition.mutateAsync({
                  documentId: id!,
                  data: {
                    marketEditionId: request.marketEditionId,
                    locale: request.locale,
                    mode: "shared",
                    baselineId: baseline.id,
                    baselineRevisionId: baseline.revisionId,
                    expectedDestinationRevisionId: request.expectedDestinationRevisionId,
                    expectedActiveBaselineRevisionId: request.expectedActiveBaselineRevisionId,
                    version: request.version,
                  },
                });
                return {
                  key: request.key,
                  market: request.market,
                  locale: request.locale,
                  status: "success" as const,
                  message: request.replacesCustomization
                    ? "Customization replaced in a new draft; its prior revision remains in history."
                    : "Saved content is now used in a new draft.",
                };
              } catch (error) {
                return reuseFailureOutcome(request, error);
              }
            }));
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: getGetSharedMarketEditionMatrixQueryKey(id!) }),
              queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(id!) }),
              queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(id!) }),
            ]);
            return outcomes;
          }}
        />
        <EditionAssignmentControl
          editionId={selectedEditionId}
          documentId={id!}
          market={selectedMarket}
          locale={selectedLocale}
          currentRevisionId={doc.currentRevisionId}
          currentRevisionNumber={doc.revisionNumber}
          canRequestReview={doc.status === "in-review"}
          canManage={hasAuthorRole && canEditSelectedEdition}
          currentUser={session?.user ? { id: session.user.id, name: session.user.name } : undefined}
        />
<div id="document-content" tabIndex={-1} className="outline-none"><OverridesContext.Provider value={{
          isAdapted: tracksSharedOverrides,
          canEdit: !editorLocked,
          operations: (selectedSharedBinding?.operations ?? []) as SharedMarketOverride[],
          onOverride: (path) => setPendingOverridePaths((paths) => paths.includes(path) ? paths : [...paths, path]),
          onReset: resetSharedField,
        }}><fieldset disabled={editorLocked} className="contents"><ContentEditor
                kind={doc.kind as CmsDocumentKind}
                value={content}
                onChange={editorLocked ? () => {} : handleContentChange}
                errors={contentValidation.success ? [] : contentValidation.errors}
                readinessPaths={readiness.filter((issue) => issue.path.startsWith("content.")).map((issue) => issue.path)}
              /></fieldset></OverridesContext.Provider></div></div>
            )}
            {doc.kind !== "industry" && <details className="rounded-md border bg-muted/20 p-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider">Advanced structured view (read only)</summary>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(content, null, 2)}</pre>
            </details>}
          </div>
        </div>

        {/* Right Column: Metadata & Sidepanes */}
        <div className={doc.kind === "industry" ? "w-full shrink-0 border-t bg-card" : "w-full max-w-full shrink-0 border-t bg-card md:h-full md:w-[320px] md:border-l md:border-t-0"}>
          <Tabs value={activeSideTab} onValueChange={setActiveSideTab} className="flex min-w-0 flex-col md:h-full">
             <TabsList className="w-full shrink-0 justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0 h-12">
               <TabsTrigger value="metadata" disabled={updateDoc.isPending} className="shrink-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Metadata</TabsTrigger>
               <TabsTrigger value="seo" disabled={updateDoc.isPending} className="shrink-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">SEO{saveIssues.some((issue) => issue.path.startsWith("seo")) ? " !" : ""}</TabsTrigger>
               <TabsTrigger value="revisions" disabled={updateDoc.isPending} className="shrink-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Revisions</TabsTrigger>
               <TabsTrigger value="editions" disabled={updateDoc.isPending} className="shrink-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Editions</TabsTrigger>
            </TabsList>

             <TabsContent value="metadata" className="mt-0 flex-1 space-y-6 overflow-visible p-4 md:overflow-y-auto">
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
                  Destination availability is managed under “Show this content in”. Saved changes remain pending until you explicitly publish the reviewed snapshot from Editions.
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
              <div id="review-controls" tabIndex={-1} className="space-y-3 border-t pt-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Review comments</label>
                  <p className="mt-1 text-xs text-muted-foreground">Comments attach to the selected {selectedMarket.toUpperCase()} revision.</p>
                </div>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {(reviewComments ?? []).map((comment) => <p key={comment.id} className="rounded border bg-muted/20 p-2 text-xs">{comment.body}</p>)}
                </div>
                <Textarea id="review-comment" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Leave reviewer guidance…" rows={3} data-testid="textarea-review-comment" />
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

             <TabsContent value="editions" id="edition-controls" tabIndex={-1} className="mt-0 flex-1 space-y-4 overflow-visible p-4 md:overflow-y-auto">
              <div id="editions-readiness-anchor" tabIndex={-1}>
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
              {reviewedDestinationReleaseCandidate && (
                <div className="space-y-3 rounded-md border border-emerald-300 bg-emerald-50/60 p-3" data-testid="reviewed-destination-release">
                  <div>
                    <p className="text-xs font-semibold">Reviewed destination release</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Version {availabilityForReview?.reviewedVersion} is reviewed and targets the already-published exact edition
                      {" "}{selectedMarket.toUpperCase()} · {selectedLocale} (revision {selectedEdition?.revisionNumber ?? "current"}).
                      This release changes destination availability only; it does not publish or replace content.
                    </p>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {reviewedDestinationReleaseItems.map((item) => (
                      <li key={`${item.marketEditionId}-${item.locale}`}>
                        <strong>{item.displayName}{item.locale ? ` · ${item.locale}` : ""}</strong>
                        {": "}
                        {item.reviewedDecision === "show" ? "shown" : item.reviewedDecision === "off" ? "excluded" : "inherited"}
                        {" (live: "}
                        {item.publishedDecision === "show" ? "shown" : item.publishedDecision === "off" ? "excluded" : "inherited"}
                        {")"}
                      </li>
                    ))}
                  </ul>
                  {availabilityForReview?.reviewedVersion !== availabilityForReview?.draftVersion && (
                    <p className="text-xs text-amber-700">A newer destination draft exists. Send that current version for review before publishing destinations.</p>
                  )}
                  {!selectedEditionIsApprovedPublished && (
                    <p className="text-xs text-amber-700">
                      Approve and publish the selected exact edition first. Destination availability cannot release an unpublished or unapproved carrier.
                    </p>
                  )}
                  {!canPublishSelectedEdition && (
                    <p className="text-xs text-amber-700">Your assignment cannot release destinations for this selected edition.</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-600 text-emerald-800 hover:bg-emerald-100"
                    disabled={!canPublishReviewedDestinations || publishAvailability.isPending}
                    onClick={() => setPublishAvailabilityOpen(true)}
                    data-testid="button-publish-reviewed-destinations"
                  >
                    {publishAvailability.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Publish reviewed destinations
                  </Button>
                </div>
              )}
              {hasUnsaved && <p className="text-xs text-amber-700">Save shared content before creating a customization so it starts from this saved revision.</p>}
            </TabsContent>

             <TabsContent value="seo" className="mt-0 flex-1 space-y-4 overflow-visible p-4 md:overflow-y-auto">
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
                <p id="seo-description-help" className="text-[10px] text-muted-foreground">{typeof seo.description === "string" ? seo.description.length : 0}/300 characters</p>
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

             <TabsContent value="revisions" className="mt-0 flex flex-1 flex-col overflow-visible p-0 md:overflow-y-auto">
                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 p-3">
                 <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Select 2 to Compare</span>
                 <Button
                   size="sm"
                   variant="outline"
                   disabled={selectedRevs.length !== 2}
                   onClick={() => setCompareModalOpen(true)}
                    className="h-7 shrink-0 px-2 font-mono text-[10px] uppercase tracking-wider"
                 >
                   <GitCompare className="w-3 h-3 mr-1" /> Compare
                 </Button>
               </div>
                {editionRevisions.map(rev => (
                 <div key={rev.id} className="group flex gap-3 border-b border-border/50 p-4 transition-colors hover:bg-muted/30">
                    <Checkbox
                      checked={selectedRevs.includes(rev.id)}
                      onCheckedChange={(c) => handleRevCheckbox(!!c, rev.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 mb-1">
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

      <DocumentCompareModal
        isOpen={sharedCompareOpen}
        onOpenChange={(open) => {
          setSharedCompareOpen(open);
          if (!open) setSharedCompareBinding(null);
        }}
        comparison={sharedComparison}
        targetLabel={comparedMarket ? `${comparedMarket.displayName} · ${comparedSharedBinding?.locale}` : undefined}
        canResolve={canResolveComparedBinding}
        conflicts={compareConflicts}
        onResolveConflict={(conflictId, decision) => {
          setCompareConflicts(prev => prev.map(c => c.conflictId === conflictId ? { ...c, decision } : c));
        }}
        onApplyDecisions={() => {
          if (!comparedSharedBinding || !sharedComparison || !canResolveComparedBinding) return;
          const unresolved = compareConflicts.some((conflict) => !conflict.decision);
          if (unresolved) return;
          setIsApplyingDecisions(true);
          resolveSharedBaseline.mutate({
            documentId: id!,
            bindingId: comparedSharedBinding.id,
            data: {
              version: comparedSharedBinding.version,
              baselineRevisionId: sharedComparison.baselineRevisionId,
              action: "adopt",
              // The generated client may lag the server schema briefly; the
              // server requires a choice for every real conflict.
              conflictDecisions: compareConflicts.map((conflict) => ({
                conflictId: conflict.conflictId,
                choice: conflict.decision === "adopt" ? "shared" : "market",
              })),
            },
          }, {
            onSuccess: () => {
              setIsApplyingDecisions(false);
              setSharedCompareOpen(false);
              invalidateSharedEdition();
              toast({ title: "Shared update adopted into a new exact draft" });
            },
            onError: (error: any) => {
              setIsApplyingDecisions(false);
              toast({ title: "Shared update could not be resolved", description: error?.data?.error || error?.error || error?.message, variant: "destructive" });
            },
          });
        }}
        onResolve={(action) => {
          if (!comparedSharedBinding || !sharedComparison || !canResolveComparedBinding) return;
          if (action === "adopt" && compareConflicts.some((conflict) => !conflict.decision)) return;
          setIsApplyingDecisions(true);
          resolveSharedBaseline.mutate({
            documentId: id!,
            bindingId: comparedSharedBinding.id,
            data: {
              version: comparedSharedBinding.version,
              baselineRevisionId: sharedComparison.baselineRevisionId,
              action,
              ...(action === "adopt" ? { conflictDecisions: compareConflicts.map((conflict) => ({ conflictId: conflict.conflictId, choice: conflict.decision === "adopt" ? "shared" : "market" })) } : {}),
            },
          }, {
            onSuccess: () => {
              setIsApplyingDecisions(false);
              setSharedCompareOpen(false);
              invalidateSharedEdition();
              toast({ title: action === "detach" ? "Edition detached as independent" : `Shared baseline ${action}ed into a new draft` });
            },
            onError: (error: any) => {
              setIsApplyingDecisions(false);
              toast({ title: "Shared update could not be resolved", description: error?.data?.error || error?.error || error?.message, variant: "destructive" });
            },
          });
        }}
        isApplying={isApplyingDecisions || isSharedComparisonLoading}
      />
      <SharedBaselineEditor
        baseline={baselineBeingEdited}
        kind={doc.kind as CmsDocumentKind}
        open={baselineEditorOpen}
        busy={establishSharedBaseline.isPending}
        onOpenChange={setBaselineEditorOpen}
        onSave={(baseline, snapshot) => {
          if (!baseline.sourceRevisionId) {
            toast({ title: "Baseline source lineage is unavailable", description: "This legacy baseline cannot be edited until its exact source is restored.", variant: "destructive" });
            return;
          }
          establishSharedBaseline.mutate({
            documentId: id!,
            data: {
              locale: baseline.locale,
              sourceRevisionId: baseline.sourceRevisionId,
              expectedRevisionNumber: baseline.revisionNumber,
              snapshot,
            },
          }, {
            onSuccess: () => {
              setBaselineEditorOpen(false);
              setBaselineBeingEdited(null);
              // Baseline editing must not replace or rehydrate the regional
              // exact draft currently open in this editor.
              queryClient.invalidateQueries({ queryKey: getGetSharedMarketEditionMatrixQueryKey(id!) });
              toast({ title: "Shared baseline successor saved", description: "Regional drafts and live content are unchanged until an explicit resolution." });
            },
            onError: (error: any) => toast({
              title: "Shared baseline was not saved",
              description: error?.data?.error || error?.error || error?.message || "Your edited baseline remains open for review.",
              variant: "destructive",
            }),
          });
        }}
      />
      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review the revision conflict</AlertDialogTitle>
            <AlertDialogDescription>
               Another editor saved a newer revision. Your local inputs are still here. Review or download them before choosing to discard them and reload the latest exact revision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
             <Button type="button" variant="outline" onClick={downloadLocalDraft} data-testid="download-local-draft">
               <Download className="mr-2 h-3.5 w-3.5" /> Download local draft
             </Button>
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
                 ? "A revision was committed, but its confirmation did not complete normally. Your local inputs remain visible as evidence. Download them if needed, then reload the latest server revision before making another save."
                 : "The request outcome could not be confirmed. Your local inputs remain unchanged. Review or download them, then deliberately reload the latest server revision; do not retry against the old revision token."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
             <Button type="button" variant="outline" onClick={downloadLocalDraft} data-testid="download-local-draft">
               <Download className="mr-2 h-3.5 w-3.5" /> Download local draft
             </Button>
            <AlertDialogCancel>Keep reviewing local changes</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndReloadLatest}>Discard and reload latest</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={publishAvailabilityOpen} onOpenChange={setPublishAvailabilityOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish reviewed destinations?</AlertDialogTitle>
            <AlertDialogDescription>
              This releases only the reviewed destination snapshot. It does not publish content, change the shared-source pointer, or alter the selected exact revision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 rounded-md border bg-muted/20 p-3 text-xs">
            <p><strong>Reviewed version:</strong> {availabilityForReview?.reviewedVersion ?? "unavailable"}</p>
            <p><strong>Current target:</strong> {selectedMarket.toUpperCase()} · {selectedLocale} · revision {selectedEdition?.revisionNumber ?? "current"}</p>
            <div>
              <p className="font-semibold">Destination changes</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {reviewedDestinationReleaseItems.map((item) => (
                  <li key={`${item.marketEditionId}-${item.locale}`}>
                    {item.displayName}{item.locale ? ` · ${item.locale}` : ""}:{" "}
                    {item.reviewedDecision === "show" ? "shown" : item.reviewedDecision === "off" ? "excluded" : "inherited"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishAvailability.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={publishReviewedDestinations}
              disabled={!canPublishReviewedDestinations || publishAvailability.isPending}
              data-testid="button-confirm-publish-reviewed-destinations"
            >
              {publishAvailability.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Confirm destination release
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="w-[calc(100%-1rem)] p-4 sm:p-6">
          <DialogHeader>
             <DialogTitle>
               {!["in-review", "approved"].includes(selectedEdition?.workflowState ?? "")
                 ? "Publish Saved Draft"
                 : selectedIsSharedSource ? "Publish Shared Content" : "Publish Customization"}
             </DialogTitle>
            <DialogDescription className="font-mono text-xs mt-2">
                 {!["in-review", "approved"].includes(selectedEdition?.workflowState ?? "")
                   ? "Confirm direct administrator publication of this exact saved revision. The server will recheck content, media clearance, immutable version pins, and destination governance before releasing it."
                   : selectedIsSharedSource
                  ? "Confirm the reviewed snapshot. The selected content and destination choices below are released together; saving or review alone never changes the live website."
                   : "Confirm this selected customization revision. Destination choices are not released by customization publication; release a reviewed destination snapshot separately from the Editions tab."}
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
                          {" "}(<span>live: {!hasPublishedAvailability
                            ? "Not published yet"
                            : item.publishedEffectiveAvailable ? "shown" : "excluded"}</span>)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                       {!hasPublishedAvailability
                         ? !["in-review", "approved"].includes(selectedEdition?.workflowState ?? "") && isAdministrator
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
                     Only this selected edition will publish. Any destination changes remain pending and can be released separately from the Editions tab after review.
                  </p>
                </div>
              )}
              {selectedIsSharedSource && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                   {!["in-review", "approved"].includes(selectedEdition?.workflowState ?? "") && isAdministrator
                     ? "Direct administrator publishing captures this exact saved source revision and the current saved destination choices atomically. No separate destination-review action is required."
                     : "Shared publishing requires this exact saved source revision and its reviewed destination selection. Send destinations for review again whenever the source or a destination changes."}
                </p>
              )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button
              className="w-full whitespace-normal bg-emerald-600 font-mono text-xs uppercase leading-tight tracking-wider text-white hover:bg-emerald-700 sm:w-auto"
              onClick={() => handleAction("publish")}
              disabled={
                publishDoc.isPending
                || availabilitySelectionActive
                || !publishRevisionId
                || (selectedIsSharedSource && (
                   availabilityForReview?.sharedSource?.revisionId !== publishRevisionId
                   || (publishAvailabilityVersion === null
                     || publishAvailabilityVersion !== availabilityForReview?.draftVersion)
                   || (["in-review", "approved"].includes(selectedEdition?.workflowState ?? "")
                     && availabilityForReview?.reviewedVersion !== availabilityForReview?.draftVersion)
                ))
              }
            >
              {publishDoc.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
              Confirm Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeDocumentOpen} onOpenChange={setRemoveDocumentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {doc.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              The server marked this {doc.kind.replace("-", " ")} as eligible for permanent deletion because it has no protected publication history.
              This removes the document and its draft history and cannot be undone. Published or history-bearing content must use archive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDoc.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Permanently delete draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        <DialogContent className="flex h-[85vh] max-h-[90vh] min-h-0 w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="flex-none border-b border-border p-4 pb-3 sm:p-6 sm:pb-4">
            <DialogTitle className="flex items-start gap-2 pr-6 sm:items-center">
              <GitCompare className="w-5 h-5 text-primary" />
              Compare Revisions
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Comparing Revision {baseRev?.number} (Base) with Revision {targetRev?.number} (Target)
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/10 sm:flex-row">
            {/* Left: Base Rev */}
            <div className="min-h-0 flex-1 overflow-y-auto border-b border-border p-4 space-y-6 custom-scrollbar sm:border-b-0 sm:border-r sm:p-6">
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
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar sm:p-6">
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
