# Banking POV content contract

**Scope:** `industry.content.bankingPov`, only for the `financial-services`
industry. This is an additive specialist contract; it does not replace the
shared industry fields, the Education POV, the Agent Authority Model, or the
case-study collection.

## Identity and delivery

- `version` is `1`.
- `market` is one of `uae`, `ksa`, `turkiye`, or `europe`; the public payload
  must be projected for the requested edition market and must not mix UAE and
  Saudi references.
- A Banking POV must be delivered only when its parent document is Financial
  Services (`slug: "financial-services"` or `content.name: "Financial
  Services"`). It is invalid on every other industry.
- `caseMembershipSnapshot` is an ordered, immutable receipt of the actual
  public case set captured before this successor is authored. It is for
  reconciliation only; the renderer continues to use the established selected
  work rail and must not derive, alter, or publish cases from this field.
- Publication requires all referenced media to be immutable
  `{ mediaId, mediaVersionId, role, altText? }` pairs. No attached-assets URL,
  public-path fallback, or mutable asset-only reference is valid.

## Shape

```ts
type BankingPov = {
  version: 1;
  market: "uae" | "ksa" | "turkiye" | "europe";
  descriptor: string;
  hero: {
    eyebrow: string;
    heading: string; // “One bank. Three levels of AI value.”
    body: string;
    startingPointsAnchorLabel: string;
    selectedWorkAnchorLabel: string;
  };
  evidenceSignals: Array<{
    statement: string;
    qualification: string;
    url: string; // must exactly occur in top-level industry.sources
    label: string;
    publisher: string;
    publicationPeriod: string;
    accessedAt: string; // YYYY-MM-DD
    jurisdiction: string;
    kind: "Official source" | "Independent study" |
      "Company-reported" | "Vendor claim";
  }>;
  valueOutcomes: Array<{ title: string; body: string; measures: string[] }>; // 3
  adoptionLevels: Array<{
    level: 1 | 2 | 3;
    title: string;
    value: string;
    illustrativeWork: string[];
    owner: string;
    readiness: string[];
    measures: string[];
    decisionBoundary: string;
  }>; // exactly 3
  valueDomains: Array<{
    id: "credit-lending" | "risk-fraud" | "operations-process" |
      "customer-sales" | "engineering-it" | "compliance-regulation";
    title: string;
    purpose: string;
    examples: string[];
    measures: string[];
  }>; // exactly 6, unique IDs
  startingPoints: Array<{
    id: "core-banking-operations" | "contact-centre" |
      "software-delivery" | "marketing-intelligence";
    title: string;
    valueProposition: string;
    problem: string;
    cogniriseRole: string;
    requiredInputs: string[];
    firstDeliverable: string;
    measures: string[];
    decisionBoundary: string;
    action: { label: string; href: string };
    image: CmsMediaReference; // role supporting
    focalPoint: { x: number; y: number }; // 0–100
  }>; // exactly 4, unique IDs
  voiceBanking: {
    platform: {
      name: "Lupitor";
      contribution: string;
      href: string;
      qualification: string;
    };
    cogniriseContribution: string;
    journeys: Array<{
      id: "accounts-cards" | "payments-transfers" | "loans-deposits" |
        "fraud-card-security" | "digital-channel-support" |
        "collections-reminders" | "campaigns-outbound";
      title: string;
      scope: string;
      measures: string[];
      controlBoundary: string;
    }>; // exactly 7, unique IDs
  };
  productionReadiness: {
    eyebrow: string;
    heading: string; // “From permission to action.”
    body: string;
    practices: string[];
    image: CmsMediaReference; // role supporting
    focalPoint: { x: number; y: number };
    annotation: string;
  };
  deliveryPath: {
    stages: Array<{
      stage: string;
      owner: string;
      outcome: string;
    }>;
    practices: string[];
  };
  partners: Array<{
    name: "Lupitor" | "Ekimetrics";
    contribution: string;
    qualification: string;
    href?: string;
  }>;
  cta: {
    heading: string;
    body: string;
    label: string;
    href: string; // existing Value Scan/contact path only
  };
  caseMembershipSnapshot: Array<{
    slug: string;
    title: string;
    order: number;
    digest: string;
  }>;
};
```

## Authoring and rendering rules

1. Editors author Banking POV only in the Financial Services industry editor.
   The form exposes structured repeaters, immutable media pickers, image focal
   points, evidence classification/qualification, and market selection.
2. The site renders `bankingPov` as the dedicated banking experience when it
   is present. It keeps the existing hero media and selected-work component;
   the `caseMembershipSnapshot` never becomes page copy or a substitute rail.
3. The four starting points are the only automatic spatial-disclosure group.
   Their detail must remain available to keyboard and touch users. The
   six-domain map, adoption ladder, and voice journeys use their own accessible
   editorial treatments.
4. Figures from the capabilities deck are excluded unless adjacent structured
   evidence marks them as an illustrative target with scope, assumptions, and
   baseline dependency. Vendor and company statements remain explicitly
   qualified.
5. UAE payloads must not contain Saudi/Kingdom references. Banking publication
   validates the full projected delivery payload, source register, all required
   cardinalities, immutable media pins, unique IDs, and existing CTA paths.

## Successor/reconciliation rules

The banking successor is scoped to Financial Services and its intended edition
only. It may append an approved revision only when the current published
revision is the latest approved revision and matches the captured baseline
chain. Any newer draft, review, publication, missing pin, case-set mismatch,
or content-digest conflict is reported and preserved for editorial review.
The reconciliation is idempotent: replays reuse its receipt and verify stored
bytes, immutable version pins, published payload, and unchanged case receipt;
it never silently overwrites editorial work or auto-publishes an unreviewed
successor.

The website content owner supplies
`artifacts/cognirise-website/src/content/banking.ts` with a named `bankingPov`
export containing this exact object only. The CMS successor importer dynamically
loads that export; it owns the successor wrapper, pins, receipt, and review
draft, while the website owner owns neither CMS mutation nor case reconciliation.

## Task 289 governed media receipt

`scripts/src/cms/banking-media-manifest.ts` inventories exactly five non-case
rasters: the supplied `site-financial_1789037657215.jpg` gate artwork and
distinct core-operations, contact-centre, software-delivery, and
marketing-intelligence card artwork. `cms:import-banking-media` copies exact
bytes to immutable object storage, retains the supplied originals unchanged,
records a version pin receipt, and leaves every asset `pending-review`.
Pending-review assets are valid for the tightly scoped, authenticated
UAE/en review draft and its governed preview; they are never valid for public
publication. `cms:reconcile-banking-successor -- --apply-db
--target=development --write` creates that Financial Services review draft only.
An authorized UAE editor can create its short-lived, authenticated, MFA-protected
preview through `GET /api/documents/:documentId/preview?market=uae&locale=en&revisionId=:draftRevisionId`;
preview tokens are not stored in any banking receipt. Pending assets are exposed
only from the separate no-store preview-media route, never public media delivery.
The idempotent post-merge setup hook is `cms:setup-banking-successor` (the
same reconciler under an explicit post-merge name): it replays the recorded
draft only when its digest and receipts still match, otherwise exits with a
conflict and preserves newer editorial work.
For a fresh environment, `cms:setup-banking-postmerge` first imports and
byte-verifies the exact five sources, then binds the successor's media
references from that environment's `banking-media-import-receipt.json` by
source filename plus SHA-256. The reconciliation never trusts or rewrites
hard-coded TypeScript media UUIDs.
Only a CMS publisher may approve the media and publish the reviewed successor.