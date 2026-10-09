import type { SetProveHoldGuardrailsContent } from "@workspace/api-zod";
import type { CmsRecord } from "@/lib/cms";

/**
 * Code-owned copy for the Set, Prove and Hold page. This is the published CMS
 * edition of 14 September 2026, edited to the website's writing rules, with a
 * static hero image so the page never waits for the CMS.
 */
const HERO_MEDIA_ID = "6f1e5a3c-0a3b-4c7e-9d2f-1b4a8c6e2d10";
const HERO_VERSION_ID = "9a7c2e41-5d6b-4f08-8e3a-2c1d7b9f4e65";
const HERO_ALT = "Violet and coral light passes through four ivory architectural gates with navy frames and glass boundaries.";

const actions: SetProveHoldGuardrailsContent["actions"] = [
  {
    id: "set-name", phase: "set", order: 1, title: "Name what must never happen",
    statement: "Write a rule someone could try to break this afternoon.",
    explanation: [
      "Write a \"never\", not a value: \"be helpful and safe\" cannot be tested.",
      "Write it for this system rather than copying a vendor's generic list.",
      "Use the law that applies, the damage this system could cause, and known AI failure modes as inputs.",
    ],
    owner: "Risk and legal, with the product owner",
    outputOrCadence: { label: "Output", value: "A numbered, versioned rule list" },
    failureCondition: "The list is copied from a generic responsible-AI page, so it can miss the risks of this system.",
    callout: "A guardrail that is not written as a testable rule cannot be evidenced.",
  },
  {
    id: "set-build", phase: "set", order: 2, title: "Build it into the strongest layer you can",
    statement: "Start at architecture: ask what the task needs before asking what to forbid.",
    explanation: [
      "At architecture, provide only the data and tools the task needs.",
      "Where that is not feasible, add an independent runtime check on the way in or out.",
      "Use instructions only after those options, and record that an instruction can be bypassed.",
    ],
    owner: "Engineering, challenged by security",
    outputOrCadence: { label: "Output", value: "Each rule labelled with its enforcement layer" },
    failureCondition: "Every rule is placed in instructions because that is fastest, until the instruction set is followed inconsistently.",
    callout: "Track how many rules are enforced at runtime or architecture, alongside those left in policy or prompts.",
  },
  {
    id: "set-choose", phase: "set", order: 3, title: "Choose what happens when it triggers",
    statement: "Pick a response for each rule, and explain a block to the affected user.",
    explanation: [
      "Choose to block, redact, escalate to a person, or allow and log.",
      "Match the response to the rule instead of applying one setting to everything.",
      "Tell the user what they can do next; a refusal does not remove the underlying need.",
    ],
    owner: "Product owner, with risk",
    outputOrCadence: { label: "Output", value: "A response type and user wording per rule" },
    failureCondition: "Everything is set to block, which encourages an uncontrolled path around the system.",
    callout: "A response is part of the control design, not a generic error state.",
  },
  {
    id: "set-assign", phase: "set", order: 4, title: "Give each rule an owner",
    statement: "Name someone who can confirm the rule is still needed and answer when it fails.",
    explanation: [
      "Assign a named role, not a committee.",
      "Give that role the authority to retire an obsolete rule.",
      "Set a review date, because rules age as the system changes.",
    ],
    owner: "AI risk owner",
    outputOrCadence: { label: "Output", value: "A guardrail register: rule, layer, response, owner and review date" },
    failureCondition: "Ownership sits with a central team that did not write the rule and cannot judge whether it still applies.",
    callout: "Set produces one register with a named owner for every rule, rather than separate policy and engineering lists.",
  },
  {
    id: "prove-attack", phase: "prove", order: 1, title: "Attack each rule directly",
    statement: "Test the exact behaviour the rule exists to stop.",
    explanation: [
      "Create a test set for each rule from the rule itself.",
      "Try plainly and indirectly, including role-play, translation, and instructions hidden in documents.",
      "Test every language served; coverage and effectiveness can vary by language and input format.",
    ],
    owner: "Product and security testing",
    outputOrCadence: { label: "Output", value: "Pass rate per rule and language, with test-set version" },
    failureCondition: "The tests reuse examples the guardrail was tuned on, so they measure memorisation rather than resistance.",
    callout: "OWASP's Top 10 for LLM Applications can help target attack cases. A pass rate is evidence only when its attempts, language, system version and date are kept.",
  },
  {
    id: "prove-red-team", phase: "prove", order: 2, title: "Widen the attack to the whole system",
    statement: "Test documents, tools and output paths as well as the chat box.",
    explanation: [
      "Include documents the system reads, because retrieved text can contain hostile instructions.",
      "Include tools the system can call, their effects, and the permissions they use.",
      "Include where output is displayed, executed, or written into another system.",
    ],
    owner: "Security, or a specialist for high-impact systems",
    outputOrCadence: { label: "Output", value: "A red-team record for the deployed system and its findings" },
    failureCondition: "The team tests only the model API instead of the deployed product and its connected paths.",
    callout: "MITRE ATLAS can inform attack scenarios. The deployed system, not the model in isolation, is the attack surface that matters.",
  },
  {
    id: "prove-count", phase: "prove", order: 3, title: "Count what it blocks wrongly",
    statement: "Measure legitimate work stopped by the control before launch.",
    explanation: [
      "Run representative legitimate traffic through the proposed control as well as attack cases.",
      "Agree an acceptable false-positive limit for the use case and treat anything above it as a defect to investigate.",
      "Tune the control or move it to a stronger layer; do not silently relax it.",
    ],
    owner: "Product owner, with business users",
    outputOrCadence: { label: "Output", value: "Legitimate-work block rate against an agreed limit" },
    failureCondition: "Only attack blocks are reported, so controls look cost-free until someone disables them informally.",
    callout: "The limit is a local operating decision, not a universal security score.",
  },
  {
    id: "prove-record", phase: "prove", order: 4, title: "Record the result with a date on it",
    statement: "“We have a guardrail” is a claim; a dated test record is evidence.",
    explanation: [
      "Record what was tested, against which rule, and in which languages.",
      "Record the model, instructions, tools, documents and guardrail versions.",
      "Treat evidence as due for review after a relevant version changes.",
    ],
    owner: "AI risk owner",
    outputOrCadence: { label: "Output", value: "A dated evidence record in the guardrail register" },
    failureCondition: "Evidence names a product but not the model or component version, so nobody can tell whether it still applies.",
    callout: "ISO/IEC 42001 places this kind of evidence within an AI management system. “47 of 50 attempts on 12 September” is an example of evidence wording, not a promised result.",
  },
  {
    id: "hold-watch", phase: "hold", order: 1, title: "Watch the blocked attempts",
    statement: "Each block can reveal what a person was trying to make the system do.",
    explanation: [
      "Log enough context to review the attempted behaviour, within data-minimisation and retention rules.",
      "Investigate spikes and new techniques, not only aggregate counts.",
      "Separate likely malicious attempts from confused-user journeys; the latter can point to a design problem.",
    ],
    owner: "Security operations",
    outputOrCadence: { label: "Cadence", value: "Continuous collection, reviewed monthly" },
    failureCondition: "Triggers are counted but never read, so the team knows the frequency but not the cause.",
    callout: "Monitoring should improve the rule and the user experience, not merely pile up alerts.",
  },
  {
    id: "hold-retest", phase: "hold", order: 2, title: "Re-test on every change",
    statement: "A result established against a previous system version may no longer apply.",
    explanation: [
      "Re-test after a model, instruction, tool, document or guardrail change.",
      "Automate repeatable checks where possible so release evidence stays practical.",
      "Define in advance which failed result blocks a release and who can approve an exception.",
    ],
    owner: "Engineering, with automated release checks",
    outputOrCadence: { label: "Cadence", value: "Per relevant release and vendor-change notice" },
    failureCondition: "A hosted-model change arrives without a notification or review path, and the first sign is a live failure.",
    callout: "Release blocking is a policy you choose; it needs an explicit exception path and a record.",
  },
  {
    id: "hold-revisit", phase: "hold", order: 3, title: "Add new rules, retire old ones",
    statement: "New capabilities create risks; obsolete rules can make the register untestable.",
    explanation: [
      "Assess each new tool or data source for an additional or changed rule.",
      "Retire rules that no longer apply, with the owner's sign-off and a reason.",
      "Move instruction-only rules to stronger layers when a feasible design becomes available.",
    ],
    owner: "The rule's named owner",
    outputOrCadence: { label: "Cadence", value: "On relevant change and at each fixed review date" },
    failureCondition: "The list only grows, until testing narrows to the few rules everyone remembers.",
    callout: "A retirement record keeps the history without keeping an obsolete control active.",
  },
  {
    id: "hold-report", phase: "hold", order: 4, title: "Report how strong they are, not how many",
    statement: "A count of guardrails alone does not show where they are enforced or whether they still work.",
    explanation: [
      "Report how many rules sit at each enforcement layer.",
      "Report pass rates with their system and test versions.",
      "Report legitimate-work blocks against the agreed limit, so the operating cost appears beside the benefit.",
    ],
    owner: "AI risk owner",
    outputOrCadence: { label: "Cadence", value: "Monthly to the review forum; board cadence set locally" },
    failureCondition: "The report counts rules but not strength, so the number can grow while protection weakens.",
    callout: "Layer distribution is an indicator for review, not a certification and not a promise of security.",
  },
];

