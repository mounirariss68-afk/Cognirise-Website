import type { ReactNode } from "react";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { assetUrl } from "@/lib/assets";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import type { Cta } from "@/site/content/types";
import { Kicker } from "./Primitives";

/**
 * The page hero used on every public page except Home. Text on the left,
 * the page's existing image on the right with the site's diagonal cut. The
 * image is decorative framing for the copy; it keeps the alt text it has today.
 */
export function PageHero({
  kicker,
  title,
  lead,
  primary,
  secondary,
  image,
  media,
  children,
}: {
  kicker?: string;
  title: ReactNode;
  lead: string;
  primary?: Cta;
  secondary?: Cta;
  image?: { src: string; alt: string; caption?: string };
  /** Optional media element (a video) that replaces the image. */
  media?: ReactNode;
  children?: ReactNode;
}) {
  const hasVisual = Boolean(image || media);
  return (
    <section className="public-hero-shell home-layout-frame overflow-hidden pt-8 md:pt-[22px]" aria-labelledby="page-title">
      <div className={`grid grid-cols-1 items-start gap-10 pb-10 lg:pb-[34px] ${hasVisual ? "lg:grid-cols-[0.95fr_1.05fr] lg:gap-[5vw]" : ""}`}>
        <div className={`flex flex-col ${hasVisual ? "lg:min-h-[560px]" : ""}`}>
          <div className="flex flex-col gap-7">
            <NavigationBackControl embedded />
            {kicker && <Kicker>{kicker}</Kicker>}
          </div>
          <div className="mt-10 lg:mt-auto">
            <h1
              id="page-title"
              className="mb-7 max-w-[760px] font-display text-[clamp(40px,5vw,78px)] font-semibold leading-[0.94] tracking-[-0.075em] text-[#102957] [overflow-wrap:anywhere]"
            >
              {title}
            </h1>
            <p className="mb-8 max-w-[600px] text-[17px] leading-[1.6] text-[#405777]">{lead}</p>
            {(primary || secondary) && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                {primary && <BrandButton href={primary.href}>{primary.label}</BrandButton>}
                {secondary && <BrandButton href={secondary.href} variant="secondary">{secondary.label}</BrandButton>}
              </div>
            )}
            {children}
          </div>
        </div>
        {hasVisual && (
          <div
            className="relative h-[380px] overflow-hidden bg-[#071936] lg:h-[560px]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)" }}
          >
            {media ?? (image && (
              <PulseImage src={image.src.startsWith("http") ? image.src : assetUrl(image.src)} alt={image.alt} className="h-full w-full object-cover" eager />
            ))}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#071936]/45 via-transparent to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071936]/50 via-transparent to-transparent" />
            {image?.caption && (
              <span className="absolute bottom-7 left-8 z-10 text-[10px] uppercase tracking-[0.13em] text-white">{image.caption}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
