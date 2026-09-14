# AI GUARDRAILS FRAMEWORK — revised draft
## Set, Prove & Hold

*Revision of Gökhan's September 2026 draft, incorporating source corrections and the merge with the Agent Authority Model. Changes from the original are noted in the margin comments at the end.*

---

The usual pattern: write down what the AI must never do, put the rule in the AI's instructions, and call it a guardrail. This is about the difference between a rule the AI has been asked to follow and one it cannot break.

**A guardrail is only as strong as the layer it is actually built into.**

> **How this relates to the Agent Authority Model.** The Agent Authority Model decides what a handover is allowed to do — capped by what it would cost to be wrong, raised only on evidence. This framework decides how strongly that is enforced, and how you know it still holds. Authority is the *how much*. Guardrails are the *how*.

---

## Set, Prove & Hold (4 + 4 + 4)

Three things happen to every guardrail. Four steps in each.

### Set · before you build

1. **Name the handovers, not the rules.** Every moment the AI passes something to a person or another system. A "single agent" is usually four to seven of them.
2. **Read the minimum enforcement layer off the exposure.** How hard it is to undo and who is exposed sets how strongly it must be enforced. Build at or above that line.
3. **Say what each control does — restrict, or carry the authority.** Most controls make a risky thing less risky. A few carry the authority themselves, and only those let a handover run above its ceiling.
4. **Every control inherits the owner of the handover it defends.** No orphaned rules, no second register.

### Prove · before you launch

1. **Attack each control directly**, using a published corpus rather than imagination.
2. **Widen the attack to the whole system** — including encoding and character-level evasion, and every language you operate in.
3. **Count what it blocks wrongly, with a denominator.** Report what it catches and what it wrongly stops as two separate numbers.
4. **Record the result with a date, a version and a name.** Above the reversible-at-a-cost band, that name is not the person who built it.

### Hold · every day after

1. **Watch the blocked attempts — and the unblocked ones.** What nothing fired on is the more interesting number.
2. **Re-test on every change** to the model, the instructions, the scanner, the languages or the scope — and whenever a new attack class is published.
3. **Add new controls, retire old ones, and move the authority.** Promotion on evidence; demotion automatic on incident.
4. **Report enforcement strength weighted by exposure**, not a count.

---

## Where the rule is enforced decides everything else

The first decision inside Set is which of four places the rule lives in. The same rule can be written in any of them, and the choice decides whether someone determined can get past it.

### One rule, written four different ways
**"Never reveal another customer's data."**

| Layer | What it is | In this example | What gets past it | Strength |
|---|---|---|---|---|
| **Policy** | A rule in a document | A line in the AI usage policy. The system never sees it. | Anyone who has not read it — and every automated path, which has nobody in it to read anything | ●○○○ |
| **Prompt** | A line in the AI's instructions | The AI is told not to. The other customer's data is still in front of it. | An attacker who can iterate. Against adaptive attack, instruction-level defences fail more often than they hold. | ●●○○ |
| **Runtime** | Software outside the AI that checks what goes in and out | Any answer containing another customer's record is blocked before it leaves. | Reliable against opportunistic misuse; unreliable against a motivated attacker. Emoji and Unicode smuggling have reached 100% bypass against commercial guardrails, and unsafe-response rates roughly triple in lower-resourced languages. | ●●●○ |
| **Architecture** | The AI is given only the data and tools the task needs | The search returns only the signed-in customer's own records. | Only what the scope itself permits — which is why the scope, not the guardrail, becomes the thing to review. | ●●●● |

Architecture is not about withholding. The AI still gets everything it needs to do the job — it just never gets more than that.

**Layers one and two ask the AI to behave. Layers three and four do not ask.** Stop at the prompt and your guardrails are requests, not controls.

> **A fifth thing, which is not a layer.** The model's own safety training is a real control, and it is the one you inherit rather than hold. That makes model selection a guardrail decision, and it is the reason two systems with identical guardrails do not have identical risk.

---

## How strong is strong enough

"The strongest layer you can" is advice. This is a decision. The required enforcement follows from what it would cost to be wrong — the same exposure rating the Agent Authority Model uses.

| The handover is… | Its controls must be enforced at least at… |
|---|---|
| Trivially or windowed-reversible, internal only | **Prompt**, with monitoring |
| Reversible at a cost, one customer affected | **Runtime** |
| Irreversible, one customer affected | **Runtime**, plus architectural scoping of the data and tools it can reach |
| Regulator-visible, public, or safety-implicating | **Architecture**, plus an independent second control |
| Running above its exposure ceiling | **Architecture**, and the design must name the artefact that carries the authority — an approved template, a whitelisted parameter range, a deterministic rule set, a gate with the power to block |

---

## Three questions, not four layers

The layer answers only one of the three things you need to know about a control.

**Where is it enforced?** Policy, prompt, runtime, architecture — above.

**Who is present when it runs?** In the loop, on the loop, out of the loop. Human approval is not a layer; it is an authority state. It is also a control with a capacity limit rather than an unlimited backstop: past the point where reviewers can attend properly, escalating more makes the system less safe, not more.

**What would we know afterwards?** What is logged, what is monitored, what trips a circuit breaker, and how the output is undone. A blocking layer that produces no record fails silently — the most expensive documented AI data-exfiltration incident to date generated no logs, no alerts and no signatures.

