---
name: Homepage anchor test timing
description: Timing constraint for reliable repeated same-page anchor navigation checks.
---

Repeated checks of the homepage practice anchor must wait for the previous animated scroll to finish before resetting the page and clicking the same hash again.

**Why:** The section can become visible before the scroll animation completes. An immediate scroll reset then competes with the still-running animation, causing deterministic timeouts unrelated to the navigation assertion.

**How to apply:** When changing the navigation browser regression, detect scroll completion or cancel the prior animation before beginning another same-hash interaction; do not treat initial section visibility as completion.