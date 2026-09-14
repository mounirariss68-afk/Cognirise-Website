---
name: Matrix browser fixture safety
description: Keep browser mutations scoped to the exact disposable document when a matrix contains real content.
---

Browser validation against mixed real and disposable CMS content must preserve
the exact fixture document identity and intended source revision throughout
every mutation, including when an expected control is absent.

**Why:** Shared environments can contain real editorial work with matching
markets or apparently equivalent controls. A missing disposable fixture is
never permission to substitute a nearby row.

**How to apply:** Bind selectors to the disposable document ID, verify its
source revision before confirmation, and stop the mutation if the target
cannot be identified unambiguously.
