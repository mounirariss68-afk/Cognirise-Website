import type { FrameworkGuardrailsSubsection } from "@workspace/api-zod";

/**
 * Code-owned copy for the Agent Authority Model page. The page used to read
 * this section from a CMS release; the text below is that release, edited
 * to the website's writing rules (no internal notes, no retired words, no
 * sentence over 30 words).
 */
export const AAM_PAGE = {
  title: "Guardrails are not an authority model",
  teaser: "How much may an agent do on its own? A content filter does not answer that. The Agent Authority Model does, one task at a time.",
  handoverExplanation:
    "Control the handover, not the agent. Knowledge, Decision and Action are the moments when an agent passes something to a person, another agent or a system. One agent can make several handovers, and each can carry a different exposure and a different ceiling.",
  handoverNote:
    "These are not permanent agent classes. A single agent may answer a question, fix a case outcome and change a system record: three handovers that can need three different levels of authority.",
  rule: "Exposure sets the ceiling. Evidence moves a handover up.",
  cta: { label: "Book a Value Scan", href: "/value-scan" },
  sources: [
    { label: "EU AI Act, Article 14, human oversight", url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
    { label: "NIST AI Risk Management Framework", url: "https://www.nist.gov/itl/ai-risk-management-framework" },
    { label: "Parasuraman, Sheridan and Wickens, levels of human interaction with automation", url: "https://doi.org/10.1109/3468.844354" },
  ],
  relatedLink: {
    title: "Set, Prove and Hold",
    body: "Authority decides what a handover may do. Guardrails decide how strongly its limits are enforced. The guardrails framework covers the second half.",
    href: "/methodologies/guardrails-framework" as const,
  },
};

/** Short oversight labels for tables and figures, where the long form would repeat on every row. */
export const SHORT_OVERSIGHT: Record<string, string> = {
  "out-of-loop": "Out of the loop",
  "on-loop": "On the loop (intervention window)",
  "in-loop": "In the loop",
  "in-loop-second": "In the loop + second control",
  "in-loop-external": "In the loop + external sign-off",
};

export const AAM_GUARDRAILS: FrameworkGuardrailsSubsection = {
  heading: "What a guardrail cannot decide",
  opening: "Most teams that have built guardrails believe they have their agents under control. They do not, and the gap is expensive.",
  definition:
    "A guardrail is a mechanism: an output filter, a rate limit, a system prompt, an approval step. An authority model is the thing that decides which mechanisms are needed, where each one sits, and who answers when one fails. The first is a component. The second is a delegation.",
  bankExample: {
    beforeQuote:
      "Every bank already runs this distinction without thinking about it. Its delegation of authority says a relationship manager may approve up to a limit, and a committee above it. Anything touching a sanctioned party goes to compliance regardless of size. The four-eyes check and the screening filter are the guardrails. Nobody would say:",
    quote: "we have four-eyes checks, therefore we have a delegation of authority.",
    afterQuote: "Yet that is exactly what is being said when a team points at a content filter and calls it AI control.",
  },
  comparisonHeading: "Three differences that matter",
  comparisonColumns: {
    guardrails: "Guardrails",
    authorityModel: "The Agent Authority Model",
  },
  comparisonRows: [
    {
      label: "What it attaches to",
      guardrails: "The agent or the model: one filter, one prompt, one limit, applied to everything it does",
      authorityModel: "The handover: the moment an output leaves the agent and starts to matter to someone else",
      guardrailsEmphasis: "plain",
      authorityModelEmphasis: "plain",
    },
    {
      label: "Where it comes from",
      guardrails: "Chosen, usually from a vendor's feature list or from whatever has already gone wrong",
      authorityModel: "Derived from the handover's profile: what is handed over, who is present, and what is at stake",
      guardrailsEmphasis: "plain",
      authorityModelEmphasis: "plain",
    },
    {
      label: "What it answers",
      guardrails: "What stops it doing something bad?",
      authorityModel: "Who authorised it to do this, and what must it prove before it is allowed to do more?",
      guardrailsEmphasis: "italic",
      authorityModelEmphasis: "italic",
    },
  ],
  unit: {
    heading: "Why the unit is the whole argument",
    paragraphs: [
      "A single agent does several things of very different weight. A front-desk agent answers questions, books appointments, cancels them and issues refunds. Guardrail thinking gives all four the same protection, because the protection was attached to the agent. The refund is then defended exactly as well as the opening-hours question. The riskiest thing the agent does inherits the posture that suits the safest.",
      "Control the handover instead, and each of the four is rated on its own. What kind of thing is handed over? Who is standing there when it happens? How hard is it to undo, and who is exposed if it is wrong? Same agent, same model, same guardrail technology, but the refund is now treated as a refund.",
    ],
    emphasis: "In engineering terms: authority attaches to the tool, not the agent.",
  },
  firstFigure: {
    asset: "aam-guardrails-vs-authority.svg",
    altText: "One front-desk agent sends four handovers along a shared rail. Each handover is controlled separately by what is at stake and the authority it needs.",
    captionLabel: "Figure 1",
    captionLead: "One common setting, or four handovers each controlled on their own.",
    captionBody: "Each handover is rated separately on what is at stake, its exposure and its authority. An example pattern, not a claim about every agent.",
  },
  interaction: {
    heading: "How the two interact",
    introduction: "Two rules bind them.",
    exposure: {
      lead: "Exposure sets the ceiling.",
      body: "How hard an output is to undo, and how far its effects reach, set the most authority a handover may hold. Capability does not enter into it. A more accurate model does not get more authority; a smaller blast radius does.",
    },
    evidence: {
      lead: "Evidence moves a handover up.",
      body: "Every handover starts one level below its target authority and is promoted only on measured performance. An incident demotes it automatically. Guardrails have no concept of promotion; they are static by nature. This is the question no published framework asks, and it is the one that turns a classification into a way of running agents.",
    },
    controlsIntroduction: "Guardrails then enter in two distinct ways, and keeping them apart is the whole of the discipline.",
    requiredControls: {
      lead: "As required controls.",
      bodyBeforeExamples:
        "Once a handover has a profile, its controls follow from that profile rather than from preference. They are the controls every handover needs, plus those set by type, by authority level and by exposure band. Each must be provable by a test, a query or an artefact, never by an assurance.",
      assuranceExample: "\"The team ensures the agent does not give medical advice\" is not a control.",
      controlExample: "\"An output filter independent of the model blocks each prohibited class, and a test suite attempts every one of them\" is.",
      conclusion: "A guardrail you cannot test is not a guardrail; it is an intention.",
    },
    compensatingControls: {
      lead: "As compensating controls that raise the ceiling.",
      bodyBeforeContent: "This is the mechanism that makes the model workable rather than merely restrictive. A handover may hold authority above its exposure ceiling where the",
      content: "content",
      bodyAfterContent:
        "of the handover is fixed by construction rather than by trust in the agent. An agent sending messages to patients with no person present sits above the ceiling for an irreversible, customer-affecting handover. It can still be correct. It writes no free text, it renders a clinician-approved template through a whitelist of variables, and it passes a blocking gate on every send. The authority there is carried by the approved template. The agent is a dispatcher.",
    },
  },
  summary: {
    lead: "Guardrails enforce limits. The authority model decides who can do what, under which controls, and who answers for it.",
    handover: "A handover is the moment an agent's output starts to matter to someone else.",
    rules: [
      {
        title: "Exposure sets the most an agent may do alone",
        body: "How hard a mistake is to undo, and how many people it reaches, set the ceiling. A more capable model or a generic safety filter cannot raise it.",
      },
      {
        title: "Measured evidence earns promotion",
        body: "Every handover starts one level below its target authority. It moves up only on measured evidence, within its exposure limit. An incident demotes it automatically.",
      },
      {
        title: "Required controls must be testable",
        body: "Each required control must be provable by a test, a query or an artefact before the handover operates. An assurance is not proof.",
      },
      {
        title: "Approved artefacts can carry authority",
        body: "An approved template, a deterministic rule, a whitelisted parameter range or a blocking gate can carry authority instead of the agent's own discretion.",
      },
    ],
    caveat: "A compensating control raises the ceiling only when the content that matters is fixed by construction. It does not make unrestricted agent discretion safe.",
    disclosureLabel: "Read the full explanation",
    firstFigure: {
      asset: "aam-guardrails-vs-authority.svg",
      altText: "One front-desk agent sends four handovers along a shared rail. Each handover is controlled separately by what is at stake and the authority it needs.",
      captionLabel: "Figure 1",
      captionLead: "One common setting, or four handovers each controlled on their own.",
      captionBody: "Each handover is rated separately on what is at stake, its exposure and its authority. An example pattern, not a claim about every agent.",
    },
  },
  secondFigure: {
    asset: "aam-how-they-interact.svg",
    altText: "A chart with authority rising from in the loop to out of the loop, and exposure rising left to right. A descending staircase marks the ceiling that exposure sets. Required controls sit below it, an arrow shows a handover promoted on evidence, and a marker above the ceiling shows a compensating control carrying the authority.",
    captionLabel: "Figure 2",
    captionLead: "The ceiling, the climb and the one thing that moves the ceiling.",
    captionBody: "Everything under the staircase is permitted; required controls sit there. Promotion moves a handover up within it. Only a compensating control, a guardrail that carries the authority itself, moves the ceiling.",
  },
  designRule: {
    heading: "The design rule this produces",
    quote: "Where an agent operates above its exposure ceiling, the design must name the artefact that carries the authority instead. That artefact is an approved template, a whitelisted parameter range, a deterministic rule set, or a gate with the power to block.",
    conclusion:
      "That is the cleanest test of the relationship between the two. A guardrail that merely constrains the agent does not move the ceiling; it has made a risky thing somewhat less risky. A guardrail that carries the authority itself does move it, because the content that matters no longer comes from the model at all. Most teams cannot say which kind theirs is. That, usually, is the finding.",
    failure: "The failure runs in both directions. An authority model with controls nobody can enforce is a register of good intentions. Controls without an authority model are a pile of features nobody can justify to a regulator. Each holds the other up.",
    closingEmphasis: "Authority is earned, not configured.",
  },
};
