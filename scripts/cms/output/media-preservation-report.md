# Media preservation investigation — 2026-09-11

## Environment and evidence

All database reads and changes in this investigation targeted the workspace **development** database. No production data was accessed or changed. No website page was republished.

The assignment's retained request observation recorded ten successful review POSTs between 12:27:36 and 12:30:37 UTC. Independent database inspection additionally found three approvals just before that window. All 13 recent approvals have active status, version 2, approved rights/accessibility, and reviewer confirmation metadata. Exact asset and version IDs are in `review-persistence-evidence.csv`; after restart and hero reconciliation those same versions remain in `review-persistence-after.csv`.

The older `blueprint-operate.jpg` asset (`097ba417-b2d7-4af1-b858-f038ad3ec087`) is active, but its September 9 audit lacks the two explicit confirmation fields and its version 1 still says needs-review. It was deliberately not given retrospective clearance.

No approval audit currently points at a non-active asset. The earlier retained logs had no review requests, and there are no records establishing why the earlier reported interactions were missing. **The historical approval-loss cause remains unproven.** Cache consistency changes are preventive corrections, not a claimed explanation of that incident.

## Verified hero-library failure

Initially there were no motion rows and no `cms.site-hero` receipts. The post-merge hook never invoked the hero importer. The first media-only import also failed with `cms_media_assets_collection_check`: development still allowed only website/LinkedIn despite the motion column and migration being present in source. The transaction rolled back.

The existing development schema-preparation boundary now applies the narrow motion constraints, and post-merge invokes the media-only importer. Forced schema synchronization was replaced by normal confirmation/failure behavior; this is not a claim that ordinary schema push can never propose destructive changes.

## Applied changes and preservation

- Imported six existing MP4/WebM films and four poster/fallback images; all ten durable objects were downloaded and SHA-256 verified.
- Exact identities, dimensions, MIME types, status, version IDs, and motion references are in `hero-library-evidence.csv`.
- Platforms uses its separate reduced-motion fallback. An exact legacy metadata correction appended two v2 versions with separate receipts/audits; the original v1 versions were not edited.
- A second media-only apply succeeded without another correction. Document/revision/edition counts remained 55/110/55, and publication-pointer digest remained `2c080ac3830e4c6097dab0ecd241ccdd`; see before/after CSVs. The only two added versions/audits in that interval were the Platforms metadata correction.
- Exact imported binary replay preserves reviewer metadata/status. A genuinely changed unapproved binary cannot inherit approval.
- Review success updates list and exact-asset caches. Failure remains visible and retryable. Selected approved records no longer prefer an older exact-query snapshot over a current list record.

## Validation and limits

Focused admin review/selection tests, API media tests, hero reconciliation tests, metadata tests, schema preparation tests, and relevant typechecks passed. The API/admin/website workflows restarted successfully. Public source URLs returned HTTP 200 with correct video MIME types; source files and website playback components were not changed.

The single browser pass reached the normal admin sign-in gate and could not verify authenticated hard-refresh, reauthentication, previews, or protected downloads. No credentials or sessions were manufactured. Public hero fallback visuals rendered, but browser runtime playback was not confirmed (Industries/Platforms settled to fallback); this is not reported as a successful playback check. The historical incident and authenticated browser acceptance remain unresolved verification limits.

Production import/schema state remains uninspected and unchanged. Development operations must not be described as a production repair.