---
name: Partial generated video output
description: Failed parallel video generation can leave usable completed clips on disk.
---

When a parallel video generation call reports failure, inspect each expected output path independently before falling back to a different production method. A successful clip may have been written even though the aggregate call failed.

**Why:** One of two concurrently requested Team clips existed and contained credible human motion, while the combined call reported that no usable video URL was returned. Inspecting the file let the preview use real motion rather than a camera move over a still.

**How to apply:** Probe every expected output with a media tool, inspect representative frames for text and continuity, and treat any surviving clip as untrusted until visually verified. Do not claim the whole generation succeeded or assume all outputs exist.