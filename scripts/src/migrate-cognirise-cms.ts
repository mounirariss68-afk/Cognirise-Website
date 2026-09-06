import { createHash } from "node:crypto";
import {
  cmsDocumentsTable,
  cmsMarketEditionsTable,
  cmsMediaAssetsTable,
  cmsMediaReferencesTable,
  cmsMediaVersionsTable,
  cmsRedirectsTable,
  cmsRevisionsTable,
  db,
} from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
// Keep the script package independent of the API artifact's TypeScript project while
// validating with the exact runtime contract used by API writes and reads.
const cmsEditionPayloadSchema: {
  safeParse(value: unknown): { success: true; data: Record<string, unknown> } | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
} = (await import(new URL("../../artifacts/api-server/src/lib/cms/contracts.ts", import.meta.url).href)).cmsEditionPayloadSchema;
const mediaReferences: (value: unknown) => Array<{ mediaId: string; fieldPath: string }> =
  (await import(new URL("../../artifacts/api-server/src/lib/cms/media-references.ts", import.meta.url).href)).mediaReferences;

type Document = Record<string, unknown> & { _id: string; _type: string };

const markets = [
  { _id: "market-uae", code: "uae", name: "United Arab Emirates", isCanonical: true, languages: ["en"] },
  { _id: "market-ksa", code: "ksa", name: "Kingdom of Saudi Arabia", isCanonical: false, languages: ["en", "ar"] },
  { _id: "market-turkiye", code: "turkiye", name: "Türkiye", isCanonical: false, languages: ["tr", "en"] },
  { _id: "market-europe", code: "europe", name: "Europe", isCanonical: false, languages: ["en"] },
] as const;

const ref = (_ref: string) => ({ _type: "reference", _ref });
const block = (text: string) => [{
  _key: "body",
  _type: "block",
  style: "normal",
  markDefs: [],
  children: [{ _key: "text", _type: "span", marks: [], text }],
}];
const richBody = (parts: readonly { text: string; style?: "normal" | "h2" | "h3" }[]) =>
  parts.map((part, index) => ({
    _key: `body-${index + 1}`,
    _type: "block",
    style: part.style ?? "normal",
    markDefs: [],
    children: [{ _key: `text-${index + 1}`, _type: "span", marks: [], text: part.text }],
  }));
const governance = {
  ownership: { owner: ref("person-editorial-owner"), sensitivity: "public" },
  lifecycle: {
    state: "draft",
  },
};
const editions = (title: string, sections?: unknown[]) => markets.map((market) => ({
  _key: market.code,
  _type: "marketEdition",
  market: ref(market._id),
  fallbackMode: market.code === "uae" ? "canonical" : "uaeFallback",
  publicationState: "draft",
  parityComplete: false,
  title,
  ...(market.code === "uae" ? { sections: sections?.length ? sections : [{ _key: "hero", _type: "heroSection", heading: title, body: block(title) }] } : {}),
  approvedBy: ref("person-editorial-owner"),
  approvedAt: "2025-02-19T00:00:00.000Z",
}));
type RouteCopy = {
  heading: string;
  intro: string;
  chapters: readonly { heading: string; body: string }[];
  collection?: readonly { label: string; detail: string }[];
  cta?: { label: string; target: string; heading?: string };
  media?: { path: string; alt: string };
  form?: "contact" | "valueScan";
};

