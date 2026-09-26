---
name: Hero film loading failures
description: Distinguish slow video delivery from truly exhausted browser media sources on governed hero pages.
---

Keep a poster visible during buffering and do not permanently replace a film solely because it has not decoded within a fixed startup window. Failure should follow an actual media error or exhausted sources, not elapsed time.

**Why:** A large hero can be valid yet still loading after several seconds on a slow connection. In browser validation, delayed media eventually played when allowed to continue; a timeout had previously discarded it forever.

**How to apply:** Check real playback after a deliberately delayed media response. When multiple sources are provided, a source-level error or media-query mismatch is not proof that the whole video failed. Browser implementations may signal that all sources are exhausted through the media element's no-source network state without populating its error object; verify the final state after source errors before exposing the governed-image fallback. Also check a true all-sources-failed case.