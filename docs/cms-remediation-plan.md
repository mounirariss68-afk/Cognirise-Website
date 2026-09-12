# CMS reliability and usability remediation plan

Prepared: 12 September 2026

Status: implementation executed following two review passes. See [execution evidence and verification limits](cms-remediation-execution.md) for delivered coverage and test results. This plan alone is not a claim that every workflow has passed live testing.

## 1. Purpose and boundaries

Make ordinary CMS work straightforward while retaining exact-revision publishing, permissions, regional availability, audit history, immutable media, and recovery.

The approved direction is a compact People table with market ticks, simpler content screens, and consistent save/review/publish behaviour. Simplification must remove unnecessary interaction, not safeguards.

Scope covers the 19 findings from the first review and 11 additional findings or verification gaps below. Existing content, pending drafts, published revisions, regional exceptions, artwork, and protected methodology content are not to be rewritten as part of UI remediation.

### Evidence and limitations

- First review: 87 admin tests and 156 API tests passed using the normal package commands.
- Browser verification: real login/MFA; disposable person create, edit, save and reload; revision visibility; unsaved-navigation warning; read-only inspection of major admin screens.
- Second review: source-level tracing of failure handling, external delivery, schemas, form controls, upload state, permissions, and existing verification documentation.
- No new exhaustive browser pass was performed for the second review. Fault scenarios below are code-supported findings or explicitly labelled test gaps, not reproduced production incidents.
- Test fixture cleanup failed on a revision-author foreign key in the first review; narrowly scoped cleanup subsequently removed the known fixture records. The helper needs repair before wider automated mutation testing.
- Older verification documents are useful specifications, not proof that current behaviour still passes.
- Existing production content must not be used as a test fixture. This plan does not authorize production publishing.

## 2. Findings register

Original numbering is retained so no previously agreed item disappears.

| ID | Finding | Evidence class | Delivery packages |
| --- | --- | --- | --- |
| 1 | Rich-text editing loses list style, quote attribution and some item boundaries | Confirmed code defect | W03 |
| 2 | Navigation hydration and destination switching can discard unsaved changes | Confirmed code defect | W02, W06 |
| 3 | People duplicates availability cards and a separate table | Observed usability problem | W04 |
| 4 | People matrix ignores list filters/pagination and stops at 100 records | Confirmed code defect | W04 |
| 5 | Legacy and shared People publication paths expose inconsistent next steps | Confirmed usability problem | W04 |
| 6 | People creation is long and readiness/required-field messaging is inconsistent | Browser observation | W03, W04 |
| 7 | Main editor exposes too many concerns and scroll regions | Browser/source observation | W05 |
| 8 | Publication readiness and action labels do not clearly agree | Browser observation; not a proven authorization bypass | W05 |
| 9 | Uncertain-save recovery lacks convenient durable draft recovery/export | Capability gap | W02, W05 |
| 10 | Ordinary image metadata lacks a general editing surface | Confirmed UI gap | W07 |
| 11 | Contact email uses a full document editor for a small settings change | Browser/source observation | W08 |
| 12 | Navigation exposes raw hierarchy/order fields in a long screen | Browser/source observation | W06 |
| 13 | Eligible non-office drafts lack the permanent-delete UI the API supports | Confirmed UI gap | W05 |
| 14 | User management lacks access to users beyond the first 50 | Confirmed code defect | W09 |
| 15 | Submission exports omit the active text-search filter | Confirmed contract/UI mismatch | W10 |
| 16 | Dashboard review-age and conversion labels disagree with calculations | Confirmed code defects | W10 |
| 17 | Media lacks focal-point controls and visible review history | Capability gaps | W07 |
| 18 | Development /admin entry without trailing slash fails instead of redirecting | Browser observation; production not checked | W11 |
| 19 | Important mutation paths lack direct behavioural verification | Verification gap | W00, W12 |
| 20 | Several mutations commit before audit recording; an audit failure can turn a successful mutation into an apparent failed request | Confirmed error-path defect | W01 |
| 21 | Invitation/reset delivery occurs before database commit, so delivery and committed token state can disagree | Confirmed error-path defect | W01, W09 |
| 22 | Several dialogs and per-record controls allow dismissal or overlapping operations while requests remain active | Confirmed interaction gaps; exact outcomes need fault tests | W02, W09 |
| 23 | Document search/status changes retain the previous page number, producing misleading empty pages | Confirmed code defect | W04, W05 |
| 24 | Completed and started/failed uploads cannot be cleared from the persisted queue | Confirmed UI/lifecycle gap | W07 |
| 25 | Document rows are mouse-click targets without equivalent semantic links; several controls lack accessible names | Confirmed accessibility gaps | W04, W05, W12 |
| 26 | Concurrent contact-settings initialization has no conflict/refetch recovery in the UI | Confirmed recovery gap, not proof of duplicate committed documents | W08 |
| 27 | Related-record inputs expose raw identifiers and some enumerated relationships use unrestricted text | Confirmed usability/validation gap | W03 |
| 28 | Public navigation failures still render the branded NotFound page | Confirmed code defect; prior outage demonstrated its impact | W11 |
| 29 | The previously repaired schema mismatch needs explicit recurrence and readiness verification beyond one additive repair | Reliability/test gap, not a new missing-column incident | W00, W11 |
| 30 | Browser-fixture teardown failed after new revisions were created | Observed test-tooling defect | W00 |

