export type EvidenceKind = "Official source" | "Independent study" | "Company-reported" | "Vendor claim";
export type IndustryMarket = "uae" | "ksa" | "turkiye" | "europe";
// Compatibility re-export for page modules. The shared contract is the
// authority used by the public renderer and the admin inspector.
export {
  INDUSTRY_SECTION_IDS,
  INDUSTRY_SECTION_OUTLINE,
  type IndustrySectionId,
} from "@workspace/api-zod";

export type IndustryContent = {
  schemaVersion: 1;
  slug: string;
  legacyPath: string;
  name: string;
  shortName: string;
  thesis: string;
  accent: string;
  dek: string;
  opportunity: string;
  capabilities: { title: string; body: string }[];
  selectedWork: { description: string };
  image: string;
  imageAlt: string;
  variant: "ledger" | "network" | "journey" | "field" | "factory";
  pressures: { title: string; body: string }[];
  reversal: { title: string; body: string };
  myth: { claim: string; verdict: string };
  gcc: string;
  service: { label: string; href: string; firstMove: string };
  uses: {
    use: string;
    description?: string;
    evidence: string;
    boundary: string;
    sourceUrls?: string[];
  }[];
  sources: {
    label: string;
    publisher: string;
    kind: EvidenceKind;
    url: string;
    accessedAt?: string;
    market?: IndustryMarket;
    supports?: string;
    limitation?: string;
  }[];
  educationPov?: {
    version?: 2;
    imagery?: {
      educatorPractice: {
        src: string;
        altText: string;
        media?: { mediaId: string; mediaVersionId: string; role: "identity" | "logo" | "hero" | "supporting" | "background" | "icon" | "og-image" | "document"; altText?: string };
      };
      researchCoordination: {
        src: string;
        altText: string;
        media?: { mediaId: string; mediaVersionId: string; role: "identity" | "logo" | "hero" | "supporting" | "background" | "icon" | "og-image" | "document"; altText?: string };
      };
    };
    introduction?: string;
    strategicShift?: string;
    patternQuote?: string;
    globalDirection?: string;
    convictions: { title: string; body: string; market?: IndustryMarket }[];
    valueDomains: { title: string; body: string; examples: string[] }[];
    applications?: { title: string; items: { title: string; body: string; sourceUrls: string[]; market?: IndustryMarket }[] }[];
    signals: { institution: string; signal: string; implication: string; sourceUrls: string[]; market?: IndustryMarket }[];
    targetState: { title: string; body: string }[];
    roadmap: { horizon: string; title: string; body: string }[];
    leadershipTest: string;
  };
  bankingPov?: import("@workspace/api-zod").BankingPov;
  publicSectorPov?: import("@workspace/api-zod").PublicSectorPov;
  verificationDate: string;
  reviewDate: string;
  visibility: "public" | "hidden" | "restricted";
  order: number;
  relatedIds: string[];
};

