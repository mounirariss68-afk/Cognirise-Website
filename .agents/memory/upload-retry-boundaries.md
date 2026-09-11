---
name: Upload retry boundaries
description: Non-obvious constraints when resuming governed browser uploads across failures and identity changes.
---

Validate every finalization field before freezing upload metadata. Keep that snapshot frozen even when persistence fails during a retry, and guard each new network stage against a changed or disposed session owner.

**Why:** A file can transfer successfully before finalization rejects metadata that the UI allowed. If the snapshot is already locked, the editor cannot correct it safely. Hiding an old user's queue is also not cancellation: an asynchronous operation can otherwise continue using the next user's cookies.

**How to apply:** Match UI and preflight constraints to the finalization contract, preserve the original started state on retry failure, and retain an independent user-scoped retry identity. Missing local files must be reselected by exact SHA-256 rather than filename. Recovery of an already-finalized upload should verify the expected asset's checksum and size, not equality with its old staging path: successful promotion deliberately changes that path. Exact-byte import reuse must additionally prove the stored version belongs to the immutable objects namespace; readable staging bytes are not an immutable receipt.