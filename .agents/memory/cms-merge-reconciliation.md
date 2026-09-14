---
name: CMS merge reconciliation
description: Why governed development data migrations need an explicit post-merge path.
---

Give each binary import exactly one reconciliation owner; do not let a targeted importer and the generic inventory independently create it.

Disposable development publisher cleanup must retain audit events for real content.
Classify cleanup by the fixture-owned target, not merely by the actor who performed
the action. A completed release receipt must reference a surviving normal publication
audit and the exact published snapshot.

**Why:** An authenticated publication can succeed and then lose its audit when a
temporary publisher is removed. An isolated task's public pointer also does not
prove that the approved release will be reproduced after merge.

**How to apply:** Exercise release, fixture cleanup, and receipt replay together.
Use the normal authorized publication path for merge reconciliation, with exact
target/digest checks; never fabricate a replacement audit or directly set pointers.

Test the empty-database import path using the receipt type the real importer writes, as well as predecessor upgrades.

**Why:** A media cutover accepted only successor-pending receipts, so an exact fresh inventory draft passed reconciliation inspection but could never reach publication.

**How to apply:** Exercise fresh import → draft inspection → cutover authorization → immutable publication → replay. If accepting a generic import receipt, constrain it to the first unpublished revision and retain exact document, operation-key, request-digest and payload checks.

**Why:** A checked-in inventory can temporarily omit a newly added image, hiding a duplicate-import problem until the next inventory refresh or fresh-environment setup.

**How to apply:** Check freshly generated inventory classification, not only the current saved manifest, when adding targeted media reconciliation. Verify historical receipts against their immutable versions while preserving subsequent editorial metadata and replacement versions.

Governed content created in an isolated task needs a conflict-safe, idempotent reconciliation path on the main environment. Media IDs are environment-local, so reconciliation and publication verification must bind from the same checksum-verified receipt rather than task-local IDs.

**Why:** A valid successor can otherwise point at missing media after merge, or publication verification can reject the very draft that reconciliation created. Raw JSON comparisons can also misclassify unchanged JSONB content as an edit.

**How to apply:** Identify the exact target edition and approved base with a stable canonical digest; preserve any newer editorial work by failing visibly on conflicts. Rebind imported media and the inherited hero to exact immutable versions, canonicalize persisted JSON before comparison, and verify both stored bytes and the live publication pointer.

Publisher review approval must append a metadata-only media version while retaining the original imported version and its binary identity.

**Why:** Source-rights and accessibility clearance are later authorization decisions. Mutating the imported version would erase provenance and could alter the immutable version pinned by existing content.

**How to apply:** Keep approval behind the existing publisher, MFA, and CSRF protections; record the confirmations and reviewer identity in the new version metadata; keep the storage key, checksum, dimensions, and byte size unchanged; then transition the asset status inside the same transaction.

If an earlier reconciliation incorrectly classified a known approved predecessor as editorial drift, preserve that original receipt and append a separately identified recovery operation.

**Why:** Rewriting the preservation receipt would erase its audit meaning; ignoring it would leave later approved cutovers permanently unable to obtain their governed source draft.

**How to apply:** Require exact normalized predecessor identity and matching provenance before recovery. Keep unknown editorial changes protected, and verify the recovered draft through the normal immutable-media approval and publication path.

Absence of textual merge conflicts does not establish semantic correctness.

**Why:** Automated merging has moved valid code between unrelated scopes without leaving conflict markers. Some resulting tests remained syntactically valid while checking the wrong behavior.

**How to apply:** Validate changed behavioral boundaries after merging; syntax and type checks alone cannot establish that source selection and publication protections survived.

Keep preparation evidence separate from completed-release verification output when a reconciliation operation supports both states.

**Why:** Replaying a draft reconciler after publication can otherwise replace its original draft evidence with a release summary, even when database receipts remain immutable.

**How to apply:** Select a distinct output artifact for release verification; do not reuse an earlier preparation receipt filename for a different lifecycle state.

Historical-copy recovery stages a draft; it is not a separate publication authority.

**Why:** A purpose-built recovery publisher can diverge from the CMS's media, destination, and administrator checks even when its copy provenance is exact. Permission to recover copy does not establish missing rights or verification facts.

**How to apply:** Preserve immutable media pins and newer editorial fields during reconciliation, then use the normal authenticated, confirmed CMS Publish operation. Report unresolved approval blockers rather than fabricating clearance.

Generated landing inventory is a seed for absent authority, not a replacement for an existing stored baseline.

**Why:** Approved source-copy changes can legitimately differ from the immutable baseline used by an earlier media reconciliation. Treating that difference as corruption blocks unrelated merges.

**How to apply:** Validate and preserve the stored baseline, report generated-copy drift, and use the stored payload if its initial draft needs reconstructing. Keep publication and editorial-history conflict checks intact.

Original People inventory receipts are one-time seed evidence, not continuing authority over recovered or edited profile copy.

**Why:** Historical roster recovery changed generated biographies for profiles outside the controlled-governance subset. The importer safely preserved their original receipts, but a stricter verifier then blocked unrelated merges.

**How to apply:** Allow reported copy drift only for original person seed identities while still validating stored subjects. Keep availability, controlled-governance decisions, and new successor operation receipts strict; never rewrite historical receipts or republish to resolve a seed mismatch.

Do not install a draft-only one-shot reconciler as a permanent fail-fast merge hook.

**Why:** Normal review, publication, or later editing can invalidate its draft-only replay preconditions and then break every unrelated merge.

**How to apply:** Keep such operations explicit, or first implement terminal reviewed/published-state recognition and non-destructive handling of newer editorial work.
