import { Link } from "wouter";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { scrollToSection } from "@/lib/motion";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";

export default function EngineeringWithAI() {
  const { market } = useMarketStore();
  
  const marketLocation = getMarketLocationLabel(market);
  const heroKicker = cleanHeroIdentifier(`What we do / ${marketLocation}`, { marketLocation });

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {heroKicker}
        </div>
        
        <div className="grid grid-cols-1 items-end gap-12 pb-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[93px] leading-[0.94] font-semibold mb-8 max-w-[660px]">
              Ship the <em className="not-italic text-[hsl(var(--brand-pink))]">system.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              Forward-deployed engineers build, integrate and harden the products and platforms that take promising work into production.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton href="/value-scan">Bring us one process</BrandButton>
              <button 
                onClick={() => scrollToSection("swimlane")}
                className="group inline-flex items-center gap-2 border-b border-foreground pb-2 text-sm font-bold transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))]"
              >
                Explore delivery lifecycle <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-[640px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src={assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")}
              alt="An engineering flow moving through structured platforms." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              build
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">03 / engineering</span>
              Code that holds
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-36 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-[8vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The real problem
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[77px] leading-[0.98] font-semibold">
              The proof of concept <em className="not-italic text-[hsl(var(--brand-coral))]">died.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              Anyone can call an API. But building a resilient, secure system that integrates into a complex enterprise takes serious engineering.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              We deploy engineers who build production-grade platforms, bringing AI out of the sandbox and into the core operating environments where real work happens.
            </p>
          </div>
        </div>
      </section>

      <section id="swimlane" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full overflow-hidden">
        <div className="mb-16">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            Delivery lifecycle
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[68px] leading-[0.97] font-semibold max-w-[700px]">
            From prototype to production.
          </h2>
        </div>

        {/* Swimlane Structure */}
        <div className="w-full overflow-x-auto pb-8 -mx-6 px-6 md:mx-0 md:px-0">
          <div className="min-w-[900px] border-l border-t border-border grid grid-cols-[140px_1fr_1fr_1fr_1fr]">
            {/* Header */}
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lane</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">01 / Scope</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">02 / Design</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">03 / Build</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">04 / Deploy</div>

            {/* People */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">People</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Align product managers and technical sponsors.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Architects map system constraints and boundaries.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Forward-deployed engineers write resilient code.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">DevOps and site reliability engineers take ownership.</div>

            {/* Systems */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Systems</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Audit legacy infrastructure and API limits.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Create microservices and event-driven architectures.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Integrate foundation models with internal platforms.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">CI/CD pipelines push robust code to production.</div>

            {/* Agents */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Agents</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Identify where agent logic can accelerate tasks.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Design agent orchestration layers.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Develop custom tools and capabilities for agents.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Agents execute tasks within strict platform bounds.</div>

            {/* Governance */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Governance</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Define SLA, uptime, and security constraints.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Embed threat modeling and risk assessment.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Implement strict rate limiting and cost controls.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Continuous security scanning and audit logging.</div>

            {/* Evidence & Artifacts */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))] bg-[hsl(var(--secondary))]">Evidence</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Technical Scope</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">System Architecture</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Versioned Codebase</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Production Metrics</div>
          </div>
        </div>
      </section>

      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 bottom-[-5%] text-[20vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          MOVE
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            The first move
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[110px] leading-[0.88] font-semibold tracking-tight mb-8">
            Bring one process.<br />
            <em className="not-italic text-[#ff8470]">Leave with a route.</em>
          </h2>
          <p className="text-lg text-white/80 max-w-[515px] mb-12">
            Start with the work where urgency, complexity and value have already collided. In a focused working session, we surface the opportunity, constraints and a practical route to production.
          </p>
          <BrandButton href="/value-scan" variant="submit">Book a value scan</BrandButton>
        </div>
      </section>
    </div>
  );
}