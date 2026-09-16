import type { SharedMarketBaseline, SharedMarketBinding, SharedMarketEditionMatrix } from "@workspace/api-client-react";

export type ReuseMode = "available" | "customized" | "frozen" | "already-shared";

export type ReuseMarket = {
  id: string;
  code: string;
  displayName: string;
  /** Actual configured destination tuples. Existing document editions may add
   * further tuples, but we must never synthesize the source locale. */
  defaultLocale?: string;
  fallbackLocale?: string | null;
};

export type ReuseExactEdition = {
  market: string;
  locale: string;
  revisionId: string | null;
  revisionNumber: number | null;
};

export type ReuseSavedSource = ReuseExactEdition & {
  revisionId: string;
  /** Present only for bounded source choices supplied by the editor. */
  sourceKind?: "saved-draft" | "published" | "shared";
  /** Present when the saved source is an actual shared-baseline revision. */
  baselineId?: string;
};

/**
 * Deliberately bounded source identities supplied by the editor: the current
 * saved exact revision, its distinct exact published revision, or an actual
 * saved shared-baseline revision. This is not a general historical picker.
 */
export type ReuseSourceCandidate = ReuseSavedSource & {
  sourceKind: "saved-draft" | "published" | "shared";
};

export type ReuseTarget = {
  key: string;
  market: ReuseMarket;
  locale: string;
  exactEdition?: ReuseExactEdition;
  binding?: SharedMarketBinding;
  mode: ReuseMode;
  reason: string;
  permitted: boolean;
};

export type EditionReusePlan = {
  source?: ReuseSavedSource;
  baseline?: SharedMarketBaseline;
  targets: ReuseTarget[];
  otherLanguageEditions: ReuseExactEdition[];
  sourceIssue?: string;
};

export type ReuseDestinationRequest = {
  key: string;
  marketEditionId: string;
  market: string;
  locale: string;
  /** 0 is only valid when the target has no existing binding. */
  version: number;
  /** Latest exact revision inspected before a replacement; prevents a stale
   * comparison from replacing a newer local save. */
  /** `null` asserts that no saved exact destination existed when reuse was
   * planned, so a concurrently created customization is never replaced. */
  expectedDestinationRevisionId?: string | null;
  /** Active frozen baseline observed during comparison. A successor must be
   * explicitly re-inspected rather than silently reused. */
  expectedActiveBaselineRevisionId?: string;
  replacesCustomization: boolean;
};

export type ReuseDestinationOutcome = {
  key: string;
  market: string;
  locale: string;
  status: "success" | "skipped" | "failed";
  message: string;
};

export type ReuseChoice = {
  selected: boolean;
  replaceCustomization: boolean;
  retainCustomization?: boolean;
  /** Pins the target state which was actually compared. These are deliberately
   * stored in the choice rather than reconstructed from a later refetch. */
  inspectedDestinationRevisionId?: string | null;
  inspectedBindingVersion?: number;
  inspectedBaselineRevisionId?: string;
};

export type SnapshotDifference = {
  path: string;
  source: unknown;
  destination: unknown;
};

function targetKey(market: string, locale: string) {
  return `${market}|${locale}`;
}

/** BCP-47 language identity for reuse eligibility. Region/script variants
 * share a language (en and en-US), while und is intentionally not a language. */
export function localeLanguage(locale?: string | null) {
  const primary = locale?.trim().split("-")[0]?.toLowerCase();
  return primary && /^[a-z]{2,8}$/.test(primary) && primary !== "und" ? primary : undefined;
}

export function sameLanguage(left?: string | null, right?: string | null) {
  const leftLanguage = localeLanguage(left);
  return Boolean(leftLanguage && leftLanguage === localeLanguage(right));
}

export function choiceHasCurrentInspection(
  target: ReuseTarget,
  choice?: ReuseChoice,
  activeBaselineRevisionId?: string,
) {
  return Boolean(choice
    && choice.inspectedDestinationRevisionId === (target.exactEdition?.revisionId ?? null)
    && choice.inspectedBindingVersion === (target.binding?.version ?? 0)
    && choice.inspectedBaselineRevisionId === activeBaselineRevisionId);
}

