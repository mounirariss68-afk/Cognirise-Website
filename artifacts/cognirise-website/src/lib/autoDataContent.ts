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

export const AUTODATA_DEEP_DIVES = [
  {
    id: "overview",
    label: "Datatoolpack AutoData overview",
    url: "https://datatoolpack.com/",
    description: "Explore the platform’s data-profiling, preparation, feature-engineering, and export capabilities."
  },
  {
    id: "pipeline-architecture",
    label: "AutoData pipeline architecture",
    url: "https://autodata.datatoolpack.com/",
    description: "See the preparation stages, transformations, and inference-replay architecture in more detail."
  }
];
