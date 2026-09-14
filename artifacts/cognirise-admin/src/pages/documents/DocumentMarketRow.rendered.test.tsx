import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { JSDOM } from "jsdom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Document, MarketEdition } from "@workspace/api-client-react";
import { DocumentMarketRow } from "./DocumentMarketRow";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/content" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
  requestAnimationFrame: { value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0), configurable: true },
  cancelAnimationFrame: { value: (handle: number) => clearTimeout(handle), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const documentRecord = { id: "document-1", title: "Test document", slug: "test-document", markets: [], kind: "publication" } as unknown as Document;
const markets = [
  { id: "uae-edition", code: "uae", displayName: "United Arab Emirates", defaultLocale: "en", enabled: true },
  { id: "europe-edition", code: "europe", displayName: "Europe", defaultLocale: "en", enabled: true },
  { id: "ksa-edition", code: "ksa", displayName: "Saudi Arabia", defaultLocale: "en", enabled: true },
] as MarketEdition[];

type CandidateResponder = (targetMarket: string, attempt: number) => Response | Promise<Response>;
type RequestRecord = { url: string; method: string; body: unknown };

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const availability = {
  documentId: "document-1",
  canEditShared: true,
  draftVersion: 1,
  reviewedVersion: 1,
  publishedVersion: 1,
  sharedSource: null,
  affectedEditions: [],
  items: markets.map((market, index) => ({
    marketEditionId: market.id,
    market: market.code,
    locale: "en",
    displayName: market.displayName,
    stagedDecision: index === 2 ? "off" : "show",
    publishedDecision: index === 2 ? "off" : "show",
    publishedEffectiveAvailable: index === 0,
    pending: index === 1,
  })),
};

const editions = {
  documentId: "document-1",
  items: [
    {
      market: "uae", locale: "en", exact: true, effectiveMarket: "uae", effectiveLocale: "en",
      usedFallback: false, fallbackReason: null, publicationState: "published", workflowState: "approved",
      revisionId: "uae-revision-8", revisionNumber: 8, effectivePublicationState: "published",
      effectiveWorkflowState: "approved", effectiveRevisionId: "uae-revision-8", effectiveRevisionNumber: 8,
      hasEffectivePublishedRevision: true, ready: true, readinessErrors: [], readinessIssues: [],
    },
    {
      market: "europe", locale: "en", exact: false, effectiveMarket: null, effectiveLocale: null,
      usedFallback: false, fallbackReason: null, publicationState: null, workflowState: null,
      revisionId: null, revisionNumber: null, effectivePublicationState: null, effectiveWorkflowState: null,
      effectiveRevisionId: null, effectiveRevisionNumber: null, hasEffectivePublishedRevision: false,
      ready: false, readinessErrors: [], readinessIssues: [],
    },
    {
      market: "ksa", locale: "en", exact: false, effectiveMarket: null, effectiveLocale: null,
      usedFallback: false, fallbackReason: null, publicationState: null, workflowState: null,
      revisionId: null, revisionNumber: null, effectivePublicationState: null, effectiveWorkflowState: null,
      effectiveRevisionId: null, effectiveRevisionNumber: null, hasEffectivePublishedRevision: false,
      ready: false, readinessErrors: [], readinessIssues: [],
    },
  ],
};

function candidatesFor(targetMarket: string) {
  return {
    documentId: "document-1",
    targetMarket,
    targetLocale: "en",
    candidates: [
      {
        editionId: "uae-edition", market: "uae", locale: "en", revisionId: "uae-revision-8", revisionNumber: 8,
        workflowState: "approved", publicationState: "published", publishedRevisionId: "uae-revision-8",
        ready: true, readinessErrors: [], readinessIssues: [],
      },
      {
        editionId: targetMarket === "europe" ? "ksa-edition" : "europe-edition",
        market: targetMarket === "europe" ? "ksa" : "europe", locale: "en",
        revisionId: "other-revision-3", revisionNumber: 3, workflowState: "approved",
        publicationState: "published", publishedRevisionId: "other-revision-3",
        ready: true, readinessErrors: [], readinessIssues: [],
      },
      {
        editionId: "uae-fr-edition", market: "uae", locale: "fr", revisionId: "uae-fr-revision-2",
        revisionNumber: 2, workflowState: "approved", publicationState: "published",
        publishedRevisionId: "uae-fr-revision-2", ready: true, readinessErrors: [], readinessIssues: [],
      },
    ],
  };
}

function installFetch(t: test.TestContext, candidateResponder: CandidateResponder) {
  const requests: RequestRecord[] = [];
  const candidateUrls: string[] = [];
  let candidateAttempts = 0;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ url, method, body });
    if (url === "/api/documents/document-1/shared-market") return response({ baselines: [], bindings: [] });
    if (url === "/api/documents/document-1/availability") return response(availability);
    if (url === "/api/documents/document-1/editions") return response(editions);
    const candidateMatch = url.match(/^\/api\/documents\/document-1\/market-copy-candidates\/([^/]+)\/([^/]+)$/);
    if (candidateMatch) {
      candidateUrls.push(url);
      candidateAttempts += 1;
      return candidateResponder(candidateMatch[1], candidateAttempts);
    }
    if (url === "/api/documents/document-1/market-edition-copies" && method === "POST") {
      return response({
        documentId: "document-1", editionId: "ksa-draft-edition", revisionId: "ksa-revision-1",
        revisionNumber: 1, market: "ksa", locale: "en", sourceRevisionId: "uae-revision-8",
        sourceMarket: "uae", sourceLocale: "en", sourceWorkflowState: "approved",
        sourcePublicationState: "published", replayed: false,
      });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });
  return { requests, candidateUrls, get candidateAttempts() { return candidateAttempts; } };
}

