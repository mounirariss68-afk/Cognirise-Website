/**
 * Financial Services launch content override.
 *
 * Source: slides 8–14 of "260910 - Cognirise Financial Services Capabilities"
 * plus primary-source research checked on 6 October 2026.
 *
 * Governance: this content is code-owned for first launch. It replaces the
 * public Financial Services route only when FINANCIAL_SERVICES_LAUNCH_OVERRIDE
 * is enabled and the page is not rendered inside a protected CMS preview.
 * CMS records and immutable release history are not changed. See
 * docs/financial-services-launch-override.md for the return path to CMS.
 */

/** Set VITE_FS_LAUNCH_OVERRIDE=off to restore CMS/compiled delivery. */
export const FINANCIAL_SERVICES_LAUNCH_OVERRIDE =
  (import.meta.env?.VITE_FS_LAUNCH_OVERRIDE ?? "on") !== "off";

export const fsHero = {
  eyebrow: "Financial services",
  title: "Redesign how banks lend, serve and operate.",
  body: "From credit analysis and customer service to compliance checks and software delivery, we help financial institutions redesign workflows, integrate AI with existing systems, and measure improvements in turnaround time, service quality and cost.",
  primary: { label: "Discuss a process to improve", href: "/contact" },
  secondary: { label: "See delivery examples", href: "#fs-examples" },
  image: "/images/cognirise/industries/pulse-industry-financial-services.png",
  imageAlt: "Financial operations landscape with document flows converging on a reviewed decision point.",
  metaTitle: "AI for Financial Services | Cognirise",
  metaDescription: "Practical AI for banks and financial institutions: credit preparation, customer service voice agents, document checks and software delivery, with defined approvals and measured results.",
};

export const fsLevels = {
  slide: 8,
  title: "Start with one task. Expand when it works.",
  intro: "Not every process needs an autonomous agent. Start with the work you can test, and increase automation only when the results and controls are reliable.",
  rows: [
    { level: "Help an employee", changes: "AI drafts, summarizes and finds information", example: "Prepare a relationship manager’s meeting brief", people: "Check the facts and decide what to use", target: "30%", period: "About 8 weeks" },
    { level: "Automate process steps", changes: "AI completes defined tasks across connected systems", example: "Read a credit file, identify missing information and draft a recommendation", people: "Approve decisions and resolve exceptions", target: "50%", period: "3–6 months" },
    { level: "Coordinate a complete workflow", changes: "Agents pass work between teams and systems within agreed limits", example: "Process an eligible request from intake through checks and fulfilment", people: "Set limits, approve restricted actions and intervene when needed", target: "70%", period: "6–12 months" },
  ],
  targetNote: "Illustrative productivity targets and indicative delivery periods from the Cognirise capabilities presentation. They are not measured case-study outcomes or commitments. Achievable results depend on the baseline, task scope, required approvals and system integrations.",
};

export const fsAreas = {
  slide: 9,
  title: "Where AI can help.",
  intro: "Six business areas, the work AI can take on in each, the decision that stays with a person, and how the result is measured.",
  rows: [
    { area: "Credit and lending", work: ["Prepare client meeting briefs", "Summarize credit and collateral files", "Pre-screen applications against policy"], human: "Analyst checks the evidence and approves or rejects", measure: "Preparation time, rework, decision turnaround" },
    { area: "Risk and fraud", work: ["Rank transaction anomalies", "Prioritize anti-money-laundering (AML) alerts", "Support portfolio scenario analysis"], human: "Investigator evaluates and escalates", measure: "Review time, false positives and confirmed detection performance" },
    { area: "Operations", work: ["Verify onboarding documents", "Reconcile records across systems", "Prepare operational reports"], human: "Operations staff handle exceptions", measure: "Manual touches, error rate, completion time" },
    { area: "Customer and sales", work: ["Answer routine enquiries", "Suggest next-best actions", "Prioritize retention outreach"], human: "Staff handle advice, complaints and sensitive cases", measure: "Resolution, conversion and customer complaints" },
    { area: "Engineering and IT", work: ["Draft code and tests", "Explain legacy systems", "Support requirements analysis"], human: "Engineers review, test and approve", measure: "Delivery lead time, defects and rework" },
    { area: "Compliance and regulation", work: ["Answer policy questions with linked sources", "Identify relevant rule changes", "Prepare know-your-customer (KYC) and reporting material"], human: "Compliance interprets rules and signs off", measure: "Review time, traceability and missed changes" },
  ],
  note: "Fewer alerts alone does not prove better risk detection. Detection is measured against confirmed cases.",
};

