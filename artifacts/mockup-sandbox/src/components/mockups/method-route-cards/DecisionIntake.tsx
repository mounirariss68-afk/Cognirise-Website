import { useState } from "react";

type Situation = {
  id: string;
  label: string;
  context: string;
  summary: string;
  assets: string;
  decision: string;
  output: string;
  methods: { name: string; href: string; reason: string }[];
  actions: { label: string; href: string }[];
  idao: string;
  authority: string;
};

const situations: Situation[] = [
  {
    id: "investment",
    label: "We need to know where AI is worth investing.",
    context: "Opportunity not yet defined",
    summary: "We are exploring AI, but have not established a useful opportunity or a convincing business case. We need to understand the likely benefits, costs and evidence before committing.",
    assets: "Strategic goals, cost pressures, baseline information or a few ideas may exist; a chosen project is not required.",
    decision: "What problem, if any, is worth addressing with AI, and what evidence would justify the investment?",
    output: "A bounded value hypothesis; comparison with non-AI alternatives; benefits, full costs, assumptions, owner and measurement plan; a proportionate next test or a reason not to proceed. This self-service route is not a complete business case; producing a full business case is additional engagement work.",
    methods: [
      { name: "IDAO opportunity framing", href: "/methodologies/idao", reason: "Use Innovate when the opportunity, accountable owner, measurable outcome or proof plan is still unresolved." },
      { name: "AI Use-Case Prioritization", href: "/methodologies/ai-use-case-prioritization", reason: "Use only when actual comparable alternatives already exist; its scorecard informs sequence, not a complete financial business case." },
    ],
    actions: [
      { label: "Frame an opportunity in IDAO", href: "/methodologies/idao" },
      { label: "Compare defined opportunities", href: "/methodologies/ai-use-case-prioritization" },
    ],
    idao: "IDAO's canonical Innovate, Demonstrate, Activate and Operate gates remain evidence-dependent. Enter Innovate when the opportunity or evidence is unresolved; move to Demonstrate for a bounded hypothesis that needs proof, while adequate existing evidence can support a later entry.",
    authority: "Use Agent Authority only when a specific consequential Knowledge, Decision or Action handover needs a ceiling. It is not a prerequisite for deciding whether to invest.",
  },
  {
    id: "competing-ideas",
    label: "We have several AI ideas and need to choose.",
    context: "Several proposals to compare",
    summary: "We have competing proposals and limited money or capacity. We need to decide what to fund first, what to investigate and what to stop.",
    assets: "Candidate descriptions, value hypotheses and some feasibility information exist, even if the evidence quality varies.",
    decision: "Which proposals should advance, in what order, and which should wait or stop?",
    output: "A transparent comparative decision with evidence gaps, capacity and control considerations, and investigate, demonstrate, activate or stop recommendations.",
    methods: [
      { name: "AI Use-Case Prioritization", href: "/methodologies/ai-use-case-prioritization", reason: "Compare proposals across value, feasibility, time to evidence, adoption friction, control burden and reuse potential." },
      { name: "IDAO delivery gates", href: "/methodologies/idao", reason: "Treat each recommendation as input to the canonical evidence gate; a score is not permission to bypass IDAO." },
    ],
    actions: [
      { label: "Open prioritization", href: "/methodologies/ai-use-case-prioritization" },
      { label: "Review IDAO gates", href: "/methodologies/idao" },
    ],
    idao: "Route each selected proposal according to its evidence: Innovate for unresolved opportunity, Demonstrate for a bounded test, Activate when implementation evidence is sufficient, or Stop when it should not proceed.",
    authority: "Control burden and required oversight can change priority or the responsible IDAO entry. Use Agent Authority separately for each consequential handover.",
  },
  {
    id: "existing-strategy",
    label: "We have an AI strategy and need to implement it.",
    context: "Strategy or roadmap in hand",
    summary: "We already have a strategy or roadmap, whether developed internally or by a consultant. We need to turn it into owned, funded delivery work without repeating decisions that are already supported.",
    assets: "The strategy may include priority use cases, architecture, recommendations and a governance model; its completeness and evidence still need to be checked.",
    decision: "What can we start delivering now, who owns it, and what evidence or dependencies are still missing?",
    output: "An agreed first delivery package, accountable owner, funding and resourcing decisions, acceptance measures, dependencies and evidence-based IDAO entry. Turning a strategy or roadmap into delivery is additional engagement work beyond this self-service route.",
    methods: [
      { name: "Direct IDAO entry", href: "/methodologies/idao", reason: "Review existing evidence and enter the earliest responsible gate; a roadmap does not require a strategy restart or bypass an evidence gate." },
      { name: "Supporting methods when a question remains", href: "/methodologies/ai-use-case-prioritization", reason: "Use prioritization, Value-to-Scale, readiness or work-design methods only for a specific unresolved decision—not a generic implementation score." },
    ],
    actions: [
      { label: "Review IDAO delivery entry", href: "/methodologies/idao" },
      { label: "Open a supporting method", href: "/methodologies/ai-use-case-prioritization" },
    ],
    idao: "Enter the earliest IDAO stage whose gate the existing evidence can responsibly satisfy. Demonstrate, Activate or Operate may be appropriate; return to Innovate only where the opportunity itself needs reframing.",
    authority: "Review a specific consequential handover when one is part of the delivery package. Agent Authority does not replace the delivery gate; guardrails remain a complementary control question.",
  },
  {
    id: "process-problem",
    label: "We need to improve a specific process.",
    context: "Known operational problem",
    summary: "We know where work is slow, costly or unreliable. We need to work out whether AI would help and what must change in the process—not start by assuming it needs agents.",
    assets: "A known operational problem, affected work and ideally a process owner and baseline are available; an AI solution is not yet assumed.",
    decision: "What change would improve this process, and does AI have a useful role?",
    output: "A clear problem and baseline, changed-work proposal, AI and non-AI options, feasibility questions and a bounded test.",
    methods: [
      { name: "IDAO opportunity framing", href: "/methodologies/idao", reason: "Frame the bounded problem, evidence and next test without presuming an agent solution." },
      { name: "Human–Agent Operating Model", href: "/methodologies/human-agent-operating-model", reason: "Use when people, responsibilities, capabilities, incentives or handovers must change in the proposed work." },
      { name: "Agentic Operations Readiness", href: "/methodologies/agentic-operations-readiness", reason: "Use only for an actual proposed agent workflow; it tests operating conditions, not every process-improvement option." },
    ],
    actions: [
      { label: "Frame the process opportunity", href: "/methodologies/idao" },
      { label: "Open work-design playbook", href: "/methodologies/human-agent-operating-model" },
      { label: "Assess an agent workflow", href: "/methodologies/agentic-operations-readiness" },
    ],
    idao: "Use Innovate for an unresolved intervention and Demonstrate for a bounded test. Do not require an agent-specific assessment when a non-agent process change is the better option.",
    authority: "If the proposed change includes a consequential handover, define its authority separately. Guardrails and authority are specialist considerations, not an eighth starting situation.",
  },
  {
    id: "pilot-release",
    label: "We have a pilot and need to put it into everyday use.",
    context: "Pilot or limited trial exists",
    summary: "We have tested something, but it is not yet a supported part of normal work. We need to establish what remains before people can rely on it.",
    assets: "A prototype or limited trial exists, with some test evidence; integration, security, support, ownership, adoption or a safe release decision may remain unresolved.",
    decision: "What must be proven or completed before this can become a dependable part of normal work?",
    output: "An explicit proceed, prepare or stop decision where the agent-readiness method applies, or an IDAO release plan covering acceptance, integration, monitoring, fallback, support and people.",
    methods: [
      { name: "IDAO delivery gate", href: "/methodologies/idao", reason: "Use the canonical gate for a governed implementation and move into Operate only with the required release and ownership evidence." },
      { name: "Agentic Operations Readiness when agent-based", href: "/methodologies/agentic-operations-readiness", reason: "Test the six operating conditions for the actual agent workflow; a promising demo does not automatically earn release." },
      { name: "Human–Agent Operating Model when work changes", href: "/methodologies/human-agent-operating-model", reason: "Design responsibilities, decision rights, enablement and adoption where everyday work will change." },
    ],
    actions: [
      { label: "Review the IDAO gate", href: "/methodologies/idao" },
      { label: "Assess agent operating conditions", href: "/methodologies/agentic-operations-readiness" },
      { label: "Design changed work", href: "/methodologies/human-agent-operating-model" },
    ],
    idao: "Remain in Demonstrate while evidence is insufficient; enter Activate when governed implementation is justified, then Operate once release, ownership and support evidence are in place.",
    authority: "Set authority for each consequential handover before it operates. The approved guardrails-versus-authority distinction helps separate control requirements from the authority ceiling.",
  },
  {
    id: "proven-expansion",
    label: "AI works in one area. We need to expand it.",
    context: "Live use with evidence of value",
    summary: "We have evidence of value in an existing live setting. We need to decide what can be reused and what must change for other teams, locations or workloads.",
    assets: "An operating use case has a baseline, demonstrated benefit, an owner and service or control experience; the new context may differ in data, language, permissions or accountability.",
    decision: "What can be reused, what changes, and where should expansion proceed?",
    output: "An expansion decision and prioritized dependencies, with validated reuse assumptions, people and control changes, and renewed evidence where needed.",
    methods: [
      { name: "IDAO Operate and loopback", href: "/methodologies/idao", reason: "Use operating evidence to inform expansion; new contexts may need Demonstrate or Activate rather than a blanket scale approval." },
      { name: "AI Value-to-Scale", href: "/methodologies/ai-value-to-scale", reason: "Use for repeated organizational constraints and evidence gaps across teams or locations, not as a financial business-case calculator." },
      { name: "AI Use-Case Prioritization", href: "/methodologies/ai-use-case-prioritization", reason: "Compare expansion choices when there are several candidate teams, contexts or workloads." },
      { name: "Human–Agent Operating Model", href: "/methodologies/human-agent-operating-model", reason: "Use where changed roles, capability, incentives, adoption or handovers determine whether reuse will hold." },
    ],
    actions: [
      { label: "Review expansion through IDAO", href: "/methodologies/idao" },
      { label: "Assess organizational constraints", href: "/methodologies/ai-value-to-scale" },
      { label: "Compare expansion choices", href: "/methodologies/ai-use-case-prioritization" },
    ],
    idao: "Operate evidence can inform expansion. Enter Demonstrate or Activate again where the new context changes the evidence; materially new opportunities may return to Innovate.",
    authority: "Revisit each consequential handover when exposure, scope, evidence or operating context changes. Guardrails remain complementary to the canonical authority decision.",
  },
  {
    id: "underperformance",
    label: "Our AI is in use, but the results are falling short.",
    context: "Live use, results below expectation",
    summary: "AI is already part of the work, but the benefits, quality, cost or adoption are disappointing. We need to identify the cause and decide whether to improve, redesign, replace or stop it.",
    assets: "A live deployment and some usage or performance evidence exist; a measurement gap must be acknowledged rather than filled with an assumed result.",
    decision: "Why are the results insufficient, and should we improve, redesign, replace, reduce scope or stop?",
    output: "A diagnosis against an agreed baseline and outcome, a targeted corrective decision with an owner, and a retest or stop criterion.",
    methods: [
      { name: "IDAO operating evidence and loopback", href: "/methodologies/idao", reason: "Use live evidence to improve, constrain or return to the responsible earlier decision; do not automatically prescribe another pilot." },
      { name: "Human–Agent Operating Model", href: "/methodologies/human-agent-operating-model", reason: "Use directly when responsibilities, incentives, capabilities, adoption or handovers are the known cause." },
      { name: "AI Value-to-Scale", href: "/methodologies/ai-value-to-scale", reason: "Use for repeated systemic constraints across the organization, not as a universal failure score." },
      { name: "Agentic Operations Readiness when conditions fail", href: "/methodologies/agentic-operations-readiness", reason: "Use for an unsafe or underperforming agent workflow to identify unresolved operating conditions." },
    ],
    actions: [
      { label: "Review operating evidence in IDAO", href: "/methodologies/idao" },
      { label: "Open work-design playbook", href: "/methodologies/human-agent-operating-model" },
      { label: "Review organizational constraints", href: "/methodologies/ai-value-to-scale" },
    ],
    idao: "Stay in Operate for bounded improvement when the proposition remains sound; return to Demonstrate or Innovate when assumptions fail. Stop or constrain unsafe or unviable work.",
    authority: "If a known problem concerns a consequential handover, use Agent Authority directly and reassess when exposure, scope or evidence changes. Review the existing guardrails distinction alongside it.",
  },
];

