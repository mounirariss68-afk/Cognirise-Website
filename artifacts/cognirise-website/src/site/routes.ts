import type { PageMeta } from "@/site/content/types";
import { HOME_META } from "@/site/content/home";
import { WHAT_WE_DO_META } from "@/site/content/what-we-do";
import { HOW_WE_WORK_META } from "@/site/content/how-we-work";
import { INDUSTRIES_META } from "@/site/content/industries-hub";
import { INDUSTRY_PAGES } from "@/site/content/industries";
import { PUBLIC_SECTOR_META } from "@/site/content/public-sector";
import { COGNIOS_META } from "@/site/content/cognios";
import { CASE_STUDIES_META } from "@/site/content/case-studies";
import { METHODS_META } from "@/site/content/methods";
import { ABOUT_META } from "@/site/content/about";
import { VALUE_SCAN_META } from "@/site/content/value-scan";
import { PRIVACY_META, NOT_FOUND } from "@/site/content/legal";

/** Browser title and description for every public page, by path. */
export const PAGE_META: Record<string, PageMeta> = {
  "/": HOME_META,
  "/what-we-do": WHAT_WE_DO_META,
  "/how-we-work": HOW_WE_WORK_META,
  "/industries": INDUSTRIES_META,
  ...Object.fromEntries(INDUSTRY_PAGES.map((page) => [page.path, page.meta])),
  "/industries/public-sector": PUBLIC_SECTOR_META,
  "/industries/public-sector/point-of-view": {
    title: "The AI-native government | Cognirise",
    description: "What changes when the state takes the first step: the test, six elements, what each market has built, and six priorities for a programme. Four editions.",
  },
  "/platforms/cognios": COGNIOS_META,
  "/case-studies": CASE_STUDIES_META,
  "/methodologies": METHODS_META,
  "/methodologies/agent-authority-model": {
    title: "Guardrails are not an authority model | Cognirise",
    description: "How much may an agent do on its own? A content filter does not answer that. The Agent Authority Model does, one task at a time, with a calculator.",
  },
  "/methodologies/guardrails-framework": {
    title: "Set, Prove and Hold | Cognirise",
    description: "How to write a rule an AI system must follow so that it can be tested, where in the stack to enforce it, and how to show that it held.",
  },
  "/methodologies/idao": {
    title: "IDAO: the four steps | Cognirise",
    description: "Innovate, Demonstrate, Activate, Operate: the four steps from a question to a system your team runs, with the proof each step needs before the next.",
  },
  "/methodologies/human-agent-operating-model": {
    title: "Redesign the work, not just the technology | Cognirise",
    description: "How roles, decision rights and hand-offs change when agents join the work, and how to write that down before the first agent goes live.",
  },
  "/methodologies/ai-value-to-scale": {
    title: "Value-to-Scale | Cognirise",
    description: "Seven conditions for taking AI from a pilot into daily use, again and again, and an assessment that shows which one to fix first.",
  },
  "/methodologies/ai-use-case-prioritization": {
    title: "Use-case prioritisation | Cognirise",
    description: "Score each candidate use case on value, feasibility, time to proof, friction, control cost and reuse, and get a suggested order as a PDF.",
  },
  "/methodologies/agentic-operations-readiness": {
    title: "Operations readiness check | Cognirise",
    description: "Six conditions one workflow must meet before an agent runs it. The answer is Proceed, Prepare or Stop, with the gaps and their owners, as a PDF.",
  },
  "/about": ABOUT_META,
  "/about/core-values": {
    title: "Core values | Cognirise",
    description: "Two values the founders have held for decades, what each means in practice, and what a client can hold Cognirise to.",
  },
  "/value-scan": VALUE_SCAN_META,
  "/privacy": PRIVACY_META,
};

export const NOT_FOUND_META: PageMeta = { title: NOT_FOUND.title, description: "" };

/** Paths that appear in the sitemap and the JSON-LD item list. */
export const PUBLIC_PATHS = Object.keys(PAGE_META);

/**
 * Old addresses and where they go. The query string is kept, so market views
 * survive a redirect. Anything not listed here or in PAGE_META is a 404.
 */
export const REDIRECTS: Record<string, string> = {
  "/what-we-do/agentic-enterprise-transformation": "/what-we-do#agentic-enterprise-transformation",
  "/what-we-do/data-ai-foundations": "/what-we-do#data-ai-foundations",
  "/what-we-do/engineering-with-ai": "/what-we-do#engineering-with-ai",
  "/what-we-do/sovereign-regulated-ai": "/what-we-do#sovereign-regulated-ai",
  "/what-we-do/digital-ai-workforce": "/what-we-do#digital-ai-workforce",
  "/services": "/what-we-do",
  "/sectors": "/industries",
  "/industries/banking": "/industries/financial-services",
  "/industries/government": "/industries/public-sector",
  "/industries/energy": "/industries/energy-resources",
  "/industries/travel": "/industries/travel-hospitality",
  "/pov-banking": "/industries/financial-services",
  "/pov-telecoms": "/industries/telecoms",
  "/pov-government": "/industries/public-sector",
  "/pov-public-sector": "/industries/public-sector",
  "/pov-energy": "/industries/energy-resources",
  "/pov-travel": "/industries/travel-hospitality",
  "/pov-manufacturing": "/industries/manufacturing",
  "/contact": "/about#contact",
  "/who": "/about",
  "/faq": "/about",
  "/partners": "/about",
  "/platforms": "/platforms/cognios",
  "/platforms/cognibase": "/platforms/cognios",
  "/platforms/cogniagents": "/platforms/cognios",
  "/platforms/cognidocs": "/platforms/cognios",
  "/platforms/cognitalk": "/platforms/cognios",
  "/platforms/cogniware": "/platforms/cognios",
  "/platforms/lupitor": "/platforms/cognios",
  "/platforms/datatoolpack": "/platforms/cognios",
  "/platforms/bunjee-ai": "/platforms/cognios",
  "/platforms/cognios/architecture": "/platforms/cognios#architecture",
  "/architecture": "/platforms/cognios#architecture",
  "/cognidocs": "/platforms/cognios",
  "/cogniagents": "/platforms/cognios",
  "/cognitalk": "/platforms/cognios",
  "/cogniware": "/platforms/cognios",
  "/insights": "/methodologies",
};

export function normalisePath(pathname: string) {
  const path = pathname.split(/[?#]/)[0];
  return path === "/" ? path : path.replace(/\/+$/, "") || "/";
}

/** Old /insights/<slug> articles, /work/<slug> case pages and anything under /platforms/<slug> redirect too. */
export function redirectFor(pathname: string): string | null {
  const path = normalisePath(pathname);
  if (REDIRECTS[path]) return REDIRECTS[path];
  if (/^\/insights\/.+/.test(path)) return "/methodologies";
  if (/^\/work(\/.*)?$/.test(path)) return "/case-studies";
  if (/^\/platforms\/[^/]+$/.test(path) && path !== "/platforms/cognios") return "/platforms/cognios";
  return null;
}
