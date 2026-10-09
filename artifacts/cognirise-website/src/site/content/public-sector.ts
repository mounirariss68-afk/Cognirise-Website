import type { CaseCard, Cta, EvidenceRow, Hero, MarketEdition, PageMeta } from "./types";

export const PUBLIC_SECTOR_META: PageMeta = {
  title: "AI for the Public Sector | Cognirise",
  description:
    "An AI-native service: the state does the work it already can, prepares the outcome, and a person confirms it. The test, the six elements, and how to start.",
};

export const PUBLIC_SECTOR_HERO: Hero = {
  kicker: "Public Sector",
  title: "The state acts. A person confirms.",
  lead: "We help government entities redesign one service at a time so the state does the work it already can, and a person confirms the outcome.",
  primary: { label: "Book a Value Scan", href: "/value-scan" },
  secondary: { label: "Read the full point of view", href: "/industries/public-sector/point-of-view" },
  image: { src: "/images/cognirise/industries/pulse-industry-public-sector-civic-review-v1.png", alt: "A light-filled civic atrium where a public service review takes place." },
};

export const PUBLIC_SECTOR_TEST = {
  heading: "The test",
  lead: "Remove the model. If the service still works, it is AI-enabled. If it cannot, it is AI-native. Very little in production passes that test yet.",
  columns: ["", "Today", "AI-native"],
  rows: [
    ["Who starts", "The citizen applies", "The state offers and the citizen confirms"],
    ["How they ask", "Find the service, then the form", "Say what they need, in their own words"],
    ["Who does the legwork", "The citizen collects and submits", "The state does what it already can"],
    ["What the rule is", "Guidance a person interprets", "Code that runs, is tested and explains itself"],
    ["What the person does", "Assesses from scratch", "Confirms or corrects, and is answerable"],
    ["Who can act", "The citizen, through a browser", "The citizen, or an agent they authorised"],
  ],
};

export const PUBLIC_SECTOR_ELEMENTS = {
  heading: "Six elements",
  items: [
    { title: "Intent replaces navigation.", body: "The citizen says what they need; the state finds the service and the rule." },
    { title: "The state never asks twice.", body: "Anything it already holds is never requested again." },
    { title: "Rules run, not only publish.", body: "Entitlement exists as code that can be tested and explained." },
    { title: "The state takes the first step.", body: "Where the facts and the entitlement are clear, the state offers and the citizen confirms." },
    { title: "Every service is reachable by a machine.", body: "Services are callable functions with defined inputs, outputs and authorisation." },
    { title: "Each decision has a name on it.", body: "For any decision a machine helped make, the state can say who is responsible and how to challenge it." },
  ],
};

