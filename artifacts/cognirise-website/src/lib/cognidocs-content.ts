export type ExtractionLayer = {
  id: string;
  name: string;
  description: string;
  color: "violet" | "pink" | "coral";
};

export const EXTRACTION_LAYERS: ExtractionLayer[] = [
  {
    id: "layer-geometry",
    name: "Vector Geometry",
    description: "Reads the physical layout, drawn outlines, CAD strokes, and structural proximity.",
    color: "violet"
  },
  {
    id: "layer-text",
    name: "Text & Coordinates",
    description: "Extracts characters, labels, and their exact spatial positions on the page.",
    color: "pink"
  },
  {
    id: "layer-cv",
    name: "Computer Vision",
    description: "Analyzes pixels and visual features to identify non-textual symbols and regions.",
    color: "coral"
  }
];

export type EditionFeature = {
  title: string;
  description: string;
};

export type CogniDocsEdition = {
  id: "finance" | "engineering";
  name: string;
  headline: string;
  description: string;
  features: EditionFeature[];
  applications: string[];
};

export const COGNIDOCS_EDITIONS: CogniDocsEdition[] = [
  {
    id: "finance",
    name: "CogniDocs Finance",
    headline: "Statements become structured, categorized data.",
    description: "Bank and card statements itemized line by line — with merchant names normalized and categorized by industry.",
    features: [
      {
        title: "Merchant intelligence",
        description: "“AMZN MKTP US*2K4” resolves to Amazon, e-commerce. A matcher proposes the right brand even in abbreviated descriptors."
      },
      {
        title: "Format adaptation",
        description: "The engine adapts to new statement formats to extract fields without manual template mapping, validated with representative statements."
      },
      {
        title: "Every line auditable",
        description: "Amount, date, merchant, category, and the exact spot on the page it came from."
      }
    ],
    applications: [
      "Reconciliation",
      "Lending & underwriting",
      "Expense management",
      "Accounting data entry",
      "Spend analytics",
      "Audit tie-outs",
      "Fraud & tampering checks",
      "VAT recovery",
      "Dispute resolution",
      "Wealth & mortgage onboarding"
    ]
  },
  {
    id: "engineering",
    name: "CogniDocs Engineering",
    headline: "Drawings become itemized, checkable bills of fact.",
    description: "Work across architectural, structural, mechanical, electrical, energy efficiency, pipeline and oil-installation drawings, plus BIM models — itemized and pinned to location. Native inputs such as DWG, DXF, vector PDF and IFC are assessed for compatibility within the agreed scope.",
    features: [
      {
        title: "Multidisciplinary packs",
        description: "A real submission spans architectural, structural, mechanical and electrical sheets; CogniDocs reads them together."
      },
      {
        title: "Native CAD compatibility",
        description: "Dimensions and layers read straight out of files as data, subject to format compatibility, revision, and scale checks."
      },
      {
        title: "Evidence-pinned findings",
        description: "Every quantity and verdict points to the exact sheet and spot a reviewer should look."
      },
      {
        title: "Deployment options",
        description: "Deployment environments, including on-premise, are assessed against infrastructure, security, and connectivity requirements."
      }
    ],
    applications: [
      "BOQ & quantity takeoff",
      "Code-compliance review",
      "Tender & bid evaluation",
      "Tender writing support",
      "Procurement & SKU matching",
      "Technical query drafting",
      "As-built asset registers",
      "P&ID digitization",
      "Permit review",
      "Progress verification",
      "FM handover"
    ]
  }
];

export type DemoField = {
  id: string;
  label: string;
  sourceText: string;
  extractedValue: string;
  confidence: "High" | "Requires Review";
  evidence: string;
  reviewerNote: string;
};

export type DemoScenario = {
  id: "finance" | "engineering";
  title: string;
  description: string;
  imagePath: string; // no longer used directly in img src since we import, but keeping for structure
  fields: DemoField[];
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "finance",
    title: "Financial Statements",
    description: "Itemize and classify complex strings into auditable ledger data, accelerating cross-page reconciliation.",
    imagePath: "finance",
    fields: [
      {
        id: "merchant",
        label: "Merchant Classification",
        sourceText: "UBER*TRIP NYC 8842",
        extractedValue: "Uber",
        confidence: "High",
        evidence: "Row 2, Description Column (Page 1)",
        reviewerNote: "Pattern match against known transport providers."
      },
      {
        id: "amount",
        label: "Credit Amount",
        sourceText: "45.50 CR",
        extractedValue: "45.50 (USD)",
        confidence: "High",
        evidence: "Row 2, Credit Column (Page 1)",
        reviewerNote: "Value identified in 'CR' / Credit proximity with valid currency locale."
      }
    ]
  },
  {
    id: "engineering",
    title: "Engineering Drawings",
    description: "Extract structured data natively linked to drawing title blocks, measurements, and detailed schematics.",
    imagePath: "engineering",
    fields: [
      {
        id: "dimension",
        label: "Dimensional Measurement",
        sourceText: "|<-- 4500mm -->|",
        extractedValue: "4500mm",
        confidence: "High",
        evidence: "Detail A: Pump Assembly",
        reviewerNote: "Printed dimension extracted directly; geometry marked 'Not to Scale'."
      },
      {
        id: "material",
        label: "Material Specification",
        sourceText: "[Hatch] REINF. CONCRETE",
        extractedValue: "Reinforced Concrete",
        confidence: "High",
        evidence: "Title Block: Material",
        reviewerNote: "Extracted from text block. No hatch legend present for visual cross-check."
      },
      {
        id: "quantity",
        label: "Quantity Revision",
        sourceText: "Cloud Rev B (14 units)",
        extractedValue: "14 units",
        confidence: "Requires Review",
        evidence: "Title Block: Revision",
        reviewerNote: "Extracted '14 units' from revision note. Requires manual cross-check with original Revision B sheet."
      }
    ]
  }
];
