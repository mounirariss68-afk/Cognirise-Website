import { idaoEditorial, idaoHeroSeed } from "@workspace/api-zod";

/**
 * Code-owned copy for the IDAO page. The shared library keeps the original
 * seed for the CMS; the website renders this edited version.
 */
type Seed = typeof idaoEditorial.seed;
const seed = idaoEditorial.seed;

export const IDAO_HERO = {
  breadcrumb: "Methods / 01",
  title: "IDAO: the four steps.",
  description: "Innovate, Demonstrate, Activate, Operate: four steps from a question to a system your team runs. Each step ends with proof before the next one starts.",
  supportingText: idaoHeroSeed.supportingText,
  imageSrc: idaoHeroSeed.media.src,
  imageAlt: idaoHeroSeed.media.altText,
  imagePosition: idaoHeroSeed.imagePosition,
  imageCaptionSubtitle: "The first decision",
  imageCaptionTitle: "A working prototype within 48 hours.",
};

export const IDAO_EDITORIAL = {
  ...seed,
  delivery: {
    ...seed.delivery,
    kicker: "How we deliver",
    headingBeforeEmphasis: "People and AI agents working as ",
    headingEmphasis: "one team.",
    description: "IDAO combines experienced people with AI agents that do the repetitive work. The point is not people or automation on their own. It is knowing which should lead, where they work together, and where a person must decide.",
    humanKicker: "People",
    humanHeading: "Judgement in context.",
    agentKicker: "Agents",
    agentHeading: "Scale with control.",
    systemKicker: "The delivery team",
    systemHeading: "People decide · Agents do the volume",
  },
  deliveryTeam: [
    {
      ...seed.deliveryTeam[0],
      label: "Senior leaders",
      title: "Experience that recognises what matters.",
      summary: "Leaders with 20 or more years in large-scale change programmes.",
      detail: "They bring the judgement that comes from programmes where a mistake costs money or trust. They read the organisation, challenge the value case, steer executive decisions and spot the risks a technical brief misses.",
    },
    {
      ...seed.deliveryTeam[1],
      label: "Engineers in your team",
      title: "Builders who work inside your operation.",
      summary: "Engineers who work inside your environment from strategy through to operation.",
      detail: "They connect what leaders want to a working system. They learn the operation from the inside, build alongside your teams, direct the agents and stay responsible until the result is ready to run.",
    },
    {
      ...seed.deliveryTeam[2],
      label: "Working agents",
      title: "Reusable AI, set up for the job.",
      summary: "Specialised agents, skills and tools that support the team in research, design, engineering and testing.",
      detail: "They help the team analyse, produce, compare and test at machine pace. They bring reusable Cognirise components into the engagement, within the context, authority and evidence set for the work.",
    },
    {
      ...seed.deliveryTeam[3],
      label: "Controls and assurance",
      title: "Speed with evidence and restraint.",
      summary: "Grounding, evaluation, traceability and human approval keep agent work reviewable.",
      detail: "Controls are designed into the plan. Approved sources back important claims, outputs stay traceable to requirements, evaluation tests quality and limits, and named people keep authority over the decisions that matter and over release.",
    },
  ],
  startingPoint: {
    kicker: "Where work begins",
    heading: "Start with the problem, not the technology.",
    firstParagraph: "An engagement begins where an important workflow, decision or service has a known problem. Together we work out the value at stake, the people affected and the evidence a leader would need to act.",
    secondParagraph: "Not every engagement starts at Innovate. If credible evidence already exists, we enter at the earliest step whose gate it satisfies.",
  },
  lifecycle: {
    kicker: "The progression",
    heading: "Each step ends with proof.",
    description: "IDAO is not a waterfall with gates. Evidence, risk and assurance travel with the work. If a gate shows weak evidence, the team reshapes the scope or loops back rather than scaling an assumption.",
    loopLead: "The loop stays open.",
    loopDescription: "Live evidence from Operate can trigger a focused improvement, send a weak assumption back to Demonstrate, or reveal a new opportunity for Innovate. Progress is controlled, not forced into a straight line.",
  },
  canonIntroduction: {
    kicker: "Why the pace is possible",
    heading: "Speed without shortcuts.",
    summaryBeforeFirstEmphasis: "A working prototype within ",
    firstEmphasis: "48 hours",
    summaryBetweenEmphases: " and a first release within ",
    secondEmphasis: "2 to 4 weeks",
    summaryAfterSecondEmphasis: " are possible because teams do not begin from a blank page. A reusable delivery system sets how work is framed, produced, evaluated and handed over.",
  },
  handover: {
    kicker: "Ownership at handover",
    heading: "The work ends in your hands, not ours.",
    firstParagraph: "Handover is prepared from the start. Named owners receive the operating knowledge, the traceability, the evaluation evidence, the known limits and the routines needed to run the system with confidence.",
    secondParagraph: "We rehearse support and intervention before acceptance. The outcome is not dependency on a delivery team. It is a system you own, with clear authority, visible performance and a path to improve it.",
    cta: { label: "Design roles, rights and adoption", href: "/methodologies/human-agent-operating-model" },
  },
  closingCta: {
    kicker: "Find your starting point",
    heading: "Bring one process. Leave with the next step.",
    description: "A Value Scan finds where the work has a problem, what value is available and which IDAO step should start.",
    cta: { label: "Book a Value Scan", href: "/value-scan" },
  },
  lifecycleCta: { label: "Follow the four steps", href: "#lifecycle" },
} as unknown as Seed;
