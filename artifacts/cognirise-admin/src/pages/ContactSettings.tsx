import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  getGetDocumentQueryKey,
  getGetDocumentAvailabilityQueryKey,
  getDocumentAvailability,
  getListDocumentEditionsQueryKey,
  getListDocumentsQueryKey,
  useCreateDocument,
  useGetDocument,
  useGetDocumentAvailability,
  useGetSession,
  useListDocumentEditions,
  useListDocuments,
  usePublishDocument,
  useReviewDocumentAvailability,
  useSubmitDocument,
  useUpdateDocument,
} from "@workspace/api-client-react";
import { CMS_CONTACT_EMAIL_DOCUMENT_SLUG } from "@workspace/api-zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, History, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { describeSaveFailure } from "./documents/draft-save";
import {
  contactEditionLabel,
  contactEmailFromDocument,
  contactPublicationAffectedDestinations,
  contactPublicationSnapshot,
  contactPublicationSnapshotMatches,
  contactPublishAvailabilityReady,
  contactSharedDestinationReviewReady,
  contactSharedReviewReady,
  type ContactPublicationMode,
  type ContactPublicationSnapshot,
  validContactEmail,
  withContactEmail,
} from "./contact-settings-state";
import { selectInitialExactEdition } from "./documents/edition-authoring";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const params = {
  kind: "site-configuration" as const,
  search: CMS_CONTACT_EMAIL_DOCUMENT_SLUG,
  page: 1,
  pageSize: 20,
};

function errorStatus(error: unknown) {
  return error && typeof error === "object" && typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : undefined;
}

function errorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as { data?: { error?: unknown; detail?: unknown } | string; message?: unknown };
  if (candidate.data && typeof candidate.data === "object") {
    if (typeof candidate.data.error === "string") return candidate.data.error;
    if (typeof candidate.data.detail === "string") return candidate.data.detail;
  }
  if (typeof candidate.data === "string" && candidate.data.trim()) return candidate.data;
  return typeof candidate.message === "string" && candidate.message.trim() ? candidate.message : fallback;
}

