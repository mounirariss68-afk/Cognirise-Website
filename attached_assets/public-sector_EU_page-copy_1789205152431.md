# Public Sector — European Union
*Cognirise industry page copy. Version 1.0, 12 September 2026.*

---

## 1. Hero / Industry Perspective

**Industry:** Public Sector  ·  **Market:** European Union

### Public value is earned at the point of service.

Better public services are not faster versions of the same process. They are services where the institution does the work it can already do on a citizen's behalf, shows what it has decided before the decision takes effect, and can say who is answerable for it. That is achievable today — but only where accessibility, privacy, due process and named human authority are designed in from the first release, not retrofitted after the first complaint.

> *Alternative headline, if a sharper line is wanted:* **If removing the model would still leave the service working, you have not changed the service.**

*Hero image: a public-service setting with people in it — a service counter, a waiting area, a case worker at a screen. Not a data centre, not an abstract network graphic.*

## 2. Industry Opportunity

The value is not in answering more questions. It is in **completing more journeys, correctly, first time** — and in reaching the people a form currently turns away.

Three opportunities carry most of the weight. **Reduce the friction the institution created**: every requirement that can be removed is worth more than the same requirement automated. **Close the gap between entitlement and take-up**: where the institution already holds the facts, an application adds no information — it only filters. And **connect the stages of a journey that currently belong to different owners**, so that a case moves from policy intent to resolved outcome without the citizen carrying it between departments.

The beneficiaries are, in order: people with the least capacity to navigate the system; front-line staff who currently spend their time on assembly rather than judgement; and the institution, which gains a defensible record of every decision it made. Cost reduction is a by-product of the first three, not a substitute for them — and for take-up it runs the other way: reaching more of the eligible population increases outlay. That is the intended effect.

The Union's distinctive asset is that the obligations already run across twenty-seven administrations at once. Twenty-one key procedures have had to be fully digital and cross-border accessible since December 2023, the once-only technical system went live on the same date, and interoperability assessments attach to each delivery rather than gating a programme. The opportunity is to use instruments that already exist rather than to argue for new ones.

## 3. Operating Pressures

**1. Legitimacy before velocity**

A decision that affects someone's rights, money or status needs a legal basis, an evidence trail, an explanation in their own language and a route to challenge it that suspends the effect while it is heard. The practical design test is not whether a human is in the loop but whether that human can actually disagree — whether they see the evidence or only the conclusion, whether they are measured on throughput, and whether anything happens when an appeal body rules against the system.

**2. Accessibility is part of the system**

A service that works for confident users in the majority language and fails for everyone else has not been delivered; it has been narrowed. Language is an engineering constraint, not a translation task: measured model performance drops materially outside English, and the capability that degrades most is exactly the one an agentic service depends on. Assisted and human channels are part of the design, not a fallback for its failures.

**3. Data boundaries shape trust**

Identity, eligibility and case information each need a stated purpose, a defined access boundary and a retention rule — and in several markets, a residency rule as well. The architectural consequence is specific: the model should see intent, and the registry should supply the data. Personal information does not need to be in the prompt for a service to feel personal.

**4. Legacy and fragmentation set the pace, not the ambition**

Most institutions cannot re-platform before they improve. The realistic answer is two tracks run together — visible service improvement shipped into the foundation that already exists, and foundation work scoped backwards from the services wanted next. The foundation does not decide whether you ship; it decides which services you can ship into.

## 4. Value Domains and Capabilities

*A capability is reusable across services. An application is one use of it. The three below are deliberately expressed as things an institution builds and keeps, not as products it buys.*

**Sovereign service platforms**

Bilingual or multilingual services operating inside defined identity, residency, access and retention boundaries — with evaluation carried out in every language the service is delivered in, not only in English. The reusable parts are the identity and consent layer, the registry-side data assembly that keeps personal information out of the model, and a published position on which language version of a determination governs.

**Governed casework agents**

Assistance with intake, triage, evidence assembly and drafting — where the eligibility rule executes deterministically and the model does the parts that are genuinely judgement. The reusable parts are a register of automated decisions rather than of systems, a named accountable owner for each, an explanation generated from the executed rule rather than reconstructed afterwards, and a promotion rule under which a system starts below its target level of autonomy and earns more against evidence declared in advance.

**Public-service engineering**

Redesigning a complete journey from policy intent to resolved case: removing requirements before automating them, turning the eligibility logic into tested code, and exposing the service as a callable function rather than only as a page. The reusable parts are the requirements register, the rules-as-code test suite built from decided cases including upheld appeals, and outcome measurement that follows the citizen across channels rather than reporting each channel separately.

## 5. Representative Applications