### Corrections and exclusions from the deeper review

Do not create duplicate implementations for capabilities that already exist:

- DocumentDetail already edits SEO title, description, canonical URL and no-index.
- MediaLibrary already provides hero-film assignment and protected download.
- Document history, comparison, rollback and restore already exist.
- Upload retry, checksum-based reattachment and review-error recovery already exist.
- Generic document editing already protects dirty drafts and isolates edition query keys. Navigation needs equivalent protection; that does not mean the generic editor has the same bug.
- Unified invitation/reset password setup is not a demonstrated token-purpose vulnerability.
- Current user status is checked during authentication. A deactivation privilege bypass was not established.
- Serialized uploads and same-byte reattachment under a renamed file are not inherently defects.
- Some schema fields, such as publication platform relationships/social text, have no confirmed public consumer. Record them in the field-coverage inventory; do not add decorative controls or delete their data without defining their purpose.
- A historical person-preview loading issue requires reproduction against current code before being classified as an active defect.

## 3. Non-negotiable implementation rules

1. Save draft, review and publish remain distinct operations. An authorized combined action may orchestrate them, but must report each actual outcome.
2. Publication refers to an exact reviewed/saved revision and explicit destinations, never whatever happens to be newest when a background request finishes.
3. Approved live content remains public while a successor draft is edited, reviewed or rejected.
4. Regional unavailability is evaluated before fallback. A hidden market must not accidentally inherit a visible source.
5. A simplified tick indicates a staged decision separately from what is currently live.
6. Preserve immutable asset-version references. Metadata edits, crop changes and replacement uploads must not rewrite already published output.
7. Archived/restored content does not silently republish. Permanent deletion remains restricted to eligible never-published documents and authorized actors.
8. Preserve MFA, CSRF, role and market authorization on every applicable server mutation. Hiding a control is not authorization.
9. Explicit chat approval of specified content retains its existing supported meaning. This plan is not approval to publish unrelated content.
10. No broad schema push, content reconciliation, bulk republish or historical rewrite as a shortcut to a targeted fix.
11. Keep UAE and Saudi editorial copy separate according to the existing project rule.
12. Do not rewrite protected IDAO/Agent Authority material or replace approved artwork.

## 4. Delivery sequence and dependencies

Use small coherent releases, not a single CMS rewrite. Package IDs below are planning identifiers, not newly created project tasks.

| Phase | Packages | Dependency and release gate |
| --- | --- | --- |
| A: baseline and protection | W00, then W01/W02/W03 and W11 | Safe fixtures first; core data-loss and operational-failure protections verified before broad UI changes |
| B: shared editor and People | W04 and W05 | W02/W03 contracts stable; preserve legacy/shared publication parity |
| C: specialized screens | W06, W07, W08, W09, W10 | W01/W02 shared mutation handling available; independent screens can proceed in parallel |
| D: complete verification | W12 | All relevant packages complete; per-path evidence and content-preservation comparisons pass |

Dependencies within phases:

- W03 rich-text correction can ship before the broader editor redesign.
- W11 outage classification and entry redirect can ship independently after baseline checks.
- W04 and W05 share document/list components; coordinate that boundary rather than editing the same large component in parallel.
- W07 media work must expose stable field/reference controls before W03/W05 integrate those controls.
- W09 account delivery UX depends on W01's durable delivery state.
- Existing project work on outage messages, contact verification, LinkedIn persistence and shared action states should be reused or updated where it overlaps. Do not create duplicate tasks when this plan is scheduled.

## 5. Detailed work packages

### W00 — Establish trustworthy fixtures, coverage and preservation baselines

**Addresses:** 19, 29, 30. **Depends on:** none.

Implementation:

