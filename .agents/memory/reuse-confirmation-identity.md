---
name: Reuse confirmation identity
description: Replacement consent must remain pinned to both sides of an inspected content comparison.
---

Pin replacement consent to the inspected source baseline revision, destination revision, and binding version. Refetching a newer value must invalidate consent, never silently update its concurrency token.

**Why:** A server can correctly reject a stale replacement while the client subsequently retries with fresh tokens and old consent. Baseline successors can also retain the same source revision while changing the reusable snapshot, so source revision identity alone is insufficient.

**How to apply:** Check all comparison identities when constructing requests as well as when updating UI state. Require reinspection after any identity changes, including through advanced controls.