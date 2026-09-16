import React from "react";
import { ArrowDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { PulseImage } from "@/components/ui/pulse-image";
import { assetUrl } from "@/lib/assets";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";

interface MethodPageHeroProps {
  breadcrumb: string;
  title: string;
  description: string;
  supportingText?: React.ReactNode;
  imageSrc?: string;
  /** CMS media URLs are already resolved and must not be rewritten as assets. */
  imageResolved?: boolean;
  imageAlt?: string;
  imagePosition?: string;
  imageCaptionSubtitle?: string;
  imageCaptionTitle?: string;
  actions?: React.ReactNode;
}

export function MethodPageHero({
  breadcrumb,
  title,
  description,
  supportingText,
  imageSrc,
  imageResolved = false,
  imageAlt,
  imagePosition,
  imageCaptionSubtitle,
  imageCaptionTitle,
  actions,
}: MethodPageHeroProps) {
  const reducedMotion = useReducedMotion();
  const { market } = useMarketStore();
  const marketLocation = getMarketLocationLabel(market);

  return (
    <header className="public-hero-shell px-6 pb-16 pt-9 md:px-[4.8vw] lg:pb-24 border-b border-[#cbd3e1]">
      <div className={`grid gap-10 ${imageSrc ? "lg:grid-cols-[0.9fr_1.1fr] lg:items-start" : "max-w-4xl"}`}>
        <motion.div 
          className={`flex flex-col ${imageSrc ? "lg:min-h-[620px]" : ""}`}
          initial={reducedMotion ? false : { opacity: 0, x: -24 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: reducedMotion ? 0 : 0.65 }}
        >
          <div className="flex flex-col gap-7">
            <NavigationBackControl embedded />
            <div data-hero-content-edge className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957]">
              <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              {cleanHeroIdentifier(breadcrumb, { marketLocation })}
            </div>
          </div>
          <div className={`${imageSrc ? "mt-14 lg:mt-auto" : "mt-8"}`}>
            <h1 className={`font-display ${imageSrc ? "text-[clamp(45px,7vw,100px)]" : "text-[clamp(45px,6vw,80px)]"} font-semibold leading-[0.88] tracking-[-0.08em]`}>
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
            {actions && (
              <div className="mt-8">
                {actions}
              </div>
            )}
          </div>
        </motion.div>

        {imageSrc && (
          <motion.figure
            initial={reducedMotion ? false : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 1, ease: [0.2, 0.7, 0.2, 1] }}
            data-methodology-hero-frame
            className="clip-diagonal relative h-[430px] overflow-hidden bg-[#071936] md:h-[520px] lg:h-[620px]"
          >
            <PulseImage
              src={imageResolved ? imageSrc : assetUrl(imageSrc)}
              alt={imageAlt || ""}
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
        )}
      </div>
    </header>
  );
}
