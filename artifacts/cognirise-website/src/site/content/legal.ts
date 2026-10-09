import type { Cta, PageMeta } from "./types";

export const PRIVACY_META: PageMeta = {
  title: "Privacy notice | Cognirise",
  description:
    "What Cognirise collects on this website, why, where it is kept, who it is shared with, and how to ask for it to be corrected or deleted.",
};

/**
 * Facts still to add when the company supplies them: the registered legal
 * entity name and registration number (Who we are), and the named hosting and
 * email providers (Who sees it). The notice is written to be true without them.
 */
export const PRIVACY = {
  title: "Privacy notice",
  lead: "This notice says what this website collects about you, why, where it is kept and who sees it. It is short because we collect little.",
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        "Cognirise, headquartered in Dubai, United Arab Emirates. Questions about this notice: support@cognirise.ai.",
      ],
    },
    {
      heading: "What we collect and why",
      items: [
        { title: "The Value Scan request form.", body: "Your name, work email, company, the area you chose and what you wrote about your process. We use it to reply to you and to prepare the session. Legal basis: your consent, which you give by ticking the box." },
        { title: "Email you send us.", body: "What you write and your address, to reply to you." },
        { title: "Your country.", body: "We look up the country of your network address with a third-party service (country.is) to choose the regional pictures and the market view. We do not store the address. You can change the market in the footer." },
        { title: "Analytics.", body: "Off unless you switch it on in the footer. If you do, we count page views and which pages are read, without identifying you." },
      ],
    },
    {
      heading: "What we do not do",
      paragraphs: [
        "We do not sell or rent your data. We do not use it for advertising. We do not use it to train AI models. We do not place tracking cookies from other companies.",
      ],
    },
    {
      heading: "Where it is kept and for how long",
      paragraphs: [
        "Form requests and email are kept in our email and customer systems for as long as we are in contact with you, and for two years after the last contact. You can ask us to delete them at any time.",
      ],
    },
    {
      heading: "Who sees it",
      paragraphs: [
        "The Cognirise people who answer your request, and the providers that run our email, website hosting and forms, under contracts that limit what they may do with it.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "You can ask us what we hold about you, ask for it to be corrected or deleted, and withdraw consent at any time, by writing to support@cognirise.ai. You can also complain to the data protection authority in your country.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: ["If this notice changes, the date below changes with it. Last updated: October 2026."],
    },
  ],
};

export const NOT_FOUND = {
  title: "Page not found | Cognirise",
  heading: "Page not found",
  body: "The address you followed does not exist on this site, or the page has moved. Try the menu, or start from the home page.",
  cta: { label: "Go to the home page", href: "/" } as Cta,
};

export const FOOTER = {
  line: "AI advisory, engineering and platform. Headquartered in the UAE.",
  marketLabel: "Market view",
  columns: [
    {
      heading: "What we do",
      links: [
        { label: "Advise", href: "/what-we-do#advise" },
        { label: "Build", href: "/what-we-do#build" },
        { label: "Run", href: "/what-we-do#run" },
        { label: "CogniOS", href: "/platforms/cognios" },
        { label: "Case studies", href: "/case-studies" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "How we work", href: "/how-we-work" },
        { label: "Industries", href: "/industries" },
        { label: "Methods", href: "/methodologies" },
        { label: "About", href: "/about" },
        { label: "Core values", href: "/about/core-values" },
        { label: "Contact", href: "/about#contact" },
      ],
    },
  ],
  offices: { heading: "Offices", cities: ["Dubai", "Riyadh", "Istanbul", "Amsterdam", "London"], email: "support@cognirise.ai" },
  legalEntity: "Cognirise",
  privacy: { label: "Privacy notice", href: "/privacy" } as Cta,
  consentLine:
    "Regional pictures and the market view use a country-level lookup of your network address. No precise location is requested, and nothing is stored. See the privacy notice.",
};
