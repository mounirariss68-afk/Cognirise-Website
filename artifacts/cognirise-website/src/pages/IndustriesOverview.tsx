import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useMarketStore } from "@/store/market";

export default function IndustriesOverview() {
  const [active, setActive] = useState<number>(0);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const sectors = [
    ["01", "Banking & financial services", "Trust is the operating system.", "Build intelligence into customer journeys, risk and operations without giving up the controls that make trust possible."],
    ["02", "Government & public sector", "Public value needs a route to delivery.", "Move complex public services from policy to practical, governed execution—designed around citizens, teams and sovereign control."],
    ["03", "Telecoms", "The network is only the beginning.", "Turn service, operations and enterprise data into a more responsive operating model for customers and the people who serve them."],
    ["04", "Energy & resources", "Physical operations leave no room for theatre.", "Connect field reality, planning and assurance so critical work is safer, faster and visible at the point decisions are made."],
    ["05", "Travel & hospitality", "Every moment of service is a decision.", "Design more useful experiences across the journey while giving frontline teams the intelligence to resolve what matters."],
    ["06", "Manufacturing & conglomerates", "Complexity should not become inertia.", "Create a shared route through portfolios, plants and supply chains—where insight can become action across the enterprise."],
  ];

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {marketLocation} / Industries
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.87fr_1.13fr] gap-12 lg:gap-[4vw] items-end pb-12 min-h-[60vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[101px] leading-[0.93] font-semibold mb-8 max-w-[700px]">
              Pressure reveals where intelligence <em className="not-italic text-[hsl(var(--brand-pink))]">belongs.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[435px] mb-10 leading-relaxed">
              For organisations carrying consequential work: the places where speed matters, and control cannot be an afterthought.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton href="/value-scan">Bring us one process</BrandButton>
            </div>
          </div>
          
          <div className="relative h-[440px] lg:h-[595px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-government.jpg" 
              alt="A monumental civic district connected by a luminous flow of intelligence." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[142px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              pressure
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">01 / operating environments</span>
              Intelligence with a place to work
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3">
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6 lg:col-span-1 col-span-2">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Built for</span>
            <strong className="text-sm font-semibold text-foreground">UAE enterprise and government</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Working where</span>
            <strong className="text-sm font-semibold text-foreground">Urgency meets scrutiny</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Starting point</span>
            <strong className="text-sm font-semibold text-foreground">One process under pressure</strong>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-36 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.15fr] gap-12 lg:gap-[8vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The Cognirise point of view
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[77px] leading-[0.97] font-semibold">
              The sector is the context. The work is the <em className="not-italic text-[hsl(var(--brand-coral))]">question.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              Each industry carries its own obligations: trust, sovereignty, continuity, safety, service. We begin there—not with a generic AI pattern.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              Our teams work with the constraints already shaping the operating environment, then build a governed route from priority problem to production value.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-0 md:mx-12 max-w-[1440px] xl:mx-auto h-[500px] md:h-[635px] relative bg-[hsl(var(--brand-deep))] overflow-hidden">
        <img 
          src="/images/cognirise/site-financial.jpg" 
          alt="A secure financial mechanism with a vivid intelligence route moving through it."
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-90 lg:opacity-100 lg:from-70%" />
        
        <div className="absolute bottom-12 lg:bottom-24 left-6 lg:left-16 max-w-[595px] z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
            Trust at speed
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[78px] font-semibold text-white leading-tight mb-6">
            Make controls part of the flow.
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-[430px] leading-relaxed">
            In financial services and public institutions, intelligence only earns its place when it can work with the standards, data and accountability already in motion.
          </p>
        </div>
        
        <div className="absolute top-12 right-6 lg:right-12 text-[10px] uppercase tracking-widest text-white/60 writing-vertical-rl rotate-180">
          02 / governed movement
        </div>
      </section>

      <section id="industries" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.72fr] gap-10 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Industry points of view
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[77px] leading-[0.97] font-semibold">
              Different pressure. One accountable route.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-[395px]">
            Explore where the work is consequential—and where the right combination of people, systems and agents can shift it.
          </p>
        </div>

        <div className="border-t border-foreground">
          {sectors.map(([num, title, view, copy], i) => (
            <div key={title}>
              <button 
                className={`w-full group flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 px-4 py-6 border-b border-border cursor-pointer transition-all duration-300 hover:bg-[hsl(var(--brand-violet))/5] hover:pl-8 text-left ${active === i ? 'bg-[hsl(var(--brand-violet))/5] pl-8' : ''}`}
                onClick={() => setActive(active === i ? -1 : i)}
              >
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground lg:w-16">
                  {num}
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold flex-1 group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[320px] hidden lg:block">
                  {active === i ? copy : view}
                </p>
                <div className="hidden lg:flex w-10 justify-end">
                  {active === i ? (
                    <Plus className="h-5 w-5 text-[hsl(var(--brand-pink))]" />
                  ) : (
                    <ArrowRight className="h-5 w-5 text-foreground group-hover:text-[hsl(var(--brand-pink))]" />
                  )}
                </div>
              </button>
              
              {active === i && (
                <div className="bg-[hsl(var(--brand-violet))/5] border-b border-border px-6 py-8 lg:hidden -mt-[1px]">
                  <p className="text-sm leading-relaxed text-foreground/80 mb-4">{view}</p>
                  <p className="text-sm leading-relaxed text-foreground/80">{copy}</p>
                  
                  {i === 1 && (
                    <BrandButton href="/industries/public-sector" variant="editorial" className="mt-6">Explore Public Sector</BrandButton>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:min-h-[570px]">
          <div className="lg:pr-[9%] lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Critical infrastructure
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[75px] leading-[0.97] font-semibold mb-8">
              Work that cannot pause needs intelligence that can hold.
            </h2>
            <p className="text-lg text-foreground/70 max-w-[413px] mb-12">
              Across telecoms, energy, travel and complex enterprises, the systems that serve customers and communities are deeply interdependent. The route forward has to respect that reality.
            </p>
            
            <div className="border-t border-foreground pt-4 flex flex-col gap-4">
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">01</span>
                See the operational constraint
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">02</span>
                Design for the people in the work
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">03</span>
                Govern movement through the system
              </div>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-auto lg:-mt-12 clip-diagonal-bottom">
            <img 
              src="/images/cognirise/site-infrastructure.jpg" 
              alt="Connected infrastructure routes carrying luminous intelligence across a large operating landscape." 
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute right-6 bottom-6 text-[10px] font-semibold uppercase tracking-widest text-white">
              interdependent systems
            </div>
          </div>
        </div>
      </section>

      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 bottom-[-5%] text-[20vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          ROUTE
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            The first move
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[112px] leading-[0.88] font-semibold tracking-tight mb-8">
            Bring one process.<br />
            <em className="not-italic text-[#ff8470]">Leave with a route.</em>
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
