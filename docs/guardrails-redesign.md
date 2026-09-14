# Guardrails redesign — development staging record

## Scope and current database identity

This record describes the development-only, unpublished Guardrails redesign
draft. It is not a release record and it does not assert that the
review-pending artwork is cleared for public delivery.

| Item | Value |
| --- | --- |
| Document | `509b0cfe-8b19-48ea-85c2-c8e5bd9699f7` |
| Canonical slug | `guardrails-framework` |
| Market / locale | `uae` / `en` |
| Edition | `7d7797a4-3af7-421d-b441-0ebfddb95126` |
| Actual Admin path | `/admin/content/509b0cfe-8b19-48ea-85c2-c8e5bd9699f7` |
| Source revision | `1` — `7a20a2c6-a112-488e-9c14-0a7f99c6a22c` |
| Source digest | `13b8abe578cc2ae6f9d89bd31ccfd86c044debf8ae3623bfe8e4656082d65472` |
| Redesigned revision | `2` — `e4a929ed-5a0a-4b0c-908a-61da0aff0a99` |
| Redesigned digest | `9d4208e894ccec78ad571d4b69b4cedee0dd11126ccd2cfc858e58ff1f5d0182` |
| Document/edition/revision state | `active` / `draft` / `draft` |

The source query found a real, non-empty revision 1: it contains the existing
full structured Guardrails content, has no `content.presentation`, no
`content.heroMedia`, no `seo.ogImageMedia`, and `mediaIds` is `[]`. This
supports the preservation claim; this document would instead state that no
baseline existed if the query had returned no revision 1.

## Exported rendering fixtures

Read-only database exports are available locally and contain snapshots only
(no credentials or object-store secrets):

| File | Revision | SHA-256 |
| --- | --- | --- |
| `/tmp/guardrails-baseline.json` | 1 | `9df5ce326fd42acd40e9db7fa9b01ed0d269499e5fdd6aef2b9aedcd103a5158` |
| `/tmp/guardrails-redesigned.json` | 2 | `f9ff75dab3489f21327cbb9f6ee39ea1329c5e29036c63408557cf70a025aaf2` |

The browser harness must use an authenticated, time-limited preview created
from the staged revision, rather than a public route:

```text
GET /api/documents/509b0cfe-8b19-48ea-85c2-c8e5bd9699f7/preview?market=uae&locale=en&revisionId=e4a929ed-5a0a-4b0c-908a-61da0aff0a99
```

Use the returned `previewUrl`; it is private and expires. Revision 2's image
is asset `c72b973f-82f9-4cf9-acf8-8b350abe1697`, immutable version
`7523ef5a-9c89-4304-ba3d-e69b96a2ca9f`, with pending-review rights and
accessibility metadata. There is no website-public static copy or public
fallback path.

## Presentation mapping and unchanged gates

`content.presentation.version` is `guardrails-redesign-v1`. Its concise hero
is exactly:

- **Headline:** `Guardrails that hold.`
- **Subheadline:** `Set the boundaries. Prove they work. Keep them working as your AI changes.`

| Presentation group | Existing detailed authority retained in revision 2 |
| --- | --- |
| `hero` | `content.hero` |
| `distinction` | `content.distinction` |
| `layers` | `content.layers`, including the table, diagram, pull-out and aside |
| `exposure` | `content.stoppingRule`, including all five exposure rows and diagram |
| `setProveHold` | `content.method`; disclosures map to `questions`, `maintenance`, and `measurement` |
| `authority` | `content.authority` |
| `sourcesNextStep` | `content.references` and `content.moves` |

The controlled gates remain unchanged: the four enforcement layers and their
strength/order; five exposure-to-destination mappings
(`prompt`, `runtime`, `runtime`, `architecture`, `architecture`); exact
addition IDs; and three method phases with four steps each. Existing sources,
CTAs, disclaimer, SEO text, diagrams and detailed prose remain in their
original structured fields. The only revision-2 additions are the concise
presentation map, the immutable hero reference, the same immutable
`seo.ogImageMedia` reference with role `og-image`, and the resulting single
top-level media ID.

## Evidence and repeatable commands

The snapshots were exported with a read-only development database query:

```sql
SELECT revision.revision_number, revision.id::text AS revision_id,
       revision.payload::text AS payload
FROM cms_revisions revision
JOIN cms_market_editions edition ON edition.id = revision.edition_id
WHERE edition.id = '7d7797a4-3af7-421d-b441-0ebfddb95126'
  AND revision.revision_number IN (1, 2)
ORDER BY revision.revision_number;
```

Staging and its idempotent replay used:

```sh
pnpm --filter @workspace/scripts exec tsx src/cms/guardrails-reconciliation.ts --apply-db --target=development
```

Contract generation and verification completed before any browser work:

```sh
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-spec run codegen:check
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/cognirise-admin run typecheck
pnpm --filter @workspace/scripts run typecheck
pnpm --filter @workspace/scripts exec tsx --test src/cms/guardrails-copy-fidelity.test.ts src/cms/guardrails-redesign.test.ts src/cms/guardrails-reconciliation.test.ts
```

The existing post-merge hook already invokes this exact reconciliation command
after schema preparation and the other guarded CMS reconciliations:

```sh
pnpm --filter @workspace/scripts exec tsx src/cms/guardrails-reconciliation.ts --apply-db --target=development
```

## Browser evidence and source limitations

Rendering, interactions, print, before/after screenshots and like-for-like
copy measurements are recorded separately in
[guardrails-redesign-browser.md](guardrails-redesign-browser.md). Those captures
use the actual exported revision payloads in an explicitly synthetic browser
fixture, not an authenticated preview capability.

Opening the database-resolved Admin link through the normal preview browser
reached the sign-in form and HTTP 401 responses. No authorized session was
available, and none was manufactured. The real authenticated save/reload/preview
journey remains unverified; fixture results do not establish authentication.
The boundary capture is `screenshots/guardrails/redesign/admin-auth-boundary.jpg`.

The four PNG screenshots and Set / Prove / Hold inspiration HTML named in the
assignment were absent from this checkout and could not be inspected. The
retained original page-copy Markdown, both supplied SVG diagrams, existing
renderer and website patterns informed the implementation instead. No attack
statistics, standards versions, legal assertions or institutional claims were
imported from the unavailable HTML. Existing source claims remain pending
normal factual/legal review.