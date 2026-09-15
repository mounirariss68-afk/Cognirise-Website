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
        sourceText: "CRM*CAREEM RIDES DXB 8842",
        extractedValue: "Careem Rides",
        confidence: "High",
        evidence: "Row 2, Description Column (Page 1)",
        reviewerNote: "Pattern match against known transport providers."
      },
      {
        id: "amount",
        label: "Credit Amount",
        sourceText: "45.50 CR",
        extractedValue: "45.50 (AED)",
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
