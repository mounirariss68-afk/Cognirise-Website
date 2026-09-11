---
name: App Storage one-off scripts
description: Authentication and transaction boundaries for shell-run jobs that reconcile Replit App Storage.
---

Shell-run CMS reconciliation jobs cannot rely on Google Application Default Credentials. They must use Replit’s local App Storage sidecar external-account flow, just like the running service.

**Why:** A generic Google Storage client failed despite a configured App Storage bucket, and repeated full-object reads inside a database transaction made a repair exceed the shell execution limit.

**How to apply:** For one-off App Storage jobs, use the Replit sidecar authentication path. Verify source identity before opening a write transaction; run independent remote object checks with modest bounded concurrency rather than serially; and inside the transaction, rely on the already-verified storage key and immutable metadata instead of downloading objects.

Browser upload URL signing must use the sidecar's documented signed-object-url endpoint, not the Google SDK's private-key signer.

**Why:** External-account credentials can read/write objects but cannot satisfy the SDK's private signing-key requirement. The sidecar signature also rejects extra unsigned `x-goog-meta-*` headers, even though ordinary Content-Type works.

**How to apply:** Preserve the governed staging key and expiry through the sidecar signer. Do not attach unsigned checksum metadata headers to PUT; validate the requested SHA-256 from downloaded original bytes during finalization instead.