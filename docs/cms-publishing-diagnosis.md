# CMS publishing diagnosis

The failure narratives below are synthetic fixture findings: they describe
request-path failures without using or mutating a real editorial record. The
authenticated Postgres regression uses random, disposable rows and cleans them
up after each run; it is not an owner-response or production-data test. No
owner response was available during this diagnosis, so editorial confirmation
of a particular live record remains unavailable.

## Reproduced failure paths

| Journey | Observable failure | Cause in the request path | Repair |
| --- | --- | --- | --- |
| Submit a saved revision containing governed media in a structured field | `POST /api/documents/:documentId/submit` reaches media governance with no reference for fields such as `heroMedia` or the education imagery slots, and returns `422 Review references unavailable or unapproved media` even when the selected asset/version is otherwise eligible | `syncMediaReferences` only iterated the legacy top-level `mediaIds` array and called `collectCmsMediaReferences` with `snapshot.kind`, although a validated snapshot does not carry `kind`. Structured references were therefore never pinned for the revision | Pass the document kind explicitly at every lifecycle call, collect both legacy and structured references, prefer an explicit immutable version pin, and use the resulting reference set for publication media checks |
| Submit while another save is waiting or has just committed | A stale request could validate a pre-wait latest-revision snapshot, or update zero rows and still continue to audit/hydrate as if it had submitted | Submission read the candidate outside a transaction, performed media work through the pool, and did not check the conditional workflow transition count | Begin a transaction, lock the exact edition first, read the latest candidate in a separate statement, perform media governance on that same client, and require the transition to return a row |
| Publish an exact revision while a save holds the edition lock | A request could report a false stale-revision conflict because the latest-revision query waited with a pre-wait `READ COMMITTED` snapshot | Publication combined latest-revision selection and row locking in one statement | Lock the edition first, then read the exact latest revision in a fresh statement |
| Administrator publishing a saved draft | The API rejected a valid saved `draft`/`rejected` latest revision with `409 Only ... currently in review`; the admin action was also absent from the editor | The API only accepted `workflow_state='in-review'`, while `editionAuthoringActions` exposed Publish only for in-review rows | Administrators may explicitly confirm publication of a latest saved draft/rejected revision; publishers still require review. Direct publication runs the same content, media, version-pin, destination, CSRF, MFA, role, and lock checks |
| Administrator publishing a shared source with staged destinations | A saved shared source could be blocked because no separate reviewed availability snapshot existed, even though the administrator had explicitly confirmed the source publication | Shared publication treated the availability review transition as a prerequisite for every role | The administrator transaction locks the availability state and source edition, verifies the exact current source revision, captures the current draft version and every staged destination decision, validates market authority and delivery governance, and publishes that immutable source plus availability snapshot atomically. Publishers and editors retain the reviewed-snapshot requirement |
| Administrator releasing a person availability-only decision | The release endpoint required `reviewed_version` even when the administrator was publishing the exact saved destination version | Person availability publication had no administrator direct-release branch | Administrators may publish the current `draft_version` directly; stale versions, shared-source states, destination authority, and governance checks remain enforced. Non-administrator review/release behavior is unchanged |
| Administrator publishing saved navigation | Navigation Publish returned `409 Navigation must be submitted for review before publication` after a valid save | The navigation route only selected `in-review` rows for release, unlike the document direct-publish contract | Navigation Publish now atomically captures saved `draft` or `in-review` item/page rows. Submit for review remains available as an optional workflow for administrators, while a saved navigation draft can be published in one confirmed action |
| Previewing structured media | Preview capability metadata omitted governed identity/logo/PDF, education imagery, or other structured references, and the binary capability check inferred `landing-page` when authorizing a media id | Preview metadata used `validation.data.mediaIds`; binary authorization called `previewMediaIds` without the authoritative document kind | Both protected preview stages now collect structured and legacy references with the stored document kind, then resolve only the exact revision-pinned media references |
| Submission or publication committed, then audit/response hydration failed | The client received a generic action failure despite the state transition having committed | Post-commit audit/hydration errors were not represented as committed outcomes | Return `DOCUMENT_SUBMIT_COMMITTED` or `DOCUMENT_PUBLISH_COMMITTED` with `committed: true`; the editor preserves the action error and tells the administrator to reload before retrying |

## Safeguards intentionally retained

- Document publication still requires an exact latest revision and never accepts
  unsaved editor state.
- MFA, CSRF, and role middleware remain on submit and publish. Only the
  existing administrator role receives the direct-publish branch.
- In-review revisions remain immutable. A publisher still cannot publish a
  draft directly.
- Media status, MIME role, dimensions, accessibility text, rights status,
  expiry, and exact immutable media-version checks remain enforced.
- Shared-source administrator publication captures the exact current saved
  destination matrix and source revision in the same transaction. It does not
  bypass destination authority, market configuration, industry delivery,
  media, or immutable-version governance. Publishers/editors still require the
  exact reviewed selection and source revision.
- Person availability-only administrator publication captures the exact current
  saved destination version; non-administrator releases still require review.
- Publication pointers advance only after the conditional workflow transition
  succeeds. A successor review or rejection therefore leaves the current live
  pointer in place.

## Regression evidence

Focused coverage was added to:

- `artifacts/api-server/tests/document-edition-lifecycle.test.ts` for an
  administrator publishing a saved draft without a mandatory review
  transition, while the existing publisher review path remains covered.
- `artifacts/api-server/tests/postgres-cms-publishing.test.ts` for an
  authenticated, MFA- and CSRF-protected real-Postgres route journey. It
  creates disposable media and a shared saved draft, verifies administrator
  direct publication, immutable media pinning, atomic availability publication,
  stale replay rejection, and editor role rejection. This complements rather
  than replaces the mock lifecycle fixtures.
- `artifacts/api-server/tests/framework-preview.test.ts` for structured-media
  capability collection and authoritative-kind checks in both protected
  preview stages.
- `artifacts/cognirise-admin/src/pages/documents/authoring.test.ts` for
  administrator-only direct-publish affordances and dirty-draft protection.
- `artifacts/cognirise-admin/src/pages/documents/DocumentDetail.test.tsx` for
  the administrator confirmation copy and exact saved-draft target.
- `artifacts/cognirise-admin/src/pages/documents/action-error.test.ts` for
  committed submission failures that must not be retried with a stale revision.

The OpenAPI publication operation now documents the administrator direct
publication rule separately from the publisher in-review rule.