| Application | Evidence status | Required human-control boundary |
|---|---|---|
| **Case intake and triage**<br>A person describes a situation in their own words; the service works out which process applies, assembles what the institution already holds, and returns a structured, pre-filled object for the person to check and confirm. | **Evaluated deployment, for information. Limited operational evidence for transactions.** The most thoroughly tested national example ran an 18-month pilot across roughly 26,000 questions before launching — and launched deliberately narrow: information only, no advice, no transactions, personal data filtered out. One national service has taken a single document-issuance journey end to end in conversation. | Routing and assembly may be automated. The determination is shown before it takes effect. No transaction completes without an explicit confirming action against a rendered record of what the person was shown. |
| **Decision support**<br>The system reads the case, applies the executed eligibility rule, drafts a determination with its reasons, and presents the evidence alongside it for an accountable officer to confirm, correct or overrule. | **Evaluated deployment in bounded tasks.** A published government evaluation of AI-assisted consultation analysis reported theme agreement with human reviewers at roughly the level of agreement between two human reviewers, with median review time of about 23 seconds per response — and published its own limitation, that the tool under-identified themes relative to reviewers. Bounded, measurable tasks evaluate well; general productivity claims do not. | The officer sees the evidence, not only the conclusion, and is not measured on throughput. Override rate is monitored as a health metric, and a low override rate is treated as a warning. Rights-affecting determinations are never applied automatically on inferred data. |
| **Service operations**<br>Structuring records the institution holds but cannot currently use, propagating a single notification across departments, and triggering a service on a registered life event rather than an application. | **Operational, with measured outcomes in several jurisdictions.** Document digitisation in one planning service moved from roughly two hours to roughly two minutes per document, with human review of every output retained. Proactive family benefits in one national system cut processing from about two hours to about thirty seconds, with reported satisfaction of 9.8 out of 10 — and 97% of recipients had previously had to apply. | A service qualifies as proactive only where the facts are already held at the right granularity and period, the determination is an award rather than a liability, and an error is visible and recoverable. Everything else is an offer the person confirms. |

*These are representative industry patterns drawn from the public record. They are not Cognirise client engagements, and the outcomes above are reported by the institutions named in the source trail, not by Cognirise.*

## 6. Critical Perspective

### Documented reversal

**Automating a broken service can harden the friction.**

The clearest documented case is municipal. New York City deployed a business-facing AI assistant intended to help owners navigate regulation. In March 2024 investigative reporting found it telling businesses they could act unlawfully — among other things, that landlords could refuse housing-voucher holders and that employers could take a share of staff tips. It remained live weeks after the findings were published. On 30 January 2026 the city announced its shutdown, with reported costs of roughly $600,000 to build and $500,000 a year to run.

The failure was not the model. It was that a conversational layer was placed in front of a body of regulation that had never been turned into executable, tested rules — so the system had nothing authoritative to be right about. A federal review of a separate government chat service found a similar pattern in the numbers: roughly 46% of sessions resolved, abandonment rising from 28% to 46% year on year, and a majority of tested keyword terms not recognised.

**What to take from it.** Conversation is a good front door and a poor substitute for a rule. An institution that has not written down what it will decide, on what basis, and who is answerable for it, does not become more accountable by adding a chat interface — it becomes less, because the interface implies an authority the underlying service cannot support.

### Myth / verdict

**Myth —** *“A public chatbot proves digital government is intelligent.”*

**Verdict —** It proves the institution has a channel. Whether it has a service is a different question, and the honest measures are unglamorous: **end-to-end completion, first-time-right rate, abandonment and exclusion broken down by group, appeals volume and overturn rate, and cost per completed outcome by channel.**

Two numbers make the point. In the most AI-forward government platforms, AI-assisted transactions remain a small fraction of total volume — a gap between narrative and volume that is universal, not local. And the highest-satisfaction, highest-volume digital channels in mature digital governments are still structured forms and payments, not conversation.

There is also one metric worth refusing to report. **Containment, or deflection, measures a citizen failing to reach a human.** No supreme audit institution publishes it, and it will be optimised at the expense of every other number on the list.

## 7. Market Context

**Ambition is not the same as realised evidence — and in the Union, much of the ambition is already law.**

**Stated ambition**

- **Digital Decade 2030 targets.** 100% of key public services online, 100% citizen access to electronic health records, and 100% access to secure electronic identification, set by Decision (EU) 2022/2481.
- **European Digital Identity Wallet.** Each Member State must provide at least one wallet within 24 months of entry into force of the implementing acts — a deadline of 24 December 2026. Rollout is staggered rather than synchronised.
- **A settled AI rulebook for public bodies.** Regulation (EU) 2026/1744, published 24 July 2026, confirmed the timetable: transparency obligations from 2 August 2026, Annex III high-risk duties from 2 December 2027, and an absolute 2 August 2030 date for legacy AI already in use by a public authority — public bodies get no grandfathering.

