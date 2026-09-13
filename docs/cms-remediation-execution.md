# CMS remediation execution record

Updated: 13 September 2026 (Asia/Dubai).

Remaining-verification addendum: the final Navigation `xx` check now has browser
evidence, and staging cleanup has a corrected read-only real-storage dry run.
See the [30-finding ledger](cms-findings-verification-ledger.md),
[browser results](cms-remaining-browser-verification.md), and
[operational results](cms-remaining-operations-verification.md). The sections
below preserve the earlier run's evidence and limits; the linked addenda
supersede only the specifically rechecked paths, not the entire release matrix.

This records implementation and verification of the 30 findings in
[the remediation plan](cms-remediation-plan.md). It is not authorization to
publish content or deploy, and does not claim exhaustive production verification.

## Implementation coverage

| Package | Findings | Delivered |
| --- | --- | --- |
| W00 — fixtures and preservation | 19, 29, 30 | Transactional, ownership-checked, replay-safe fixture cleanup; read-only preservation baselines; isolated PostgreSQL lifecycle fixtures. |
| W01 — reliable mutations | 20, 21 | Governing-transaction audit writes; actor/request-scoped operation receipts; invitation/reset/export idempotency; encrypted post-commit delivery jobs with bounded retries, fenced claims, expiration and payload disposal. |
| W02 — operation safety | 2, 9, 22 | Pending-operation guards, dirty-draft protection, explicit uncertain-save handling and deliberate local-draft recovery download; protections integrated into document and specialized forms. |
| W03 — content fields | 1, 6, 27 | Structured rich-block editing preserves list style, attribution, punctuation and unsupported legacy blocks. Searchable relationships, constrained enums and a ten-kind field inventory replace raw-ID authoring. Public/preview rich renderers preserve the same semantics. |
| W04 — People and lists | 3, 4, 5, 6, 23, 25 | One server-paginated People identity table with configured-market tick columns; live/pending distinction; scoped locale exceptions; short creation form; page resets; real links and permission-aware actions. Availability still comes from the existing authoritative per-person endpoints, with query-cache deduplication—not a new combined server endpoint. |
| W05 — document editor | 7, 8, 9, 13, 23, 25 | Content-first readiness summary, persistent actions, exact-revision Save and preview, recovery export, and server-gated permanent deletion for eligible non-office drafts. Existing history, SEO, regional editing and publishing safeguards remain. |
| W06 — navigation | 2, 12 | Named hierarchy controls, guarded draft hydration/edition switching, version-specific review/publication and explicit publish confirmation. Locale input is committed only when valid, rather than issuing queries for intermediate keystrokes. |
| W07 — media | 10, 17, 24 | General image metadata, focal-point previews and exact-version public rendering, review history, reference-impact inspection, local queue clearing/retention, and a conservative dry-run-first staging janitor. Metadata changes require new review; old pinned versions and legacy metadata fallbacks remain unchanged. |
| W08 — Contact | 11, 26 | Focused contact-email editor, concurrent-initialization recovery and regional/source-aware save/review/publish. Shared confirmation freezes and lists every affected destination and its exact availability version. |
| W09 — users and markets | 14, 21, 22 | Server pagination/search/filtering; record-level locks; pending/dirty dialog protection; durable delivery status, polling, retries and retained receipts; searchable market selection. |
| W10 — Inbox and dashboard | 15, 16 | Export search parity and stable retry keys, pending-save protection and explicit clearing, searchable ownership, and labels matching the actual review-age/conversion calculations. |
| W11 — operational clarity | 18, 28, 29 | `/admin` entry normalization, retryable public service errors distinct from 404, non-mutating readiness checks, and narrow migration/preparation regression coverage. |
| W12 — verification | 19, 25, 29, 30 | Expanded behavioral and contract tests, a real PostgreSQL all-ten-kind lifecycle harness, preservation comparisons and a bounded browser pass. Limits are recorded below. |

## Automated evidence

- Admin normal package command: **131 tests passed**, including TypeScript checking.
- API normal package command: **174 tests passed**.
- Website normal package command: **170 tests passed**, including TypeScript checking.
- Database package: **8 tests passed**, including migration-chain/replay and schema preparation.
- Staging-janitor focused adapter tests: **5 passed**. Scripts TypeScript check passed.
- API code generation check passed. It was completed before the final targeted browser verification.
- Readiness returned HTTP 200 with database, schema and navigation checks all `ok`.

The PostgreSQL lifecycle harness runs real application routes inside a uniquely
named disposable schema. For all ten document kinds it checks eligible deletion,
submit/reject with retained comment, resubmit/publish, exact published pointers
and media pins, successor-save preservation, archive, restore, rollback and
denial of deletion after publication history. The schema is removed afterward.
This is stronger than schema-only validation, but is not ten complete browser
journeys or a production test. See [kind coverage](cms-kind-coverage.md).

## Browser evidence

The initial pass used the CMS's real password-plus-TOTP authentication and a
disposable administrator. It confirmed:

- One People table with individual configured-market columns.
- Disposable person creation, summary/biography save, revision advancement and
  exact persisted values after reload.
- Save and preview opening the exact returned revision and destination.
- Cancel/discard behavior for unsaved document navigation.
- Read-only Contact settings with Save disabled when unchanged.
- Eligible unpublished-person permanent deletion through its real confirmation.

That pass stopped at a Navigation locale-change loading failure. The locale
draft/query separation was repaired and covered by rendered tests. Targeted
browser confirmation of that repaired flow is recorded separately below.

Fixture cleanup completed after the tester first deleted its own shortened-slug
draft through the supported delete flow. The cleanup guard correctly refused
to assume ownership of an identity outside the recorded fixture prefix.

### Targeted Navigation confirmation

The targeted browser check confirmed the repaired form at 1366×768:

- No endless spinner or visible page overflow.
- Dirty labels remain present while the locale is blank.
- Blank-locale submission gives an explicit error without clearing the draft.
- Edition-switch cancellation retains the dirty snapshot; confirmed discard
  hydrates the selected edition.
- Keyboard Enter and browser-confirmation interactions work.

It exposed a smaller unknown-language validation discrepancy (`xx`). The final
repair now rejects unrecognized language subtags, retains the typed invalid
value and dirty draft, and blocks switching until corrected. Rendered tests and
TypeScript checking passed after that repair; this final small validation change
was **not browser-retested in that earlier run**. Both checks are now confirmed
in the remaining-browser-verification addendum.
The second fixture cleanup succeeded, with exact residual user/document counts
both zero.

## Preservation and environment

Read-only before/after snapshots matched for:

- Published revision pointers.
- Edition availability.
- Immutable media pins.
- Revision counts and their associated content digests.

Only the narrow access-delivery migrations were applied to development.
No existing editorial content was saved or published, no approved artwork was
replaced, no production database was changed, no broad reconciliation was run,
and the application was not deployed.

The staging janitor was implemented and adapter-tested but **not applied to
real storage**. Its default is dry-run; uncertain candidates are retained.
It uses terminal database/audit marking and generation-conditional storage
deletion to protect concurrent finalization and make interrupted deletion
retryable. See [operations](cms/operations.md).

## Explicit verification limits

- Real external invitation/reset email delivery was not exercised; provider and
  encryption configuration still need to be valid in the target environment.
- The browser pass did not exhaust every role, destination, locale, screen width
  or fault combination. In particular, the remaining media/users/upload browser
  inspections were not completed after the initial Navigation interruption.
- No production deployment, production migration, production email or
  production storage operation was tested.
- Tests and code coverage do not replace editorial approval of content.

These are verification boundaries, not claims that those untested paths passed.