const routeCopy: Record<string, RouteCopy> = {
  home: {
    heading: "Intelligence that moves work.",
    intro: "Cognirise is the AI-native advisory and engineering firm. We bridge the gap between algorithmic potential and enterprise authority.",
    chapters: [
      { heading: "We sell operational reality.", body: "Most AI programmes fail because they treat intelligence as software to be deployed rather than a capability to be governed. We work with leaders who hold accountability for results, providing the advisory clarity to move and the engineering certainty to hold ground." },
      { heading: "Every engagement is designed to transfer capability to your team.", body: "We embed our practices into your firm: boundaries you can see, work that flows, and a platform that remembers." },
      { heading: "Where we operate", body: "Dubai · United Arab Emirates. Riyadh · Kingdom of Saudi Arabia. Istanbul · Türkiye. London · Europe." },
    ],
    collection: [
      { label: "First condition", detail: "Boundaries you can see." },
      { label: "Second condition", detail: "Work that flows." },
      { label: "Third condition", detail: "A platform that remembers." },
    ],
    cta: { label: "Book a consultation", target: "contact", heading: "Ready to discuss your operational reality?" },
    media: { path: "pulse-hero.jpg", alt: "A vivid violet and coral current moving through a monumental architectural environment." },
  },
  "what-we-do": {
    heading: "Stay with the work. From decision to production.",
    intro: "Cognirise combines AI-native advisory, forward-deployed engineering and governed agents to move consequential work into production.",
    chapters: [
      { heading: "Decision is only the start. The work is the test.", body: "AI transformations fail when the strategy, system and operating reality are treated as separate engagements. We work across all three, in the same accountable motion." },
      { heading: "Make the route. Then keep moving.", body: "Our services are distinct entry points—not disconnected offers. Each can begin with one consequential problem and extend into the teams, systems and controls needed to carry it into production." },
      { heading: "Not sure which service you need?", body: "Begin with the intent behind the question. Start there. We will bring the relevant operators, engineers and controls into the first conversation." },
    ],
    collection: [
      { label: "Agentic Enterprise Transformation", detail: "Redesign a priority process around people, engineering and governed agents." },
      { label: "Data & AI Foundations", detail: "Build the conditions for trusted context and production intelligence." },
      { label: "Engineering with AI", detail: "Build, integrate and harden systems in the operating environment." },
      { label: "Sovereign & Regulated AI", detail: "Make local control, explainability and assurance part of the design." },
      { label: "Digital AI Workforce", detail: "Introduce governed agents into the flow of work." },
    ],
    cta: { label: "Book a value scan", target: "value-scan" },
    media: { path: "site-services.jpg", alt: "Violet and coral intelligence routes moving through a bright architectural space." },
  },
  "agentic-enterprise-transformation": {
    heading: "Move the work, not just the model.",
    intro: "Agentic Enterprise Transformation brings senior operators, forward-deployed engineers and governed agents together around the processes that matter most.",
    chapters: [
      { heading: "AI is everywhere. Change is not.", body: "Most programmes stop at possibility: a pilot, a copilot, a presentation. Transformation starts when the process, data, decisions and controls are redesigned together." },
      { heading: "Build through the constraint.", body: "We work where operational urgency meets technical reality. The hard constraints are not an afterthought—they are where the transformation begins." },
      { heading: "Capacity, speed and control—moving together.", body: "Human judgment stays where it counts, with governed intelligence where work can move." },
    ],
    collection: [
      { label: "Discover", detail: "Frame one consequential process and its operating constraints." },
      { label: "Design", detail: "Redesign decisions, data, controls and human hand-offs together." },
      { label: "Build", detail: "Forward-deployed engineers and operators create the working system." },
      { label: "Operate", detail: "Embed ownership, evidence and governance in production." },
    ],
    cta: { label: "Book a value scan", target: "value-scan" },
    media: { path: "site-services.jpg", alt: "A vivid current moving through a white and navy architectural landscape." },
  },
  "data-ai-foundations": {
    heading: "Make the ground ready.",
    intro: "Make data, controls and architecture ready for AI. We build the foundations that give intelligence a place to operate safely and effectively.",
    chapters: [
      { heading: "Ready for production", body: "An organisation cannot deploy intelligent agents if its data is siloed, its architecture is fragile, and its access controls are uncertain." },
      { heading: "An active, governed foundation", body: "We rebuild the data layer not as a passive warehouse, but as an active, governed foundation ready to supply context to enterprise intelligence." },
      { heading: "From discovery to scale.", body: "Audit existing warehouses, lakes and legacy integrations; deploy modern serving architecture; and continuously monitor data quality." },
    ],
    collection: [
      { label: "People", detail: "Identify data owners and consumers. Define roles for data stewards and platform operators." },
      { label: "Systems", detail: "Deploy scalable ingestion, vector stores, APIs and modern data platforms." },
      { label: "Agents", detail: "Connect agents to structured and unstructured data with trusted context." },
      { label: "Governance", detail: "Implement access controls, audit trails, privacy and full traceability." },
    ],
    cta: { label: "Book a value scan", target: "value-scan" },
    media: { path: "cognirise-pulse-outcomes.jpg", alt: "Layered architectural forms carrying data and intelligence into a governed system." },
  },
  "engineering-with-ai": {
    heading: "Engineering that reaches production.",
    intro: "Forward-deployed engineers build, integrate and harden the products and platforms that take promising work into production.",
    chapters: [
      { heading: "The proof of concept is not the product.", body: "Anyone can call an API. Building a resilient, secure system that integrates into a complex enterprise takes serious engineering." },
      { heading: "Into the core operating environment", body: "We deploy engineers who build production-grade platforms, bringing AI out of the sandbox and into the environments where real work happens." },
      { heading: "From prototype to production.", body: "Architecture, versioned code, delivery pipelines, production metrics and operational ownership move together." },
    ],
    collection: [
      { label: "People", detail: "Product sponsors, architects, forward-deployed engineers, DevOps and site reliability owners." },
      { label: "Systems", detail: "Microservices, event-driven architecture, model integrations and CI/CD." },
      { label: "Agents", detail: "Orchestration layers, custom tools and execution within strict platform bounds." },
      { label: "Governance", detail: "SLAs, threat modelling, rate limits, cost controls, security scanning and audit logs." },
    ],
    cta: { label: "Book a value scan", target: "value-scan" },
    media: { path: "cognirise-pulse-governance.jpg", alt: "A governed route moving through a resilient architectural system." },
  },
  "sovereign-regulated-ai": {
    heading: "Control is not optional.",
    intro: "Design the work around local control, explainability and the obligations of the operating environment.",
    chapters: [
      { heading: "The environment sets the boundary.", body: "In regulated and consequential work, architecture choices must follow the mandate, data boundaries and authority model." },
      { heading: "Boundaries before build", body: "Deployment, integration and control options are evaluated against actual requirements rather than promised in advance." },
      { heading: "From mandate to control.", body: "Legal, risk and compliance set the boundary; operators retain explicit override authority; review evidence is defined before production." },
    ],
    collection: [
      { label: "Mandate", detail: "Map regulatory alignment, privacy classifications and data residency." },
      { label: "Policy", detail: "Define roles, access requirements and data minimisation." },
      { label: "Enclave", detail: "Test hosting, network and execution choices against the agreed boundary." },
      { label: "Audit", detail: "Explain agent actions and retain the records required for review." },
    ],
    cta: { label: "Book a value scan", target: "value-scan" },
    media: { path: "site-government.jpg", alt: "A protected, glowing enclave within a larger civic structure." },
  },
  "digital-ai-workforce": {
    heading: "Agents in the flow of work.",
    intro: "Deploy governed agents into real operating environments to coordinate specialist tasks while people retain authority.",
    chapters: [
      { heading: "From experiments to accountable work", body: "A digital workforce is not a collection of disconnected copilots. It is a governed operating model for people and specialist agents." },
      { heading: "Roles before autonomy", body: "Define what agents may do, what context they may use, when they escalate and who remains accountable." },
      { heading: "From task to workforce.", body: "Design, deploy, observe and improve agents within the systems and controls that run the enterprise." },
    ],
    collection: [
      { label: "People", detail: "Process owners define roles, hand-offs, exceptions and override authority." },
      { label: "Systems", detail: "Connect agents to approved enterprise tools, data and workflows." },
      { label: "Agents", detail: "Coordinate specialist tasks with explicit scopes and escalation paths." },
      { label: "Governance", detail: "Observe actions, evaluate quality and keep human accountability visible." },
    ],
    cta: { label: "Book a value scan", target: "value-scan" },
    media: { path: "cognirise-pulse-people.jpg", alt: "People and intelligent agents working together in a shared architectural environment." },
  },
  platforms: {
    heading: "Ecosystem for execution.",
    intro: "CogniOS connects enterprise knowledge, specialist agents and human accountability under one governed operating system.",
    chapters: [
      { heading: "Connected capabilities.", body: "Cognirise combines AI-native advisory, forward-deployed engineering and governed agents to move consequential work into production." },
      { heading: "One governed flow", body: "Enterprise knowledge, conversations, specialist agents and composable capabilities work within the same accountable environment." },
    ],
    collection: [
      { label: "CogniOS", detail: "The operating system for governed intelligence." },
      { label: "CogniDocs", detail: "Knowledge with the context, access and control the work requires." },
      { label: "CogniAgents", detail: "Governed agents coordinating specialist tasks." },
      { label: "CogniTalk", detail: "A bilingual conversational layer between people and enterprise intelligence." },
      { label: "CogniWare", detail: "Composable intelligence connected to enterprise systems." },
    ],
    cta: { label: "Book a value scan", target: "value-scan" },
    media: { path: "site-cognios.jpg", alt: "A network of luminous paths connecting within a larger structure." },
  },
  cognios: {
    heading: "The operating system for governed intelligence.",
    intro: "CogniOS connects enterprise knowledge, agents, integrations and human accountability in one operating environment.",
    chapters: [
      { heading: "Intelligence needs an operating layer.", body: "Move from isolated models and pilots to a system where context, action, evidence and authority stay connected." },
      { heading: "Architecture with boundaries", body: "Knowledge, orchestration, integrations, security and observability are designed as one governed stack." },
      { heading: "People remain accountable.", body: "Agents work inside defined roles, permissions and escalation paths while operators retain control." },
    ],
    collection: [
      { label: "Knowledge", detail: "Ground work in approved enterprise context." },
      { label: "Orchestration", detail: "Coordinate agents, tools and human hand-offs." },
      { label: "Integration", detail: "Connect to the systems that already run the enterprise." },
      { label: "Governance", detail: "Make permissions, evidence and oversight part of execution." },
    ],
    cta: { label: "Bring us one process", target: "value-scan" },
    media: { path: "site-cognios.jpg", alt: "Layered translucent platforms flowing with violet and coral intelligence." },
  },
  cognidocs: {
    heading: "Knowledge, ready for the work.",
    intro: "Knowledge made available with the context, access and control the work requires.",
    chapters: [
      { heading: "Find the answer in context.", body: "Bring fragmented documents and enterprise knowledge into a usable, governed layer." },
      { heading: "Access follows authority.", body: "Preserve source references, permissions and the boundaries attached to sensitive knowledge." },
      { heading: "From documents to decisions.", body: "Give people and agents trusted context at the point the work requires it." },
    ],
    collection: [
      { label: "Ingest", detail: "Connect approved structured and unstructured sources." },
      { label: "Understand", detail: "Organise knowledge around context and meaning." },
      { label: "Retrieve", detail: "Return useful answers with sources." },
      { label: "Govern", detail: "Apply access, traceability and review." },
    ],
    cta: { label: "Talk to Cognirise", target: "contact" },
  },
  cogniagents: {
    heading: "Governed agents for real work.",
    intro: "Governed agents that coordinate specialist tasks in defined operational environments.",
    chapters: [
      { heading: "Give every agent a role.", body: "Define the task, context, tools, authority and escalation path before an agent enters production." },
      { heading: "Coordinate the work.", body: "Specialist agents collaborate across a process instead of operating as disconnected assistants." },
      { heading: "Keep people in authority.", body: "Human owners remain visible at decision points and exceptions." },
    ],
    collection: [
      { label: "Scope", detail: "A defined role and permitted task." },
      { label: "Context", detail: "Approved knowledge and data." },
      { label: "Tools", detail: "Controlled actions in enterprise systems." },
      { label: "Evidence", detail: "Observable actions, decisions and escalation." },
    ],
    cta: { label: "Bring us one process", target: "value-scan" },
  },
  cognitalk: {
    heading: "Conversation that can move the work.",
    intro: "A bilingual conversational layer for meaningful work between people and enterprise intelligence.",
    chapters: [
      { heading: "Meet people in the conversation.", body: "Create natural voice and chat experiences grounded in enterprise context." },
      { heading: "Language without losing control.", body: "Support bilingual interaction while preserving permissions, source context and escalation." },
      { heading: "From question to action.", body: "Connect conversations to governed workflows rather than stopping at an answer." },
    ],
    collection: [
      { label: "Listen", detail: "Understand the request in the user's language." },
      { label: "Ground", detail: "Use approved enterprise knowledge." },
      { label: "Act", detail: "Connect to the relevant workflow." },
      { label: "Escalate", detail: "Bring a person in when authority or judgment is required." },
    ],
    cta: { label: "Talk to Cognirise", target: "contact" },
  },
  cogniware: {
    heading: "Composable intelligence for enterprise systems.",
    intro: "Composable intelligence capabilities connected to the systems that run the enterprise.",
    chapters: [
      { heading: "Build only what the work needs.", body: "Assemble focused capabilities around a process instead of adding another monolithic platform." },
      { heading: "Connect to operating reality.", body: "Integrate intelligence with the APIs, systems and controls already in place." },
      { heading: "A capability that can evolve.", body: "Version, observe and improve components as requirements and models change." },
    ],
    collection: [
      { label: "Compose", detail: "Select capabilities around the process." },
      { label: "Connect", detail: "Integrate enterprise systems and data." },
      { label: "Control", detail: "Apply security, limits and accountability." },
      { label: "Change", detail: "Evolve without rebuilding the whole operating layer." },
    ],
    cta: { label: "Talk to Cognirise", target: "contact" },
  },
  industries: {
    heading: "Pressure reveals where intelligence belongs.",
    intro: "Move consequential work into production—where speed matters and control cannot be an afterthought.",
    chapters: [
      { heading: "The sector is the context. The work is the question.", body: "Each industry carries its own obligations: trust, sovereignty, continuity, safety, service. We begin there—not with a generic AI pattern." },
      { heading: "Make controls part of the flow.", body: "Intelligence only earns its place when it can work with the standards, data and accountability already in motion." },
      { heading: "Work that cannot pause needs intelligence that can hold.", body: "The systems that serve customers and communities are deeply interdependent. The route forward has to respect that reality." },
    ],
    collection: [
      { label: "Banking & financial services", detail: "Trust is the operating system." },
      { label: "Government & public sector", detail: "Public value needs a route to delivery." },
      { label: "Telecoms", detail: "The network is only the beginning." },
      { label: "Energy & resources", detail: "Physical operations leave no room for theatre." },
      { label: "Travel & hospitality", detail: "Every moment of service is a decision." },
      { label: "Manufacturing", detail: "Complexity should not become inertia." },
    ],
    cta: { label: "Book a value scan", target: "value-scan" },
    media: { path: "site-government.jpg", alt: "A monumental civic district connected by a luminous flow of intelligence." },
  },
};

const industryCopy: Record<string, [string, string, readonly [string, string][], string, string]> = {
  banking: ["Trust is the operating system.", "Build intelligence into customer journeys, risk and operations without giving up the controls that make trust possible.", [["Customer Journey Friction", "Fragmented systems prevent teams from seeing the whole customer context."], ["Risk Review Bottlenecks", "Manual review and disconnected evidence slow consequential decisions."], ["Operations Capacity", "Repetitive work consumes capacity that should stay close to judgment."]], "We connect governed knowledge and specialist agents to customer, risk and operating workflows while preserving oversight.", "Banking Value Scan"],
  "public-sector": ["Public value needs a route to delivery.", "For public-sector work where every decision carries weight: intelligence that is governed, grounded in context and built to serve the people behind the process.", [["Consequential public work", "Start with a service, decision or operation where clarity, pace and accountability need to move together."], ["Chosen against the mandate", "Deployment constraints are visible before a route is chosen."], ["Forward-deployed delivery", "Teams enter the work with the people accountable for it."]], "CogniOS holds context, controls and work in one governed operating environment while people stay responsible.", "Start a working session"],
  telecoms: ["The network is only the beginning.", "Turn service, operations and enterprise data into a more responsive operating model for customers and the people who serve them.", [["Service Context", "Customer and network context is fragmented across systems."], ["Operational Response", "Teams lose time moving between alarms, knowledge and action."], ["Enterprise Data", "Useful signals are difficult to connect to the decision in front of the operator."]], "We connect service knowledge, operational signals and governed agents around the moments that determine customer and network outcomes.", "Service Operations Scan"],
  travel: ["Every moment of service is a decision.", "Design more useful experiences across the journey while giving frontline teams the intelligence to resolve what matters.", [["Disruption Resolution", "When schedules change, frontline staff lack consolidated context to rapidly re-accommodate passengers."], ["Dynamic Inventory", "Inventory sits across disconnected legacy systems, making personalised bundling difficult."], ["Guest Context", "Valuable preferences are trapped in loyalty databases, unseen by the staff who interact with guests."]], "We orchestrate data across reservation systems and deploy intelligent agents to resolve high-volume booking modifications.", "Disruption Recovery Scan"],
  energy: ["Physical operations leave no room for theatre.", "Connect field reality, planning and assurance so critical work is safer, faster and visible at the point decisions are made.", [["Field Data Isolation", "Maintenance engineers cannot rapidly access schematics or historical failure logs when assessing a critical asset."], ["Supply Chain Disconnect", "Predictive maintenance flags are not connected to parts inventory."], ["HSE Compliance", "Incident reporting remains a slow, manual process prone to transcription errors."]], "We structure engineering knowledge via CogniDocs and deploy predictive orchestration to align maintenance events with supply chain reality.", "Maintenance Visibility Scan"],
  manufacturing: ["Complexity should not become inertia.", "Create a shared route through portfolios, plants and supply chains—where insight can become action across the enterprise.", [["Production Bottlenecks", "Siloed MES and ERP systems prevent floor managers from adjusting lines dynamically."], ["Supply Chain Fragility", "Procurement teams lack predictive visibility across tier-2 suppliers."], ["Conglomerate Reporting", "Manual consolidation delays executive decisions and masks risk."]], "We integrate knowledge across business units and deploy agents that monitor supply chain signals and orchestrate responses.", "Supply Chain Velocity Scan"],
};

