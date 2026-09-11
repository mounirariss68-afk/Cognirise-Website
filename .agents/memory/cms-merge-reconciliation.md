---
name: CMS merge reconciliation
description: Why governed development data migrations need an explicit post-merge path.
---

Give each binary import exactly one reconciliation owner; do not let a targeted importer and the generic inventory independently create it.

**Why:** A checked-in inventory can temporarily omit a newly added image, hiding a duplicate-import problem until the next inventory refresh or fresh-environment setup.

**How to apply:** Check freshly generated inventory classification, not only the current saved manifest, when adding targeted media reconciliation. Verify historical receipts against their immutable versions while preserving subsequent editorial metadata and replacement versions.

Database mutations performed while developing a task are not the durable deliverable of an isolated merge. Any governed development data required by the merged feature must have an explicit, idempotent reconciliation path on the main environment.

Test contract upgrades from the previous approved publication, not only by replaying an already-upgraded development database.

**Why:** Tightening publication validation to require more immutable media pins can make the earlier import stage reject its own transitional payload before the cutover gets a chance to attach those pins. A successful replay on the final state does not exercise that transition.

**How to apply:** Exercise the full old-authority → import → media cutover → final inspection → replay lifecycle. Keep transitional content non-public unless it already satisfies the new publication contract, and scope asset approval and publication to the requested page.

**Why:** A CMS cutover completed and verified against an isolated task database, but the merged main database remained empty because post-merge setup applied only the schema. The committed report therefore described the task environment rather than the main environment. PostgreSQL JSONB can also return keys in a different order from the original JavaScript object, so raw JSON string digests can falsely classify an unchanged governed revision as edited.

**How to apply:** For future governed data migrations, ship a production-blocked reconciliation command alongside the migration. Verify a first application fully; allow expanded manifests to append operations only when every existing receipt still matches a live subject; preserve later editorial changes; and fail visibly on conflicts, missing subjects, or incomplete application. Verify both durable object bytes and the live publication pointer, not only a saved receipt. Canonicalize object keys recursively before comparing persisted JSONB payloads because JSONB does not preserve insertion order. When older audit events lack newer linkage metadata, accept them only if exact versioned receipts, result digests, contiguous revision order, and normalized prior-payload copies independently prove provenance. Treat any valid immutable version of the expected binary as reusable even when its storage key differs from the inventory object, and resolve the originally reconciled or pinned version explicitly when later metadata-only versions may share those bytes. When the governed payload contract itself evolves, preserve the old receipt and revision, require an exact match to the known legacy authority, then append a versioned receipt and replacement revision rather than rewriting history. For a copy-only correction, prove the persisted and canonical payloads differ only in the approved text and preserve the publication's existing media state; do not silently broaden the operation into media approval or remediation. For composite media-version foreign keys, declare the referenced pair as a PostgreSQL unique constraint rather than a unique index so non-interactive Drizzle schema push creates it before the foreign key.

Publisher review approval must append a metadata-only media version while retaining the original imported version and its binary identity.

**Why:** Source-rights and accessibility clearance are later authorization decisions. Mutating the imported version would erase provenance and could alter the immutable version pinned by existing content.

**How to apply:** Keep approval behind the existing publisher, MFA, and CSRF protections; record the confirmations and reviewer identity in the new version metadata; keep the storage key, checksum, dimensions, and byte size unchanged; then transition the asset status inside the same transaction.

Treat a conflict-free rebase as unverified until the semantic diff and focused tests confirm each changed handler and test fixture still has its original boundary.

**Why:** An automated rebase can splice a valid code block into several unrelated handlers without leaving conflict markers. Typechecking then catches only the scope errors, while tests may also be syntactically valid yet exercise broken fixtures.

**How to apply:** After rebasing governed CMS work, compare the affected files to the incoming base and the intended pre-rebase change. Restore unrelated source and test blocks before validating the focused route and reconciliation behavior.
