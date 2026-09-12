# W12 CMS document-kind coverage

This is the W12 acceptance-test record for the ten runtime CMS document
kinds. It is intentionally narrower than a release sign-off: these tests use
the shared validation/save functions, an in-process route adapter for focused
authorization coverage, and a disposable PostgreSQL schema for the complete
lifecycle pass. They do not write production content or substitute for an
authenticated browser pass.

## Evidence added

| Evidence | Test file | What it exercises |
| --- | --- | --- |
| Kind parameterization, representative payloads, draft round-trip, publication readiness, media-reference collection and preview media discovery | `artifacts/api-server/tests/w12-kind-acceptance-api.test.ts` | `CreateDocumentBody`, `validateCmsSnapshot`, `collectCmsMediaReferences`, `previewMediaIds` |
| Editor and publisher market guard | `artifacts/api-server/tests/w12-kind-acceptance-api.test.ts` | The actual Express `PATCH /api/documents/:documentId` route, authentication, CSRF, MFA and `canAccessEditionTarget` path; the fixture pool rejects before a revision insert |
| Save/reload lifecycle for the priority gap kinds | `artifacts/api-server/tests/w12-kind-acceptance-api.test.ts` | The actual Express document save route and its revision insert, media-reference sync, audit call and response hydration for Partner, Platform, Case study and Framework |
| Admin save preparation, optional clear semantics, error-state classification and exact media pins | `artifacts/cognirise-admin/src/pages/documents/w12-kind-acceptance-admin.test.ts` | `buildDraftSave`, `normalizeDraftSeo`, `describeSaveFailure` and the API media-reference collector |
| Isolated PostgreSQL lifecycle for every kind | `artifacts/api-server/tests/w12-kind-lifecycle-postgres.test.ts` | A real Express app and real PostgreSQL pool whose connections use a disposable cloned schema; create, submit/review, reject, resubmit, publish, successor save, archive, restore, rollback, deletion eligibility and publication-history deletion guard |

The API route tests are bundled by the existing API test runner. They must not
be run with native Node TypeScript module resolution because the route graph
uses extensionless workspace imports. The admin test remains on the existing
`tsx --test` runner.

## Fixture inventory

Every fixture has a stable slug, title, summary, `markets: ["uae"]`, governance
metadata where that kind supports it, and a representative value for its
supported editorial fields. The fixture values are synthetic and use
`example.com`; they are not copied from or written to live content.

| Kind | Representative fields exercised | Optional clear exercised | Media disposition | Publication disposition |
| --- | --- | --- | --- | --- |
| Person | role, title, biography, contribution, focus areas, profile link, identity fallback/reference, governance | biography | Identity asset + exact version | Publish-ready contract |
| Partner | alliance category, positioning, facts, coverage, approved evidence, contribution, website, relationship status | contribution | Logo asset + exact version | Publish-ready contract |
| Platform | category, summary, template, rich sections (heading/paragraph/list/quote), capabilities, differentiators, CTA | CTA | Hero asset + exact version | Publish-ready contract |
| Publication | article variant, teaser, rich body, author, dates, reading time, topics, sectors, platform IDs, social metadata | updated date | Hero, document and OG-image references with exact versions in the API fixture | Publish-ready contract |
| Case study | full anonymized disclosure, sector enum, engagement/delivery/impact labels, visual reconstruction, mandate, context, constraints, rich work, controls, outcomes, approved evidence, quote, CTA | context | Hero asset + exact version | Publish-ready contract |
| Industry | path/name/thesis, capabilities, selected work, image, pressures, reversal, myth, GCC context, service, uses/source trail | hero media | Hero and supporting assets with exact versions | Publish-ready contract |
| Framework | methodology rich blocks, worked authority example, score/ceiling fields, CTA and protected hero | CTA | Hero asset + exact version | Publish-ready contract |
| Office | city, address, phone and governance | phone | No media field exists in the runtime schema; the tests assert the empty set rather than inventing one | Publish-ready contract |
| Site configuration | homepage hero poster and both MP4/WebM source pins | No content optional field; snapshot SEO clear is exercised through the shared update contract | Three distinct hero assets, each with an exact version | Publish-ready hero contract |
| Landing page | governed `/methodologies` narrative, section identity/order, media slot, CTA, SEO, legal and visual reference | CTA | Media slot and visual reference with exact version | Publish-ready contract |

The lifecycle Landing page fixture uses the generated `/methodologies` slot
contract and resolves its media slot to an immutable version, so it completes
the same real PostgreSQL publication sequence as the other nine kinds. An
unresolved migration placeholder is still rejected by the shared contract in
the separate draft-focused fixture suite; it is not silently promoted by this
lifecycle test.

## Cross-cutting acceptance coverage

### Round-trip and clear behaviour

The API parameterization first parses each fixture through the generated create
contract and then validates the complete snapshot through the runtime
`validateCmsSnapshot` boundary. It compares the resulting content object and
markets to the fixture so supported fields are not reduced to string-presence
checks. The admin parameterization sends the same content through
`buildDraftSave`, the shared editor save preparation used by the detail
workflow.

