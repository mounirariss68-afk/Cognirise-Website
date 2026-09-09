---
name: Media replacement receipts
description: Compatibility rule for governed media binaries that changed after an unversioned inventory receipt was recorded.
---

Binary replacements must use a new checksum-qualified operation while preserving prior receipts, immutable versions, and publication pins. Upgrade logic may accept multiple legacy receipt digests only when each is an explicitly classified prior state, and every accepted receipt must resolve to the same media asset as the replacement.

**Why:** A governed binary can legitimately exist under the old inventory key with either its older bytes or the current bytes imported before operation versioning. Requiring one state breaks upgrades; tolerating arbitrary drift hides defects; resolving by checksum can split one publication lineage across duplicate assets.

**How to apply:** When classifying another replacement, record every exact legitimate prior digest, anchor import through any matching historical receipt before checksum deduplication, append on that asset, and reject unknown digests or cross-asset receipt lineage.