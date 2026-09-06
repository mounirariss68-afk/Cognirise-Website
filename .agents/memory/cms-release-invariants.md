---
name: CMS release invariants
description: Non-obvious governance boundaries for multi-market publication, lifecycle dates, and retried editorial events.
---

Release one market by composing from the current live document and replacing only the approved target edition. Keep other markets' pending work out of the live snapshot, and reopen the released target as the next editable draft.

**Why:** A whole-document draft publish can silently promote unapproved changes from another market, while leaving the retained edition published prevents ordinary authors from starting the next revision.

**How to apply:** Any new release or rollback path must preserve live editions outside its target, store only live snapshots as rollback candidates, and prove that one market can complete two consecutive governed releases.

Validate effective lifecycle dates after merging request values with stored edition values. Expiry must always be later than publication.

**Why:** Checking only request fields allows a stored expiry to precede a newly supplied schedule, creating content that can never publish and is retried indefinitely.

**How to apply:** Apply this rule at trusted transition boundaries and cover both supplied and pre-existing date combinations.

Treat provider event IDs as idempotency identities; payload digests are audit evidence, not globally unique identities. Serialize retries before external mutations when the provider operation is not independently atomic with the local receipt.

**Why:** Different legitimate events can carry identical payloads, and checking a receipt only after an external mutation allows concurrent retries to execute twice.

**How to apply:** A repeated ID with the same payload is a duplicate, the same ID with a different payload is a conflict, and different IDs with identical payloads are independently accepted.

Keep fixture imports draft-only until an explicit market launch, but make every later seed non-destructive: it must never demote a governed edition, clear a live revision, or reset published media.

**Why:** Draft-only imports preserve the approval trail, but a repeatable seed that resets launched content can take the whole public site offline. The initial UAE baseline outage exposed this boundary.

**How to apply:** Seed new content into drafts, publish an initial baseline through independent workflow actors, mark parity complete only after validation, and leave every non-draft edition and published media lifecycle untouched on reruns.

Bind every revision-level media reference to its concrete immutable media version and preserve the full reference index across every snapshot-producing path.

**Why:** Re-indexing against the newest asset version changes old revisions, while omitting the index during workflow or assistant snapshots strips media from hydration and public binary authorization.

**How to apply:** Store media ID, media version, and canonical field path together; copy them unchanged for text-only snapshots; reject snapshots whose media-reference identity set changes unexpectedly.