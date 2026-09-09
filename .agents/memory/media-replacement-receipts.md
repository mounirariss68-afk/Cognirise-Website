---
name: Media replacement receipts
description: Compatibility rule for governed media binaries that changed after an unversioned inventory receipt was recorded.
---

Binary replacements must append checksum-qualified versions while preserving prior receipts, immutable versions, and publication pins. Existing published revisions remain pinned to their historical version. Missing references may be restored only from exact authority tied to that revision; ambiguous lineage must fail.

**Why:** Treating the newest checksum as historical authority rewrites publication history, while accepting arbitrary legacy state hides lineage defects.

**How to apply:** Validate each publication against its own immutable pin, append replacements on the same asset lineage, and require exact revision-specific evidence for any repair.