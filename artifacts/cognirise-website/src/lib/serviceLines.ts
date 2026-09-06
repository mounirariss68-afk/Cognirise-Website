export const SERVICE_LINE_LABELS = [
  "Consulting & Engineering with AI",
  "Sovereign AI Solutions",
  "AI Platforms",
] as const;

export type ServiceLineLabel = (typeof SERVICE_LINE_LABELS)[number];

export const SERVICE_LINES = [
  {
    id: "consulting-engineering",
    label: SERVICE_LINE_LABELS[0],
    short: "Human judgment and engineering that carry priority work into production.",
    description: "Senior operators and forward-deployed engineers connect the decision, architecture, data and delivery work in one accountable route.",
    value: "Move from executive intent to a dependable system your teams can run.",
    destinations: [
      ["Agentic enterprise transformation", "/what-we-do/agentic-enterprise-transformation"],
      ["Data & AI foundations", "/what-we-do/data-ai-foundations"],
      ["Engineering with AI", "/what-we-do/engineering-with-ai"],
    ],
  },
  {
    id: "sovereign-solutions",
    label: SERVICE_LINE_LABELS[1],
    short: "Locally controlled intelligence with governance boundaries made visible.",
    description: "We engineer sovereignty, security, transparency and assurance into the operating architecture so control holds in real use.",
    value: "Deploy useful intelligence without surrendering local authority or defensibility.",
    destinations: [["Sovereign & regulated AI", "/what-we-do/sovereign-regulated-ai"]],
  },
  {
    id: "ai-platforms",
    label: SERVICE_LINE_LABELS[2],
    short: "A connected ecosystem for knowledge, agents, integrations and accountable people.",
    description: "CogniOS and its platform capabilities coordinate enterprise context and governed agents inside boundaries that people define.",
    value: "Create a reusable operating layer that moves work while keeping people accountable.",
    destinations: [
      ["Platform overview", "/platforms"],
      ["Lupitor", "/platforms/lupitor"],
      ["Datatoolpack AutoData", "/platforms/datatoolpack"],
      ["bunjee.ai", "/platforms/bunjee-ai"],
      ["Digital AI workforce", "/what-we-do/digital-ai-workforce"],
    ],
  },
] as const;