1. Extend the existing CMS journey matrix rather than starting a competing document. Enumerate every route, content kind, mutation, role, market/locale and public consumer.
2. Repair fixture teardown ordering for newly created revisions and every dependent object the fixture owns. Use exact fixture identities and transactions; never broad prefix-only deletion against user data.
3. Track fixture-created documents, editions, references, availability decisions, sessions, tokens, capabilities and related rows. Distinguish durable audit evidence from removable fixture state according to the audit retention policy.
4. Make setup/cleanup replay-safe and able to recover after interruption. Report residual IDs without printing credentials or private payloads.
5. Capture a read-only baseline of published pointers, edition availability, media pins, revision counts and content hashes for representative real records. Baseline collection must not change them.
6. Record existing test commands, test counts, uncovered flows and the environment in which each result was obtained.
7. Inventory migration/startup/reconciliation responsibilities. Identify exactly where schema compatibility should gate readiness, without running the whole content reconciliation script during this investigation.

Acceptance:

- Fixture create -> save multiple revisions -> preview/review operations -> cleanup succeeds with no fixture-owned dependent rows unintentionally remaining.
- Interrupted setup and repeated cleanup are safe.
- Existing user content and publication pointers match their pre-test baseline.
- Coverage matrix includes all ten document kinds and every non-document save path.

Tests: foreign-key teardown, interrupted fixture recovery, duplicate cleanup, schema migration replay and backward-compatibility checks.

Primary areas: scripts/cms-owner-browser-fixture.ts; docs/cms-journey-matrix.md; docs/cms-browser-verification.md; lib/db/migrations; lib/db/scripts; scripts/post-merge.sh.

Scoped implementation record: fixture teardown now discovers later browser-created
documents through exact fixture identities, removes dependent rows before
authors/users, refuses unsafe references, reports residual IDs, and supports a
read-only mode-600 preservation baseline under `/tmp`. Focused helper coverage
and a development baseline capture are complete; authenticated browser
reverification and before/after comparison remain target-environment checks.

### W01 — Make persistence, audit and account-link delivery reliable

**Addresses:** 20, 21. **Depends on:** W00.

Implementation:

1. Inventory each mutation that commits before calling audit or reloading its response: navigation, media, user administration, submissions, exports and document lifecycle operations.
2. Write the audit event, or a durable audit event record, in the same database transaction as its governed mutation. Do not simply swallow audit failure and claim normal success.
3. Define a shared response contract for rejected, committed, and confirmation-uncertain outcomes. Return operation/revision identities sufficient for an authorized client to check what happened.
4. Add idempotency to retry-sensitive operations, especially invitations, resets and export requests. Bind operation keys to actor and request identity.
5. Replace invitation/reset network delivery inside an open transaction with a durable delivery job committed alongside the token/user changes.
6. Design retryable delivery with bounded backoff, attempt state, provider idempotency when supported, and reconciliation when provider acceptance is uncertain. Do not promise exactly-once external delivery where the provider cannot guarantee it.
7. Protect delivery payloads containing access links: no raw tokens in logs/audit; encrypted short-lived job payload or another reviewed secure delivery mechanism; purge sensitive payloads after completion/expiry.
8. Expose truthful states: account created, delivery pending, delivery sent, delivery failed/retry available. Preserve the existing token-expiry and one-use guarantees.

Acceptance:

- Audit-write failure before commit rolls back the governed mutation or leaves a durable event that can be completed reliably.
- Failure after commit never invites a blind retry that duplicates the operation.
- No account link is dispatched before the associated token has committed.
- Provider timeout, worker retry and concurrent repeat requests produce a recoverable, visible delivery state.
- Successful save receipts identify the exact persisted state.

Tests: commit failure, audit failure, lost response, provider accepted/no response, duplicate operation key, expired token, worker restart and unauthorized receipt lookup.

Primary areas: API routes admin.ts, media.ts, navigation.ts, submissions.ts, documents.ts; lib/access-delivery.ts; audit helper; DB schema/migrations; generated API contracts.

### W02 — Standardize safe form and mutation behaviour

**Addresses:** 2, 9, 22. **Depends on:** W00; integrate W01 receipts.

Implementation:

1. Extract a reusable form-operation model: clean, dirty, validating, saving, saved, rejected, conflict and confirmation-uncertain.
2. Use a stable baseline identity and snapshot. A response for an earlier document, asset, user or edition must not update the newly selected screen.
3. Prevent overlapping conflicting mutations per record, not by freezing the entire application. Permit unrelated records to remain usable.
4. For pending requests, either prevent dialog dismissal with a clear explanation or move the operation into a persistent progress/result surface. Never silently abandon the only result surface.
5. If inputs remain editable while a request runs, track a subsequent dirty snapshot; otherwise freeze the relevant fields until the request settles. A successful old request must not mark newer edits saved.
6. Apply dirty-navigation protection to route changes, market/locale switches, tabs that change the record, reload, back navigation and modal closure where applicable.
7. Preserve field errors and map server paths to visible controls. Use accessible status text rather than transient toast-only feedback.
8. Provide exact-revision verification and deliberate recovery for uncertain saves, with copy/download of the local draft.
9. If durable local recovery is added, specify account isolation, retention, logout cleanup, quota handling and shared-device behaviour. Do not persist passwords, tokens or sensitive submission notes by default.

