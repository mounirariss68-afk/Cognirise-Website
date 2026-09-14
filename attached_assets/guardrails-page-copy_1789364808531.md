# Cognirise website — new page: The Guardrails Framework

**Section:** How we do it
**Nav label:** Guardrails Framework
**Slug:** `/how-we-do-it/guardrails-framework`
**Page title (browser/SEO):** The Guardrails Framework — Set, Prove & Hold | Cognirise
**Meta description:** Most AI guardrails are requests, not controls. Set, Prove & Hold is how Cognirise builds rules a system cannot break, tests them against published attack corpora, and keeps them true as everything around them changes.
**Sits alongside:** The Agent Authority Model (cross-linked both ways)

---

## 1 · Hero

**Eyebrow:** How we do it

**Headline:**
A guardrail is only as strong as the layer it is built into.

**Sub-headline:**
The usual pattern: write down what the AI must never do, put the rule in the AI's instructions, and call it a guardrail. This page is about the difference between a rule the AI has been asked to follow and one it cannot break.

**Primary action:** Talk to us about a guardrail review
**Secondary action:** Read the Agent Authority Model →

---

## 2 · The distinction

**Section heading:** Asked, or unable

Almost every guardrail in production today is a sentence in a system prompt. It reads like a control, it is reported like a control, and under any determined attempt it behaves like a request.

The distinction is not academic. A rule the model has been asked to follow fails probabilistically — most of the time it holds, and the times it does not are the times someone was trying. A rule the model cannot break fails only if the thing enforcing it fails, and that thing can be tested like any other piece of software.

Everything below follows from one question: **where is the rule actually enforced?**

---

## 3 · Where the rule is enforced

**Section heading:** One rule, four different ways

**Intro:** The same rule can be written in any of four places. The choice decides whether someone determined can get past it — and how much work it takes to keep it true.

**[ILLUSTRATION A — the four layers]**

**The worked example, in the illustration and repeated in the table:**
*"Never reveal another customer's data."*

| Layer | What it is | In this example | What gets past it | Strength |
|---|---|---|---|---|
| **Policy** | A rule in a document | A line in the AI usage policy. The system never sees it. | Anyone who has not read it — and every automated path, which has nobody in it to read anything | 1 of 4 |
| **Prompt** | A line in the AI's instructions | The AI is told not to. The other customer's data is still in front of it. | An attacker who can iterate. Against adaptive attack, instruction-level defences fail more often than they hold. | 2 of 4 |
| **Runtime** | Software outside the AI that checks what goes in and out | Any answer containing another customer's record is blocked before it leaves. | Reliable against opportunistic misuse; unreliable against a motivated attacker. Character and encoding evasion has reached complete bypass against commercial guardrails, and unsafe-response rates rise sharply in lower-resourced languages. | 3 of 4 |
| **Architecture** | The AI is given only the data and tools the task needs | The search returns only the signed-in customer's own records. | Only what the scope itself permits — which is why the scope, not the guardrail, becomes the thing to review. | 4 of 4 |

**Pull-out below the table:**
> Architecture is not about withholding. The AI still gets everything it needs to do the job — it just never gets more than that.

**Closing line of the section:**
Layers one and two ask the AI to behave. Layers three and four do not ask. **Stop at the prompt and your guardrails are requests, not controls.**

**Aside card — the fifth thing, which is not a layer:**
The model's own safety training is a real control, and it is the one you inherit rather than hold. That makes model selection a guardrail decision, and it is the reason two systems with identical guardrails do not carry identical risk.

---

## 4 · How strong is strong enough

**Section heading:** The stopping rule

**Intro:** "Build it into the strongest layer you can" is advice. It never says *enough*, so it cannot close a design review, and it sends budget to the wrong places. The required strength follows from what it would cost to be wrong — the same exposure rating used in the Agent Authority Model.

**[ILLUSTRATION B — exposure sets the minimum layer]**

| If the handover is… | Its controls must be enforced at least at… |
|---|---|
| Trivially or windowed-reversible, internal only | **Prompt**, with monitoring |
| Reversible at a cost, one customer affected | **Runtime** |
| Irreversible, one customer affected | **Runtime**, plus architectural scoping of the data and tools it can reach |
| Regulator-visible, public, or safety-implicating | **Architecture**, plus an independent second control |
| Running above its exposure ceiling | **Architecture**, and the design must name the artefact that carries the authority |

**Pull-out:**
> Now a design review can close. A client can be told they are done.

---

## 5 · Three questions, not four layers

**Section heading:** What you need to know about a control

**Intro:** The layer answers only one of the three things that matter. A framework that stops there has no place to put human approval, identity, or anything you would only discover afterwards.

**[ILLUSTRATION C — three columns]**

**Column 1 — Where is it enforced?**
Policy, prompt, runtime, architecture. This decides whether it can be broken, and how often it has to be re-tested.

**Column 2 — Who is present when it runs?**
In the loop, on the loop, out of the loop. Human approval is not a layer; it is an authority state. It is also a control with a capacity limit rather than an unlimited backstop — past the point where reviewers can attend properly, escalating more makes a system less safe, not more.

**Column 3 — What would we know afterwards?**
What is logged, what is monitored, what trips a circuit breaker, and how the output is undone. A blocking layer that produces no record fails silently. The most consequential documented AI exfiltration incident to date generated no logs, no alerts and no signatures.

---

## 6 · The method

**Section heading:** Set, Prove & Hold

**Intro:** Three things happen to every guardrail. Four steps in each.

**[ILLUSTRATION D — three-column method card]**

