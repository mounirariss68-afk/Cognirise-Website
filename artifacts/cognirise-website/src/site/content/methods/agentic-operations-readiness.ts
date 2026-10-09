import { agenticOperationsReadinessEditorial } from "@workspace/api-zod";

/** Code-owned copy for the Operations readiness check. */
type Seed = typeof agenticOperationsReadinessEditorial.seed;
const seed = agenticOperationsReadinessEditorial.seed;

export const AOR_HERO = {
  breadcrumb: "Methods / 05",
  title: "Ready for agents?",
  description: "Test one workflow, not an organisation, a platform or an agent, against the six conditions it needs to run. Leave with a clear Proceed, Prepare or Stop, and the work still to do.",
  imageSrc: "/images/cognirise/method-aor-v2.jpg",
  imageAlt: "A composition showing one operational workflow with a defined start and end.",
  imageCaptionSubtitle: "One workflow at a time",
  imageCaptionTitle: "Evidence before authority.",
};

export const AOR_EDITORIAL = {
  ...seed,
  relationship: {
    startHereWhen: "You have one defined workflow and need to confirm it is stable, observable and worth running before agent delivery begins.",
    decision: "Is this workflow ready for agents, and what must change first?",
    output: "A Proceed, Prepare or Stop decision, with a register of the unresolved conditions, their owners and the evidence gaps.",
    connectsToIdao: "Produces Proceed, Prepare or Stop for one workflow. Missing conditions become work in the right step, and the test is repeated when the scope changes.",
    connectsToAuthority: "Decides whether the workflow can run at all. The Agent Authority Model separately decides how much each handover inside it may do alone.",
    reassessWhen: "The scope of the workflow changes, the tool access permissions change, or an unresolved condition passes its review date.",
    doesNotDecide: "Which workflow is the most valuable (use the prioritisation tool) or the rights of the person supervising it (use the operating model).",
  },
  boundary: {
    kicker: "The boundary",
    heading: "Readiness before authority.",
    body: "This check decides whether the workflow has workable operating conditions. It does not decide how much an agent may do alone.",
    decisionsLabel: "Six conditions lead to one of three decisions:",
    separateAuthorityHeading: "A separate authority decision",
    separateAuthorityBody: "For any handover where a mistake costs money or trust, set how much the agent may do alone.",
  },
  workflowScope: {
    label: "Workflow scope",
    description: "Name the workflow, its trigger, its start and end point, the business area and what is excluded. This stays in the page and goes only into the PDF or print-out you create.",
    placeholder: "Example: customer refund requests from approved intake through to the payment instruction; excludes suspected fraud and refunds above the delegated limit.",
  },
  assessment: {
    kicker: "Six operating conditions",
    heading: "Evidence, not optimism.",
  },
  readinessOutput: {
    kicker: "What you get",
    heading: "Resolve the conditions, not the score.",
    body: "The output is a register of operating conditions. It records the gap, the evidence required, the owner and the review date.",
    governanceReviewLabel: "Overall review",
    governanceReviewPlaceholder: "Decision forum, reviewers, where the evidence is, approval constraints or the next review point",
    printRecordLabel: "Print or save the record",
    printRecordNote: "Your browser's print dialog can print the full record or save it as a PDF. The workflow scope, evidence notes, owners and dates stay in your browser even when the decision is shared.",
  },
  basis: {
    ...seed.basis,
    kicker: "What it is built on",
    heading: "Our method. Public sources.",
    proprietaryLabel: "Cognirise's own:",
    proprietaryBody: "the six conditions, the answer definitions, the blocking logic, the Proceed, Prepare and Stop decisions and the register. They are not presented as requirements of the sources below.",
    sourceReview: "Sources reviewed on 10 September 2026. Whether they apply depends on jurisdiction, sector, system classification and intended use.",
    sources: [
      { ...seed.basis.sources[0], use: "The Govern, Map, Measure and Manage functions informed the evidence and monitoring questions." },
      { ...seed.basis.sources[1], use: "Risk identification, measurement, incident handling and third-party dependencies informed the condition prompts." },
      { ...seed.basis.sources[2], use: "Human oversight, logging, accuracy, resilience and cybersecurity obligations informed the control questions where they apply." },
    ],
  },
  delivery: {
    ...seed.delivery,
    kicker: "From decision to delivery",
    heading: "Prepare what is missing. Then run it.",
    body: "A readiness decision says whether the workflow should enter delivery. The four steps build and prove the system; the Agent Authority Model sets the limits for each live handover.",
    actions: [
      { action: { label: "See the four steps", href: "/methodologies/idao" } },
      { action: { label: "Set the authority", href: "/methodologies/agent-authority-model" } },
    ],
  },
} as unknown as Seed;
