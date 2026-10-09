import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { BrandButton } from "@/components/ui/brand-button";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { HOME_CASES, HOME_CLOSING, HOME_COMMITMENTS, HOME_HERO, HOME_INDUSTRIES, HOME_SERVICES, HOME_STEPS } from "@/site/content/home";
import { INDUSTRY_CARDS } from "@/site/content/industries-hub";
import { HomeFilm } from "@/site/components/HomeFilm";
import { ServiceTiles } from "@/site/components/ServiceTiles";
import { StepsStrip } from "@/site/components/FourSteps";
import { CaseCards, IndustryCards } from "@/site/components/Cards";
import { ClosingBand } from "@/site/components/ClosingBand";
import { Kicker, Section, SectionHeading } from "@/site/components/Primitives";

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();
  const reveal = (delay: number) => ({
    initial: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: prefersReducedMotion ? 0 : 0.7, delay: prefersReducedMotion ? 0 : delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  });

  return (
    <div className="bg-[#fdfcfb] font-sans text-[#102957] selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      {/* Hero: layout, image panel and film unchanged; the words are new and render at once. */}
      <section className="public-hero-shell home-layout-frame overflow-hidden pt-8 md:pt-[22px]" aria-labelledby="page-title">
        <div className="grid grid-cols-1 items-start gap-10 pb-10 lg:grid-cols-[1fr_1fr] lg:gap-8 lg:pb-[34px]">
          <div className="flex max-w-[600px] flex-col lg:min-h-[640px] lg:max-w-none">
            <div className="flex flex-col gap-7">
              <NavigationBackControl embedded />
              <motion.div {...reveal(0)}>
                <Kicker>{HOME_HERO.kicker} · {HOME_HERO.markets}</Kicker>
              </motion.div>
            </div>
            <div className="mt-10 lg:mt-auto">
              <motion.h1
                id="page-title"
                className="mb-7 max-w-[660px] font-display text-[clamp(40px,4.8vw,76px)] font-semibold leading-[0.94] tracking-[-0.08em] [overflow-wrap:anywhere] xl:max-w-[820px]"
                {...reveal(0.05)}
              >
                {HOME_HERO.title}
              </motion.h1>
              <motion.p className="mb-8 max-w-[540px] text-[16.5px] leading-[1.6] text-[#405777] xl:max-w-[680px]" {...reveal(0.15)}>
                {HOME_HERO.lead}
              </motion.p>
              <motion.div className="flex flex-wrap items-center gap-x-6 gap-y-4" {...reveal(0.25)}>
                <BrandButton href={HOME_HERO.primary.href}>{HOME_HERO.primary.label}</BrandButton>
                <BrandButton href={HOME_HERO.secondary.href} variant="secondary">{HOME_HERO.secondary.label}</BrandButton>
              </motion.div>
            </div>
          </div>
          <motion.div
            className="relative h-[440px] overflow-hidden bg-[#101d3b] lg:h-[640px]"
            style={{ clipPath: "polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)" }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <HomeFilm />
          </motion.div>
        </div>
      </section>

      {/* Commitments strip: same layout as today, one explaining line added under each. */}
      <section id="home-commitments" className="home-layout-frame scroll-mt-28" aria-labelledby="commitments-heading">
        <h2 id="commitments-heading" className="sr-only">{HOME_COMMITMENTS.heading}</h2>
        <div className="relative border-y border-[#102957] before:absolute before:inset-x-0 before:bottom-0 before:h-[2px] before:bg-gradient-to-r before:from-[hsl(var(--brand-violet))] before:via-[hsl(var(--brand-pink))] before:to-[hsl(var(--brand-coral))]">
          <ul className="grid grid-cols-2 lg:grid-cols-4">
            {HOME_COMMITMENTS.items.map(({ before, after, line }, index) => (
              <li key={before} className={`flex flex-col gap-3 border-[#102957]/15 px-4 py-7 sm:px-6 lg:py-8 ${index % 2 === 0 ? "border-r" : ""} ${index < 2 ? "border-b lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}>
                <p className="text-[13px] font-medium tracking-wide text-[#53627a]">{before}</p>
                <div className="flex items-start gap-2.5">
                  <ArrowRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-[hsl(var(--brand-pink))]" strokeWidth={1.5} />
                  <p className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-.035em] text-[#102957] sm:text-[25px]">{after}</p>
                </div>
                <p className="text-[13px] leading-[1.5] text-[#405777]">{line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Three service cards, existing hover animation kept. */}
      <section id="service-lines" className="px-6 py-[82px] md:px-[4.8vw] lg:py-[125px]" aria-labelledby="services-heading">
        <SectionHeading id="services-heading" size="lg">{HOME_SERVICES.heading}</SectionHeading>
        <ServiceTiles className="mt-10 lg:mt-[65px]" />
      </section>

      {/* Four-step strip. */}
      <StepsStrip heading={HOME_STEPS.heading} lead={HOME_STEPS.lead} link={HOME_STEPS.link} />

      {/* Three case tiles with the legend tag. */}
      <Section tone="soft" labelledBy="cases-heading">
        <SectionHeading id="cases-heading">{HOME_CASES.heading}</SectionHeading>
        <CaseCards cards={HOME_CASES.cards} columns={3} link={HOME_CASES.link} />
      </Section>

      {/* Seven industry cards. */}
      <Section labelledBy="industries-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading id="industries-heading">{HOME_INDUSTRIES.heading}</SectionHeading>
          <Link href={HOME_INDUSTRIES.link.href} className="group inline-flex items-center gap-2 text-[14px] font-semibold text-[#102957] underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 hover:text-[hsl(var(--brand-pink))]">
            {HOME_INDUSTRIES.link.label}
            <ArrowRight aria-hidden="true" size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <IndustryCards cards={INDUSTRY_CARDS} compact />
      </Section>

      <ClosingBand heading={HOME_CLOSING.heading} body={HOME_CLOSING.body} cta={HOME_CLOSING.cta} />
    </div>
  );
}
