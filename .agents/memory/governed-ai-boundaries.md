---
name: Governed AI boundaries
description: Durable safety rules for editorial model inputs, outputs, citations, and translations.
---

Treat a model call as a two-sided trust boundary. Screen and redact every
provider-bound field, including retrieved source text, then fail closed on
sensitive or restricted data anywhere in the returned suggestion, uncertainties,
or nested citation fields before persistence.

Citation presence is not sufficient grounding. Claims must collectively cover
the proposed text and bind to exact approved-source evidence. Translation needs
stronger structural proof: complete target units mapped exactly once to distinct,
in-order complete source units.

**Why:** One-sided input screening still allows a compromised or hallucinating
provider to introduce sensitive data, while a single valid citation can coexist
with unsupported content. Partial or reused translation citations can similarly
look grounded without proving full alignment.

**How to apply:** Whenever editorial AI operations, output fields, or provider
adapters change, review the complete serialized prompt and complete nested
provider result. Keep validation before result persistence or UI response, and
extend grounding checks to cover the entire suggestion rather than sampling one
citation.

Keep every completed assistant run as a persisted proposal for a different
authorized reviewer. Acceptance must be bound to the exact target revision; if
the draft changed after the run, reject the acceptance as stale. Rejection does
not require a current revision claim, but the run actor still cannot decide it.

**Why:** Local-only suggestions cannot support genuine separation of duties, and
applying a once-valid suggestion to newer copy can silently overwrite an
editor's intervening work.

**How to apply:** Any new assistant operation or review surface must use the
persisted reviewer queue, preserve the original target revision, and create a
new immutable revision only after independent acceptance.