---

## The layer decides how you build it, test it and re-test it

| Layer | Set — how you build it | Prove — how you test it | Hold — when you re-test |
|---|---|---|---|
| **Policy** | Write it in a document | Nothing to test | Never — it is not connected to anything |
| **Prompt** | Put it in the AI's instructions | Attack it. Expect it to fail some of the time. | Every model or instruction change — so, constantly |
| **Runtime** | Add a check outside the AI, on the way in or out | Attack it in every language you serve, with encoding evasion, and count what it blocks wrongly | When the scanner, the model or the languages change — and when a new attack class is published |
| **Architecture** | Give the AI only the data and tools the task needs | Check the scoping is actually in place, then try to misuse what is inside the scope | Whenever the scope changes — every tool, integration, credential or allowlist entry — and patch it like any other software |

Read the last two columns together. A rule in the AI's instructions is quick to write and then needs re-testing every time anything moves. The same rule built into the architecture is real work once, and then holds until the scope drifts — which it does, quietly, every time someone adds a tool. **Layer choice is a maintenance decision as much as a security one, and the maintenance never reaches zero.**

---

## The one number worth tracking

Not how many guardrails you have. Not even how many sit at each layer.

**Of the handovers that are irreversible, or visible to a regulator or the public: what share have their controls enforced at runtime or architecture?**

Set assigns it. Prove tells you whether the claimed layer is real. Hold reports it over time.

---

## What this is built from

Nothing invented here, including the layering — it compresses a consensus already published by Microsoft, Google, OWASP and the academic literature. Two things are ours: making the re-test cadence a function of the layer, and binding required enforcement strength to exposure.

The ethics frameworks tell you what to forbid. The security ones tell you how it gets bypassed. A policy built on the first alone will name the right rules and miss every way around them.

**What to forbid**
OWASP GenAI LLM Top 10 2026 · OWASP Top 10 for Agentic Applications (ASI01–ASI10, December 2025) · EU AI Act Art. 5 as amended by Regulation (EU) 2026/1744 · UAE Federal Decree-Law No. 34 of 2021 on Countering Rumours and Cybercrimes

**How it gets bypassed, and how to test**
MITRE ATLAS v2026.08 · NIST AI 100-2 E2025, Adversarial Machine Learning · OWASP AI Testing Guide v1.0 · UK AI Security Institute, Principles for Evaluating Misuse Safeguards

**What you will be measured against**
ISO/IEC 42001:2023 with ISO/IEC 42006:2025 · NIST AI RMF 1.0 and AI 600-1 · CSA AI Controls Matrix v1.1 · the data protection law of the jurisdiction you operate in · DIFC Regulation 10 · CBUAE AI guidance, February 2026 · UAE Charter for AI, June 2024

---

## Where to start

**Move 1.** List every handover — every moment the AI passes something to a person or another system — and mark which layer each one's controls are enforced at. Then look only at the irreversible and regulator-visible ones. That number is the finding. *An afternoon.*

**Move 2.** Take the three that matter most and try to break them. Two people, one afternoon, in every language the service operates in. Whatever survives is worth keeping; whatever does not was never a control.

**Move 3.** Move one guardrail to a stronger layer. Start with the least technical option: narrow what the AI is given to what the task actually needs.

---

*Draft for discussion, September 2026. Mappings are indicative and require confirmation against source text before adoption. Not legal advice.*

---

## Change log against the original draft

1. Set now starts from handovers rather than rules, so this framework and the Agent Authority Model share one register and one set of owners.
2. Added the sufficiency table — required enforcement follows exposure. Replaces "the strongest layer you can", which has no stopping rule and cannot close a design review.
3. Architecture's bypass changed from "nothing" to "only what the scope itself permits". The absolute was the one claim in the document a security reviewer would reject, and the literature it rests on disclaims it.
4. Runtime and Prompt bypass lines given measured magnitudes instead of qualitative gaps.
5. Added the third dimension — who is present, and what you would know afterwards — which is where human approval, identity, monitoring and reversal live. None of them had a home in four layers.
6. Model-level alignment named as an inherited factor rather than a fifth layer.
7. Architecture re-test cadence reversed from "rarely" to "whenever the scope changes", with the maintenance insight preserved.
8. "When a new attack class is published" added as a re-test trigger at every layer.
9. Prove now names its corpus, requires a denominator, and requires independence above the reversible-at-a-cost band.
10. Hold now moves authority — promotion on evidence, automatic demotion on incident.
11. The headline metric now weights by exposure.
12. Layers referred to by name, never by number, to avoid collision with R1–R4, H1–H5 and A1–A3.
13. Source block corrected and regrouped: named data protection statutes removed in favour of a jurisdiction-neutral line, "unlawful output" moved to the Cybercrime Law, EU AI Act applicability and amendment corrected, ISO overclaim softened, Agent Control Standard description corrected, Abu Dhabi Law No. 3 of 2024 and the AI and Data Authority given accurate descriptions. Added the Agentic Top 10, AI Testing Guide, NIST AI 100-2, UK AISI, CSA AICM, DIFC Regulation 10 and the CBUAE guidance.
14. Novelty claim dropped and replaced with two narrower claims that hold.
