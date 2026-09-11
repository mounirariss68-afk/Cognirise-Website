# Industry visual authoring verification

## Implementation boundary

The shared template is a presentation-only mapping of existing industry content.
No industry content snapshots, historical revisions, approval states, publication
pointers or media versions were rewritten by the visual mapping. The preservation map is in
`industry-visual-preservation.md`. Banking and Education content/media still
follow their existing editorial review and publication processes.

## Confirmed checks

- Admin, website and API TypeScript checks passed.
- Focused industry renderer tests passed, including fixed nine-section order and
  Banking specialist content preservation.
- Focused preview and API capability-access regressions passed.
- Admin field-preservation, section mapping, preview request ordering/failure and
  actual rendered Education inspector placement tests passed.
- Admin production build passed.
- Code review identified and prompted corrections to specialist field placement,
  reviewer controls and preview-refresh races.
- Public browser checks reached Financial Services and Education compositions;
  all six public industry endpoints returned successful responses.
- API, admin and website workflows start successfully.

## Complete suite results

- Admin: 77 tests passed, including responsive container layout,
  failed-refetch recovery, rendered iframe lifecycle and local rollback/restore
  successor pinning regressions. Remote edition updates retain the selected
  preview pin and are marked stale rather than silently selecting new content.
- Website: 159 passed; one existing Contact test still expects an obsolete
  optional-phone source expression. The affected industry route accessibility
  assertion now checks the shared applications section and its visible headers.
- API: 130 passed; one media-stream listener-cleanup assertion failed in
  `published-media-versioning.test.ts`. The failure concerns retained pipeline
  listeners, not preview authorization or revision-pin selection. Targeted preview
  security tests passed.

Industry editing now uses available container width rather than the old narrow
editor column. Failed capability refetches reject cached query data, and protected
iframes send opaque, source/origin-checked status messages so revocation offers
immediate refresh recovery in the parent workspace.

## Browser coverage limitation

The single end-to-end browser pass had no authenticated editorial session.
Authenticated save/reload, concurrent editing, revision switching, market access,
preview expiry/revocation and review/publication controls were therefore not
verified in a live browser. The browser subsequently closed repeatedly, preventing
completion of the desktop/tablet/mobile and 200% text-enlargement matrix.
These checks must not be reported as passing.

A header-width issue observed during that pass was corrected by using the compact
navigation below the full desktop navigation breakpoint. Existing media-stream
listener warnings were also observed; no media security or publication checks
were relaxed to suppress them.

Nothing was automatically approved or published.

## Shared-source merge integration

The merged shared-source authoring prerequisite required its existing guarded
development reconciliation. Existing availability/editorial-origin migrations
were applied using that reconciler, with zero parity failures or ambiguous
origins. A general schema-push operation proposed dropping populated data and was
not forced. No production migration or publication was performed.

Rollback and restore now advance shared-source draft availability atomically
with their successor revision, invalidate stale review state, and refresh the
admin availability cache. A DB-backed isolated route test passed for rollback
and restore followed immediately by review submission and destination
customization. Published source pointers and existing customizations stay intact.