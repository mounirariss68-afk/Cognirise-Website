import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getGetDocumentAvailabilityQueryKey,
  getGetDocumentMarketAvailabilityQueryKey,
  useGetDocumentAvailability,
  useGetDocumentMarketAvailability,
  useReviewDocumentAvailability,
  useUpdateDocumentAvailability,
  usePublishDocumentMarketAvailability,
  useUpdateDocumentMarketAvailability,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Check, Circle, ChevronDown, ChevronRight, Loader2, Send } from "lucide-react";

export type AvailabilityDestination = {
  market: string;
  displayName: string;
  locale?: string;
};
export type AvailabilitySelectionDraft = {
  selections: Record<string, boolean>;
  saveFailed: boolean;
};

type Props = {
  documentId: string;
  destinations: AvailabilityDestination[];
  canManageMarket: (market: string) => boolean;
  isAdministrator: boolean;
  /** People retain their existing administrator availability release. Document
   * selections are released with the reviewed document snapshot instead. */
  releaseIndividually?: boolean;
  /** Shared people release with their shared content; this opens that normal
   * content workflow instead of calling the legacy per-market release API. */
  onOpenSharedContent?: () => void;
  /** Documents own this state so a failed checkbox mutation survives tab
   * switches and is protected by the editor's navigation/unload guard. */
  selectionDraft?: AvailabilitySelectionDraft;
  onSelectionDraftChange?: (draft: AvailabilitySelectionDraft) => void;
  /** Render one compact market summary suitable for the People table. */
  compact?: boolean;
};

function errorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { error?: string; message?: string };
    return candidate.error ?? candidate.message;
  }
  return undefined;
}

function displayDestination(destination: AvailabilityDestination, destinations: AvailabilityDestination[]) {
  const matchingMarkets = destinations.filter((item) => item.market === destination.market);
  return matchingMarkets.length > 1 && destination.locale
    ? `${destination.displayName} · ${destination.locale}`
    : destination.displayName;
}

/**
 * One authoritative staged/published availability control for documents and
 * people. The endpoint returns the effective value, so this control never
 * infers visibility from client-side state.
 */
