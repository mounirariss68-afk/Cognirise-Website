# Editorial work

Use **Editorial work** in the admin navigation for personal work, the publisher/administrator team queue, notifications, and digest preferences. Assign an editor, a different publisher/administrator reviewer, and a due date from the exact edition's assignment panel.

Assignment does not change market permissions or publishing rights. Submit the saved revision for review before requesting its reviewer. Review decisions apply only to that revision. Reassignment and successor revisions supersede old requests. Rejection requires a comment; approval still requires a separate normal publication action.

Queues distinguish completed work, overdue dates, unavailable assignees, and Shared updates requiring a decision. Exact edition links never fall back to a different market when the requested target is unavailable.

## Optional email verification

In-app work does not require an email provider. Email is disabled until explicit provider configuration is complete:

- `EDITORIAL_DIGEST_PROVIDER`: exactly `webhook` or `resend`.
- `EDITORIAL_DIGEST_SAFE_RECIPIENT`: the single approved verification recipient.
- `ADMIN_PUBLIC_URL`: the administrator application's **HTTPS** base URL, including its path.

There is no provider fallback and no automatic outbound send. For `webhook`,
also set `EDITORIAL_DIGEST_WEBHOOK_URL` to the controlled **HTTPS** digest endpoint.
For direct Resend delivery, set `EDITORIAL_DIGEST_FROM` to a verified sender
address (a display name is allowed) and configure the Resend connector; do
**not** set or store a Resend API key. The connector is the only direct Resend
transport and posts to `/emails` with the durable digest job ID as
`Idempotency-Key`.

When a job is created, its provider and a one-way fingerprint of its delivery
configuration are reserved with its notification set. Resend jobs also reserve
the single SDK-reported Resend connection ID. A retry rechecks those identities;
any provider, sender, recipient, URL, connection replacement, or multiple
connection ambiguity blocks the job rather than sending under the same
idempotency key through another account. Digest jobs created before this
identity reservation are intentionally blocked rather than inferred.

The connector SDK's connection discovery API has no documented abort signal.
It is performed before a digest worker acquires its database connection or
lease, with a five-second bounded wait, a single in-flight read-only lookup,
and a 30-second cooldown after a timeout or error. A discovery timeout blocks
the job and never starts the mail request. The actual Resend `/emails` proxy
request remains abortable.

Use workspace configuration/secrets tools to configure these values; do not put credentials in source, chat, or notification metadata. Each recipient must explicitly opt in. The safe-recipient restriction remains enforced even when another user opts in. Invitation and password-reset delivery is independent and is not reused.

The webhook receives minimum generated notification summaries and normal authenticated `/content/…` links. It must honor the `idempotency-key` header. It receives no draft body, password, preview capability, invitation token, or reset token.

The worker polls every minute. Daily digest jobs and due reminders have durable deduplication keys. Digest attempts are capped at five, with delayed retries and processing-lease recovery. Outbound webhook and Resend proxy requests use a 10-second `AbortSignal` timeout, so a timed-out request settles before the worker can recover a stale 15-minute lease. An event is reserved for one job, and a retry cannot silently select different events. Access and opt-in are rechecked before sending. A revoked recipient or inaccessible reserved target blocks delivery.

The digest panel shows configuration, last delivery status, and redacted failure details. No real email was sent during verification; outbound tests use mocked transport.

## Regression coverage

- `artifacts/api-server/tests/editorial-work-postgres.test.ts`: isolated PostgreSQL HTTP tests for queue queries, assignment separation, reviewer reassignment, stale decisions, approved publication, access revocation, and rejection comments.
- `artifacts/api-server/tests/editorial-work.test.ts`: safe-recipient webhook
  and Resend connector transport (both mocked), immutable delivery selection,
  configuration fail-closed checks, and authorization filtering.
- Admin assignment and document-detail tests cover save/reload failures and exact edition selection.

Database migrations and schema preparation install the same integrity constraints and transactional notification triggers. Replay migration/schema checks after changing either representation.