for (const [slug, [heading, intro, leaks, play, scan]] of Object.entries(industryCopy)) {
  routeCopy[slug] = {
    heading,
    intro,
    chapters: [
      { heading: `Value Leak Map: Where ${slug === "public-sector" ? "Public Services" : heading.replace(/[.]/g, "")} Lose Velocity`, body: leaks.map(([label, detail]) => `${label}: ${detail}`).join(" ") },
      { heading: "The Cognirise Play", body: play },
      { heading: "The first move", body: scan },
    ],
    collection: leaks.map(([label, detail]) => ({ label, detail })),
    cta: { label: "Bring us one process", target: "value-scan" },
    ...(slug === "public-sector" ? { media: { path: "site-government.jpg", alt: "Architectural public space with a luminous route moving through it." } } : {}),
  };
}

Object.assign(routeCopy, {
  work: {
    heading: "Proof lives in the work.",
    intro: "Cognirise combines AI-native advisory, forward-deployed engineering and governed agents—and documents the decisions, controls and outcomes along the way.",
    chapters: [
      { heading: "Change is only useful when it can be shown.", body: "Every engagement begins with the work under pressure: the decision, process, data and control environment that must move together." },
      { heading: "Constraints are part of the brief.", body: "Security, sovereignty, integration, accountability and adoption shape the route from the first working session through to production." },
      { heading: "Outcomes with operating consequences.", body: "We look for measurable movement in cost, capacity, speed and risk. The right evidence depends on the mandate—not a predetermined dashboard." },
      { heading: "Some work must remain private. The method does not.", body: "These are anonymized engagement patterns—not named case studies or claimed performance figures." },
    ],
    collection: [
      { label: "Mandate", detail: "The priority work, sponsor question and useful change." },
      { label: "Constraints", detail: "Data, architecture, security, sovereignty and operating realities." },
      { label: "Build", detail: "A working system made with the people who will run it." },
      { label: "Governed production", detail: "Controls, ownership and accountability embedded where work happens." },
    ],
    cta: { label: "Book a value scan", target: "value-scan", heading: "Bring one process. Make the proof useful." },
    media: { path: "site-work-proof.jpg", alt: "A vivid violet-to-coral route moving through a white architectural model." },
  },
  insights: {
    heading: "Ideas for the work ahead.",
    intro: "A reading room for leaders building AI-native organisations: the operating questions behind the strategy, architecture and deployment.",
    chapters: [
      { heading: "AI should move the business—not just assist it.", body: "AI transformation is not a portfolio of pilots. It is a decision to redesign priority work around people, data, controls and intelligent execution." },
      { heading: "The conditions for AI that can hold up in production.", body: "Data, security, governance and architecture are not the preamble. They are the work." },
      { heading: "From agent experiments to a governed digital workforce.", body: "What it takes to deploy agents into real operating environments—with people accountable at every decision point." },
    ],
    collection: [
      { label: "Agentic enterprise", detail: "AI should move the business—not just assist it." },
      { label: "Foundations", detail: "The conditions for AI that can hold up in production." },
      { label: "Platforms", detail: "From agent experiments to a governed digital workforce." },
    ],
    media: { path: "site-insights.jpg", alt: "Violet and coral architectural planes arranged in a bright white space." },
    cta: { label: "Talk to Cognirise", target: "contact" },
  },
  about: {
    heading: "Senior-led is not a slogan. It’s the staffing model.",
    intro: "The people who frame the decision stay close enough to make it real. Cognirise was founded to keep judgment, engineering and accountability in the same room.",
    chapters: [
      { heading: "Mounir Ariss", body: "Three decades helping enterprises turn technology shifts into operating advantage—focused on becoming an agentic enterprise." },
      { heading: "Gökhan Güney", body: "Decades of enterprise transformation leadership across Türkiye, Europe and the Gulf—building the engineering muscle that turns strategy decks into systems that run." },
      { heading: "We run our own firm on our own platform.", body: "Atelier, powered by CogniOS. We don’t sell what we don’t live on." },
    ],
    collection: [
      { label: "Agentic Enterprise Transformation", detail: "AI-native workflows and decision layers." },
      { label: "Data & AI Foundations", detail: "Architecture, governance and durable capability." },
      { label: "SDLC & Legacy Modernization", detail: "AI-augmented delivery and retiring technical debt." },
    ],
    media: { path: "site-leadership.jpg", alt: "Senior colleagues working together around a detailed physical model." },
    cta: { label: "Book a value scan", target: "value-scan", heading: "Bring one process. Meet the people." },
  },
  partners: {
    heading: "Senior-led. Partner-amplified.",
    intro: "Cognirise stays deliberately senior and small—and delivers at enterprise scale through engineering partners and platform partners.",
    chapters: [
      { heading: "The capacity to build at enterprise scale.", body: "Engineering partners extend the senior field team with implementation depth, certified capacity and specialist muscle." },
      { heading: "Specialist products, connected around the work.", body: "Platform partners bring focused capabilities that complement CogniOS where they strengthen the client outcome." },
      { heading: "One accountable ecosystem", body: "Five confirmed partners. One accountable team." },
    ],
    collection: [
      { label: "BGTS", detail: "Software engineering and technology services · 2,000+ full-time professionals · ISO/IEC 42001." },
      { label: "Argano", detail: "Enterprise platform transformation · Microsoft, Oracle, SAP, Salesforce and Infor." },
      { label: "Lupitor", detail: "Conversational AI agents for customer experience · cloud or on-premise." },
      { label: "Datatoolpack", detail: "Automated data preparation for structured, AI-ready data." },
      { label: "bunjee.ai", detail: "AI-native organizational intelligence and expert knowledge." },
    ],
    cta: { label: "Talk to a partner", target: "contact" },
  },
  advisors: {
    heading: "The counsel of people who’ve run the real thing.",
    intro: "Our advisory board brings together senior leaders who have built and led at the scale our clients operate at.",
    chapters: [
      { heading: "Alexis Lecanuet", body: "Regional Senior Managing Director, Accenture Middle East. A 24-year Accenture career spanning strategy execution, client leadership and regional operations." },
      { heading: "Rami Aslan", body: "Former CEO, Türk Telekom · Investor & Board Member. More than 25 years across North America, Europe, the Middle East and Africa." },
      { heading: "Fadi Mattar", body: "Public & Government Affairs Director — IMEA & Türkiye, and Country Director Kuwait & Levant, Dow." },
      { heading: "Counsel at scale", body: "The board convenes quarterly and on demand—reviewing our value proposition, service design, partnerships and market posture." },
    ],
    collection: [
      { label: "Operator's seat", detail: "Transformation at national-network and enterprise scale." },
      { label: "Incumbent's playbook", detail: "How global consultancies win, price and scale in the region." },
      { label: "Stakeholder map", detail: "How industrials and governments in the Gulf make decisions." },
    ],
    cta: { label: "Talk to us", target: "contact" },
  },
  faq: {
    heading: "Clarity on control.",
    intro: "Common questions about Cognirise capability, model and approach.",
    chapters: [{ heading: "Have another question?", body: "Our team is ready to discuss your specific operational challenges." }],
    collection: [
      { label: "What is governed intelligence?", detail: "Defining what models and agents may do, what context they may use, where people remain responsible and what evidence the operating team needs." },
      { label: "Do you build custom models?", detail: "We start with the work and its constraints rather than assuming one model." },
      { label: "How does the Value Scan work?", detail: "A focused working session around one process under pressure." },
      { label: "How do you approach deployment constraints?", detail: "We document the environment, data boundaries, integration constraints and authority model before evaluating a route." },
    ],
    cta: { label: "Get in touch", target: "contact", heading: "Have another question?" },
  },
  contact: {
    heading: "Connect with the team.",
    intro: "For general inquiries, press, or partnership opportunities. To explore a specific process automation, please book a Value Scan.",
    chapters: [
      { heading: "Global Offices", body: "Dubai — Dubai International Financial Centre (DIFC), United Arab Emirates. Riyadh — King Abdullah Financial District (KAFD), Kingdom of Saudi Arabia. London — The City, United Kingdom." },
      { heading: "Email", body: "hello@cognirise.ai" },
    ],
    cta: { label: "Book a Value Scan", target: "value-scan" },
    form: "contact",
  },
  "value-scan": {
    heading: "Start with one day. Leave with a business case.",
    intro: "Bring us one process where urgency, complexity and value have already collided. We will make the practical route visible.",
    chapters: [
      { heading: "Not a pitch. A working room.", body: "The Value Scan creates enough shared clarity to decide what should change, what must hold, and what a credible business case needs to answer." },
      { heading: "Find the point where work can move.", body: "Choose a process with a real operating constraint—not a broad AI ambition. We use the day to expose the value, friction and governing conditions around it." },
      { heading: "Bring the people who can see the work.", body: "The strongest sessions mix the accountable sponsor with the people who understand the operating reality and the conditions for change." },
      { heading: "A case that can move inside the business.", body: "A focused value hypothesis. A practical path to production. The next questions, clearly owned." },
    ],
    collection: [
      { label: "Frame the work", detail: "Name the process, pressure, owners and the decision that matters now." },
      { label: "Trace the constraints", detail: "See where hand-offs, data, systems and controls are holding the work in place." },
      { label: "Shape the intervention", detail: "Identify where people, engineering and governed agents can change the operating route." },
      { label: "Make the case", detail: "Leave with a focused value hypothesis, delivery path and questions to resolve next." },
    ],
    media: { path: "site-services.jpg", alt: "A violet and coral current moving through a bright architectural environment." },
    form: "valueScan",
  },
} satisfies Record<string, RouteCopy>);

