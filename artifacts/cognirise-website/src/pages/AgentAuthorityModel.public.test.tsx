import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublishedContent } from "@workspace/api-client-react";
import type { FrameworkContent } from "@workspace/api-zod";
import { validateCmsContent } from "@workspace/api-zod";
import { contentRecord, type CmsRecord } from "@/lib/cms";

type AgentAuthorityFrameworkContent = Extract<FrameworkContent, { template: "agent-authority" }>;

const actualPayloadUrl = process.env.CMS_ACTUAL_FRAMEWORK_URL
  ?? "http://127.0.0.1:80/api/public/content/uae/en/framework/agent-authority-model";

// The direct SSR test runs through tsx rather than Vite's automatic JSX
// runtime. The page also reads the origin while deriving page metadata.
(globalThis as typeof globalThis & { React: typeof React }).React = React;
type TestLocation = { origin: string; pathname: string; search: string; hash: string };
type TestWindow = {
  location: TestLocation;
  addEventListener: () => void;
  removeEventListener: () => void;
};

(globalThis as unknown as {
  window: TestWindow;
}).window = {
  location: {
    origin: "http://127.0.0.1",
    pathname: "/methodologies/agent-authority-model",
    search: "",
    hash: "",
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as unknown as { location: TestLocation }).location = {
  origin: "http://127.0.0.1",
  pathname: "/methodologies/agent-authority-model",
  search: "",
  hash: "",
};

const { AgentAuthorityLayout } = await import("./AgentAuthorityModel");

const governedFixtureGuardrails: NonNullable<AgentAuthorityFrameworkContent["guardrails"]> = {
  heading: "CMS governed guardrails heading",
  opening: "CMS governed opening paragraph.",
  definition: "CMS governed definition paragraph.",
  bankExample: {
    beforeQuote: "CMS bank lead before ",
    quote: "\"CMS governed quote\"",
    afterQuote: " CMS bank conclusion after.",
  },
  comparisonHeading: "CMS governed comparison heading",
  comparisonColumns: {
    guardrails: "CMS guardrails column",
    authorityModel: "CMS authority column",
  },
  comparisonRows: [
    {
      label: "CMS row one",
      guardrails: "CMS guardrail one",
      authorityModel: "CMS authority one",
      guardrailsEmphasis: "plain",
      authorityModelEmphasis: "plain",
    },
    {
      label: "CMS row two",
      guardrails: "CMS guardrail two",
      authorityModel: "CMS authority two",
      guardrailsEmphasis: "plain",
      authorityModelEmphasis: "plain",
    },
    {
      label: "CMS row three",
      guardrails: "CMS guardrail three",
      authorityModel: "CMS authority three",
      guardrailsEmphasis: "italic",
      authorityModelEmphasis: "italic",
    },
  ],
  unit: {
    heading: "CMS governed unit heading",
    paragraphs: ["CMS governed unit paragraph one.", "CMS governed unit paragraph two."],
    emphasis: "CMS governed unit emphasis.",
  },
  firstFigure: {
    asset: "aam-guardrails-vs-authority.svg",
    altText: "CMS governed first figure accessible description.",
    captionLabel: "CMS figure one label",
    captionLead: "CMS figure one lead.",
    captionBody: "CMS figure one caption body.",
  },
  interaction: {
    heading: "CMS governed interaction heading",
    introduction: "CMS governed interaction introduction.",
    exposure: {
      lead: "CMS exposure lead.",
      body: "CMS exposure body.",
    },
    evidence: {
      lead: "CMS evidence lead.",
      body: "CMS evidence body.",
    },
    controlsIntroduction: "CMS controls introduction.",
    requiredControls: {
      lead: "CMS required controls lead.",
      bodyBeforeExamples: "CMS required controls body.",
      assuranceExample: "CMS assurance example.",
      betweenExamples: "CMS bridge text.",
      controlExample: "CMS control example.",
      conclusion: "CMS required controls conclusion.",
    },
    compensatingControls: {
      lead: "CMS compensating controls lead.",
      bodyBeforeContent: "CMS compensating controls before content.",
      content: "CMS constrained content.",
      bodyAfterContent: "CMS compensating controls after content.",
    },
  },
  secondFigure: {
    asset: "aam-how-they-interact.svg",
    altText: "CMS governed second figure accessible description.",
    captionLabel: "CMS figure two label",
    captionLead: "CMS figure two lead.",
    captionBody: "CMS figure two caption body.",
  },
  designRule: {
    heading: "CMS governed design rule heading",
    quote: "CMS governed design rule quote.",
    conclusion: "CMS governed design rule conclusion.",
    failure: "CMS governed design rule failure.",
    closingEmphasis: "CMS governed closing emphasis.",
  },
};

const governedFixtureContent: AgentAuthorityFrameworkContent = {
  schemaVersion: 1,
  template: "agent-authority",
  teaser: "CMS governed teaser.",
  handoverExplanation: "CMS governed handover explanation.",
  methodology: [{ type: "paragraph", text: "CMS governed methodology paragraph." }],
  workedExample: {
    sector: "CMS sector",
    title: "CMS handover",
    handover: "action",
    reversibility: "R2",
    reach: "H2",
    exposureBand: "E2",
    oversight: "On the loop",
    detail: "CMS worked example detail.",
    requestedAuthority: "on-loop",
    accountableRole: "CMS accountable role",
    promotionEvidence: "CMS promotion evidence",
    automaticDemotion: "CMS automatic demotion",
  },
  sectorExamples: [],
  guardrails: governedFixtureGuardrails,
  visibility: "public",
  order: 1,
  sources: [],
  relatedIds: [],
};

const governedFixtureFramework = {
  ...governedFixtureContent,
  id: "cms-fixture-framework-id",
  slug: "agent-authority-model",
  title: "CMS fixture Agent Authority Model",
  summary: "CMS fixture summary",
  media: [],
  seo: undefined,
  publishedAt: "",
  updatedAt: "",
  market: "uae",
  requestedMarket: "uae",
  usedFallback: false,
} as unknown as CmsRecord<AgentAuthorityFrameworkContent>;

function renderFixture(preview: boolean, includeGuardrails = true) {
  const framework = includeGuardrails
    ? governedFixtureFramework
    : { ...governedFixtureFramework, guardrails: undefined };
  return renderToStaticMarkup(
    <AgentAuthorityLayout framework={framework} renderPolicy="cms" preview={preview} />,
  );
}

function figureContainingCaption(html: string, caption: string) {
  const captionIndex = html.indexOf(caption);
  assert.ok(captionIndex >= 0, `missing figure caption ${caption}`);
  const figureStart = html.lastIndexOf("<figure", captionIndex);
  const figureEnd = html.indexOf("</figure>", captionIndex);
  assert.ok(figureStart >= 0 && figureEnd > captionIndex, `caption ${caption} is not inside a figure`);
  return html.slice(figureStart, figureEnd + "</figure>".length);
}

test("the actual published Agent Authority payload normalizes into visible guardrails DOM", async (context) => {
  let response: Response;
  try {
    response = await fetch(actualPayloadUrl);
  } catch (error) {
    context.skip(`actual CMS endpoint unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (response.status !== 200) {
    context.skip(`actual CMS endpoint returned HTTP ${response.status}`);
    return;
  }

  const payload = await response.json() as PublishedContent;
  const content = payload.content as AgentAuthorityFrameworkContent;
  const validation = validateCmsContent("framework", content, "publish");
  assert.equal(validation.success, true);
  assert.equal(payload.slug, "agent-authority-model");
  assert.equal(content.template, "agent-authority");
  assert.equal(content.guardrails?.heading, "Guardrails are not an authority model");
  assert.equal(content.guardrails?.firstFigure.asset, "aam-guardrails-vs-authority.svg");
  assert.equal(content.guardrails?.secondFigure.asset, "aam-how-they-interact.svg");

  const framework = contentRecord(payload, "framework");
  if (framework.template !== "agent-authority") throw new Error("Expected the Agent Authority framework template.");
  const html = renderToStaticMarkup(
    <AgentAuthorityLayout framework={framework} renderPolicy="cms" />,
  );
  const publishedGuardrails = content.guardrails;
  assert.ok(publishedGuardrails);
  assert.match(html, /id="guardrails-and-authority"/);
  assert.match(html, /Guardrails are not an authority model/);
  assert.ok(html.includes(publishedGuardrails.firstFigure.altText));
  assert.ok(html.includes(publishedGuardrails.secondFigure.altText));
  assert.ok(html.includes(publishedGuardrails.firstFigure.captionBody));
  assert.ok(html.includes(publishedGuardrails.secondFigure.captionBody));
  assert.doesNotMatch(html, /aam-guardrails-vs-authority\.svg/);
  assert.doesNotMatch(html, /aam-how-they-interact\.svg/);
});

test("public and governed preview render native figures with governed copy intact", () => {
  const publicHtml = renderFixture(false);
  const previewHtml = renderFixture(true);
  const expectedGovernedCopy = [
    governedFixtureGuardrails.heading,
    governedFixtureGuardrails.opening,
    governedFixtureGuardrails.definition,
    governedFixtureGuardrails.bankExample.quote.replaceAll("\"", ""),
    governedFixtureGuardrails.comparisonHeading,
    governedFixtureGuardrails.unit.paragraphs[0],
    governedFixtureGuardrails.unit.emphasis,
    governedFixtureGuardrails.interaction.introduction,
    governedFixtureGuardrails.interaction.exposure.body,
    governedFixtureGuardrails.interaction.evidence.body,
    governedFixtureGuardrails.interaction.requiredControls.controlExample,
    governedFixtureGuardrails.interaction.compensatingControls.content,
    governedFixtureGuardrails.designRule.quote,
    governedFixtureGuardrails.designRule.closingEmphasis,
    governedFixtureGuardrails.firstFigure.altText,
    governedFixtureGuardrails.firstFigure.captionLabel,
    governedFixtureGuardrails.firstFigure.captionLead,
    governedFixtureGuardrails.firstFigure.captionBody,
    governedFixtureGuardrails.secondFigure.altText,
    governedFixtureGuardrails.secondFigure.captionLabel,
    governedFixtureGuardrails.secondFigure.captionLead,
    governedFixtureGuardrails.secondFigure.captionBody,
  ];

  const publicGuardrailsStart = publicHtml.indexOf('id="guardrails-and-authority"');
  const publicStandardsStart = publicHtml.indexOf("Standards provenance");
  const previewGuardrailsStart = previewHtml.indexOf('id="guardrails-and-authority"');
  const previewStandardsStart = previewHtml.indexOf("Standards provenance");
  assert.ok(publicGuardrailsStart >= 0 && publicStandardsStart > publicGuardrailsStart);
  assert.ok(previewGuardrailsStart >= 0 && previewStandardsStart > previewGuardrailsStart);
  assert.equal(
    publicHtml.slice(publicGuardrailsStart, publicStandardsStart),
    previewHtml.slice(previewGuardrailsStart, previewStandardsStart),
    "public and preview must use the same guardrails layout",
  );

  for (const html of [publicHtml, previewHtml]) {
    for (const copy of expectedGovernedCopy) assert.ok(html.includes(copy), `missing governed copy: ${copy}`);
    for (const figure of [governedFixtureGuardrails.firstFigure, governedFixtureGuardrails.secondFigure]) {
      const figureMarkup = figureContainingCaption(html, figure.captionLabel);
      assert.doesNotMatch(figureMarkup, /<img\b|<svg\b|<canvas\b/i);
    }
    assert.doesNotMatch(html, /aam-guardrails-vs-authority\.svg/);
    assert.doesNotMatch(html, /aam-how-they-interact\.svg/);
    for (const label of [
      "Front-Desk Agent",
      "Answer a clinic question",
      "Issue a refund",
      "Knowledge",
      "R1 / H1",
      "Exposure sets the ceiling",
      "Evidence earns the climb",
      "E1",
      "E2",
      "E3",
      "E4",
      "E5",
      "Permitted",
      "Promotion",
      "Compensation",
      "A better model does not",
    ]) {
      assert.ok(html.includes(label), `missing native diagram label: ${label}`);
    }
  }
});

test("public and preview omit the complete guardrails section when a revision has no guardrails", () => {
  for (const preview of [false, true]) {
    const html = renderFixture(preview, false);
    assert.doesNotMatch(html, /id="guardrails-and-authority"/);
    assert.doesNotMatch(html, /CMS governed guardrails heading/);
    assert.doesNotMatch(html, /aam-guardrails-vs-authority\.svg|aam-how-they-interact\.svg/);
  }
});
