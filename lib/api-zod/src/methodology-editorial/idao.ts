import {
  defineMethodologyEditorialTemplate,
  fixed,
  fixedList,
  group,
  link,
  media,
  text,
} from "./contract";

/**
 * The native methodology hero continues to be delivered by the framework
 * schema. This seed preserves its original source asset for migration and
 * inventory alongside the schema-native hero fields.
 */
export const heroSeed = {
  breadcrumb: "Frameworks & methodologies / 01",
  title: "IDAO.",
  description: "A governed route from a consequential opportunity to evidence, adoption and a capability your team can own.",
  supportingText: "Innovate · Demonstrate · Activate · Operate",
  media: {
    src: "/images/cognirise/blueprint-demonstrate.jpg",
    altText: "A client team testing a working prototype on a large tablet in a bright studio.",
    role: "hero" as const,
    label: "IDAO hero — Demonstrate stage",
  },
  imagePosition: "50% 45%",
  imageCaptionSubtitle: "The first pivotal decision",
  imageCaptionTitle: "A decision-ready prototype within 48 hours.",
} as const;

/**
 * This is an occurrence inventory, not an alternate IDAO canon. The stage
 * and delivery-canon records remain readonly in the website's shared
 * content/idao.ts module. The repeated hero occurrence is intentional.
 */
export const idaoMediaInventory = [
  { id: "hero-demonstrate", ...heroSeed.media },
  {
    id: "delivery-team",
    src: "/images/cognirise/idao-human-agent-team.png",
    altText: "A single figure divided into a human leader and an AI agent, representing the combined Cognirise delivery team.",
    role: "supporting" as const,
    label: "IDAO delivery system — human and agent team",
  },
  {
    id: "stage-innovate",
    src: "/images/cognirise/blueprint-innovate.jpg",
    altText: "A mixed client and Cognirise team prioritising opportunities together around a workshop table.",
    role: "supporting" as const,
    label: "IDAO stage — Innovate",
  },
  {
    id: "stage-demonstrate",
    src: "/images/cognirise/blueprint-demonstrate.jpg",
    altText: "A client team testing a working prototype on a large tablet in a bright studio.",
    role: "supporting" as const,
    label: "IDAO stage — Demonstrate",
  },
  {
    id: "stage-activate",
    src: "/images/cognirise/blueprint-activate.jpg",
    altText: "A forward-deployed engineer and client product owner reviewing orchestrated agent workflows and human approval gates for a live MVP.",
    role: "supporting" as const,
    label: "IDAO stage — Activate",
  },
  {
    id: "stage-operate",
    src: "/images/cognirise/blueprint-operate.jpg",
    altText: "Client leaders transferring ownership as connected teams work across a multi-level operations hub.",
    role: "supporting" as const,
    label: "IDAO stage — Operate",
  },
  {
    id: "canon-01",
    src: "/images/cognirise/canon-1.jpg",
    altText: "A delicate line-art path passing through sequential control gates.",
    role: "supporting" as const,
    label: "IDAO canon — Governed lifecycle",
  },
  {
    id: "canon-02",
    src: "/images/cognirise/canon-2.jpg",
    altText: "Intricate array of modular, glowing geometric components assembling into a structure.",
    role: "supporting" as const,
    label: "IDAO canon — Reusable intelligence",
  },
  {
    id: "canon-03",
    src: "/images/cognirise/canon-3.jpg",
    altText: "A continuous thread connecting blueprints and data points across a multi-layered plane.",
    role: "supporting" as const,
    label: "IDAO canon — Traceable execution",
  },
  {
    id: "canon-04",
    src: "/images/cognirise/canon-4.jpg",
    altText: "An intersection where algorithmic streams meet a distinct manual activation node.",
    role: "supporting" as const,
    label: "IDAO canon — Human decision gates",
  },
  {
    id: "canon-05",
    src: "/images/cognirise/canon-5.jpg",
    altText: "A shielded technical structure with embedded validation markers.",
    role: "supporting" as const,
    label: "IDAO canon — Assurance by design",
  },
] as const;

