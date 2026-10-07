import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { telecomPovSchema, type TelecomPov } from "@workspace/api-zod";

const root = path.resolve(import.meta.dirname, "../../..");
const sourcePath = path.join(root, "attached_assets/cognirise-telecomv3_1791350278651.html");
const html = fs.readFileSync(sourcePath, "utf8");
const decode = (s: string) => s.replaceAll("&amp;", "&").replaceAll("&gt;", ">").replaceAll("&lt;", "<");

// Parse literals only. Never execute the supplied microsite or its scripts.
function literal(node: ts.Node): any {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return ts.isNumericLiteral(node) ? Number(node.text) : decode(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => {
    if (!ts.isPropertyAssignment(p) || !p.name || !("text" in p.name)) throw new Error("Nonliteral source property");
    return [p.name.text, literal(p.initializer)];
  }));
  throw new Error("Nonliteral source data");
}
function extract(name: string, terminator: string) {
  const start = html.indexOf(`const ${name}=`);
  const end = html.indexOf(terminator, start);
  if (start < 0 || end < 0) throw new Error(`Missing source inventory ${name}`);
  const ast = ts.createSourceFile("source.ts", html.slice(start, end), ts.ScriptTarget.Latest, true);
  const declaration = (ast.statements[0] as ts.VariableStatement).declarationList.declarations[0];
  return literal(declaration.initializer!);
}
export const supplied = {
  categories: extract("categories", "\nlet taskTimers"),
  useCases: extract("useCases", "\ndocument.getElementById('uc-track')"),
  adaptations: extract("xi", "\ndocument.getElementById('xi-grid')"),
  outcomes: extract("matrix", "\ndocument.getElementById('matrix-body')"),
};
const id = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
const targetContext = "Illustrative KPI target. Agree the target during discovery against the operator's baseline and validate in a scoped pilot; not an achieved result, forecast or guarantee.";
const metrics: TelecomPov["metrics"] = [];
function metric(key: string, name: string, definition: string, value?: string) {
  metrics.push({ id: key, name, definition, classification: value ? "target" : "unresolved", ...(value ? { value } : {}), context: value ? targetContext : "Metric definition is proposed for discovery. The supplied figure is withheld pending clarification of baseline, scope and measurement." });
  return key;
}
const metricRows = [
  ["Customer Service", "cost-contact", "Cost per resolved contact", "Total scoped service cost divided by resolved contacts; relative reduction versus the same channel mix and baseline period.", "30–50% relative reduction"],
  ["Sales", "sales-cycle", "Sales cycle duration", "Median days from accepted qualified lead to signed contract for comparable products; relative reduction versus the operator baseline.", "20–30% relative reduction"],
  ["Marketing & CVM", "churn", "Subscriber churn rate", "Subscribers leaving in the measurement period divided by subscribers at period start; relative reduction versus a comparable untreated cohort.", "10–25% relative reduction"],
  ["Billing", "dispute-resolution", "Disputes resolved within approved authority", "Disputes fully resolved without repeat contact in the agreed observation window divided by eligible disputes; approval-required decisions remain excluded.", ""],
  ["Back Office", "data-entry", "Manual data-entry effort", "Staff minutes spent entering scoped records at matched volume and accuracy; relative reduction versus operator baseline.", "40% relative reduction"],
  ["Digital & Self-Care", "digital-sales", "Digital sales completions", "Completed digital purchases in matched periods, with cancellations and channel displacement reported separately; relative increase versus baseline.", "30–50% relative increase"],
  ["Revenue Assurance", "leakage", "Confirmed revenue leakage rate", "Confirmed unbilled or misrated eligible usage value divided by total eligible usage value; relative reduction versus operator baseline, excluding fraud overlap.", "40–60% relative reduction"],
  ["Fraud Management", "fraud-loss", "Confirmed fraud loss rate", "Confirmed fraud losses net of recovery divided by scoped revenue, with false positives and customer harm reported separately; relative reduction.", "30–50% relative reduction"],
  ["Customer Experience", "nps", "Net Promoter Score", "Percentage of promoters minus percentage of detractors on the same survey population. Changes are percentage points, not relative percent.", ""],
  ["Roaming", "settlement-time", "Roaming settlement duration", "Median elapsed time from period close to agreed settlement for comparable partners; relative reduction versus operator baseline.", "20–30% relative reduction"],
  ["Wholesale & Interconnect", "wholesale-disputes", "Wholesale billing dispute rate", "Disputed invoices divided by invoices issued in comparable periods and partner scope; relative reduction.", "50% relative reduction"],
  ["Collections & Credit Risk", "bad-debt", "Bad debt rate", "Written-off receivables divided by billed revenue for matched cohorts and observation windows; relative reduction, monitored alongside fairness and hardship outcomes.", "20–35% relative reduction"],
  ["Data Platforms", "insight-time", "Time to approved insight", "Median elapsed time from accepted analytical request to validated result at matched complexity; relative reduction.", "60–80% relative reduction"],
  ["MDM & CDP", "data-quality", "Customer record quality", "Share of sampled records passing agreed completeness, accuracy and uniqueness checks; no compound quality score without agreed weights.", ""],
  ["IT Operations", "mttr", "IT service restoration time", "Median elapsed time from confirmed scoped IT incident to verified service restoration; relative reduction, excluding network control.", "60–80% relative reduction"],
  ["Integration & Architecture", "integration-time", "Integration delivery duration", "Median elapsed time from approved interface design to accepted integration at matched complexity; relative reduction.", "50% relative reduction"],
  ["DevOps & Platform", "release-cycle", "Release cycle duration", "Median elapsed time from approved change to verified release for comparable change classes; relative reduction with failure rate held within agreed limits.", "70% relative reduction"],
  ["Business Intelligence", "report-time", "Report preparation effort", "Staff minutes from available approved data to checked report at matched scope and quality; relative reduction.", "80% relative reduction"],
] as const;
const metricByDept = new Map<string, string>();
for (const [dept, key, name, definition, value] of metricRows) metricByDept.set(dept, metric(key, name, definition, value || undefined));
metric("offer-conversion", "Offer conversion rate", "Accepted eligible offers divided by delivered eligible offers within an agreed attribution window. Absolute rate and relative uplift are different measurements.");
metric("lead-meeting", "Lead-to-meeting conversion", "Qualified meetings held divided by eligible leads contacted in an agreed cohort. Supplied multiple needs baseline and qualification consistency.");
metric("recovery-value", "Verified recovered revenue", "Revenue actually recovered, net of recovery costs and reversals, in a defined operator and billing period. No universal monetary promise.");
metric("arpu", "Average revenue per user", "Scoped recognised service revenue divided by average active subscribers in a matched period; relative increase, controlling mix and tariff effects.", "5–12% relative increase");
metric("bundle-attachment", "Bundle attachment rate", "Eligible customers adding the specified bundle divided by customers offered it in an agreed period; relative increase versus baseline.", "15–25% relative increase");
metric("inventory-cost", "Device inventory carrying cost", "Carrying cost for matched inventory volume and service availability over the agreed period; relative reduction.", "20–30% relative reduction");
metric("employee-query", "Employee query resolution", "Eligible employee queries fully resolved with verified answers and no repeat contact in the agreed window divided by eligible queries.");
metric("ra-cycle", "RA/fraud case resolution duration", "Median time from validated alert to verified closure, reported separately for revenue leakage and fraud cases.");
metric("ra-opex", "RA/fraud operating cost", "Cost of the scoped control process per reviewed case, with accuracy and customer-harm guardrails.");

