---
name: Matrix browser fixture safety
description: Keep browser mutations scoped to the exact disposable document when a matrix contains real content.
---

Browser validation against mixed real and disposable CMS content must preserve
the exact fixture document identity throughout every mutation.

**Why:** Market identifiers are shared across document rows. A control with the
right market is not proof that it belongs to disposable test content; substituting
another row can modify real editorial work.

**How to apply:** Bind mutation selectors to the fixture document ID and verify
its source revision before confirmation. If the exact fixture cannot be found,
stop that mutation rather than substituting another visible row.
