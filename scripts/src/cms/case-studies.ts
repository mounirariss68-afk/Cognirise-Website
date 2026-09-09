import { validateCmsSnapshot } from "@workspace/api-zod";
import type { InventoryRecord } from "./common.js";

const SOURCE_DECK = "attached_assets/Cognirise-Case-Studies-Azure-Deployments_-_Read-Only_1788946106330.pptx";
const SOURCE_DATE = "2026-09-06";

type Seed = {
  title: string;
  sector: "Financial Services" | "Telecoms" | "Travel & Hospitality" | "Public Sector"
    | "Manufacturing & Industrial" | "Life Sciences" | "Retail & Consumer"
    | "Professional Services" | "Security & AI Infrastructure";
  organization: string;
  engagement: "client-delivery" | "product-demonstration" | "concept" | "proposal-prototype";
  stage: "production" | "pilot" | "proof-of-concept" | "mvp" | "demo" | "concept" | "proposal";
  classification: "pilot-demo" | "simulated" | "projected" | "unavailable";
  mandate: string;
  approach: string;
  impact: string;
  template: "knowledge-assistant" | "analytics-dashboard" | "workflow-console"
    | "commerce-experience" | "governance-console" | "operations-console";
  related: Array<"financial-services" | "telecoms" | "travel-hospitality" | "energy-resources" | "public-sector" | "education">;
};

export const CASE_VISUAL_LABELS: readonly (readonly string[])[] = [
  ["Batch recipe lookup", "Line 04 / changeover", "Verified 18 / 22"],
  ["Demand pulse", "Cold-chain exceptions", "Forecast horizon / 14d"],
  ["Visit debrief", "Territory queue", "Manager review"],
  ["Curated audio", "Stock at hand", "Room profile"],
  ["Issuer filings", "Price watchlist", "Source confidence"],
  ["Document intake", "Schedule B checks", "Awaiting sign-off"],
  ["Delegation ledger", "Policy boundary", "Evidence hash"],
  ["Fee schedule", "Approval trail", "Effective 01 / 07"],
  ["Supplier factors", "Plant energy", "Declaration draft"],
  ["Offer rules", "Eligibility path", "Human checkpoint"],
  ["Product library", "General question", "Source citation"],
  ["Knowledge spaces", "Agent library", "Tenant controls"],
  ["Tender review", "Workstream map", "Decision gate"],
  ["Call transcript", "Gate 02 / suitability", "Escalation queue"],
  ["Incident bridge", "Backup estate", "Approval required"],
  ["Asset register", "Reuse match", "Evidence packet"],
  ["Encrypted vault", "Client-side key", "Benchmark run"],
  ["Acoustic profile", "Listening zone", "Suggested bundle"],
  ["Exposure watch", "Concentration band", "Analyst review"],
  ["Line telemetry", "Fault signature", "Work order gate"],
  ["Provision bridge", "Exposure driver", "Threshold alert"],
] as const;

