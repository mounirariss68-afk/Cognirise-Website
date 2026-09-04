import { Link, useSearch, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useSubscribeNewsletter } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useMarketStore } from "@/store/market";

export default function InsightsEditorial() {
  const [email, setEmail] = useState("");
  const subscribeNewsletter = useSubscribeNewsletter();
  const { toast } = useToast();
  const { market } = useMarketStore();
  const searchString = useSearch();
  const [location, setLocation] = useLocation();
  
  const searchParams = new URLSearchParams(searchString);
  const activeTopic = searchParams.get("topic") || "all";
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    subscribeNewsletter.mutate({
      data: {
        email,
        market: market,
        consent: true,
        sourcePage: window.location.pathname,
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Subscribed successfully",
          description: "You are on the list. Watch this space.",
        });
        setEmail("");
      },
      onError: () => {
        toast({
          title: "Subscription failed",
          description: "Please try again later.",
          variant: "destructive"
        });
      }
    });
  };

  const isSubscribed = subscribeNewsletter.isSuccess;

  const topics = [
    { id: "all", label: "All Insights" },
    { id: "engineering", label: "Engineering" },
    { id: "governance", label: "Governance" },
    { id: "operations", label: "Operating Models" },
    { id: "strategy", label: "Strategy" }
  ];

  const articles = [
    { number: "02", title: "The hidden constraints in AI engineering.", copy: "Why prototypes stall before production.", topic: "engineering", url: "/insights/hidden-constraints" },
    { number: "03", title: "Sovereign control in the public sector.", copy: "Accountability without compromising momentum.", topic: "governance", url: "/insights/sovereign-control" },
    { number: "04", title: "When systems learn to route work.", copy: "How agents alter the operating flow.", topic: "operations", url: "/insights/systems-routing-work" },
    { number: "05", title: "The new data baseline.", copy: "Preparing unstructured information for active use.", topic: "engineering", url: "/insights/new-data-baseline" },
    { number: "06", title: "Investing in capacity, not tools.", copy: "The shift in enterprise technology capital.", topic: "strategy", url: "/insights/investing-capacity" }
  ];

  const filteredArticles = activeTopic === "all" ? articles : articles.filter(a => a.topic === activeTopic);

  const handleTopicSelect = (topicId: string) => {
    if (topicId === "all") {
      setLocation(location);
    } else {
      setLocation(`${location}?topic=${topicId}`);
    }
  };

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-12 md:pt-16 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.7fr] gap-12 lg:gap-[8vw] items-end">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              {marketLocation} / points of view
            </div>
            <h1 className="text-6xl md:text-[90px] lg:text-[150px] leading-[0.82] font-semibold tracking-tight">
              Work, made <em className="not-italic text-[hsl(var(--brand-pink))]">visible.</em>
            </h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground max-w-[390px] mb-4">
            A reading room for leaders building AI-native organisations: the operating questions behind the strategy, architecture and deployment.
          </p>
        </div>
        
        <div className="border-t border-foreground mt-12 lg:mt-16" />
        
        <article className="flex flex-col lg:grid lg:grid-cols-[1.14fr_0.86fr] min-h-[420px] lg:min-h-[610px]">
          <div className="order-2 lg:order-1 relative h-[420px] lg:h-auto overflow-hidden clip-diagonal-left bg-[hsl(var(--brand-deep))]">
            <img 
              src="/images/cognirise/site-insights.jpg" 
              alt="Violet and coral architectural planes arranged in a bright white space." 
              className="absolute inset-0 h-full w-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-transparent opacity-60 lg:opacity-70" />
            <span className="absolute bottom-6 left-8 z-10 text-[10px] uppercase tracking-widest text-white">01 / featured point of view</span>
          </div>
          <div className="order-1 lg:order-2 py-12 lg:py-16 lg:pl-[8%] flex flex-col justify-end">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Perspective · Agentic enterprise
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[68px] leading-[0.96] font-semibold mb-6 max-w-[560px]">
              AI should move the business—not just assist it.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-[430px] mb-8">
              AI transformation is not a portfolio of pilots. It is a decision to redesign priority work around people, data, controls and intelligent execution.
            </p>
            <BrandButton href="/insights/ai-should-move-the-business" variant="editorial">
              Read the point of view
            </BrandButton>
          </div>
        </article>
      </section>

      <section className="px-6 md:px-12 pt-20 pb-12 md:py-28 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-12 lg:gap-24">
          <aside className="border-t border-border pt-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">Topic filter</h2>
            <div className="flex flex-row flex-wrap lg:flex-col gap-4">
              {topics.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTopicSelect(t.id)}
                  className={`text-sm font-semibold text-left transition-colors ${activeTopic === t.id ? 'text-[hsl(var(--brand-pink))]' : 'text-foreground/70 hover:text-foreground'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </aside>
          
          <div className="flex flex-col border-t border-foreground pt-4 min-h-[400px]">
            {filteredArticles.length === 0 ? (
              <p className="text-muted-foreground pt-8">No articles found for this topic.</p>
            ) : (
              filteredArticles.map(({ number, title, copy, url }) => (
                <Link key={number} href={url}>
                  <div className="group flex flex-col md:flex-row md:items-center gap-4 md:gap-6 px-4 py-6 border-b border-border transition-colors hover:bg-[hsl(var(--brand-violet))/10] cursor-pointer">
                    <span className="text-[10px] font-semibold tracking-widest text-muted-foreground md:w-10">
                      {number}
                    </span>
                    <h3 className="text-xl md:text-2xl lg:text-[30px] font-semibold flex-1 leading-tight group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-[300px] hidden md:block">
                      {copy}
                    </p>
                    <div className="hidden md:flex w-8 justify-end">
                      <ArrowRight className="h-5 w-5 text-[hsl(var(--brand-coral))] transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-foreground mx-6 md:mx-12 max-w-[1440px] xl:mx-auto my-8">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="border-b md:border-b-0 md:border-r border-border py-4 md:py-5 md:pr-5">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">From the {market.toUpperCase()}</span>
            <div className="text-sm font-medium">Built for consequential work and regulated environments.</div>
          </div>
          <div className="border-b md:border-b-0 md:border-r border-border py-4 md:py-5 md:px-5">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">For leaders</span>
            <div className="text-sm font-medium">Executive clarity, technical depth and operational reality.</div>
          </div>
          <div className="py-4 md:py-5 md:pl-5">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">In focus</span>
            <div className="text-sm font-medium">Transformation, sovereign AI and a digital workforce.</div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-20 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="border-t border-foreground pt-8 flex flex-col lg:flex-row justify-between gap-8 lg:items-end mb-12">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Thematic collections
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[77px] leading-[0.94] font-semibold max-w-[690px]">
              Read by the question in front of you.
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-[285px]">
            Essays and practical signals for the people accountable for making the work change.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.86fr_1.14fr] gap-4 mt-12">
          <Link href="/insights/foundations-for-production">
            <article className="group relative min-h-[360px] lg:min-h-[440px] bg-[hsl(var(--brand-deep))] overflow-hidden p-8 flex flex-col justify-end text-white cursor-pointer">
              <img 
                src="/images/cognirise/site-infrastructure.jpg" 
                alt="An architectural infrastructure landscape carrying violet and coral light routes." 
                className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-transparent opacity-80" />
              <div className="relative z-10">
                <span className="block text-[10px] uppercase tracking-widest text-white/70 mb-4">
                  Collection / foundations
                </span>
                <h3 className="text-3xl md:text-[45px] font-semibold mb-4 leading-none tracking-tight max-w-[470px]">
                  The conditions for AI that can hold up in production.
                </h3>
                <p className="text-white/80 text-sm max-w-[390px] leading-relaxed">
                  Data, security, governance and architecture are not the preamble. They are the work.
                </p>
              </div>
            </article>
          </Link>

          <Link href="/insights/governed-digital-workforce">
            <article className="group relative min-h-[360px] lg:min-h-[440px] bg-[hsl(var(--brand-deep))] overflow-hidden p-8 flex flex-col justify-end text-white cursor-pointer clip-diagonal-bottom">
              <img 
                src="/images/cognirise/site-cognios.jpg" 
                alt="Layered translucent platforms flowing with violet and coral intelligence." 
                className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] to-transparent opacity-80" />
              <div className="relative z-10">
                <span className="block text-[10px] uppercase tracking-widest text-white/70 mb-4">
                  Collection / platforms
                </span>
                <h3 className="text-3xl md:text-[45px] font-semibold mb-4 leading-none tracking-tight max-w-[470px]">
                  From agent experiments to a governed digital workforce.
                </h3>
                <p className="text-white/80 text-sm max-w-[390px] leading-relaxed">
                  What it takes to deploy agents into real operating environments—with people accountable at every decision point.
                </p>
              </div>
            </article>
          </Link>
        </div>
      </section>

      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end mb-16">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
                <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
                Industry points of view
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-[74px] leading-[0.96] font-semibold">
                Different systems. Same demand for movement.
              </h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-[400px]">
              Sector routes for {market.toUpperCase()} organisations where progress must be both fast and defensible.
            </p>
          </div>

          <div className="border-t border-foreground">
            {[
              ["01", "Banking & financial services", "Build intelligence into the work without compromising control."],
              ["02", "Government & public sector", "Sovereign capability for services with public consequence."],
              ["03", "Telecoms", "Turn complex operations into a stronger service engine."],
              ["04", "Travel & hospitality", "Make service moments more responsive, not more remote."],
              ["05", "Energy & resources", "Apply intelligence where safety, scale and continuity meet."],
              ["06", "Manufacturing & conglomerates", "Connect the operating picture across the enterprise."]
            ].map(([number, title, copy]) => (
              <Link key={title} href={`/insights?topic=${encodeURIComponent(title)}`}>
                <div className="group flex flex-col md:flex-row md:items-center gap-4 md:gap-6 px-4 py-6 border-b border-border transition-colors hover:bg-[hsl(var(--brand-violet))/10] cursor-pointer">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground md:w-10">
                    {number}
                  </span>
                  <h3 className="text-xl md:text-2xl lg:text-[30px] font-semibold flex-1 leading-tight group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-[300px] hidden md:block">
                    {copy}
                  </p>
                  <div className="hidden md:flex w-8 justify-end">
                    <ArrowRight className="h-5 w-5 text-[hsl(var(--brand-coral))] transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-20 md:pt-28 w-full max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 bg-[hsl(var(--brand-deep))] text-white min-h-[400px] lg:min-h-[500px]">
          <div className="p-10 md:p-14 lg:p-[10%]">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              The Cognirise brief
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[72px] leading-[0.95] font-semibold mb-6">
              A useful signal, when it matters.
            </h2>
            <p className="text-base text-white/80 max-w-[420px] mb-8">
              Occasional field notes on AI-native transformation, delivery and the systems that make intelligent work possible.
            </p>
            
            {isSubscribed ? (
              <p className="text-white font-semibold py-4" role="status">
                You are on the list. Watch this space.
              </p>
            ) : (
              <form className="flex border-b border-white/70 max-w-[430px] pb-2 mt-8" onSubmit={submit}>
                <input 
                  type="email" 
                  required 
                  aria-label="Work email address" 
                  placeholder="Your work email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  disabled={subscribeNewsletter.isPending}
                  className="flex-1 bg-transparent border-none text-white outline-none placeholder:text-white/50 text-sm"
                />
                <button 
                  type="submit" 
                  disabled={subscribeNewsletter.isPending}
                  className="bg-transparent border-none text-white text-xs font-bold uppercase tracking-wider pl-4 hover:text-[hsl(var(--brand-pink))] transition-colors flex items-center gap-2"
                >
                  {subscribeNewsletter.isPending ? "Subscribing..." : "Subscribe"} 
                  {!subscribeNewsletter.isPending && <ArrowRight className="h-3 w-3" />}
                </button>
              </form>
            )}
          </div>
          
          <div className="relative h-[300px] lg:h-auto overflow-hidden clip-diagonal-left hidden md:block">
            <img 
              src="/images/cognirise/site-insights.jpg" 
              alt="Architectural space" 
              className="absolute inset-0 h-full w-full object-cover scale-105 opacity-80"
            />
            <div className="absolute right-6 bottom-6 text-[10px] font-semibold uppercase tracking-widest text-white/80">
              field notes / {market.toUpperCase()}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
