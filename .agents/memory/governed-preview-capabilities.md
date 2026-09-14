---
name: Governed preview capabilities
description: Security and consistency rules for rendering unpublished CMS revisions through public-facing layouts.
---

Preview capabilities must persist the exact revision identifier selected at issuance. Do not reconstruct the revision later from an edition plus a timestamp.

**Why:** Database transaction timestamps can predate commit visibility, so timestamp cutoffs can let an existing preview drift to a revision that committed after the capability was issued.

**How to apply:** Join preview content and every media reference directly through the persisted revision ID and its edition. Use the same bounded media-ID policy for preview discovery and protected delivery.

Draft media must never rely on the public publication media route, even when the UI layout is shared with the buyer page.

**Why:** Public media delivery correctly requires an approved published revision, while a governed preview must show unpublished pinned media without weakening that publication boundary.

**How to apply:** Serve preview media through the authenticated, MFA-protected, expiring/revocable capability and retain no-store/no-index headers.

Preview metadata must bypass draft SEO entirely, force `noindex,nofollow` on rerenders, and remove canonical links rather than defaulting them to the capability URL.

**Why:** Shared metadata helpers can otherwise reapply draft indexing settings or turn an omitted canonical into the sensitive preview path after interactive rerenders.

**How to apply:** Treat an explicit null canonical as removal and construct preview metadata independently from editor-controlled SEO fields.

Reserve asynchronous preview tabs synchronously, then isolate the blank tab before issuing or navigating to a capability.

**Why:** Browsers can block a new tab after save/issuance loses user activation. Passing `noopener` to `window.open` can also return null even when a tab was created, leaving an uncontrollable blank tab. Test doubles that always return a window conceal this distinction.

**How to apply:** Retain the blank WindowProxy, immediately sever and verify its opener, and install a verified no-referrer policy. Navigate through a noreferrer link owned by the placeholder: assigning its location from the editor still sent the editor's referrer in Chromium despite the placeholder's meta policy. If isolation fails, close it and use an explicit `noopener noreferrer` fallback link. Test with normal popup protections, not Chromium automation's disabled blocker.