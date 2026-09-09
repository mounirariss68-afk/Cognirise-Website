import { ArrowDown } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { scrollToSection } from "@/lib/motion";

export default function SovereignRegulatedAI() {
  const { market } = useMarketStore();
  
  const marketLocation = getMarketLocationLabel(market);

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          What we do / {marketLocation}
        </div>
        
        <div className="grid grid-cols-1 items-end gap-12 pb-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[93px] leading-[0.94] font-semibold mb-8 max-w-[660px]">
              Control is not <em className="not-italic text-[hsl(var(--brand-pink))]">optional.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              Design the work around local control, explainability and the obligations of the operating environment.
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
              src={assetUrl("/images/cognirise/site-government.jpg")}
              alt="A protected, glowing enclave within a larger civic structure." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              control
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">04 / sovereign AI</span>
              Boundaries before build
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
              The environment sets the <em className="not-italic text-[hsl(var(--brand-coral))]">boundary.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              In regulated and consequential work, architecture choices must follow the mandate, data boundaries and authority model.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              We begin by making those constraints explicit. Deployment, integration and control options are then evaluated against the actual requirements rather than promised in advance.
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
            From mandate to control.
          </h2>
        </div>

        {/* Swimlane Structure */}
        <div className="w-full overflow-x-auto pb-8 -mx-6 px-6 md:mx-0 md:px-0">
          <div className="min-w-[900px] border-l border-t border-border grid grid-cols-[140px_1fr_1fr_1fr_1fr]">
            {/* Header */}
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lane</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">01 / Mandate</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">02 / Policy</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">03 / Enclave</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">04 / Audit</div>

            {/* People */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">People</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Legal, Risk and Compliance officers set the boundary.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Data stewards define privacy classifications.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Delivery roles and access requirements are defined for the environment.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Operators retain explicit override authority.</div>

            {/* Systems */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Systems</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Map data residency and cross-border data flows.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Document hosting, network and infrastructure limits.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Test the selected architecture against the agreed boundary.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Define the records required for operational review.</div>

            {/* Agents */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Agents</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Identify where agents interact with PII/sensitive data.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Restrict agents to isolated execution environments.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Define how agent actions are explained and reviewed.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Specify where source references and evidence are required.</div>

            {/* Governance */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Governance</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Draft regulatory alignment and trust frameworks.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Enforce strict data minimization policies.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Implement fail-safes and human-in-the-loop triggers.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Review the control evidence against the mandate.</div>

            {/* Evidence & Artifacts */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))] bg-[hsl(var(--secondary))]">Evidence</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Compliance Mandate</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Data Privacy Map</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Deployment Decision</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Audit Logs</div>
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