const mediaId = (slug: string) => `media-route-${slug}`;
const collectionReferences: Record<string, readonly string[]> = {
  about: ["person-founder-mounir-ariss", "person-founder-gokhan-guney"],
  advisors: ["person-advisor-alexis-lecanuet", "person-advisor-rami-aslan", "person-advisor-fadi-mattar"],
  partners: ["organization-partner-bgts", "organization-partner-argano", "organization-partner-lupitor", "organization-partner-datatoolpack", "organization-partner-bunjee"],
};
const routeSections = (slug: string) => {
  const copy = routeCopy[slug];
  if (!copy) throw new Error(`Missing approved route composition for ${slug}`);
  return [
    {
      _key: `${slug}-hero`, _type: "heroSection", eyebrow: "Cognirise",
      heading: copy.heading, body: block(copy.intro),
      ...(copy.cta ? { primaryAction: { _type: "link", label: copy.cta.label, internal: ref(`page-${copy.cta.target}`) } } : {}),
      ...(copy.media ? { media: ref(mediaId(slug)) } : {}),
    },
    ...copy.chapters.map((chapter, index) => ({
      _key: `${slug}-chapter-${index + 1}`, _type: "richTextSection", heading: chapter.heading, body: block(chapter.body),
    })),
    ...(copy.collection?.length && !collectionReferences[slug] ? [{
      _key: `${slug}-collection`, _type: slug === "faq" ? "faqSection" : "timelineSection",
      heading: slug === "faq" ? "Questions and answers" : "The route",
      ...(slug === "faq"
        ? { items: copy.collection.map((item, index) => ({ _key: `${slug}-item-${index + 1}`, question: item.label, answer: block(item.detail) })) }
        : { steps: copy.collection.map((item, index) => ({ _key: `${slug}-item-${index + 1}`, label: item.label, detail: item.detail })) }),
    }] : []),
    ...(collectionReferences[slug] ? [{
      _key: `${slug}-references`, _type: "referenceGridSection",
      heading: slug === "about" ? "Founding partners" : slug === "advisors" ? "Advisory board profiles" : "Alliance partner profiles",
      items: collectionReferences[slug].map(ref),
    }] : []),
    ...(copy.media ? [{ _key: `${slug}-media`, _type: "mediaSection", heading: copy.heading, media: ref(mediaId(slug)) }] : []),
    ...(copy.form ? [{ _key: `${slug}-form`, _type: "formSlotSection", heading: copy.form === "contact" ? "Contact Cognirise" : "Value Scan intake", form: copy.form }] : []),
    ...(copy.cta && !copy.form ? [{
      _key: `${slug}-cta`, _type: "ctaSection", heading: copy.cta.heading ?? "The first move",
      body: block(copy.cta.heading ?? "Bring one process. Leave with a route."),
      action: { _type: "link", label: copy.cta.label, internal: ref(`page-${copy.cta.target}`) },
    }] : []),
  ];
};
// Snapshot of the existing code-owned route inventory. These records are draft:
// they inventory real routes and metadata without changing the public layout.
const routeInventory: readonly [string, string, string, string][] = [
  ["what-we-do", "service", "AI Transformation Services | Cognirise", "Explore Cognirise services for agentic transformation, AI foundations, modern engineering and sovereign enterprise delivery."],
  ["agentic-enterprise-transformation", "service", "Agentic Enterprise Transformation | Cognirise", "Redesign priority work for governed intelligent execution with a practical route from one process to production."],
  ["data-ai-foundations", "service", "Data & AI Foundations | Cognirise", "Make data, controls and architecture ready for what comes next."],
  ["engineering-with-ai", "service", "Engineering with AI | Cognirise", "Ship production systems with forward-deployed engineering teams."],
  ["sovereign-regulated-ai", "service", "Sovereign & Regulated AI | Cognirise", "Build local control, security and explainability into the work."],
  ["digital-ai-workforce", "service", "Digital AI Workforce | Cognirise", "Deploy governed agents into real operating environments."],
  ["platforms", "platform", "CogniOS Platform Ecosystem | Cognirise", "Discover the platform architecture that connects enterprise knowledge, agents, integrations and human accountability."],
  ["cognios", "platform", "CogniOS AI Platform | Cognirise", "The operating system for governed intelligence."],
  ["cognidocs", "platform", "CogniDocs | Cognirise", "Knowledge made available with the context, access and control the work requires."],
  ["cogniagents", "platform", "CogniAgents | Cognirise", "Governed agents that coordinate specialist tasks in defined operational environments."],
  ["cognitalk", "platform", "CogniTalk | Cognirise", "A bilingual conversational layer for meaningful work between people and enterprise intelligence."],
  ["cogniware", "platform", "CogniWare | Cognirise", "Composable intelligence capabilities connected to the systems that run the enterprise."],
  ["industries", "industry", "AI Transformation by Industry | Cognirise", "Sector-specific routes for organisations where intelligent transformation must be fast, sovereign and defensible."],
  ["banking", "industry", "Banking & Financial Services | Cognirise", "Build intelligence into customer journeys, risk and operations without giving up controls."],
  ["public-sector", "industry", "Public Sector AI Transformation | Cognirise", "Build sovereign, governed AI capability for public services."],
  ["telecoms", "industry", "Telecoms | Cognirise", "Turn service, operations and enterprise data into a responsive operating model."],
  ["travel", "industry", "Travel & Hospitality | Cognirise", "Design more useful experiences across the journey."],
  ["energy", "industry", "Energy & Resources | Cognirise", "Connect field reality, planning and assurance."],
  ["manufacturing", "industry", "Manufacturing & Conglomerates | Cognirise", "Create a shared route through portfolios, plants and supply chains."],
  ["work", "caseStudy", "How Cognirise Delivers AI Transformation", "See how Cognirise frames, builds and governs consequential transformation work."],
  ["insights", "landing", "AI Transformation Insights | Cognirise", "Field notes for leaders building AI-native organisations."],
  ["about", "about", "About Cognirise | Senior-Led AI Transformation", "Meet the principles behind Cognirise."],
  ["partners", "about", "Partners | Cognirise", "The alliance and technology network that supports our operating model."],
  ["advisors", "about", "Advisors | Cognirise", "Senior strategic guidance shaping our capability and delivery."],
  ["faq", "about", "FAQ | Cognirise", "Common questions about our capability, model, and approach."],
  ["contact", "contact", "Contact Us | Cognirise", "Connect with our team to discuss an operating problem."],
];

const founderProfiles = [
  {
    slug: "mounir-ariss", name: "Mounir Ariss",
    bio: "Three decades helping enterprises across the region and beyond turn technology shifts into operating advantage — now focused on one conviction: the next frontier isn't AI adoption, it's becoming an agentic enterprise.",
    focus: [
      "Agentic Enterprise Transformation — AI-native workflows and decision layers",
      "Data & AI Foundations — Architecture, governance, durable capability",
      "SDLC & Legacy Modernization — AI-augmented delivery, retiring technical debt",
    ],
  },
  {
    slug: "gokhan-guney", name: "Gökhan Güney",
    bio: "Decades of enterprise transformation leadership across Türkiye, Europe and the Gulf — building the engineering muscle that turns strategy decks into systems that run.",
    focus: [
      "Agentic Enterprise Transformation — Humans + agents in production",
      "Data & AI Foundations — Platforms and operating models that scale",
      "SDLC & Legacy Modernization — Engineering acceleration with AI",
    ],
  },
] as const;

const advisorProfiles = [
  {
    slug: "alexis-lecanuet", name: "Alexis Lecanuet", role: "Advisory Board Member", title: "Regional Senior Managing Director, Accenture Middle East",
    background: "A 24-year Accenture career culminating in leadership of the firm's Middle East business — strategy execution, client portfolio leadership and regional operations. Previously built and expanded Accenture's products portfolio across the Middle East and Türkiye, with deep roots in consumer, retail and large-scale digital transformation across Europe and MENA. Ranked among Forbes Middle East's “Global Meets Local” top 50 executives; board member of INJAZ ME; educated at ESCP Europe and SKEMA.",
    contribution: "The incumbent's playbook, from the inside: how global consultancies win, price and scale in this region — so our senior-led, platform-powered model is sharpened precisely where the traditional model is weakest.",
    source: "Profile per AmCham Abu Dhabi bio, Forbes Middle East and Consultancy-me.com, accessed August 2026.",
  },
  {
    slug: "rami-aslan", name: "Rami Aslan", role: "Advisory Board Member", title: "Former CEO, Türk Telekom · Investor & Board Member",
    background: "More than 25 years across North America, Europe, the Middle East and Africa. CEO of Türk Telekom (2013–2017) — Türkiye's largest telecom operator, with some 35,000 employees serving 40+ million customers — after leading Oger Telecom as CEO and executive board member. Earlier, head of M&A and corporate finance at the Oger Group, concluding transactions exceeding US$25 billion, following banking roles at Citigroup and TD covering telecom and technology. Board roles have spanned Avea, TTNET, Cell-C and operators across four more countries. Since 2018, a co-founder of venture and private-equity initiatives. McGill BCom and MBA.",
    contribution: "The operator's seat: what transformation looks like when you're accountable for 35,000 people and a nation's network — plus an investor's discipline on our economics and a telecom depth that anchors one of our core industries.",
    source: "Profile per McGill Desautels advisory board bio and public announcements, accessed August 2026.",
  },
  {
    slug: "fadi-mattar", name: "Fadi Mattar", role: "Advisory Board Member", title: "Public & Government Affairs Director — IMEA & Türkiye, and Country Director Kuwait & Levant, Dow",
    background: "A senior corporate-affairs and country leader at Dow, responsible for public and government affairs across India, the Middle East, Africa and Türkiye, and for Dow's business in Kuwait and the Levant. His Dow decade spans public affairs, government relations and country leadership; before Dow he headed corporate communications at EQUATE Petrochemical, served as Marketing Director for MENA at American Express, and held corporate communications and marketing roles at Citibank across the UAE, Bahrain and Oman — a career bridging energy & petrochemicals, financial services, and the corridors where business meets government in the Gulf.",
    contribution: "The stakeholder map: how large industrials and governments in the Gulf actually make decisions — sharpening our energy & resources proposition, our public-sector posture, and how the Cognirise story lands with boards, ministries and media.",
    source: "Profile per Dow announcements and public executive profiles (publicly spelled “Fadi Matar”), accessed August 2026.",
  },
] as const;

