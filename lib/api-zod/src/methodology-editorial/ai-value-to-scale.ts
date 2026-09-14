import {
  defineMethodologyEditorialTemplate,
  fixedList,
  group,
  link,
  text,
} from "./contract";

/** The exact route-owned hero fallback, retained for inventory and CMS migration. */
export const heroSeed = {
  breadcrumb: "Methodologies / 01",
  title: "AI Value-to-Scale.",
  description: "Can this organisation repeatedly move valuable AI into sustained operation?",
  supportingText: "This proprietary Cognirise model assesses the conditions that connect value, delivery, adoption, authority and outcomes. It does not rank AI consumption, certify compliance or claim a statistical benchmark.",
  imageSrc: "/images/cognirise/method-vts-v2.jpg",
  imageAlt: "Violet, pink and orange light streams connect architectural portals and converge at a circular portal on the right.",
  imagePosition: "right center",
  imageCaptionSubtitle: "Systemic Readiness",
  imageCaptionTitle: "Connecting opportunity to sustained value.",
} as const;

export const aiValueToScaleEditorial = defineMethodologyEditorialTemplate({
  template: "ai-value-to-scale",
  editorial: group({
    heroActions: group({
      assessment: link("Start your assessment", "#assessment", "Assessment CTA"),
      model: link("See the model", "#model", "Model anchor CTA"),
    }),
    relationship: group({
      startHereWhen: text("An organization-wide or portfolio-level constraint prevents repeatable movement from opportunity to sustained value.", "Start here when", { format: "long" }),
      decision: text("What prevents repeatable movement from opportunity to sustained value?", "Decision", { format: "long" }),
      output: text("A seven-dimension maturity profile, a register of evidence gaps, and prioritized actions.", "Output", { format: "long" }),
      connectsToIdao: text("Identifies systemic constraints, priorities and potential initiatives. Evidence determines whether selected work enters Innovate or a later IDAO stage; the method does not force every initiative to start at Innovate.", "Connection to IDAO", { format: "long" }),
      connectsToAuthority: text("Tests whether authority governance is an organizational capability. The Agent Authority Model separately sets actual autonomy limits for specific handovers in selected initiatives.", "Connection to Agent Authority", { format: "long" }),
      reassessWhen: text("After a completed IDAO cycle reveals new organizational evidence, or when market, platform, or regulatory constraints change materially.", "Reassess when", { format: "long" }),
      doesNotDecide: text("Which specific use cases to fund next (use AI Use-Case Prioritization) or the readiness of a single workflow (use Agentic Operations Readiness).", "Does not decide", { format: "long" }),
    }),
    model: group({
      kicker: text("The Framework", "Model eyebrow"),
      heading: text("Five stages. Seven conditions. Evidence before confidence.", "Model heading", { format: "long" }),
      conditionsHeading: text("Seven Conditions", "Conditions panel heading"),
      conditionsNote: text("Weak-condition evidence can move work to an earlier IDAO entry or loopback. Stronger evidence can support a later entry; authority limits remain separate.", "Conditions panel note", { format: "long" }),
      idaoEntryPointsHeading: text("IDAO Entry Points", "IDAO entry points heading"),
      idaoEntryPoints: fixedList("IDAO entry point descriptions", [
        group({
          label: text("Innovate:", "Innovate entry label"),
          description: text("investigate unresolved assumptions", "Innovate entry description"),
        }),
        group({
          label: text("Demonstrate:", "Demonstrate entry label"),
          description: text("prove the selected work in context", "Demonstrate entry description"),
        }),
        group({
          label: text("Activate or Operate update:", "Activate or Operate entry label"),
          description: text("use sufficiently strong evidence responsibly", "Activate or Operate entry description"),
        }),
      ]),
      authorityHeading: text("Agent Authority is Separate", "Authority panel heading"),
      authorityBody: text("VTS tests if governance is an organizational capability. The Agent Authority Model sets actual limits for specific handovers.", "Authority panel body", { format: "long" }),
      stagesHeading: text("Maturity Stages", "Maturity stages heading"),
      dimensionsHeading: text("Assessment Dimensions", "Assessment dimensions heading"),
    }),
    instructions: group({
      kicker: text("How to use it", "Instructions eyebrow"),
      heading: text("Score what the evidence supports.", "Instructions heading", { format: "long" }),
      steps: fixedList("Evidence-scoring steps", [
        group({
          number: text("01", "Step one number"),
          heading: text("Convene different perspectives.", "Step one heading"),
          body: text("Include business, operations, technology, workforce and risk. AI adoption impacts the entire organizational structure.", "Step one body", { format: "long" }),
        }),
        group({
          number: text("02", "Step two number"),
          heading: text("Select the highest stage you can evidence.", "Step two heading"),
          body: text("Aspirations and isolated pilots do not count as operating evidence. Rate what exists today, not what is planned.", "Step two body", { format: "long" }),
        }),
        group({
          number: text("03", "Step three number"),
          heading: text("Inspect the pattern.", "Step three heading"),
          body: text("The overall stage uses the average of your seven dimension scores. Averages can hide a weak condition that prevents scale, so review lower-scoring dimensions as priorities rather than treating the headline stage as permission to proceed.", "Step three body", { format: "long" }),
        }),
        group({
          number: text("04", "Step four number"),
          heading: text("Act on the lowest dimensions.", "Step four heading"),
          body: text("Use the recommendations to frame a Value Scan or an IDAO entry point focused specifically on resolving those gaps.", "Step four body", { format: "long" }),
        }),
      ]),
    }),
    sources: group({
      heading: text("Sources and model boundary", "Sources heading"),
      boundary: text("Sources were reviewed on 9 September 2026 to understand established management-system, risk and market maturity themes. Stage names, dimensions, prompts, scoring and action logic on this page are Cognirise proprietary content; they are not reproduced competitor benchmarks. No comparative percentile or performance claim is made.", "Sources boundary", { format: "long" }),
      links: fixedList("Sources", [
        link("NIST AI Risk Management Framework 1.0 (2023)", "https://www.nist.gov/itl/ai-risk-management-framework", "NIST AI Risk Management Framework"),
        link("ISO/IEC 42001 AI management systems (2023)", "https://www.iso.org/standard/81230.html", "ISO/IEC 42001"),
        link("EU AI Act, Regulation (EU) 2024/1689 (2024)", "https://eur-lex.europa.eu/eli/reg/2024/1689/oj", "EU AI Act"),
        link("McKinsey, The state of AI in 2023: Generative AI's breakout year (2023)", "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai-in-2023-generative-ais-breakout-year", "McKinsey state of AI"),
        link("BCG, AI Radar 2025 (2025)", "https://www.bcg.com/publications/2025/ai-radar-global-ai-adoption-in-2025", "BCG AI Radar"),
        link("Accenture, The Art of AI Maturity (2022)", "https://www.accenture.com/us-en/insights/artificial-intelligence/ai-maturity-and-transformation", "Accenture Art of AI Maturity"),
      ]),
    }),
  }),
});