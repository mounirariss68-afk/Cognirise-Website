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
    identityImage: { src: assetUrl("/images/cognirise/people/bulent-egrilmez.jpg"), alt: "Bülent Eğrilmez, CTO and Co-founder of Cognirise", objectPosition: "50% 40%" },
  },
  {
    initials: "DP", name: "Don Peppers", title: "Advisory Board", group: "advisor",
    background: "Don is an author, speaker and co-founder of Peppers & Rogers Group. The Times of London included him among its “Top 50 Business Brains”, and Accenture’s Institute for Strategic Change named him one of the world’s 50 “most important living business thinkers”. He co-authored The One to One Future with Martha Rogers, helping establish the ideas behind one-to-one marketing and customer relationship management. His work focuses on customer experience, customer strategy and building lasting customer relationships.",
    contribution: "Don brings a customer perspective to AI decisions: whether a new service makes life easier, earns trust and strengthens the relationship. His experience helps connect automation and personalisation to customer needs and long-term business value.",
  },
  {
    initials: "RA", name: "Rami Aslan", title: "Advisory Board", group: "advisor",
    background: "Rami is a former CEO and board member of Türk Telekom and Oger Telecom. He began his career in banking with TD Bank and Citigroup before moving into telecoms, corporate finance and investment. His experience spans North America, Europe, the Middle East and Africa, including the integration and transformation of large telecom and technology businesses.",
    contribution: "Rami brings an operator’s and investor’s view of enterprise change. His experience in running large organisations, integrating businesses and allocating capital helps test whether an AI programme has a sound business case, a workable operating model and a clear path to delivery.",
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