export const GUARDRAILS_CONTENT: SetProveHoldGuardrailsContent = {
  schemaVersion: 1,
  template: "guardrails",
  contentVersion: "set-prove-hold-v1",
  heroMedia: { mediaId: HERO_MEDIA_ID, mediaVersionId: HERO_VERSION_ID, role: "hero", altText: HERO_ALT },
  hero: {
    eyebrow: "Methods / 07",
    headline: "Set, Prove and Hold",
    subheadline: "The difference between a rule an AI has been asked to follow and a control designed to resist bypass.",
    strapline: "A guardrail is only as strong as the layer it is built into.",
    primaryAction: { label: "Book a Value Scan", href: "/contact" },
    secondaryAction: { label: "Read the Agent Authority Model", href: "/methodologies/agent-authority-model" },
  },
  overview: {
    heading: "Set, Prove and Hold (4 + 4 + 4)",
    intro: "Set is four steps before you build. Prove is four tests before you launch. Hold is four disciplines that run together after launch.",
    phases: [
      { id: "set", title: "Set", caption: "Steps before you build", mode: "sequential", actionIds: ["set-name", "set-build", "set-choose", "set-assign"] },
      { id: "prove", title: "Prove", caption: "Tests before you launch", mode: "pre-launch-tests", actionIds: ["prove-attack", "prove-red-team", "prove-count", "prove-record"] },
      { id: "hold", title: "Hold", caption: "Disciplines after launch", mode: "concurrent", actionIds: ["hold-watch", "hold-retest", "hold-revisit", "hold-report"] },
    ],
  },
  layers: {
    heading: "Where the rule is enforced decides what it can resist",
    intro: "The same customer-data rule can be expressed in four places. The layer changes what reaches the AI and what limitations remain.",
    exampleRule: "“Never reveal another customer’s data.”",
    tableHeaders: ["Layer", "What it is", "Customer-data example", "Limitation", "Relative strength"],
    rows: [
      { id: "policy", title: "1 · Policy", whatItIs: "A rule in a document", customerDataExample: "A line in an AI usage policy; the system itself does not evaluate it.", limitation: "It relies on people knowing and following the policy.", strength: 1 },
      { id: "prompt", title: "2 · Prompt", whatItIs: "A line in the AI instructions", customerDataExample: "The AI is told not to reveal data while another customer's data may still be in context.", limitation: "Instructions can be overridden or followed inconsistently.", strength: 2 },
      { id: "runtime", title: "3 · Runtime", whatItIs: "Software outside the AI checks input or output", customerDataExample: "A configured check can block a response containing another customer's record before delivery.", limitation: "Coverage can have gaps across formats, languages, or recognition methods.", strength: 3 },
      { id: "architecture", title: "4 · Architecture", whatItIs: "The AI receives only the data and tools the task needs", customerDataExample: "Correctly scoped retrieval returns records for the signed-in customer only.", limitation: "It depends on correct identity, authorisation and scoping design.", strength: 4 },
    ],
    callout: "Build each rule into the strongest layer that can carry it. Architecture limits exposure; runtime checks add an independent boundary; policy and prompts remain useful but are not equivalent controls.",
  },
  lifecycleMatrix: {
    heading: "The layer changes how you build, test and re-test",
    intro: "Compare the four enforcement layers across the Set, Prove and Hold lifecycle.",
    columnHeaders: ["Layer", "Set — build it", "Prove — test it", "Hold — re-test it"],
    rows: [
      { layerId: "policy", layer: "1 · Policy", set: "Write it in a document", prove: "Review whether the policy is complete and communicated; it does not itself run a technical test.", hold: "Review when the policy or its use changes." },
      { layerId: "prompt", layer: "2 · Prompt", set: "Put it in instructions", prove: "Attack the instruction and record the failures that remain.", hold: "Re-test on model or instruction changes." },
      { layerId: "runtime", layer: "3 · Runtime", set: "Add an external input or output check", prove: "Attack it and measure wrong blocks.", hold: "Re-test when the scanner, model or supported languages change." },
      { layerId: "architecture", layer: "4 · Architecture", set: "Scope data and tools to the task", prove: "Verify that authorisation and scoping are in place.", hold: "Review when identity, data access, tools or architecture change." },
    ],
    callout: "Layer choice is a maintenance decision as well as a security decision: weaker, change-sensitive controls generally need more frequent evidence.",
    measure: "Track the number of active guardrails at each layer, alongside dated test evidence and legitimate-work block rates.",
  },
  actions,
  references: {
    heading: "What this is built from",
    intro: "These sources inform risk identification, adversarial testing and management-system evidence. They do not themselves certify a deployment.",
    items: [
      { id: "owasp-llm-top-10", title: "OWASP Top 10 for LLM Applications", version: "2025", url: "https://genai.owasp.org/llm-top-10/", note: "A practical catalogue of prominent LLM application risks, including prompt injection and sensitive-information disclosure." },
      { id: "owasp-agent-control-standard", title: "OWASP Agentic Security Initiative", version: "Living programme", url: "https://genai.owasp.org/agentic-security-initiative/", note: "The OWASP work on agentic security, including the agent control standard in development." },
      { id: "mitre-atlas", title: "MITRE ATLAS", version: "Living knowledge base", url: "https://atlas.mitre.org/", note: "Tactics, techniques and case studies for adversarial threats to AI-enabled systems." },
      { id: "nist-ai-rmf", title: "NIST AI Risk Management Framework", version: "AI RMF 1.0", url: "https://doi.org/10.6028/NIST.AI.100-1", note: "Voluntary guidance and vocabulary for managing AI risk." },
      { id: "nist-ai-600-1", title: "NIST Generative AI Profile", version: "NIST AI 600-1", url: "https://doi.org/10.6028/NIST.AI.600-1", note: "A companion profile identifying generative-AI risk considerations." },
      { id: "iso-42001", title: "ISO/IEC 42001", version: "2023", url: "https://www.iso.org/standard/81230.html", note: "An AI management-system standard; certification scope and applicability need independent assessment." },
    ],
    disclaimer: "Reference mappings are indicative and should be checked against the current source text and your own obligations before adoption. This framework is not legal advice.",
  },
  moves: {
    heading: "Where to start",
    intro: "Three practical moves, in order.",
    items: [
      { id: "one", number: 1, title: "Inventory the guardrails you think you have", body: "Mark the enforcement layer for each and review how many rely only on policy or instructions." },
      { id: "two", number: 2, title: "Try to break the three that matter most", body: "Use the deployed system and record the attempts, versions, results and legitimate-work effects." },
      { id: "three", number: 3, title: "Move one guardrail to a stronger layer", body: "Start by narrowing the data and tools available to the task." },
    ],
    cta: { heading: "Turn guardrails into evidence", body: "We can help your team map its controls, test the deployed system and set up a review rhythm that holds.", button: { label: "Book a Value Scan", href: "/contact" } },
  },
  relatedLink: { title: "The Agent Authority Model", body: "Authority decides what a handover may do; guardrails decide how strongly its limits are enforced.", href: "/methodologies/agent-authority-model" },
  visibility: "public",
  order: 0,
  sources: [
    { label: "OWASP Top 10 for LLM Applications (2025)", url: "https://genai.owasp.org/llm-top-10/", accessedAt: "2026-09-14" },
    { label: "OWASP Agentic Security Initiative", url: "https://genai.owasp.org/agentic-security-initiative/", accessedAt: "2026-09-14" },
    { label: "MITRE ATLAS", url: "https://atlas.mitre.org/", accessedAt: "2026-09-14" },
    { label: "NIST AI RMF 1.0", url: "https://doi.org/10.6028/NIST.AI.100-1", accessedAt: "2026-09-14" },
    { label: "NIST Generative AI Profile", url: "https://doi.org/10.6028/NIST.AI.600-1", accessedAt: "2026-09-14" },
    { label: "ISO/IEC 42001:2023", url: "https://www.iso.org/standard/81230.html", accessedAt: "2026-09-14" },
  ],
  verificationDate: "2026-09-14",
  reviewDate: "2027-03-14",
  relatedIds: [],
};

