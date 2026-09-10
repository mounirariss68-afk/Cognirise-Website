import { ArrowRight, Check, GitBranch, ShieldCheck, Users } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useDynamicMetadata } from "@/lib/metadata";

const DESIGN_STEPS = [
  {
    number: "01",
    title: "Trace the live work",
    description: "Map the work as it happens: demand, decisions, exceptions, queues, evidence and the people who carry hidden coordination.",
    output: "Work and handover baseline",
  },
  {
    number: "02",
    title: "Redesign roles and handovers",
    description: "Decide what people lead, what agents support or execute, and how ownership moves without losing context or accountability.",
    output: "Role and handover design",
  },
  {
    number: "03",
    title: "Set decision rights",
    description: "Name who proposes, approves, acts, intervenes and remains accountable for each consequential decision and handover.",
    output: "Decision-rights map",
  },
  {
    number: "04",
    title: "Build operating capability",
    description: "Define the judgement, supervision, exception handling, evidence literacy and improvement routines each role needs.",
    output: "Capability and enablement plan",
  },
  {
    number: "05",
    title: "Align incentives and measures",
    description: "Remove targets that reward unsafe automation or hidden rework. Measure confident use, intervention, quality and sustained outcomes.",
    output: "Adoption measures and incentive changes",
  },
] as const;

const DECISION_RIGHTS = [
  ["Frame", "Sets the outcome, boundaries and evidence required", "Contributes options and operating evidence"],
  ["Recommend", "Challenges assumptions and interprets context", "Produces traceable analysis or a proposed next action"],
  ["Approve", "Retains authority where exposure requires it", "Waits at the defined gate and preserves the approval record"],
  ["Act", "Handles exceptions and actions reserved for people", "Executes only within its permitted authority and constraints"],
  ["Intervene", "Pauses, overrides, escalates or demotes authority", "Surfaces thresholds, uncertainty and control breaches"],
] as const;

const MEASURES = [
  {
    title: "Use",
    measures: ["Eligible work using the new route", "Active use by role and team", "Fallback to the old process"],
  },
  {
    title: "Control",
    measures: ["Interventions made in time", "Exceptions resolved by the named owner", "Authority demotions and control breaches"],
  },
  {
    title: "Capability",
    measures: ["Observed proficiency in live work", "Confidence to challenge an agent output", "Time to independent operation"],
  },
  {
    title: "Outcome",
    measures: ["Quality and cycle-time movement", "Rework displaced rather than hidden", "Value sustained after handover"],
  },
] as const;

