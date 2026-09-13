# Shared and market-specific CMS editions

## Acceptance status: not complete

Completion review has not approved this work. Passing suites below do not establish release readiness. The latest comprehensive review identified these remaining blockers:

- Ordinary revision writes lock the edition before the binding, while shared actions take the reverse order. Concurrent writes can deadlock rather than return an optimistic conflict.
- Generic binding updates still allow an existing adoption to move to another baseline outside the compare/resolve workflow, potentially discarding overrides.
- Binding updates can mark translations current while retaining an older translation-source revision without explicit acknowledgement.
- Stable-array conflicts need operation/ID-specific choices that preserve unrelated safe operations; comparison value lookup must honor stable-ID selectors.
- Restoring an archived edition with a newer draft or rejected revision does not reliably restore the approved published snapshot.
- Independent bindings are incorrectly included in needs-baseline readiness.
- Authorization must be revalidated within the same consistently locked mutation transaction, including archive/restore and concurrent rebinding.

Separately, the most recent fixes now enforce existing-source authorization for generic binding transitions, reserve version zero for create-only binding requests, and read deep-link queries through Wouter's actual search hook. Targeted tests cover source permission denial, stale creation tokens and market-code/UUID selection.

No completion or deployment should be inferred from the implemented features or historical test results below.

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