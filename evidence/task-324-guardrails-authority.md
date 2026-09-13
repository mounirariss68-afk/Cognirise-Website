# Guardrails and authority — review handoff

## Draft and review

- Open `/admin/content/ebdf2421-f071-4682-99c3-7bd923eee8e4`, UAE / English, revision 2, then use the existing protected Preview action.
- The staged revision is `17db9911-27b9-40fd-82ac-b339b63916fa`.
- Only this development edition was staged. Its publication state remains `draft` and published revision pointer remains null. Public framework delivery remains compiled; no cutover, approval, publication or deployment was performed.
- Staging, read-only verification and idempotent replay all succeeded. Replay retained the same revision. The staging command serializes with normal edition saves and fails closed if guardrails content already exists without its matching receipt.
- Reproduce development staging after merge with `pnpm --filter @workspace/scripts cms:stage-agent-authority-guardrails -- --apply-db --target=development`. This is intentionally not an automatic publication or broad reconciliation.

## Eight requested checks

1. **Build/render:** PASS. Shared-library, scripts, website and admin typechecks pass. Website production build passes using the managed website port/base-path values; existing large-bundle warning remains. Six focused schema, preview and markup tests pass. Existing authority-ceiling browser regression passes. Saved-draft visual rendering at both widths has no runtime/console errors.
2. **SVG loading:** PASS. Both external images returned HTTP 200 and decoded with the required aspect ratios in the browser. Embedded WOFF2 fonts replace the invalid initial TTF data; actual browser rendering shows Comfortaa and Inter without font-decoding errors. A standalone SVG document capture reported a favicon 404, not an image request failure.
3. **Position:** PASS against the explicitly approved current order: handover → guardrails → “What it costs to be wrong.” The later six-question assessment and existing methodology narrative have not moved relative to the other original sections.
4. **390px:** PASS. No body horizontal overflow, comparison rows stack, figures fit uncropped, text bounds do not overflow. Dense SVG lettering is naturally small at this width; no enlargement interaction was added.
5. **1440px:** PASS. New section uses the existing 4.8vw gutters and 112px desktop section padding; both figures fill that content width, with no hero crop or caption overlay.
6. **Other sections/pixels:** QUALIFIED, not pixel-identical. Original pre-edit baseline capture was not completed. Instead, the browser comparison reconstructs a baseline from the same saved draft with only the new optional field removed. It captures full pages and each original section, compensating for vertical displacement. Original section geometry and content remain unchanged; residual changed-pixel percentages range from 0–3.020% at 1440px and 0–8.879% at 390px. These raw residuals are reported, not dismissed as proven pixel identity. Full metrics: `artifacts/cognirise-website/evidence/guardrails/pixel-comparison.json`.
7. **Accessibility/navigation:** PASS. Anchor belongs to the h3 itself; four h4 headings follow. Both alt texts and segmented captions are governed fields. Hash navigation succeeds. No existing contents rail was found, so none was added and global navigation is unchanged.
8. **Diff scope:** Necessary CMS contract/editor/coverage, preview normalization, staging and regression files exceed the original page-only limit under the explicit approval for CMS editability. No stylesheet change was necessary. Exact code statistics are saved alongside this report in `guardrails-diff-stat.txt`; generated evidence and the two SVG assets are included separately from the tracked-file diff.

## Screenshot evidence and limitations

`artifacts/cognirise-website/evidence/guardrails/` contains baseline/after full-page captures at 390px and 1440px plus every individual original section and the new subsection. `run.json` records layout assertions, HTTP responses, section displacement and console checks.

The screenshot harness intercepts only a browser preview response and supplies the exact saved revision payload. It uses the real preview renderer and live navigation but is **not an authenticated preview-session test**; no capability URL was fabricated or persisted. The real review remains available through the authenticated CMS Preview action above.

The final diagram-only repair restores angular controls, Pulse violet and the promotion arrow after font replacement; it does not affect section dimensions or existing-section comparisons.

## Files needed beyond the page and two SVGs

- `lib/api-zod/src/cms-content.ts`: optional strict, fixed-asset structured contract.
- Admin `ContentEditor.tsx` and `field-coverage.ts`: focused editable fields, including table labels/emphasis and figure captions/alt.
- Website `framework-preview.ts` and its tests: safe complete-only normalization, legacy omission and malformed-data protection.
- `scripts/src/cms/agent-authority-guardrails.ts`, its test and scripts package command: canonical content and locked draft-only staging/replay.
- Website `AgentAuthorityModel.guardrails.test.ts` and `scripts/guardrails.browser-test.mjs`: markup and visual checks.
- This report, diff statistics and screenshot/JSON evidence.