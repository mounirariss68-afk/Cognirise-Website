---
name: Hero film loading failures
description: Distinguish slow video delivery from truly exhausted browser media sources on governed hero pages.
---

Keep a poster visible during buffering and do not permanently replace a film solely because it has not decoded within a fixed startup window. Failure should follow an actual media error or exhausted sources, not elapsed time.

**Why:** A large hero can be valid yet still loading after several seconds on a slow connection. In browser validation, delayed media eventually played when allowed to continue; a timeout had previously discarded it forever.

**How to apply:** Check real playback after a deliberately delayed media response. When multiple sources are provided, a source-level error or media-query mismatch is not proof that the whole video failed. Browser implementations may signal that all sources are exhausted through the media element's no-source network state without populating its error object; verify the final state after source errors. Also check a true all-sources-failed case.

For the UAE-English methodologies hero, never reveal the retired governed image, including on loading or media failure. Use the dedicated film directly and report a true failure with an explicit retry. Resume an unexpectedly paused video from its current time when the page becomes visible; do not reset the source or misclassify a hidden-tab interruption as corrupt media.

**Why:** The user rejected the old-image fallback after observing an unmoving first frame in Safari. Earlier tests forced normal motion, which bypassed the route's reduced-motion video suppression, so those passes could not explain their browser. The latest request prioritizes automatic full playback even with reduced-motion preference; a browser denying autoplay still needs a user-gesture path, not a silent still. After the removal of the suppression and old-image layer, the user confirmed that the film now plays correctly in Safari. That confirms the outcome, not which individual condition caused the earlier freeze.

**How to apply:** Validate first-paint media ownership, playback over at least 15 seconds under both motion preferences, a loop boundary, visible-page pause recovery and a genuine-error message separately. Distinguish preview evidence from published-site evidence. Do not claim to have identified a visitor's browser-specific cause from headless Chromium alone.