export const fsProjects = {
  slide: 10,
  title: "Four practical starting projects.",
  intro: "Each project starts with a defined scope and a first deliverable that can be tested against real cases. These are proposed projects, not reported results.",
  rows: [
    { name: "Credit and relationship-manager support", inputs: "Approved policies, customer records and credit files", deliverable: "Checked case summary and recommendation, or a meeting brief", measure: "Analyst preparation time and review quality" },
    { name: "Customer contact centre", inputs: "Agreed call types, verified knowledge and permitted APIs", deliverable: "Tested voice agent with escalation to staff", measure: "Correct resolution, completion and complaint rates" },
    { name: "Software delivery", inputs: "Approved repositories and test environments", deliverable: "Assistants for requirements, code and regression tests", measure: "Lead time and defects, not lines of generated code" },
    { name: "Marketing analysis", inputs: "Spend, channel and outcome data with appropriate permissions", deliverable: "Analysis of channel contribution with recommended actions", measure: "Incremental return and retention" },
  ],
};

export const fsCredit = {
  title: "Example: prepare a credit decision.",
  label: "Illustrative workflow",
  intro: "One way the work can be divided. Each bank sets its own steps, policy and approval limits.",
  systemLane: ["Receive documents", "Extract facts and link each to its source", "Check completeness and policy", "Draft recommendation", "Execute only authorized steps"],
  humanLane: ["Resolve missing or conflicting evidence", "Review the recommendation", "Approve, reject or escalate"],
  audit: ["Source documents", "Policy version", "Reviewer decision", "Permitted action taken"],
  transfer: [
    { task: "Collect and read documents", before: "Analyst", after: "AI, with sources linked" },
    { task: "Check for missing information", before: "Analyst", after: "AI flags gaps; analyst resolves them" },
    { task: "Check against credit policy", before: "Analyst", after: "AI pre-checks; analyst confirms" },
    { task: "Write the recommendation", before: "Analyst", after: "AI drafts; analyst edits" },
    { task: "Approve or reject", before: "Credit committee or analyst", after: "Unchanged: a person decides" },
  ],
};

export const fsVoice = {
  slides: [11, 12],
  title: "Voice agents for routine service—with a clear handover.",
  intro: "Automate the calls that follow clear rules. Transfer advice, disputes and exceptions to a person with the conversation and checks already recorded.",
  journeys: [
    { group: "Accounts and cards", task: "Balances, statements, card activation and limits", measure: "Calls resolved without transfer" },
    { group: "Payments and transfers", task: "Payment status, beneficiary questions, permitted transfers", measure: "Completed requests and errors" },
    { group: "Loans and deposits", task: "Instalment dates, rates on file, product information", measure: "Correct answers and handovers" },
    { group: "Fraud and card security", task: "Block a card, confirm suspicious activity, open a case", measure: "Time to block and case handover" },
    { group: "Digital support", task: "Login help, app guidance, password resets", measure: "Resolution and repeat calls" },
    { group: "Collections and reminders", task: "Payment reminders, promise-to-pay capture", measure: "Promises kept and complaints" },
    { group: "Campaigns and outbound", task: "Consented offers, renewals, survey calls", measure: "Consent, conversion and opt-outs" },
  ],
  launchTitle: "What must be agreed before launch.",
  launch: [
    { item: "Processing and storage location", body: "Where audio, transcripts and logs are processed and kept. On-premise deployment is an option that must be verified across the whole data path." },
    { item: "Model and logging dependencies", body: "Which models, services and monitoring tools are used, and whether any call data reaches them." },
    { item: "Language and dialect testing", body: "Tested on recorded calls in the languages and dialects customers actually use." },
    { item: "Authentication and permissions", body: "How callers are identified, and which actions the agent may initiate." },
    { item: "Response checking", body: "How answers are checked against approved information before they are spoken." },
    { item: "Latency and error monitoring", body: "Response time and failure rates watched in production, with alerts." },
    { item: "Handover", body: "When the call moves to a person, and what context travels with it." },
  ],
  supplierNote: "Our voice delivery partner reports on-premise deployments in regulated banks, support for many languages and low measured error rates. These are supplier statements, not Cognirise guarantees or independent certifications; we verify them against your architecture and test calls in a tailored demonstration.",
};

