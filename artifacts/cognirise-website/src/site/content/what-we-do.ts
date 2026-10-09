import type { CaseCard, Cta, Hero, PageMeta } from "./types";

export const WHAT_WE_DO_META: PageMeta = {
  title: "What we do | Cognirise",
  description:
    "Three things: we advise on where AI pays off, we build the system with your team, and we give you the platform to run it. Five service lines underneath.",
};

export const WHAT_WE_DO_HERO: Hero = {
  title: "What we do",
  lead: "Three things. We advise on where AI pays off, we build the system with your team, and we give you the platform to run it.",
  primary: { label: "Book a Value Scan", href: "/value-scan" },
  secondary: { label: "See how we work", href: "/how-we-work" },
  image: { src: "/images/cognirise/site-services.jpg", alt: "Cognirise advisers and engineers working with a client team." },
};

export type ServiceLine = {
  /** Anchor id of the service line, also used by the old /what-we-do/* redirects. */
  id: string;
  heading: string;
  officialName: string;
  body: string;
  bullets: string[];
  example: CaseCard;
};

export type ServiceGroup = {
  id: "advise" | "build" | "run";
  heading: string;
  lines: ServiceLine[];
};

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    id: "advise",
    heading: "Advise",
    lines: [
      {
        id: "agentic-enterprise-transformation",
        heading: "Decide where AI pays off, and change how the work runs",
        officialName: "Agentic Enterprise Transformation",
        body: "We work with your leadership team to find the processes where AI will pay for itself, and in what order. Then we work out what must change for it to stick. The result: a roadmap with owners, a business case per process, and the controls to run it.",
        bullets: [
          "An AI strategy and roadmap, with a business case for each process",
          "A ranked list of use cases, scored on value, feasibility and risk",
          "The operating model: who decides, who approves, and how roles change",
        ],
        example: {
          title: "A national infrastructure authority.",
          body: "Several agents read tender material, map the work streams and pause at defined decision points for an official to approve.",
          tag: "Client result",
        },
      },
    ],
  },
  {
    id: "build",
    heading: "Build",
    lines: [
      {
        id: "data-ai-foundations",
        heading: "Get your data, systems and controls ready",
        officialName: "Data & AI Foundations",
        body: "AI is only as good as what it can reach. We connect it to your documents, data and systems with the right permissions, and build the architecture that keeps it secure and auditable.",
        bullets: [
          "An audit of your data and systems: what AI can use, what it cannot, and why",
          "Pipelines, knowledge bases and interfaces built for production use",
          "Access controls, audit trails and data residency designed in from the start",
        ],
        example: {
          title: "An industrial materials producer.",
          body: "A bilingual assistant searches the approved technical library and returns a sourced answer. Questions it cannot answer go to a process engineer.",
          tag: "Client result",
        },
      },
      {
        id: "engineering-with-ai",
        heading: "Build the system: a prototype in 48 hours, production in weeks",
        officialName: "Engineering with AI",
        body: "Our engineers work inside your team. They build the prototype you test in 48 hours, then the working system, then the monitoring and handover that let your own people run it.",
        bullets: [
          "A working prototype in 48 hours",
          "A production system in 2 to 4 weeks, connected to your platforms",
          "Code, tests, documentation and training, handed over to your team",
        ],
        example: {
          title: "A leasing company.",
          body: "Quotes and credit work that took three days now take minutes. Every decision is logged against the rule set that produced it.",
          tag: "Client result",
        },
      },
    ],
  },
  {
    id: "run",
    heading: "Run",
    lines: [
      {
        id: "sovereign-regulated-ai",
        heading: "Run AI on your own infrastructure, inside your rules",
        officialName: "Sovereign & Regulated AI",
        body: "Banks, governments and regulated companies cannot send their data to someone else's cloud. We run the models on your hardware or in your private cloud, with the controls your regulator expects.",
        bullets: [
          "Deployment on-premises, in a private cloud or in a sovereign cloud",
          "Model choice: open-weight models on your hardware, commercial models by API, or both",
          "Audit trails, approval gates and a kill switch for every agent",
        ],
        example: {
          title: "A state bank.",
          body: "A voice workflow for routine calls runs on the bank's own servers. Every call is resolved or routed, with an outcome code.",
          tag: "Client result",
        },
      },
      {
        id: "digital-ai-workforce",
        heading: "Put agents to work in customer and back-office processes",
        officialName: "Digital & AI Workforce",
        body: "Agents that do tasks, not just answer questions. They read the case, gather the evidence, propose the action and hand it to a person to approve. Then they take the next case.",
        bullets: [
          "Agents for service, sales, billing, finance and HR processes",
          "Voice agents in Arabic dialects and English, with a hand-off to a person",
          "One registry of every agent: what it may do, who approved it, how it performs",
        ],
        example: {
          title: "A pharmaceutical sales organisation.",
          body: "A field-coaching platform captures visit notes, structures the feedback and queues it for a manager to review before it goes out.",
          tag: "Client result",
        },
      },
    ],
  },
];

export const WHAT_WE_DO_PLATFORM = {
  heading: "The platform",
  body: "Everything we build can run on CogniOS, our platform for approving, running and monitoring agents on your own infrastructure. It also works with agents you already have.",
  link: { label: "See CogniOS", href: "/platforms/cognios" } as Cta,
};

export const WHAT_WE_DO_CLOSING = {
  heading: "Start with one process",
  body: "In a one-day Value Scan we map the process, the people who decide, the data it needs and the result you would measure. You leave with a business case.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
};