export const PUBLIC_SECTOR_EDITIONS: MarketEdition[] = [
  {
    market: "uae",
    heading: "Where the UAE stands",
    lead: "A government that has set a public deadline three times and met it.",
    milestones: [
      { period: "2013 to 2015", what: "mGovernment: 96.3% of priority services on mobile, across 41 federal entities", source: "u.ae" },
      { period: "2018 to 2021", what: "Paperless Dubai: 43 entities, 1,800 services, 100% paperless by December 2021", source: "Digital Dubai" },
      { period: "2024 to 2025", what: "Zero Government Bureaucracy: 4,000 procedures removed, delivery time down more than 70%", source: "UAE Media Office, 2025" },
      { period: "2026 to 2028", what: "Agentic government: 50% of government sectors, services and operations on agentic AI within two years", source: "UAE Cabinet, 2026" },
    ],
    stats: [
      { figure: "12 million", label: "UAE PASS users, July 2026", source: "Digital Dubai" },
      { figure: "11th", label: "on the UN e-government index 2024, first in the region", source: "UN DESA, TDRA" },
      { figure: "3.8 million", label: "TAMM users in 2025, 1,150 services", source: "Department of Government Enablement, Abu Dhabi" },
    ],
    candidateServices: "trade-licence renewal, a birth-triggered bundle, a social-support decision",
  },
  {
    market: "ksa",
    heading: "Saudi Arabia: 52nd to 6th in six years",
    lead: "One of the fastest sustained rises in digital government anywhere, built under services already at scale.",
    milestones: [
      { period: "2005", what: "Yesser: the national e-government programme and the shared layer later platforms used", source: "Digital Government Authority" },
      { period: "2010 to 2021", what: "Absher launches in 2010 and reaches 330 services; Nafath, the identity layer, arrives in 2021", source: "Ministry of Interior" },
      { period: "2021", what: "The Digital Government Authority becomes the national reference for digital government", source: "Digital Government Authority" },
      { period: "2026", what: "Declared the Year of AI by Cabinet; SAMAI passes one million participants", source: "Saudi Press Agency, 2026" },
    ],
    stats: [
      { figure: "6th", label: "on the UN e-government index 2024, up from 52nd in 2018", source: "UN DESA" },
      { figure: "3 billion", label: "Nafath verifications in 2024; 23.5 million users", source: "national reporting, 2024" },
      { figure: "87.06%", label: "Digital Experience Maturity Index 2026, across 59 platforms", source: "Digital Government Authority, August 2026" },
    ],
    candidateServices: "annual confirmation of commercial registration; a birth-registration bundle through Absher; a means-tested support decision",
  },
  {
    market: "turkiye",
    heading: "Türkiye: the register came first",
    lead: "Türkiye built its population register two decades before most states and rose 21 places on the UN index in one cycle.",
    milestones: [
      { period: "2000 to 2002", what: "MERNİS: a national identity number for every record; processing from 20 days to 55 seconds", source: "Nüfus ve Vatandaşlık İşleri" },
      { period: "2008", what: "e-Devlet Kapısı opens with 22 services and 9 institutions, on an already universal register", source: "turkiye.gov.tr" },
      { period: "2025", what: "Decree 183 puts public digital services and public AI under one authority", source: "Resmî Gazete, March 2025" },
      { period: "2026", what: "The AI Action Plan 2026 to 2030: four axes, 16 actions, a national AI council", source: "Presidential Circular 2026/9" },
    ],
    stats: [
      { figure: "69.5 million", label: "e-Devlet users, August 2026; 9,396 services", source: "turkiye.gov.tr" },
      { figure: "27th", label: "on the UN e-government index 2024, up 21 places", source: "UN DESA" },
      { figure: "76.1%", label: "of citizens used a state service online in the past year", source: "UN E-Government Survey 2024" },
    ],
    candidateServices: "a workplace licence re-issue; a population record issued from the register; a social assistance application",
  },
  {
    market: "europe",
    heading: "Europe: the only bloc that made interoperability a legal duty",
    lead: "Europe's asset is not one platform: the same duties apply to all twenty-seven states.",
    milestones: [
      { period: "2018 to 2023", what: "The Single Digital Gateway: 21 procedures digital and cross-border by December 2023, with the once-only system", source: "Regulation (EU) 2018/1724" },
      { period: "2024", what: "The Interoperable Europe Act applies; assessments required from January 2025", source: "Regulation (EU) 2024/903" },
      { period: "2024 to 2026", what: "The Digital Identity Wallet: every member state must provide one by 24 December 2026", source: "Regulation (EU) 2024/1183" },
      { period: "2026", what: "Regulation 2026/1744 confirms the dates for high-risk AI duties on public bodies", source: "Official Journal, July 2026" },
    ],
    stats: [
      { figure: "93%", label: "of Single Digital Gateway procedures online", source: "eGovernment Benchmark 2025" },
      { figure: "84.6", label: "citizen score, eGovernment Benchmark 2026, up from 82.3", source: "eGovernment Benchmark 2026" },
      { figure: "1,000", label: "public authorities connected to the once-only system", source: "European Commission" },
    ],
    candidateServices: "a cross-border procedure not yet done end to end; a birth-triggered family benefit; a pension claim from the record, not a declaration",
  },
];

