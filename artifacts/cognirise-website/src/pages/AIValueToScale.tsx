import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { ValueToScaleAssessment } from "@/components/ValueToScaleAssessment";
import { MATURITY_DIMENSIONS, MATURITY_STAGES } from "@/lib/value-to-scale";
import { MethodologyRelationship } from "@/components/MethodologyRelationship";
import { PulseImage } from "@/components/ui/pulse-image";

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
      <header className="px-6 pb-20 pt-12 md:px-[4.8vw] lg:pb-28">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]">Methodologies / first release</p>
        <div className="mt-7 grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div><h1 className="font-display text-[clamp(50px,7vw,105px)] font-semibold leading-[.9] tracking-[-.09em]">AI Value-to-Scale.</h1><p className="mt-7 max-w-2xl text-xl leading-[1.55] text-[#405777]">Can this organisation repeatedly move valuable AI into sustained operation?</p><a href="#model" className="mt-8 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">See the model <ArrowDown size={15} /></a></div>
          <div className="border-t border-[#102957] pt-6"><p className="text-sm leading-[1.7] text-[#536887]">This proprietary Cognirise model assesses the conditions that connect value, delivery, adoption, authority and outcomes. It does not rank AI consumption, certify compliance or claim a statistical benchmark.</p><BrandButton href="/methodologies" className="mt-6">View the methodology portfolio</BrandButton></div>
        </div>
      </header>

      <section className="px-6 pb-20 md:px-[4.8vw] lg:pb-28">
        <PulseImage
          src="/images/cognirise/method-value-to-scale.jpg"
          alt="Cinematic raster composition showing an organizational system at scale"
          className="w-full h-[60vh] object-cover rounded-sm shadow-md"
          fallbackColor="#102957"
        />
      </section>

      <MethodologyRelationship
        startHereWhen={<>An organization-wide or portfolio-level constraint prevents repeatable movement from opportunity to sustained value.</>}
        decision={<>What prevents repeatable movement from opportunity to sustained value?</>}
        output={<>A seven-dimension maturity profile, a register of evidence gaps, and prioritized actions.</>}
        connectsToIdao={<>Identifies systemic constraints, priorities and potential initiatives. Evidence determines whether selected work enters Innovate or a later IDAO stage; the method does not force every initiative to start at Innovate.</>}
        connectsToAuthority={<>Tests whether authority governance is an organizational capability. The Agent Authority Model separately sets actual autonomy limits for specific handovers in selected initiatives.</>}
        reassessWhen={<>After a completed IDAO cycle reveals new organizational evidence, or when market, platform, or regulatory constraints change materially.</>}
        doesNotDecide={<>Which specific use cases to fund next (use AI Use-Case Prioritization) or the readiness of a single workflow (use Agentic Operations Readiness).</>}
      />

      <section id="model" className="border-y border-[#cbd3e1] bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28">
        <h2 className="max-w-4xl font-display text-[clamp(42px,5.5vw,80px)] font-semibold leading-[.95] tracking-[-.08em]">Five stages. Seven conditions. Evidence before confidence.</h2>
        <div className="mt-12 mb-16 bg-white/5 border border-white/20 p-6 rounded-sm max-w-5xl">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
            <div className="space-y-4">
               <h3 className="font-bold text-xs text-white uppercase tracking-wider">Seven Conditions</h3>
                 <p className="text-xs text-white/70">{MATURITY_DIMENSIONS.map((dimension) => dimension.name).join(" · ")}</p>
               <div className="p-3 bg-[hsl(var(--brand-pink))]/20 border-l-2 border-[hsl(var(--brand-pink))]">
                  <p className="text-[11px] font-medium text-white">Weak-condition evidence can move work to an earlier IDAO entry or loopback. Stronger evidence can support a later entry; authority limits remain separate.</p>
               </div>
            </div>
            <div className="flex flex-col items-center gap-2">
               <ArrowRight className="text-white/30 hidden md:block" />
               <ArrowDown className="text-white/30 md:hidden" />
            </div>
            <div className="space-y-4">
               <div className="p-4 border border-white/20 rounded-sm">
                 <h3 className="font-bold text-xs text-white mb-2 uppercase tracking-wider">IDAO Entry Points</h3>
                 <ul className="text-xs text-white/70 space-y-1">
                    <li><strong>Innovate:</strong> investigate unresolved assumptions</li>
                    <li><strong>Demonstrate:</strong> prove the selected work in context</li>
                    <li><strong>Activate or Operate update:</strong> use sufficiently strong evidence responsibly</li>
                 </ul>
               </div>
               <div className="p-4 border border-[hsl(var(--brand-coral))] bg-[hsl(var(--brand-coral))]/10 rounded-sm">
                 <h3 className="font-bold text-xs text-white mb-1 uppercase tracking-wider">Agent Authority is Separate</h3>
                 <p className="text-xs text-white/70">VTS tests if governance is an organizational capability. The Agent Authority Model sets actual limits for specific handovers.</p>
               </div>
            </div>
          </div>
        </div>

        <div className="grid border-l border-t border-white/20 md:grid-cols-5">{MATURITY_STAGES.map((stage) => <div key={stage.score} className="border-b border-r border-white/20 p-5"><span className="text-xs text-[#ff9fcf]">0{stage.score}</span><h3 className="mt-6 font-display text-2xl font-semibold">{stage.name}</h3><p className="mt-3 text-xs leading-[1.55] text-[#c5d0e1]">{stage.test}</p></div>)}</div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{MATURITY_DIMENSIONS.map((dimension) => <div key={dimension.id} className="border-t border-white/30 pt-4"><h3 className="font-display text-xl font-semibold">{dimension.name}</h3><p className="mt-2 text-xs leading-[1.55] text-[#c5d0e1]">{dimension.question}</p></div>)}</div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-20"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]">How to use it</p><h2 className="mt-5 font-display text-[clamp(40px,5vw,70px)] font-semibold leading-[.97] tracking-[-.08em]">Score what the evidence supports.</h2></div><ol className="space-y-5 border-t border-[#102957] pt-6 text-sm leading-[1.65] text-[#405777]"><li><strong>1. Convene different perspectives.</strong> Include business, operations, technology, workforce and risk.</li><li><strong>2. Select the highest stage you can evidence.</strong> Aspirations and isolated pilots do not count as operating evidence.</li><li><strong>3. Inspect the pattern.</strong> Averages can hide a weak condition that prevents scale.</li><li><strong>4. Act on the lowest dimensions.</strong> Use the recommendations to frame a Value Scan or an IDAO entry point.</li></ol></div>
      </section>

      <ValueToScaleAssessment />

      <section className="px-6 py-20 md:px-[4.8vw]" aria-labelledby="sources-title"><h2 id="sources-title" className="font-display text-4xl font-semibold tracking-[-.06em]">Sources and model boundary</h2><p className="mt-4 max-w-3xl text-sm leading-[1.65] text-[#536887]">Sources were reviewed on 9 September 2026 to understand established management-system, risk and market maturity themes. Stage names, dimensions, prompts, scoring and action logic on this page are Cognirise proprietary content; they are not reproduced competitor benchmarks. No comparative percentile or performance claim is made.</p><ul className="mt-6 grid gap-3 md:grid-cols-2">{sources.map((source) => <li key={source.url}><a className="text-sm font-semibold underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></section>
    </article>
  );
}
