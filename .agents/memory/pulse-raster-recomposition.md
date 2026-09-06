---
name: Pulse raster recomposition
description: How to change spacing or aspect ratio in an approved Pulse raster illustration without losing its accepted scenes.
---

When an approved text-free Pulse illustration needs more spacing or a wider aspect ratio, preserve the accepted master with content-aware horizontal expansion before attempting a generative re-edit or manual scene slicing. Raster generation can return a square source even when the prompt specifies widescreen, so treat exact 16:9 recomposition as a required post-generation step.

**Why:** Generative editing can replace accepted objects or invent labels even when explicitly prohibited. Cutting light-background scenes into separate rectangles creates visible tonal seams or damages white architectural objects when background removal is applied.

**How to apply:** Inspect the generated dimensions before integration. Resize the accepted master to the target height, remove only expendable outer whitespace if needed, expand horizontally through low-detail off-white regions, then add clean outer margins to reach the exact target ratio. Visually inspect object integrity, spacing, edge margins, and text-free output before replacing presentation assets.