# CMS remaining browser verification

Date: 2026-09-13 (UTC)  
Scope: one bounded development-browser pass against the managed API/admin
workflows, using the real password-plus-TOTP flow and disposable CMS users.

## Safety and fixture handling

- Read `docs/cms-remediation-execution.md`, the website-browser-validation-routing
  memory, the Replit authentication testing skill, and
  `scripts/cms-owner-browser-fixture.ts` before execution.
- Restarted `artifacts/api-server: API Server` and
  `artifacts/cognirise-admin: web`.
- Captured the read-only preservation baseline **before** fixture creation.
- Created one disposable administrator/editor fixture with real password and
  TOTP credentials. Credentials and TOTP values were kept in mode-600 temporary
  files and were never printed in this record.
- No production, mail delivery, publishing, storage deletion, or real-content
  save was performed.
- Cleanup used the fixture script's ownership checks and completed successfully.
  Temporary upload files and TOTP files were removed.
- Captured the post-cleanup preservation baseline. Published pointers, edition
  availability, media pins, revision counts/digests, and the exact combined
  comparison all matched (`exact: true`).

## Passes and evidence

### Navigation unknown-language guard — PASS

At 1366x768 on `/admin/navigation`, changed only in-memory draft state:

1. Set the first menu label to `Fixture Dirty Navigation`.
2. Entered locale `xx` and blurred the field.
3. Confirmed the exact alert:
   `Enter a recognized locale such as en, en-US, or zh-Hant before switching editions.`
4. Attempted to switch Market from UAE to KSA.

The market remained UAE; the invalid `xx`, dirty label, and unsaved state
remained intact. No save, review, or publish action was taken.

At a 390x844 viewport, focused the Locale field and measured
`scrollWidth=375` and `clientWidth=375`. The invalid input, dirty label, alert,
and guarded switch state remained visible with no horizontal overflow observed.

### Users search/role/status — PASS for available fixture population

At 1366x768 on `/admin/users`:

- Search for the disposable fixture prefix returned exactly the two fixture
  accounts.
- Role `Editor` narrowed the result to exactly the fixture editor.
- Status `Active` retained exactly that active editor.
- No record was edited or invited.

The page rendered no pagination control and the development database did not
contain more than 50 disposable users, so pagination beyond 50 was not
verified.

### Media metadata/focal/history/reference inspection — PASS (read/cancel)

At 1366x768 on `/admin/media`:

- Confirmed Website/LinkedIn/Videos tabs and Website pagination (`112 assets`,
  page 1 of 3).
- Opened metadata for an existing Website image.
- Confirmed editable title/rights/alt/caption fields, focal-point control,
  Hero/Card/Square previews, five affected Public Sector references pinned to
  an exact version, and review-history entries.
- Opened the focal-point control and canceled. No metadata version was created,
  and no real reference or published pointer changed.

### Local upload queue and reload — PASS for non-transfer paths

Added a disposable valid PNG and an invalid TXT through the real file input.
The PNG entered the local queue with `Metadata review required`; the TXT was
rejected with:
`cms-fixture-upload.txt: unsupported type for website.`

Removed the queued PNG locally, did not review or upload it, and reloaded.
The queue and error alert were gone after reload and Website remained exactly
112 assets. No storage object was created, so no storage cleanup was needed.

## Initial-pass blockers superseded by continuation

The following bullets described the initial bounded pass and are retained only
as historical context; they were superseded by the continuation below:

- Pagination beyond 50 users was unavailable in the initial two-user fixture;
  the continuation created 60 exact-owned users and verified page 3.
- `Clear completed` and `Discard failed` were unavailable with a real transfer;
  the continuation verified both against explicitly labeled persisted local
  queue fixtures. This is **not** real transfer evidence.
- Assigned/unassigned market enforcement and a second editor context were
  untested initially; the continuation verified both with a genuine
  disposable editor and document.

Still intentionally not claimed:

- No real upload transfer, storage object, storage deletion, mail delivery,
  publication, production operation, or real-content save was performed.
- The 390px metadata-dialog check is now closed below using a real asset,
  keyboard traversal, and Cancel only.

## Method limits

The pass used the local port-80 managed proxy because the split website/API
routing memory specifies that direct workflow ports and the external preview
domain are unsuitable for shell-driven browser validation. Visual checks used
the Playwright screenshot/layout observations at desktop and 390px widths.
Audio, animation timing, external delivery providers, and production storage
behavior were not measurable or intentionally not invoked.

## Continuation of the bounded pass

The explicitly untested paths were exercised in a fresh development fixture
cycle. A second preservation baseline was captured before this cycle.

### Users beyond page 2 — PASS

Created 60 additional exact-owned fixture users in a mode-600 private
manifest. The authenticated administrator Users page reported 69 total users
with 25-row server pagination:

- page 1: `Showing 1–25 of 69`
- page 2: `Showing 26–50 of 69`
- page 3: `Showing 51–69 of 69`, Previous enabled and Next disabled

Search for the exact-owned `extra-060` suffix returned one fixture user and
reset the result to the matching row. The extra users used active, invited,
suspended, editor, and viewer combinations. No real user was modified.

At 390px, Search users received keyboard focus and the document measured
`scrollWidth=375`, `clientWidth=375`. The table itself is horizontally
scrollable for its wide columns; the screenshot showed clipped columns until
scrolled. This is recorded as a responsive usability limitation, not silently
treated as a pass for every visual detail.

### Synthetic media metadata/reference impact — PASS

