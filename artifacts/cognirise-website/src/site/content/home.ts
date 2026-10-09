import type { CaseCard, Cta, PageMeta } from "./types";

export const HOME_META: PageMeta = {
  title: "Cognirise | AI advisory, engineering and platform",
  description:
    "Cognirise designs, builds and runs AI systems for banks, telecoms, governments and industry. A prototype in 48 hours, and you own the code.",
};

export const HOME_HERO = {
  kicker: "For banks, telecoms, governments and industry",
  markets: "UAE · KSA · Türkiye · Europe",
  title: "We build AI that does real work.",
  lead: "Advice on where AI pays off, a prototype in 48 hours, and a platform to run it on your own infrastructure. You own the code.",
  primary: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
  secondary: { label: "See case studies", href: "/case-studies" } as Cta,
};

/** Rotating lines in the hero film. */
export const HERO_PHRASES = [
  { id: "p1", main: "Strategy.", highlight: "Engineered." },
  { id: "p2", main: "48-hour prototype.", highlight: "Delivered." },
  { id: "p3", main: "Agents.", highlight: "Under control." },
  { id: "p4", main: "Work.", highlight: "In production." },
  { id: "p5", logo: true, sub: "AI advisory, engineering and platform." },
] as const;

export const HOME_COMMITMENTS = {
  heading: "Four things we hold ourselves to",
  items: [
    { before: "No man-days", after: "Outcomes", line: "We price the result, not the hours." },
    { before: "No long pilots", after: "A prototype in 48 hours", line: "You test working software before you commit to a build." },
    { before: "No PowerPoints", after: "Working solutions", line: "Decisions are made on a running system, not on slides." },
    { before: "No vendor lock-in", after: "You own the code", line: "Source code, documentation and the knowledge to run it are handed over." },
  ],
};

export type ServiceTile = {
  id: "advise" | "build" | "run";
  label: string;
  line: string;
  bullets: string[];
  href: string;
  linkLabel: string;
  image: string;
  imagePosition: string;
};

export const HOME_SERVICES = {
  heading: "What we do",
  tiles: [
    {
      id: "advise",
      label: "Advise",
      line: "Where AI pays off, what to do first, and how to keep it under control.",
      bullets: ["AI strategy and roadmap", "Use-case selection and business case", "Operating model, controls and change"],
      href: "/what-we-do#advise",
      linkLabel: "How we advise",
      image: "/images/cognirise/cognirise-pulse-people.jpg",
      imagePosition: "85% 100%",
    },
    {
      id: "build",
      label: "Build",
      line: "A prototype in 48 hours and a working system in weeks, built inside your team.",
      bullets: ["Data and systems made ready for AI", "Agents for customer and back-office work", "Voice agents in Arabic dialects and English"],
      href: "/what-we-do#build",
      linkLabel: "How we build",
      image: "/images/cognirise/site-infrastructure.jpg",
      imagePosition: "center center",
    },
    {
      id: "run",
      label: "Run",
      line: "Your agents in production, monitored and under control, on your own infrastructure.",
      bullets: ["CogniOS: one place to approve, run and monitor every agent", "On-premises or private cloud", "The models you choose, on your hardware"],
      href: "/what-we-do#run",
      linkLabel: "How we run it",
      image: "/images/cognirise/cognirise-pulse-governance.jpg",
      imagePosition: "center center",
    },
  ] as ServiceTile[],
};

export const HOME_STEPS = {
  heading: "How we work",
  lead: "Four steps from a question to a system your team runs.",
  link: { label: "See how we work", href: "/how-we-work" } as Cta,
};

export const HOME_CASES: { heading: string; cards: CaseCard[]; link: Cta } = {
  heading: "What it looks like in practice",
  cards: [
    {
      title: "Leasing applications: 3 days of analysis to 3 minutes.",
      body: "A bank's leasing team. Agents read the application and the collateral documents and prepare the decision. The team approves.",
      tag: "Client result",
      industry: "Financial Services",
    },
    {
      title: "Startup services: 4 days to 4 minutes.",
      body: "A European startup facilitator. A self-service portal where agents handle the front and back office.",
      tag: "Client result",
      industry: "Public Sector",
    },
    {
      title: "Call compliance: every call checked.",
      body: "An investment bank. Calls are transcribed and checked against four risk gates; flagged calls go to a 24-hour review queue.",
      tag: "Client result",
      industry: "Financial Services",
    },
  ],
  link: { label: "See all case studies", href: "/case-studies" },
};

export const HOME_INDUSTRIES = {
  heading: "Industries",
  link: { label: "All industries", href: "/industries" } as Cta,
};

export const HOME_CLOSING = {
  heading: "Book a Value Scan",
  body: "One day with your team, one process, and a business case at the end of it.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
};
