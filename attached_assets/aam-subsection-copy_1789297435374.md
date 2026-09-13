# Sub-section copy — for the Agent Authority Model page

**Placement:** directly after the section that introduces the handover as the unit of governance, and before the four questions. It answers the objection that arrives at exactly that point in the reading — *"we already do this, we have guardrails."*

**Suggested anchor / slug:** `guardrails-and-authority`
**Nav label (if the page has a sticky contents rail):** Guardrails and authority

---

## Guardrails are not an authority model

Most teams that have built guardrails believe they have governance. They have not, and the gap is expensive.

A guardrail is a mechanism: an output filter, a rate limit, a system prompt, an approval step. An authority model is the thing that decides which mechanisms are required, where each one sits, and who is answerable when one fails. The first is a component. The second is a delegation.

Every bank already runs this distinction without thinking about it. Its delegation of authority says a relationship manager may approve up to a limit, a committee above it, and anything touching a sanctioned party goes to compliance regardless of size. The four-eyes check and the screening filter are the guardrails. Nobody would say *"we have four-eyes checks, therefore we have a delegation of authority."* That is precisely what is being said when a team points at a content filter and calls it AI governance.

### Three differences that matter

| | **Guardrails** | **The Agent Authority Model** |
|---|---|---|
| **What it attaches to** | The agent or the model — one filter, one prompt, one limit, applied to everything it does | The handover — the moment an output leaves the agent and becomes consequential for someone else |
| **Where it comes from** | Chosen, usually from a vendor's feature list or from whatever has already gone wrong | Derived from the handover's profile: what is handed over, who is present, and what is at stake |
| **What it answers** | *What stops it doing something bad?* | *Who authorised it to do this — and what must it prove before it is allowed to do more?* |

### Why the unit is the whole argument

A single agent does several things of very different consequence. A front-desk agent answers questions, books appointments, cancels them and issues refunds. Guardrail thinking gives all four the same protection, because the protection was attached to the agent. The refund is then defended exactly as well as the opening-hours question — which is to say, the riskiest thing the agent does inherits the posture appropriate to the safest.

Govern the handover instead and each of the four is rated on its own: what kind of thing is being handed over, who is standing there when it happens, how hard it is to undo, and who is exposed if it is wrong. Same agent, same model, same guardrail technology — but the refund is now governed as a refund.

**In engineering terms: authority attaches to the tool, not the agent.**

> **Illustration 1 — Guardrails govern the agent. Authority governs the handover.**

### How the two interact

Two rules bind them.

**Exposure sets the ceiling.** How hard an output is to undo, and how far its effects reach, determine the maximum authority a handover may hold. Capability does not enter into it. A more accurate model does not earn more authority; a smaller blast radius does.

**Evidence earns the climb.** Every handover launches one level below its target authority and is promoted only on measured performance, with demotion automatic on incident. Guardrails have no concept of promotion — they are static by nature. This is the question no published framework asks, and it is the one that turns a classification into an operating model.

Guardrails then enter in two distinct ways, and keeping them apart is the whole of the discipline.

**As required controls.** Once a handover has a profile, its control set follows from that profile rather than from preference — universal controls, plus those set by type, by authority level and by exposure band. Each must be provable by a test, a query or an artefact, never by an assurance. *"The team ensures the agent does not give medical advice"* is not a control. *"An output filter independent of the model blocks each prohibited class, and a test suite attempts every one of them"* is. A guardrail you cannot test is not a guardrail; it is an intention.

**As compensating controls that raise the ceiling.** This is the mechanism that makes the model workable rather than merely restrictive. A handover may hold authority above its exposure ceiling where the **content** of the handover is constrained by construction rather than by trust in the agent. An agent sending messages to patients with no human present sits above the ceiling for an irreversible, customer-affecting handover. It can still be correct — if it writes no free text, renders a clinician-approved template through a whitelist of variables, and passes a blocking gate on every send. The authority there is carried by the approved template. The agent is a dispatcher.

> **Illustration 2 — Exposure sets the ceiling. Evidence earns the climb.**

### The design rule this produces

> **Where an agent operates above its exposure ceiling, the design must name the artefact that carries the authority instead — an approved template, a whitelisted parameter range, a deterministic rule set, or a gate with the power to block.**

That is the cleanest test of the relationship between the two. A guardrail that merely constrains the agent does not move the ceiling; it has made a risky thing somewhat less risky. A guardrail that carries the authority itself does move it, because the consequential content no longer originates with the model at all. Most teams cannot say which kind theirs is. That, usually, is the finding.

The failure runs in both directions. An authority model with unenforceable controls is a register of good intentions. Controls without an authority model are a pile of features nobody can justify to a regulator. Each is load-bearing for the other.

**Authority is earned, not configured.**

---

## Illustration captions (for the figure elements)

**Illustration 1 —** *Guardrails govern the agent; the Agent Authority Model governs the handover.* Four acts of very different consequence, protected identically on the left and rated individually on the right. Handovers shown are illustrative.

**Illustration 2 —** *Exposure sets the ceiling; evidence earns the climb.* Everything under the staircase is permitted, and that is where required controls sit. Promotion moves a handover up within the permitted region. Only a compensating control — a guardrail that carries the authority itself — moves the ceiling.

---

## Optional pull-quote, if the page uses them

> A guardrail that constrains the agent makes a risky thing less risky. A guardrail that carries the authority changes what the agent is allowed to do. Only the second one moves the ceiling.
