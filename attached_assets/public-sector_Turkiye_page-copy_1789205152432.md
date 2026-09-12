# Public Sector — Türkiye
*Cognirise industry page copy. Version 1.0, 12 September 2026.*

---

## 1. Hero / Industry Perspective

**Industry:** Public Sector  ·  **Market:** Türkiye

### Public value is earned at the point of service.

Better public services are not faster versions of the same process. They are services where the institution does the work it can already do on a citizen's behalf, shows what it has decided before the decision takes effect, and can say who is answerable for it. That is achievable today — but only where accessibility, privacy, due process and named human authority are designed in from the first release, not retrofitted after the first complaint.

> *Alternative headline, if a sharper line is wanted:* **If removing the model would still leave the service working, you have not changed the service.**

*Hero image: a public-service setting with people in it — a service counter, a waiting area, a case worker at a screen. Not a data centre, not an abstract network graphic.*

## 2. Industry Opportunity

The value is not in answering more questions. It is in **completing more journeys, correctly, first time** — and in reaching the people a form currently turns away.

Three opportunities carry most of the weight. **Reduce the friction the institution created**: every requirement that can be removed is worth more than the same requirement automated. **Close the gap between entitlement and take-up**: where the institution already holds the facts, an application adds no information — it only filters. And **connect the stages of a journey that currently belong to different owners**, so that a case moves from policy intent to resolved outcome without the citizen carrying it between departments.

The beneficiaries are, in order: people with the least capacity to navigate the system; front-line staff who currently spend their time on assembly rather than judgement; and the institution, which gains a defensible record of every decision it made. Cost reduction is a by-product of the first three, not a substitute for them — and for take-up it runs the other way: reaching more of the eligible population increases outlay. That is the intended effect.

Türkiye starts from a position most states are still building towards: a universal population register completed before the citizen gateway opened, and a social assistance system that already runs 52 automated checks across 16 institutions in place of a document process. The opportunity is therefore less about foundations than about commissioning the service layer that exploits them.

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

**Ambition is not the same as realised evidence — and Türkiye's foundation is already built.**

**Stated ambition**

- **AI Action Plan 2026–2030.** In force by Presidential Circular on 18 August 2026. Four axes and 16 actions, overseen by a National AI Council chaired by the President, with an annual public AI policy letter and a transparency portal.
- **A scan, pilot, scale model with named ownership.** 30+ pilots across 10+ ministries within twelve months in at least two waves; a scale gate at six to twelve months; an AI manager in every institution producing a three-year roadmap within twelve weeks; and at least five AI citizen services on e-Devlet.
- **A single authority for public-sector digital transformation.** Presidential Decree 183 of March 2025 consolidated public-sector digital transformation and public AI applications under the Cyber Security Presidency, with a public AI directorate added in December 2025.

**Demonstrated delivery**

- **MERNİS and the national identity number.** A national identity number assigned to every population record in October 2000 and the central system live in November 2002. Record processing reportedly fell from 20 days to 55 seconds.
- **e-Devlet Kapısı.** 69.5 million users, 9,396 services and 1,128 institutions as at August 2026 — grown from 22 services and 9 institutions at launch in December 2008, on an architecture that never required a relaunch.
- **Integrated social assistance (BSYS).** 52 automated queries across 16 institutions in place of a roughly fifteen-day document process; 30 million citizens and 340 million transactions; an estimated 10% of duplicate payments eliminated.
- **UN E-Government Development Index 2024.** 27th globally, up 21 places in a single cycle — one of the largest single-cycle rises recorded. 76.1% of citizens used a state website or application in the previous twelve months.

**Governance and data boundaries**

KVKK binds public institutions, with registration for public bodies since April 2019, and the 2024 amendments added adequacy decisions, binding corporate rules and standard contractual clauses to the transfer regime. Sectoral data localisation is dense across banking, payments, capital markets, health, telecoms and tax, plus a circular covering critical public data — so in-country inference is the legal default. Three AI bills are before the Assembly; the 2024 proposal follows the EU AI Act's shape and remains in committee.

**Language and accessibility**

Turkish-language performance is measurable: published benchmarks cover thousands of natively written questions across dozens of models. Two findings matter for procurement. Turkish-trained does not automatically mean better in Turkish — strong multilingual models generally outperform Turkish-centric instruction-tuned ones on Turkish tasks. And tokenisation is simultaneously a cost line and an accuracy driver, since Turkish runs at roughly two to three tokens per word and the share of valid Turkish tokens correlates closely with benchmark score.

*European examples are labelled as such and are not treated as Turkish evidence, though EU instruments are relevant as both an export constraint and a legislative template.*

## 8. Supporting Evidence / Source Trail

*Evidence categories: Official source · Independent study · Company-reported · Vendor claim. A strategy document supports a statement about policy intent. It does not, by itself, establish implementation or realised benefit.*

| Source | Publisher | Category | Supports | Limitation |
|---|---|---|---|---|
| Türkiye AI Action Plan 2026–2030 | Presidential Circular 2026/9, Resmî Gazete | Official source | Four axes, 16 actions, governance structure and targets | Full action text not verified line by line for this page |
| Presidential Decree 183 of 28 March 2025 | Resmî Gazete | Official source | Consolidation of public-sector digital transformation and public AI applications | — |
| e-Devlet Kapısı service statistics | turkiye.gov.tr | Official source | 69.5m users, 9,396 services, 1,128 institutions as at 31 August 2026 | — |
| MERNİS and KPS | Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü | Official source | National identity number assignment 2000; central system 2002; processing-time reduction | — |
| Integrated Social Assistance System | Aile ve Sosyal Hizmetler Bakanlığı | Official source | 52 queries across 16 institutions; coverage and transaction volumes | Duplicate-payment reduction is a reported estimate |
| UN E-Government Survey 2024 | UN DESA | Official source | 27th globally, up 21 places | 2022 baseline rank not independently confirmed |
| TR-MMLU and TurkishMMLU | Academic publications | Independent study | Model performance on natively written Turkish questions | Benchmark coverage varies between studies |

*Link: consolidated industry case studies →*

## 9. Relevant Next Action

### Map one high-friction public journey from policy intent to resolved case.

Not an AI strategy, and not a platform selection. One journey, followed all the way through: what policy intends, what the institution already holds, where the citizen is asked for something the state could have supplied, where the decision is actually made and by whom, and what happens when it is wrong.

**What it produces.** A requirements list with an owner and a date against each entry. A one-page register-readiness note — what the data covers, how current it is, and whether it records the fact at the resolution the decision needs. A register of the automated decisions in that journey, each with a named accountable owner. And a baseline of cost and completion by channel, which almost no institution currently holds and without which no later claim of improvement can be evidenced.

**Candidate journeys in Türkiye**

- A social assistance application, where 52 automated checks already run and the remaining friction is at the front end
- A civil-record request, where the register is authoritative and issuance is already immediate
- A licence re-issue on change of activity — noting the workplace licence is open-ended and has no renewal cycle, so the journey is shaped around the change

**What good looks like, measured**

- End-to-end completion rate, and first-time-right rate
- Abandonment and exclusion, broken down by group and by channel
- Appeals volume and overturn rate
- Cost per completed outcome, by channel
- Time from trigger to resolved case

**Service:** Sovereign & Regulated AI →

**[Book a value scan]**
