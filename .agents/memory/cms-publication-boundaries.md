---
name: CMS publication boundaries
description: Security boundary between mutable editorial drafts and public CMS delivery.
---

Public visibility and media access must be derived from the exact approved revision selected by a published market edition. Document-level references that drafts can replace are not public-authorization evidence. Capture an immutable media version when the revision is created; publication must preserve that pin rather than resolving whichever asset version is newest at publish or request time.

**Why:** A draft saved after publication can reference a private asset, and a replacement uploaded after review can otherwise slip into an already-approved revision. Mutable asset identity is not enough to reproduce historical output.

**How to apply:** Use the same all-content visibility rule for public lists, details, sitemaps, and media. Resolve exact version pins from the selected approved revision, preserve pins when restoring historical content, and reject unbound or draft-only media.

## Successor review continuity

An exact pending-review media pin may continue into a successor draft of the
same edition without becoming an approved new selection.

**Why:** Requiring cleared media for every successor save can silently remove
an already staged hero when an editor changes unrelated prose. Preservation of
an existing immutable pin and permission to choose unreviewed media are different
authorities.

**How to apply:** Carry only the immediate predecessor's exact version under
the edition save lock; reject unrelated pending assets or swapped versions.
Do not relax publication, rights, accessibility, or public-delivery gates.

Keep the currently approved revision public while a successor draft moves through review or rejection. Restoration is different: a restored edition stays non-public until its current successor completes fresh review.

**Why:** Editorial work on a replacement must not withdraw live content, while archive recovery must not silently republish historical content or leave an older review eligible for release.

**How to apply:** Separate the live publication pointer from the latest revision workflow. Publish only the current in-review revision; preserve the existing live pointer through successor review, and require restored editions to re-enter publication explicitly.

## Incremental policy releases

Build partial navigation or availability releases by overlaying reviewed changes on the exact live policy snapshot, never by rebuilding from only the reviewed subset or mutable defaults.

**Why:** Reconstructing a release from a partial review can silently erase unrelated live restrictions, labels, hierarchy, or visibility decisions.

**How to apply:** Lock the live snapshot, overlay only the current reviewed changes, validate the complete resulting policy, and publish it atomically. Unreviewed drafts must never enter the replacement snapshot.

## Retiring a landing without deleting its history

Prefer explicit delivery-time retirement over mutating historical publication state when a route is removed but editorial history and shared assets must remain.

**Why:** A retired overview can share a URL prefix and media with still-public detail records. Archiving by slug alone can affect unrelated content, while changing old migrations does not reconcile existing installations.

**How to apply:** Match the exact retired landing path in the selected immutable payload across public collection, detail, sitemap, configuration, and media eligibility. Keep detail routes and shared-media eligibility independent; normalize legacy navigation on read without publishing draft settings.