/** The schema pins the CTA to /contact; the public page sends both buttons to the Value Scan instead. */
export const GUARDRAILS_ACTIONS = {
  primary: { label: "Book a Value Scan", href: "/value-scan" },
  secondary: { label: "Read the Agent Authority Model", href: "/methodologies/agent-authority-model" },
  move: { label: "Book a Value Scan", href: "/value-scan" },
};

export const GUARDRAILS_RECORD: CmsRecord<SetProveHoldGuardrailsContent> = {
  ...GUARDRAILS_CONTENT,
  id: "compiled:guardrails-framework",
  slug: "guardrails-framework",
  title: "Set, Prove and Hold",
  summary: "How to write a rule an AI system must follow so that it can be tested, where in the stack to enforce it, and how to show that it held.",
  media: [
    {
      id: HERO_MEDIA_ID,
      versionId: HERO_VERSION_ID,
      url: "/images/cognirise/cognirise-guardrails-boundaries-hero.jpg",
      mimeType: "image/jpeg",
      width: 1024,
      height: 1024,
      altText: HERO_ALT,
    },
  ],
  seo: {
    title: "Set, Prove and Hold | Cognirise",
    description: "How to write a rule an AI system must follow so that it can be tested, where in the stack to enforce it, and how to show that it held.",
    noIndex: false,
  },
  publishedAt: "2026-09-14T00:00:00.000Z",
  updatedAt: "2026-10-08T00:00:00.000Z",
  market: "global",
  requestedMarket: "global",
  usedFallback: false,
};