const partnerProfiles = [
  {
    slug: "bgts", category: "engineering", name: "BGTS", positioning: "Software engineering & technology services · 30 years of engineering · London, Sheffield, Düsseldorf, Amsterdam, Istanbul, Ankara — Dubai opening",
    facts: ["2,000+ — full-time professionals", "8 — offices across the UK, Europe & Türkiye", "ISO/IEC 42001 — certified AI management (plus ISO 27001, 20000-1, 9001)"],
    coverage: ["Banking & finance", "Manufacturing", "Automotive", "Telecoms", "Retail & e-commerce", "Media & entertainment", "Technology"],
    evidence: "HSBC, Vodafone, Mercedes-Benz, Coca-Cola, Booking.com, DHL, Samsung, Intel, IBM, BASF, Honda and Warner Bros. feature among the clients listed on BGTS's site. Case studies include AI-driven data management for retail; machine-learning vehicle pricing for automotive; promotion & loyalty management platforms; PIM modernization and legacy decommissioning.",
    contribution: "The delivery backbone: two thousand certified engineers with deep financial-services specialization and nearshore scale across Europe and Türkiye — soon on the ground in Dubai. It's how a senior-led firm ships enterprise-scale builds without diluting seniority.",
    source: "Facts per bgts.com (About Us, industries and case-study pages), accessed August 2026.",
  },
  {
    slug: "argano", category: "engineering", name: "Argano", positioning: "Digital transformation consultancy for high-performance operations · Americas-anchored with global delivery",
    facts: ["Top 1% — Microsoft Inner Circle — 7 consecutive years", "5 — strategic platform alliances: Microsoft, Oracle, SAP, Salesforce, Infor", "Partner of the Year — Oracle (regional) & Infor (healthcare) awards"],
    coverage: ["Asset-intensive industries", "Healthcare", "Manufacturing", "Services", "Enterprise ERP · HCM · CX across sectors"],
    evidence: "Argano designs, implements and runs the enterprise platforms operations depend on — Oracle, SAP, Microsoft Dynamics, Salesforce and Infor — with recent expansion including a SAP delivery center in Mexico and acquisitions in capital-program governance and Oracle ERP services. Public highlights include Infor CloudSuite modernization in healthcare and capital-program governance for asset-intensive industries.",
    contribution: "Mastery of the systems of record. When CogniOS interfaces with your ERP, CRM or HCM rather than replacing it, Argano's top-1% platform expertise makes those integrations enterprise-grade — and extends Cognirise's reach into the Americas.",
    source: "Facts per argano.com (homepage, partner and technology pages), accessed August 2026.",
  },
  {
    slug: "lupitor", category: "platform", name: "Lupitor", positioning: "Conversational-AI platform — AI agents for customer experience · Pittsburgh · San Francisco · Istanbul",
    facts: ["40+ — clients on the platform", "0.05% — reported hallucination rate on its custom-trained LLM", "48 hrs — to a custom demo on your data"],
    coverage: ["Voice AI", "Chat & email", "Contact centers", "Any language", "On-premise or cloud"],
    evidence: "Omnichannel AI agents that hold natural, human-like conversations grounded in your own data — with orchestration guardrails, self-improvement from live interactions, and integrations into CRM, documents and business apps. Deployable inside your infrastructure. Multilingual voice AI that can run on-premise is precisely what sovereign and regulated MENAT clients require — and what most global platforms can't offer.",
    contribution: "The voice of the digital workforce. Lupitor powers the conversational front door — call centers, citizen hotlines, guest concierges — in any language, on your infrastructure, feeding governed CogniOS workflows behind it.",
    source: "Facts per lupitor.com, accessed August 2026.",
  },
  {
    slug: "datatoolpack", category: "platform", name: "Datatoolpack", positioning: "Automated data-preparation platform · Turning raw datasets into structured, AI-ready data",
    facts: ["10+ — data-cleaning fixations for consistent formats", "1,000 → 20,000 — records in a published synthetic-data case example", "3 runs — available in the free starting tier"],
    coverage: ["Data completion & verification", "Data cleaning", "Numericalization", "Missing-data handling", "Feature engineering", "Noise reduction", "Synthetic data"],
    evidence: "AutoData brings common data-preparation steps into preset machine-learning pipelines. The platform can fill and verify values using web searches, API requests and LLM queries; standardize formats; numericalize and scale data; reduce noise; engineer features; and generate synthetic records. Its published HR example transformed inconsistent source data into a structured machine-learning dataset and expanded 1,000 records to 20,000 without manual preprocessing.",
    contribution: "The preparation layer for AI-ready data. Datatoolpack helps Cognirise clients move from fragmented, inconsistent source data toward governed datasets that can support analytics, model training and CogniOS workflows with less manual pipeline work.",
    source: "Alliance status confirmed by Cognirise, September 2026. Product facts per datatoolpack.com and AutoData product pages, accessed September 2026.",
  },
  {
    slug: "bunjee", category: "platform", name: "bunjee.ai", positioning: "AI-native organizational intelligence · Capturing how experts and leaders think, then deploying that knowledge across the enterprise",
    facts: ["30+ — languages supported for AI-led interviews", "2,184 — candidates screened in a published use case", "6 days — to complete a process described as normally taking 6–8 weeks"],
    coverage: ["Recruitment", "Onboarding", "Training", "Assessment", "Internal communication", "Corporate memory", "Expert knowledge"],
    evidence: "Bunjee captures conversations, videos, documents and processes from an organization's experts, structures them into a living intelligence layer, and deploys that expertise where teams need it. The same layer supports recruitment, onboarding, communication, assessment and training. Its recruitment workflow combines job posting, CV scoring and AI-led interviews with consistent rubrics, transcripts, rationale and ranked shortlists.",
    contribution: "The organizational-memory layer. bunjee.ai helps Cognirise clients capture scarce expert judgment once and make it available across hiring, onboarding, learning, assessment and communication — extending governed intelligence from enterprise systems into the way people think and decide.",
    source: "Alliance status confirmed by Cognirise, September 2026. Product facts and published use-case figures per bunjee.ai, accessed September 2026.",
  },
] as const;

const publications = [
  {
    slug: "ai-should-move-the-business", topic: "Agentic enterprise", title: "AI should move the business—not just assist it.",
    date: "2026-09-03T00:00:00.000Z", author: "Strategy Practice", readingMinutes: 5,
    image: "site-insights.jpg", alt: "Violet and coral architectural planes arranged in a bright white space.",
    body: richBody([
      { text: "AI transformation is not a portfolio of pilots. It is a decision to redesign priority work around people, data, controls and intelligent execution." },
      { text: "Many enterprises are stuck in a holding pattern. They have copilots assisting individuals, but the core operating model remains unchanged. The friction points—hand-offs, data silos, slow decisions—are still there, just slightly masked by faster email drafting." },
      { text: "Transformation begins when leaders stop asking \"how can AI help our people?\" and start asking \"how should this work move?\" When you design the process for intelligence, you don't just add a conversational interface. You build governed agents that execute tasks, connected to the knowledge they need, escalating to human authority only when judgment is required." },
      { text: "The limits of assistance", style: "h3" },
      { text: "A copilot makes a single task faster. Agentic transformation makes a sequence of tasks automatic. If a loan origination process requires six hand-offs across three departments, giving each person an AI assistant doesn't fix the process—it just makes the hand-offs happen marginally faster." },
      { text: "The alternative is to look at the process end-to-end. Where is the data? What are the regulatory boundaries? What are the decision criteria? Once those are mapped, a governed digital workforce can handle the routine validation and assembly, bringing a synthesized decision to the human operator. The work moves." },
      { text: "Designing for control", style: "h3" },
      { text: "Moving work automatically requires trust, which means governance cannot be an afterthought. An agentic enterprise builds control into the flow: audit trails, clear authority boundaries, and deterministic fallbacks. The system is designed to stop and ask for direction when uncertainty arises." },
      { text: "Stop running isolated pilots. Bring one consequential process under pressure, and redesign it for intelligence." },
    ]),
  },
  {
    slug: "foundations-for-production", topic: "Foundations", title: "The conditions for AI that can hold up in production.",
    date: "2026-08-28T00:00:00.000Z", author: "Engineering Practice", readingMinutes: 4,
    image: "site-infrastructure.jpg", alt: "An architectural infrastructure landscape carrying violet and coral light routes.",
    body: richBody([
      { text: "Data, security, governance and architecture are not the preamble. They are the work." },
      { text: "The hardest part of AI isn't the model. It's the environment around the model. When a promising prototype fails to reach production, it is rarely because the intelligence wasn't good enough. It fails because the enterprise wasn't ready to support it." },
      { text: "Production demands a different set of questions: who may access what, where data may move, what the operating team can observe, and how the system connects to the wider estate. A conversational interface alone does not answer them." },
      { text: "The integration reality", style: "h3" },
      { text: "AI needs a place to operate. It needs a structured route to enterprise knowledge. If your documentation is a mess of conflicting versions, an LLM will simply hallucinate at scale. The foundation of any AI transformation is data hygiene and semantic architecture." },
      { text: "The CogniOS architecture approaches this systematically. Before agents are orchestrated, the knowledge layer and integration route need to be designed around controlled context and the systems of record." },
      { text: "Boundaries by design", style: "h3" },
      { text: "For public-sector and regulated work, the relevant boundaries must be made explicit before architecture choices are made. Data location, access, authority and evidence requirements should shape the foundation rather than appear as a policy note at the end." },
    ]),
  },
  {
    slug: "governed-digital-workforce", topic: "Platforms", title: "From agent experiments to a governed digital workforce.",
    date: "2026-08-15T00:00:00.000Z", author: "Platforms Team", readingMinutes: 6,
    image: "site-cognios.jpg", alt: "Layered translucent platforms flowing with violet and coral intelligence.",
    body: richBody([
      { text: "What it takes to deploy agents into real operating environments—with people accountable at every decision point." },
      { text: "We are moving from an era where AI generates text to an era where AI takes action. Agents are systems that can perceive an environment, make decisions based on a goal, and use tools to execute tasks. But deploying an agent in a consequential enterprise environment is fundamentally different from a sandbox experiment." },
      { text: "A digital workforce requires an operating model. Who manages the agents? How do they escalate exceptions? How do you audit a decision made at machine speed?" },
      { text: "The accountability model", style: "h3" },
      { text: "Agents do not replace human authority; they require it to be more precise. A governed digital workforce operates within strict, declarative boundaries. An agent might have the authority to process an invoice up to $10,000 if it matches a purchase order, but it must flag anything anomalous to a human operator." },
      { text: "This is where the Experience Layer of CogniOS becomes critical. The interface between human and agent must fit the operating context and present the information necessary for a person to make an informed judgment. " },
      { text: "The digital workforce is not an IT project. It is a new way of organizing the enterprise. Start with one process, define the boundaries, and build the controls before you scale." },
    ]),
  },
] as const;

