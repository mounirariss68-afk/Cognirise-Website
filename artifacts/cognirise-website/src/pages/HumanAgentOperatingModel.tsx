import { ArrowRight, ArrowDown, Check, GitBranch, ShieldCheck, Users } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useDynamicMetadata } from "@/lib/metadata";
import { MethodologyRelationship } from "@/components/MethodologyRelationship";
import { MethodPageHero } from "@/components/MethodPageHero";

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
      <MethodPageHero
        breadcrumb="Methodologies / 04"
        title="Redesign the work, not just the technology."
        description="Turn an AI-enabled workflow into a clear operating agreement between people and agents—who owns the outcome, who may decide, how handovers work and what proves the model is taking hold."
        imageSrc="/images/cognirise/method-haom-v2.jpg"
        imageAlt="Cinematic raster composition showing human-agent interaction and handovers"
        imageCaptionSubtitle="Human-Agent Operating Model Playbook"
        imageCaptionTitle="Collaboration without shadow coordination."
      />

      <MethodologyRelationship
        startHereWhen={<>An AI capability is entering live work, requiring changes to roles, rights, handovers, incentives, and operational measures.</>}
        decision={<>How must roles, rights and handovers change when AI enters real work?</>}
        output={<>A role and handover design, decision-rights map, capability plan, incentive changes, and adoption measures.</>}
        connectsToIdao={<>Shapes roles, handovers, capabilities, incentives and measures throughout Innovate, Demonstrate, Activate and Operate. Live evidence can return weak assumptions to the responsible stage.</>}
        connectsToAuthority={<>Converts identified handovers into explicit propose, approve, act, intervene and demotion rights. Uses the Agent Authority Model calculation to bound the autonomy of those rights.</>}
        reassessWhen={<>Agents gain new capabilities, exception volume overwhelms human supervisors, or business incentives drift away from the workflow's purpose.</>}
        doesNotDecide={<>If the underlying workflow is stable enough to automate (use Agentic Operations Readiness).</>}
      />

      <section className="border-y border-[#cbd3e1] bg-[#f3f5f8] px-6 py-20 md:px-[4.8vw] lg:py-28 relative overflow-hidden" aria-labelledby="not-rollout">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[radial-gradient(circle_at_top_right,rgba(255,119,93,0.1),transparent_70%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative z-10 grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
              <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              The Boundary
            </div>
            <h2 id="not-rollout" className="font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[.96] tracking-[-.05em]">A rollout installs a tool. An operating model changes how work runs.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:border-l border-[#cbd3e1] lg:pl-12">
            <div className="border-t-4 border-[#cbd3e1] bg-white p-8 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491] block mb-6">Technology rollout</span>
              <ul className="space-y-4 text-[14px] leading-relaxed text-[#536887]">
                {["Configures access and integrations", "Explains features and prompts", "Tracks attendance, licences and usage", "Supports initial technical adoption"].map((item) => <li key={item} className="flex gap-3"><ArrowRight size={14} className="mt-1 shrink-0 text-[#cbd3e1]" />{item}</li>)}
              </ul>
            </div>
            <div className="border-t-4 border-[hsl(var(--brand-pink))] bg-[#102957] p-8 text-white shadow-md relative">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ff9fcf] block mb-6">Operating-model change</span>
              <ul className="space-y-4 text-[14px] leading-relaxed text-[#d6deed]">
                {["Changes roles, accountabilities and spans", "Reallocates decision and intervention rights", "Redesigns handovers, controls and incentives", "Proves outcomes persist in live operation"].map((item) => <li key={item} className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-[#ff9fcf]" />{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="playbook" className="scroll-mt-20 px-6 py-20 md:px-[4.8vw] lg:py-32 bg-[#fdfcfb]" aria-labelledby="playbook-title">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[850px] mb-16">
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
              <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              Five design moves
            </div>
            <h2 id="playbook-title" className="font-display text-[clamp(42px,5.7vw,82px)] font-semibold leading-[.95] tracking-[-.05em]">Start with one real workflow. Finish with an operable design.</h2>
          </div>
          <ol className="grid gap-px bg-[#cbd3e1] lg:grid-cols-5 border border-[#cbd3e1]">
            {DESIGN_STEPS.map((step) => (
              <li key={step.number} className="flex flex-col bg-white p-8 lg:p-10 hover:bg-[#f3f5f8] transition-colors group">
                <span className="text-[12px] font-bold tracking-[0.15em] text-[hsl(var(--brand-pink))] mb-6 block">{step.number}</span>
                <h3 className="font-display text-[26px] font-semibold leading-[1.1] tracking-[-.03em] mb-4 text-[#102957] group-hover:text-[hsl(var(--brand-pink))] transition-colors">{step.title}</h3>
                <p className="text-[14px] leading-relaxed text-[#536887] mb-12">{step.description}</p>
                <div className="mt-auto border-t border-[#cbd3e1] pt-5">
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-[#647491] mb-2">Output</span>
                  <strong className="text-[13px] font-bold text-[#102957]">{step.output}</strong>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#071936] px-6 py-20 text-white md:px-[4.8vw] lg:py-32 relative overflow-hidden" aria-labelledby="rights-title">
        <div className="absolute bottom-0 right-0 w-[60vw] h-[60vw] bg-[radial-gradient(circle_at_bottom_right,rgba(255,119,93,0.15),transparent_60%)] pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="mb-20 border border-white/20 bg-white/5 p-8 lg:p-12 shadow-2xl">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#ff9fcf] mb-8 text-center">Handover Choreography across IDAO</h3>
            <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-6 items-center">
              <div className="text-center p-6 border border-white/10 bg-[#0b1c3d] shadow-inner"><span className="text-[11px] font-bold block mb-2 text-white/50 uppercase tracking-[0.15em]">Innovate</span><p className="text-[13px] text-[#b9c7db] leading-relaxed">Identify roles and constraints.</p></div>
              <ArrowRight className="text-white/30 hidden md:block mx-auto" size={24} /><ArrowDown className="text-white/30 md:hidden mx-auto" size={24} />
              <div className="text-center p-6 border border-white/10 bg-[#0b1c3d] shadow-inner"><span className="text-[11px] font-bold block mb-2 text-white/50 uppercase tracking-[0.15em]">Demonstrate</span><p className="text-[13px] text-[#b9c7db] leading-relaxed">Test handover logic safely.</p></div>
              <ArrowRight className="text-white/30 hidden md:block mx-auto" size={24} /><ArrowDown className="text-white/30 md:hidden mx-auto" size={24} />
              <div className="text-center p-6 border border-[hsl(var(--brand-coral))]/50 bg-[hsl(var(--brand-coral))]/10 shadow-[0_0_30px_rgba(255,119,93,0.1)] relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-[hsl(var(--brand-coral))]" />
                <span className="text-[11px] block mb-2 text-[hsl(var(--brand-coral))] uppercase tracking-[0.15em] font-bold">Activate</span>
                <p className="text-[13px] text-white leading-relaxed font-medium">Install explicit rights pointing to Agent Authority.</p>
              </div>
              <ArrowRight className="text-white/30 hidden md:block mx-auto" size={24} /><ArrowDown className="text-white/30 md:hidden mx-auto" size={24} />
              <div className="text-center p-6 border border-white/10 bg-[#0b1c3d] shadow-inner"><span className="text-[11px] font-bold block mb-2 text-white/50 uppercase tracking-[0.15em]">Operate</span><p className="text-[13px] text-[#b9c7db] leading-relaxed">Measure and loop back.</p></div>
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#d6deed] mb-5">
                <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
                Decision-rights map
              </div>
              <h2 id="rights-title" className="font-display text-[clamp(42px,5vw,72px)] font-semibold leading-[.96] tracking-[-.05em]">Make authority visible at every move.</h2>
              <p className="mt-8 text-[18px] leading-relaxed text-[#b9c7db]">A role title is not a control. The map records what the person and agent may do at each point, the evidence they need and the condition that moves authority back to a person.</p>
            </div>
            
            <div className="overflow-x-auto bg-[#0b1c3d] border border-white/20 p-1 lg:p-8">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead><tr className="border-b border-white/20 text-[11px] font-bold uppercase tracking-[0.15em] text-white/50"><th className="p-5">Right</th><th className="p-5">Person</th><th className="p-5">Agent</th></tr></thead>
                <tbody>{DECISION_RIGHTS.map(([right, person, agent]) => <tr key={right} className="border-b border-white/10 text-[14px] leading-relaxed hover:bg-white/5 transition-colors"><th className="p-5 text-[#ff9fcf] font-bold">{right}</th><td className="p-5 text-[#dce4f0]">{person}</td><td className="p-5 text-[#b9c7db]">{agent}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="mt-16 grid gap-8 border-l-4 border-[hsl(var(--brand-coral))] bg-[#0b1c3d] p-8 lg:p-10 md:grid-cols-[auto_1fr_auto] md:items-center">
            <ShieldCheck className="text-[hsl(var(--brand-coral))] hidden md:block" size={48} />
            <div>
              <h3 className="font-display text-[28px] font-semibold tracking-[-.03em] text-white mb-3">Consequential handovers need an authority ceiling.</h3>
              <p className="text-[15px] leading-relaxed text-[#b9c7db] max-w-3xl">For every explicit propose, approve, act, intervene, and demotion right that can materially affect a person, record, system or service, point to the Agent Authority Model calculation to set permitted autonomy.</p>
            </div>
            <BrandButton href="/methodologies/agent-authority-model" variant="inverse" className="whitespace-nowrap w-fit">Set the authority</BrandButton>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-32 bg-[#f3f5f8]" aria-labelledby="capability-title">
        <div className="max-w-[1200px] mx-auto grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
              <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              Capability, not attendance
            </div>
            <h2 id="capability-title" className="font-display text-[clamp(42px,5vw,72px)] font-semibold leading-[.95] tracking-[-.05em]">Prepare people to operate, challenge and improve the system.</h2>
            <p className="mt-8 text-[18px] leading-relaxed text-[#405777]">The capability plan is role-specific. It combines practice in live scenarios, observed proficiency and support at the moment of work—not a generic course-completion target.</p>
          </div>
          <div className="grid gap-px bg-[#cbd3e1] sm:grid-cols-2 border border-[#cbd3e1]">
            {[
              [Users, "Role practice", "Rehearse the normal route, exceptions and fallback with the people who will own them."],
              [ShieldCheck, "Control fluency", "Recognise uncertainty, challenge evidence, intervene and document why authority changed."],
              [GitBranch, "Handover discipline", "Pass context, state and accountability without creating shadow coordination."],
              [ArrowRight, "Improvement ownership", "Use operating evidence to adjust roles, controls and workflow—not only the model."],
            ].map(([Icon, title, body]) => {
              const CapabilityIcon = Icon as typeof Users;
              return <div key={title as string} className="bg-white p-8 lg:p-10 hover:bg-[#fdfcfb] transition-colors"><CapabilityIcon size={28} className="text-[hsl(var(--brand-pink))] mb-6" /><h3 className="font-display text-[24px] font-semibold tracking-[-.03em] mb-4 text-[#102957]">{title as string}</h3><p className="text-[14px] leading-relaxed text-[#536887]">{body as string}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-[#cbd3e1] bg-white px-6 py-20 md:px-[4.8vw] lg:py-32" aria-labelledby="measures-title">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
            <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            Adoption and sustained operation
          </div>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 id="measures-title" className="font-display text-[clamp(42px,5.2vw,76px)] font-semibold leading-[.95] tracking-[-.05em]">Measure behaviour, control and outcomes—not logins alone.</h2>
            <p className="border-l border-[#cbd3e1] pl-8 lg:pl-10 text-[18px] leading-relaxed text-[#405777]">Activation begins when the redesigned route can run safely in live work. Sustained operation begins when the client team owns the routines, evidence and improvement cycle.</p>
          </div>
          <div className="mt-16 grid border border-[#cbd3e1] md:grid-cols-2 lg:grid-cols-4 bg-[#f3f5f8] gap-px">
            {MEASURES.map((group) => <div key={group.title} className="bg-white p-8 lg:p-10"><h3 className="font-display text-[24px] font-semibold tracking-[-.03em] mb-6 text-[#102957]">{group.title}</h3><ul className="space-y-4 text-[14px] leading-relaxed text-[#536887]">{group.measures.map((measure) => <li key={measure} className="border-l-2 border-[hsl(var(--brand-pink))] pl-4 py-1">{measure}</li>)}</ul></div>)}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-32 bg-[#fdfcfb]" aria-labelledby="idao-connection">
        <div className="max-w-[1200px] mx-auto grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
              <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              Connection to IDAO
            </div>
            <h2 id="idao-connection" className="font-display text-[clamp(42px,5vw,74px)] font-semibold leading-[.95] tracking-[-.05em]">Design before launch. Learn after it.</h2>
          </div>
          <div className="lg:border-l border-[#cbd3e1] lg:pl-12">
            <p className="text-[18px] leading-relaxed text-[#405777]"><strong className="text-[#102957] font-bold">Activate</strong> uses the role, rights, capability and measure designs to prepare the live workflow, rehearse exceptions and confirm ownership.</p>
            <p className="mt-6 text-[18px] leading-relaxed text-[#405777]"><strong className="text-[#102957] font-bold">Operate</strong> uses real performance, interventions and workforce evidence to improve the model and return weak assumptions to the right IDAO stage.</p>
            <BrandButton href="/methodologies/idao#lifecycle" className="mt-10">Explore the IDAO lifecycle</BrandButton>
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