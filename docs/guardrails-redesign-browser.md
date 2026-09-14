# Guardrails redesign browser evidence

**Run status:** final targeted follow-up passed; the earlier full-run overflow was fixed  
**Run mode:** explicit fixture mode (synthetic preview and synthetic hero media only)  
**Evidence directory:** `screenshots/guardrails/redesign/`

## Provenance

- After snapshot: `/tmp/guardrails-redesigned.json`
- Before snapshot: `/tmp/guardrails-baseline.json`
- Hero bytes: `attached_assets/generated_images/cognirise-guardrails-boundaries-hero.jpg`
- Hero delivery: local fixture bytes, JPEG, 146,953 bytes
- Hero SHA-256: `58854df17fc2aada590e03f5a2cd168677eb737a0d97cbe51b9e1a4b34b249fe`
- No authenticated preview, session, bearer token, or admin bypass was used.
- Fixture interception was limited to the synthetic preview response and synthetic hero-media response. The evidence JSON records seven preview and seven media fulfillments.

The before renderer was captured from `git HEAD` (`1d934870424f316d98547ece39d0abc8ef7324e7`) into a temporary SSR entry. It rendered the supplied baseline snapshot without hero media and did not modify application source. The after renderer used the working tree. Source captures and SHA-256 values are in `renderer-before-head.tsx`, `renderer-after-working-tree.tsx`, and `guardrails-redesign-evidence.json`.

## Comparable DOM word count (initial full run)

The same browser DOM scope was used for every viewport: article-visible text excluding header, navigation, footer, hidden nodes, and closed `details`; selected default panels remained included.

| Renderer | 390 | 768 | 1440 |
| --- | ---: | ---: | ---: |
| Before, git HEAD renderer | 2,882 | 2,882 | 2,882 |
| After, redesign renderer | 502 | 502 | 502 |

The initial count delta was expected to be investigated as a disclosure/content-visibility change: the old renderer exposes its long-form sections directly, while the redesign keeps supporting details in closed disclosures by default. The counts are measurements, not an assertion that copy was removed. Full text is retained in the evidence JSON for audit.

## Captures and interaction evidence

- Current renderer groups: **7** at every after viewport (**one header + six sections**).
- Full-page and per-group PNGs were captured at **390**, **768**, and **1440**.
- Layer tool: four independent controls, panel IDs `layer-panel-policy`, `layer-panel-prompt`, `layer-panel-runtime`, and `layer-panel-architecture`; keyboard ArrowRight/Home/End and mobile touch state were exercised.
- Exposure tool: five independent controls using `exposure-tab-*` and their five mappings; keyboard and mobile touch state were exercised.
- The mobile threshold marker (`ABOVE THIS LINE YOU ARE ASKING · BELOW IT YOU ARE NOT`) was visible at 390.
- Reduced-motion emulation was enabled for all captures and no running animations were observed.
- Mobile print PDF was captured at `guardrails-redesign-after-390-print.pdf`; the print lifecycle expanded all eight supporting disclosures and their content was readable.

## Initial full-run UI failure (superseded)

At the **768px** after viewport, the exposure tab row overflows the page:

- `documentElement.scrollWidth/body.scrollWidth`: **963px**
- viewport: **768px**
- `Runtime` button: left 666px, right 788px
- `Architecture` button: left 788px, right 963px

This was an actual renderer/layout failure, not a harness selector failure. The original full-run evidence is retained as `guardrails-redesign-evidence-initial.json`. The final targeted follow-up below confirms the fix; no app files were changed by either browser run.

## Final targeted follow-up

The final pass used the saved actual rev2 fixture and refreshed only default-visible word counts, screenshots, tablet overflow, the current threshold selector, and the mobile print PDF. It did **not** repeat the interaction suite; the original interaction evidence remains in `guardrails-redesign-evidence-initial.json`.

| Renderer | 390 | 768 | 1440 |
| --- | ---: | ---: | ---: |
| Before, retained git HEAD baseline | 2,882 | 2,882 | 2,882 |
| After, current working tree | 1,256 | 1,256 | 1,256 |
| After minus before | -1,626 | -1,626 | -1,626 |

The final reduction is **56.4%**, measured with the identical counting scope.
This is approximately the requested 50%, without reducing font size. It is
slightly below the harness's narrower 1,300–1,500-word target, so that advisory
is retained honestly in the machine-readable evidence.

The current renderer has seven groups (one header plus six sections). All three final after captures fit their viewport; at 768px the page width is 753px, so the prior 963px tablet overflow is gone. The current `[data-guardrails-threshold]` marker is present and visible at 390px.

Refreshed final artifacts include 30 after PNGs (full-page, all seven groups, and both tool clips at each viewport) and `guardrails-redesign-after-390-print.pdf`. The print capture expanded all current supporting details, with readable content and no print overflow. Final machine-readable results are in `guardrails-redesign-evidence.json`; the run is marked `passed: true` with the target-range warning in `wordCount.warnings`.

## Final review fixes and focused checks

The final tree restores summary-replaced source qualifications to their labelled
disclosures and binds the separately saved social-image version. Metadata
application now replaces or removes both OG and Twitter image tags, so a previous
page's image cannot remain on generic/unavailable states.

- Website TypeScript check passed.
- Guardrails renderer and document-head transition tests: **9 passed**, including
  a real-source-fixture assertion for the retained qualifications.
- Source fidelity, redesign transform, exact mappings and reconciliation
  safeguards: **12 passed**.
- Final targeted screenshot/word-count/overflow/print capture: **passed**.
- Full authenticated Admin save/reload and preview issuance: **not verified**;
  the available browser reached normal sign-in, not an authorized session.

## Completion-review regression coverage

The real PostgreSQL-backed API regression
`artifacts/api-server/tests/pending-media-carry-forward-postgres.test.ts` passed:
normal prose/SEO save retains a predecessor's exact pending-review media version;
reload and authenticated test preview return the successor; protected media
delivery returns the pinned bytes. Swapped pending versions and unrelated pending
assets return 422. Test authentication uses isolated session/MFA records and only
object download is mocked; this is **not** evidence of a real user browser session.
Cleanup removed the isolated records. The actual staged edition still has only
its original and redesigned draft revisions.

Presentation-less revisions retain their pre-redesign renderer, with a focused
regression. The complete website suite passed (202 tests at that point). The
two explorers now include every original diagram string in accessible, print-
visible text equivalents; focused fixture assertions passed. These additions are
screen-reader-only outside print, so they do not change the default-view captures
or word count above. The saved PDF predates these additional text equivalents;
their final print exposure is verified structurally, not by that older PDF.

## Reconciliation lifecycle and final writable validation

Behavioral reconciliation tests now cover a receipted draft followed by a normal
successor save, later publication of the receipted revision, and intervening
editorial work before first staging. Each returns a successful replay/preservation
without rewriting newer content. Immutable receipt/content/pin corruption still
fails. These lifecycle tests and the scripts TypeScript check passed.

Generated API freshness passed in the writable workspace. The full API run
passed 223 of 225 tests; its two failures were an outdated mocked-query fixture
and a stale navigation-helper source assertion. Both tests were corrected without
weakening production behavior. A targeted run of the two affected files passed
all 11 tests. The complete API suite was not redundantly rerun after those
test-only fixes.
