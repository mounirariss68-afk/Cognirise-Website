import { ArrowDown, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { assetUrl } from "@/lib/assets";

const STAGES = [
  {
    name: "Innovate",
    purpose: "Find the consequential opportunity and define why it deserves to move.",
    activities: ["Map the work, pressure and constraints", "Frame the value and risk hypothesis", "Choose the smallest meaningful starting point"],
    decision: "Is there a specific opportunity worth proving, with an accountable owner and a measurable outcome?",
    outcome: "A prioritised opportunity, an evidence plan and clear boundaries for the demonstration.",
  },
  {
    name: "Demonstrate",
    purpose: "Turn the opportunity into evidence in the environment where the work must perform.",
    activities: ["Build a working proof around real workflows", "Test data, integration and governance assumptions", "Measure value, usability and operational exposure"],
    decision: "Has the proof produced enough evidence to justify adoption—and exposed what must change before scale?",
    outcome: "A working demonstration, validated measures and a grounded activation decision.",
  },
  {
    name: "Activate",
    purpose: "Embed the proven change into teams, systems, controls and day-to-day decisions.",
    activities: ["Harden the solution and production path", "Prepare people, process and operating controls", "Release in accountable increments"],
    decision: "Are the people, technology and controls ready to carry the change safely into live work?",
    outcome: "A production release, prepared operators and a governed route to wider adoption.",
  },
  {
    name: "Operate",
    purpose: "Sustain the outcome, learn from live use and improve the system without losing control.",
    activities: ["Monitor performance, value and risk", "Run ownership, support and intervention routines", "Feed evidence into the next improvement cycle"],
    decision: "Is the system delivering the intended outcome, and what evidence should trigger adaptation or a new innovation cycle?",
    outcome: "Sustained performance, accountable operation and a continuously renewed improvement backlog.",
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

  return (
    <article className="overflow-hidden bg-[#fdfcfb] font-sans text-[#102957] selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      <header className="px-6 pb-16 pt-9 md:px-[4.8vw] lg:pb-24">
        <Kicker>Frameworks & methodologies / 01</Kicker>
        <div className="mt-8 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <motion.div initial={reducedMotion ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reducedMotion ? 0 : 0.65 }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--brand-pink))]">Innovate · Demonstrate · Activate · Operate</p>
            <h1 className="mt-5 font-display text-[clamp(58px,9vw,138px)] font-semibold leading-[0.82] tracking-[-0.095em]">IDAO.</h1>
            <p className="mt-8 max-w-[610px] text-[19px] leading-[1.58] text-[#405777]">
              A four-stage methodology for moving consequential work from a promising opportunity to evidence, adoption and sustained operation.
            </p>
            <a href="#lifecycle" className="mt-9 inline-flex items-center gap-3 border-b border-[#102957] pb-2 text-sm font-bold hover:text-[hsl(var(--brand-pink))]">
              Follow the lifecycle <ArrowDown size={16} />
            </a>
          </motion.div>
          <motion.figure
            initial={reducedMotion ? false : { opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0)" }}
            transition={{ duration: reducedMotion ? 0 : 1 }}
            className="relative h-[430px] overflow-hidden bg-[#071936] lg:h-[620px]"
            style={{ clipPath: "polygon(10% 0,100% 0,100% 91%,0 100%,0 12%)" }}
          >
            <PulseImage src={assetUrl("/images/cognirise/pulse-breakthrough.jpg")} alt="Violet and coral intelligence routes advancing through a bright architectural system." className="h-full w-full object-cover" eager />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/85 via-transparent to-transparent" />
            <figcaption className="absolute bottom-8 left-8 right-8 text-white">
              <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/65">One accountable motion</span>
              <strong className="mt-2 block max-w-[520px] font-display text-[clamp(27px,3vw,44px)] leading-[1.04] tracking-[-0.06em]">Opportunity becomes proof. Proof becomes practice. Practice keeps improving.</strong>
            </figcaption>
          </motion.figure>
        </div>
      </header>

      <section id="lifecycle" className="border-y border-[#cbd3e1] px-6 py-20 md:px-[4.8vw] lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-[8vw]">
          <div>
            <Kicker>The progression</Kicker>
            <h2 className="mt-5 font-display text-[clamp(42px,5vw,74px)] font-semibold leading-[0.96] tracking-[-0.08em]">Every stage earns the next.</h2>
          </div>
          <div className="self-end border-t border-[#102957] pt-6">
            <p className="text-[19px] leading-[1.58] text-[#30486d]">IDAO is not a gated waterfall. Each stage creates the evidence and operating conditions needed for the next decision. When evidence is weak, the work loops back rather than scaling assumptions.</p>
          </div>
        </div>

        <ol className="mt-16 border-l border-t border-[#cbd3e1]">
          {STAGES.map((stage, index) => (
            <li key={stage.name} id={stage.name.toLowerCase()} className="grid border-b border-r border-[#cbd3e1] lg:grid-cols-[0.38fr_0.62fr]">
              <div className="p-7 lg:p-10">
                <span className="text-[10px] font-bold tracking-[0.14em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>
                <h3 className="mt-7 font-display text-[clamp(36px,4vw,62px)] font-semibold tracking-[-0.075em]">{stage.name}</h3>
                <p className="mt-5 max-w-[430px] text-[16px] font-semibold leading-[1.55] text-[#30486d]">{stage.purpose}</p>
                {index < STAGES.length - 1 && <ArrowRight className="mt-10 text-[hsl(var(--brand-coral))]" aria-hidden="true" />}
              </div>
              <div className="grid gap-7 bg-[#f3f5f8] p-7 md:grid-cols-2 lg:p-10">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Activities</h4>
                  <ul className="mt-4 space-y-3 text-sm leading-[1.55] text-[#405777]">
                    {stage.activities.map((activity) => <li key={activity} className="border-l-2 border-[hsl(var(--brand-pink))] pl-3">{activity}</li>)}
                  </ul>
                </div>
                <div className="space-y-7">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Decision</h4>
                    <p className="mt-3 text-sm leading-[1.6] text-[#405777]">{stage.decision}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#647491]">Outcome</h4>
                    <p className="mt-3 text-sm font-semibold leading-[1.6] text-[#30486d]">{stage.outcome}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28">
        <Kicker inverse>Start with the opportunity</Kicker>
        <h2 className="mt-6 max-w-[900px] font-display text-[clamp(46px,7vw,102px)] font-semibold leading-[0.91] tracking-[-0.09em]">Bring one process. Leave with the next evidence to earn.</h2>
        <p className="mt-7 max-w-[600px] text-[17px] leading-[1.6] text-[#d6deed]">A Value Scan identifies where the work is under pressure, what value is available and which IDAO stage should begin the route.</p>
        <BrandButton href="/value-scan" variant="inverse" className="mt-9">Book a Value Scan</BrandButton>
      </section>
    </article>
  );
}