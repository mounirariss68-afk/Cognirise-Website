# CMS remediation: finding-by-finding verification ledger

This ledger retains all 30 original findings. “Implemented” refers to the
implementation inventory in [execution](cms-remediation-execution.md), not a
claim that every browser, role, destination or failure combination passed.
Previously recorded automated results are retained, not represented as rerun
by this verification task.

Evidence keys:
- **A**: previous automated evidence in execution and [kind coverage](cms-kind-coverage.md).
- **B**: previous bounded browser evidence in execution.
- **R**: [remaining browser verification](cms-remaining-browser-verification.md).
- **O**: [remaining operational verification](cms-remaining-operations-verification.md).

| ID | Finding | Implementation | Verification and remaining boundary |
| --- | --- | --- | --- |
| 1 | Rich text loses structure | Implemented W03 | A: authoring and kind round-trip contracts; not exhaustive field-by-field browser parity. |
| 2 | Navigation loses dirty state | Implemented W02/W06 | A/B plus R: final unknown-language rejection and dirty input. |
| 3 | Duplicate People interfaces | Implemented W04 | A/B: one People table observed. |
| 4 | People filters/page/100-record limit | Implemented W04 | A: people-table coverage and server-paginated model; large People browser dataset not claimed. |
| 5 | Legacy/shared People next steps | Implemented W04 | A: shared availability/recovery routes; not every destination in a browser. |
| 6 | Long creation and inconsistent requirements | Implemented W03/W04 | A/B: disposable person creation and save/reload; all-kind lifecycle A. |
| 7 | Main editor complexity | Implemented W05 | A/B: content-first editor and saved preview; no broad usability study. |
| 8 | Readiness/action disagreement | Implemented W05 | A: rendered editor and lifecycle checks; no claim of bypass testing. Existing separate approval-confirmation work retained. |
| 9 | Uncertain-save recovery | Implemented W02/W05 | A: recovery export/error handling; exhaustive response-loss browser tests not claimed. |
| 10 | General image metadata editing | Implemented W07 | A plus R: disposable metadata persistence and immutable-version checks. |
| 11 | Contact email uses full editor | Implemented W08 | A/B: focused form; public contact regression work remains separate. |
| 12 | Navigation raw hierarchy/order | Implemented W06 | A: hierarchy validation/named controls; R: keyboard and layout checks on Navigation. |
| 13 | Missing eligible draft delete UI | Implemented W05 | A/B: disposable person delete; isolated PostgreSQL all-kind eligibility checks. |
| 14 | Users inaccessible beyond first 50 | Implemented W09 | R: user pagination/filtering with disposable users. |
| 15 | Export omits search | Implemented W10 | A: submissions workflow/export contract; external export delivery not implied. |
| 16 | Dashboard labels/calculations | Implemented W10 | A: dashboard metrics; no production analytics validation. |
| 17 | Focal controls/review history | Implemented W07 | A plus R: focal metadata, review history and reference impact. |
| 18 | `/admin` missing-slash entry | Implemented W11 | A/B: development normalization; production not tested. |
| 19 | Mutation verification gap | Partially verified W00/W12 | A/B/R/O are bounded evidence; blocked and excluded paths remain explicit. |
| 20 | Mutation/audit atomicity | Implemented W01 | A: W01 audit, navigation hierarchy and lifecycle tests; no production fault injection. |
| 21 | Delivery before commit | Implemented W01/W09 | A: durable post-commit delivery tests; real delivery status/blockers in O. |
| 22 | Pending dismissal/overlap | Implemented W02/W09 | A: rendered guards; R covers specified dialogs, not all latency/failure permutations. |
| 23 | Filters retain obsolete page | Implemented W04/W05 | A: list reset contracts; R adds Users filtering/page reset. |
| 24 | Upload queue cannot clear | Implemented W07 | A plus R: clear/discard/reload; O: storage dry run only, never deletion approval. |
| 25 | Keyboard/names/semantic links | Implemented W04/W05/W12 | A/B plus R desktop/390px changed-surface checks; no assistive-technology certification. |
| 26 | Contact initialization race | Implemented W08 | A: conflict/refetch recovery; concurrent browser initialization not claimed. |
| 27 | Raw related IDs and free enums | Implemented W03 | A: authoring/string-list/schema contracts; complete kind/browser consumer parity remains outside this pass. |
| 28 | Public outage says NotFound | Implemented W11 | A: CMS delivery classification tests; existing public outage task retained. |
| 29 | Schema recurrence/readiness | Implemented W00/W11 | A: health readiness, migration replay, isolated lifecycle; development only. |
| 30 | Fixture teardown FK failure | Implemented W00 | A/B plus R: exact fixture cleanup, replay and preservation results. |

