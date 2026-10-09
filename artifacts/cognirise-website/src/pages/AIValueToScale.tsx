import { ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { ValueToScaleAssessment } from "@/components/ValueToScaleAssessment";
import { MATURITY_DIMENSIONS, MATURITY_STAGES } from "@/lib/value-to-scale";
import { MethodologyRelationship } from "@/components/MethodologyRelationship";
import { MethodPageHero } from "@/components/MethodPageHero";
import { MethodologyCmsDelivery, methodologyEditorial, methodologyHero, useMethodologyCmsContent, useMethodologyCmsSeo } from "@/components/MethodologyCmsLayout";
import { aiValueToScaleEditorial } from "@workspace/api-zod";
import { VTS_EDITORIAL, VTS_HERO } from "@/site/content/methods/ai-value-to-scale";
import { methodSeo } from "@/site/content/methods/seo";

function AIValueToScaleContent() {
  const cms = useMethodologyCmsContent("ai-value-to-scale");
  useMethodologyCmsSeo(cms, methodSeo("/methodologies/ai-value-to-scale"));
  const editorial = methodologyEditorial<"ai-value-to-scale", typeof aiValueToScaleEditorial>(
    "ai-value-to-scale",
    cms,
    VTS_EDITORIAL,
  );
  const hero = methodologyHero(cms, VTS_HERO);
  return (
    <article className="overflow-hidden bg-[#fdfcfb] text-[#102957]">
      <MethodPageHero
        {...hero}
        imageResolved={"imageResolved" in hero && hero.imageResolved}
        supportingText={
          <div className="flex flex-col items-start gap-6">
            <p>{hero.supportingText}</p>
            <div className="flex items-center gap-6">
              <BrandButton href={editorial.heroActions.assessment.href}>{editorial.heroActions.assessment.label}</BrandButton>
              <a href={editorial.heroActions.model.href} className="inline-flex items-center gap-2 text-[13px] font-bold underline underline-offset-4 text-[#102957] hover:text-[hsl(var(--brand-pink))] transition-colors">
                {editorial.heroActions.model.label} <ArrowDown size={14} />
              </a>
            </div>
          </div>
        }
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
      <section id="model" className="border-y border-[#cbd3e1] bg-[#102957] px-6 py-20 text-white md:px-[4.8vw] lg:py-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-[radial-gradient(circle_at_top_right,rgba(154,99,218,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#d6deed] mb-5">
            <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            {editorial.model.kicker}
          </div>
          <h2 className="max-w-4xl font-display text-[clamp(42px,5.5vw,80px)] font-semibold leading-[.95] tracking-[-.05em]">
            {editorial.model.heading}
          </h2>
          
          <div className="mt-16 bg-[#071936] border border-white/20 p-8 lg:p-10 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-10 items-center">
              <div className="space-y-5">
                 <h3 className="font-display text-2xl font-bold text-white tracking-[-0.03em]">{editorial.model.conditionsHeading}</h3>
                 <p className="text-[14px] text-[#d6deed] leading-relaxed">
                   {MATURITY_DIMENSIONS.map((dimension) => dimension.name).join(" · ")}
                 </p>
                 <div className="p-4 bg-[hsl(var(--brand-pink))]/10 border-l-2 border-[hsl(var(--brand-pink))]">
                    <p className="text-[12px] font-medium text-white leading-relaxed">
                       {editorial.model.conditionsNote}
                    </p>
                 </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <ArrowRight className="text-[#647491] hidden lg:block" size={32} />
                 <ArrowDown className="text-[#647491] lg:hidden" size={32} />
              </div>
              <div className="space-y-5">
                 <div className="p-5 border border-white/10 bg-white/5">
                    <h3 className="font-display text-xl font-bold text-white mb-4 tracking-[-0.03em]">{editorial.model.idaoEntryPointsHeading}</h3>
                   <ul className="text-[13px] text-[#d6deed] space-y-3">
                      {editorial.model.idaoEntryPoints.map((entry, index) => (
                        <li key={entry.label} className="flex gap-3 items-start">
                          <CheckCircle2 size={16} className={index === 0 ? "text-[hsl(var(--brand-violet))] shrink-0 mt-0.5" : index === 1 ? "text-[hsl(var(--brand-pink))] shrink-0 mt-0.5" : "text-[hsl(var(--brand-coral))] shrink-0 mt-0.5"} />
                          <span><strong>{entry.label}</strong> {entry.description}</span>
                        </li>
                      ))}
                   </ul>
                 </div>
                 <div className="p-5 border border-[hsl(var(--brand-coral))]/30 bg-[hsl(var(--brand-coral))]/10">
                    <h3 className="font-display text-lg font-bold text-white mb-2 tracking-[-0.03em]">{editorial.model.authorityHeading}</h3>
                    <p className="text-[12px] text-[#d6deed] leading-relaxed">{editorial.model.authorityBody}</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="mt-20 border-t border-white/20 pt-16">
            <h3 className="font-display text-3xl font-semibold mb-10 tracking-[-0.04em]">{editorial.model.stagesHeading}</h3>
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
            <h3 className="font-display text-3xl font-semibold mb-10 tracking-[-0.04em]">{editorial.model.dimensionsHeading}</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {MATURITY_DIMENSIONS.map((dimension) => (
                <div key={dimension.id} className="border-t border-[hsl(var(--brand-violet))]/40 pt-6">
                  <h4 className="font-display text-xl font-semibold mb-3">{dimension.name}</h4>
                  <p className="text-[13px] leading-[1.6] text-[#b9c7db]">{dimension.summary}</p>
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
                {editorial.instructions.kicker}
              </div>
              <h2 className="font-display text-[clamp(40px,5vw,70px)] font-semibold leading-[.95] tracking-[-.05em]">{editorial.instructions.heading}</h2>
            </div>
            
            <div className="border-l border-[#cbd3e1] pl-8 lg:pl-12">
              <ol className="space-y-10">
                {editorial.instructions.steps.map((step) => (
                  <li key={step.number} className="relative">
                    <span className="absolute -left-[45px] lg:-left-[61px] top-1 text-[10px] font-bold text-[#647491]">{step.number}</span>
                    <h3 className="font-display text-xl font-semibold mb-2">{step.heading}</h3>
                    <p className="text-[15px] leading-[1.65] text-[#536887]">{step.body}</p>
                  </li>
                ))}
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
            <h2 id="sources-title" className="font-display text-4xl font-semibold tracking-[-.04em]">{editorial.sources.heading}</h2>
            <p className="mt-5 text-[15px] leading-[1.65] text-[#536887]">
              {editorial.sources.boundary}
            </p>
          </div>
          <div className="lg:border-l border-[#cbd3e1] lg:pl-12">
            <ul className="grid gap-4">
              {editorial.sources.links.map((source) => (
                <li key={source.href} className="flex items-start gap-3 group">
                  <ArrowRight className="text-[#cbd3e1] group-hover:text-[hsl(var(--brand-pink))] transition-colors shrink-0 mt-1" size={16} />
                  <a className="text-[14px] font-medium text-[#405777] group-hover:text-[#102957] transition-colors" href={source.href} target="_blank" rel="noreferrer">
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

export default function AIValueToScale() {
  return <MethodologyCmsDelivery slug="ai-value-to-scale"><AIValueToScaleContent /></MethodologyCmsDelivery>;
}
