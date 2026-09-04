import { Link } from "wouter";
import { ArrowDown, ArrowRight, Minus, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useMarketStore } from "@/store/market";

export default function AgenticTransformation() {
  const [openStep, setOpenStep] = useState<number>(0);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const journey = [
    ["01", "Frame the work", "Bring one process under pressure. We find where time, risk, hand-offs and decisions are constraining the outcome."],
    ["02", "Design the move", "Senior operators, engineers and your team define the target operating model, controls and the route to value."],
    ["03", "Build in the flow", "We integrate intelligence into the work itself—not beside it—then test it against the realities of your environment."],
    ["04", "Run, learn, extend", "Governed agents and people work as one system, creating the capacity to take the next priority process on."],
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
            <h1 className="text-5xl md:text-6xl lg:text-[93px] leading-[0.94] font-semibold mb-8 max-w-[660px]">
              Make AI change the <em className="not-italic text-[hsl(var(--brand-pink))]">work.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              Agentic Enterprise Transformation brings senior operators, forward-deployed engineers and governed agents together around the processes that matter most.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/value-scan">
                <BrandButton>Bring us one process</BrandButton>
              </Link>
              <button 
                onClick={() => document.getElementById("model")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-2 border-b border-foreground pb-2 text-sm font-bold transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))]"
              >
                Explore the operating model <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-[640px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-services.jpg" 
              alt="A vivid current moving through a white and navy architectural landscape." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              work
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">01 / agentic transformation</span>
              From ambition into production
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
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Operating model</span>
            <strong className="text-sm font-semibold text-foreground">People + engineers + agents</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Built for</span>
            <strong className="text-sm font-semibold text-foreground">Enterprise and government</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Focus</span>
            <strong className="text-sm font-semibold text-foreground">Production value, with control</strong>
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
              AI is everywhere.<br />Change is <em className="not-italic text-[hsl(var(--brand-coral))]">not.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              Most programmes stop at possibility: a pilot, a copilot, a presentation. The operating work stays fragmented, while the teams carrying it remain under pressure.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              Transformation starts when the process, data, decisions and controls are redesigned together—and the system is carried into production.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-0 md:mx-12 max-w-[1440px] xl:mx-auto h-[500px] md:h-[640px] relative bg-[hsl(var(--brand-deep))] overflow-hidden">
        <img 
          src="/images/cognirise/pulse-breakthrough.jpg" 
          alt="A violet and coral current breaking through a rigid architectural maze."
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-90 lg:opacity-100 lg:from-85%" />
        
        <div className="absolute bottom-12 lg:bottom-24 left-6 lg:left-16 max-w-[620px] z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
            Change the route
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[79px] font-semibold text-white leading-tight mb-6">
            Build through the constraint.
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-[430px] leading-relaxed">
            We work where operational urgency meets technical reality. The hard constraints are not an afterthought—they are where the transformation begins.
          </p>
        </div>
        
        <div className="absolute top-12 right-6 lg:right-12 text-[10px] uppercase tracking-widest text-white/60 writing-vertical-rl rotate-180">
          02 / breakthrough
        </div>
      </section>

      <section id="model" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The operating model
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[77px] leading-[0.97] font-semibold max-w-[690px]">
              One team, in the work.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-[420px]">
            A disciplined route from a priority business problem to a working, governed system—designed with the people who run it.
          </p>
        </div>

        <div className="border-t border-foreground">
          {journey.map(([num, title, copy], i) => (
            <div key={title}>
              <button 
                className={`w-full group flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 px-4 py-6 border-b border-border cursor-pointer transition-all duration-300 hover:bg-[hsl(var(--brand-violet))/5] hover:pl-8 text-left ${openStep === i ? 'bg-[hsl(var(--brand-violet))/5] pl-8' : ''}`}
                onClick={() => setOpenStep(openStep === i ? -1 : i)}
              >
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground lg:w-16">
                  {num}
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold flex-1 group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[335px] hidden lg:block">
                  {copy}
                </p>
                <div className="hidden lg:flex w-10 justify-end">
                  {openStep === i ? (
                    <Minus className="h-5 w-5 text-[hsl(var(--brand-pink))]" />
                  ) : (
                    <Plus className="h-5 w-5 text-foreground group-hover:text-[hsl(var(--brand-pink))]" />
                  )}
                </div>
              </button>
              
              {openStep === i && (
                <div className="bg-[hsl(var(--brand-violet))/5] border-b border-border px-6 py-8 lg:hidden -mt-[1px]">
                  <p className="text-sm leading-relaxed text-foreground/80">{copy}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-12 lg:gap-[7vw] items-center">
          <div className="lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              What changes
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[76px] leading-[0.97] font-semibold mb-8">
              Capacity, speed and control—moving together.
            </h2>
            <p className="text-lg text-foreground/70 max-w-[415px] mb-10">
              Agentic transformation is not a hand-off to automation. It is a new operating rhythm: human judgment where it counts, governed intelligence where work can move.
            </p>
            
            <div className="border-t border-foreground pt-4 flex flex-col gap-4">
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">01</span>
                Reduce cost in the work that repeats
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">02</span>
                Create capacity for higher-value decisions
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">03</span>
                Shorten the route from insight to action
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">04</span>
                De-risk change with governance in the flow
              </div>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-[570px] lg:-mt-10 clip-diagonal-bottom">
            <img 
              src="/images/cognirise/cognirise-pulse-outcomes.jpg" 
              alt="A coral route passing through violet and navy architectural forms." 
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute right-6 bottom-6 text-[10px] font-semibold uppercase tracking-widest text-white">
              outcomes, designed in
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="border-t border-foreground pt-8 flex flex-col lg:flex-row justify-between gap-8 lg:items-end mb-10">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Adjacent services
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[68px] leading-[0.98] font-semibold">
              The transformation needs its ground.
            </h2>
          </div>
          <p className="text-base text-muted-foreground max-w-[310px]">
            Go deeper where the work demands it: foundations, engineering, sovereign control and the digital workforce.
          </p>
        </div>

        <Link href="/what-we-do">
          <div className="relative h-[400px] overflow-hidden group cursor-pointer clip-diagonal-left bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-services.jpg" 
              alt="A colourful current travelling through a layered architectural environment." 
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-80 lg:from-60%" />
            
            <div className="absolute bottom-10 left-6 lg:left-12 max-w-[530px] z-10">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
                Connected capability
              </div>
              <h3 className="text-3xl md:text-4xl lg:text-[48px] font-semibold text-white leading-tight mb-4 tracking-tight">
                Data, architecture and delivery—aligned to the same move.
              </h3>
              <p className="text-white/80 text-sm max-w-[390px]">
                Explore Data & AI Foundations, Engineering with AI, Sovereign & Regulated AI and the Digital AI Workforce.
              </p>
            </div>
          </div>
        </Link>
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