**SET · before you build**
1. **Name the handovers, not the rules.** Every moment the AI passes something to a person or another system. A "single agent" is usually four to seven of them.
2. **Read the minimum enforcement layer off the exposure.** Build at or above that line.
3. **Say what each control does — restrict, or carry the authority.** Most controls make a risky thing less risky. A few carry the authority themselves, and only those let a handover run above its ceiling.
4. **Every control inherits the owner of the handover it defends.** No orphaned rules, no second register.

**PROVE · before you launch**
1. **Attack each control directly**, using a published corpus rather than imagination.
2. **Widen the attack to the whole system** — including encoding and character-level evasion, and every language you operate in.
3. **Count what it blocks wrongly, with a denominator.** What it catches and what it wrongly stops are two numbers, reported separately.
4. **Record the result with a date, a version and a name.** Above the reversible-at-a-cost band, that name is not the person who built it.

**HOLD · every day after**
1. **Watch the blocked attempts — and the unblocked ones.** What nothing fired on is the more interesting number.
2. **Re-test on every change** to the model, the instructions, the scanner, the languages or the scope — and whenever a new attack class is published.
3. **Add new controls, retire old ones, and move the authority.** Promotion on evidence; demotion automatic on incident.
4. **Report enforcement strength weighted by exposure**, not a count.

---

## 7 · The layer is a maintenance decision

**Section heading:** What it costs to keep it true

| Layer | Set — how you build it | Prove — how you test it | Hold — when you re-test |
|---|---|---|---|
| **Policy** | Write it in a document | Nothing to test | Never — it is not connected to anything |
| **Prompt** | Put it in the AI's instructions | Attack it. Expect it to fail some of the time. | Every model or instruction change — so, constantly |
| **Runtime** | Add a check outside the AI, on the way in or out | Attack it in every language you serve, with encoding evasion, and count what it blocks wrongly | When the scanner, the model or the languages change — and when a new attack class is published |
| **Architecture** | Give the AI only the data and tools the task needs | Check the scoping is in place, then try to misuse what is inside the scope | Whenever the scope changes — every tool, integration, credential or allowlist entry — and patch it like any other software |

**Closing paragraph:**
Read the last two columns together. A rule in the AI's instructions is quick to write and then needs re-testing every time anything moves. The same rule built into the architecture is real work once, and then holds until the scope drifts — which it does, quietly, every time someone adds a tool. Layer choice is a maintenance decision as much as a security one, and the maintenance never reaches zero.

---

## 8 · The one number

**Section heading:** What to measure

**Large display statement:**
Of the handovers that are irreversible, or visible to a regulator or the public — what share have their controls enforced at runtime or architecture?

**Supporting line:**
Not how many guardrails you have. Not even how many sit at each layer: forty low-consequence rules moved to runtime make a beautiful chart and change nothing. Set assigns the layer. Prove tells you whether the claimed layer is real. Hold reports it over time.

---

## 9 · How this fits with the Agent Authority Model

**Section heading:** Authority and enforcement

**Body:**
These are two halves of one instrument, and neither works alone.

The **Agent Authority Model** decides what a handover is allowed to do — capped by what it would cost to be wrong, raised only on measured evidence. This framework decides how strongly that is enforced, and how you know it still holds.

**Authority is the *how much*. Guardrails are the *how*.**

That is why a guardrail here is never a free-standing object with its own owner and its own register. It is a control attached to a handover, and it inherits that handover's owner — one register, one set of owners, one artefact a supervisor can inspect.

An authority model with unenforceable controls is a register of good intentions. Controls without an authority model are a pile of features nobody can justify to a regulator. Each is load-bearing for the other.

**Link card:** The Agent Authority Model → *Who authorised the agent to do that, and what must it prove to do more.*

---

## 10 · What this is built from

**Intro:** Nothing invented here, including the layering — it compresses a consensus already published by the major labs, the standards bodies and the academic literature. Two things are ours: making the re-test cadence a function of the layer, and binding required enforcement strength to exposure.

The ethics frameworks tell you what to forbid. The security ones tell you how it gets bypassed. A policy built on the first alone will name the right rules and miss every way around them.

**What to forbid**
OWASP GenAI LLM Top 10 2026 · OWASP Top 10 for Agentic Applications · EU AI Act Article 5, as amended · national law on unlawful and manipulated content in the markets you serve

**How it gets bypassed, and how to test**
MITRE ATLAS v2026.08 · NIST AI 100-2 E2025, Adversarial Machine Learning · OWASP AI Testing Guide v1.0 · UK AI Security Institute, Principles for Evaluating Misuse Safeguards

**What you will be measured against**
ISO/IEC 42001:2023 with ISO/IEC 42006:2025 · NIST AI RMF 1.0 and AI 600-1 · CSA AI Controls Matrix v1.1 · the data protection and sector regulation of the jurisdiction you operate in · the UAE Charter for AI

---

## 11 · Where to start

**Section heading:** Three moves

**Move 1 — an afternoon.**
List every handover — every moment the AI passes something to a person or another system — and mark which layer each one's controls are enforced at. Then look only at the irreversible and the regulator-visible. That number is the finding.

**Move 2 — an afternoon, two people.**
Take the three that matter most and try to break them, in every language the service operates in. Whatever survives is worth keeping; whatever does not was never a control.

**Move 3.**
Move one guardrail to a stronger layer. Start with the least technical option: narrow what the AI is given to what the task actually needs.

**Closing CTA:**
**Heading:** Most guardrail reviews find the same thing.
**Body:** That the controls protecting the highest-consequence handovers are the ones nobody can test. Finding out takes an afternoon.
**Button:** Book a guardrail review

**Footer note (small):** Mappings are indicative and require confirmation against source text before adoption. Not legal advice.
