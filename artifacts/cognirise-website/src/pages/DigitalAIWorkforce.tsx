import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { Link } from "wouter";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { scrollToSection } from "@/lib/motion";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";

export default function DigitalAIWorkforce() {
  const { market } = useMarketStore();
  
  const marketLocation = getMarketLocationLabel(market);
  const heroKicker = cleanHeroIdentifier(`What we do / ${marketLocation}`, { marketLocation });

  return (
    <div className="flex flex-col">
      <section className="public-hero-shell px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 items-stretch gap-12 pb-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="relative z-10 flex flex-col justify-between gap-10">
        <div className="launch-hero-top"><NavigationBackControl embedded />
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {heroKicker}
        </div>
        </div>
          <div>
            <h1 className="text-5xl md:text-6xl lg:text-[93px] leading-[0.94] font-semibold mb-8 max-w-[660px]">
              Agents in the <em className="not-italic text-[hsl(var(--brand-pink))]">flow of work.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              Deploy governed agents into real operating environments to coordinate specialist tasks alongside people and systems.
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
          
          </div>
          <div className="relative h-[400px] lg:h-auto lg:min-h-[640px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src={assetUrl("/images/cognirise/cognirise-pulse-people.jpg")}
              alt="People and luminous digital threads interacting in a collaborative space." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              agents
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">05 / digital workforce</span>
              Governed execution
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
              Chatbots don't change <em className="not-italic text-[hsl(var(--brand-coral))]">operations.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              Assistance is not execution. When teams rely on conversational assistants, the human remains the bottleneck for the actual work.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              We deploy agents that can act: retrieving data, coordinating systems, and completing complex workflows autonomously, leaving people to make the highest-value decisions.
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
            From tasks to teamwork.
          </h2>
        </div>

        {/* Swimlane Structure */}
        <div className="w-full overflow-x-auto pb-8 -mx-6 px-6 md:mx-0 md:px-0">
          <div className="min-w-[900px] border-l border-t border-border grid grid-cols-[140px_1fr_1fr_1fr_1fr]">
            {/* Header */}
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lane</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">01 / Deconstruct</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">02 / Assign</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">03 / Embed</div>
            <div className="bg-muted/30 p-4 border-r border-b border-border text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">04 / Operate</div>

            {/* People */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">People</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Operators identify high-volume, rules-based tasks.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Define where human judgment is explicitly required.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Teams learn to manage and supervise agents.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">People elevate to strategic, exception-handling roles.</div>

            {/* Systems */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Systems</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Audit system APIs required for task execution.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Create secure integration pathways.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Deploy orchestration layer for multi-agent workflows.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Systems scale horizontally to handle agent traffic.</div>

            {/* Agents */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Agents</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Analyze task logic for agent viability.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Configure specialized agents with specific system tools.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Agents execute tasks within strict platform bounds.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Agents collaborate, hand-off, and request human input.</div>

            {/* Governance */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))]">Governance</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Define risk profiles for automated execution.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Establish human-in-the-loop escalation rules.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Implement strict permission scopes per agent.</div>
            <div className="p-4 border-r border-b border-border text-sm text-muted-foreground">Comprehensive auditing of every agent action.</div>

            {/* Evidence & Artifacts */}
            <div className="p-4 border-r border-b border-border text-xs font-bold text-[hsl(var(--brand-deep))] bg-[hsl(var(--secondary))]">Evidence</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Task Decomposition</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Agent Scopes</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Working Agents</div>
            <div className="p-4 border-r border-b border-border text-sm text-[hsl(var(--brand-deep))] font-medium bg-[hsl(var(--secondary))]">Operating Metrics</div>
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