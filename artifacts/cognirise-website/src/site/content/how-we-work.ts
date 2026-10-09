import type { Cta, Hero, PageMeta } from "./types";

export const HOW_WE_WORK_META: PageMeta = {
  title: "How we work | Cognirise",
  description:
    "Four steps from a question to a system your team runs: Innovate, Demonstrate, Activate, Operate. What we do, what you do, how long it takes.",
};

export const HOW_WE_WORK_HERO: Hero = {
  title: "How we work",
  lead: "Four steps from a question to a system your team runs. A person approves every step that matters, and you own what we build.",
  primary: { label: "Book a Value Scan", href: "/value-scan" },
  secondary: { label: "See case studies", href: "/case-studies" },
  image: { src: "/images/cognirise/methodologies-pulse-hero-poster.jpg", alt: "A Cognirise and client team working through the four steps on a wall of cards." },
};

export const HOW_WE_WORK_STEPS = {
  heading: "The four steps",
  afterTable: [
    "The loop stays open. What we learn in Operate can send a weak assumption back to Demonstrate, or open the next process.",
    "The timings are for one process, with data access and decision-makers in place. Integration, approvals and data quality decide the rest, and we say so on day one.",
  ],
};

export const HOW_WE_WORK_NEEDS = {
  heading: "What we need from you",
  items: [
    "A process with a known problem and a measurable starting point",
    "The person who decides, and access to the people who do the work",
    "Access to the data and systems, under your rules",
  ],
};

export const HOW_WE_WORK_RULES = {
  heading: "The rules we keep",
  items: [
    "A person approves every action that costs money or affects a customer.",
    "You own the code, the data and the documentation.",
    "It runs where you say: your servers, your cloud, or ours.",
    "Results are measured against your starting point, not ours.",
    "No long pilots. A prototype in 48 hours, then a decision.",
  ],
};

export const HOW_WE_WORK_SITUATIONS = {
  heading: "Start with your situation",
  columns: ["Your situation", "What we do first", "What you get"],
  rows: [
    ["We need to know where AI is worth investing.", "A Value Scan on your top candidate processes.", "A ranked list, with a business case for the first one."],
    ["We have several AI ideas and need to choose.", "Score them together on value, feasibility, time to proof, friction, control cost and reuse.", "An order, and the ideas to stop."],
    ["We have an AI strategy and need to deliver it.", "Pick the first process and enter the four steps at the stage the facts allow.", "A first delivery with an owner and a date."],
    ["We need to improve one process.", "Map the process and test whether AI helps, or whether the process itself has to change.", "A prototype, or a reason not to build one."],
    ["We have a pilot and need to put it into daily use.", "Run the readiness check, fix what it finds, then Activate.", "A system in daily use, with named owners."],
    ["AI works in one area and we need to expand it.", "Check what transfers to the new context and what changes; re-test what does not.", "An expansion plan with its dependencies."],
    ["Our AI is in use but the results fall short.", "Measure against the starting point. Find the cause in the data, the process, the people or the model.", "A fix, a redesign, or a decision to stop."],
  ],
};

export type MethodEntry = { name: string; body: string; link: Cta; minutes?: number };

export const METHODS: MethodEntry[] = [
  {
    name: "IDAO",
    body: "The four steps above in full, with the proof each step needs before the next one starts.",
    link: { label: "Read the method", href: "/methodologies/idao" },
    minutes: 8,
  },
  {
    name: "Agent Authority Model",
    body: "A way to set how much an agent may do on its own, based on how hard a mistake is to undo and who it affects. With a calculator you can use.",
    link: { label: "Use the calculator", href: "/methodologies/agent-authority-model" },
    minutes: 12,
  },
  {
    name: "Human–Agent Operating Model",
    body: "How roles, decision rights and hand-offs change when agents join the work.",
    link: { label: "Read the playbook", href: "/methodologies/human-agent-operating-model" },
    minutes: 5,
  },
  {
    name: "Use-case prioritisation",
    body: "Score candidate use cases on six dimensions and get a suggested order. A tool you can run yourself.",
    link: { label: "Use the tool", href: "/methodologies/ai-use-case-prioritization" },
  },
  {
    name: "Value-to-Scale",
    body: "A seven-point check of whether your organisation can take AI from a pilot into daily use, again and again.",
    link: { label: "Take the assessment", href: "/methodologies/ai-value-to-scale" },
    minutes: 7,
  },
  {
    name: "Operations readiness",
    body: "Six conditions a workflow must meet before an agent runs it. The answer is Proceed, Prepare or Stop.",
    link: { label: "Run the check", href: "/methodologies/agentic-operations-readiness" },
  },
  {
    name: "Guardrails: Set, Prove and Hold",
    body: "How to write a rule an AI must follow so that it can be tested, and where to enforce it.",
    link: { label: "Read the framework", href: "/methodologies/guardrails-framework" },
    minutes: 6,
  },
];

export const HOW_WE_WORK_METHODS = {
  heading: "Our methods",
};

export const HOW_WE_WORK_CLOSING = {
  heading: "The first step is a Value Scan",
  body: "One day with your team on one process. You leave with the opportunity, the constraints, the data it needs and a business case.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
};
