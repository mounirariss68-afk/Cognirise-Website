# Task 335 browser evidence

This evidence was captured against the local website at `http://127.0.0.1:80` with native
Chromium CDP. It is a browser-only fixture render; it did not write to the CMS,
approve a revision, publish content, or create a preview capability.

## Method

1. The approved UAE/English legacy payload was fetched from
   `http://127.0.0.1:80/api/public/content/uae/en/framework/agent-authority-model` (revision 4, digest
   `7291089aace748b74e2410dd652ef2c66ba1fa320f1c4643bb470d65dab66f36`). No fields were reconstructed.
2. The before renderer was generated from
   the committed `artifacts/cognirise-website/src/components/agent-authority/LegacyComparisonDiagram.tsx`, rendered to temporary static markup,
   and installed only into the public route's comparison-figure slot. The before
   payload remained the approved public payload.
3. The after workflow loaded the current website route. CDP fulfilled only the
   Agent Authority public content request with the approved full payload plus the
   `task335Summary` export from
   `scripts/src/cms/task-335-agent-authority-summary.ts`. This is explicitly a
   local summary fixture; it is not public publishing.
4. Every snapshot waited for fonts/images, used reduced motion, and injected
   transition/animation suppression. The 200% check snapshotted every visible
   text descendant in the full #guardrails-and-authority section, then set each
   once to 2x its computed pixel size and checked every resulting ratio. The
   canonical chart's own horizontal scroll container remains allowed.

## Assertions and measurements

| Check | Result |
| --- | --- |
| Desktop figure height including caption (before) | 1179.41px |
| Desktop figure height including caption (after) | 403.61px |
| Desktop reduction | 65.78% (asserted >= 35%) |
| Desktop caption height (before → after) | 69.78px → 66.59px |
| Mobile figure height including caption (before → after) | 2566.89px → 1094.97px |
| Mobile reduction | 57.34% |
| Assessment present | desktop/tablet/mobile/200% |
| InteractionChart present | desktop/tablet/mobile/200% |
| Page-level horizontal overflow | none at all captured viewports |
| Native details keyboard | Space opened; Space closed |
| 200% visible text font-size ratio | 2x–2x across 151 descendants (asserted 1.99x–2.01x) |

The full per-viewport DOM metrics, overflow offenders, computed font snapshots,
payload digests, diagnostics, and screenshot paths are in
`screenshots/task-335/task-335-browser-metrics.json`.

## Screenshots

The named figure crops are the direct before/after comparison at the requested
viewports. The `-page` companions are full-page captures:

- `screenshots/task-335/task335-before-desktop.png`
- `screenshots/task-335/task335-before-desktop-page.png`
- `screenshots/task-335/task335-before-mobile-390.png`
- `screenshots/task-335/task335-before-mobile-390-page.png`
- `screenshots/task-335/task335-after-desktop.png`
- `screenshots/task-335/task335-after-desktop-page.png`
- `screenshots/task-335/task335-after-tablet-768.png`
- `screenshots/task-335/task335-after-tablet-768-page.png`
- `screenshots/task-335/task335-after-mobile-390.png`
- `screenshots/task-335/task335-after-mobile-390-page.png`
- `screenshots/task-335/task335-after-text-200-desktop.png`
- `screenshots/task-335/task335-after-text-200-desktop-page.png`
