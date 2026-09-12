# CMS editorial journey matrix

This matrix records the administrator/editor journey for Task #318. It is a
code-and-contract check, not a claim that a deployed environment has been
verified. Browser checks and database-backed checks must be run against the
target environment before release.

## Access and safety

| Journey | Current control | Evidence / remaining blocker |
| --- | --- | --- |
| Sign in and session expiry | `AppLayout` requires a live session, MFA, and completed password rotation before rendering the application. API routes independently authenticate and enforce MFA. | Implemented in `AppLayout` and route middleware. Session-expiry browser evidence remains to be captured. |
| Role restrictions | Administrators alone receive Inbox, Users, Navigation, and Audit navigation. Server routes retain administrator, MFA, CSRF, and publisher checks. | Implemented. A direct URL is still denied by the layout/API rather than hidden-only protection. |
| Truthful unavailable controls | Viewer media controls do not offer upload, metadata mutation, or hero submission; review and export controls show loading/error states. | Implemented in media and Inbox. Verify role permutations in an authenticated browser session. |

## Content and release

| Journey | Current control | Evidence / remaining blocker |
| --- | --- | --- |
| List and filter content | Document lists support kind, status, search, market, and pagination. | Implemented. Document authoring/detail is owned by the parallel document task and is intentionally not changed here. |
| Create and edit | Creation forms collect required structured content, show validation issues, and direct the editor to the governed detail workflow. Contact settings initialize the canonical governed document. | Implemented outside this task's owned detail surface. |
| Save/reopen | API revisions are revision-numbered and the detail workflow preserves conflict/error states. | Detail implementation and tests are owned elsewhere; do not use this matrix as evidence of that surface. |
| Preview/history/recovery | Preview and revision/history/archive/restore API paths exist and preserve published revisions while creating successors. | API coverage exists; authenticated rendered parity evidence remains a release check. |
| Submit/review/publish | Navigation now catches and displays save, review, and publish failures. An administrator can explicitly confirm and publish the exact saved version directly; collaborator review remains available but is optional. Stale versions and missing confirmation are rejected by the API. Document publication controls remain in the owned document task. | Navigation response does not expose workflow state, so the exact version shown in the UI and checked by the server is the publication guard. |
| Market availability | Navigation edits page availability together with the menu and validates that visible links cannot target unavailable pages. | Implemented and server-validated. Verify sitemap/direct-route parity in the website environment. |

## Media

| Journey | Current control | Evidence / remaining blocker |
| --- | --- | --- |
| Browse/search/collection | Media Library has Website, LinkedIn, and motion collections, collection-specific filters, list/grid views, and pagination. | Implemented. |
| Upload/finalize | `BatchUploadZone` queues uploads, finalizes them, and gives viewers a clear read-only explanation. | Implemented. Storage configuration and object existence are environment-dependent. |
| Metadata and accessibility | Metadata dialogs preserve alt text/rights/campaign or motion metadata; viewer mutation controls are disabled. | Implemented. |
| Review/approve/reject | Publisher/administrator review requires rights and accessibility confirmations; failed decisions remain open with actionable retry text. | Implemented. Verify immutable version and public-delivery behavior with storage-backed tests. |
| Download/preview | Pending, failed, unavailable, and broken previews have distinct fallback states. Downloads preflight the authenticated route and report missing objects. | Implemented. Finalized object delivery needs target storage verification. |

## Submissions Inbox

| Journey | Current control | Evidence / remaining blocker |
| --- | --- | --- |
| List/filter/paginate | Inbox filters enquiry/newsletter and all supported workflow statuses, reports list errors, and preserves pagination state. | Implemented. |
| Inspect/edit workflow | Rows open a detail dialog with contact fields, status, active owner selection, and 4,000-character internal notes. Save uses `PATCH /api/submissions/:id`, invalidates the list, and reports API errors without discarding the local dialog values. | Implemented. Owner selection is limited to the first 100 listed CMS users and active users; this should be revisited if the user directory exceeds that limit. |
| Workflow history | The API records each status/owner/notes update in `cms_submission_events` and emits an audit event. | Implemented in the submissions route. Database-backed regression evidence remains to be run. |
| Export | The Inbox disables export while the list is loading/failed, sends current kind/status filters, downloads a ready CSV through an anchor, and distinguishes queued, ready-without-link, and failure responses. | The current API generates a ready data URL synchronously. There is no queued-export retrieval/notification endpoint, so a queued response is truthfully reported but cannot be completed in the UI until such an endpoint exists. |

## Audit, settings, and release surfaces

| Journey | Current control | Evidence / remaining blocker |
| --- | --- | --- |
| Audit history | Audit Log filters by actor, entity type/id, action, and UTC date range, exposes redacted metadata on demand, and paginates. | Implemented. API remains administrator/MFA protected. |
| Market editions | Administrators can create, edit, enable/disable, change fallbacks, and request deletion from the settings icon. Canonical/referenced deletion and unsafe fallback operations remain server-rejected and are surfaced as errors. | Implemented. Verify conflict responses against populated market/content data. |
| Navigation draft/review/publish | Save, submit for review, and publish actions have pending/disabled states and actionable errors. Page availability is saved in the same governed policy. | Implemented. Workflow state is not returned by the current API contract; server validation remains authoritative. |
| Contact settings | Missing canonical contact configuration is explicitly initialized as a draft, with viewer guidance and actionable creation errors. | Implemented. |

## Verification record

- Source inspection covered the admin layout, Inbox, Audit Log, Navigation
  Settings, Market Editions, Media Library/upload intake, submissions,
  navigation, market, media, and audit routes, and generated API contracts.
- Focused submission contract tests cover independent status/owner/notes
  updates, invalid workflow values/oversized notes, and queued versus ready
  export responses.
- `DocumentDetail.tsx` and `artifacts/api-server/src/routes/documents.ts`
  are deliberately excluded from this task's edits.
- Automated API/database and authenticated browser checks are required before
  claiming target-environment release verification. Do not substitute a
  component-only or request-mock result for those checks.