export const idaoEditorial = defineMethodologyEditorialTemplate({
  template: "idao",
  editorial: group({
    delivery: group({
      kicker: text("How we deliver", "Delivery section kicker", { format: "short" }),
      headingBeforeEmphasis: text("Humans and AI agents working as ", "Delivery heading before emphasis", { format: "short" }),
      headingEmphasis: text("one team.", "Delivery heading emphasis", { format: "short" }),
      description: text("IDAO combines seasoned human judgement with a governed agent workforce. The advantage is not people or automation in isolation; it is knowing which capability should lead, where it should collaborate and where human authority must remain explicit.", "Delivery section description", { format: "long" }),
      humanKicker: text("Human intelligence", "Human delivery column kicker", { format: "short" }),
      humanHeading: text("Judgement in context.", "Human delivery column heading", { format: "short" }),
      agentKicker: text("Agent intelligence", "Agent delivery column kicker", { format: "short" }),
      agentHeading: text("Scale with control.", "Agent delivery column heading", { format: "short" }),
      systemKicker: text("The IDAO delivery system", "Delivery system kicker", { format: "short" }),
      systemHeading: text("Human authority · Agent leverage", "Delivery system heading", { format: "short" }),
      teamImage: media({
        src: idaoMediaInventory[1].src,
        altText: idaoMediaInventory[1].altText,
        role: "supporting",
        label: idaoMediaInventory[1].label,
      }),
    }),
    stageMedia: fixedList("IDAO stage media", [
      group({
        id: fixed("innovate"),
        image: media({
          src: idaoMediaInventory[2].src,
          altText: idaoMediaInventory[2].altText,
          role: "supporting",
          label: idaoMediaInventory[2].label,
        }),
      }),
      group({
        id: fixed("demonstrate"),
        image: media({
          src: idaoMediaInventory[3].src,
          altText: idaoMediaInventory[3].altText,
          role: "supporting",
          label: idaoMediaInventory[3].label,
        }),
      }),
      group({
        id: fixed("activate"),
        image: media({
          src: idaoMediaInventory[4].src,
          altText: idaoMediaInventory[4].altText,
          role: "supporting",
          label: idaoMediaInventory[4].label,
        }),
      }),
      group({
        id: fixed("operate"),
        image: media({
          src: idaoMediaInventory[5].src,
          altText: idaoMediaInventory[5].altText,
          role: "supporting",
          label: idaoMediaInventory[5].label,
        }),
      }),
    ]),
    canonMedia: fixedList("IDAO delivery canon media", [
      group({
        id: fixed("01"),
        image: media({
          src: idaoMediaInventory[6].src,
          altText: idaoMediaInventory[6].altText,
          role: "supporting",
          label: idaoMediaInventory[6].label,
        }),
      }),
      group({
        id: fixed("02"),
        image: media({
          src: idaoMediaInventory[7].src,
          altText: idaoMediaInventory[7].altText,
          role: "supporting",
          label: idaoMediaInventory[7].label,
        }),
      }),
      group({
        id: fixed("03"),
        image: media({
          src: idaoMediaInventory[8].src,
          altText: idaoMediaInventory[8].altText,
          role: "supporting",
          label: idaoMediaInventory[8].label,
        }),
      }),
      group({
        id: fixed("04"),
        image: media({
          src: idaoMediaInventory[9].src,
          altText: idaoMediaInventory[9].altText,
          role: "supporting",
          label: idaoMediaInventory[9].label,
        }),
      }),
      group({
        id: fixed("05"),
        image: media({
          src: idaoMediaInventory[10].src,
          altText: idaoMediaInventory[10].altText,
          role: "supporting",
          label: idaoMediaInventory[10].label,
        }),
      }),
    ]),
    deliveryTeam: fixedList("IDAO delivery team", [
      group({
        id: fixed("senior-leaders"),
        label: text("Senior Leaders", "Senior Leaders label", { format: "short" }),
        title: text("Experience that recognises what matters.", "Senior Leaders title", { format: "short" }),
        summary: text("Industry leaders with 20+ years of experience in large-scale transformation.", "Senior Leaders summary", { format: "long" }),
        detail: text("They bring the judgement earned through consequential programmes: reading organisational context, challenging the value case, navigating executive decisions and recognising risks that do not appear in a technical brief.", "Senior Leaders detail", { format: "long" }),
      }),
      group({
        id: fixed("forward-deployed-engineers"),
        label: text("Forward Deployed Engineers", "Forward Deployed Engineers label", { format: "short" }),
        title: text("Builders embedded in the reality of the work.", "Forward Deployed Engineers title", { format: "short" }),
        summary: text("Transformation professionals who work inside the client environment from strategy through operation.", "Forward Deployed Engineers summary", { format: "long" }),
        detail: text("FDEs connect executive intent to working capability. They learn the operation from the inside, build alongside client teams, direct the agent workforce and stay accountable until the outcome is ready to operate.", "Forward Deployed Engineers detail", { format: "long" }),
      }),
      group({
        id: fixed("forward-deployed-agents"),
        label: text("Forward Deployed Agents", "Forward Deployed Agents label", { format: "short" }),
        title: text("Reusable intelligence, deployed for the mission.", "Forward Deployed Agents title", { format: "short" }),
        summary: text("Specialised agents, skills and tools that augment the team across research, design, engineering and assurance.", "Forward Deployed Agents summary", { format: "long" }),
        detail: text("FDAs help teams analyse, produce, compare and evaluate at machine pace. They carry reusable Cognirise intelligence into the engagement while remaining bounded by the context, authority and evidence defined for the work.", "Forward Deployed Agents detail", { format: "long" }),
      }),
      group({
        id: fixed("controls"),
        label: text("Controls & Assurance", "Controls & Assurance label", { format: "short" }),
        title: text("Acceleration with evidence and restraint.", "Controls & Assurance title", { format: "short" }),
        summary: text("Grounding, evaluation, traceability and human approval keep agent work reviewable.", "Controls & Assurance summary", { format: "long" }),
        detail: text("Controls are designed into the route: approved sources ground important claims, outputs remain traceable to requirements, evaluation tests quality and limitations, and named people retain authority over consequential decisions and release.", "Controls & Assurance detail", { format: "long" }),
      }),
    ]),
    startingPoint: group({
      kicker: text("Where work begins", "Starting point kicker", { format: "short" }),
      heading: text("Start with pressure, not technology.", "Starting point heading", { format: "short" }),
      firstParagraph: text("An engagement begins where an important workflow, decision or service is under pressure. Together we identify the value at stake, the people affected and the evidence a leader would need to act.", "Starting point first paragraph", { format: "long" }),
      secondParagraph: text("Not every engagement starts at Innovate. If credible evidence already exists, we enter at the earliest stage whose gate can be responsibly satisfied.", "Starting point second paragraph", { format: "long" }),
    }),
    lifecycle: group({
      kicker: text("The progression", "Lifecycle kicker", { format: "short" }),
      heading: text("Every stage earns the next.", "Lifecycle heading", { format: "short" }),
      description: text("IDAO is not a gated waterfall. Evidence, risk and assurance travel with the work. If a gate exposes weak evidence, the team reshapes the scope or loops back rather than scaling an assumption.", "Lifecycle description", { format: "long" }),
      loopLead: text("The loop remains open.", "Lifecycle loop lead", { format: "short" }),
      loopDescription: text("Live evidence from Operate can trigger a focused improvement, return a weak assumption to Demonstrate, or reveal a new opportunity for Innovate. Progress is controlled, not artificially linear.", "Lifecycle loop description", { format: "long" }),
    }),
    canonIntroduction: group({
      kicker: text("The delivery canon", "Delivery canon kicker", { format: "short" }),
      heading: text("Speed without shortcuts.", "Delivery canon heading", { format: "short" }),
      summaryBeforeFirstEmphasis: text("A decision-ready prototype within ", "Delivery canon summary before first emphasis", { format: "short" }),
      firstEmphasis: text("48 hours", "Delivery canon first emphasis", { format: "short" }),
      summaryBetweenEmphases: text(" and a governed MVP within ", "Delivery canon summary between emphases", { format: "short" }),
      secondEmphasis: text("2–4 weeks", "Delivery canon second emphasis", { format: "short" }),
      summaryAfterSecondEmphasis: text(" are possible because teams do not begin from a blank page. A reusable delivery system governs how work is framed, produced, evaluated and handed over.", "Delivery canon summary after second emphasis", { format: "long" }),
    }),
    handover: group({
      kicker: text("Ownership at handover", "Handover kicker", { format: "short" }),
      heading: text("The work ends in your hands, not ours.", "Handover heading", { format: "short" }),
      firstParagraph: text("Handover is prepared from the start. Named owners receive the operating knowledge, traceability, evaluation evidence, known limitations and governance routines needed to run the capability with confidence.", "Handover first paragraph", { format: "long" }),
      secondParagraph: text("We rehearse support and intervention before acceptance. The outcome is not dependency on a delivery team; it is a client-owned capability with clear authority, observable performance and a route to responsible improvement.", "Handover second paragraph", { format: "long" }),
      cta: link("Design roles, rights and adoption", "/methodologies/human-agent-operating-model", "Handover CTA"),
    }),
    closingCta: group({
      kicker: text("Find your starting point", "Closing CTA kicker", { format: "short" }),
      heading: text("Bring one process. Leave with the next evidence to earn.", "Closing CTA heading", { format: "short" }),
      description: text("A Value Scan identifies where the work is under pressure, what value is available and which IDAO stage should begin the route.", "Closing CTA description", { format: "long" }),
      cta: link("Book a Value Scan", "/value-scan", "Closing CTA"),
    }),
    lifecycleCta: link("Follow the lifecycle", "#lifecycle", "Lifecycle CTA"),
  }),
});