# CMS browser verification — authenticated E2E pass

Date: 2026-09-11 (UTC)

## Scope and result

Completed one authenticated administrator/editor browser pass through the local
proxy using the provisioned custom password + TOTP fixture. Secrets, TOTP
values, challenge IDs, cookies, and auth responses are intentionally omitted.

### Verified

- Administrator password login and MFA reached the dashboard.
- Created one uniquely fixture-prefixed **person** with employee role, public
  title, initials fallback, biography, contribution, verification/review dates,
  source label/URL/accessed date, and UAE targeting.
- Edited, saved, reopened, and verified persistence. Save Draft was disabled
  when clean and Preview was disabled while unsaved.
- Direct saved-draft publish confirmation showed the exact shared target
  `UAE · en · Revision 2`; one Confirm Publish action published it.
- Public delivery returned HTTP 200 from
  `/api/public/content/uae/en/person/:slug` and contained the fixture slug and
  generated summary.
- Archived and restored the fixture document; restore created draft Rev 3 and
  reported that it must pass governance before republishing.
- Editor login + MFA succeeded. The editor document view had no Publish action,
  had Submit Review, and stated that only an administrator can publish.
- Editor logout returned to the sign-in page.
- Read-only inspection of `/admin/navigation` showed UAE/en navigation policy,
  menu/submenu switches, page-availability switches, and Save/Review/Publish
  controls without changing anything.
- Scoped fixture cleanup exited 0. Post-cleanup query confirmed zero
  `cms_documents.canonical_slug` rows with the fixture prefix.

## Notes / non-blocking observations

- The first attempted `/admin/website-navigation` URL rendered the app's 404;
  the live sidebar correctly targets `/admin/navigation`, which loaded normally.
- The admin emitted repeated React warnings about a Select changing between
  uncontrolled and controlled state while editing the new person.
- The cleanup helper was authoritative for user/submission cleanup; an initial
  verification query used incorrect schema columns, then schema inspection
  confirmed `canonical_slug` and the corrected document count was zero.

## Evidence

Browser evidence is retained in the local test-run observations, including:
`ef6nue`, `0huetl`, `f8qyo2`, `rjt0h2`, `dvyhml`, `s0hd65`, `26ubk0`,
`ffsn07`, `xs6ke9`, `q9oxva`, `hl7ncd`, `o8igff`, `rv3p88`, and `21lw4o`.
No secrets or capability tokens are included.

## Not covered in this pass

Optional successor review/reject, upload/finalize/review media flow, inbox
fixture edit/export, protected-person preview, and stale/version-negative
flows were not executed after the core authenticated CMS path and cleanup were
verified. No real Mounir or other existing record was opened for mutation.

## Omitted-path continuation (fresh fixture)

The omitted paths were rerun with a new fixture prefix and disposable enquiry.
The fresh administrator/editor records, enquiry, and founder preview document
were cleaned up; post-cleanup counts were zero for fixture-prefixed
`cms_documents`, `cms_users`, and `website_enquiries`.

### Inbox

- Inbox loaded one fresh `new`, `Unassigned`, Europe enquiry.
- Editing only that fixture changed status to `contacted`, assigned the fresh
  fixture administrator, and saved the note
  `Generated browser verification note — disposable fixture only.`
- Closing and reopening showed all three values persisted.
- Export CSV started successfully, with filename
  `submissions-2026-09-11.csv` and UI notification
  `Export download started — The CSV contains the filters currently selected.`
  Playwright could not call `Download.path()` on the remote browser connection;
  the download event and filename were captured.

### Protected person preview

- A fresh **founder** fixture person was created specifically to exercise About
  leadership rendering. Its real Preview action opened a protected popup with
  `Protected draft preview — not published`, `UAE / EN · REVISION 1`,
  About/Our Team hero content, and the draft-only editorial-fields panel.
- The Leadership Team region remained stuck at `Loading team profiles…`; no
  founder card or rendered focus/contribution card appeared. This is a
  preview-rendering/loading gap, not a publish failure.
- The fresh founder's structured values were safe fixture values and were not
  approved or published.

### Mounir read-only inspection

- Mounir’s actual existing record was opened only for read-only inspection at
  draft Rev 3. Its editor showed founder / CEO & Co-founder, populated summary,
  biography, contribution, three focus areas, UAE targeting, blank approved
  fallback, and blank source URL. No Submit Review, Publish, Save, archive, or
  comment action was performed on it.
- Its real Preview opened a protected UAE/en revision 2 popup. The About hero
  rendered; Leadership Team remained `Loading team profiles…`. The draft-only
  editorial panel rendered the three actual focus areas and explicitly states
  these fields are for editorial review and are not added to public About.
- These are actual-owner historical observations, not a cloned response.

### Review / reject reproduction

- The safe founder fixture was **not** a clone of Mounir’s content; it was a
  new governed founder with unique title/slug, source, dates, fallback, and
  structured biography/contribution.
- Submit Review on that safe fixture succeeded rather than reproducing a 422:
  `Latest edition revisions submitted for review`; state became `in review`,
  Rev 1, and editing was locked.
- Adding a fixture-only reviewer comment and clicking Reject revision returned
  the safe record to `draft`, Rev 1, with editing controls restored. No
  rejection toast or retained review comment was observable immediately after.
  No real Mounir review/publish request was sent, so no actual-owner 422 was
  generated.
- Because the safe fixture had no previous live revision, this pass does not
  claim to verify live-revision retention across successor reject. A cloned
  Mounir record was not created because the UI path did not expose a safe clone
  operation without copying governed content.

### Continuation evidence

Additional evidence includes `bpqczk`, `tk33vc`, `887o17`, `psptwo`, `003rfm`,
`f4wvxn`, `a465x7`, `n14y42`, `6bxyh2`, `l47jw9`, `ej98n0`, and `5z1qfq`.
Preview capability tokens are not included in this record.

## Fixed-flow retest attempt after restart

The admin and website workflows were restarted before this narrow retest and a
new mode-600 fixture was provisioned. Browser creation then failed repeatedly
with `browser.newContext: Browser closed` for both the local proxy and the
configured preview-domain fallback, before any fresh credential was read or
submitted. The fresh fixture cleanup helper still exited 0 and removed the
provisioned fixture. Therefore this retest has no new authenticated screenshot
or trustworthy Rev 3 result; the prior omitted-path evidence above must not be
 interpreted as verification of the post-fix implementation.

## W00 / W11 verification boundary

The fixture teardown now discovers browser-created documents from exact fixture
user ownership and revision authorship instead of relying only on setup-time
IDs. It refuses prefix-only or external references and records residual-owned
row failures rather than silently claiming cleanup. The preservation baseline
command is read-only and writes only identifiers, pointers, counts/digests,
availability decisions, and immutable media pins to a mode-600 file below
`/tmp`; it does not print credentials or content payloads.

The public website now distinguishes temporary CMS/navigation failures from
genuine unavailable routes and offers retry. API readiness is exposed at
`/api/readyz` in addition to the existing `/api/healthz`; no browser outage
simulation or published-host `/admin` slash redirect check has been performed
in this record.