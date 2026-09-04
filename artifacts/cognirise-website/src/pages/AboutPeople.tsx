import { Link } from "wouter";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";

export default function AboutPeople() {
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          About Cognirise / {marketLocation}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.87fr_1.13fr] gap-12 lg:gap-[4vw] items-end pb-12 min-h-[60vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[100px] leading-[0.94] font-semibold mb-8 max-w-[650px]">
              Senior-led is not a <em className="not-italic text-[hsl(var(--brand-pink))]">slogan.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[450px] mb-10 leading-relaxed">
              It is the staffing model. Cognirise brings senior advisors, operators and engineers into the work from the first consequential decision.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton onClick={() => document.getElementById("model")?.scrollIntoView({ behavior: "smooth" })}>
                See the operating model
              </BrandButton>
              <BrandButton onClick={() => document.getElementById("field")?.scrollIntoView({ behavior: "smooth" })} variant="editorial" icon={<ArrowDown className="h-4 w-4" />}>
                Meet the model
              </BrandButton>
            </div>
          </div>
          
          <div className="relative h-[440px] lg:h-[630px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-leadership.jpg" 
              alt="A diverse senior team working together around a detailed physical model." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[150px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              present
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">01 / the room where work changes</span>
              Judgment, close to the work
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Based in</span>
            <strong className="text-sm font-semibold text-foreground">{marketLocation}</strong>
          </div>
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Led by</span>
            <strong className="text-sm font-semibold text-foreground">Senior advisors and operators</strong>
          </div>
          <div className="border-r border-border p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Built with</span>
            <strong className="text-sm font-semibold text-foreground">Forward-deployed engineers</strong>
          </div>
          <div className="p-5 lg:p-6">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Extended by</span>
            <strong className="text-sm font-semibold text-foreground">Partner scale, when needed</strong>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 md:py-36 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.12fr] gap-12 lg:gap-[7vw]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The people model
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[78px] leading-[0.98] font-semibold">
              The work deserves more than a <em className="not-italic text-[hsl(var(--brand-coral))]">handover.</em>
            </h2>
          </div>
          <div className="lg:self-end border-t border-border pt-8">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 max-w-[540px]">
              We do not separate the people who frame a decision from the people who make it real. The advisory conversation and the delivery conversation happen in the same room.
            </p>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground max-w-[480px]">
              That means fewer translations, clearer ownership and a route from an important question to a working system.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-0 md:mx-12 max-w-[1440px] xl:mx-auto h-[500px] md:h-[670px] relative bg-[hsl(var(--brand-deep))] overflow-hidden">
        <img 
          src="/images/cognirise/site-leadership.jpg" 
          alt="Senior colleagues studying a physical model in a bright UAE workspace."
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-transparent opacity-90 lg:opacity-100 lg:from-70%" />
        
        <div className="absolute bottom-12 lg:bottom-24 left-6 lg:left-16 max-w-[610px] z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-4">
            Close to the decision
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[80px] font-semibold text-white leading-tight mb-6">
            Senior attention, where it changes the route.
          </h2>
          <p className="text-white/80 text-base md:text-lg max-w-[430px] leading-relaxed">
            The hard calls arrive early: what matters, what is feasible, what must be governed, and what it will take to move. Our senior people stay close to those calls.
          </p>
        </div>
        
        <div className="absolute top-12 right-6 lg:right-12 text-[10px] uppercase tracking-widest text-white/60 writing-vertical-rl rotate-180">
          02 / senior-led
        </div>
      </section>

      <section id="model" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              One accountable field team
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-[72px] leading-[0.97] font-semibold max-w-[690px]">
              Different disciplines. Shared responsibility.
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-[410px]">
            The work moves best when each role brings its full perspective, without passing the problem down a chain.
          </p>
        </div>

        <div className="border-t border-foreground">
          {[
            ["01", "Advisors", "Set the direction around the business outcome, constraints and decisions that matter."],
            ["02", "Operators", "Bring practical context to the process, people and operating environment."],
            ["03", "Engineers", "Turn the route into a production-ready system, not a demonstration."],
            ["04", "Partners", "Extend specialist capacity where the work calls for it, without diluting accountability."]
          ].map(([n, t, c]) => (
            <div key={t} className="group flex flex-col md:flex-row md:items-center gap-4 md:gap-8 px-4 py-8 border-b border-border transition-colors hover:bg-[hsl(var(--brand-violet))/5] hover:pl-8 cursor-pointer">
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground md:w-16">
                {n}
              </span>
              <div className="flex-1 md:pr-12">
                <h3 className="text-2xl md:text-[32px] font-semibold mb-2 group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                  {t}
                </h3>
              </div>
              <div className="md:w-1/2 lg:w-[1.1fr]">
                <p className="text-sm leading-relaxed text-muted-foreground max-w-[305px]">
                  {c}
                </p>
              </div>
              <div className="hidden md:flex w-10 justify-end">
                <ArrowRight className="h-5 w-5 text-[hsl(var(--brand-pink))] transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="field" className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:min-h-[610px]">
          <div className="lg:pr-[9%] lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              How the forces connect
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[76px] leading-[0.97] font-semibold mb-8">
              One team around the work—not around a slide deck.
            </h2>
            <p className="text-lg text-foreground/70 max-w-[430px] mb-12">
              Advisors create clarity. Operators keep it grounded in the reality of the organisation. Engineers make the change durable. The team is designed to hold the route together.
            </p>
            
            <div className="border-t border-foreground pt-4 flex flex-col gap-4">
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">01</span>
                Direction stays connected to delivery
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">02</span>
                Operational reality shapes the build
              </div>
              <div className="flex items-center border-b border-border pb-4 text-sm font-semibold">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest w-14">03</span>
                Partner scale serves the work
              </div>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-auto lg:-mt-12 clip-diagonal-bottom">
            <img 
              src="/images/cognirise/pulse-convergence.jpg" 
              alt="People moving through a vivid architectural space of reflective violet and coral forms." 
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute right-6 bottom-6 text-[10px] font-semibold uppercase tracking-widest text-white">
              shared accountability
            </div>
          </div>
        </div>
      </section>

      <section id="partners" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="border-t border-foreground pt-8 flex flex-col lg:flex-row justify-between gap-8 lg:items-end mb-12">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Scale without distance
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[70px] leading-[0.98] font-semibold max-w-[690px]">
              A core team, strengthened by the right relationships.
            </h2>
          </div>
          <p className="text-base text-muted-foreground max-w-[310px]">
            Partner capability can add reach and specialist knowledge. It does not replace the people accountable for the work in front of you.
          </p>
        </div>

        <div className="relative h-[345px] lg:h-[400px] overflow-hidden group clip-diagonal-left mb-10">
          <img 
            src="/images/cognirise/cognirise-pulse-people.jpg" 
            alt="A group of people gathered beneath an expansive flowing field of violet and coral light." 
            className="absolute inset-0 h-full w-full object-cover object-[center_65%] transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--brand-deep))] to-[hsl(var(--brand-deep))/5] opacity-80" />
          
          <div className="absolute bottom-8 left-8 z-10 max-w-[450px]">
            <span className="block text-[10px] uppercase tracking-widest text-white/75 mb-3">
              03 / collective capability
            </span>
            <strong className="block text-3xl md:text-[42px] font-semibold text-white leading-none tracking-tight">
              The relationship is the delivery model.
            </strong>
          </div>
        </div>

        <div className="border-t border-border">
          {[
            ["Core", "Cognirise field team", "Senior advisors, operators and engineers accountable for the route."],
            ["Extended", "Specialist partners", "Capability brought in for the needs of the work, under one shared direction."],
            ["Client", "Your teams", "The people who own the process, the decisions and the change after release."]
          ].map(([n, t, c]) => (
            <div key={t} className="flex flex-col md:flex-row gap-4 md:gap-[25px] px-4 md:px-6 py-6 border-b border-border hover:bg-[hsl(var(--brand-violet))/5] transition-colors">
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground md:w-[90px] pt-1">
                {n}
              </span>
              <strong className="text-sm md:text-base font-semibold md:w-1/2 lg:w-1/3">
                {t}
              </strong>
              <p className="text-sm leading-relaxed text-muted-foreground flex-1">
                {c}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 bottom-[-5%] text-[20vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          PEOPLE
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            Start in the room
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[113px] leading-[0.88] font-semibold tracking-tight mb-8">
            Bring one process.<br />
            <em className="not-italic text-[#ff8470]">Meet the people.</em>
          </h2>
          <p className="text-lg text-white/80 max-w-[500px] mb-12">
            Start with a process where urgency, complexity and value have already collided. We will bring the right people to help surface the opportunity, constraints and practical route forward.
          </p>
          <BrandButton href="/value-scan" variant="submit">
            Book a value scan
          </BrandButton>
        </div>
      </section>
    </div>
  );
}
