---
name: Disposable fixture cleanup receipts
description: How disposable database-and-object-storage fixtures must retain enough authority for safe cleanup after a workspace restart.
---

Disposable fixtures that own both a random database schema and private objects must keep their exact cleanup receipt somewhere that survives workspace restarts. A temporary file may be used as a working copy, but it cannot be the only record of schema identity, object keys, ownership checks, and the preservation baseline.

**Why:** Workspace restarts can remove temporary state while leaving the isolated schema and private objects intact. Without a durable receipt, normal teardown cannot prove what it owns and must either strand data or reconstruct authority manually.

**How to apply:** For future integrated harnesses, persist a minimal non-secret cleanup receipt durably, validate fixture identities and object namespaces before deletion, refuse keys referenced by public data, and verify public state remains unchanged after teardown.