## Existing work deliberately not duplicated

Approval-confirmation bypass testing, long-session media preview verification,
and public contact-email regression coverage remain their existing tasks.
This ledger does not convert their automated checks into browser proof.
No deployment, production mutation, bulk publication, real-user mail,
content rewrite or storage deletion is authorized by this verification.

## Task 345: regional editor follow-up

| Complaint / root cause | Status | Fix and evidence | Remaining boundary |
| --- | --- | --- | --- |
| Pathless checks and nested correction controls. | **Blocked** | Structured producer issues, canonical nested paths, scoped actions and control registration are implemented; generated contracts and API/admin/library typechecks passed. Validator/control tests provide bounded automated evidence. | Comprehensive browser focus, repeated-item, media and keyboard correction coverage remains unexecuted. Implementation is not integrated acceptance. |
| Incomplete drafts could not be confidently saved and reopened. | **Passed** | Actual browser login/MFA, KSA platform selection, unique Summary edit, blank Next review date and Save Draft succeeded. Reselecting KSA recovered Rev 2 with the exact marker and retained immutable hero pin. | This proves one platform draft, not all ten browser contexts or all failed-save/conflict recovery paths. |
| Reload loses the selected regional version. | **Passed** | The resumed browser check confirmed the KSA URL/reload repair. The subsequent correction journey reopened the exact KSA edition without changing UAE. DocumentDetail's repaired rendered suite passed 57 tests, including its API mocks and exact-context state. | Not a claim of all-kind browser reload coverage. |
| Review required page assignments or unrelated approvals. | **Passed** | Targeted browser continuation used the actual assigned administrator: request correction → author edits/saves KSA Rev 2 → explicit accuracy confirmation → submit once → independent approval → fixture publisher releases exact KSA Rev 2. Protected preview matched the corrected summary and KSA footer. UAE remained published Rev 1 with its original summary and timeline. | This is the content-review/release journey, not destination-visibility release or all-kind browser acceptance. Recovery/empty-pool/assigned-request idempotence also passed the isolated PostgreSQL recovery test (10 HTTP cases). |
| Broader editorial/shared-source lifecycle. | **Passed** | The real PostgreSQL editorial suite passed after using independent reviewers and explicit disabled-historical-source grants. Scoped HTTP tests additionally passed first-baseline creation, missing fan-out authority rejection, and unrelated-locale successor isolation. | This does not replace the required copy/customization browser evidence. |
| CogniOS unavailable-media diagnosis. | **Passed** | [Read-only baseline](task-345-read-only-baseline.md): the referenced JPEG exists (160,562 bytes; verified checksum). The draft has legacy media fields without immutable revision pins, and rights/accessibility remain needs-review. Storage outage is not the cause. | Diagnosis does not grant approval or repair authority. |
| Existing CogniOS end-to-end preview/public repair. | **Blocked** | CogniOS is draft-only and its public route remains intentionally code-owned. No asset was approved, substituted or published to hide the warning. | Authorized media selection/review and the supported preview journey still need acceptance. Do not enable global cutovers or claim this existing route renders saved CMS edits. |
| Capability-specific Users and indirect API authority. | **Blocked** | Real PostgreSQL/HTTP evidence now covers configured-empty denial, exact regional media access and non-enumeration, regional-only shared-source denial, lower-role review authority, and immediate grant revocation. Transaction revalidation now reloads matrix state/grants. Legacy administrator scope is frozen separately from explicit matrices; Users starts from that frozen projection. | The complete Users browser checkbox/keyboard matrix and exhaustive indirect-operation matrix remain unexecuted. Do not confuse these outstanding checks with the now-passing scoped HTTP cases. |
| Regions copy/customize without live changes. | **Blocked** | Saved and distinct published source candidates are bounded to exact identities. Edited shared content is selected by its own baseline/revision pair, not its original copied CMS revision. Reuse/helper tests pass, including stale comparison consent and server-reported affected-destination scope. | Browser copy, local restore, partial failure/retry and shared/customized second-geography acceptance remain unexecuted. Component and PostgreSQL results are not substituted for those journeys. |
| Ten-kind lifecycle and public API pins. | **Passed** | `w12-kind-lifecycle-postgres.test.ts` passed against an isolated schema using real transactions and independent review, retaining publish/archive/restore/rollback/delete protections and public pin checks. | Not proof of all-kind browser editing, specialist-field parity or storage-backed public rendering. |
| Real storage-backed fixture integrity. | **Passed** | Harness setup/verify confirmed ten kinds, 22 immutable media references and real fixture objects. The browser correction journey retained the approved media pin and rendered the exact protected KSA preview. Original setup's trigger/foreign-key counts remain historical setup evidence, not a claim about the later additive schema. | Storage-backed public rendering still needs completion after deliberate visibility release. |
| Safe additive schema compatibility. | **Passed** | Development and the isolated browser schema dry-ran, applied and idempotently replayed through 0041. Content/revision, exact-copy provenance, per-revision effective governing origin, publication, availability, role/market/grant and frozen administrator-scope hashes matched. An initial historical metadata update correctly failed the immutable-history guard and rolled back; the applied migration adds only metadata storage/indexing, never rewrites history or disables its guard. Existing valid source identity supplies compatibility authority without a physical backfill. | Production migration and post-merge integrated acceptance are not claimed. The isolated schema retained its approved/rejected review records; no real pending reviews required disposition. |
| Honest fields, route ownership and responsive workspace across all kinds. | **Blocked** | Inventory now covers fixed nested/wildcard controls and revision-generated Guardrails leaves for both supported canonical versions, including protected exclusions. Hero-film and contact-email drafts save incrementally while publish schemas stay strict (24 validator tests passed). Context disclosure reads actual delivery configuration. | Source-level inventory tests are not proof of every field's integrated visible effect. All-kind browser, specialist/card/site-settings and narrow-screen keyboard coverage remain outstanding. |
| Published content was labeled “not published” in protected preview. | **Passed** | Both preview banners and metadata now say protected saved-version preview without inferring publication state from link protection. Website typecheck and three rendered preview tests passed. | Neutral labeling does not itself establish public visibility. |
| KSA public route after content release. | **Blocked** | Browser continuation exposed a fixture identity-domain error: availability rows used document-edition IDs rather than configured-market IDs. Both editor and public joins therefore correctly found no visible destinations. The harness now uses the correct domain; an isolated transactional repair remapped exactly 20 owned fixture references, retaining decisions and revision/publication pointers. Read-only idempotent replay and public-baseline equality passed. No shared source or broader grants were invented. | The intended UAE show/show and KSA show/off selections must now complete independent visibility review/release and canonical-route browser acceptance. The earlier `/platforms/task-345-platform` was only a button link, not the canonical localized slug. |
| A shared-content edit loses authority or masquerades as an unchanged published copy. | **Passed** | Governing authority and exact-copy provenance are separate. Real PostgreSQL coverage saves two changed source-derived successors and verifies GET visibility/editability; edited shared snapshots retain their own copy identity. A mismatched explicit source/snapshot is rejected. | This is bounded transaction/component evidence, not the outstanding browser shared-copy journey. |
| Intentionally neutral shared content is mistaken for unknown historical ownership. | **Passed** | Exact revision-scoped neutral proof permits countryless creation and two saves with Shared and regional authority for every affected destination. The PostgreSQL fixture proves raw-source redaction for regional-only access and proves a later unknown revision cannot revive old neutral authority after regional re-anchoring. The editor consumes authoritative regional/neutral/unresolved classification rather than inferring it from nullable country provenance. | Complete indirect mutation and browser acceptance remain separate gates; direct creation/read/save evidence alone does not close the complete access matrix. |
| Media failures attributed to unavailable assets without reconciling the test context. | **Passed** | The two failing media API fixtures now model current conservative authorization/reference state and pass. The MP4/WebM files both exist and pass ffprobe when the tests run from the API artifact directory; that ENOENT was a working-directory error, not a runtime media outage. No branded asset was generated or replaced. | The existing CogniOS JPEG's pending governance and missing immutable pins remain the separate diagnosis above. |
| Neutral and unresolved shared sources through indirect mutations. | **Passed** | The focused bundled real-PostgreSQL HTTP fixture explicitly passed (1 test, 1 pass, 0 failures). Missing Shared authority denies neutral bind and resolve without changing binding pointers. A prospective UK destination needs its own Shared authority; full authority then binds successfully. Detached proven-neutral content remains visible/editable under the prospective scope. Unresolved re-anchored bind/resolve requests fail with actionable responses and unchanged pointers. | This is the named HTTP fixture, not the outstanding shared-copy browser journey or full access matrix. |
## Task 345: final completion