/**
 * Converts the additive shared-baseline, managed-binding, and legacy exact
 * records into the choices an editor needs to make. It intentionally does not
 * infer that an exact revision without a binding is safe to replace.
 */
export function buildEditionReusePlan({
  sourceRevisionId,
  markets,
  exactEditions,
  matrix,
  canEditDestination,
  sourceCandidates,
  canReadSource,
}: {
  sourceRevisionId?: string;
  markets: ReuseMarket[];
  exactEditions: ReuseExactEdition[];
  matrix?: SharedMarketEditionMatrix;
  canEditDestination: (market: string) => boolean;
  sourceCandidates?: readonly ReuseSourceCandidate[];
  canReadSource?: (market: string, locale: string) => boolean;
}): EditionReusePlan {
  const selectableSources = sourceCandidates ?? exactEditions.flatMap((edition) => (
    edition.revisionId ? [{ ...edition, revisionId: edition.revisionId, sourceKind: "saved-draft" as const }] : []
  ));
  const selectedEdition = selectableSources.find((edition) => (
    edition.revisionId === sourceRevisionId && (canReadSource?.(edition.market, edition.locale) ?? true)
  ));
  if (selectedEdition
    && selectedEdition.sourceKind !== "shared"
    && (selectedEdition.market === "shared-source" || !localeLanguage(selectedEdition.locale))) {
    return {
      targets: [],
      otherLanguageEditions: [],
      sourceIssue: "The legacy shared-source / und revision has no language. Open a localized exact edition and explicitly choose it as the reuse source.",
    };
  }
  const sourceCandidate = selectedEdition;
  if (!sourceCandidate) {
    return { targets: [], otherLanguageEditions: [] };
  }

  const baseline = sourceCandidate.sourceKind === "shared"
    ? (matrix?.baselines ?? []).find((item) => (
      item.id === sourceCandidate.baselineId && item.revisionId === sourceCandidate.revisionId
    ))
    : (matrix?.baselines ?? []).find((item) => (
      item.locale === sourceCandidate.locale && item.sourceRevisionId === sourceCandidate.revisionId
    ));
  if (sourceCandidate.sourceKind === "shared" && (!baseline || baseline.snapshot === null)) {
    return {
      targets: [],
      otherLanguageEditions: [],
      sourceIssue: "The selected shared baseline snapshot is unavailable. Choose an exact saved regional source and explicitly establish a recoverable baseline first.",
    };
  }
  const exactByAddress = new Map(exactEditions.map((edition) => [
    targetKey(edition.market, edition.locale),
    edition,
  ]));
  const bindingByAddress = new Map((matrix?.bindings ?? []).map((binding) => {
    const market = markets.find((candidate) => candidate.id === binding.marketEditionId);
    return [market ? targetKey(market.code, binding.locale) : binding.id, binding];
  }));
  const targetLocales = (market: ReuseMarket) => new Set([
    market.defaultLocale,
    market.fallbackLocale ?? undefined,
    ...exactEditions.filter((edition) => edition.market === market.code).map((edition) => edition.locale),
    ...(matrix?.bindings ?? [])
      .filter((binding) => binding.marketEditionId === market.id)
      .map((binding) => binding.locale),
  ].filter((locale): locale is string => sameLanguage(sourceCandidate.locale, locale)));
  const targets = markets
    .filter((market) => market.code !== sourceCandidate.market)
    .flatMap((market) => [...targetLocales(market)].sort().map((locale): ReuseTarget => {
      const key = targetKey(market.code, locale);
      const exactEdition = exactByAddress.get(key);
      const binding = bindingByAddress.get(key);
      const permitted = canEditDestination(market.code);

      if (binding?.mode === "shared"
        && binding.baselineRevisionId === baseline?.revisionId
        && binding.operations.length === 0) {
        return {
          key, market, locale, exactEdition, binding, permitted,
          mode: "already-shared",
          reason: "Already uses this frozen saved content.",
        };
      }
      if (binding && binding.mode !== "independent") {
        return {
          key, market, locale, exactEdition, binding, permitted,
          mode: "frozen",
          reason: binding.operations.length
            ? "Has local edits on a frozen shared binding. Compare before adopting another saved version."
            : "Uses a different frozen shared binding. Compare before adopting another saved version.",
        };
      }
      if (binding?.mode === "independent" || exactEdition?.revisionId) {
        return {
          key, market, locale, exactEdition, binding, permitted,
          mode: "customized",
          reason: binding?.mode === "independent"
            ? "Has independent saved content. Replacing it requires confirmation."
            : "Has legacy or custom saved content. Replacing it requires confirmation.",
        };
      }
      return {
        key, market, locale, exactEdition, binding, permitted,
        mode: "available",
        reason: "No saved customization exists; this edition can use the selected content.",
      };
    }));

  return {
    source: sourceCandidate,
    baseline,
    targets,
    otherLanguageEditions: exactEditions.filter((edition) => (
      edition.market !== sourceCandidate.market && !sameLanguage(edition.locale, sourceCandidate.locale)
    )),
  };
}