const tabs = ["Your route", "Methods", "Governance"] as const;
type Tab = (typeof tabs)[number];

export function DecisionIntake() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Your route");
  const selected = situations.find((item) => item.id === selectedId);
  const choose = (id: string) => {
    setSelectedId(id);
    setTab("Your route");
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#f4f3ed] text-[#172a3b]" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div className="mx-auto max-w-[1280px] px-5 py-8 sm:px-10 sm:py-11">
        <header className="flex items-center justify-between border-b border-[#c8c9bf] pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#19334a] text-sm font-semibold text-[#f1b293]">C</span>
            <span className="text-[11px] font-bold uppercase tracking-[.2em]">Cognirise <span className="font-normal text-[#66736f]">/ Method guide</span></span>
          </div>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[.19em] text-[#718078] sm:block">A decision before a methodology</span>
        </header>

        <section className="grid gap-8 pb-9 pt-9 md:grid-cols-[.82fr_1.18fr] md:items-end md:gap-14 md:pb-12 md:pt-14">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[.2em] text-[#6847c6]">Field guide <span className="px-2 text-[#b5b5a8]">—</span> 01 / 02</p>
            <h1 className="max-w-[600px] text-[clamp(38px,5.5vw,68px)] font-medium leading-[.98] tracking-[-.065em]" style={{ fontFamily: "Comfortaa, Inter, sans-serif" }}>Start with the decision.<br/><span className="font-semibold text-[#bd398e]">Not the method.</span></h1>
          </div>
          <div className="max-w-[520px] pb-1 md:justify-self-end">
            <p className="text-[16px] leading-[1.7] text-[#52625f]">A practical route through your current AI situation. Choose the closest fit to see the decision, evidence and work that should come next.</p>
            <div className="mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.13em] text-[#718078]">
              <span className={`h-[3px] w-10 bg-gradient-to-r from-[#7048ce] via-[#cb4299] to-[#ef7c70]`} />
              <span>01 Understand</span>
              <span className={`h-px w-8 ${selected ? "bg-[#6847c6]" : "bg-[#c8c9bf]"}`} />
              <span className={selected ? "text-[#6847c6]" : ""}>02 Get your route</span>
            </div>
          </div>
        </section>

        {!selected ? (
          <section className="border-t border-[#19334a]">
            <div className="flex flex-wrap items-baseline justify-between gap-3 py-5">
              <h2 className="text-[22px] font-medium tracking-[-.035em]" style={{ fontFamily: "Comfortaa, Inter, sans-serif" }}>Where are you in the work?</h2>
              <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#718078]">Choose any one · not a sequence <span aria-hidden="true">↘</span></span>
            </div>
            <div className="border-t border-[#19334a]">
              {situations.map((item, index) => (
                <button key={item.id} type="button" onClick={() => choose(item.id)} className="group grid w-full grid-cols-[44px_1fr_auto] items-center gap-x-3 border-b border-[#c8c9bf] py-4 text-left transition-colors hover:bg-[#eeede7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6847c6] sm:grid-cols-[58px_minmax(0,1fr)_minmax(180px,.62fr)_24px] sm:gap-x-5 sm:py-[17px]">
                  <span className="font-mono text-[11px] text-[#6847c6]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-[15px] font-semibold leading-[1.35] tracking-[-.02em] text-[#19334a] sm:text-[16px]">{item.label}</span>
                  <span className="col-start-2 mt-1 text-[11px] leading-relaxed text-[#718078] sm:col-start-3 sm:row-start-1 sm:mt-0">{item.context}</span>
                  <span className="col-start-3 row-start-1 text-[16px] text-[#bd398e] transition-transform group-hover:translate-x-1 sm:col-start-4" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-[#718078]">Not sure? Choose the situation that describes the decision you need to make now. Each route stands on its own; the seven situations are not a prescribed sequence.</p>
          </section>
        ) : (
          <section className="grid border-t border-[#19334a] md:grid-cols-[255px_1fr]">
            <aside className="border-b border-[#c8c9bf] py-5 md:border-b-0 md:border-r md:pr-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#718078]">Your starting point</span>
              <button type="button" onClick={() => setSelectedId(null)} className="text-[11px] font-semibold text-[#6847c6] underline decoration-[#cc9cc9] underline-offset-4 hover:text-[#19334a]">Change</button>
              </div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#718078]">All situations · choose any</p>
              <nav aria-label="Choose another situation" className="space-y-1">
                {situations.map((item, index) => (
                  <button key={item.id} type="button" aria-current={item.id === selected.id ? "true" : undefined} onClick={() => choose(item.id)} className={`flex w-full gap-3 border-l-2 px-3 py-3 text-left text-[12px] leading-snug transition-colors ${item.id === selected.id ? "border-[#6847c6] bg-[#e9e8df] font-semibold text-[#19334a]" : "border-transparent text-[#718078] hover:bg-[#eeede5] hover:text-[#19334a]"}`}>
                    <span className="font-mono text-[10px] text-[#6847c6]">{String(index + 1).padStart(2, "0")}</span><span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </aside>
            <div className="min-w-0 md:pl-8">
              <div className="border-b border-[#c8c9bf] py-6 sm:py-8">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#b9beb3] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-[#65736e]">Situation {String(situations.findIndex((item) => item.id === selected.id) + 1).padStart(2, "0")}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#6847c6]">{selected.context} <span className="text-[#bd398e]">/</span> Recommended next decision</span>
                </div>
                <h2 className="max-w-[800px] text-[clamp(28px,4vw,46px)] font-medium leading-[1.05] tracking-[-.05em]" style={{ fontFamily: "Comfortaa, Inter, sans-serif" }}>{selected.label}</h2>
                <p className="mt-4 max-w-[720px] text-[15px] leading-[1.65] text-[#52625f]">{selected.summary}</p>
              </div>

              <div className="flex gap-5 overflow-x-auto border-b border-[#c8c9bf]" role="tablist" aria-label="Route details">
                {tabs.map((item) => (
                  <button key={item} id={`tab-${item}`} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`relative shrink-0 py-4 text-[11px] font-semibold transition-colors ${tab === item ? "text-[#19334a]" : "text-[#718078] hover:text-[#19334a]"}`}>
                    {item}{tab === item && <span className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-gradient-to-r from-[#7048ce] via-[#cb4299] to-[#ef7c70]" />}
                  </button>
                ))}
              </div>

              <div role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-[250px] py-6 sm:py-7">
                {tab === "Your route" && (
                  <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#6847c6]">What you may already have</p>
                      <p className="text-[14px] leading-[1.7] text-[#52625f]">{selected.assets}</p>
                      <div className="mt-7 border-l-2 border-[#19334a] pl-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#718078]">The decision</p>
                        <p className="text-[17px] font-medium leading-[1.45] tracking-[-.02em]">{selected.decision}</p>
                      </div>
                    </div>
                    <div className="bg-[#e7e7e2] p-5 sm:p-6">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[.17em] text-[#6847c6]">Work toward this output</p>
                      <p className="text-[14px] leading-[1.75] text-[#405653]">{selected.output}</p>
                      <button type="button" onClick={() => setTab("Methods")} className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold text-[#19334a] underline decoration-[#cc9cc9] underline-offset-4">See methods that fit <span aria-hidden="true">→</span></button>
                    </div>
                    <div className="lg:col-span-2">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#718078]">Explore the next move</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-3">
                        {selected.actions.map((action) => (
                          <a key={action.label} href={action.href} className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#19334a] underline decoration-[#cc9cc9] underline-offset-4 transition-colors hover:text-[#6847c6]">{action.label}<span aria-hidden="true">↗</span></a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {tab === "Methods" && (
                  <div>
                    <p className="mb-5 max-w-xl text-[13px] leading-relaxed text-[#718078]">Methods are selected for the question—not prescribed as a sequence. Open the one that matches the decision you need to make.</p>
                    <div className="divide-y divide-[#c8c9bf] border-y border-[#c8c9bf]">
                      {selected.methods.map((method, index) => (
                        <a key={method.name} href={method.href} className="group flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                          <span className="flex gap-3 text-[14px] font-semibold text-[#19334a]"><span className="font-mono text-[10px] font-normal text-[#6847c6]">0{index + 1}</span><span className="underline decoration-[#c8c9bf] underline-offset-4 group-hover:decoration-[#bd398e]">{method.name}</span></span>
                          <span className="max-w-[470px] text-[12px] leading-relaxed text-[#65736e] sm:text-right">{method.reason}</span>
                        </a>
                      ))}
                    </div>
                    <a href="/methodologies/idao" className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold text-[#6847c6] underline underline-offset-4">Open IDAO framework <span aria-hidden="true">↗</span></a>
                  </div>
                )}
                {tab === "Governance" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <article className="border-t-2 border-[#19334a] bg-[#f8f7f1] p-5">
                      <p className="mb-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#718078]">01 <span className="px-2 text-[#c2c0b5]">/</span> Delivery gates</p>
                      <a href="/methodologies/idao" className="text-[15px] font-semibold text-[#19334a] underline decoration-[#c8c9bf] underline-offset-4">IDAO Delivery Framework ↗</a>
                      <p className="mt-3 text-[13px] leading-[1.7] text-[#52625f]">{selected.idao}</p>
                    </article>
                    <article className="border-t-2 border-[#bd398e] bg-[#f8f7f1] p-5">
                      <p className="mb-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#718078]">02 <span className="px-2 text-[#c2c0b5]">/</span> Consequential handovers</p>
                      <a href="/methodologies/agent-authority-model" className="text-[15px] font-semibold text-[#19334a] underline decoration-[#c8c9bf] underline-offset-4">Agent Authority Model ↗</a>
                      <p className="mt-3 text-[13px] leading-[1.7] text-[#52625f]">{selected.authority}</p>
                    </article>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#c8c9bf] py-4">
                <button type="button" onClick={() => setSelectedId(null)} className="text-[11px] font-semibold text-[#65736e] hover:text-[#19334a]">← Revisit starting question</button>
                <span className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8b9185]">Evidence first · Methods second</span>
              </div>
            </div>
          </section>
        )}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#c8c9bf] pt-4 text-[9px] font-semibold uppercase tracking-[.16em] text-[#818a7f]">
          <span>Decision routes / Cognirise methodology</span>
          <span>IDAO entry remains evidence-dependent</span>
        </footer>
      </div>
    </main>
  );
}