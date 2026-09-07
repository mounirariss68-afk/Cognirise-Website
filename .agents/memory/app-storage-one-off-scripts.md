---
name: App Storage one-off scripts
description: Authentication and transaction boundaries for shell-run jobs that reconcile Replit App Storage.
---

Shell-run CMS reconciliation jobs cannot rely on Google Application Default Credentials. They must use Replit’s local App Storage sidecar external-account flow, just like the running service.

**Why:** A generic Google Storage client failed despite a configured App Storage bucket, and repeated full-object reads inside a database transaction made a repair exceed the shell execution limit.

**How to apply:** For one-off App Storage jobs, use the Replit sidecar authentication path. Verify source identity before opening a write transaction; inside the transaction, rely on the already-verified storage key and immutable metadata rather than performing remote object downloads.