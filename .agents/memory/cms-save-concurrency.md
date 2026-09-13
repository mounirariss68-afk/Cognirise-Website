---
name: CMS save concurrency
description: PostgreSQL statement snapshots and editor recovery constraints for revision-based draft saving.
---

Acquire the exact-edition row lock in a separate statement before reading the latest revision and checking the editor's revision token.

**Why:** Under READ COMMITTED, a statement that both waits for an edition lock and reads a lateral latest-revision query can retain its pre-wait snapshot. When saves only insert revisions without updating the edition row, two simultaneous writers can both pass the stale-token check. A sequential conflict test does not detect this.

**How to apply:** Keep the lock and subsequent latest-revision read in the same transaction but separate statements. Concurrency fixtures must model waiting and fresh reads, not just issue successive requests.

Treat failure after commit differently from rejection, and preserve the editor's local evidence until deliberate recovery.

**Why:** Audit or response hydration can fail after persistence succeeds. Automatically retrying against a newer token risks overwriting another writer, while treating every error as “not saved” misleads editors.

**How to apply:** Distinguish known committed, uncertain, validation, and revision-conflict outcomes. Never silently rebase a retry; retain inputs and require explicit latest-revision verification or discard/reload.

Treat field-level resets as whole-revision writes, not local cosmetic actions.

**Why:** A server-side reset can create a new revision and trigger editor rehydration. Clearing global dirty state for that one field can silently discard unrelated edits or allow stale values to overwrite the reset.

**How to apply:** Require a clean draft before resetting, lock editing until the saved revision is reloaded, preserve uncertain outcomes, and scope temporary override indicators to the current hydrated edition.