export const PUBLIC_SECTOR_SERVICE = {
  heading: "One service, redesigned: a trade licence renewal",
  body: "The licence is about to expire. The state already knows the establishment, the licence, the activities and the tenancy. So the renewal arrives as a card: facts pre-filled, one question, the fee, one declaration, one button. The owner confirms and pays. What was shown and agreed is kept on record.",
  caption: "Example data; not a working form.",
  card: {
    facts: [
      { label: "Establishment", value: "Al Noor Trading LLC", from: "Commercial register" },
      { label: "Licence", value: "CN-2041877", from: "Licensing authority" },
      { label: "Activities", value: "General trading", from: "Commercial register" },
      { label: "Tenancy", value: "Valid", from: "Tenancy register" },
    ],
    question: { label: "Changes to activities or premises?", value: "No", from: "The owner answers" },
    fee: { value: "AED 1,200", from: "Fee schedule, current version" },
    declaration: "The facts above are correct.",
    button: "Confirm and pay",
    toggles: ["Owner's view", "Field sources"],
  },
};

export const PUBLIC_SECTOR_NOW_NEXT_LATER = {
  heading: "What to deliver now, next and later",
  items: [
    { title: "Now.", body: "Services whose facts already sit in a register you trust: renewals, confirmations, status, pre-filled returns." },
    { title: "Next.", body: "Services that need one register corrected or one rule written as code." },
    { title: "Later.", body: "Services that need cross-entity integration or a change in law. Start now; do not hold the first two behind it." },
  ],
};

export const PUBLIC_SECTOR_BUILT: { heading: string; cards: CaseCard[]; link: Cta } = {
  heading: "What we have built",
  cards: [
    { title: "National infrastructure authority.", body: "Several agents read tender material, map the work streams and pause at defined decision points for an official to approve.", tag: "Client result" },
    { title: "Government agency for tourism.", body: "AI assistants that guide visitors through itineraries and the region. Engagement up 15%, time on site up 30%.", tag: "Client result" },
    { title: "European startup facilitator.", body: "A self-service portal where agents handle the front and back office. Setting up a company went from 4 days to 4 minutes.", tag: "Client result" },
  ],
  link: { label: "All public sector case studies", href: "/case-studies?industry=Public%20Sector" },
};

export const PUBLIC_SECTOR_VIEW = {
  heading: "Our view",
  body: "Most governments use AI. Almost none runs a service that could not work without it. Start with the service, the register and the rule, not the model. The full argument and six priorities for a programme are in our point of view.",
  link: { label: "Read \"The AI-native government\"", href: "/industries/public-sector/point-of-view" } as Cta,
};

export const PUBLIC_SECTOR_EVIDENCE: { heading: string; rows: EvidenceRow[] } = {
  heading: "What has been reported",
  rows: [
    { who: "UAE Cabinet", what: "Framework to run agentic AI across government", outcome: "50% of government sectors, services and operations within two years", source: "UAE Cabinet, 23 April 2026", url: "https://uaecabinet.ae/en/news/under-directives-of-uae-president-and-in-world-first-mohammed-bin-rashid-reveals-new-uae-government-framework-to-deploy-agentic-ai-across-50-of-government-sectors-operations-within-two-years", tag: "Published elsewhere" },
    { who: "Ajman Government", what: "Trade licence renewed by an agent", outcome: "A pre-expiry notification opened the renewal; the agent checked the lease and the departments; the owner confirmed", source: "The National, 23 July 2026", url: "https://www.thenationalnews.com/news/uae/2026/07/23/ajman-uses-agentic-ai-to-renew-trade-licence-in-uae-government-first", tag: "Published elsewhere" },
    { who: "UAE Government", what: "Zero Government Bureaucracy, phase 2", outcome: "4,000 procedures and 1,600 requirements removed; delivery time down more than 70%", source: "UAE Government Media Office, 16 June 2025", url: "https://mediaoffice.ae/en/news/2025/june/16-06/mohammed-bin-rashid-launches-phase-2-of-zero-bureaucracy-programme", tag: "Published elsewhere" },
  ],
};

export const PUBLIC_SECTOR_START = {
  heading: "How to start",
  body: "Bring one high-friction service and the people answerable for it. In a one-day Value Scan you leave with the requirements to remove, a register-readiness note and the baseline nobody holds today.",
  bring: [
    "The owner of the service and the owner of the register",
    "Current volumes, completion rate and calls per transaction",
  ],
  candidateLabel: "Candidate services",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
};
