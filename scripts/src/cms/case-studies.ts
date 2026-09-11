import { validateCmsSnapshot } from "@workspace/api-zod";
import type { InventoryRecord } from "./common.js";
import { PUBLIC_MARKET_BASELINE } from "./market-baseline.js";

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

export type CaseCinematicVisual = {
  filename: string;
  creativeBrief: string;
  caption: string;
  altText: string;
  textEquivalent: string;
};

// Each commissioned image is an original, text-free editorial scene. These
// briefs are the source of truth for CMS accessibility and rights review; they
// do not imply the image is a reconstruction of a client interface.
export const CASE_CINEMATIC_VISUALS: readonly CaseCinematicVisual[] = [
  { filename: "01-industrial-knowledge.jpg", creativeBrief: "Process expertise moving from a controlled knowledge stack to a factory line.", caption: "Controlled industrial knowledge in motion.", altText: "Two process engineers review a luminous knowledge stack beside an industrial production line.", textEquivalent: "A process engineer reviews a controlled knowledge collection while a colleague confirms its release to an operating production line." },
  { filename: "02-pharmacy-signals.jpg", creativeBrief: "Cold-chain and inventory signals converging on accountable pharmacy operations.", caption: "Connected pharmacy operations signals.", altText: "A pharmacy operations specialist checks a glowing control station between medicine storage and a conveyor.", textEquivalent: "Medicine storage, inventory trays and an operations conveyor connect through one illuminated exception point checked by a specialist." },
  { filename: "03-field-coaching.jpg", creativeBrief: "Visit evidence becoming a manager-reviewed coaching conversation.", caption: "A traceable route from field evidence to coaching.", altText: "Two field-team colleagues review physical materials at a table crossed by a violet light path.", textEquivalent: "A field representative and manager turn physical visit materials into a visible feedback route at a shared review table." },
  { filename: "04-specialist-retail.jpg", creativeBrief: "A specialist product journey joining tactile discovery, stock and fulfilment.", caption: "Specialist retail, from product discovery to handoff.", altText: "A shopkeeper checks a product in a specialist retail space as a courier collects a parcel.", textEquivalent: "A specialist shopkeeper verifies a product while a courier receives a prepared parcel, connecting discovery and fulfilment." },
  { filename: "05-market-search.jpg", creativeBrief: "An analyst tracing a market question back to a physical source dossier.", caption: "Market research with source traceability.", altText: "An analyst holds a source dossier in a research room with a flowing violet evidence path.", textEquivalent: "An analyst examines a sourced dossier as an illuminated path connects the research archive to the review desk." },
  { filename: "06-tax-preparation.jpg", creativeBrief: "A practitioner reviewing an orderly, exception-aware preparation queue.", caption: "Tax preparation held for practitioner sign-off.", altText: "A practitioner reviews a document folder beside ordered illuminated validation trays.", textEquivalent: "A practitioner reviews a final folder after materials have passed through a series of controlled preparation trays." },
  { filename: "07-agent-delegation.jpg", creativeBrief: "Bounded agent authority travelling through visible policy gates to a human operator.", caption: "Delegation remains bounded and inspectable.", altText: "An operator holds a mandate token beside a row of transparent policy gates linked by violet light.", textEquivalent: "A single delegation path passes through successive physical policy gates before reaching the operator holding the mandate." },
  { filename: "08-fee-schedule.jpg", creativeBrief: "One safeguarded fee source with a visible owner-controlled change mechanism.", caption: "A maintained source for governed fee information.", altText: "A steward turns a physical approval wheel beside a large blank illuminated archival panel.", textEquivalent: "A steward uses a physical control beside a protected archival panel, conveying that one maintained source is owner-governed." },
  { filename: "09-embedded-emissions.jpg", creativeBrief: "Materials, energy and suppliers joined into a reviewable product lineage.", caption: "Embedded-emissions lineage from inputs to review.", altText: "A sustainability reviewer observes materials, factory equipment and illuminated paths through a tall review gate.", textEquivalent: "Material, energy and supplier forms converge through a review gate where a sustainability specialist checks their lineage." },
  { filename: "10-vehicle-offers.jpg", creativeBrief: "Rules-based vehicle offers with a physical exception gate and underwriter oversight.", caption: "Vehicle offers routed through accountable controls.", altText: "An underwriter moves geometric blocks through a glowing gate beside an unbranded vehicle model.", textEquivalent: "An underwriter guides abstract product-rule blocks through a coral-lit exception gate before they reach a vehicle offer model." },
  { filename: "11-general-investment.jpg", creativeBrief: "General information stays in the product library while advice goes to people.", caption: "A clear human boundary around investment guidance.", altText: "An adviser and visitor meet beside a curated product library in a calm information salon.", textEquivalent: "A visitor receives a human handoff in a product-information library, separating general information from personal advice." },
  { filename: "12-governed-ai-workspace.jpg", creativeBrief: "Private knowledge spaces and controlled agent pathways behind tenant boundaries.", caption: "A governed workspace for organizational knowledge.", altText: "An administrator reviews illuminated knowledge rooms and identity arches in a shared workspace.", textEquivalent: "Private knowledge rooms connect through visible identity arches while an administrator oversees permissions from a central table." },
  { filename: "13-public-services.jpg", creativeBrief: "Public-service workstreams progressing across a civic model to a human decision gate.", caption: "Public-service workflows pause for accountable decisions.", altText: "A raised hand pauses illuminated routes across a detailed civic infrastructure model.", textEquivalent: "Illuminated workstreams travel across bridges and civic infrastructure until an official pauses them at a decision point." },
  { filename: "14-call-risk-gates.jpg", creativeBrief: "Call signals passing through successive suitability and conduct gates to a reviewer.", caption: "Call review through visible risk gates.", altText: "A headset-wearing reviewer presses a coral control beside four translucent gates crossed by sound-wave light.", textEquivalent: "A call signal crosses four physical gates in sequence before a reviewer deliberately activates the final escalation control." },
  { filename: "15-data-centre-incidents.jpg", creativeBrief: "An incident signal moving through topology to a controlled recovery action.", caption: "Data-centre response with approval in the loop.", altText: "An incident engineer stands at a control station in a blue data-centre corridor under a coral alert path.", textEquivalent: "A coral incident path travels through the data-centre structure to an engineer who authorizes a controlled intervention." },
  { filename: "16-hotel-asset-reuse.jpg", creativeBrief: "Retired hospitality assets travelling to accountable reuse routes.", caption: "Hospitality assets prepared for a second life.", altText: "A property manager hands over a token beside a chair, linens and a hospitality service cart.", textEquivalent: "A chair and linen cart sit in a service yard while a property manager verifies the handoff that begins a reuse route." },
  { filename: "17-browser-encrypted-storage.jpg", creativeBrief: "A client-held key outside a protected storage vault.", caption: "Client-side control around encrypted storage.", altText: "A person holds a small glowing key outside a tall translucent vault in an architectural security chamber.", textEquivalent: "The key remains in the user's hand outside a sealed vault, conveying storage whose contents cannot be opened by the service." },
  { filename: "18-room-aware-audio.jpg", creativeBrief: "A listening room and physical room model used to explain a bounded recommendation.", caption: "Room-aware audio, made tangible.", altText: "An adviser and shopper compare a miniature listening-room model beside speakers and flowing sound waves.", textEquivalent: "A shopper and adviser use a physical model of the room while sound waves show how the recommendation responds to space." },
  { filename: "19-portfolio-warning.jpg", creativeBrief: "Early-warning exposure signals isolated for an analyst's human review.", caption: "Portfolio warning signals before the decision.", altText: "An analyst places a glowing coral block into a review tray among large abstract exposure forms.", textEquivalent: "An analyst removes a coral early-warning block from grouped exposure forms and places it in a dedicated review tray." },
  { filename: "20-production-faults.jpg", creativeBrief: "Machine telemetry linked to maintenance knowledge and an approved work order.", caption: "Production-fault response with operator approval.", altText: "A factory operator holds an approval token beside a beverage line and a violet machine-signal pulse.", textEquivalent: "A machine signal crosses a beverage line to an operator who holds the approval needed to issue maintenance work." },
  { filename: "21-provision-movements.jpg", creativeBrief: "Exposure drivers moving across a bridge until a threshold routes an exception to review.", caption: "Provision movements surfaced before close.", altText: "A finance reviewer moves glowing violet blocks across a navy bridge toward a coral exception tray.", textEquivalent: "A finance reviewer follows abstract exposure blocks over a bridge while a coral threshold isolates one exception for review." },
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

export function caseStudyMarketInventory(records = caseStudyRecords()) {
  const enabledFallbackMarkets = PUBLIC_MARKET_BASELINE
    .filter((market) => market.enabled && market.fallbackMarketCode === "uae")
    .map((market) => market.code);
  return records.map((record) => ({
    externalId: record.externalId,
    slug: record.fields.slug,
    title: record.name,
    directPublishedMarket: "uae",
    fallbackDelivery: enabledFallbackMarkets.map((requestedMarket) => ({
      requestedMarket,
      effectiveMarket: "uae",
      effectiveLocale: "en",
      usedFallback: true,
      restriction: "No local case-study edition exists; public delivery is the configured UAE/en fallback.",
    })),
    unavailableRequests: "Only disabled or unconfigured markets/locales are unavailable; configured KSA, Türkiye, and Europe requests must not be reported as excluded.",
    approvedMediaPath: (record.fields.mediaPaths as string[])[0],
  }));
}

export function caseStudyRecords(): InventoryRecord[] {
  return seeds.map((seed, index) => {
    const slide = index + 1;
    const slug = slugify(seed.title);
    const visual = CASE_CINEMATIC_VISUALS[index];
    if (!visual) throw new Error(`Missing cinematic visual brief for case-study slide ${slide}.`);
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
         caption: visual.caption,
         altText: visual.altText,
         textEquivalent: visual.textEquivalent,
        template: seed.template,
          fixtureLabels: [visual.creativeBrief, "Human review", "Controlled outcome"],
      },
      mandate: seed.mandate,
      context: "Public-safe summary reconstructed from an approved internal source; identifying details have been removed.",
      constraints: ["Do not infer organization identity from this summary.", "The commissioned editorial artwork abstracts the workflow and contains no client interface or source-system data."],
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
          mediaPaths: [`/images/cognirise/cases/cinematic/${visual.filename}`],
       },
      review: {
         status: "approved",
         reasons: ["Source review approved: anonymization, public evidence, accessibility, and Cognirise fixture rights gates passed."],
      },
    };
  });
}