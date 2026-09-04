import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useMarketStore } from "@/store/market";

export default function Home() {
  const [openService, setOpenService] = useState<number>(0);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const services = [
    { no: "01", title: "Agentic enterprise transformation", copy: "Find the work worth changing. Rebuild it around intelligence." },
    { no: "02", title: "Data & AI foundations", copy: "Make data, controls and architecture ready for what comes next." },
    { no: "03", title: "Engineering with AI", copy: "Ship production systems with forward-deployed engineering teams." },
    { no: "04", title: "Sovereign & regulated AI", copy: "Build local control, security and explainability into the work." },
    { no: "05", title: "Digital AI workforce", copy: "Deploy governed agents into real operating environments." }
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {marketLocation} / AI-native advisory & engineering
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-end pb-12 min-h-[60vh] lg:min-h-[70vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-7xl lg:text-[100px] leading-[0.9] font-semibold mb-8 max-w-[700px]">
              Intelligence becomes <em className="not-italic text-[hsl(var(--brand-pink))]">momentum.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[480px] mb-10 leading-relaxed">
              Senior operators, forward-deployed engineers and governed agents moving priority work from ambition into production.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton href="/value-scan">Bring us one process</BrandButton>
              <BrandButton href="/what-we-do" variant="editorial" icon={<ArrowDown className="h-4 w-4" />}>
                  See how we work
                </BrandButton>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-[640px] clip-diagonal bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/pulse-hero.jpg" 
              alt="An abstract field of living intelligence flowing through a white and navy architectural space." 
              className="absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-80" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[150px] font-display font-semibold leading-none text-white opacity-15 mix-blend-overlay tracking-tight pointer-events-none">
              move
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">01 / living intelligence</span>
              Not another AI pilot
            </div>
          </div>
        </div>
      </section>

      {/* Proof Bar */}
      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Built for</span>
            <strong className="text-sm font-semibold text-foreground">Enterprise and government</strong>
          </div>
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Model</span>
            <strong className="text-sm font-semibold text-foreground">Forward-deployed people + agents</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Focus</span>
            <strong className="text-sm font-semibold text-foreground">Priority work, not presentationware</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Starting point</span>
            <strong className="text-sm font-semibold text-foreground">One process under pressure</strong>
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="px-6 md:px-12 py-24 md:py-36 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-[7vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The pressure is real
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[78px] leading-[0.98] font-semibold">
              AI spend is rising.<br />Too little <em>work</em> is changing.
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[520px]">
              Copilots can demonstrate possibility. Transformation begins when the process, people, data and controls move as one operating system.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              Consulting firms leave slides. Cognirise stays with the work—through the decisions, build and governed deployment.
            </p>
          </div>
        </div>
      </section>

      {/* Breakthrough / Model */}
      <section className="mx-0 md:mx-12 max-w-[1440px] xl:mx-auto h-[500px] md:h-[650px] relative bg-[hsl(var(--brand-deep))] overflow-hidden">
        <img 
          src="/images/cognirise/pulse-breakthrough.jpg" 
          alt="A bright gradient force breaking directly through a rigid architectural maze."
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-90 lg:opacity-100 lg:from-90%" />
        
        <div className="absolute bottom-12 lg:bottom-24 left-6 lg:left-16 max-w-[600px] z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
            A different operating model
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-semibold text-white leading-tight mb-6">
            Make the route, then move through it.
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-[440px] leading-relaxed">
            We bring strategy, engineering and agentic delivery into the same room—so the hardest constraints are addressed before they become the reason nothing ships.
          </p>
        </div>
        
        <div className="absolute top-12 right-6 lg:right-12 text-[10px] uppercase tracking-widest text-white/60 writing-vertical-rl rotate-180">
          02 / breakthrough
        </div>
      </section>

      {/* Services Map */}
      <section className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              What we bring to the work
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[72px] leading-[0.97] font-semibold max-w-[700px]">
              Exact where generic AI is vague.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-[410px]">
            A complete route from a consequential business problem to a working, governed system.
          </p>
        </div>

        <div className="border-t border-foreground">
          {services.map((service, i) => (
            <Link key={service.no} href={i === 0 ? "/what-we-do/agentic-enterprise-transformation" : "/what-we-do"}>
              <div 
                className={`group flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 px-4 py-8 border-b border-border cursor-pointer transition-all duration-300 hover:bg-[hsl(var(--brand-violet))/5] hover:pl-8 ${openService === i ? 'bg-[hsl(var(--brand-violet))/5] pl-8' : ''}`}
                onMouseEnter={() => setOpenService(i)}
              >
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground lg:w-16">
                  {service.no}
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold flex-1 group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                  {service.title}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[320px] hidden lg:block">
                  {service.copy}
                </p>
                <div className="hidden lg:flex w-10 justify-end">
                  <Plus className={`h-5 w-5 transition-colors ${openService === i ? 'text-[hsl(var(--brand-pink))]' : 'text-foreground'}`} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Converge */}
      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:min-h-[590px]">
          <div className="lg:pr-[9%] lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              One accountable team
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[76px] leading-[0.97] font-semibold mb-8">
              Human-led.<br/>Agent-accelerated.
            </h2>
            <p className="text-lg text-foreground/70 max-w-[410px] mb-12">
              Human judgment sets the direction. Engineers make the system real. Agents take on governed work. Each force makes the other more useful.
            </p>
            
            <div className="border-t border-foreground pt-4 flex flex-col gap-4">
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">01</span>
                Senior operators make the call
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">02</span>
                Forward-deployed engineers build it
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">03</span>
                Governed agents move the work
              </div>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-auto lg:-mt-12 clip-diagonal-bottom">
            <img 
              src="/images/cognirise/pulse-convergence.jpg" 
              alt="People standing within an abstract luminous architectural space where human and agent forces converge." 
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute right-6 bottom-6 text-[10px] font-semibold uppercase tracking-widest text-white">
              people + agents
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="border-t border-foreground pt-8 flex flex-col lg:flex-row justify-between gap-8 lg:items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Built for consequential work
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[70px] leading-[0.98] font-semibold">
              Where operating pressure is real.
            </h2>
          </div>
          <p className="text-base text-muted-foreground max-w-[320px]">
            For organisations where speed matters, but control is non-negotiable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border">
          {["Banking & financial services", "Government & public sector", "Telecoms", "Travel & hospitality", "Energy & resources", "Manufacturing & conglomerates"].map((ind, i) => (
            <Link key={ind} href={ind === "Government & public sector" ? "/industries/public-sector" : "/industries"}>
              <div className={`group flex items-center justify-between p-6 border-b border-border cursor-pointer transition-colors hover:bg-[hsl(var(--secondary))] ${i % 2 === 0 ? 'md:border-r' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                    0{i + 1}
                  </span>
                  <h3 className="text-lg md:text-xl font-semibold">
                    {ind}
                  </h3>
                </div>
                <ArrowRight className="h-5 w-5 text-[hsl(var(--brand-coral))] transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 bottom-[-5%] text-[20vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          PULSE
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            The first move
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[110px] leading-[0.88] font-semibold tracking-tight mb-8">
            Bring one process.<br />
            <em className="not-italic text-[hsl(var(--brand-coral))]">Leave with a route.</em>
          </h2>
          <p className="text-lg text-white/80 max-w-[500px] mb-12">
            Start with a process where urgency, complexity and value have already collided. In one focused working session, we will surface the opportunity, constraints and practical route to production.
          </p>
          <Link href="/value-scan">
            <button className="group relative inline-flex min-h-[46px] items-center gap-4 overflow-hidden bg-[linear-gradient(105deg,hsl(var(--brand-violet)),hsl(var(--brand-pink)),hsl(var(--brand-coral)))] pl-5 pr-1 text-sm font-bold text-white transition-all hover:-translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_#fff]">
              <span className="relative z-10">Book a value scan</span>
              <div className="relative z-10 flex h-9 w-9 items-center justify-center bg-transparent transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
