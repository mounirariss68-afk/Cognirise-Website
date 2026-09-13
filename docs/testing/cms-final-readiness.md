# CMS integrated readiness

## Development verification completed

The merged Shared-edition and editorial-work features were exercised together, including their public delivery boundary. Scheduling/expiry was cancelled and was not implemented or activated.

### Automated checks

| Suite | Passed | Failed / skipped |
| --- | ---: | ---: |
| API | 215 | 0 / 0 |
| Admin | 140 | 0 / 0 |
| Website | 177 | 0 / 0 |
| Database and migration preparation | 9 | 0 / 0 |

Workspace typechecking passed. Targeted architectural reviews closed the delivery-identity, timeout, HTTPS, historical-source authorization and availability-release findings. Real PostgreSQL coverage includes both historical Adapted publications beneath newer Independent drafts and positive Independent publication/availability release.

### Browser evidence

Using disposable development accounts/content and existing approved media, the integrated walkthrough verified:

- Publication creation, persisted article defaults, editing, save/reload and pinned media selection.
- Neutral baseline creation and an exact market adaptation on a legacy Shared-source carrier.
- Assignment to distinct editor/reviewer identities, submission, recipient in-app notifications, review queue, approval and exact-revision publication.
- Explicit reviewed-destination release, including its version/target confirmation. UAE became publicly available; other destinations remained excluded.
- Actual public website title, body and approved cover rendering.
- A later private draft with different body text and a second pinned cover. Its protected preview rendered the draft body/cover while public delivery retained the approved body/cover.
- A contained two-column action bar at 390px, usable editor controls, and correct `Live: Shown` / `Live: Excluded` status after reload.

The expired preview capability was replaced through the normal Preview action without saving another revision. No capability URLs or credentials are retained in this report.

### Repairs made during integration

The walkthrough exposed and closed missing publication-default serialization, mobile action overflow, incorrect legacy-source classification for managed materializations, an unreachable reviewed-availability release action, stale live-status labels, and missing article cover rendering. Publication SSR tests are now included in the normal website test command.

Reviewed availability release does not publish drafts or move content pointers. It validates already-published eligible exact content or an unchanged live Shared source, and checks immutable historical source authority. Independent history requires sealed Independent-publication evidence rather than the mutable current binding mode.

### Preservation and cleanup

Both disposable account fixtures and the test content were cleaned up. Fresh before/after checks were identical:

- 31 publication-pointer records.
- 220 availability records.
- 28 media-pin records.
- 58 revision-count records.

Only additive development delivery-identity schema preparation was required. A proposed unrelated legacy-column removal was rejected; the schema definition was corrected to preserve that column and all 20 existing rows. No production migration, bulk publication or media-library mutation was performed.

## External activation still requires user action

- **Publishing:** deployment status reports no published application. Production-site verification cannot be claimed until the user publishes.
- **Email:** the authorized Resend connection is attached and the transport is implemented, but no real email has been sent. Sender, safe test recipient and the published HTTPS administrator URL must be approved/configured first. In-app notifications were verified.
- Delivery remains fail-closed while unconfigured. Retried jobs retain transport identity and selected events; provider requests are abortable, and bounded single-flight discovery cannot hold database locks.

These are activation/approval boundaries, not claims that production or mailbox delivery has already passed.