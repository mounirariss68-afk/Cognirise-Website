export type EvidenceKind = "Official source" | "Independent study" | "Company-reported" | "Vendor claim";

export type IndustryContent = {
  schemaVersion: 1;
  slug: string;
  legacyPath: string;
  name: string;
  shortName: string;
  thesis: string;
  accent: string;
  dek: string;
  image: string;
  imageAlt: string;
  variant: "ledger" | "network" | "journey" | "field" | "factory";
  pressures: { title: string; body: string }[];
  reversal: { title: string; body: string };
  myth: { claim: string; verdict: string };
  gcc: string;
  service: { label: string; href: string; firstMove: string };
  uses: { use: string; evidence: string; boundary: string }[];
  sources: { label: string; publisher: string; kind: EvidenceKind; url: string; accessedAt?: string }[];
  verificationDate: string;
  reviewDate: string;
  visibility: "public" | "hidden" | "restricted";
  order: number;
  relatedIds: string[];
};

export const INDUSTRIES: IndustryContent[] = [
  {
    schemaVersion: 1, slug: "financial-services", legacyPath: "/industries/banking", name: "Financial Services", shortName: "Finance",
    thesis: "The model estate—not the chatbot—is where trust is won.",
    accent: "trust is won.", dek: "Banks create durable value when intelligence enters governed decisions, evidence trails and human workflows—not when a conversational layer is mistaken for transformation.",
    image: "/images/cognirise/site-financial.jpg", imageAlt: "A precise financial mechanism crossed by a controlled luminous route.", variant: "ledger",
    pressures: [
      { title: "Validation before velocity", body: "Non-deterministic systems still have to meet established model-risk expectations: clear purpose, testing, monitoring and accountable challenge." },
      { title: "Concentration is an operating risk", body: "Dependence on a small set of cloud, data and model providers can amplify third-party and systemic exposure." },
      { title: "Sovereignty shapes the architecture", body: "In the Gulf, residency, explainability and bilingual customer disclosure belong in the design brief, not the launch checklist." },
    ],
    reversal: { title: "Automation can move work in the wrong direction.", body: "Publicly reported customer-service reversals at Klarna and Commonwealth Bank show why containment or headcount claims are not the same as sustained service quality." },
    myth: { claim: "“A chatbot proves the bank is AI-native.”", verdict: "No. The harder evidence sits in governed fraud, credit, onboarding, collections and operations—where decisions can be tested and traced." },
    gcc: "Regional ambition is high, but public, comparable evidence of realised AI value remains limited. The credible route is to publish controls and measured outcomes together.",
    service: { label: "Sovereign AI Solutions", href: "/what-we-do#sovereign-solutions", firstMove: "Map one exception-heavy, evidence-heavy decision." },
    uses: [
      { use: "Onboarding and KYC", evidence: "Measured process outcomes", boundary: "Human approval and complete evidence trail" },
      { use: "Fraud and credit models", evidence: "Established analytical practice", boundary: "Independent validation and drift monitoring" },
      { use: "Service assistance", evidence: "Mixed company reports", boundary: "Escalation quality, not deflection alone" },
    ],
    sources: [
      { label: "Model risk management guidance", publisher: "US Federal Reserve", kind: "Official source", url: "https://www.federalreserve.gov/frrs/guidance/supervisory-guidance-on-model-risk-management.htm" },
      { label: "AI adoption and financial stability", publisher: "Financial Stability Board", kind: "Official source", url: "https://www.fsb.org/uploads/P14112024.pdf" },
      { label: "Customer-service reversal", publisher: "ABC News", kind: "Independent study", url: "https://www.abc.net.au/news/2025-08-21/cba-backtracks-on-ai-job-cuts-as-chatbot-lifts-call-volumes/105679492/" },
    ],
    verificationDate: "2026-09-06", reviewDate: "2027-03-06", visibility: "public", order: 1, relatedIds: [],
  },
  {
    schemaVersion: 1, slug: "telecoms", legacyPath: "/industries/telecoms", name: "Telecoms", shortName: "Telecoms",
    thesis: "Autonomy is earned one closed loop at a time.", accent: "closed loop", dek: "Network intelligence matters when it can observe, decide and act inside a bounded domain—with service impact, energy use and human override visible.",
    image: "/images/cognirise/site-infrastructure.jpg", imageAlt: "Connected infrastructure carrying a luminous signal across an operating landscape.", variant: "network",
    pressures: [
      { title: "Fragmented operating context", body: "Alarms, customer state and commercial systems rarely present one reliable version of an incident." },
      { title: "Autonomy has levels", body: "A certified domain or use case is not an autonomous network. Scope and intervention boundaries must remain explicit." },
      { title: "AI infrastructure has economics", body: "GPU capacity, orchestration and energy demand need a business case beyond the promise of a new service category." },
    ],
    reversal: { title: "Containment is not customer resolution.", body: "Public frustration with automated support shows why call avoidance cannot be reported as value without resolution quality and repeat-contact measures." },
    myth: { claim: "“Level 4 means the whole network runs itself.”", verdict: "No. Industry certifications apply to defined scenarios and domains; broad autonomy remains an operating programme, not a switch." },
    gcc: "Gulf operators combine sovereign-cloud investment, national AI programmes and advanced mobile infrastructure. Data residency and operating ownership remain the binding constraints.",
    service: { label: "AI Platforms", href: "/what-we-do#ai-platforms", firstMove: "Close one high-volume incident or service loop." },
    uses: [
      { use: "Incident triage", evidence: "Company-reported operational results", boundary: "Named domain and human override" },
      { use: "Agent assistance", evidence: "Company and vendor metrics", boundary: "Resolution and repeat-contact measures" },
      { use: "Energy optimisation", evidence: "Controlled trials", boundary: "Network quality guardrails" },
    ],
    sources: [
      { label: "Autonomous-network certification", publisher: "Ericsson / TM Forum", kind: "Company-reported", url: "https://www.ericsson.com/en/news/2025/6/tdc-net-and-ericsson-achieves-industry-first-certification-from-tm-forum-of-level-4-autonomy" },
      { label: "5G energy-efficiency trial", publisher: "Ericsson and Vodafone UK", kind: "Vendor claim", url: "https://www.ericsson.com/en/press-releases/3/2025/vodafone-uk-and-ericsson-trial-ai-solutions-for-improved-5g-energy-efficiency" },
      { label: "Customer-service operating result", publisher: "Virgin Media O2", kind: "Company-reported", url: "https://news.virginmediao2.co.uk/ai-helps-virgin-media-o2-avoid-over-one-million-call-transfers-as-it-saves-customers-more-than-400000-hours-of-time-on-the-phone/" },
    ],
    verificationDate: "2026-09-06", reviewDate: "2027-03-06", visibility: "public", order: 2, relatedIds: [],
  },
  {
    schemaVersion: 1, slug: "travel-hospitality", legacyPath: "/industries/travel", name: "Travel & Hospitality", shortName: "Travel",
    thesis: "The real test arrives when the journey breaks.", accent: "journey breaks.", dek: "Personalisation is visible. Recovery is valuable. The decisive capability is coordinated action across inventory, policy, customer context and frontline judgment when plans change.",
    image: "/images/cognirise/pulse-convergence.jpg", imageAlt: "Multiple illuminated routes converging through a cinematic transport environment.", variant: "journey",
    pressures: [
      { title: "Disruption compresses time", body: "A useful system must assemble options and constraints while a traveller is still waiting—not in a report after the event." },
      { title: "Inventory remains fragmented", body: "Air, hotel, loyalty and partner systems limit what can be promised and fulfilled in one interaction." },
      { title: "Hospitality depends on judgment", body: "Automation should increase the frontline team’s room to act, not remove the human recovery moment." },
    ],
    reversal: { title: "A seamless demo can conceal a broken hand-off.", body: "When automated advice cannot change a booking, honour policy or transfer context, it adds another queue rather than removing one." },
    myth: { claim: "“Hyper-personalisation is the main prize.”", verdict: "Not during disruption. Reliable recovery, operational coordination and a clear human hand-off protect more trust." },
    gcc: "Rapid aviation and tourism growth raises the value of multilingual service and integrated operations—but targets should not be presented as realised outcomes.",
    service: { label: "Consulting & Engineering with AI", href: "/what-we-do#consulting-engineering", firstMove: "Trace one disruption from signal to resolved journey." },
    uses: [
      { use: "Disruption recovery", evidence: "Operational use cases", boundary: "Policy-aware options and accountable approval" },
      { use: "Frontline assistance", evidence: "Company-reported pilots", boundary: "Context transfer and staff discretion" },
      { use: "Demand and operations", evidence: "Established forecasting practice", boundary: "Volatility and override monitoring" },
    ],
    sources: [
      { label: "Aviation passenger-rights framework", publisher: "US Department of Transportation", kind: "Official source", url: "https://www.transportation.gov/airconsumer" },
      { label: "Airline digital operations research", publisher: "IATA", kind: "Official source", url: "https://www.iata.org/en/programs/airline-distribution/retailing/" },
      { label: "Tourism measurement and outlook", publisher: "UN Tourism", kind: "Official source", url: "https://www.unwto.org/tourism-data/global-and-regional-tourism-performance" },
    ],
    verificationDate: "2026-09-06", reviewDate: "2027-03-06", visibility: "public", order: 3, relatedIds: [],
  },
  {
    schemaVersion: 1, slug: "energy-resources", legacyPath: "/industries/energy", name: "Energy & Resources", shortName: "Energy",
    thesis: "In physical operations, confidence needs a field address.", accent: "field address.", dek: "A prediction has no operating value until the right team can connect it to asset history, safety boundaries, work orders and available parts.",
    image: "/images/cognirise/pulse-breakthrough.jpg", imageAlt: "A luminous route moving through a vast industrial landscape at dusk.", variant: "field",
    pressures: [
      { title: "Context is physically distributed", body: "Engineering records, telemetry, inspection evidence and field knowledge live at different speeds and in different systems." },
      { title: "Safety limits the action space", body: "Recommendations must respect permits, operating envelopes and accountable human authority." },
      { title: "Prediction is not execution", body: "A failure signal creates value only when maintenance capacity, parts and production plans can respond." },
    ],
    reversal: { title: "Predictive maintenance can generate a new backlog.", body: "More alerts without precision, workflow integration and parts readiness can increase inspection work while leaving downtime unchanged." },
    myth: { claim: "“A digital twin is a finished product.”", verdict: "No. Its value depends on scope, fidelity, update discipline and the decisions it is authorised to support." },
    gcc: "The region contains world-scale assets and recognised digital operations. External awards and operator claims are useful signals, not substitutes for site-level outcome evidence.",
    service: { label: "Data & AI Foundations", href: "/what-we-do/data-ai-foundations", firstMove: "Connect one critical asset signal to a safe work decision." },
    uses: [
      { use: "Asset knowledge", evidence: "Operational deployments", boundary: "Versioned engineering authority" },
      { use: "Maintenance prediction", evidence: "Measured site-level outcomes", boundary: "False-positive cost and work-order capacity" },
      { use: "Safety assistance", evidence: "Early deployments", boundary: "No autonomous safety-critical approval" },
    ],
    sources: [
      { label: "Global Lighthouse recognition", publisher: "World Economic Forum / Aramco", kind: "Company-reported", url: "https://www.aramco.com/en/news-media/news/2025/fifth-aramco-facility-receives-world-economic-forum-global-lighthouse-network-status" },
      { label: "AI and energy outlook", publisher: "International Energy Agency", kind: "Official source", url: "https://www.iea.org/reports/energy-and-ai" },
      { label: "Predictive maintenance at scale", publisher: "McKinsey", kind: "Independent study", url: "https://www.mckinsey.com/capabilities/operations/our-insights/prediction-at-scale-how-industry-can-get-more-value-out-of-maintenance" },
    ],
    verificationDate: "2026-09-06", reviewDate: "2027-03-06", visibility: "public", order: 4, relatedIds: [],
  },
  {
    schemaVersion: 1, slug: "manufacturing", legacyPath: "/industries/manufacturing", name: "Manufacturing", shortName: "Manufacturing",
    thesis: "The factory is a system of constraints, not a collection of demos.", accent: "system of constraints", dek: "Industrial intelligence earns its place by improving a bounded production decision across quality, maintenance, planning and workforce safety—without pretending the dark factory has arrived.",
    image: "/images/cognirise/cognirise-pulse-outcomes.jpg", imageAlt: "A cinematic advanced manufacturing environment with people and luminous production signals.", variant: "factory",
    pressures: [
      { title: "Brownfield reality", body: "Plants combine equipment generations, control systems and data quality that cannot be normalised by presentation layer alone." },
      { title: "False positives carry cost", body: "Vision and predictive systems must be assessed against rework, inspection load and line interruption—not model accuracy alone." },
      { title: "Adoption happens on the floor", body: "Operators and engineers need traceable assistance inside established work, with safe fallback when the system is uncertain." },
    ],
    reversal: { title: "Automation plans meet labour and reliability limits.", body: "High-profile humanoid and lights-out ambitions remain bounded by deployment readiness, worker agreements and the economics of variable production." },
    myth: { claim: "“The dark factory is the destination.”", verdict: "Not for most operations. The stronger near-term case is a more capable workforce operating better-instrumented, safer and more adaptive lines." },
    gcc: "Lighthouse sites and Industry 4.0 programmes show regional momentum. Their recognition is evidence of capability at named facilities—not proof that every plant shares the same maturity.",
    service: { label: "Engineering with AI", href: "/what-we-do/engineering-with-ai", firstMove: "Instrument one quality or flow constraint end to end." },
    uses: [
      { use: "Quality inspection", evidence: "Company-reported deployments", boundary: "False-positive and escape-rate monitoring" },
      { use: "Maintenance planning", evidence: "Measured industrial practice", boundary: "Integrated parts and work-order response" },
      { use: "Industrial copilots", evidence: "Vendor and customer reports", boundary: "Approved instructions and operator authority" },
    ],
    sources: [
      { label: "UAE Industry 4.0 programme", publisher: "UAE Ministry of Industry and Advanced Technology", kind: "Official source", url: "https://moiat.gov.ae/en/programs/uae-industry-4-backup" },
      { label: "Industrial copilot adoption", publisher: "Siemens / thyssenkrupp", kind: "Vendor claim", url: "https://press.siemens.com/global/en/pressrelease/siemens-industrial-copilot-expanded-adopted-thyssenkrupp" },
      { label: "AI quality inspection expansion", publisher: "GE Aerospace", kind: "Company-reported", url: "https://www.geaerospace.com/news/press-releases/ge-aerospace-expanding-application-ai-blade-inspections-cfm-leap-and-ge9x-engines" },
    ],
    verificationDate: "2026-09-06", reviewDate: "2027-03-06", visibility: "public", order: 5, relatedIds: [],
  },
];

export const industryByLegacyPath = Object.fromEntries(INDUSTRIES.map((industry) => [industry.legacyPath, industry]));