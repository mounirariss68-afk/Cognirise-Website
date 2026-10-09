import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getRecommendation, isUseCaseSessionState, type UseCase } from "./AIUseCasePrioritization";
import { parseMethodSessionState } from "../lib/use-method-session-state";
import {
  aiUseCasePrioritizationEditorial,
  heroSeed,
} from "../../../../lib/api-zod/src/methodology-editorial/ai-use-case-prioritization";

function opportunity(scores: UseCase["scores"]): UseCase {
  return {
    id: "test",
    name: "Test opportunity",
    description: "",
    scores,
    caveats: "",
    dependencies: "",
  };
}

const base = {
  value: 4,
  feasibility: 4,
  timeToEvidence: 4,
  adoptionFriction: 4,
  controlBurden: 4,
  reusePotential: 4,
};

test("stage recommendations use explicit criteria rather than the total alone", () => {
  assert.equal(getRecommendation(opportunity({ ...base, value: 2 })).stage, "Stop");
  assert.equal(getRecommendation(opportunity({ ...base, feasibility: 2 })).stage, "Innovate");
  assert.equal(getRecommendation(opportunity({ ...base, adoptionFriction: 2 })).stage, "Demonstrate");
  assert.equal(getRecommendation(opportunity(base)).stage, "Activate");
});

test("high control burden and low feasibility produce an explained stop decision", () => {
  const result = getRecommendation(opportunity({ ...base, feasibility: 2, controlBurden: 2 }));
  assert.equal(result.stage, "Stop");
  assert.match(result.reason, /control burden/i);
  assert.match(result.reason, /feasibility/i);
});

test("restores only valid session opportunities and preserves an intentionally empty portfolio", () => {
  assert.deepEqual(parseMethodSessionState("[]", [opportunity(base)], isUseCaseSessionState), []);
  assert.deepEqual(
    parseMethodSessionState(JSON.stringify([opportunity(base)]), [], isUseCaseSessionState),
    [opportunity(base)],
  );
  assert.deepEqual(parseMethodSessionState('[{"id":"bad"}]', [opportunity(base)], isUseCaseSessionState), [opportunity(base)]);
});

test("the editorial seed retains the original hero, relationship, and route CTAs", () => {
  assert.deepEqual(heroSeed, {
    breadcrumb: "Methodologies / 03",
    title: "AI Use-Case Portfolio Prioritization.",
    description: "A serious working instrument for transformation leaders to transparently evaluate AI opportunities against value, feasibility, and risk—before committing funding.",
    supportingText: "This framework aligns decisions to your specific operational context, intentionally avoiding generic statistical benchmarks. The output connects directly to the IDAO delivery methodology.",
    imageSrc: "/images/cognirise/method-ucp-governed-ai-v3.jpg",
    imageAlt: "Architectural gateways and transparent panels crossed by a flowing stream of violet, pink, and coral light.",
    imageCaptionSubtitle: "Portfolio Strategy",
    imageCaptionTitle: "Directing energy where it earns value.",
  });
  assert.equal(
    aiUseCasePrioritizationEditorial.seed.relationship.startHereWhen,
    "You have multiple opportunities or a defined use case, and need to decide which should advance, how they sequence, and where they enter delivery.",
  );
  assert.deepEqual(aiUseCasePrioritizationEditorial.seed.nextSteps.valueScan, {
    label: "Book a Value Scan",
    href: "/value-scan",
  });
  assert.deepEqual(aiUseCasePrioritizationEditorial.seed.nextSteps.idaoLink, {
    label: "Explore the methodology",
    href: "/methodologies/idao",
  });
  assert.deepEqual(aiUseCasePrioritizationEditorial.seed.sampleOpportunities, [
    {
      name: "Customer Onboarding Document Extraction",
      caveats: "High data privacy requirements; PII handling must be strictly governed and approved.",
      dependencies: "Approved data access, retention rules and a named information owner.",
    },
    {
      name: "Legacy System Chat Interface",
      caveats: "API access to the legacy core banking system is undocumented and notoriously unstable.",
      dependencies: "A stable read-only integration contract and accountable system owner.",
    },
  ]);
  assert.equal(
    aiUseCasePrioritizationEditorial.seed.portfolio.boundary,
    "These are not market benchmarks, probabilities or a certification. Compare opportunities scored by the same decision group, record uncertainty as a caveat, and revisit scores when evidence changes.",
  );
});

test("CMS editorial fields stay bound at their original page positions", () => {
  const edited = structuredClone(aiUseCasePrioritizationEditorial.seed) as {
    portfolio: { heading: string };
    assessmentCard: { controlBurdenNote: { authorityLink: { label: string; href: string } } };
    nextSteps: { valueScan: { label: string; href: string } };
  };
  edited.portfolio.heading = "Edited portfolio heading";
  edited.assessmentCard.controlBurdenNote.authorityLink = {
    label: "Edited authority link",
    href: "/methodologies/agent-authority-model",
  };
  edited.nextSteps.valueScan = { label: "Edited Value Scan", href: "/value-scan" };
  const parsed = aiUseCasePrioritizationEditorial.editorialSchema.parse(edited);
  assert.equal(parsed.portfolio.heading, "Edited portfolio heading");

  const source = readFileSync(new URL("./AIUseCasePrioritization.tsx", import.meta.url), "utf8");
  assert.match(source, /methodologyEditorial<"ai-use-case-prioritization", typeof aiUseCasePrioritizationEditorial>/);
  assert.match(source, /\{editorial\.portfolio\.heading\}/);
  assert.match(source, /defaultUseCases\(editorial\.sampleOpportunities\)/);
  assert.match(source, /href=\{editorial\.controlBurdenNote\.authorityLink\.href\}/);
  assert.match(source, /href=\{editorial\.nextSteps\.valueScan\.href\}/);
  assert.match(source, /\/methodologies\/idao#innovate/);
  assert.match(source, /\/methodologies\/idao#demonstrate/);
  assert.match(source, /\/methodologies\/idao#activate/);
});