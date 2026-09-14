# Guardrails redesign CMS interface

## Scope

The redesign reuses the existing `framework` document family and
`template: "guardrails"` payload. It does not create a second page envelope,
document kind, route, or duplicate seven-section schema. The existing fields
remain the authoritative complete edition and keep their current structural
validation.

The presentation groups are composed from existing fields:

1. hero: `hero` and revision `seo`
2. distinction: `distinction`
3. layers: `layers`
4. exposure: `stoppingRule`
5. Set / Prove / Hold: `method`, with optional supporting `questions`,
   `maintenance`, and `measurement`
6. authority: `authority`
7. sources and next step: `references` and `moves`

## Minimal optional presentation copy

`content.presentation` is optional and versioned with
`version: "guardrails-redesign-v1"`. It holds only shorter default-view
summaries and labels for disclosures backed by the existing detailed fields;
it never repeats editable tables, diagram mappings, steps, CTAs, SEO, sources,
or media fields.

```ts
{
  version: "guardrails-redesign-v1",
  hero: { headline: string; subheadline: string; detailsLabel?: string },
  distinction: { summary: string; detailsLabel?: string },
  layers: { summary: string; detailsLabel?: string },
  exposure: { summary: string; detailsLabel?: string },
  setProveHold: {
    summary: string;
    questionsDetailsLabel?: string;
    maintenanceDetailsLabel?: string;
    measurementDetailsLabel?: string;
  },
  authority: { summary: string; detailsLabel?: string },
  sourcesNextStep: { summary: string; detailsLabel?: string }
}
```

When absent, the renderer uses the current approved fields unchanged. When
present, its short fields are the default reading view and its labels open the
retained existing fields under explicit disclosures. The CMS editor edits these
optional presentation fields separately; the existing detailed fields remain
independently editable.

## Hero media and SEO

The existing `heroMedia` reference is the sole hero-media contract. The
redesign pins the confirmed
`attached_assets/generated_images/cognirise-guardrails-boundaries-hero.jpg`
as a dedicated immutable image (JPEG, 1024 × 1024, 146,953 bytes,
SHA-256 `58854df17fc2aada590e03f5a2cd168677eb737a0d97cbe51b9e1a4b34b249fe`).
It is stored privately with `pending-review`, `rightsStatus: needs-review` and
`accessibilityStatus: needs-review`; that is not clearance. Its supplied alt
text is: “Violet and coral light passes through four ivory architectural gates
with navy frames and glass boundaries.” The draft must never borrow a
different page's asset. `seo.ogImageMedia` pins that exact same version with
the distinct `og-image` role; it is not an unbound URL or a public-static
fallback. SEO continues to live in the revision snapshot and remains separately
governed.

## Development baseline evidence

Read-only development-database inspection on 2026-09-14 found the latest
UAE/English edition at revision 1:

- document ID: `509b0cfe-8b19-48ea-85c2-c8e5bd9699f7`
- edition ID: `7d7797a4-3af7-421d-b441-0ebfddb95126`
- revision ID: `7a20a2c6-a112-488e-9c14-0a7f99c6a22c`
- revision digest: `13b8abe578cc2ae6f9d89bd31ccfd86c044debf8ae3623bfe8e4656082d65472`
- document/edition/revision states: `active` / `draft` / `draft`
- existing presentation and hero references: absent
- retained source receipt: `cms.guardrails.page.stage-v1`

The actual Admin content link for that document is
`/admin/content/509b0cfe-8b19-48ea-85c2-c8e5bd9699f7`. The prior review note
references a different historical Admin ID and must not be used as the current
draft link.

## Structural safeguards

The existing fixed four layers, threshold, five exposure IDs, destinations,
additions, three phases, and four steps per phase remain the contract. In
particular, the independent exposure mappings are:

| Exposure ID | Destination | Addition |
| --- | --- | --- |
| `internal-reversible` | `prompt` | `monitoring` |
| `reversible-cost` | `runtime` | none |
| `irreversible-customer` | `runtime` | `architectural-scoping` |
| `regulator-public-safety` | `architecture` | `independent-control` |
| `above-ceiling` | `architecture` | `authority-artefact` |

No mapping inherits an addition from another row. Content staging preserves
all existing editor changes or stops with an explicit baseline conflict.

## Source mapping

| Default presentation field | Existing detailed authority |
| --- | --- |
| `hero` | `hero` |
| `distinction` | `distinction` |
| `layers` | `layers`, including table, diagram, pull-out and aside |
| `exposure` | `stoppingRule`, including five rows and diagram |
| `setProveHold` | `method`; optional disclosures target `questions`, `maintenance`, and `measurement` |
| `authority` | `authority` |
| `sourcesNextStep` | `references` and `moves` |