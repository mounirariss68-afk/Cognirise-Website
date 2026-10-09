import type { CaseCard, Cta, Hero, PageMeta } from "./types";

export const CASE_STUDIES_META: PageMeta = {
  title: "Case studies | Cognirise",
  description:
    "Twenty-two AI projects in banking, government, manufacturing, travel, telecoms and health: the problem, what was built and the result as recorded.",
};

export const CASE_STUDIES_HERO: Hero = {
  title: "What we have built",
  lead: "Twenty-two projects: the problem, what was built and the result as recorded. Client names are withheld unless the client agreed to be named.",
  primary: { label: "Book a Value Scan", href: "/value-scan" },
  image: { src: "/images/cognirise/site-work-proof.jpg", alt: "A review of delivered work on a large screen, with the team around it." },
};

export const CASE_STUDIES_LEGEND =
  "How to read the figures: Client result means a result from a Cognirise project, as recorded at the time and not independently audited. In every project a person stays in charge of any action that costs money or affects a customer.";

export const CASE_INDUSTRIES = [
  "All",
  "Financial Services",
  "Public Sector",
  "Manufacturing",
  "Energy",
  "Travel",
  "Telecoms",
  "Health",
  "Technology",
] as const;

export type CaseIndustry = Exclude<(typeof CASE_INDUSTRIES)[number], "All">;

export type CaseStudy = CaseCard & { industry: CaseIndustry; group: string };

export const CASE_GROUPS = [
  "Financial Services",
  "Public Sector",
  "Manufacturing and Energy",
  "Travel, Telecoms, Health and Technology",
] as const;

export const CASE_STUDIES: CaseStudy[] = [
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "Leasing company.", body: "Quotes and credit work were done by hand across the ERP and documents. Business rules and specialist agents now prepare offer plans in seconds, with gated decision points. Every decision is logged against the rule set. Analysis time went from 3 days to 3 minutes." },
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "Commercial bank, credit risk.", body: "Portfolio reviews were done by hand, a few times a year. Early-warning signals, disclosure checks and concentration checks now run every day. Each proposed action waits for an analyst to approve it." },
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "Commercial bank, provisions.", body: "Changes in provisions only showed up at period end. A monitoring view now ties each change to the loans behind it. When a threshold is crossed, finance is alerted before the books close." },
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "Asset manager.", body: "Answers about funds were slow and varied. A bilingual assistant answers from the fund documents and cites its sources. Where judgement or advice is needed, it hands over to an adviser." },
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "Investment bank, call compliance.", body: "Brokerage calls were reviewed by sampling. Calls are now transcribed and checked against four risk gates; flagged calls go to a 24-hour review queue. Reported gate pass rate: 71%." },
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "State bank, virtual branch.", body: "Calls went unanswered at peak times. A voice workflow for intent, enquiry and consent runs on the bank's own servers. Calls are resolved or routed with an outcome code. Response time under two seconds." },
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "State bank, market research.", body: "Market research arrived late. Briefs on competitors, customer reviews, regulators and the news now arrive with sources, a priority and a proposed next step." },
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "Vehicle finance provider.", body: "Preparing an offer was slow. A workflow applies the product rules to the evidence it finds and drafts the offer. Exceptions wait for a person to approve them." },
  { group: "Financial Services", industry: "Financial Services", tag: "Client result", title: "Brokerage.", body: "The fee schedule went round as emailed copies. One application now holds the current schedule, keeps a record of every change and lets only approved owners update it." },
  { group: "Public Sector", industry: "Public Sector", tag: "Client result", title: "National infrastructure body.", body: "Several agents read the tender documents and map the work streams. At each defined decision point they stop and wait for an official to approve." },
  { group: "Public Sector", industry: "Public Sector", tag: "Client result", title: "Government agency for tourism.", body: "AI assistants guide visitors through itineraries and the region. Engagement up 15%, time on site up 30%." },
  { group: "Public Sector", industry: "Public Sector", tag: "Client result", title: "European start-up agency.", body: "A self-service portal where agents handle the front and back office. Setting up a company went from 4 days to 4 minutes." },
  { group: "Manufacturing and Energy", industry: "Manufacturing", tag: "Client result", title: "Industrial company, cement.", body: "Mix recipes were set against quality levels by hand. A deep-learning model now proposes the bill of materials within the quality limits. Material cost down 20%." },
  { group: "Manufacturing and Energy", industry: "Manufacturing", tag: "Client result", title: "Defence manufacturer.", body: "No direct way to query inventory and cost. An assistant answers ERP questions and suggests cost options. Total cost of materials down 20%." },
  { group: "Manufacturing and Energy", industry: "Manufacturing", tag: "Client result", title: "Beverage manufacturer.", body: "Line faults were diagnosed from memory. A maintenance flow matches sensor readings to known faults and pulls up the right procedure. No work order goes out without approval." },
  { group: "Manufacturing and Energy", industry: "Energy", tag: "Client result", title: "Industrial materials producer.", body: "Routine technical questions depended on a few process experts. A bilingual assistant searches the approved technical library and answers with its sources. Uncertain questions go to an expert." },
  { group: "Manufacturing and Energy", industry: "Energy", tag: "Client result", title: "Exporter, embedded emissions.", body: "Production, supplier and energy data sat in separate systems. A pipeline checks the inputs, works out the emissions for each product and sends the declarations for review." },
  { group: "Travel, Telecoms, Health and Technology", industry: "Travel", tag: "Client result", title: "Hotel group, retired assets.", body: "Furniture and equipment leaving service had no record and no route. A portal registers each item, matches it to reuse, donation or recycling, and keeps the proof of every hand-off." },
  { group: "Travel, Telecoms, Health and Technology", industry: "Telecoms", tag: "Client result", title: "Network and data-centre operator.", body: "Incident diagnosis, approvals and evidence varied from case to case. An operations workflow links each alert to the network map and the runbook, then proposes recovery steps. Any disruptive action waits for an engineer's approval." },
  { group: "Travel, Telecoms, Health and Technology", industry: "Health", tag: "Client result", title: "Clinic network.", body: "Patient contact had to be consistent from first enquiry to follow-up. Marketing could not be given access to clinical records. An Arabic and English platform now handles enquiries, care follow-up and campaigns. Consent is checked for every audience from one shared control room." },
  { group: "Travel, Telecoms, Health and Technology", industry: "Health", tag: "Client result", title: "Pharma sales company.", body: "Field coaching varied from manager to manager. A platform captures visit notes, sorts the feedback and queues it for the manager to review before any guidance goes out." },
  { group: "Travel, Telecoms, Health and Technology", industry: "Technology", tag: "Client result", title: "Business services firm.", body: "Staff used public AI tools for document work. A workspace now puts chat, approved document sets and task agents behind the firm's own login and access rules." },
];

export const CASE_STUDIES_CLOSING = {
  heading: "Add yours",
  body: "Bring one process. In a one-day Value Scan we work out what AI can take on, what stays with your people, and what it would be worth.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
};
