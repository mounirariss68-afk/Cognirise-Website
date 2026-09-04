import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus, Minus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useMarketStore } from "@/store/market";

export default function CogniOSPlatform() {
  const [active, setActive] = useState<number>(0);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const layers = [
    ["06", "Experience layer", "Bilingual human and agent interactions, designed for real operational context."],
    ["05", "Agent layer", "CogniAgents coordinate governed tasks, decisions and specialist actions."],
    ["04", "Knowledge layer", "CogniDocs turns enterprise knowledge into controlled, retrievable context."],
    ["03", "Intelligence layer", "Models, prompts and orchestration selected for the work at hand."],
    ["02", "Integration layer", "Connects the systems where work, data and decisions already live."],
    ["01", "Foundation layer", "Sovereign infrastructure, data and identity controls beneath every deployment."]
  ];

  const products = [
    ["01", "CogniTalk", "A bilingual conversational layer for meaningful work between people and enterprise intelligence."],
    ["02", "CogniAgents", "Governed agents that coordinate specialist tasks in defined operational environments."],
    ["03", "CogniDocs", "Knowledge made available with the context, access and control the work requires."],
    ["04", "CogniWare", "Composable intelligence capabilities connected to the systems that run the enterprise."]
  ];

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {marketLocation} / Platforms
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.84fr_1.16fr] gap-12 lg:gap-16 items-end pb-12 min-h-[60vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[100px] leading-[0.94] font-semibold mb-8 max-w-[700px]">
              The operating system for <em className="not-italic text-[hsl(var(--brand-pink))]">governed intelligence.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[440px] mb-10 leading-relaxed">
              CogniOS connects people, agents, knowledge and enterprise systems so AI can move consequential work—without surrendering control.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <button 
                onClick={() => document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })}
                className="group relative inline-flex min-h-[46px] items-center gap-4 overflow-hidden border border-foreground bg-foreground pl-4 pr-1 text-sm font-bold text-white transition-all hover:-translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_hsl(var(--brand-coral))]"
              >
                <div className="absolute inset-0 z-0 bg-[linear-gradient(105deg,hsl(var(--brand-violet)),hsl(var(--brand-pink)),hsl(var(--brand-coral)))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative z-10">Read the architecture</span>
                <div className="relative z-10 flex h-9 w-9 items-center justify-center bg-white text-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:bg-[hsl(var(--brand-coral))] group-hover:text-white">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
              <button 
                onClick={() => document.getElementById("principles")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-2 border-b border-foreground pb-2 text-sm font-bold transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))]"
              >
                See the principles <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="relative h-[440px] lg:h-[630px] clip-diagonal-left bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-cognios.jpg" 
              alt="Six luminous architectural layers connected by a central intelligence flow." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-80" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              system
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">CogniOS / platform overview</span>
              Built to make intelligence accountable
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Designed for</span>
            <strong className="text-sm font-semibold text-foreground">UAE enterprise and government</strong>
          </div>
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Language</span>
            <strong className="text-sm font-semibold text-foreground">Arabic and English, in context</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Control</span>
            <strong className="text-sm font-semibold text-foreground">Human authority remains explicit</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Deployment</span>
            <strong className="text-sm font-semibold text-foreground">Sovereign and regulated environments</strong>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-36 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.12fr] gap-12 lg:gap-[8vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              One architecture, not another tool
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[76px] leading-[0.98] font-semibold">
              AI needs a place to <em className="not-italic text-[hsl(var(--brand-coral))]">operate.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[535px]">
              CogniOS is the connective architecture for enterprise intelligence. It gives the work a governed route from data and systems through agents and knowledge, to the people making consequential decisions.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              It is designed for the conditions that define UAE-first delivery: bilingual operations, sovereignty, organisational context and visible human authority.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-0 md:mx-12 max-w-[1440px] xl:mx-auto h-[500px] md:h-[610px] relative bg-[hsl(var(--brand-deep))] overflow-hidden">
        <img 
          src="/images/cognirise/pulse-convergence.jpg" 
          alt="A luminous architectural environment where human presence and intelligent systems meet."
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-90 lg:opacity-100 lg:from-70%" />
        
        <div className="absolute bottom-12 lg:bottom-24 left-6 lg:left-16 max-w-[570px] z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
            The platform in practice
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-semibold text-white leading-tight mb-6">
            Build the route.<br/>Keep the authority.
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-[410px] leading-relaxed">
            CogniOS brings the structures around intelligence into the same operating environment, rather than asking teams to govern them after the fact.
          </p>
        </div>
      </section>

      <section id="architecture" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Reference architecture
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[76px] leading-[0.98] font-semibold">
              Six layers.<br/>One controlled flow.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-[410px]">
            Each layer has a distinct responsibility. Together they give teams a practical way to deploy intelligence into the work, not beside it.
          </p>
        </div>

        <div className="border-t border-foreground">
          {layers.map(([num, title, copy], i) => (
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
                <p className="text-sm text-muted-foreground max-w-[330px] hidden lg:block">
                  {copy}
                </p>
                <div className="hidden lg:flex w-10 justify-end">
                  {active === i ? (
                    <Minus className="h-5 w-5 text-[hsl(var(--brand-pink))]" />
                  ) : (
                    <Plus className="h-5 w-5 text-foreground group-hover:text-[hsl(var(--brand-pink))]" />
                  )}
                </div>
              </button>
              
              {active === i && (
                <div className="bg-[hsl(var(--brand-violet))/5] border-b border-border px-6 py-8 lg:hidden -mt-[1px]">
                  <p className="text-sm leading-relaxed text-foreground/80">{copy}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto">
          <div className="border-t border-foreground pt-8 flex flex-col lg:flex-row justify-between gap-8 lg:items-end mb-12">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Through every layer
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-[76px] leading-[0.98] font-semibold">
                Two spines keep the platform honest.
              </h2>
            </div>
            <p className="text-base text-muted-foreground max-w-[300px]">
              They are not a review gate at the end. They run through the architecture, from first decision to live operation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="group relative min-h-[350px] lg:min-h-[420px] bg-[hsl(var(--brand-deep))] overflow-hidden p-8 text-white cursor-pointer">
              <img 
                src="/images/cognirise/cognirise-pulse-governance.jpg" 
                alt="A violet route moving through a series of controlled architectural gateways."
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-[hsl(var(--brand-deep))/10]" />
              
              <div className="absolute bottom-8 left-8 right-8 z-10">
                <span className="block text-[10px] uppercase tracking-widest text-white/70 mb-3">
                  Spine 01 / AI governance & assurance
                </span>
                <h3 className="text-3xl md:text-4xl font-semibold mb-4 leading-none">
                  Control in the flow.
                </h3>
                <p className="text-white/80 text-sm max-w-[390px] leading-relaxed">
                  Policies, approvals, traceability and assurance remain visible wherever intelligence is used.
                </p>
              </div>
            </div>

            <div className="group relative min-h-[350px] lg:min-h-[420px] bg-[hsl(var(--brand-deep))] overflow-hidden p-8 text-white cursor-pointer">
              <img 
                src="/images/cognirise/pulse-convergence.jpg" 
                alt="An abstract operational space showing systems converging."
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-[hsl(var(--brand-deep))/10]" />
              
              <div className="absolute bottom-8 left-8 right-8 z-10">
                <span className="block text-[10px] uppercase tracking-widest text-white/70 mb-3">
                  Spine 02 / platform engineering & ops
                </span>
                <h3 className="text-3xl md:text-4xl font-semibold mb-4 leading-none">
                  Built to stay in motion.
                </h3>
                <p className="text-white/80 text-sm max-w-[390px] leading-relaxed">
                  Integration, observability and platform operations turn a deployment into an operating capability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="border-t border-foreground pt-8 flex flex-col lg:flex-row justify-between gap-8 lg:items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              A connected product family
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[72px] leading-[0.97] font-semibold max-w-[680px]">
              Specialist capabilities. A shared operating system.
            </h2>
          </div>
          <p className="text-base text-muted-foreground max-w-[300px]">
            CogniOS is the architecture that lets each capability contribute to a governed whole.
          </p>
        </div>

        <div className="border-t border-border">
          {products.map(([n, t, c]) => (
            <div key={t} className="group flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 px-4 py-6 border-b border-border transition-colors hover:bg-[hsl(var(--secondary))] cursor-pointer">
              <span className="text-[10px] font-semibold tracking-widest text-[hsl(var(--brand-pink))] lg:w-16">
                {n}
              </span>
              <h3 className="text-2xl md:text-3xl font-semibold flex-1">
                {t}
              </h3>
              <p className="text-sm text-muted-foreground max-w-[380px] hidden lg:block">
                {c}
              </p>
              <div className="hidden lg:flex w-10 justify-end">
                <ArrowRight className="h-5 w-5 text-[hsl(var(--brand-coral))] transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="principles" className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 top-[10%] text-[17vw] leading-[0.8] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          CONTROL
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[8vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The non-negotiables
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[85px] leading-[0.94] font-semibold tracking-tight mb-8">
              Intelligence with a clear line of <em className="not-italic text-[hsl(var(--brand-pink))]">authority.</em>
            </h2>
            <p className="text-lg text-white/80 max-w-[430px]">
              CogniOS is designed to support human decisions, not obscure them. It creates a usable platform for teams operating where language, trust and local control cannot be treated as edge cases.
            </p>
          </div>
          
          <div className="border-t border-white/30 lg:self-end">
            <div className="py-4 border-b border-white/20 text-lg font-semibold flex items-center">
              <span className="text-[10px] font-normal tracking-widest text-[hsl(var(--brand-coral))] mr-4 w-6">01</span>
              Bilingual by design
            </div>
            <div className="py-4 border-b border-white/20 text-lg font-semibold flex items-center">
              <span className="text-[10px] font-normal tracking-widest text-[hsl(var(--brand-coral))] mr-4 w-6">02</span>
              Sovereign where it matters
            </div>
            <div className="py-4 border-b border-white/20 text-lg font-semibold flex items-center">
              <span className="text-[10px] font-normal tracking-widest text-[hsl(var(--brand-coral))] mr-4 w-6">03</span>
              Human authority stays visible
            </div>
            <div className="py-4 border-b border-white/20 text-lg font-semibold flex items-center">
              <span className="text-[10px] font-normal tracking-widest text-[hsl(var(--brand-coral))] mr-4 w-6">04</span>
              Governance travels with the work
            </div>
            
            <div className="mt-12">
              <Link href="/value-scan">
                <button className="group relative inline-flex min-h-[46px] items-center gap-4 overflow-hidden bg-[linear-gradient(105deg,hsl(var(--brand-violet)),hsl(var(--brand-pink)),hsl(var(--brand-coral)))] pl-5 pr-1 text-sm font-bold text-white transition-all hover:-translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_#fff]">
                  <span className="relative z-10">Bring us one process</span>
                  <div className="relative z-10 flex h-9 w-9 items-center justify-center bg-transparent transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
