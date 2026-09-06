# Retention and privacy operations

Retention periods and legal bases require approval from the accountable privacy/legal owner before implementation. Until then, configure no destructive cleanup based only on this document.

## Data minimization

CMS content contains public editorial records and governed evidence, not enquiry/newsletter form contents. Analytics is consent-aware and first-party: exclude bots, admin traffic, and previews; do not fingerprint, replay sessions, retain IP addresses, or create visitor profiles. Raw events should have a short approved retention; reports should be aggregate-only and longer-lived.

## Retention checklist

- [ ] Maintain a data inventory identifying owner, purpose, legal basis, location, access, retention, deletion method, and backup behavior for content, submissions, analytics, sessions, audit events, and media.
- [ ] Apply approved retention separately to enquiries/newsletters, raw analytics, aggregate reports, sessions/recovery material, audit events, archived content, and backup media/content exports.
- [ ] Make retention state visible in the protected submissions inbox; restrict and audit CSV exports.
- [ ] Honor validated data-subject access/deletion requests through the designated process, including downstream exports and backup handling according to approved policy.
- [ ] Log deletion/hold decisions without retaining unnecessary personal data. A legal hold suspends applicable deletion and records its authority.
- [ ] Review cleanup job results and exceptions; never silently delete records that are referenced, under hold, or outside an approved schedule.

Withdrawn analytics consent must stop non-essential analytics without preventing essential website operation. Privacy incidents follow the incident procedure and notification decisions belong to the designated privacy/legal owner.