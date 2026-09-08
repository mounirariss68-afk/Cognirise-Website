export type PipelineStage = {
  id: string;
  name: string;
  purpose: string;
  rawInput: string;
  metadata: string;
  output: string;
  source: string;
  claimStatus: "Partner-supplied mechanism";
};

export const AUTO_DATA_PIPELINE: PipelineStage[] = [
  {
    id: "harmonization",
    name: "Data harmonization",
    purpose: "Resolves vendor tags, units, time bases, and resampling conventions onto one canonical measurement.",
    rawInput: "WTG_01.ActPwr [kW] · PLT_NET_MW [MW] · Net output [report]",
    metadata: "Fitted stage state retained for replay; the briefing does not enumerate its fields.",
    output: "Canonical measurement columns on one time base",
    source: "Partner-supplied briefing, slide 4",
    claimStatus: "Partner-supplied mechanism",
  },
  {
    id: "completion",
    name: "Completion & validation",
    purpose: "Flags and corrects logically inconsistent or anomalous cells before downstream transformation.",
    rawInput: "{ power: '1500', status: null, temp: 45.2 }",
    metadata: "Fitted stage state retained for replay; the briefing does not enumerate its fields.",
    output: "Completed and validated records",
    source: "Partner-supplied briefing, slide 4",
    claimStatus: "Partner-supplied mechanism",
  },
  {
    id: "text-cleaning",
    name: "Text cleaning",
    purpose: "Normalizes mixed date formats, currency strings, and boolean pairs while excluding identifiers and applying deduplication.",
    rawInput: "[' 1,500 kW ', '08/09/26', 'YES', 'asset-0042']",
    metadata: "Fitted stage state retained for replay; the briefing does not enumerate its fields.",
    output: "Cleaned text fields with identifier columns excluded",
    source: "Partner-supplied briefing, slide 4",
    claimStatus: "Partner-supplied mechanism",
  },
  {
    id: "numericalization",
    name: "Numericalization",
    purpose: "Applies semantic typing per column, including encoding, temporal decomposition, and text vectorization where appropriate.",
    rawInput: "status='fault' · event_time='14:30' · note='over voltage'",
    metadata: "Fitted stage state retained for replay; the briefing does not enumerate its fields.",
    output: "Numerical features produced from semantically typed columns",
    source: "Partner-supplied briefing, slide 4",
    claimStatus: "Partner-supplied mechanism",
  },
  {
    id: "missing-data",
    name: "Missing-data handling",
    purpose: "Selects a per-column imputation strategy from data type, missingness rate, and relationships with other fields.",
    rawInput: "power=[value, missing, value] · wind_speed=[value, value, missing]",
    metadata: "Fitted stage state retained for replay; the briefing does not enumerate its fields.",
    output: "Feature columns completed with a per-column imputation strategy",
    source: "Partner-supplied briefing, slide 4",
    claimStatus: "Partner-supplied mechanism",
  },
  {
    id: "scaling",
    name: "Scaling",
    purpose: "Evaluates scaling approaches for each feature and applies the fitted choice alongside the configured outlier policy.",
    rawInput: "temperature, vibration, and power columns on different ranges",
    metadata: "Fitted stage state retained for replay; the briefing does not enumerate its fields.",
    output: "Scaled feature columns after the selected conditioning approach",
    source: "Partner-supplied briefing, slide 4",
    claimStatus: "Partner-supplied mechanism",
  },
  {
    id: "dimensionality",
    name: "Dimensionality management",
    purpose: "Removes redundant or collinear features using correlation and cluster-similarity analysis.",
    rawInput: "A wide telemetry table with overlapping signals",
    metadata: "Fitted stage state retained for replay; the briefing does not enumerate its fields.",
    output: "A feature matrix with redundant and collinear fields removed",
    source: "Partner-supplied briefing, slide 4",
    claimStatus: "Partner-supplied mechanism",
  },
  {
    id: "synthetic-data",
    name: "Synthetic-data generation",
    purpose: "Generates additional rows from fitted joint distributions where teams choose to expand a limited dataset.",
    rawInput: "A limited training table with under-represented conditions",
    metadata: "Fitted stage state retained for replay; the briefing does not enumerate its fields.",
    output: "Additional rows generated to preserve the fitted joint distribution",
    source: "Partner-supplied briefing, slide 4",
    claimStatus: "Partner-supplied mechanism",
  }
];