export const INDUSTRIES: IndustryContent[] = [
  {
    schemaVersion: 1, slug: "financial-services", legacyPath: "/industries/banking", name: "Financial Services", shortName: "Finance",
    thesis: "Trust in AI comes from how it is governed and operated—not how well its chatbot performs.",
    accent: "trust is won.", dek: "Banks create durable value when intelligence enters governed decisions, evidence trails and human workflows—not when a conversational layer is mistaken for transformation.",
    opportunity: "Turn fragmented controls and exception-heavy operations into faster, traceable decisions that improve customer outcomes without weakening model-risk discipline.",
    capabilities: [
      { title: "Governed decision agents", body: "Build bounded agents for onboarding, fraud and operations with approvals, explanations and complete evidence trails." },
      { title: "Sovereign intelligence platforms", body: "Connect models and data inside residency, security and third-party-risk boundaries." },
      { title: "AI-native operating redesign", body: "Rework priority journeys around measurable value, human authority and production controls." },
    ],
    selectedWork: { description: "Selected work should show the mandate, control boundary and measured operational outcome without exposing client-confidential decisions or data." },
    image: "/images/cognirise/industries/pulse-industry-financial-services.png", imageAlt: "Transparent custody chambers and luminous governed transaction paths converging through a financial operations landscape.", variant: "ledger",
    pressures: [
      { title: "Validation before velocity", body: "Non-deterministic systems still have to meet established model-risk expectations: clear purpose, testing, monitoring and accountable challenge." },
      { title: "Concentration is an operating risk", body: "Dependence on a small set of cloud, data and model providers can amplify third-party and systemic exposure." },
      { title: "Sovereignty shapes the architecture", body: "In the Gulf, residency, explainability and bilingual customer disclosure belong in the design brief, not the launch checklist." },
    ],
    reversal: { title: "Automation can move work in the wrong direction.", body: "Publicly reported customer-service reversals at Klarna and Commonwealth Bank show why containment or headcount claims are not the same as sustained service quality." },
    myth: { claim: "“A chatbot proves the bank is AI-native.”", verdict: "No. The harder evidence sits in governed fraud, credit, onboarding, collections and operations—where decisions can be tested and traced." },
    gcc: "Regional ambition is high, but public, comparable evidence of realised AI value remains limited. The credible route is to publish controls and measured outcomes together.",
    service: { label: "Sovereign AI Solutions", href: "/#service-lines", firstMove: "Map one exception-heavy, evidence-heavy decision." },
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
    opportunity: "Convert network and service signals into bounded action, reducing resolution time and energy cost while keeping operating ownership visible.",
    capabilities: [
      { title: "Agentic network operations", body: "Build observe-decide-act loops for named incident, assurance and optimisation domains." },
      { title: "Service intelligence", body: "Equip teams with connected customer, network and policy context for higher-quality resolution." },
      { title: "Sovereign AI infrastructure", body: "Design model, data and orchestration layers around residency, resilience and unit economics." },
    ],
    selectedWork: { description: "Selected work should identify the operating domain, autonomy level, intervention boundary and service or efficiency result." },
    image: "/images/cognirise/industries/pulse-industry-telecoms-network.png", imageAlt: "Distributed communications nodes linked by luminous signals across a wide network landscape.", variant: "network",
    pressures: [
      { title: "Fragmented operating context", body: "Alarms, customer state and commercial systems rarely present one reliable version of an incident." },
      { title: "Autonomy has levels", body: "A certified domain or use case is not an autonomous network. Scope and intervention boundaries must remain explicit." },
      { title: "AI infrastructure has economics", body: "GPU capacity, orchestration and energy demand need a business case beyond the promise of a new service category." },
    ],
    reversal: { title: "Containment is not customer resolution.", body: "Public frustration with automated support shows why call avoidance cannot be reported as value without resolution quality and repeat-contact measures." },
    myth: { claim: "“Level 4 means the whole network runs itself.”", verdict: "No. Industry certifications apply to defined scenarios and domains; broad autonomy remains an operating programme, not a switch." },
    gcc: "Gulf operators combine sovereign-cloud investment, national AI programmes and advanced mobile infrastructure. Data residency and operating ownership remain the binding constraints.",
    service: { label: "AI Platforms", href: "/#service-lines", firstMove: "Close one high-volume incident or service loop." },
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
    opportunity: "Protect revenue and loyalty by coordinating recovery while a traveller is still waiting, not after fragmented hand-offs have compounded the disruption.",
    capabilities: [
      { title: "Disruption recovery agents", body: "Build policy-aware agents that assemble viable options across inventory, partners and customer context." },
      { title: "Frontline decision support", body: "Give teams useful context, recommended actions and a clear path to exercise judgment." },
      { title: "AI-native journey engineering", body: "Redesign disrupted journeys end to end and instrument resolution, cost and trust outcomes." },
    ],
    selectedWork: { description: "Selected work should describe the disrupted journey, systems coordinated, human hand-off and evidenced recovery outcome." },
    image: "/images/cognirise/industries/pulse-industry-travel-hospitality.png", imageAlt: "Luminous passenger routes rerouting through a layered terminal as an aircraft departs in the distance.", variant: "journey",
    pressures: [
      { title: "Disruption compresses time", body: "A useful system must assemble options and constraints while a traveller is still waiting—not in a report after the event." },
      { title: "Inventory remains fragmented", body: "Air, hotel, loyalty and partner systems limit what can be promised and fulfilled in one interaction." },
      { title: "Hospitality depends on judgment", body: "Automation should increase the frontline team’s room to act, not remove the human recovery moment." },
    ],
    reversal: { title: "A seamless demo can conceal a broken hand-off.", body: "When automated advice cannot change a booking, honour policy or transfer context, it adds another queue rather than removing one." },
    myth: { claim: "“Hyper-personalisation is the main prize.”", verdict: "Not during disruption. Reliable recovery, operational coordination and a clear human hand-off protect more trust." },
    gcc: "Rapid aviation and tourism growth raises the value of multilingual service and integrated operations—but targets should not be presented as realised outcomes.",
    service: { label: "Consulting & Engineering with AI", href: "/#service-lines", firstMove: "Trace one disruption from signal to resolved journey." },
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
    opportunity: "Translate asset intelligence into safer, better-timed field decisions that reduce avoidable downtime and inspection effort.",
    capabilities: [
      { title: "Industrial knowledge agents", body: "Connect engineering authority, asset history and field evidence for faster diagnosis and planning." },
      { title: "Decision-to-work orchestration", body: "Link predictions to safe work orders, parts, capacity and production constraints." },
      { title: "Responsible industrial AI", body: "Engineer monitoring, permits, operating envelopes and accountable approval into delivery." },
    ],
    selectedWork: { description: "Selected work should name the asset scope, safety boundary, workflow integration and verified site-level result." },
    image: "/images/cognirise/industries/pulse-industry-energy-resources.png", imageAlt: "Luminous operational signals moving through geological layers and field infrastructure toward a controlled intervention.", variant: "field",
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
    schemaVersion: 1, slug: "public-sector", legacyPath: "/industries/manufacturing", name: "Public Sector", shortName: "Public Sector",
    thesis: "Public value is earned at the point of service.", accent: "point of service.", dek: "Public institutions create durable value when intelligence makes services clearer, faster and more accountable—without weakening accessibility, privacy, due process or human authority.",
    opportunity: "Make high-friction services easier to complete and operate while strengthening sovereignty, accessibility and public accountability.",
    capabilities: [
      { title: "Sovereign service platforms", body: "Build bilingual intelligence services within defined identity, residency, access and retention boundaries." },
      { title: "Governed casework agents", body: "Support intake, triage and decisions with explanations, contestability and named human authority." },
      { title: "Public-service engineering", body: "Redesign journeys from policy intent to resolved case and measure outcomes across channels." },
    ],
    selectedWork: { description: "Selected work should state the public-value objective, affected service, governance controls and accessible outcome evidence." },
    image: "/images/cognirise/industries/pulse-industry-public-sector-civic-review-v1.png", imageAlt: "A light-filled civic atrium where a public service review is connected by purposeful violet and coral routes.", variant: "ledger",
    pressures: [
      { title: "Legitimacy before velocity", body: "Decisions that affect people need named authority, traceable evidence, clear explanations and a practical route to human review." },
      { title: "Accessibility is part of the system", body: "A digital service succeeds only when people across languages, abilities and levels of digital confidence can complete the journey." },
      { title: "Data boundaries shape trust", body: "Identity, eligibility and case information require explicit purpose, controlled access and retention rules before models enter the workflow." },
    ],
    reversal: { title: "Automating a broken service can harden the friction.", body: "Faster classification or response generation creates little public value when fragmented policy, unclear ownership and inaccessible hand-offs remain unchanged." },
    myth: { claim: "“A public chatbot proves digital government is intelligent.”", verdict: "No. The stronger evidence is a governed end-to-end service where outcomes, exceptions and human accountability can be measured and challenged." },
    gcc: "Gulf governments combine ambitious digital-service programmes with high expectations for sovereign infrastructure and bilingual access. Credible progress connects that ambition to transparent controls and service-level evidence.",
    service: { label: "Sovereign & Regulated AI", href: "/what-we-do/sovereign-regulated-ai", firstMove: "Map one high-friction public journey from policy intent to resolved case." },
    uses: [
      { use: "Case intake and triage", evidence: "Established digital-service practice", boundary: "Accessible channels, documented criteria and human escalation" },
      { use: "Decision support", evidence: "Guidance-led emerging practice", boundary: "Named authority, explanation and contestability" },
      { use: "Service operations", evidence: "Measured operational deployments", boundary: "Outcome, equity and repeat-contact monitoring" },
    ],
    sources: [
      { label: "UAE Strategy for Artificial Intelligence", publisher: "UAE Government", kind: "Official source", url: "https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/government-services-and-digital-transformation/uae-strategy-for-artificial-intelligence" },
      { label: "OECD AI Principles", publisher: "OECD", kind: "Official source", url: "https://oecd.ai/en/ai-principles" },
      { label: "AI Risk Management Framework", publisher: "US National Institute of Standards and Technology", kind: "Official source", url: "https://www.nist.gov/itl/ai-risk-management-framework" },
    ],
    verificationDate: "2026-09-07", reviewDate: "2027-03-07", visibility: "public", order: 5, relatedIds: [],
  },
  {
    schemaVersion: 1, slug: "education", legacyPath: "/industries/education", name: "Education", shortName: "Education",
    thesis: "Build the institution-wide AI operating system.", accent: "institution-wide", dek: "Move from isolated tools to coordinated, responsible transformation across K–12 and higher education—improving learning, strengthening educators and researchers, and redesigning services around human purpose.",
    opportunity: "Help schools, universities, school networks and education authorities turn experimentation into measurable learning, research and service outcomes through shared capability and accountable human ownership.",
    capabilities: [
      { title: "Mission and portfolio", body: "Select use cases against learning, research, student outcomes, institutional value and public purpose; stop low-value experiments early." },
      { title: "Learning, curriculum and assessment", body: "Ground assistance in approved standards and content, vary access by age and redesign assessment around reasoning and authentic performance." },
      { title: "Educator, researcher and leader agency", body: "Keep recommendations reviewable and reserve high-impact academic, safeguarding, placement and disciplinary decisions for accountable professionals." },
      { title: "Governance, safeguarding and assurance", body: "Define risk tiers, privacy, security, intellectual property, integrity, accessibility, human review and incident response." },
      { title: "Agent platform, data and integration", body: "Provide secure identities, governed knowledge, minimum necessary data, approved actions, interoperability, audit trails and model choice." },
      { title: "People and change", body: "Build role-based capability for learners, families, educators, researchers, staff, leaders, policymakers and governing boards." },
      { title: "Evidence and scale", body: "Measure learning, research speed, workload, service quality, equity, cost, safety and trust; scale only where evidence warrants it." },
    ],
    selectedWork: { description: "Cognirise brings consulting, engineering, data, platform and change capabilities together to redesign a complete school, university or authority journey and establish the shared layer that lets evidence-backed practices scale." },
    image: "/images/cognirise/industries/pulse-industry-education-campus-v4.png", imageAlt: "A sunlit education campus atrium connects library shelves, learning stairs and glazed science rooms through purposeful violet Pulse routes.", variant: "network",
    pressures: [
      { title: "The operating system is shared capability", body: "Trusted data, secure platforms, integration, policy, evaluation, workforce capability and human oversight—not one software product—coordinate responsible use." },
      { title: "School autonomy must stay tightly bounded", body: "K–12 access and interfaces must be age-appropriate, safeguarded and controlled by accountable educators." },
      { title: "Higher-education action must be permissioned", body: "Agents may support approved, reviewable workflows, while researchers and professionals remain accountable for consequential actions." },
    ],
    reversal: { title: "Move the unit of innovation from the tool to the journey.", body: "Redesign the complete learner, educator, researcher, family or employee journey and measure educational, research, service, equity and trust outcomes—not usage." },
    myth: { claim: "“The education system with the most pilots will lead.”", verdict: "Leadership comes from turning experimentation into educationally grounded, securely enabled, transparently governed and measurable capability." },
    gcc: "The UAE can connect national AI ambition with age-appropriate curriculum, educator capability and institutional redesign. The opportunity is stronger learning and public value—not technology adoption for its own sake.",
    service: { label: "Consulting & Engineering with AI", href: "/what-we-do#consulting-engineering", firstMove: "Identify and redesign one measurable education journey." },
    uses: [
      { use: "School learning and teacher planning", evidence: "Curriculum-grounded practice, lesson design and formative support", boundary: "Age-appropriate access, educator control and safeguarding" },
      { use: "Higher-education learning and research", evidence: "Course-grounded tutoring, authentic assessment and researcher-led workflows", boundary: "Permissioned actions and expert accountability" },
      { use: "Learner, family and institutional services", evidence: "Advising, attendance, family communication, registration and operations", boundary: "No independent disciplinary, placement, welfare or other high-impact decisions" },
    ],
    sources: [
      { label: "OECD Digital Education Outlook 2026", publisher: "OECD", kind: "Official source", url: "https://www.oecd.org/en/publications/oecd-digital-education-outlook-2026_062a7394-en.html" },
      { label: "AI Revolution in Education", publisher: "World Bank", kind: "Official source", url: "https://openknowledge.worldbank.org/bitstreams/f059007e-b630-4f78-8535-0f52c95a117d/download" },
      { label: "Future of Jobs Report 2025", publisher: "World Economic Forum", kind: "Official source", url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/" },
      { label: "Artificial Intelligence in Education", publisher: "Singapore Ministry of Education", kind: "Official source", url: "https://www.moe.gov.sg/education-in-sg/educational-technology-journey/edtech-masterplan/artificial-intelligence-in-education" },
      { label: "Aila AI Lesson Assistant", publisher: "UK Government AI Knowledge Hub", kind: "Official source", url: "https://ai.gov.uk/knowledge-hub/tools/aila%3A-ai-lesson-assistant/" },
      { label: "Course-specific physics tutor study", publisher: "Scientific Reports", kind: "Independent study", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260" },
      { label: "AI for Teaching and Learning 2026", publisher: "Yale University", kind: "Official source", url: "https://ai.yale.edu/ai-for-teaching-and-learning-2026" },
      { label: "Scientist-trained data-agent programme", publisher: "Caltech", kind: "Company-reported", url: "https://giving.caltech.edu/news/Point72-Gift-Funds-AI-Research-Program-at-Caltech" },
      { label: "AI and Education", publisher: "MIT", kind: "Official source", url: "https://aiandeducation.mit.edu/" },
      { label: "AI Meets Education at Stanford", publisher: "Stanford University", kind: "Official source", url: "https://aimes.stanford.edu/" },
      { label: "Advancing Responsible AI", publisher: "University of California", kind: "Official source", url: "https://ai.universityofcalifornia.edu/" },
      { label: "Australian Framework for Generative AI in Schools", publisher: "Australian Government Department of Education", kind: "Official source", url: "https://www.education.gov.au/schooling/resources/australian-framework-generative-artificial-intelligence-ai-schools" },
      { label: "UAE Strategy for Artificial Intelligence 2031", publisher: "UAE Artificial Intelligence Office", kind: "Official source", url: "https://ai.gov.ae/strategy/", market: "uae" },
      { label: "UAE National AI Curriculum Framework", publisher: "UAE Ministry of Education", kind: "Official source", url: "https://www.moe.gov.ae/ar/about-us/Projects-and-Initiatives/Pages/ai-literacy-curriculum-framework.aspx", market: "uae" },
      { label: "NOVA institutional transformation project", publisher: "UAE Ministry of Education", kind: "Official source", url: "https://www.moe.gov.ae/en/mediacenter/news/pages/Ministry-of-Education-launches-NOVA-project-to-advance-comprehensive-AI-driven-institutional-transformation-in-line-with-UA.aspx", market: "uae" },
      { label: "National AI Upskilling Programme for Teachers", publisher: "UAE Ministry of Education and HBMSU", kind: "Official source", url: "https://www.moe.gov.ae/en/mediacenter/news/Pages/MOE-and-HBMSU-launch-the-National-AI-Upskilling-Programme-for-Teachers.aspx", market: "uae" },
    ],
    educationPov: {
      version: 2,
      introduction: "AI is already changing how learners learn, educators teach, researchers discover and institutions operate. Schools, universities, school networks and education authorities now need to shape that change around learning, human development and public trust. An institution-wide AI operating system is not a single product: it is the shared layer of trusted data, secure platforms, integration, policy, evaluation, capability and human oversight through which AI-enabled work is coordinated. In K–12, access and autonomy must be age-appropriate, safeguarded and educator-controlled. In higher education, specialised agents can act only within approved, reviewable workflows.",
      strategicShift: "Move the unit of innovation from the individual chatbot or copilot to the complete learner, educator, researcher, family or employee journey—and measure educational, research, service, equity and trust outcomes rather than usage.",
      patternQuote: "The repeatable pattern is purposeful specialisation plus governance: approved content, defined users, age-appropriate design, educator or expert oversight, protected data, equitable access and outcomes that can be evaluated.",
      globalDirection: "The OECD distinguishes AI-assisted performance from durable learning and calls for purposeful pedagogical use. The World Bank connects effective adoption with educational purpose, educator capability, equity, infrastructure and evaluation. The World Economic Forum pairs growing demand for AI and data skills with continuing demand for analytical thinking, creativity and adaptability. Together, these signals support AI literacy across ages and disciplines alongside strong human capabilities.",
      convictions: [
        { title: "Educational purpose leads technology", body: "Use AI to strengthen durable learning, reasoning, creativity and human development—not merely to complete tasks faster." },
        { title: "Augment educators and researchers", body: "Extend professional expertise, reduce low-value workload and preserve accountable human ownership." },
        { title: "Transform the institution, not isolated tasks", body: "Connect trusted data, redesigned workflows, secure access, governance and capability building to produce sustainable outcomes." },
        { title: "Build in safeguarding, integrity and equity", body: "Make age appropriateness, privacy, bias, accessibility, academic standards, contestability, evaluation and escalation explicit." },
        { title: "Turn UAE ambition into responsible adoption", body: "Connect curriculum, educator capability, institutional transformation and national strategy to measurable learning and public value.", market: "uae" },
      ],
      valueDomains: [
        { title: "Learning, Teaching and Assessment", body: "Ground assistance in curriculum and course intent. In schools, vary access by developmental stage, promote productive struggle and alert educators when intervention is needed. In universities, support authentic problem-solving, oral defence, applied work, reflection and evidence of process.", examples: [] },
        { title: "Educator Capability and Professional Practice", body: "Help teachers and faculty turn approved standards and materials into lesson sequences, differentiated activities, rubrics, simulations and feedback. Keep every recommendation reviewable and editable, with educators accountable for pedagogy, assessment and learner welfare.", examples: [] },
        { title: "Research and Discovery", body: "In higher education, support literature discovery, coding, analysis, modelling, experiment design and dissemination. Keep consequential actions permissioned, logged and reviewable, with researchers accountable for sources, methods, authorship, confidential data and reproducibility.", examples: [] },
        { title: "Learner Support, Family Engagement and Operations", body: "Augment admissions, advising, attendance follow-up, registration, careers, family communication, scheduling and administration. Systems may explain options and arrange support, but must not independently make disciplinary, placement, welfare or other high-impact decisions.", examples: [] },
        { title: "Institutional Transformation", body: "At school-network, university and authority level, connect policy, people, process, data and technology through shared standards, unified workflows, proactive services and evidence-led decisions rather than digitising fragmented practices.", examples: [] },
      ],
      applications: [
        {
          title: "K–12 and system applications",
          items: [
            { title: "Singapore · Purposeful learning", body: "The national Student Learning Space uses AI-enabled features to support purposeful, self-directed and collaborative learning while retaining the importance of human interaction and teacher judgment.", sourceUrls: ["https://www.moe.gov.sg/education-in-sg/educational-technology-journey/edtech-masterplan/artificial-intelligence-in-education"] },
            { title: "United Kingdom · Teacher planning", body: "Aila helps teachers iteratively create and adapt lesson plans grounded in quality-assured national curriculum resources, with the teacher retaining oversight.", sourceUrls: ["https://ai.gov.uk/knowledge-hub/tools/aila%3A-ai-lesson-assistant/"] },
            { title: "UAE · Curriculum and educator capability", body: "National curriculum and teacher-development initiatives connect age-spanning AI literacy with confident, responsible classroom practice.", sourceUrls: ["https://www.moe.gov.ae/ar/about-us/Projects-and-Initiatives/Pages/ai-literacy-curriculum-framework.aspx", "https://www.moe.gov.ae/en/mediacenter/news/Pages/MOE-and-HBMSU-launch-the-National-AI-Upskilling-Programme-for-Teachers.aspx"], market: "uae" },
          ],
        },
        {
          title: "Higher education and research",
          items: [
            { title: "Harvard · Course-specific tutoring", body: "A randomised undergraduate physics study tested an instructor-designed tutor that provided scaffolded, self-paced practice. Its narrow setting supports careful evaluation, not a general performance promise.", sourceUrls: ["https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260"] },
            { title: "Yale · Discipline-specific assistance", body: "Course-grounded tutors, simulations, language feedback and assessment redesign show how assistance can follow faculty intent and disciplinary context.", sourceUrls: ["https://ai.yale.edu/ai-for-teaching-and-learning-2026"] },
            { title: "Caltech · Researcher-led workflows", body: "Caltech reports researchers teaching domain expertise to data agents through examples and explanation, illustrating expert-directed and interpretable scientific workflows without carrying forward an unverified performance figure.", sourceUrls: ["https://giving.caltech.edu/news/Point72-Gift-Funds-AI-Research-Program-at-Caltech"] },
            { title: "MIT · Education and discovery", body: "MIT programmes treat AI as a cross-disciplinary question for learning, teaching and research rather than a standalone computing topic.", sourceUrls: ["https://aiandeducation.mit.edu/"] },
          ],
        },
        {
          title: "Governance and capability at scale",
          items: [
            { title: "Australia and Singapore · National guardrails", body: "National approaches translate wellbeing, transparency, fairness, accountability, privacy, security and age-appropriate use into guidance for schools.", sourceUrls: ["https://www.education.gov.au/schooling/resources/australian-framework-generative-artificial-intelligence-ai-schools", "https://www.moe.gov.sg/education-in-sg/educational-technology-journey/edtech-masterplan/artificial-intelligence-in-education"] },
            { title: "Stanford and University of California · Coordinated experimentation", body: "Institutional programmes combine capability building, shared principles, risk processes and transparency to make experimentation safer and more coherent.", sourceUrls: ["https://aimes.stanford.edu/", "https://ai.universityofcalifornia.edu/"] },
            { title: "UAE · Institution-wide transformation", body: "The Ministry of Education’s NOVA initiative links AI adoption with process redesign, data use, service quality and measurable institutional outcomes.", sourceUrls: ["https://www.moe.gov.ae/en/mediacenter/news/pages/Ministry-of-Education-launches-NOVA-project-to-advance-comprehensive-AI-driven-institutional-transformation-in-line-with-UA.aspx"], market: "uae" },
          ],
        },
      ],
      signals: [
        { institution: "OECD and World Bank", signal: "Learning purpose, capability and equity", implication: "Evaluate durable learning and human capability—not productivity alone.", sourceUrls: ["https://www.oecd.org/en/publications/oecd-digital-education-outlook-2026_062a7394-en.html", "https://openknowledge.worldbank.org/bitstreams/f059007e-b630-4f78-8535-0f52c95a117d/download"] },
        { institution: "Australia and Singapore", signal: "National guardrails and age-appropriate use", implication: "Translate safety, wellbeing, privacy and teacher agency into operational controls.", sourceUrls: ["https://www.education.gov.au/schooling/resources/australian-framework-generative-artificial-intelligence-ai-schools", "https://www.moe.gov.sg/education-in-sg/educational-technology-journey/edtech-masterplan/artificial-intelligence-in-education"] },
        { institution: "Harvard, Yale and MIT", signal: "Evidence-led, discipline-specific adoption", implication: "Design around academic purpose and evaluate outcomes in context.", sourceUrls: ["https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260", "https://ai.yale.edu/ai-for-teaching-and-learning-2026", "https://aiandeducation.mit.edu/"] },
        { institution: "Stanford, Caltech and UC", signal: "Researcher-led, coordinated experimentation", implication: "Pair expert direction with shared principles, risk processes and transparency.", sourceUrls: ["https://aimes.stanford.edu/", "https://giving.caltech.edu/news/Point72-Gift-Funds-AI-Research-Program-at-Caltech", "https://ai.universityofcalifornia.edu/"] },
        { institution: "World Economic Forum", signal: "AI skills alongside enduring human skills", implication: "Build AI literacy together with analytical thinking, creativity and adaptability.", sourceUrls: ["https://www.weforum.org/publications/the-future-of-jobs-report-2025/"] },
        { institution: "UAE", signal: "Curriculum, educator capability and workflow transformation", implication: "Connect classroom innovation with institutional redesign and national strategy.", sourceUrls: ["https://ai.gov.ae/strategy/", "https://www.moe.gov.ae/ar/about-us/Projects-and-Initiatives/Pages/ai-literacy-curriculum-framework.aspx", "https://www.moe.gov.ae/en/mediacenter/news/pages/Ministry-of-Education-launches-NOVA-project-to-advance-comprehensive-AI-driven-institutional-transformation-in-line-with-UA.aspx", "https://www.moe.gov.ae/en/mediacenter/news/Pages/MOE-and-HBMSU-launch-the-National-AI-Upskilling-Programme-for-Teachers.aspx"], market: "uae" },
      ],
      targetState: [
        { title: "Mission and Portfolio", body: "Choose use cases against learning, research, student outcomes, institutional value and public purpose." },
        { title: "Learning, Curriculum and Assessment", body: "Ground assistance in approved standards and content, vary access by age and design for reasoning and authentic performance." },
        { title: "Educator, Researcher and Leader Agency", body: "Keep recommendations reviewable and consequential academic, safeguarding, placement and disciplinary decisions with accountable professionals." },
        { title: "Governance, Safeguarding and Assurance", body: "Set risk tiers, privacy, security, integrity, procurement, accessibility, human review and incident response." },
        { title: "Agent Platform, Data and Integration", body: "Provide secure identities, governed knowledge, minimum necessary data, approved actions, interoperability, audit trails and model choice." },
        { title: "People and Change", body: "Develop role-based capability across learners, families, educators, researchers, staff, leaders, policymakers and boards." },
        { title: "Evidence and Scale", body: "Measure learning, research speed, workload, service quality, equity, cost, safety and trust before expanding." },
      ],
      roadmap: [
        { horizon: "0–90 days", title: "Establish direction", body: "Name educational, institutional-transformation and technology owners; publish interim principles; map workflows, tools and sensitive data; and select a small portfolio of measurable journeys." },
        { horizon: "3–9 months", title: "Build and redesign", body: "Launch secure access, workforce development, risk and child-impact assessment, evaluation standards and two or three redesigned end-to-end journeys." },
        { horizon: "9–18 months", title: "Scale what works", body: "Integrate proven applications with core platforms, institutionalise assurance, publish impact evidence, standardise redesigned workflows and retire duplicative tools." },
      ],
      leadershipTest: "If an institution cannot state which outcomes AI should improve, what it may know and do, which uses are appropriate by age, when it must escalate, who is accountable and what evidence will justify scale, it does not yet have an AI operating system—it has a collection of tools.",
    },
    verificationDate: "2026-09-10", reviewDate: "2027-03-10", visibility: "public", order: 6, relatedIds: [],
  },
];

export const industryByLegacyPath = Object.fromEntries(INDUSTRIES.map((industry) => [industry.legacyPath, industry]));
