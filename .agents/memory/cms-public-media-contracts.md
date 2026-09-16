---
name: CMS public media contracts
description: Non-obvious conditions that separate a schema-valid CMS publication from media the public website can actually resolve.
---

A publish-valid snapshot is not sufficient for public media delivery. Every immutable pin must have an exact revision-local reference, the asset must be in the public delivery state (`active` or `ready`), and the pinned version must carry approved rights and accessibility metadata. Approval belongs in version metadata; an asset status named `approved` is not itself a public delivery state.

Methodology publication validation must recurse according to the editorial slot definition. Primitive text, link, and fixed values are valid leaves; only media, group, and fixed-list slots require object traversal, and only media slots require immutable pins.

**Why:** A release can return exact-market content while delivering an empty media set if the revision references or asset state are wrong. Treating every primitive editorial value as a structural object also produces false “media pin required” failures across otherwise valid methodology copy.

**How to apply:** Validate the snapshot in publish mode, compare all payload pins with revision-local references, verify public media projection is non-empty and complete, and test the exact detail endpoint—not only edition pointers or database state.