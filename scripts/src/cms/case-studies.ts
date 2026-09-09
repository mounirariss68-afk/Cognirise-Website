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
  { title: "Making industrial knowledge self-service", sector: "Manufacturing & Industrial", organization: "Industrial materials producer", engagement: "client-delivery", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Reduce dependence on a small group of process experts for routine technical questions.", approach: "A bilingual, corpus-grounded assistant with controlled answer sourcing was reconstructed for evaluation.", impact: "Proof-of-concept users could query the working assistant directly; no production efficiency outcome has been verified.", template: "knowledge-assistant", related: ["energy-resources"] },
  { title: "Connecting pharmacy operations signals", sector: "Life Sciences", organization: "Pharmacy distribution cooperative", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Connect service, sales and inventory signals that were reviewed in separate workflows.", approach: "A six-module analytics demonstration covered language analysis, anomaly detection, churn signals and demand forecasting.", impact: "The demonstration processed anonymized fixtures across six modules; the figures describe a demo run, not observed business impact.", template: "analytics-dashboard", related: [] },
  { title: "Coaching a distributed field team", sector: "Life Sciences", organization: "Pharmaceutical sales organization", engagement: "client-delivery", stage: "mvp", classification: "pilot-demo", mandate: "Create a consistent feedback loop for a distributed field organization.", approach: "A starter field-coaching platform captured visits, structured feedback and manager views.", impact: "An MVP was made available for pilot feedback; later coaching benefits remain unverified.", template: "workflow-console", related: [] },
  { title: "Taking a specialist retailer online", sector: "Retail & Consumer", organization: "Independent specialist retailer", engagement: "client-delivery", stage: "mvp", classification: "unavailable", mandate: "Create a digital storefront capable of extending demand beyond a physical location.", approach: "The storefront combined catalogue, stock, reviews and a bounded recommendation assistant.", impact: "The delivered storefront supported browsing and ordering; no attributable commercial uplift is available.", template: "commerce-experience", related: [] },
  { title: "Making market information searchable", sector: "Financial Services", organization: "Capital-markets information team", engagement: "client-delivery", stage: "pilot", classification: "pilot-demo", mandate: "Replace fragmented manual market-data collection with a searchable corpus.", approach: "A collection service fed a grounded assistant for listings, prices and disclosures.", impact: "During the pilot, automated collection replaced manual pulls; production accuracy and time savings have not been independently verified.", template: "knowledge-assistant", related: ["financial-services"] },
  { title: "Automating recurring tax preparation", sector: "Financial Services", organization: "Accounting services practice", engagement: "client-delivery", stage: "proof-of-concept", classification: "projected", mandate: "Reduce repetitive preparation and document-chasing work in recurring tax workflows.", approach: "A workflow combined document intake, calculation checks and client-facing status.", impact: "The proof of concept demonstrated a checked automated flow; staff-time benefits are projected rather than observed.", template: "workflow-console", related: ["financial-services"] },
  { title: "Creating accountable agent delegation", sector: "Security & AI Infrastructure", organization: "AI infrastructure product team", engagement: "concept", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Make delegated agent authority, budgets and evidence inspectable.", approach: "A trust-fabric proof of concept combined bounded mandates, policy enforcement and signed evidence logs.", impact: "Tamper detection and offline verification worked in proof-of-concept scenarios; production assurance is not claimed.", template: "governance-console", related: [] },
  { title: "Governing a single fee schedule", sector: "Financial Services", organization: "Financial brokerage team", engagement: "client-delivery", stage: "mvp", classification: "unavailable", mandate: "Replace emailed fee-schedule copies with one maintained source.", approach: "An authenticated web application presented a controlled schedule and change trail.", impact: "The application established a controlled fee-sheet workflow; downstream quote consistency was not independently measured.", template: "workflow-console", related: ["financial-services"] },
  { title: "Preparing embedded-emissions data", sector: "Manufacturing & Industrial", organization: "Cross-border manufacturing demonstrator", engagement: "concept", stage: "concept", classification: "projected", mandate: "Connect production, supplier and energy information for embedded-emissions reporting.", approach: "A concept pipeline ingested source data, calculated product emissions and produced declaration-ready fields.", impact: "The concept demonstrated the reporting pathway; compliance effort and emissions outcomes are projected, not observed.", template: "analytics-dashboard", related: ["energy-resources"] },
  { title: "Accelerating governed vehicle offers", sector: "Financial Services", organization: "Regulated vehicle-finance provider", engagement: "client-delivery", stage: "production", classification: "unavailable", mandate: "Shorten offer preparation while retaining rules-based traceability.", approach: "An agentic workflow combined decision rules, product logic, retrieval and process orchestration.", impact: "The source records deployed environments and traceable offer generation, but supplies no independently approved business-impact measure.", template: "workflow-console", related: ["financial-services"] },
  { title: "Answering general investment questions", sector: "Financial Services", organization: "Regulated investment-services provider", engagement: "client-delivery", stage: "mvp", classification: "pilot-demo", mandate: "Provide consistent answers to general product questions while reserving advice for people.", approach: "A bilingual assistant used governed documents, sourcing, disclaimers and guardrails.", impact: "The delivered demonstration answered general questions from governed sources; service-volume reduction has not been verified.", template: "knowledge-assistant", related: ["financial-services"] },
  { title: "Creating a governed AI workspace", sector: "Professional Services", organization: "Business-services organization", engagement: "client-delivery", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Give staff a tenant-controlled alternative to public AI tools for document work.", approach: "A multilingual workspace combined chat, knowledge collections, agents and tenant sign-in.", impact: "The proof of concept demonstrated tenant-contained workflows; adoption and risk reduction are not yet observed outcomes.", template: "knowledge-assistant", related: [] },
  { title: "Prototyping agentic public services", sector: "Public Sector", organization: "National infrastructure authority", engagement: "proposal-prototype", stage: "proposal", classification: "pilot-demo", mandate: "Demonstrate how multiple governed agents could support infrastructure workflows.", approach: "Proposal prototypes combined an assistant, tender analysis, workflow middleware and human decision gates.", impact: "Live proposal demonstrations covered tender review and command-centre scenarios; no deployed public-service impact is claimed.", template: "operations-console", related: ["public-sector"] },
  { title: "Checking calls through risk gates", sector: "Financial Services", organization: "Regulated capital-markets firm", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Extend call review beyond small manual samples while preserving an audit queue.", approach: "A compliance demonstration transcribed calls and applied four review gates with human escalation.", impact: "Pass rates and queues shown in the interface came from a demo fixture estate, not observed operating results.", template: "governance-console", related: ["financial-services"] },
  { title: "Orchestrating data-centre incidents", sector: "Telecoms", organization: "Enterprise connectivity and data-centre operator", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Make infrastructure incident diagnosis, approvals and evidence consistent.", approach: "An operations proof of concept ran incident scenarios over a simulated backup and virtualization estate.", impact: "Five simulated scenarios ran end to end with approval gates; production reliability or time-to-repair impact is not claimed.", template: "operations-console", related: ["telecoms"] },
  { title: "Finding a second life for hotel assets", sector: "Travel & Hospitality", organization: "Hospitality circularity concept team", engagement: "concept", stage: "concept", classification: "simulated", mandate: "Track retired hospitality assets and routes to reuse, donation or recycling.", approach: "A concept portal combined an asset register, matching options and an evidence trail.", impact: "Diversion, emissions and recovery figures are anonymized demo fixtures and must not be read as observed portfolio outcomes.", template: "analytics-dashboard", related: ["travel-hospitality"] },
  { title: "Proving browser-side encrypted storage", sector: "Security & AI Infrastructure", organization: "Secure cloud product team", engagement: "client-delivery", stage: "mvp", classification: "pilot-demo", mandate: "Keep sensitive file contents unreadable to the service operator.", approach: "A browser-encrypted vault kept passphrases client-side and paired identity controls with distributed benchmarks.", impact: "The MVP demonstrated operator-unreadable fixture storage and benchmark execution; no external security certification is claimed.", template: "governance-console", related: [] },
  { title: "Recommending room-aware audio systems", sector: "Retail & Consumer", organization: "Consumer-electronics retailer", engagement: "product-demonstration", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Translate a room image and stated preferences into a bounded product recommendation.", approach: "A multilingual adviser estimated room characteristics and proposed a primary and alternative configuration.", impact: "The proof of concept generated fixture recommendations from uploaded room images; conversion impact is unavailable.", template: "commerce-experience", related: [] },
  { title: "Monitoring portfolio early-warning signals", sector: "Financial Services", organization: "Regulated commercial lender", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Bring disclosures, concentration and early-warning signals into a human-gated review flow.", approach: "A credit-monitoring demonstration combined portfolio signals, disclosure watch and analyst approvals.", impact: "Portfolio values and concentrations shown are anonymized demonstration fixtures; they are not client results.", template: "analytics-dashboard", related: ["financial-services"] },
  { title: "Diagnosing production-line faults", sector: "Manufacturing & Industrial", organization: "Beverage manufacturing operator", engagement: "product-demonstration", stage: "proof-of-concept", classification: "simulated", mandate: "Connect telemetry and maintenance knowledge for governed fault response.", approach: "A predictive-maintenance demonstration diagnosed scenarios from simulated telemetry and proposed gated work orders.", impact: "Scenario counts, efficiency and avoided-downtime values are simulated interface fixtures, not observed plant outcomes.", template: "operations-console", related: ["energy-resources"] },
  { title: "Tracing provision movements earlier", sector: "Financial Services", organization: "Regulated commercial lender", engagement: "client-delivery", stage: "proof-of-concept", classification: "pilot-demo", mandate: "Make provision movements and their exposure-level drivers visible before period end.", approach: "An authenticated monitoring view provided exposure-level changes and threshold alerts.", impact: "The proof of concept exposed provision drivers in a shared view; reporting-cycle improvement has not been verified.", template: "analytics-dashboard", related: ["financial-services"] },
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
    const summary = `${seed.organization}: ${seed.mandate}`;
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
        caption: "Illustrative reconstruction using anonymized fixture data.",
        altText: `Illustrative ${seed.template.replaceAll("-", " ")} for an anonymized ${seed.organization.toLowerCase()}.`,
        textEquivalent: `${seed.approach} Labels and values are anonymized fixtures rather than a client-system capture.`,
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