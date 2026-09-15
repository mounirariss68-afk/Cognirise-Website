# Task 339 browser acceptance evidence

## Run

- Browser: Playwright, Chromium, UTC, viewport `390x844`
- Target: managed local proxy `http://127.0.0.1:80/admin/`
- Authentication: real browser login followed by real MFA verification using the private fixture file; secrets are not recorded here.
- Fixture records created: controlled Partner and Office only, both intended to use the full fixture prefix `fixture-cms-owner-75ad26d9-b544-42f9-bb1b-3279d45e1ba5`.
- Note: the actual slugs entered during this run used the shortened prefix `fixture-cms-owner-75ad26d9-task339-*`; parent cleanup must repair/record those controlled slugs before invoking the cleanup helper, which validates the full state prefix.

## Verified observations

- Administrator login advanced to the MFA page and real MFA verification reached `/admin/dashboard`.
- Sidebar exposed the requested content routes.
- Partners list rendered compact rows and existing rows were not edited.
- Controlled Partner creation succeeded and opened:
  `/admin/content/05f52775-abfb-49c9-b202-d8916f1ccc1f?context=shared&locale=en`
  with a `Created successfully` notification and shared English context.
- Offices list rendered compact rows with existing live offices untouched.
- Controlled Office creation succeeded and opened:
  `/admin/content/e498ea24-82bf-4b76-a5c5-686a343f7e0d?context=shared&locale=en`
  with the fixture name, full address, phone, UAE visibility, and English language visible.
- Offices list subsequently showed the controlled Office as the first Draft row.

## Blocking failure

Reopening the controlled Office from the Offices list navigated to
`/admin/content/e498ea24-82bf-4b76-a5c5-686a343f7e0d` and rendered the error boundary:

`Something went wrong`

`Cannot access 'content' before initialization`

This prevented completing Office reopen verification and all remaining Task 339
editorial workflows.

## Follow-up repaired-session pass

The existing authenticated session was retained after the admin restart; no
login, dashboard, or record recreation was repeated for the repaired Office
flow.

- Office reopen now succeeds at 390px with the compact detail layout. The
  saved name, full address, and phone persist.
- Shared content editor opens with `?context=shared&locale=en&focus=editor`,
  retains the shared context/language, and exposes direct `Customize this
  market` / restore controls without raw IDs.
- Dirty exit raised the native confirmation
  `Discard unsaved shared baseline edits?`; explicitly accepting it discarded
  the temporary title and restored the saved title.
- UAE customization succeeded, one controlled City field was edited and saved
  (`UAE edition saved successfully`), the local value survived reopen, and
  `Reset Restore Content · city to Shared` restored the shared value and
  removed the local difference.
- A full-prefix Publication, Platform, Industry, Framework, and Case Study
  were created through their UI forms. Framework creation required the valid
  enum values `decision` and `E3`; Industry source kind required `Official
  source`.
- Publication shared Summary save reported `Shared content successor saved`,
  but reopening the full-prefix publication showed Summary / Deck empty
  (`0/2000`) rather than the saved `Task 339 publication saved summary.`.
  This is a reproducible save/reopen persistence defect and stopped further
  acceptance coverage.
- Framework navigation emitted a browser TypeError from
  `IndustryEditorialView`: `Cannot read properties of undefined (reading
  'startsWith')`, although the Framework list remained usable.

## Follow-up screenshot references

## Final corrections and non-browser verification

- The publication summary was not lost. A development-database read of the
  controlled publication's active neutral baseline confirmed revision 2
  contains `Task 339 publication saved summary.`. The regional draft was
  correctly unchanged. Bare item links now reopen the matching neutral shared
  context, while explicit regional links continue to open regional content.
  A rendered save → bare-link reopen regression verifies the saved shared
  title/summary and that no regional draft save occurs.
- The industry visual workspace is no longer mounted invisibly behind the
  shared-content form, preventing that unused regional preview from issuing
  requests while shared content is being edited. No public-site renderer or
  production content was changed.
- The final complete DocumentDetail regression run passed all 53 tests.
  The compact-row/content-field checks and 26 creation, authoring, office,
  geography, and compact-readiness checks passed. Admin typecheck and
  production build passed.
- Targeted API/PostgreSQL tests cover neutral creation, permission revocation
  during creation, shared successor preservation, regional customization,
  conflict/denial boundaries, reviewed availability release, and unchanged
  public delivery until release. The full API run reported 225 passes and
  one unrelated existing landing-inventory count mismatch (44 versus 56).
- The final reopening correction was verified through the database and
  rendered regression, not a third browser pass. The earlier screenshots
  remain evidence of the observed defect and the completed seven-type
  screen coverage.
- All controlled fixture documents, accounts, and related state were cleaned
  up through the guarded development fixture helper. Before cleanup, only
  the two exact shortened-prefix fixture records were renamed to their full
  fixture prefix, with fixture ownership checked.
- After concurrent schema changes were combined, completion review caught
  duplicate generated declarations. Clean regeneration from the combined
  OpenAPI source corrected the generated files without hand-editing them.
  On that final combined tree, `codegen:check`, admin typecheck, admin
  production build, and the complete 90-test targeted suite all passed.
- Final authorization regression: review and publication now require market
  authority for every changed availability decision, including hiding live
  content. Missing or invalid published state fails closed; only explicitly
  unchanged off destinations are exempt. PostgreSQL tests pass for denied
  cross-market removals in mixed and all-off matrices, asserting no state
  changes after denial, while targeted release with unchanged off rows still
  passes. API TypeScript validation also passes.
- Restricted-editor navigation correction: bare links and newly created items
  now retain an authorized exact regional editing path; only administrators
  automatically enter editable neutral shared content. Explicit shared links
  for restricted users are read-only, including toolbar and save callbacks.
  Reactive navigation tests exercise the restricted bare-link customization
  path and explicit read-only shared context. The final full editor suite passes
  55 tests, creation tests pass, and admin typecheck and production build pass.
  Missing-destination previews now use the actual document kind.

- `cbjoh7`: repaired-session mobile Office list
- `460a7t`: repaired compact Office reopen
- `dwj0p7`: Shared content · en editor
- `40mr8x`: dirty discard result with saved values
- `y4b9jv`: Customize this market notification/context
- `ylsvqq`: UAE local City edit
- `5gaxpl`: UAE local save and adapted source
- `5hzxa8`: reopened UAE local value
- `x7v53l`: Restore to Shared result
- `b0yv2b`: desktop Publication list
- `7mivg5`: controlled Publication detail after create
- `rnyfox`: Publication shared save successor
- `7dfy8t`: Publication reopen showing missing Summary
- `23w1si`: desktop Platform list
- `wc0bwt`: controlled Platform detail
- `5zwd3g`: desktop Industries list
- `k1oy3d`: controlled Industry detail
- `xk3mj9`: desktop Frameworks list
- `bgaegh`: controlled Framework detail
- `j7oud0`: desktop Case Studies list
- `kwqaks`: controlled Case Study detail

## Screenshot references

- `7s1x14`: MFA page
- `3znu86`: authenticated dashboard
- `rsvui9`: Partners compact list
- `08qkgr`: controlled Partner shared editor
- `xxhd9s`: Offices compact list
- `wa3han`: controlled Office editor after create
- `x0hzxy`: Offices list with controlled Draft row
- `r7of6d`: blocking error boundary on Office reopen