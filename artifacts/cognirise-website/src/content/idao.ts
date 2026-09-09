export const IDAO_STAGES = [
  {
    id: 1,
    num: "01",
    title: "Innovate",
    subtitle: "Spot the value",
    time: "1 day",
    tagline: "Don’t boil the ocean.",
    purpose: "Find the consequential opportunity and define why it deserves to move.",
    description:
      "We frame the highest-value opportunity, the people it serves and the decision the work must unlock. Controlled inputs and a deliberately narrow scope move effort toward proof, not an expanding brief.",
    keyWork: [
      "Map the work, pressure, affected people and constraints",
      "Frame the value, risk and adoption hypotheses",
      "Choose the smallest meaningful decision boundary",
    ],
    clientRole:
      "Bring the priority, operating context and the people accountable for the decision.",
    decisionGate:
      "Is there a specific opportunity worth proving, with an accountable owner and a measurable outcome?",
    outcome: "A prioritised opportunity and a clear decision boundary.",
    evidence:
      "A shared problem frame, baseline signals, named decision-makers and an agreed plan for what the demonstration must prove.",
    accent: "#7659df",
    image: "/images/cognirise/blueprint-innovate.jpg",
    imageAlt:
      "A mixed client and Cognirise team prioritising opportunities together around a workshop table.",
    imagePosition: "50% 48%",
  },
  {
    id: 2,
    num: "02",
    title: "Demonstrate",
    subtitle: "Prototype",
    time: "48 hours",
    tagline: "See it before you buy it.",
    purpose: "Turn the opportunity into decision-ready evidence before committing to a larger build.",
    description:
      "Within 48 hours, we turn the agreed decision boundary into a tangible prototype. Stakeholders test the important journey and evaluate value, usability and direction before committing to a larger build.",
    keyWork: [
      "Build the critical journey around representative workflows",
      "Test data, integration, usability and governance assumptions",
      "Record value signals, limitations and operational exposure",
    ],
    clientRole:
      "Test the critical journey, challenge assumptions and make the proceed, reshape or stop decision.",
    decisionGate:
      "Has the prototype produced enough evidence to proceed—and made the remaining uncertainty visible?",
    outcome: "A working proof stakeholders can test, challenge and decide on.",
    evidence:
      "Observed user response, evaluation findings, feasible integration paths, known limitations and a recorded proceed, reshape or stop decision.",
    accent: "#db509e",
    highlight: true,
    image: "/images/cognirise/blueprint-demonstrate.jpg",
    imageAlt:
      "A client team testing a working prototype on a large tablet in a bright studio.",
    imagePosition: "50% 45%",
  },
  {
    id: 3,
    num: "03",
    title: "Activate",
    subtitle: "Build the solution",
    time: "2–4 weeks (MVP)",
    tagline: "Human judgement. Agent scale.",
    purpose: "Turn validated direction into a governed capability that is ready for real use.",
    description:
      "In 2–4 weeks, forward-deployed engineers turn the validated direction into a governed MVP. Requirements stay traceable as the team builds, evaluates and secures the capability for real use.",
    keyWork: [
      "Build the MVP against traceable requirements",
      "Evaluate behaviour, security, accessibility and data handling",
      "Prepare people, controls, release and support paths",
    ],
    clientRole:
      "Provide timely product decisions, access to subject experts and approval at agreed stage gates.",
    decisionGate:
      "Are the people, capability and controls ready to carry the change safely into live work?",
    outcome: "A usable MVP with the engineering and controls needed to operate.",
    evidence:
      "Evaluation results, control evidence, operational readiness, accepted limitations and accountable approval for release.",
    accent: "#e74f91",
    image: "/images/cognirise/blueprint-activate.jpg",
    imageAlt:
      "A forward-deployed engineer and client product owner reviewing orchestrated agent workflows and human approval gates for a live MVP.",
    imagePosition: "50% 52%",
  },
  {
    id: 4,
    num: "04",
    title: "Operate",
    subtitle: "Scale & operationalise",
    time: "4–12 weeks",
    tagline: "No lock-in. Full ownership.",
    purpose: "Sustain the outcome, learn from live use and transfer a capability the client can own.",
    description:
      "We harden the capability, establish observability and data governance, and transfer the operating knowledge. Security, accessibility and handover discipline prepare your team to own and scale it.",
    keyWork: [
      "Monitor performance, value, risk and intervention signals",
      "Rehearse ownership, support and governance routines",
      "Transfer knowledge and shape the next improvement cycle",
    ],
    clientRole:
      "Nominate operational owners, rehearse support and governance, and accept the capability against agreed evidence.",
    decisionGate:
      "Is the capability delivering the intended outcome, and can the client team operate, govern and improve it?",
    outcome: "A client-owned capability, operating model and scale plan.",
    evidence:
      "Live operating signals, accepted ownership, tested support routines, governance records and a prioritised improvement backlog.",
    accent: "#ff775d",
    image: "/images/cognirise/blueprint-operate.jpg",
    imageAlt:
      "Client leaders transferring ownership as connected teams work across a multi-level operations hub.",
    imagePosition: "50% 48%",
  },
] as const;

