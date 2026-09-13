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

function renderMarket(options: { live: boolean; operations?: unknown[]; held?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const document = { id: "page", title: "Test page", slug: "test", markets: [], kind: "publication" } as unknown as Document;
  const market = { id: "market-id", code: "ksa", displayName: "Saudi Arabia", defaultLocale: "en", enabled: true } as MarketEdition;
  queryClient.setQueryData(getGetSharedMarketEditionMatrixQueryKey("page"), {
    baselines: [{ id: "baseline", locale: "en", revisionId: "new" }],
    bindings: [{ marketEditionId: "market-id", locale: "en", mode: "adapted", baselineId: "baseline",
      baselineRevisionId: "old", heldBaselineRevisionId: options.held ?? null, operations: options.operations ?? [] }],
  });
  queryClient.setQueryData(getGetDocumentAvailabilityQueryKey("page"), {
    documentId: "page", canEditShared: false, draftVersion: 1, publishedVersion: 1, reviewedVersion: null,
    sharedSource: null, affectedEditions: [],
    items: [{ marketEditionId: "market-id", market: "ksa", locale: "en", displayName: "Saudi Arabia",
      stagedDecision: "show", publishedDecision: "show", publishedEffectiveAvailable: options.live, pending: false }],
  });
  queryClient.setQueryData(getListDocumentEditionsQueryKey("page"), {
    documentId: "page", items: [{ market: "ksa", locale: "en", exact: true, workflowState: "draft", readinessErrors: [] }],
  });
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}><table><tbody>
    <DocumentMarketRow document={document} markets={[market]} locale="en"
      canManage={false} isAdministrator={false} onDraftChange={() => {}} onOpen={() => {}} />
  </tbody></table></QueryClientProvider>);
}

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