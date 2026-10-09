import type { Cta, Hero, PageMeta } from "./types";

export const INDUSTRIES_META: PageMeta = {
  title: "Industries | Cognirise",
  description:
    "Where AI pays off in banking, telecoms, government, energy, travel, education and manufacturing, and what we have built in each industry.",
};

export const INDUSTRIES_HERO: Hero = {
  title: "Where AI pays off in your industry",
  lead: "Seven industries, one way of working: what AI can take on, what stays with a person, how results are measured, what we have built.",
  primary: { label: "Book a Value Scan", href: "/value-scan" },
  secondary: { label: "See case studies", href: "/case-studies" },
  image: { src: "/images/cognirise/industries-hero-flight-poster.jpg", alt: "An aircraft departing over a terminal, one of the industries Cognirise works in." },
};

export type IndustryCard = {
  slug: string;
  name: string;
  line: string;
  cases: string;
  href: string;
  image: string;
  imageAlt: string;
};

export const INDUSTRY_CARDS: IndustryCard[] = [
  {
    slug: "financial-services",
    name: "Financial Services",
    line: "Credit, customer service, compliance and software delivery for banks, lenders and asset managers.",
    cases: "10 case studies",
    href: "/industries/financial-services",
    image: "/images/cognirise/industries/pulse-industry-financial-services.png",
    imageAlt: "Document flows converging on a reviewed decision point in a financial operations landscape.",
  },
  {
    slug: "telecoms",
    name: "Telecoms",
    line: "Customer service, billing, revenue assurance and sales for operators. The network stays with the network teams.",
    cases: "1 case study",
    href: "/industries/telecoms",
    image: "/images/cognirise/industries/pulse-industry-telecoms-network.png",
    imageAlt: "Communications nodes linked by signals across a wide network landscape.",
  },
  {
    slug: "public-sector",
    name: "Public Sector",
    line: "Services the state completes for the citizen, with a person confirming the outcome. Four market editions.",
    cases: "3 case studies",
    href: "/industries/public-sector",
    image: "/images/cognirise/industries/pulse-industry-public-sector-civic-review-v1.png",
    imageAlt: "A light-filled civic atrium where a public service review takes place.",
  },
  {
    slug: "energy-resources",
    name: "Energy & Resources",
    line: "From an asset signal to a safe work order, and the knowledge of the engineers who are retiring.",
    cases: "2 case studies",
    href: "/industries/energy-resources",
    image: "/images/cognirise/industries/pulse-industry-energy-resources.png",
    imageAlt: "Operational signals moving through geological layers and field infrastructure.",
  },
  {
    slug: "travel-hospitality",
    name: "Travel & Hospitality",
    line: "Service, disruption and operations for airlines, hotels and tour operators.",
    cases: "2 case studies",
    href: "/industries/travel-hospitality",
    image: "/images/cognirise/industries/pulse-industry-travel-hospitality.png",
    imageAlt: "Passenger routes through a layered terminal as an aircraft departs.",
  },
  {
    slug: "education",
    name: "Education",
    line: "Learning, teaching and the services around them, for schools, universities and education authorities.",
    cases: "2 related case studies",
    href: "/industries/education",
    image: "/images/cognirise/industries/pulse-industry-education-campus-v4.png",
    imageAlt: "A sunlit education campus atrium with library shelves, learning stairs and science rooms.",
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    line: "Quality, maintenance, planning and the shop-floor knowledge base.",
    cases: "4 case studies",
    href: "/industries/manufacturing",
    image: "/images/cognirise/industries/pulse-industry-manufacturing-production.png",
    imageAlt: "A production line with inspection stations and operators on the shop floor.",
  },
];

export const INDUSTRIES_CARDS_HEADING = "Choose your industry";

export const FIGURES_LEGEND = {
  heading: "How we report figures",
  items: [
    { tag: "Client result", body: "From a Cognirise project, as recorded at the time. Not independently audited." },
    { tag: "Published elsewhere", body: "Reported by the named company or body, with the source and date." },
    { tag: "Target", body: "A goal we would agree with you and measure against your own starting point." },
  ],
  /** The one-line version used on every other page that shows a figure. */
  line: "Client result: from a Cognirise project, as recorded, not independently audited. Published elsewhere: reported by the named company or body, with the source.",
};

export const INDUSTRIES_CLOSING = {
  heading: "Start with one process",
  body: "Bring one process with a known problem. In a one-day Value Scan we work out whether AI helps, what it needs, and what it would be worth.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
};