Acceptance:

- Double-click, Escape/backdrop during save, out-of-order responses, offline/online transitions and session expiry cannot silently lose or misattribute changes.
- A clean form may refresh; a dirty form is never replaced by background query data.
- Save confirmation corresponds to exactly the submitted snapshot.
- Recovery allows inspection without silently rebasing onto another editor's revision.

Tests: delayed mutation harness for each form family; concurrent editors; API 400/403/409/422/500/timeout; commit-succeeded/response-lost; local storage failure.

Primary areas: shared admin hooks/components; DocumentDetail; NavigationSettings; MediaLibrary; MarketEditions; UserAdmin; Inbox.

### W03 — Make content editing lossless and contracts complete

**Addresses:** 1, 6, 27; supports 7 and 19. **Depends on:** W00.

Implementation:

1. Replace rich-text flatten/parse editing with structured blocks supporting exactly the runtime schema: paragraphs, H2/H3, bullet/numbered lists and quotations with attribution.
2. Preserve punctuation, semicolons, multiline values and optional fields. Unsupported legacy content must be inspectable and explicitly handled, not silently discarded.
3. Keep migration of existing stored content unnecessary where possible: adapt the editor to the current schema rather than rewrite approved revisions.
4. Align runtime schema, OpenAPI-generated contracts and admin types, including quote attribution.
5. Build a field-coverage registry for every document kind: field path, draft/publish requirement, editor location, public/preview consumer, permission and intentional read-only reason.
6. Classify schema-only fields with no consumer. Decide their purpose before implementing new controls; preserve their stored values meanwhile.
7. Replace raw record UUID lists with searchable record pickers showing name, kind, status and availability. Preserve selected references that have become unavailable and show an actionable warning.
8. Replace enum-backed free text, such as case-study industries, with constrained multi-selects.
9. Provide internal destination pickers and safe custom-link entry. Warn about unresolved internal destinations and broken references; do not make draft saving depend on external websites responding.
10. Separate minimal draft creation requirements from publication completeness. Generate editable slugs and validate collisions early without changing existing public slugs.

Acceptance:

- Every supported field round-trips through edit -> save -> reload unchanged unless explicitly edited.
- Editing one rich-text character cannot change list style, quote attribution or another block.
- Every publishable field is editable, intentionally derived, or explicitly read-only; no unexplained contract orphan remains.
- Field validation names the field and takes the editor to it.
- Public and preview consumers are checked, not assumed merely because the save API accepts a field.

Tests: schema fixture per kind, rich-text exact deep equality, empty/clear operations, reference selection/removal, inaccessible records, optional fields and generated-contract parity.

Primary areas: ContentEditor.tsx; per-kind editor modules; lib/api-zod/src/cms-content.ts; lib/api-spec; public renderers and CmsPreview.

### W04 — Replace People duplication with one clear table

**Addresses:** 3, 4, 5, 6, 23, 25. **Depends on:** W02/W03.

Implementation:

1. Use one server-paginated result model for identity, market decisions and publication status. Remove the independent first-100 matrix request.
2. Default columns: person name, role, each configured market, overall status, updated time and actions.
3. Show current live availability as a tick and pending differences as a small distinct state. Provide a legend and accessible text; do not rely on colour alone.
4. Keep one normal availability interaction model across legacy/shared records using a compatibility adapter. Avoid a bulk data migration unless parity cannot be achieved otherwise.
5. Saving stages tick changes. A review/publish action summarizes exact pending destinations and affected revision. No hidden automatic publication.
6. Explain role-specific next steps: editable, awaiting review, publishable or administrator action needed.
7. Support locale exceptions in an expanded row/drawer. Do not imply a single tick covers all locales when it represents only a default locale.
8. Offer short create and edit drawers; keep biography, photo and advanced regional overrides out of the default table.
9. Reset pagination when filters/search change, handle deletion reducing page count, and show accurate zero-result states.
10. Use semantic links/buttons, labelled menus, visible focus and accessible table headers. On narrow screens show identity/actions and an expandable market panel rather than a page-wide unlabelled scroll surface.

Acceptance:

- Search, status, pagination and availability always describe the same records, including beyond 100 people.
- A common availability change requires a tick change and one save; publication remains explicit and scoped.
- Legacy/shared records have consistent labels and equivalent public results.
- Keyboard-only users can create, open, edit, stage and inspect a row.
- Market/locale exceptions and pending/live differences remain visible without expanding every row.