export const FLEET_EXAMPLE = [
  { source: "Wind OEM A", tag: "WTG_01.ActPwr" },
  { source: "PV inverter OEM B", tag: "INV_A3.P_AC_kW" },
  { source: "Storage OEM C", tag: "BESS.RackPower" },
  { source: "Site SCADA", tag: "PLT_NET_MW" },
  { source: "Monthly report", tag: "Net output" },
];

export const AUTODATA_CAPABILITIES = [
  {
    title: "Dataset profiling",
    description: "Understand the structure, quality, and dimensions of a dataset before training or analysis."
  },
  {
    title: "Automated cleaning",
    description: "Detect formatting issues, duplicates, and incomplete records before downstream use."
  },
  {
    title: "Feature generation",
    description: "Generate model-ready features through automated transformations and preprocessing logic."
  },
  {
    title: "Outlier detection",
    description: "Identify unusual values, outliers, and problematic records before they reach a model."
  },
  {
    title: "Reusable workflows",
    description: "Create preprocessing workflows that reduce repeated manual preparation across projects."
  },
  {
    title: "Model-ready export",
    description: "Export clean, structured datasets for use in training, analytics, and production workflows."
  },
  {
    title: "Connector pathways",
    description: "Scope and verify the partner-supported intake and export path for each customer environment."
  },
  {
    title: "Deployment boundary choices",
    description: "Define the required operating boundary, then verify the partner-supported option before commitment."
  }
];

export type GovernanceRecord = {
  id: string;
  classification: "explanatory-copy" | "partner-supplied-claim" | "approved-evidence";
  publicationStatus: "published" | "published-with-attribution" | "withheld";
  source: string;
  sourceLocation: string;
  verifiedOn: string | null;
  note: string;
};

export const AUTODATA_CONTENT_GOVERNANCE: GovernanceRecord[] = [
  {
    id: "model-readiness-framing",
    classification: "explanatory-copy",
    publicationStatus: "published",
    source: "Cognirise editorial synthesis",
    sourceLocation: "AutoData briefing, slides 2–4",
    verifiedOn: "6 September 2026",
    note: "Explains stack position and the alliance boundary without making a comparative performance claim.",
  },
  {
    id: "fleet-example",
    classification: "explanatory-copy",
    publicationStatus: "published",
    source: "Cognirise editorial synthesis",
    sourceLocation: "AutoData briefing, slide 2",
    verifiedOn: "6 September 2026",
    note: "The five source labels are an explanatory fleet-data example, not a customer case study.",
  },
  {
    id: "pipeline-and-capabilities",
    classification: "partner-supplied-claim",
    publicationStatus: "published-with-attribution",
    source: "Datatoolpack briefing",
    sourceLocation: "AutoData briefing, slides 3–5",
    verifiedOn: null,
    note: "Product mechanism and capability descriptions are partner supplied and are not independent Cognirise validation.",
  },
  {
    id: "official-product-pages",
    classification: "approved-evidence",
    publicationStatus: "published",
    source: "Datatoolpack official product pages",
    sourceLocation: "Links in the evidence register",
    verifiedOn: "6 September 2026",
    note: "Supports the high-level preparation workflow and capability summary.",
  },
  {
    id: "restricted-briefing-claims",
    classification: "partner-supplied-claim",
    publicationStatus: "withheld",
    source: "Datatoolpack briefing",
    sourceLocation: "AutoData briefing, slides 1, 3, and 6",
    verifiedOn: null,
    note: "Quantitative problem statements, deployment promises, named connectors, train–serve-skew wording, named customers, benchmarks, cost claims, and performance comparisons are withheld pending source and publication approval.",
  },
];

export const EVIDENCE_REGISTER = {
  verifiedOn: "6 September 2026",
  briefing: {
    label: "Supplied AutoData briefing",
    supports: "Fleet example, stack position, eight-stage pipeline, fitted-transform replay, and capability descriptions.",
    status: "Partner-supplied material; mechanism descriptions are not independent Cognirise validation.",
  },
  sources: [
    {
      label: "Datatoolpack AutoData overview",
      url: "https://datatoolpack.com/",
      supports: "Profiling, cleaning, feature engineering, anomaly detection, pipeline automation, and model-ready export."
    },
    {
      label: "AutoData pipeline architecture",
      url: "https://autodata.datatoolpack.com/",
      supports: "Pipeline stages, transformations, and evidence of separated inference replay."
    }
  ]
};
