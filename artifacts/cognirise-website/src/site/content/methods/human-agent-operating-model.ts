import { humanAgentOperatingModelEditorial } from "@workspace/api-zod";

/** Code-owned copy for the Human–Agent Operating Model page. */
type Seed = typeof humanAgentOperatingModelEditorial.seed;
const seed = humanAgentOperatingModelEditorial.seed;

export const HAOM_HERO = {
  breadcrumb: "Methods / 04",
  title: "Redesign the work, not just the technology.",
  description: "Turn an AI-enabled workflow into a clear working agreement between people and agents. Who owns the outcome, who may decide, how handovers work, and what shows the model is taking hold.",
  imageSrc: "/images/cognirise/human-agent-shared-judgment.jpg",
  imageAlt: "Coral and violet forms converge at a shared decision point within ivory and deep navy architecture, representing people and AI working together.",
  imageCaptionSubtitle: "The operating model",
  imageCaptionTitle: "Working together without hidden coordination.",
};

export const HAOM_EDITORIAL = {
  ...seed,
  relationship: {
    startHereWhen: "An AI system is entering live work, and roles, rights, handovers, incentives and measures have to change with it.",
    decision: "How must roles, rights and handovers change when AI enters real work?",
    output: "A design for roles and handovers, a map of decision rights, a capability plan, incentive changes and adoption measures.",
    connectsToIdao: "Shapes roles, handovers, skills, incentives and measures through Innovate, Demonstrate, Activate and Operate. Live evidence can send a weak assumption back to the step that owns it.",
    connectsToAuthority: "Turns each handover into explicit rights to propose, approve, act, intervene and demote. The Agent Authority Model sets the limit on each of those rights.",
    reassessWhen: "Agents gain new capabilities, exception volume overwhelms the people supervising them, or incentives drift away from the purpose of the workflow.",
    doesNotDecide: "Whether the underlying workflow is stable enough to automate. The operations readiness check decides that.",
  },
  boundary: {
    ...seed.boundary,
    kicker: "The boundary",
    heading: "A rollout installs a tool. An operating model changes how work runs.",
    technologyRollout: {
      heading: "Technology rollout",
      items: ["Sets up access and integrations", "Explains features and prompts", "Tracks attendance, licences and usage", "Supports the first technical adoption"],
    },
    operatingModelChange: {
      heading: "Operating-model change",
      items: ["Changes roles, responsibilities and spans", "Reallocates decision and intervention rights", "Redesigns handovers, controls and incentives", "Shows that outcomes last in live operation"],
    },
  },
  playbook: {
    ...seed.playbook,
    kicker: "Five design moves",
    heading: "Start with one real workflow. Finish with a design you can run.",
    outputLabel: "Output",
    steps: [
      { ...seed.playbook.steps[0], title: "Trace the live work", description: "Map the work as it happens: demand, decisions, exceptions, queues, evidence and the people who carry the hidden coordination.", output: "Work and handover baseline" },
      { ...seed.playbook.steps[1], title: "Redesign roles and handovers", description: "Decide what people lead, what agents support or carry out, and how ownership moves without losing context or responsibility.", output: "Role and handover design" },
      { ...seed.playbook.steps[2], title: "Set decision rights", description: "Name who proposes, approves, acts, intervenes and answers for each decision and handover that costs money or trust.", output: "Decision-rights map" },
      { ...seed.playbook.steps[3], title: "Build operating capability", description: "Define the judgement, supervision, exception handling, evidence skills and improvement routines each role needs.", output: "Capability and enablement plan" },
      { ...seed.playbook.steps[4], title: "Align incentives and measures", description: "Remove targets that reward unsafe automation or hidden rework. Measure confident use, intervention, quality and outcomes that last.", output: "Adoption measures and incentive changes" },
    ],
  },
  handoverChoreography: {
    heading: "Handovers across the four steps",
    stages: [
      { ...seed.handoverChoreography.stages[0], body: "Identify roles and constraints." },
      { ...seed.handoverChoreography.stages[1], body: "Test the handover logic safely." },
      { ...seed.handoverChoreography.stages[2], body: "Install explicit rights, with their limits set by the Agent Authority Model." },
      { ...seed.handoverChoreography.stages[3], body: "Measure and loop back." },
    ],
  },
  decisionRights: {
    ...seed.decisionRights,
    kicker: "Decision-rights map",
    heading: "Make authority visible at every move.",
    description: "A role title is not a control. The map records what the person and the agent may do at each point, the evidence they need, and the condition that moves authority back to a person.",
    rows: [
      { ...seed.decisionRights.rows[0], person: "Sets the outcome, the limits and the evidence required", agent: "Contributes options and operating evidence" },
      { ...seed.decisionRights.rows[1], person: "Challenges assumptions and reads the context", agent: "Produces traceable analysis or a proposed next action" },
      { ...seed.decisionRights.rows[2], person: "Keeps authority where the exposure requires it", agent: "Waits at the defined gate and keeps the approval record" },
      { ...seed.decisionRights.rows[3], person: "Handles exceptions and the actions reserved for people", agent: "Acts only within its permitted authority and limits" },
      { ...seed.decisionRights.rows[4], person: "Pauses, overrides, escalates or demotes authority", agent: "Flags thresholds, uncertainty and control breaches" },
    ],
    authorityCeiling: {
      heading: "Handovers that matter need a ceiling.",
      description: "Some rights to propose, approve, act, intervene or demote can affect a person, a record, a system or a service. For each of those, use the Agent Authority Model to set how much the agent may do alone.",
      cta: { label: "Set the authority", href: "/methodologies/agent-authority-model" },
    },
  },
  capability: {
    ...seed.capability,
    kicker: "Capability, not attendance",
    heading: "Prepare people to run, challenge and improve the system.",
    description: "The capability plan is specific to each role. It combines practice in live scenarios, observed skill and support at the moment of work, not a generic course-completion target.",
    cards: [
      { ...seed.capability.cards[0], body: "Rehearse the normal path, the exceptions and the fallback with the people who will own them." },
      { ...seed.capability.cards[1], body: "Recognise uncertainty, challenge evidence, intervene, and write down why authority changed." },
      { ...seed.capability.cards[2], body: "Pass context, state and responsibility without creating hidden coordination." },
      { ...seed.capability.cards[3], body: "Use operating evidence to adjust roles, controls and the workflow, not only the model." },
    ],
  },
  measures: {
    ...seed.measures,
    kicker: "Adoption and lasting operation",
    heading: "Measure behaviour, control and outcomes, not logins alone.",
    description: "Activation begins when the redesigned path can run safely in live work. Lasting operation begins when your team owns the routines, the evidence and the improvement cycle.",
    groups: [
      { ...seed.measures.groups[0], measures: ["Eligible work using the new path", "Active use by role and team", "Fallback to the old process"] },
      { ...seed.measures.groups[1], measures: ["Interventions made in time", "Exceptions resolved by the named owner", "Authority demotions and control breaches"] },
      { ...seed.measures.groups[2], measures: ["Observed skill in live work", "Confidence to challenge an agent's output", "Time to independent operation"] },
      { ...seed.measures.groups[3], measures: ["Quality and cycle-time movement", "Rework removed rather than hidden", "Value kept after handover"] },
    ],
  },
  idaoConnection: {
    kicker: "Connection to IDAO",
    heading: "Design before launch. Learn after it.",
    activateLabel: "Activate",
    activateDescription: "uses the designs for roles, rights, capability and measures to prepare the live workflow, rehearse exceptions and confirm ownership.",
    operateLabel: "Operate",
    operateDescription: "uses real performance, interventions and workforce evidence to improve the model and send weak assumptions back to the right step.",
    cta: { label: "See the four steps", href: "/methodologies/idao#lifecycle" },
  },
  finalCta: {
    kicker: "Start with live work",
    heading: "Bring one workflow where people and agents must work together.",
    description: "We will find the first operating-model decision, the evidence it needs and the right step to start at.",
    cta: { label: "Book a Value Scan", href: "/value-scan" },
  },
} as unknown as Seed;
