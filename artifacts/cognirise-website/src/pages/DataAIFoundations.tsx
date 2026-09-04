import { Link } from "wouter";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";

export default function DataAIFoundations() {
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
          What we do / {marketLocation}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.86fr_1.14fr] gap-12 lg:gap-16 items-end pb-12 min-h-[60vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[93px] leading-[0.94] font-semibold mb-8 max-w-[660px]">
              The ground for <em className="not-italic text-[hsl(var(--brand-pink))]">what comes next.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              Make data, controls and architecture ready for AI. We build the foundations that give intelligence a place to operate safely and effectively.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton href="/value-scan">Bring us one process</BrandButton>
              <button 
                onClick={() => document.getElementById("swimlane")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-2 border-b border-foreground pb-2 text-sm font-bold transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))]"
              >
                Explore delivery lifecycle <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-[640px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/cognirise-pulse-outcomes.jpg" 
              alt="A structured grid representing data architecture with glowing pathways." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              data
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">02 / foundations</span>
              Ready for production
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Target</span>
            <strong className="text-sm font-semibold text-foreground">AI-ready data & integration</strong>
          </div>
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Controls</span>
            <strong className="text-sm font-semibold text-foreground">Embedded governance</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Architecture</span>
            <strong className="text-sm font-semibold text-foreground">Scalable & secure</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Delivery</span>
            <strong className="text-sm font-semibold text-foreground">Production-first engineering</strong>
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
              Models are fast.<br />Data is <em className="not-italic text-[hsl(var(--brand-coral))]">stuck.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              An organisation cannot deploy intelligent agents if its data is siloed, its architecture is fragile, and its access controls are uncertain.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              We rebuild the data layer not as a passive warehouse, but as an active, governed foundation ready to supply context to enterprise intelligence.
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
            From discovery to scale.
          </h2>
        </div>

        {/* Swimlane Structure */}
        <div className="w-full overflow-x-auto pb-8 -mx-6 px-6 md:mx-0 md:px-0">
          <div className="min-w-[900px] border-l border-t border-border grid grid-cols-[140px_1fr_1fr_1fr_1fr]">
            {/* Header */}
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lane</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">01 / Discover</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">02 / Architect</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">03 / Build</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">04 / Scale</div>

            {/* People */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">People</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Identify data owners & consumers. Map operating constraints.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Define roles for data stewards & platform operators.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Forward-deployed engineers build data pipelines.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Teams utilize unified data for intelligence & operations.</div>

            {/* Systems */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Systems</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Audit existing warehouses, lakes, and legacy integrations.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Design scalable ingestion & serving architecture.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Deploy vector stores, APIs, and modern data platforms.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Continuous monitoring and automated data quality checks.</div>

            {/* Agents */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Agents</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Assess agent readiness and data requirements.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Map agent access patterns to knowledge sources.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Connect agents to structured & unstructured data.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Agents autonomously pull trusted context in real-time.</div>

            {/* Governance */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Governance</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Map compliance, sovereignty, and privacy requirements.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Design RBAC, audit trails, and anonymisation protocols.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Implement programmatic access controls.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Governed usage with full traceability & accountability.</div>

            {/* Evidence & Artifacts */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))] bg-[hsl(var(--secondary))]">Evidence</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Data Estate Audit</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Reference Architecture</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Production Pipelines</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">AI-Ready Knowledge Base</div>
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