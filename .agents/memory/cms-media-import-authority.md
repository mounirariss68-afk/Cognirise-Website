---
name: CMS media import authority
description: Safety boundary when development import processes cannot authenticate to App Storage.
---

An inventory import may reconcile checksums and create private pending media metadata without proving that the corresponding bytes reached durable object storage. Never describe that state as a completed upload, and never let such an asset satisfy publication checks. A verified immutable binary replay must also synchronize approved accessibility metadata on the pinned version; matching bytes alone do not make stale alt text authoritative.

**Why:** A development shell can have the configured bucket/path variables while still lacking the App Storage sidecar credentials required by the storage client. Treating metadata as upload success would make review and rollback reports misleading.

**How to apply:** Preserve the source asset, use an explicit deferred-storage marker, retain `pending-review`, and report durable upload, rights, and accessibility as unresolved gates. Durable `pending-review` assets may have authenticated editorial previews, but must not be labeled as processing or satisfy public delivery checks. Only an authenticated upload plus checksum/readback may advance the asset to ready. On a governed replay, update the pinned version's approved alt text and caption without manufacturing a duplicate binary version.