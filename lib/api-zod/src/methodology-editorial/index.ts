export {
  defineMethodologyEditorialTemplate,
  fixed,
  fixedList,
  group,
  link,
  media,
  methodologyEditorialMediaValues,
  missingMethodologyMediaPins,
  text,
  type ImmutableMediaPin,
  type MethodologyEditorialDefinition,
  type MethodologyEditorialValue,
  type MethodologyMediaRole,
  type MethodologySlot,
} from "./contract";

export const METHODOLOGY_SLUGS = [
  "idao",
  "ai-use-case-prioritization",
  "ai-value-to-scale",
  "agentic-operations-readiness",
  "human-agent-operating-model",
] as const;

export type MethodologySlug = (typeof METHODOLOGY_SLUGS)[number];

/** Top-level document SEO is revision metadata, not editorial page prose.
 * These values preserve the compiled baseline for migration and no-CMS
 * delivery; an authoritative CMS revision is the only editable SEO source. */
export const methodologySeoSeeds = {
  idao: {
    title: "IDAO Methodology | Cognirise",
    description: "Innovate, Demonstrate, Activate and Operate: Cognirise's methodology for moving consequential work from opportunity to sustained operation.",
    noIndex: false,
  },
  "ai-use-case-prioritization": {
    title: "AI Use-Case Prioritization | Cognirise",
    description: "A transparent working instrument for comparing AI opportunities across value, feasibility, friction and control burden.",
    noIndex: false,
  },
  "ai-value-to-scale": {
    title: "AI Value-to-Scale Maturity Model | Cognirise",
    description: "Assess seven evidence-backed conditions for repeatedly moving valuable AI from opportunity into sustained operation.",
    noIndex: false,
  },
  "agentic-operations-readiness": {
    title: "Agentic Operations Readiness Framework | Cognirise",
    description: "Decide whether one workflow should proceed to agent delivery, needs preparation, or must stop—and identify the operating conditions to resolve.",
    noIndex: false,
  },
  "human-agent-operating-model": {
    title: "Human–Agent Operating Model Playbook | Cognirise",
    description: "A practical playbook for redesigning roles, decision rights, handovers, capabilities, incentives and adoption when AI enters live work.",
    noIndex: false,
  },
} as const satisfies Record<MethodologySlug, {
  title: string;
  description: string;
  noIndex: boolean;
}>;

export function methodologySeoSeed(template: MethodologySlug) {
  return methodologySeoSeeds[template];
}

import { z } from "zod";
import type { MethodologyEditorialDefinition, MethodologySlot } from "./contract";
import { agenticOperationsReadinessEditorial } from "./agentic-operations-readiness";
import { aiUseCasePrioritizationEditorial } from "./ai-use-case-prioritization";
import { aiValueToScaleEditorial } from "./ai-value-to-scale";
import { humanAgentOperatingModelEditorial } from "./human-agent-operating-model";
import { idaoEditorial } from "./idao";

export { agenticOperationsReadinessEditorial } from "./agentic-operations-readiness";
export { aiUseCasePrioritizationEditorial } from "./ai-use-case-prioritization";
export { aiValueToScaleEditorial } from "./ai-value-to-scale";
export { humanAgentOperatingModelEditorial } from "./human-agent-operating-model";
export { idaoEditorial } from "./idao";
export { idaoMediaInventory } from "./idao";
// Seed names deliberately include their template: exporting five generic
// `heroSeed` symbols would make a page import order-dependent and unsafe.
export { heroSeed as agenticOperationsReadinessHeroSeed } from "./agentic-operations-readiness";
export { heroSeed as aiUseCasePrioritizationHeroSeed } from "./ai-use-case-prioritization";
export { heroSeed as aiValueToScaleHeroSeed } from "./ai-value-to-scale";
export { heroSeed as humanAgentOperatingModelHeroSeed } from "./human-agent-operating-model";
export { heroSeed as idaoHeroSeed } from "./idao";

const definitions = new Map<MethodologySlug, MethodologyEditorialDefinition>([
  ["idao", idaoEditorial],
  ["ai-use-case-prioritization", aiUseCasePrioritizationEditorial],
  ["ai-value-to-scale", aiValueToScaleEditorial],
  ["agentic-operations-readiness", agenticOperationsReadinessEditorial],
  ["human-agent-operating-model", humanAgentOperatingModelEditorial],
]);

/** Called by the five template modules during module initialization. Keeping
 * registration here lets API/admin consumers ask for an exact definition
 * without accepting arbitrary framework templates. */
export function registerMethodologyEditorialDefinition<
  Definition extends MethodologyEditorialDefinition<MethodologySlug>,
>(definition: Definition): Definition {
  if (!METHODOLOGY_SLUGS.includes(definition.template)) {
    throw new Error(`Unsupported methodology template "${definition.template}".`);
  }
  const known = definitions.get(definition.template);
  if (known && known !== definition) throw new Error(`Methodology template "${definition.template}" was registered twice.`);
  return known as Definition ?? definition;
}

export type RegisteredMethodologyEditorialDefinition = {
  template: MethodologySlug;
  slots: MethodologySlot;
  seed: Record<string, unknown>;
  editorialSchema: z.ZodTypeAny;
};

export function methodologyEditorialDefinition(template: string): RegisteredMethodologyEditorialDefinition | null {
  return METHODOLOGY_SLUGS.includes(template as MethodologySlug)
    ? definitions.get(template as MethodologySlug) as RegisteredMethodologyEditorialDefinition | undefined ?? null
    : null;
}

export function methodologyEditorialDefinitions() {
  return METHODOLOGY_SLUGS.map((template) => {
    const definition = definitions.get(template);
    if (!definition) throw new Error(`Methodology template "${template}" has no editorial definition.`);
    return definition;
  });
}