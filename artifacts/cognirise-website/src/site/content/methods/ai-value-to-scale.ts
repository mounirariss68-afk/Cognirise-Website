import { aiValueToScaleEditorial } from "@workspace/api-zod";

/** Code-owned copy for the Value-to-Scale page. */
type Seed = typeof aiValueToScaleEditorial.seed;
const seed = aiValueToScaleEditorial.seed;

export const VTS_HERO = {
  breadcrumb: "Methods / 02",
  title: "Value-to-Scale.",
  description: "Can your organisation take AI from a pilot into daily use, again and again?",
  supportingText: "A Cognirise model that assesses the seven conditions linking value, delivery, adoption, authority and outcomes. It does not rank AI spending, certify compliance or claim a statistical benchmark.",
  imageSrc: "/images/cognirise/method-vts-v2.jpg",
  imageAlt: "Violet, pink and orange light streams connect architectural portals and converge at a circular portal on the right.",
  imagePosition: "right center",
  imageCaptionSubtitle: "The whole system",
  imageCaptionTitle: "Connecting an opportunity to value that lasts.",
};

export const VTS_EDITORIAL = {
  ...seed,
  heroActions: {
    assessment: { label: "Start the assessment", href: "#assessment" },
    model: { label: "See the model", href: "#model" },
  },
  relationship: {
    startHereWhen: "A constraint across the organisation or the portfolio stops AI moving from an opportunity into value that lasts, more than once.",
    decision: "What stops AI moving from an opportunity into lasting value, again and again?",
    output: "A profile across seven conditions, a register of evidence gaps, and actions in order of priority.",
    connectsToIdao: "Finds the constraints, priorities and candidate initiatives across the organisation. The evidence decides whether selected work enters at Innovate or at a later step; the method does not force every initiative to start at Innovate.",
    connectsToAuthority: "Tests whether setting authority is a capability the organisation has. The Agent Authority Model separately sets the limits for specific handovers in the selected initiatives.",
    reassessWhen: "After a completed IDAO cycle reveals new evidence about the organisation, or when market, platform or regulatory constraints change materially.",
    doesNotDecide: "Which use cases to fund next (use the prioritisation tool) or whether one workflow is ready (use the operations readiness check).",
  },
  model: {
    ...seed.model,
    kicker: "The model",
    heading: "Five stages. Seven conditions. Evidence before confidence.",
    conditionsHeading: "Seven conditions",
    conditionsNote: "Weak evidence on a condition can move work to an earlier step or back a step. Stronger evidence can support a later entry; the limits on authority stay separate.",
    idaoEntryPointsHeading: "Where work enters the four steps",
    idaoEntryPoints: [
      { label: "Innovate:", description: "investigate the open assumptions" },
      { label: "Demonstrate:", description: "prove the selected work in context" },
      { label: "Activate or Operate:", description: "use evidence that is strong enough, with care" },
    ],
    authorityHeading: "Agent authority is separate",
    authorityBody: "Value-to-Scale tests whether setting authority is a capability the organisation has. The Agent Authority Model sets the actual limits for specific handovers.",
    stagesHeading: "The five stages",
    dimensionsHeading: "The seven conditions",
  },
  instructions: {
    ...seed.instructions,
    kicker: "How to use it",
    heading: "Score what the evidence supports.",
    steps: [
      { number: "01", heading: "Bring different perspectives.", body: "Include business, operations, technology, workforce and risk. AI adoption touches the whole organisation." },
      { number: "02", heading: "Select the highest stage you can show evidence for.", body: "Ambitions and isolated pilots do not count as operating evidence. Rate what exists today, not what is planned." },
      { number: "03", heading: "Look at the pattern.", body: "The overall stage is the average of your seven scores. An average can hide one weak condition that blocks scale. Treat the lowest conditions as priorities, not the headline stage as permission to proceed." },
      { number: "04", heading: "Act on the lowest conditions.", body: "Use the recommendations to frame a Value Scan or an entry step that is focused on closing those gaps." },
    ],
  },
  sources: {
    ...seed.sources,
    heading: "Sources and the model's limits",
    boundary: "The sources below were reviewed on 9 September 2026 for established management-system, risk and market maturity themes. The stage names, conditions, prompts, scoring and action logic on this page are Cognirise's own; they are not reproduced from anyone's benchmark. No comparison with other organisations is claimed.",
  },
} as unknown as Seed;
