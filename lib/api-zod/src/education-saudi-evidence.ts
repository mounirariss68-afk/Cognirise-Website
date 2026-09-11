export const EDUCATION_SAUDI_EVIDENCE = {
  market: "ksa",
  gcc: "Saudi Arabia’s direction connects quality-assured AI education pathways with future skills and national human-capability development. The opportunity is to align institutional programmes, learning outcomes and workforce needs while keeping educational quality and accountable human ownership visible.",
  conviction: {
    title: "Build responsible AI capability through education",
    body: "Connect quality-assured AI programmes and defined learning outcomes with the future skills Saudi learners, institutions and the national economy need.",
    market: "ksa",
  },
  application: {
    title: "Saudi Arabia · Quality-assured AI pathways",
    body: "SDAIA’s Academic Framework for AI Qualifications guides the development, evaluation and accreditation of higher-education AI programmes, including programme quality and graduate learning outcomes.",
    sourceUrls: [
      "https://sdaia.gov.sa/en/Research/Pages/EducationIntelligence.aspx",
    ],
    market: "ksa",
  },
  signal: {
    institution: "Saudi Arabia",
    signal: "AI qualifications and future skills",
    implication: "Align higher-education programme quality and learning outcomes with long-term human-capability needs.",
    sourceUrls: [
      "https://sdaia.gov.sa/en/Research/Pages/EducationIntelligence.aspx",
      "https://www.vision2030.gov.sa/media/nfob33q5/hcdp_mv_en-1.pdf",
    ],
    market: "ksa",
  },
  sources: [
    {
      label: "Saudi Academic Framework for AI Qualifications",
      publisher: "Saudi Data & AI Authority",
      kind: "Official source",
      url: "https://sdaia.gov.sa/en/Research/Pages/EducationIntelligence.aspx",
      market: "ksa",
    },
    {
      label: "Human Capability Development Program",
      publisher: "Saudi Vision 2030",
      kind: "Official source",
      url: "https://www.vision2030.gov.sa/media/nfob33q5/hcdp_mv_en-1.pdf",
      market: "ksa",
    },
  ],
} as const;

export type EducationSaudiEvidence = typeof EDUCATION_SAUDI_EVIDENCE;