export default function ContactSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useGetSession();
  const documents = useListDocuments(params, {
    query: { queryKey: getListDocumentsQueryKey(params) },
  });
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const submitDocument = useSubmitDocument();
  const publishDocument = usePublishDocument();
  const reviewAvailability = useReviewDocumentAvailability();
  const existing = documents.data?.items.find(
    (document) => document.slug === CMS_CONTACT_EMAIL_DOCUMENT_SLUG,
  );
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null);
  const documentId = createdDocumentId ?? existing?.id ?? null;
  const [selectedMarket, setSelectedMarket] = useState("uae");
  const [selectedLocale, setSelectedLocale] = useState("en");
  const editionKey = `${documentId ?? ""}:${selectedMarket}:${selectedLocale}`;
  const editionKeyRef = useRef(editionKey);
  editionKeyRef.current = editionKey;
  const dirtyRef = useRef(false);
  const baselineRef = useRef<{ key: string; email: string } | null>(null);
  const hydratedKeyRef = useRef("");
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishRevisionId, setPublishRevisionId] = useState<string | null>(null);
  const [publishSnapshot, setPublishSnapshot] = useState<ContactPublicationSnapshot | null>(null);
  const [publishSharedSource, setPublishSharedSource] = useState(false);
  const [publishSnapshotLoading, setPublishSnapshotLoading] = useState(false);

  const editions = useListDocumentEditions(documentId ?? "", {
    query: {
      enabled: Boolean(documentId),
      queryKey: getListDocumentEditionsQueryKey(documentId ?? ""),
    },
  });
  const availability = useGetDocumentAvailability(documentId ?? "", {
    query: {
      enabled: Boolean(documentId),
      queryKey: getGetDocumentAvailabilityQueryKey(documentId ?? ""),
    },
  });
  const selectedEdition = editions.data?.items.find(
    (edition) => edition.market === selectedMarket && edition.locale === selectedLocale,
  );
  const documentQuery = useGetDocument(
    documentId ?? "",
    { market: selectedMarket, locale: selectedLocale },
    {
      query: {
        enabled: Boolean(documentId && selectedEdition?.exact && selectedEdition.revisionId),
        queryKey: getGetDocumentQueryKey(documentId ?? "", { market: selectedMarket, locale: selectedLocale }),
      },
    },
  );
  const document = documentQuery.data;
  const [submittingSharedReview, setSubmittingSharedReview] = useState(false);
  const actionPending = updateDocument.isPending
    || submitDocument.isPending
    || publishDocument.isPending
    || reviewAvailability.isPending
    || submittingSharedReview
    || publishSnapshotLoading;
  const actionPendingRef = useRef(actionPending);
  actionPendingRef.current = actionPending;
  const role = session?.user?.role;
  const canEdit = ["editor", "publisher", "administrator"].includes(role ?? "");
  const canPublish = role === "publisher" || role === "administrator";
  // The exact document response reflects the revision currently open. The
  // edition matrix can be briefly stale after review/save, so never let that
  // discovery cache hide a newly entered in-review state.
  const workflow = document?.status ?? selectedEdition?.workflowState;
  const activeRevisionId = document?.currentRevisionId ?? selectedEdition?.revisionId ?? null;
  const sharedSource = availability.data?.sharedSource;
  const availabilityResolved = availability.isFetched && !availability.isError && Boolean(availability.data);
  const isSharedSourceTarget = Boolean(
    sharedSource
    && sharedSource.market === selectedMarket
    && sharedSource.locale === selectedLocale,
  );
  const publishAvailabilityReady = contactPublishAvailabilityReady(
    isSharedSourceTarget,
    availabilityResolved,
    availability.data?.draftVersion,
    sharedSource?.revisionId,
    activeRevisionId,
  );
  const sharedReviewReady = contactSharedReviewReady(
    isSharedSourceTarget,
    availability.data,
  );
  const sharedEditReady = !isSharedSourceTarget || Boolean(availability.data?.canEditShared);
  const sharedPublicationMode: ContactPublicationMode = role === "administrator"
    && ["draft", "rejected"].includes(workflow ?? "")
    ? "direct"
    : "reviewed";
  const sharedPublicationReviewReady = !isSharedSourceTarget
    || sharedPublicationMode === "direct"
    || Boolean(
      availability.data
      && contactSharedDestinationReviewReady(availability.data),
    );
  const publishSnapshotMatchesLoaded = publishRevisionId === activeRevisionId
    && (!publishSharedSource
      || Boolean(
        publishSnapshot
        && availability.data
        && contactPublicationSnapshotMatches(
          publishSnapshot,
          availability.data,
          activeRevisionId ?? "",
        ),
      ));
  const canSave = Boolean(
    canEdit
    && document
    && selectedEdition?.exact
    && activeRevisionId
    && !actionPending
    && availabilityResolved
    && sharedEditReady
    && workflow !== "in-review"
    && hasUnsaved,
  );
  const canSubmit = Boolean(
    canEdit
    && document
    && selectedEdition?.exact
    && activeRevisionId
    && !actionPending
    && !hasUnsaved
    && availabilityResolved
    && sharedReviewReady
    && ["draft", "rejected"].includes(workflow ?? ""),
  );
  const canPublishCurrent = Boolean(
    canPublish
    && document
    && selectedEdition?.exact
    && activeRevisionId
    && !actionPending
    && !hasUnsaved
    && publishAvailabilityReady
    && sharedPublicationReviewReady
    && (workflow === "in-review" || (role === "administrator" && ["draft", "rejected"].includes(workflow ?? ""))),
  );

  useEffect(() => {
    if (!editions.data?.items.length || selectedEdition) return;
    const initial = selectInitialExactEdition(
      editions.data.items,
      role,
      session?.user?.marketCodes ?? [],
    );
    if (initial) {
      setSelectedMarket(initial.market);
      setSelectedLocale(initial.locale);
    }
  }, [editions.data?.items, role, selectedEdition, session?.user?.marketCodes]);

  // A background refetch must not replace the focused local input. The exact
  // edition key also prevents a previous market's response from hydrating a
  // newly selected regional panel.
  useEffect(() => {
    if (!document || !activeRevisionId) return;
    if (hydratedKeyRef.current === editionKey && dirtyRef.current) return;
    const nextEmail = contactEmailFromDocument(document);
    setEmail(nextEmail);
    baselineRef.current = { key: editionKey, email: nextEmail };
    hydratedKeyRef.current = editionKey;
    dirtyRef.current = false;
    setHasUnsaved(false);
    setFieldError(null);
  }, [activeRevisionId, document, editionKey]);

  useEffect(() => {
    const dirty = Boolean(
      baselineRef.current?.key === editionKey
      && email !== baselineRef.current.email,
    );
    dirtyRef.current = dirty;
    setHasUnsaved(dirty);
  }, [editionKey, email]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const protectNavigation = (event: MouseEvent) => {
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      if (actionPendingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (dirtyRef.current && !window.confirm("Discard unsaved contact changes and leave this screen?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    globalThis.document.addEventListener("click", protectNavigation, true);
    return () => globalThis.document.removeEventListener("click", protectNavigation, true);
  }, []);

  const switchEdition = (market: string, locale: string) => {
    if (market === selectedMarket && locale === selectedLocale) return;
    if (actionPending) return;
    if (dirtyRef.current && !window.confirm("Discard unsaved contact changes and switch edition?")) return;
    hydratedKeyRef.current = "";
    baselineRef.current = null;
    dirtyRef.current = false;
    setHasUnsaved(false);
    setFieldError(null);
    setActionError(null);
    setSelectedMarket(market);
    setSelectedLocale(locale);
  };

  const create = async () => {
    if (createDocument.isPending || !canEdit) return;
    setActionError(null);
    try {
      const created = await createDocument.mutateAsync({
        data: {
          kind: "site-configuration",
          title: "Public contact email",
          slug: CMS_CONTACT_EMAIL_DOCUMENT_SLUG,
          markets: ["uae"],
          content: {
            schemaVersion: 1,
            configuration: "contact-email",
            contactEmail: "hello@cognirise.ai",
          },
        },
      });
      setCreatedDocumentId(created.id);
      await queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(params) });
      toast({ title: "Contact setting initialized", description: "The new setting is a draft and is not public yet." });
    } catch (error) {
      // A second editor may win the singleton creation race. Refetch and
      // continue with that canonical record instead of leaving a dead-end.
      if (errorStatus(error) === 409) {
        const refreshed = await documents.refetch();
        const canonical = refreshed.data?.items.find((item) => item.slug === CMS_CONTACT_EMAIL_DOCUMENT_SLUG);
        if (canonical) {
          setCreatedDocumentId(canonical.id);
          toast({ title: "Contact setting already initialized", description: "Loaded the canonical record created by another editor." });
          return;
        }
      }
      setActionError(errorMessage(error, "Contact setting could not be created. Try again without changing existing content."));
    }
  };

  const save = async () => {
    if (!document || !activeRevisionId || !canSave) return;
    const targetKey = editionKeyRef.current;
    const submittedEmail = email.trim();
    if (!validContactEmail(submittedEmail)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    setFieldError(null);
    setActionError(null);
    try {
      const updated = await updateDocument.mutateAsync({
        documentId: document.id,
        data: {
          title: document.title,
          summary: document.summary ?? null,
          content: withContactEmail(document, submittedEmail),
          ...(document.seo ? { seo: document.seo } : {}),
          mediaIds: document.mediaIds ?? [],
          market: selectedMarket,
          locale: selectedLocale,
          revisionNumber: document.revisionNumber,
          expectedRevisionId: document.currentRevisionId ?? undefined,
        },
      });
      if (editionKeyRef.current !== targetKey) return;
      queryClient.setQueryData(
        getGetDocumentQueryKey(document.id, { market: selectedMarket, locale: selectedLocale }),
        updated,
      );
      await queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(document.id) });
      await queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(document.id) });
      baselineRef.current = { key: targetKey, email: submittedEmail };
      hydratedKeyRef.current = targetKey;
      dirtyRef.current = false;
      setHasUnsaved(false);
      toast({
        title: `Contact draft revision ${updated.revisionNumber} saved`,
        description: "Saving preserves the live address until an authorized publish.",
      });
    } catch (error) {
      if (editionKeyRef.current === targetKey) {
        const failure = describeSaveFailure(error);
        setActionError(failure.description);
      }
    }
  };

  const submitForReview = async () => {
    if (!document || !activeRevisionId || !canSubmit) return;
    const targetKey = editionKeyRef.current;
    if (isSharedSourceTarget) setSubmittingSharedReview(true);
    setActionError(null);
    try {
      if (isSharedSourceTarget) {
        // Shared content is reviewed together with its current destination
        // snapshot. Fetch it again so a background availability edit cannot
        // pair this revision with an older destination decision.
        const currentAvailability = await getDocumentAvailability(document.id);
        queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(document.id), currentAvailability);
        if (
          currentAvailability.sharedSource?.revisionId !== activeRevisionId
          || !currentAvailability.sharedSource
        ) {
          setActionError("The shared contact source changed while this screen was open. Reload the edition before reviewing it.");
          return;
        }
        if (!contactSharedDestinationReviewReady(currentAvailability)) {
          await reviewAvailability.mutateAsync({
            documentId: document.id,
            data: { version: currentAvailability.draftVersion },
          });
        }
      }
      const submitted = await submitDocument.mutateAsync({
        documentId: document.id,
        data: { revisionId: activeRevisionId },
      });
      if (editionKeyRef.current !== targetKey) return;
      queryClient.setQueryData(
        getGetDocumentQueryKey(document.id, { market: selectedMarket, locale: selectedLocale }),
        submitted,
      );
      toast({ title: "Contact revision submitted for review", description: "The public address is unchanged until publication." });
    } catch (error) {
      if (editionKeyRef.current === targetKey) setActionError(errorMessage(error, "Contact revision could not be submitted for review."));
    } finally {
      setSubmittingSharedReview(false);
    }
  };

  const openPublish = async () => {
    if (!canPublishCurrent || !document || !activeRevisionId || publishSnapshotLoading) return;
    const targetKey = editionKeyRef.current;
    const targetRevisionId = activeRevisionId;
    setActionError(null);
    setPublishRevisionId(targetRevisionId);
    setPublishSnapshot(null);
    setPublishSharedSource(isSharedSourceTarget);
    setPublishSnapshotLoading(true);
    try {
      if (!isSharedSourceTarget) {
        setPublishSnapshot(null);
        setPublishOpen(true);
        return;
      }
      const currentAvailability = await getDocumentAvailability(document.id);
      if (editionKeyRef.current !== targetKey) return;
      queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(document.id), currentAvailability);
      if (
        currentAvailability.sharedSource?.revisionId !== targetRevisionId
        || !currentAvailability.sharedSource
      ) {
        setActionError("The shared contact source changed while publication was opening. Reload the edition before confirming publication.");
        return;
      }
      if (
        sharedPublicationMode === "reviewed"
        && !contactSharedDestinationReviewReady(currentAvailability)
      ) {
        setActionError("Destination selections are not reviewed for this exact source revision. Send the shared revision for review again.");
        return;
      }
      setPublishSnapshot(contactPublicationSnapshot(
        currentAvailability,
        currentAvailability.sharedSource.revisionId,
        targetRevisionId,
        sharedPublicationMode,
      ));
      setPublishOpen(true);
    } catch (error) {
      if (editionKeyRef.current === targetKey) {
        setActionError(errorMessage(error, "Destination publication state could not be loaded. Try again before confirming publication."));
      }
    } finally {
      setPublishSnapshotLoading(false);
    }
  };

  const publish = async () => {
    if (
      !document
      || !publishRevisionId
      || publishRevisionId !== activeRevisionId
      || !canPublishCurrent
      || !publishSnapshotMatchesLoaded
    ) return;
    const targetKey = editionKeyRef.current;
    setActionError(null);
    try {
      let availabilityVersion: number | undefined;
      if (publishSharedSource !== isSharedSourceTarget) {
        setActionError("The publication target changed while confirmation was open. Reopen confirmation before publishing.");
        return;
      }
      if (publishSharedSource) {
        if (
          !publishSnapshot
          || publishSnapshot.mode !== sharedPublicationMode
          || publishSnapshot.revisionId !== publishRevisionId
        ) {
          setActionError("Publication confirmation is missing the exact destination snapshot. Reopen confirmation before publishing.");
          return;
        }
        const currentAvailability = await getDocumentAvailability(document.id);
        queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(document.id), currentAvailability);
        if (
          !currentAvailability.sharedSource
          || !contactPublicationSnapshotMatches(
            publishSnapshot,
            currentAvailability,
            publishRevisionId,
          )
        ) {
          setActionError("The shared source or destination snapshot changed while publication was open. Reopen confirmation before publishing.");
          return;
        }
        availabilityVersion = publishSnapshot.availabilityVersion;
      }
      const published = await publishDocument.mutateAsync({
        documentId: document.id,
        data: {
          revisionId: publishRevisionId,
          ...(availabilityVersion === undefined ? {} : { availabilityVersion }),
        },
      });
      if (editionKeyRef.current !== targetKey) return;
      const publishedDestinationSummary = publishSnapshot?.destinations
        .map((destination) => `${destination.displayName} · ${destination.market.toUpperCase()} · ${destination.locale} (${destination.decision === "off" ? "excluded" : "shown"})`)
        .join("; ");
      queryClient.setQueryData(
        getGetDocumentQueryKey(document.id, { market: selectedMarket, locale: selectedLocale }),
        published,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(document.id) }),
        queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(document.id) }),
      ]);
      setPublishOpen(false);
      setPublishRevisionId(null);
      setPublishSnapshot(null);
      setPublishSharedSource(false);
      toast({
        title: publishSharedSource
          ? "Contact source and destinations published"
          : "Contact revision published",
        description: publishSharedSource
          ? `Released source revision ${publishSnapshot?.sourceRevisionId} to ${publishedDestinationSummary} at availability version ${publishSnapshot?.availabilityVersion}.`
          : `Only the exact ${selectedMarket.toUpperCase()} · ${selectedLocale} customization was published.`,
      });
    } catch (error) {
      if (editionKeyRef.current === targetKey) setActionError(errorMessage(error, "Contact revision could not be published. Reload the latest revision before retrying."));
    }
  };

  const regionalEditions = useMemo(
    () => editions.data?.items ?? [],
    [editions.data?.items],
  );
  const customPublicationDestinations = useMemo(
    () => contactPublicationAffectedDestinations(false, selectedMarket, selectedLocale, null, "reviewed"),
    [selectedLocale, selectedMarket],
  );

  if (documents.isLoading && !documentId) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (documents.isError && !documentId) {
    return <div role="alert" className="p-8 text-destructive">The contact setting could not be loaded. Try again.</div>;
  }

  if (!documentId) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <Mail className="mb-4 h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Public contact email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Initialize the canonical governed contact setting once. The setting starts as a draft and must follow the normal review and publication gates.
          </p>
          {role === "viewer" ? (
            <p className="mt-6 text-sm">An editor or administrator must initialize this setting.</p>
          ) : (
            <Button className="mt-6" onClick={create} disabled={createDocument.isPending}>
              {createDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create contact setting
            </Button>
          )}
          {actionError && <p className="mt-4 text-sm text-destructive" role="alert">{actionError}</p>}
        </div>
      </div>
    );
  }

  const isLoadingEdition = editions.isLoading || (selectedEdition?.exact && documentQuery.isLoading);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.18em] text-muted-foreground">Website controls</p>
          <h1 className="mt-2 text-3xl font-semibold">Public contact email</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Edit the canonical contact address without opening the full content editor. Unrelated document fields and regional source decisions remain governed by the existing document.
          </p>
        </div>
        <Link href={`/content/${documentId}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <History className="h-4 w-4" />
          Open history and edition details
        </Link>
      </header>

      {isLoadingEdition && <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Loading this edition…</div>}
      {actionError && <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{actionError}</div>}

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Canonical address</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Current edition: {selectedMarket.toUpperCase()} · {selectedLocale}. Save creates a new governed revision; it never publishes by itself.
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs ${hasUnsaved ? "border-amber-300 bg-amber-50 text-amber-900" : "border-border bg-muted text-muted-foreground"}`}>
            {hasUnsaved ? "Unsaved changes" : document?.status ?? "Loading status"}
          </span>
        </div>
        {selectedEdition?.exact && document ? (
          <>
            <label className="mt-5 block text-sm font-medium" htmlFor="contact-email">
              Public website contact email
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldError(null);
                }}
                disabled={!canEdit || actionPending || workflow === "in-review" || !sharedEditReady}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "contact-email-error" : undefined}
                className="mt-1 block h-10 w-full rounded-md border bg-background px-3"
              />
            </label>
            {fieldError && <p id="contact-email-error" className="mt-2 text-sm text-destructive">{fieldError}</p>}
            {!canEdit && <p className="mt-2 text-xs text-muted-foreground">Your role can inspect this setting but cannot edit it.</p>}
            {workflow === "in-review" && <p className="mt-2 text-xs text-amber-700">This revision is in review and cannot be edited until it is approved or rejected.</p>}
            {isSharedSourceTarget && availabilityResolved && !sharedEditReady && (
              <p className="mt-2 text-xs text-amber-700">Editing this shared source requires authority across every affected market.</p>
            )}
            {isSharedSourceTarget && availabilityResolved && !sharedReviewReady && (
              <p className="mt-2 text-xs text-amber-700">Destination review for the shared source requires authority across every affected market.</p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={!canSave}>
                {updateDocument.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save draft
              </Button>
              <Button variant="outline" onClick={submitForReview} disabled={!canSubmit}>
                Send revision for review
              </Button>
              <Button variant="outline" onClick={openPublish} disabled={!canPublishCurrent}>
                Publish exact revision
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded border bg-muted/30 p-4 text-sm">
            This market and locale currently uses the shared contact source. Choose an exact local exception below to edit it, or use edition details for governed source/customization controls.
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Regional and localized editions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A local exception is edited and published independently. Fallback rows remain read-only here so one market cannot accidentally inherit another market&apos;s pending copy.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {regionalEditions.map((edition) => {
            const current = edition.market === selectedMarket && edition.locale === selectedLocale;
            const exact = edition.exact && Boolean(edition.revisionId);
            const sharedSourceEdition = Boolean(
              sharedSource
              && sharedSource.market === edition.market
              && sharedSource.locale === edition.locale,
            );
            return (
              <div key={`${edition.market}:${edition.locale}`} className={`rounded border p-3 ${current ? "border-primary ring-1 ring-primary/20" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{contactEditionLabel(edition, sharedSourceEdition)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {edition.publicationState ?? "not published"}{edition.workflowState ? ` · ${edition.workflowState}` : ""}
                    </p>
                  </div>
                  {exact && !current && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => switchEdition(edition.market, edition.locale)}
                      disabled={actionPending}
                    >
                      Edit edition
                    </Button>
                  )}
                  {current && <span className="text-xs font-medium text-primary">Selected</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Dialog
        open={publishOpen}
        onOpenChange={(open) => {
          if (!publishDocument.isPending && !publishSnapshotLoading) setPublishOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish contact revision?</DialogTitle>
            <DialogDescription>
              {publishSharedSource
                ? "This releases the exact shared source revision and its frozen destination snapshot together. Saving or review alone does not change the public website."
                : `This publishes the exact saved revision for ${selectedMarket.toUpperCase()} · ${selectedLocale}. Saving or sending it for review alone does not change the public address.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded border bg-muted/30 p-3 text-sm">
            <p>
              Revision <strong>{document?.revisionNumber}</strong>
              {publishSharedSource
                ? <> · source revision <code className="font-mono text-xs">{publishSnapshot?.sourceRevisionId ?? "loading…"}</code></>
                : <> · {selectedMarket.toUpperCase()} · {selectedLocale}</>}
            </p>
            {!publishSharedSource && (
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Publication impact · {customPublicationDestinations.length} exact destination:{" "}
                <strong className="text-foreground">
                  {customPublicationDestinations[0]?.displayName}
                </strong>
                . Destination availability choices remain unchanged.
              </p>
            )}
            {!publishSnapshotMatchesLoaded && (
              <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                The saved revision changed after this confirmation opened. Reopen confirmation to verify the exact publication target.
              </p>
            )}
            {publishSharedSource && publishSnapshot && (
              <>
                <div className="border-t pt-3">
                  <p className="font-medium">
                    Destination impact · {publishSnapshot.destinations.length} exact destinations
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Every enabled destination in this frozen shared snapshot is released together; this is not limited to the selected source market.
                  </p>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {publishSnapshot.destinations.map((destination) => (
                      <li key={`${destination.marketEditionId}-${destination.locale}`}>
                        <strong className="text-foreground">
                          {destination.displayName} · {destination.market.toUpperCase()} · {destination.locale}
                        </strong>
                        {" — "}
                        {destination.decision === "off" ? "excluded" : "shown"}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  Frozen availability version <code className="font-mono">{publishSnapshot.availabilityVersion}</code>.
                  {publishSnapshot.mode === "direct"
                    ? " Direct administrator publication will release the staged choices atomically."
                    : " Reviewed publication will release the reviewed choices atomically."}
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPublishOpen(false)} disabled={publishDocument.isPending || publishSnapshotLoading}>Cancel</Button>
            <Button
              onClick={publish}
              disabled={
                publishDocument.isPending
                || publishSnapshotLoading
                || !publishRevisionId
                || !canPublishCurrent
                || !publishSnapshotMatchesLoaded
                || (publishSharedSource && !publishSnapshot)
              }
            >
              {publishDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}