Tests: admin/editor/publisher according to existing permissions; large dataset; multi-locale; concurrent availability edits; failed save; review/publish exact version; hidden market before fallback; successor draft retaining live profile.

Primary areas: DocumentList; PeopleMarketMatrix; MarketAvailabilityChecklist; document availability API.

### W05 — Simplify the main editor and complete lifecycle controls

**Addresses:** 7, 8, 9, 13, 23, 25. **Depends on:** W02/W03; coordinate with W04.

Implementation:

1. Split the large editor into workflow controller, content sections, readiness panel, regional settings, SEO and history components without replacing the backend model.
2. Default to Content. Keep a persistent, compact action bar with saved/dirty state, Save draft, Preview and the next permitted review/publication action.
3. Retain existing SEO/history/compare/rollback controls behind clearly named tabs; do not rebuild capabilities already present.
4. Show one readiness summary. Blocking items link directly to their controls; warnings are visibly different from blockers.
5. Offer Save and preview, opening only the confirmed saved revision. Display revision, market and locale on every preview.
6. Show regional exceptions in a collapsed panel with summary counts and affected destinations. Do not hide conflicts or ambiguous source selection.
7. Provide a consistent Remove action based on server-returned eligibility. Eligible never-published drafts can be deleted; published/history-bearing content is archived with explicit scope.
8. Make archive/restore/rollback consequences clear, including whether one edition or the whole record is affected. Restoration remains a draft/review process, not republishing.
9. Reduce nested scroll regions and preserve the user's field/section position after validation.

Acceptance:

- An ordinary text edit does not require visiting SEO, availability or history.
- Readiness and action labels explain exactly what the next click will do.
- Preview is the saved revision requested, never an unrelated public fallback.
- Deletion eligibility and scope match the API and all publication history.
- Existing revisions, source identities and live pointers remain unchanged by layout refactoring.

Tests: each content kind; field-focus on error; protected preview on desktop/tablet/mobile; archive/restore/rollback; shared source with custom destinations; unauthorized actions; successor review/rejection.

Primary areas: DocumentDetail; IndustryVisualWorkspace; ContentEditor modules; draft-save helpers; lifecycle endpoints.

### W06 — Make Navigation compact, safe and predictable

**Addresses:** 2, 12; supports 20, 22. **Depends on:** W01/W02.

Implementation:

1. Render an accessible menu tree with label, visibility and destination summary.
2. Use approved page pickers, constrained parent selection and reorder controls with keyboard alternatives. Preserve valid custom URLs under advanced options.
3. Validate cycles, missing parents, duplicate identities, invalid order and destination constraints on the server as well as in the UI.
4. Preserve draft state on refetch; confirm market/locale switches. Constrain locale selection to configured/supported choices.
5. Make saved, reviewed and live versions explicit. Explain the existing authorized direct-publication policy rather than silently adding or removing a review gate.
6. For partial releases, overlay only reviewed changes onto the exact live snapshot; preserve unrelated live restrictions and pending changes.

Acceptance:

- No unsaved navigation loss on refetch or destination switch.
- Invalid hierarchy produces field-level guidance and cannot be published.
- Reordering works by keyboard and pointer.
- Partial publication cannot erase unrelated menu labels, restrictions or visibility.

Tests: simultaneous admins; stale version; partial release; failed audit/response; dirty switch; retired destinations; actual public header and sitemap.

### W07 — Complete media editing, queue lifecycle and review context

**Addresses:** 10, 17, 24. **Depends on:** W01/W02; integrate W03 reference controls.

Implementation:

1. Provide a shared asset-details panel for image, motion and campaign metadata, with type-specific controls and validation.
2. Add missing image alt text, caption and credit editing through versioned metadata APIs. Define which campaign fields are editorial context versus immutable published metadata.
3. Add a focal-point control with representative card/hero previews. Prefer non-destructive focal metadata; do not promise destructive cropping without specifying generated renditions.
4. Show review identity, time, decision and relevant version from existing audit/version records.
5. Distinguish Choose another asset from Upload a new version. New bytes need new immutable identity/version and fresh review as applicable; show affected references and do not rewrite existing publications.
6. Preserve the existing protected-download and upload-retry implementations; improve labels and coverage rather than duplicate them.
7. Add Clear completed and Discard failed/local queue entry actions. Clarify that removing a queue entry does not delete an approved server asset.
8. Define bounded persistence and safe abandoned-upload retention. A cleanup operation may remove only provably unreferenced expired staging objects, never immutable published versions.
9. Make uploaded, awaiting review, rejected and ready distinct from transfer progress.
10. Keep retry idempotency, checksum reattachment, user isolation and explicit storage/quota errors.

