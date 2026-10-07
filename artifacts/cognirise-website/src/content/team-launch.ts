import { assetUrl } from "@/lib/assets";

export type TeamProfile = {
  initials: string;
  name: string;
  group: "leadership" | "advisor";
  title: string;
  background: string;
  contribution: string;
  identityImage?: { src: string; alt: string; objectPosition?: string };
};

// Remove the name from this set only after the owner confirms compliance approval.
// Retain the complete biography below and in CMS for later restoration.
const temporarilyHiddenProfiles = new Set(["rami aslan"]);
export function isPublicTeamProfile(profile: Pick<TeamProfile, "name">) {
  return !temporarilyHiddenProfiles.has(profile.name.trim().toLowerCase());
}

const portraitFrames = [
  "polygon(0 0, 100% 10%, 88% 100%, 10% 88%)",
  "polygon(10% 7%, 96% 0, 100% 89%, 0 100%)",
  "polygon(0 10%, 91% 0, 100% 100%, 7% 92%)",
  "polygon(7% 0, 100% 6%, 91% 92%, 0 100%)",
];

export function teamPortraitClipPath(group: TeamProfile["group"], index: number) {
  return portraitFrames[(index + (group === "advisor" ? 2 : 0)) % portraitFrames.length];
}

// Public launch roster authorized by the owner. Sources and CMS handover notes
// are in docs/team-launch-content.md; protected previews do not use this roster.
export const launchTeam: TeamProfile[] = [
  {
    initials: "MA", name: "Mounir Ariss", title: "CEO & Co-founder", group: "leadership",
    background: "Mounir has 36 years of experience in data, AI and digital transformation across the Middle East, Africa and Türkiye. He founded the Middle East office of Peppers & Rogers Group and later led its EEMEA region. He was a Partner at Monitor Deloitte, built Accenture’s Data & AI practice in the Middle East, and led Strategy & Consulting across MENA at Publicis Sapient. His work spans government, banking, telecoms, healthcare and retail.",
    contribution: "Mounir helps clients choose where AI can make a measurable difference, agree how the work should change, and turn that plan into a delivery programme. He brings experience building consulting practices and leading complex programmes, connecting business priorities with the data, technology and accountability needed to put AI into daily operations.",
    identityImage: { src: assetUrl("/images/cognirise/people/mounir-ariss.jpg"), alt: "Mounir Ariss, CEO and Co-founder of Cognirise", objectPosition: "50% 25%" },
  },
  {
    initials: "BE", name: "Bülent Eğrilmez", title: "CTO & Co-founder", group: "leadership",
    background: "Bülent has more than 25 years of experience building and running technology in payments, banking, insurance and enterprise software. His career includes Aktif Bank, Peppers & Rogers Group, Pegasystems, STMicroelectronics and SAP. He has led technology engagements across Europe, the Middle East and North Africa, Africa and the CIS, from scoping and architecture through hands-on delivery.",
    contribution: "Bülent turns the business plan into systems that work in production. He brings hands-on experience in sovereign AI infrastructure, enterprise knowledge retrieval, agent workflows and voice AI, alongside payments and large-scale enterprise transformation. He leads architecture, integration and engineering, with clear controls over data access and what agents are allowed to do.",
    identityImage: { src: assetUrl("/images/cognirise/people/bulent-egrilmez-20261007.jpg"), alt: "Bülent Eğrilmez, CTO and Co-founder of Cognirise", objectPosition: "50% 50%" },
  },
  {
    initials: "DP", name: "Don Peppers", title: "Advisory Board", group: "advisor",
    identityImage: { src: assetUrl("/images/cognirise/people/don-peppers-20261007.jpg"), alt: "Don Peppers, Cognirise Advisory Board", objectPosition: "20% 50%" },
    background: "Co-founder of Peppers & Rogers Group and CX Speakers. Co-author with Martha Rogers of The One to One Future (1993), which helped establish one-to-one marketing and customer relationship management. Their nine books together have sold more than a million copies in 18 languages. Included in The Times of London’s “Top 50 Business Brains” and Accenture’s list of the world’s 50 “most important living business thinkers”. Earlier, CEO of Chiat/Day’s direct marketing unit. BSc in astronautical engineering, US Air Force Academy; Master’s in Public Affairs, Princeton.",
    contribution: "The customer’s seat: whether AI makes a service more useful, earns trust and gives customers a reason to stay — plus decades of experience connecting customer relationships to business value, so we measure more than efficiency alone.",
  },
  {
    initials: "RA", name: "Rami Aslan", title: "Advisory Board", group: "advisor",
    background: "More than 25 years across North America, Europe, the Middle East and Africa. CEO of Türk Telekom (2013–2017) — Türkiye’s largest telecom operator, with some 35,000 employees serving 40+ million customers — after leading Oger Telecom as CEO and executive board member. Earlier, head of M&A and corporate finance at the Oger Group, concluding transactions exceeding US$25 billion, following banking roles at Citigroup and TD covering telecom and technology. Board roles have spanned Avea, TTNET, Cell-C and operators across four more countries. Since 2018, a co-founder of venture and private-equity initiatives. McGill BCom and MBA.",
    contribution: "The operator’s seat: what transformation looks like when you’re accountable for 35,000 people and a nation’s network — plus an investor’s discipline on our economics and telecom depth that anchors one of our core industries.",
  },
  {
    initials: "OBY", name: "Ömer Barbaros Yiş", title: "Advisory Board", group: "advisor",
    background: "General Manager of Karaca International. Previously E-Commerce General Manager and Board Member at LC Waikiki, leading its e-commerce business from 2021 to 2024. Earlier, Chief Marketing Officer at Turkcell, customer and revenue management director at Türk Telekom, and Global Telecommunications Industry Director at Peppers & Rogers Group. More than 20 years across telecoms, retail, marketing and digital commerce. A prominent professional voice on LinkedIn: around 150,000 followers and Türkiye’s fifth-most-followed person, as reported by Cognirise on 7 October 2026.",
    contribution: "Ömer brings a commercial and customer perspective to practical AI adoption: which needs matter in a market, how to explain the value of a new service, and what helps people use it. His experience leading marketing and digital commerce can help Cognirise test its proposition against customer expectations. His professional audience offers a channel for sharing useful AI examples and hearing market feedback, without treating reach as a guarantee of adoption.",
    identityImage: { src: assetUrl("/images/cognirise/people/omer-barbaros-yis-20261007.jpg"), alt: "Ömer Barbaros Yiş, Cognirise Advisory Board, wearing a dark blazer", objectPosition: "50% 50%" },
  },
];

export function teamHeroForRegion(region: string) {
  const selected = region === "ksa" || region === "turkiye" ? region : "europe";
  return {
    src: assetUrl(`/images/cognirise/team-${selected}-20261007.jpg`),
    alt: `Illustrative ${selected === "ksa" ? "Saudi-based" : selected === "turkiye" ? "Türkiye-based" : "European"} team collaborating around a violet, magenta and coral physical model.`,
    objectPosition: "50% 50%",
  };
}
