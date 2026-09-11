import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { ContentEditor } from "./ContentEditor.tsx";
import { IndustryVisualWorkspace } from "./IndustryVisualWorkspace.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const educationContent = {
  schemaVersion: 1,
  legacyPath: "/industries/education",
  name: "Education",
  shortName: "Education",
  thesis: "A thesis",
  accent: "Accent",
  dek: "Summary",
  opportunity: "Opportunity",
  capabilities: [],
  selectedWork: { description: "CTA-only selected-work description" },
  image: "/images/education.jpg",
  imageAlt: "Education",
  variant: "field",
  pressures: [],
  reversal: { title: "Reversal", body: "Detail" },
  myth: { claim: "Myth", verdict: "Verdict" },
  gcc: "Market",
  service: { label: "Service", href: "/services", firstMove: "First move" },
  uses: [],
  sources: [],
  educationPov: {
    version: 2,
    introduction: "Introduction",
    strategicShift: "Shift",
    patternQuote: "Quote",
    globalDirection: "Direction",
    convictions: [],
    valueDomains: [],
    applications: [{ title: "Student experience", items: [{ title: "Application", body: "Detail", sourceUrls: [] }] }],
    signals: [{ institution: "University", signal: "Signal", implication: "Implication", sourceUrls: [] }],
    targetState: [],
    roadmap: [],
    leadershipTest: "Leadership",
  },
} as Record<string, any>;

function renderSection(section: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ContentEditor kind="industry" value={educationContent} onChange={() => {}} errors={[]} industrySection={section} />
      </QueryClientProvider>,
    );
  } finally {
    client.clear();
  }
}

test("Education CTA inspector renders selected work while applications does not", () => {
  const cta = renderSection("cta");
  const applications = renderSection("applications");

  assert.match(cta, /Selected work section description/);
  assert.match(cta, /CTA-only selected-work description/);
  assert.doesNotMatch(applications, /Selected work section description/);
  assert.match(applications, /Application groups/);
  assert.match(applications, /Institutional signals/);
});

test("the rendered narrow workspace stacks the preview after a 350px inspector", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <IndustryVisualWorkspace
          content={educationContent}
          onChange={() => {}}
          errors={[]}
          disabled={false}
          market="uae"
          locale="en-US"
          hasUnsaved={false}
          requestPreview={async () => undefined}
        />
      </QueryClientProvider>,
    );
    assert.match(markup, /data-layout="stacked"/);
    assert.match(markup, /min-w-\[350px\]/);
    assert.ok(markup.indexOf('data-testid="industry-inspector"') < markup.indexOf('data-testid="industry-preview-pane"'));
  } finally {
    client.clear();
  }
});