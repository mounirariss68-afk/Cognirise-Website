# CMS field coverage inventory

This is the W03 field inventory for the ten governed document kinds. It is a
source-level contract check, not a claim that every public route has been
verified in a deployed environment. The structured registry used by the admin
editor lives in
`artifacts/cognirise-admin/src/pages/documents/field-coverage.ts`.

## Consumer classifications

- **Public and preview** — editable content is rendered by the public delivery
  path and the governed preview.
- **Public** — rendered by public delivery; preview uses the same exact
  revision where supported.
- **Preview only** — editorial/governance evidence or legacy compatibility that
  is inspectable in the editor/preview but is not asserted as public copy.
- **Schema only** — the runtime contract persists the value, but no confirmed
  public consumer exists. The value is preserved and is not replaced with a
  decorative control.
- **Derived** — supplied by the runtime contract or publication state rather
  than authored as content.

## Per-kind coverage

The detailed paths, editor location, draft behaviour, publication requirement,
consumer classification, and read-only rationale are kept in the typed
registry so tests can verify all ten kinds without parsing this document.
The following table records the public-consumer disposition for every
top-level contract family.

| Kind | Public / preview fields | Preview-only or governance fields | Schema-only fields |
| --- | --- | --- | --- |
| Person | `role`, `title`, `biography`, `contribution`, `focusAreas`, `profileLinks`, `identityMedia`, `approvedFallback` | `sources`, `verificationDate`, `reviewDate`, legacy `identityMediaId`, `visibility`, `order` | `relatedIds` |
| Partner | `allianceCategory`, `positioning`, `facts`, `evidence`, `coverage`, `contribution`, `website`, `logoMedia`, `relationshipStatus` | `sources`, `verificationDate`, `reviewDate`, legacy `logoMediaId`, `visibility`, `order` | `relatedIds` |
| Platform | `category`, `summary`, `heroMedia`, `template`, `sections`, `capabilities`, `differentiators`, `cta` | `sources`, `verificationDate`, `reviewDate`, legacy `heroMediaId`, `visibility`, `order` | `relatedIds` |
| Publication | `variant`, `teaser`, `body`, `author`, `publicationDate`, `updatedDate`, `readingTimeMinutes`, `topics`, `sectors`, `heroMedia`, `pdfMedia`, `social.imageMedia` | `sources`, `verificationDate`, `reviewDate`, legacy media IDs, `visibility`, `order` | `platformIds`, `social.title`, `social.description`, `relatedIds` |
| Case study | Disclosure, evidence, visual reconstruction, mandate, work, controls, outcomes, quote, hero media, CTA, and related industries | `sources`, `verificationDate`, `reviewDate`, internal impact/evidence fields, legacy `heroMediaId`, `visibility`, `order` | `relatedIds` |
| Industry | Standard narrative, capabilities, selected work, source trail, approved media, and Education/Banking/Public Sector specialist fields | `verificationDate`, `reviewDate`, `visibility`, `order`, legacy `heroMediaId` | `relatedIds` |
| Framework | `template`, `teaser`, `handoverExplanation`, `methodology`, worked/sector examples, hero media, CTA | `sources`, `verificationDate`, `reviewDate`, legacy `heroMediaId`, `visibility`, `order` | `relatedIds` |
| Office | `city`, `address`, `phone` | `sources`, `verificationDate`, `reviewDate`, `visibility`, `order` | `relatedIds` |
| Site configuration | Contact configuration/email and exact hero poster/video asset versions | — | — |
| Landing page | `pagePath`, `template`, `narrative`, governed sections, CTA, SEO, legal, and visual references | `sources`, `verificationDate`, `reviewDate`, `visibility`, `order` | `relatedIds` |

## Control decisions

- Rich content uses structured block controls for paragraphs, H2/H3,
  bulleted/numbered lists, and quotations with optional attribution. Textareas
  edit one block or list item at a time, so newlines, semicolons and punctuation
  never act as a parser delimiter.
- Unsupported legacy rich blocks are shown as read-only JSON with an explicit
  remove action. They remain in the value on ordinary edits.
- `relatedIds` and publication `platformIds` use a searchable governed-record
  picker. Selected references not returned by the current query remain visible
  and pinned until an editor explicitly removes them.
- Case-study `relatedIndustries` uses a constrained multi-select. Unknown
  stored enum values remain visible until explicitly removed.
- CTA and service destinations accept only internal paths or HTTP(S) links.
  Internal paths are flagged for governed-route review; draft saving never
  depends on an external site responding.
- Existing industry and landing specialist fields remain in their existing
  workspaces. This inventory does not authorize a content rewrite, migration,
  publication, or broad reconciliation.