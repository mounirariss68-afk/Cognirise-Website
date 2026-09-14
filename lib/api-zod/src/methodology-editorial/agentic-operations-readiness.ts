import {
  defineMethodologyEditorialTemplate,
  fixedList,
  group,
  link,
  text,
} from "./contract";

/** The shared hero continues to use the framework hero schema and its
 * immutable media binding. Keeping its compiled values here makes the
 * original source image and copy available to the migration inventory. */
export const heroSeed = {
  breadcrumb: "Methodologies / 02",
  title: "Ready for agents?",
  description: "Test one workflow—not an organisation, platform or agent—against the conditions it needs to operate. Leave with a clear Proceed, Prepare or Stop decision and the specific work still unresolved.",
  imageSrc: "/images/cognirise/method-aor-v2.jpg",
  imageAlt: "Cinematic raster composition showing a bounded operational workflow",
  imageCaptionSubtitle: "Workflow Decision",
  imageCaptionTitle: "Evidence before authority.",
} as const;

export const agenticOperationsReadinessEditorial = defineMethodologyEditorialTemplate({
  template: "agentic-operations-readiness",
  editorial: group({
    relationship: group({
      startHereWhen: text("You have a specific, bounded workflow and need to confirm it has the necessary stability, observability, and economic conditions before agent delivery begins.", "Start here when", { format: "long" }),
      decision: text("Is this workflow ready for agents, and what must change first?", "Decision", { format: "long" }),
      output: text("A Proceed, Prepare or Stop decision accompanied by a register of unresolved operating conditions, their owners, and evidence gaps.", "Output", { format: "long" }),
      connectsToIdao: text("Produces Proceed, Prepare or Stop for one bounded workflow. Missing conditions become work within the appropriate IDAO stage, and the readiness test repeats when scope changes.", "Connection to IDAO", { format: "long" }),
      connectsToAuthority: text("Establishes whether the workflow can operate at all. Agent Authority separately determines how independently each consequential handover inside the workflow may act.", "Connection to Agent Authority", { format: "long" }),
      reassessWhen: text("The workflow scope changes, the underlying tool access permissions change, or unresolved conditions pass their reassessment date.", "Reassess when", { format: "long" }),
      doesNotDecide: text("Which workflow is most valuable (use AI Use-Case Prioritization) or the specific rights of a human supervisor (use Human-Agent Operating Model).", "Does not decide", { format: "long" }),
    }),
    boundary: group({
      kicker: text("The Boundary", "Boundary kicker"),
      heading: text("Readiness before authority.", "Boundary heading"),
      body: text("This framework decides whether the workflow has viable operating conditions. It does not decide how independently an agent may act.", "Boundary body", { format: "long" }),
      decisionsLabel: text("6 Conditions feed into:", "Decision summary label"),
      separateAuthorityHeading: text("Separate Agent Authority decision", "Separate authority heading"),
      separateAuthorityBody: text("For any selected consequential handover, set how independently it may act.", "Separate authority body", { format: "long" }),
    }),
    workflowScope: group({
      label: text("Workflow scope", "Workflow scope label"),
      description: text("Name the bounded workflow, trigger, start and end point, business area and material exclusions. This stays in page memory and is included only in the local results PDF or optional print.", "Workflow scope description", { format: "long" }),
      placeholder: text("Example: Customer refund requests from approved intake through payment instruction; excludes suspected fraud and refunds above the delegated limit.", "Workflow scope placeholder", { format: "long" }),
    }),
    assessment: group({
      kicker: text("Six operating conditions", "Assessment kicker"),
      heading: text("Evidence, not optimism.", "Assessment heading"),
    }),
    readinessOutput: group({
      kicker: text("Readiness output", "Readiness output kicker"),
      heading: text("Resolve the conditions, not the score.", "Readiness output heading"),
      body: text("The output is an operating-condition register. It records the gap, evidence required, accountable owner and reassessment date.", "Readiness output body", { format: "long" }),
      governanceReviewLabel: text("Overall governance review", "Governance review label"),
      governanceReviewPlaceholder: text("Decision forum, reviewers, evidence location, approval constraints or next review point", "Governance review placeholder", { format: "long" }),
      printRecordLabel: text("Print or save record", "Print record action"),
      printRecordNote: text("Your browser’s print dialog can print the full record or save it as a PDF. Workflow scope, evidence notes, owners and dates remain local even when the fixed-choice decision is shared.", "Print record note", { format: "long" }),
    }),
    basis: group({
      kicker: text("Method basis", "Method basis kicker"),
      heading: text("Proprietary method. Public evidence.", "Method basis heading"),
      proprietaryLabel: text("Cognirise proprietary content:", "Proprietary content label"),
      proprietaryBody: text("the six-condition structure, answer definitions, blocking logic, Proceed / Prepare / Stop decisions and operating-condition register are the Cognirise Agentic Operations Readiness Framework. They are not presented as requirements of the sources below.", "Proprietary content statement", { format: "long" }),
      sourceReview: text("External source review: 10 September 2026. Applicability depends on jurisdiction, sector, system classification and intended use.", "External source review note", { format: "long" }),
      sources: fixedList("External sources", [
        group({
          reference: link("NIST AI Risk Management Framework 1.0 (January 2023)", "https://www.nist.gov/itl/ai-risk-management-framework", "NIST AI Risk Management Framework"),
          use: text("Govern, Map, Measure and Manage functions informed the evidence and monitoring questions.", "NIST AI Risk Management Framework use", { format: "long" }),
        }),
        group({
          reference: link("NIST AI 600-1, Generative AI Profile (July 2024)", "https://doi.org/10.6028/NIST.AI.600-1", "NIST AI 600-1"),
          use: text("Risk identification, measurement, incident handling and third-party dependency considerations informed the operating-condition prompts.", "NIST AI 600-1 use", { format: "long" }),
        }),
        group({
          reference: link("EU AI Act, Regulation (EU) 2024/1689 (13 June 2024)", "https://eur-lex.europa.eu/eli/reg/2024/1689/oj", "EU AI Act"),
          use: text("Human oversight, logging, accuracy, robustness and cybersecurity obligations informed the control questions where applicable.", "EU AI Act use", { format: "long" }),
        }),
      ]),
    }),
    delivery: group({
      kicker: text("From decision to delivery", "Delivery kicker"),
      heading: text("Prepare what is missing. Then earn the right to operate.", "Delivery heading"),
      body: text("A readiness decision defines whether the workflow should enter delivery. IDAO builds and proves the capability; Agent Authority governs each live handover.", "Delivery body", { format: "long" }),
      actions: fixedList("Delivery actions", [
        group({
          action: link("Explore IDAO", "/methodologies/idao", "Explore IDAO action"),
        }),
        group({
          action: link("Set Agent Authority", "/methodologies/agent-authority-model", "Set Agent Authority action"),
        }),
      ]),
    }),
  }),
});