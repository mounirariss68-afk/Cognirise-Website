---
name: Perceptual loop validation
description: How to evaluate and replace cinematic loop footage without optimizing a similarity metric at the expense of the visible result.
---

Treat frame-similarity scores as diagnostics, never as acceptance criteria. A loop is successful only when the visible scene and its motion continue naturally across the replay boundary; do not introduce a flash, wash, blackout, or other concealment solely to improve a score.

**Why:** A full-frame color wash can make boundary pixels nearly identical while visibly damaging the ending. It improves the measurement by removing scene information rather than solving the camera discontinuity.

**How to apply:** Preserve the current production media while generating candidates separately. Inspect ordered frames spanning both sides of the boundary and compare the boundary jump with ordinary adjacent-frame motion. Replace production only after the candidate passes that perceptual check without an artificial masking frame.