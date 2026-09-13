---
name: Editorial notification authority
description: Exact-target authorization and immutable delivery selection for editorial work.
---

Editorial work must use the same exact-edition authority as content operations, including Shared source and adopted-baseline access. A destination-market membership check alone is insufficient.

**Why:** Shared/adapted targets can require source authority in addition to destination authority. Reimplementing access as a simple market filter can expose metadata or hide valid Shared work.

**How to apply:** Reauthorize queue rows, assignee candidates, notification reads, and digest recipients against exact targets. Filter before applying the visible result limit so inaccessible events cannot starve authorized work.

Reserve a digest's event set durably before sending it; retain the same event set and provider idempotency key on retries.

**Why:** Rebuilding a failed digest from current unread notifications changes the payload under an existing idempotency key and can duplicate events across daily jobs.

**How to apply:** First selection skips inaccessible events; retries fail closed if access to any reserved event is lost. Keep delivery separate from invitations and password resets, and use only normal authenticated content links.

Exercise newly added queue and review routes against PostgreSQL, not only existing lifecycle tests or SQL text assertions.

**Why:** Surrounding lifecycle suites cannot validate a new endpoint's SQL or its compatibility with existing state transitions.

**How to apply:** Verify the full requested-review, decision, successor, reassignment, and publication eligibility sequence with exact edition fixtures.