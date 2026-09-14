# Set, Prove & Hold public-route verification

The public-route browser harness uses the running managed website/API proxy;
it does not substitute a fixture, intercept CMS responses, or use a preview URL.

## Completed checks

- At 390, 768 and 1440 pixels: twelve action controls, four layer controls,
  twelve matrix cells, two native comparison tables, and a single persistent
  selection for each explorer.
- Every action was selected and its working-detail region became available.
- Real keyboard arrow navigation changed action selection.
- Real touch input on mobile, and pointer input on larger screens, selected
  layer and matrix controls.
- Runtime selection places the enforcement gate after the model and before
  delivery; architecture selection explains scoped information reaching the AI.
- Reduced motion yielded complete content with no active animation.
- Doubling computed text sizes preserved the absence of page-wide horizontal
  overflow. Tables retain their own bounded scroll regions.
- The page delivered public Set, Prove & Hold metadata and content.

Screenshots and the observed default-state report are in
`screenshots/guardrails/set-prove-hold/`. Default and selected views were captured
at all three widths, including enlarged text. The final editorial screenshot
also confirms removal of the unused media placeholder, tighter hero spacing,
and readable stage headings after a layout-only adjustment.

The completed browser assertions passed. Chromium profile removal then encountered
a shutdown race (`ENOTEMPTY`); cleanup now retries removal. This was a harness
cleanup failure, not a failed page assertion.

## Supporting checks

Website TypeScript and targeted Guardrails rendering/accessibility tests passed.
The production website build passed with its required `PORT` and `BASE_PATH`
configuration. Protected Agent Authority/IDAO checks passed without edits to
those pages or their governing logic.