---
name: Media schema reconciliation
description: Development media imports can encounter stale CHECK constraints despite current columns and schema source.
---

Inspect actual development CHECK definitions when a governed collection import fails; a present column and current source migration do not prove that the constraint was applied.

**Why:** The motion collection existed in source and the database had motion metadata, but the older website/LinkedIn-only constraint still rejected video rows. Missing import receipts alone did not identify this second failure.

**How to apply:** Reconcile only the established development schema boundary, then retry the receipt-backed import. Keep media-only library repair separate from page publication. Preserve exact reviewer evidence; never infer historical approval loss from a missing request or manufacture clearance from an audit without the required confirmations.