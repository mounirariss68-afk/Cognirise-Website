# Task289 banking browser validation

Date: 2026-09-11  
Route: `http://127.0.0.1/preview/banking-ui-test` via the managed port-80 proxy

## Method and limitation

The protected preview GET was controlled-intercepted only for this UI pass. The response used `/tmp/banking-review-draft.json` (revision 10), live public navigation, the live published hero media record, and TEST media URLs serving the supplied originals. No CMS approval, authentication bypass, or shipped harness/fallback was used. The actual public API and legacy page were queried separately.

## Verified

- Real `CmsPreview` rendered `BankingEditorial` with the protected banner, UAE/EN revision 10, hero, 3 value levels, 6 domains, the four starting-point titles, 7 voice journeys, and 8 selected-work cards. The original pass did **not** validate starting-point interactions; that was corrected in the follow-up below.
- Desktop pointer entry/exit and sibling movement used `mouse.move`; the entered card expanded from 212px to 442px and stayed stable through samples at 0/80/200/700ms. Keyboard Enter expanded the card to 715px; its CTA had a 3px orange focus outline and remained open after moving to a sibling.
- 1440, 900, and 390px sweeps under `prefers-reduced-motion: reduce` had no document-level horizontal overflow and retained headings/titles. Eight touch taps at 390px expanded all eight case controls; document width remained exactly 390px.
- Preview metadata had `robots=noindex,nofollow` and a canonical pointing to the preview URL. The live public banking payload was byte-for-byte unchanged from the initial baseline.
- The documented public case-study list returned 21 items and included all eight banking membership slugs. `/industries/banking` remained live and resolved to `/industries/financial-services?market=uae` with the old public hero/page content.

## Failures / limitations

- **Preview document title is incorrect:** on the rendered preview, `document.title` was `Page Not Found | Cognirise`; expected preview metadata title is the protected draft preview title (the `CmsPreview` code calls `applyMetadata` with `Draft preview | Cognirise`). Robots/canonical were correct. Reproduced on the intercepted preview at 390px.
- The first direct single-case API probes returned 404 because that endpoint shape is unsupported; the documented list endpoint and live public page subsequently confirmed all eight cases. This is not reported as an application failure.
- One lazy workflow image reported `naturalWidth: 0`, `naturalHeight: 0`, and rendered height 0 during the automated dimension sweep. This may be lazy-loading timing; it was not treated as a definitive media regression without a second settled-load observation.
- Mobile selected-work cards intentionally clip neighboring carousel content inside the section while document-level overflow remains absent (`scrollWidth === innerWidth`).

Screenshots available from the browser observations: `qmwuyt` (preview hero), `ta2vl8` (keyboard-expanded card/focus), `phpljp` / `uts43e` (390px touch case section), and `tb2voa` / `i8tfe1` (live old public page).

## Corrected starter-specific follow-up

- `#starting-points` contains exactly four `.b-starter-tile` / `.b-starter-trigger` / `.b-starter-panel` entries with the required titles: Core Banking Operations, Contact Centre, Software Delivery, and Marketing Intelligence.
- The requested real mouse geometry pass could not reach the intended desktop interaction in this browser. Chromium reported `(hover:hover)=false` and `(pointer:fine)=false`; the desktop-only 650px CSS branch therefore did not apply. `.b-starter-tiles` remained 44px high and each tile collapsed to 2px at t0/80/200/700ms. The trigger content was clipped/overlapping rather than exposing the expected stable 650px envelope. This is a starter UI failure/verification blocker, not a case-study result.
- Explicit keyboard activation did set the first trigger `aria-expanded=true`, `.is-open`, and panel `display:block`, but its tile still measured only 2px high and no title/proposition/panel content was visually exposed. Focusing the sibling removed `.is-open` from the first tile and gave the sibling the expected 3px orange focus outline.
- Required mobile touch activation was not achievable by real taps. At 390px, all four tile boxes were 2px high and their 180px triggers overlapped at y≈0, 14, 28, and 42 beneath the sticky preview banner. Playwright tap hit-testing timed out because the section/heading/tile intercepted the pointer. Consequently, all-four mobile expansion remains unverified and is reported as a failure to interact, not as success.
- The production-readiness figure exists and is square (`343.21875 × 343.21875` CSS px) after a 1.2s settled wait, but it contains no `<img>` element, so actual artwork URL and intrinsic dimensions could not be verified. The figure’s annotation is present.

Starter-specific screenshot evidence: `ssynsd`, `6fkya3`, `96wtp2`, `2jq5ii`, `b9vske`, and `32s9or`.

## Narrow fix confirmation (current revision)

- Rebuilt the controlled fixture from the refreshed `/tmp/banking-review-draft.json` (revision 11) and the current receipt IDs, including readiness asset `9ed8d51d-d35d-4cdb-b620-c98242fb74db` / version `a06c658f-1356-4264-b3ef-ffc65c993252`.
- A brand-new `hasTouch:false,isMobile:false` 1440px context was used. Chromium reported `hover:false` and `pointer:false`; a CDP `Emulation.setEmulatedMedia` attempt did not change those values. Therefore no desktop hover samples were faked or claimed. The fixed stacked layout is no longer collapsed: four tiles measured about 369.9px each (container about 1515.6px), but the requested 650px fine-pointer hover envelope remains untestable in this environment.
- The four touch controls were individually rechecked in a new touch context. Each exact title reached `aria-expanded=true` with its panel visible: Core Banking Operations, Contact Centre, Software Delivery, and Marketing Intelligence. The accordion leaves only the most recently tapped tile open; document overflow remained absent (`scrollWidth === innerWidth`).
- Preview metadata is now correct in the new context: title `Draft preview | Cognirise`, robots `noindex,nofollow`, and no canonical link.
- The readiness figure remained square, but the readiness image stayed `complete:false` with `naturalWidth/naturalHeight=0` after 1.2s. Its current draft reference exactly matches the current receipt IDs, but the intercepted fixture did not produce a settled image response; report this as the known fixture/media limitation rather than a UI geometry failure. Screenshot `ekx5f7` shows the placeholder/caption state; starter screenshot `zwvlq6` shows the corrected stacked tile with visible title/proposition.