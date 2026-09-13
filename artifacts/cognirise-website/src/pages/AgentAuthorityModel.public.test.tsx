import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublishedContent } from "@workspace/api-client-react";
import type { FrameworkContent } from "@workspace/api-zod";
import { validateCmsContent } from "@workspace/api-zod";
import { contentRecord } from "@/lib/cms";

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
  const content = payload.content as FrameworkContent;
  const validation = validateCmsContent("framework", content, "publish");
  assert.equal(validation.success, true);
  assert.equal(payload.slug, "agent-authority-model");
  assert.equal(content.template, "agent-authority");
  assert.equal(content.guardrails?.heading, "Guardrails are not an authority model");
  assert.equal(content.guardrails?.firstFigure.asset, "aam-guardrails-vs-authority.svg");
  assert.equal(content.guardrails?.secondFigure.asset, "aam-how-they-interact.svg");

  const framework = contentRecord(payload, "framework");
  const html = renderToStaticMarkup(
    <AgentAuthorityLayout framework={framework} renderPolicy="cms" />,
  );
  assert.match(html, /id="guardrails-and-authority"/);
  assert.match(html, /Guardrails are not an authority model/);
  assert.match(html, /aam-guardrails-vs-authority\.svg/);
  assert.match(html, /aam-how-they-interact\.svg/);
});