---
name: Sticky panel browser assertions
description: How to make browser checks for sticky result panels reflect actual sticky behavior.
---

Bring a sticky element into its active scroll range before asserting that it remains visible. Scrolling only to the start of a long containing section can correctly leave the sticky element below the viewport.

**Why:** Sticky positioning constrains an element only after its normal-flow position reaches the relevant viewport inset; it does not make a later element visible from the top of its container.

**How to apply:** In browser regression checks, scroll the sticky element into view (or scroll past its normal-flow threshold), then assert both computed `position: sticky` and viewport intersection.

For a sticky pane with its own vertical scrolling, treat off-scrollport descendants as reachable content rather than clipped text. Do not equate `scrollHeight > clientHeight` or a descendant rectangle outside the parent section with hidden overflow.

**Why:** A large image rail can keep a shorter result pane sticky while long result copy scrolls inside it; naive clipping assertions fail on valid links below the pane's visible scrollport.

**How to apply:** Still reject `overflow: hidden` and `clip`, horizontal clipping, and unfocusable links. Verify the pane itself stays inside the section and that keyboard focus can scroll each result link into view.