export const IDAO_CANON_LAYERS = [
  {
    num: "01",
    title: "Governed lifecycle",
    summary: "The pace comes from knowing what must be true at every stage.",
    detail:
      "Each engagement moves through controlled inputs and outputs, shared structures and explicit stage gates. That repeatable route reduces reinvention while keeping scope, evidence and decisions visible.",
    examples: [
      { stage: "Innovate", text: "The opportunity frame names the owner, outcome and proof boundary before work begins." },
      { stage: "Demonstrate", text: "Prototype findings are recorded against the questions the demonstration was designed to answer." },
      { stage: "Activate", text: "Release readiness is earned through accepted evaluation and control evidence." },
      { stage: "Operate", text: "Live signals reopen the route when an assumption needs to be reshaped." },
    ],
    image: "/images/cognirise/canon-1.jpg",
    imageAlt: "A delicate line-art path passing through sequential control gates.",
  },
  {
    num: "02",
    title: "Reusable intelligence",
    summary: "Governed models, skills and accelerators create a repeatable starting point.",
    detail:
      "Teams begin with reusable intelligence rather than a blank page. It speeds analysis and production without replacing the judgement needed to fit the work to the client’s context.",
    examples: [
      { stage: "Innovate", text: "Reusable framing structures help the team compare opportunities without flattening local context." },
      { stage: "Demonstrate", text: "Governed skills accelerate research, prototyping and evaluation inside the agreed boundary." },
      { stage: "Activate", text: "Proven delivery patterns give engineers a controlled starting point for the MVP." },
      { stage: "Operate", text: "Reusable operating routines support monitoring, intervention and continuous improvement." },
    ],
    image: "/images/cognirise/canon-2.jpg",
    imageAlt: "Intricate array of modular, glowing geometric components assembling into a structure.",
  },
  {
    num: "03",
    title: "Traceable execution",
    summary: "The brief, journeys, requirements and evaluation evidence stay connected.",
    detail:
      "Requirement traceability links what is built to the need it serves. Controlled outputs and recorded decisions make progress easier to review, challenge and change without losing the thread.",
    examples: [
      { stage: "Innovate", text: "The value hypothesis is linked to the workflow, people and baseline signals it concerns." },
      { stage: "Demonstrate", text: "Prototype observations remain connected to the assumptions they support or challenge." },
      { stage: "Activate", text: "Requirements link through implementation to evaluation results and accepted limitations." },
      { stage: "Operate", text: "A live issue can be followed back to its requirement, decision and original value case." },
    ],
    image: "/images/cognirise/canon-3.jpg",
    imageAlt: "A continuous thread connecting blueprints and data points across a multi-layered plane.",
  },
  {
    num: "04",
    title: "Human decision gates",
    summary: "People remain accountable for direction, risk and release.",
    detail:
      "Named decision-makers approve the moments that matter. The system accelerates the work between gates; it does not make consequential client decisions or silently widen its own authority.",
    examples: [
      { stage: "Innovate", text: "An accountable leader chooses the opportunity and agrees what evidence would justify progress." },
      { stage: "Demonstrate", text: "Stakeholders make the proceed, reshape or stop decision after testing the proof." },
      { stage: "Activate", text: "Named owners approve scope changes, accepted limitations and release readiness." },
      { stage: "Operate", text: "Client operators retain authority over intervention, governance and the improvement backlog." },
    ],
    image: "/images/cognirise/canon-4.jpg",
    imageAlt: "An intersection where algorithmic streams meet a distinct manual activation node.",
  },
  {
    num: "05",
    title: "Assurance by design",
    summary: "Evaluation and operational readiness are built into delivery, not added at the end.",
    detail:
      "Security, accessibility, data governance and observability are considered from the first proof. Evidence, known limitations and handover discipline travel with the capability as it moves toward operation.",
    examples: [
      { stage: "Innovate", text: "Risk, data sensitivity and affected people shape the proof boundary from the outset." },
      { stage: "Demonstrate", text: "The prototype tests usability, feasibility and governance assumptions—not only the happy path." },
      { stage: "Activate", text: "Security, accessibility, behaviour and data handling are evaluated before release." },
      { stage: "Operate", text: "Observable performance, tested support routines and known limitations accompany handover." },
    ],
    image: "/images/cognirise/canon-5.jpg",
    imageAlt: "A shielded technical structure with embedded validation markers.",
  },
] as const;