Acceptance:

- Image metadata changes persist after reload and appear in the intended new draft/version, not old live revisions.
- Focal-point changes preview consistently at relevant aspect ratios.
- Review history explains why an asset is usable or blocked.
- Queue entries can be cleared and stay cleared after reload without deleting server content.
- Downloaded bytes match the selected protected asset/version.

Tests: PNG/JPEG/WebP/GIF/PDF and supported video contracts; incorrect MIME/size/hash as applicable; expired upload URL; lost request/finalize response; duplicate replay; reload after PUT; rejected upload status; metadata review; referenced delete rejection; quota failure; cleanup retention.

Scoped implementation record: the server-side staging janitor is now a
separate dry-run-by-default CLI with explicit apply mode. It lists only the
staging namespace, requires a storage generation and age proof, locks pending
asset rows with `SKIP LOCKED`, records a terminal marker before deletion, and
retains uncertain, active, referenced, immutable, or published state. Adapter
tests cover dry-run non-mutation, rollback, interruption recovery,
idempotence, lock contention, and published-version protection. Queue UI
clear/discard behavior and target-environment operational approval remain
browser/release verification work.

### W08 — Give Contact settings a focused, conflict-safe interface

**Addresses:** 11, 26. **Depends on:** W02/W03.

Implementation:

1. Use a dedicated contact-details form backed by the existing governed document.
2. Show the canonical email and publication state; put regional/localized exceptions in a secondary panel.
3. Preserve the underlying draft/review/publish lifecycle and audit trail, with concise action labels.
4. Make initialization converge on the canonical record using unique identity plus conflict-aware retrieval. If another editor creates it first, load that record rather than show a dead-end error.
5. Preserve unrelated fields and drafts when changing the contact value.
6. Link to advanced history/edition detail without making it the normal editing route.

Acceptance:

- Two simultaneous initializations resolve to one canonical document.
- Invalid email is rejected beside the field.
- Save alone does not change the public contact address.
- Authorized publication updates the intended destinations and does not leak one market's copy into another.

Tests: initial creation race; save/reload; regional override; permissions; review/rejection/publication; public mailto and contact-form destination; pending unrelated edits.

### W09 — Make user and market administration reliable

**Addresses:** 14, 21, 22. **Depends on:** W01/W02.

Implementation:

1. Add user search, server pagination and filters. Make owner/actor pickers searchable beyond their current fixed limits.
2. Serialize conflicting operations for a single user; disable or queue role/status/access changes while its request is unresolved.
3. Preserve invite/reset result state through dialog interactions and show durable delivery status with safe retry.
4. Retain MFA and market restrictions; show only permitted actions and enforce them independently server-side.
5. Apply safe pending/dirty form behaviour to market create/edit/delete.
6. Explain canonical/default/fallback constraints and deletion blockers before submission where known. Keep authoritative validation on the server.
7. Review market-code/default-locale changes for their effect on existing references; do not silently rewrite related editions.

Acceptance:

- Administrators can reach every user and assign an owner beyond the first result page.
- Rapid role/status/access changes cannot produce misleading final state.
- Invitation/reset delivery can be retried without creating unexplained duplicate operations.
- Market errors preserve inputs and explain the blocking relationship.
- Suspended/unauthorized users remain unable to perform protected actions.

Tests: large user list; out-of-order requests; pending dialog dismissal; delivery timeout; last-admin/role policy; market deletion references; invalid fallback/canonical configuration; session invalidation and permissions.

### W10 — Align submissions, exports and dashboard meaning

**Addresses:** 15, 16; supports 20/22. **Depends on:** W01/W02.

Implementation:

1. Make export accept the same supported filters as the list, including search. Define whether export means all matching rows or current page; default to all matching rows and label that explicitly.
2. Preserve queued/ready export handling and distinguish an unavailable download from successful export completion.
3. Apply safe edit/save handling to status, assignment and notes, including explicit clearing.
4. Align review-age query and UI threshold. Treat 48 hours as the candidate definition implied by current UI, but confirm it against documented policy before changing the query.
5. Align conversion label, numerator and denominator; document the formula and zero-denominator behaviour.
6. Add useful drill-through links to the corresponding filtered lists where existing routes support them.

Acceptance:

- Export contents match the exact search/status/type combination, without leaking unauthorized records.
- Saved submission fields and explicit clears persist after reload.
- Dashboard descriptions precisely match tested calculations.

Tests: filter combinations; empty results; export queued/download failed; permission checks; timezone/threshold boundary; zero denominator; failed audit and lost response.

### W11 — Prevent misleading outages and verify schema readiness

**Addresses:** 18, 28, 29. **Depends on:** W00.