const systems: Record<string, string> = {
  Business: "Permissioned CRM, product catalogue, billing, customer channels and internal case systems; minimum necessary records only.",
  Operations: "Read-only usage and telemetry, billing ledgers, contracts and partner settlements; approved cases handed to accountable operational teams.",
  Foundations: "Existing data platforms, identity, metadata, ITSM, API gateway and deployment tooling; no new unified lake required.",
};
const boundaries: Record<string, string> = {
  Billing: "Credits and dispute settlements require financial limits and named approval. Rating-engine patches require tested change control and rollback; never silently change charging.",
  "Collections & Credit Risk": "Credit and collections decisions require approved policy, fairness checks, hardship routes and accountable review. No independent adverse credit decision.",
  "Fraud Management": "SIM suspension, traffic blocking and route changes require authorised fraud/NOC handoff, subscriber impact checks, intervention and recovery. No millisecond blocking promise.",
  "Wholesale & Interconnect": "Optimise recommendations, not network routing. NEP/NOC owners authorise route changes; settlements remain subject to contract and finance approval.",
  Roaming: "Partner steering is an authorised NEP/NOC handoff. Fraud restrictions and settlements require owner approval and a documented reversal path.",
  "IT Operations": "Use approved IT runbooks only within a named change envelope. Network remediation stays with NEP/NOC; infrastructure changes require change approval and recovery rehearsal.",
  "DevOps & Platform": "Infrastructure and releases require environment-scoped credentials, tested changes, owner approval and a rollback checkpoint.",
  "Marketing & CVM": "Tariff and offer changes need commercial approval, consent, fairness and applicable consumer-protection review. No unrestricted repricing.",
};
const standardBoundary = "Action-specific permissions limit reach and reversibility. Obtain owner approval for consequential changes; retain evidence, intervention controls and a tested recovery path.";
const rolesOverrides: Record<string, string> = {
  "Quality Monitoring Agent": "Reviews authorised interaction samples against approved quality criteria; coverage and accuracy are validated.",
  "Dispute Resolution Agent": "Assembles dispute evidence and proposes a settlement within approval policy.",
  "Self-Healing Billing Agent": "Identifies billing faults and prepares a tested correction for change approval.",
  "Response Agent": "Prepares a response and hands network restrictions to authorised fraud/NOC owners.",
  "Wangiri & Robocall Agent": "Flags suspicious patterns and proposes restrictions to authorised owners.",
  "Least-Cost Routing Agent": "Compares routing costs and recommends changes to NEP/NOC; does not control routes.",
  "Steering-of-Roaming Agent": "Proposes partner steering under contract and service-quality constraints for NEP/NOC approval.",
  "NPS Recovery Agent": "Prepares an accountable follow-up for detractors with consent and escalation.",
  "Integration Monitor Agent": "Checks approved integration health and raises traceable exceptions.",
  "API Orchestration Agent": "Coordinates supported interfaces after access, specification and conformance review.",
  "Modernisation Agent": "Assesses modernisation options; no ODA certification or alignment is asserted.",
  "Remediation Agent": "Prepares approved IT runbooks and hands network changes to NEP/NOC.",
  "Dynamic Pricing Agent": "Proposes permitted tariff and offer changes for commercial and regulatory review.",
};
const departments: TelecomPov["departments"] = Object.entries(supplied.categories).flatMap(([domain, category]: [string, any]) => {
  const lane = domain === "business" ? "Business" : domain === "operations" ? "Operations" : "Foundations";
  return category.agents.map((d: any) => {
    const title = d.dept === "Data Platform" ? "Data Platforms" : d.dept === "Master Data & CDP" ? "MDM & CDP" : d.dept;
    const metricId = metricByDept.get(title);
    if (!metricId) throw new Error(`Missing metric mapping: ${title}`);
    const controls = boundaries[title] ?? standardBoundary;
    return {
      id: id(title), title, domain: lane,
      challenge: title === "Revenue Assurance" ? "Unbilled usage, rating errors and partner disputes can hide leakage until reconciliation." : title === "Fraud Management" ? "Fraud patterns cross voice, data, roaming and identity records; weak evidence and false positives can harm customers." : title === "Integration & Architecture" ? "Fragmented legacy interfaces and point-to-point dependencies slow safe change." : d.ch,
      roles: d.fns.map((r: any) => ({
        title: r.n.replace(/ Agent$/, ""),
        body: rolesOverrides[r.n] ?? `Illustrative support pattern: ${r.d.replace(/24\/7|100%|1000\+/g, "").replace(/autonomously|automatically|continuously/gi, "within approved scope")}. Any write action remains subject to this department's controls.`,
      })),
      systems: systems[lane], actions: `Assemble evidence and propose the next step across ${title.toLowerCase()} workflows. Execute only explicitly authorised, tested actions; escalate exceptions to the named owner.`,
      controls, metricIds: [metricId],
    };
  });
});
const scenarioDept = ["Billing", "Sales", "Marketing & CVM", "Roaming", "Revenue Assurance", "Marketing & CVM", "Marketing & CVM", "Back Office"];
const scenarioNames = ["Billing dispute investigation", "Qualified sales handoff", "Relevant recharge offer", "Roaming fraud investigation", "Revenue leakage reconciliation", "Offer auction experiment", "Plan and bundle proposal", "Employee service request"];
const scenarioMetrics = ["dispute-resolution", "lead-meeting", "offer-conversion", "fraud-loss", "recovery-value", "offer-conversion", "arpu", "employee-query"];
const scenarios: TelecomPov["scenarios"] = scenarioNames.map((title, i) => {
  const d = departments.find(d => d.title === scenarioDept[i])!;
  const evidence = [
    "A disputed invoice and customer explanation enter the billing case queue.",
    "A prospective customer requests a product conversation through an approved channel.",
    "An opted-in subscriber becomes eligible for a reviewed recharge offer.",
    "Authorised roaming telemetry flags an unusual usage pattern; no restriction is applied.",
    "Reconciliation flags a mismatch between eligible usage, rating and billed amounts.",
    "An approved campaign test compares eligible offers; the auction is a proposal mechanism, not an unrestricted bidding agent.",
    "A reviewed segment shows a potential mismatch between bundle needs and current product options.",
    "An employee submits a routine policy or service request through an authorised channel.",
  ];
  return { id: id(title), title, departmentId: d.id, owner: `${d.title} process owner`,
    boundary: d.controls, auditRecovery: "Record input provenance, proposed action, approver, executed change and verification. Stop on unexpected impact; restore the prior approved state or open a compensating case when reversal is not possible.",
    metricIds: [scenarioMetrics[i]],
    stages: {
      detect: evidence[i],
      investigate: `Retrieve permitted ${d.title.toLowerCase()} records, check identity, freshness and contradictory evidence; request missing context rather than guessing.`,
      propose: `Prepare a reasoned ${title.toLowerCase()} recommendation with alternatives, expected impact and the action-specific permission required.`,
      approveExecute: `${d.controls} Record approval before using the authorised execution interface; otherwise hand off without taking action.`,
      verify: "Confirm the intended outcome, check customer and service impact, and compare the defined KPI with the agreed baseline. Close only with owner-accepted evidence.",
    } };
});
const candidateDefs = [
  ["RA & Fraud", "revenue-assurance", 82, 68], ["Customer Service", "customer-service", 75, 80],
  ["Churn & CVM", "marketing-cvm", 72, 44], ["Billing", "billing", 67, 70],
  ["Data Platform", "data-platforms", 58, 25], ["Roaming & Wholesale", "roaming", 53, 38],
  ["Back Office", "back-office", 35, 76], ["BI Reporting", "business-intelligence", 26, 84],
] as const;
const poolDefs = [
  ["Revenue integrity", "Reconcile leakage, investigate fraud and separate recovery from overlapping savings.", "leakage"],
  ["Service & customer experience", "Improve resolved service, not containment or call avoidance alone.", "cost-contact"],
  ["Growth — marketing & CVM", "Test relevant offers and retention with consent and fair treatment.", "churn"],
  ["Roaming & wholesale", "Improve settlements and partner decisions while preserving network ownership.", "settlement-time"],
  ["Billing & disputes", "Explain charges and prepare corrections within financial and change-control limits.", "dispute-resolution"],
  ["Sales acceleration", "Prepare timely, qualified commercial handoffs rather than optimise low-quality lead volume.", "sales-cycle"],
];
export const telecomPov: TelecomPov = telecomPovSchema.parse({
  version: 1,
  note: "Figures are sourced outcomes reported at other operators or illustrative KPI targets. They are not Cognirise delivery results or guarantees; applicability depends on operator context.",
  valuePools: poolDefs.map(([title, body, metricId]) => ({ title, body, metricIds: [metricId] })),
  candidates: candidateDefs.map(([title, departmentId, valuePosition, feasibilityPosition]) => {
    const d = departments.find(x => x.id === departmentId)!;
    return { id: id(title), title, valuePosition, feasibilityPosition,
      valueHypothesis: `Investigate whether ${d.title.toLowerCase()} can improve its defined KPI without transferring cost or harm elsewhere.`,
      readiness: "Unknown until operator data access, quality, consent and baseline are assessed. Position is an illustrative hypothesis, not readiness evidence.",
      dependencies: d.systems, authority: d.controls,
      validation: "Validate first: agree eligible population, comparison period, stop conditions and owner. Test against the operator baseline in a bounded pilot.",
    };
  }),
  departments,
  architecture: {
    orchestration: "Domain-limited orchestration delegates named tasks with scoped identities, purpose-limited context and explicit handoffs. No omnipotent master agent or unrestricted shared memory.",
    domains: "Business, Operations and Foundations collaborate through approved evidence and action contracts. Selecting a department highlights its application path; this is a Telecom application view, not a replacement CogniOS model.",
    foundation: "Reuse permissioned OSS/BSS, CRM, billing, partner records and read-only telemetry. Integrate supported APIs, reviewed adapters and semantic mappings where appropriate; a new data lake is not required and orchestration is not model training.",
    execution: "Owner-authorised workflows enforce permissions, approvals, intervention, audit and recovery. NEP/NOC retains network control. Partner systems and platform capabilities retain their existing ownership.",
  },
  scenarios,
  rafm: { title: "Revenue assurance & fraud, connected by evidence", body: "Correlate usage, billing and partner evidence without merging all data into a new lake. Keep leakage and fraud cases distinct, avoid double-counting recovery, and join investigations through permissioned case references.", scenarioIds: [scenarios[4].id, scenarios[3].id] },
  adaptations: supplied.adaptations.map((x: any, i: number) => ({
    title: x.to, body: `Adaptation hypothesis from ${x.cat.toLowerCase()}: ${[
      "compare approved offers using a bounded allocation experiment.",
      "propose plan and add-on changes for commercial review.",
      "test appropriate multi-product bundles with transparent terms.",
      "recommend a relevant next offer or service action.",
      "explore licensed partner financial products only after suitability review.",
      "prepare inventory-aware promotions under approved pricing limits.",
      "test content and connectivity packages with explicit subscription consent.",
      "evaluate permitted QoS-tier offers with network-owner handoffs, not independent network control.",
    ][i]}`,
    constraints: "Requires consent, fairness, transparent terms and market-specific consumer and telecom review. Financial offers require applicable licensing and affordability safeguards; QoS and routing changes require NEP/NOC authority.",
    metricIds: [[ "offer-conversion" ], ["arpu"], ["bundle-attachment"], ["offer-conversion"], [], ["inventory-cost"], ["bundle-attachment"], ["arpu"]][i],
  })),
  capabilityRange: [
    { title: "Manual", body: "People perform the work with documented evidence.", appropriate: "Novel, infrequent or high-exposure decisions.", controls: "Named ownership, access controls and reviewable records." },
    { title: "Assisted", body: "Tools assemble information and suggest options; people decide and act.", appropriate: "Ambiguous work that benefits from human judgment.", controls: "Source checking, professional review and no unapproved writes." },
    { title: "Automated", body: "Deterministic rules execute defined tasks.", appropriate: "Stable, repeatable actions with clear exception paths.", controls: "Tested rules, bounded permissions, monitoring and recovery." },
    { title: "Orchestrated", body: "Permissioned workflows coordinate work across accountable teams.", appropriate: "Evidence-rich journeys with explicit handoffs and approvals.", controls: "Domain isolation, action-specific approval, audit and intervention." },
    { title: "Bounded delegated action", body: "Tested workflows act within a deliberately limited authority envelope.", appropriate: "Only where exposure permits and evidence supports delegated action; not a required destination.", controls: "Exposure sets the ceiling; evidence earns authority within it. Stop conditions, monitoring and tested recovery remain mandatory." },
  ],
  delivery: {
    innovate: "Assess the process, prioritise hypotheses and define the operator baseline, exposure and accountable owner.",
    demonstrate: "Generate bounded evidence with a scoped pilot, comparison design, explicit stop conditions and customer-impact measures.",
    activate: "Integrate production interfaces, authorise actions, rehearse intervention and recovery, and prepare accountable teams.",
    operate: "Monitor outcomes, cost and harm; review evidence and permissions, improve through approved changes and retire ineffective workflows.",
  },
  marketConstraints: "For the selected edition, review data residency, lawful purpose, retention, cross-border processing, customer consent, complaints and telecom consumer protection with qualified local owners. Network and partner approvals remain explicit. This is not a compliance assurance; launch depends on edition-specific legal and operational review.",
  entryPoints: [
    { title: "Readiness conversation", body: "Bring a process and its baseline to a Value Scan; assess the decision and evidence gaps within Innovate." },
    { title: "Scoped pilot", body: "Agree an evidence plan within Demonstrate. Timing and production scope depend on access, integration and approval—not a fixed-day promise." },
    { title: "Innovation workshop", body: "Explore adaptation hypotheses and prioritise work within Innovate; use the same delivery and authority model." },
  ],
  metrics,
  reviewBlockers: [
    "Commercial owner must approve illustrative target ambition and metric definitions before publication.",
    "Resolve or explicitly accept withholding the conflicting offer-conversion figure, relative NPS claims, universal recovery dollars and other unresolved source figures in the private inventory.",
    "Selected-edition privacy, consumer-protection, tariff, credit, network and deployment constraints require qualified local review.",
    "Editorial owner must approve the source-to-section correction record and confirm no source claim is represented as Cognirise delivery evidence.",
  ],
});