const documents: Document[] = [
  ...markets.map((market) => ({ _type: "market", ...market })),
  {
    _id: "person-editorial-owner", _type: "person", name: "Cognirise Editorial Team",
    role: "Content owner", profileType: "author", bio: block("The accountable Cognirise editorial team."),
    marketEditions: [], ...governance,
  },
  ...["Strategy Practice", "Engineering Practice", "Platforms Team"].map((name) => ({
    _id: `person-author-${name.toLowerCase().replaceAll(" ", "-")}`, _type: "person",
    name, role: "Author", profileType: "author", bio: block(`${name} at Cognirise.`),
    marketEditions: [], ...governance,
  })),
  ...routeInventory.map(([slug, routeKind, title, description]) => ({
    _id: `page-${slug}`, _type: "page", title, routeKind,
    slug: { _type: "slug", current: slug }, summary: description, sections: [],
    seo: { metaTitle: title, metaDescription: description, structuredDataType: "WebPage" },
    marketEditions: editions(title, routeSections(slug)), ...governance,
  })),
  ...founderProfiles.map((founder) => ({
    _id: `person-founder-${founder.slug}`, _type: "person", name: founder.name,
    role: "Founding Partner", profileType: "leader", bio: block(founder.bio),
    expertise: [...founder.focus], marketEditions: [], ...governance,
  })),
  ...Object.entries(routeCopy)
    .filter(([, copy]) => copy.media)
    .map(([slug, copy]) => ({
      _id: mediaId(slug), _type: "mediaAsset", title: `${copy.heading} route image`,
      kind: "image", externalUrl: `https://cognirise.ai/images/cognirise/${copy.media!.path}`,
      altText: copy.media!.alt, decorative: false, rightsOwner: "Cognirise",
      marketsApproved: markets.map((market) => ref(market._id)),
    })),
  ...advisorProfiles.map((advisor) => ({
    _id: `person-advisor-${advisor.slug}`, _type: "person", name: advisor.name,
    role: `${advisor.role} · ${advisor.title}`, profileType: "advisor",
    bio: richBody([
      { text: "Background", style: "h3" }, { text: advisor.background },
      { text: `What ${advisor.name.split(" ")[0]} brings to Cognirise`, style: "h3" }, { text: advisor.contribution },
      { text: advisor.source },
    ]),
    expertise: [advisor.title, advisor.contribution], marketEditions: [], ...governance,
  })),
  {
    _id: "organization-cognirise", _type: "organization", name: "Cognirise",
    organizationType: "institution", description: block("Intelligence that moves work."),
    website: "https://cognirise.ai", marketEditions: [], ...governance,
  },
  {
    _id: "media-cognirise-logo", _type: "mediaAsset", title: "Cognirise logo",
    kind: "image", externalUrl: "https://cognirise.ai/images/cognirise/logo-blue.svg",
    altText: "Cognirise", decorative: false, rightsOwner: "Cognirise",
    marketsApproved: markets.map((market) => ref(market._id)),
  },
  {
    _id: "reference-cognirise-site", _type: "referenceSource", title: "Cognirise website",
    publisher: ref("organization-cognirise"), url: "https://cognirise.ai", accessedAt: "2025-02-19",
  },
  {
    _id: "proof-cognirise-positioning", _type: "proof", title: "Approved brand positioning",
    value: "Intelligence that moves work", context: "Current Cognirise public positioning.",
    references: [ref("reference-cognirise-site")], verifiedAt: "2025-02-19",
    marketsApproved: markets.map((market) => ref(market._id)), ...governance,
  },
  {
    _id: "claim-cognirise-positioning", _type: "claim", statement: "Intelligence that moves work.",
    claimType: "positioning", proof: [ref("proof-cognirise-positioning")],
    marketsApproved: markets.map((market) => ref(market._id)), ...governance,
  },
  {
    _id: "page-home", _type: "page", title: "Cognirise", routeKind: "home",
    slug: { _type: "slug", current: "home" }, summary: "Intelligence that moves work.",
    sections: routeSections("home"),
    seo: { metaTitle: "Cognirise | Intelligence That Moves Work", metaDescription: "Cognirise redesigns consequential enterprise work around people, data, controls and intelligent execution.", structuredDataType: "Organization" },
    marketEditions: editions("Cognirise", routeSections("home")), ...governance,
  },
  {
    _id: "page-value-scan", _type: "page", title: "Bring us one process", routeKind: "landing",
    slug: { _type: "slug", current: "value-scan" }, summary: "A practical AI Value Scan.",
    sections: [], marketEditions: editions("Bring us one process", routeSections("value-scan")), ...governance,
  },
  {
    _id: "organization-alliance-network", _type: "organization", name: "Cognirise Alliance Network",
    organizationType: "partner", description: block("The alliance and technology network supporting the Cognirise operating model."),
    marketEditions: [], ...governance,
  },
  ...partnerProfiles.map((partner) => ({
    _id: `organization-partner-${partner.slug}`, _type: "organization", name: partner.name, organizationType: "partner",
    description: richBody([
      { text: partner.positioning },
      { text: "Platform, footprint & representative work", style: "h3" }, { text: partner.evidence },
      { text: `What ${partner.name} brings to Cognirise clients`, style: "h3" }, { text: partner.contribution },
      { text: partner.source },
    ]),
    capabilities: [
      `Alliance type: ${partner.category}`,
      ...partner.facts.map((fact) => `Fact: ${fact}`),
      ...partner.coverage.map((coverage) => `Coverage: ${coverage}`),
    ],
    marketEditions: [], ...governance,
  })),
  ...publications.map((publication) => ({
    _id: `media-publication-${publication.slug}`, _type: "mediaAsset",
    title: `${publication.title} hero`, kind: "image",
    externalUrl: `https://cognirise.ai/images/cognirise/${publication.image}`,
    altText: publication.alt, decorative: false, rightsOwner: "Cognirise",
    marketsApproved: markets.map((market) => ref(market._id)),
  })),
  ...publications.map((publication) => ({
    _id: `publication-${publication.slug}`, _type: "publication", title: publication.title,
    format: "article", slug: { _type: "slug", current: publication.slug },
    dek: publication.body[0].children[0].text,
    body: publication.body,
    topics: [publication.topic],
    publishedAt: publication.date,
    updatedAt: publication.date,
    readingMinutes: publication.readingMinutes,
    media: ref(`media-publication-${publication.slug}`),
    seo: { metaTitle: publication.title, metaDescription: publication.body[0].children[0].text, structuredDataType: "Article", openGraphImage: ref(`media-publication-${publication.slug}`) },
    authors: [ref(`person-author-${publication.author.toLowerCase().replaceAll(" ", "-")}`)],
    marketEditions: markets.map((market) => ({
      _key: market.code, _type: "publicationEdition", market: ref(market._id),
      fallbackMode: market.code === "uae" ? "canonical" : "uaeFallback",
      publicationState: "draft",
      ...(market.code === "uae" ? {
        title: publication.title,
        dek: publication.body[0].children[0].text,
        body: publication.body,
        seo: { metaTitle: publication.title, metaDescription: publication.body[0].children[0].text, structuredDataType: "Article", openGraphImage: ref(`media-publication-${publication.slug}`) },
      } : {}),
    })),
    ...governance,
  })),
  {
    _id: "navigation-primary", _type: "navigation", title: "Primary navigation", placement: "primary",
    items: [
      { _key: "what-we-do", _type: "link", label: "What we do", internal: ref("page-what-we-do"), children: [
        ["Overview", "what-we-do"], ["Agentic Enterprise Transformation", "agentic-enterprise-transformation"], ["Data & AI Foundations", "data-ai-foundations"], ["Engineering with AI", "engineering-with-ai"], ["Sovereign & Regulated AI", "sovereign-regulated-ai"], ["Digital AI Workforce", "digital-ai-workforce"],
      ].map(([label, slug]) => ({ _key: `nav-${slug}`, _type: "link", label, internal: ref(`page-${slug}`) })) },
      { _key: "platforms", _type: "link", label: "Platforms", internal: ref("page-platforms"), children: [
        ["Platform Overview", "platforms"], ["CogniOS", "cognios"], ["Architecture", "cognios"], ["CogniDocs", "cognidocs"], ["CogniAgents", "cogniagents"], ["CogniTalk", "cognitalk"], ["CogniWare", "cogniware"],
      ].map(([label, slug]) => label === "Architecture"
        ? { _key: "nav-architecture", _type: "link", label, externalUrl: "https://cognirise.ai/platforms/cognios#architecture" }
        : { _key: `nav-${label.toLowerCase().replaceAll(" ", "-")}`, _type: "link", label, internal: ref(`page-${slug}`) }) },
      { _key: "industries", _type: "link", label: "Industries", internal: ref("page-industries"), children: [
        ["Industries Overview", "industries"], ["Banking & Financial Services", "banking"], ["Public Sector", "public-sector"], ["Telecoms", "telecoms"], ["Travel & Hospitality", "travel"], ["Energy & Resources", "energy"], ["Manufacturing & Conglomerates", "manufacturing"],
      ].map(([label, slug]) => ({ _key: `nav-${slug}`, _type: "link", label, internal: ref(`page-${slug}`) })) },
      { _key: "work", _type: "link", label: "Work", internal: ref("page-work") },
      { _key: "insights", _type: "link", label: "Insights", internal: ref("page-insights") },
      { _key: "about", _type: "link", label: "About", internal: ref("page-about"), children: [
        ["Firm & Leadership", "about"], ["Partners", "partners"], ["Advisors", "advisors"], ["FAQ", "faq"], ["Contact", "contact"],
      ].map(([label, slug]) => ({ _key: `nav-${slug}`, _type: "link", label, internal: ref(`page-${slug}`) })) },
    ],
    marketEditions: markets.map((market) => ({
      _key: market.code, _type: "navigationEdition", market: ref(market._id),
      fallbackMode: market.code === "uae" ? "canonical" : "uaeFallback",
      publicationState: "draft",
    })), ...governance,
  },
  ...[
    ["services", "/services", "/what-we-do"],
    ["sectors", "/sectors", "/industries"],
    ["who", "/who", "/about"],
    ["cognios-architecture", "/platforms/cognios/architecture", "/platforms/cognios#architecture"],
    ["architecture", "/architecture", "/platforms/cognios#architecture"],
    ["cognidocs", "/cognidocs", "/platforms/cognidocs"],
    ["cogniagents", "/cogniagents", "/platforms/cogniagents"],
    ["cognitalk", "/cognitalk", "/platforms/cognitalk"],
    ["cogniware", "/cogniware", "/platforms/cogniware"],
    ["pov-banking", "/pov-banking", "/industries/banking"],
    ["pov-government", "/pov-government", "/industries/public-sector"],
    ["pov-telecoms", "/pov-telecoms", "/industries/telecoms"],
    ["pov-travel", "/pov-travel", "/industries/travel"],
    ["pov-energy", "/pov-energy", "/industries/energy"],
    ["pov-manufacturing", "/pov-manufacturing", "/industries/manufacturing"],
  ].map(([id, sourcePath, destinationPath]) => ({
    _id: `redirect-${id}`, _type: "redirect", sourcePath, destinationPath, statusCode: 308, active: false, market: ref("market-uae"), ...governance,
  })),
  {
    _id: "global-settings", _type: "globalSettings",
    organization: { name: "Cognirise", legalName: "Cognirise", description: "Intelligence that moves work.", website: "https://cognirise.ai", logo: ref("media-cognirise-logo") },
    defaultSeo: { metaTitle: "Cognirise", metaDescription: "Intelligence that moves work.", structuredDataType: "Organization" },
    markets: markets.map((market) => ref(market._id)), defaultMarket: ref("market-uae"), ...governance,
  },
];