Implementation:

1. Replace navigation-query error -> NotFound with an explicit temporary-service-error state and retry action.
2. Keep genuine missing/disabled routes separate. Do not bypass availability gates or silently restore compiled content when configured CMS delivery fails.
3. Audit other public CMS consumers for the same missing-content-versus-service-failure confusion.
4. Normalize /admin to /admin/ at the appropriate routing layer without affecting API routes or nested links. Verify the actual published routing separately.
5. Add targeted readiness checks for required schema compatibility and representative public navigation queries before declaring a release healthy.
6. Retain additive/idempotent migration preparation and test both older-schema upgrade and fresh setup. Do not run content reconciliations merely to satisfy schema checks.
7. Record actionable operational diagnostics without exposing SQL details or private data to visitors.

Acceptance:

- Navigation 500, timeout and invalid payload show a service-error state, not a missing-route claim.
- Deliberately disabled destinations remain unavailable.
- Required schema incompatibility fails readiness clearly instead of presenting a healthy release.
- Navigation, representative pages and sitemap pass checks after migrations.
- Production repair claims require actual production verification; development success alone is insufficient.

Tests: fault-injected navigation responses; retry recovery; disabled market; fresh/upgrade schema; migration replay; root/nested admin paths; public lists/details/sitemap parity.

Scoped implementation record: the website now renders a retryable temporary
service-error state for navigation and authoritative CMS outages while keeping
classified 404s unavailable; `/api/readyz` checks database, required schema
columns including the 0027 receipt/outbox delivery tables, and a representative
public-navigation probe, and startup performs the same non-mutating check.
Fresh migration/replay coverage, focused readiness/error tests, and a
development-only idempotent pre-push merge preparation are present.
Published-host `/admin` redirect and production readiness remain unverified and
must not be claimed as complete.

### W12 — Prove complete journeys, usability and release safety

**Addresses:** 19, 25 and all package acceptance criteria. **Depends on:** relevant packages complete.

Implementation:

1. Update the shared coverage matrix after each coherent package. Run focused tests during work; one integrated browser pass per completed release unit, not per edit.
2. Separate API/unit evidence from actual browser evidence and from read-only production checks.
3. Run the per-kind and cross-cutting matrices below. Track any not-run path as a release exception with a reason; never describe it as passing.
4. Test keyboard and assistive-technology semantics plus responsive interaction at 320/390, 768 and 1366/1440 pixel widths.
5. Require visible labels/focus, accessible validation and dialog focus return; normal tasks must not depend on pointer-only row clicks.
6. Compare before/after publication pointers, revision/media identities and representative rendered output.
7. Verify cleanup, safe rollback/roll-forward compatibility and operational runbooks.

Acceptance:

- Every in-scope mutation has a named test or explicit exception; no silent coverage gaps.
- No loss of unchanged fields, accidental publication or cross-market content exposure.
- No unresolved high-priority data-loss, authorization or misleading-success defect.
- Routine People availability, contact email and navigation visibility changes are measurably simpler without removing their capabilities.

## 6. Mandatory verification matrix

### Per document kind

For every kind, cover initial draft, edit each supported field, clear optional values, save/reload, validation errors, preview where supported, review/reject, publish, archive/restore, history/rollback and eligible deletion. Where an operation is intentionally unsupported, record the reason rather than skip silently.

| Kind | Additional cases |
| --- | --- |
| Person | role/profile/photo, live vs pending ticks, default/non-default locales, shared and legacy sources, leadership preview |
| Partner | evidence links, logo, related records and public placement |
| Platform | capabilities/sections/CTA, rich blocks, template contract and actual public consumer parity |
| Publication | rich body, social image, topics/sectors, schema-only relationship disposition |
| Case study | enum industries, evidence/outcomes, rich work, image pins and card/detail consistency |
| Industry | standard plus Education/Banking/Public Sector editors, section inspector and exact preview |
| Framework | methodology blocks, worked example, required media and protected content boundaries |
| Office | contact/location fields, region, archive/restore and permanent-delete eligibility |
| Site configuration | contact settings plus existing hero MP4/WebM/poster assignment, distinct immutable assets |
| Landing page | every supported section, media/legal/SEO, retired paths, explicit handling of migration placeholders |

### Non-document operations

