import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useMarketStore } from "@/store/market";

export default function PublicSector() {
  const [open, setOpen] = useState<number>(0);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "United Arab Emirates" :
    market === "ksa" ? "Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Türkiye" :
    "Europe";

  const plays = [
    ["01", "Service journeys", "Use governed intelligence to make complex public interactions easier to navigate, without losing accountability."],
    ["02", "Knowledge at the point of work", "Bring policy, procedures and institutional knowledge into the flow of teams who need to act on it."],
    ["03", "Document-heavy operations", "Rework high-volume review and correspondence processes with human oversight designed in."],
    ["04", "Sovereign foundations", "Set deployment, data and governance boundaries before intelligence enters consequential work."]
  ];

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {marketLocation} / Government & public sector
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.83fr_1.17fr] gap-12 lg:gap-16 items-end pb-12 min-h-[60vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[98px] leading-[0.94] font-semibold mb-8">
              Public value needs <em className="not-italic text-[hsl(var(--brand-pink))]">accountable</em> intelligence.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[455px] mb-10 leading-relaxed">
              For public-sector work where every decision carries weight: intelligence that is governed, grounded in context and built to serve the people behind the process.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton href="/value-scan">Bring us one process</BrandButton>
              <button 
                onClick={() => document.getElementById("plays")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-2 border-b border-foreground pb-2 text-sm font-bold transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))]"
              >
                Explore public-sector plays <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="relative h-[440px] lg:h-[640px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-government.jpg" 
              alt="Architectural public space with a luminous route moving through it." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              public
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">01 / public value</span>
              Intelligence with a mandate
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Built for</span>
            <strong className="text-sm font-semibold text-foreground">Consequential public work</strong>
          </div>
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Deployment</span>
            <strong className="text-sm font-semibold text-foreground">Chosen against the mandate</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Context</span>
            <strong className="text-sm font-semibold text-foreground">Public work and local realities</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Model</span>
            <strong className="text-sm font-semibold text-foreground">Forward-deployed people + agents</strong>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-36 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-[7vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The public standard
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[78px] leading-[0.98] font-semibold">
              Trust is not an output.<br />It is the <em className="not-italic text-[hsl(var(--brand-pink))]">operating condition.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              Public-sector intelligence has to work inside real mandates, systems and oversight. The route is not to add another layer of technology. It is to make controls, judgment and delivery part of the same work.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              We start with the process under pressure—then shape the architecture, governance and delivery approach around its public value.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-0 md:mx-12 max-w-[1440px] xl:mx-auto h-[500px] md:h-[650px] relative bg-[hsl(var(--brand-deep))] overflow-hidden">
        <img 
          src="/images/cognirise/cognirise-pulse-governance.jpg" 
          alt="A violet route moving through a sequence of formal architectural gateways."
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-90 lg:opacity-100 lg:from-70%" />
        
        <div className="absolute bottom-12 lg:bottom-24 left-6 lg:left-16 max-w-[615px] z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
            Boundaries by design
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[80px] font-semibold text-white leading-tight mb-6">
            Control stays in the route.
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-[450px] leading-relaxed">
             We make deployment constraints visible before a route is chosen, so the operating environment—not an abstract model—sets the boundaries.
          </p>
        </div>
        
        <div className="absolute top-12 right-6 lg:right-12 text-[10px] uppercase tracking-widest text-white/60 writing-vertical-rl rotate-180">
          02 / governed flow
        </div>
      </section>

      <section id="plays" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Where the work begins
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[72px] leading-[0.97] font-semibold">
              Bring intelligence to the public work that cannot wait.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-[410px]">
            No generic transformation theatre. Start with a service, decision or operation where clarity, pace and accountability need to move together.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 h-auto mt-12 bg-border border border-border">
          {plays.map(([num, title, copy], i) => (
            <div 
              key={title} 
              className={`group relative bg-white p-8 lg:p-10 flex flex-col justify-between overflow-hidden min-h-[360px] ${i === 2 ? 'md:col-span-2 lg:col-span-1' : ''}`}
            >
              {/* Background interaction field */}
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand-violet))/5] via-[hsl(var(--brand-pink))/5] to-[hsl(var(--brand-coral))/5] opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
              
              <div className="relative z-10 flex items-center justify-between mb-8">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                  PLAY {num}
                </span>
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:border-[hsl(var(--brand-pink))] group-hover:bg-[hsl(var(--brand-pink))] group-hover:text-white transition-all duration-300">
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
              
              <div className="relative z-10 mt-auto">
                <h3 className="text-2xl font-semibold mb-4 leading-tight group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {copy}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="platform" className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:min-h-[590px]">
          <div className="lg:pr-[9%] lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The operating layer
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[72px] leading-[0.97] font-semibold mb-8">
              One place to hold the context, controls and work.
            </h2>
            <p className="text-lg text-foreground/70 max-w-[430px] mb-12">
              CogniOS brings the pieces into a governed operating environment: people stay responsible, and agents work within the boundaries you define.
            </p>
            
            <div className="border-t border-foreground pt-4 flex flex-col gap-4">
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">01</span>
                Design around local operating realities
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">02</span>
                Keep governance close to execution
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">03</span>
                Work across complex knowledge environments
              </div>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-auto lg:-mt-12 clip-diagonal-bottom">
            <img 
              src="/images/cognirise/site-cognios.jpg" 
              alt="Layered transparent intelligence architecture held in a light architectural chamber." 
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute right-6 bottom-6 text-[10px] font-semibold uppercase tracking-widest text-white">
              one room · one priority
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="border-t border-foreground pt-8 flex flex-col lg:flex-row justify-between gap-8 lg:items-end mb-12">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              A delivery model with proximity
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[69px] leading-[0.97] font-semibold max-w-[670px]">
              Forward-deployed where the public work happens.
            </h2>
          </div>
          <p className="text-base text-muted-foreground max-w-[300px]">
            Our teams enter the work with the people accountable for it—turning constraints into design inputs, not late-stage blockers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 lg:grid-rows-[310px_310px] mt-8">
          <figure className="relative bg-[hsl(var(--brand-deep))] overflow-hidden group lg:row-span-2 h-[350px] lg:h-auto">
            <img src="/images/cognirise/site-government.jpg" alt="Public architecture framed by flowing intelligence." className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-transparent opacity-80" />
            <figcaption className="absolute bottom-8 left-8 z-10 text-white">
              <span className="block text-[10px] uppercase tracking-widest opacity-70 mb-2">01 / proximity</span>
              <strong className="text-3xl md:text-5xl font-semibold">Work beside the decision.</strong>
            </figcaption>
          </figure>
          <figure className="relative bg-[hsl(var(--brand-deep))] overflow-hidden group h-[240px] lg:h-auto">
            <img src="/images/cognirise/cognirise-pulse-governance.jpg" alt="A governed route flowing through gateways." className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-transparent opacity-80" />
            <figcaption className="absolute bottom-8 left-8 z-10 text-white">
              <span className="block text-[10px] uppercase tracking-widest opacity-70 mb-2">02 / assurance</span>
              <strong className="text-2xl md:text-3xl font-semibold">Design the controls in.</strong>
            </figcaption>
          </figure>
          <figure className="relative bg-[hsl(var(--brand-deep))] overflow-hidden group h-[240px] lg:h-auto">
            <img src="/images/cognirise/site-cognios.jpg" alt="A layered intelligence system." className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-transparent opacity-80" />
            <figcaption className="absolute bottom-8 left-8 z-10 text-white">
              <span className="block text-[10px] uppercase tracking-widest opacity-70 mb-2">03 / foundation</span>
              <strong className="text-2xl md:text-3xl font-semibold">Make context usable.</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 bottom-[-5%] text-[20vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          PUBLIC
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            The first move
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[113px] leading-[0.88] font-semibold tracking-tight mb-8">
            Bring one process.<br />
            <em className="not-italic text-[#ff8470]">Keep the mandate.</em>
          </h2>
          <p className="text-lg text-white/80 max-w-[510px] mb-12">
            Start with a process where public value, complexity and urgency have already converged. In a focused working session, we will surface the operating constraints and a practical route to a governed build.
          </p>
          <BrandButton href="/value-scan" variant="submit">
            Start a working session
          </BrandButton>
        </div>
      </section>
    </div>
  );
}