const plain = (value: unknown): Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
const stableRef = (value: unknown, fixtureId: string, path: string) => {
  const id = plain(value)._ref;
  if (typeof id !== "string") throw new Error(`Fixture ${fixtureId} has invalid reference at ${path}`);
  return { id };
};
const boundedParts = (value: unknown, max: number) => {
  const text = String(value);
  if (text.length <= max) return [text];
  const words = text.split(/\s+/); const parts: string[] = []; let current = "";
  for (const word of words) {
    if (current && current.length + word.length + 1 > max) { parts.push(current); current = word; }
    else current += `${current ? " " : ""}${word}`;
  }
  if (current) parts.push(current);
  return parts;
};
const textBlocks = (value: unknown, fixtureId: string, path: string) => {
  if (!Array.isArray(value)) throw new Error(`Fixture ${fixtureId} has invalid Portable Text at ${path}`);
  return value.map((block, index) => {
    const source = plain(block);
    if (source._type !== "block" || !Array.isArray(source.children)) throw new Error(`Fixture ${fixtureId} has invalid Portable Text block at ${path}[${index}]`);
    return {
      type: "block" as const,
      style: ["normal", "h2", "h3", "blockquote"].includes(String(source.style)) ? source.style as "normal" | "h2" | "h3" | "blockquote" : "normal" as const,
      children: source.children.map((child, childIndex) => {
        const span = plain(child);
        if (span._type !== "span" || typeof span.text !== "string") throw new Error(`Fixture ${fixtureId} has invalid Portable Text span at ${path}[${index}].children[${childIndex}]`);
        return { type: "span" as const, text: span.text, marks: Array.isArray(span.marks) ? span.marks.filter((mark): mark is "strong" | "em" | "code" => mark === "strong" || mark === "em" || mark === "code") : [] };
      }),
    };
  });
};
const ownership = (fixture: Document) => ({
  owner: fixture.ownership ? stableRef(plain(fixture.ownership).owner, fixture._id, "ownership.owner") : { id: "person-editorial-owner" },
  sensitivity: "public" as const,
});
function normalizedContent(fixture: Document, market: string): Record<string, unknown> {
  const source = fixture as Record<string, unknown>;
  const edition = (Array.isArray(source.marketEditions) ? source.marketEditions : []).find((entry) => plain(entry)._key === market);
  const localized = plain(edition);
  if (fixture._type === "page") {
    const rawSections = (market === "uae" ? localized.sections : undefined) ?? source.sections ?? [];
    if (!Array.isArray(rawSections)) throw new Error(`Fixture ${fixture._id} has invalid sections`);
    const sections = rawSections.map((entry, index) => {
      const section = plain(entry); const id = typeof section._key === "string" ? section._key : `${fixture._id}-section-${index + 1}`;
      const base = { id, heading: typeof section.heading === "string" ? section.heading : typeof source.title === "string" ? source.title : fixture._id, ...(typeof section.eyebrow === "string" ? { eyebrow: section.eyebrow } : {}), ...(section.body ? { body: textBlocks(section.body, fixture._id, `sections[${index}].body`) } : {}) };
      if (section._type === "heroSection") return { ...base, type: "hero" as const, ...(section.primaryAction ? { primaryAction: { label: plain(section.primaryAction).label, internal: stableRef(plain(section.primaryAction).internal, fixture._id, `sections[${index}].primaryAction.internal`) } } : {}), ...(section.media ? { media: stableRef(section.media, fixture._id, `sections[${index}].media`) } : {}) };
      if (section._type === "referenceGridSection") return { ...base, type: "referenceGrid" as const, items: Array.isArray(section.items) ? section.items.map((ref, refIndex) => stableRef(ref, fixture._id, `sections[${index}].items[${refIndex}]`)) : [] };
      if (section._type === "mediaSection") return { ...base, type: "media" as const, media: stableRef(section.media, fixture._id, `sections[${index}].media`) };
      if (section._type === "formSlotSection") return { ...base, type: "formSlot" as const, form: section.form === "contact" ? "contact" as const : "valueScan" as const };
      if (section._type === "ctaSection") return { ...base, type: "cta" as const, action: { label: plain(section.action).label, internal: stableRef(plain(section.action).internal, fixture._id, `sections[${index}].action.internal`) } };
      if (section._type === "timelineSection") return { ...base, type: "timeline" as const, steps: Array.isArray(section.steps) ? section.steps.map((step) => ({ label: String(plain(step).label ?? ""), detail: String(plain(step).detail ?? "") })) : [] };
      if (section._type === "faqSection") return { ...base, type: "faq" as const, items: Array.isArray(section.items) ? section.items.map((item, itemIndex) => ({ question: String(plain(item).question ?? ""), answer: textBlocks(plain(item).answer, fixture._id, `sections[${index}].items[${itemIndex}].answer`) })) : [] };
      return { ...base, type: "richText" as const };
    });
    return { kind: "page", title: String(localized.title ?? source.title), routeKind: source.routeKind, canonicalSlug: plain(source.slug).current, ...(typeof localized.summary === "string" || typeof source.summary === "string" ? { summary: String(localized.summary ?? source.summary) } : {}), topics: [], sections, ...(source.seo ? { seo: normalizeSeo(source.seo, fixture) } : {}), ownership: ownership(fixture) };
  }
  if (fixture._type === "publication") return { kind: "publication", title: String(localized.title ?? source.title), canonicalSlug: plain(source.slug).current, format: source.format, ...(source.dek ? { dek: String(localized.dek ?? source.dek) } : {}), body: textBlocks(localized.body ?? source.body, fixture._id, "body"), authors: (Array.isArray(source.authors) ? source.authors : []).map((ref, i) => stableRef(ref, fixture._id, `authors[${i}]`)), topics: Array.isArray(source.topics) ? source.topics : [], ...(source.media ? { media: stableRef(source.media, fixture._id, "media") } : {}), ...(source.publishedAt ? { publishedAt: source.publishedAt } : {}), ...(source.readingMinutes ? { readingMinutes: source.readingMinutes } : {}), ...(source.seo ? { seo: normalizeSeo(source.seo, fixture) } : {}), ownership: ownership(fixture) };
  if (fixture._type === "person") return { kind: "person", name: source.name, ...(source.role ? { role: source.role } : {}), profileType: source.profileType, ...(source.bio ? { bio: textBlocks(source.bio, fixture._id, "bio") } : {}), expertise: (Array.isArray(source.expertise) ? source.expertise : []).flatMap((item) => boundedParts(item, 100)), ownership: ownership(fixture) };
  if (fixture._type === "organization") return { kind: "organization", name: source.name, ...(source.organizationType ? { organizationType: source.organizationType } : {}), ...(source.description ? { description: textBlocks(source.description, fixture._id, "description") } : {}), ...(source.website ? { website: source.website } : {}), capabilities: (Array.isArray(source.capabilities) ? source.capabilities : []).flatMap((item) => boundedParts(item, 160)), ownership: ownership(fixture) };
  if (fixture._type === "navigation") return {
    kind: "navigation",
    content: {
      placement: source.placement,
      items: normalizeValue(source.items),
    },
    ownership: ownership(fixture),
  };
  return { kind: fixture._type, content: normalizeValue(source), ownership: ownership(fixture) };
}
function normalizeSeo(value: unknown, fixture: Document) {
  const source = plain(value); const result: Record<string, unknown> = { noIndex: false };
  for (const key of ["metaTitle", "metaDescription", "canonicalUrl", "structuredDataType"]) if (typeof source[key] === "string") result[key] = source[key];
  if (source.openGraphImage) result.openGraphImage = stableRef(source.openGraphImage, fixture._id, "seo.openGraphImage");
  return result;
}
function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (!value || typeof value !== "object") return value;
  const object = plain(value);
  if (typeof object._ref === "string") return { id: object._ref };
  return Object.fromEntries(Object.entries(object).filter(([key]) => !key.startsWith("_")).map(([key, child]) => [key, normalizeValue(child)]));
}

