import { Link } from "wouter";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";

export default function WorkProof() {
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {marketLocation} / Work & proof
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-12 lg:gap-16 items-end pb-12 min-h-[60vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[101px] leading-[0.93] font-semibold mb-8 max-w-[700px]">
              Proof lives in the <em className="not-italic text-[hsl(var(--brand-pink))]">work.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[440px] mb-10 leading-relaxed">
              From a priority mandate through the constraints, the build and governed production—we document what changes when intelligence moves real work.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton onClick={() => document.getElementById("proof")?.scrollIntoView({ behavior: "smooth" })}>
                See the proof model
              </BrandButton>
              <BrandButton href="/value-scan" variant="editorial">
                Bring one process
              </BrandButton>
            </div>
          </div>
          
          <div className="relative h-[440px] lg:h-[638px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-work-proof.jpg" 
              alt="A vivid violet-to-coral route moving through a white architectural model." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[155px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              proof
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">01 / work in motion</span>
              From mandate to governed production
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Starting point</span>
            <strong className="text-sm font-semibold text-foreground">One consequential process</strong>
          </div>
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">What we surface</span>
            <strong className="text-sm font-semibold text-foreground">Constraints before the build</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">What changes</span>
            <strong className="text-sm font-semibold text-foreground">Working systems, not slides</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">How it lasts</span>
            <strong className="text-sm font-semibold text-foreground">Governance in the flow</strong>
          </div>
        </div>
      </section>

      <section id="proof" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-[7vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Evidence, not theatre
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[78px] leading-[0.98] font-semibold">
              Change is only useful when it can be <em className="not-italic text-[hsl(var(--brand-coral))]">shown.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              Every engagement begins with the work under pressure: the decision, process, data and control environment that must move together.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              Where client details cannot be public, we describe the operating pattern clearly and label it as anonymized. We do not invent names, metrics or results.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-0 md:mx-12 max-w-[1440px] xl:mx-auto h-[500px] md:h-[620px] relative bg-[hsl(var(--brand-deep))] overflow-hidden">
        <img 
          src="/images/cognirise/pulse-breakthrough.jpg" 
          alt="A violet and coral current cutting through an architectural maze."
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-90 lg:opacity-100 lg:from-70%" />
        
        <div className="absolute bottom-12 lg:bottom-24 left-6 lg:left-16 max-w-[620px] z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
            The proof route
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[76px] font-semibold text-white leading-tight mb-6">
            Constraints are part of the brief.
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-[470px] leading-relaxed">
            Security, sovereignty, integration, accountability and adoption are not a postscript. They shape the route from the first working session through to production.
          </p>
        </div>
        
        <div className="absolute top-12 right-6 lg:right-12 text-[10px] uppercase tracking-widest text-white/60 writing-vertical-rl rotate-180">
          02 / documented delivery
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              How work is evidenced
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[73px] leading-[0.98] font-semibold">
              The delivery record, not the highlight reel.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-[410px]">
            A useful proof story makes its context, choices and operating controls visible—so leaders can judge what it took to make progress stick.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 border-t border-foreground pt-12 gap-8">
          {[
            ["01", "Mandate", "The priority work, the sponsor question and what a useful change needs to achieve."],
            ["02", "Constraints", "The data, architecture, security, sovereignty and operating realities that define the possible."],
            ["03", "Build", "Forward-deployed operators and engineers turn the route into a working system with the people who will run it."],
            ["04", "Governed production", "Controls, ownership and accountability are embedded where the work happens—not added at the end."]
          ].map(([n, title, copy], i) => (
            <div key={n} className="flex flex-col relative group">
              {/* Animated connector line */}
              {i < 3 && (
                <div className="hidden md:block absolute top-6 left-12 w-[calc(100%-3rem)] h-[1px] bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-pink))] opacity-20 group-hover:opacity-100 transition-opacity duration-500" />
              )}
              
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-[10px] font-bold tracking-widest text-muted-foreground mb-8 bg-white z-10 transition-all duration-300 group-hover:border-[hsl(var(--brand-pink))] group-hover:text-[hsl(var(--brand-pink))] group-hover:shadow-[0_0_0_4px_rgba(255,255,255,1)]">
                {n}
              </div>
              
              <h3 className="text-xl md:text-2xl font-semibold mb-4 transition-colors group-hover:text-[hsl(var(--brand-pink))]">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground max-w-[280px]">
                {copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[5vw]">
          <div className="lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Four ways work moves
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[70px] leading-[0.97] font-semibold mb-8">
              Outcomes with operating consequences.
            </h2>
            <p className="text-lg text-foreground/70 max-w-[400px] mb-12">
              We look for measurable movement in the forces that matter to an enterprise: cost, capacity, speed and risk. The right evidence depends on the mandate—not a predetermined dashboard.
            </p>
            
            <div className="grid grid-cols-2 border-t border-foreground mt-8">
              <div className="border-r border-b border-border p-4">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest block mb-2">01</span>
                <span className="font-semibold text-sm">Cost</span>
              </div>
              <div className="border-b border-border p-4">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest block mb-2">02</span>
                <span className="font-semibold text-sm">Capacity</span>
              </div>
              <div className="border-r border-b border-border p-4">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest block mb-2">03</span>
                <span className="font-semibold text-sm">Speed</span>
              </div>
              <div className="border-b border-border p-4">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest block mb-2">04</span>
                <span className="font-semibold text-sm">Risk</span>
              </div>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-auto lg:-mt-10 clip-diagonal-bottom">
            <img 
              src="/images/cognirise/cognirise-pulse-outcomes.jpg" 
              alt="A coral route passing through a violet arch and a navy structure." 
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="border-t border-foreground pt-8 flex flex-col lg:flex-row justify-between gap-8 lg:items-end mb-12">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Patterns, clearly labeled
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[72px] leading-[0.98] font-semibold max-w-[730px]">
              Some work must remain private. The method does not.
            </h2>
          </div>
          <p className="text-base text-muted-foreground max-w-[300px]">
            These are anonymized engagement patterns—not named case studies or claimed performance figures.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 mt-12">
          <figure className="relative bg-[hsl(var(--brand-deep))] overflow-hidden group h-[350px] lg:h-[460px]">
            <img src="/images/cognirise/site-work-proof.jpg" alt="An architectural route joining different operating environments." className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-transparent opacity-80" />
            <figcaption className="absolute bottom-6 left-6 z-10 text-white">
              <span className="block text-[10px] uppercase tracking-widest opacity-70 mb-2">Anonymized engagement pattern</span>
              <strong className="text-2xl md:text-4xl font-semibold">One process under pressure.</strong>
            </figcaption>
          </figure>
          
          <aside className="bg-[hsl(var(--brand-deep))] text-white p-8 md:p-10 flex flex-col justify-between min-h-[270px]">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
                <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
                What is documented
              </div>
              <p className="text-2xl md:text-[31px] leading-[1.1] font-semibold tracking-tight mb-8">
                Where work gets stuck. What can change. What must stay controlled.
              </p>
            </div>
            <small className="text-white/60 text-xs leading-relaxed block">
              The record follows the mandate through constraints, build decisions, governed release and the outcome measures that the sponsor can stand behind.
            </small>
          </aside>
        </div>
      </section>

      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 bottom-[-5%] text-[20vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          WORK
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            The first move
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[112px] leading-[0.88] font-semibold tracking-tight mb-8">
            Bring one process.<br />
            <em className="not-italic text-[#ff8470]">Make the proof useful.</em>
          </h2>
          <p className="text-lg text-white/80 max-w-[500px] mb-12">
            Start with work where urgency, complexity and value have already collided. Together we can surface the mandate, constraints and practical route to production.
          </p>
          <BrandButton href="/value-scan" variant="submit">
            Book a value scan
          </BrandButton>
        </div>
      </section>
    </div>
  );
}