| Surface | Required paths |
| --- | --- |
| Navigation | save, review, authorized publish, version conflict, market/locale switch, hierarchy validation, partial release |
| Media | intake, request, PUT, renew, finalize, retry, reattach, queue clearing, metadata, approve/reject, select/replace, protected download, eligible delete |
| Markets | create, edit, delete, canonical/fallback/locale constraints, referenced deletion, failed/pending save |
| Users | list/search, invite, delivery retry, role/status/access, reset, concurrent actions, permissions |
| Authentication | login, MFA enrollment/challenge, recovery, invitation/reset consumption, expiry, logout/session invalidation |
| Submissions | search/filter/page, assign/status/notes/clear, save/reload, matching export, queued/failed download |
| Audit | immutable view, actor/entity/date filters, pagination, event availability for every mutation |
| Contact settings | first initialization, concurrent initialization, draft save, regional override, review/publication, public delivery |
| Operational | schema readiness, API outage classification, /admin normalization, fixture cleanup |

### Cross-cutting fault and authority cases

- Roles: administrator, publisher, editor and any configured read-only role; authenticated without MFA; expired/invalid session.
- Scope: assigned/unassigned market; canonical/shared/custom source; explicit suppression; default and non-default locale; fallback.
- State: new draft, live with successor draft, in review, rejected, archived, restored, stale revision, missing referenced asset.
- Requests: double submit, response reorder, delayed response after switching record, validation rejection, 403, 409, 422, 500, timeout, lost post-commit response.
- Persistence: audit failure, external delivery uncertainty, storage quota, refresh after upload PUT, missing local file, replayed finalize, stale asset version.
- Public delivery: exact revision, immutable media, correct market/locale, no draft leaks, live successor retention, consistent list/detail/navigation/sitemap.

## 7. Completion and rollout criteria

Each package is complete only when its UI, server behaviour, error handling, permissions and tests agree. A backend feature without usable controls, or a control without correct persistence/public delivery, is incomplete.

Before release:

1. All original findings 1-19 and additions 20-30 are closed by evidence or explicitly dispositioned as a documented non-defect/test gap.
2. Run the normal admin/API suites and affected website checks; retain results with environment and date.
3. Complete the integrated browser matrix on disposable fixtures; confirm cleanup.
4. Compare preservation baselines and resolve unexpected content/publication changes.
5. Check additive migration compatibility and deployment readiness without unrelated content reconciliation.
6. Review accessibility and laptop/mobile acceptance.
7. Publish only through the normal authorized release process. After publication, perform read-only production checks of representative pages, navigation, sitemap and CMS entry; do not send test invitations or modify live content.
8. Keep rollback/roll-forward instructions explicit. Database compatibility and published content must survive reverting a UI release.

## 8. Source evidence and existing documentation

Source locations are navigation aids; line numbers may change during implementation.

| Finding group | Primary source anchors |
| --- | --- |
| Rich-text conversion | admin pages/documents/ContentEditor.tsx:33-47; lib/api-zod/src/cms-content.ts:107-112 |
| Navigation dirty state | admin pages/NavigationSettings.tsx:57-61,143-147 |
| People duplicate/capped query | admin pages/documents/DocumentList.tsx:70-85,197-203; PeopleMarketMatrix.tsx |
| Search/page and keyboard controls | DocumentList.tsx:208-229,257-285,310-311 |
| Missing ordinary image metadata | admin pages/media/MediaLibrary.tsx:617-630,1124-1146 |
| Queue cleanup | admin pages/media/upload-queue-engine.ts:250-255; BatchUploadZone.tsx:160-163 |
| Draft deletion | DocumentDetail.tsx:946-975,1057-1075; API routes/documents.ts:1995-2021 |
| User limits and pending dialogs | admin pages/users/UserAdmin.tsx:37,81-110,244-249,352-356 |
| Export mismatch | admin pages/submissions/Inbox.tsx:61-67,126-144 |
| Dashboard mismatches | API routes/admin.ts:93-94,121-123; admin pages/Dashboard.tsx:106-110,148-153 |
| Post-commit audit | API routes/navigation.ts:284-294; media.ts:599-607,616-626; admin.ts:212-214; submissions.ts:176-193 |
| Delivery-before-commit | API routes/admin.ts:187-212,316-336; lib/access-delivery.ts:26-46 |
| Contact initialization | admin pages/ContactSettings.tsx:38-58 |
| Public outage -> NotFound | website src/App.tsx:99-117 |
| Existing safety/coverage | docs/cms-journey-matrix.md; docs/cms-browser-verification.md; docs/cms-preview-coverage.md; docs/cms-publishing-diagnosis.md; docs/cms/operations.md |

## 9. Scope management

Not proposed: a new CMS product, an authentication migration, replacing the database, redesigning public brand artwork, rewriting approved content, or introducing new governance requirements merely to make a screen look complete.

Do not add speculative AI, scheduling, redirect-management or audit-export projects just because a route is absent. If an existing contract/requirement demands one, record that evidence and integrate it deliberately; otherwise it is outside this remediation.

The next implementation decision is release sequencing, not whether to preserve functionality: preservation is mandatory throughout.