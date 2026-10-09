import { BrandButton } from "@/components/ui/brand-button";
import type { Cta } from "@/site/content/types";

/** The dark closing band at the foot of every page: heading, one or two sentences, the one call to action. */
export function ClosingBand({ heading, body, cta, secondary, watermark = "PULSE" }: { heading: string; body: string; cta: Cta; secondary?: Cta; watermark?: string }) {
  return (
    <section className="relative overflow-hidden bg-[#102957] px-6 py-[77px] text-white md:px-[4.8vw] lg:py-[104px]" aria-labelledby="closing-heading">
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-18px] right-[-10px] select-none font-display text-[19vw] font-semibold leading-[0.7] tracking-[-0.11em] text-white/[0.06]">
        {watermark}
      </div>
      <div className="relative z-10 max-w-[970px]">
        <h2 id="closing-heading" className="font-display text-[clamp(40px,6vw,88px)] font-semibold leading-[0.9] tracking-[-0.08em]">
          {heading}
        </h2>
        <p className="mt-6 max-w-[560px] text-[17px] leading-[1.6] text-[#d6deed]">{body}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <BrandButton href={cta.href} variant="inverse">{cta.label}</BrandButton>
          {secondary && <BrandButton href={secondary.href} variant="secondary" className="pulse-action-on-dark">{secondary.label}</BrandButton>}
        </div>
      </div>
    </section>
  );
}