The earlier bounded failures and blocks below are retained as historical
evidence. They are superseded by the final integrated verification recorded
here; they are not current acceptance status.

| Complaint / root cause | Status | Final fix and evidence |
| --- | --- | --- |
| API, database and generated-contract verification had a stale failed gate. The underlying architect blockers were migration-journal drift, non-atomic pins/partial Shared authority, and a non-durable restore receipt. | **Passed** | Migration journal, atomic pins/full Shared authority, and the durable actor-bound restore receipt are fixed. API: **236/236**. Database: **9/9**, including a fresh migration chain. Root typecheck/codegen pass. The prior full-API **Failed** result is historical and superseded. |
| The editor/review journey had incomplete save, reopen, correction and release proof. | **Passed** | DocumentDetail: **70/70**. Website: **234 tests**, **233 pass** and **1 intentional skip**. In an isolated real browser, the author saved/reopened KSA Rev 2 with marker 1 and the pinned hero, corrected it to Rev 3 with marker 2, resubmitted, and an independent publisher approved the exact content release. Fixture draft version was repaired **2 > 1**. |
| Visibility approval was blocked by an unauthoritative DTO and a coupled receipt. | **Passed** | Independent visibility approval succeeded after the authoritative DTO and independent receipt fix. Regions evidence: UAE `show/show`; KSA `pending`, `show/live off`; Europe `off`. Ordinary API auth/MFA review returned **200**, followed by visibility-only publish **200**. |
| Public assertions needed exact destination/version proof without claiming an unobserved UI action. | **Passed** | KSA public detail returned **200** with marker 2 and the exact pinned hero version `047ecfa3...`. UAE public detail returned **200** with its original summary and revision; Europe remained off. Final visibility publication and public assertions are transaction and public-API evidence after the browser uncovered and drove each UI defect; this does **not** claim the final button click or a final browser screenshot. |
| The previous visibility gate was marked incomplete while its fixture and release path were being repaired. | **Blocked — historical, cleared** | The repaired fixture, independent approval, transaction evidence and public API assertions close that gate. No remaining core journey is Blocked. No production/live content, email, cutover, or bulk publication mutation occurred. |

## Task 354: maintained browser smoke

The maintained-but-not-yet-executed `cms:task-354-browser-smoke` journey uses a
disposable Task 345 schema/object namespace and Chromium CDP (not Playwright).
It performs
ordinary login/MFA, KSA regional edit and exact revision review, content
publication prerequisite, destination visibility approval, and the reviewed
visibility release confirmation through rendered UI controls. Its read-only
public assertions require the KSA marker, the unchanged UAE fixture revision,
and an unavailable disabled geography. Fixture `verify` and guarded
`cleanup` remain required gates; no email is sent and public schema pointers
are preserved. The expensive browser journey is opt-in and is not run by
cheap type/static checks. No browser evidence is claimed until this opt-in
journey has completed; the wrapper verifies before starting and guarantees
verify-then-guarded-cleanup on success or failure.