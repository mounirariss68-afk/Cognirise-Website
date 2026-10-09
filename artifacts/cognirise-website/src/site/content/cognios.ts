import type { Cta, PageMeta } from "./types";

export const COGNIOS_META: PageMeta = {
  title: "CogniOS | Cognirise",
  description:
    "CogniOS approves, runs and monitors every AI agent and model you have, on your own infrastructure. One registry, one approval path, one view of cost.",
};

export const COGNIOS_HERO = {
  kicker: "CogniOS",
  title: "One platform for every AI agent you run.",
  lead: "CogniOS approves, runs and monitors every agent and model you have, on your own infrastructure. One registry, one approval path, one view of cost.",
  primary: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
  secondary: { label: "See a demo", href: "/value-scan?area=run#book" } as Cta,
  media: {
    mp4: "/media/platforms/cognios-rotation.mp4",
    webm: "/media/platforms/cognios-rotation.webm",
    poster: "/media/platforms/cognios-rotation-poster.jpg",
    fallback: "/media/platforms/cognios-rotation-fallback.jpg",
    alt: "The CogniOS control surface: a registry of agents with their status, cost and approvals.",
  },
};

export const COGNIOS_PROBLEM = {
  heading: "The first AI agent is easy. The twentieth is where it breaks down.",
  paragraphs: [
    "Agents get built in silos with no shared inventory, no owner and no approval trail. Nobody can say which agents are running, what they cost or whether they still perform. Models sit on scattered servers without monitoring. Every new use case starts from scratch.",
    "CogniOS gives AI the same discipline you expect from any other system you run.",
  ],
};

export const COGNIOS_CAPABILITIES = {
  heading: "What it does",
  items: [
    { title: "Lifecycle control", body: "Every agent moves through design, review, approval, deployment, monitoring and retirement. Versioning, role-based sign-off and a central registry mean you always know what is running, who owns it and why it was approved." },
    { title: "Performance management", body: "Each agent is tracked against business measures, answer quality, task completion, latency and cost per run. Built-in evaluation catches regressions before users do." },
    { title: "Scheduling and orchestration", body: "Workflows run on a schedule, on an event or on demand. Queues, retries, dependencies between agents and hand-offs to a person are handled for you." },
    { title: "Models on your infrastructure", body: "Serve, version and monitor models on your own hardware or private cloud: a model registry, GPU scheduling, open-weight models, fine-tuning and evaluation runs." },
    { title: "New applications from existing parts", body: "Combine a knowledge source, agent workflows and an interface template into a new application. Configured, not coded from zero." },
    { title: "Control and audit", body: "Central policies set which data, tools and actions each agent may use. Full audit trails, a risk class per use case and an instant kill switch." },
  ],
};

export const COGNIOS_LIFECYCLE = {
  heading: "The agent lifecycle",
  steps: [
    { name: "Design", body: "Define the workflow, data sources, tools and human checkpoints, from a template or from scratch" },
    { name: "Approve", body: "Risk owners review scope, data access and risk class before anything goes live" },
    { name: "Deploy", body: "Release to a schedule, an event or an interface, with version control and roll-back" },
    { name: "Monitor", body: "Track quality, cost, usage and business measures, with alerts on drift or failure" },
    { name: "Improve", body: "Evaluate changes against test sets, then promote new versions with a full record" },
    { name: "Retire", body: "Decommission agents cleanly, with their history kept for audit" },
  ],
};

export type PlatformLayer = { name: string; line: string; components: string[] };

export const COGNIOS_LAYERS = {
  heading: "One platform, three layers",
  layers: [
    {
      name: "CogniBase",
      line: "connects AI to your documents, data and systems and returns cited answers.",
      components: ["Connector library", "API gateway", "Corpus management", "Chunking and indexing", "Retrieval and citation pipeline", "Ontology and master data"],
    },
    {
      name: "CogniAgents",
      line: "are ready-made workflows for business functions, with the controls built in.",
      components: ["Orchestrator", "Specialist agent roster", "Workflow engine", "Approval and delegation", "Prepared-action executor", "Proactive monitors"],
    },
    {
      name: "CogniOS",
      line: "approves, runs, monitors and scales them, and turns them into new applications.",
      components: ["Policy and authority registry", "AI registry and evaluation", "Model gateway", "Guardrails runtime", "Audit and evidence", "Observability and model operations", "Cost stewardship", "Identity, roles and security boundaries"],
    },
  ] as PlatformLayer[],
  engines: "Two engines plug in underneath: CogniDocs reads documents and turns them into structured, cited data; CogniTalk handles voice, chat and WhatsApp in Arabic dialects and English. Start with any layer. CogniOS brings them together as your estate grows.",
  /** Opens the existing interactive reference architecture (34 components) on the page. */
  link: { label: "Show the full reference architecture", href: "#architecture" } as Cta,
};

export const COGNIOS_AUDIENCE = {
  heading: "Who it is for",
  items: [
    { title: "CIOs and CTOs", body: "get one view of every AI system in the organisation, with its cost and value." },
    { title: "Risk and compliance teams", body: "get approvals, risk classes and audit trails in one place." },
    { title: "AI and platform teams", body: "get model serving, scheduling and monitoring without stitching tools together." },
    { title: "Business owners", body: "get new AI use cases faster, built on parts that are already proven." },
  ],
};

export const COGNIOS_DEPLOYMENT = {
  heading: "Where it runs",
  items: [
    { title: "On-premises", body: "Fully isolated, with models on your own GPUs." },
    { title: "Private cloud", body: "Deployed into your own cloud tenant." },
    { title: "Managed cloud", body: "Operated for you in European or Gulf regions." },
  ],
};

export const COGNIOS_FAQ = {
  heading: "Questions we are asked",
  items: [
    { q: "Do we need CogniBase and CogniAgents to use CogniOS?", a: "No. CogniOS can control and monitor agents you already have. It does most with the full stack." },
    { q: "Which models can we run?", a: "Open-weight models on your own hardware, commercial models by API, or both, all in one registry." },
    { q: "How does it help with the EU AI Act?", a: "With an agent inventory, risk classes, human oversight controls, logging and documentation for every use case. It supports your obligations; it does not replace your compliance process." },
    { q: "What does building a new application from parts mean?", a: "You combine a knowledge source, one or more agent workflows and an interface template into a new application. Configured, not coded from zero." },
  ],
};

export const COGNIOS_CLOSING = {
  heading: "See it on your own process",
  body: "Bring one workflow you want to run under control. In a Value Scan we map it, and in a demo we show it running on CogniOS.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
  secondary: { label: "See a demo", href: "/value-scan?area=run#book" } as Cta,
};
