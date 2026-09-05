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