Each kind has one optional content field removed and is revalidated as an
editable draft. Snapshot-level SEO clear is also checked as the explicit
`seo: null` update shape. `normalizeDraftSeo` distinguishes an existing SEO
object being cleared from a document that never had SEO. This does not claim
that every optional field has a dedicated browser control; the field inventory
below records the remaining verification boundary.

### Immutable media pins

The API and admin tests collect references from every runtime media location
represented by the fixtures, including identity/logo/hero/document/OG-image,
industry supporting media, site hero poster and video sources, and landing
visual references. Every collected reference must carry its exact
`mediaVersionId`; the route preview helper must discover the same asset IDs.
Office is asserted to have no media field. No test uploads, replaces, approves
or downloads an object.

### Role and market authority

For every one of the ten kinds, both an editor and a publisher request a
synthetic `uae` mutation while the session is assigned only to `ksa`. The
request reaches the actual document route and is rejected with `403` before
the fixture client receives an `INSERT INTO cms_revisions`. This demonstrates
the route boundary and its no-mutation ordering, not a claim that every role,
locale and market permutation has been exhaustively tested.

### PostgreSQL lifecycle evidence

`w12-kind-lifecycle-postgres.test.ts` creates a uniquely named schema and
clones the public table definitions and indexes into it. The test changes the
database connection `search_path` before importing the application pool, so
all actual route transactions use only that schema. It seeds one administrator,
one enabled UAE destination, approved synthetic media assets/versions, and
parameterized content fixtures. Cleanup closes the route pool and drops the
schema; no existing public row is changed.

For every one of the ten kinds, the real route sequence asserts:

1. a never-published document is eligible for `DELETE` and is removed;
2. a draft is submitted, rejected with a persisted review comment, resubmitted
   and destination-reviewed;
3. the publisher route publishes the exact revision;
4. the database publication pointer and every exact media-version pin are
   asserted;
5. a successor draft saves without replacing the public revision or its media
   pins;
6. archive changes the edition state, restore returns it to draft while
   preserving publication history, and rollback creates a new draft carrying
   the selected historical payload; and
7. permanent deletion is rejected after publication history and the document
   remains present.

This is actual route behavior over PostgreSQL, not a source-string assertion
or a fake-pool claim. The isolated schema is disposable specifically so the
test can exercise committed route transactions without mutating existing
content.

### Priority adapter lifecycle evidence

Partner, Platform, Case study and Framework each run an actual route-level
draft save against a disposable in-process query adapter. The test verifies:

1. the route accepts the structured payload;
2. a successor revision is created through the route's shared save SQL path;
3. media-reference synchronization is invoked for pinned media;
4. audit recording is attempted; and
5. the response is hydrated from the saved payload with the new revision
   number and exact content.

The adapter is intentionally not presented as PostgreSQL evidence. It gives
route ordering and response-contract evidence without mutating a database.
The all-kind PostgreSQL sequence above is the lifecycle evidence; existing
focused lifecycle suites remain useful for additional transaction and
publication regressions:

- `artifacts/api-server/tests/postgres-cms-publishing.test.ts`
- `artifacts/api-server/tests/postgres-document-lifecycle.test.ts`
- `artifacts/api-server/tests/document-edition-lifecycle.test.ts`
- `artifacts/api-server/tests/office-lifecycle.test.ts`

## Not tested by this W12 addition

The following are explicit release exceptions, not implied passes:

- No browser, keyboard/assistive-technology, responsive-width or rendered
  public/preview parity evidence.
- No production or existing-content database mutation. The new lifecycle test
  mutates only its uniquely named disposable schema and drops it during
  cleanup. The in-process adapter test remains separate and is not counted as
  PostgreSQL evidence.
- No storage-backed media intake, upload retry/finalize, rights review,
  protected download, checksum reattachment or object cleanup.
- No browser or public-render parity evidence for the lifecycle sequence.
  The PostgreSQL test asserts persisted publication pointers and pin rows; it
  does not claim visual or accessibility parity.
- No object-storage upload/finalize flow: media rows are approved synthetic
  database fixtures, so storage existence and delivery permissions remain
  separate checks.
- No kind is silently treated as lifecycle-unsupported in the PostgreSQL
  sequence. The one intentional rejection covered there is the documented
  contract that a document with publication history cannot be permanently
  deleted; the test asserts `409` and row preservation for every kind.
- No complete Industry Education/Banking/Public Sector derivative matrix,
  localization matrix, fallback matrix or generated public template parity
  run. Those have separate focused tests and remain release checks.
- No real content, existing revision, publication pointer or media asset was
  used as a fixture or changed.

Accordingly, this document records concrete W12 API/admin evidence and named
gaps. It is not a claim that the mandatory matrix in the remediation plan is
complete or that a release is safe without the remaining database and browser
checks.