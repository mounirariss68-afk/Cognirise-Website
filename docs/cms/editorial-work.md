# Editorial work

Use **Editorial work** in the admin navigation for personal work, the publisher/administrator team queue, notifications, and digest preferences. Assign an editor, a different publisher/administrator reviewer, and a due date from the exact edition's assignment panel.

Assignment does not change market permissions or publishing rights. Submit the saved revision for review before requesting its reviewer. Review decisions apply only to that revision. Reassignment and successor revisions supersede old requests. Rejection requires a comment; approval still requires a separate normal publication action.

Queues distinguish completed work, overdue dates, unavailable assignees, and Shared updates requiring a decision. Exact edition links never fall back to a different market when the requested target is unavailable.

## Optional email verification

In-app work does not require an email provider. Email is disabled until all of these are configured:

- `EDITORIAL_DIGEST_WEBHOOK_URL`: the controlled digest delivery endpoint.
- `EDITORIAL_DIGEST_SAFE_RECIPIENT`: the single approved verification recipient.
- `ADMIN_PUBLIC_URL`: the administrator application's HTTPS base URL, including its path.

Use workspace configuration/secrets tools to configure these values; do not put credentials in source, chat, or notification metadata. Each recipient must explicitly opt in. The safe-recipient restriction remains enforced even when another user opts in. Invitation and password-reset delivery is independent and is not reused.

The webhook receives minimum generated notification summaries and normal authenticated `/content/…` links. It must honor the `idempotency-key` header. It receives no draft body, password, preview capability, invitation token, or reset token.

The worker polls every minute. Daily digest jobs and due reminders have durable deduplication keys. Digest attempts are capped at five, with delayed retries and processing-lease recovery. An event is reserved for one job, and a retry cannot silently select different events. Access and opt-in are rechecked before sending. A revoked recipient or inaccessible reserved target blocks delivery.

The digest panel shows configuration, last delivery status, and redacted failure details. No real email was sent during verification; outbound tests use mocked transport.

## Regression coverage

- `artifacts/api-server/tests/editorial-work-postgres.test.ts`: isolated PostgreSQL HTTP tests for queue queries, assignment separation, reviewer reassignment, stale decisions, approved publication, access revocation, and rejection comments.
- `artifacts/api-server/tests/editorial-work.test.ts`: safe-recipient transport, immutable delivery selection, and authorization filtering.
- Admin assignment and document-detail tests cover save/reload failures and exact edition selection.

Database migrations and schema preparation install the same integrity constraints and transactional notification triggers. Replay migration/schema checks after changing either representation.