Created one synthetic Website asset/version with a `fixture://` storage key,
1-byte synthetic metadata, no storage object, and one fixture-owned draft
person document/reference. The asset was clearly labeled synthetic and was
never published.

Using the real administrator browser:

- Opened only the synthetic asset.
- Changed caption to
  `Synthetic browser verification metadata; no production use.`
- Moved focal point to `65% horizontal, 24% vertical`.
- Saved once and received:
  `Metadata saved — awaiting publisher review`.
- Reloaded and confirmed the caption and focal coordinates persisted.
- Confirmed one affected draft reference remained pinned to the old version
  `20b33e0e-95de-4109-918b-88799357805d`.
- Confirmed review history contained `Metadata updated` and a new governed
  version, while the old pinned reference remained unchanged.

The expected 404 for the synthetic preview is a method limitation: no storage
bytes were created by policy. It did not prevent metadata/focal/history/
reference verification.

### Persisted local queue fixture — PASS (UI lifecycle only)

Seeded sessionStorage, not localStorage, with two explicitly labeled queue
fixtures: one completed row and one pre-start failed row. This is persisted
queue-state fixture data, not evidence of an actual transfer.

- Confirmed `Upload queue (2)`, `Clear completed (1)`, and
  `Discard failed (1)`.
- `Clear completed (1)` removed only the completed row.
- `Discard failed (1)` removed only the failed row.
- Reload confirmed the queue remained empty.

No upload request, storage object, storage deletion, or real transfer was
created.

At 390px, the Media upload region, Website selector, drop zone, Browse files,
tabs, and focused search field fit the measured 375px document width; no
document-level overflow was measured. The synthetic preview's 404 remained
the only expected media limitation.

### Assigned/unassigned market enforcement — PASS

In a separate genuine password-plus-TOTP editor browser context, opened the
fixture-owned synthetic person draft from People:

1. With Europe assigned, toggled Europe and received
   `Destination change saved` / `Europe will be excluded when the reviewed
   change is published.` The row showed staged excluded/live excluded.
2. Read and recorded the editor's four assignments, removed only Europe, and
   retried the same synthetic Europe mutation.
3. The server rejected it with HTTP 403 and the exact toast:
   `Destination save needs your review` /
   `HTTP 403 Forbidden: You are not assigned to this market.`
4. Restored the exact Europe assignment. No publication occurred.

### Continuation cleanup and preservation

The continuation cleanup first removed exactly the manifest-listed 60 extra
users, synthetic media reference/version/asset, then ran the existing
ownership-checked fixture cleanup for the base users and synthetic document
graph. Direct residual checks were all zero for users, documents, assets,
versions, and references. The post-cycle preservation comparison matched all
published pointers, edition availability, media pins, and revision
counts/digests. The combined JSON differed only in capture metadata (`exact:
false` when comparing the whole document), not in preserved content arrays.

Open browser pages retained stale React Query data after DB cleanup; this was
not used as cleanup evidence. Database residual checks and the preservation
comparison are authoritative. Private manifests, credentials, TOTP files, and
synthetic local upload files were removed.

## Close-out clarification from existing logs

The ownership-checked cleanup ran once after the continuation fixture was used,
and direct residual checks then reported zero users, documents, assets,
versions, and references. A cleanup replay was also attempted after the
credentials state file had been removed. It safely refused to run with the
exact result `The private state file does not exist.` and exit code `1`;
therefore it performed no database mutation. This is a removed-state replay
no-op result, not a second transactional cleanup.

Fixture-generated audit events were **not retained**. The continuation cleanup
explicitly deleted audit events for the exact extra-user IDs and synthetic
asset/version target IDs, and the existing ownership-checked cleanup deleted
events for the base fixture actors/targets. This is evidence about fixture
teardown only, not about retention of real editorial audit history.

## Final 390px metadata-dialog check

This was a focused surface check only; no other end-to-end flow was repeated.
The authenticated administrator opened the real
`pulse-industry-public-sector-civic-review-v1.png` metadata dialog at 390x844.
No field was edited and `Cancel` was used; no metadata save occurred.

Keyboard Tab evidence:

- Focus traversed the Asset title input, Credit / rights textarea, Alt text
  textarea, and `Choose focal point on image`.
- Continued Tab traversal reached `Cancel`, `Save metadata`, and `Close`.
- The dialog's internal scroll moved from `scrollTop=0` to `1498`, exposing
  lower controls while traversing.
- Document dimensions were `docScrollWidth=390` and `docClientWidth=390`;
  no page-level horizontal overflow was observed.
- The 390px screenshot showed the focal control and marker within the
  internally scrolling dialog; the footer controls were reachable by keyboard
  even when below the initial viewport.

The real dialog was canceled and the Media Library remained at 112 assets with
no save notification or mutation.

## Final cleanup replay acceptance

Because this focused check recreated a minimal authentication fixture, a fresh
preservation baseline was captured before setup. The fixture state was copied
to a second mode-600 path before cleanup. The ownership-checked cleanup was
then invoked twice while the second state copy still existed:

- cleanup invocation 1: exit code `0`, fixture cleaned
- cleanup invocation 2: exit code `0`, same fixture prefix cleaned again

The second invocation was therefore an actual replay-safe transaction against
already-removed rows, not a missing-file check. Both state files were removed
only after the two invocations. Post-cleanup preservation arrays matched for
published pointers, edition availability, media pins, and revision
counts/digests. No credentials, secrets, audit payloads, real assets, or
storage objects were retained.
