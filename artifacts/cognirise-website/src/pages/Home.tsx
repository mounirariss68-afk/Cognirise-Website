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
      <section className="px-6 md:px-12 pt-6 md:pt-8 max-w-[1440px] mx-auto w-full relative">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {marketLocation} / AI-native advisory & engineering
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.83fr_1.17fr] gap-8 lg:gap-[36px] items-end pb-8 lg:min-h-[690px]">
          <div className="relative z-10 pb-4">
            <h1 className="text-[3rem] md:text-7xl lg:text-[6.25vw] xl:text-[100px] leading-[0.94] tracking-[-0.075em] font-semibold mt-7 mb-7 max-w-[690px]">
              Intelligence becomes <em className="not-italic text-[hsl(var(--brand-pink))]">momentum.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[450px] mb-8 leading-relaxed">
              Senior operators, forward-deployed engineers and governed agents moving priority work from ambition into production.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <BrandButton href="/value-scan" variant="submit">
                Bring us one process
              </BrandButton>
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
            
            <div className="absolute right-[-10px] top-[50px] z-10 text-[60px] md:text-[100px] lg:text-[150px] font-display font-semibold leading-[0.8] tracking-[-0.1em] text-white opacity-[0.87] mix-blend-overlay pointer-events-none">
              move
            </div>
            
            <div className="absolute bottom-7 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
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

        <div className="mt-12 bg-[hsl(var(--brand-deep))] text-white relative overflow-hidden clip-diagonal-top-right">
          {/* Ambient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand-deep))] via-[#0a152e] to-[#121c33] z-0" />
          <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-[hsl(var(--brand-violet))/30] to-transparent z-0 hidden lg:block" />
          <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-[hsl(var(--brand-pink))/30] to-transparent z-0 hidden lg:block" />
          
          <div className="relative z-10 p-8 md:p-16 lg:p-24 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16">
            <div className="col-span-1 lg:col-span-2 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-8 mb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))] block mb-4">
                  The Route
                </span>
                <h3 className="text-3xl lg:text-5xl font-semibold leading-tight max-w-[500px]">
                  From problem to production.
                </h3>
              </div>
              <BrandButton href="/what-we-do" variant="inverse" className="mt-6 md:mt-0">
                Explore all services
              </BrandButton>
            </div>

            {[
              { no: "01", title: "Agentic enterprise transformation", url: "/what-we-do/agentic-enterprise-transformation", desc: "Find the work worth changing. Rebuild it around intelligence.", pos: "lg:pr-12" },
              { no: "02", title: "Data & AI foundations", url: "/what-we-do/data-ai-foundations", desc: "Make data, controls and architecture ready for what comes next.", pos: "lg:mt-32 lg:pl-12" },
              { no: "03", title: "Engineering with AI", url: "/what-we-do/engineering-with-ai", desc: "Ship production systems with forward-deployed engineering teams.", pos: "lg:pr-12" },
              { no: "04", title: "Sovereign & regulated AI", url: "/what-we-do/sovereign-regulated-ai", desc: "Build local control, security and explainability into the work.", pos: "lg:mt-32 lg:pl-12" },
              { no: "05", title: "Digital AI workforce", url: "/what-we-do/digital-ai-workforce", desc: "Deploy governed agents into real operating environments.", pos: "lg:col-span-2 lg:mx-auto lg:text-center lg:w-1/2 lg:mt-16" }
            ].map((service) => (
              <Link key={service.no} href={service.url}>
                <div className={`group relative block cursor-pointer transition-all duration-500 ${service.pos}`}>
                  {/* Signal line connector - visible on hover */}
                  <div className="absolute left-[-20px] top-4 w-[2px] h-0 bg-gradient-to-b from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))] transition-all duration-500 group-hover:h-full lg:hidden" />
                  
                  {/* Giant ambient number */}
                  <div className="absolute -top-10 -left-6 text-[100px] lg:text-[140px] font-display font-bold leading-none text-white/5 transition-colors duration-500 group-hover:text-[hsl(var(--brand-pink))/10] pointer-events-none select-none z-0">
                    {service.no}
                  </div>
                  
                  <div className="relative z-10 pl-6 lg:pl-0 border-l lg:border-l-0 border-white/10 lg:border-transparent group-hover:border-white/30 transition-colors">
                    <span className="text-[10px] font-semibold tracking-widest text-[hsl(var(--brand-coral))] block mb-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                      Explore Service <ArrowRight className="inline-block w-3 h-3 ml-1" />
                    </span>
                    <h4 className="text-2xl md:text-3xl font-semibold mb-4 transition-transform duration-500 group-hover:translate-x-2">
                      {service.title}
                    </h4>
                    <p className="text-sm md:text-base text-white/60 max-w-[340px] leading-relaxed transition-colors group-hover:text-white/90 lg:mx-auto">
                      {service.desc}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
          {[
            { title: "Banking & financial services", url: "/industries/banking" },
            { title: "Government & public sector", url: "/industries/public-sector" },
            { title: "Telecoms", url: "/industries/telecoms" },
            { title: "Travel & hospitality", url: "/industries/travel" },
            { title: "Energy & resources", url: "/industries/energy" },
            { title: "Manufacturing & conglomerates", url: "/industries/manufacturing" }
          ].map((ind, i) => (
            <Link key={ind.title} href={ind.url}>
              <div className={`group flex items-center justify-between p-6 border-b border-border cursor-pointer transition-colors hover:bg-[hsl(var(--secondary))] ${i % 2 === 0 ? 'md:border-r' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                    0{i + 1}
                  </span>
                  <h3 className="text-lg md:text-xl font-semibold group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                    {ind.title}
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
          <BrandButton href="/value-scan" variant="submit">
            Book a value scan
          </BrandButton>
        </div>
      </section>
    </div>
  );
}
