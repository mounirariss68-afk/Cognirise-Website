---
name: Person market availability
description: Governance and fallback rules for controlling which people appear in each configured market.
---

Person availability decisions have separate staged and published states. Public delivery uses only the published decision, while preview may show a pending change.

An explicit `off` decision for the originally requested market must be enforced before selecting a fallback content edition. Never let canonical content availability override that suppression.

**Why:** Checking visibility only after edition fallback can leak a canonical profile into a market where editors explicitly removed it. Separating staging from publication also keeps editor previews from changing the public roster without approval.

**How to apply:** Resolve the requested market’s published availability first. Stop on `off`; otherwise follow the normal approved content-edition fallback chain. Source editor controls from enabled market configuration rather than a fixed geography list.

People must remain CMS-exclusive even in an unconfigured environment; approved
edition fallback is distinct from a compiled roster.

**Why:** An empty public collection can be correct when all content is draft-only
or suppressed. Treating that state as permission for static profiles defeats the
published availability decision even when the API is correct.

**How to apply:** Preserve explicit loading, empty, and unavailable states.
Do not reintroduce people-specific fallback switches or hardcoded identities.