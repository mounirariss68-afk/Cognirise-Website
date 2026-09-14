import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getGetDocumentAvailabilityQueryKey, getGetSharedMarketEditionMatrixQueryKey,
  getListDocumentEditionsQueryKey, type Document, type MarketEdition,
} from "@workspace/api-client-react";
import { DocumentMarketRow } from "./DocumentMarketRow";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderMarket(options: {
  live: boolean;
  operations?: unknown[];
  held?: string;
  binding?: boolean;
  exact?: boolean;
  usedFallback?: boolean;
  fallbackReason?: string | null;
  readinessErrors?: string[];
  readinessIssues?: unknown[];
  hasEffectivePublishedRevision?: boolean;
  canManage?: boolean;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const document = { id: "page", title: "Test page", slug: "test", markets: [], kind: "publication" } as unknown as Document;
  const markets = [
    { id: "uae-edition", code: "uae", displayName: "United Arab Emirates", defaultLocale: "en", enabled: true },
    { id: "europe-edition", code: "europe", displayName: "Europe", defaultLocale: "en", enabled: true },
    { id: "market-id", code: "ksa", displayName: "Saudi Arabia", defaultLocale: "en", enabled: true },
  ] as MarketEdition[];
  queryClient.setQueryData(getGetSharedMarketEditionMatrixQueryKey("page"), {
    baselines: [{ id: "baseline", locale: "en", revisionId: "new" }],
    bindings: options.binding === false ? [] : [{ marketEditionId: "market-id", locale: "en", mode: "adapted", baselineId: "baseline",
      baselineRevisionId: "old", heldBaselineRevisionId: options.held ?? null, operations: options.operations ?? [] }],
  });
  queryClient.setQueryData(getGetDocumentAvailabilityQueryKey("page"), {
    documentId: "page", canEditShared: false, draftVersion: 1, publishedVersion: 1, reviewedVersion: null,
    sharedSource: null, affectedEditions: [],
    items: [
      { marketEditionId: "uae-edition", market: "uae", locale: "en", displayName: "United Arab Emirates",
        stagedDecision: "show", publishedDecision: "show", publishedEffectiveAvailable: false, pending: false },
      { marketEditionId: "europe-edition", market: "europe", locale: "en", displayName: "Europe",
        stagedDecision: "show", publishedDecision: "show", publishedEffectiveAvailable: false, pending: false },
      { marketEditionId: "market-id", market: "ksa", locale: "en", displayName: "Saudi Arabia",
        stagedDecision: "show", publishedDecision: "show", publishedEffectiveAvailable: options.live, pending: false },
    ],
  });
  queryClient.setQueryData(getListDocumentEditionsQueryKey("page"), {
    documentId: "page", items: [
      {
        market: "uae", locale: "en", exact: true, usedFallback: false, fallbackReason: null, revisionNumber: 4,
        workflowState: "approved", publicationState: "published", hasEffectivePublishedRevision: true,
        readinessErrors: [], readinessIssues: [],
      },
      {
        market: "europe", locale: "en", exact: true, usedFallback: false, fallbackReason: null, revisionNumber: 5,
        workflowState: "approved", publicationState: "published", hasEffectivePublishedRevision: true,
        readinessErrors: [], readinessIssues: [],
      },
      {
        market: "ksa", locale: "en", exact: options.exact ?? true, usedFallback: options.usedFallback ?? false,
        fallbackReason: options.fallbackReason ?? null, revisionNumber: 7, workflowState: "draft", publicationState: "published",
        hasEffectivePublishedRevision: options.hasEffectivePublishedRevision ?? true,
        readinessErrors: options.readinessErrors ?? [], readinessIssues: options.readinessIssues ?? [],
      },
    ],
  });
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}><table><tbody>
    <DocumentMarketRow document={document} markets={markets} locale="en"
      canManageMarket={() => options.canManage ?? false} isAdministrator={false} onDraftChange={() => {}} onOpen={() => {}} />
  </tbody></table></QueryClientProvider>);
}

test("matrix keeps the full catalog names visible in separate destination cells", () => {
  const markup = renderMarket({ live: true });
  assert.match(markup, /United Arab Emirates/);
  assert.match(markup, /Europe/);
  assert.match(markup, /Saudi Arabia/);
  assert.match(markup, /aria-label="United Arab Emirates publication status"/);
  assert.match(markup, /aria-label="Europe publication status"/);
  assert.match(markup, /aria-label="Saudi Arabia publication status"/);
});

test("matrix reads live availability independently of document market labels", () => {
  const markup = renderMarket({ live: true, operations: [{ op: "set", path: "content.hero.mediaId", value: "local" }] });
  assert.match(markup, />Live</);
  assert.match(markup, />Adapted</);
  assert.match(markup, /Pending/);
  assert.match(markup, /Updates available/);
});

test("zero overrides show Shared; a held update and off destination do not pretend to be live", () => {
  const markup = renderMarket({ live: false, held: "new" });
  assert.match(markup, />Shared</);
  assert.match(markup, /Not live/);
  assert.doesNotMatch(markup, /Updates available/);
});

test("availability alone does not make an edition live without its effective published revision", () => {
  const markup = renderMarket({ live: true, hasEffectivePublishedRevision: false });
  assert.match(markup, /Not live/);
  assert.doesNotMatch(markup, />Live</);
});

test("matrix exposes exact saved-revision blockers with the applicable recovery path", () => {
  const markup = renderMarket({
    live: false,
    readinessErrors: [
      "Hero image must have approved media.",
      "Submit this saved revision for review before approval.",
    ],
    readinessIssues: [
      { category: "validation", message: "Hero image must have approved media.", action: "edit" },
      { category: "workflow", message: "Submit this saved revision for review before approval.", action: "review" },
    ],
  });
  assert.match(markup, /2 saved-revision blockers/);
  assert.match(markup, /Saudi Arabia · EN · saved revision 7/);
  assert.match(markup, /Hero image must have approved media\./);
  assert.match(markup, /Validation requirement: fix the saved content or media/);
  assert.match(markup, /Workflow requirement: submit, review, or approve/);
  assert.match(markup, /You can inspect this issue but do not have permission/);
});

test("matrix identifies authoritative legacy fallback separately from independent content", () => {
  const legacy = renderMarket({
    live: false,
    binding: false,
    exact: false,
    usedFallback: true,
    fallbackReason: "No exact Arabic edition; inherited legacy English source.",
    canManage: true,
  });
  assert.match(legacy, /Legacy fallback/);
  assert.match(legacy, /No exact Arabic edition; inherited legacy English source\./);
  assert.match(legacy, /Copy from another market/);
  assert.doesNotMatch(legacy, /Market-only or legacy content/);

  const independent = renderMarket({ live: false, binding: false, exact: true });
  assert.match(independent, /Independent/);
  assert.match(independent, /Explicit market edition; it does not need a shared baseline\./);
});