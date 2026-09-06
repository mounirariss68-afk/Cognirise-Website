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

Keep pre-launch fixture imports draft-only even when that makes public routes explicitly unavailable; never restore a code-owned content fallback to make the site appear populated.

**Why:** A visible unavailable state preserves the single publishing authority and approval trail, while a convenient fallback silently creates a second source of truth.

**How to apply:** Seed deterministically into drafts, publish through the governed workflow, and treat an empty public route as a release-readiness signal rather than a reason to bypass PostgreSQL.

Bind every revision-level media reference to its concrete immutable media version and preserve the full reference index across every snapshot-producing path.

**Why:** Re-indexing against the newest asset version changes old revisions, while omitting the index during workflow or assistant snapshots strips media from hydration and public binary authorization.

**How to apply:** Store media ID, media version, and canonical field path together; copy them unchanged for text-only snapshots; reject snapshots whose media-reference identity set changes unexpectedly.