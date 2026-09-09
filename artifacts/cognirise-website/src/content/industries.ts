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
  uses: { use: string; evidence: string; boundary: string }[];
  sources: { label: string; publisher: string; kind: EvidenceKind; url: string; accessedAt?: string }[];
  educationPov?: {
    convictions: { title: string; body: string }[];
    valueDomains: { title: string; body: string; examples: string[] }[];
    signals: { institution: string; signal: string; implication: string; sourceUrls: string[] }[];
    targetState: { title: string; body: string }[];
    roadmap: { horizon: string; title: string; body: string }[];
    leadershipTest: string;
  };
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
    opportunity: "Turn fragmented controls and exception-heavy operations into faster, traceable decisions that improve customer outcomes without weakening model-risk discipline.",
    capabilities: [
      { title: "Governed decision agents", body: "Build bounded agents for onboarding, fraud and operations with approvals, explanations and complete evidence trails." },
      { title: "Sovereign intelligence platforms", body: "Connect models and data inside residency, security and third-party-risk boundaries." },
      { title: "AI-native operating redesign", body: "Rework priority journeys around measurable value, human authority and production controls." },
    ],
    selectedWork: { description: "Selected work should show the mandate, control boundary and measured operational outcome without exposing client-confidential decisions or data." },
    image: "/images/cognirise/industries/pulse-industry-financial.jpg", imageAlt: "A cinematic financial landscape crossed by controlled luminous routes.", variant: "ledger",
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
    image: "/images/cognirise/industries/pulse-industry-telecoms.jpg", imageAlt: "A cinematic telecommunications network carrying luminous signals across an operating landscape.", variant: "network",
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
    image: "/images/cognirise/industries/pulse-industry-travel.jpg", imageAlt: "Multiple illuminated routes converging through a cinematic travel environment.", variant: "journey",
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
    image: "/images/cognirise/industries/pulse-industry-energy.jpg", imageAlt: "A luminous route moving through a cinematic energy landscape at dusk.", variant: "field",
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
    image: "/images/cognirise/industries/pulse-industry-public-sector.jpg", imageAlt: "Citizens moving through a bright monumental civic space connected by a luminous service route.", variant: "ledger",
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
    thesis: "Build the institution-wide agentic AI operating system.", accent: "institution-wide", dek: "Move beyond isolated copilots to a shared institutional layer that advances teaching, research, student success and operations—with academic mission, evidence and human purpose at the centre.",
    opportunity: "Coordinate specialised agents across trusted university knowledge, core systems and complete institutional journeys—so experimentation becomes measurable academic, research and service value.",
    capabilities: [
      { title: "Mission and portfolio", body: "Select use cases against academic value, research impact, student outcomes and public purpose; stop low-value experiments early." },
      { title: "Academic redesign", body: "Create course-grounded assistants, authentic assessment, AI literacy and explicit discipline-level expectations." },
      { title: "Governance and assurance", body: "Define proportionate risk tiers, accountability, privacy, procurement, intellectual property, human review and incident response." },
      { title: "Agent platform, data and tools", body: "Give agents secure identities, trusted knowledge and approved tool access while preserving interoperability and model choice." },
      { title: "People and change", body: "Develop role-based capability for students, faculty, researchers, professional staff, executives and governing boards." },
      { title: "Evidence and scale", body: "Measure learning, research speed, service quality, equity, cost and risk; scale only when evidence warrants it." },
    ],
    selectedWork: { description: "Cognirise brings consulting, engineering, data, platform and change capabilities together to redesign a complete institutional journey and establish the shared layer that lets successful use cases scale." },
    image: "/images/cognirise/industries/pulse-industry-education.jpg", imageAlt: "A cinematic learning environment connected by luminous knowledge pathways.", variant: "network",
    pressures: [
      { title: "Agentic AI is an institutional system", body: "Value depends on coordinated workflows, trusted data, secure tool access, capability building and accountable leadership—not an IT project alone." },
      { title: "Learning design leads adoption", body: "Tools should provoke reasoning, practice and reflection rather than substitute for durable learning." },
      { title: "Value extends beyond content generation", body: "Course-grounded tutoring, research acceleration, advising and workflow redesign offer more defensible value than generic essay production." },
    ],
    reversal: { title: "Move the unit of innovation from the tool to the journey.", body: "Redesign the complete learner, researcher or employee journey and measure outcomes, not usage." },
    myth: { claim: "“The university with the most pilots will lead.”", verdict: "The advantage belongs to the institution that turns experimentation into an academically led, securely enabled and measurable capability." },
    gcc: "The UAE can translate national AI ambition into talent, applied research and public value. Universities should treat agentic AI as a contribution to national capability—not only an efficiency agenda.",
    service: { label: "Consulting & Engineering with AI", href: "/what-we-do#consulting-engineering", firstMove: "Identify and redesign one measurable institutional journey." },
    uses: [
      { use: "Teaching and assessment", evidence: "Course-grounded tutoring, adaptive practice, simulations and authentic assessment", boundary: "Designed around faculty intent and measured learning" },
      { use: "Research and discovery", evidence: "Literature discovery, coding, analysis, modelling and research administration", boundary: "Expert accountability for methods, sources and reproducibility" },
      { use: "Student success and operations", evidence: "Advising, registration, careers, finance, HR, scheduling and accreditation", boundary: "Complete journeys with reliable data and human ownership" },
    ],
    sources: [
      { label: "OECD Digital Education Outlook 2026", publisher: "OECD", kind: "Official source", url: "https://www.oecd.org/en/publications/oecd-digital-education-outlook-2026_062a7394-en.html" },
      { label: "Course-specific physics tutor study", publisher: "Harvard Gazette", kind: "Independent study", url: "https://news.harvard.edu/gazette/story/2024/09/professor-tailored-ai-tutor-to-physics-course-engagement-doubled/" },
      { label: "AI for Teaching and Learning 2026", publisher: "Yale University", kind: "Official source", url: "https://ai.yale.edu/ai-for-teaching-and-learning-2026" },
      { label: "AI in Teaching", publisher: "Caltech", kind: "Official source", url: "https://aiinteaching.caltech.edu/" },
      { label: "AI and Education", publisher: "MIT", kind: "Official source", url: "https://aiandeducation.mit.edu/" },
      { label: "AI Meets Education at Stanford", publisher: "Stanford University", kind: "Official source", url: "https://aimes.stanford.edu/" },
      { label: "Advancing Responsible AI", publisher: "University of California", kind: "Official source", url: "https://ai.universityofcalifornia.edu/" },
      { label: "UAE Strategy for Artificial Intelligence 2031", publisher: "UAE Artificial Intelligence Office", kind: "Official source", url: "https://ai.gov.ae/strategy/" },
      { label: "NOVA institutional transformation project", publisher: "UAE Ministry of Education", kind: "Official source", url: "https://www.moe.gov.ae/en/mediacenter/news/pages/Ministry-of-Education-launches-NOVA-project-to-advance-comprehensive-AI-driven-institutional-transformation-in-line-with-UA.aspx" },
    ],
    educationPov: {
      convictions: [
        { title: "An institutional system, not an IT project", body: "Coordinate workflows, trusted data, secure tool access, capability building and accountable leadership across the university." },
        { title: "Learning design leads technology", body: "Use AI to provoke reasoning, practice and reflection—not to substitute faster task completion for durable learning." },
        { title: "Value reaches beyond generation", body: "Prioritise course-grounded tutoring, research acceleration, advising and workflow redesign over generic content production." },
        { title: "Confidence enables innovation", body: "Clear rules, secure environments, proportionate risk tiers and evaluation let useful experimentation move faster." },
        { title: "Universities advance national capability", body: "Universities can convert national ambition into talent, applied research and measurable public value." },
      ],
      valueDomains: [
        { title: "Teaching and assessment", body: "Create course-grounded assistants for tailored explanations, adaptive practice, simulations, translation and formative feedback. Redesign assessment around authentic problem-solving, oral defence, applied projects, reflection and evidence of process.", examples: ["Harvard’s 194-student controlled study reported roughly twice the learning gains in preliminary analysis for a scaffolded, course-specific physics tutor.", "Yale examples include grounded tutors, language feedback, clinical interviewing practice and AI-assisted inquiry."] },
        { title: "Research and discovery", body: "Support literature discovery, coding, data analysis, modelling, experiment design and dissemination, then connect specialist agents with ethics, finance, submissions and research-performance systems.", examples: ["A Caltech-reported scientist-trained agent reduced a neurological data-cleaning task from weeks to about an hour while preserving a trace of expert instruction.", "MIT and Caltech programmes position AI inside research training and scientific discovery."] },
        { title: "Student success and operations", body: "Augment recruitment, admissions, advising, registration, careers and lifelong learning alongside finance, procurement, HR, scheduling, quality assurance and accreditation.", examples: ["A student-success agent can detect a permitted signal, explain options, schedule support and document the intervention.", "The UAE Ministry of Education’s NOVA initiative connects AI with unified workflows, decision insight and service improvement."] },
      ],
      signals: [
        { institution: "Harvard", signal: "Evidence-led, course-specific learning design", implication: "Test tools against learning outcomes—not novelty.", sourceUrls: ["https://www.harvard.edu/ai/teaching-resources/", "https://news.harvard.edu/gazette/story/2024/09/professor-tailored-ai-tutor-to-physics-course-engagement-doubled/"] },
        { institution: "MIT", signal: "Academic model and research training", implication: "Treat AI as a question for the whole educational mission.", sourceUrls: ["https://aiandeducation.mit.edu/", "https://openlearning.mit.edu/mit-faculty/residential-digital-innovations/ai-use-cases-teaching-mit"] },
        { institution: "Stanford", signal: "Literacy, grants and structured experimentation", implication: "Pair broad engagement with capability building and human oversight.", sourceUrls: ["https://aimes.stanford.edu/"] },
        { institution: "Yale", signal: "Discipline-specific teaching use cases", implication: "Design around course context, authentic practice and faculty intent.", sourceUrls: ["https://provost.yale.edu/news/resources-teaching-and-learning-ai", "https://ai.yale.edu/ai-for-teaching-and-learning-2026"] },
        { institution: "Caltech", signal: "AI for science and integrity caution", implication: "Accelerate expert workflows while avoiding unreliable detection shortcuts.", sourceUrls: ["https://aiinteaching.caltech.edu/", "https://www.ai4science.caltech.edu/", "https://giving.caltech.edu/news/Point72-Gift-Funds-AI-Research-Program-at-Caltech"] },
        { institution: "University of California", signal: "System-wide responsible-AI coordination", implication: "Create common principles, risk processes and transparency at scale.", sourceUrls: ["https://ai.universityofcalifornia.edu/"] },
      ],
      targetState: [
        { title: "Mission and portfolio", body: "Choose use cases against academic value, research impact, student outcomes and public purpose." },
        { title: "Academic redesign", body: "Build course-grounded assistance, authentic assessment, AI literacy and discipline-level expectations." },
        { title: "Governance and assurance", body: "Set proportionate risk tiers, decision rights, privacy, procurement, IP, review and incident response." },
        { title: "Agent platform, data and tools", body: "Provide secure identities, trusted knowledge, approved actions, interoperability and model choice." },
        { title: "People and change", body: "Develop role-based capability across students, faculty, researchers, staff, executives and boards." },
        { title: "Evidence and scale", body: "Measure learning, research speed, service quality, equity, cost and risk before expanding." },
      ],
      roadmap: [
        { horizon: "0–90 days", title: "Establish direction", body: "Name executive and academic owners, publish interim principles, inventory current use, identify sensitive data and select a small portfolio of measurable use cases." },
        { horizon: "3–9 months", title: "Build the foundation", body: "Launch secure access, faculty and staff development, risk assessment, evaluation standards and two or three redesigned end-to-end journeys." },
        { horizon: "9–18 months", title: "Scale what works", body: "Integrate successful use cases with core systems, institutionalise assurance, publish impact evidence and retire duplicative tools." },
      ],
      leadershipTest: "Can the institution state what an agent may know, what it may do, when it must escalate, who is accountable and what evidence will justify scale? If not, it has a collection of tools—not an agentic operating system.",
    },
    verificationDate: "2026-09-09", reviewDate: "2027-03-09", visibility: "public", order: 6, relatedIds: [],
  },
];

export const industryByLegacyPath = Object.fromEntries(INDUSTRIES.map((industry) => [industry.legacyPath, industry]));