function Kicker({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] ${inverse ? "text-white/70" : "text-[#102957]"}`}>
      <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
      {children}
    </div>
  );
}

export default function HumanAgentOperatingModel() {
  useDynamicMetadata({
    title: "Human–Agent Operating Model Playbook | Cognirise",
    description: "A practical playbook for redesigning roles, decision rights, handovers, capabilities, incentives and adoption when AI enters live work.",
    canonicalUrl: `${window.location.origin}/methodologies/human-agent-operating-model`,
  });

  return (
    <article className="overflow-hidden bg-[#fdfcfb] text-[#102957]">
      <header className="px-6 pb-20 pt-10 md:px-[4.8vw] lg:pb-28">
        <Kicker>Methodologies & frameworks / 04</Kicker>
        <div className="mt-8 grid gap-12 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]">Human–Agent Operating Model Playbook</p>
            <h1 className="mt-5 max-w-[900px] font-display text-[clamp(52px,7.6vw,112px)] font-semibold leading-[.88] tracking-[-.09em]">
              Redesign the work, not just the technology.
            </h1>
          </div>
          <div className="border-t border-[#102957] pt-6">
            <p className="text-[19px] leading-[1.6] text-[#405777]">
              Turn an AI-enabled workflow into a clear operating agreement between people and agents—who owns the outcome, who may decide, how handovers work and what proves the model is taking hold.
            </p>
            <a href="#playbook" className="mt-8 inline-flex items-center gap-2 border-b border-[#102957] pb-2 text-sm font-bold">
              See the playbook <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </header>

      <section className="border-y border-[#cbd3e1] bg-[#f1f3f7] px-6 py-20 md:px-[4.8vw] lg:py-24" aria-labelledby="not-rollout">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-[8vw]">
          <div>
            <Kicker>The boundary</Kicker>
            <h2 id="not-rollout" className="mt-5 font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[.96] tracking-[-.08em]">A rollout installs a tool. An operating model changes how work runs.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="border-t-4 border-[#9ba9bf] bg-white p-6">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#647491]">Technology rollout and training</span>
              <ul className="mt-5 space-y-3 text-sm leading-[1.55] text-[#536887]">
                {["Configures access and integrations", "Explains features and prompts", "Tracks attendance, licences and usage", "Supports initial technical adoption"].map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="border-t-4 border-[hsl(var(--brand-pink))] bg-[#102957] p-6 text-white">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#ff9fcf]">Operating-model change</span>
              <ul className="mt-5 space-y-3 text-sm leading-[1.55] text-[#d6deed]">
                {["Changes roles, accountabilities and spans", "Reallocates decision and intervention rights", "Redesigns handovers, controls and incentives", "Proves outcomes persist in live operation"].map((item) => <li key={item} className="flex gap-2"><Check size={15} className="mt-1 shrink-0 text-[#ff9fcf]" />{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="playbook" className="scroll-mt-20 px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="playbook-title">
        <div className="max-w-[850px]">
          <Kicker>Five design moves</Kicker>
          <h2 id="playbook-title" className="mt-5 font-display text-[clamp(42px,5.7vw,82px)] font-semibold leading-[.95] tracking-[-.085em]">Start with one real workflow. Finish with an operable design.</h2>
        </div>
        <ol className="mt-14 border-l border-t border-[#cbd3e1] lg:grid lg:grid-cols-5">
          {DESIGN_STEPS.map((step) => (
            <li key={step.number} className="flex min-h-[355px] flex-col border-b border-r border-[#cbd3e1] p-6">
              <span className="text-[10px] font-bold text-[hsl(var(--brand-pink))]">{step.number}</span>
              <h3 className="mt-9 font-display text-[26px] font-semibold leading-[1.02] tracking-[-.055em]">{step.title}</h3>
              <p className="mt-4 text-sm leading-[1.6] text-[#536887]">{step.description}</p>
              <p className="mt-auto border-t border-[#dce2eb] pt-4 text-xs font-bold leading-[1.45]">{step.output}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#071936] px-6 py-20 text-white md:px-[4.8vw] lg:py-28" aria-labelledby="rights-title">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-[7vw]">
          <div>
            <Kicker inverse>Decision-rights map</Kicker>
            <h2 id="rights-title" className="mt-5 font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[.96] tracking-[-.08em]">Make authority visible at every move.</h2>
            <p className="mt-6 text-[16px] leading-[1.65] text-[#b9c7db]">A role title is not a control. The map records what the person and agent may do at each point, the evidence they need and the condition that moves authority back to a person.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead><tr className="border-b border-white/40 text-[10px] uppercase tracking-[.12em] text-white/55"><th className="p-4">Right</th><th className="p-4">Person</th><th className="p-4">Agent</th></tr></thead>
              <tbody>{DECISION_RIGHTS.map(([right, person, agent]) => <tr key={right} className="border-b border-white/15 text-sm leading-[1.5]"><th className="p-4 text-[#ff9fcf]">{right}</th><td className="p-4 text-[#dce4f0]">{person}</td><td className="p-4 text-[#b9c7db]">{agent}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="mt-12 grid gap-6 border border-white/20 bg-[#0b2247] p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
          <ShieldCheck className="text-[#ff9fcf]" size={34} />
          <div><h3 className="font-display text-2xl font-semibold tracking-[-.04em]">Consequential handovers need an authority ceiling.</h3><p className="mt-2 text-sm leading-[1.6] text-[#b9c7db]">For every decision or action that can materially affect a person, record, system or service, use the Agent Authority Model to set permitted autonomy, intervention and automatic demotion.</p></div>
          <BrandButton href="/methodologies/agent-authority-model" variant="inverse">Set the authority</BrandButton>
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="capability-title">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Kicker>Capability, not attendance</Kicker>
            <h2 id="capability-title" className="mt-5 font-display text-[clamp(40px,5vw,70px)] font-semibold leading-[.97] tracking-[-.08em]">Prepare people to operate, challenge and improve the system.</h2>
            <p className="mt-6 max-w-[620px] text-[16px] leading-[1.65] text-[#405777]">The capability plan is role-specific. It combines practice in live scenarios, observed proficiency and support at the moment of work—not a generic course-completion target.</p>
          </div>
          <div className="grid gap-px bg-[#cbd3e1] sm:grid-cols-2">
            {[
              [Users, "Role practice", "Rehearse the normal route, exceptions and fallback with the people who will own them."],
              [ShieldCheck, "Control fluency", "Recognise uncertainty, challenge evidence, intervene and document why authority changed."],
              [GitBranch, "Handover discipline", "Pass context, state and accountability without creating shadow coordination."],
              [ArrowRight, "Improvement ownership", "Use operating evidence to adjust roles, controls and workflow—not only the model."],
            ].map(([Icon, title, body]) => {
              const CapabilityIcon = Icon as typeof Users;
              return <div key={title as string} className="bg-[#f3f5f8] p-6"><CapabilityIcon size={22} className="text-[hsl(var(--brand-pink))]" /><h3 className="mt-5 font-display text-2xl font-semibold tracking-[-.045em]">{title as string}</h3><p className="mt-3 text-sm leading-[1.6] text-[#536887]">{body as string}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-[#cbd3e1] bg-[#f1f3f7] px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="measures-title">
        <Kicker>Adoption and sustained operation</Kicker>
        <div className="mt-5 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <h2 id="measures-title" className="font-display text-[clamp(40px,5.2vw,74px)] font-semibold leading-[.96] tracking-[-.08em]">Measure behaviour, control and outcomes—not logins alone.</h2>
          <p className="border-t border-[#102957] pt-5 text-[17px] leading-[1.65] text-[#405777]">Activation begins when the redesigned route can run safely in live work. Sustained operation begins when the client team owns the routines, evidence and improvement cycle.</p>
        </div>
        <div className="mt-12 grid border-l border-t border-[#cbd3e1] md:grid-cols-2 lg:grid-cols-4">
          {MEASURES.map((group) => <div key={group.title} className="border-b border-r border-[#cbd3e1] bg-white p-6"><h3 className="font-display text-2xl font-semibold tracking-[-.05em]">{group.title}</h3><ul className="mt-5 space-y-3 text-sm leading-[1.5] text-[#536887]">{group.measures.map((measure) => <li key={measure} className="border-l-2 border-[hsl(var(--brand-pink))] pl-3">{measure}</li>)}</ul></div>)}
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="idao-connection">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-[8vw]">
          <div><Kicker>Connection to IDAO</Kicker><h2 id="idao-connection" className="mt-5 font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[.96] tracking-[-.08em]">Design before launch. Learn after it.</h2></div>
          <div className="border-t border-[#102957] pt-6">
            <p className="text-[17px] leading-[1.65] text-[#405777]"><strong className="text-[#102957]">Activate</strong> uses the role, rights, capability and measure designs to prepare the live workflow, rehearse exceptions and confirm ownership.</p>
            <p className="mt-5 text-[17px] leading-[1.65] text-[#405777]"><strong className="text-[#102957]">Operate</strong> uses real performance, interventions and workforce evidence to improve the model and return weak assumptions to the right IDAO stage.</p>
            <BrandButton href="/methodologies/idao#lifecycle" className="mt-8">Explore the IDAO lifecycle</BrandButton>
          </div>
        </div>
      </section>

      <section className="bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-24">
        <Kicker inverse>Start with live work</Kicker>
        <h2 className="mt-5 max-w-[940px] font-display text-[clamp(44px,6vw,88px)] font-semibold leading-[.93] tracking-[-.085em]">Bring one workflow where people and agents must work together.</h2>
        <p className="mt-6 max-w-[650px] text-[16px] leading-[1.65] text-[#d6deed]">We will identify the first operating-model decision, the evidence it needs and the right IDAO entry point.</p>
        <BrandButton href="/value-scan" variant="inverse" className="mt-8">Book a Value Scan</BrandButton>
      </section>
    </article>
  );
}