export const fsCases = {
  slides: [13, 14],
  title: "Examples of financial-services delivery.",
  intro: "Six anonymous projects described in the Cognirise capabilities presentation. Client identities are withheld. Results are as reported for each project and have not been independently verified.",
  items: [
    { id: "leasing", client: "Leasing company", problem: "Quotes and credit work were done manually across the ERP system and documents.", built: "Business rules combined with specialist agents, with gated decision points.", result: "Offer plans produced in seconds; each decision logged against the ruleset." },
    { id: "commercial-credit", client: "Commercial bank, credit risk", problem: "Portfolio reviews were manual and periodic.", built: "Early-warning signals, disclosure monitoring and concentration checks.", result: "Daily signals and proposed actions for analyst approval." },
    { id: "asset-management", client: "Asset manager", problem: "Answers about funds were slow and inconsistent.", built: "Bilingual assistant grounded in fund documents.", result: "Answers with sources, and handover to an advisor where judgement or advice is needed." },
    { id: "call-compliance", client: "Investment bank, call compliance", problem: "Brokerage calls were reviewed by audit sampling.", built: "Speech-to-text, four risk gates and a coaching queue.", result: "Critical calls routed to a 24-hour review queue. Reported gate pass rate: 71%." },
    { id: "virtual-branch", client: "State bank, virtual branch", problem: "Calls went unanswered at peak times.", built: "On-premise voice workflow for intent, enquiry and consent.", result: "Calls resolved or routed with an outcome code. Reported response time under two seconds in this project." },
    { id: "market-radar", client: "State bank, market intelligence", problem: "Market intelligence arrived late.", built: "Research across competitors, customer reviews, regulators and news.", result: "Opportunity briefs with sources, priority and a proposed action." },
  ],
};

export const fsClose = {
  title: "Choose a process and agree how to measure it.",
  body: "Bring a process with repeated manual work, a named owner and examples of real cases. We will identify the steps AI can handle, the decisions people must retain, the data needed and the measures for a pilot.",
  checklist: [
    "Baseline: work volume, time and error rate",
    "System and data access",
    "Decision owner",
    "Actions AI is allowed to take",
    "Test cases and acceptance criteria",
  ],
  cta: { label: "Discuss a process to improve", href: "/contact" },
};

export const fsResearch = {
  checked: "6 October 2026",
  sources: [
    { id: "ccaf", label: "Cambridge Centre for Alternative Finance, The 2026 Global AI in Financial Services Report (April 2026)", url: "https://www.jbs.cam.ac.uk/wp-content/uploads/2026/05/ccaf-2026-04-28-global-ai-in-financial-services-report-2.pdf", finding: "Survey of 628 organizations, including 203 fintechs and 149 traditional institutions. Process automation, software engineering, knowledge management and customer support are common uses. 52% of industry respondents report agentic AI at pilot stage or later (29% piloting, 23% scaling).", caveat: "Survey findings, not all banks or production deployments." },
    { id: "boe-fca", label: "Bank of England and FCA, Artificial intelligence in UK financial services (2024)", url: "https://www.fca.org.uk/publications/research-notes/ai-uk-financial-services", finding: "75% of respondent firms use AI. 55% of use cases involve some automated decision-making; 2% are fully autonomous.", caveat: "UK-only, 2024 sample; not directly comparable with the Cambridge survey." },
    { id: "fsb", label: "Financial Stability Board, Sound Practices for Financial Institutions’ Responsible AI Adoption (consultation, 10 June 2026)", url: "https://www.fsb.org/uploads/P100626.pdf", finding: "Describes adoption in document review, servicing, coding, fraud and credit, alongside data quality, testing, monitoring, human oversight and third-party risk.", caveat: "Consultation document, not binding rules." },
    { id: "cbuae", label: "Central Bank of the UAE, announcement of AI consumer-protection guidance (23 February 2026)", url: "https://centralbank.ae/media/41gjisn4/cbuae-issues-guidance-note-to-protect-consumers-and-ensure-responsible-use-of-artificial-intelligence-in-the-financial-sector-en.pdf", finding: "Emphasizes accountability, fairness, transparency, human oversight, data management and privacy for licensed UAE institutions.", caveat: "Applies to UAE-licensed institutions only." },
  ],
};

/** Phrases rejected by the user; must not appear on the rebuilt page. */
export const FS_REJECTED_PHRASES = ["model estate", "trust is won", "unlock value", "transform at scale", "reimagine the future"];
