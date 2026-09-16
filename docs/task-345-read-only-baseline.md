# Task 345 read-only baseline

## Scope and method

This report records the confirmed pre-change facts supplied by the completed read-only audits and separates them from items that still require authorized runtime inspection. No persistent CMS content, publication pointer, access grant, media approval, or cutover was changed to produce this baseline.

## Representative CogniOS record

| Item | Read-only finding | Status |
| --- | --- | --- |
| Selected context | CogniOS development record, UAE / English | Confirmed |
| Editorial state | Draft only; no published pointer or shared binding exists | Confirmed |
| Delivery ownership | `/platforms/cognios` is code-owned | Confirmed |
| Cutover | No configured cutover exists | Confirmed; must not be enabled |
| Referenced asset object | JPEG object exists, 160,562 bytes, checksum matches | Confirmed |
| Asset workflow/accessibility | Pending review; rights and accessibility are both `needs-review` | Confirmed |
| Version lineage | Legacy `heroMediaId` / `mediaIds` references have no immutable version pin or reference rows | Confirmed |
| Missing-media root cause | Read-only readiness reports `mediaIds.0: approved media is unavailable` and `content.heroMedia: approved media is unavailable`. Both resolve to the legacy asset with no document/version reference rows; that asset is pending review. Direct object verification succeeded. | Governance and immutable-reference blockers confirmed; missing/corrupt storage ruled out. Authorized protected-preview delivery has not yet been demonstrated. |

## Confirmed product and workflow gaps

| Complaint / requirement | Confirmed current finding | Baseline disposition |
| --- | --- | --- |
| A warning should focus its correction | Publication validation can emit pathless strings (for example, “A verification date is required”); readiness maps them to generic content and many nested/list controls are not exactly registered | Defect to repair with structured codes, paths, scope, and action targets |
| Drafts must save before publication evidence exists | Draft and publish validation are intentionally different, but UI scopes are combined | Preserve separation; make each scope visible |
| Review must not depend on page assignments | Review request creation requires a revision already submitted plus reviewer or per-edition fallback | Replace the assignment prerequisite with centrally resolved, authorized reviewer selection while retaining attribution |
| Regions must be understandable | Shared sources, bindings, independent/adapted editions, availability snapshots, and legacy person availability coexist | Add a compatibility projection and safe command path; do not rewrite history |
| Rights must be centrally managed | Users currently has roles and markets, without topic-specific capabilities | Add real topic/geography capability authority and reconcile role, MFA, fan-out, review, and media access |
| CMS copy must demonstrably reach a renderer | Some inventory fields have no confirmed public consumer; delivery has kind/entry cutovers and code-owned routes | Expose ownership honestly; do not enable cutovers or claim a code-owned route is CMS-backed |

## Existing evidence to retain

The all-kind PostgreSQL lifecycle tests are useful real transaction evidence. They do not demonstrate storage-backed media delivery or complete browser/public-render parity, so they must be retained and supplemented rather than replaced.

## Guardrails

- No production/live publication, automatic approval, real notification email, destructive cleanup, or global/`/platforms/cognios` cutover.
- Preserve current content, immutable revisions, publication/media safeguards, review independence, historical attribution, and protected content.
- Any migration must be explicit, dry-run capable, transactional, idempotent, recoverable, and must not invent source ownership, verification, approval, or media lineage.

## Authorization-dependent blockers

1. The CogniOS asset cannot be auto-approved or silently substituted. An authorized user must resolve rights and accessibility review, and the legacy references need a deliberately chosen immutable media-version relationship where the schema/operation supports one.
2. Because `/platforms/cognios` is code-owned and has no cutover, saving CMS data cannot prove a public route update. A supported CMS preview or an explicitly authorized delivery binding is required for public-render acceptance.
3. Protected-preview delivery remains unverified. The read-only trace establishes the named readiness paths, pending asset status and absent immutable reference rows; it does not grant permission to manufacture approval or pin a version on the existing record.