async function settle(count = 1) {
  for (let index = 0; index < count; index += 1) {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function renderRow() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  const container = document.createElement("div");
  const opened: Array<[string | undefined, string | undefined, string | undefined]> = [];
  document.body.append(container);
  let root: Root;
  await React.act(async () => {
    root = createRoot(container);
    root.render(<QueryClientProvider client={client}><table><tbody>
      <DocumentMarketRow document={documentRecord} markets={markets} locale="en" canManageMarket={() => true} isAdministrator={false}
        onDraftChange={() => {}} onOpen={(marketCode, localeCode, focus) => opened.push([marketCode, localeCode, focus])} />
    </tbody></table></QueryClientProvider>);
  });
  await settle(2);
  return {
    container,
    opened,
    unmount: async () => {
      await React.act(async () => root!.unmount());
      client.clear();
      container.remove();
    },
  };
}

function changeSelect(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value")!.set!;
  setter.call(select, value);
  select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

test("fetches the matrix, keeps catalog names and statuses visible, and copies to the exact destination", async (t) => {
  const fetches = installFetch(t, (targetMarket) => response(candidatesFor(targetMarket)));
  const view = await renderRow();
  try {
    const text = view.container.textContent ?? "";
    assert.match(text, /United Arab Emirates/);
    assert.match(text, /Europe/);
    assert.match(text, /Saudi Arabia/);
    assert.equal(view.container.querySelector('[data-testid="status-delivery-document-1-uae-edition-en"]')?.textContent, "Live");
    assert.equal(view.container.querySelector('[data-testid="status-delivery-document-1-europe-edition-en"]')?.textContent, "Not live");
    assert.equal(view.container.querySelector('[data-testid="status-delivery-document-1-ksa-edition-en"]')?.textContent, "Not live");
    assert.deepEqual(
      fetches.requests.filter((request) => request.method === "GET").map((request) => request.url),
      [
        "/api/documents/document-1/shared-market",
        "/api/documents/document-1/availability",
        "/api/documents/document-1/editions",
      ],
    );
    assert.deepEqual(fetches.candidateUrls, [], "candidate data must be requested only after expanding a destination");

    const europeOpen = view.container.querySelector<HTMLButtonElement>('[data-testid="button-copy-from-market-document-1-europe-edition-en"]')!;
    await React.act(async () => europeOpen.click());
    await settle();
    assert.deepEqual(fetches.candidateUrls, ["/api/documents/document-1/market-copy-candidates/europe/en"]);
    const europeRegion = view.container.querySelector<HTMLElement>('[aria-label="Copy source selection for Europe"]')!;
    assert.ok(europeRegion);
    assert.match(europeRegion.textContent ?? "", /Source selection/);
    assert.match(europeRegion.textContent ?? "", /Destination:\s*Europe · EN/);
    const europeSource = europeRegion.querySelector<HTMLSelectElement>('[data-testid="select-copy-source-document-1-europe-edition-en"]')!;
    assert.equal(europeSource.value, "", "opening a destination must not auto-select a source");
    assert.match(europeSource.textContent ?? "", /United Arab Emirates · EN · revision 8 · published/);
    assert.doesNotMatch(europeSource.textContent ?? "", /Europe · EN/);

    const saudiOpen = view.container.querySelector<HTMLButtonElement>('[data-testid="button-copy-from-market-document-1-ksa-edition-en"]')!;
    await React.act(async () => saudiOpen.click());
    await settle();
    assert.deepEqual(fetches.candidateUrls, [
      "/api/documents/document-1/market-copy-candidates/europe/en",
      "/api/documents/document-1/market-copy-candidates/ksa/en",
    ]);
    const saudiRegion = view.container.querySelector<HTMLElement>('[aria-label="Copy source selection for Saudi Arabia"]')!;
    assert.match(saudiRegion.textContent ?? "", /Destination:\s*Saudi Arabia · EN/);
    const source = saudiRegion.querySelector<HTMLSelectElement>('[data-testid="select-copy-source-document-1-ksa-edition-en"]')!;
    assert.equal(source.value, "", "the Saudi destination must also start without a source selection");
    assert.equal(source.id, "copy-source-document-1-ksa-edition-en", "source labels are scoped to the document as well as destination");
    assert.equal(saudiRegion.querySelector("label")?.htmlFor, source.id);
    assert.match(source.textContent ?? "", /United Arab Emirates · EN · revision 8 · published/);
    assert.doesNotMatch(source.textContent ?? "", /Saudi Arabia · EN/);

    await React.act(async () => changeSelect(source, "uae-revision-8"));
    await settle();
    assert.match(saudiRegion.textContent ?? "", /Selected:\s*United Arab Emirates · EN · saved revision 8 · published · workflow approved/);
    await React.act(async () => saudiRegion.querySelector<HTMLButtonElement>('[data-testid="button-confirm-copy-document-1-ksa-edition-en"]')!.click());
    assert.match(saudiRegion.textContent ?? "", /Copy saved revision 8 from United Arab Emirates · EN into Saudi Arabia · EN/);
    await React.act(async () => saudiRegion.querySelector<HTMLButtonElement>('[data-testid="button-create-market-copy-document-1-ksa-edition-en"]')!.click());
    await settle(5);

    const post = fetches.requests.find((request) => request.method === "POST");
    assert.ok(post);
    assert.equal(post.url, "/api/documents/document-1/market-edition-copies");
    assert.deepEqual(post.body, {
      destinationMarketEditionId: "ksa-edition",
      destinationLocale: "en",
      sourceRevisionId: "uae-revision-8",
      expectedSourceRevisionId: "uae-revision-8",
    });
    assert.deepEqual(view.opened, [["ksa", "en", undefined]], "successful copy opens only the response's exact destination");
  } finally {
    await view.unmount();
  }
});

test("expanding a destination shows source loading before the generated hook response arrives", async (t) => {
  let release: ((value: Response) => void) | undefined;
  const fetches = installFetch(t, (targetMarket) => new Promise<Response>((resolve) => {
    release = () => resolve(response(candidatesFor(targetMarket)));
  }));
  const view = await renderRow();
  try {
    await React.act(async () => view.container.querySelector<HTMLButtonElement>('[data-testid="button-copy-from-market-document-1-europe-edition-en"]')!.click());
    await settle();
    const region = view.container.querySelector<HTMLElement>('[aria-label="Copy source selection for Europe"]')!;
    assert.match(region.textContent ?? "", /Source selection/);
    assert.match(region.textContent ?? "", /Loading compatible saved source revisions/);
    assert.equal(region.querySelector("select"), null);
    assert.deepEqual(fetches.candidateUrls, ["/api/documents/document-1/market-copy-candidates/europe/en"]);
    release?.(response(candidatesFor("europe")));
    await settle(2);
    assert.equal(region.querySelector<HTMLSelectElement>("select")?.value, "");
  } finally {
    await view.unmount();
  }
});

test("an empty source response can be retried without selecting a source", async (t) => {
  let attempts = 0;
  const fetches = installFetch(t, (targetMarket) => {
    attempts += 1;
    return response(attempts === 1 ? { documentId: "document-1", targetMarket, targetLocale: "en", candidates: [] } : candidatesFor(targetMarket));
  });
  const view = await renderRow();
  try {
    await React.act(async () => view.container.querySelector<HTMLButtonElement>('[data-testid="button-copy-from-market-document-1-europe-edition-en"]')!.click());
    await settle();
    const region = view.container.querySelector<HTMLElement>('[aria-label="Copy source selection for Europe"]')!;
    assert.match(region.textContent ?? "", /No compatible authorized saved source revision is available/);
    assert.equal(region.querySelector("select"), null);
    const refresh = Array.from(region.querySelectorAll("button")).find((button) => button.textContent?.includes("Refresh sources"));
    assert.ok(refresh);
    await React.act(async () => refresh!.click());
    await settle();
    assert.equal(fetches.candidateAttempts, 2);
    assert.equal(region.querySelector<HTMLSelectElement>("select")?.value, "");
  } finally {
    await view.unmount();
  }
});

for (const [status, label] of [[403, "permission"], [500, "server"]] as const) {
  test(`${status} source loading errors hide stale choices and retry`, async (t) => {
    let attempts = 0;
    const fetches = installFetch(t, (targetMarket) => {
      attempts += 1;
      return response(attempts === 1 ? { error: status === 403 ? "forbidden" : "failed" } : candidatesFor(targetMarket), attempts === 1 ? status : 200);
    });
    const view = await renderRow();
    try {
      await React.act(async () => view.container.querySelector<HTMLButtonElement>('[data-testid="button-copy-from-market-document-1-ksa-edition-en"]')!.click());
      await settle();
      const region = view.container.querySelector<HTMLElement>('[aria-label="Copy source selection for Saudi Arabia"]')!;
      assert.equal(region.querySelector("select"), null, `${label} responses must not expose stale or auto-selected sources`);
      assert.match(region.textContent ?? "", status === 403
        ? /You do not have permission to inspect compatible source editions/
        : /Compatible source editions could not be loaded/);
      const retry = region.querySelector<HTMLButtonElement>('[data-testid="button-retry-copy-sources-document-1-ksa-edition-en"]')!;
      assert.ok(retry);
      await React.act(async () => retry.click());
      await settle();
      assert.equal(fetches.candidateAttempts, 2);
      assert.equal(region.querySelector<HTMLSelectElement>("select")?.value, "");
    } finally {
      await view.unmount();
    }
  });
}

test("a mismatched candidate envelope is treated as empty for its destination", async (t) => {
  const fetches = installFetch(t, () => response({
    documentId: "document-1",
    targetMarket: "ksa",
    targetLocale: "fr",
    candidates: candidatesFor("europe").candidates,
  }));
  const view = await renderRow();
  try {
    await React.act(async () => view.container.querySelector<HTMLButtonElement>('[data-testid="button-copy-from-market-document-1-europe-edition-en"]')!.click());
    await settle();
    const region = view.container.querySelector<HTMLElement>('[aria-label="Copy source selection for Europe"]')!;
    assert.match(region.textContent ?? "", /No compatible authorized saved source revision is available/);
    assert.equal(region.querySelector("select"), null);
    assert.deepEqual(fetches.candidateUrls, ["/api/documents/document-1/market-copy-candidates/europe/en"]);
  } finally {
    await view.unmount();
  }
});