async function main() {
  const pageDocuments = documents.filter((document) => document._type === "page");
  for (const page of pageDocuments) {
    const slug = (page.slug as { current?: unknown } | undefined)?.current;
    const canonical = (page.marketEditions as { _key?: unknown; sections?: unknown[] }[] | undefined)?.find((edition) => edition._key === "uae");
    const sections = canonical?.sections ?? [];
    if (typeof slug !== "string" || !routeCopy[slug]) throw new Error(`Page ${page._id} has no route-specific approved source fixture`);
    if (sections.length < 4) throw new Error(`Page ${page._id} must contain multiple meaningful route-specific sections`);
    const meaningfulHeadings = new Set(sections.map((section) => (section as { heading?: unknown }).heading).filter((heading): heading is string => typeof heading === "string" && heading.trim().length > 0));
    if (meaningfulHeadings.size < 3) throw new Error(`Page ${page._id} is a generic summary-only fixture`);
    const hero = sections[0] as { _type?: unknown; body?: { children?: { text?: unknown }[] }[] };
    const heroText = hero.body?.flatMap((item) => item.children ?? []).map((child) => child.text).filter((text): text is string => typeof text === "string").join(" ") ?? "";
    if (hero._type !== "heroSection" || heroText.trim().length < 40) {
      throw new Error(`Page ${page._id} is a generic summary-only fixture`);
    }
    if (["contact", "value-scan"].includes(slug)) {
      const formSlots = sections.filter((section) => (section as { _type?: unknown })._type === "formSlotSection");
      if (formSlots.length !== 1 || sections.length < 4) throw new Error(`Page ${page._id} must include surrounding content and exactly one formSlot`);
    }
  }
  for (const source of publications) {
    const publication = documents.find((document) => document._id === `publication-${source.slug}`);
    const canonical = (publication?.marketEditions as { _key?: unknown; body?: unknown[] }[] | undefined)?.find((edition) => edition._key === "uae");
    const body = canonical?.body ?? [];
    const headings = body.filter((item) => (item as { style?: unknown }).style === "h3");
    if (!publication || body.length !== source.body.length || body.length < 7 || headings.length === 0) {
      throw new Error(`Publication ${source.slug} must retain its complete canonical article body and section headings`);
    }
    if (publication.publishedAt !== source.date || publication.readingMinutes !== source.readingMinutes ||
      (publication.media as { _ref?: unknown } | undefined)?._ref !== `media-publication-${source.slug}`) {
      throw new Error(`Publication ${source.slug} must retain its date, reading time, author, and hero metadata`);
    }
    const author = (publication.authors as { _ref?: unknown }[] | undefined)?.[0]?._ref;
    if (author !== `person-author-${source.author.toLowerCase().replaceAll(" ", "-")}`) {
      throw new Error(`Publication ${source.slug} must retain its source author`);
    }
  }
  for (const [slug, expectedReferences] of Object.entries(collectionReferences)) {
    const page = pageDocuments.find((document) => (document.slug as { current?: unknown } | undefined)?.current === slug);
    const canonical = (page?.marketEditions as { _key?: unknown; sections?: Record<string, unknown>[] }[] | undefined)?.find((edition) => edition._key === "uae");
    const sections = canonical?.sections ?? [];
    const grids = sections.filter((section) => section._type === "referenceGridSection");
    const timelines = sections.filter((section) => section._type === "timelineSection");
    const references = (grids[0]?.items as { _ref?: unknown }[] | undefined)?.map((item) => item._ref);
    if (grids.length !== 1 || timelines.length !== 0 || JSON.stringify(references) !== JSON.stringify(expectedReferences)) {
      throw new Error(`Page ${slug} must retain one ordered CMS reference collection and no inline collection timeline`);
    }
    if (expectedReferences.some((id) => !documents.some((document) => document._id === id))) {
      throw new Error(`Page ${slug} contains a missing structured collection reference`);
    }
  }
  const counts = { documentsCreated: 0, documentsUpdated: 0, editionsCreated: 0, editionsUpdated: 0, revisionsCreated: 0, revisionsUnchanged: 0, mediaCreated: 0, mediaUpdated: 0, redirectsCreated: 0, redirectsUpdated: 0 };
  const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const slugOf = (document: Document) => {
    const slug = document.slug;
    return typeof slug === "object" && slug && !Array.isArray(slug) && typeof (slug as { current?: unknown }).current === "string"
      ? (slug as { current: string }).current : null;
  };
  const ownerOf = (document: Document) => {
    const ownership = document.ownership;
    return typeof ownership === "object" && ownership && !Array.isArray(ownership) &&
      typeof (ownership as { owner?: { _ref?: unknown } }).owner?._ref === "string"
      ? (ownership as { owner: { _ref: string } }).owner._ref : "person-editorial-owner";
  };
  await db.transaction(async (tx) => {
    const seededRevisionReferences: Array<{ revisionId: string; content: unknown }> = [];
    for (const fixture of documents) {
      if (fixture._type === "market") continue;
      if (fixture._type === "redirect") {
        const marketRef = fixture.market as { _ref?: unknown } | undefined;
        const market = typeof marketRef?._ref === "string" ? marketRef._ref.replace(/^market-/, "") : null;
        const existing = await tx.select({ id: cmsRedirectsTable.id }).from(cmsRedirectsTable).where(eq(cmsRedirectsTable.id, fixture._id)).limit(1);
        await tx.insert(cmsRedirectsTable).values({ id: fixture._id, market, sourcePath: fixture.sourcePath as string, destinationPath: fixture.destinationPath as string, statusCode: fixture.statusCode as number, active: false, state: "draft" }).onConflictDoUpdate({
          target: cmsRedirectsTable.id,
          set: { market, sourcePath: fixture.sourcePath as string, destinationPath: fixture.destinationPath as string, statusCode: fixture.statusCode as number, active: false, state: "draft" },
        });
        existing.length ? counts.redirectsUpdated++ : counts.redirectsCreated++;
        continue;
      }
      if (fixture._type === "mediaAsset") {
        const existing = await tx.select({ id: cmsMediaAssetsTable.id }).from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, fixture._id)).limit(1);
        await tx.insert(cmsMediaAssetsTable).values({ id: fixture._id, kind: fixture.kind as string, title: fixture.title as string, altText: fixture.altText as string | undefined, decorative: fixture.decorative as boolean | undefined, rightsOwner: fixture.rightsOwner as string | undefined, lifecycleState: "draft", createdByPrincipalId: "person-editorial-owner" }).onConflictDoUpdate({
          target: cmsMediaAssetsTable.id, set: { kind: fixture.kind as string, title: fixture.title as string, altText: fixture.altText as string | undefined, decorative: fixture.decorative as boolean | undefined, rightsOwner: fixture.rightsOwner as string | undefined, lifecycleState: "draft" },
        });
        const externalUrl = fixture.externalUrl as string | undefined;
        if (externalUrl) await tx.insert(cmsMediaVersionsTable).values({ mediaId: fixture._id, version: 1, externalUrl, createdByPrincipalId: "person-editorial-owner" }).onConflictDoNothing();
        existing.length ? counts.mediaUpdated++ : counts.mediaCreated++;
        continue;
      }
      const canonicalSlug = slugOf(fixture);
      const existingDocument = await tx.select({ id: cmsDocumentsTable.id }).from(cmsDocumentsTable).where(eq(cmsDocumentsTable.id, fixture._id)).limit(1);
      await tx.insert(cmsDocumentsTable).values({ id: fixture._id, kind: fixture._type, canonicalSlug, routeKind: typeof fixture.routeKind === "string" ? fixture.routeKind : null, ownerId: ownerOf(fixture), contentClass: "public" }).onConflictDoUpdate({
        target: cmsDocumentsTable.id, set: { kind: fixture._type, canonicalSlug, routeKind: typeof fixture.routeKind === "string" ? fixture.routeKind : null, ownerId: ownerOf(fixture), contentClass: "public" },
      });
      existingDocument.length ? counts.documentsUpdated++ : counts.documentsCreated++;
      for (const market of markets) {
        const fallbackMode = market.code === "uae" ? "canonical" : "uaeFallback";
        const candidate = { schemaVersion: 1 as const, documentId: fixture._id, market: market.code, fallbackMode, content: normalizedContent(fixture, market.code) };
        const checked = cmsEditionPayloadSchema.safeParse(candidate);
        if (!checked.success) {
          const issue = checked.error.issues[0];
          throw new Error(`Fixture ${fixture._id} normalization failed at ${issue?.path.join(".") ?? "payload"}: ${issue?.message ?? "invalid payload"}`);
        }
        const payload = checked.data;
        const contentDigest = digest(payload);
        let [edition] = await tx.select().from(cmsMarketEditionsTable).where(and(eq(cmsMarketEditionsTable.documentId, fixture._id), eq(cmsMarketEditionsTable.market, market.code))).limit(1);
        if (!edition) {
          [edition] = await tx.insert(cmsMarketEditionsTable).values({ documentId: fixture._id, market: market.code, fallbackMode, publicationState: "draft", localizedSlug: canonicalSlug, parityComplete: false }).returning();
          counts.editionsCreated++;
        } else {
          await tx.update(cmsMarketEditionsTable).set({ fallbackMode, publicationState: "draft", localizedSlug: canonicalSlug, parityComplete: false, liveRevisionId: null }).where(eq(cmsMarketEditionsTable.id, edition.id));
          counts.editionsUpdated++;
        }
        const [draft] = edition!.draftRevisionId ? await tx.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, edition!.draftRevisionId)).limit(1) : [];
        if (draft?.contentDigest === contentDigest) {
          counts.revisionsUnchanged++;
          seededRevisionReferences.push({ revisionId: draft.id, content: payload.content });
          continue;
        }
        const number = draft ? draft.revisionNumber + 1 : 1;
        const [revision] = await tx.insert(cmsRevisionsTable).values({ editionId: edition!.id, revisionNumber: number, payloadVersion: 1, payload, contentDigest, createdByPrincipalId: "person-editorial-owner", reason: "cognirise-cms-seed" }).returning();
        await tx.update(cmsMarketEditionsTable).set({ draftRevisionId: revision!.id, version: edition!.version + (draft ? 1 : 0), publicationState: "draft", liveRevisionId: null }).where(eq(cmsMarketEditionsTable.id, edition!.id));
        seededRevisionReferences.push({ revisionId: revision!.id, content: payload.content });
        counts.revisionsCreated++;
      }
    }
    const referencesByRevision = seededRevisionReferences.map((revision) => ({
      ...revision,
      references: mediaReferences(revision.content),
    }));
    const referencedMediaIds = [...new Set(referencesByRevision.flatMap((revision) =>
      revision.references.map((reference) => reference.mediaId)))];
    const mediaVersions = referencedMediaIds.length
      ? await tx.select({
        mediaId: cmsMediaVersionsTable.mediaId,
        version: cmsMediaVersionsTable.version,
      }).from(cmsMediaVersionsTable)
        .where(inArray(cmsMediaVersionsTable.mediaId, referencedMediaIds))
        .orderBy(desc(cmsMediaVersionsTable.version))
      : [];
    const selectedVersions = new Map<string, number>();
    for (const version of mediaVersions) {
      if (!selectedVersions.has(version.mediaId)) selectedVersions.set(version.mediaId, version.version);
    }
    for (const revision of referencesByRevision) {
      const references = revision.references;
      await tx.delete(cmsMediaReferencesTable).where(eq(cmsMediaReferencesTable.revisionId, revision.revisionId));
      if (references.length) {
        if (references.some((reference) => !selectedVersions.has(reference.mediaId))) {
          throw new Error(`Seed revision ${revision.revisionId} references media without a concrete version`);
        }
        await tx.insert(cmsMediaReferencesTable).values(
          references.map((reference) => ({
            ...reference,
            mediaVersion: selectedVersions.get(reference.mediaId)!,
            revisionId: revision.revisionId,
          })),
        );
      }
    }
  });
  process.stdout.write(`${JSON.stringify({ seed: "cognirise-cms-postgres", ...counts })}\n`);
}

void main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "CMS migration failed"}\n`);
    process.exitCode = 1;
  });