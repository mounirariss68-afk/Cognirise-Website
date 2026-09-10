import { ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { ValueToScaleAssessment } from "@/components/ValueToScaleAssessment";
import { MATURITY_DIMENSIONS, MATURITY_STAGES } from "@/lib/value-to-scale";
import { MethodologyRelationship } from "@/components/MethodologyRelationship";
import { MethodPageHero } from "@/components/MethodPageHero";

const sources = [
  { label: "NIST AI Risk Management Framework 1.0 (2023)", url: "https://www.nist.gov/itl/ai-risk-management-framework" },
  { label: "ISO/IEC 42001 AI management systems (2023)", url: "https://www.iso.org/standard/81230.html" },
  { label: "EU AI Act, Regulation (EU) 2024/1689 (2024)", url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
  { label: "McKinsey, The state of AI in 2023: Generative AI's breakout year (2023)", url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai-in-2023-generative-ais-breakout-year" },
  { label: "BCG, AI Radar 2025 (2025)", url: "https://www.bcg.com/publications/2025/ai-radar-global-ai-adoption-in-2025" },
  { label: "Accenture, The Art of AI Maturity (2022)", url: "https://www.accenture.com/us-en/insights/artificial-intelligence/ai-maturity-and-transformation" },
] as const;

export default function AIValueToScale() {
  return (
    <article className="overflow-hidden bg-[#fdfcfb] text-[#102957]">
      <MethodPageHero
        breadcrumb="Methodologies / 01"
        title="AI Value-to-Scale."
        description="Can this organisation repeatedly move valuable AI into sustained operation?"
        supportingText={
          <div className="flex flex-col items-start gap-6">
            <p>This proprietary Cognirise model assesses the conditions that connect value, delivery, adoption, authority and outcomes. It does not rank AI consumption, certify compliance or claim a statistical benchmark.</p>
            <div className="flex items-center gap-6">
              <BrandButton href="#assessment">Start your assessment</BrandButton>
              <a href="#model" className="inline-flex items-center gap-2 text-[13px] font-bold underline underline-offset-4 text-[#102957] hover:text-[hsl(var(--brand-pink))] transition-colors">
                See the model <ArrowDown size={14} />
              </a>
            </div>
          </div>
        }
        imageSrc="/images/cognirise/method-vts.jpg"
        imageAlt="Cinematic view of an organizational system at scale."
        imageCaptionSubtitle="Systemic Readiness"
        imageCaptionTitle="Connecting opportunity to sustained value."
      />

      <MethodologyRelationship
        startHereWhen={<>An organization-wide or portfolio-level constraint prevents repeatable movement from opportunity to sustained value.</>}
        decision={<>What prevents repeatable movement from opportunity to sustained value?</>}
        output={<>A seven-dimension maturity profile, a register of evidence gaps, and prioritized actions.</>}
        connectsToIdao={<>Identifies systemic constraints, priorities and potential initiatives. Evidence determines whether selected work enters Innovate or a later IDAO stage; the method does not force every initiative to start at Innovate.</>}
        connectsToAuthority={<>Tests whether authority governance is an organizational capability. The Agent Authority Model separately sets actual autonomy limits for specific handovers in selected initiatives.</>}
        reassessWhen={<>After a completed IDAO cycle reveals new organizational evidence, or when market, platform, or regulatory constraints change materially.</>}
        doesNotDecide={<>Which specific use cases to fund next (use AI Use-Case Prioritization) or the readiness of a single workflow (use Agentic Operations Readiness).</>}
      />

      <section id="model" className="border-y border-[#cbd3e1] bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-[radial-gradient(circle_at_top_right,rgba(154,99,218,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#d6deed] mb-5">
            <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            The Framework
          </div>
          <h2 className="max-w-4xl font-display text-[clamp(42px,5.5vw,80px)] font-semibold leading-[.95] tracking-[-.05em]">
            Five stages. Seven conditions. Evidence before confidence.
          </h2>
          
          <div className="mt-16 bg-[#071936] border border-white/20 p-8 lg:p-10 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-10 items-center">
              <div className="space-y-5">
                 <h3 className="font-display text-2xl font-bold text-white tracking-[-0.03em]">Seven Conditions</h3>
                 <p className="text-[14px] text-[#d6deed] leading-relaxed">
                   {MATURITY_DIMENSIONS.map((dimension) => dimension.name).join(" · ")}
                 </p>
                 <div className="p-4 bg-[hsl(var(--brand-pink))]/10 border-l-2 border-[hsl(var(--brand-pink))]">
                    <p className="text-[12px] font-medium text-white leading-relaxed">
                      Weak-condition evidence can move work to an earlier IDAO entry or loopback. Stronger evidence can support a later entry; authority limits remain separate.
                    </p>
                 </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <ArrowRight className="text-[#647491] hidden lg:block" size={32} />
                 <ArrowDown className="text-[#647491] lg:hidden" size={32} />
              </div>
              <div className="space-y-5">
                 <div className="p-5 border border-white/10 bg-white/5">
                   <h3 className="font-display text-xl font-bold text-white mb-4 tracking-[-0.03em]">IDAO Entry Points</h3>
                   <ul className="text-[13px] text-[#d6deed] space-y-3">
                      <li className="flex gap-3 items-start"><CheckCircle2 size={16} className="text-[hsl(var(--brand-violet))] shrink-0 mt-0.5" /> <span><strong>Innovate:</strong> investigate unresolved assumptions</span></li>
                      <li className="flex gap-3 items-start"><CheckCircle2 size={16} className="text-[hsl(var(--brand-pink))] shrink-0 mt-0.5" /> <span><strong>Demonstrate:</strong> prove the selected work in context</span></li>
                      <li className="flex gap-3 items-start"><CheckCircle2 size={16} className="text-[hsl(var(--brand-coral))] shrink-0 mt-0.5" /> <span><strong>Activate or Operate update:</strong> use sufficiently strong evidence responsibly</span></li>
                   </ul>
                 </div>
                 <div className="p-5 border border-[hsl(var(--brand-coral))]/30 bg-[hsl(var(--brand-coral))]/10">
                   <h3 className="font-display text-lg font-bold text-white mb-2 tracking-[-0.03em]">Agent Authority is Separate</h3>
                   <p className="text-[12px] text-[#d6deed] leading-relaxed">VTS tests if governance is an organizational capability. The Agent Authority Model sets actual limits for specific handovers.</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="mt-20 border-t border-white/20 pt-16">
            <h3 className="font-display text-3xl font-semibold mb-10 tracking-[-0.04em]">Maturity Stages</h3>
            <div className="grid md:grid-cols-5 gap-px bg-white/20">
              {MATURITY_STAGES.map((stage) => (
                <div key={stage.score} className="bg-[#102957] p-6 lg:p-8 flex flex-col h-full hover:bg-[#0b1c3d] transition-colors border border-transparent hover:border-white/10">
                  <span className="text-[10px] font-bold text-[hsl(var(--brand-pink))] uppercase tracking-[0.15em] mb-4">Stage 0{stage.score}</span>
                  <h4 className="font-display text-2xl font-semibold mb-4 leading-tight">{stage.name}</h4>
                  <p className="mt-auto text-[13px] leading-[1.6] text-[#b9c7db]">{stage.test}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 border-t border-white/20 pt-16">
            <h3 className="font-display text-3xl font-semibold mb-10 tracking-[-0.04em]">Assessment Dimensions</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {MATURITY_DIMENSIONS.map((dimension) => (
                <div key={dimension.id} className="border-t border-[hsl(var(--brand-violet))]/40 pt-6">
                  <h4 className="font-display text-xl font-semibold mb-3">{dimension.name}</h4>
                  <p className="text-[13px] leading-[1.6] text-[#b9c7db]">{dimension.question}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28 bg-[#fdfcfb]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
                <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
                How to use it
              </div>
              <h2 className="font-display text-[clamp(40px,5vw,70px)] font-semibold leading-[.95] tracking-[-.05em]">Score what the evidence supports.</h2>
            </div>
            
            <div className="border-l border-[#cbd3e1] pl-8 lg:pl-12">
              <ol className="space-y-10">
                <li className="relative">
                  <span className="absolute -left-[45px] lg:-left-[61px] top-1 text-[10px] font-bold text-[#647491]">01</span>
                  <h3 className="font-display text-xl font-semibold mb-2">Convene different perspectives.</h3>
                  <p className="text-[15px] leading-[1.65] text-[#536887]">Include business, operations, technology, workforce and risk. AI adoption impacts the entire organizational structure.</p>
                </li>
                <li className="relative">
                  <span className="absolute -left-[45px] lg:-left-[61px] top-1 text-[10px] font-bold text-[#647491]">02</span>
                  <h3 className="font-display text-xl font-semibold mb-2">Select the highest stage you can evidence.</h3>
                  <p className="text-[15px] leading-[1.65] text-[#536887]">Aspirations and isolated pilots do not count as operating evidence. Rate what exists today, not what is planned.</p>
                </li>
                <li className="relative">
                  <span className="absolute -left-[45px] lg:-left-[61px] top-1 text-[10px] font-bold text-[#647491]">03</span>
                  <h3 className="font-display text-xl font-semibold mb-2">Inspect the pattern.</h3>
                  <p className="text-[15px] leading-[1.65] text-[#536887]">The overall stage uses the average of your seven dimension scores. Averages can hide a weak condition that prevents scale, so review lower-scoring dimensions as priorities rather than treating the headline stage as permission to proceed.</p>
                </li>
                <li className="relative">
                  <span className="absolute -left-[45px] lg:-left-[61px] top-1 text-[10px] font-bold text-[#647491]">04</span>
                  <h3 className="font-display text-xl font-semibold mb-2">Act on the lowest dimensions.</h3>
                  <p className="text-[15px] leading-[1.65] text-[#536887]">Use the recommendations to frame a Value Scan or an IDAO entry point focused specifically on resolving those gaps.</p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Wrapping the interactive component in a well-padded section to give it space */}
      <section className="bg-[#f3f5f8] py-20 lg:py-28 border-y border-[#cbd3e1]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-[4.8vw]">
           <ValueToScaleAssessment />
        </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] bg-[#fdfcfb]" aria-labelledby="sources-title">
        <div className="max-w-[1200px] mx-auto grid gap-12 lg:grid-cols-2">
          <div>
            <h2 id="sources-title" className="font-display text-4xl font-semibold tracking-[-.04em]">Sources and model boundary</h2>
            <p className="mt-5 text-[15px] leading-[1.65] text-[#536887]">
              Sources were reviewed on 9 September 2026 to understand established management-system, risk and market maturity themes. Stage names, dimensions, prompts, scoring and action logic on this page are Cognirise proprietary content; they are not reproduced competitor benchmarks. No comparative percentile or performance claim is made.
            </p>
          </div>
          <div className="lg:border-l border-[#cbd3e1] lg:pl-12">
            <ul className="grid gap-4">
              {sources.map((source) => (
                <li key={source.url} className="flex items-start gap-3 group">
                  <ArrowRight className="text-[#cbd3e1] group-hover:text-[hsl(var(--brand-pink))] transition-colors shrink-0 mt-1" size={16} />
                  <a className="text-[14px] font-medium text-[#405777] group-hover:text-[#102957] transition-colors" href={source.url} target="_blank" rel="noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </article>
  );
}
