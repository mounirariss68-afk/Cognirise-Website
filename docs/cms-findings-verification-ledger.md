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