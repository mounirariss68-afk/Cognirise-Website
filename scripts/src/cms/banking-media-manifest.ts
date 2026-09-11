export interface BankingMediaManifestEntry {
  id: "production-readiness-gate" | "core-banking-operations" | "contact-centre" | "software-delivery" | "marketing-intelligence";
  sourceFile: string;
  filename: string;
  mimeType: "image/jpeg" | "image/png";
  byteSize: number;
  checksum: string;
  width: number;
  height: number;
  altText: string;
  intendedUse: string;
}

// These are distinct, supplied editorial rasters. The source attachment is
// retained verbatim and the importer refuses any byte/metadata drift.
export const bankingMediaManifest: readonly BankingMediaManifestEntry[] = [
  {
    id: "production-readiness-gate",
    sourceFile: "attached_assets/site-financial_1789037657215.jpg",
    filename: "banking-production-readiness-gate.jpg",
    mimeType: "image/jpeg",
    byteSize: 178138,
    checksum: "6df89ba5ba9d3fc17254be728e5f658d626284dd08a1f69aec9cf47e7b9a504f",
    width: 1024, height: 1024,
    altText: "Violet and coral light flows pass through transparent gates beside a metallic vault-like structure.",
    intendedUse: "Financial Services Banking POV production-readiness artwork",
  },
  {
    id: "core-banking-operations",
    sourceFile: "attached_assets/cognirise-industry-banking_1789040218481.png",
    filename: "banking-core-operations.png",
    mimeType: "image/png",
    byteSize: 1658191,
    checksum: "485fb397a7f2a583da703aefefb3eb3a12fe6661cc5b1e8dab23cc54812ad392",
    width: 1024, height: 1024,
    altText: "A modern banking gateway with flowing illuminated paths, representing governed core operations.",
    intendedUse: "Financial Services Banking POV Core Banking Operations starting-point card",
  },
  {
    id: "contact-centre",
    sourceFile: "attached_assets/cognirise-pulse-human-ai-collaboration-shared-judgment_1789040218480.jpg",
    filename: "banking-contact-centre.jpg",
    mimeType: "image/jpeg",
    byteSize: 1816760,
    checksum: "d01e9e9e1127abfd101ae86d62a36b4ef8085caace4f8f352ad43f9370811aa0",
    width: 3072, height: 3072,
    altText: "Abstract illuminated forms in dialogue, representing human and AI collaboration in a contact centre.",
    intendedUse: "Financial Services Banking POV Contact Centre starting-point card",
  },
  {
    id: "software-delivery",
    sourceFile: "attached_assets/cognirise-pulse-agentic-workflows-directed-action_1789039737133.jpg",
    filename: "banking-software-delivery.jpg",
    mimeType: "image/jpeg",
    byteSize: 1160096,
    checksum: "ad0ddce310568b7161ee26c1cab7ef5348db2e8252413eecb12a0860853733d5",
    width: 3072, height: 3072,
    altText: "Directed illuminated pathways through a digital structure, representing governed software delivery.",
    intendedUse: "Financial Services Banking POV Software Delivery starting-point card",
  },
  {
    id: "marketing-intelligence",
    sourceFile: "attached_assets/cognirise-pulse-knowledge-intelligence-living-index_1789040218480.jpg",
    filename: "banking-marketing-intelligence.jpg",
    mimeType: "image/jpeg",
    byteSize: 1135207,
    checksum: "4c542550089d635c309d178fae7e2155447e9d1d9083bc0aef4ad30c3400ccbc",
    width: 3072, height: 3072,
    altText: "A luminous knowledge field with connected signals, representing governed marketing intelligence.",
    intendedUse: "Financial Services Banking POV Marketing Intelligence starting-point card",
  },
];