import { Link } from "wouter";
import { ArrowDown, ArrowRight, Minus, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useMarketStore } from "@/store/market";

export default function ServicesOverview() {
  const [openService, setOpenService] = useState<number>(0);
  const [route, setRoute] = useState<string | null>(null);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const services = [
    { no: "01", title: "Agentic enterprise transformation", short: "For priority work that needs redesign, not another isolated pilot.", copy: "We identify the work that matters, define the operating change and stay through production—where strategy becomes a working system.", outcome: "A route from executive decision to operating change." },
    { no: "02", title: "Data & AI foundations", short: "For data, controls and architecture that must be ready before the work moves.", copy: "We make the underlying estate usable for AI: from data and integration to governance, operating models and the conditions for scale.", outcome: "Foundations designed for real deployment." },
    { no: "03", title: "Engineering with AI", short: "For teams that need to ship dependable systems at the pace of the opportunity.", copy: "Forward-deployed engineers build, integrate and harden the products and platforms that take promising work into production.", outcome: "Systems built in the environment where they will run." },
    { no: "04", title: "Sovereign & regulated AI", short: "For environments where local control, explainability and assurance are central.", copy: "We design AI around the obligations of the environment: sovereignty, security, transparency and the governance that holds in use.", outcome: "Control engineered into the work—not added after." },
    { no: "05", title: "Digital AI workforce", short: "For operations ready to give governed agents a meaningful role in the flow of work.", copy: "We help organisations deploy agents that operate within defined boundaries, alongside teams, systems and accountable decision-making.", outcome: "Agents that move work with people, not around them." },
  ];

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          What we do / {marketLocation}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.86fr_1.14fr] gap-12 lg:gap-16 items-end pb-12 min-h-[60vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-7xl lg:text-[90px] leading-[0.93] font-semibold mb-8 max-w-[700px]">
              Stay with the work.<br />From decision to <em className="not-italic text-[hsl(var(--brand-pink))]">production.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              Cognirise brings senior operators, engineers and governed agents to the work that needs to change—then remains accountable for making it real.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton href="/what-we-do/agentic-enterprise-transformation">Explore flagship service</BrandButton>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-[595px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-services.jpg" 
              alt="Violet and coral intelligence routes moving through a bright architectural space." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[135px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              work
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">01 / services</span>
              One accountable route
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Built for</span>
            <strong className="text-sm font-semibold text-foreground">UAE enterprise and government</strong>
          </div>
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Start with</span>
            <strong className="text-sm font-semibold text-foreground">A priority process under pressure</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Stay through</span>
            <strong className="text-sm font-semibold text-foreground">Build, deployment and change</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Bring together</span>
            <strong className="text-sm font-semibold text-foreground">People, engineering and agents</strong>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-36 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.14fr] gap-12 lg:gap-[8vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              A different kind of service firm
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[78px] leading-[0.98] font-semibold">
              Decision is only the start.<br />The work is the <em className="not-italic text-[hsl(var(--brand-coral))]">test.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              AI transformations fail when the strategy, system and operating reality are treated as separate engagements. We work across all three, in the same accountable motion.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              Whether the pressure is commercial, operational, technical or regulatory, the first question is the same: what must move—and what will it take to make that change hold?
            </p>
          </div>
        </div>
      </section>

      <section className="mx-0 md:mx-12 max-w-[1440px] xl:mx-auto h-[500px] md:h-[610px] relative bg-[hsl(var(--brand-deep))] overflow-hidden">
        <img 
          src="/images/cognirise/pulse-breakthrough.jpg" 
          alt="A vivid flow of violet and coral threads breaking through a white architectural maze."
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-90 lg:opacity-100 lg:from-80%" />
        
        <div className="absolute bottom-12 lg:bottom-24 left-6 lg:left-16 max-w-[600px] z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
            From the first hard question
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-semibold text-white leading-tight mb-6">
            Make the route. Then keep moving.
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-[440px] leading-relaxed">
            Our services are distinct entry points—not disconnected offers. Each can begin with one consequential problem and extend into the teams, systems and controls needed to carry it into production.
          </p>
        </div>
        
        <div className="absolute top-12 right-6 lg:right-12 text-[10px] uppercase tracking-widest text-white/60 writing-vertical-rl rotate-180">
          02 / the route
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Choose an entry point
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[72px] leading-[0.97] font-semibold max-w-[700px]">
              Five ways into the work.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-[420px]">
            Start where the current pressure is clearest. We will connect it to the wider operating system from there.
          </p>
        </div>

        <div className="mt-12 bg-[hsl(var(--brand-deep))] min-h-[600px] lg:h-[700px] flex flex-col lg:flex-row gap-0 lg:gap-1 p-0 lg:p-1 clip-diagonal-top-right">
          {services.map((service, i) => (
            <button
              key={service.no}
              onClick={() => setOpenService(i)}
              className={`relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col justify-between text-left border-0 border-b border-white/10 lg:border lg:border-transparent ${
                openService === i 
                  ? 'flex-[3] lg:flex-[4] bg-white/[0.06] lg:bg-white/10 lg:border-white/20' 
                  : 'flex-[1] lg:flex-[1] bg-white/5 hover:bg-white/10'
              }`}
            >
              {/* Background gradient signal for active */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand-violet))/40] via-transparent to-transparent opacity-0 transition-opacity duration-700 ${openService === i ? 'opacity-100' : ''}`} 
              />
              
              <div className="relative z-10 flex items-center justify-between w-full p-4 lg:p-6">
                <span className={`font-bold font-display transition-all duration-500 ${openService === i ? 'text-4xl lg:text-5xl text-white' : 'text-2xl lg:text-3xl text-white/40'}`}>
                  {service.no}
                </span>
                {openService !== i && (
                  <Plus className="w-5 h-5 text-white/40" />
                )}
              </div>

              <div className="relative z-10 p-4 lg:p-6 mt-auto">
                <h3 className={`font-semibold transition-all duration-500 mb-4 ${openService === i ? 'text-3xl lg:text-4xl text-white' : 'text-lg text-white/70 lg:whitespace-nowrap lg:-rotate-90 lg:origin-bottom-left lg:absolute lg:bottom-6 lg:left-8'}`}>
                  {service.title}
                </h3>
                
                <div 
                  className={`transition-all duration-700 overflow-hidden ${
                    openService === i ? 'max-h-[500px] opacity-100 delay-200' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-[500px]">
                    {service.copy}
                  </p>
                  <div className="border-t border-white/20 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <strong className="block text-[10px] uppercase tracking-widest text-[hsl(var(--brand-pink))] mb-2">Outcome</strong>
                      <p className="text-sm text-white font-semibold">{service.outcome}</p>
                    </div>
                    <div className="flex md:justify-end items-end">
                      <BrandButton 
                        href={
                          i === 0 ? "/what-we-do/agentic-enterprise-transformation" : 
                          i === 1 ? "/what-we-do/data-ai-foundations" : 
                          i === 2 ? "/what-we-do/engineering-with-ai" : 
                          i === 3 ? "/what-we-do/sovereign-regulated-ai" : 
                          "/what-we-do/digital-ai-workforce"
                        } 
                        variant="inverse"
                      >
                        Explore service
                      </BrandButton>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:min-h-[600px]">
          <div className="lg:pr-[9%] lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              You do not need to diagnose it alone
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[76px] leading-[0.97] font-semibold mb-8">
              Not sure which service you <em className="not-italic text-[hsl(var(--brand-coral))]">need?</em>
            </h2>
            <p className="text-lg text-foreground/70 max-w-[410px] mb-12">
              Begin with the intent behind the question. Select the statement that feels closest to the pressure you are carrying.
            </p>
            
            <div className="border-t border-foreground pt-4 flex flex-col">
              {["We need to change a priority process.", "Our foundations are not ready for AI.", "We need a system built and deployed.", "We need local control and assurance.", "We are ready to introduce governed agents."].map(item => (
                <button 
                  key={item}
                  onClick={() => setRoute(item)}
                  className={`flex justify-between items-center py-4 border-b border-border text-sm font-semibold transition-colors text-left ${route === item ? 'text-[hsl(var(--brand-pink))]' : 'hover:text-[hsl(var(--brand-pink))]'}`}
                >
                  {item}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
            </div>
            
            {route && (
              <p className="mt-6 text-sm text-foreground/70 leading-relaxed bg-white/50 p-4 rounded-sm border border-white">
                Start there. We will bring the relevant operators, engineers and controls into the first conversation.
              </p>
            )}
          </div>
          
          <div className="relative h-[400px] lg:h-auto lg:-mt-12 clip-diagonal-bottom">
            <img 
              src="/images/cognirise/cognirise-pulse-people.jpg" 
              alt="A group of professionals beneath flowing bands of light in a navy architectural space." 
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute right-6 bottom-6 text-[10px] font-semibold uppercase tracking-widest text-white">
              Start with the pressure
            </div>
          </div>
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
          <h2 className="text-5xl md:text-7xl lg:text-[110px] leading-[0.88] font-semibold tracking-tight mb-8">
            Bring one process.<br />
            <em className="not-italic text-[#ff8873]">Leave with a route.</em>
          </h2>
          <p className="text-lg text-white/80 max-w-[510px] mb-12">
            Start with a process where urgency, complexity and value have already collided. In a focused working session, we will surface the opportunity, constraints and practical route to production.
          </p>
          <BrandButton href="/value-scan" variant="submit">
            Book a value scan
          </BrandButton>
        </div>
      </section>
    </div>
  );
}