export function MarketAvailabilityChecklist({
  documentId,
  destinations,
  canManageMarket,
  isAdministrator,
  releaseIndividually = false,
  onOpenSharedContent,
  selectionDraft,
  onSelectionDraftChange,
  compact = false,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localSelections, setLocalSelections] = useState<Record<string, boolean>>({});
  const [selectionSaveFailed, setSelectionSaveFailed] = useState(false);
  const [personReleaseConfirmation, setPersonReleaseConfirmation] = useState<{
    marketEditionId: string;
    destination: AvailabilityDestination;
  } | null>(null);
  const sharedAvailability = useGetDocumentAvailability(documentId, {
    query: {
      // People use the same versioned selection state as shared documents.
      // Their market endpoint does not repeat that version, so retain this
      // query as the authoritative concurrency token for either control.
      enabled: true,
      queryKey: getGetDocumentAvailabilityQueryKey(documentId),
    },
  });
  const personAvailability = useGetDocumentMarketAvailability(documentId, {
    query: {
      enabled: releaseIndividually,
      queryKey: getGetDocumentMarketAvailabilityQueryKey(documentId),
    },
  });
  const updateShared = useUpdateDocumentAvailability();
  const updatePerson = useUpdateDocumentMarketAvailability();
  const reviewAvailability = useReviewDocumentAvailability();
  const publishPerson = usePublishDocumentMarketAvailability();
  // Only a confirmed null keeps the old person-only route. While the
  // authoritative availability response is loading (or failed), never guess
  // and issue a legacy mutation for a migrated shared person.
  const useLegacyPersonAvailability = releaseIndividually && sharedAvailability.data?.sharedSource === null;
  const currentSelections = selectionDraft?.selections ?? localSelections;
  const currentSaveFailed = selectionDraft?.saveFailed ?? selectionSaveFailed;
  const changeDraft = (nextSelections: Record<string, boolean>, nextSaveFailed: boolean) => {
    setLocalSelections(nextSelections);
    setSelectionSaveFailed(nextSaveFailed);
    onSelectionDraftChange?.({ selections: nextSelections, saveFailed: nextSaveFailed });
  };
  const stagePerson = (marketEditionId: string, destination: AvailabilityDestination, next: boolean) => {
    const destinationKey = `person:${marketEditionId}`;
    setPersonReleaseConfirmation(null);
    const nextSelections = { ...currentSelections, [destinationKey]: next };
    changeDraft(nextSelections, false);
    updatePerson.mutate({
      documentId,
      marketEditionId,
      data: {
        decision: next ? "show" : "off",
        version: sharedAvailability.data?.draftVersion ?? 0,
      },
    }, {
      onSuccess: async () => {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: getGetDocumentMarketAvailabilityQueryKey(documentId) }),
          queryClient.refetchQueries({ queryKey: getGetDocumentAvailabilityQueryKey(documentId) }),
        ]);
        changeDraft({}, false);
        toast({
          title: "Destination change saved",
          description: `${displayDestination(destination, allDestinations)} will be ${next ? "shown" : "excluded"} when the reviewed change is published.`,
        });
      },
      onError: (error) => {
        changeDraft(nextSelections, true);
        toast({
          title: "Destination save needs your review",
          description: errorMessage(error) ?? "Your chosen checkbox state is retained locally; reload before trying again.",
          variant: "destructive",
        });
      },
    });
  };

  const stageShared = (marketEditionId: string, locale: string, destination: AvailabilityDestination, next: boolean) => {
    const current = sharedAvailability.data;
    if (!current) return;
    setPersonReleaseConfirmation(null);
    const destinationKey = `${marketEditionId}:${locale}`;
    const nextSelections = { ...currentSelections, [destinationKey]: next };
    changeDraft(nextSelections, false);
    updateShared.mutate({
      documentId,
      data: {
        version: current.draftVersion,
        // Availability updates are versioned snapshots rather than patches.
        // Keep every destination in the server's current matrix, including an
        // explicit "inherit" decision. Retained optimistic choices are made
        // explicit too, so a retry cannot discard a checkbox choice that the
        // user still sees after a failed save.
        destinations: current.items.map((item) => {
          const itemKey = `${item.marketEditionId}:${item.locale}`;
          const selected = nextSelections[itemKey];
          return {
            marketEditionId: item.marketEditionId,
            locale: item.locale,
            decision: selected === undefined
              ? item.stagedDecision
              : selected ? "show" : "off",
          };
        }),
      },
    }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(documentId), updated);
        changeDraft({}, false);
        queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(documentId) });
        toast({
          title: "Destination change saved",
          description: `${displayDestination(destination, allDestinations)} will be ${next ? "shown" : "excluded"} when the reviewed snapshot is published.`,
        });
      },
      onError: (error) => {
        changeDraft(nextSelections, true);
        toast({
          title: "Destination save needs your review",
          description: errorMessage(error) ?? "Another editor may have changed the selection. Your chosen checkbox state is retained locally; reload destinations before trying again.",
          variant: "destructive",
        });
      },
    });
  };

  const release = (marketEditionId: string, destination: AvailabilityDestination) => {
    const publishVersion = isAdministrator
      ? sharedAvailability.data?.draftVersion
      : sharedAvailability.data?.reviewedVersion;
    if (publishVersion === null || publishVersion === undefined
      || publishVersion !== sharedAvailability.data?.draftVersion) return;
    publishPerson.mutate({
      documentId,
      marketEditionId,
      data: { version: publishVersion },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDocumentMarketAvailabilityQueryKey(documentId) });
        queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(documentId) });
        setPersonReleaseConfirmation(null);
        toast({ title: "Availability published", description: `${displayDestination(destination, allDestinations)} is now updated.` });
      },
      onError: (error) => toast({
        title: "Availability was not published",
        description: errorMessage(error) ?? "Only an administrator can publish this change.",
        variant: "destructive",
      }),
    });
  };

  const loading = releaseIndividually
    ? sharedAvailability.isLoading || (useLegacyPersonAvailability && personAvailability.isLoading)
    : sharedAvailability.isLoading;
  const error = useLegacyPersonAvailability ? personAvailability.error : sharedAvailability.error;
  const isError = useLegacyPersonAvailability ? personAvailability.isError : sharedAvailability.isError;
  const items: Array<any> = useLegacyPersonAvailability
    ? personAvailability.data?.items ?? []
    : sharedAvailability.data?.items ?? [];
  // Keep the full matrix for versioned mutations. The compact People cell
  // receives a deliberately scoped destination list, so it must render only
  // those markets; document detail needs every server-returned item so a
  // restricted editor can still start a customization for an assigned target
  // even while its market catalog is loading or scoped differently.
  const visibleItems = compact || releaseIndividually
    ? items.filter((item) => destinations.some(
      (destination) => destination.market === item.market,
    ))
    : items;
  const isUpdating = useLegacyPersonAvailability ? updatePerson.isPending : updateShared.isPending;
  const hasLocalSelection = Object.keys(currentSelections).length > 0;
  const hasCurrentReviewedSelection = sharedAvailability.data?.reviewedVersion !== null
    && sharedAvailability.data?.reviewedVersion === sharedAvailability.data?.draftVersion;
  const hasCurrentPublishSelection = isAdministrator
    ? sharedAvailability.data?.draftVersion !== null
      && sharedAvailability.data?.draftVersion !== undefined
    : hasCurrentReviewedSelection;
  const allDestinations = useLegacyPersonAvailability
    ? destinations
    : items.map((item) => ({
      market: item.market,
      displayName: item.displayName,
      locale: item.locale,
    }));

  if (loading) {
    return <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading destinations…</div>;
  }
  if (isError) {
    return <p className="text-xs text-destructive" role="alert">{errorMessage(error) ?? "Destinations could not be loaded. Your editor inputs are unchanged."}</p>;
  }

  if (compact) {
    const compactItems = destinations.map((configured) => {
      const matching = items.filter((item) => item.market === configured.market);
      const item = matching.find((candidate) => candidate.locale === configured.locale) ?? matching[0];
      if (!item) {
        return { configured, item: null, extraLocales: 0 };
      }
      const pending = useLegacyPersonAvailability ? Boolean(item.pendingDecision) : item.pending;
      const liveChecked = item.publishedEffectiveAvailable;
      const pendingChecked = useLegacyPersonAvailability ? item.previewEffectiveAvailable : item.stagedDecision !== "off";
      return {
        configured,
        item,
        extraLocales: Math.max(matching.length - 1, 0),
        pending,
        liveChecked,
        pendingChecked,
      };
    });
    const hasLocaleExceptions = visibleItems.some((item) => {
      const marketItems = visibleItems.filter((candidate) => candidate.market === item.market);
      return destinations.some((destination) => destination.market === item.market) && marketItems.length > 1;
    });

    const shownCount = compactItems.filter((item) => item.item && item.pendingChecked).length;
    const pendingCount = compactItems.filter((item) => item.item && item.pending).length;
    return (
      <section className="space-y-2" aria-label="Show in" data-testid="market-availability-compact">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold">Show in</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {shownCount} of {compactItems.length} configured market{compactItems.length === 1 ? "" : "s"} staged to show
              {pendingCount > 0 ? ` · ${pendingCount} pending review` : ""}
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground">Published and staged visibility (not content)</span>
        </div>
        <div className="space-y-1">
        <span className="sr-only">✓ Visibility published; * Pending change</span>
        <div className="flex flex-wrap gap-1" role="list" aria-label="Live and pending availability by market">
          {compactItems.map(({ configured, item, extraLocales, pending, liveChecked, pendingChecked }) => {
            if (!item) {
              return (
                <span key={configured.market} className="rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground" role="listitem">
                  {configured.displayName}: unavailable
                </span>
              );
            }
            const destination = allDestinations.find((candidate) => (
              candidate.market === item.market
              && (!item.locale || candidate.locale === item.locale)
            )) ?? configured;
            const checked = currentSelections[
              useLegacyPersonAvailability ? `person:${item.marketEditionId}` : `${item.marketEditionId}:${item.locale}`
            ] ?? pendingChecked;
            const hasPendingState = pending || checked !== liveChecked;
            const isDisabled = !canManageMarket(item.market)
              || (!useLegacyPersonAvailability && !sharedAvailability.data?.canEditShared)
              || isUpdating
              || sharedAvailability.isLoading
              || publishPerson.isPending;
            const toggle = (next: boolean) => useLegacyPersonAvailability
              ? stagePerson(item.marketEditionId, destination, next)
              : stageShared(item.marketEditionId, item.locale, destination, next);
            return (
              <div key={`${configured.market}-${item.locale ?? ""}`} role="listitem">
                <button
                  type="button"
                  aria-pressed={checked}
                  aria-label={`${configured.displayName}: ${hasPendingState ? `staged ${checked ? "shown" : "excluded"}; live ${liveChecked ? "shown" : "excluded"}` : `live ${liveChecked ? "shown" : "excluded"}`}`}
                  disabled={isDisabled}
                  onClick={() => toggle(!checked)}
                  className={`inline-flex min-h-8 items-center gap-1 rounded-md border px-2 py-1 text-left text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    checked ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-border bg-background text-muted-foreground"
                  } ${hasPendingState ? "border-dashed" : ""}`}
                  title={hasPendingState
                    ? `${configured.displayName}: staged ${checked ? "shown" : "excluded"}; live ${liveChecked ? "shown" : "excluded"}`
                    : `${configured.displayName}: live ${liveChecked ? "shown" : "excluded"}`}
                >
                  {checked ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{configured.displayName}</span>
                  <span className="sr-only">{hasPendingState ? `Staged: ${checked ? "shown" : "excluded"}; Live: ${liveChecked ? "shown" : "excluded"}` : `Live: ${liveChecked ? "shown" : "excluded"}`}</span>
                  {hasPendingState && <span aria-hidden="true" className="text-[10px]">*</span>}
                  {extraLocales > 0 && <span className="text-[10px] text-muted-foreground">+{extraLocales}</span>}
                </button>
              </div>
            );
          })}
        </div>
        </div>
        {hasLocaleExceptions && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-sm text-[10px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronRight className="h-3 w-3 group-open:hidden" aria-hidden="true" />
              <ChevronDown className="hidden h-3 w-3 group-open:block" aria-hidden="true" />
              Show locale exceptions
            </summary>
            <div className="mt-2 w-full space-y-2 rounded-md border border-border/70 bg-muted/20 p-2 text-xs" role="region" aria-label="Market and locale availability exceptions">
              <p className="text-[11px] text-muted-foreground">Default-market ticks stay compact. Review each locale before sending or publishing a destination change.</p>
              <MarketAvailabilityChecklist
                documentId={documentId}
                destinations={destinations}
                canManageMarket={canManageMarket}
                isAdministrator={isAdministrator}
                releaseIndividually={releaseIndividually}
                onOpenSharedContent={onOpenSharedContent}
                selectionDraft={selectionDraft}
                onSelectionDraftChange={onSelectionDraftChange}
                compact={false}
              />
            </div>
          </details>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Destination visibility only: these ticks do not copy or translate content.
        Use “Use this content in other editions” to reuse saved content.
        Visibility and content changes remain separate from reviewed publication.
      </p>
      {visibleItems.map((item) => {
        const destination = allDestinations.find((candidate) => (
          candidate.market === item.market
          && (!item.locale || candidate.locale === item.locale)
        )) ?? {
          market: item.market,
          displayName: item.displayName,
          locale: item.locale,
        };
        const pending = useLegacyPersonAvailability ? Boolean(item.pendingDecision) : item.pending;
        const reviewed = !useLegacyPersonAvailability
          && sharedAvailability.data?.reviewedVersion === sharedAvailability.data?.draftVersion
          && item.reviewedDecision !== null;
        // Availability publication is its own versioned receipt. A managed
        // destination can be live even when the legacy shared-source pointer
        // is intentionally null or stale, so never infer this from
        // sharedSource.publishedRevisionId.
        const availabilityIsLive = (sharedAvailability.data?.publishedVersion ?? 0) > 0;
        const serverChecked = useLegacyPersonAvailability
          ? (pending ? item.previewEffectiveAvailable : item.publishedEffectiveAvailable)
          : item.stagedDecision !== "off";
        const checked = useLegacyPersonAvailability
          ? currentSelections[`person:${item.marketEditionId}`] ?? serverChecked
          : currentSelections[`${item.marketEditionId}:${item.locale}`] ?? serverChecked;
        const canManage = canManageMarket(item.market)
          && (useLegacyPersonAvailability || Boolean(sharedAvailability.data?.canEditShared));
        return (
          <div key={`${item.marketEditionId}-${item.locale ?? ""}`} className="rounded-md border p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`destination-${item.marketEditionId}-${item.locale ?? ""}`}
                checked={checked}
                onCheckedChange={(next) => useLegacyPersonAvailability
                  ? stagePerson(item.marketEditionId, destination, next === true)
                  : stageShared(item.marketEditionId, item.locale, destination, next === true)}
                disabled={!canManage || isUpdating || sharedAvailability.isLoading || publishPerson.isPending}
                aria-label={`Show this content in ${displayDestination(destination, allDestinations)}`}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <label htmlFor={`destination-${item.marketEditionId}-${item.locale ?? ""}`} className="cursor-pointer text-sm font-medium">
                  {displayDestination(destination, allDestinations)}
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {pending ? (
                    <>
                      <Badge variant="outline" className={reviewed
                        ? "border-sky-300 bg-sky-50 text-[10px] text-sky-800"
                        : "border-amber-300 bg-amber-50 text-[10px] text-amber-800"}
                      >
                        {reviewed ? "Reviewed" : "Pending"}: {(useLegacyPersonAvailability ? item.previewEffectiveAvailable : item.stagedDecision !== "off") ? "Shown" : "Excluded"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                         Live: {!availabilityIsLive
                          ? "Not published yet"
                          : item.publishedEffectiveAvailable ? "Shown" : "Excluded"}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                       Live: {!availabilityIsLive
                        ? "Not published yet"
                        : item.publishedEffectiveAvailable ? "Shown" : "Excluded"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {useLegacyPersonAvailability && isAdministrator && pending && (
              <Button type="button" variant="outline" size="sm" className="ml-7 mt-3 h-7 gap-1 text-[10px]" disabled={!hasCurrentPublishSelection || publishPerson.isPending || updatePerson.isPending} onClick={() => setPersonReleaseConfirmation({ marketEditionId: item.marketEditionId, destination })}>
                {publishPerson.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
             {isAdministrator && !hasCurrentReviewedSelection ? "Publish saved availability" : "Publish availability"}
              </Button>
            )}
          </div>
        );
      })}
      {useLegacyPersonAvailability && sharedAvailability.data
        && sharedAvailability.data.reviewedVersion !== sharedAvailability.data.draftVersion && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Pending destinations: {sharedAvailability.data.affectedEditions.length
              ? sharedAvailability.data.affectedEditions.join(", ")
              : "the changed market decisions"}{" "}
            · exact version {sharedAvailability.data.draftVersion}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={hasLocalSelection || updatePerson.isPending || reviewAvailability.isPending || currentSaveFailed}
            onClick={() => reviewAvailability.mutate({
              documentId,
              data: { version: sharedAvailability.data!.draftVersion },
            }, {
              onSuccess: (updated) => {
                queryClient.setQueryData(getGetDocumentAvailabilityQueryKey(documentId), updated);
                toast({ title: "People destinations sent for review", description: "This exact destination version is now required for publication." });
              },
              onError: (error) => toast({
                title: "Destination review was not started",
                description: errorMessage(error) ?? "Reload the people destinations before trying again.",
                variant: "destructive",
              }),
            })}
          >
            {reviewAvailability.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Send people destinations for review
          </Button>
        </div>
      )}
      {releaseIndividually && !useLegacyPersonAvailability && onOpenSharedContent && (
        <div className="space-y-2">
          {sharedAvailability.data?.affectedEditions.length ? (
            <p className="text-[11px] text-muted-foreground">
              Pending destinations: {sharedAvailability.data.affectedEditions.join(", ")} · exact version {sharedAvailability.data.draftVersion}
            </p>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onOpenSharedContent}>
            Open shared content to review/publish
          </Button>
        </div>
      )}
      {useLegacyPersonAvailability && personReleaseConfirmation && (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          <p>
             Publish the {isAdministrator && !hasCurrentReviewedSelection ? "saved" : "reviewed"} destination version {isAdministrator && !hasCurrentReviewedSelection
               ? sharedAvailability.data?.draftVersion
               : sharedAvailability.data?.reviewedVersion} for{" "}
            <strong>{displayDestination(personReleaseConfirmation.destination, allDestinations)}</strong>?
            This changes the live people listing.
          </p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPersonReleaseConfirmation(null)}>Cancel</Button>
            <Button type="button" size="sm" disabled={publishPerson.isPending} onClick={() => release(
              personReleaseConfirmation.marketEditionId,
              personReleaseConfirmation.destination,
            )}>
              Confirm publish
            </Button>
          </div>
        </div>
      )}
      {currentSaveFailed && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <p>Your destination selection is still shown locally and has not been published. Reload the current selection before trying again.</p>
          <Button type="button" variant="outline" size="sm" className="mt-2 h-7 text-[10px]" onClick={() => {
            changeDraft({}, false);
            queryClient.invalidateQueries({
              queryKey: useLegacyPersonAvailability
                ? getGetDocumentMarketAvailabilityQueryKey(documentId)
                : getGetDocumentAvailabilityQueryKey(documentId),
            });
          }}>
            Reload destinations
          </Button>
        </div>
      )}
      {!visibleItems.length && <p className="text-xs text-muted-foreground">No enabled destinations are configured.</p>}
    </div>
  );
}