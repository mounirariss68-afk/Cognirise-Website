import type { Cta, Hero, PageMeta } from "./types";

export const METHODS_META: PageMeta = {
  title: "Methods | Cognirise",
  description:
    "The long reads behind how we work and four self-assessment tools: IDAO, the Agent Authority Model, the operating model, guardrails and Value-to-Scale.",
};

export const METHODS_HERO: Hero = {
  title: "Methods",
  lead: "The long reads behind how we work, and four tools you can use without talking to us. Nothing you enter leaves your browser.",
  primary: { label: "Book a Value Scan", href: "/value-scan" },
  secondary: { label: "See how we work", href: "/how-we-work" },
  image: { src: "/images/cognirise/method-overview.jpg", alt: "The four steps and the methods behind them, laid out on a wall." },
};

export type MethodArticle = { title: string; body: string; minutes: number; href: string };

export const METHODS_ARTICLES: { heading: string; items: MethodArticle[] } = {
  heading: "Points of view",
  items: [
    { title: "Guardrails are not an authority model.", body: "Why a content filter does not decide what an agent may do, and how to set that limit for each task you give an agent.", minutes: 12, href: "/methodologies/agent-authority-model" },
    { title: "Set, Prove and Hold.", body: "How to write a rule an AI must follow so that it can be tested, and where in the stack to enforce it.", minutes: 6, href: "/methodologies/guardrails-framework" },
    { title: "IDAO in full.", body: "The four steps we work in, with the proof each step needs before the next one starts.", minutes: 8, href: "/methodologies/idao" },
    { title: "Redesign the work, not just the technology.", body: "How roles, decision rights and hand-offs change when agents join the work.", minutes: 5, href: "/methodologies/human-agent-operating-model" },
    { title: "Value-to-Scale.", body: "Seven conditions for taking AI from a pilot into daily use, again and again.", minutes: 7, href: "/methodologies/ai-value-to-scale" },
  ],
};

export type MethodTool = { name: string; asks: string; gives: string; time: string; href: string };

export const METHODS_TOOLS: { heading: string; columns: string[]; items: MethodTool[]; note: string } = {
  heading: "Four tools you can use now",
  columns: ["Tool", "What it asks", "What you get", "Time"],
  items: [
    { name: "Agent authority calculator", asks: "Six questions about one task you want to give an agent: what it is, how hard a mistake is to undo, who is affected", gives: "The most authority that agent may hold on its own, and a one-page control brief as a PDF", time: "10 minutes", href: "/methodologies/agent-authority-model#calculator" },
    { name: "Use-case prioritisation", asks: "Score each candidate on value, feasibility, time to proof, friction, control cost and reuse", gives: "A suggested order and the ideas to stop, as a PDF", time: "15 minutes", href: "/methodologies/ai-use-case-prioritization" },
    { name: "Value-to-Scale assessment", asks: "Seven questions about how your organisation chooses, builds, runs and measures AI", gives: "A profile of where you stand and the weakest condition to fix first", time: "15 minutes", href: "/methodologies/ai-value-to-scale" },
    { name: "Operations readiness check", asks: "Six conditions one workflow must meet before an agent runs it", gives: "Proceed, Prepare or Stop, with the gaps and their owners, as a PDF", time: "10 minutes", href: "/methodologies/agentic-operations-readiness" },
  ],
  note: "Your answers stay in the page. Reloading or leaving clears them. Nothing is sent to us.",
};

export const METHODS_CLOSING = {
  heading: "Bring us the hard case",
  body: "If a tool gives you a Stop, a Prepare or a ceiling you did not expect, that is the conversation worth having.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
};
