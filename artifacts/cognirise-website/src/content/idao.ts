export const IDAO_STAGES = [
  {
    id: 1,
    num: "01",
    title: "Innovate",
    subtitle: "Spot the value",
    time: "1 day",
    tagline: "Don’t boil the ocean.",
    purpose: "Find the opportunity worth proving and say why it deserves to move.",
    description:
      "We frame the opportunity with the most value, the people it serves and the decision the work must make possible. Fixed inputs and a deliberately narrow scope move effort towards proof, not an expanding brief.",
    keyWork: [
      "Map the work, the problem, the people affected and the constraints",
      "Set out the value, risk and adoption assumptions",
      "Choose the smallest decision worth proving",
    ],
    clientRole:
      "Bring the priority, the operating context and the people who will make the decision.",
    decisionGate:
      "Is there a specific opportunity worth proving, with a named owner and a measurable outcome?",
    outcome: "A prioritised opportunity and a clear decision boundary.",
    evidence:
      "A shared problem statement, baseline figures, named decision-makers and an agreed plan for what the demonstration must prove.",
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
    purpose: "Turn the opportunity into evidence you can decide on before committing to a larger build.",
    description:
      "Within 48 hours, we turn the agreed decision boundary into a working prototype. Your people test the journey that matters and judge value, usability and direction before committing to a larger build.",
    keyWork: [
      "Build the main journey around real workflows",
      "Test the assumptions about data, integration, usability and controls",
      "Record the value signals, the limits and the exposure",
    ],
    clientRole:
      "Test the main journey, challenge the assumptions and make the proceed, reshape or stop decision.",
    decisionGate:
      "Has the prototype produced enough evidence to proceed, and made the remaining uncertainty visible?",
    outcome: "A working proof your people can test, challenge and decide on.",
    evidence:
      "Observed user response, evaluation findings, feasible integration paths, known limits and a recorded proceed, reshape or stop decision.",
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
    time: "2 to 4 weeks (first release)",
    tagline: "Human judgement. Agent scale.",
    purpose: "Turn a proven direction into a controlled system that is ready for real use.",
    description:
      "In 2 to 4 weeks, engineers working inside your team turn the proven direction into a first release. Requirements stay traceable as the team builds, evaluates and secures the system for real use.",
    keyWork: [
      "Build the first release against traceable requirements",
      "Evaluate behaviour, security, accessibility and data handling",
      "Prepare the people, the controls, the release and the support paths",
    ],
    clientRole:
      "Provide timely product decisions, access to subject experts and approval at the agreed gates.",
    decisionGate:
      "Are the people, the system and the controls ready to carry the change safely into live work?",
    outcome: "A usable first release with the engineering and controls needed to run it.",
    evidence:
      "Evaluation results, control evidence, operational readiness, accepted limits and a named person's approval for release.",
    accent: "#e74f91",
    image: "/images/cognirise/blueprint-activate.jpg",
    imageAlt:
      "An engineer and a client product owner reviewing agent workflows and human approval gates for a live first release.",
    imagePosition: "50% 52%",
  },
  {
    id: 4,
    num: "04",
    title: "Operate",
    subtitle: "Scale and run",
    time: "4 to 12 weeks",
    tagline: "No lock-in. Full ownership.",
    purpose: "Keep the result, learn from live use and hand over a system you own.",
    description:
      "We harden the system, set up monitoring and data controls, and transfer the operating knowledge. Security, accessibility and a disciplined handover prepare your team to own and scale it.",
    keyWork: [
      "Monitor performance, value, risk and the signals that call for a person",
      "Rehearse ownership, support and review routines",
      "Transfer knowledge and shape the next improvement cycle",
    ],
    clientRole:
      "Name the operational owners, rehearse support and review, and accept the system against the agreed evidence.",
    decisionGate:
      "Is the system delivering the intended outcome, and can your team run, control and improve it?",
    outcome: "A system you own, an operating model and a scale plan.",
    evidence:
      "Live operating signals, accepted ownership, tested support routines, review records and a prioritised improvement backlog.",
    accent: "#ff775d",
    image: "/images/cognirise/blueprint-operate.jpg",
    imageAlt:
      "Client leaders taking ownership as connected teams work across a multi-level operations hub.",
    imagePosition: "50% 48%",
  },
] as const;

