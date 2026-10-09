import type { Cta, Hero, PageMeta } from "./types";

export const ABOUT_META: PageMeta = {
  title: "About Cognirise | Cognirise",
  description:
    "An AI advisory and engineering firm headquartered in the UAE, with offices in Amsterdam, Dubai, Istanbul, London and Riyadh. Founders, advisors, values.",
};

export const ABOUT_HERO: Hero = {
  title: "Two founders, one firm, five offices",
  lead: "An AI advisory and engineering firm headquartered in the UAE. We design, build and run AI systems for banks, telecoms, governments and industry.",
  primary: { label: "Book a Value Scan", href: "/value-scan" },
  image: { src: "/images/cognirise/site-leadership.jpg", alt: "The Cognirise leadership team in conversation." },
};

export const ABOUT_FIRM = {
  heading: "The firm",
  body: "The founders worked together at Peppers & Rogers Group before starting Cognirise, and brought its values with them. The firm is headquartered in the UAE, with offices in Amsterdam, Dubai, Istanbul, London and Riyadh and engineering teams in Türkiye, the Netherlands and India. We work with partners who extend what we can deliver: BGTS and Lupitor.",
};

export const ABOUT_VALUES = {
  heading: "Two values, held for decades",
  items: [
    {
      title: "We succeed because we help each other succeed.",
      body: "Work is shared, credit is shared, problems are shared early. No politics. The client's success matters after we have left, not only while the engagement runs.",
    },
    {
      title: "Fair, honest and transparent.",
      body: "One standard for everyone. We say what we believe the answer is, even when it is not the answer you hoped for. That includes saying when you do not need us.",
    },
  ],
  link: { label: "Read what the values mean in practice", href: "/about/core-values" } as Cta,
};

export type Person = { name: string; role: string; image: string; paragraphs: string[] };

export const ABOUT_FOUNDERS: { heading: string; people: Person[] } = {
  heading: "Founders",
  people: [
    {
      name: "Mounir Ariss",
      role: "CEO and co-founder",
      image: "/images/cognirise/people/mounir-ariss.jpg",
      paragraphs: [
        "Mounir has 36 years in data, AI and digital transformation across the Middle East, Africa and Türkiye. He founded the Middle East office of Peppers & Rogers Group and later led its EEMEA region. He was a Partner at Monitor Deloitte, built Accenture's Data & AI practice in the Middle East, and led Strategy & Consulting across MENA at Publicis Sapient.",
        "Mounir helps clients choose where AI makes a measurable difference, agree how the work changes, and turn that into a delivery programme.",
      ],
    },
    {
      name: "Bülent Eğrilmez",
      role: "CTO and co-founder",
      image: "/images/cognirise/people/bulent-egrilmez-20261007.jpg",
      paragraphs: [
        "Bülent has more than 25 years of experience building and running technology in payments, banking, insurance and enterprise software, at Aktif Bank, Peppers & Rogers Group, Pegasystems, STMicroelectronics and SAP. He has led technology engagements across Europe, the Middle East, Africa and the CIS.",
        "Bülent turns the plan into systems that work in production. He leads architecture, integration and engineering, with clear controls over data access and what agents are allowed to do.",
      ],
    },
  ],
};

export const ABOUT_ADVISORS: { heading: string; people: Person[] } = {
  heading: "Board of advisors",
  people: [
    {
      name: "Don Peppers",
      role: "Advisor",
      image: "/images/cognirise/people/don-peppers-20261007.jpg",
      paragraphs: [
        "Co-founder of Peppers & Rogers Group and co-author, with Martha Rogers, of The One to One Future and eight further books on customer relationships. Don brings the customer's seat: whether AI makes a service more useful and earns trust, and how customer relationships connect to business value, so that we measure more than efficiency.",
      ],
    },
    {
      name: "Ömer Barbaros Yiş",
      role: "Advisor",
      image: "/images/cognirise/people/omer-barbaros-yis-20261007.jpg",
      paragraphs: [
        "General Manager of Karaca International. Previously E-Commerce General Manager and board member at LC Waikiki, Chief Marketing Officer at Turkcell, and a director at Türk Telekom and Peppers & Rogers Group. Ömer brings a commercial view of AI adoption: which needs matter in a market, how to explain a new service, and what helps people use it.",
      ],
    },
  ],
};

export const ABOUT_OFFICES = {
  heading: "Offices and contact",
  offices: [
    { city: "Dubai", address: "Office 1914, The Binary by Omniyat, Business Bay, PO Box 71515, Dubai, UAE" },
    { city: "Riyadh", address: "Office 27, First Floor, 3483 Anas Bin Malik Road, Riyadh, Kingdom of Saudi Arabia" },
    { city: "Istanbul", address: "Boğaziçi Teknopark, Istanbul, Türkiye" },
    { city: "Amsterdam", address: "Keizersgracht 452, Amsterdam, Netherlands" },
    { city: "London", address: "34-37 Liverpool St, London EC2M 7PP, United Kingdom" },
  ],
  email: "support@cognirise.ai",
  line: "General enquiries, press and partnerships: support@cognirise.ai. To discuss a process, book a Value Scan.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
};
