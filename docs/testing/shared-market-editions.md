# Shared and market-specific CMS editions

## Earlier repair verification

For the subsequent combined editorial, mobile, public-delivery and cover-rendering walkthrough, see [CMS integrated readiness](cms-final-readiness.md). The browser limitations recorded below describe the earlier repair pass, not the latest verification.

The seven previously documented blockers have been repaired:

- All participating mutations acquire a document-first mutex and revalidate role/status/market assignments within the locked transaction. User and assignment locks follow the same order as administration writes. Controlled concurrent PostgreSQL requests prove a successful save plus a recoverable stale conflict, not a deadlock.
- Existing Shared/Adapted bindings cannot change their adopted baseline or mode through generic binding updates. The editor directs those changes through comparison/resolution instead. Create-only version-zero protection remains intact.
- Translation state stays stale through unrelated edits. Explicit acknowledgement requires an authorized, active source revision from the same document, including another locale. The editor submits the exact frozen destination IDs even when its old adopted revision is absent from active options.
- Conflicts have per-operation identities separate from display paths. Shared/market decisions preserve unrelated safe operations, legacy path decisions work only when unambiguous, and comparison values honor stable-ID selectors.
- Restore clones the exact approved published snapshot and pins into a new draft even when newer rejected/draft work exists, without reactivating publication. Never-published draft recovery is separately covered.
- Independent editions no longer appear in Needs baseline; missing content, pending work and other applicable blockers remain independent facts.
- Source authorization covers current, adopted and local historical comparison content and the exact approved history restored. Availability and Person destination actions use fresh transaction-time permissions, including administrator-only decisions.

Consolidated review confirmed the principal repairs; its five additional authorization/translation findings were subsequently fixed and passed focused re-review.

### Earlier checks and boundaries

- API coverage: 202 cases across the full run and targeted fixture-reconciliation checks. The latest full run passed 197 and found five legacy SQL-fixture mismatches; all five affected files subsequently passed their focused run (8 tests) without weakening negative authorization expectations. The earlier nine fixture mismatches were also repaired and verified.
- Admin full suite: 133 passed. Subsequent acknowledgement and delayed-query selection changes passed admin typecheck and the affected rendered-editor suite.
- Database/migration suite: 9 passed. Workspace typecheck and controlled PostgreSQL concurrency, permission, translation and restore regressions passed.
- A bounded browser continuation proved conflict-ID adoption preserves an unrelated KSA summary. It exposed a cold-reload selection race, which now has delayed-catalog regression coverage. The focused browser recheck passed with KSA context, adopted title and local summary retained after reload.
- The same-page 390px check retained context and keyboard access to Compare, but reported horizontal constraint in the long editor. This is not evidence of a complete responsive-publication walkthrough. The original broader publication browser journey was not rerun.
- The repair fixture was cleaned up. Fresh before/after preservation checks confirmed all 31 publication-pointer records, 220 availability records, 28 media-pin records and 58 revision-count records unchanged.

No production migration, deployment, bulk publication or downstream editorial/scheduling work was performed. Historical evidence below is retained as such; it does not expand the browser coverage stated above.

## Delivered behavior

- Explicit neutral Shared baselines per document and locale, including a standalone Shared editor.
- Shared, Adapted and Independent destination bindings, with sparse field overrides and immutable resolved revisions.
- Ordinary market saves retain the adopted baseline; later Shared edits require explicit comparison, adoption, hold, reset or detachment.
- Per-conflict Shared/market decisions and explicit translation-source acknowledgement.
- Market matrix separates staged availability, content source, pending work and public availability. Readiness filtering runs before pagination.
- Draft bindings preserve existing live output. Reviewed publication activates managed authority consistently for content, navigation, sitemaps and media.
- Source and destination authorization apply to managed authoring paths. Publication verifies resolved snapshots and exact media manifests.
- Additive database integrity constraints reject cross-document, cross-market and cross-locale pointer combinations.

## Verification

The complete API suite passed 192 tests. The complete admin suite passed 133 tests before the final serialization correction; the affected DocumentDetail suite and admin typecheck passed again after that correction. The database suite passed 9 tests, including real PostgreSQL deferred-integrity tests. Targeted readiness and market-row rendering tests passed.

Real PostgreSQL route coverage includes image-only sparse overrides, immutable pins, baseline successors, explicit conflict decisions, hold/adopt/reset/detach, normal saves, reviewed publication, independent public output, media/navigation/sitemap agreement and suppression after managed activation.

The browser pass confirmed real login/MFA, market configuration, the publication matrix, creation of a disposable publication and explicit baseline creation. It found that standalone Shared editing serialized absent SEO as `null`, which the strict metadata contract rejects. The correction omits absent SEO and has a regression test that validates the actual editor-generated payload against the CMS schema.

The browser pass did **not** finish the remaining Saudi image-selection/preview/publication/update walkthrough or the 390px/keyboard checks. Those flows must not be described as browser-passed. Their service behavior is covered by the PostgreSQL tests; the Shared editor fix was verified with a cheaper targeted test rather than another browser pass.

Completion review additionally found that a field reset could overwrite unrelated unsaved edits. Resets now require a clean draft and keep editing locked until the exact saved revision reloads. Temporary override markers are cleared on hydration, successful saves and edition switches. The affected DocumentDetail suite passed all 18 inner tests, including dirty-title/reset-summary preservation through refetch, navigation guarding and marker cleanup; admin typecheck also passed.

The final review also removed a placeholder publication label from the editor header and expanded reset coverage to every recorded sparse content operation. Header state now comes from the selected edition and its availability. A universal Market-specific fields panel exposes text, nested-object and stable-array resets. Nested resets split parent overrides while preserving siblings, and typed-media resets reconcile derived media IDs without deleting legacy attachments. Additional pure reset tests, the complete API suite, the affected rendered-editor suite and admin typecheck passed after these fixes.

Further PostgreSQL assertions verify that Keep and Detach preserve the exact local resolved snapshot, stored media manifest and physical revision pins, including real text and image adaptations. Resetting the final override changes the binding to Shared atomically and agrees with the matrix. The rendered comparison test verifies that multiple stable-array conflicts at one path produce one explicit choice and one submitted decision. The complete API suite and affected admin checks passed.

Archive regression coverage now also verifies that activated managed routes remain known-but-unavailable to navigation: the archived page's link is hidden, page availability is false and unrelated Contact navigation is retained. Final complete suite results: API 197 passed, admin 133 passed, database migrations 9 passed.

## Preservation and cleanup

The disposable browser document and fixture accounts were removed using the ownership-checking cleanup helper. Comparing the pre-change and post-cleanup development baselines confirmed:

- 31 publication-pointer records unchanged.
- 220 edition-availability records unchanged.
- 28 media-pin records unchanged.
- 58 revision-count records unchanged.

No existing content was promoted to Shared automatically, no existing publication was released, and no production migration or deployment was performed. Development preparation installed the additive shared-edition schema and deferred integrity constraints.