export const IDAO_CANON_LAYERS = [
  {
    num: "01",
    title: "A controlled lifecycle",
    summary: "The pace comes from knowing what must be true at every step.",
    detail:
      "Each engagement moves through fixed inputs and outputs, shared structures and explicit gates. That repeatable path reduces reinvention while keeping scope, evidence and decisions visible.",
    examples: [
      { stage: "Innovate", text: "The opportunity statement names the owner, the outcome and the proof boundary before work begins." },
      { stage: "Demonstrate", text: "Prototype findings are recorded against the questions the demonstration was designed to answer." },
      { stage: "Activate", text: "Release readiness rests on accepted evaluation and control evidence." },
      { stage: "Operate", text: "Live signals reopen the plan when an assumption needs to be reshaped." },
    ],
    image: "/images/cognirise/idao-canon-governed-lifecycle-v2.jpg",
    imageAlt: "A luminous delivery path passing through four deep-navy control gateways in a bright architectural environment.",
  },
  {
    num: "02",
    title: "Reusable components",
    summary: "Tested models, skills and accelerators give every engagement a repeatable starting point.",
    detail:
      "Teams begin with reusable components rather than a blank page. That speeds up analysis and production without replacing the judgement needed to fit the work to your context.",
    examples: [
      { stage: "Innovate", text: "Reusable framing structures help the team compare opportunities without losing local context." },
      { stage: "Demonstrate", text: "Tested skills speed up research, prototyping and evaluation inside the agreed boundary." },
      { stage: "Activate", text: "Proven delivery patterns give engineers a controlled starting point for the first release." },
      { stage: "Operate", text: "Reusable operating routines support monitoring, intervention and continuous improvement." },
    ],
    image: "/images/cognirise/idao-canon-reusable-intelligence-v2.jpg",
    imageAlt: "Reusable modules travelling from a deep-navy library into a tailored architectural system.",
  },
  {
    num: "03",
    title: "Traceable execution",
    summary: "The brief, the journeys, the requirements and the evaluation evidence stay connected.",
    detail:
      "Requirement traceability links what is built to the need it serves. Fixed outputs and recorded decisions make progress easier to review, challenge and change without losing the thread.",
    examples: [
      { stage: "Innovate", text: "The value hypothesis is linked to the workflow, the people and the baseline figures it concerns." },
      { stage: "Demonstrate", text: "Prototype observations stay connected to the assumptions they support or challenge." },
      { stage: "Activate", text: "Requirements link through implementation to evaluation results and accepted limits." },
      { stage: "Operate", text: "A live issue can be followed back to its requirement, decision and original value case." },
    ],
    image: "/images/cognirise/idao-canon-traceable-execution-v2.jpg",
    imageAlt: "An unbroken violet-to-coral signal connecting an originating object, a built path and an evidence chamber.",
  },
  {
    num: "04",
    title: "Human decision gates",
    summary: "People keep the final say on direction, risk and release.",
    detail:
      "Named decision-makers approve the moments that matter. The system speeds up the work between gates; it does not make client decisions that cost money or trust, and it does not widen its own authority.",
    examples: [
      { stage: "Innovate", text: "A named leader chooses the opportunity and agrees what evidence would justify progress." },
      { stage: "Demonstrate", text: "Your people make the proceed, reshape or stop decision after testing the proof." },
      { stage: "Activate", text: "Named owners approve scope changes, accepted limits and release readiness." },
      { stage: "Operate", text: "Your operators keep authority over intervention, review and the improvement backlog." },
    ],
    image: "/images/cognirise/idao-canon-human-decision-gates-v2.jpg",
    imageAlt: "A human hand operating a substantial lever that directs converging violet streams into one approved coral path.",
  },
  {
    num: "05",
    title: "Assurance by design",
    summary: "Evaluation and operational readiness are built into delivery, not added at the end.",
    detail:
      "Security, accessibility, data controls and monitoring are considered from the first proof. Evidence, known limits and a disciplined handover travel with the system as it moves towards operation.",
    examples: [
      { stage: "Innovate", text: "Risk, data sensitivity and the people affected shape the proof boundary from the outset." },
      { stage: "Demonstrate", text: "The prototype tests usability, feasibility and control assumptions, not only the happy path." },
      { stage: "Activate", text: "Security, accessibility, behaviour and data handling are evaluated before release." },
      { stage: "Operate", text: "Visible performance, tested support routines and known limits accompany the handover." },
    ],
    image: "/images/cognirise/idao-canon-assurance-by-design-v2.jpg",
    imageAlt: "A working signal moving through integrated protective arches and transparent inspection layers towards operation.",
  },
] as const;
