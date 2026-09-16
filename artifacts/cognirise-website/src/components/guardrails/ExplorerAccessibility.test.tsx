import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { SetProveHoldActionMap } from "./SetProveHoldActionMap";
import { FourLayerComparison } from "./FourLayerComparison";
import { LifecycleMatrix } from "./LifecycleMatrix";
import { GuardrailsLayout } from "../../pages/GuardrailsFramework";
import { MarkdownInline } from "./MarkdownInline";

const normalize = (html: string) => html.replace(/<[^>]*>/g, "").replace(/<!-- -->/g, "").replace(/\s+/g, " ").trim();
const renderedText = (text: string) => normalize(renderToString(<MarkdownInline text={text} />));

const mockFramework: any = {
  template: "guardrails",
  contentVersion: "guardrails-set-prove-hold-v1",
  title: "Set Prove Hold",
  hero: {
    eyebrow: "Methodology",
    headline: "Guardrails",
    subheadline: "Sub",
    strapline: "Strap",
    primaryAction: { label: "Go", href: "/" },
    secondaryAction: { label: "Secondary", href: "/" }
  },
  overview: {
    heading: "Overview",
    intro: "Intro",
    phases: [
      { id: "set", title: "Set", caption: "Set cap", mode: "sequential", actionIds: ["a1"] },
      { id: "prove", title: "Prove", caption: "Prove cap", mode: "pre-launch-tests", actionIds: ["a2"] },
      { id: "hold", title: "Hold", caption: "Hold cap", mode: "concurrent", actionIds: ["a3"] }
    ]
  },
  actions: [
    { id: "a1", phase: "set", order: "1", title: "Action 1", statement: "Action 1 detail.", explanation: ["Exp 1"], owner: "Owner 1", outputOrCadence: { label: "Output", value: "Output 1" }, failureCondition: "Fail 1", callout: "Callout 1" },
    { id: "a2", phase: "prove", order: "2", title: "Action 2", statement: "Action 2 detail.", explanation: ["Exp 2"], owner: "Owner 2", outputOrCadence: { label: "Output", value: "Output 2" }, failureCondition: "Fail 2", callout: "Callout 2" },
    { id: "a3", phase: "hold", order: "3", title: "Action 3", statement: "Action 3 detail.", explanation: ["Exp 3"], owner: "Owner 3", outputOrCadence: { label: "Output", value: "Output 3" }, failureCondition: "Fail 3", callout: "Callout 3" }
  ],
  layers: {
    heading: "Layers",
    intro: "Layers intro",
    exampleRule: "Example rule",
    callout: "Layers callout",
    rows: [
      { id: "policy", strength: 1, title: "Policy", whatItIs: "Policy What", customerDataExample: "Policy Data", limitation: "Policy Limit" },
      { id: "architecture", strength: 4, title: "Architecture", whatItIs: "Arch What", customerDataExample: "Arch Data", limitation: "Arch Limit" }
    ]
  },
  lifecycleMatrix: {
    heading: "Matrix",
    intro: "Matrix intro",
    callout: "Matrix context",
    measure: "Matrix measure",
    columnHeaders: ["Layer", "Set", "Prove", "Hold"],
    rows: [
      { layerId: "policy", layer: "Policy", set: "P Set", prove: "P Prove", hold: "P Hold" }
    ]
  },
  moves: {
    heading: "Moves",
    intro: "Moves intro",
    items: [
      { id: "m1", number: 1, title: "Move 1", body: "Move 1 body" }
    ],
    cta: {
      heading: "CTA Head",
      body: "CTA Body",
      button: { label: "CTA Button", href: "/" }
    }
  },
  relatedLink: {
    title: "Related",
    body: "Related body",
    href: "/"
  }
};

describe("Guardrails Set Prove Hold redesign SSR & Component coverage", () => {
  it("SetProveHoldActionMap renders static reading equivalents and navigation targets", () => {
    const html = renderToString(<SetProveHoldActionMap phases={mockFramework.overview.phases} actions={mockFramework.actions} />);
    const text = normalize(html);
    assert.ok(text.includes(renderedText("Action 1 detail.")), "Selected action detail must render");
    assert.match(html, /data-nav-section/);
    assert.match(html, /id="guardrails-phase-set"/);
  });

  it("FourLayerComparison renders static equivalents", () => {
    const html = renderToString(<FourLayerComparison layers={mockFramework.layers} />);
    const text = normalize(html);
    assert.ok(text.includes(renderedText("Arch What")), "Selected layer detail must render");
    assert.match(html, /role="tabpanel"/);
  });

  it("LifecycleMatrix has no interactive buttons and renders static content", () => {
    const html = renderToString(<LifecycleMatrix matrix={mockFramework.lifecycleMatrix} />);
    const text = normalize(html);
    assert.ok(text.includes(renderedText("P Set")), "Matrix content must render");
    assert.doesNotMatch(html, /<button/i, "Matrix must not contain interactive buttons");
    assert.doesNotMatch(html, /aria-pressed/i, "Matrix must not have selection state");
  });

  it("GuardrailsLayout renders navigator and lacks legacy references block", () => {
    const html = renderToString(
      <Router ssrPath="/methodologies/guardrails-framework">
        <GuardrailsLayout framework={mockFramework} />
      </Router>,
    );
    const text = normalize(html);
    assert.doesNotMatch(text, /What this is built from/i, "References block must be completely absent");
    assert.match(html, /id="overview"/, "Navigator targets must exist");
    assert.match(html, /href="#overview"/, "Navigator links must exist");
  });
});
