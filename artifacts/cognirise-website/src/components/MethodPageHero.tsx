import { ArrowLeft, ArrowDown } from "lucide-react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { PulseImage } from "@/components/ui/pulse-image";
import { assetUrl } from "@/lib/assets";
import { useMethodReturn } from "@/lib/use-method-return";

interface MethodPageHeroProps {
  breadcrumb: string;
  title: string;
  description: string;
  supportingText?: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: string;
  imageCaptionSubtitle?: string;
  imageCaptionTitle?: string;
}

export function MethodPageHero({
  breadcrumb,
  title,
  description,
  supportingText,
  imageSrc,
  imageAlt,
  imagePosition,
  imageCaptionSubtitle,
  imageCaptionTitle,
}: MethodPageHeroProps) {
  const reducedMotion = useReducedMotion();
  const returnTo = useMethodReturn(title);

  return (
    <header className="px-6 pb-16 pt-9 md:px-[4.8vw] lg:pb-24 border-b border-[#cbd3e1]">
      <div className="mb-8">
        <Link 
          href={returnTo.href}
          data-method-return
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#647491] hover:text-[hsl(var(--brand-pink))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
        >
          <ArrowLeft size={14} /> {returnTo.label}
        </Link>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957]">
        <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
        {breadcrumb}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <motion.div 
          initial={reducedMotion ? false : { opacity: 0, x: -24 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: reducedMotion ? 0 : 0.65 }}
        >
          <h1 className="mt-5 font-display text-[clamp(45px,7vw,100px)] font-semibold leading-[0.88] tracking-[-0.08em] max-w-4xl">
            {title}
          </h1>
          <p className="mt-8 max-w-[620px] text-[19px] leading-[1.58] text-[#405777]">
            {description}
          </p>
          {supportingText && (
            <div className="mt-8 border-t border-[#102957] pt-6 text-[15px] leading-[1.65] text-[#536887] max-w-[620px]">
              {supportingText}
            </div>
          )}
        </motion.div>

        <motion.figure
          initial={reducedMotion ? false : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reducedMotion ? 0 : 1, ease: [0.2, 0.7, 0.2, 1] }}
          data-methodology-hero-frame
          className="clip-diagonal relative h-[430px] overflow-hidden bg-[#071936] md:h-[520px] lg:h-[620px]"
        >
          <PulseImage
            src={assetUrl(imageSrc)}
            alt={imageAlt}
            className="h-full w-full object-cover"
            style={imagePosition ? { objectPosition: imagePosition } : undefined}
            eager
          />
          {(imageCaptionSubtitle || imageCaptionTitle) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/90 via-[#071936]/10 to-transparent" />
              <figcaption className="absolute bottom-[11%] left-6 right-7 text-white md:left-10 md:right-[12%] lg:left-12">
                {imageCaptionSubtitle && <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/70">{imageCaptionSubtitle}</span>}
                {imageCaptionTitle && <strong className="mt-2 block max-w-[540px] font-display text-[clamp(24px,3vw,40px)] leading-[1.04] tracking-[-0.06em]">{imageCaptionTitle}</strong>}
              </figcaption>
            </>
          )}
        </motion.figure>
      </div>
    </header>
  );
}