/** Only explicit, permitted choices become a binding mutation request. */
export function createReuseRequests(
  plan: EditionReusePlan,
  choices: Record<string, ReuseChoice>,
): ReuseDestinationRequest[] {
  const baseline = plan.baseline;
  if (!baseline) return [];
  return plan.targets.flatMap((target) => {
    const choice = choices[target.key];
    if (!choice?.selected || !target.permitted || !["available", "customized"].includes(target.mode)) return [];
    if (target.mode === "customized" && (!choiceHasCurrentInspection(target, choice, baseline.revisionId) || !choice.replaceCustomization)) return [];
    return [{
      key: target.key,
      marketEditionId: target.market.id,
      market: target.market.code,
      locale: target.locale,
      // A retry must use the exact state that was inspected, never a newer
      // value that arrived from a matrix refetch after a conflict.
      version: target.mode === "customized"
        ? choice.inspectedBindingVersion!
        : target.binding?.version ?? 0,
      expectedDestinationRevisionId: target.mode === "customized"
        ? choice.inspectedDestinationRevisionId!
        : target.exactEdition?.revisionId ?? null,
      expectedActiveBaselineRevisionId: target.mode === "customized"
        ? choice.inspectedBaselineRevisionId!
        : baseline.revisionId,
      replacesCustomization: target.mode === "customized",
    }];
  });
}

/**
 * A bounded structural comparison for the reuse decision. Arrays are reported
 * as one field because array positions are not stable content identities.
 */
export function snapshotDifferences(
  source: unknown,
  destination: unknown,
  limit = 20,
): SnapshotDifference[] {
  const differences: SnapshotDifference[] = [];
  const visit = (left: unknown, right: unknown, path: string) => {
    if (differences.length >= limit || Object.is(left, right)) return;
    const objects = left !== null && right !== null
      && typeof left === "object" && typeof right === "object"
      && !Array.isArray(left) && !Array.isArray(right);
    if (!objects) {
      differences.push({ path: path || "Saved content", source: left, destination: right });
      return;
    }
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    for (const key of [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort()) {
      visit(leftRecord[key], rightRecord[key], path ? `${path}.${key}` : key);
      if (differences.length >= limit) return;
    }
  };
  visit(source, destination, "");
  return differences;
}

/** A retained customization is a deliberate skipped reuse, never a success. */
export function retainedReuseOutcomes(
  plan: EditionReusePlan,
  choices: Record<string, ReuseChoice>,
): ReuseDestinationOutcome[] {
  return plan.targets.flatMap((target) => {
    if (target.mode !== "customized" || !choices[target.key]?.retainCustomization) return [];
    return [{
      key: target.key,
      market: target.market.code,
      locale: target.locale,
      status: "skipped" as const,
      message: "Customization retained; this destination was not changed.",
    }];
  });
}

export function reuseFailureOutcome(request: ReuseDestinationRequest, error: unknown): ReuseDestinationOutcome {
  const candidate = error && typeof error === "object"
    ? error as { data?: { error?: string }; error?: string; message?: string }
    : undefined;
  return {
    key: request.key,
    market: request.market,
    locale: request.locale,
    status: "failed",
    message: candidate?.data?.error ?? candidate?.error ?? candidate?.message
      ?? "The destination was not changed. Reload it before trying again.",
  };
}