import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { validateCmsSnapshot, type FrameworkContent } from "@workspace/api-zod";
import { agentAuthorityGuardrails } from "../../../../scripts/src/cms/agent-authority-guardrails";
import {
  stagedSummaryFrameworkPayload,
  task335Summary,
} from "../../../../scripts/src/cms/task-335-agent-authority-summary";
import {
  CmsPreviewFramework,
  normalizeCmsPreviewFramework,
} from "./CmsPreviewFramework";
import type { Preview } from "./CmsPreview";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type TestLocation = { origin: string; pathname: string; search: string; hash: string };
type TestWindow = TestLocation & {
  location: TestLocation;
  addEventListener: () => void;
  removeEventListener: () => void;
  scrollY: number;
};

const location: TestLocation = {
  origin: "http://127.0.0.1",
  pathname: "/preview/task-335",
  search: "",
  hash: "",
};
Object.assign(globalThis, {
  window: {
    ...location,
    location,
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollY: 0,
  } satisfies TestWindow,
  location,
});

function stagedPayload() {
  return stagedSummaryFrameworkPayload({
    slug: "agent-authority-model",
    title: "The Agent Authority Model",
    summary: "A governed model for consequential handovers.",
    content: {
      schemaVersion: 1,
      template: "agent-authority",
      teaser: "Govern each handover according to its exposure.",
      handoverExplanation: "Authority attaches to the handover, not to the agent.",
      methodology: [{ type: "paragraph", text: "Evidence earns the climb." }],
      workedExample: {
        sector: "Travel",
        title: "Passenger re-accommodation",
        handover: "action",
        reversibility: "R3",
        reach: "H2",
        exposureBand: "E2",
        oversight: "On the loop",
        detail: "A duty manager owns the handover.",
        requestedAuthority: "on-loop",
        accountableRole: "Duty manager",
        promotionEvidence: "Measured clean rebookings.",
        automaticDemotion: "Any incident.",
      },
      sectorExamples: [],
      guardrails: agentAuthorityGuardrails,
      visibility: "public",
      order: 1,
      sources: [],
      relatedIds: [],
    },
    mediaIds: [],
    markets: ["uae"],
  });
}

function previewFor(document: Record<string, unknown>): Preview {
  return {
    kind: "framework",
    document,
    market: "uae",
    locale: "en",
    requestedMarket: "uae",
    requestedLocale: "en",
    revisionId: "task-335-draft",
    revisionNumber: 3,
    usedFallback: false,
    media: [],
    missingMediaIds: [],
    validationWarnings: [],
    navigation: { market: "uae", locale: "en", items: [], pages: [] },
  };
}

function renderPreview(preview: Preview) {
  const normalized = normalizeCmsPreviewFramework(preview);
  assert.ok(normalized.framework);
  return renderToStaticMarkup(
    <Router ssrPath="/preview/task-335">
      <QueryClientProvider client={new QueryClient()}>
        <CmsPreviewFramework
          preview={preview}
          framework={normalized.framework}
          warnings={[...new Set([...preview.validationWarnings, ...normalized.warnings])]}
        />
      </QueryClientProvider>
    </Router>,
  );
}

test("CmsPreview renders the exact staged Task 335 payload through compact summary and governed figures", () => {
  const document = stagedPayload();
  const validation = validateCmsSnapshot("framework", document, "draft");
  assert.equal(validation.success, true, validation.success ? undefined : validation.errors.join("; "));
  if (!validation.success) return;
  const content = validation.data.content as Extract<FrameworkContent, { template: "agent-authority" }>;
  assert.deepEqual(content.guardrails?.summary, task335Summary);

  const html = renderPreview(previewFor(document));
  const sectionStart = html.indexOf('id="guardrails-and-authority"');
  const sectionEnd = html.indexOf("Standards provenance", sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart);
  const section = html.slice(sectionStart, sectionEnd);

  assert.match(section, /Guardrails enforce limits\./);
  assert.match(section, /A handover is the moment an agent&#x27;s output becomes consequential/);
  assert.match(section, /Read the full explanation/);
  assert.equal((section.match(/<details\b/g) ?? []).length, 1);
  assert.doesNotMatch(section, /<details[^>]*\sopen(?:=|>)/);
  assert.match(section, /One front-desk agent sends four handovers along a shared rail/);
  assert.match(section, /Illustration 1 —/);
  assert.match(section, /One common setting, or individually governed handovers/);
  assert.match(section, /This is illustrative, not an agent-wide claim\./);
  assert.doesNotMatch(section, /The common pattern/);
});

test("CmsPreview warns and keeps legacy Guardrails copy when a summary is incomplete", () => {
  const source = stagedPayload();
  const document = {
    ...source,
    content: {
      ...source.content,
      guardrails: {
        ...source.content.guardrails,
        summary: {
          ...task335Summary,
          rules: task335Summary.rules.slice(0, 3),
        },
      },
    },
  };
  const html = renderPreview(previewFor(document));
  assert.match(html, /The saved Guardrails summary is incomplete and was omitted/);
  assert.match(html, /Most teams that have built guardrails believe they have governance/);
  assert.doesNotMatch(html, /Guardrails enforce limits\. The authority model decides/);
  assert.doesNotMatch(html, /Read the full explanation/);
});

test("protected preview footer uses the returned exact market context", () => {
  const document = stagedPayload();
  const preview = previewFor(document);
  const html = renderPreview({
    ...preview,
    market: "ksa",
    locale: "en",
    requestedMarket: "ksa",
    requestedLocale: "en",
    navigation: { market: "uae", locale: "en", items: [], pages: [] },
  });
  assert.match(html, /Market view · Riyadh · Kingdom of Saudi Arabia/);
  assert.doesNotMatch(html, /Market view · Dubai · UAE/);
  assert.match(html, /Protected saved-version preview/);
  assert.doesNotMatch(html, /not published/);
});
