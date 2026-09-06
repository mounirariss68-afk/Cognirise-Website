---
name: Hover transition verification
description: How to verify hover-driven layout motion when browser automation reports an apparent snap.
---

Browser automation hover helpers can wait for the target to stabilize before returning, making a real layout transition appear to have snapped when widths are sampled afterward.

**Why:** Multiple valid animation mechanisms appeared instantaneous through a high-level hover helper, while direct Chromium pointer dispatch showed progressive frame-by-frame width changes across the full duration.

**How to apply:** For hover-driven layout motion, dispatch a real pointer move through the browser protocol and sample bounding boxes at several timestamps from 0 ms through the declared duration. Use screenshots for visual quality, but use timed geometry samples for motion.