---
name: Interactive image reveals
description: Keeps rapidly changing Pulse artwork visible while site-wide image entrances are active.
---

Artwork that switches in response to hover, keyboard, or touch must not depend on the site's long, page-entry image reveal. Make its first visible state immediate and own any short changeover locally.

**Why:** A ready, successfully served illustration still appeared as a blank tinted frame in desktop and mobile previews because the site-wide reveal masked it during capture. The same delay obscures fast-moving interactive previews.

**How to apply:** When adding image-led interactive content, verify both image decoding and visible pixels on first entry, then verify the swapped image during a real pointer transition. Keep decorative thumbnails and focal imagery synchronized; reduced-motion content should appear without waiting.