// Public wording is deliberately source-owned here rather than extracted at runtime.
// Provenance identifies only a slide number; customer names and identifying details
// in the restricted source presentation never enter inventory fields.
const seeds: readonly Seed[] = [
  { title: "Making industrial knowledge self-service", sector: "Manufacturing & Industrial", organization: "Industrial materials producer", engagement: "client-delivery", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Reduce dependence on a small group of process experts for routine technical questions.", approach: "A bilingual assistant searches the approved technical corpus, returns a sourced answer and routes uncertain questions to a process expert.", impact: "Teams can retrieve controlled process guidance with the supporting source and escalation route visible.", template: "knowledge-assistant", related: ["energy-resources"] },
  { title: "Connecting pharmacy operations signals", sector: "Life Sciences", organization: "Pharmacy distribution cooperative", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Connect service, sales and inventory signals that were reviewed in separate workflows.", approach: "A shared analytics flow joins service language, anomaly, demand and inventory signals, then sends exceptions to an accountable reviewer.", impact: "Operations teams can inspect connected signals and act on reviewed exceptions from one workspace.", template: "analytics-dashboard", related: [] },
  { title: "Coaching a distributed field team", sector: "Life Sciences", organization: "Pharmaceutical sales organization", engagement: "client-delivery", stage: "mvp", classification: "pilot-demo", mandate: "Create a consistent feedback loop for a distributed field organization.", approach: "A field-coaching platform captures visit notes, structures feedback and presents manager review queues before guidance is released.", impact: "Representatives and managers share one traceable route from visit evidence to approved coaching.", template: "workflow-console", related: [] },
  { title: "Taking a specialist retailer online", sector: "Retail & Consumer", organization: "Independent specialist retailer", engagement: "client-delivery", stage: "mvp", classification: "unavailable", mandate: "Create a digital storefront capable of extending demand beyond a physical location.", approach: "The storefront connects catalogue and stock data with reviews, ordering and recommendations bounded to available products.", impact: "Customers can discover, compare and order products through a single stock-aware experience.", template: "commerce-experience", related: [] },
  { title: "Making market information searchable", sector: "Financial Services", organization: "Capital-markets information team", engagement: "client-delivery", stage: "pilot", classification: "pilot-demo", mandate: "Replace fragmented manual market-data collection with a searchable corpus.", approach: "A collection service gathers listings, prices and issuer disclosures, indexes their source and lets analysts search with citations.", impact: "Analysts can move from a market question to the underlying disclosure and price evidence in one governed search flow.", template: "knowledge-assistant", related: ["financial-services"] },
  { title: "Automating recurring tax preparation", sector: "Financial Services", organization: "Accounting services practice", engagement: "client-delivery", stage: "proof-of-concept", classification: "projected", mandate: "Reduce repetitive preparation and document-chasing work in recurring tax workflows.", approach: "A workflow receives client documents, checks required fields and calculations, and holds the return for practitioner sign-off.", impact: "Practitioners can see missing evidence, completed checks and approval status in one preparation queue.", template: "workflow-console", related: ["financial-services"] },
  { title: "Creating accountable agent delegation", sector: "Security & AI Infrastructure", organization: "AI infrastructure product team", engagement: "concept", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Make delegated agent authority, budgets and evidence inspectable.", approach: "A trust fabric issues bounded mandates, enforces policy and records signed evidence for every delegated action.", impact: "Operators can inspect who delegated what, which boundary applied and what evidence the agent produced.", template: "governance-console", related: [] },
  { title: "Governing a single fee schedule", sector: "Financial Services", organization: "Financial brokerage team", engagement: "client-delivery", stage: "mvp", classification: "unavailable", mandate: "Replace emailed fee-schedule copies with one maintained source.", approach: "An authenticated application publishes the effective fee schedule, records changes and restricts updates to approved owners.", impact: "Teams can consult one current fee source with its approval and change trail attached.", template: "workflow-console", related: ["financial-services"] },
  { title: "Preparing embedded-emissions data", sector: "Manufacturing & Industrial", organization: "Cross-border manufacturing demonstrator", engagement: "concept", stage: "concept", classification: "projected", mandate: "Connect production, supplier and energy information for embedded-emissions reporting.", approach: "A data pipeline validates supplier, production and energy inputs, calculates product-level emissions and routes declarations for review.", impact: "Reporting teams can trace declaration-ready fields back through calculations to governed source inputs.", template: "analytics-dashboard", related: ["energy-resources"] },
  { title: "Accelerating governed vehicle offers", sector: "Financial Services", organization: "Regulated vehicle-finance provider", engagement: "client-delivery", stage: "production", classification: "unavailable", mandate: "Shorten offer preparation while retaining rules-based traceability.", approach: "An orchestrated workflow combines product rules, retrieved evidence and decision logic, with exceptions held for human approval.", impact: "Offer teams can generate a traceable proposal while keeping policy decisions and exceptions visible.", template: "workflow-console", related: ["financial-services"] },
  { title: "Answering general investment questions", sector: "Financial Services", organization: "Regulated investment-services provider", engagement: "client-delivery", stage: "mvp", classification: "pilot-demo", mandate: "Provide consistent answers to general product questions while reserving advice for people.", approach: "A bilingual assistant answers from governed product documents, cites its sources and redirects advice requests to qualified people.", impact: "Customers can receive consistent general information without crossing the boundary into personal advice.", template: "knowledge-assistant", related: ["financial-services"] },
  { title: "Creating a governed AI workspace", sector: "Professional Services", organization: "Business-services organization", engagement: "client-delivery", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Give staff a tenant-controlled alternative to public AI tools for document work.", approach: "A multilingual workspace combines chat, controlled knowledge collections and task agents behind tenant identity and access policy.", impact: "Staff can work with organizational documents inside a workspace whose users, sources and agent permissions remain inspectable.", template: "knowledge-assistant", related: [] },
  { title: "Prototyping agentic public services", sector: "Public Sector", organization: "National infrastructure authority", engagement: "proposal-prototype", stage: "proposal", classification: "pilot-demo", mandate: "Demonstrate how multiple governed agents could support infrastructure workflows.", approach: "A coordinated agent flow analyzes tender material, maps workstreams and pauses at defined human decision gates.", impact: "Public-service teams can inspect how evidence moves from intake through specialist agents to an accountable decision.", template: "operations-console", related: ["public-sector"] },
  { title: "Checking calls through risk gates", sector: "Financial Services", organization: "Regulated capital-markets firm", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Extend call review beyond small manual samples while preserving an audit queue.", approach: "A compliance flow transcribes calls, applies four suitability and conduct gates, and sends flagged passages to reviewers.", impact: "Compliance teams can review each call against consistent gates while retaining the transcript and escalation trail.", template: "governance-console", related: ["financial-services"] },
  { title: "Orchestrating data-centre incidents", sector: "Telecoms", organization: "Enterprise connectivity and data-centre operator", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Make infrastructure incident diagnosis, approvals and evidence consistent.", approach: "An operations flow connects alerts to topology and runbooks, proposes recovery steps and pauses disruptive actions for approval.", impact: "Incident teams can move from alert to an evidence-backed recovery sequence with every approval recorded.", template: "operations-console", related: ["telecoms"] },
  { title: "Finding a second life for hotel assets", sector: "Travel & Hospitality", organization: "Hospitality circularity concept team", engagement: "concept", stage: "concept", classification: "simulated", mandate: "Track retired hospitality assets and routes to reuse, donation or recycling.", approach: "A circularity portal registers retired assets, matches eligible reuse routes and preserves evidence for each handoff.", impact: "Property teams can see the available route, receiving party and evidence status for every retired asset.", template: "analytics-dashboard", related: ["travel-hospitality"] },
  { title: "Proving browser-side encrypted storage", sector: "Security & AI Infrastructure", organization: "Secure cloud product team", engagement: "client-delivery", stage: "mvp", classification: "pilot-demo", mandate: "Keep sensitive file contents unreadable to the service operator.", approach: "A browser-encrypted vault keeps encryption keys client-side, applies identity controls and records distributed storage checks.", impact: "Users can store and retrieve files while the service handles encrypted content without receiving the decryption secret.", template: "governance-console", related: [] },
  { title: "Recommending room-aware audio systems", sector: "Retail & Consumer", organization: "Consumer-electronics retailer", engagement: "product-demonstration", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Translate a room image and stated preferences into a bounded product recommendation.", approach: "A multilingual adviser reads room characteristics and preferences, checks current catalogue constraints and presents primary and alternative systems.", impact: "Shoppers can understand how room inputs and product constraints lead to a reviewable recommendation.", template: "commerce-experience", related: [] },
  { title: "Monitoring portfolio early-warning signals", sector: "Financial Services", organization: "Regulated commercial lender", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Bring disclosures, concentration and early-warning signals into a human-gated review flow.", approach: "A monitoring workspace combines portfolio exposures, disclosure changes and concentration bands, then queues material signals for analyst review.", impact: "Credit teams can trace an early-warning signal to the exposure and disclosure evidence before recording a decision.", template: "analytics-dashboard", related: ["financial-services"] },
  { title: "Diagnosing production-line faults", sector: "Manufacturing & Industrial", organization: "Beverage manufacturing operator", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Connect telemetry and maintenance knowledge for governed fault response.", approach: "A maintenance flow compares line telemetry with known fault signatures, retrieves the relevant procedure and requires approval before issuing work.", impact: "Operators can move from an equipment signal to a sourced diagnosis and approved work order.", template: "operations-console", related: ["energy-resources"] },
  { title: "Tracing provision movements earlier", sector: "Financial Services", organization: "Regulated commercial lender", engagement: "client-delivery", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Make provision movements and their exposure-level drivers visible before period end.", approach: "An authenticated monitoring view connects portfolio movements to exposure drivers and raises threshold alerts for finance review.", impact: "Finance teams can inspect the accounts driving a provision movement and resolve exceptions before close.", template: "analytics-dashboard", related: ["financial-services"] },
] as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const CASE_STUDY_TAXONOMY_COUNTS = {
  "Financial Services": 8,
  Telecoms: 1,
  "Travel & Hospitality": 1,
  "Public Sector": 1,
  "Manufacturing & Industrial": 3,
  "Life Sciences": 2,
  "Retail & Consumer": 2,
  "Professional Services": 1,
  "Security & AI Infrastructure": 2,
} as const;

export function caseStudyRecords(): InventoryRecord[] {
  return seeds.map((seed, index) => {
    const slide = index + 1;
    const slug = slugify(seed.title);
    const sourceFile = SOURCE_DECK;
    const source = { label: `Approved source presentation, slide ${slide}`, accessedAt: SOURCE_DATE };
    const summary = `${seed.mandate} ${seed.approach}`;
    const content = {
      schemaVersion: 1 as const,
      variant: "summary" as const,
      disclosure: "anonymized" as const,
      sector: seed.sector,
      organizationDescriptor: seed.organization,
      engagementType: seed.engagement,
      deliveryStage: seed.stage,
      impactClassification: seed.classification,
      impactStatement: seed.impact,
      disclosureNote: "Organization identity, geography, commercial values and identifying interface data are withheld or generalized for public use.",
      publicEvidenceStatus: "approved" as const,
      relatedIndustries: seed.related,
       visual: {
        kind: "illustrative-interface-reconstruction" as const,
        caption: `${CASE_VISUAL_LABELS[index].join(" → ")}.`,
        altText: `Cognirise Pulse workflow for ${seed.title.toLowerCase()}, showing inputs, processing, a control checkpoint and the resulting capability.`,
        textEquivalent: `${seed.approach} The visual follows ${CASE_VISUAL_LABELS[index].join(", ")} through a human or policy checkpoint to the resulting capability.`,
        template: seed.template,
         fixtureLabels: [...CASE_VISUAL_LABELS[index]],
      },
      mandate: seed.mandate,
      context: "Public-safe summary reconstructed from an approved internal source; identifying details have been removed.",
      constraints: ["Do not infer organization identity from this summary.", "Interface labels and values are anonymized fixtures."],
      work: [{ type: "paragraph" as const, text: seed.approach }],
      controls: ["Human review remains required for consequential actions.", "Public reconstruction contains no source-system data."],
      outcomes: [seed.impact],
      evidence: [{ statement: seed.impact, source, approved: true }],
      cta: { label: "Discuss a similar mandate", href: "/value-scan" },
      visibility: "public" as const,
      order: index,
      sources: [source],
      verificationDate: SOURCE_DATE,
      reviewDate: "2027-03-06",
      relatedIds: [],
    };
    const snapshot = { slug, title: seed.title, summary, content, mediaIds: [], markets: ["uae"] };
    const validation = validateCmsSnapshot("case-study", snapshot, "publish");
    if (!validation.success) throw new Error(`${sourceFile}: ${validation.errors.join("; ")}`);
    return {
      externalId: `case-study:slide-${String(slide).padStart(2, "0")}`,
      type: "case-study",
      name: seed.title,
      sourceFile,
      route: undefined,
       fields: {
         slug,
         summary,
         content,
         mediaPaths: [`/images/cognirise/cases/${String(slide).padStart(2, "0")}-${slug}.png`],
       },
      review: {
         status: "approved",
         reasons: ["Source review approved: anonymization, public evidence, accessibility, and Cognirise fixture rights gates passed."],
      },
    };
  });
}