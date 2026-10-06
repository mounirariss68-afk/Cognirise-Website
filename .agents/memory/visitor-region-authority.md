---
name: Visitor region authority
description: Prevent implicit editorial defaults from masquerading as visitor region choices.
---

Automatic image-region detection must complete before public navigation can write an explicit market query. Analytics must not normalize an implicit editorial market into the URL.

**Why:** A pre-existing analytics effect appended the default UAE market before the image-region lookup mounted, causing the lookup to treat a default as an explicit user choice and never run. Testing only country-mapping functions or explicit regional URLs missed this first-visit failure.

**How to apply:** Preserve the distinction between an editorial content source, detected image region, and manual visitor choice. Test a fresh browser with no query or stored state, observe the actual country lookup, and navigate through the portfolio to IDAO. Also test a manual choice while lookup is pending.
