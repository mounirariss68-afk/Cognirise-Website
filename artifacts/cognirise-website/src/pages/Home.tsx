import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { useRef, useState } from "react";
import { BlueprintJourney } from "@/components/BlueprintJourney";
import { HeroFilm } from "@/components/HeroFilm";
import { ServiceLineTiles } from "@/components/ServiceLineTiles";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { cmsEntryRenderPolicy, contentRecord, useCmsEntry } from "@/lib/cms";
import { IndustryPicker } from "@/components/IndustryPicker";

const Kicker = ({ children, className = "text-[#102957]" }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex items-center gap-3 text-[10px] tracking-[0.12em] uppercase font-semibold ${className}`}>
    <div className="w-[23px] h-[2px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
    {children}
  </div>
);

const SectionHeading = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <h2 className={`font-display font-semibold text-[clamp(42px,5vw,78px)] tracking-[-0.075em] leading-[0.98] mt-6 ${className}`}>
    {children}
  </h2>
);

export default function Home() {
  const { market } = useMarketStore();
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const frameworkQuery = useCmsEntry("framework", "agent-authority-model");
  const frameworkRenderPolicy = cmsEntryRenderPolicy(frameworkQuery.isAuthoritative, frameworkQuery.delivery);
  const frameworkRecord = frameworkQuery.data ? contentRecord(frameworkQuery.data, "framework") : null;
  const featuredFramework = frameworkRecord?.template === "agent-authority" ? frameworkRecord : null;
  const frameworkHero = featuredFramework?.heroMediaId
    ? featuredFramework.media?.find((media) => media.id === featuredFramework.heroMediaId)
    : undefined;
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const yHeroImage = useTransform(heroScrollProgress, [0, 1], [0, prefersReducedMotion ? 0 : 24]);

  const mConfig = {
    initial: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: {
      duration: prefersReducedMotion ? 0 : 0.8,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    }
  };

  const outcomes = [
    ["01", "Architecture"],
    ["02", "Engineering"],
    ["03", "Assurance"],
    ["04", "Risk"]
  ];

  return (
    <div className="bg-[#fdfcfb] text-[#102957] font-sans overflow-x-hidden selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      
      {/* HERO */}
      <section ref={heroRef} className="px-6 md:px-[4.8vw] pt-8 md:pt-[22px] overflow-hidden">
        <motion.div 
          initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Kicker>{marketLocation} / AI-native advisory & engineering</Kicker>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.94fr_1.06fr] gap-10 lg:gap-[4vw] items-end min-h-[auto] lg:min-h-[680px] pb-10 lg:pb-[34px] mt-8 lg:mt-0">
          <motion.div className="max-w-[600px] lg:max-w-none">
            <motion.h1
              className="font-display font-semibold text-[clamp(50px,6.3vw,100px)] leading-[0.94] tracking-[-0.08em] mt-8 mb-7"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              Intelligence becomes <em className="not-italic text-[hsl(var(--brand-pink))]">momentum.</em>
            </motion.h1>
            
            <motion.p
              className="text-[16.5px] leading-[1.6] text-[#405777] max-w-[440px] mb-8"
              initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
            >
              <strong className="text-[#102957]">Cognirise is the AI-native advisory and engineering firm.</strong> Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.
            </motion.p>
            
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <BrandButton href="/#service-lines">Explore our practice</BrandButton>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="h-[440px] lg:h-[640px] relative overflow-hidden bg-[#101d3b]"
            style={{ 
              y: yHeroImage,
              clipPath: "polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)" 
            }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, clipPath: "polygon(10% 0, 100% 0, 100% 0, 0 0, 0 12%)" }}
            animate={{ opacity: 1, clipPath: "polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)" }}
            transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <HeroFilm />
          </motion.div>
        </div>
      </section>

      {/* PROOF LEDGER */}
      <section className="mx-6 md:mx-[4.8vw] border-y border-[#102957] grid grid-cols-2 lg:grid-cols-4" aria-label="Cognirise company qualities">
        {[
          { label: "Model", value: "Advisory + Engineering" },
          { label: "Focus", value: "Complex enterprise & government" },
          { label: "Platform", value: "CogniOS (Four native engines)" },
          { label: "Presence", value: "Middle East & Europe" }
        ].map((item, i) => (
          <div key={item.label} className={`p-4 lg:p-[18px_20px] text-[12px] leading-[1.4] border-[#cbd3e1]
            ${i % 2 === 0 ? 'border-r' : ''} 
            ${i < 2 ? 'border-b lg:border-b-0' : ''} 
            lg:border-r lg:last:border-r-0`}>
            <b className="block text-[11px] tracking-[0.11em] uppercase mb-2 text-[#6a7891]">{item.label}</b>
            <strong className="font-semibold">{item.value}</strong>
          </div>
        ))}
      </section>

      {/* STATEMENT */}
      <section className="px-6 md:px-[4.8vw] py-[86px] lg:py-[150px] grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-[7vw]">
        <motion.div {...mConfig}>
          <Kicker>The firm</Kicker>
          <SectionHeading>
            We don't sell experimentation. <em className="not-italic text-[hsl(var(--brand-coral))]">We sell operational reality.</em>
          </SectionHeading>
        </motion.div>
        
        <motion.div 
          className="self-end border-t border-[#cbd3e1] pt-6 text-[18px] lg:text-[21px] leading-[1.44] text-[#30486d] max-w-[520px]"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.2 }}
        >
          <p className="mb-0">Most AI programmes fail because they treat intelligence as software to be deployed rather than a capability to be governed. We bridge the gap between algorithmic potential and enterprise authority.</p>
          <small className="block text-[12px] leading-[1.55] mt-6 text-[#647491]">We work with leaders who hold accountability for results, providing the advisory clarity to move and the engineering certainty to hold ground.</small>
        </motion.div>
      </section>

      {/* METHODOLOGIES */}
      {frameworkRenderPolicy !== "loading" && frameworkRenderPolicy !== "unavailable" && (
      <section className="mx-6 md:mx-[4.8vw] mb-6 lg:mb-10 bg-[hsl(var(--brand-deep))] text-white px-6 md:px-12 py-16 lg:py-24 relative overflow-hidden group">
        <div className="absolute inset-0 pointer-events-none opacity-20 transition-opacity duration-700 group-hover:opacity-40">
          <PulseImage
            src={frameworkHero?.url ?? assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")}
            alt={frameworkHero?.altText || "A luminous gateway marking the boundary of permitted agent authority."}
            className="w-full h-full object-cover mix-blend-screen"
          />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Kicker className="text-white/80">How we do it</Kicker>
            <h2 className="font-display font-semibold text-[clamp(42px,5.3vw,80px)] tracking-[-0.075em] leading-[0.96] my-4 max-w-[600px]">
              {featuredFramework?.title ?? "The Agent Authority Model."}
            </h2>
            <p className="max-w-[450px] text-[15px] leading-[1.6] text-[#dce4f0] mb-10">
              {featuredFramework?.teaser ?? "A deterministic way to set how much authority each agent handover may exercise on its own."}
            </p>
            <div className="flex flex-wrap gap-4">
              <BrandButton href="/methodologies/idao" variant="inverse">Explore IDAO</BrandButton>
              <BrandButton href="/methodologies/agent-authority-model" variant="inverse">Agent Authority Model</BrandButton>
            </div>
          </motion.div>

          <motion.div
            className="hidden lg:flex flex-col gap-4 pl-10 border-l border-white/20"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Framework Applications</div>
            {[
              { title: "Levels of Autonomy", desc: "Define explicit boundaries for model operation." },
              { title: "The Authority Matrix", desc: "Map capability against enterprise risk." },
              { title: "Promotion Evidence", desc: "Deterministic requirements for agent escalation." }
            ].map(item => (
              <div key={item.title} className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
                <strong className="block text-lg font-display text-[hsl(var(--brand-pink))] mb-1">{item.title}</strong>
                <span className="text-sm text-[#dce4f0]">{item.desc}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
      )}

      {/* MODEL */}
      <section id="service-lines" className="px-6 md:px-[4.8vw] py-[82px] lg:py-[125px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-end">
          <motion.div {...mConfig}>
            <Kicker>How we work</Kicker>
            <h2 className="font-display font-semibold text-[clamp(43px,5vw,72px)] leading-[0.97] tracking-[-0.08em] mt-5 max-w-[700px]">
              We combine strategy, engineering and platform.
            </h2>
          </motion.div>
          <motion.p 
            className="text-[16px] leading-[1.55] max-w-[410px] text-[#42587b] m-0 lg:mt-0 mt-2"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
            We don't hand over a presentation and wish you luck. We deploy senior teams who take accountability for the architecture, the code and the outcome.
          </motion.p>
        </div>
        
        <ServiceLineTiles variant="summary" source="homepage" className="mt-10 lg:mt-[65px]" />
      </section>

      {/* BLUEPRINT */}
      <BlueprintJourney />

      {/* CLARITY */}
      <section className="mx-6 md:mx-[4.8vw] mb-[82px] lg:mb-[122px] border-t border-[#102957] pt-7 grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-10 lg:gap-[7vw]">
        <motion.div {...mConfig}>
          <Kicker>Operating conviction</Kicker>
          <h2 className="font-display font-semibold text-[40px] lg:text-[clamp(37px,4.4vw,65px)] leading-[0.98] tracking-[-0.075em] mt-4 mb-6 max-w-[720px]">
            We leave organisations <em className="not-italic text-[hsl(var(--brand-violet))]">more capable</em> than we found them.
          </h2>
          <div className="text-[15px] lg:text-[16px] leading-[1.65] text-[#405777] max-w-[590px]">
            We don't create dependencies. <strong className="text-[#102957]">Every engagement is designed to transfer capability to your team.</strong> Whether we're advising the board or committing code alongside your engineers, our goal is to build an environment you can operate and scale yourselves.
          </div>
        </motion.div>
        
        <motion.div 
          className="self-end border-t border-[#cbd3e1] pt-6 mt-2 lg:mt-0"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.3 }}
        >
          <div className="text-[14px] leading-[1.55] text-[#536887] mb-6">We embed our practices into your firm:</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#cbd3e1]">
            {outcomes.map(([num, text], i) => (
              <motion.div 
                key={text}
                className={`p-[16px_8px] font-display font-semibold text-[15px] border-[#cbd3e1]
                  ${i % 2 === 0 ? 'border-r' : ''} 
                  ${i < 2 ? 'border-b lg:border-b-0' : ''} 
                  lg:border-r lg:last:border-r-0`}
                initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: prefersReducedMotion ? 0 : 0.4 + (i * 0.1) }}
              >
                <span className="block font-sans text-[10px] text-[hsl(var(--brand-pink))] tracking-[0.1em] mb-2">{num}</span>
                {text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* IMAGE LEDGER */}
      <section className="px-6 md:px-[4.8vw] pb-[82px] lg:pb-[122px]" aria-label="Cognirise outcomes in motion">
        <div className="py-6 lg:py-[25px] border-t border-[#102957] flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5">
          <motion.div {...mConfig}>
            <Kicker>The system in motion</Kicker>
            <h2 className="font-display font-semibold text-[41px] lg:text-[clamp(39px,4.7vw,69px)] leading-[0.97] tracking-[-0.08em] mt-4 lg:mt-[18px] max-w-[660px]">
              Three conditions for change that holds.
            </h2>
          </motion.div>
          <motion.p
            className="max-w-[290px] text-[14px] leading-[1.5] text-[#536887]"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
            We build the path, the controls and the capacity to keep the work moving after the first release.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] grid-rows-[350px_240px_240px] lg:grid-rows-[310px_310px] gap-3 mt-8 lg:mt-[42px]">
          <motion.figure 
            className="relative overflow-hidden bg-[#071936] group lg:row-span-2"
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <PulseImage src={assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")} alt="Visual representation of operational boundaries." className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/75 to-transparent via-[#071936]/20" />
            <motion.figcaption
              className="absolute z-10 left-6 bottom-5 text-white"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.3 }}
            >
              <span className="block text-[10px] uppercase tracking-[0.12em] opacity-75 mb-2">First condition</span>
              <strong className="font-display font-semibold text-[clamp(25px,3.4vw,48px)] leading-none tracking-[-0.06em] group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">Boundaries you can see.</strong>
            </motion.figcaption>
          </motion.figure>
          
          <motion.figure 
            className="relative overflow-hidden bg-[#071936] group"
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <PulseImage src={assetUrl("/images/cognirise/cognirise-pulse-people.jpg")} alt="Visual representation of people and agents in a shared architecture." className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/75 to-transparent via-[#071936]/20" />
            <motion.figcaption
              className="absolute z-10 left-6 bottom-5 text-white"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.4 }}
            >
              <span className="block text-[10px] uppercase tracking-[0.12em] opacity-75 mb-2">Second condition</span>
              <strong className="font-display font-semibold text-[clamp(19px,2.2vw,30px)] leading-none tracking-[-0.06em] group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">Work that flows.</strong>
            </motion.figcaption>
          </motion.figure>
          
          <motion.figure 
            className="relative overflow-hidden bg-[#071936] group"
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <PulseImage src={assetUrl("/images/cognirise/site-cognios.jpg")} alt="Visual representation of a durable system." className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/75 to-transparent via-[#071936]/20" />
            <motion.figcaption
              className="absolute z-10 left-6 bottom-5 text-white"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.5 }}
            >
              <span className="block text-[10px] uppercase tracking-[0.12em] opacity-75 mb-2">Third condition</span>
              <strong className="font-display font-semibold text-[clamp(19px,2.2vw,30px)] leading-none tracking-[-0.06em] group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">A platform that remembers.</strong>
            </motion.figcaption>
          </motion.figure>
        </div>
      </section>

      {/* CONVERGE */}
      <section className="bg-[#eef0f5] px-6 md:px-[4.8vw] pb-[80px] lg:pb-[126px]">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:min-h-[590px]">
          <motion.div 
            className="pt-[76px] lg:pt-[90px] pr-0 lg:pr-[9%] pb-[42px] lg:pb-[60px]"
            initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Kicker>Our capability</Kicker>
            <h2 className="font-display font-semibold text-[43px] lg:text-[clamp(43px,5vw,76px)] leading-[0.97] tracking-[-0.08em] my-5 lg:my-7">
              We deploy teams who bridge the entire operating gap.
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#3e567b] max-w-[410px]">
              You don't need a strategy firm that can't code, or an engineering shop that doesn't understand governance. You need a team that takes the work all the way through.
            </p>
            
            <div className="mt-10 border-t border-[#102957]">
              {[
                { num: "01", text: "Strategy & operating model advisory" },
                { num: "02", text: "Forward-deployed enterprise engineering" },
                { num: "03", text: "Proprietary CogniOS operating system" }
              ].map(item => (
                <div key={item.num} className="py-3 border-b border-[#cbd3e1] text-[13px] font-semibold">
                  <span className="inline-block text-[hsl(var(--brand-pink))] text-[10px] tracking-[0.1em] w-[54px]">{item.num}</span>
                  {item.text}
                </div>
              ))}
            </div>
            <div className="mt-8">
              <BrandButton href="/about">Meet the team</BrandButton>
            </div>
          </motion.div>
          
          <div className="h-[390px] lg:h-auto lg:mt-[-46px] relative overflow-hidden" style={{ clipPath: "polygon(0 8%, 100% 0, 100% 100%, 9% 92%)" }}>
            <PulseImage src={assetUrl("/images/cognirise/pulse-convergence.jpg")} alt="Depiction of convergence" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[#071936]/10" />
            <div className="absolute right-6 bottom-6 text-white text-[10px] tracking-[0.11em] uppercase drop-shadow-md">
              people + agents
            </div>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <IndustryPicker id="home-industries" />

      {/* START */}
      <section className="bg-[#102957] text-white px-6 md:px-[4.8vw] py-[77px] lg:py-[104px] pb-[82px] lg:pb-[112px] relative overflow-hidden">
        <div className="absolute right-[-10px] bottom-[-18px] font-display font-semibold text-[19vw] leading-[0.7] tracking-[-0.11em] text-white/[0.06] pointer-events-none">
          PULSE
        </div>
        
        <div className="relative z-10 max-w-[970px]">
          <motion.div {...mConfig}>
            <Kicker className="text-white/80">Start</Kicker>
            <h2 className="font-display font-semibold text-[58px] lg:text-[clamp(52px,7.5vw,113px)] tracking-[-0.095em] leading-[0.88] my-6">
              Ready for <em className="not-italic text-[#ff8470]">operational reality?</em>
            </h2>
            <p className="text-[17px] leading-[1.55] max-w-[480px] text-[#d6deed] mb-8">
              Speak with a partner about deploying governed intelligence into your core workflows.
            </p>
            
            <BrandButton href="/contact" variant="inverse">Book a consultation</BrandButton>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
