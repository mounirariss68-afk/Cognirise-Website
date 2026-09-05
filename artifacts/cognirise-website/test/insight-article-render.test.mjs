import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, create } from "react-test-renderer";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

test("publication detail can render loading then resolved data without changing hook order", async (context) => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const vite = await createServer({
    root,
    configFile: false,
    appType: "custom",
    server: { middlewareMode: true },
    plugins: [react()],
    optimizeDeps: { noDiscovery: true },
    resolve: { alias: { "@": path.join(root, "src") } },
  });
  context.after(() => vite.close());

  const { default: InsightArticle } = await vite.ssrLoadModule("/src/pages/InsightArticle.tsx");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const location = memoryLocation({ path: "/insights/loading-to-resolved" });
  let resolveRequest;
  const publication = {
    id: "publication-1",
    slug: "loading-to-resolved",
    title: "Resolved publication",
    format: "article",
    body: [],
    topics: ["governance"],
    authors: [],
    publishedAt: "2026-01-01T00:00:00.000Z",
  };

  globalThis.window = {
    location: { pathname: "/insights/loading-to-resolved" },
    umami: { track() {} },
  };
  globalThis.document = {
    title: "",
    head: { querySelector: () => null },
  };
  globalThis.fetch = () => new Promise((resolve) => {
    resolveRequest = () => resolve(new Response(JSON.stringify({
      publication,
      meta: { source: "cms" },
    }), { status: 200, headers: { "content-type": "application/json" } }));
  });
  context.after(() => {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.fetch;
  });

  let renderer;
  await act(async () => {
    renderer = create(
      React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(Router, { hook: location.hook },
          React.createElement(InsightArticle),
        ),
      ),
    );
  });
  assert.equal(renderer.root.findByProps({ role: "status" }).children.join(""), "Loading perspective…");

  await act(async () => {
    resolveRequest();
    while (queryClient.isFetching()) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  });

  const headings = renderer.root.findAllByType("h1");
  assert.equal(headings.length, 1, JSON.stringify({
    query: queryClient.getQueryCache().getAll().map((query) => query.state),
    rendered: renderer.toJSON(),
  }));
  assert.equal(headings[0].children.join(""), publication.title);
  await act(async () => renderer.unmount());
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});