export const telecomCopy = {
  thesis: "Transform the enterprise around the network.",
  dek: "Connect customer, commercial and operational work through bounded, evidence-tested workflows. Keep network control with your NEP and NOC, and give every consequential action a clear owner.",
  opportunity: "The enterprise around the network contains recurring decisions across service, sales, billing, assurance and internal operations. Start with a measurable workflow, not a promise of universal autonomy.",
  pressures: [
    { title: "Margin needs resolved work", body: "Reducing service effort matters only when resolution quality, repeat contact and customer harm remain visible." },
    { title: "Fragmented context slows decisions", body: "Connect permitted records across existing systems without making a new data lake a prerequisite." },
    { title: "Integration is not authority", body: "An available API is not permission to issue credits, suspend a SIM, change tariffs or alter infrastructure." },
  ],
  reversal: { title: "More autonomy is not the objective.", body: "Exposure sets the ceiling and evidence earns authority within it. Choose the least authority that achieves the intended outcome with accountable intervention and recovery." },
  myth: { claim: "“One master agent can run the enterprise.”", verdict: "No. Domain-limited orchestration coordinates approved work; business owners, network teams and partners retain their responsibilities." },
  service: { label: "Digital & AI Workforce", href: "/what-we-do/digital-ai-workforce", firstMove: "Choose one workflow worth proving." },
  selectedWork: { description: "Bring the workflow, its current baseline and the people accountable for decisions. Agree a bounded evidence plan before expanding authority." },
};
