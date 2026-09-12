# CMS historical people-copy recovery

## Scope and evidence boundary

Task 318 authorises one narrowly scoped recovery: Mounir Ariss (`person:8a0e78e95b87db8e0acd`), the UAE English edition (`mounir-ariss`, `uae/en`). The recovery source is the last approved public About-page profile treatment before the compiled roster was removed:

- commit `2ea600a573849c954374ebcd3b0aee3df72023f8`
- `artifacts/cognirise-website/src/pages/AboutPeople.tsx:14-35`

The exact historical fields authorised by this operation are:

- `content.contribution`: “The conviction that AI is an operating discipline, not a science experiment — grounded in thirty years of framing consequential transformation for the region's largest enterprises.”
- `content.biography`: “Three decades helping enterprises across the region and beyond turn technology shifts into operating advantage. A career built on framing the decision architecture that makes enterprise-scale change possible, now focused entirely on the agentic enterprise.”

The currently inventoried compiled contribution is retained as a replacement-safe baseline only:

> Strategic judgment, practical transformation leadership and a focus on turning consequential AI decisions into operating results.

An absent or empty contribution/biography may be restored from this source. Any other non-empty contribution or biography is treated as newer editorial content and is preserved as a conflict. Focus areas, title, order, visibility, source metadata, identity media, market decisions, and every other field are outside the recovery field set.

The write target is resolved through the immutable
`cms-inventory-v2:person:8a0e78e95b87db8e0acd` import receipt and its document
ID, then checked as the expected person. The recovery does not select a
document by a potentially colliding slug. It locks the exact `uae/en` edition
and rereads its latest revision before making any change; availability checks
are likewise limited to that exact market and locale.

This document records repository evidence and the reconciliation boundary. It does **not** claim that a remote or deployed CMS has been changed. A report emitted by the script records the actual database state used for that run.

## Read-only comparison

The default command does not write CMS rows, receipts, audit events, revisions, availability, or publication pointers:

```bash
pnpm --filter @workspace/scripts cms:recover-people -- \
  --target=development
```

Use `--write` to save the comparison under `scripts/cms/output/people-recovery-report.json`. The comparison reports the exact target edition, latest revision, publication pointer, availability decision, historical merge decision, conflicts, and validation errors for the requested mode.

## Safe draft reconciliation

The operation is idempotent and receipt-backed:

```bash
pnpm --filter @workspace/scripts cms:recover-people -- \
  --apply-db --target=development --write
```

This creates one **draft-only** recovery revision when the field-level plan is
safe. It never updates an existing revision in place. A recovery receipt and
append-only audit event include the source commit, exact fields, source
revision, changed fields, and the observed Mounir UAE/en availability digest
at recovery time. That digest is evidence, not a permanent pre-publication
lock: normal CMS availability review and publication may evolve it afterward.
Any media references on the source revision are copied to the recovery revision
with the exact same asset and immutable media-version IDs; no new media
clearance or approval is fabricated. Reports derive
`pinnedMediaReferences` from persisted recovery-revision rows on every
read/idempotent verification, rather than carrying a creation-only counter.
Verification also requires the receipt subject and authority digest, exactly
one matching audit event, its mandatory recovered revision ID, and the exact
historical contribution in that audit-owned revision. The current revision may
be a legitimate CMS successor: its `source_revision_id` chain must descend
from the audit-owned recovery revision and retain the exact historical
contribution. A missing or broken lineage, or a changed/removed contribution,
remains a conflict. The recovery audit actor must not be the actor of a
publication event for the recovery revision; normal authenticated CMS
publication by an authorized editor is allowed.
For the already-existing development receipt, one explicit legacy digest is
accepted only with the matching immutable source coordinates; arbitrary digest
mismatches are rejected.

There is deliberately no recovery publication flag. `--publish` is rejected.
The recovery service account is suspended/viewer and cannot approve or publish.
After the draft is reviewed, an authenticated normal CMS Publish workflow must
perform the existing snapshot validation, admin authorization, media
clearance/version/rights/accessibility checks, and shared-source availability
review/release. For a shared edition, this recovery atomically moves only the
draft `shared_source_revision_id` from the exact prior source revision to the
new recovery revision, increments the draft availability version, and clears
stale review selections. It preserves `published_source_revision_id`,
published destination rows, and all revisions; it never approves reviewed
selections or exposes hidden profiles. Publication remains blocked until the
normal CMS governance requirements (including verification and review dates and
approved identity media or fallback) are complete.

## Complete historical-roster comparison

The read-only report also compares all six historical roster contributions from the same source against the current UAE English CMS inventory. It does not treat the historical roster as blanket import authority:

| Historical profile | Current CMS contribution | Current CMS biography | Recovery decision |
| --- | --- | --- | --- |
| Mounir Ariss | Exact after the scoped recovery draft | Newer current copy preserved | Recovered contribution only |
| Bülent Eğrilmez | Newer non-empty copy | Newer current copy | Preserved; no safe recovery |
| Hisham Nofal, PhD | Newer non-empty copy | Newer current copy | Preserved; no safe recovery |
| Alexis Lecanuet | Exact | Newer current copy | Preserved; no safe recovery |
| Rami Aslan | Exact | Newer current copy | Preserved; no safe recovery |
| Fadi Mattar | Newer non-empty copy | Newer current copy | Preserved; no safe recovery |

All six historical profiles have matching CMS documents and no historical profile is missing in the current inventory. The report records their revision/workflow/publication state and `show`/`off` availability without copying hidden content into delivery. In the development comparison, all six editions are draft/show rather than publicly published; the recovery does not auto-approve them.

The current inventory also contains two profiles not present in that historical source: Gökhan Güney and Omer Barbaros Yis. Both are explicitly `off`/draft-hidden in the UAE availability comparison. They are documented as current-only hidden records and are untouched. No other safe historical recovery case exists: every non-Mounir historical contribution is either already exact or a non-empty newer editorial value.

## Post-merge hook and verification

`scripts/post-merge.sh` runs the draft recovery immediately after the established generic CMS reconciliation, then runs the read-only verifier:

```bash
pnpm --filter @workspace/scripts cms:verify-people-recovery -- \
  --target=development --write
```

The hook verifier requires the recovery receipt, exact historical contribution,
a safe audit-owned recovery revision, a valid descendant lineage for the
current revision, and successful draft validation. It fails closed on an
unresolvable conflict (including a newer or removed contribution), missing
target, broken lineage, or an invalid recovery. A newer biography is an
explicitly preserved field-level conflict and is carried forward without
blocking the safe contribution recovery. Normal publication and availability
evolution do not invalidate the receipt, and the verifier does not claim
publication.

## What is intentionally not proven here

- No browser journey, deployed delivery, or public-site response is asserted by this script; those require the authenticated application/browser checks owned by the parent CMS task.
- No other person profile is inferred from the historical page. The old biographies and contributions for other people are evidence boundaries, not import authority for this operation.
- No compiled fallback is reinstated. Public delivery remains CMS-authoritative.