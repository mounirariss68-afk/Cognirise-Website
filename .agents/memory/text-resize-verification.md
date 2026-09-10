---
name: Text resize verification
description: Avoid compounded typography when simulating text-only browser zoom across React updates.
---

Disable CSS transitions completely before measuring baseline typography in text-resize regressions. Reduced-motion emulation alone is insufficient.

**Why:** A global reduced-motion rule that sets a tiny nonzero transition duration implicitly animates all properties on otherwise unconfigured elements. Removing a text-size override then immediately reading computed fonts can return the previous enlarged size at the start of that transition, compounding the next resize.

**How to apply:** For layout-only text enlargement checks, suppress transitions, snapshot all computed typography before applying overrides, and assert retained elements return to their original baseline before reapplying scale after a React update. Keep padding and viewport dimensions unchanged; root font-size changes alone miss pixel-sized text.