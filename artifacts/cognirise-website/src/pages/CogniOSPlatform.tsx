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
    ["06", "Experience layer", "Human and agent interactions designed for the operating context."],
    ["05", "Agent layer", "CogniAgents coordinate governed tasks, decisions and specialist actions."],
    ["04", "Knowledge layer", "CogniDocs turns enterprise knowledge into controlled, retrievable context."],
    ["03", "Intelligence layer", "Models, prompts and orchestration selected for the work at hand."],
    ["02", "Integration layer", "Connects the systems where work, data and decisions already live."],
    ["01", "Foundation layer", "Infrastructure, data and identity controls shaped around the deployment context."]
  ];

  const products = [
    ["01", "CogniTalk", "A conversational layer for meaningful work between people and enterprise intelligence."],
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
              <BrandButton onClick={() => document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })}>
                Read the architecture
              </BrandButton>
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
            <strong className="text-sm font-semibold text-foreground">People and agents, in context</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Control</span>
            <strong className="text-sm font-semibold text-foreground">Human authority remains explicit</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Deployment</span>
            <strong className="text-sm font-semibold text-foreground">Boundaries defined for the environment</strong>
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
              It is designed around the conditions that define the work: organisational context, visible human authority and clear operating boundaries.
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

      <section id="architecture" className="mt-20 lg:mt-32 border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto pt-24 pb-8 relative bg-[hsl(var(--brand-deep))] text-white overflow-hidden clip-diagonal-top-right">
        {/* Deep space ambient lights */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#070f20] via-[hsl(var(--brand-deep))] to-[#0e162b] z-0" />
        
        {/* Core luminous glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--brand-pink))] rounded-full blur-[180px] opacity-10 pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[hsl(var(--brand-violet))] rounded-full blur-[100px] opacity-20 pointer-events-none z-0" />
        
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] z-0" />

        <div className="relative z-10 px-6 lg:px-12 flex flex-col items-center text-center mb-16">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-coral))] mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            A connected product family
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[72px] leading-[0.97] font-semibold max-w-[880px] mb-6">
            Specialist capabilities.<br />
            A shared operating system.
          </h2>
          <p className="text-lg text-white/70 max-w-[500px]">
            CogniOS is the architecture that lets each capability contribute to a governed whole.
          </p>
        </div>

        {/* Spatial Architecture Field */}
        <div className="relative z-10 h-[800px] lg:h-[800px] w-full max-w-[1000px] mx-auto hidden md:block">
          
          {/* Signal paths (svg) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}>
            {/* Lines connecting nodes to center */}
            <path d="M200,200 Q300,200 500,400" fill="none" stroke="url(#pink-violet)" strokeWidth="1" strokeDasharray="4 4" className="motion-safe:animate-pulse" />
            <path d="M800,200 Q700,200 500,400" fill="none" stroke="url(#violet-coral)" strokeWidth="1" strokeDasharray="4 4" className="motion-safe:animate-pulse" />
            <path d="M200,600 Q300,600 500,400" fill="none" stroke="url(#coral-pink)" strokeWidth="1" strokeDasharray="4 4" className="motion-safe:animate-pulse" />
            <path d="M800,600 Q700,600 500,400" fill="none" stroke="url(#pink-violet)" strokeWidth="1" strokeDasharray="4 4" className="motion-safe:animate-pulse" />
            
            {/* Animated signal dots traveling along paths */}
            <circle r="2" fill="#fff" opacity="0.8" className="motion-reduce:hidden">
              <animateMotion dur="3s" repeatCount="indefinite" path="M200,200 Q300,200 500,400" />
            </circle>
            <circle r="2" fill="#fff" opacity="0.8" className="motion-reduce:hidden">
              <animateMotion dur="4s" repeatCount="indefinite" path="M800,200 Q700,200 500,400" />
            </circle>
            <circle r="2" fill="#fff" opacity="0.8" className="motion-reduce:hidden">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M200,600 Q300,600 500,400" />
            </circle>
            <circle r="2" fill="#fff" opacity="0.8" className="motion-reduce:hidden">
              <animateMotion dur="4.5s" repeatCount="indefinite" path="M800,600 Q700,600 500,400" />
            </circle>

            <defs>
              <linearGradient id="pink-violet" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--brand-pink))" />
                <stop offset="100%" stopColor="hsl(var(--brand-violet))" />
              </linearGradient>
              <linearGradient id="violet-coral" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--brand-violet))" />
                <stop offset="100%" stopColor="hsl(var(--brand-coral))" />
              </linearGradient>
              <linearGradient id="coral-pink" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--brand-coral))" />
                <stop offset="100%" stopColor="hsl(var(--brand-pink))" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Core: CogniOS */}
          <div className="absolute top-[400px] left-[500px] -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] flex flex-col items-center justify-center group z-20">
            <div className="absolute inset-0 bg-white/5 border border-white/20 rotate-45 transition-all duration-700 group-hover:rotate-90 group-hover:bg-white/10 group-hover:border-[hsl(var(--brand-pink))] shadow-[0_0_40px_rgba(255,255,255,0.1)]" />
            <div className="absolute inset-2 bg-gradient-to-br from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-pink))] opacity-20 rotate-12 transition-all duration-1000 group-hover:rotate-45" />
            <h3 className="relative z-10 text-2xl font-bold tracking-tight text-white mb-1">CogniOS</h3>
            <span className="relative z-10 text-[9px] uppercase tracking-widest text-white/70">Orchestration</span>
          </div>

          {/* Satellite: CogniTalk (Top Left) */}
          <div className="absolute top-[200px] left-[200px] -translate-x-1/2 -translate-y-1/2 w-[240px] group cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-white/5 border border-white/20 flex items-center justify-center group-hover:border-[hsl(var(--brand-coral))] group-hover:bg-[hsl(var(--brand-coral))/10] transition-colors">
                <span className="text-[10px] font-bold text-[hsl(var(--brand-coral))]">01</span>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2 group-hover:text-[hsl(var(--brand-coral))] transition-colors">CogniTalk</h4>
                <p className="text-xs text-white/60 leading-relaxed">Conversational layer for meaningful work between people and intelligence.</p>
              </div>
            </div>
          </div>

          {/* Satellite: CogniAgents (Top Right) */}
          <div className="absolute top-[200px] left-[800px] -translate-x-1/2 -translate-y-1/2 w-[240px] group cursor-pointer text-right">
            <div className="flex items-start gap-4 flex-row-reverse">
              <div className="w-10 h-10 shrink-0 bg-white/5 border border-white/20 flex items-center justify-center group-hover:border-[hsl(var(--brand-pink))] group-hover:bg-[hsl(var(--brand-pink))/10] transition-colors">
                <span className="text-[10px] font-bold text-[hsl(var(--brand-pink))]">02</span>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2 group-hover:text-[hsl(var(--brand-pink))] transition-colors">CogniAgents</h4>
                <p className="text-xs text-white/60 leading-relaxed">Governed agents that coordinate specialist tasks in defined environments.</p>
              </div>
            </div>
          </div>

          {/* Satellite: CogniDocs (Bottom Left) */}
          <div className="absolute top-[600px] left-[200px] -translate-x-1/2 -translate-y-1/2 w-[240px] group cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-white/5 border border-white/20 flex items-center justify-center group-hover:border-[hsl(var(--brand-violet))] group-hover:bg-[hsl(var(--brand-violet))/10] transition-colors">
                <span className="text-[10px] font-bold text-[hsl(var(--brand-violet))]">03</span>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2 group-hover:text-[hsl(var(--brand-violet))] transition-colors">CogniDocs</h4>
                <p className="text-xs text-white/60 leading-relaxed">Knowledge made available with context, access and control the work requires.</p>
              </div>
            </div>
          </div>

          {/* Satellite: CogniWare (Bottom Right) */}
          <div className="absolute top-[600px] left-[800px] -translate-x-1/2 -translate-y-1/2 w-[240px] group cursor-pointer text-right">
            <div className="flex items-start gap-4 flex-row-reverse">
              <div className="w-10 h-10 shrink-0 bg-white/5 border border-white/20 flex items-center justify-center group-hover:border-[hsl(var(--brand-coral))] group-hover:bg-[hsl(var(--brand-coral))/10] transition-colors">
                <span className="text-[10px] font-bold text-[hsl(var(--brand-coral))]">04</span>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2 group-hover:text-[hsl(var(--brand-coral))] transition-colors">CogniWare</h4>
                <p className="text-xs text-white/60 leading-relaxed">Composable capabilities connected to the systems that run the enterprise.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile fallback layout */}
        <div className="relative z-10 flex flex-col gap-6 px-6 pb-12 md:hidden">
          <div className="w-full flex items-center justify-center p-8 bg-white/5 border border-[hsl(var(--brand-pink))] shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold tracking-tight text-white mb-1">CogniOS</h3>
              <span className="text-[9px] uppercase tracking-widest text-white/70">Orchestration Core</span>
            </div>
          </div>
          
          {products.map(([n, t, c]) => (
            <div key={t} className="bg-white/5 border border-white/10 p-6 flex items-start gap-4">
              <div className="w-8 h-8 shrink-0 bg-white/5 border border-white/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[hsl(var(--brand-pink))]">{n}</span>
              </div>
              <div>
                <h4 className="text-lg font-bold mb-2 text-white">{t}</h4>
                <p className="text-xs text-white/60 leading-relaxed">{c}</p>
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
               CogniOS is designed to support human decisions, not obscure them. It creates a usable platform for teams operating where context, trust and control cannot be treated as edge cases.
            </p>
          </div>
          
          <div className="border-t border-white/30 lg:self-end">
            <div className="py-4 border-b border-white/20 text-lg font-semibold flex items-center">
              <span className="text-[10px] font-normal tracking-widest text-[hsl(var(--brand-coral))] mr-4 w-6">01</span>
               Context designed around the work
            </div>
            <div className="py-4 border-b border-white/20 text-lg font-semibold flex items-center">
              <span className="text-[10px] font-normal tracking-widest text-[hsl(var(--brand-coral))] mr-4 w-6">02</span>
               Boundaries made explicit
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
              <BrandButton href="/value-scan" variant="submit">
                Bring us one process
              </BrandButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
