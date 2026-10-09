import { ArrowRight, ArrowDown, Check, GitBranch, ShieldCheck, Users } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { MethodologyRelationship } from "@/components/MethodologyRelationship";
import { MethodPageHero } from "@/components/MethodPageHero";
import { humanAgentOperatingModelEditorial } from "@workspace/api-zod";
import { HAOM_EDITORIAL, HAOM_HERO } from "@/site/content/methods/human-agent-operating-model";
import { methodSeo } from "@/site/content/methods/seo";
import { MethodologyCmsDelivery, methodologyEditorial, methodologyHero, useMethodologyCmsContent, useMethodologyCmsSeo } from "@/components/MethodologyCmsLayout";

const CAPABILITY_ICONS = {
  users: Users,
  "shield-check": ShieldCheck,
  "git-branch": GitBranch,
  "arrow-right": ArrowRight,
} as const;

function Kicker({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] ${inverse ? "text-white/70" : "text-[#102957]"}`}>
      <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
      {children}
    </div>
  );
}

function HumanAgentOperatingModelContent() {
  const cms = useMethodologyCmsContent("human-agent-operating-model");
  useMethodologyCmsSeo(cms, methodSeo("/methodologies/human-agent-operating-model"));
  const editorial = methodologyEditorial<"human-agent-operating-model", typeof humanAgentOperatingModelEditorial>(
    "human-agent-operating-model",
    cms,
    HAOM_EDITORIAL,
  );
  const hero = methodologyHero(cms, HAOM_HERO);
  const DESIGN_STEPS = editorial.playbook.steps;
  const DECISION_RIGHTS = editorial.decisionRights.rows;
  const MEASURES = editorial.measures.groups;
  const [innovate, demonstrate, activate, operate] = editorial.handoverChoreography.stages;
    return (
    <article className="overflow-hidden bg-[#fdfcfb] text-[#102957]">
      <MethodPageHero
        {...hero}
        imageResolved={"imageResolved" in hero && hero.imageResolved}
      />

      <MethodologyRelationship
        startHereWhen={editorial.relationship.startHereWhen}
        decision={editorial.relationship.decision}
        output={editorial.relationship.output}
        connectsToIdao={editorial.relationship.connectsToIdao}
        connectsToAuthority={editorial.relationship.connectsToAuthority}
        reassessWhen={editorial.relationship.reassessWhen}
        doesNotDecide={editorial.relationship.doesNotDecide}
      />
      <section className="border-y border-[#cbd3e1] bg-[#f3f5f8] px-6 py-20 md:px-[4.8vw] lg:py-28 relative overflow-hidden" aria-labelledby="not-rollout">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[radial-gradient(circle_at_top_right,rgba(255,119,93,0.1),transparent_70%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative z-10 grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
              <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              {editorial.boundary.kicker}
            </div>
            <h2 id="not-rollout" className="font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[.96] tracking-[-.05em]">{editorial.boundary.heading}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:border-l border-[#cbd3e1] lg:pl-12">
            <div className="border-t-4 border-[#cbd3e1] bg-white p-8 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491] block mb-6">{editorial.boundary.technologyRollout.heading}</span>
              <ul className="space-y-4 text-[14px] leading-relaxed text-[#536887]">
                {editorial.boundary.technologyRollout.items.map((item) => <li key={item} className="flex gap-3"><ArrowRight size={14} className="mt-1 shrink-0 text-[#cbd3e1]" />{item}</li>)}
              </ul>
            </div>
            <div className="border-t-4 border-[hsl(var(--brand-pink))] bg-[#102957] p-8 text-white shadow-md relative">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ff9fcf] block mb-6">{editorial.boundary.operatingModelChange.heading}</span>
              <ul className="space-y-4 text-[14px] leading-relaxed text-[#d6deed]">
                {editorial.boundary.operatingModelChange.items.map((item) => <li key={item} className="flex gap-3"><Check size={16} className="mt-1 shrink-0 text-[#ff9fcf]" />{item}</li>)}
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
              {editorial.playbook.kicker}
            </div>
            <h2 id="playbook-title" className="font-display text-[clamp(42px,5.7vw,82px)] font-semibold leading-[.95] tracking-[-.05em]">{editorial.playbook.heading}</h2>
          </div>
          <ol className="grid gap-px bg-[#cbd3e1] lg:grid-cols-5 border border-[#cbd3e1]">
            {DESIGN_STEPS.map((step) => (
              <li key={step.id} className="flex flex-col bg-white p-8 lg:p-10 hover:bg-[#f3f5f8] transition-colors group">
                <span className="text-[12px] font-bold tracking-[0.15em] text-[hsl(var(--brand-pink))] mb-6 block">{step.number}</span>
                <h3 className="font-display text-[26px] font-semibold leading-[1.1] tracking-[-.03em] mb-4 text-[#102957] group-hover:text-[hsl(var(--brand-pink))] transition-colors">{step.title}</h3>
                <p className="text-[14px] leading-relaxed text-[#536887] mb-12">{step.description}</p>
                <div className="mt-auto border-t border-[#cbd3e1] pt-5">
                  <span className="block text-[10px] uppercase tracking-[0.15em] text-[#647491] mb-2">{editorial.playbook.outputLabel}</span>
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
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#ff9fcf] mb-8 text-center">{editorial.handoverChoreography.heading}</h3>
            <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-6 items-center">
              <div className="text-center p-6 border border-white/10 bg-[#0b1c3d] shadow-inner"><span className="text-[11px] font-bold block mb-2 text-white/50 uppercase tracking-[0.15em]">{innovate.stage}</span><p className="text-[13px] text-[#b9c7db] leading-relaxed">{innovate.body}</p></div>
              <ArrowRight className="text-white/30 hidden md:block mx-auto" size={24} /><ArrowDown className="text-white/30 md:hidden mx-auto" size={24} />
              <div className="text-center p-6 border border-white/10 bg-[#0b1c3d] shadow-inner"><span className="text-[11px] font-bold block mb-2 text-white/50 uppercase tracking-[0.15em]">{demonstrate.stage}</span><p className="text-[13px] text-[#b9c7db] leading-relaxed">{demonstrate.body}</p></div>
              <ArrowRight className="text-white/30 hidden md:block mx-auto" size={24} /><ArrowDown className="text-white/30 md:hidden mx-auto" size={24} />
              <div className="text-center p-6 border border-[hsl(var(--brand-coral))]/50 bg-[hsl(var(--brand-coral))]/10 shadow-[0_0_30px_rgba(255,119,93,0.1)] relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-[hsl(var(--brand-coral))]" />
                <span className="text-[11px] block mb-2 text-[hsl(var(--brand-coral))] uppercase tracking-[0.15em] font-bold">{activate.stage}</span>
                <p className="text-[13px] text-white leading-relaxed font-medium">{activate.body}</p>
              </div>
              <ArrowRight className="text-white/30 hidden md:block mx-auto" size={24} /><ArrowDown className="text-white/30 md:hidden mx-auto" size={24} />
              <div className="text-center p-6 border border-white/10 bg-[#0b1c3d] shadow-inner"><span className="text-[11px] font-bold block mb-2 text-white/50 uppercase tracking-[0.15em]">{operate.stage}</span><p className="text-[13px] text-[#b9c7db] leading-relaxed">{operate.body}</p></div>
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#d6deed] mb-5">
                <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
                {editorial.decisionRights.kicker}
              </div>
              <h2 id="rights-title" className="font-display text-[clamp(42px,5vw,72px)] font-semibold leading-[.96] tracking-[-.05em]">{editorial.decisionRights.heading}</h2>
              <p className="mt-8 text-[18px] leading-relaxed text-[#b9c7db]">{editorial.decisionRights.description}</p>
            </div>
            
            <div className="overflow-x-auto bg-[#0b1c3d] border border-white/20 p-1 lg:p-8">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead><tr className="border-b border-white/20 text-[11px] font-bold uppercase tracking-[0.15em] text-white/50"><th className="p-5">{editorial.decisionRights.headers.right}</th><th className="p-5">{editorial.decisionRights.headers.person}</th><th className="p-5">{editorial.decisionRights.headers.agent}</th></tr></thead>
                <tbody>{DECISION_RIGHTS.map((row) => <tr key={row.id} className="border-b border-white/10 text-[14px] leading-relaxed hover:bg-white/5 transition-colors"><th className="p-5 text-[#ff9fcf] font-bold">{row.right}</th><td className="p-5 text-[#dce4f0]">{row.person}</td><td className="p-5 text-[#b9c7db]">{row.agent}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="mt-16 grid gap-8 border-l-4 border-[hsl(var(--brand-coral))] bg-[#0b1c3d] p-8 lg:p-10 md:grid-cols-[auto_1fr_auto] md:items-center">
            <ShieldCheck className="text-[hsl(var(--brand-coral))] hidden md:block" size={48} />
            <div>
              <h3 className="font-display text-[28px] font-semibold tracking-[-.03em] text-white mb-3">{editorial.decisionRights.authorityCeiling.heading}</h3>
              <p className="text-[15px] leading-relaxed text-[#b9c7db] max-w-3xl">{editorial.decisionRights.authorityCeiling.description}</p>
            </div>
            <BrandButton href={editorial.decisionRights.authorityCeiling.cta.href} variant="inverse" className="whitespace-nowrap w-fit">{editorial.decisionRights.authorityCeiling.cta.label}</BrandButton>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-32 bg-[#f3f5f8]" aria-labelledby="capability-title">
        <div className="max-w-[1200px] mx-auto grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
              <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              {editorial.capability.kicker}
            </div>
            <h2 id="capability-title" className="font-display text-[clamp(42px,5vw,72px)] font-semibold leading-[.95] tracking-[-.05em]">{editorial.capability.heading}</h2>
            <p className="mt-8 text-[18px] leading-relaxed text-[#405777]">{editorial.capability.description}</p>
          </div>
          <div className="grid gap-px bg-[#cbd3e1] sm:grid-cols-2 border border-[#cbd3e1]">
            {editorial.capability.cards.map((card) => {
              const CapabilityIcon = CAPABILITY_ICONS[card.icon as keyof typeof CAPABILITY_ICONS];
              return <div key={card.id} className="bg-white p-8 lg:p-10 hover:bg-[#fdfcfb] transition-colors"><CapabilityIcon size={28} className="text-[hsl(var(--brand-pink))] mb-6" /><h3 className="font-display text-[24px] font-semibold tracking-[-.03em] mb-4 text-[#102957]">{card.title}</h3><p className="text-[14px] leading-relaxed text-[#536887]">{card.body}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-[#cbd3e1] bg-white px-6 py-20 md:px-[4.8vw] lg:py-32" aria-labelledby="measures-title">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
            <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            {editorial.measures.kicker}
          </div>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 id="measures-title" className="font-display text-[clamp(42px,5.2vw,76px)] font-semibold leading-[.95] tracking-[-.05em]">{editorial.measures.heading}</h2>
            <p className="border-l border-[#cbd3e1] pl-8 lg:pl-10 text-[18px] leading-relaxed text-[#405777]">{editorial.measures.description}</p>
          </div>
          <div className="mt-16 grid border border-[#cbd3e1] md:grid-cols-2 lg:grid-cols-4 bg-[#f3f5f8] gap-px">
            {MEASURES.map((group) => <div key={group.id} className="bg-white p-8 lg:p-10"><h3 className="font-display text-[24px] font-semibold tracking-[-.03em] mb-6 text-[#102957]">{group.title}</h3><ul className="space-y-4 text-[14px] leading-relaxed text-[#536887]">{group.measures.map((measure) => <li key={measure} className="border-l-2 border-[hsl(var(--brand-pink))] pl-4 py-1">{measure}</li>)}</ul></div>)}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-32 bg-[#fdfcfb]" aria-labelledby="idao-connection">
        <div className="max-w-[1200px] mx-auto grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
              <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              {editorial.idaoConnection.kicker}
            </div>
            <h2 id="idao-connection" className="font-display text-[clamp(42px,5vw,74px)] font-semibold leading-[.95] tracking-[-.05em]">{editorial.idaoConnection.heading}</h2>
          </div>
          <div className="lg:border-l border-[#cbd3e1] lg:pl-12">
            <p className="text-[18px] leading-relaxed text-[#405777]"><strong className="text-[#102957] font-bold">{editorial.idaoConnection.activateLabel}</strong> {editorial.idaoConnection.activateDescription}</p>
            <p className="mt-6 text-[18px] leading-relaxed text-[#405777]"><strong className="text-[#102957] font-bold">{editorial.idaoConnection.operateLabel}</strong> {editorial.idaoConnection.operateDescription}</p>
            <BrandButton href={editorial.idaoConnection.cta.href} className="mt-10">{editorial.idaoConnection.cta.label}</BrandButton>
          </div>
        </div>
      </section>

      <section className="bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-24">
        <Kicker inverse>{editorial.finalCta.kicker}</Kicker>
        <h2 className="mt-5 max-w-[940px] font-display text-[clamp(44px,6vw,88px)] font-semibold leading-[.93] tracking-[-.085em]">{editorial.finalCta.heading}</h2>
        <p className="mt-6 max-w-[650px] text-[16px] leading-[1.65] text-[#d6deed]">{editorial.finalCta.description}</p>
        <BrandButton href={editorial.finalCta.cta.href} variant="inverse" className="mt-8">{editorial.finalCta.cta.label}</BrandButton>
      </section>
    </article>
  );
}

export default function HumanAgentOperatingModel() {
  return <MethodologyCmsDelivery slug="human-agent-operating-model"><HumanAgentOperatingModelContent /></MethodologyCmsDelivery>;
}