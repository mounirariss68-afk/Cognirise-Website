---
name: Wide artwork composition
description: Quality rule for adapting Cognirise illustrations to panoramic slide formats.
---

For wide Cognirise artwork, the composition itself must continue across the requested frame. Do not meet an aspect ratio by adding blank side space, and do not present a low-resolution crop enlarged to nominal presentation dimensions as a high-resolution asset.

**Why:** Blank extensions were rejected because they did not complete the illustration, and enlarging a small raster source made the delivered image visibly pixelated.

**How to apply:** Use outpainting or a natively panoramic composition to complete clipped objects and continue the visual system at both edges. Inspect the final pixels, native dimensions, edge continuity, and slide-size sharpness before delivery.

Do not assume a panoramic prompt or a high-resolution request determines the returned image dimensions.

**Why:** In this workspace, both generation and editing returned square images even when the prompt requested a panorama and the edit input was ultrawide.

**How to apply:** Check actual dimensions early. Use documented dimension controls when available. Inspect adjoining image fields visually; preservation prompts do not guarantee matching edges. If using separate perspectives, make the angular editorial treatment intentional rather than disguising a failed stitch.