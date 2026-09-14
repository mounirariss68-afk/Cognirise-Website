# Task 335: Agent Authority summary staging

Task 335 adds an optional, governed summary to the existing
`framework.guardrails` subsection. The summary is all-or-nothing when present:
`lead`, `handover`, four `rules`, `caveat`, `disclosureLabel`, and
`firstFigure` are all required. Revisions without `guardrails.summary` remain
valid and retain their existing approved copy.

## Summary-to-source map

| Summary field | Detailed governed source |
| --- | --- |
| `lead` | `guardrails.heading`, `guardrails.opening`, and `guardrails.definition` |
| `handover` | `guardrails.unit.paragraphs[0..1]`, especially the handover definition |
| Rule 1 — exposure | `guardrails.interaction.exposure` |
| Rule 2 — measured evidence | `guardrails.interaction.evidence`; the detailed one-level-below-target, within-exposure-limit, and automatic-incident-demotion wording remains there |
| Rule 3 — testable controls | `guardrails.interaction.requiredControls` |
| Rule 4 — authority-bearing artefacts | `guardrails.interaction.compensatingControls` and `guardrails.designRule` |
| `caveat` | `guardrails.interaction.compensatingControls` and `guardrails.designRule.conclusion` |
| `disclosureLabel` | The single full-explanation disclosure that exposes `guardrails.bankExample`, `guardrails.comparisonRows`, `guardrails.unit`, `guardrails.interaction`, and `guardrails.designRule` |
| `firstFigure` | The compact composition described by the summary; the existing detailed figure remains separately governed by `guardrails.firstFigure` |

The compact copy does not raise an authority ceiling. Its second rule keeps
the operational rule that each handover launches one level below target
authority, climbs only within its exposure limit on measured evidence, and is
automatically demoted after an incident. Its caveat distinguishes a
compensating control that carries authority from a generic filter that merely
constrains an agent. The first figure is an illustrated pattern: one common
setting or individually governed handovers, not a claim that every agent is
governed by one universal setting.

## Draft and preview boundary

`cms:stage-task-335-agent-authority-summary` is a development-only, UAE/English
draft operation. It locks the exact market edition before reading the latest
revision, adds one successor draft, and records a new immutable operation
receipt and audit event. Before the receipt is written it collects every
governed media location and pins the exact asset/version pair carried by the
source revision to the new revision. Replay verifies the complete pin set.
It preserves all existing payload fields and does not
update or delete the earlier Task 324 receipt. If a summary already exists, or
the receipt/revision/audit chain differs, it fails visibly rather than
overwriting editorial work. Every replay reads the edition's latest revision
under the same transaction boundary; if a newer editorial draft exists beyond
the receipt's staged revision, the replay is rejected as a conflict rather
than falsely reported as idempotent.

The command never approves, publishes, changes availability, or creates a
preview capability:

```sh
pnpm --filter @workspace/scripts cms:stage-task-335-agent-authority-summary -- --verify-db --target=development
pnpm --filter @workspace/scripts cms:stage-task-335-agent-authority-summary -- --apply-db --target=development
pnpm --filter @workspace/scripts cms:stage-task-335-agent-authority-summary -- --repair-media-db --apply-db --target=development
```

The repair command is limited to the already receipted Task 335 draft. It
copies only exact immutable pins proven by that revision's source revision,
records a separate repair receipt and `document.media-references-repaired`
audit event, and never changes workflow state, approval, publication pointers,
or the original summary receipt. It refuses an unexpected/extra pin instead of
silently deleting or replacing it.

After staging, an authenticated CMS editor uses the normal exact-revision
preview path: create `/api/documents/:documentId/preview?market=uae&locale=en&revisionId=:revisionId`
with the normal MFA session, then fetch the returned `/api/preview/:token`
endpoint and its returned media URL with that same session. Verification must
assert the four-rule summary, the governed hero asset/version, and an empty
`missingMediaIds` response; a browser overlay is not evidence. Public delivery
continues to resolve only the published market edition and its approved
immutable revision; a staged summary cannot appear on the public route.

## Development staging result

The review-only successor was staged and receipt replay verified on 2026-09-14.
The published pointer was unchanged. This is a one-shot, explicitly invoked
development operation, not a permanent post-merge hook. If another development
environment needs the prepared draft, run the guarded command above before
editorial review. Once review starts or newer editorial work exists, do not
rerun staging: use the normal CMS workflow. Such a staging conflict must not
block unrelated future merges.