**Demonstrated delivery**

- **Single Digital Gateway.** 93% of Single Digital Gateway procedures online at the 2025 measurement; the once-only technical system live since December 2023 with 1,000+ public authorities connected and around 60 evidence types.
- **National identity at scale.** One national scheme reports 41.5 million identities, about 82% of adults; another reports 45 million users and 500 million connections in a year; a third reports 645 million logins.
- **Proactive delivery, measured.** Austria has paid family allowance automatically on a registered birth since May 2015. Estonia's proactive family benefits, live since October 2019, cut processing from about two hours to about thirty seconds at 9.8 out of 10 satisfaction, with 97% of recipients having previously had to apply. Portugal has awarded a social energy tariff automatically from a tax and social-security match since 2016.
- **Where the gap actually is.** 52% of citizens used an electronic identity in 2025 — but only 9% used one across a border. Portability, not provision, is the binding constraint the wallet is aimed at.

**Governance and data boundaries**

Article 26 requires human oversight by competent persons with authority to intervene, monitoring, incident reporting and log retention of at least six months, with an additional public-authority duty to verify database registration before use. Article 27 requires a fundamental rights impact assessment from bodies governed by public law and from private entities providing public services, notified to the market surveillance authority. The Commission's Model Contractual Clauses for AI exist in high-risk and light versions in all 24 languages — an AI Act compliance overlay, not a complete contract: acceptance, IP, liability and exit still need drafting.

**Language and accessibility**

All 24 language versions of Union instruments are equally authentic, and the Court requires comparison across language versions to interpret any provision. There is no privileged source text — so an automated determination generated in one language and served in another is not a translation of the decision, it is the decision. Measured performance gaps between English and lower-resourced official languages reach 18 points on one standard benchmark and 25 on another, and correlate with each language's share of available training text rather than with any property of the language itself.

*Member State examples are named rather than generalised, and are not presented as Union-wide outcomes.*

## 8. Supporting Evidence / Source Trail

*Evidence categories: Official source · Independent study · Company-reported · Vendor claim. A strategy document supports a statement about policy intent. It does not, by itself, establish implementation or realised benefit.*

| Source | Publisher | Category | Supports | Limitation |
|---|---|---|---|---|
| Decision (EU) 2022/2481 — Digital Decade Policy Programme | EUR-Lex | Official source | The 2030 targets for public services, health records and electronic identification | — |
| Regulation (EU) 2018/1724 — Single Digital Gateway | EUR-Lex | Official source | 21 procedures fully digital and cross-border by December 2023; once-only technical system | — |
| Regulation (EU) 2024/1183 — European Digital Identity | EUR-Lex | Official source | Article 5a(1) wallet obligation and the 24-month clock | Deadline derived from entry into force of the implementing acts |
| Regulation (EU) 2026/1744 — Digital Omnibus on AI | Official Journal, 24 July 2026 | Official source | Revised application dates for high-risk obligations | — |
| eGovernment Benchmark 2025 and 2026 | Produced for the European Commission | Independent study | 93% of Single Digital Gateway procedures online; citizen and business scores | Produced under contract to the Commission; mystery-shopping methodology |
| Proactive family benefits, Estonia | OECD Observatory of Public Sector Innovation | Company-reported | Processing-time reduction and satisfaction | Self-submitted case record; figures reported by the delivering institution |
| EU20 multilingual benchmark suite | Academic publication | Independent study | Measured performance gaps across 21 official languages | Coverage excludes at least one official language |

*Link: consolidated industry case studies →*

## 9. Relevant Next Action

### Map one high-friction public journey from policy intent to resolved case.

Not an AI strategy, and not a platform selection. One journey, followed all the way through: what policy intends, what the institution already holds, where the citizen is asked for something the state could have supplied, where the decision is actually made and by whom, and what happens when it is wrong.

**What it produces.** A requirements list with an owner and a date against each entry. A one-page register-readiness note — what the data covers, how current it is, and whether it records the fact at the resolution the decision needs. A register of the automated decisions in that journey, each with a named accountable owner. And a baseline of cost and completion by channel, which almost no institution currently holds and without which no later claim of improvement can be evidenced.

**Candidate journeys in the European Union**

- One of the twenty-one Annex II procedures, where the legal obligation, the evidence exchange mechanism and the cross-border requirement already exist
- A proactive award triggered by a registered life event, where the register is authoritative and the determination is benign
- A pension or benefit claim requiring periods from more than one Member State, where the once-only system removes the evidence burden

**What good looks like, measured**

- End-to-end completion rate, and first-time-right rate
- Abandonment and exclusion, broken down by group and by channel
- Appeals volume and overturn rate
- Cost per completed outcome, by channel
- Time from trigger to resolved case

**Service:** Sovereign & Regulated AI →

**[Book a value scan]**
