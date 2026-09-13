# Shared market editions contract

## Authorities and storage

`cms_shared_baselines` is the explicit neutral authoring baseline for one
`documentId` and locale. It is not a market or a public route. Creating it
copies a specifically selected historical revision into a new baseline
revision; it never changes the source edition, its live pointer, availability,
or publication state. A baseline records its locale and source revision
lineage. A new baseline revision is immutable and becomes an update candidate;
it cannot change live market output by itself.

`cms_market_edition_bindings` binds an exact `(document, market, locale)` to a
baseline as `shared`, `adapted`, or `independent`. Adapted bindings retain only
a schema-safe sparse override document and an adopted baseline revision.
Independent bindings retain their exact edition revision and never inherit a
later baseline. `cms_resolved_market_revisions` stores the fully materialized
snapshot and exact media pins selected for every review, preview, and publish
operation.

## Operations

All write operations require CSRF, MFA, optimistic `version`, documented
market/source access, and append an audit event.

| Operation | Method and body | Result |
| --- | --- | --- |
| List readiness | `GET /documents?readiness=missing\|pending\|blocker\|updates&market=&locale=` | Paginated document rows calculated before pagination, with per-market matrix summaries. |
| Inspect matrix | `GET /documents/{documentId}/shared-editions` | Baselines, bindings, availability/live/pending state, update and translation-lineage notices. |
| Establish baseline | `POST /documents/{documentId}/shared-baselines` `{locale, sourceRevisionId, version}` | Draft neutral baseline copied from an explicit source revision; no legacy promotion or move. |
| Bind a market | `PUT /documents/{documentId}/shared-editions/{market}/{locale}` `{mode, baselineRevisionId?, expectedVersion}` | Creates or changes Shared, Adapted, or Independent binding. Independent requires an exact revision; adapted requires same-locale baseline. |
| Save adaptations | `PUT /documents/{documentId}/shared-editions/{market}/{locale}/overrides` `{baselineRevisionId, overrides, expectedVersion}` | Validates typed, stable-ID sparse overrides and saves a materialized draft revision. |
| Compare | `GET /documents/{documentId}/shared-editions/{market}/{locale}/compare?baselineRevisionId=` | Three-way base/adopted/latest/local comparison, field changes, stable-array structural conflicts, and resolved snapshot. |
| Resolve baseline update | `POST /documents/{documentId}/shared-editions/{market}/{locale}/resolve` `{action: adopt\|keep\|reset\|detach, baselineRevisionId, expectedVersion, paths?}` | Explicitly adopts, records a reviewed hold, resets selected overrides, or creates an independent branch. No cascade occurs. |
| Migration report | `GET /documents/shared-editions/migration-report?locale=` | Read-only unresolved/source-candidate report and immutable receipts. |
| Migration dry run | `POST /documents/shared-editions/migration-dry-run` `{documentIds?, locale?}` | Calculates candidates/ambiguities only. It creates no baselines and performs no source promotion. |

`overrides` is a list of `{path, operation, value?}`. Paths are object keys or
stable `id` selectors (`sections[id=hero]`), never numeric array indexes.
Operations are `set`, `remove`, `array-add`, `array-remove`, and
`array-reorder`; every add needs a unique stable item `id`. Unknown fields,
schema-invalid resolved payloads, numeric paths, duplicate IDs, and incompatible
array structure are rejected. Compare exposes a structural conflict rather than
guessing a merge.

## Publication and locale rules

Existing availability remains the staged/reviewed/published destination
decision. A tick changes only that decision. Publishing a binding uses the
current materialized immutable revision and media pins with the existing review
gate; it cannot release another market. Public delivery continues to select
only approved exact snapshots. There is no live shared fallback for a managed
market.

Locale is part of every baseline and binding identity. Cross-locale baselines
have explicit source lineage. A source baseline update marks a translation
stale; it never replaces translated text or invents a locale. Arabic and other
locale baselines must be explicitly established from a selected revision.