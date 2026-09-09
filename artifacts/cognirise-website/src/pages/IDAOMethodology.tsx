import { ArrowDown, ArrowRight, CornerDownLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { IDAO_CANON_LAYERS, IDAO_STAGES } from "@/content/idao";
import { assetUrl } from "@/lib/assets";

const DELIVERY_TEAM = [
  {
    id: "senior-leaders",
    side: "Human",
    label: "Senior Leaders",
    title: "Experience that recognises what matters.",
    summary: "Industry leaders with 20+ years of experience in large-scale transformation.",
    detail:
      "They bring the judgement earned through consequential programmes: reading organisational context, challenging the value case, navigating executive decisions and recognising risks that do not appear in a technical brief.",
    accent: "#7659df",
  },
  {
    id: "forward-deployed-engineers",
    side: "Human",
    label: "Forward Deployed Engineers",
    title: "Builders embedded in the reality of the work.",
    summary: "Transformation professionals who work inside the client environment from strategy through operation.",
    detail:
      "FDEs connect executive intent to working capability. They learn the operation from the inside, build alongside client teams, direct the agent workforce and stay accountable until the outcome is ready to operate.",
    accent: "#9a63da",
  },
  {
    id: "forward-deployed-agents",
    side: "Agent",
    label: "Forward Deployed Agents",
    title: "Reusable intelligence, deployed for the mission.",
    summary: "Specialised agents, skills and tools that augment the team across research, design, engineering and assurance.",
    detail:
      "FDAs help teams analyse, produce, compare and evaluate at machine pace. They carry reusable Cognirise intelligence into the engagement while remaining bounded by the context, authority and evidence defined for the work.",
    accent: "#db509e",
  },
  {
    id: "controls",
    side: "Agent",
    label: "Controls & Assurance",
    title: "Acceleration with evidence and restraint.",
    summary: "Grounding, evaluation, traceability and human approval keep agent work reviewable.",
    detail:
      "Controls are designed into the route: approved sources ground important claims, outputs remain traceable to requirements, evaluation tests quality and limitations, and named people retain authority over consequential decisions and release.",
    accent: "#ff775d",
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

export default function IDAOMethodology() {
  const reducedMotion = useReducedMotion();
  const [activeTeamMember, setActiveTeamMember] = useState<(typeof DELIVERY_TEAM)[number]["id"]>("senior-leaders");
  const activeTeamDetail = DELIVERY_TEAM.find((item) => item.id === activeTeamMember) ?? DELIVERY_TEAM[0];

  return (
    <article className="overflow-hidden bg-[#fdfcfb] font-sans text-[#102957] selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      <header className="px-6 pb-16 pt-9 md:px-[4.8vw] lg:pb-24">
        <Kicker>Frameworks & methodologies / 01</Kicker>
        <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <motion.div initial={reducedMotion ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reducedMotion ? 0 : 0.65 }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--brand-pink))]">Innovate · Demonstrate · Activate · Operate</p>
            <h1 className="mt-5 font-display text-[clamp(58px,9vw,138px)] font-semibold leading-[0.82] tracking-[-0.095em]">IDAO.</h1>
            <p className="mt-8 max-w-[620px] text-[19px] leading-[1.58] text-[#405777]">
              A governed route from a consequential opportunity to evidence, adoption and a capability your team can own.
            </p>
            <a href="#lifecycle" className="mt-9 inline-flex items-center gap-3 border-b border-[#102957] pb-2 text-sm font-bold hover:text-[hsl(var(--brand-pink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
              Follow the lifecycle <ArrowDown size={16} />
            </a>
          </motion.div>
          <motion.figure
            initial={reducedMotion ? false : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 1, ease: [0.2, 0.7, 0.2, 1] }}
            data-idao-hero-frame
            className="relative h-[430px] overflow-hidden bg-[#071936] [clip-path:polygon(0_8%,12%_0,92%_0,100%_9%,100%_86%,90%_100%,12%_96%,0_100%)] md:h-[520px] md:[clip-path:polygon(11%_0,100%_0,100%_82%,94%_82%,94%_92%,83%_100%,0_100%,0_14%)] lg:h-[620px] lg:[clip-path:polygon(13%_0,100%_0,100%_80%,95%_80%,95%_92%,82%_100%,0_100%,0_15%)]"
          >
            <PulseImage
              src={assetUrl(IDAO_STAGES[1].image)}
              alt={IDAO_STAGES[1].imageAlt}
              className="h-full w-full object-cover"
              style={{ objectPosition: IDAO_STAGES[1].imagePosition }}
              eager
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/90 via-[#071936]/10 to-transparent" />
            <figcaption className="absolute bottom-[11%] left-6 right-7 text-white md:bottom-10 md:left-10 md:right-[12%] lg:left-12">
              <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/70">The first pivotal decision</span>
              <strong className="mt-2 block max-w-[540px] font-display text-[clamp(28px,3vw,45px)] leading-[1.04] tracking-[-0.06em]">A decision-ready prototype within 48 hours.</strong>
            </figcaption>
          </motion.figure>
        </div>
      </header>

      <section className="border-y border-[#cbd3e1] px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="one-team-heading">
        <div className="grid gap-8 border-t border-[#102957] pt-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-[7vw]">
          <div>
            <Kicker>How we deliver</Kicker>
            <h2 id="one-team-heading" className="mt-5 max-w-[850px] font-display text-[clamp(43px,5.7vw,84px)] font-semibold leading-[0.94] tracking-[-0.085em]">
              Humans and AI agents working as <em className="not-italic text-[hsl(var(--brand-pink))]">one team.</em>
            </h2>
          </div>
          <p className="self-end border-t border-[#cbd3e1] pt-6 text-[17px] leading-[1.65] text-[#405777]">
            IDAO combines seasoned human judgement with a governed agent workforce. The advantage is not people or automation in isolation; it is knowing which capability should lead, where it should collaborate and where human authority must remain explicit.
          </p>
        </div>

        <div className="relative mt-14 overflow-hidden bg-[#f3f5f8] lg:mt-20">
          <div className="grid min-h-[720px] lg:grid-cols-[0.82fr_1.18fr_0.82fr]">
            <div className="z-10 flex flex-col border-[#cbd3e1] lg:border-r">
              <div className="border-b border-[#cbd3e1] p-6 lg:p-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7659df]">Human intelligence</span>
                <h3 className="mt-3 font-display text-[30px] font-semibold tracking-[-0.06em]">Judgement in context.</h3>
              </div>
              {DELIVERY_TEAM.filter((item) => item.side === "Human").map((item) => {
                const isActive = item.id === activeTeamMember;
                return (
                  <div key={item.id} className="flex flex-1 flex-col">
                    <button
                      type="button"
                      aria-pressed={isActive}
                      aria-expanded={isActive}
                      aria-controls={`${item.id}-mobile-detail delivery-team-detail`}
                      onClick={() => setActiveTeamMember(item.id)}
                      className={`group flex-1 border-b border-[#cbd3e1] p-6 text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[hsl(var(--brand-coral))] lg:p-8 ${isActive ? "bg-[#102957] text-white" : "hover:bg-white"}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: isActive ? "#d7cfff" : item.accent }}>{item.label}</span>
                      <strong className="mt-4 block font-display text-[24px] leading-[1.08] tracking-[-0.05em]">{item.title}</strong>
                      <span className={`mt-4 block text-[13px] leading-[1.55] ${isActive ? "text-white/75" : "text-[#536887]"}`}>{item.summary}</span>
                      <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em]">View role <ArrowRight size={14} aria-hidden="true" /></span>
                    </button>
                    <div id={`${item.id}-mobile-detail`} className={`${isActive ? "block" : "hidden"} border-b border-[#cbd3e1] bg-white p-6 text-[14px] leading-[1.65] text-[#405777] lg:hidden`}>
                      {item.detail}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative order-first flex min-h-[500px] items-end justify-center overflow-hidden bg-[#fdfcfb] px-4 pt-10 lg:order-none lg:min-h-0">
              <div className="absolute inset-x-0 top-7 text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647491]">The IDAO delivery system</span>
                <p className="mt-2 font-display text-[24px] font-semibold tracking-[-0.05em] text-[#102957]">Human authority · Agent leverage</p>
              </div>
              <motion.img
                key="human-agent-team"
                src={assetUrl("/images/cognirise/idao-human-agent-team.png")}
                alt="A single figure divided into a human leader and an AI agent, representing the combined Cognirise delivery team."
                className="relative z-10 max-h-[610px] w-full max-w-[620px] object-contain object-bottom drop-shadow-[0_28px_35px_rgba(16,41,87,0.12)]"
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: reducedMotion ? 0 : 0.7 }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f3f5f8] to-transparent" />
            </div>

            <div className="z-10 flex flex-col border-[#cbd3e1] lg:border-l">
              <div className="border-b border-[#cbd3e1] p-6 lg:p-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#db509e]">Agent intelligence</span>
                <h3 className="mt-3 font-display text-[30px] font-semibold tracking-[-0.06em]">Scale with control.</h3>
              </div>
              {DELIVERY_TEAM.filter((item) => item.side === "Agent").map((item) => {
                const isActive = item.id === activeTeamMember;
                return (
                  <div key={item.id} className="flex flex-1 flex-col">
                    <button
                      type="button"
                      aria-pressed={isActive}
                      aria-expanded={isActive}
                      aria-controls={`${item.id}-mobile-detail delivery-team-detail`}
                      onClick={() => setActiveTeamMember(item.id)}
                      className={`group flex-1 border-b border-[#cbd3e1] p-6 text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[hsl(var(--brand-coral))] lg:p-8 ${isActive ? "bg-[#102957] text-white" : "hover:bg-white"}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: isActive ? "#ffb1d4" : item.accent }}>{item.label}</span>
                      <strong className="mt-4 block font-display text-[24px] leading-[1.08] tracking-[-0.05em]">{item.title}</strong>
                      <span className={`mt-4 block text-[13px] leading-[1.55] ${isActive ? "text-white/75" : "text-[#536887]"}`}>{item.summary}</span>
                      <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em]">View role <ArrowRight size={14} aria-hidden="true" /></span>
                    </button>
                    <div id={`${item.id}-mobile-detail`} className={`${isActive ? "block" : "hidden"} border-b border-[#cbd3e1] bg-white p-6 text-[14px] leading-[1.65] text-[#405777] lg:hidden`}>
                      {item.detail}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <motion.div
            id="delivery-team-detail"
            role="status"
            aria-live="polite"
            className="hidden border-t border-[#102957] bg-white md:grid-cols-[0.3fr_0.7fr] lg:grid"
          >
            <motion.div key={`${activeTeamDetail.id}-label`} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.2 }} className="contents">
              <div className="p-6 md:p-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: activeTeamDetail.accent }}>{activeTeamDetail.side} capability</span>
                <strong className="mt-3 block font-display text-[27px] tracking-[-0.055em]">{activeTeamDetail.label}</strong>
              </div>
              <p className="border-t border-[#cbd3e1] p-6 text-[16px] leading-[1.65] text-[#405777] md:border-l md:border-t-0 md:p-8">{activeTeamDetail.detail}</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-[#cbd3e1] px-6 py-16 md:px-[4.8vw] lg:py-20" aria-labelledby="starting-point">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-[8vw]">
          <div>
            <Kicker>Where work begins</Kicker>
            <h2 id="starting-point" className="mt-5 font-display text-[clamp(40px,5vw,70px)] font-semibold leading-[0.97] tracking-[-0.08em]">Start with pressure, not technology.</h2>
          </div>
          <div className="self-end border-t border-[#102957] pt-6 text-[17px] leading-[1.65] text-[#405777]">
            <p>An engagement begins where an important workflow, decision or service is under pressure. Together we identify the value at stake, the people affected and the evidence a leader would need to act.</p>
            <p className="mt-5">Not every engagement starts at Innovate. If credible evidence already exists, we enter at the earliest stage whose gate can be responsibly satisfied.</p>
          </div>
        </div>
      </section>

      <section id="lifecycle" className="px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="lifecycle-heading">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-[8vw]">
          <div>
            <Kicker>The progression</Kicker>
            <h2 id="lifecycle-heading" className="mt-5 font-display text-[clamp(42px,5vw,74px)] font-semibold leading-[0.96] tracking-[-0.08em]">Every stage earns the next.</h2>
          </div>
          <div className="self-end border-t border-[#102957] pt-6">
            <p className="text-[19px] leading-[1.58] text-[#30486d]">IDAO is not a gated waterfall. Evidence, risk and assurance travel with the work. If a gate exposes weak evidence, the team reshapes the scope or loops back rather than scaling an assumption.</p>
          </div>
        </div>

        <ol className="mt-16 space-y-16 lg:space-y-28">
          {IDAO_STAGES.map((stage, index) => (
            <motion.li
              key={stage.title}
              id={stage.title.toLowerCase()}
              className="grid gap-0 border-t border-[#102957] lg:grid-cols-2"
              initial={reducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: reducedMotion ? 0 : 0.65 }}
            >
              <figure className={`relative min-h-[380px] overflow-hidden bg-[#071936] lg:min-h-[720px] ${index % 2 ? "lg:order-2" : ""}`}>
                <PulseImage src={assetUrl(stage.image)} alt={stage.imageAlt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: stage.imagePosition }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/85 via-transparent to-transparent" />
                <figcaption className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{stage.num} / {stage.time}</span>
                  <strong className="mt-2 block font-display text-[clamp(29px,3vw,45px)] tracking-[-0.06em]">{stage.tagline}</strong>
                </figcaption>
              </figure>
              <div className={`bg-[#f3f5f8] p-7 md:p-10 lg:p-12 ${index % 2 ? "lg:order-1" : ""}`}>
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.14em]" style={{ color: stage.accent }}>{stage.num}</span>
                    <h3 className="mt-4 font-display text-[clamp(42px,5vw,68px)] font-semibold tracking-[-0.08em]">{stage.title}</h3>
                    <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#647491]">{stage.subtitle} · {stage.time}</p>
                  </div>
                  {index < IDAO_STAGES.length - 1 && <ArrowRight className="mt-2 shrink-0 text-[hsl(var(--brand-coral))]" aria-hidden="true" />}
                </div>
                <p className="mt-7 text-[18px] font-semibold leading-[1.55] text-[#30486d]">{stage.purpose}</p>
                <p className="mt-4 text-[15px] leading-[1.65] text-[#405777]">{stage.description}</p>

                <div className="mt-8 border-t border-[#cbd3e1] pt-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Key work</h4>
                  <ul className="mt-4 space-y-3 text-sm leading-[1.55] text-[#405777]">
                    {stage.keyWork.map((item) => <li key={item} className="border-l-2 pl-3" style={{ borderColor: stage.accent }}>{item}</li>)}
                  </ul>
                </div>
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Your participation</h4>
                    <p className="mt-3 text-sm leading-[1.6] text-[#405777]">{stage.clientRole}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">What you have in hand</h4>
                    <p className="mt-3 text-sm font-semibold leading-[1.6] text-[#30486d]">{stage.outcome}</p>
                  </div>
                </div>
                <details className="group mt-8 border-y border-[#cbd3e1]">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand-coral))] [&::-webkit-details-marker]:hidden">
                    Decision gate and evidence
                    <span className="text-xl font-light group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <div className="grid gap-5 pb-6 text-sm leading-[1.6] text-[#405777] md:grid-cols-2">
                    <p><strong className="block text-[#102957]">The gate</strong>{stage.decisionGate}</p>
                    <p><strong className="block text-[#102957]">Evidence to progress</strong>{stage.evidence}</p>
                  </div>
                </details>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mt-16 flex items-start gap-4 border-t border-[#102957] pt-7 lg:ml-1/2 lg:mt-24">
          <CornerDownLeft className="mt-1 shrink-0 text-[hsl(var(--brand-violet))]" aria-hidden="true" />
          <p className="max-w-[680px] text-[16px] leading-[1.65] text-[#405777]"><strong className="text-[#102957]">The loop remains open.</strong> Live evidence from Operate can trigger a focused improvement, return a weak assumption to Demonstrate, or reveal a new opportunity for Innovate. Progress is controlled, not artificially linear.</p>
        </div>
      </section>

      <section className="bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28" aria-labelledby="canon-heading">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[8vw]">
          <div>
            <Kicker inverse>The delivery canon</Kicker>
            <h2 id="canon-heading" className="mt-6 font-display text-[clamp(44px,6vw,88px)] font-semibold leading-[0.92] tracking-[-0.09em]">Speed without shortcuts.</h2>
          </div>
          <div className="self-end border-t border-white/25 pt-6">
            <p className="text-[18px] leading-[1.65] text-[#d6deed]">A decision-ready prototype within <strong className="text-white">48 hours</strong> and a governed MVP within <strong className="text-white">2–4 weeks</strong> are possible because teams do not begin from a blank page. A reusable delivery system governs how work is framed, produced, evaluated and handed over.</p>
          </div>
        </div>
        <div className="mt-14 grid border-t border-white/25 lg:grid-cols-5">
          {IDAO_CANON_LAYERS.map((layer) => (
            <details key={layer.num} className="group border-b border-white/25 lg:border-r lg:last:border-r-0">
              <summary className="min-h-[230px] cursor-pointer list-none px-5 py-6 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[hsl(var(--brand-coral))] [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between text-[10px] font-bold tracking-[0.12em] text-[#ff91c4]"><span>{layer.num}</span><span className="text-xl font-light text-white/60 group-open:rotate-45" aria-hidden="true">+</span></span>
                <h3 className="mt-8 font-display text-[23px] font-semibold leading-[1.05] tracking-[-0.05em]">{layer.title}</h3>
                <p className="mt-4 text-[13px] leading-[1.55] text-white/70">{layer.summary}</p>
              </summary>
              <p className="px-5 pb-7 text-[13px] leading-[1.65] text-white/80">{layer.detail}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="handover-heading">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[8vw]">
          <div>
            <Kicker>Ownership at handover</Kicker>
            <h2 id="handover-heading" className="mt-6 max-w-[780px] font-display text-[clamp(44px,6vw,84px)] font-semibold leading-[0.94] tracking-[-0.085em]">The work ends in your hands, not ours.</h2>
          </div>
          <div className="self-end border-t border-[#102957] pt-6 text-[16px] leading-[1.65] text-[#405777]">
            <p>Handover is prepared from the start. Named owners receive the operating knowledge, traceability, evaluation evidence, known limitations and governance routines needed to run the capability with confidence.</p>
            <p className="mt-5">We rehearse support and intervention before acceptance. The outcome is not dependency on a delivery team; it is a client-owned capability with clear authority, observable performance and a route to responsible improvement.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28">
        <Kicker inverse>Find your starting point</Kicker>
        <h2 className="mt-6 max-w-[950px] font-display text-[clamp(46px,7vw,102px)] font-semibold leading-[0.91] tracking-[-0.09em]">Bring one process. Leave with the next evidence to earn.</h2>
        <p className="mt-7 max-w-[640px] text-[17px] leading-[1.6] text-[#d6deed]">A Value Scan identifies where the work is under pressure, what value is available and which IDAO stage should begin the route.</p>
        <BrandButton href="/value-scan" variant="inverse" className="mt-9">Book a Value Scan</BrandButton>
      </section>
    </article>
  );
}